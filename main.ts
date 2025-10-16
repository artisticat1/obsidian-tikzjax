import { Plugin, TFile, WorkspaceWindow } from 'obsidian';
import { TikzjaxPluginSettings, DEFAULT_SETTINGS, TikzjaxSettingTab } from "./settings";
import { optimize } from "./svgo.browser";

// @ts-ignore
import tikzjaxJs from 'inline:./tikzjax.js';


export default class TikzjaxPlugin extends Plugin {
	settings: TikzjaxPluginSettings;
	originalConsoleLog: typeof console.log;
	originalConsoleError: typeof console.error;
	tikzLogBuffer: string[] = [];
	tikzLogTimer: NodeJS.Timeout | null = null;
	currentTikzElement: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TikzjaxSettingTab(this.app, this));

		// Start console interception for TikZJax error monitoring
		this.startConsoleInterception();

		// Support pop-out windows
		this.app.workspace.onLayoutReady(() => {
			this.loadTikZJaxAllWindows();
			this.registerEvent(this.app.workspace.on("window-open", (win, window) => {
				this.loadTikZJax(window.document);
			}));
		});

		this.addSyntaxHighlighting();
		
		this.registerTikzCodeBlock();
	}

	onunload() {
		this.unloadTikZJaxAllWindows();
		this.removeSyntaxHighlighting();
		this.stopConsoleInterception();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	loadTikZJax(doc: Document) {
		const s = document.createElement("script");
		s.id = "tikzjax";
		s.type = "text/javascript";
		s.innerText = tikzjaxJs;
		doc.body.appendChild(s);


		doc.addEventListener('tikzjax-load-finished', this.postProcessSvg);
	}

	unloadTikZJax(doc: Document) {
		const s = doc.getElementById("tikzjax");
		s.remove();

		doc.removeEventListener("tikzjax-load-finished", this.postProcessSvg);
	}

	loadTikZJaxAllWindows() {
		for (const window of this.getAllWindows()) {
			this.loadTikZJax(window.document);
		}
	}

	unloadTikZJaxAllWindows() {
		for (const window of this.getAllWindows()) {
			this.unloadTikZJax(window.document);
		}
	}

	getAllWindows() {
		// Via https://discord.com/channels/686053708261228577/840286264964022302/991591350107635753

		const windows = [];
		
		// push the main window's root split to the list
		windows.push(this.app.workspace.rootSplit.win);
		
		// @ts-ignore floatingSplit is undocumented
		const floatingSplit = this.app.workspace.floatingSplit;
		floatingSplit.children.forEach((child: any) => {
			// if this is a window, push it to the list 
			if (child instanceof WorkspaceWindow) {
				windows.push(child.win);
			}
		});

		return windows;
	}


	registerTikzCodeBlock() {
		this.registerMarkdownCodeBlockProcessor("tikz", async (source, el, ctx) => {
			// Clear log buffer when processing new TikZ code
			this.clearLogBuffer();
			
			// Store current element for error display
			this.currentTikzElement = el;
			
			// Clear any existing error display in this element
			const existingError = el.querySelector('.tikz-error-display');
			if (existingError) {
				existingError.remove();
			}
			
			// The preamble processing should precede the creation of the script element,
			// otherwise the MutationObserver of tikzjax.js may not notice the change of the element.
			const preamble = await this.findPreambleFile(ctx.sourcePath);
			const sourceComplete = this.tidyTikzSource(source, preamble);

			const script = el.createEl("script");

			script.setAttribute("type", "text/tikz");
			script.setAttribute("data-show-console", "true");
			script.setText(sourceComplete);
		});
	}


	addSyntaxHighlighting() {
		// @ts-ignore
		window.CodeMirror.modeInfo.push({name: "Tikz", mime: "text/x-latex", mode: "stex"});
	}

	removeSyntaxHighlighting() {
		// @ts-ignore
		window.CodeMirror.modeInfo = window.CodeMirror.modeInfo.filter(el => el.name != "Tikz");
	}


	async findPreambleFile(sourcePath: string): Promise<string> {
		if (!sourcePath) {
			return "";
		}
		
		// Get the directory of the current file
		let currentDir = sourcePath.includes('/') ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) : '';
		
		// Try multiple filename patterns in order of preference
		const preambleFilenames = ['.tikz-preamble.tex', '.tikz-preamble', 'tikz-preamble.tex'];
		
		// Search from current directory up to vault root
		let searchCount = 0;
		
		while (searchCount < 10) { // Safety limit
			searchCount++;
			
			for (const filename of preambleFilenames) {
				const preamblePath = currentDir ? `${currentDir}/${filename}` : filename;
				
				try {
					const file = this.app.vault.getAbstractFileByPath(preamblePath);
					
					if (file instanceof TFile) {
						const content = await this.app.vault.cachedRead(file);
						return content;
					}
				} catch (error) {
					// File doesn't exist or can't be read, continue searching
				}
			}
			
			// If we're at the root (empty string), we're done
			if (!currentDir) {
				break;
			}
			
			// Move to parent directory
			if (currentDir.includes('/')) {
				const parentDir = currentDir.substring(0, currentDir.lastIndexOf('/'));
				currentDir = parentDir;
			} else {
				// We're one level below root, next iteration will be root (empty string)
				currentDir = '';
			}
		}
		
		return "";
	}

	tidyTikzSource(tikzSource: string, preamble: string = "") {

		// Remove non-breaking space characters, otherwise we get errors
		const remove = "&nbsp;";
		tikzSource = tikzSource.replaceAll(remove, "");

		let lines = tikzSource.split("\n");

		// Trim whitespace that is inserted when pasting in code, otherwise TikZJax complains
		lines = lines.map(line => line.trim());

		// Remove empty lines
		lines = lines.filter(line => line);

		// Insert preamble if available - but only before \begin{document}
		if (preamble.trim()) {
			const preambleLines = preamble.trim().split("\n").map(line => line.trim()).filter(line => line);
			
			// Find the position of \begin{document}
			const documentIndex = lines.findIndex(line => line.includes('\\begin{document}'));
			
			if (documentIndex !== -1) {
				// Insert preamble before \begin{document}
				lines.splice(documentIndex, 0, ...preambleLines);
			} else {
				// If no \begin{document} found, add preamble at the beginning
				lines = [...preambleLines, ...lines];
			}
		}

		return lines.join("\n");
	}


	colorSVGinDarkMode(svg: string) {
		// Replace the color "black" with currentColor (the current text color)
		// so that diagram axes, etc are visible in dark mode
		// And replace "white" with the background color

		svg = svg.replaceAll(/("#000"|"black")/g, `"currentColor"`)
				.replaceAll(/("#fff"|"white")/g, `"var(--background-primary)"`);

		return svg;
	}


	optimizeSVG(svg: string) {
		// Optimize the SVG using SVGO
		// Fixes misaligned text nodes on mobile

		return optimize(svg, {plugins:
			[
				{
					name: 'preset-default',
					params: {
						overrides: {
							// Don't use the "cleanupIDs" plugin
							// To avoid problems with duplicate IDs ("a", "b", ...)
							// when inlining multiple svgs with IDs
							cleanupIDs: false
						}
					}
				}
			]
		// @ts-ignore
		}).data;
	}


	postProcessSvg = (e: Event) => {

		const svgEl = e.target as HTMLElement;
		let svg = svgEl.outerHTML;

		if (this.settings.invertColorsInDarkMode) {
			svg = this.colorSVGinDarkMode(svg);
		}

		svg = this.optimizeSVG(svg);

		svgEl.outerHTML = svg;
	}

	startConsoleInterception() {
		// Store original console methods
		this.originalConsoleLog = console.log;
		this.originalConsoleError = console.error;

		// Override console.log to intercept TikZJax messages
		console.log = (...args: any[]) => {
			// Call original console.log first
			this.originalConsoleLog.apply(console, args);
			
			// Check for TikZJax error patterns
			const message = args.join(' ');
			this.checkForTikzError(message);
		};

		// Override console.error to intercept TikZJax errors
		console.error = (...args: any[]) => {
			// Call original console.error first
			this.originalConsoleError.apply(console, args);
			
			// Check for TikZJax error patterns
			const message = args.join(' ');
			this.checkForTikzError(message, true);
		};
	}

	stopConsoleInterception() {
		// Restore original console methods
		if (this.originalConsoleLog) {
			console.log = this.originalConsoleLog;
		}
		if (this.originalConsoleError) {
			console.error = this.originalConsoleError;
		}
	}

	checkForTikzError(message: string, isError: boolean = false) {
		// Capture all console messages during TikZ processing
		// Add message to buffer
		this.tikzLogBuffer.push(message);
		
		// Reset timer - we'll wait for messages to stop coming
		if (this.tikzLogTimer) {
			clearTimeout(this.tikzLogTimer);
		}
		
		// Set timer to show notification after 1 second of no new messages
		this.tikzLogTimer = setTimeout(() => {
			this.showBufferedLogs();
		}, 1000);
	}

	showBufferedLogs() {
		if (this.tikzLogBuffer.length === 0 || !this.currentTikzElement) return;
		
		// LaTeX processing state management
		type LogState = 'preamble_normal' | 'preamble_error' | 'document_normal' | 'document_error';
		let state: LogState = 'preamble_normal';
		const filteredMessages: string[] = [];
		let errorPhase: 'preamble' | 'document' | null = null;
		
		for (const message of this.tikzLogBuffer) {
			const trimmed = message.trim();
			
			if (state === 'preamble_normal') {
				// Check if this should be skipped (normal preamble patterns)
				const shouldSkip = (
					// Skip normal library loading messages
					(/^[\s\(\)\"]*[\w\-\.]+\.(?:tex|sty|code\.tex)/.test(trimmed) && !/^!/.test(trimmed)) ||
					// Skip version info and normal startup messages
					/^This is e-TeX|^LaTeX2e|^\*\*entering extended mode|^\(input\.tex$|^For additional information/.test(trimmed) ||
					// Skip empty lines or lines with only spaces/dots
					/^\s*\.{3,}\s*$|^\s*$/.test(trimmed)
				);
				
				if (shouldSkip) {
					continue; // Skip this message
				}
				
				// Not skipped - determine next state
				const isNormalDocument = (
					/^No file input\.aux\./.test(trimmed) ||
					/^ABD:/.test(trimmed) ||
					/^\("input\.aux"\)/.test(trimmed)
				);
				if (isNormalDocument) {
					state = 'document_normal';
					continue;
				} else {
					state = 'preamble_error';
					if (!errorPhase) errorPhase = 'preamble';
				}
			} else if (state === 'document_normal') {
				// Check if this is still normal document processing
				const isNormalDocument = (
					/^No file input\.aux\./.test(trimmed) ||
					/^ABD:/.test(trimmed) ||
					/^\("input\.aux"\)/.test(trimmed) ||
					/^\(input\.aux\)/.test(trimmed) ||
					/^Output written on input\.dvi/.test(trimmed) ||
					/^Transcript written on input\.log/.test(trimmed)
				);
				if (isNormalDocument) {
					continue;
				} else {
					state = 'document_error';
					if (!errorPhase) errorPhase = 'document';
				}
			}
			
			// Add message if we're in any error state or past normal processing
			if (state === 'preamble_error' || state === 'document_error') {
				filteredMessages.push(message);
			}
		}
		
		// If no error messages, don't show anything
		if (filteredMessages.length === 0) return;
		
		// Join filtered messages
		const allMessages = filteredMessages.join('\n');
		
		// Create error display element directly in the TikZ code block
		const errorDisplay = this.currentTikzElement.createDiv({
			cls: "tikz-error-display"
		});
		
		// Add title based on error phase
		const titleText = errorPhase === 'preamble' 
			? "LaTeX Preamble Error (before \\begin{document})"
			: errorPhase === 'document'
			? "LaTeX Document Error (after \\begin{document})"
			: "TikZJax Log";
			
		const title = errorDisplay.createEl("div", { 
			text: titleText,
			cls: "tikz-error-title"
		});
		title.style.fontWeight = "bold";
		title.style.marginBottom = "8px";
		title.style.color = "var(--text-error)";
		
		// Create scrollable text area for the log
		const logArea = errorDisplay.createEl("pre", { 
			text: allMessages,
			cls: "tikz-log-area"
		});
		logArea.style.maxHeight = "200px";
		logArea.style.overflow = "auto";
		logArea.style.background = "var(--background-primary-alt)";
		logArea.style.color = "var(--text-normal)";
		logArea.style.border = "1px solid var(--background-modifier-border)";
		logArea.style.padding = "8px";
		logArea.style.borderRadius = "4px";
		logArea.style.fontSize = "12px";
		logArea.style.marginTop = "8px";
		logArea.style.whiteSpace = "pre";
		logArea.style.fontFamily = "var(--font-monospace)";
		logArea.style.overflowWrap = "normal";
		logArea.style.userSelect = "text"; // Allow text selection for copying
		
		// Clear the buffer
		this.tikzLogBuffer = [];
	}

	clearLogBuffer() {
		// Clear the log buffer and cancel any pending timer
		this.tikzLogBuffer = [];
		if (this.tikzLogTimer) {
			clearTimeout(this.tikzLogTimer);
			this.tikzLogTimer = null;
		}
	}

}
