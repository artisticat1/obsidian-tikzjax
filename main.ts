import { Plugin, WorkspaceWindow } from 'obsidian';
import { TikzjaxPluginSettings, DEFAULT_SETTINGS, TikzjaxSettingTab } from './settings';

// @ts-ignore - esbuild inline import plugin
import tikzjaxJs from 'inline:./tikzjax.js';

// Import transformer pipeline
import {
	SvgPipeline,
	createPipeline,
	createDarkModeTransformer,
	createSvgoTransformer,
} from './src/transformers';

// Import utilities
import { tidyTikzSource } from './src/utils';

/**
 * TikZJax Plugin for Obsidian
 * 
 * Renders LaTeX and TikZ diagrams in Obsidian notes using the TikZJax library.
 */
export default class TikzjaxPlugin extends Plugin {
	settings!: TikzjaxPluginSettings;

	/** SVG processing pipeline with composable transformers */
	private pipeline!: SvgPipeline;

	/** Tracks elements currently being processed to prevent duplicates */
	private processingQueue: Set<HTMLElement> = new Set();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.initializePipeline();
		this.addSettingTab(new TikzjaxSettingTab(this.app, this));

		// Support pop-out windows
		this.app.workspace.onLayoutReady(() => {
			this.loadTikZJaxAllWindows();
			this.registerEvent(
				this.app.workspace.on('window-open', (_win, window) => {
					this.loadTikZJax(window.document);
				})
			);
		});

		this.addSyntaxHighlighting();
		this.registerTikzCodeBlock();
	}

	onunload(): void {
		this.unloadTikZJaxAllWindows();
		this.removeSyntaxHighlighting();
		this.processingQueue.clear();
		this.pipeline.clear();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		// Update pipeline when settings change
		this.updatePipelineSettings();
	}

	/**
	 * Initialize the SVG processing pipeline with transformers
	 */
	private initializePipeline(): void {
		this.pipeline = createPipeline({
			debug: false,
			continueOnError: true,
		});

		// Add transformers in priority order
		this.pipeline
			.add(createDarkModeTransformer(this.settings.invertColorsInDarkMode))
			.add(createSvgoTransformer(100)); // 100ms idle timeout
	}

	/**
	 * Update pipeline transformer settings when user preferences change
	 */
	private updatePipelineSettings(): void {
		this.pipeline.setEnabled('dark-mode-color', this.settings.invertColorsInDarkMode);
	}

	/**
	 * Load TikZJax script into a document
	 */
	loadTikZJax(doc: Document): void {
		// Check if already loaded
		if (doc.getElementById('tikzjax')) {
			return;
		}

		const script = doc.createElement('script');
		script.id = 'tikzjax';
		script.type = 'text/javascript';
		script.textContent = tikzjaxJs;
		doc.body.appendChild(script);

		doc.addEventListener('tikzjax-load-finished', this.postProcessSvg);
	}

	/**
	 * Unload TikZJax from a document
	 */
	unloadTikZJax(doc: Document): void {
		const script = doc.getElementById('tikzjax');
		if (script) {
			script.remove();
		}

		doc.removeEventListener('tikzjax-load-finished', this.postProcessSvg);
	}

	/**
	 * Load TikZJax into all windows (main and pop-outs)
	 */
	loadTikZJaxAllWindows(): void {
		for (const win of this.getAllWindows()) {
			this.loadTikZJax(win.document);
		}
	}

	/**
	 * Unload TikZJax from all windows
	 */
	unloadTikZJaxAllWindows(): void {
		for (const win of this.getAllWindows()) {
			this.unloadTikZJax(win.document);
		}
	}

	/**
	 * Get all open windows (main + floating)
	 * @see https://discord.com/channels/686053708261228577/840286264964022302/991591350107635753
	 */
	getAllWindows(): Window[] {
		const windows: Window[] = [];

		// Main window
		windows.push(this.app.workspace.rootSplit.win);

		// Floating windows (undocumented API)
		// @ts-ignore - floatingSplit is undocumented
		const floatingSplit = this.app.workspace.floatingSplit;
		if (floatingSplit?.children) {
			floatingSplit.children.forEach((child: unknown) => {
				if (child instanceof WorkspaceWindow) {
					windows.push(child.win);
				}
			});
		}

		return windows;
	}

	/**
	 * Register the tikz code block processor
	 */
	registerTikzCodeBlock(): void {
		this.registerMarkdownCodeBlockProcessor('tikz', (source, el) => {
			const script = el.createEl('script');
			script.setAttribute('type', 'text/tikz');
			script.setAttribute('data-show-console', 'true');
			script.setText(tidyTikzSource(source));
		});
	}

	/**
	 * Add TikZ syntax highlighting support to CodeMirror
	 */
	addSyntaxHighlighting(): void {
		// @ts-ignore - CodeMirror global
		if (window.CodeMirror?.modeInfo) {
			// @ts-ignore
			window.CodeMirror.modeInfo.push({
				name: 'Tikz',
				mime: 'text/x-latex',
				mode: 'stex',
			});
		}
	}

	/**
	 * Remove TikZ syntax highlighting from CodeMirror
	 */
	removeSyntaxHighlighting(): void {
		// @ts-ignore - CodeMirror global
		if (window.CodeMirror?.modeInfo) {
			// @ts-ignore
			window.CodeMirror.modeInfo = window.CodeMirror.modeInfo.filter(
				(el: { name: string }) => el.name !== 'Tikz'
			);
		}
	}

	/**
	 * Post-process rendered SVG through the transformer pipeline
	 * Arrow function to preserve `this` context when used as event handler
	 */
	postProcessSvg = async (event: Event): Promise<void> => {
		const svgEl = event.target as HTMLElement;

		// Prevent duplicate processing
		if (this.processingQueue.has(svgEl)) {
			return;
		}
		this.processingQueue.add(svgEl);

		try {
			const originalSvg = svgEl.outerHTML;
			const processedSvg = await this.pipeline.process(originalSvg, svgEl);

			// Only update DOM if element is still attached and content changed
			if (svgEl.parentElement && processedSvg !== originalSvg) {
				svgEl.outerHTML = processedSvg;
			}
		} catch (error) {
			console.error('TikZJax: SVG post-processing failed', error);
		} finally {
			this.processingQueue.delete(svgEl);
		}
	};
}

