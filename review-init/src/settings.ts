import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export interface TMDBPluginSettings {
	apiKey: string;
}

export const DEFAULT_SETTINGS: TMDBPluginSettings = {
	apiKey: ''
}

export class TMDBSettingTab extends PluginSettingTab {
	plugin: Plugin & { settings: TMDBPluginSettings; saveSettings: () => Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: TMDBPluginSettings; saveSettings: () => Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'TMDB Plugin Settings' });

		new Setting(containerEl)
			.setName('TMDB API v4 Access Token')
			.setDesc('Enter your TMDB API v4 Bearer token. Get one from https://www.themoviedb.org/settings/api')
			.addText(text => text
				.setPlaceholder('Enter your Bearer token')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
