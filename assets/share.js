/* 집예보 공용 공유 모듈 (청약·맞춤 리포트·내 집 시세·갈아타기·전월세·전세사기 체크리스트·세금·빌라)
   - 개인 금융값(연소득·현금·대출 원리금·이름·기타 비용)은 주소에 싣지 않고 이 기기(localStorage)에만 둡니다.
   - 결과 화면 공유 3곳: 상단 공유 아이콘(header.top) · 결과 중간 카드 · 결과 아래 단추.
     페이지는 JDJ_SHARE.setup({tool}) 한 번, 결과가 나올 때마다 JDJ_SHARE.update(요약, {root, after}) 를 부릅니다.
   - 요약(head·lines)에는 결과의 '모양'만 담습니다: 개인 금융값·가점 숫자·매수가 같은 내 숫자는 넣지 않습니다.
     (마지막 안전장치로 금액·'N점'이 들어간 문장은 버립니다. allowNum 은 단지 공개 정보만 쓰는 화면에서만.)
   - 공유: 요약 카드 이미지(1080×1080, canvas)를 미리 만들어 두고, Web Share API 파일 공유가 되면 이미지째,
     안 되면 링크를 복사하고 '복사됐어요'를 알려 드립니다(카드 이미지는 따로 저장 가능).
   - 통계(assets/stat.js): share_click {tool, place, method} · 공유 링크 유입은 주소의 utm_source=share → share_visit {tool}. */
(function (root) {
  'use strict';
  var KEY = 'jdj_fin';
  var PERSONAL = ['i', 'c', 'd', 'n', 'e', 'bp', 'bd'];   // 주소에 실으면 안 되는 개인값(연소득·현금·대출·이름·기타 비용·매수가·매수 시기)
  var SITE = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/';
  /* 화면별 이름·중간 카드 문구·'나도 해 보기' 주소 */
  var TOOLS = {
    chungyak:  { easy: '청약이 쉬워지는 집예보', label: '청약 당첨 가능성 진단', path: 'chungyak/', try: '내 가점으로 나도 해 보기' },
    report:    { easy: '내 집 마련이 쉬워지는 집예보', label: '내 집 마련 맞춤 리포트', path: 'buy/', try: '내 조건으로 나도 해 보기' },
    mine:      { easy: '내 집 시세 확인이 쉬워지는 집예보', label: '내 집 시세', path: 'mine/', try: '우리 집 시세도 확인해 보기' },
    switch:    { easy: '갈아타기 계산이 쉬워지는 집예보', label: '갈아타기 계산', path: 'switch/', try: '내 집으로 나도 해 보기' },
    jeonse:    { easy: '전월세 판단이 쉬워지는 집예보', label: '전월세 시세·위험 체크', path: 'jeonse/', try: '우리 집 전세도 확인해 보기' },
    checklist: { easy: '전세 계약 점검이 쉬워지는 집예보', label: '전세사기 예방 체크리스트', path: 'jeonse/checklist/', try: '내 계약도 점검해 보기' },
    tax:       { easy: '부동산 세금 계산이 쉬워지는 집예보', label: '부동산 세금 계산', path: 'tax/', try: '내 세금도 계산해 보기' },
    villa:     { easy: '재개발 빌라 확인이 쉬워지는 집예보', label: '재개발·빌라 체크', path: 'villa/', try: '관심 빌라도 확인해 보기' }
  };
  var PLACES = ['top', 'mid', 'bottom'];

  /* ---------- 개인값 보관 (예전 기능 그대로) ---------- */
  var FIN_KEYS = ['i', 'c', 'd', 'n', 'e'];
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
  /* 주소 문자열에 개인 금융값(i·c·d·n·e)이 있는지 */
  function hasPersonal(search) {
    var q = new URLSearchParams(search || '');
    return FIN_KEYS.some(function (k) { return q.has(k); });
  }
  function stripPersonal(search) {
    var q = new URLSearchParams(search || '');
    FIN_KEYS.forEach(function (k) { q.delete(k); });
    var s = q.toString();
    return s ? '?' + s : '';
  }

  /* ---------- 공유 주소 ---------- */
  function siteBase() {
    try {
      var l = root.location;
      if (l && /^https?:$/.test(l.protocol) && l.pathname.indexOf('/jangdaejang-calc/') === 0) return l.origin + '/jangdaejang-calc/';
    } catch (e) {}
    return SITE;
  }
  /* 공유 링크: 화면 주소 + 공개 값(params, 개인값·utm 은 버림) + utm(유입 집계용, 개인정보 없음) */
  function link(tool, o) {
    o = o || {};
    var t = TOOLS[tool] || {};
    var u = new URL(o.path || t.path || '', siteBase());
    var src = o.params || {};
    Object.keys(src).forEach(function (k) {
      if (PERSONAL.indexOf(k) >= 0 || /^utm_/.test(k)) return;
      var v = src[k]; if (v != null && v !== '') u.searchParams.set(k, String(v));
    });
    u.searchParams.set('utm_source', 'share');
    u.searchParams.set('utm_medium', 'user_share');
    u.searchParams.set('utm_campaign', TOOLS[tool] ? tool : 'home');
    if (o.hash) u.hash = o.hash;
    return u.href;
  }
  /* 지금 주소에서 공개 값만 골라 담기 */
  function pick(keys) {
    var out = {};
    try { var q = new URLSearchParams(root.location.search); (keys || []).forEach(function (k) { if (q.get(k)) out[k] = q.get(k); }); } catch (e) {}
    return out;
  }
  /* 금액(억·만원·원)·'N점'이 들어간 문장은 버림 — 내 숫자가 새지 않게 마지막으로 거르는 장치 */
  var MONEY = /\d[\d,.]*\s*(억|만\s*원|만원|천만|원)|\d+\s*점/;
  function safeLine(s) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s && !MONEY.test(s) ? s : ''; }
  function safeSummary(s) {
    s = s || {};
    var f = s.allowNum ? function (x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim(); } : safeLine;
    return { head: f(s.head), lines: (s.lines || []).map(f).filter(Boolean).slice(0, 3), params: s.params || {}, path: s.path, hash: s.hash };
  }

  /* ---------- 링크만 공유(예전 방식, 다른 화면 호환) ---------- */
  function copyText(full) {
    var nav = root.navigator || {};
    function fallback() {
      try {
        var ta = root.document.createElement('textarea'); ta.value = full; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; root.document.body.appendChild(ta); ta.select();
        var ok = root.document.execCommand('copy'); ta.remove(); return ok ? 'copy' : 'fail';
      } catch (e) { return 'fail'; }
    }
    if (nav.clipboard && nav.clipboard.writeText) return nav.clipboard.writeText(full).then(function () { return 'copy'; }, fallback);
    return Promise.resolve(fallback());
  }
  function share(opt) {
    opt = opt || {};
    var url = opt.url || root.location.href, title = opt.title || root.document.title, text = opt.text || '';
    var nav = root.navigator || {};
    var copy = function () { return copyText((text ? text + '\n' : '') + url); };
    if (nav.share) {
      return nav.share({ title: title, text: text, url: url }).then(function () { return 'share'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        return copy();
      });
    }
    return copy();
  }
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
      });
    });
  }

  /* ---------- 요약 카드 이미지 (1080×1080) ---------- */
  function wrap(ctx, text, maxW, maxLines) {
    var lines = [], cur = '';
    String(text).split(' ').forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) { lines.push(cur); cur = ''; }
      if (ctx.measureText(w).width <= maxW) { cur = w; return; }
      var part = '';
      for (var i = 0; i < w.length; i++) { if (ctx.measureText(part + w[i]).width > maxW) { lines.push(part); part = ''; } part += w[i]; }
      cur = part;
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'; }
    return lines;
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function logo(ctx, x, y, s) {   // 헤더의 금색 집+해 아이콘(24 단위)을 s 배로
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#B8942A'; rrect(ctx, 0, 0, 24, 24, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(5, 12.5); ctx.lineTo(12, 6.5); ctx.lineTo(19, 12.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7.5, 11); ctx.lineTo(7.5, 18); ctx.lineTo(16.5, 18); ctx.lineTo(16.5, 11); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(18.2, 5.8, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function fontFam() {
    try { return root.getComputedStyle(root.document.body).fontFamily || 'sans-serif'; } catch (e) { return "'Noto Sans KR', sans-serif"; }
  }
  function drawCard(tool, sum, url) {
    var t = TOOLS[tool] || { label: '집예보', try: '나도 해 보기' };
    var c = root.document.createElement('canvas'); c.width = 1080; c.height = 1080;
    var ctx = c.getContext('2d'), F = fontFam();
    ctx.fillStyle = '#F7F4EC'; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#FFFFFF'; rrect(ctx, 60, 60, 960, 960, 44); ctx.fill();
    /* 머리: 로고 + 집예보 + 화면 이름 */
    logo(ctx, 112, 112, 3.4);
    ctx.textBaseline = 'middle'; ctx.fillStyle = '#191F28'; ctx.font = '900 60px ' + F; ctx.fillText('집예보', 214, 154);
    ctx.font = '700 30px ' + F; var lw = ctx.measureText(t.label).width + 44;
    ctx.fillStyle = '#FBF5E3'; rrect(ctx, 968 - lw, 126, lw, 58, 29); ctx.fill();
    ctx.fillStyle = '#8A6D16'; ctx.textAlign = 'center'; ctx.fillText(t.label, 968 - lw / 2, 156); ctx.textAlign = 'left';
    /* 한 줄 요약 */
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#B8942A'; ctx.fillRect(112, 262, 72, 8);
    ctx.fillStyle = '#191F28'; ctx.font = '900 66px ' + F;
    var y = 362;
    wrap(ctx, sum.head || t.label, 856, 4).forEach(function (l) { ctx.fillText(l, 112, y); y += 86; });
    /* 근거 몇 줄 */
    y += 14; ctx.font = '700 34px ' + F;
    (sum.lines || []).slice(0, 3).forEach(function (l) {
      var ls = wrap(ctx, l, 770, 2), h = 40 + ls.length * 46;
      if (y + h > 846) return;
      ctx.fillStyle = '#F2F4F6'; rrect(ctx, 112, y, 856, h, 22); ctx.fill();
      ctx.fillStyle = '#B8942A'; ctx.beginPath(); ctx.arc(148, y + 43, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333D4B'; ls.forEach(function (s, i) { ctx.fillText(s, 174, y + 55 + i * 46); });
      y += h + 16;
    });
    /* 바닥: 나도 해 보기 + 주소 */
    ctx.fillStyle = '#191F28'; rrect(ctx, 60, 870, 960, 150, 44); ctx.fill(); ctx.fillRect(60, 870, 960, 50);
    ctx.fillStyle = '#FFFFFF'; ctx.font = '900 40px ' + F; ctx.fillText(t.try + ' →', 112, 940);
    ctx.fillStyle = '#E8D9A8'; ctx.font = '500 26px ' + F;
    ctx.fillText(String(url || '').replace(/^https?:\/\//, '').replace(/[?#].*$/, ''), 112, 984);
    return c;
  }
  function cardBlob(tool, sum, url) {
    return new Promise(function (res) {
      try { drawCard(tool, sum, url).toBlob(function (b) { res(b || null); }, 'image/png'); } catch (e) { res(null); }
    });
  }

  /* ---------- 화면에 단추 붙이기 ---------- */
  var ST = { tool: '', sum: null, blob: null, blobKey: '', url: '', bound: false };
  var CSS = '.jshare-top{font:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:0 12px;border:0;border-radius:10px;background:var(--gray,#F2F4F6);color:var(--sub,#3E4754);font-size:15px;font-weight:700;cursor:pointer}'
    + '.jshare-top svg{width:20px;height:20px;flex:none}.jshare-top[hidden]{display:none!important}.jshare-tg{display:flex;align-items:center;gap:8px}'
    + '.jshare-card{display:flex;align-items:center;gap:14px;margin:16px 0;padding:16px 18px;border-radius:16px;background:#FBF5E3;border:1px solid #EFE2B8;text-align:left}'
    + '.jshare-card .ic{flex:none;width:40px;height:40px;border-radius:12px;background:#B8942A;color:#fff;display:flex;align-items:center;justify-content:center}'
    + '.jshare-card .ic svg{width:22px;height:22px}'
    + '.jshare-card .tx{flex:1;min-width:0;font-size:14.5px;line-height:1.5;color:#3E4754}.jshare-card .tx b{display:block;font-size:16px;color:#191F28;margin-bottom:2px}'
    + '.jshare-card .btn{flex:none;min-height:44px;padding:0 18px;font-size:15px;background:#191F28;color:#fff}'
    + '@media(max-width:480px){.jshare-card{flex-wrap:wrap}.jshare-card .tx{flex-basis:calc(100% - 54px)}.jshare-card .btn{width:100%}}'
    + '.jshare-bottom{display:flex;flex-direction:column;align-items:stretch;gap:6px;margin:18px 0}'
    + '.jshare-bottom .btn{width:100%;min-height:52px;font-size:16px;background:var(--blue,#2F6BFF);color:#fff}.jshare-bottom .btn svg{width:20px;height:20px}'
    + '.jshare-bottom small{text-align:center;color:var(--sub2,#4E5968);font-size:13.5px}'
    + '.jshare-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1000;width:max-content;max-width:min(92vw,460px);background:#191F28;color:#fff;border-radius:14px;padding:14px 16px;font-size:15px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,.2);display:flex;gap:12px;align-items:center}'
    + '.jshare-toast[hidden]{display:none}.jshare-toast a{color:#E8D9A8;font-weight:700;white-space:nowrap}'
    + '@media print{.jshare-top,.jshare-card,.jshare-bottom,.jshare-toast{display:none!important}}';
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function cardHTML() {
    var t = TOOLS[ST.tool] || {};
    return '<div class="jshare-card noprint" data-jshare-box="mid"><span class="ic">' + ICON + '</span>'
      + '<div class="tx"><b>' + esc(t.easy || '집예보') + ', 다른 분들께도 알려주세요</b>내 금액·점수는 빼고 결과 요약과 링크만 보내요.</div>'
      + '<button type="button" class="btn" data-jshare="mid">공유하기</button></div>';
  }
  function bottomHTML() {
    return '<div class="jshare-bottom noprint" data-jshare-box="bottom"><button type="button" class="btn" data-jshare="bottom">' + ICON + ' 결과 요약 공유하기</button>'
      + '<small>받는 분은 링크를 눌러 바로 자기 조건으로 해 볼 수 있어요.</small></div>';
  }
  function topBtn() {
    var d = root.document, h = d.querySelector('header.top');
    if (!h) return null;
    var b = h.querySelector('.jshare-top');
    if (!b) {
      b = d.createElement('button'); b.type = 'button'; b.className = 'jshare-top'; b.setAttribute('data-jshare', 'top');
      b.setAttribute('aria-label', '결과 요약 공유하기'); b.innerHTML = ICON + '<span>공유</span>'; b.hidden = true;
      var side = h.querySelector('.badge, .topbtn');
      if (side) { var g = d.createElement('div'); g.className = 'jshare-tg'; side.parentNode.insertBefore(g, side); g.appendChild(side); g.appendChild(b); }
      else h.appendChild(b);
    }
    return b;
  }
  function boxes() { return [].slice.call(root.document.querySelectorAll('[data-jshare-box]')); }
  /* root 안에 중간 카드(after 뒤, 없으면 가운데 자식 뒤)와 아래 단추(bottomIn 또는 root 맨 끝)를 한 번씩만 */
  function place(o) {
    var d = root.document; o = o || {};
    var r = typeof o.root === 'string' ? d.querySelector(o.root) : o.root;
    if (!r) return;
    boxes().forEach(function (n) { n.remove(); });
    var after = typeof o.after === 'string' ? d.querySelector(o.after) : o.after;
    if (!after && o.mid !== false) {
      var kids = [].slice.call(r.children).filter(function (n) { return !n.hidden && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE'; });
      if (kids.length >= 2) after = kids[Math.max(0, Math.ceil(kids.length / 2) - 1)];
    }
    if (after && o.mid !== false) after.insertAdjacentHTML('afterend', cardHTML());
    if (o.bottom !== false) {
      var b = typeof o.bottomIn === 'string' ? d.querySelector(o.bottomIn) : (o.bottomIn || r);
      if (o.bottomAfter) { var ba = typeof o.bottomAfter === 'string' ? d.querySelector(o.bottomAfter) : o.bottomAfter; if (ba) { ba.insertAdjacentHTML('afterend', bottomHTML()); return; } }
      b.insertAdjacentHTML('beforeend', bottomHTML());
    }
  }
  function prepBlob() {
    var s = ST.sum; if (!s || !root.document) return;
    var key = JSON.stringify([ST.tool, s.head, s.lines, ST.url]);
    if (key === ST.blobKey) return;
    ST.blobKey = key; ST.blob = null;
    var go = function () { cardBlob(ST.tool, s, ST.url).then(function (b) { if (ST.blobKey === key) ST.blob = b; }); };
    if (root.requestIdleCallback) root.requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 200);
  }
  /* 결과가 나올 때마다: 요약을 바꾸고(이미지 미리 만들기) 단추를 붙임 */
  function update(sum, o) {
    if (!ST.tool) return;
    ST.sum = safeSummary(sum);
    ST.url = link(ST.tool, { params: ST.sum.params, path: ST.sum.path, hash: ST.sum.hash });
    var b = topBtn(); if (b) b.hidden = false;
    if (o) place(o);
    prepBlob();
  }
  /* 결과가 사라질 때(다시 입력 등) */
  function clear() {
    ST.sum = null; var b = topBtn(); if (b) b.hidden = true;
    boxes().forEach(function (n) { n.remove(); });
  }

  var toastT = null, lastObj = null;
  function toast(html) {
    var d = root.document, el = d.getElementById('jshareToast');
    if (!el) { el = d.createElement('div'); el.id = 'jshareToast'; el.className = 'jshare-toast'; el.setAttribute('role', 'status'); d.body.appendChild(el); }
    el.innerHTML = html; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 6000);
    return el;
  }
  function stat(place, method) {
    if (root.jdjStat) try { root.jdjStat('share_click', { tool: ST.tool, place: place, method: method }); } catch (e) {}
  }
  function shareText() {
    var t = TOOLS[ST.tool] || {}, s = ST.sum || { head: '' };
    return (s.head ? s.head + '\n' : '') + (t.easy ? t.easy + ' · ' : '') + (t.try || '나도 해 보기') + '\n' + ST.url;
  }
  function copyAndTell(place, text) {
    return copyText(text).then(function (r) {
      if (r === 'copy') {
        stat(place, 'copy');
        var el = toast('<span>링크가 복사됐어요. 카카오톡·문자에 붙여 넣어 보내 보세요.</span>' + (ST.blob ? '<a href="#" data-jshare-save>카드 이미지 저장</a>' : ''));
        var a = el.querySelector('[data-jshare-save]');
        if (a) a.onclick = function (e) { e.preventDefault(); saveImage(); };
      } else toast('<span>복사가 안 됐어요. 주소창의 링크를 길게 눌러 복사해 주세요.</span>');
      return r;
    });
  }
  function run(place) {
    if (!ST.sum) return Promise.resolve('none');
    var nav = root.navigator || {}, text = shareText(), title = '집예보 · ' + ((TOOLS[ST.tool] || {}).label || '');
    var file = null, canFile = false;
    try { if (ST.blob && root.File) file = new root.File([ST.blob], 'jibyebo-' + ST.tool + '.png', { type: 'image/png' }); } catch (e) { file = null; }
    try { canFile = !!(file && nav.share && nav.canShare && nav.canShare({ files: [file] })); } catch (e) { canFile = false; }
    if (canFile) {
      return nav.share({ files: [file], title: title, text: text }).then(function () { stat(place, 'image'); return 'image'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        return copyAndTell(place, text);
      });
    }
    return copyAndTell(place, text);
  }
  function saveImage() {
    if (!ST.blob) return;
    try { if (lastObj) URL.revokeObjectURL(lastObj); } catch (e) {}
    lastObj = URL.createObjectURL(ST.blob);
    var a = root.document.createElement('a'); a.href = lastObj; a.download = 'jibyebo-' + ST.tool + '.png';
    root.document.body.appendChild(a); a.click(); a.remove();
  }
  function setup(o) {
    o = o || {}; if (!TOOLS[o.tool] || !root.document) return;
    ST.tool = o.tool;
    var d = root.document;
    if (!d.getElementById('jshareCss')) { var s = d.createElement('style'); s.id = 'jshareCss'; s.textContent = CSS; d.head.appendChild(s); }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', topBtn); else topBtn();
    if (!ST.bound) {
      ST.bound = true;
      d.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-jshare]'); if (!b) return;
        e.preventDefault();
        var pl = b.getAttribute('data-jshare');
        run(PLACES.indexOf(pl) >= 0 ? pl : 'bottom');
      });
    }
  }

  var api = {
    saveFin: saveFin, loadFin: loadFin, hasPersonal: hasPersonal, stripPersonal: stripPersonal, share: share, bind: bind, PERSONAL: PERSONAL,
    TOOLS: TOOLS, setup: setup, update: update, clear: clear, link: link, pick: pick, safeSummary: safeSummary, safeLine: safeLine,
    shareText: shareText, drawCard: drawCard, cardBlob: cardBlob, run: run, saveImage: saveImage, state: function () { return ST; }
  };
  root.JDJ_SHARE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
