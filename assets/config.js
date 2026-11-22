/* 집코드 사이트 설정 — 여기 한 곳만 고치면 됩니다.
   SITE_NAME: 서비스(웹) 이름. 바꾸면 모닝 브리핑 이름('{SITE_NAME} 모닝 브리핑')처럼 이 값을 읽는 화면 문구가 함께 바뀌어요.
     (서버는 tools/agent-backend.gs 의 SITE_NAME, 엔진은 scripts/brand.py 의 SITE_NAME 을 같은 값으로 바꿔 주세요.)
   KAKAO_JS_KEY: 카카오 개발자 콘솔 [앱] > [플랫폼 키] > [JavaScript 키] 값.
   비워 두면 카카오 로그인 버튼과 로그인 전용 기능이 화면에 나오지 않고, 나머지 기능은 로그인 없이 모두 그대로 쓸 수 있어요.
   지도(map/): KAKAO_JS_KEY 가 있으면 카카오맵으로 그려요(같은 앱에서 [카카오맵] 사용 설정과 Web 사이트 도메인 등록 필요).
     MAP_ENGINE: 'leaflet' 으로 적으면 카카오 키가 있어도 지도는 Leaflet 으로(로그인만 카카오).
     VWORLD_KEY: 카카오맵을 쓰지 않을 때 Leaflet 배경지도로 쓸 브이월드 인증키(서비스 URL 로 제한된 공개 키).
     비워 두면 미리 보기용 OpenStreetMap 공식 타일(대량·상업 서비스용이 아니라 정식 오픈 전까지만). */
/* SITE_URL: 사이트 첫 화면 주소(끝에 / 없이) — 대표 주소(canonical·공유 링크·검색용 페이지)에만 쓰여요.
     새 도메인(https://zipcode.works)으로 바꾸는 날은 node tools/domain-switch.js --apply 가 이 줄과 CNAME 을 함께 바꿔요(docs/domain_switch.md).
     화면 안의 내부 경로는 이 값과 상관없이 지금 열린 주소에서 자동으로 정해져요(각 파일의 JB 줄: 예전 주소면 jangdaejang-calc 폴더 기준, 새 도메인이면 맨 앞 / 기준,
     공개 데이터는 예전 주소면 같은 사이트의 jangdaejang-data 폴더, 새 도메인이면 https://chrisjangdaejang-ux.github.io/jangdaejang-data/).
     매일 도는 검색용 페이지 생성(jangdaejang-timing seo.yml)이 이 값을 읽어 단지 페이지·sitemap.xml·robots.txt·
     모든 화면의 대표 주소(canonical·공유 주소)·앱 설치 정보(manifest)를 새 주소로 바꿔요.
   SITE_VERIFY_NAVER / SITE_VERIFY_GOOGLE: 네이버 서치어드바이저·구글 서치 콘솔 [HTML 태그] 확인 코드(content="…" 안의 값만).
     비워 두면 아무것도 넣지 않아요. 넣으면 다음 생성 때 첫 화면 <head> 의 확인 칸에 태그가 들어가요(docs/search_registration.md).
   COMMUNITY_ENABLED: 살아보니(건물별 짧은 후기·이야기, assets/community.js) 켜기. false 면 화면 어디에도 칸·링크가 없고 community/ 는 '준비 중'만 보여요.
     켜는 날은 서버 설정 open(비공개 엔진 data/community/rules.json)도 함께 켜요. 대표 확인 전에는 켜지 않아요.
   SITE_VERIFY_DAUM: 다음 웹마스터도구 PIN 코드 줄 전체('#DaumWebMasterTool:…'). 넣으면 robots.txt 맨 아래에 붙어요. */
window.JDJ_SITE = {
  SITE_URL: 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc',
  SITE_VERIFY_NAVER: '',
  SITE_VERIFY_GOOGLE: '',
  SITE_VERIFY_DAUM: '',
  SITE_NAME: '집코드',
  KAKAO_JS_KEY: '58a1dc9a4dda1516b4316ea72ca03348',
  MAP_ENGINE: '',
  VWORLD_KEY: '',
  COMMUNITY_ENABLED: false
};
/* 서비스 이름 채우기: 화면의 [data-site-name] 칸은 SITE_NAME, [data-brief-name] 칸은 '{SITE_NAME} 모닝 브리핑'(값이 있으면 뒤에 붙임) */
(function () {
  function fill() {
    var S = (window.JDJ_SITE && window.JDJ_SITE.SITE_NAME) || '집코드', N = S + ' 모닝 브리핑';
    document.querySelectorAll('[data-site-name]').forEach(function (el) { el.textContent = S; });
    document.querySelectorAll('[data-brief-name]').forEach(function (el) { el.textContent = el.getAttribute('data-brief-name') ? N + ' ' + el.getAttribute('data-brief-name') : N; });
  }
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();
})();
