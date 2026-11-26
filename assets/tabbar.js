/* 집예보 하단 탭(휴대폰·PC 공통): 홈 · 고민 찾기 · 지도 · 내 집 · 전체 (5개를 넘기지 않음 — 대표 결정 2026-11-26, 순위·단지 비교는 '전체'·첫 화면에서)
   '고민 찾기' = 고민 해결 길잡이(solve/)가 켜져 있으면 solve/, 꺼져 있는 동안은 첫 화면 맨 위 검색 칸(./#q, 단지·기능 찾기)으로.
   <script src="assets/tabbar.js?v=7" defer></script> 만 넣으면 휴대폰은 화면 맨 아래, PC(1024px 이상)는 머리줄 로고 오른쪽에 붙는다(지금 화면 탭은 파랑).
   본문이 탭에 가리지 않게 body 아래 여백을 탭 높이만큼 더한다. 지도 화면은 body.jm-full 로 여백 대신 지도 높이에서 뺀다. */
(function () {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  if (typeof document === 'undefined' || document.querySelector('.jtab')) return;
  var B = JB.SITE;
  function gon() { try { return !!(window.JDJ_SITE && window.JDJ_SITE.GUIDE_ENABLED === true) || localStorage.getItem('jdj_guide_preview') === '1'; } catch (e) { return false; } }
  var T = [
    ['', '홈', '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>', 'tab_home'],
    ['#q', '고민 찾기', '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M10 9a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4"/><path d="M12 13.6h.01"/>', 'tab_solve'],
    ['map/', '지도', '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', 'tab_map'],
    ['mine/', '내 집', '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M12 17.5s-3-1.8-3-3.7a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.9-3 3.7-3 3.7z"/>', 'tab_mine'],
    ['all/', '전체', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>', 'tab_all']
  ];
  function start() {
    if (gon()) T[1][0] = 'solve/';
    var p = location.pathname.replace(/index\.html$/, ''), cur = '';
    T.forEach(function (t) { if (t[0] && t[0] !== '#q' && p.indexOf(B + t[0]) === 0) cur = t[0]; });
    if (!cur && /^(rank|ask)\//.test(p.slice(B.length))) cur = 'all/';   // 순위·단지 비교는 '전체' 안의 화면
    if (!cur && p !== B) cur = '-';
    var st = document.createElement('style');
    st.textContent = '.jtab{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;justify-content:center;background:rgba(255,255,255,.97);border-top:1px solid #E5E8EB;padding:0 0 env(safe-area-inset-bottom);backdrop-filter:saturate(1.4) blur(8px)}' +
      '.jtab nav{display:flex;width:100%;max-width:560px}' +
      '.jtab a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:58px;color:#4E5968;text-decoration:none;font-size:12.5px;font-weight:700;white-space:nowrap}.jtab a:focus-visible{outline:3px solid #4338CA;outline-offset:-3px;border-radius:10px}' +
      '.jtab a svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.jtab a.on{color:#4338CA}.jtab a.on svg{stroke-width:2.3}' +
      'body.jtab-pad{padding-bottom:calc(58px + env(safe-area-inset-bottom))}' +
      '.jdjpwa{bottom:calc(70px + env(safe-area-inset-bottom))!important}' +
      '@media print{.jtab{display:none}}' +
      /* PC(1024px 이상): 아래 탭 대신 머리줄 안 로고 오른쪽에 가로 메뉴(docs/design_guide.md) */
      '@media(min-width:1024px){.jtab{top:0;bottom:auto;left:150px;right:auto;height:68px;padding:0;background:none;border:0;backdrop-filter:none;z-index:45}' +
      '.jtab nav{max-width:none;gap:2px;align-items:center}.jtab a{flex:none;flex-direction:row;gap:6px;min-height:44px;padding:0 12px;border-radius:10px;font-size:15px}' +
      '.jtab a svg{width:18px;height:18px}.jtab a:hover{background:#F2F4F6}.jtab a.on{background:#EEEDFB}' +
      'body.jtab-pad{padding-bottom:0}.jdjpwa{bottom:16px!important}}' +
      '@media(min-width:1024px) and (max-width:1279px){.jtab a svg{display:none}.jtab a{padding:0 10px}}';
    document.head.appendChild(st);
    var w = document.createElement('div'); w.className = 'jtab';
    w.innerHTML = '<nav aria-label="주요 화면">' + T.map(function (t) {
      var on = t[0] === cur;
      return '<a href="' + (t[0] === '#q' ? (p === B ? '#q' : B + '#q') : B + t[0]) + '" data-track="' + t[3] + '"' + (on ? ' class="on" aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + t[2] + '</svg>' + t[1] + '</a>';
    }).join('') + '</nav>';
    document.body.appendChild(w);
    if (!document.body.classList.contains('jm-full')) document.body.classList.add('jtab-pad');
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
