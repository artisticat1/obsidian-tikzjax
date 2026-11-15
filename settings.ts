import { App, PluginSettingTab, Setting, Notice} from 'obsidian';
import TikzjaxPlugin from "./main";
import * as localForage from "localforage";
import { getUiStrings } from "./i18n";


export interface TikzjaxPluginSettings {
	invertColorsInDarkMode: boolean;
}

export const DEFAULT_SETTINGS: TikzjaxPluginSettings = {
	invertColorsInDarkMode: true
}


export class TikzjaxSettingTab extends PluginSettingTab {
	plugin: TikzjaxPlugin;

	constructor(app: App, plugin: TikzjaxPlugin) {
		super(app, plugin);
		this.plugin = plugin;


		// Configure localForage if it hasn't been configured by TikZJax already
		// The try-catch block fixes the plugin failing to load on mobile
		try {
			localForage.config({ name: 'TikzJax', storeName: 'svgImages' });
		} catch (error) {
			console.log(error);
		}
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		const strings = getUiStrings();

		new Setting(containerEl)
			.setName(strings.invertColorsName)
			.setDesc(strings.invertColorsDescription)
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.invertColorsInDarkMode)
				.onChange(async (value) => {
					this.plugin.settings.invertColorsInDarkMode = value;

					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName(strings.clearCacheName)
			.setDesc(strings.clearCacheDescription)
			.addButton(button => button
				.setIcon("trash")
				.setTooltip(strings.clearCacheName)
				.onClick(async () => {
					localForage.clear((err) => {
						if (err) {
							console.log(err);
							new Notice(err, 3000);
						}
						else {
							new Notice(getUiStrings().cacheCleared, 3000);
						}
					});
				}));
	}
}
