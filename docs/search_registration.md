# 검색엔진 등록 순서 (도메인을 연결한 뒤에 하세요)

지금 주소(chrisjangdaejang-ux.github.io/jangdaejang-calc)는 빌린 주소라, 등록은 **도메인을 산 뒤 새 주소로 한 번만** 하면 됩니다.
아래에서 `https://새주소` 는 산 도메인(예: `https://zipyebo.com`)으로 바꿔 읽으세요.

---

## 0. 먼저 할 일 (한 번)

1. 도메인을 사고 GitHub 저장소 jangdaejang-calc 에 연결합니다.
   - https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages 에서 **Custom domain** 칸에 도메인을 적고 **Save** → **Enforce HTTPS** 체크.
2. 사이트 주소 한 줄을 바꿉니다.
   - 파일: https://github.com/chrisjangdaejang-ux/jangdaejang-calc/edit/main/assets/config.js
   - `SITE_URL: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc',` 를 `SITE_URL: 'https://새주소',` 로 바꾸고 **Commit changes...** → **Commit changes**.
   - 또는 Claude 에게 "도메인 ○○로 바꿔 줘"라고만 말해도 됩니다.
3. 다음 날 아침(07:37) 자동 작업이 단지 페이지·sitemap.xml·robots.txt·모든 화면의 대표 주소를 새 주소로 바꿉니다.
   기다리기 싫으면 https://github.com/chrisjangdaejang-ux/jangdaejang-timing/actions/workflows/seo.yml 에서 **Run workflow** → 초록색 **Run workflow** 를 누르세요.
4. 확인: 브라우저에서 `https://새주소/robots.txt` 와 `https://새주소/sitemap.xml` 이 열리면 준비 끝.

> 주의: 지금 화면들은 내부 파일을 `/jangdaejang-calc/…`, 데이터를 `/jangdaejang-data/…` 경로로 부릅니다.
> 도메인을 저장소에 직접 연결하면 이 경로를 함께 바꾸는 작업이 필요합니다(도메인 연결 때 Claude 에게 같이 요청하세요).

---

## 1. 네이버 서치어드바이저

1. https://searchadvisor.naver.com/ 접속 → 네이버 아이디로 로그인 → 위쪽 **웹마스터 도구**.
2. **사이트 등록** 칸에 `https://새주소` 입력 → 오른쪽 화살표(추가) 누르기.
3. 소유 확인 화면에서 **HTML 태그** 를 고릅니다.
   - 보이는 태그 `<meta name="naver-site-verification" content="abc123…" />` 에서 **content 따옴표 안의 값만** 복사합니다.
4. 그 값을 assets/config.js 의 `SITE_VERIFY_NAVER: ''` 따옴표 안에 넣고 저장(또는 Claude 에게 값만 보내기).
5. 위 0-3 처럼 **Run workflow** 를 누르거나 다음 날 아침까지 기다린 뒤, 네이버 화면으로 돌아가 **소유확인** 을 누릅니다.
6. 왼쪽 메뉴 **요청** → **사이트맵 제출** → 칸에 `https://새주소/sitemap.xml` → **확인**.
7. 왼쪽 메뉴 **요청** → **웹 페이지 수집** → `https://새주소/` 와 `https://새주소/apt/` 를 하나씩 넣고 **확인**.
8. 왼쪽 메뉴 **검증** → **robots.txt** 에서 **수집요청**(또는 **검증**)으로 robots.txt 가 읽히는지 확인합니다.

## 2. 구글 서치 콘솔

1. https://search.google.com/search-console 접속 → 구글 아이디로 로그인.
2. 왼쪽 위 속성 선택 칸 → **속성 추가** → 오른쪽 **URL 접두어** 칸에 `https://새주소/` 입력 → **계속**.
3. **HTML 태그** 를 펼쳐 `<meta name="google-site-verification" content="…" />` 의 **content 값만** 복사합니다.
4. 그 값을 assets/config.js 의 `SITE_VERIFY_GOOGLE: ''` 따옴표 안에 넣고 저장(또는 Claude 에게 값만 보내기) → Run workflow(또는 다음 날).
5. 구글 화면으로 돌아가 **확인** 을 누릅니다.
6. 왼쪽 메뉴 **Sitemaps** → **새 사이트맵 추가** 칸에 `sitemap.xml` → **제출**.
7. 위쪽 검색창(**URL 검사**)에 `https://새주소/` 를 넣고 **색인 생성 요청**.

## 3. 다음(Daum) 웹마스터도구

1. https://webmaster.daum.net 접속 → **PIN코드 발급받기**.
2. 사이트 주소에 `https://새주소`, PIN 코드 칸에 영문+숫자 8~12자(나중에 로그인 비밀번호로 씀) → 동의 체크 → **확인**.
3. 발급 화면에서 **클립보드 복사** 를 눌러 `#DaumWebMasterTool:…` 로 시작하는 줄 전체를 복사합니다.
4. 그 줄 전체를 assets/config.js 의 `SITE_VERIFY_DAUM: ''` 따옴표 안에 넣고 저장(또는 Claude 에게 보내기) → Run workflow.
   robots.txt 맨 아래에 그 줄이 붙습니다(`https://새주소/robots.txt` 에서 확인).
5. 다음 화면으로 돌아가 **로봇룰 테스트** → 인증이 끝나면 도메인과 PIN 으로 로그인.
6. 위쪽 **수집 요청** → 사이트맵에 `https://새주소/sitemap.xml` 등록.

---

## 자동으로 되는 것 (따로 할 일 없음)

- 매일 07:37(한국 시각) 단지 페이지·시군구 목록·청약 공고 페이지·sitemap.xml·robots.txt 가 새 자료로 바뀝니다.
- 검색엔진은 sitemap.xml 을 스스로 다시 읽으므로 사이트맵은 **한 번만 제출**하면 됩니다.
- 페이지 주소 규칙은 docs/seo_pages.md 에 있습니다.
