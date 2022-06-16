import { App, Modal, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';

// @ts-ignore
import tikzjaxJs from 'inline:./tikzjax.js';


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


		this.registerMarkdownCodeBlockProcessor("tikz", (source, el, ctx) => {
			const script = el.createEl("script");

			script.setText(this.tidyTikzSource(source));

			script.setAttribute("data-show-console", "true");
			script.setAttribute("type", "text/tikz");
		});


		this.loadTikZJax();
		this.addSyntaxHighlighting();
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


		document.addEventListener('tikzjax-load-finished', this.colorSVGinDarkMode);
	}

	unloadTikZJax() {
		const s = document.getElementById("tikzjax");
		s.remove();

		document.removeEventListener("tikzjax-load-finished", this.colorSVGinDarkMode);
	}

	addSyntaxHighlighting() {
		// @ts-ignore
		window.CodeMirror.modeInfo.push({name: "Tikz", mime: "text/x-latex", mode: "stex"});
		this.refreshOpenMarkdownViews();
	}

	removeSyntaxHighlighting() {
		// @ts-ignore
		window.CodeMirror.modeInfo = window.CodeMirror.modeInfo.filter(el => el.name != "Tikz");
		this.refreshOpenMarkdownViews();
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


	colorSVGinDarkMode = (e: Event) => {
		if (!this.settings.invertColorsInDarkMode) return;

		const svg = e.target as HTMLElement;

		// Replace the color "black" with currentColor (the current text color)
		// so that diagram axes, etc are visible in dark mode
		// And replace "white" with the background color

		svg.innerHTML = svg.innerHTML.replaceAll(`"#000"`, `"currentColor"`).replaceAll(`"black"`, `"currentColor"`).replaceAll(`"#fff"`, `"var(--background-primary)"`).replaceAll(`"white"`, `"var(--background-primary)"`);

	}

	refreshOpenMarkdownViews() {
		// To implement
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
					this.plugin.refreshOpenMarkdownViews();

					await this.plugin.saveSettings();
				}));
	}
}