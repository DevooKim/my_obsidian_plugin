import { App, Modal, Notice, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	TMDBPluginSettings,
	TMDBSettingTab,
} from "./settings";
import {
	TMDBApi,
	TMDBMovie,
	TMDBTVShow,
	TMDBTVShowDetails,
	createMovieFrontmatter,
	createTVShowFrontmatter,
	createSeasonFrontmatter,
} from "./tmdb-api";

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
			id: "fetch-tmdb-data",
			name: "Fetch TMDB Data",
			callback: async () => {
				await this.showSearchModal();
			},
		});

		// 설정 탭 추가
		this.addSettingTab(new TMDBSettingTab(this.app, this));
	}

	async showSearchModal() {
		// API 키 확인
		if (!this.settings.apiKey) {
			new Notice("TMDB API 키를 먼저 설정해주세요.");
			return;
		}

		if (!this.tmdbApi) {
			this.tmdbApi = new TMDBApi(this.settings.apiKey);
		}

		// 검색어 입력 모달 표시
		new TMDBSearchInputModal(this.app, (searchText: string) => {
			void this.searchTMDB(searchText);
		}).open();
	}

	async searchTMDB(searchText: string) {
		if (!this.tmdbApi) return;

		const selectedText = searchText.trim();
		if (!selectedText) {
			new Notice("검색어를 입력해주세요.");
			return;
		}

		try {
			// URL인지 확인
			if (selectedText.startsWith("http")) {
				await this.fetchByUrl(selectedText);
			} else {
				// 타입_제목 형식인지 확인
				const typeMatch = selectedText.match(/^(영화|티비|tv)_(.+)$/i);
				if (typeMatch && typeMatch[1] && typeMatch[2]) {
					const type =
						typeMatch[1].toLowerCase() === "영화" ? "movie" : "tv";
					const title = typeMatch[2];
					await this.fetchByTypeAndTitle(type, title);
				} else {
					// 일반 제목으로 검색 (모달로 선택)
					await this.fetchByTitle(selectedText);
				}
			}
		} catch (error) {
			console.error("TMDB API error:", error);
			const errorMessage =
				error instanceof Error ? error.message : "알 수 없는 오류";
			new Notice(`오류가 발생했습니다: ${errorMessage}`);
		}
	}

	async fetchByUrl(url: string) {
		if (!this.tmdbApi) return;

		const result = this.tmdbApi.extractIdFromUrl(url);
		if (!result) {
			new Notice("올바른 TMDB URL이 아닙니다.");
			return;
		}

		await this.fetchDetails(result.type, result.id);
	}

	async fetchByTypeAndTitle(type: "movie" | "tv", title: string) {
		if (!this.tmdbApi) return;

		const searchResults =
			type === "movie"
				? await this.tmdbApi.searchMovie(title)
				: await this.tmdbApi.searchTVShow(title);

		if (searchResults.results.length === 0) {
			new Notice("검색 결과가 없습니다.");
			return;
		}

		new TMDBSearchModal(
			this.app,
			searchResults.results as Array<TMDBMovie | TMDBTVShow>,
			(selected) => {
				void this.fetchDetails(type, selected.id);
			},
		).open();
	}

	async fetchByTitle(title: string) {
		if (!this.tmdbApi) return;

		// 영화와 TV 프로그램 모두 검색
		const [movieResults, tvResults] = await Promise.all([
			this.tmdbApi.searchMovie(title),
			this.tmdbApi.searchTVShow(title),
		]);

		const allResults = [
			...movieResults.results.map((r) => ({ ...r, media_type: "movie" })),
			...tvResults.results.map((r) => ({ ...r, media_type: "tv" })),
		];

		if (allResults.length === 0) {
			new Notice("검색 결과가 없습니다.");
			return;
		}

		// 결과 선택 모달 표시
		new TMDBSearchModal(this.app, allResults, (selected) => {
			const type = selected.media_type === "movie" ? "movie" : "tv";
			void this.fetchDetails(type, selected.id);
		}).open();
	}

	async fetchDetails(type: "movie" | "tv", id: number) {
		if (!this.tmdbApi) return;

		if (type === "movie") {
			const details = await this.tmdbApi.getMovieDetails(id);
			const frontmatter = createMovieFrontmatter(details);
			const title = details.title;
			const overview = details.overview;
			await this.createNewFile(
				frontmatter,
				"movie",
				title,
				title,
				"",
				overview,
				true,
			);
			new Notice("TMDB 데이터가 추가되었습니다!");
		} else {
			const details = await this.tmdbApi.getTVShowDetails(id);
			// 시즌 선택 모달 표시
			new TMDBSeasonSelectionModal(
				this.app,
				details,
				(selectedSeasons: number[]) => {
					void this.createTVShowFiles(details, selectedSeasons);
				},
			).open();
		}
	}

	async createTVShowFiles(
		details: TMDBTVShowDetails,
		selectedSeasons: number[],
	) {
		const showName = details.name;
		const overview = details.overview;
		const frontmatter = createTVShowFrontmatter(details);

		// 시즌별 파일 링크 생성
		const seasonLinks: string[] = [];
		const validSeasons = details.seasons.filter(
			(s: { id: number; season_number: number }) => s.season_number > 0,
		);

		for (const season of validSeasons) {
			if (selectedSeasons.includes(season.season_number)) {
				const seasonFileName = this.sanitizeName(
					`${showName} ${season.name}`,
				);
				seasonLinks.push(`- [[${seasonFileName}]]`);

				// 시즌별 파일 생성
				const seasonFrontmatter = createSeasonFrontmatter(
					details,
					season,
				);
				const seasonOverview = season.overview || "";
				await this.createNewFile(
					seasonFrontmatter,
					"tv",
					showName,
					seasonFileName,
					"",
					seasonOverview,
					false,
				);
			}
		}

		const seriesName = this.sanitizeName(`${showName} - 메인`);

		// 메인 TV 쇼 파일 생성 (시즌 링크 포함)
		const seasonLinksText =
			seasonLinks.length > 0
				? `${seasonLinks.join("\n")}`
				: "";
		await this.createNewFile(
			frontmatter,
			"tv",
			showName,
			seriesName,
			seasonLinksText,
			overview,
			true,
		);

		new Notice("TMDB 데이터가 추가되었습니다!");
	}

	async createNewFile(
		data: Record<string, string | string[] | number | boolean | null>,
		mediaType: "movie" | "tv",
		showName: string,
		fileName: string,
		seasonInfo?: string,
		overview?: string,
		isMainFile: boolean = false,
	) {
		if (!showName || !fileName) {
			new Notice("제목을 찾을 수 없습니다.");
			return;
		}

		const safeShowName = this.sanitizeName(showName);
		const safeFileName = this.sanitizeName(fileName);

		// 파일 경로 생성: {folderPath}/{mediaType}/{showName}/{fileName}.md
		const basePath = this.settings.folderPath || "";
		const typeFolder = basePath ? `${basePath}/${mediaType}` : mediaType;
		const folderPath = `${typeFolder}/${safeShowName}`;
		const filePath = `${folderPath}/${safeFileName}.md`;

		// 폴더가 없으면 생성
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}

		// 파일이 이미 존재하는지 확인
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile) {
			// 이미 존재하면 스킵
			return;
		}

		// 파일 내용 생성
		const newFrontmatter = this.generateFrontmatterString(data);
		let newContent = newFrontmatter;

		// overview가 있으면 본문에 추가
		if (overview) {
			newContent = newContent + "\n## 개요\n" + overview;
		}

		// 시즌 정보가 있으면 본문에 추가
		if (seasonInfo) {
			newContent = newContent + "\n\n## 시즌 정보\n" + seasonInfo;
		}

		if (isMainFile) {
			newContent = newContent + "\n\n## 리뷰\n";
		}

		// 파일 생성
		const file = await this.app.vault.create(filePath, newContent);

		// 메인 파일인 경우에만 열기 (isMainFile)
		// if (isMainFile) {
		// 	const leaf = this.app.workspace.getLeaf("tab");
		// 	await leaf.openFile(file);
		// }
	}

	sanitizeName(name: string): string {
		return name.replace(/:/g, " - ");
	}

	generateFrontmatterString(
		data: Record<string, string | string[] | number | boolean | null>,
	): string {
		let result = "---\n";
		for (const [key, value] of Object.entries(data)) {
			if (Array.isArray(value)) {
				if (value.length > 0) {
					result += `${key}:\n`;
					value.forEach((item) => {
						result += `  - ${item}\n`;
					});
				} else {
					result += `${key}: []\n`;
				}
			} else if (value !== null && value !== undefined && value !== "") {
				// 숫자나 불린이 아닌 경우 따옴표로 감싸기
				if (
					typeof value === "string" &&
					(value.includes(":") || value.includes("#"))
				) {
					result += `${key}: "${value}"\n`;
				} else {
					result += `${key}: ${value}\n`;
				}
			} else {
				result += `${key}: \n`;
			}
		}
		result += "---\n";
		return result;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TMDBPluginSettings>,
		);
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

	constructor(
		app: App,
		results: Array<TMDBMovie | TMDBTVShow>,
		onSelect: (result: TMDBMovie | TMDBTVShow) => void,
	) {
		super(app);
		this.results = results;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "검색 결과" });

		const resultList = contentEl.createDiv({ cls: "tmdb-result-list" });

		this.results.forEach((result) => {
			const item = resultList.createDiv({ cls: "tmdb-result-item" });

			const isMovie = "title" in result;
			const title = isMovie ? result.title : result.name;
			const releaseDate = isMovie
				? result.release_date
				: result.first_air_date;
			const mediaType = isMovie ? "영화" : "TV";

			item.createEl("div", {
				text: `${title} (${mediaType})`,
				cls: "tmdb-result-title",
			});

			if (releaseDate) {
				item.createEl("div", {
					text: `개봉일: ${releaseDate}`,
					cls: "tmdb-release-date",
				});
			}

			if (result.overview) {
				const overview = item.createEl("div", {
					text: result.overview,
					cls: "tmdb-overview",
				});
				// 요약 텍스트 줄이기
				if (result.overview.length > 100) {
					overview.setText(result.overview.substring(0, 100) + "...");
				}
			}

			item.addEventListener("click", () => {
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

class TMDBSearchInputModal extends Modal {
	onSubmit: (searchText: string) => void;

	constructor(app: App, onSubmit: (searchText: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "TMDB 검색" });

		const inputContainer = contentEl.createDiv();
		const input = inputContainer.createEl("input", {
			type: "text",
			placeholder: "영화/TV 제목 또는 URL을 입력하세요...",
			cls: "tmdb-search-input",
		});

		const buttonContainer = contentEl.createDiv({
			cls: "tmdb-button-container",
		});

		const searchButton = buttonContainer.createEl("button", {
			text: "검색",
			cls: "mod-cta",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "취소",
		});

		const handleSearch = () => {
			const value = input.value.trim();
			if (value) {
				this.close();
				this.onSubmit(value);
			} else {
				new Notice("검색어를 입력해주세요.");
			}
		};

		searchButton.addEventListener("click", handleSearch);
		cancelButton.addEventListener("click", () => this.close());

		input.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter" && !e.isComposing) {
				e.preventDefault();
				e.stopPropagation();
				handleSearch();
			}
		});

		// 포커스 설정
		setTimeout(() => input.focus(), 10);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TMDBSeasonSelectionModal extends Modal {
	details: TMDBTVShowDetails;
	onSelect: (selectedSeasons: number[]) => void;
	selectedSeasons: Set<number>;

	constructor(
		app: App,
		details: TMDBTVShowDetails,
		onSelect: (selectedSeasons: number[]) => void,
	) {
		super(app);
		this.details = details;
		this.onSelect = onSelect;
		this.selectedSeasons = new Set();
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: `${this.details.name} - 시즌 선택` });

		contentEl.createEl("p", {
			text: "생성할 시즌을 선택하세요",
			cls: "tmdb-season-desc",
		});

		// 전체 선택 체크박스
		const selectAllContainer = contentEl.createDiv({
			cls: "tmdb-season-item",
		});
		const selectAllCheckbox = selectAllContainer.createEl("input", {
			type: "checkbox",
		});
		selectAllCheckbox.id = "select-all";
		selectAllContainer.createEl("label", {
			text: "전체 선택",
			attr: { for: "select-all" },
		});

		const seasonList = contentEl.createDiv({ cls: "tmdb-season-list" });

		// 시즌 목록 (스페셜 제외)
		const validSeasons = this.details.seasons.filter(
			(s: { id: number; season_number: number }) => s.season_number > 0,
		);

		const checkboxes: HTMLInputElement[] = [];

		validSeasons.forEach(
			(season: {
				id: number;
				season_number: number;
				name: string;
				episode_count: number;
				air_date: string;
			}) => {
				const item = seasonList.createDiv({ cls: "tmdb-season-item" });

				const checkbox = item.createEl("input", { type: "checkbox" });
				checkbox.value = season.season_number.toString();
				checkbox.id = `season-${season.season_number}`;
				checkboxes.push(checkbox);

				const label = item.createEl("label", {
					attr: { for: `season-${season.season_number}` },
				});
				label.createEl("strong", { text: season.name });
				label.createEl("span", {
					text: ` - ${season.episode_count}개 에피소드`,
				});
				if (season.air_date) {
					label.createEl("span", { text: ` (${season.air_date})` });
				}

				checkbox.addEventListener("change", () => {
					if (checkbox.checked) {
						this.selectedSeasons.add(season.season_number);
					} else {
						this.selectedSeasons.delete(season.season_number);
					}
					// 전체 선택 체크박스 상태 업데이트
					selectAllCheckbox.checked =
						this.selectedSeasons.size === validSeasons.length;
				});
			},
		);

		// 전체 선택 이벤트
		selectAllCheckbox.addEventListener("change", () => {
			const isChecked = selectAllCheckbox.checked;
			checkboxes.forEach((cb) => {
				cb.checked = isChecked;
				const seasonNum = parseInt(cb.value);
				if (isChecked) {
					this.selectedSeasons.add(seasonNum);
				} else {
					this.selectedSeasons.delete(seasonNum);
				}
			});
		});

		// 버튼 컨테이너
		const buttonContainer = contentEl.createDiv({
			cls: "tmdb-button-container",
		});

		const createButton = buttonContainer.createEl("button", {
			text: "생성",
			cls: "mod-cta",
		});
		const cancelButton = buttonContainer.createEl("button", {
			text: "취소",
		});

		createButton.addEventListener("click", () => {
			if (this.selectedSeasons.size === 0) {
				new Notice("최소 1개 이상의 시즌을 선택해주세요.");
				return;
			}
			this.close();
			this.onSelect(Array.from(this.selectedSeasons));
		});

		cancelButton.addEventListener("click", () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
