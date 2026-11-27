/* 집예보 사이트 설정 — 여기 한 곳만 고치면 됩니다.
   SITE_NAME: 서비스(웹) 이름. 바꾸면 모닝 브리핑 이름('{SITE_NAME} 모닝 브리핑')처럼 이 값을 읽는 화면 문구가 함께 바뀌어요.
     (서버는 tools/agent-backend.gs 의 SITE_NAME, 엔진은 scripts/brand.py 의 SITE_NAME 을 같은 값으로 바꿔 주세요.)
   KAKAO_JS_KEY: 카카오 개발자 콘솔 [앱] > [플랫폼 키] > [JavaScript 키] 값.
   비워 두면 카카오 로그인 버튼과 로그인 전용 기능이 화면에 나오지 않고, 나머지 기능은 로그인 없이 모두 그대로 쓸 수 있어요.
   지도(map/): KAKAO_JS_KEY 가 있으면 카카오맵으로 그려요(같은 앱에서 [카카오맵] 사용 설정과 Web 사이트 도메인 등록 필요).
     MAP_ENGINE: 'leaflet' 으로 적으면 카카오 키가 있어도 지도는 Leaflet 으로(로그인만 카카오).
     VWORLD_KEY: 카카오맵을 쓰지 않을 때 Leaflet 배경지도로 쓸 브이월드 인증키(서비스 URL 로 제한된 공개 키).
     비워 두면 미리 보기용 OpenStreetMap 공식 타일(대량·상업 서비스용이 아니라 정식 오픈 전까지만). */
/* SITE_URL: 사이트 첫 화면 주소(끝에 / 없이) — 대표 주소(canonical·공유 링크·검색용 페이지)에만 쓰여요.
     새 도메인(https://zipyebo.com)으로 바꾸는 날은 node tools/domain-switch.js --apply 가 이 줄과 CNAME 을 함께 바꿔요(docs/domain_switch.md).
     화면 안의 내부 경로는 이 값과 상관없이 지금 열린 주소에서 자동으로 정해져요(각 파일의 JB 줄: 예전 주소면 jangdaejang-calc 폴더 기준, 새 도메인이면 맨 앞 / 기준,
     공개 데이터는 예전 주소면 같은 사이트의 jangdaejang-data 폴더, 새 도메인이면 https://chrisjangdaejang-ux.github.io/jangdaejang-data/).
     매일 도는 검색용 페이지 생성(jangdaejang-timing seo.yml)이 이 값을 읽어 단지 페이지·sitemap.xml·robots.txt·
     모든 화면의 대표 주소(canonical·공유 주소)·앱 설치 정보(manifest)를 새 주소로 바꿔요.
   SITE_VERIFY_NAVER / SITE_VERIFY_GOOGLE: 네이버 서치어드바이저·구글 서치 콘솔 [HTML 태그] 확인 코드(content="…" 안의 값만).
     비워 두면 아무것도 넣지 않아요. 넣으면 다음 생성 때 첫 화면 <head> 의 확인 칸에 태그가 들어가요(docs/search_registration.md).
   COMMUNITY_ENABLED: 살아보니(건물별 짧은 후기·이야기, assets/community.js) 켜기. false 면 화면 어디에도 칸·링크가 없고 community/ 는 '준비 중'만 보여요.
     켜는 날은 서버 설정 open(비공개 엔진 data/community/rules.json)도 함께 켜요. 대표 확인 전에는 켜지 않아요.
   PAID_OPEN: 유료 결제(모닝 브리핑 이용권·요금제 올리기·프리미엄 리포트) 열기. false 면 결제 버튼이 '유료 이용권은 곧 열려요'로 잠기고 무료 체험만 돼요.
     통신판매업 신고번호가 나온 뒤 서버 tools/agent-backend.gs 의 PAID_OPEN 과 함께 true 로 바꿔요(서버도 false 면 결제 요청을 거절해요).
   PAY_REVIEW: 토스페이먼츠 심사용 테스트 결제창 보이기. true 이고 assets/pay.js 의 CLIENT_KEY 가 테스트 키(test_ck_…)일 때만
     프리미엄 리포트 결제 화면에서 [결제하기]가 눌리고 토스 카드 결제창이 테스트 모드로 열려요(위에 '테스트 결제 · 실제 청구 없음' 띠).
     서버에 주문을 만들지 않아 실제 판매·청구는 없어요. 실제 키(live_ck_…)로 바꾸면 이 값과 상관없이 PAID_OPEN 잠금을 따라요. 심사가 끝나면 false.
   PARTNER_ENABLED: 동네 중개사 파트너(dongne/ — 동마다 3자리 제휴 중개사의 '우리 동네 한마디'를 브리핑 맨 아래에) 켜기. false 면 화면 어디에도 칸·링크가 없고
     dongne/ 는 '준비 중'만 보여요(검색 제외). 운영자 미리 보기: dongne/admin/ 에서 [이 기기에서 미리 보기 켜기](모닝 브리핑 운영자 모드 카카오 계정만).
     켜는 날은 서버 tools/agent-backend.gs 의 DONGNE_ENABLED 도 함께 true 로. 대표 확인 전에는 켜지 않아요.
   BILLING_OPEN: 토스 자동결제(빌링 — 모닝 브리핑·동네 파트너 카드 등록·정기 결제) 안내 보이기. 토스 빌링 계약이 끝나기 전에는 false.
     켜는 날은 서버 tools/agent-backend.gs 의 BILLING_OPEN(그리고 PAID_OPEN)도 함께 true. false 면 약관·환불 정책의 자동 결제 조항(초안)이 숨어 있어요.
   COUNSEL_ENABLED: 고민 상담(counsel/ — 질문·전문가 답변·운영자 답변) 켜기. false 면 메뉴·링크·sitemap 어디에도 없고 counsel/ 은 '준비 중'만 보여요(검색 제외).
     운영자 미리 보기: counsel/admin/ 에서 [이 기기에서 미리 보기 켜기](모닝 브리핑 운영자 모드 카카오 계정만) + 주소에 ?preview=counsel.
     켜는 날은 서버 tools/agent-backend.gs 의 COUNSEL_OPEN 도 함께 true 로. 대표 확인 전에는 켜지 않아요.
   HEART_ENABLED: 하트(돈을 내고 충전해 고민 상담에서 쓰는 것 — counsel/heart/) 켜기. false 면 하트 칸·충전 화면이 보이지 않아요.
     켜는 날은 서버 HEART_OPEN 도 함께 true. 결제 버튼은 PAID_OPEN 도 true 여야 나와요(서버도 PAID_OPEN 이 false 면 충전 주문을 거절해요).
   MOVE_ENABLED: 이사 견적 받기(move/ — 이사업체 제휴, 견적 요청 하나를 업체 최대 3곳에 연결) 켜기. true 가 아니면 화면 어디에도 [이사 견적 받기] 버튼·칸이 없고
     move/ 는 '준비 중'만 보여요(검색 제외). 운영자 미리 보기: move/admin/ 에서 [이 기기에서 미리 보기 켜기]. 켜는 날은 서버 tools/agent-backend.gs 의 MOVE_ENABLED 도 함께 true 로.
     포인트 충전은 PAID_OPEN 도 열려야 돼요. 대표 확인 전에는 켜지 않아요.
   PROACTIVE_ENABLED: '집예보가 먼저 챙겨 드려요'(놓치면 손해 보는 기한·내 단지·내 동네 변화를 묻기 전에 알려 주는 기능) 켜기. false 면 첫 화면·달력·알림 센터의
     '집예보가 먼저 챙겨 드려요' 칸, 비과세 2년·일시적 2주택 날짜, 구역 단계 알림 버튼, '집예보가 기억하는 것'(my/memory/) 링크가 보이지 않고 alerts/ 소개 페이지는 '준비 중'(검색 제외).
     운영자 미리 보기: 주소 끝에 ?preview=pro 를 붙여 한 번 열면 그 기기에서만 보여요(?preview=off 로 끔). 켜는 날은 서버 tools/agent-backend.gs 의 PROACTIVE_ENABLED 도 함께 true 로.
   PRO_TOOLS_ENABLED: 중개사 프로 도구(agent/pro/ — 손님용 단지 리포트·동네 블로그/인스타 글 자동 만들기) 켜기. false 면 agent/pro/ 는 '준비 중'만 보이고(검색 제외)
     다른 화면 어디에도 링크가 없어요. 운영자 미리 보기: 주소 끝에 ?preview=pro-tools 를 붙여 한 번 열면 그 기기에서만 보여요(?preview=off 로 끔).
     이름·로고 넣기와 손님 링크는 서버가 확인된 중개사(동네 파트너 승인)·운영자 계정에만 열어 줘요. 켜는 날은 서버 tools/agent-backend.gs 의 PRO_TOOLS_ENABLED 도 함께 true 로.
   GUIDE_ENABLED: '고민 해결 길잡이'(solve/ — 고민을 적거나 상황 단추를 고르면 짧은 질문 → 내 조건으로 계산한 해법 카드 → 다음 단계, 결과 화면 끝 '이어서 하면 좋은 것') 켜기.
     false 면 첫 화면은 예전 '단지 이름으로 물어보기' 그대로이고 solve/ 는 '준비 중'(검색 제외). 대표 미리 보기: 주소 끝 ?preview=guide (끄기 ?preview=off).
     켜는 날은 서버 tools/agent-backend.gs 의 GUIDE_ENABLED 도 함께 true 로. 운영자 화면: solve/admin/(못 알아들은 고민 빈도순).
   AI_ENABLED: 길잡이 대화창(solve/?chat=1)의 AI 상담 — 규칙이 못 알아들은 문장만 서버(guideAI)가 AI 로 '어느 고민인지·문장 속 값·되물을 질문'을 읽어 줘요.
     숫자는 늘 집예보 계산기 결과(AI 가 만들지 않음). false 면 AI 를 부르지 않아요. 운영자 미리 보기: 주소 끝 ?preview=ai(운영자 카카오 간편 로그인 기기만 서버가 받음, 끄기 ?preview=off).
     켜는 날은 서버 tools/agent-backend.gs 의 AI_ENABLED 도 함께 true 로 + 스크립트 속성 ANTHROPIC_API_KEY 필요(없으면 서버가 AI 를 끈 채 규칙 방식으로). 사용량: solve/admin/.
   LAND_ENABLED: 땅 위험 신호 체크(land/ — 기획부동산 피해 예방: 읍·면·동 지분거래 급증 신호·주변 같은 지목 실거래 비교) 켜기. false 면 land/ 는 '준비 중'만 보이고(검색 제외)
     첫 화면·전체 기능·사이트맵 어디에도 링크가 없어요. 대표 미리 보기: land/ 주소 끝에 ?preview=land 를 붙여 한 번 열면 그 기기에서만 보여요(끄기 ?preview=off).
     켜는 날: node tools/land-launch.js --apply (이 값 + 검색 제외 해제 + 첫 화면 단추·전체 기능 줄·사이트맵, docs/launch_checklist.md). 서버 쪽 설정은 없어요.
   GUARD: 내 전셋집 지킴이(jeonse/guard/ — 등기 변동 감시) 무료 수·가격(대표 승인 2026-11-27 10:59 · 값 확정 11:01).
     freeHomes = 카카오 간편 로그인 회원이 무료로 지킬 수 있는 집 수(1) · freeHomesSubscriber = 모닝 브리핑 구독자는 이만큼 무료(3)
     extra = 무료 수를 넘는 집 1곳 한 달(30일) 값(900원) · read = '등기 바로 확인'(쉽게 읽는 등기부 포함) 1건 값(1,500원) · maxMonths = 한 번에 신청할 수 있는 최대 달 수.
     서버 tools/agent-backend.gs 의 JG_PRICE 도 같은 값으로 바꿔야 해요(무료 수·결제 금액은 서버가 정하고 대조 · node tools/guard-test.js 가 두 값을 비교).
     업체 원가는 서버 JG_VCOST(엔진 docs/pricing_policy.md 원가표). 회원 무료는 서버 GUARD_ENABLED + 업체 키가 있으면 열리고(결제 없음),
     추가 집·등기 바로 확인 결제 버튼은 PAID_OPEN + 서버 GUARD_ENABLED + 업체 키가 모두 있을 때만 열려요.
     무료 안내('알림이 오면 이렇게 하세요'·내가 뗀 등기부 올리기)는 이 값과 상관없이 늘 보여요.
   ADS_PROTO: 분양 광고 시안(assets/ads-proto.js — 홈 피드 카드·지도 'AD' 핀·분양 목록 카드·계산 결과 아래 '예산에 맞는 분양', 모두 '예시 광고') 켜기.
     false 면 화면 어디에도 칸이 없어요. 대표 미리 보기: 주소 끝 ?preview=ads 를 붙여 한 번 열면 그 기기에서만 보여요(끄기 ?preview=off). 설계: 비공개 엔진 docs/ads/ads-plan.md.
   SITE_VERIFY_DAUM: 다음 웹마스터도구 PIN 코드 줄 전체('#DaumWebMasterTool:…'). 넣으면 robots.txt 맨 아래에 붙어요. */
window.JDJ_SITE = {
  SITE_URL: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc',
  SITE_VERIFY_NAVER: '',
  SITE_VERIFY_GOOGLE: '',
  SITE_VERIFY_DAUM: '',
  SITE_NAME: '집예보',
  KAKAO_JS_KEY: '58a1dc9a4dda1516b4316ea72ca03348',
  MAP_ENGINE: '',
  VWORLD_KEY: '',
  COMMUNITY_ENABLED: false,
  PARTNER_ENABLED: false,
  COUNSEL_ENABLED: false,
  HEART_ENABLED: false,
  MOVE_ENABLED: false,
  PROACTIVE_ENABLED: false,
  PRO_TOOLS_ENABLED: false,
  GUIDE_ENABLED: false,
  AI_ENABLED: false,
  LAND_ENABLED: false,
  BILLING_OPEN: false,
  PAID_OPEN: false,
  PAY_REVIEW: true,
  ADS_PROTO: false,
  GUARD: { freeHomes: 1, freeHomesSubscriber: 3, extra: 900, read: 1500, maxMonths: 24 }
};
/* 서비스 이름 채우기: 화면의 [data-site-name] 칸은 SITE_NAME, [data-brief-name] 칸은 '{SITE_NAME} 모닝 브리핑'(값이 있으면 뒤에 붙임) */
(function () {
  function fill() {
    var S = (window.JDJ_SITE && window.JDJ_SITE.SITE_NAME) || '집예보', N = S + ' 모닝 브리핑';
    document.querySelectorAll('[data-site-name]').forEach(function (el) { el.textContent = S; });
    document.querySelectorAll('[data-brief-name]').forEach(function (el) { el.textContent = el.getAttribute('data-brief-name') ? N + ' ' + el.getAttribute('data-brief-name') : N; });
  }
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
