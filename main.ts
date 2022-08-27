import { Plugin } from 'obsidian';
import { TikzjaxPluginSettings, DEFAULT_SETTINGS, TikzjaxSettingTab } from "./settings";
import { optimize } from "./svgo.browser";

// @ts-ignore
import tikzjaxJs from 'inline:./tikzjax.js';


export default class TikzjaxPlugin extends Plugin {
	settings: TikzjaxPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TikzjaxSettingTab(this.app, this));

		this.loadTikZJax();
		this.addSyntaxHighlighting();
		this.registerTikzCodeBlock();
	}

	onunload() {
		this.unloadTikZJax();
		this.removeSyntaxHighlighting();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	loadTikZJax() {
		const s = document.createElement("script");
		s.id = "tikzjax";
		s.type = "text/javascript";
		s.innerText = tikzjaxJs;
		document.body.appendChild(s);


		document.addEventListener('tikzjax-load-finished', this.postProcessSvg);
	}

	unloadTikZJax() {
		const s = document.getElementById("tikzjax");
		s.remove();

		document.removeEventListener("tikzjax-load-finished", this.postProcessSvg);
	}


	registerTikzCodeBlock() {
		this.registerMarkdownCodeBlockProcessor("tikz", (source, el, ctx) => {
			const script = el.createEl("script");

			script.setText(this.tidyTikzSource(source));

			script.setAttribute("data-show-console", "true");
			script.setAttribute("type", "text/tikz");
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

	tidyTikzSource(tikzSource: string) {

		// Remove non-breaking space characters, otherwise we get errors
		const remove = "&nbsp;";
		tikzSource = tikzSource.replaceAll(remove, "");


		let lines = tikzSource.split("\n");

		// Trim whitespace that is inserted when pasting in code, otherwise TikZJax complains
		lines = lines.map(line => line.trim());

		// Remove empty lines
		lines = lines.filter(line => line);


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
}

