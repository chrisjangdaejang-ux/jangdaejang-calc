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
