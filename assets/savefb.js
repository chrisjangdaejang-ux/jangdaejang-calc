/* 저장·보내기 버튼 공통 반응(window.JDJ_SAVEFB)
   누른 버튼 바로 옆에서 결과가 보이게 한다 — 맨 위에만 안내가 떠서 '저장이 안 됐나?' 헷갈리지 않게.
   - busy(btn)          : 버튼 글자 '저장 중…' + 누를 수 없게
   - ok(btn, 글, 옵션)   : 버튼 '✓ 저장했어요'(초록) 2.5초 → 원래 글자, 버튼 바로 아래에 초록 안내, 화면 밖이면 그 자리로만 살짝 스크롤
   - err(btn, 글, 옵션)  : 버튼 원래대로, 바로 아래에 빨간 안내(role=alert)
   - run(btn, 할 일, 옵션): busy → 할 일(Promise) → ok / err
   옵션: msg(이미 있는 안내 칸 — 있으면 그 칸에 씀), after(안내 칸을 넣을 자리), next(✓ 뒤에 바뀔 버튼 글자), busy/done(버튼 글자), toast(false면 휴대폰 토스트 안 띄움),
         html(true면 글을 HTML로 넣음 — 이미 esc 한 글만), cls(이미 있는 안내 칸의 기본 class, 기본 'msg')
   버튼이 다시 그려져도 되게 btn 자리에 id 글자도 받는다. 백엔드 호출은 건드리지 않는다. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.JDJ_SAVEFB) return;
  var D = document, OK_MS = 2500, TOAST_MS = 3200, MOBILE = 640;
  var CSS = '.sf-ok{background:#0E7A4F!important;border-color:#0E7A4F!important;color:#fff!important}'
    + '.sf-msg{display:block;margin:8px 0 0;padding:10px 12px;border-radius:10px;font-size:14.5px;line-height:1.55;font-weight:600;text-align:left}'
    + '.sf-msg.sf-g{background:#E7F6EE;color:#0B5A3B;border:1px solid #B5E2C8}'
    + '.sf-msg.sf-r{background:#FDECEC;color:#B42318;border:1px solid #F5C2C0}'
    + '.sf-msg[hidden]{display:none}.sf-tx-g{color:#0E7A4F}.sf-tx-r{color:#B42318}'
    + '.sf-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:9999;max-width:min(92vw,440px);'
    + 'background:#191F28;color:#fff;border-radius:12px;padding:12px 16px;font-size:14.5px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.2);pointer-events:none}'
    + '.sf-toast.sf-r{background:#B42318}'
    + '@media (min-width:' + (MOBILE + 1) + 'px){.sf-toast:not(.sf-all){display:none}}'
    + '@media (prefers-reduced-motion:no-preference){.sf-msg,.sf-toast{animation:sfIn .18s ease-out}@keyframes sfIn{from{opacity:0;transform:translate(var(--sfx,0),4px)}to{opacity:1;transform:translate(var(--sfx,0),0)}}.sf-toast{--sfx:-50%}}';
  function css() { if (D.getElementById('sfCss')) return; var s = D.createElement('style'); s.id = 'sfCss'; s.textContent = CSS; (D.head || D.documentElement).appendChild(s); }
  function el(b) { return typeof b === 'string' ? D.getElementById(b) : b || null; }
  function label(b) { if (b.dataset.sfLabel == null) b.dataset.sfLabel = b.innerHTML; return b.dataset.sfLabel; }
  function restore(b) {
    clearTimeout(b._sfT); b.classList.remove('sf-ok'); b.removeAttribute('aria-busy');
    if (b.dataset.sfLabel != null) { b.innerHTML = b.dataset.sfLabel; delete b.dataset.sfLabel; }
    b.disabled = false;
  }
  function busy(b, t) {
    b = el(b); if (!b) return; css(); clearTimeout(b._sfT); b.classList.remove('sf-ok');
    label(b); b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = t || '저장 중…';
  }
  /* 안내 칸: 이미 있는 칸(opt.msg) → 없으면 버튼 줄(버튼이 나란히 있는 칸이면 그 줄) 바로 아래에 하나 만들어 계속 씀 */
  function box(b, opt) {
    var m = el(opt.msg); if (m) return m;
    var at = el(opt.after);
    if (!b && !at) return null;
    if (b && b._sfBox && b._sfBox.isConnected) return b._sfBox;
    var p = b && b.parentElement;
    if (!at) at = p && p !== D.body && /flex|grid/.test(getComputedStyle(p).display) && p.children.length > 1 && !p.matches('form') ? p : b;
    var nx = at.nextElementSibling;
    if (nx && nx.classList.contains('sf-msg')) m = nx;
    else { m = D.createElement('div'); m.className = 'sf-msg'; at.insertAdjacentElement('afterend', m); }
    if (b) b._sfBox = m; return m;
  }
  function put(m, t, bad, opt) {
    if (!m) return;
    if (m.classList.contains('sf-msg')) m.className = 'sf-msg ' + (bad ? 'sf-r' : 'sf-g');
    else { m.className = (opt.cls || 'msg') + ' ' + (bad ? 'err sf-tx-r' : 'ok sf-tx-g'); m.style.color = ''; }
    m.setAttribute('role', bad ? 'alert' : 'status'); m.setAttribute('aria-live', bad ? 'assertive' : 'polite');
    if (opt.html) m.innerHTML = t; else m.textContent = t;
    m.hidden = false; if (m.style.display === 'none') m.style.display = '';
  }
  /* 화면 밖일 때만, 그 자리로만 살짝(맨 위로 튀지 않게) */
  function reveal(x) {
    if (!x || !x.getBoundingClientRect) return;
    var r = x.getBoundingClientRect(), h = window.innerHeight || D.documentElement.clientHeight;
    if (r.top >= 60 && r.bottom <= h - 90) return;
    try { x.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { x.scrollIntoView(false); }
  }
  var tEl = null, tT = 0;
  /* 휴대폰(폭 640px 이하)에서만 — all 이 참이면 PC에서도(누른 버튼이 다시 그려져 사라졌을 때) */
  function toast(t, bad, all) {
    if (!all && (window.innerWidth || 9999) > MOBILE) return; css();
    if (!tEl || !tEl.isConnected) { tEl = D.createElement('div'); tEl.className = 'sf-toast'; tEl.setAttribute('aria-hidden', 'true'); D.body.appendChild(tEl); }
    tEl.className = 'sf-toast' + (bad ? ' sf-r' : '') + (all ? ' sf-all' : ''); tEl.textContent = t; tEl.hidden = false;
    clearTimeout(tT); tT = setTimeout(function () { tEl.hidden = true; }, TOAST_MS);
  }
  function plain(t, opt) { if (!opt.html) return String(t); var d = D.createElement('div'); d.innerHTML = t; return d.textContent; }
  function ok(b, t, opt) {
    opt = opt || {}; b = el(b); css();
    if (b) {
      var lb = opt.next != null ? opt.next : label(b); b.disabled = false; b.removeAttribute('aria-busy');
      b.textContent = opt.done || '✓ 저장했어요'; b.classList.add('sf-ok'); clearTimeout(b._sfT);
      b._sfT = setTimeout(function () { b.classList.remove('sf-ok'); b.innerHTML = lb; delete b.dataset.sfLabel; }, OK_MS);
    }
    var m = t ? box(b, opt) : null; if (m) put(m, t, false, opt);
    reveal(m || b);
    if (opt.toast !== false) toast(t ? plain(t, opt) : (opt.done || '✓ 저장했어요'), false);
    return m;
  }
  function err(b, t, opt) {
    opt = opt || {}; b = el(b); css();
    if (b) restore(b);
    t = t || '저장하지 못했어요. 잠시 뒤 다시 해 주세요.';
    var m = box(b, opt); put(m, t, true, opt); reveal(m || b);
    if (opt.toast !== false) toast(plain(t, opt), true);
    return m;
  }
  function hide(b, opt) { var m = el((opt || {}).msg) || ((b = el(b)) && b._sfBox); if (m) m.hidden = true; }
  async function run(b, fn, opt) {
    opt = opt || {}; busy(b, opt.busy);
    try { var v = await fn(); ok(opt.again ? opt.again() : b, typeof opt.ok === 'function' ? opt.ok(v) : opt.ok, opt); return v; }
    catch (e) { err(opt.again ? opt.again() : b, (e && e.message) || opt.fail, opt); return undefined; }
  }
  window.JDJ_SAVEFB = { busy: busy, ok: ok, err: err, run: run, hide: hide, toast: toast, reveal: reveal, restore: function (b) { b = el(b); if (b) restore(b); } };
})();
