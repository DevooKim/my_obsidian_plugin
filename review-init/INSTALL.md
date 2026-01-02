# Obsidian TMDB Plugin 설치 및 사용 가이드

## 플러그인 빌드 방법

1. **의존성 설치**
   ```bash
   cd /Users/hyunwookim/Dev/project/obsidian/review-init
   npm install
   ```

2. **빌드 실행**
   ```bash
   npm run build
   ```
   
   또는 개발 모드로 실행 (파일 변경 감지):
   ```bash
   npm run dev
   ```

3. **Obsidian에 플러그인 설치**
   - 빌드된 파일들 (`main.js`, `manifest.json`, `styles.css`)을 Obsidian vault의 `.obsidian/plugins/tmdb-plugin/` 폴더에 복사
   - 또는 개발 중에는 이 폴더를 심볼릭 링크로 연결:
     ```bash
     ln -s /Users/hyunwookim/Dev/project/obsidian/review-init YOUR_VAULT/.obsidian/plugins/tmdb-plugin
     ```

4. **Obsidian에서 플러그인 활성화**
   - Obsidian 설정 → 커뮤니티 플러그인 → TMDB Plugin 활성화

## 사용 방법

### 1. API 키 설정
1. [TMDB 웹사이트](https://www.themoviedb.org/)에서 계정 생성
2. API 키 발급: Settings → API → Create → Developer
3. Obsidian 설정 → TMDB Plugin → API Key에 입력

### 2. 영화/TV 프로그램 정보 가져오기

#### 방법 1: 제목으로 검색
```
인셉션
```
텍스트를 선택하고 명령 팔레트(Cmd/Ctrl+P) → "Fetch TMDB Data" 실행

#### 방법 2: 타입 지정 검색
```
영화_인셉션
```
또는
```
티비_브레이킹 배드
```

#### 방법 3: URL로 검색
```
https://www.themoviedb.org/movie/27205-inception
```

### 3. Frontmatter 자동 추가
검색 후 선택하면 현재 파일에 다음과 같은 frontmatter가 자동으로 추가됩니다:

```yaml
---
제목: 인셉션
원제목: Inception
장르:
  - 액션
  - 스릴러
  - SF
  - 미스터리
감독:
  - Christopher Nolan
주연:
  - Leonardo DiCaprio
  - Joseph Gordon-Levitt
  - Elliot Page
  - Tom Hardy
  - Ken Watanabe
음악 감독:
  - Hans Zimmer
제작사:
  - Warner Bros. Pictures
  - Legendary Pictures
개봉일: 2010-07-15
상영 시간: 148분
관람일: 
관람 타입: 
관람 매체: 
관람 횟수: 1
평점: 
---
```

## 파일 구조

```
review-init/
├── src/
│   ├── main.ts           # 메인 플러그인 로직
│   ├── settings.ts       # 설정 인터페이스
│   └── tmdb-api.ts       # TMDB API 클라이언트
├── manifest.json         # 플러그인 매니페스트
├── package.json          # npm 설정
├── tsconfig.json         # TypeScript 설정
├── esbuild.config.mjs    # 빌드 설정
├── styles.css            # CSS 스타일
└── README.md
```

## 개발

```bash
# 개발 모드 (파일 변경 감지)
npm run dev

# 프로덕션 빌드
npm run build

# Lint 실행
npm run lint
```

## 주요 기능

- ✅ TMDB API를 통한 영화/TV 프로그램 검색
- ✅ 한국어 지원
- ✅ 자동 Frontmatter 생성
- ✅ 감독, 주연, 음악 감독, 제작사 정보 포함
- ✅ 여러 검색 방법 지원 (제목, 타입+제목, URL)
- ✅ 검색 결과 선택 모달

## 라이선스

MIT
