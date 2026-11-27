/* 유료 기능 미리 보기 칸('유료로 보면' 표준 칸) — 모든 화면이 같은 모양으로 씀. 내용은 assets/products.js(상품 안내 한 곳)에서 읽어요(2026-11-27) (무료·유료 기준: 엔진 docs/pricing_policy.md, 대표 승인 2026-11-26)
   - 유료는 핵심만: ① 미래가치 상세 리포트 ② 건축 가능 규모·수익 계산 상세(준비 중) ③ 중개사 플러스 ④ 모닝 브리핑·카톡 예보 구독 ⑤ AI 비서 고급(준비 중)
   - 모양: 이름 + '유료' 표시 → 실제 자료 한 줄 미리 보기(없으면 줄 자체를 빼요. 지어낸 문장 금지) → '자세히 보기 (유료)' 단추
   - 자물쇠 그림·흐림 처리는 쓰지 않아요.
   - 결제가 닫혀 있을 때(assets/config.js PAID_OPEN=false)도 같은 칸을 보여 주고, 심사용 결제(PAY_REVIEW)가 아니면 '결제는 곧 열려요'를 덧붙여요.
     단추는 언제나 기존 상품 안내(premium/)로 가요 — 결제 열림·심사 상태는 그 화면이 그대로 처리. */
(function (root) {
  var W = root;
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  function site() { return JB.SITE; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cfg() { return W.JDJ_SITE || {}; }
  /** 결제가 닫혀 있고 심사용 결제도 아님 → '곧 열려요' */
  function soon() { var c = cfg(); return c.PAID_OPEN !== true && c.PAY_REVIEW !== true; }
  /** 단지 리포트 주소: 단지 키가 있으면 그 단지를 골라 둔 상품 안내, 없으면 상품 안내 첫 화면 */
  function href(key) { return site() + 'premium/' + (key ? '?p=single&k=' + encodeURIComponent(key) : ''); }
  /** 실제 문장에서 첫 문장만(미리 보기 한 줄) */
  function first(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim(); if (!s) return '';
    var m = s.match(/^.*?(?:요\.|다\.|[.!?])(?=\s|$)/); return m ? m[0] : s;
  }
  /** 상품 안내 한 곳(assets/products.js)을 읽어 '유료로 보면' 표준 칸을 그려요 — 담긴 내용·빠진 것·받는 방식·기간·환불·예시 보기가 모든 화면에서 같아요.
      node 검사에서는 같은 폴더의 products.js 를 불러와요. */
  function cat() {
    if (!W.JDJ_PRODUCTS && typeof require === 'function') { try { require('./products.js'); } catch (e) {} }
    return W.JDJ_PRODUCTS || null;
  }
  function style() { var C = cat(); if (C) C.style(); }
  /** o = { product(상품 키, 기본 single), preview(실제 자료 문장 또는 [{k,t}]), desc(이 화면 한 줄), href, key(단지 키), track, cls } → HTML */
  function html(o) {
    o = o || {}; var C = cat(); if (!C) return '';
    var id = o.product || 'single';
    return C.box(id, { preview: o.preview, desc: o.desc, href: o.href || (id === 'single' || id === 'pack' ? href(o.key) : ''), track: o.track, cls: o.cls });
  }
  root.JDJ_TEASER = { html: html, href: href, soon: soon, first: first, style: style, get CSS() { var C = cat(); return C ? C.CSS : ''; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JDJ_TEASER;
})(typeof window !== 'undefined' ? window : globalThis);
