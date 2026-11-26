# 출시 체크리스트

## '집예보가 먼저 챙겨 드려요' 출시하는 날

지금은 화면(`assets/config.js`)과 서버(`tools/agent-backend.gs`) 모두 `PROACTIVE_ENABLED = false`라서 아무에게도 보이지 않고 메일도 가지 않아요.
대표 미리 보기: 아무 화면 주소 끝에 `?preview=pro`를 붙여 한 번 열면 그 기기에서만 보여요(끌 때 `?preview=off`).

### 한 번에 바꾸기(수작업 3가지를 스크립트가 대신)

1. 미리 보기(아무것도 안 바꿔요)
   `node tools/proactive-launch.js </dev/null`
2. 실제로 바꾸기
   `node tools/proactive-launch.js --apply </dev/null`
   - 화면 `PROACTIVE_ENABLED` → true
   - 서버 `PROACTIVE_ENABLED` → true, 맨 위에 새 판 번호(지금 가장 큰 판 + 1) 변경 요약
   - 소개 페이지 `alerts/`의 검색 제외(noindex) 줄 지우기
   - `sitemaps/pages.xml`에 `alerts/` 주소 넣기(다음 날 검색용 페이지 생성도 noindex 가 없는 화면을 저절로 넣어요)
   - 서비스 워커 판 번호 + 1
3. 확인: `node tools/proactive-test.js </dev/null` (출시 뒤 상태도 확인해요)
4. 커밋·푸시
5. 서버 다시 배포: Apps Script 편집기(https://script.google.com)에서 `tools/agent-backend.gs` 내용을 붙여 넣고 저장 → **배포** → **배포 관리** → 연필(수정) → 버전 **새 버전** → **배포**. 따로 실행할 함수는 없어요.

### 출시 뒤 확인
- 소개 페이지: https://chrisjangdaejang-ux.github.io/jangdaejang-calc/alerts/ (새 도메인으로 바꾼 뒤에는 https://zipyebo.com/alerts/)
- 공유 미리 보기(OG 이미지·제목) 확인: 카카오톡에 주소를 붙여 보기
- 알림 센터 '먼저 챙겨 드려요' 칸: https://chrisjangdaejang-ux.github.io/jangdaejang-calc/my/alerts/#pv
- 집예보가 기억하는 것: https://chrisjangdaejang-ux.github.io/jangdaejang-calc/my/memory/

### 동의 규칙(바꾸지 마세요)
- 새로 신청하는 분: 신청 화면에 알림 메일 동의와 별도로 '먼저 챙겨 드려요' 동의 칸이 있어요(비워 두면 새 알림은 꺼진 채로 신청).
- 예전에 신청한 분: 지금 받던 알림은 그대로 받고, 알림 센터에서 새 알림을 켤 때 **동의하고 메일로 받기**로 새 문구에 다시 동의해야 메일이 가요.
- 동의 문구를 바꾸면 `assets/alerts-core.js`의 `AX_PV_V`(먼저 챙겨 드려요) 또는 `AX_V`(알림 메일 전체) 날짜를 바꾸고 서버에 같은 블록을 복사해요(`node tools/alerts-test.js`가 비교).

### 나중에 할 것
- 카카오 알림톡: 출시 뒤 정보성 템플릿 심사(초안은 서버 `PV_ALIMTALK`). 심사 전에는 메일만 보내요.

## '땅 위험 신호 체크' 출시하는 날

지금은 `assets/config.js`의 `LAND_ENABLED: false`라서 `land/`는 '준비 중'만 보이고(검색 제외), 첫 화면·전체 기능·사이트맵 어디에도 링크가 없어요.
대표 미리 보기: https://chrisjangdaejang-ux.github.io/jangdaejang-calc/land/?preview=land 를 한 번 열면 그 기기에서만 보여요(끌 때 주소 끝 `?preview=off`).
자료: 엔진 `scripts/land_feed.py`가 매 정기 실행(6시간마다) 끝에 공개 `data/land/`를 만들어요(읍·면·동 묶음 숫자만 — 거래 한 건·지번·신호 기준값은 공개 안 함).

### 출시 전에 확인
1. 토지 실거래 2006년치까지 다 받았는지: Actions '실거래 수집 및 사이트 갱신' 최근 실행 로그의 `[land_trade] 과거 채우기: … 남은 (시군구,달) 0건`
   (2026-11-26 기준 남은 33,844건, 예상 완료 2026-11-30). 다 받으면 화면 아래 자료 기간이 '2006년 1월~'로 바뀌어요.
2. 미리 보기로 두세 곳 눌러 보기: 시골 읍·면(예: 용인시 처인구 포곡읍), 서울 동(예: 강남구 개포동), 거래가 적은 동('자료가 부족해요'가 나오는지).

### 한 번에 바꾸기(수작업 대신 스크립트)
1. 미리 보기(아무것도 안 바꿔요): `node tools/land-launch.js </dev/null`
2. 실제로 바꾸기: `node tools/land-launch.js --apply </dev/null`
   - 화면 `LAND_ENABLED` → true (land/ 의 config.js 판 번호 + 1)
   - `land/index.html` 검색 제외(noindex) 줄 지우기
   - 첫 화면 상황 단추: '상가·건물' 다음에 **토지** 단추. 단추가 10개가 되면 3칸 × 3줄이 깨져서 **전체 기능**은 그 아래 한 줄 전체 너비 단추로 옮겨요(토지까지 9개가 3×3 그대로).
     '상황별로 찾기' 시세·지도 묶음에도 '땅 위험 신호 체크' 줄
   - 전체 기능(all/) '재개발·빌라·상가' 묶음 → '재개발·빌라·상가·토지' + '땅 위험 신호 체크' 줄
   - `sitemaps/pages.xml`에 `land/` 주소
   - 서비스 워커 판 번호 + 1 (원격과 겹치면 원격 최신 + 1)
3. 확인: `node tools/land-test.js </dev/null` · `node tools/home-test.js </dev/null` (land-test 의 '숨김' 확인은 출시 뒤 실패하는 게 맞아요 — 출시 커밋에서 그 줄들을 '출시됨' 확인으로 바꿔요)
4. 커밋·푸시. 서버(Apps Script)는 바꿀 것 없어요.

### 나중에 할 것(주소별 공시지가·용도지역·맹지)
- 지금 화면의 공시지가·용도지역·도로(맹지) 칸은 토지이음·부동산 공시가격 알리미 링크예요. 필지별 자동 조회는 브이월드 오픈API(토지특성·개별공시지가·토지이용계획 속성조회)로 붙일 예정 — 연결 방법을 확인한 뒤.
