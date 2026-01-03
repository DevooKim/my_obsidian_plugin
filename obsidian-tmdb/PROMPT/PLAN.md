# 목적
- TMDB에서 영화 및 TV 프로그램 데이터를 가져와서 obsidian의 frontmatter에 추가하는 플러그인 개발

# 사용 방법
- 텍스트를 작성하고 선택한 후 명령 팔레트에서 "Fetch TMDB Data" 명령을 실행합니다.

## 검색 방법
1. {{제목}}
2. {{타입}}_{{제목}} (예: 영화_인셉션, 티비_브레이킹 배드)
3. {{URL}} (예: https://www.themoviedb.org/movie/27205-inception)

# frontmatter 항목
- 제목
- 원제목
- 장르
- 감독
- 주연
- 음악 감독
- 제작사
- 개봉일
- 상영 시간
- 관람일
- 관람 타입
- 관람 매체
- 관람 횟수
- 평점

# 설정
- TMDB API 키: TMDB에서 API 키를 발급받아 입력합니다.