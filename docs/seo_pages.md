# 검색용 정적 페이지 — 주소 규칙과 만드는 방법

만드는 곳: 엔진 `scripts/seo_pages.py` (비공개 저장소), 실행: jangdaejang-timing `.github/workflows/seo.yml` (매일 07:37 한국 시각) → 이 저장소 main 에 올림.
읽는 자료: 공개 데이터(jangdaejang-data)의 `data/index.json`, `data/price/{시군구}.json`, `data/s??_xy.json`, `data/chungyak/notices.json` 만.
미래가치 점수·근거·모델 값은 싣지 않습니다.

## 주소 (한 번 정하면 바꾸지 않음)

| 주소 | 내용 |
|---|---|
| `{SITE_URL}/apt/` | 시·도별 시군구 목록 |
| `{SITE_URL}/apt/{시군구코드}/` | 시군구 단지 목록, 거래 많은 순 100곳씩 (`page/2/`, `page/3/` …) |
| `{SITE_URL}/apt/{시군구코드}/{단지ID}-{단지명}/` | 단지 페이지 |
| `{SITE_URL}/cy/` · `{SITE_URL}/cy/{공고번호}/` | 청약 공고 목록·공고 페이지(공고일 뒤 400일 유지, 장부 `cy/notices.json`) |
| `{SITE_URL}/sitemap.xml` | 사이트맵 목록 → `sitemaps/pages.xml`(일반 화면), `region.xml`, `cy.xml`, `apt-1.xml`… (파일당 1만 주소) |
| `{SITE_URL}/robots.txt` | 막는 경로(로그인·내 정보·결제 결과 등) + 사이트맵 위치 |

- 단지ID = `sha1("시군구코드|법정동|지번|단지명")` 앞 8자. 같은 단지는 늘 같은 주소입니다. 예: `/apt/11710/5f549b3c-헬리오시티/`
- 시군구코드는 행정 표준 5자리(예: 강남구 11680).

## 어떤 단지를 싣나

- 최근 3년 자료 기간에 직거래 뺀 매매 10건 이상 **이고** 마지막 거래가 최근 2년 안인 단지(2026년 10월 자료 기준 19,512곳).
- 상한 30,000곳(넘으면 거래 많은 단지부터). 기준은 `seo_pages.py` 맨 위 `MIN_TRADES`·`RECENT_MONTHS`·`MAX_PAGES`.

## 페이지에 들어가는 것

제목 `{단지명} 실거래가·시세·미래가치 | {SITE_NAME}`(이름이 같은 단지가 있으면 위치를 붙여 모든 제목이 다름), 설명(최근 거래가·3년 거래 수·자료 기간),
canonical·OG, JSON-LD(ApartmentComplex + BreadcrumbList), 최근 거래가·3년 거래 수·역대 최고가, 평형별 최근 거래, 최근 실거래 5건,
'미래가치·가격 그래프 보기'(내 집 시세 화면 `mine/?sd=&d=&b=`로 연결), 같은 시군구 다른 단지 6곳.
스크립트는 이용 통계(assets/track.js) 하나뿐, 글꼴 내려받기 없음, 공통 CSS `assets/seo.css` (약 3KB). 단지 페이지 평균 약 6.6KB(압축 전송 약 2.3KB).

## 크기 (2026-11-21 기준)

페이지 약 19,900개, 합계 약 138MB(압축 저장 시 git 약 40MB). GitHub Pages 한도(사이트 1GB) 안.
실행 날짜를 페이지에 넣지 않아 **새 거래가 생긴 단지만** 파일이 바뀝니다.

## 사이트 주소 바꾸기

`assets/config.js` 의 `SITE_URL` 한 줄. 다음 생성 때 생성 페이지·사이트맵·robots, 그리고 모든 화면의 절대 주소(canonical·og:url 등)와
manifest 의 경로가 새 주소로 바뀝니다(직전 주소는 `sitemaps/site.json` 에 기록).
