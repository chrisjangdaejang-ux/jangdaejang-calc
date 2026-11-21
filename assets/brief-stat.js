/* 모닝 브리핑 구독자 익명 통계 표시(광고 안내 /ad/ · 시행사 페이지 /pro/developer/) — [data-brief-stat] 칸을 채워요.
   - 서버 briefPublic(구독자 10명 미만이면 숫자 없음, 칸마다 10명 미만은 숨김)의 실제 숫자만 보여 주고, 숫자가 없으면 칸을 숨긴 그대로 둬요.
   - 서비스 이름은 assets/config.js 의 SITE_NAME(없으면 서버가 보낸 이름). */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString('ko-KR'); };
  function top(o, n) { return Object.keys(o || {}).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n || 4); }
  function html(j) {
    var site = (window.JDJ_SITE && window.JDJ_SITE.SITE_NAME) || '', name = site ? site + ' 모닝 브리핑' : (j.name || '모닝 브리핑');
    var bits = [];
    var sd = top(j.sido, 4); if (sd.length) bits.push('관심 지역: ' + sd.map(function (x) { return esc(x[0]) + ' ' + fmt(x[1]) + '명'; }).join(' · '));
    var bg = top(j.budget, 3); if (bg.length) bits.push('예산: ' + bg.map(function (x) { return esc(x[0]) + ' ' + fmt(x[1]) + '명'; }).join(' · '));
    var ag = top(j.age, 3); if (ag.length) bits.push('연령: ' + ag.map(function (x) { return esc(x[0]) + ' ' + fmt(x[1]) + '명'; }).join(' · '));
    if (j.amAd != null) bits.push('메일 광고 받는 구독자(이른 아침 광고 동의) ' + fmt(j.amAd) + '명');
    if (j.open != null) bits.push('최근 30일 웹 열람률 ' + j.open + '%');
    return '<b>' + esc(name) + ' 구독자 ' + fmt(j.n) + '명</b>' + (j.paid ? ' <span>(유료 ' + fmt(j.paid) + '명)</span>' : '')
      + (bits.length ? '<small>' + bits.join('<br>') + '</small>' : '') + '<small>' + esc(j.at) + ' 기준 · 매일 아침 브리핑을 받는 실제 구독자 익명 집계(10명 미만 칸은 숨김)</small>';
  }
  function run() {
    var els = document.querySelectorAll('[data-brief-stat]'); if (!els.length) return;
    var api = (window.JDJ_AGENTS || {}).api; if (!api) return;
    fetch(api + '?action=briefPublic').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.ok || !j.n) return;
      els.forEach(function (el) { el.innerHTML = html(j); el.hidden = false; });
    }).catch(function () {});
  }
  if (typeof module !== 'undefined') module.exports = { html: html };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run(); }
})();
