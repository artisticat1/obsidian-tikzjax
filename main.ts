import { App, Modal, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';
// import * as pako from 'pako';

// import string from 'inline:./dist/test.js';


interface TikzjaxPluginSettings {
	invertColorsInDarkMode: boolean;
}

const DEFAULT_SETTINGS: TikzjaxPluginSettings = {
	invertColorsInDarkMode: true
}

export default class TikzjaxPlugin extends Plugin {
	settings: TikzjaxPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TikzjaxSettingTab(this.app, this));


		// console.log(string);



		this.registerMarkdownCodeBlockProcessor("tikz", (source, el, ctx) => {

			const script = el.createEl("script");
			let lines = source.split("\n");


			// Trim whitespace that is inserted when pasting in code
			// Otherwise TikZJax complains
			lines = lines.map(function (line: string) {
				return line.trim();
			})


			// Remove empty lines
			lines = lines.filter(function (line: string) {
				return line;
			})


			script.setText(lines.join("\n"));

			script.setAttribute("data-show-console", "true");
			script.setAttribute("type", "text/tikz");
		});


		this.loadTikZJax();
	}

	onunload() {
		this.unloadTikZJax();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	// async loadDecompress(path: string) {
	// 	const adapter = this.app.vault.adapter;
	// 	const arrayBuffer = await adapter.readBinary(path);

	// 	var uint8View = new Uint8Array(arrayBuffer);

	// 	const result = pako.inflate(uint8View);
	// 	console.log(result);

	// 	return result;
	// }

	loadTikZJax() {
		const s = document.createElement("script");
		s.id = "tikzjax";
		s.type = "text/javascript";
		s.src = "https://cdn.jsdelivr.net/gh/artisticat1/obsidian-tikzjax@master/dist/tikzjax.js";
		document.body.appendChild(s);


		document.addEventListener('tikzjax-load-finished', this.colorSVGinDarkMode);
	}

	unloadTikZJax() {
		const s = document.getElementById("tikzjax");
		s.remove();

		document.removeEventListener("tikzjax-load-finished", this.colorSVGinDarkMode);
	}


	colorSVGinDarkMode = (e: Event) => {
		if (!this.settings.invertColorsInDarkMode) return;

		const svg = e.target as HTMLElement;

		// Replace the color "black" with currentColor (the current text color)
		// so that diagram axes, etc are visible in dark mode

		svg.innerHTML = svg.innerHTML.replaceAll(`"#000"`, `"currentColor"`).replaceAll(`"black"`, `"currentColor"`);

	}
}


class TikzjaxSettingTab extends PluginSettingTab {
	plugin: TikzjaxPlugin;

	constructor(app: App, plugin: TikzjaxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h4', {text: 'TikZJax settings'});

		new Setting(containerEl)
			.setName('Invert dark colors in dark mode')
			.setDesc('Invert dark colors in diagrams (e.g. axes, arrows) when in dark mode, so that they are visible.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.invertColorsInDarkMode)
				.onChange(async (value) => {
					this.plugin.settings.invertColorsInDarkMode = value;

					// TODO: Refresh currently open views

					await this.plugin.saveSettings();
				}));
	}
}