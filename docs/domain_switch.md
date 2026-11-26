# 새 도메인 zipyebo.com 으로 바꾸기

- 지금 사이트 주소: https://chrisjangdaejang-ux.github.io/jangdaejang-calc/
- 바꿀 대표 주소: **https://zipyebo.com/** (가비아, 3년)
- 함께 산 주소(대표 주소로 넘겨 주기만 함): **zipyebo.co.kr**, **집예보.kr** (가비아, 1년)

> **토스페이먼츠 재심사 승인 전에는 6번(GitHub 에 도메인 저장)부터는 하지 마세요.**
> 심사 답변에 적은 주소(https://chrisjangdaejang-ux.github.io/jangdaejang-calc/premium/)가 심사 중에 바뀌면 안 되기 때문입니다.
> 1~5번(준비)은 지금 해도 사이트에 아무 영향이 없습니다.

## 지금 상태 — 준비 끝, 스위치는 꺼져 있음

- 화면 안의 경로(그림·스크립트·데이터)는 **열린 주소를 보고 스스로 맞춥니다.** 예전 주소에서는 `/jangdaejang-calc/…`, 새 도메인에서는 `/…`.
- 주소를 정하는 곳은 사실상 **한 곳**입니다: `assets/config.js` 의 `SITE_URL`.
  - 화면의 대표 주소(검색용 canonical·공유 미리보기 og:url·사이트맵·robots)는 매일 07:37 자동 작업이 이 값을 읽어 다시 씁니다.
  - 서버(Apps Script)의 `WEB_ROOT`, 엔진의 `scripts/brand.py SITE_URL` 은 다른 시스템이라 따로 있지만,
    **전환 도구 한 번(`node tools/domain-switch.js --apply --engine …`)이 셋을 함께 바꿉니다.** 사람이 하나씩 고칠 일은 없습니다.
- 결제 후 돌아오는 주소(토스 successUrl·failUrl)와 카카오 로그인 돌아오는 주소는 화면이 **지금 열린 주소로 만들어** 보내므로 코드 변경이 필요 없습니다.
- 서버 v63: 카카오 로그인 돌아올 주소에 `https://zipyebo.com/login/` 을 미리 허용(예전 주소도 계속 허용).
- 브라우저 저장값 옮기기(아래 '저장값 옮기기')는 만들어 두었고 **꺼져 있습니다**(`assets/store-move.js` 의 `ON: false`).
- 실수로 예전 방식 경로(`/jangdaejang-calc/…`)를 새로 쓰면 검사(`tools/domain-test.js`)가 실패해서 바로 알 수 있습니다.

## 주소가 바뀌면 깨지는 곳 — 점검 결과(2026-11-26)

| 곳 | 상태 | 전환 때 |
|---|---|---|
| 화면 속 파일·데이터 경로 | 상대 경로·자동 감지(JB) — 두 주소 모두 동작 | 할 일 없음 |
| canonical·og:url·og:image·구조화 데이터(손으로 만든 화면 약 400개) | 예전 주소가 박혀 있음 | 전환 도구가 한 번에 바꿈 |
| 단지·청약·상가 검색용 페이지(apt/·cy/·comm/ 약 2만 개)·sitemaps/ | 자동 작업이 config.js SITE_URL 로 만듦 | 다음 날 07:37 또는 Run workflow |
| robots.txt | `/jangdaejang-calc/…` 경로 | 전환 도구가 `/…` 로 |
| 서비스 워커(sw.js)·앱 설치 정보(manifest) | 파일 위치 기준(./) | 할 일 없음(새 주소에서 새로 설치됨) |
| 퀴즈 공유 주소·전세 체크리스트 인쇄 문구 | 예전 주소가 글자로 있음 | 전환 도구가 바꿈 |
| 공유 기본 주소(share.js·share-head.js·weekly-core.js·pro-report.js) | config.js SITE_URL 을 먼저 읽음 | 전환 도구가 기본값도 바꿈 |
| 카카오 로그인 | 열린 주소 기준 + 서버 허용 목록 | **카카오 콘솔에 새 주소 추가 + 서버 v63 배포 필요** |
| 카카오맵·카카오 공유 | 카카오 콘솔 도메인 목록 | **카카오 콘솔에 새 주소 추가 필요** |
| 토스 결제 돌아오는 주소 | 열린 주소 기준 | 할 일 없음(상점 정보의 홈페이지 주소만 바꿈) |
| 메일·알림 속 링크(서버) | WEB_ROOT 한 줄 | 전환 도구가 바꾸고 Apps Script 다시 배포 |
| 브이월드 중개업 확인(서버) | v63 에서 사이트 주소와 떼어 냄(VWORLD_DOMAIN) | 할 일 없음 |
| 엔진 글·PDF·유튜브 키트 링크 | brand.py SITE_URL 한 줄 | 전환 도구 `--engine` 이 바꿈 |
| 공개 데이터(jangdaejang-data) | 계속 github.io 에서 읽음(다른 사이트에서 읽어도 되게 열려 있음) | 할 일 없음 |
| **브라우저 저장값**(관심 단지·내 집·계산 값·만기 알림 날짜·금액·구매 리포트 열람 기록) | 주소(출처)마다 따로라 새 주소에서 안 보임 | 저장값 옮기기 켜기(아래) |
| 로그인 상태 | 저장값과 같음 | 새 주소에서 한 번 다시 로그인(계정 자료는 서버에 있어 그대로 돌아옴) |
| 홈 화면에 설치한 앱(PWA) | 예전 주소 아이콘 | 새 주소에서 다시 '홈 화면에 추가' 권장 |
| 이미 퍼진 링크·QR·검색 결과 | GitHub 가 새 주소로 자동으로 넘겨 줌(301) | 할 일 없음 — 단, **저장소 jangdaejang-calc 이름을 바꾸거나 지우면 끊김** |

## 한눈에 보는 순서

| 순서 | 누가 | 언제 | 할 일 | 사이트 영향 |
|---|---|---|---|---|
| 1 | 대표 | 지금 | GitHub 에서 zipyebo.com 주인 확인(TXT 기록) | 없음 |
| 2 | 대표 | 지금 | 가비아: zipyebo.com 연결 기록(A 4개 + www) | 없음 |
| 3 | 대표 | 지금 | 카카오 개발자 콘솔에 새 주소 **추가**(예전 것은 그대로) | 없음 |
| 4 | 대표 | 다음 서버 재배포 때 | Apps Script 서버 v63 이상 배포 | 없음 |
| 5 | 대표/Claude | 지금 | 연결 기록이 퍼졌는지 확인 | 없음 |
| — | — | — | **토스 재심사 승인 기다리기** | — |
| 6 | 대표 | 전환 당일 | GitHub Pages 에 도메인 저장 — **이 순간 바뀜** | 새 주소로 열림 |
| 7 | Claude | 6번 직후 | 전환 커밋(“도메인 전환 마무리해 줘”) | 대표 주소·공유 링크 정리 |
| 8 | 대표 | 자물쇠가 생기면 | Enforce HTTPS 체크 | 자물쇠 |
| 9 | 대표 | 7번 뒤 | Apps Script 다시 배포(메일 링크) | 메일 링크 |
| 10 | 대표 | 6번 뒤 | 가비아: zipyebo.co.kr·집예보.kr 포워딩 | 보조 주소 |
| 11 | Claude | 6번 뒤 | 저장값 옮기기 켜기 | 예전 사용자 값 이어짐 |
| 12 | 대표 | 6번 뒤 | 토스 상점 정보 홈페이지 주소, 구글·네이버·다음 검색 등록, GA | 결제·검색 |

---

## 1. GitHub 에서 zipyebo.com 주인 확인 (먼저 하는 이유: 다른 사람이 우리 도메인을 자기 GitHub 사이트에 붙이지 못하게)

1. https://github.com/settings/pages 접속(로그인 계정 chrisjangdaejang-ux).
2. **Verified domains** 칸의 **Add a domain** 을 누릅니다.
3. `zipyebo.com` 을 적고 **Add domain** 을 누릅니다.
4. 화면에 TXT 기록이 나옵니다. 이 화면을 열어 둔 채 2번(가비아)으로 갑니다.
   - 호스트(이름): `_github-pages-challenge-chrisjangdaejang-ux`
   - 값: 긴 영문·숫자 글자(화면의 복사 단추로 복사)
5. 가비아에 TXT 기록을 넣은 뒤(2번 표의 마지막 줄) 이 화면으로 돌아와 **Verify** 를 누릅니다.
   바로 안 되면 10분~몇 시간 뒤 다시 **Verify**. (하루까지 걸릴 수 있음)

## 2. 가비아: zipyebo.com 연결 기록(DNS)

가비아 화면의 버튼 이름은 바뀔 수 있어서, 확실하지 않은 이름은 **(확인 필요)** 로 적었습니다. 화면에 적힌 글자가 다르면 그 글자를 따라 주세요.

1. https://dns.gabia.com/ 접속 → 가비아 아이디로 로그인. (또는 https://www.gabia.com → 오른쪽 위 **My가비아** → **DNS 관리툴**(확인 필요))
2. 도메인 목록에서 **zipyebo.com** 줄의 **설정** 을 누릅니다.
3. **레코드 수정**(확인 필요) → **레코드 추가**(확인 필요) 를 눌러 아래 줄을 하나씩 넣습니다.
   - `@` 호스트에 원래 있던 A 레코드(가비아 기본 주차 페이지 등)가 있으면 그 줄은 지웁니다.
   - 다 넣었으면 **확인**(확인 필요) → **저장** 을 누릅니다.

| 타입 | 호스트 | 값/위치 | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |
| CNAME | www | chrisjangdaejang-ux.github.io. | 600 |
| TXT | _github-pages-challenge-chrisjangdaejang-ux | (1번 화면의 긴 값) | 600 |

- (선택, 권장) IPv6 도 넣으면 더 좋습니다: 타입 **AAAA**, 호스트 `@`, 값 `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` 네 줄.
- www 값에는 **저장소 이름 없이** `chrisjangdaejang-ux.github.io` 까지만 적습니다. 끝의 점(`.`)은 가비아 화면이 요구할 때만 붙입니다.
- 이 단계만으로는 사이트가 바뀌지 않습니다. 6번 전까지 https://zipyebo.com 은 GitHub 의 'Site not found' 화면이 보이는 게 정상입니다.

## 3. 카카오 개발자 콘솔 — 새 주소 추가(예전 주소는 그대로 둠)

https://developers.kakao.com/console/app → **집예보** 앱 선택. (2025년에 바뀐 새 화면 기준. 메뉴 이름이 다르면 화면에 적힌 글자를 따라 주세요.)

1. **앱** → **플랫폼 키** → **JavaScript 키** 를 누릅니다.
   - **JavaScript SDK 도메인** 에 `https://zipyebo.com` 추가 → **저장**. (카카오 로그인 버튼·카카오맵이 새 주소에서 동작하려면 필요)
   - 같은 화면의 **카카오 로그인 리다이렉트 URI** 에 `https://zipyebo.com/login/` 추가 → **저장**.
2. **앱** → **플랫폼 키** → **REST API 키** → **카카오 로그인 리다이렉트 URI** 에도 `https://zipyebo.com/login/` 추가 → **저장**. (서버가 로그인 코드를 바꿀 때 같은 주소를 씀)
3. **앱** → **제품 링크 관리** → **웹 도메인** 에 `https://zipyebo.com` 추가 → **저장**. (카카오톡 공유 링크)

- 예전 주소(`https://chrisjangdaejang-ux.github.io`, `https://chrisjangdaejang-ux.github.io/jangdaejang-calc/login/`)는 **지우지 마세요.** 전환 전까지 지금 사이트가 씁니다.
- 끝의 `/login/` 은 빗금까지 똑같이 적어야 합니다.

## 4. Apps Script 서버 v63 이상 배포(전환 전에 한 번)

새 주소에서 카카오 로그인이 되려면 서버가 `https://zipyebo.com/login/` 을 받아 줘야 합니다(v63 에 들어 있음). 다른 일로 다시 배포할 때 같이 하면 됩니다.

1. https://script.google.com → 중개사 제휴(집예보 서버) 프로젝트 열기.
2. 왼쪽 **편집기**(< > 모양)에서 코드 전체를 지우고 저장소의 `tools/agent-backend.gs` 전체를 붙여 넣기 → 위쪽 디스크 모양 **저장**.
   (최신 파일 주소: https://github.com/chrisjangdaejang-ux/jangdaejang-calc/blob/main/tools/agent-backend.gs → 오른쪽 위 복사 단추)
3. 오른쪽 위 파란 **배포** → **배포 관리** → 지금 배포 줄의 연필 모양(**수정**) → **버전** 에서 **새 버전** → **배포**.
4. 웹 앱 주소(…/exec)는 그대로라 화면 쪽은 바꿀 것이 없습니다.

## 5. 연결 기록이 퍼졌는지 확인

- https://dnschecker.org/#A/zipyebo.com 에서 185.199.108.153 ~ 185.199.111.153 이 보이면 됩니다.
- 또는 Claude 에게 “zipyebo.com 연결됐는지 봐 줘”.
- **확인 전에 6번을 하면 안 됩니다.** 예전 주소가 새 주소로 넘어가는데 새 주소가 아직 안 열리면 잠깐 사이트가 끊깁니다.

---

## 전환 당일 (토스 재심사 승인 뒤, 사람이 적은 밤)

### 6. GitHub Pages 에 도메인 저장 — 여기서 바뀝니다

1. https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages 접속.
2. **Custom domain** 칸에 `zipyebo.com` 을 적고 **Save** 를 누릅니다.
   - GitHub 가 저장소 맨 위에 `CNAME` 파일(내용 `zipyebo.com`)을 커밋으로 넣습니다. 그대로 두세요.
   - 아래에 **DNS check successful** 이 보이면 정상입니다. (빨간 글씨면 5번이 덜 된 것 → **Remove** 누르고 나중에 다시)
3. 바로 일어나는 일:
   - https://zipyebo.com/ 에서 사이트가 열립니다(화면 경로는 자동으로 맞음).
   - 예전 주소 https://chrisjangdaejang-ux.github.io/jangdaejang-calc/… 로 들어오면 GitHub 가 **같은 화면의 새 주소로** 넘겨 줍니다
     (예: `…/jangdaejang-calc/map/` → `https://zipyebo.com/map/`, 영구 이동 301). 퍼진 링크·북마크·QR·검색 결과가 끊기지 않습니다.
   - www.zipyebo.com 으로 들어오면 zipyebo.com 으로 넘어갑니다.
4. 끝나면 Claude 에게 **“도메인 전환 마무리해 줘”** 라고 보내 주세요(7번).

### 7. 전환 커밋 — Claude 가 함

Claude 가 하는 일(웹 한 커밋 + 엔진 한 커밋):

```
node tools/domain-switch.js </dev/null                                         # 미리 보기
node tools/domain-switch.js --apply --engine ../jangdaejang-engine </dev/null  # 실제로 바꿈
for f in tools/*-test.js; do node "$f" </dev/null || echo "실패 $f"; done       # 검사
```

- `CNAME` = `zipyebo.com`(6번에서 GitHub 가 넣었으면 그대로)
- `assets/config.js` `SITE_URL: 'https://zipyebo.com'`
- 모든 손으로 만든 화면의 대표 주소(canonical·og:url·og:image·구조화 데이터)·sitemap.xml → `https://zipyebo.com/…`
- robots.txt 경로 `/jangdaejang-calc/…` → `/…`
- 서버 `tools/agent-backend.gs` `WEB_ROOT` → `https://zipyebo.com/` (서버 판 번호 +1)
- 엔진 `scripts/brand.py` `SITE_URL` → `https://zipyebo.com`
- 바뀐 공용 JS 판 번호(?v=)와 sw.js 판 번호 +1
- 이어서 검색용 페이지(apt/·cy/·comm/·sitemaps/)를 바로 새로 만들려면: https://github.com/chrisjangdaejang-ux/jangdaejang-timing/actions/workflows/seo.yml → **Run workflow** → 초록색 **Run workflow**. (안 눌러도 다음 날 07:37 에 바뀜)

> 7번이 늦어져도 사이트는 동작합니다. 그동안 공유 링크·검색용 대표 주소가 예전 주소로 나가지만, 예전 주소는 6번 덕분에 새 주소로 넘어갑니다.

### 8. Enforce HTTPS (자물쇠)

1. https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages
2. **Enforce HTTPS** 체크.
   - 체크 칸이 흐리면 GitHub 가 자물쇠 인증서를 만드는 중입니다(보통 몇 분~1시간, 최대 24시간). 생기면 체크하세요.

### 9. Apps Script 다시 배포(메일·알림 속 링크)

7번 뒤에 4번과 같은 순서로 한 번 더 배포합니다(코드 전체 붙여 넣기 → **저장** → **배포** → **배포 관리** → 연필(**수정**) → **새 버전** → **배포**).
- 안 해도 메일 속 예전 주소 링크는 새 주소로 넘어갑니다. 급하지 않으면 다음 재배포 때 같이 해도 됩니다.

### 10. 가비아: zipyebo.co.kr · 집예보.kr 을 zipyebo.com 으로 넘기기

도메인마다 한 번씩:

1. https://dns.gabia.com/ (또는 **My가비아** → 도메인 목록) 에서 그 도메인을 고르고 **포워딩**(확인 필요) 메뉴를 엽니다.
2. 넘겨 줄 주소에 `https://zipyebo.com` 을 적습니다.
3. 방식은 **주소창이 zipyebo.com 으로 바뀌는 방식**(가비아 이름: 유동 포워딩 / URL 리다이렉트 — 확인 필요)을 고릅니다.
   ‘고정 포워딩’(화면을 틀 안에 넣는 방식)은 카카오 로그인·결제가 막히고 검색에도 불리하니 고르지 마세요.
4. **저장**(또는 **적용**).

- 집예보.kr 은 시스템 안에서 `xn--on3b19nb5c.kr` 로 보일 수 있습니다. 정상입니다.
- 이 두 주소는 GitHub 에 연결하지 않습니다(GitHub 는 저장소 하나에 도메인 하나).
- 가비아 포워딩은 보통 `http://` 로 들어올 때만 넘겨 줍니다. 누가 `https://zipyebo.co.kr` 처럼 치면 보안 경고가 뜰 수 있습니다.
  필요하면 무료 대안: 주소마다 작은 GitHub 저장소를 만들어 그 도메인을 붙이고(자물쇠 자동) zipyebo.com 으로 넘기는 한 장짜리 화면을 둡니다 — Claude 에게 요청.
- 전환 전에 미리 해 두면 그동안은 GitHub 'Site not found' 화면으로 넘어가므로, 6번 뒤에 하세요.

### 11. 저장값 옮기기 켜기 — Claude 가 함 (“저장값 옮기기 켜 줘”)

자세한 원리는 아래 '저장값 옮기기'. Claude 가 하는 일:
1. 다리 화면을 공개 데이터 저장소에 올림: `node tools/domain-switch.js --apply --bridge ../jangdaejang-timing/site </dev/null`
   → jangdaejang-timing 저장소 `site/move/index.html` 커밋 → 다음 정기 실행에서 https://chrisjangdaejang-ux.github.io/jangdaejang-data/move/ 로 나감.
2. 그 주소가 열리는지 확인한 뒤: `node tools/domain-switch.js --apply --store-move-on </dev/null` 커밋(store-move.js `ON: true`).
   - 순서가 바뀌어도 사이트는 안 끊깁니다: 새 주소 화면은 다리 화면이 실제로 있는지 먼저 확인하고, 없으면 아무것도 안 합니다.
3. 6번 전에는 절대 올리지 않습니다(그때 zipyebo.com 은 우리 사이트가 아니라서 값을 넘기면 안 됨).

### 12. 그 밖에 바꿀 곳

**토스페이먼츠**
- 결제 후 돌아오는 주소는 화면이 지금 주소로 만들어 보내므로 코드에서 바꿀 것이 없습니다.
- 상점관리자 https://app.tosspayments.com 로그인 → 상점 정보(홈페이지·사이트 주소 칸 — 메뉴 이름 확인 필요)를 `https://zipyebo.com` 으로 바꿉니다.
  메뉴에서 못 찾으면 토스페이먼츠 고객센터(상점관리자 안의 상담 창구)로 “사이트 주소가 https://zipyebo.com 으로 바뀌었다(예전 주소는 자동으로 넘어감)”고 알려 주세요.
- **재심사 중에는 바꾸지 마세요.** 승인 뒤에 바꿉니다. 예전 주소는 새 주소로 넘어가므로 심사 담당자가 예전 주소를 열어도 화면은 보입니다.

**구글 서치 콘솔·네이버 서치어드바이저·다음 웹마스터도구** — docs/search_registration.md 를 처음부터 끝까지 새 주소(https://zipyebo.com)로.
- 구글 '주소 변경' 도구는 예전 주소가 도메인 맨 위가 아니라(github.io 의 폴더) 쓸 수 없습니다. GitHub 의 301 넘김만으로 검색 결과가 천천히 새 주소로 옮겨 갑니다.

**구글 애널리틱스(GA4)** — 측정은 그대로 됩니다(측정 ID G-V2VR9VL7EM). 보기 좋게: https://analytics.google.com → **관리** → **데이터 스트림** → 웹 스트림 → 스트림 URL 을 `https://zipyebo.com` 으로(화면에 적힌 글자를 따라).

**문자·카카오 알림톡(SOLAPI)** — 알림톡 템플릿 버튼에 예전 주소가 고정으로 들어가 있다면 템플릿을 새 주소로 고쳐 다시 검수받아야 할 수 있습니다(예전 주소도 넘어가므로 급하지 않음).

**바꿀 것 없음**: 공개 데이터 주소, 브이월드 키(github.io 로 등록 — 서버 v63 부터 사이트 주소와 따로), 구글 폼, Apps Script 웹 앱 주소(…/exec).

---

## 저장값 옮기기(브라우저 저장값) — 만들어 두고 꺼 둠

- 왜: 관심 단지·내 집·계산 값·만기 알림 날짜와 금액·구매한 리포트 열람 기록은 **이 기기의 브라우저에 주소별로** 저장됩니다.
  예전 주소(chrisjangdaejang-ux.github.io)에 저장한 값은 새 주소(zipyebo.com)에서 안 보입니다. GitHub 는 예전 화면을 새 주소로 곧바로 넘기므로 예전 화면이 다시 열리지도 않습니다.
- 방법: 예전 주소와 같은 출처(chrisjangdaejang-ux.github.io)에 그대로 남는 **공개 데이터 저장소 쪽 '다리 화면'**(…/jangdaejang-data/move/)을 씁니다.
  1. 새 주소 첫 방문 → 다리 화면이 있는지 확인 → 다리 화면으로 잠깐 이동(눈 깜짝할 사이)
  2. 다리 화면이 예전 값 중 옮길 것만 골라 **주소의 `#` 뒤에** 담아 새 주소의 같은 화면으로 돌려보냄(목적지는 zipyebo.com 으로 고정)
  3. 새 주소가 분석 도구(GA)를 켜기 **전에** `#` 값을 주소에서 지우고 이 기기에 저장 → 화면 한 번 새로 고침 → 끝(다시는 안 감)
- **서버로 보내는 것 없음**: `#` 뒤 값은 어떤 서버(GitHub 포함)에도 전송되지 않습니다. GA 에는 `#` 을 지운 주소만 갑니다.
- 옮기지 않는 것: 로그인 상태(다시 로그인하면 계정 자료가 돌아옴), 운영자·미리 보기 표시, 화면 이동 기록.
- 건너뛰는 경우: 검색 로봇·자동 점검 브라우저, 다른 화면 안에 넣어진 경우, 로그인·결제 돌아오는 화면, 2027-06-30 이후(새로 옮기러 가지 않음).
- 새 주소를 이미 쓰던 기기(10분 넘게 지난 뒤 옮기기)는 **새 주소에 있는 값을 지키고** 없는 값만 채웁니다.
- 한계: 휴대폰 홈 화면에 설치한 앱(PWA)·인앱 브라우저(카카오톡 안 브라우저 등)는 저장 공간이 따로라 그 안에서 쓰던 값은 그 안에서만 옮겨집니다.
- 파일: `assets/store-move.js`(스위치 `ON`·목적지·다리 화면 만들기), `assets/track.js`(새 주소에서만 붙임·# 지우기), 검사 `tools/store-move-test.js`.

## 바꾼 뒤 확인(5분)

- https://zipyebo.com/ · https://zipyebo.com/map/ · https://zipyebo.com/brief/ · https://zipyebo.com/premium/ · https://zipyebo.com/apt/ 가 열리고 숫자가 나오는지
- 예전 주소 https://chrisjangdaejang-ux.github.io/jangdaejang-calc/premium/ 가 https://zipyebo.com/premium/ 으로 넘어가는지
- http://zipyebo.co.kr · http://집예보.kr · https://www.zipyebo.com 이 https://zipyebo.com/ 으로 넘어가는지
- 카카오 로그인 → 다시 사이트로 돌아오는지
- 주소창 자물쇠

## 되돌리기

1. https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages → **Custom domain** 옆 **Remove**(저장소의 CNAME 파일도 지움).
2. Claude 에게 “도메인 전환 되돌려 줘” — 7번 커밋을 되돌립니다(git revert).
화면 경로는 자동이라 예전 주소에서 바로 다시 동작합니다.

## 알아 둘 점

- **저장소 이름(jangdaejang-calc)을 바꾸거나 지우지 마세요.** 예전 링크가 새 주소로 넘어가는 것은 이 저장소에 도메인이 붙어 있기 때문입니다.
- **계정 대표 사이트(chrisjangdaejang-ux.github.io 라는 이름의 저장소)를 만들어 도메인을 붙이지 마세요.** 공개 데이터 주소와 다리 화면 주소가 바뀌어 버립니다.
- 새 주소에서는 데이터가 다른 사이트(github.io)에서 오므로, 인터넷이 끊겼을 때 미리 저장해 둔 화면 틀은 보이지만 숫자는 안 나올 수 있습니다.
