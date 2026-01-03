import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export interface TMDBPluginSettings {
	apiKey: string;
	folderPath: string;
}

export const DEFAULT_SETTINGS: TMDBPluginSettings = {
	apiKey: '',
	folderPath: ''
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

		// 루트 폴더 목록 가져오기
		const rootFolders = this.getRootFolders();
		const folderOptions: Record<string, string> = { '': '(루트)' };
		rootFolders.forEach(folder => {
			folderOptions[folder] = folder;
		});

		new Setting(containerEl)
			.setName('저장 폴더 경로')
			.setDesc('TMDB 데이터를 저장할 폴더를 선택하세요')
			.addDropdown(dropdown => dropdown
				.addOptions(folderOptions)
				.setValue(this.plugin.settings.folderPath)
				.onChange(async (value) => {
					this.plugin.settings.folderPath = value;
					await this.plugin.saveSettings();
				}));
	}

	getRootFolders(): string[] {
		const folders: string[] = [];
		const files = this.app.vault.getAllLoadedFiles();
		
		files.forEach(file => {
			if (file.parent && file.parent.isRoot()) {
				// 루트의 직접 자식인 폴더만 추가
				if ('children' in file) {
					// 파일이 폴더인 경우
					if (!folders.includes(file.name)) {
						folders.push(file.name);
					}
				}
			}
		});

		return folders.sort();
	}
}
