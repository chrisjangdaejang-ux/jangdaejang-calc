/* 모닝 브리핑 광고 자리(웹 브리핑 화면) — [data-brief-ad] 칸을 오늘 진행 중인 광고 1개로 채워요.
   - 서버 GET briefAd(공개 정보만: 광고주·제목·설명·https 링크). 광고가 없으면 칸을 숨긴 그대로 둬요(빈 상자 없음).
   - 웹 화면은 동의와 관계없이 모든 방문자에게 보여요. 메일 속 광고는 서버가 '이른 아침 광고 받기' 동의자에게만 넣어요.
   - '광고' 표시를 늘 붙이고, 브리핑 숫자·순위와 섞지 않아요. */
(function (root) {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cache = null;
  function html(ad) {
    if (!ad || !ad.title || !/^https:\/\//.test(ad.url || '')) return '';
    return '<div class="bad-in"><span class="bad-k">광고</span><span class="bad-a">' + esc(ad.adv) + '</span>'
      + '<a class="bad-t" href="' + esc(ad.url) + '" target="_blank" rel="noopener sponsored" data-track="brief_ad_click">' + esc(ad.title) + '</a>'
      + (ad.desc ? '<p class="bad-d">' + esc(ad.desc) + '</p>' : '')
      + '<p class="bad-n">브리핑의 숫자·순위는 광고와 관계없이 똑같이 계산해요.</p></div>';
  }
  function fill(doc) {
    doc = doc || root.document; if (!doc) return Promise.resolve(null);
    var els = doc.querySelectorAll('[data-brief-ad]'); if (!els.length) return Promise.resolve(null);
    var api = (root.JDJ_AGENTS || {}).api; if (!api) return Promise.resolve(null);
    cache = cache || fetch(api + '?action=briefAd').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return j && j.ok ? j.ad : null; }).catch(function () { return null; });
    return cache.then(function (ad) {
      var h = html(ad); if (!h) return null;
      els.forEach(function (el) { el.innerHTML = h; el.hidden = false; });
      return ad;
    });
  }
  var api = { fill: fill, html: html };
  root.JDJ_BRIEF_AD = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
