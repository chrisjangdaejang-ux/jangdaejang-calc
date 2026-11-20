/* 집예보 하단 탭(휴대폰·PC 공통): 홈 · 지도 · 순위 · 내 집 시세 · 단지 비교 (5개를 넘기지 않음)
   <script src="/jangdaejang-calc/assets/tabbar.js?v=2" defer></script> 만 넣으면 화면 맨 아래에 붙는다(지금 화면 탭은 파랑).
   본문이 탭에 가리지 않게 body 아래 여백을 탭 높이만큼 더한다. 지도 화면은 body.jm-full 로 여백 대신 지도 높이에서 뺀다. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || document.querySelector('.jtab')) return;
  var B = '/jangdaejang-calc/';
  var T = [
    ['', '홈', '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>', 'tab_home'],
    ['map/', '지도', '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', 'tab_map'],
    ['rank/', '순위', '<path d="M3 20h18"/><path d="M9 20V8h6v12"/><path d="M3 20v-7h6M15 11h6v9"/>', 'tab_rank'],
    ['mine/', '내 집 시세', '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>', 'tab_mine'],
    ['ask/', '단지 비교', '<rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/>', 'tab_ask']
  ];
  function start() {
    var p = location.pathname.replace(/index\.html$/, ''), cur = '';
    T.forEach(function (t) { if (t[0] && p.indexOf(B + t[0]) === 0) cur = t[0]; });
    if (!cur && p !== B) cur = '-';
    var st = document.createElement('style');
    st.textContent = '.jtab{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;justify-content:center;background:rgba(255,255,255,.97);border-top:1px solid #E5E8EB;padding:0 0 env(safe-area-inset-bottom);backdrop-filter:saturate(1.4) blur(8px)}' +
      '.jtab nav{display:flex;width:100%;max-width:560px}' +
      '.jtab a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:58px;color:#4E5968;text-decoration:none;font-size:12.5px;font-weight:700;white-space:nowrap}' +
      '.jtab a svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.jtab a.on{color:#2F6BFF}' +
      'body.jtab-pad{padding-bottom:calc(58px + env(safe-area-inset-bottom))}' +
      '.jdjpwa{bottom:calc(70px + env(safe-area-inset-bottom))!important}' +
      '@media print{.jtab{display:none}}';
    document.head.appendChild(st);
    var w = document.createElement('div'); w.className = 'jtab';
    w.innerHTML = '<nav aria-label="주요 화면">' + T.map(function (t) {
      var on = t[0] === cur;
      return '<a href="' + B + t[0] + '" data-track="' + t[3] + '"' + (on ? ' class="on" aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + t[2] + '</svg>' + t[1] + '</a>';
    }).join('') + '</nav>';
    document.body.appendChild(w);
    if (!document.body.classList.contains('jm-full')) document.body.classList.add('jtab-pad');
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
