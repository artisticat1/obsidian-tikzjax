import { App, Modal, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';
// import * as pako from 'pako';

// import string from 'inline:./dist/test.js';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();


		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SampleSettingTab(this.app, this));



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
	}

	unloadTikZJax() {
		const s = document.getElementById("tikzjax");
		s.remove();
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}