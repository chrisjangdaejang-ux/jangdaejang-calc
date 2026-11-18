/* 장대장 '내 집 시세' 공통 로직 — mine/ 화면과 tools/mine-test.js 가 함께 쓴다.
   자료: /jangdaejang-data/data/sNN.json 의 units (assets/rec-core.js 설명과 같음)
     u = [시군구코드, 동, 단지, 평형대, 전용㎡(중앙값), 자료 기간 거래수, 월별 평당가 36개, 월별 거래수 문자열, 지번, fx]
     · 월별 평당가: 그 달까지 3개월 실거래 평당가(만원/3.3㎡)의 중앙값 — 해제(취소) 신고 거래·직거래는 원자료 단계에서 제외
     · 월별 거래수 문자열: 한 글자 = 한 달 거래 건수 (글자 코드 − 48)
   여기서 하는 계산은 단순 집계(중앙값·최저·최고·합계·변동률)와 단위 환산뿐이며, 화면에는 계산 근거를 함께 보여 준다.
   미래가치 점수(fx.fv)는 공개 자료에 있는 값을 그대로 쓰고, 계산식·가중치는 다루지 않는다. */
(function (root) {
  'use strict';
  const PY = 3.3058;
  const r100 = m => Math.round(m / 100) * 100;
  const STORE_KEY = 'jdj_myhome';
  const MAX_HOMES = 5;

  /* ---------- 기본 ---------- */
  function counts(cnt) { const out = []; for (const ch of String(cnt || '')) out.push(Math.max(0, ch.charCodeAt(0) - 48)); return out; }
  /** 마지막 실거래 평당가 위치(최근 3개월 안), 없으면 -1 */
  function lastIdx(arr) { for (let i = arr.length - 1; i >= Math.max(0, arr.length - 3); i--) if (arr[i] > 0) return i; return -1; }
  function median(a) {
    const v = a.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y), n = v.length;
    if (!n) return 0; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  }
  /** 평당가(만원/3.3㎡) × 전용㎡ → 금액(만원, 100만 원 단위) */
  const toPrice = (ppy, area) => (ppy > 0 && area > 0) ? r100(ppy * area / PY) : 0;
  const ymLabel = ym => ym ? `${String(ym).slice(0, 4)}.${String(ym).slice(4, 6)}` : '';
  const danjiKey = u => [u[0], u[1], u[8], u[2]].join('|');                 // 시군구|동|지번|단지
  const agentKey = u => [u[0], u[1], u[2]].join('|');                       // 제휴 중개사 매물 단지 키(리포트와 같음)
  /** 프리미엄 리포트 단지 키 — assets/pay.js 의 JDJ_PAY.keyOf 와 같은 형식 (시도id~구코드~동~단지~평형) */
  const premiumKey = p => [p.sd, p.code, p.dong, p.apt, p.band].map(v => encodeURIComponent(v).replace(/~/g, '%7E').replace(/!/g, '%21')).join('~');

  /** 같은 단지(구·동·지번·이름)의 평형들을 묶는다. 평형은 전용면적 순 */
  function groupDanji(units) {
    const m = new Map();
    for (const u of units) {
      const k = danjiKey(u);
      let d = m.get(k);
      if (!d) { d = { key: k, code: u[0], dong: u[1], apt: u[2], jibun: u[8], bands: [], n: 0 }; m.set(k, d); }
      d.bands.push(u); d.n += u[5] || 0;
    }
    for (const d of m.values()) d.bands.sort((a, b) => a[4] - b[4]);
    return m;
  }
  /** 단지 이름 검색: 공백 무시·포함 검색, 거래 많은 단지 먼저 */
  function searchDanji(groups, q, limit) {
    const norm = s => String(s || '').replace(/\s+/g, '').toLowerCase();
    const t = norm(q); if (t.length < 1) return [];
    const out = [];
    for (const d of groups.values()) {
      const n = norm(d.apt), pos = n.indexOf(t);
      if (pos >= 0) out.push([pos === 0 ? 0 : 1, -d.n, d]);
    }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].apt.localeCompare(b[2].apt, 'ko'));
    return out.slice(0, limit || 20).map(x => x[2]);
  }

  /* ---------- 한 평형 요약 ---------- */
  /** months: index.json 의 months(YYYYMM 36개) */
  function bandSummary(u, months) {
    const s = u[6], c = counts(u[7]), area = u[4], n = s.length;
    const li = lastIdx(s), ppy = li >= 0 ? s[li] : 0;
    const r3 = c.slice(-3).reduce((a, b) => a + b, 0);
    const y1 = s.slice(-12).filter(v => v > 0);
    const lo = y1.length ? Math.min(...y1) : 0, hi = y1.length ? Math.max(...y1) : 0;
    const cnt12 = c.slice(-12).reduce((a, b) => a + b, 0);
    return {
      band: u[3], area, ppy, price: toPrice(ppy, area),
      at: li >= 0 ? months[li] : '', stale: li >= 0 && li < n - 1,        // 마지막 달에 거래가 없어 앞 달 값을 쓴 경우
      recent3: r3, cnt12, total: u[5],
      range: { lo: toPrice(lo, area), hi: toPrice(hi, area), loPpy: lo, hiPpy: hi, months: y1.length },
      ch1: changeBack(s, months, 12), ch3: changeBack(s, months, n - 1)
    };
  }
  /** 마지막 실거래 평당가와 back 개월 전 평당가 비교. 그달 값이 없으면 null(추정으로 메우지 않음) */
  function changeBack(s, months, back) {
    const li = lastIdx(s); if (li < 0) return null;
    const bi = li - back; if (bi < 0) return null;
    let j = bi; if (!(s[j] > 0)) { j = -1; for (let k = bi; k <= Math.min(bi + 2, li - 1); k++) if (s[k] > 0) { j = k; break; } }
    if (j < 0 || !(s[j] > 0)) return null;
    return { from: s[j], to: s[li], fromAt: months[j], toAt: months[li], pct: (s[li] - s[j]) / s[j], months: li - j };
  }

  /* ---------- 같은 동·구 대비 ---------- */
  /** 같은 동(같은 구) 안의 단지·평형 최근 평당가 중앙값과 비교. sameBand=true 면 같은 평형대만(3개 이상일 때) */
  function dongPosition(units, u) {
    const pick = (fn) => units.filter(x => x[0] === u[0] && x[1] === u[1] && fn(x)).map(x => ({ u: x, p: x[6][lastIdx(x[6])] || 0 })).filter(x => x.p > 0);
    let pool = pick(x => x[3] === u[3]), sameBand = true;
    if (pool.length < 3) { pool = pick(() => true); sameBand = false; }
    const me = u[6][lastIdx(u[6])] || 0;
    if (!me || pool.length < 2) return null;
    const med = median(pool.map(x => x.p));
    const sorted = pool.map(x => x.p).sort((a, b) => b - a);
    const rank = sorted.findIndex(p => p <= me) + 1;
    const danji = new Set(pool.map(x => danjiKey(x.u))).size;
    return { med: Math.round(med), me, diff: (me - med) / med, rank, n: pool.length, danji, sameBand };
  }
  /** 같은 구 전체 아파트 3개월 중앙 평당가(index.json sgg.s, 공개 집계)와 비교 */
  function sggPosition(sgg, u, months) {
    if (!sgg || !sgg.s) return null;
    const li = lastIdx(u[6]); if (li < 0) return null;
    const g = sgg.s[li]; if (!(g > 0)) return null;
    return { sggPpy: g, me: u[6][li], diff: (u[6][li] - g) / g, at: months[li] };
  }

  /* ---------- 추이 (차트용) ---------- */
  /** span 개월(12·36) 구간: 단지 평당가·구 평당가·단지 거래 건수·구 거래 건수 */
  function trend(u, sgg, months, span) {
    const n = months.length, st = Math.max(0, n - span);
    const c = counts(u[7]);
    return {
      months: months.slice(st), ppy: u[6].slice(st), sgg: sgg && sgg.s ? sgg.s.slice(st) : [],
      cnt: c.slice(st), sggCnt: sgg && sgg.c ? sgg.c.slice(st) : []
    };
  }
  /** 거래량: 최근 12개월 합 vs 그 전 12개월 합 */
  function volume(u) { return volumeCounts(counts(u[7])); }
  /** 월별 건수 배열 → 최근 12개월 합 vs 그 전 12개월 합 (구 전체 건수 index.json sgg.c 에도 씀) */
  function volumeCounts(c) {
    c = (c || []).map(v => +v || 0); const n = c.length, sum = a => a.reduce((x, y) => x + y, 0);
    const a = sum(c.slice(Math.max(0, n - 12))), b = n >= 24 ? sum(c.slice(n - 24, n - 12)) : null;
    return { last12: a, prev12: b, pct: (b && b > 0) ? (a - b) / b : null };
  }

  /* ---------- 내 집 (브라우저 저장) ---------- */
  const okYm = v => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || ''));
  function cleanHome(h) {
    if (!h || typeof h !== 'object') return null;
    const o = { sd: String(h.sd || ''), code: String(h.code || ''), dong: String(h.dong || ''), jibun: String(h.jibun || ''), apt: String(h.apt || ''), band: String(h.band || '') };
    if (!/^s\d{2}$/.test(o.sd) || !/^\d{5}$/.test(o.code) || !o.apt || !o.band || o.apt.length > 80) return null;
    const bp = Math.round(+h.bp);
    o.bp = (isFinite(bp) && bp > 0 && bp < 10000000) ? bp : null;          // 매수가(만원)
    o.bd = okYm(h.bd) ? h.bd : '';                                          // 매수 연월 YYYY-MM
    o.t = String(h.t || '').slice(0, 10);                                   // 저장한 날
    return o;
  }
  const homeId = h => [h.code, h.dong, h.jibun, h.apt, h.band].join('|');
  function parseStore(raw) {
    try {
      const j = JSON.parse(raw || 'null'); const arr = j && Array.isArray(j.list) ? j.list : [];
      const seen = new Set(), out = [];
      for (const x of arr) { const h = cleanHome(x); if (!h || seen.has(homeId(h))) continue; seen.add(homeId(h)); out.push(h); if (out.length >= MAX_HOMES) break; }
      return out;
    } catch (e) { return []; }
  }
  const dumpStore = list => JSON.stringify({ v: 1, list: list.slice(0, MAX_HOMES) });
  /** 추가(같은 집이면 바꿔 넣고 맨 앞으로). 가득 찼으면 {ok:false, full:true} */
  function addHome(list, h) {
    const c = cleanHome(h); if (!c) return { ok: false, list };
    const rest = list.filter(x => homeId(x) !== homeId(c));
    if (rest.length === list.length && list.length >= MAX_HOMES) return { ok: false, full: true, list };
    return { ok: true, list: [c, ...rest].slice(0, MAX_HOMES) };
  }
  const removeHome = (list, id) => list.filter(x => homeId(x) !== id);
  function findUnit(units, h) { return units.find(u => u[0] === h.code && u[1] === h.dong && u[8] === h.jibun && u[2] === h.apt && u[3] === h.band) || null; }
  /** 매수가 대비 변동 (최근 시세 환산 − 매수가) */
  function vsBuy(price, bp) { if (!(price > 0) || !(bp > 0)) return null; return { diff: price - bp, pct: (price - bp) / bp }; }
  /** 보유 기간(개월): 매수 연월 → 기준 연월(YYYYMM) */
  function heldMonths(bd, ym) { if (!okYm(bd) || !/^\d{6}$/.test(String(ym || ''))) return null; const a = +bd.slice(0, 4) * 12 + +bd.slice(5, 7), b = +String(ym).slice(0, 4) * 12 + +String(ym).slice(4, 6); return b - a >= 0 ? b - a : null; }

  /* ---------- 미래가치 근거 요약 (리포트와 같은 문구 체계, 2년 기준) ---------- */
  function reasons(f, x) {
    const r = []; if (!f) return r;
    const pct = v => Math.round(Math.abs(v) * 100);
    const Y = x.year || new Date().getFullYear();
    if (f.fv != null) r.push(f.gs != null
      ? `미래가치 ${f.fv}점 — ${x.sido} 전체 단지 중 상위 ${Math.max(1, 100 - f.fv)}%` + (f.fvg != null ? `, ${x.sgg} 안에서는 상위 ${Math.max(1, 100 - f.fvg)}%` : '') + ' (실제 이후 시세로 채점해 검증한 점수)'
      : `미래가치 ${f.fv}점 — ${x.sgg} 단지 중 상위 ${Math.max(1, 100 - f.fv)}% (실제 이후 시세로 채점해 검증한 점수)`);
    const w = f.why && (f.why['2'] || null);
    if (w && w.length) {
      const lb = k => (x.label && x.label[k]) || k, U = a => [...new Set(a)];
      const up = U(w.filter(t => t.endsWith('+')).map(t => lb(t.slice(0, -1)))), dn = U(w.filter(t => t.endsWith('-')).map(t => lb(t.slice(0, -1)))).filter(v => !up.includes(v));
      if (up.length || dn.length) r.push('2년 예측에서 점수를 움직인 요인 — ' + (up.length ? `올린 요인: ${up.join(' · ')}` : '') + (up.length && dn.length ? ' / ' : '') + (dn.length ? `내린 요인: ${dn.join(' · ')}` : ''));
    }
    if (f.dd != null && Math.abs(f.dd) >= 0.03) r.push(f.dd > 0 ? `최근 3년 하락 구간에서 구 평균보다 ${pct(f.dd)}%p 덜 빠짐 — 집값이 흔들릴 때 잘 버틴 단지` : `최근 3년 하락 구간에서 구 평균보다 ${pct(f.dd)}%p 더 빠짐 — 시장 따라 출렁임이 큰 편`);
    /* 고점 회복(rc)은 공개 값이 비율(예: 0.966)로 보여 '구 평균 대비 %p' 문구와 맞지 않아 이 화면에서는 싣지 않는다 */
    if (f.by || f.hh) {
      const age = f.by ? Y - f.by : null, parts = [], tags = [];
      if (f.by) parts.push(`${f.by}년 준공(${age}년차)`); if (f.hh) parts.push(`${f.hh.toLocaleString()}세대`);
      if (age != null && age <= 10) tags.push('신축');
      if (age != null && age >= 30) tags.push('재건축 연한(30년) 도래'); else if (age != null && age >= 25) tags.push(`${30 - age}년 뒤 재건축 연한(30년) 도래`);
      if (f.hh >= 1000) tags.push('대단지'); else if (f.hh && f.hh < 300) tags.push('소규모 단지');
      r.push(parts.join(' · ') + (tags.length ? ' — ' + tags.join(' · ') : ''));
    }
    if (f.lg != null) {
      if ((f.ln && f.ln === x.apt) || f.lg >= 0.995) r.push(`${x.dong} 대장 단지 — 같은 평형끼리 비교해 동에서 가장 비싸게 거래되는 단지`);
      else r.push(`${x.dong} 대장 단지(${f.ln || '-'})보다 같은 평형 기준 ${pct(1 - f.lg)}% 낮은 시세`);
    }
    if (f.sch != null) { const p = Math.round(f.sch * 1000) / 10; r.push(`학군: 가까운 중학교${f.schn ? `(${f.schn.join('·')})` : ''} 순전입률 ${p >= 0 ? '+' : ''}${p}%` + (p >= 3 ? ' — 전입이 전출보다 뚜렷이 많은 곳' : p <= -3 ? ' — 전출이 더 많은 편' : ' — 전입·전출 비슷')); }
    if (f.sub != null) r.push(f.sub >= 30 ? '지하철역이 걸어가기엔 먼 편(도보 20분 이상) — 버스·자차 위주 생활권' : `${f.subs ? f.subs.replace(/\s+/g, ' ') : '지하철역'}까지 도보 ${f.sub <= 5 ? '5분 이내' : f.sub + '분 이내'}` + (f.sub <= 10 ? ' — 역세권' : ''));
    return r;
  }

  /* ---------- 표시 ---------- */
  /** 만원 → '12억 3,400만원' */
  function won(man) {
    man = Math.round(+man || 0); const neg = man < 0; man = Math.abs(man);
    const e = Math.floor(man / 10000), r = man % 10000;
    const s = (e ? e.toLocaleString('ko-KR') + '억' : '') + (r ? (e ? ' ' : '') + r.toLocaleString('ko-KR') + '만' : '') + '원';
    return (neg ? '-' : '') + (man ? s : '0원');
  }
  const pctTxt = (v, d) => v == null ? '-' : (v > 0 ? '+' : '') + (v * 100).toFixed(d == null ? 1 : d) + '%';

  const API = { PY, r100, STORE_KEY, MAX_HOMES, counts, lastIdx, median, toPrice, ymLabel, danjiKey, agentKey, premiumKey, groupDanji, searchDanji,
    bandSummary, changeBack, dongPosition, sggPosition, trend, volume, volumeCounts, cleanHome, homeId, parseStore, dumpStore, addHome, removeHome, findUnit, vsBuy, heldMonths, reasons, won, pctTxt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_MINE = API;
})(typeof self !== 'undefined' ? self : this);
