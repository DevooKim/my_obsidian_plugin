# TMDB Plugin for Obsidian

TMDB에서 영화 및 TV 프로그램 데이터를 가져와서 Obsidian의 frontmatter에 추가하는 플러그인입니다.

## 기능

- TMDB API를 사용하여 영화/TV 프로그램 검색
- 선택한 텍스트를 기반으로 자동 검색
- Frontmatter에 자동으로 메타데이터 추가

## 사용 방법

1. 설정에서 TMDB API 키를 입력합니다
   - TMDB 웹사이트(https://www.themoviedb.org/)에서 계정을 만들고 API 키를 발급받으세요
   
2. 검색하려는 영화나 TV 프로그램 제목을 작성하고 선택합니다

3. 명령 팔레트(Cmd/Ctrl+P)에서 "Fetch TMDB Data" 명령을 실행합니다

### 검색 방법

1. **제목으로 검색**: `인셉션`을 선택하고 명령 실행
2. **타입 지정 검색**: `영화_인셉션` 또는 `티비_브레이킹 배드`를 선택하고 명령 실행
3. **URL로 검색**: `https://www.themoviedb.org/movie/27205-inception`을 선택하고 명령 실행

## 추가되는 Frontmatter 항목

- 제목
- 원제목
- 장르
- 감독
- 주연
- 음악 감독
- 제작사
- 개봉일
- 상영 시간
- 관람일 (수동 입력)
- 관람 타입 (수동 입력)
- 관람 매체 (수동 입력)
- 관람 횟수 (기본값: 1)
- 평점 (수동 입력)

## 설치

1. 이 폴더를 Obsidian vault의 `.obsidian/plugins/` 폴더에 복사
2. `npm install` 실행
3. `npm run build` 실행
4. Obsidian에서 플러그인 활성화

## 개발

```bash
# 의존성 설치
npm install

# 개발 모드 (파일 변경 감지)
npm run dev

# 프로덕션 빌드
npm run build
```

## 라이선스

MIT
