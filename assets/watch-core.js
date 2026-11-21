/* 관심 목록(주식 앱의 관심종목처럼) — 계산만, 화면 없음. 화면(assets/watch.js·my/watch/)과 테스트(tools/watch-test.js)가 함께 쓴다.
   - 관심 항목 = 단지·평형 {sd 시·도 자료 id, code 구 코드, dong, jibun, apt, band, t 넣은 날} — 카카오 계정 저장 자료의 '관심 단지(favs)'와 같은 모양.
   - 자료(모두 공개 자료, 숫자를 새로 만들지 않음):
       today/g/{구}.json (엔진 scripts/today_feed.py, 하루 4번) rows = 어제·오늘 우리 공개 자료에 처음 보인 거래(신고가 hi·이전 최고가 pm,
         최근 2년 최고가 대비 dr·m2, 직거래 x, 특수 거래 의심 sus — 모닝 브리핑과 같은 기준), u·u0 = 단지·평형별 [미래가치 점수, 시·도 안 등수, 전세가율 %] 지금·어제
       price/{구}.json units[11] 개별 거래(지난 방문 뒤 새로 보인 거래를 찾을 때)
   - '지난 방문' 비교는 이 기기에 남긴 기록(snap)과 비교한다. 기록은 1시간이 지나야 새로 바꿔(새로 고침해도 바로 사라지지 않게) 기록 시각을 화면에 밝힌다.
   window.JDJ_WATCH_CORE */
(function (root) {
  'use strict';
  const KEY = 'jdj_watch', SNAP = 'jdj_watch_snap', SEEN = 'jdj_watch_seen', MAX = 30;
  const DROP = -10;                         // 큰 하락: 최근 2년 최고가보다 10% 이상 낮은 거래(모닝 브리핑 B.DROP 과 같음)
  const ROLL_MS = 3600 * 1000;              // 지난 방문 기록을 새로 바꾸는 간격
  const SD = /^[0-9A-Za-z_-]{1,12}$/, CODE = /^\d{5}$/;
  const txt = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);

  /** 저장해도 되는 항목만(서버 cleanPlace 와 같은 칸·같은 규칙) */
  function clean(p) {
    if (!p || typeof p !== 'object') return null;
    const o = { sd: txt(p.sd, 12), code: txt(p.code, 5), dong: txt(p.dong, 30), jibun: txt(p.jibun, 30), apt: txt(p.apt, 60), band: txt(p.band, 20), t: /^\d{4}-\d{2}-\d{2}$/.test(String(p.t || '')) ? String(p.t) : '' };
    return SD.test(o.sd) && CODE.test(o.code) && o.apt && o.band ? o : null;
  }
  const idOf = p => [p.code, p.dong, p.jibun || '', p.apt, p.band].join('|');     // auth.js placeId 와 같음
  const rowKey = p => [p.dong, p.jibun || '', p.apt, p.band].join('|');           // today/g 의 u 키·줄 맞추기
  function uniq(list) { const s = {}; return list.filter(x => { const k = idOf(x); if (s[k]) return false; s[k] = 1; return true; }); }
  function parse(raw) {
    let a = null; try { a = JSON.parse(raw || '[]'); } catch (e) { a = []; }
    return uniq((Array.isArray(a) ? a : []).map(clean).filter(Boolean)).slice(0, MAX);
  }
  const dump = list => JSON.stringify((list || []).map(clean).filter(Boolean).slice(0, MAX));
  const has = (list, p) => (list || []).some(x => idOf(x) === idOf(p));
  /** 넣기·빼기 → {list, added}. 꽉 찼으면 full:true(넣지 않음) */
  function toggle(list, p, today) {
    list = (list || []).slice();
    if (has(list, p)) return { list: list.filter(x => idOf(x) !== idOf(p)), added: false };
    const c = clean(Object.assign({}, p, { t: today || p.t }));
    if (!c) return { list, added: false };
    if (list.length >= MAX) return { list, added: false, full: true };
    list.unshift(c);
    return { list, added: true };
  }
  /** 이 기기 목록 + 계정 목록 합치기(이 기기 먼저, 같은 항목은 한 번) */
  const merge = (local, server) => uniq((local || []).concat(server || []).map(clean).filter(Boolean)).slice(0, MAX);

  /* ---------- 거래 ---------- */
  const tsig = r => [r.dt, r.ar, r.f, r.p].join('|');
  /** 이 항목의 어제·오늘 새 거래(today/g rows) */
  const rowsFor = (p, G) => ((G && G.rows) || []).filter(r => r.d === p.dong && (r.j || '') === (p.jibun || '') && r.a === p.apt && r.b === p.band);
  /** 공개 개별 거래 목록 → [{dt, ar, f, p, x, hi}] (최신순 그대로) */
  const unitTrades = u => (Array.isArray(u && u[11]) ? u[11] : []).map(x => ({ dt: x[0], ar: x[1], f: x[2], p: x[3], x: x[4] === 1 ? 1 : 0, hi: x[5] === 1 ? 1 : 0 }));
  const isDrop = r => r && r.dr != null && r.dr <= DROP;

  /** 지금 상태 기록: {at(ms), day, sig(최근 거래 서명 40개), fv, fvr, jr} */
  function snap(p, unit, G, now) {
    const v = ((G && G.u) || {})[rowKey(p)] || [];
    const tr = unitTrades(unit).slice(0, 40).map(tsig);
    const rs = rowsFor(p, G).map(tsig).filter(s => tr.indexOf(s) < 0);
    return { at: +now, sig: rs.concat(tr).slice(0, 60), fv: v[0] == null ? null : v[0], fvr: v[1] == null ? null : v[1], jr: v[2] == null ? null : v[2], has: !!unit };
  }
  /** 바뀐 숫자 {from, to} — 둘 다 있고 다를 때만 */
  const chg = (a, b) => (a != null && b != null && a !== b) ? { from: a, to: b } : null;

  /** 항목 하나의 변화
      yday: 어제·오늘 우리 공개 자료에 처음 보인 거래(trades·hi·drop) + 어제 대비 순위·전세가율(엔진 u0 → u)
      visit: 지난 방문 기록(prev) 대비 — 새로 보인 거래(공개 개별 거래 목록 + 어제·오늘 줄), 순위·전세가율. prev 없으면 null
      n: 새 소식 수(새 거래 + 순위 변화 + 전세가율 변화, 두 비교에서 겹치는 거래는 한 번) */
  function diff(p, o) {
    o = o || {};
    const G = o.g || null, k = rowKey(p), u = ((G && G.u) || {})[k] || null, u0 = ((G && G.u0) || {})[k] || null;
    const rows = rowsFor(p, G);
    const yday = { trades: rows, hi: rows.filter(r => r.hi), drop: rows.filter(isDrop),
      rank: u && u0 ? chg(u0[1], u[1]) : null, jr: u && u0 ? chg(u0[2], u[2]) : null, d0: (G && G.d0) || '' };
    let visit = null;
    const P = o.prev;
    if (P) {
      /* 비교할 목록: 공개 개별 거래 목록(있으면) — 없으면 어제·오늘 줄. 지난 기록에 있던 거래(같은 서명은 개수까지)는 빼고,
         지난 기록의 가장 오래된 계약일보다 앞선 거래는 판단할 수 없으니 뺀다(기록은 최근 거래 60개까지만 남김) */
      const left = {}; (P.sig || []).forEach(s => { left[s] = (left[s] || 0) + 1; });
      const lo = (P.sig || []).reduce((m, s) => Math.min(m, +String(s).split('|')[0] || m), Infinity);
      const byRow = {}; rows.forEach(r => { byRow[tsig(r)] = r; });
      const pool = o.unit ? unitTrades(o.unit) : rows, fresh = [];
      pool.forEach(t => {
        const s = tsig(t);
        if (left[s] > 0) { left[s]--; return; }
        if (isFinite(lo) && t.dt < lo) return;
        fresh.push(Object.assign({}, t, byRow[s] || {}));
      });
      visit = { at: P.at, trades: fresh, hi: fresh.filter(t => t.hi), drop: fresh.filter(isDrop),
        rank: chg(P.fvr, u ? u[1] : null), jr: chg(P.jr, u ? u[2] : null), fv: chg(P.fv, u ? u[0] : null) };
    }
    const tset = {}; yday.trades.concat(visit ? visit.trades : []).forEach(t => { tset[tsig(t)] = 1; });
    const n = Object.keys(tset).length + ((yday.rank || (visit && visit.rank)) ? 1 : 0) + ((yday.jr || (visit && visit.jr)) ? 1 : 0);
    return { yday, visit, n, now: u ? { fv: u[0], fvr: u[1], jr: u[2] } : null };
  }
  /** 기록을 새로 바꿀지: 기록이 없거나 1시간 지났으면 */
  const shouldRoll = (P, now) => !P || !(P.at > 0) || (+now - P.at) >= ROLL_MS;

  /** 머리줄·첫 화면 배지 수: 관심 항목들의 어제·오늘 새 거래 중 아직 관심 목록 화면에서 보지 않은 것(seen = 본 거래 서명 목록) */
  function badge(list, gfiles, seen) {
    const S = {}; (seen || []).forEach(s => { S[s] = 1; });
    let n = 0;
    (list || []).forEach(p => rowsFor(p, (gfiles || {})[p.code]).forEach(r => { if (!S[idOf(p) + '#' + tsig(r)]) n++; }));
    return n;
  }
  /** 관심 목록 화면을 본 뒤 '본 거래'로 남길 서명(최대 500) */
  function seenSigs(list, gfiles) {
    const out = [];
    (list || []).forEach(p => rowsFor(p, (gfiles || {})[p.code]).forEach(r => out.push(idOf(p) + '#' + tsig(r))));
    return out.slice(0, 500);
  }
  /** 브리핑 ③ 관심 단지 이름 합치기: 이미 있던 이름은 그대로 앞에, 관심 목록 이름은 뒤에(같은 이름 한 번). removed = 관심 목록에서 뺀 이름 중 우리가 넣었던 것 */
  function briefApts(cur, watchNames, added, removed) {
    const keep = (cur || []).filter(a => !(removed || []).includes(a) || !(added || []).includes(a));
    const out = keep.slice();
    (watchNames || []).forEach(a => { if (a && !out.includes(a)) out.push(String(a).slice(0, 40)); });
    return out.slice(0, 30);
  }
  /** 관심 항목이 브리핑 ③ 에 들어가는지: areas(구독 관심 지역) 안 + 요금제 관심 단지 수(lim) 안 */
  function briefFit(p, brief, lim) {
    const areas = (brief && brief.areas) || [], apts = (brief && brief.apts) || [];
    const inArea = areas.some(a => a.g === p.code && (!a.dn || a.dn === p.dong));
    const i = apts.indexOf(p.apt);
    return { inArea, inList: i >= 0 && i < (lim || 0), listed: i >= 0 };
  }

  const API = { KEY, SNAP, SEEN, MAX, DROP, ROLL_MS, clean, idOf, rowKey, parse, dump, has, toggle, merge, tsig, rowsFor, unitTrades, isDrop, snap, diff, shouldRoll, badge, seenSigs, briefApts, briefFit };
  root.JDJ_WATCH_CORE = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
