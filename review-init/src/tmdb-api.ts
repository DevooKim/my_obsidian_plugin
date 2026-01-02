// TMDB API 타입 정의
import { requestUrl } from 'obsidian';

export interface TMDBSearchResult {
	page: number;
	results: TMDBMovie[] | TMDBTVShow[];
	total_pages: number;
	total_results: number;
}

export interface TMDBMovie {
	id: number;
	title: string;
	original_title: string;
	overview: string;
	release_date: string;
	genre_ids: number[];
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;
	media_type?: string;
}

export interface TMDBTVShow {
	id: number;
	name: string;
	original_name: string;
	overview: string;
	first_air_date: string;
	genre_ids: number[];
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;
	media_type?: string;
}

export interface TMDBMovieDetails {
	id: number;
	title: string;
	original_title: string;
	overview: string;
	release_date: string;
	genres: { id: number; name: string }[];
	runtime: number | null;
	poster_path: string | null;
	production_companies: { id: number; name: string }[];
	credits?: {
		crew: TMDBCrew[];
		cast: TMDBCast[];
	};
}

export interface TMDBTVShowDetails {
	id: number;
	name: string;
	original_name: string;
	overview: string;
	first_air_date: string;
	genres: { id: number; name: string }[];
	episode_run_time: number[];
	poster_path: string | null;
	production_companies: { id: number; name: string }[];
	created_by: { id: number; name: string }[];
	number_of_seasons: number;
	seasons: Array<{ season_number: number; episode_count: number; name: string; poster_path: string | null; overview: string }>;
	credits?: {
		crew: TMDBCrew[];
		cast: TMDBCast[];
	};
}

export interface TMDBCrew {
	id: number;
	name: string;
	job: string;
	department: string;
}

export interface TMDBCast {
	id: number;
	name: string;
	character: string;
	order: number;
}

export class TMDBApi {
	private accessToken: string;
	private baseUrl = 'https://api.themoviedb.org/3';

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	private getHeaders() {
		return {
			'Authorization': `Bearer ${this.accessToken}`,
			'Content-Type': 'application/json;charset=utf-8'
		};
	}

	// 영화 검색
	async searchMovie(query: string): Promise<TMDBSearchResult> {
		const url = `${this.baseUrl}/search/movie?query=${encodeURIComponent(query)}&language=ko-KR`;
		const response = await requestUrl({ url, headers: this.getHeaders() });
		if (response.status !== 200) {
			throw new Error(`TMDB API error: ${response.status}`);
		}
		return response.json as TMDBSearchResult;
	}

	// TV 프로그램 검색
	async searchTVShow(query: string): Promise<TMDBSearchResult> {
		const url = `${this.baseUrl}/search/tv?query=${encodeURIComponent(query)}&language=ko-KR`;
		const response = await requestUrl({ url, headers: this.getHeaders() });
		if (response.status !== 200) {
			throw new Error(`TMDB API error: ${response.status}`);
		}
		return response.json as TMDBSearchResult;
	}

	// 영화 상세 정보 (크레딧 포함)
	async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
		const url = `${this.baseUrl}/movie/${movieId}?append_to_response=credits&language=ko-KR`;
		const response = await requestUrl({ url, headers: this.getHeaders() });
		if (response.status !== 200) {
			throw new Error(`TMDB API error: ${response.status}`);
		}
		return response.json as TMDBMovieDetails;
	}

	// TV 프로그램 상세 정보 (크레딧 포함)
	async getTVShowDetails(tvId: number): Promise<TMDBTVShowDetails> {
		const url = `${this.baseUrl}/tv/${tvId}?append_to_response=credits&language=ko-KR`;
		const response = await requestUrl({ url, headers: this.getHeaders() });
		if (response.status !== 200) {
			throw new Error(`TMDB API error: ${response.status}`);
		}
		return response.json as TMDBTVShowDetails;
	}

	// URL에서 ID 추출
	extractIdFromUrl(url: string): { type: 'movie' | 'tv'; id: number } | null {
		const movieMatch = url.match(/themoviedb\.org\/movie\/(\d+)/);
		if (movieMatch && movieMatch[1]) {
			return { type: 'movie', id: parseInt(movieMatch[1]) };
		}

		const tvMatch = url.match(/themoviedb\.org\/tv\/(\d+)/);
		if (tvMatch && tvMatch[1]) {
			return { type: 'tv', id: parseInt(tvMatch[1]) };
		}

		return null;
	}
}

// Frontmatter 데이터 생성 헬퍼
export function createMovieFrontmatter(details: TMDBMovieDetails): Record<string, string | string[] | number | boolean> {
	const directors = details.credits?.crew
		.filter(c => c.job === 'Director')
		.map(c => c.name) || [];

	const musicComposers = details.credits?.crew
		.filter(c => c.job === 'Original Music Composer')
		.map(c => c.name) || [];

	const mainCast = details.credits?.cast
		.slice(0, 5)
		.map(c => c.name) || [];

	const productionCompanies = details.production_companies
		.map(c => c.name);

	const today = new Date().toISOString().split('T')[0]!;

	return {
		제목: details.title,
		원제목: details.original_title,
		'Poster URL': details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
		태그: ['영화'],
		장르: details.genres.map(g => g.name),
		감독: directors,
		주연: mainCast,
		'음악 감독': musicComposers,
		제작사: productionCompanies,
		개봉일: details.release_date,
		'상영 시간': details.runtime ? `${details.runtime}분` : '',
		시청일: today,
		'시청 타입': [],
		'시청 매체': [],
		평점: '',
		완료: false
	};
}

export function createTVShowFrontmatter(details: TMDBTVShowDetails): Record<string, string | string[] | number | boolean> {
	const creators = details.created_by.map(c => c.name);

	const musicComposers = details.credits?.crew
		.filter(c => c.job === 'Original Music Composer')
		.map(c => c.name) || [];

	const mainCast = details.credits?.cast
		.slice(0, 5)
		.map(c => c.name) || [];

	const productionCompanies = details.production_companies
		.map(c => c.name);

	const today = new Date().toISOString().split('T')[0]!;

	return {
		제목: details.name,
		원제목: details.original_name,
		'Poster URL': details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
		태그: ['드라마'],
		장르: details.genres.map(g => g.name),
		감독: creators, // TV의 경우 제작자를 감독 필드에
		주연: mainCast,
		'음악 감독': musicComposers,
		제작사: productionCompanies,
		개봉일: details.first_air_date,
		시즌: details.number_of_seasons,
		'현재시즌': '',
		'현재에피소드': '',
		시청일: today,
		'시청 매체': [],
		평점: '',
		완료: false
	};
}

export function getSeasonInfo(details: TMDBTVShowDetails): string {
	const seasonInfo = details.seasons
		.filter(s => s.season_number >= 0) // 스페셜 에피소드 제외 (season_number = 0)
		.map(s => {
			const posterUrl = s.poster_path ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : '';
			const posterLink = posterUrl ? `![${s.name} Poster](${posterUrl})` : '';
			let seasonText = `- ${s.name}: ${s.episode_count}화\n${posterLink}`;
			if (s.overview) {
				seasonText += `\n\n${s.overview}`;
			}
			return seasonText;
		})
		.join('\n\n');
	
	return seasonInfo ? `## 시즌 정보\n\n${seasonInfo}` : '';
}
