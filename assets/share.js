/* 장대장 계산기 공유·개인값 보관 도우미 (리포트·내 집 시세·갈아타기·청약 공용)
   - 개인 금융값(연소득·현금·대출 원리금·이름·기타 비용)은 주소에 싣지 않고 이 기기(localStorage)에만 둡니다.
   - 공유는 카카오 SDK 없이 휴대폰 공유창(Web Share API) → 안 되면 링크 복사. */
(function (root) {
  'use strict';
  var KEY = 'jdj_fin';
  var PERSONAL = ['i', 'c', 'd', 'n', 'e'];   // 주소에 실으면 안 되는 개인값(연소득·현금·대출·이름·기타 비용)

  function saveFin(o) {
    try {
      var cur = loadFin() || {};
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k) && o[k] != null) cur[k] = o[k];
      cur.at = Date.now();
      root.localStorage.setItem(KEY, JSON.stringify(cur));
    } catch (e) {}
  }
  function loadFin() {
    try { var j = JSON.parse(root.localStorage.getItem(KEY) || 'null'); return j && typeof j === 'object' ? j : null; } catch (e) { return null; }
  }
  /* 주소 문자열에 개인값이 있는지 */
  function hasPersonal(search) {
    var q = new URLSearchParams(search || '');
    return PERSONAL.some(function (k) { return q.has(k); });
  }
  /* 개인값을 지운 주소 검색 문자열 ('?...' 또는 '') */
  function stripPersonal(search) {
    var q = new URLSearchParams(search || '');
    PERSONAL.forEach(function (k) { q.delete(k); });
    var s = q.toString();
    return s ? '?' + s : '';
  }

  /* 공유: 휴대폰 공유창(카카오톡 포함) → 링크 복사. 결과 'share' | 'copy' | 'fail' | 'cancel' */
  function share(opt) {
    opt = opt || {};
    var url = opt.url || root.location.href, title = opt.title || root.document.title, text = opt.text || '';
    var nav = root.navigator || {};
    function copy() {
      var full = (text ? text + '\n' : '') + url;
      if (nav.clipboard && nav.clipboard.writeText) return nav.clipboard.writeText(full).then(function () { return 'copy'; }, fallback);
      return Promise.resolve(fallback());
      function fallback() {
        try {
          var ta = root.document.createElement('textarea'); ta.value = full; ta.setAttribute('readonly', '');
          ta.style.position = 'fixed'; ta.style.opacity = '0'; root.document.body.appendChild(ta); ta.select();
          var ok = root.document.execCommand('copy'); ta.remove(); return ok ? 'copy' : 'fail';
        } catch (e) { return 'fail'; }
      }
    }
    if (nav.share) {
      return nav.share({ title: title, text: text, url: url }).then(function () { return 'share'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        return copy();
      });
    }
    return copy();
  }
  /* 단추에 공유 연결: 누르면 공유, 복사되면 단추 글자로 알림 */
  function bind(btn, getOpt, onDone) {
    if (!btn) return;
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var opt = typeof getOpt === 'function' ? getOpt() : getOpt;
      share(opt).then(function (r) {
        if (r === 'copy') btn.textContent = '링크 복사됨';
        else if (r === 'fail') btn.textContent = '복사 안 됨';
        if (r === 'copy' || r === 'fail') setTimeout(function () { btn.textContent = label; }, 2000);
        if (onDone) onDone(r);
        if (root.jdjStat && opt && opt.ev && (r === 'share' || r === 'copy')) try { root.jdjStat(opt.ev, { method: r }); } catch (e) {}
      });
    });
  }

  var api = { saveFin: saveFin, loadFin: loadFin, hasPersonal: hasPersonal, stripPersonal: stripPersonal, share: share, bind: bind, PERSONAL: PERSONAL };
  root.JDJ_SHARE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
