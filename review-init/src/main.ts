import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, TMDBPluginSettings, TMDBSettingTab } from "./settings";
import { TMDBApi, TMDBMovie, TMDBTVShow, createMovieFrontmatter, createTVShowFrontmatter, getSeasonInfo } from "./tmdb-api";

export default class TMDBPlugin extends Plugin {
	settings: TMDBPluginSettings;
	tmdbApi: TMDBApi | null = null;

	async onload() {
		await this.loadSettings();

		// API 키가 설정되어 있으면 API 인스턴스 생성
		if (this.settings.apiKey) {
			this.tmdbApi = new TMDBApi(this.settings.apiKey);
		}

		// TMDB 데이터 가져오기 명령
		this.addCommand({
			id: 'fetch-tmdb-data',
			name: 'Fetch TMDB Data',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.fetchTMDBData(editor, view);
			}
		});

		// 설정 탭 추가
		this.addSettingTab(new TMDBSettingTab(this.app, this));
	}

	async fetchTMDBData(editor: Editor, view: MarkdownView) {
		// API 키 확인
		if (!this.settings.apiKey) {
			new Notice('TMDB API 키를 먼저 설정해주세요.');
			return;
		}

		if (!this.tmdbApi) {
			this.tmdbApi = new TMDBApi(this.settings.apiKey);
		}

		// 선택된 텍스트 가져오기
		const selectedText = editor.getSelection().trim();
		if (!selectedText) {
			new Notice('텍스트를 선택해주세요.');
			return;
		}

		try {
			// URL인지 확인
			if (selectedText.startsWith('http')) {
				await this.fetchByUrl(selectedText, view, editor);
			} else {
				// 타입_제목 형식인지 확인
				const typeMatch = selectedText.match(/^(영화|티비|tv)_(.+)$/i);
				if (typeMatch && typeMatch[1] && typeMatch[2]) {
					const type = typeMatch[1].toLowerCase() === '영화' ? 'movie' : 'tv';
					const title = typeMatch[2];
					await this.fetchByTypeAndTitle(type, title, view, editor);
				} else {
					// 일반 제목으로 검색 (모달로 선택)
					await this.fetchByTitle(selectedText, view, editor);
				}
			}
		} catch (error) {
			console.error('TMDB API error:', error);
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
			new Notice(`오류가 발생했습니다: ${errorMessage}`);
		}
	}

	async fetchByUrl(url: string, view: MarkdownView, editor: Editor) {
		if (!this.tmdbApi) return;

		const result = this.tmdbApi.extractIdFromUrl(url);
		if (!result) {
			new Notice('올바른 TMDB URL이 아닙니다.');
			return;
		}

		await this.fetchDetails(result.type, result.id, view, editor);
	}

	async fetchByTypeAndTitle(type: 'movie' | 'tv', title: string, view: MarkdownView, editor: Editor) {
		if (!this.tmdbApi) return;

		const searchResults = type === 'movie'
			? await this.tmdbApi.searchMovie(title)
			: await this.tmdbApi.searchTVShow(title);

		if (searchResults.results.length === 0) {
			new Notice('검색 결과가 없습니다.');
			return;
		}

		// 첫 번째 결과 사용
		const firstResult = searchResults.results[0];
		if (!firstResult) {
			new Notice('검색 결과가 없습니다.');
			return;
		}
		await this.fetchDetails(type, firstResult.id, view, editor);
	}

	async fetchByTitle(title: string, view: MarkdownView, editor: Editor) {
		if (!this.tmdbApi) return;

		// 영화와 TV 프로그램 모두 검색
		const [movieResults, tvResults] = await Promise.all([
			this.tmdbApi.searchMovie(title),
			this.tmdbApi.searchTVShow(title)
		]);

		const allResults = [
			...movieResults.results.map(r => ({ ...r, media_type: 'movie' })),
			...tvResults.results.map(r => ({ ...r, media_type: 'tv' }))
		];

		if (allResults.length === 0) {
			new Notice('검색 결과가 없습니다.');
			return;
		}

		// 결과 선택 모달 표시
		new TMDBSearchModal(this.app, allResults, (selected) => {
			const type = selected.media_type === 'movie' ? 'movie' : 'tv';
			void this.fetchDetails(type, selected.id, view, editor);
		}).open();
	}

	async fetchDetails(type: 'movie' | 'tv', id: number, view: MarkdownView, editor: Editor) {
		if (!this.tmdbApi) return;

		let title = '';
		let seasonInfo = '';
		let overview = '';
		if (type === 'movie') {
			const details = await this.tmdbApi.getMovieDetails(id);
			const frontmatter = createMovieFrontmatter(details);
			title = details.title;
			overview = details.overview;
			await this.addFrontmatter(view, frontmatter, title, '', overview);
		} else {
			const details = await this.tmdbApi.getTVShowDetails(id);
			const frontmatter = createTVShowFrontmatter(details);
			title = details.name;
			seasonInfo = getSeasonInfo(details);
			overview = details.overview;
			await this.addFrontmatter(view, frontmatter, title, seasonInfo, overview);
		}

		// 선택된 텍스트 제거
		editor.replaceSelection('');

		new Notice("TMDB 데이터가 추가되었습니다!");
	}

	async addFrontmatter(view: MarkdownView, data: Record<string, string | string[] | number | boolean | null>, title?: string, seasonInfo?: string, overview?: string) {
		const file = view.file;
		if (!file) return;

		const content = await this.app.vault.read(file);
		const newFrontmatter = this.generateFrontmatterString(data);

		// 기존 frontmatter가 있는지 확인
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
		const match = content.match(frontmatterRegex);

		let newContent: string;
		if (match) {
			// 기존 frontmatter 업데이트
			newContent = content.replace(frontmatterRegex, newFrontmatter);
		} else {
			// 새 frontmatter 추가
			newContent = newFrontmatter + content;
		}

		// overview가 있으면 본문에 추가
		if (overview) {
			newContent = newContent + '\n## 개요\n\n' + overview;
		}

		// 시즌 정보가 있으면 본문에 추가
		if (seasonInfo) {
			newContent = newContent + '\n' + seasonInfo;
		}

		await this.app.vault.modify(file, newContent);

		// 파일명을 제목으로 변경
		if (title && file.basename !== title) {
			const newPath = file.parent ? `${file.parent.path}/${title}.md` : `${title}.md`;
			await this.app.fileManager.renameFile(file, newPath);
		}
	}

	generateFrontmatterString(data: Record<string, string | string[] | number | boolean | null>): string {
		let result = '---\n';
		for (const [key, value] of Object.entries(data)) {
			if (Array.isArray(value)) {
				if (value.length > 0) {
					result += `${key}:\n`;
					value.forEach(item => {
						result += `  - ${item}\n`;
					});
				} else {
					result += `${key}: []\n`;
				}
			} else if (value !== null && value !== undefined && value !== '') {
				// 숫자나 불린이 아닌 경우 따옴표로 감싸기
				if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
					result += `${key}: "${value}"\n`;
				} else {
					result += `${key}: ${value}\n`;
				}
			} else {
				result += `${key}: \n`;
			}
		}
		result += '---\n';
		return result;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TMDBPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// API 키가 변경되면 API 인스턴스 다시 생성
		if (this.settings.apiKey) {
			this.tmdbApi = new TMDBApi(this.settings.apiKey);
		}
	}
}

class TMDBSearchModal extends Modal {
	results: Array<TMDBMovie | TMDBTVShow>;
	onSelect: (result: TMDBMovie | TMDBTVShow) => void;

	constructor(app: App, results: Array<TMDBMovie | TMDBTVShow>, onSelect: (result: TMDBMovie | TMDBTVShow) => void) {
		super(app);
		this.results = results;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '검색 결과' });

		const resultList = contentEl.createDiv({ cls: 'tmdb-result-list' });

		this.results.forEach((result) => {
			const item = resultList.createDiv({ cls: 'tmdb-result-item' });

			const isMovie = 'title' in result;
			const title = isMovie ? result.title : result.name;
			const releaseDate = isMovie ? result.release_date : result.first_air_date;
			const mediaType = isMovie ? '영화' : 'TV';

			item.createEl('div', { text: `${title} (${mediaType})`, cls: 'tmdb-result-title' });

			if (releaseDate) {
				item.createEl('div', { text: `개봉일: ${releaseDate}`, cls: 'tmdb-release-date' });
			}

			if (result.overview) {
				const overview = item.createEl('div', { text: result.overview, cls: 'tmdb-overview' });
				// 요약 텍스트 줄이기
				if (result.overview.length > 100) {
					overview.setText(result.overview.substring(0, 100) + '...');
				}
			}

			item.addEventListener('click', () => {
				this.onSelect(result);
				this.close();
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}