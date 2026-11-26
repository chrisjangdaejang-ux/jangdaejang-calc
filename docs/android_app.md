# 안드로이드 앱으로 내기 (웹을 그대로 감싸는 방식, TWA)

지금 웹은 이미 '홈 화면에 추가'(PWA)가 됩니다. 이 웹을 그대로 감싸 Play 스토어 앱으로 낼 수 있습니다(TWA: 신뢰할 수 있는 웹 활동).
앱 안 화면은 웹과 같아서, 웹을 고치면 앱도 바로 바뀝니다(스토어 업데이트 필요 없음).

## 꼭 필요한 것

| 필요한 것 | 왜 | 비고 |
|---|---|---|
| 우리 도메인 **zipyebo.com** (가비아, 3년) | 앱과 웹이 같은 주인임을 확인하는 파일(assetlinks.json)을 **도메인 맨 위** `https://zipyebo.com/.well-known/assetlinks.json` 에 둬야 함 | 예전 주소(github.io/jangdaejang-calc)는 맨 위가 우리 것이 아니라 불가 → 도메인 연결(docs/domain_switch.md) 뒤에 가능 |
| Google Play Console **조직(회사) 계정** | 회사 이름으로 앱 등록. 개인 계정은 출시 전 테스터 20명·14일 비공개 테스트 조건이 붙음 | 등록비 25달러(한 번) |
| D-U-N-S 번호 | 조직 계정 가입 때 회사 확인용 | (주)장대장부동산그룹 이름으로 무료 발급, 보통 1~2주(국내 발급 기관: 나이스디앤비) |
| 회사 이메일·전화·웹사이트 주소 | 스토어에 공개됨 | 고객문의: 02-3444-5008 / chris938@naver.com |
| 개인정보처리방침 주소 | 스토어 필수 | `https://zipyebo.com/privacy/` |

> 이 문서는 준비만 합니다. 스토어 계정은 만들지 않았습니다.

## 순서

1. 도메인 연결(docs/domain_switch.md) 후 https://zipyebo.com/ 이 열리는지 확인.
2. Play Console 조직 계정 가입: https://play.google.com/console/signup → **조직** 선택 → D-U-N-S 번호 입력.
3. 앱 파일 만들기 — 둘 중 하나:
   - **쉬운 방법 (PWABuilder)**: https://www.pwabuilder.com 에 `https://zipyebo.com/` 입력 → **Start** → **Package For Stores** → **Android** → **Generate Package**.
     - Package ID: `com.zipyebo.app`(도메인 zipyebo.com 을 거꾸로 쓴 이름 — 한 번 정하면 못 바꿈) / App name: 집예보 (영문 ZIPYEBO) / Signing key: **New** (키 파일과 비밀번호를 안전하게 보관).
   - **개발자 방법 (Bubblewrap)**: `npm i -g @bubblewrap/cli` → `bubblewrap init --manifest https://zipyebo.com/manifest.webmanifest` → `bubblewrap build`.
4. 만든 파일 중 `.aab` 를 Play Console **앱 만들기** → **프로덕션**(또는 **내부 테스트**) → **새 버전 만들기** 에 올립니다.
5. 주인 확인 파일 올리기:
   - Play Console → 앱 → **설정** → **앱 무결성** → **앱 서명** 의 **SHA-256 인증서 지문** 복사.
   - docs/well-known/assetlinks.json 틀(패키지 이름 `com.zipyebo.app` 이미 들어 있음)의 `sha256_cert_fingerprints` 에 그 값을 넣어
     **웹 저장소(jangdaejang-calc) 맨 위** `.well-known/assetlinks.json` 으로 올립니다(Claude 에게 지문 값만 보내면 올려 줌).
     - 왜 웹 저장소 맨 위인가: 이 저장소에 도메인을 연결하면 저장소 맨 위 폴더가 곧 `https://zipyebo.com/` 입니다.
       그래서 저장소의 `.well-known/assetlinks.json` 이 그대로 `https://zipyebo.com/.well-known/assetlinks.json` 이 됩니다.
     - 점(.)으로 시작하는 폴더는 GitHub Pages 가 기본으로 빼먹는데, 저장소 맨 위에 `.nojekyll` 파일이 이미 있어 그대로 올라갑니다
       (tools/domain-test.js 가 `.nojekyll` 이 있는지 확인).
     - 지문을 받기 전에는 올리지 않습니다(틀 값이 그대로 공개되면 확인 도구가 '틀림'으로 봄).
   - 열어서 확인: https://zipyebo.com/.well-known/assetlinks.json
   - 확인: https://developers.google.com/digital-asset-links/tools/generator 에서 Hosting site domain `zipyebo.com`, App package name `com.zipyebo.app`, 지문 넣고 **Test statement**.
   - 이 파일이 맞지 않으면 앱 위쪽에 주소 막대가 보입니다(앱은 동작함).
6. 스토어 등록 정보(아래 초안) 입력 → 콘텐츠 등급 설문 → **검토를 위해 보내기**.

## 앱 설치 정보(manifest.webmanifest) 상태

이름·짧은 이름 = SITE_NAME(집예보, 매일 자동 맞춤), 아이콘 192·512 + 마스크용 512, 바탕·테마 색 흰색, 시작 주소 `?src=pwa`, 화면 standalone,
바로가기 4개(내 집 시세·지도·청약 가점·세금). 경로는 모두 `./` 로 시작하는 상대 경로라 예전 주소와 https://zipyebo.com/ 에서 똑같이 동작합니다(바꿀 것 없음).

---

## Play 스토어 등록 정보 초안

**앱 이름(30자)**: 집예보 - 아파트 실거래가·미래가치

**영문 이름**: ZIPCODE

**간단한 설명(80자)**: 아파트 실거래가와 미래가치, 청약 가점, 세금 계산기, 전세 사기 체크까지 무료로 한 번에

**자세한 설명(4,000자 이내)**:

공공데이터로 내 집값의 내일을 풉니다. 집예보는 국토교통부 아파트 실거래가와 공공 통계를 모아, 내 집과 관심 단지의 시세와 앞으로의 흐름을 쉽게 보여 드려요.

■ 아파트 실거래가·시세
· 전국 아파트 단지별 최근 실거래가, 평형별 시세, 역대 최고가와 신고가 표시
· 지도에서 우리 동네 단지 시세를 한눈에

■ 미래가치
· 교통·공급·인구 등 공공 통계를 과거 실거래에 대입해 본 미래가치 점수
· 보유 기간별로 오를 이유·내릴 이유를 쉬운 말로 설명

■ 내 집 마련·갈아타기
· 대출 한도와 살 수 있는 집값 계산, 예산에 맞는 단지 추천, 단지 비교

■ 청약 가점
· 내 청약 가점 계산, 진행 중인 청약 공고와 분양가, 지역별 과거 당첨 가점

■ 세금 계산기
· 취득세·보유세·양도소득세 계산, 비과세 요건과 매도 순서 확인

■ 전월세·전세 사기 체크
· 전월세 시세와 전세가율, 계약 전 전세 사기 예방 체크리스트

회원가입 없이 바로 쓸 수 있어요. 자료 출처: 국토교통부 실거래가 공개시스템, 한국부동산원 청약홈, 통계청 등 공공기관.

**검색 키워드(설명 안에 자연스럽게 포함)**: 아파트 실거래가, 미래가치, 청약 가점, 세금 계산기, 전세 사기 체크, 아파트 시세, 부동산 계산기, 대출 한도, 양도세 계산, 전세가율

**카테고리**: 집 및 홈(House & Home) / 보조: 금융
**연락처**: 02-3444-5008 · chris938@naver.com · https://zipyebo.com/
**개인정보처리방침**: https://zipyebo.com/privacy/

## 스크린샷 목록 (휴대폰 세로 1080×1920 이상, 2~8장)

1. 첫 화면 — 서비스 6가지 한눈에
2. 내 집 시세 — 단지 실거래가·가격 그래프
3. 미래가치 — 보유 기간별 전망과 이유
4. 지도 — 우리 동네 단지 시세
5. 청약 가점 계산 — 내 가점과 지역별 당첨 가점
6. 세금 계산기 — 양도세 결과 화면
7. 전월세 — 전세가율과 전세 사기 체크리스트
8. 대출 한도 계산 결과

추가로 필요한 그림: 앱 아이콘 512×512(assets/icons/icon-512.png 사용 가능), 그래픽 이미지 1024×500 1장.
