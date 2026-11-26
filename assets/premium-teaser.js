/* 유료 기능 미리 보기 칸 — 모든 화면이 같은 모양으로 씀 (무료·유료 기준: 엔진 docs/pricing_policy.md, 대표 승인 2026-11-26)
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
  var CSS = '.jpt{margin:14px 0 4px;border:1px solid #E5E8EB;border-radius:14px;padding:14px 16px;background:#FAFBFC}'
    + '.jpt-h{font-size:14.5px;font-weight:800;color:#191F28;display:flex;align-items:center;gap:6px;flex-wrap:wrap}'
    + '.jpt-tag{font-size:12px;font-weight:800;color:#4338CA;background:#EEF0FF;border-radius:6px;padding:1px 7px}'
    + '.jpt-p{margin:8px 0 0;font-size:14px;line-height:1.6;color:#3E4754;word-break:keep-all}'
    + '.jpt-k{display:inline-block;font-size:12px;font-weight:800;color:#6B7684;border:1px solid #D1D6DB;border-radius:6px;padding:0 6px;margin-right:6px;vertical-align:1px}'
    + '.jpt-d{margin:6px 0 0;font-size:13px;color:#6B7684;line-height:1.55;word-break:keep-all}'
    + '.jpt-go{display:inline-flex;align-items:center;min-height:44px;margin-top:10px;padding:0 16px;border-radius:12px;background:#4338CA;color:#fff!important;font-size:14.5px;font-weight:800;text-decoration:none}'
    + '.jpt-go:focus-visible{outline:3px solid #191F28;outline-offset:2px}'
    + '.jpt-soon{display:block;margin-top:6px;font-size:12.5px;color:#6B7684}'
    + '@media print{.jpt{display:none}}';
  function style() {
    if (typeof document === 'undefined' || document.getElementById('jptCss')) return;
    var s = document.createElement('style'); s.id = 'jptCss'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }
  /** o = { name, preview(실제 자료 문장), desc(담긴 내용 한 줄), href, key, track, cls }  → HTML */
  function html(o) {
    o = o || {}; style();
    var pv = first(o.preview), url = o.href || href(o.key);
    return '<div class="jpt' + (o.cls ? ' ' + esc(o.cls) : '') + '">'
      + '<div class="jpt-h">' + esc(o.name || '미래가치 상세 리포트') + ' <span class="jpt-tag">유료</span></div>'
      + (pv ? '<p class="jpt-p"><span class="jpt-k">미리 보기</span>' + esc(pv) + '</p>' : '')
      + (o.desc ? '<p class="jpt-d">' + esc(o.desc) + '</p>' : '')
      + '<a class="jpt-go" href="' + esc(url) + '"' + (o.track ? ' data-track="' + esc(o.track) + '"' : '') + '>자세히 보기 (유료)</a>'
      + (soon() ? '<span class="jpt-soon">결제는 곧 열려요. 위 미리 보기와 무료 기능은 지금 그대로 쓸 수 있어요.</span>' : '')
      + '</div>';
  }
  root.JDJ_TEASER = { html: html, href: href, soon: soon, first: first, style: style, CSS: CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.JDJ_TEASER;
})(typeof window !== 'undefined' ? window : globalThis);
