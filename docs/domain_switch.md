# 새 도메인 zipcode.works 로 바꾸기

지금 사이트 주소: https://chrisjangdaejang-ux.github.io/jangdaejang-calc/
바꿀 주소(메인): **https://zipcode.works/**
함께 산 주소(메인으로 넘겨 주기만 함): jipcode.kr · 집코드.kr · 집코드.com (zipcode.io.kr 도 샀다면 같은 방법)

## 지금 상태 — 준비는 끝, 아직 안 바꿈

- 사이트는 예전 주소에서 그대로 동작합니다. 가비아 설정을 먼저 해 두어도 사이트에는 아무 영향이 없습니다.
- 화면 안의 내부 경로(그림·스크립트·데이터)는 **지금 열린 주소를 보고 스스로 맞춥니다.**
  예전 주소에서는 `/jangdaejang-calc/…`, 새 도메인에서는 `/…` 로. 그래서 도메인을 연결하는 순간 바로 동작합니다.
- 공개 데이터(시세·점수 등)는 계속 https://chrisjangdaejang-ux.github.io/jangdaejang-data/ 에서 읽습니다(무료 그대로).
  GitHub 는 공개 사이트에 '다른 주소에서 읽어도 됨' 표시(Access-Control-Allow-Origin: *)를 붙여 주어서 새 도메인에서도 읽힙니다.
- 실수로 예전 방식 경로(`/jangdaejang-calc/…`)를 새로 쓰면 검사(tools/domain-test.js)가 실패해서 바로 알 수 있습니다.

## 한눈에 보는 순서

| 순서 | 누가 | 할 일 | 사이트 영향 |
|---|---|---|---|
| 1 | 대표 | 가비아: zipcode.works 연결 기록(DNS) 넣기 | 없음 |
| 2 | 대표 | 가비아: jipcode.kr·집코드.kr·집코드.com 포워딩 | 없음 |
| 3 | 대표 | 카카오 개발자 콘솔에 새 주소 **추가**(예전 것 지우지 않기) | 없음 |
| 4 | 대표 | (권장) GitHub 에서 도메인 주인 확인 | 없음 |
| 5 | 대표 | 연결 기록이 퍼졌는지 확인(보통 10분~몇 시간) | 없음 |
| 6 | 대표 | **GitHub Pages 에 도메인 저장 — 이 순간 바뀜** | 새 주소로 열림 |
| 7 | 대표 | **Enforce HTTPS** 체크(자물쇠) | |
| 8 | Claude | 대표 주소 한 줄 바꾸기 커밋(“도메인 전환 마무리해 줘”) | 공유 링크·검색 주소 정리 |
| 9 | 대표 | Apps Script 서버 다시 배포, 토스·구글 애널리틱스·검색 등록 | 메일 링크·결제 심사 정보 |

1~5는 언제 해도 안전합니다. 6번은 사람이 적은 밤에 하세요(자물쇠가 생기는 데 몇 분~최대 24시간).

---

## 1. 가비아: zipcode.works 연결 기록(DNS)

1. https://www.gabia.com 로그인 → 오른쪽 위 **My가비아** → **서비스 관리** → **DNS 관리툴**(바로가기: https://dns.gabia.com/).
2. 도메인 목록에서 **zipcode.works** 의 **설정** 을 누릅니다.
3. **레코드 추가** 를 눌러 아래 9줄을 넣고 **저장** 합니다. (버튼 이름이 다르면 화면에 적힌 글자를 따라 주세요.)
   원래 있던 A 레코드(가비아 기본 주차 페이지 등)가 `@` 에 있으면 지웁니다.

| 타입 | 호스트 | 값/위치 | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |
| AAAA | @ | 2606:50c0:8000::153 | 600 |
| AAAA | @ | 2606:50c0:8001::153 | 600 |
| AAAA | @ | 2606:50c0:8002::153 | 600 |
| AAAA | @ | 2606:50c0:8003::153 | 600 |
| CNAME | www | chrisjangdaejang-ux.github.io. | 600 |

- 숫자는 GitHub 공식 안내(“Managing a custom domain for your GitHub Pages site”, 2026-11-21 확인)의 값입니다.
- www 는 저장소 이름 없이 `chrisjangdaejang-ux.github.io` 까지만 적습니다(끝의 점 `.` 은 가비아 화면이 요구할 때만).
- www.zipcode.works 로 들어오면 GitHub 가 알아서 zipcode.works 로 넘겨 줍니다.
- 이 단계만으로는 사이트가 바뀌지 않습니다(6번 전까지 zipcode.works 는 GitHub 의 '사이트 없음' 화면).

## 2. 가비아: 다른 주소 3개를 zipcode.works 로 넘기기

도메인마다 한 번씩(jipcode.kr, 집코드.kr, 집코드.com):

1. **My가비아** → **서비스 관리** → **DNS 관리툴** → 그 도메인을 고르고 **포워딩** 을 누릅니다.
2. 넘겨 줄 주소에 `https://zipcode.works` 를 적습니다.
3. 포워딩 방식은 **유동 포워딩**(주소창이 zipcode.works 로 바뀌는 방식)을 고릅니다.
   ‘고정 포워딩’은 화면을 틀 안에 넣는 방식이라 카카오 로그인·결제가 막히고 검색에도 불리하니 고르지 마세요.
4. **저장**.

- 한글 도메인은 시스템 안에서 영문 글자로 바뀌어 저장됩니다: 집코드.kr = `xn--hy1bk11b74d.kr`, 집코드.com = `xn--hy1bk11b74d.com`. 화면에 이 글자가 보여도 정상입니다.
- 이 주소들은 GitHub 에 연결하지 않습니다(GitHub 는 저장소 하나에 도메인 하나만).

## 3. 카카오 개발자 콘솔 — 새 주소 추가(예전 주소는 그대로 둠)

https://developers.kakao.com/console/app → 집코드 앱 선택. (2025년에 바뀐 새 화면 기준. 다르면 화면에 적힌 글자를 따라 주세요.)

1. **[앱] > [플랫폼 키] > [JavaScript 키]** → **JavaScript SDK 도메인** 에 `https://zipcode.works` 추가 → 저장.
   (카카오 로그인 버튼·카카오맵 지도가 새 주소에서 동작하려면 필요)
2. 같은 **[JavaScript 키]** 화면의 **리다이렉트 URI** 에 `https://zipcode.works/login/` 추가 → 저장.
3. **[앱] > [플랫폼 키] > [REST API 키]** 의 **리다이렉트 URI** 에도 `https://zipcode.works/login/` 추가 → 저장.
   (서버가 로그인 코드를 바꿀 때 같은 주소를 씀)
4. **[앱] > [제품 링크 관리] > [웹 도메인]** 에 `https://zipcode.works` 추가 → 저장. (카카오톡 공유 링크)

- 예전 주소(`https://chrisjangdaejang-ux.github.io`, `…/jangdaejang-calc/login/`)는 **지우지 마세요.** 바꾸는 날까지 지금 사이트가 쓰고 있습니다.
- 서버(Apps Script)는 이미 두 주소를 모두 받도록 준비돼 있습니다(11/28 재배포분 v43).

## 4. (권장) GitHub 에서 도메인 주인 확인

다른 사람이 우리 도메인을 자기 GitHub 사이트에 붙이는 것을 막아 줍니다.

1. https://github.com/settings/pages → **Add a domain** → `zipcode.works` 입력 → **Add domain**.
2. 화면에 나온 TXT 기록(호스트 `_github-pages-challenge-chrisjangdaejang-ux`, 값은 긴 글자)을 1번과 같은 가비아 **레코드 추가** 로 넣고 **저장**.
3. GitHub 화면으로 돌아와 **Verify**. (몇 분~하루 걸릴 수 있음. 실패하면 나중에 다시 눌러도 됩니다.)

## 5. 연결 기록이 퍼졌는지 확인

- https://dnschecker.org/#A/zipcode.works 에서 185.199.108~111.153 이 보이면 됩니다.
- 또는 Claude 에게 “zipcode.works 연결됐는지 봐 줘”.
- **확인 전에 6번을 하면 안 됩니다.** 예전 주소가 새 주소로 넘어가는데 새 주소가 아직 안 열려 잠깐 사이트가 끊깁니다.

## 6. GitHub Pages 에 도메인 저장 — 여기서 바뀝니다

> 먼저: Apps Script 서버가 v43 이상으로 배포돼 있어야 새 주소에서 카카오 로그인이 됩니다(11/28 재배포에 들어 있음).
> 그 전에 바꾸면 로그인만 잠시 안 되고, 나머지 화면은 모두 동작합니다.

1. https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages
2. **Custom domain** 칸에 `zipcode.works` → **Save**.
   - GitHub 가 저장소 맨 위에 `CNAME` 파일(내용 `zipcode.works`)을 커밋으로 넣어 줍니다. 그대로 두세요.
   - 아래에 “DNS check successful” 이 보이면 정상.
3. 바로 일어나는 일:
   - https://zipcode.works/ 에서 사이트가 열립니다(화면 경로는 자동으로 맞음).
   - 예전 주소 https://chrisjangdaejang-ux.github.io/jangdaejang-calc/… 로 들어오면 GitHub 가 **같은 페이지의 새 주소로 자동으로 넘겨 줍니다**
     (예: `…/jangdaejang-calc/map/` → `https://zipcode.works/map/`, 영구 이동 301). 이미 퍼진 링크·북마크·검색 결과가 끊기지 않습니다.
   - 공개 데이터 저장소(jangdaejang-data)는 도메인을 붙이지 않았으므로 그대로 github.io 에서 열립니다(넘겨 주기 없음).

## 7. Enforce HTTPS

같은 화면 https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages 에서 **Enforce HTTPS** 체크.
체크 칸이 흐리면 자물쇠 인증서를 만드는 중입니다(보통 몇 분~1시간, 최대 24시간). 생기면 체크하세요.

## 8. 대표 주소 한 줄 바꾸기 — Claude 가 함

Claude 에게 **“도메인 전환 마무리해 줘”** 라고만 하면 됩니다. Claude 가 하는 일(한 커밋):

```
node tools/domain-switch.js </dev/null                                   # 미리 보기
node tools/domain-switch.js --apply --engine ../jangdaejang-engine </dev/null   # 실제로 바꿈
for f in tools/*-test.js; do node "$f" </dev/null || echo "실패 $f"; done # 검사
```

- `CNAME` = `zipcode.works`(6번에서 GitHub 가 이미 넣었으면 그대로)
- assets/config.js `SITE_URL: 'https://zipcode.works'`
- 모든 화면의 대표 주소(canonical·공유 미리보기 og:url·og:image·구조화 데이터) → https://zipcode.works/…
- robots.txt 경로 `/jangdaejang-calc/…` → `/…`
- 서버 tools/agent-backend.gs `WEB_ROOT` → `https://zipcode.works/`
- 엔진 scripts/brand.py `SITE_URL` → `https://zipcode.works`(주간 동향·브리핑·유튜브 키트 링크)
- 바뀐 공용 JS 판 번호(?v=)와 sw.js 판 번호 +1

단지·청약 검색용 페이지(apt/·cy/)와 sitemap 은 다음 날 07:37 자동 작업이 새 주소로 다시 만듭니다.
바로 하려면 https://github.com/chrisjangdaejang-ux/jangdaejang-timing/actions/workflows/seo.yml → **Run workflow** → 초록색 **Run workflow**.

> 8번을 늦게 해도 사이트는 동작합니다. 그동안 공유 링크·검색용 대표 주소가 예전 주소로 나가지만, 예전 주소는 6번 덕분에 새 주소로 넘어갑니다.

## 9. 그 밖에 바꿀 곳

**Apps Script 서버(메일·알림 속 링크)**
1. https://script.google.com → 중개사 제휴 프로젝트 → 코드에서 `const WEB_ROOT =` 줄을 찾아 `'https://zipcode.works/'` 로 바꾸고 저장
   (또는 8번이 끝난 tools/agent-backend.gs 전체를 붙여 넣기).
2. **배포** → **배포 관리** → 연필(수정) → 버전 **새 버전** → **배포**. 웹 앱 주소(…/exec)는 그대로라 화면 쪽은 바꿀 것 없음.
- 안 해도 메일 속 예전 주소 링크는 새 주소로 넘어갑니다. 다음 재배포 때 같이 해도 됩니다.

**토스페이먼츠**
- 결제 후 돌아오는 주소(성공·실패)는 화면이 지금 주소로 만들어 보내므로 코드에서 바꿀 것 없습니다.
- 카드사 심사에 낸 **웹사이트 주소** 가 예전 주소라면, 상점관리자 https://app.tosspayments.com 의 상점 정보에서 `https://zipcode.works` 로 바꾸거나
  (메뉴 이름은 화면에 적힌 글자를 따라) 심사 중이면 토스페이먼츠 고객센터에 주소가 바뀌었다고 알려 주세요. 심사가 늦어지지 않게 하는 용도입니다.

**구글 애널리틱스(GA4)**
- 측정은 주소와 상관없이 그대로 됩니다(측정 ID G-V2VR9VL7EM 그대로).
- 보기 좋게 하려면 https://analytics.google.com → **관리** → **데이터 스트림** → 웹 스트림 → 스트림 URL 을 `https://zipcode.works` 로(화면에 적힌 글자를 따라).

**검색 등록(네이버·구글·다음)** — docs/search_registration.md 1번부터 새 주소로 등록.

**문자·카카오 알림톡(SOLAPI)** — 알림톡 템플릿 버튼에 예전 주소가 고정으로 들어가 있다면 템플릿을 새 주소로 고쳐 다시 검수받아야 할 수 있습니다(화면에 적힌 글자를 따라).

**바꿀 것 없음**: 브이월드(엔진이 좌표를 받을 때 쓰는 키, github.io 주소로 등록 — 데이터 쪽이라 그대로), 공개 데이터 주소, 구글 폼, Apps Script 웹 앱 주소.

---

## 바꾼 뒤 확인(5분)

- https://zipcode.works/ · https://zipcode.works/map/ · https://zipcode.works/brief/ · https://zipcode.works/weekly/ · https://zipcode.works/apt/ 가 열리고 숫자가 나오는지
- 예전 주소 https://chrisjangdaejang-ux.github.io/jangdaejang-calc/map/ 가 https://zipcode.works/map/ 으로 넘어가는지
- http://jipcode.kr · http://집코드.kr · http://집코드.com 이 https://zipcode.works/ 로 넘어가는지
- 카카오 로그인 → 다시 사이트로 돌아오는지
- 주소창 자물쇠

## 되돌리기

1. https://github.com/chrisjangdaejang-ux/jangdaejang-calc/settings/pages → Custom domain **Remove**(저장소의 CNAME 파일도 지움).
2. Claude 에게 “도메인 전환 되돌려 줘” — 8번 커밋을 되돌립니다(git revert).
화면 경로는 자동이라 예전 주소에서 바로 다시 동작합니다.

## 알아 둘 점

- **브라우저에 저장된 것은 새 주소로 따라오지 않습니다.** 로그인 상태, 로그인 없이 저장한 관심 단지·내 집·계산 값은 주소(사이트)별로 저장되기 때문입니다.
  카카오 로그인한 분은 다시 로그인하면 서버에 저장된 자료가 돌아옵니다. 런칭 전에 바꾸는 것이 가장 좋습니다.
- **홈 화면에 설치한 앱(PWA)** 은 예전 주소 아이콘이라, 눌러도 새 주소로 넘어가며 브라우저로 열릴 수 있습니다. 새 주소에서 다시 ‘홈 화면에 추가’를 권합니다.
- **포워딩 주소의 https**: 가비아 포워딩은 보통 http 로 들어올 때만 넘겨 줍니다. 누가 `https://jipcode.kr` 처럼 쳐서 들어오면 보안 경고가 뜰 수 있습니다.
  필요하면 무료 대안: 주소마다 작은 GitHub 저장소를 만들어 그 도메인을 연결하고(자물쇠 자동) 새 주소로 넘기는 한 줄짜리 페이지를 둡니다 — Claude 에게 요청.
- **공개 데이터는 계속 github.io** 에서 읽습니다. 나중에 계정 대표 사이트(chrisjangdaejang-ux.github.io 저장소)에 도메인을 붙이면 데이터 주소가 바뀌니 그렇게 하지 마세요.
- 새 도메인에서는 데이터가 다른 사이트에서 오므로, 인터넷이 끊겼을 때 미리 저장해 둔 데이터로 보여 주는 기능은 화면(틀)만 되고 숫자는 안 나올 수 있습니다(예전 주소에서도 데이터는 늘 새로 받음).
