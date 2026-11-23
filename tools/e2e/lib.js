/* 화면 점검(E2E) 공용 도구 — 가짜 서버(mock) 응답, 화면 한 장 점검(가로 넘침·작은 버튼·잘린 글자·금지 문구·콘솔 오류·깨진 링크)
   체크리스트: docs/qa_checklist.md */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SITE = '/jangdaejang-calc/';

/* ---------- 가짜 서버(Apps Script) ---------- */
const NOW = new Date();
const iso = d => new Date(d).toISOString();
const DAY = 864e5;
/* 액션별 기본 응답 — 시험마다 mock.set(action, 응답 또는 함수) 로 바꿀 수 있음 */
function defaultReplies() {
  const sess = { s: 'e2e0'.repeat(16), nick: '시험회원', exp: iso(+NOW + 30 * DAY).slice(0, 10) };   // 서버 세션 토큰은 64자 16진수
  return {
    list: { ok: true, agents: [] },
    kakaoLogin: Object.assign({ ok: true, isNew: false }, sess),
    userLoad: { ok: true, nick: '시험회원', data: {} },
    userSave: { ok: true },
    userLogout: { ok: true },
    watchList: { ok: true, items: [] },
    watchSave: { ok: true },
    watchRemove: { ok: true },
    alertMine: { ok: true, subs: [], prefs: {} },
    alertSubscribe: { ok: true },
    alertJoin: { ok: true },
    alertPrefs: { ok: true },
    briefPublic: { ok: true },
    briefMine: { ok: false, err: '신청 내역을 찾지 못했어요.' },
    briefTrial: { ok: true, msg: '무료 체험을 신청했어요.' },
    briefUpdate: { ok: true },
    adList: { ok: true, ads: [] },
    leadCreate: { ok: true, id: 'L-E2E' },
    log: { ok: true }
  };
}
function makeMock() {
  const replies = defaultReplies(), calls = [];
  const mock = {
    calls,
    set(action, reply) { replies[action] = reply; return mock; },
    reset() { calls.length = 0; Object.assign(replies, defaultReplies()); },
    last(action) { for (let i = calls.length - 1; i >= 0; i--) if (calls[i].action === action) return calls[i]; return null; },
    async install(ctx) {
      await ctx.route(/script\.google(usercontent)?\.com\/macros\//, async route => {
        const req = route.request();
        let body = {};
        try { body = req.method() === 'POST' ? JSON.parse(req.postData() || '{}') : Object.fromEntries(new URL(req.url()).searchParams); } catch (e) {}
        const action = body.action || '';
        calls.push(Object.assign({ action }, { body }));
        let r = Object.prototype.hasOwnProperty.call(replies, action) ? replies[action] : { ok: true };
        if (typeof r === 'function') r = await r(body);
        if (r && r.__delay) { await new Promise(res => setTimeout(res, r.__delay)); r = r.body; }
        if (r && r.__abort) return route.abort();
        return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r) });
      });
    }
  };
  return mock;
}

/* 바깥 서비스: 분석 도구는 막고, 카카오 SDK 는 가짜(로그인 버튼이 눌리는지까지만) */
const KAKAO_STUB = `window.Kakao={_k:null,init:function(k){this._k=k},isInitialized:function(){return !!this._k},
Auth:{authorize:function(o){window.__kakaoAuthorize=o||{}},logout:function(c){c&&c()}},
Share:{sendDefault:function(o){window.__kakaoShare=o}},Channel:{chat:function(){window.__kakaoChat=1},addChannel:function(){}},
maps:null};`;
async function blockOutside(ctx) {
  await ctx.route(/(googletagmanager|google-analytics|analytics\.google|doubleclick|clarity\.ms|wcs\.naver|pagead2)/, r => r.abort());
  await ctx.addInitScript(KAKAO_STUB);                  // 진짜 SDK 는 무결성 확인(SRI) 때문에 바꿔치기할 수 없어 미리 넣어 둠
  await ctx.route(/t1\.kakaocdn\.net\/kakao_js_sdk/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/dapi\.kakao\.com/, r => r.abort());
  /* 지도 배경 타일은 1x1 투명 그림(바깥 서버에 기대지 않게) */
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  await ctx.route(/(tile\.openstreetmap\.org|api\.vworld\.kr|map\.daumcdn\.net|mts\.daumcdn\.net)/, r => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
}

/* ---------- 화면 한 장 점검 ---------- */
/* 사용자에게 보이면 안 되는 글(테스트 흔적·코드·보장 표현·경쟁사 이름) */
const RIVALS = ['호갱노노', '호갱', '리치고', '직방', '다방(?!면)', '아실(?=[·,.)]|$| 앱)', '부동산\\s?지인', '밸류맵', '디스코', '땅집고', '부동산\\s?R?114', '네이버\\s?부동산', 'KB\\s?부동산', '부동산\\s?플래닛'];
const BAD_TEXT = [
  [/\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b(?!\s*값)/, '코드 값(undefined·NaN·null)이 화면에 보임'],
  [/\b(TODO|FIXME|lorem ipsum|asdf)\b|(?<![@.\w])test(?![.\w@])|테스트용|시험용|임시 문구/i, '테스트 흔적 문구'],
  [/(?<!보장하지 않|보장되지 않|보장이 아니|보장하는 것은 아니|보장할 수 없|보장하지는 않|원금 보장이 없|보장하지 않습|보장 안|보장 X|보장하진 않)(수익|가격|상승|시세|확실히|100%)?\s*보장(해|합니다|돼|됩니다|된다|함)/, '보장 표현'],
  [/무조건 (오릅|올라|이득|수익)/, '단정 표현'],
  [/[가-힣]+(?<!고맙)(습니다|십시오)(?![가-힣])/, '딱딱한 말투(~습니다) — 화면 문구는 ~요'],
  [/\b(Error|error|failed|Failed|Unauthorized|Forbidden|timeout|TypeError|SyntaxError|unknown|invalid_[a-z]+|HTTP \d{3})\b/, '영어 오류 문구/코드']
];
const RIVAL_RE = new RegExp(RIVALS.join('|'));

async function inspect(page, opts) {
  opts = opts || {};
  return page.evaluate(({ allowText, rivalSrc, badSrc }) => {
    const W = document.documentElement.clientWidth, out = { hscroll: 0, overflow: [], small: [], cut: [], text: [], rival: [] };
    out.hscroll = Math.max(0, document.documentElement.scrollWidth - W);
    const vis = el => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const clipped = el => { let p = el.parentElement; while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; p = p.parentElement; } return false; };
    const label = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"');
    for (const el of document.querySelectorAll('body *')) {
      if (!vis(el)) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (s.position !== 'fixed' && r.right > W + 1 && r.left < W && !clipped(el)) out.overflow.push(label(el) + ' →' + Math.round(r.right));
      /* 글자가 잘림: 넘침 숨김인데 말줄임(…) 없이 잘린 칸 */
      if (/(hidden|clip)/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && el.clientWidth > 8 && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0 && (el.textContent || '').trim()) out.cut.push(label(el));
    }
    /* 누르는 칸(버튼·버튼처럼 생긴 링크·탭·칩): 44px 보다 작음. 문장 속 글자 링크는 제외 */
    const taps = document.querySelectorAll('button, [role=button], [role=tab], input[type=button], input[type=submit], select, a.btn, a[class*=btn], a[class*=chip], a[class*=tab], label.chip, .chip');
    for (const el of taps) {
      if (!vis(el) || el.closest('[aria-hidden=true]') || el.disabled && el.closest('.leaflet-control')) continue;
      if (el.closest('.leaflet-control-attribution, .leaflet-control-zoom')) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 43.5 && !el.matches('.ad-x, [data-e2e-small]')) out.small.push(label(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    }
    const txt = document.body.innerText || '';
    const allow = new RegExp(allowText || '$^');
    for (const [src, why] of badSrc) {
      const re = new RegExp(src, 'g'); let m;
      while ((m = re.exec(txt))) { const ctx = txt.slice(Math.max(0, m.index - 25), m.index + 35).replace(/\s+/g, ' '); if (!allow.test(ctx)) out.text.push(why + ': …' + ctx + '…'); if (out.text.length > 20) break; }
    }
    const rv = new RegExp(rivalSrc, 'g'); let m;
    while ((m = rv.exec(txt))) out.rival.push(txt.slice(Math.max(0, m.index - 20), m.index + 25).replace(/\s+/g, ' '));
    return out;
  }, { allowText: opts.allowText || '', rivalSrc: RIVAL_RE.source, badSrc: BAD_TEXT.map(([re, w]) => [re.source, w]) });
}

/* 같은 사이트 링크가 실제 파일을 가리키는지 */
function linkTarget(href) {
  const u = new URL(href);
  if (!u.pathname.startsWith(SITE)) return null;
  let p = decodeURIComponent(u.pathname.slice(SITE.length));
  let f = path.join(ROOT, p);
  if (!p || p.endsWith('/')) f = path.join(f, 'index.html');
  else if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return f;
}
async function brokenLinks(page) {
  const hrefs = await page.$$eval('a[href]', as => as.map(a => a.href).filter(h => /^https?:/.test(h)));
  const bad = [];
  for (const h of new Set(hrefs)) { const f = linkTarget(h); if (f && !fs.existsSync(f)) bad.push(h.replace(/^https?:\/\/[^/]+/, '')); }
  return bad;
}

/* 화면 열기 + 콘솔 오류·같은 사이트 404 모으기 */
function watch(page) {
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource: net::ERR_FAILED|favicon|ERR_BLOCKED|ERR_ABORTED/.test(m.text())) errs.push('콘솔 오류: ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('스크립트 오류: ' + String(e.message || e).slice(0, 200)));
  page.on('response', r => { const u = r.url(); if (r.status() >= 400 && u.includes('/jangdaejang-calc/')) errs.push('파일 없음 ' + r.status() + ': ' + u.replace(/^https?:\/\/[^/]+/, '')); });
  return errs;
}

module.exports = { ROOT, SITE, makeMock, blockOutside, inspect, brokenLinks, watch, RIVALS };
