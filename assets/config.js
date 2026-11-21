/* 집예보 사이트 설정 — 여기 한 곳만 고치면 됩니다.
   SITE_NAME: 서비스(웹) 이름. 바꾸면 모닝 브리핑 이름('{SITE_NAME} 모닝 브리핑')처럼 이 값을 읽는 화면 문구가 함께 바뀌어요.
     (서버는 tools/agent-backend.gs 의 SITE_NAME, 엔진은 scripts/brand.py 의 SITE_NAME 을 같은 값으로 바꿔 주세요.)
   KAKAO_JS_KEY: 카카오 개발자 콘솔 [앱] > [플랫폼 키] > [JavaScript 키] 값.
   비워 두면 카카오 로그인 버튼과 로그인 전용 기능이 화면에 나오지 않고, 나머지 기능은 로그인 없이 모두 그대로 쓸 수 있어요.
   지도(map/): KAKAO_JS_KEY 가 있으면 카카오맵으로 그려요(같은 앱에서 [카카오맵] 사용 설정과 Web 사이트 도메인 등록 필요).
     MAP_ENGINE: 'leaflet' 으로 적으면 카카오 키가 있어도 지도는 Leaflet 으로(로그인만 카카오).
     VWORLD_KEY: 카카오맵을 쓰지 않을 때 Leaflet 배경지도로 쓸 브이월드 인증키(서비스 URL 로 제한된 공개 키).
     비워 두면 미리 보기용 OpenStreetMap 공식 타일(대량·상업 서비스용이 아니라 정식 오픈 전까지만). */
window.JDJ_SITE = {
  SITE_NAME: '집예보',
  KAKAO_JS_KEY: '58a1dc9a4dda1516b4316ea72ca03348',
  MAP_ENGINE: '',
  VWORLD_KEY: ''
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
