/* 집예보 결과 화면 공통 틀 도우미 (assets/result.css 와 함께, docs/design_guide.md 15)
   - 숫자를 새로 계산하지 않아요. 화면이 이미 계산한 값(점수·변동률·문장)을 받아 같은 모양으로 그려요.
   - JDJ_RF.fc(점수, {note, trust, title}) → 예보 막대(평균보다 덜 오를 쪽 ↔ 더 오를 쪽, 5칸) HTML
   - JDJ_RF.lean(점수) → '평균과 비슷하게 움직일 쪽이에요' 같은 한 줄(assets/narrative.js·map-core.js 와 같은 구간 70·55·45·30)
   - JDJ_RF.trend([['1년 전', 0.012], ['3년 전', 0.442]]) → '1년 전과 거의 같고, 3년 전보다 44.2% 올랐어요.'(±0.5% 안은 '거의 같음')
   window.JDJ_RF = { fc, lean, trend, esc } */
(function (root) {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function lean(s) {
    if (s == null || isNaN(s)) return '';
    return s >= 70 ? '평균보다 더 오를 가능성이 커요' : s >= 55 ? '평균보다 더 오를 쪽이에요' : s > 45 ? '평균과 비슷하게 움직일 쪽이에요'
      : s > 30 ? '평균보다 덜 오를 쪽이에요' : '평균보다 덜 오를 가능성이 커요';
  }
  /* o.trust = { lv:'h'|'m'|'l', lvKo:'높음', reason:'…' } (assets/conf.js build 결과 그대로) */
  function fc(score, o) {
    if (score == null || isNaN(score)) return '';
    o = o || {};
    var s = Math.max(0, Math.min(100, +score));
    var t = o.trust, tr = t && t.lvKo ? '<span class="rf-trust"><span class="rf-lv ' + esc(t.lv || '') + '">믿을 만한 정도 ' + esc(t.lvKo) + '</span>' + esc(t.reason || '') + '</span>' : '';
    return '<div class="rf-fc"><div class="rf-fct"><span>' + esc(o.title || '앞으로 2년 예보') + ' <small>미래가치 점수</small></span><b class="num">' + esc(score) + '<small>/100</small></b></div>'
      + '<div class="rf-bar" role="img" aria-label="100점 중 ' + esc(score) + '점 · ' + esc(lean(s)) + '"><i></i><i></i><i></i><i></i><i></i><span class="rf-pin" style="left:' + s + '%"></span></div>'
      + '<div class="rf-lb" aria-hidden="true"><span>평균보다 덜 오를 쪽</span><span>평균보다 더 오를 쪽</span></div>'
      + '<p class="rf-fcn">' + esc(o.note || lean(s)) + '</p>' + tr + '</div>';
  }
  function pctAbs(v) { return (Math.round(Math.abs(v) * 1000) / 10).toFixed(1) + '%'; }
  function trend(list) {
    var ps = (list || []).filter(function (x) { return x && x[1] != null && !isNaN(x[1]); });
    if (!ps.length) return '';
    return ps.map(function (x, i) {
      var last = i === ps.length - 1, v = +x[1];
      if (Math.abs(v) < 0.005) return x[0] + (last ? '과 거의 같아요' : '과 거의 같고');
      return x[0] + '보다 ' + pctAbs(v) + ' ' + (v > 0 ? (last ? '올랐어요' : '올랐고') : (last ? '내렸어요' : '내렸고'));
    }).join(', ') + '.';
  }
  var API = { fc: fc, lean: lean, trend: trend, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_RF = API;
})(typeof window !== 'undefined' ? window : globalThis);
