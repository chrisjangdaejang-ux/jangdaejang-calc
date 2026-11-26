/* '지도에서 보기' — 결과 화면(내 집 시세 아파트·오피스텔·상가·건물, 빌라, 단지 비교, 단지 검색용 페이지)에서 지도(map/)로 바로 가는 버튼과 주소 규칙.
   화면과 map/ 과 tools/mapjump-test.js 가 함께 쓴다(주소 만들기 url ↔ 읽기 parse 가 서로 맞아야 함).
   주소(map/?…):
     아파트  sd·d·b (지도 화면이 원래 읽던 값 그대로) + 비교 단지 sd2·d2·b2·sd3·d3·b3
     그 밖   fk(o 오피스텔 · v 빌라 · c 구분상가 건물 · g 통건물 · a 아파트) fg(시·군·구 코드) fd(동) fj(지번) fn(이름) fp(최근 가격, 만원) fl(위도,경도 — 소수 셋째 자리)
             fe(p 행안부 공공 좌표 | m 지도 서비스 좌표) + fx(건축물대장 사실 한 줄) — 통건물 추정 위치(공개 건축물대장과 맞춘 건물, 지번 없음)
     공통    f=1(결과 화면에서 옴: 표시 카드·돌아가기·주변 레이어) · bk(돌아갈 화면, 사이트 안 상대 주소 — 'mine/?t=o&og=…')
   경로는 JDJ_BASE(JB.SITE) 기준이라 예전 주소·새 도메인 어디서든 같게 동작한다(예전 저장소 폴더 이름을 경로에 직접 쓰지 않음).
   window.JDJ_MAPJ = { url, parse, back, backHref, btn, css, fitZoom, railText, KIND } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var KIND = { a: '아파트', o: '오피스텔', v: '빌라', c: '상가·사무실 건물', g: '통건물' };
  var r3 = function (v) { return Math.round(v * 1000) / 1000; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* 돌아갈 화면: 사이트 안 상대 주소만(다른 사이트로 보내는 주소는 버림) */
  function back(path) {
    var s = String(path == null ? '' : path);
    if (!s || s.length > 1500 || /^[\/\\]|^[a-z][a-z0-9+.-]*:|\/\/|\\|[\s<>"']/i.test(s) || /(^|\/)\.\.(\/|$)/.test(s)) return '';
    return s;
  }
  /** 지금 화면(location)의 사이트 안 상대 주소 — bk 값 */
  function here(loc) {
    loc = loc || (typeof location !== 'undefined' ? location : null); if (!loc) return '';
    var p = loc.pathname || '', site = JB.SITE;
    if (p.indexOf(site) !== 0) return '';
    return back(p.slice(site.length) + (loc.search || ''));
  }
  /** o = { items:[{sd, d, b}](아파트·비교), kind, g, dong, jibun, name, price, ll:[위도, 경도], est(추정 위치), facts, back(상대 주소, 없으면 지금 화면) } → 지도 주소 */
  function url(o, loc) {
    o = o || {};
    var q = [], add = function (k, v) { if (v != null && v !== '') q.push(k + '=' + encodeURIComponent(String(v))); };
    (o.items || []).slice(0, 3).forEach(function (it, i) { var n = i ? String(i + 1) : ''; add('sd' + n, it.sd); add('d' + n, it.d); add('b' + n, it.b); });
    if (o.kind && o.kind !== 'a') add('fk', o.kind);
    add('fg', o.g); add('fd', o.dong); add('fj', o.jibun); add('fn', o.name);
    if (o.price > 0) add('fp', Math.round(o.price));
    if (o.ll && isFinite(o.ll[0]) && isFinite(o.ll[1])) add('fl', r3(o.ll[0]) + ',' + r3(o.ll[1]));
    if (o.est && o.ll) { add('fe', o.est === 'p' ? 'p' : 'm'); add('fx', String(o.facts || '').slice(0, 80)); }
    add('f', '1');
    add('bk', back(o.back != null ? o.back : here(loc)));
    return JB.SITE + 'map/?' + q.join('&');
  }
  /** 지도 화면이 읽기: URLSearchParams(또는 문자열) → { on, items, kind, g, dong, jibun, name, price, ll, back } */
  function parse(p) {
    if (typeof p === 'string') p = new URLSearchParams(p);
    var items = [];
    ['', '2', '3'].forEach(function (n) { var sd = p.get('sd' + n), d = p.get('d' + n); if (sd && /^s\d\d$/.test(sd) && d) items.push({ sd: sd, d: d, b: p.get('b' + n) || '' }); });
    var fk = p.get('fk'), kind = KIND[fk] && fk !== 'a' ? fk : items.length ? 'a' : '';
    var ll = null, fl = String(p.get('fl') || '').split(',').map(Number);
    if (fl.length === 2 && fl[0] > 32 && fl[0] < 39.5 && fl[1] > 124 && fl[1] < 132) ll = [r3(fl[0]), r3(fl[1])];
    var g = p.get('fg') || '', price = parseInt(p.get('fp'), 10);
    return { on: p.get('f') === '1', items: items, kind: kind, g: /^\d{5}$/.test(g) ? g : '', dong: (p.get('fd') || '').slice(0, 40), jibun: (p.get('fj') || '').slice(0, 30),
      name: (p.get('fn') || '').slice(0, 60), price: price > 0 ? price : 0, ll: ll, back: back(p.get('bk')),
      est: ll && /^[pm1]$/.test(p.get('fe') || '') ? (p.get('fe') === 'p' ? 'p' : 'm') : '', facts: ll && /^[pm1]$/.test(p.get('fe') || '') ? (p.get('fx') || '').slice(0, 80) : '' };
  }
  /** 돌아가기 링크 주소(사이트 안) — 없으면 '' */
  function backHref(F) { return F && F.back ? JB.SITE + F.back : ''; }

  /* 지도 칸(w×h px)에 점들이 다 들어가는 확대 단계(Leaflet 숫자) — 점 1개면 기본값 */
  function fitZoom(pts, w, h, one) {
    pts = (pts || []).filter(function (p) { return p && isFinite(p[0]) && isFinite(p[1]); });
    if (pts.length < 2) return one || 16;
    var la = pts.map(function (p) { return p[0]; }), ln = pts.map(function (p) { return p[1]; });
    var dLat = Math.max.apply(null, la) - Math.min.apply(null, la), dLng = Math.max.apply(null, ln) - Math.min.apply(null, ln);
    var c = Math.cos((Math.max.apply(null, la) + Math.min.apply(null, la)) / 2 * Math.PI / 180);
    var zx = dLng > 0 ? Math.log2((w * 0.6) * 360 / (256 * dLng)) : 19, zy = dLat > 0 ? Math.log2((h * 0.5) * 360 * c / (256 * dLat)) : 19;
    return Math.max(8, Math.min(16, Math.floor(Math.min(zx, zy))));
  }
  /* 가까운 신설역 한 줄 — 개통 전 예정 위치(pl)는 좌표 없이 '예정 위치 기준 약 ○m'(50m 단위), 개통한 역은 직선 거리(narrative.js 와 같은 말) */
  function railText(R) {
    if (!R || R.x || !R.st) return '';
    var nm = R.pl ? (/역$/.test(R.st) ? R.st : R.st + '역') + '(개통 예정)' : (/역$/.test(R.st) ? R.st : R.st + '역');
    var m = R.m == null ? '' : R.pl ? ' · 예정 위치 기준 약 ' + (Math.round(R.m / 50) * 50).toLocaleString('ko-KR') + 'm' : ' · 직선 ' + Math.round(R.m).toLocaleString('ko-KR') + 'm';
    return (R.line ? R.line + ' ' : '') + nm + m;
  }

  /* ---------- 버튼 ---------- */
  var PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  function css() {
    if (typeof document === 'undefined' || document.getElementById('mapjCss')) return;
    var st = document.createElement('style'); st.id = 'mapjCss';
    st.textContent = '.mapj{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid #4338CA;background:#fff;color:#4338CA;font:inherit;font-size:15px;font-weight:800;text-decoration:none;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent}'
      + '.mapj svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linejoin:round}'
      + '.mapj:hover{background:#F0F5FF}.mapj:focus-visible{outline:3px solid rgba(67,56,202,.35);outline-offset:2px}'
      + '.mapj-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 0}'
      + '.mapj-b{display:flex;flex-direction:column;align-items:stretch;gap:8px;margin:16px 0;padding:14px 16px;border:1px solid #DCE5F7;border-radius:16px;background:#F5F8FF}'
      + '.mapj-b p{margin:0;font-size:15px;font-weight:700;color:#191F28;line-height:1.5;word-break:keep-all}'
      + '.mapj-b .mapj{justify-content:center;min-height:50px;border-radius:14px;background:#4338CA;color:#fff;border-color:#4338CA;font-size:16px}'
      + '.mapj-b .mapj:hover{background:#3730A3}';
    document.head.appendChild(st);
  }
  /** 버튼 HTML. where = 'top'(결과 위쪽, 작은 버튼) | 'bottom'(맨 아래, 화면 폭 버튼 + 한 줄) · line = 아래 버튼 위 한 줄 */
  function btn(o, where, line, track) {
    css();
    var a = '<a class="mapj" href="' + esc(url(o)) + '" data-track="' + esc(track || 'to_map') + '" data-mapj="' + esc(where || 'top') + '">' + PIN + '지도에서 보기</a>';
    if (where !== 'bottom') return a;
    return '<div class="mapj-b"><p>' + esc(line || '이 단지 주변을 지도에서 확인해 보세요') + '</p>' + a + '</div>';
  }

  /* 돌아왔을 때 같은 자리: 버튼을 누를 때 이 화면 주소·스크롤 위치를 이 탭(sessionStorage)에 적어 두고,
     결과를 다시 그린 화면이 restore() 를 부르면 같은 주소일 때만 한 번 그 자리로 스크롤 */
  var SK = 'jdj_mapj_back';
  if (typeof document !== 'undefined') document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a.mapj'); if (!a) return;
    try { sessionStorage.setItem(SK, JSON.stringify({ u: location.href, y: Math.round(window.scrollY || 0), t: Date.now() })); } catch (x) {}
    if (window.jdjStat) window.jdjStat('feature_use', { feature: 'to_map' });
  }, true);
  function restore() {
    var v = null; try { v = JSON.parse(sessionStorage.getItem(SK) || 'null'); } catch (x) {}
    if (!v || v.u !== location.href || Date.now() - v.t > 1800000) return false;
    try { sessionStorage.removeItem(SK); } catch (x) {}
    requestAnimationFrame(function () { window.scrollTo(0, v.y); });
    return true;
  }

  var API = { url: url, parse: parse, back: back, here: here, backHref: backHref, btn: btn, css: css, fitZoom: fitZoom, railText: railText, restore: restore, KIND: KIND };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_MAPJ = API;
})(typeof window !== 'undefined' ? window : globalThis);
