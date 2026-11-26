/* '오늘의 집값 맞혀 보기' 쉬운 문제(2026-11-26) — 계산만, DOM 없음. 화면 quiz/·첫 화면 카드·모닝 브리핑(brief/)·테스트 tools/quiz-pick-test.js 공용.
   문제: "직전 거래 ○○억이었어요. 이번 거래는?" → [올랐어요] [내렸어요] 한 번 누르기. 원하면 한 번 더: 실제 금액 1개 + 그럴듯한 보기 2개(±5~12%, 1,000만 원 단위로 차이).
   후보 자료(공개, 엔진 scripts/today_feed.py — 직거래·특수 거래 의심·비교 거래 적음·직전 거래와 같은 금액은 이미 빠짐):
     today/g/{구}.json qz = [{id, d(동), j(지번), a(단지), b(평형), ar, f, dt(계약일), p(금액 만원), pp(직전 거래), ppd(직전 계약일), n, nr[[계약일, 층, 금액]], hi?, e?(집예보 시세), em?(시세 달)}]
       + 파일 머리 gn·sd·sid(구 이름·시·도 짧은 이름·시·도 자료 id)
     today/quiz.json pool = 전국 '그날 눈에 띄는 거래'(신고가 → 거래 많은 큰 단지 순, 칸은 위와 같고 g·sid·sd·gn 포함) · q·near = 예전 하루 한 문제(후보가 없을 때 직전 거래를 near 에서 찾아 씀)
   고르는 순서(이 기기 안에서만 — 관심 단지·내 집·내 지역은 서버로 보내지 않음):
     ① 관심 단지(JDJ_WATCH) 같은 단지 → 같은 동 가까운 단지 ② 내 집 성적표 집(jdj_myhome) 같은 단지 → 같은 동 ③ 홈에서 고른 지역(jdj_home_region) ④ 그날 눈에 띄는 거래
     같은 칸 안에서는 날짜로 정한 순서(같은 날 같은 기기는 같은 문제), 이미 푼 문제는 뺌. 그날 처음 고른 문제는 jdj_quiz_pick 에 고정(자료가 하루 4번 바뀌어도 그대로).
   집예보 예측: 후보의 e(내 집 시세 화면과 같은 3개월 중간값 시세, 거래한 달 앞 값)가 있을 때만. 없으면 그 줄을 보여 주지 않음(지어내지 않음).
   기록(이 기기 localStorage 'jdj_quiz', 예전 하루 한 문제 기록과 같은 칸 + a·cs·cb): 연속 참여·연속 정답·최근 10문제 오차 평균 — 서버로 보내지 않음.
   이번 주 예측 맞히기 내 답(jdj_pq_local): 로그인하지 않아도 이 기기에 남기고, 결과가 나오면 다음 방문·모닝 브리핑 화면에서 알려 줌.
   보상(연속 정답 → 모닝 브리핑 무료 기간 연장)은 설계만: config QUIZ_REWARD_ENABLED 와 PAID_OPEN 이 모두 true 일 때만 화면이 씀(지금은 꺼짐).
   window.JDJ_QPICK */
(function (root) {
  'use strict';
  const KEY = 'jdj_quiz', LOCK = 'jdj_quiz_pick', WKEY = 'jdj_pq_local', KEEP = 40, RECENT = 10;
  const REWARD = { need: 7, days: 7 };       // 설계: 연속 정답 7번마다 모닝 브리핑 무료 7일 연장(켜지 않음)
  const WHY = { watch: '내 관심 단지 문제예요', watch_near: '내 관심 단지 근처 문제예요', home: '내 집 단지 문제예요', home_near: '내 집 근처 문제예요', region: '내 지역 문제예요', news: '오늘 눈에 띄는 거래예요', share: '공유받은 문제예요' };

  function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hash(seed) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const num = v => typeof v === 'number' && isFinite(v);

  /** 후보 하나 정리(필요한 칸이 없거나 직전 거래와 같은 금액이면 null). meta = 구 파일 머리 {g, gn, sd, sid} */
  function norm(r, meta) {
    if (!r || typeof r !== 'object') return null;
    const m = meta || {}, g = String(r.g || m.g || '');
    if (!/^\d{5}$/.test(g) || !r.id || !r.a || !r.b || !(num(r.p) && r.p > 0) || !(num(r.pp) && r.pp > 0) || r.p === r.pp || !num(r.dt)) return null;
    const c = { id: String(r.id), g, sid: String(r.sid || m.sid || ''), sd: String(r.sd || m.sd || ''), gn: String(r.gn || m.gn || ''), d: String(r.d || ''), j: String(r.j || ''),
      a: String(r.a), b: String(r.b), ar: r.ar, f: r.f, dt: r.dt, p: r.p, pp: r.pp, ppd: r.ppd || 0, n: r.n || 0, nr: Array.isArray(r.nr) ? r.nr.slice(0, 6) : [] };
    if (r.hi) c.hi = 1;
    if (num(r.e) && r.e > 0) { c.e = r.e; c.em = String(r.em || ''); }
    return c;
  }
  /** 예전 quiz.json(q + near)에서 문제 만들기 — 직전 거래 = near 중 문제 계약일 앞 가장 최근(같은 날 값이 여럿이면 못 씀) */
  function fromLegacy(Q) {
    const q = Q && Q.q; if (!q || !Q.id) return null;
    const before = (Q.near || []).filter(x => Array.isArray(x) && x[0] < q.dt && x[0] % 100 && x[3] > 0);
    if (!before.length) return null;
    const pd = Math.max(...before.map(x => x[0])), same = before.filter(x => x[0] === pd);
    if (new Set(same.map(x => x[3])).size !== 1) return null;
    return norm({ id: Q.id, g: q.g, sid: q.sid, sd: q.sd, gn: q.gn, d: q.d, j: q.j, a: q.a, b: q.b, ar: q.ar, f: q.f, dt: q.dt, p: q.p, pp: same[0][3], ppd: pd,
      n: (Q.near || []).length, nr: (Q.near || []).slice(0, 6).map(x => [x[0], x[2], x[3]]), hi: q.hi });
  }
  /** 구 파일 → 후보 목록 */
  function fromG(gfile) { if (!gfile || !Array.isArray(gfile.qz)) return []; const m = { g: gfile.g, gn: gfile.gn, sd: gfile.sd, sid: gfile.sid }; return gfile.qz.map(r => norm(r, m)).filter(Boolean); }
  function poolOf(Q) { const a = (Q && Array.isArray(Q.pool) ? Q.pool : []).map(r => norm(r)).filter(Boolean); if (!a.length) { const l = fromLegacy(Q); if (l) a.push(l); } return a; }

  /** 같은 칸 안에서 하나: 날짜·후보로 정한 순서, 이미 푼 문제는 뺌 */
  function choose(list, today, done) {
    const a = (list || []).filter(c => !(done && done[c.id]));
    if (!a.length) return null;
    const s = a.slice().sort((x, y) => (x.id < y.id ? -1 : 1));
    return s[hash('day|' + today + '|' + s.map(c => c.id).join(',')) % s.length];
  }
  const sameApt = (c, p) => c.g === p.code && c.d === p.dong && c.a === p.apt && (!p.jibun || !c.j || c.j === p.jibun);
  /** 문제 고르기. ctx = {watch:[{code,dong,jibun,apt,band}], homes:[같은 모양], region:{sd,g}, gf:{구: 파일}, Q: quiz.json, today, done:{id:1}}
      → {c, why} 또는 null */
  function pick(ctx) {
    const X = ctx || {}, gf = X.gf || {}, today = X.today || '', done = X.done || {};
    const inG = code => fromG(gf[code]);
    const tier = (places, why) => {
      for (const p of places || []) {
        const L = inG(p.code), ex = L.filter(c => sameApt(c, p) && c.b === p.band), apt = L.filter(c => sameApt(c, p));
        const c = choose(ex, today, done) || choose(apt, today, done); if (c) return { c, why };
      }
      for (const p of places || []) { const c = choose(inG(p.code).filter(c => c.d === p.dong), today, done); if (c) return { c, why: why + '_near' }; }
      return null;
    };
    let r = tier(X.watch, 'watch') || tier(X.homes, 'home');
    if (r) return r;
    const pool = poolOf(X.Q), rg = X.region || {};
    if (/^\d{5}$/.test(rg.g || '')) { const c = choose(inG(rg.g), today, done) || choose(pool.filter(c => c.g === rg.g), today, done); if (c) return { c, why: 'region' }; }
    if (/^s\d{2}$/.test(rg.sd || '')) { const c = pool.find(c => c.sid === rg.sd && !done[c.id]); if (c) return { c, why: 'region' }; }
    const c = pool.find(c => !done[c.id]) || null;
    return c ? { c, why: 'news' } : null;
  }
  /** 필요한 구 파일 코드(관심 단지·내 집·내 지역 — 많아야 8개) */
  function needG(ctx) {
    const out = [];
    [].concat(ctx.watch || [], ctx.homes || []).forEach(p => { if (p && /^\d{5}$/.test(p.code || '') && out.indexOf(p.code) < 0) out.push(p.code); });
    const g = ctx.region && ctx.region.g; if (/^\d{5}$/.test(g || '') && out.indexOf(g) < 0) out.push(g);
    return out.slice(0, 8);
  }
  /** 공유 주소 q=구-문제id → 후보 찾기(구 파일 → 전국 후보 → 예전 문제) */
  function findShared(ref, gf, Q) {
    const m = /^(\d{5})-([0-9A-Za-z_]{1,24})$/.exec(String(ref || '')); if (!m) return null;
    return fromG(gf[m[1]]).find(c => c.id === m[2]) || poolOf(Q).find(c => c.id === m[2]) || null;
  }
  const shareRef = c => c.g + '-' + c.id;

  /* ---------- 정답·보기·집예보 예측 ---------- */
  const dir = c => c.p > c.pp ? 'up' : 'dn';
  /** 보기 3개(작은 금액부터) [{v, ok}] — 실제 금액 + 1,000만 원 단위로 5~12% 떨어진 금액 2개(같은 문제는 늘 같은 보기) */
  function choices(c) {
    const P = c.p, r = rng('ch|' + c.id);
    const side = (sg, step) => { const a = []; for (let k = 1; k < 400; k++) { const v = P + sg * k * step, d = Math.abs(v / P - 1); if (d > 0.12) break; if (d >= 0.05 && v > 0) a.push(v); } return a; };
    let step = 1000, up = side(1, step), dn = side(-1, step);
    if (!up.length || !dn.length) { step = 500; up = side(1, step); dn = side(-1, step); }
    if (!up.length || !dn.length) { step = 100; up = side(1, step); dn = side(-1, step); }
    const at = a => a[Math.floor(r() * a.length)];
    const two = a => { const i = Math.floor(r() * a.length); let j = Math.floor(r() * (a.length - 1)); if (j >= i) j++; return [a[i], a[j]]; };
    const pat = r();                                   // 정답이 늘 가운데이면 힌트가 되니, 가끔은 두 보기를 같은 쪽에
    const out = pat < 0.2 && up.length >= 2 ? two(up) : pat < 0.4 && dn.length >= 2 ? two(dn) : [at(up), at(dn)];
    return out.map(v => ({ v, ok: false })).concat([{ v: P, ok: true }]).sort((a, b) => a.v - b.v);
  }
  /** 집예보 예측(시세가 있을 때만): {dir 'up'|'dn'|'', v 시세, em 'YYYYMM', near 보기 중 시세와 가장 가까운 금액} */
  function ai(c, opts) {
    if (!(c && num(c.e) && c.e > 0)) return null;
    const d = c.e > c.pp ? 'up' : c.e < c.pp ? 'dn' : '';
    let near = null; (opts || []).forEach(o => { if (near == null || Math.abs(o.v - c.e) < Math.abs(near - c.e)) near = o.v; });
    return { dir: d, v: c.e, em: c.em || '', near };
  }

  /* ---------- 기록(이 기기) ---------- */
  function load(raw) {
    let o = null; try { o = typeof raw === 'string' ? JSON.parse(raw || 'null') : raw; } catch (e) { o = null; }
    o = o && typeof o === 'object' ? o : {};
    return { v: 2, last: /^\d{4}-\d{2}-\d{2}$/.test(o.last || '') ? o.last : '', streak: +o.streak || 0, best: +o.best || 0, n: +o.n || 0, ok: +o.ok || 0,
      h: o.h && typeof o.h === 'object' ? o.h : {}, a: o.a && typeof o.a === 'object' ? o.a : {}, cs: +o.cs || 0, cb: +o.cb || 0, seq: +o.seq || 0 };
  }
  const prevDay = d => new Date(Date.parse(d + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
  function trim(S) { const ks = Object.keys(S.a).sort((x, y) => (S.a[x].q || 0) - (S.a[y].q || 0)); ks.slice(0, Math.max(0, ks.length - KEEP)).forEach(k => { delete S.a[k]; }); Object.keys(S.h).sort().slice(0, -14).forEach(k => { delete S.h[k]; }); return S; }
  /** 오른/내린 답 남기기(문제마다 한 번). 그날 첫 문제면 연속 참여 +1 */
  function answer(S, c, ud, today) {
    S = load(S);
    if (S.a[c.id] || (ud !== 'up' && ud !== 'dn')) return S;
    const ok = ud === dir(c);
    S.seq += 1; S.a[c.id] = { d: today, ud, ok: ok ? 1 : 0, q: S.seq };
    S.n += 1; if (ok) S.ok += 1;
    S.cs = ok ? S.cs + 1 : 0; S.cb = Math.max(S.cb, S.cs);
    if (S.last !== today) { S.streak = S.last === prevDay(today) ? S.streak + 1 : 1; S.best = Math.max(S.best, S.streak); S.last = today; S.h[today] = { id: c.id, ok: ok ? 1 : 0 }; }
    return trim(S);
  }
  /** 금액 보기 답(선택) — 오차 % 기록. skip 이면 건너뜀 표시만 */
  function answerPrice(S, c, v, skip) {
    S = load(S); const a = S.a[c.id]; if (!a || a.v != null || a.sk) return S;
    if (skip) { a.sk = 1; return S; }
    a.v = +v; a.er = Math.round(Math.abs(+v / c.p - 1) * 1000) / 10; a.pk = +v === c.p ? 1 : 0;
    return S;
  }
  const mine = (S, c) => (S && S.a && c ? S.a[c.id] : null) || null;
  /** 시세 감각: {avg 최근 10문제 금액 오차 평균 %(금액 보기를 푼 문제만, 없으면 null), m 그 문제 수, cs 연속 정답, cb 최고 연속 정답, ok, n, streak} */
  function stats(S, today) {
    S = load(S);
    const ers = Object.keys(S.a).map(k => S.a[k]).filter(a => num(a.er)).sort((x, y) => (y.q || 0) - (x.q || 0)).slice(0, RECENT);
    const streak = S.last === today || S.last === prevDay(today) ? S.streak : 0;
    return { avg: ers.length ? Math.round(ers.reduce((s, a) => s + a.er, 0) / ers.length * 10) / 10 : null, m: ers.length, cs: S.cs, cb: S.cb, ok: S.ok, n: S.n, streak, best: S.best };
  }
  /** 보상 설계(켜지 않음): 연속 정답 need 번마다 브리핑 무료 days 일. on = QUIZ_REWARD_ENABLED && PAID_OPEN */
  function reward(S, on) { if (!on) return null; const cs = load(S).cs; return { need: REWARD.need, days: REWARD.days, have: cs % REWARD.need, due: cs > 0 && cs % REWARD.need === 0 }; }
  /** 오늘 고정한 문제 */
  function lockGet(raw, today) { let o = null; try { o = JSON.parse(raw || 'null'); } catch (e) { o = null; } if (!o || o.d !== today || !o.c) return null; const c = norm(o.c); return c ? { c, why: WHY[o.why] ? o.why : 'news' } : null; }
  const lockSet = (r, today) => JSON.stringify({ d: today, c: r.c, why: r.why });

  /* ---------- 이번 주 예측: 이 기기에 남긴 내 답 ---------- */
  function wLoad(raw) { let o = null; try { o = JSON.parse(raw || 'null'); } catch (e) { o = null; } o = o && typeof o === 'object' ? o : {}; return { p: o.p && typeof o.p === 'object' ? o.p : {}, s: o.s && typeof o.s === 'object' ? o.s : {} }; }
  function wSet(W, q, k, now) {
    W = wLoad(JSON.stringify(W || {}));
    if (!q || !q.id || !(q.opts || []).some(o => o.k === k)) return W;
    W.p[q.id] = { k, t: String(q.t || '').slice(0, 80), at: String(now || '').slice(0, 16) };
    const ks = Object.keys(W.p).sort((a, b) => String(W.p[a].at).localeCompare(String(W.p[b].at)));
    ks.slice(0, Math.max(0, ks.length - KEEP)).forEach(x => { delete W.p[x]; delete W.s[x]; });
    return W;
  }
  /** 서버(로그인) 답을 이 기기 기록에 합치기 */
  function wMerge(W, answers, wk) {
    W = wLoad(JSON.stringify(W || {}));
    const all = [].concat((wk && wk.open) || [], (wk && wk.wait) || [], (wk && wk.done) || []);
    (answers || []).forEach(a => { if (!a || !a.id) return; const q = all.find(x => x.id === a.id); if (!W.p[a.id] || W.p[a.id].k !== a.k) W.p[a.id] = { k: a.k, t: q ? String(q.t || '').slice(0, 80) : (W.p[a.id] || {}).t || '', at: (W.p[a.id] || {}).at || '' }; });
    return W;
  }
  /** 결과가 나온 내 답 → [{q, k, ok(true/false/null 무효), fresh(아직 안 본 결과)}] 최근 결과 순 */
  function wResults(W, wk) {
    W = wLoad(JSON.stringify(W || {}));
    return ((wk && wk.done) || []).filter(q => q && W.p[q.id]).map(q => {
      const k = W.p[q.id].k, v = q.st !== 'done' || q.ans == null;
      return { q, k, ok: v ? null : k === q.ans, fresh: !W.s[q.id] };
    }).sort((a, b) => String(b.q.rat || '').localeCompare(String(a.q.rat || '')));
  }
  function wSeen(W, ids) { W = wLoad(JSON.stringify(W || {})); (ids || []).forEach(id => { W.s[id] = 1; }); return W; }
  /** 공유 문장용 요약: 최근 7일 안에 결과가 나온 내 답(무효 빼고) → {n, ok, week(이번 주인지)} */
  function wSummary(W, wk, today) {
    const r = wResults(W, wk).filter(x => x.ok !== null), from = new Date(Date.parse(today + 'T00:00:00Z') - 7 * 86400000).toISOString().slice(0, 10);
    const wkR = r.filter(x => String(x.q.rat || '').slice(0, 10) >= from), use = wkR.length ? wkR : r.slice(0, 6);
    return { n: use.length, ok: use.filter(x => x.ok).length, week: !!wkR.length };
  }

  /* ---------- 글자 ---------- */
  function won(m) { m = Math.round(+m || 0); const e = Math.floor(m / 10000), r = m % 10000; if (e && r) return `${e}억 ${r.toLocaleString('ko-KR')}만 원`; if (e) return `${e}억 원`; return `${r.toLocaleString('ko-KR')}만 원`; }
  const md = d => { const s = String(d); return `${+s.slice(4, 6)}월 ${+s.slice(6, 8)}일`; };
  const ym = s => { s = String(s || ''); return s.length >= 6 ? `${s.slice(0, 4)}년 ${+s.slice(4, 6)}월` : ''; };
  /** 정답 한 줄: '직전보다 5,000만 원(2.0%) 올랐어요' */
  function diffLine(c) { const d = c.p - c.pp, pct = Math.abs(d / c.pp * 100); return `직전 거래보다 ${won(Math.abs(d))}(${pct.toFixed(1)}%) ${d > 0 ? '올랐어요' : '내렸어요'}`; }

  const API = { KEY, LOCK, WKEY, WHY, REWARD, hash, rng, norm, fromLegacy, fromG, poolOf, choose, pick, needG, findShared, shareRef, dir, choices, ai,
    load, answer, answerPrice, mine, stats, reward, lockGet, lockSet, prevDay, wLoad, wSet, wMerge, wResults, wSeen, wSummary, won, md, ym, diffLine };
  root.JDJ_QPICK = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
