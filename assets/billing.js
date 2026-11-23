/* 토스 자동결제(빌링) 카드 등록 창 열기 — 동네 파트너(dongne/)·모닝 브리핑(brief/manage/)이 함께 써요. window.JDJ_BILL
   서버(tools/agent-backend.gs v50)가 BILLING_OPEN·PAID_OPEN 이 모두 켜졌을 때만 고객키(customerKey)와 화면 키(clientKey)를 줘요. 잠겨 있으면 이 파일은 쓰이지 않아요.
   흐름: TossPayments(clientKey).payment({ customerKey }).requestBillingAuth({ method: 'CARD', successUrl, failUrl }) — 0원 카드 인증
        → 돌아온 주소 ?bill=ok&authKey=…&customerKey=… → 화면이 서버에 authKey 를 보내 빌링키를 받게 함(빌링키는 서버에만 저장). */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var SDK = 'https://js.tosspayments.com/v2/standard', sdkP = null;
  function sdk() {
    if (root.TossPayments) return Promise.resolve(root.TossPayments);
    if (!sdkP) sdkP = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = SDK; s.onload = function () { ok(root.TossPayments); }; s.onerror = function () { sdkP = null; no(new Error('결제 창을 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.')); }; document.head.appendChild(s); });
    return sdkP;
  }
  /** 카드 등록 창 열기. back = 돌아올 화면 경로(예: 'dongne/my/') */
  function cardAuth(customerKey, clientKey, back, opt) {
    opt = opt || {};
    if (!customerKey || !clientKey) return Promise.reject(new Error('정식 자동 결제는 아직 열리지 않았어요.'));
    var base = location.origin + JB.SITE + back;
    return sdk().then(function (TP) {
      return TP(clientKey).payment({ customerKey: customerKey }).requestBillingAuth({ method: 'CARD', successUrl: base + '?bill=ok', failUrl: base + '?bill=fail',
        customerEmail: opt.email || undefined, customerName: opt.name || undefined });
    });
  }
  /** 돌아온 주소 읽기: { ok, authKey, customerKey, msg } 또는 null. 읽은 뒤 주소에서 지움(새로 고침에 다시 안 보내게) */
  function back() {
    if (typeof location === 'undefined') return null;
    var q = new URLSearchParams(location.search), b = q.get('bill'); if (!b) return null;
    var r = b === 'ok' ? { ok: true, authKey: q.get('authKey') || '', customerKey: q.get('customerKey') || '' } : { ok: false, msg: q.get('message') || '카드 등록을 마치지 못했어요.' };
    ['bill', 'authKey', 'customerKey', 'code', 'message'].forEach(function (k) { q.delete(k); });
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
    return r;
  }
  var api = { cardAuth: cardAuth, back: back };
  root.JDJ_BILL = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
