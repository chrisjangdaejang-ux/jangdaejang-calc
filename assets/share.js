/* 집코드 공용 공유 모듈 (청약·맞춤 리포트·내 집 시세·갈아타기·전월세·전세사기 체크리스트·세금·빌라·단지 비교·순위)
   - 개인 금융값(연소득·현금·대출 원리금·이름·기타 비용)은 주소에 싣지 않고 이 기기(localStorage)에만 둡니다.
   - 결과 화면 공유 3곳: 상단 공유 아이콘(header.top) · 결과 중간 카드 · 결과 아래 단추.
     페이지는 JDJ_SHARE.setup({tool}) 한 번, 결과가 나올 때마다 JDJ_SHARE.update(요약, {root, after}) 를 부릅니다.
   - 요약(head·lines)에는 결과의 '모양'만 담습니다: 개인 금융값·가점 숫자·매수가 같은 내 숫자는 넣지 않습니다.
     (마지막 안전장치로 금액·'N점'이 들어간 문장은 버립니다. allowNum 은 단지 공개 정보만 쓰는 화면에서만.)
   - 공유: 요약 카드 이미지(1080×1080, canvas)를 미리 만들어 두고, Web Share API 파일 공유가 되면 이미지째,
     안 되면 링크를 복사하고 '복사됐어요'를 알려 드립니다(카드 이미지는 따로 저장 가능).
   - 통계(assets/stat.js): share_click {tool, place, method, mode} · 공유 링크 유입은 주소의 utm_source=share → share_visit {tool, mode}.
   - 공유 단추를 누르면 두 가지 중 고름(v4): ① 요약 공유(기본·추천) — 위 방식 그대로, 개인 숫자 없음
     ② 가족과 자세히 공유 — 화면이 setup({detail}) 로 넘겨 준 내 입력값(매수가·연소득·현금·가점 등)을 주소의 # 뒤(#jv=…)에만 담음.
        # 뒤는 서버·GA로 가지 않음(브라우저가 보내지 않고, track.js 가 GA를 켜기 전에 주소에서 지움). 카드 이미지에는 개인 숫자 없음.
     받는 쪽: #jv 값을 읽어 이 탭에서만 화면을 채움(sessionStorage). 이 기기의 저장값(localStorage)은 읽지도 덮어쓰지도 않고
     따로 둔 임시 칸을 씀 — 상단 '공유받은 조건으로 보고 있어요 · 내 조건으로 보기' 바. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var KEY = 'jdj_fin';
  var PERSONAL = ['i', 'c', 'd', 'n', 'e', 'bp', 'bd'];   // 주소에 실으면 안 되는 개인값(연소득·현금·대출·이름·기타 비용·매수가·매수 시기)
  var SITE = (function () { var u = String(((root && root.JDJ_SITE) || {}).SITE_URL || '').trim(); return /^https:\/\//.test(u) ? u.replace(/\/+$/, '') + '/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/'; })();   // config.js SITE_URL(없으면 예전 기본 주소)
  /* 화면별 이름·중간 카드 문구·'나도 해 보기' 주소 */
  var TOOLS = {
    chungyak:  { easy: '청약이 쉬워지는 집코드', label: '청약 당첨 가능성 진단', path: 'chungyak/', try: '내 가점으로 나도 해 보기' },
    report:    { easy: '내 집 마련이 쉬워지는 집코드', label: '내 집 마련 맞춤 리포트', path: 'buy/', try: '내 조건으로 나도 해 보기' },
    mine:      { easy: '내 집 시세 확인이 쉬워지는 집코드', label: '내 집 시세', path: 'mine/', try: '우리 집 시세도 확인해 보기' },
    switch:    { easy: '갈아타기 계산이 쉬워지는 집코드', label: '갈아타기 계산', path: 'switch/', try: '내 집으로 나도 해 보기' },
    jeonse:    { easy: '전월세 판단이 쉬워지는 집코드', label: '전월세 시세·위험 체크', path: 'jeonse/', try: '우리 집 전세도 확인해 보기' },
    checklist: { easy: '전세 계약 점검이 쉬워지는 집코드', label: '전세사기 예방 체크리스트', path: 'jeonse/checklist/', try: '내 계약도 점검해 보기' },
    tax:       { easy: '부동산 세금 계산이 쉬워지는 집코드', label: '부동산 세금 계산', path: 'tax/', try: '내 세금도 계산해 보기' },
    villa:     { easy: '재개발 빌라 확인이 쉬워지는 집코드', label: '재개발·빌라 체크', path: 'villa/', try: '관심 빌라도 확인해 보기' },
    ask:       { easy: '단지 비교가 쉬워지는 집코드', label: '단지 이름으로 물어보기', path: 'ask/', try: '궁금한 단지도 물어보기' },
    rank:      { easy: '우리 동네 순위 확인이 쉬워지는 집코드', label: '구별 시세·미래가치 순위', path: 'rank/', try: '우리 구 순위도 확인해 보기' }
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
      if (l && /^https?:$/.test(l.protocol) && l.pathname.indexOf(JB.SITE) === 0) return l.origin + JB.SITE;
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
  function logo(ctx, x, y, s) {   // 헤더 브랜드 아이콘(남색 집+열쇠 구멍, assets/icons/icon.svg 100 단위)을 24 단위 기준 s 배로
    ctx.save(); ctx.translate(x, y); ctx.scale(s * 0.24, s * 0.24);
    ctx.fillStyle = '#4338CA'; rrect(ctx, 0, 0, 100, 100, 22); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(29, 47, 42, 31);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(20, 51); ctx.lineTo(50, 26); ctx.lineTo(80, 51); ctx.stroke();
    ctx.fillStyle = '#4338CA'; ctx.beginPath(); ctx.arc(50, 59, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(46.5, 62); ctx.lineTo(44, 74); ctx.lineTo(56, 74); ctx.lineTo(53.5, 62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5EEAD4'; ctx.beginPath(); ctx.arc(76, 24, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function fontFam() {
    try { return root.getComputedStyle(root.document.body).fontFamily || 'sans-serif'; } catch (e) { return "'Noto Sans KR', sans-serif"; }
  }
  function drawCard(tool, sum, url) {
    var t = TOOLS[tool] || { label: '집코드', try: '나도 해 보기' };
    var c = root.document.createElement('canvas'); c.width = 1080; c.height = 1080;
    var ctx = c.getContext('2d'), F = fontFam();
    ctx.fillStyle = '#F7F4EC'; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#FFFFFF'; rrect(ctx, 60, 60, 960, 960, 44); ctx.fill();
    /* 머리: 로고 + 집코드 + 화면 이름 */
    logo(ctx, 112, 112, 3.4);
    ctx.textBaseline = 'middle'; ctx.fillStyle = '#191F28'; ctx.font = '900 60px ' + F; ctx.fillText('집코드', 214, 154);
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
  var ST = { tool: '', sum: null, blob: null, blobKey: '', url: '', bound: false, detail: null, keep: [] };
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
      + '<div class="tx"><b>' + esc(t.easy || '집코드') + ', 다른 분들께도 알려주세요</b>내 금액·점수는 빼고 결과 요약과 링크만 보내요.</div>'
      + '<button type="button" class="btn" data-jshare="mid">공유하기</button></div>';
  }
  function bottomHTML() {
    return '<div class="jshare-bottom noprint" data-jshare-box="bottom"><button type="button" class="btn" data-jshare="bottom">' + ICON + ' 결과 공유하기</button>'
      + '<small>받는 분은 링크를 눌러 바로 자기 조건으로 해 볼 수 있어요.</small></div>';
  }
  function topBtn() {
    var d = root.document, h = d.querySelector('header.top');
    if (!h) return null;
    var b = h.querySelector('.jshare-top');
    if (!b) {
      b = d.createElement('button'); b.type = 'button'; b.className = 'jshare-top'; b.setAttribute('data-jshare', 'top');
      b.setAttribute('aria-label', '결과 공유하기'); b.innerHTML = ICON + '<span>공유</span>'; b.hidden = true;
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
  function stat(place, method, mode) {
    if (root.jdjStat) try { root.jdjStat('share_click', { tool: ST.tool, place: place, method: method, mode: mode === 'detail' ? 'detail' : 'summary' }); } catch (e) {}
  }
  function shareText(mode, url) {
    var t = TOOLS[ST.tool] || {}, s = ST.sum || { head: '' };
    if (mode === 'detail') return (s.head ? s.head + '\n' : '') + '내가 넣은 조건 그대로 결과 보기\n' + url;
    return (s.head ? s.head + '\n' : '') + (t.easy ? t.easy + ' · ' : '') + (t.try || '나도 해 보기') + '\n' + ST.url;
  }
  function copyAndTell(place, text, mode) {
    return copyText(text).then(function (r) {
      if (r === 'copy') {
        stat(place, 'copy', mode);
        var el = toast('<span>' + (mode === 'detail' ? '자세히 보기 링크가 복사됐어요. 받는 분이 내 금액을 볼 수 있으니 가족·가까운 분께만 보내 주세요.' : '링크가 복사됐어요. 카카오톡·문자에 붙여 넣어 보내 보세요.') + '</span>' + (ST.blob ? '<a href="#" data-jshare-save>카드 이미지 저장</a>' : ''));
        var a = el.querySelector('[data-jshare-save]');
        if (a) a.onclick = function (e) { e.preventDefault(); saveImage(); };
      } else toast('<span>복사가 안 됐어요. 주소창의 링크를 길게 눌러 복사해 주세요.</span>');
      return r;
    });
  }
  function run(place, mode) {
    if (!ST.sum) return Promise.resolve('none');
    var url = ST.url;
    if (mode === 'detail') { url = detailLink(); if (!url) mode = 'summary', url = ST.url; } else mode = 'summary';
    var nav = root.navigator || {}, text = shareText(mode, url), title = '집코드 · ' + ((TOOLS[ST.tool] || {}).label || '');
    var file = null, canFile = false;
    try { if (ST.blob && root.File) file = new root.File([ST.blob], 'jibyebo-' + ST.tool + '.png', { type: 'image/png' }); } catch (e) { file = null; }
    try { canFile = !!(file && nav.share && nav.canShare && nav.canShare({ files: [file] })); } catch (e) { canFile = false; }
    /* 링크가 먼저: 사진 파일을 같이 보내면 카카오톡·갤러리 등 많은 앱이 글과 링크를 버리고 사진만 보냄.
       → 글+링크로 공유(카카오톡에선 미리보기 카드가 붙음)하고, 카드 이미지는 원하면 따로 보내도록 안내 */
    var lnk = mode === 'detail' ? url : ST.url, body = text.replace(lnk, '').replace(/\n+$/, '');
    function imgOffer() {
      if (!file) return;
      var el = toast('<span>링크를 보냈어요. 결과 카드 사진도 함께 보내려면</span><a href="#" data-jshare-img>사진으로 보내기</a>');
      var a = el.querySelector('[data-jshare-img]');
      if (a) a.onclick = function (e) {
        e.preventDefault();
        if (canFile) nav.share({ files: [file], title: title }).then(function () { stat(place, 'image', mode); }, function (er) { if (!(er && er.name === 'AbortError')) saveImage(); });
        else saveImage();
      };
    }
    if (nav.share) {
      return nav.share({ title: title, text: body, url: lnk }).then(function () { stat(place, 'link', mode); imgOffer(); return 'share'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancel';
        return copyAndTell(place, text, mode);
      });
    }
    return copyAndTell(place, text, mode);
  }
  /* 링크 먼저 보내기 — 결과 화면이 아닌 곳(중개사 플러스 손님 카드 등)도 run() 과 같은 순서로 보냄:
     ① 글+링크 공유(카카오톡에선 미리보기가 붙음) → ② 보낸 뒤 '사진으로 보내기' 안내(사진은 고를 때만). 공유가 안 되면 링크 복사 + 사진 저장 안내.
     o = { title, text, url, blob(선택: 카드 PNG — 함수면 누를 때 만듦), file(사진 파일 이름), tool·place(통계) } */
  function sendLink(o) {
    o = o || {};
    if (!root.document.getElementById('jshareCss')) { var st = root.document.createElement('style'); st.id = 'jshareCss'; st.textContent = CSS; root.document.head.appendChild(st); }
    var nav = root.navigator || {}, fname = o.file || 'jibyebo-card.png';
    var full = (o.text ? o.text + '\n' : '') + o.url;
    function sv(m) { if (root.jdjStat) try { root.jdjStat('share_click', { tool: o.tool || 'brief_card', place: o.place || 'card', method: m, mode: 'summary' }); } catch (e) {} }
    function getBlob() { return Promise.resolve(typeof o.blob === 'function' ? o.blob() : o.blob).catch(function () { return null; }); }
    function save(b) {
      if (!b) return; var u = URL.createObjectURL(b), a = root.document.createElement('a'); a.href = u; a.download = fname;
      root.document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }
    function imgOffer(msg) {
      if (!o.blob) return;
      var el = toast('<span>' + msg + '</span><a href="#" data-jshare-img>사진으로 보내기</a>'), a = el.querySelector('[data-jshare-img]');
      if (a) a.onclick = function (e) {
        e.preventDefault();
        getBlob().then(function (b) {
          if (!b) return;
          var f = null, can = false;
          try { f = new root.File([b], fname, { type: 'image/png' }); can = !!(nav.share && nav.canShare && nav.canShare({ files: [f] })); } catch (er) { can = false; }
          if (can) nav.share({ files: [f], title: o.title }).then(function () { sv('image'); }, function (er) { if (!(er && er.name === 'AbortError')) save(b); });
          else { save(b); sv('image'); }
        });
      };
    }
    function copyTell() {
      return copyText(full).then(function (r) {
        if (r === 'copy') { sv('copy'); if (o.blob) imgOffer('링크가 복사됐어요. 카카오톡·문자에 붙여 넣어 보내 주세요. 카드 사진도 필요하면'); else toast('<span>링크가 복사됐어요. 카카오톡·문자에 붙여 넣어 보내 주세요.</span>'); }
        else toast('<span>복사가 안 됐어요. 링크를 길게 눌러 복사해 주세요.</span>');
        return r;
      });
    }
    if (nav.share) return nav.share({ title: o.title, text: o.text, url: o.url }).then(function () { sv('link'); imgOffer('링크를 보냈어요. 카드 사진도 함께 보내려면'); return 'share'; },
      function (e) { if (e && e.name === 'AbortError') return 'cancel'; return copyTell(); });
    return copyTell();
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
    ST.tool = o.tool; ST.detail = typeof o.detail === 'function' ? o.detail : null; ST.keep = o.keep || [];
    var d = root.document;
    if (SV) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', svBar); else svBar(); }
    if (!d.getElementById('jshareCss')) { var s = d.createElement('style'); s.id = 'jshareCss'; s.textContent = CSS; d.head.appendChild(s); }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', topBtn); else topBtn();
    if (!ST.bound) {
      ST.bound = true;
      d.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-jshare]'); if (!b) return;
        e.preventDefault();
        var pl = b.getAttribute('data-jshare');
        pl = PLACES.indexOf(pl) >= 0 ? pl : 'bottom';
        if (detailPayload()) chooser(b, pl); else run(pl, 'summary');
      });
    }
  }

  /* ---------- 가족과 자세히 공유: 주소 # 뒤에만 담는 내 입력값 ---------- */
  function b64e(str) {
    var bin = unescape(encodeURIComponent(str)), b = (root.btoa ? root.btoa(bin) : Buffer.from(bin, 'binary').toString('base64'));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var bin = root.atob ? root.atob(s) : Buffer.from(s, 'base64').toString('binary');
    return decodeURIComponent(escape(bin));
  }
  var MAXLEN = 6000;
  function encodeDetail(p) { return 'jv=' + b64e(JSON.stringify(p)); }
  /* '#jv=…' → {v:1, t, q, h, ls, f, x} (모양이 다르면 null) */
  function qBlocked(t, k) { return /^utm_/.test(k) || k === 'bp' || k === 'bd' || (t === 'report' && FIN_KEYS.indexOf(k) >= 0); }
  function cleanDetail(p) {
    if (!p || typeof p !== 'object' || p.v !== 1 || !TOOLS[p.t]) return null;
    p = JSON.parse(JSON.stringify(p));
    ['q', 'ls', 'f', 'x'].forEach(function (k) { if (p[k] != null && (typeof p[k] !== 'object' || Array.isArray(p[k]))) delete p[k]; });
    /* ? 뒤로 옮길 공개 값: 매수가·시기(bp·bd)는 어디서나, i·c·d·n·e 는 금액 뜻으로 쓰는 맞춤 리포트에서만 버림(내 집 시세·전월세의 d 는 단지 열쇠) */
    if (p.q) Object.keys(p.q).forEach(function (k) { if (qBlocked(p.t, k)) delete p.q[k]; else p.q[k] = String(p.q[k]); });
    if (p.ls) Object.keys(p.ls).forEach(function (k) { if (PROTECT.indexOf(k) < 0 || typeof p.ls[k] !== 'string') delete p.ls[k]; });
    if (p.h != null && !/^[a-z]{1,12}$/.test(p.h)) delete p.h;
    return p;
  }
  function decodeDetail(hash) {
    hash = String(hash || '').replace(/^#/, '');
    if (hash.indexOf('jv=') !== 0 || hash.length > MAXLEN) return null;
    try { return cleanDetail(JSON.parse(b64d(hash.slice(3)))); } catch (e) { return null; }
  }
  /* 화면이 넘겨 준 내 입력값(없거나 개인 값이 없으면 null → 요약 공유만) */
  function detailPayload() {
    if (!ST.detail || !ST.sum) return null;
    var o; try { o = ST.detail(); } catch (e) { o = null; }
    if (!o) return null;
    var p = { v: 1, t: ST.tool }, q = {};
    Object.keys(o.q || {}).forEach(function (k) { var v = o.q[k]; if (v != null && v !== '' && !qBlocked(ST.tool, k)) q[k] = String(v); });
    if (Object.keys(q).length) p.q = q;
    if (o.h) p.h = o.h;
    if (o.ls) { var ls = {}; Object.keys(o.ls).forEach(function (k) { if (PROTECT.indexOf(k) >= 0 && typeof o.ls[k] === 'string') ls[k] = o.ls[k]; }); if (Object.keys(ls).length) p.ls = ls; }
    if (o.f && Object.keys(o.f).length) p.f = o.f;
    if (o.x) p.x = o.x;
    p.path = o.path || '';
    return p;
  }
  /* 자세히 공유 링크: 화면 주소 + utm(공개)만 ? 뒤에, 내 입력값은 모두 # 뒤에 */
  function detailLink() {
    var p = detailPayload(); if (!p) return '';
    var path = p.path; delete p.path;
    var t = TOOLS[ST.tool] || {}, u = new URL(path || t.path || '', siteBase());
    u.searchParams.set('utm_source', 'share'); u.searchParams.set('utm_medium', 'user_share'); u.searchParams.set('utm_campaign', ST.tool);
    u.hash = encodeDetail(p);
    return u.href;
  }

  /* ---------- 받는 쪽: 이 탭에서만 공유받은 조건으로 보기 ---------- */
  var SV_KEY = 'jdj_sv';
  /* 공유받은 값으로 잠시 바꿔 보여 줄 저장값(이 기기 사람의 값은 읽지도 덮어쓰지도 않음) */
  var PROTECT = ['jdj_fin', 'jdj_cy', 'jdj_myhome', 'jdj_region', 'jdj_hz', 'jdj_cmp', 'jdj_jck', 'jdj_prem_cond'];
  function ssGet() { try { return JSON.parse(root.sessionStorage.getItem(SV_KEY) || 'null'); } catch (e) { return null; } }
  /* 주소의 #jv 를 읽어 지우고(공유받은 공개 값 q 는 ? 뒤로 옮겨 화면이 원래 방식대로 복원), 이 탭에 기억.
     보통은 track.js 가 GA를 켜기 전에 주소를 먼저 고쳐 두고(window.JDJ_SHARED_IN) 여기서는 기억만 함 */
  function capture(pre) {
    if (!root.location || !root.history) return null;
    var l = root.location, p = pre ? cleanDetail(pre) : decodeDetail(l.hash);
    if (p) {
      if (!pre) {
        var q = new URLSearchParams(l.search);
        Object.keys(p.q || {}).forEach(function (k) { q.set(k, p.q[k]); });
        var qs = q.toString();
        try { root.history.replaceState(root.history.state, '', l.pathname + (qs ? '?' + qs : '') + (p.h ? '#' + p.h : '')); } catch (e) {}
      }
      try { root.sessionStorage.setItem(SV_KEY, JSON.stringify({ path: l.pathname, p: p })); } catch (e) {}
      return p;
    }
    if (/^#jv=/.test(l.hash)) { try { root.history.replaceState(root.history.state, '', l.pathname + l.search); } catch (e) {} return null; }   // 망가진 값도 주소에서 지움
    var s = ssGet();
    if (s && s.p && s.path === l.pathname) return cleanDetail(s.p);
    if (s) try { root.sessionStorage.removeItem(SV_KEY); } catch (e) {}
    return null;
  }
  var SV = null;
  try { SV = root.document ? capture(root.JDJ_SHARED_IN && typeof root.JDJ_SHARED_IN === 'object' ? root.JDJ_SHARED_IN : null) : null; } catch (e) { SV = null; }
  /* 공유받아 보는 동안: 위 저장값은 공유받은 값(없으면 빈 값)을 읽고, 쓰기는 이 탭의 임시 칸에만 */
  if (SV && root.Storage && root.localStorage) {
    var MEM = {}; PROTECT.forEach(function (k) { MEM[k] = SV.ls && typeof SV.ls[k] === 'string' ? SV.ls[k] : null; });
    var SP = root.Storage.prototype, g0 = SP.getItem, s0 = SP.setItem, r0 = SP.removeItem;
    var isLS = function (st) { try { return st === root.localStorage; } catch (e) { return false; } };
    SP.getItem = function (k) { return isLS(this) && PROTECT.indexOf(String(k)) >= 0 ? MEM[k] : g0.apply(this, arguments); };
    SP.setItem = function (k, v) { if (isLS(this) && PROTECT.indexOf(String(k)) >= 0) { MEM[k] = String(v); return; } return s0.apply(this, arguments); };
    SP.removeItem = function (k) { if (isLS(this) && PROTECT.indexOf(String(k)) >= 0) { MEM[k] = null; return; } return r0.apply(this, arguments); };
  }
  function viewing() { return SV; }
  function myUrl() {
    var l = root.location, q = new URLSearchParams(l.search), out = new URLSearchParams();
    (ST.keep || []).forEach(function (k) { if (q.get(k)) out.set(k, q.get(k)); });
    var s = out.toString();
    return l.pathname + (s ? '?' + s : '') + (SV && SV.h ? '#' + SV.h : '');
  }
  function leave() { try { root.sessionStorage.removeItem(SV_KEY); } catch (e) {} root.location.replace(myUrl()); }
  function svBar() {
    var d = root.document; if (!SV || d.getElementById('jshareSv')) return;
    var b = d.createElement('div'); b.id = 'jshareSv'; b.className = 'jshare-sv noprint'; b.setAttribute('role', 'status');
    b.innerHTML = '<span><b>공유받은 조건으로 보고 있어요</b> · 이 기기에 저장하지 않아요</span><button type="button" data-jshare-leave>내 조건으로 보기</button>';
    var h = d.querySelector('header.top');
    if (h && h.parentNode) h.parentNode.insertBefore(b, h.nextSibling); else d.body.insertBefore(b, d.body.firstChild);
    b.querySelector('[data-jshare-leave]').onclick = leave;
  }
  /* 입력칸 값 담기·채우기(화면 공용): id 있는 input·select. 이메일·검색·비밀번호·data-noshare 는 뺌 */
  function formSnap(rootEl, ids) {
    var out = {}, r = typeof rootEl === 'string' ? root.document.querySelector(rootEl) : rootEl; if (!r) return out;
    [].slice.call(r.querySelectorAll('input[id],select[id],textarea[id]')).forEach(function (el) {
      if (ids && ids.indexOf(el.id) < 0) return;
      if (/^(email|search|password|hidden|file|button|submit)$/.test(el.type) || el.hasAttribute('data-noshare')) return;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) out[el.id] = 1; else if (el.type === 'checkbox') out[el.id] = 0; return; }
      if (el.value !== '') out[el.id] = el.value;
    });
    return out;
  }
  /* 값 넣고 그 칸의 input·change 를 보냄(문서 전체로 퍼지지 않게 — 통계·추적이 받는 사람 것으로 세지 않게) */
  function formFill(f, rootEl) {
    var d = root.document, r = rootEl ? (typeof rootEl === 'string' ? d.querySelector(rootEl) : rootEl) : d;
    Object.keys(f || {}).forEach(function (id) {
      var el = r && r.querySelector('#' + (root.CSS && root.CSS.escape ? root.CSS.escape(id) : id)); if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!f[id]; else el.value = f[id];
      ['input', 'change'].forEach(function (t) { try { el.dispatchEvent(new Event(t, { bubbles: false })); } catch (e) {} });
    });
  }

  /* ---------- 공유 방법 고르기(휴대폰 바텀시트 / PC 팝오버) ---------- */
  var CH_CSS = '.jshare-bk{position:fixed;inset:0;z-index:1001;background:rgba(25,31,40,.42)}'
    + '.jshare-ch{box-sizing:border-box;position:fixed;z-index:1002;background:#fff;color:#191F28;box-shadow:0 12px 40px rgba(0,0,0,.22);padding:20px 18px 18px;text-align:left;font-size:15px;line-height:1.5}'
    + '.jshare-ch h3{margin:0 0 12px;font-size:18px;font-weight:800}'
    + '.jshare-ch .x{position:absolute;right:10px;top:10px;min-width:44px;min-height:44px;border:0;background:none;font-size:22px;color:#4E5968;cursor:pointer}'
    + '.jshare-ch label{display:flex;gap:12px;align-items:flex-start;padding:14px;border:1.5px solid #E5E8EB;border-radius:14px;margin:0 0 10px;cursor:pointer}'
    + '.jshare-ch label.on{border-color:#B8942A;background:#FBF5E3}'
    + '.jshare-ch input{margin:3px 0 0;width:20px;height:20px;accent-color:#B8942A;flex:none}'
    + '.jshare-ch b{display:block;font-size:16px}.jshare-ch b em{font-style:normal;font-size:12.5px;font-weight:800;color:#fff;background:#B8942A;border-radius:6px;padding:1px 7px;margin-left:6px;vertical-align:2px}'
    + '.jshare-ch small{display:block;color:#4E5968;font-size:14px}'
    + '.jshare-ch .warn{display:inline-block;margin-top:6px;color:#C2410C;font-weight:700;font-size:14px}'
    + '.jshare-ch .go{width:100%;min-height:52px;border:0;border-radius:12px;background:#191F28;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer;margin-top:4px}'
    + '.jshare-ch.sheet{left:0;right:0;bottom:0;border-radius:20px 20px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom))}'
    + '.jshare-ch.pop{width:380px;max-width:calc(100vw - 24px);border-radius:16px}'
    + '.jshare-sv{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 12px;padding:10px 14px;background:#FBF5E3;border-bottom:1px solid #EFE2B8;color:#3E4754;font-size:14.5px;text-align:center}'
    + '.jshare-sv b{color:#191F28}.jshare-sv button{min-height:40px;padding:0 14px;border:0;border-radius:10px;background:#191F28;color:#fff;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer}'
    + '@media print{.jshare-sv,.jshare-ch,.jshare-bk{display:none!important}}';
  function chClose() { [].slice.call(root.document.querySelectorAll('.jshare-ch,.jshare-bk')).forEach(function (n) { n.remove(); }); root.document.removeEventListener('keydown', chKey); }
  function chKey(e) { if (e.key === 'Escape') chClose(); }
  function chooser(btn, place) {
    var d = root.document; chClose();
    if (!d.getElementById('jshareChCss')) { var s = d.createElement('style'); s.id = 'jshareChCss'; s.textContent = CH_CSS; d.head.appendChild(s); }
    var narrow = (root.innerWidth || 1024) <= 600;
    var bk = d.createElement('div'); bk.className = 'jshare-bk'; if (!narrow) bk.style.background = 'transparent';
    var ch = d.createElement('div'); ch.className = 'jshare-ch ' + (narrow ? 'sheet' : 'pop');
    ch.setAttribute('role', 'dialog'); ch.setAttribute('aria-modal', 'true'); ch.setAttribute('aria-labelledby', 'jshareChT');
    ch.innerHTML = '<h3 id="jshareChT">어떻게 공유할까요?</h3><button type="button" class="x" aria-label="닫기">×</button>'
      + '<label class="on"><input type="radio" name="jshareMode" value="summary" checked><span><b>요약 공유<em>추천</em></b><small>개인 숫자 없이 — 결과 요약과 \'나도 해 보기\' 링크만 보내요. 널리 알리기 좋아요.</small></span></label>'
      + '<label><input type="radio" name="jshareMode" value="detail"><span><b>가족과 자세히 공유</b><small>내 금액 포함 — 받은 분이 링크를 열면 내가 넣은 조건 그대로 같은 결과가 떠요.</small><span class="warn">받는 사람이 내 금액을 볼 수 있어요</span></span></label>'
      + '<button type="button" class="go">공유하기</button>';
    d.body.appendChild(bk); d.body.appendChild(ch);
    if (!narrow) {
      /* 넓은 화면은 html{zoom:1.125}(aplus.css) — 화면 좌표를 CSS 좌표로 나눠 맞춤 */
      var Z = parseFloat(root.getComputedStyle(d.documentElement).zoom) || 1, b0 = btn.getBoundingClientRect();
      var r = { top: b0.top / Z, bottom: b0.bottom / Z, right: b0.right / Z };
      var W = ch.offsetWidth, H = ch.offsetHeight, vw = root.innerWidth / Z, vh = root.innerHeight / Z;
      var left = Math.min(Math.max(12, r.right - W), vw - W - 12), top = r.bottom + 8;
      if (top + H > vh - 12) top = Math.max(12, r.top - H - 8);
      ch.style.left = left + 'px'; ch.style.top = top + 'px';
    }
    var labels = [].slice.call(ch.querySelectorAll('label'));
    labels.forEach(function (l) { l.querySelector('input').addEventListener('change', function () { labels.forEach(function (x) { x.classList.toggle('on', x.querySelector('input').checked); }); }); });
    bk.onclick = chClose; ch.querySelector('.x').onclick = chClose;
    ch.querySelector('.go').onclick = function () { var m = ch.querySelector('input:checked').value; chClose(); run(place, m); try { btn.focus(); } catch (e) {} };
    d.addEventListener('keydown', chKey);
    ch.querySelector('input:checked').focus();
  }

  var api = {
    saveFin: saveFin, loadFin: loadFin, hasPersonal: hasPersonal, stripPersonal: stripPersonal, share: share, bind: bind, PERSONAL: PERSONAL,
    TOOLS: TOOLS, setup: setup, update: update, clear: clear, link: link, pick: pick, safeSummary: safeSummary, safeLine: safeLine,
    shareText: shareText, drawCard: drawCard, cardBlob: cardBlob, run: run, saveImage: saveImage, state: function () { return ST; },
    encodeDetail: encodeDetail, decodeDetail: decodeDetail, cleanDetail: cleanDetail, detailLink: detailLink, detailPayload: detailPayload, capture: capture, viewing: viewing,
    formSnap: formSnap, formFill: formFill, chooser: chooser, PROTECT: PROTECT, leave: leave, sendLink: sendLink
  };
  root.JDJ_SHARE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
