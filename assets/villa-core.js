/* 내 집 시세 '빌라' 탭 계산 규칙 — 화면(assets/villa-view.js)·검증(tools/villa-tab-test.js)이 같이 쓴다.
   자료(비공개 엔진 scripts/villa.py·villa_hist.py·rent_site.py 가 국토교통부 연립·다세대 실거래로 만든 것):
     data/villa/index.json        {from, to, hm(있으면 매매 자료 첫 달), fill:{trade, rent}, bt(있으면 보유 기간별 검증), sido:[{n, g:[{c, n, b, z}]}]}
     data/villa/{구}.json         b = 건물 카드 {n 이름, d 동, j 지번, y 준공, t 유형, p 최근 거래가, a 전용, l 대지권, dt 계약일, pp 대지지분 평당가,
                                  tr 최근 3년 거래 [계약일, 금액, 전용, 대지권, 층](최대 10건), jr 전세가율, jl 최근 전세 계약, xy, sc(있으면 점수)}, dm 동 대지지분 평당가, dj·djl 동 전세가율
     data/villa/h/{구}.json       (다음 자료 갱신부터) {hm, to, ta:{'동|지번|이름': [계약일, 전용, 층, 금액, 직거래 1/0]…}, ds:{동: [1년 매매 수, ㎡당 중간값, 금액 중간값, 건물 수]}, dss:{동: [시작 칸, ㎡당…]}}
     data/rent/v/{구}.json        전월세 빌라(assets/rent-core.js 설명) — 같은 동·지번·이름 행이 이 건물
   금액 단위: 만원. 이 파일은 공개 자료를 읽어 보여 줄 숫자·문장만 만든다(가중치·임계값 없음). */
(function (root) {
  'use strict';
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);

  const keyOf = b => `${b.d}|${b.j}|${b.n || ''}`;
  /** 표시 이름: 이름이 없거나 '(179-19)'처럼 지번 꼴이면 '동 지번 빌라' */
  const nameOf = b => {
    const n = String(b.n || '').replace(/\([\d\-]+\)$/, '').trim();
    return n && !/^\(?[\d\-]+\)?$/.test(n) ? n : `${b.d} ${b.j} 빌라`;
  };
  function monthsFrom(a, b) { const m = M(), out = []; if (!a || !b) return out; for (let ym = String(a); ym <= String(b); ym = m.ymAdd(ym, 1)) out.push(ym); return out; }
  const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
  const ymOf = ymd => String(ymd).slice(0, 6);

  /* ---------- 검색: 건물 이름 · 지번 · 동 + 지번 ---------- */
  /** 지번 꼴 정리: ' 459 - 15 번지' → '459-15', '산 12' → '산12'. 지번 꼴이 아니면 '' */
  function jibunOf(s) {
    const t = String(s || '').replace(/\s+/g, '').replace(/번지$/, '').replace(/[‐-―−]/g, '-');
    return /^산?\d+(-\d+)?$/.test(t) ? t.replace(/(^|-|산)0+(?=\d)/g, '$1') : '';
  }
  /** 검색어 나누기: '망원동 459-15' → {dong:'망원동', jibun:'459-15', text:''}, '459' → {jibun:'459'}, '신원빌라' → {text} */
  function parseQ(q) {
    const s = String(q || '').trim(); if (!s) return { dong: '', jibun: '', text: '' };
    const m = s.match(/^(.*?[동가리])\s*(산?\s*\d+(?:\s*-\s*\d+)?)\s*(?:번지)?$/);
    if (m && jibunOf(m[2])) return { dong: m[1].replace(/\s+/g, ''), jibun: jibunOf(m[2]), text: '' };
    if (jibunOf(s)) return { dong: '', jibun: jibunOf(s), text: '' };
    return { dong: '', jibun: '', text: s };
  }
  /** 도로명 주소처럼 보이는지('월드컵로12길 34', '성미산로 17길 50-3') — 화면이 주소 찾기(카카오 지도)로 지번을 받아 다시 찾는다 */
  const isRoad = q => /[가-힣0-9]+(?:로|길)\s*\d*(?:번?\s*길)?\s+\d+(?:-\d+)?\s*$/.test(String(q || '').trim()) || /[가-힣](?:로|길)\d+(?:-\d+)?$/.test(String(q || '').replace(/\s+/g, ''));
  /** 동 이름 비교(신월5동 ↔ 신월동처럼 숫자 동 차이는 같게 봄) */
  const dongEq = (a, b) => { const f = x => String(x || '').replace(/\d+(동|가)$/, '$1'); return a === b || f(a) === f(b); };
  /** 한 구 안 건물 찾기 → 순위 낮을수록 먼저: 지번 정확히 0, 지번 앞부분 2, 이름 앞부분 1, 이름 포함 3. 같은 순위면 최근 3년 거래 많은 순 */
  function search(list, q, limit) {
    const p = parseQ(q), m = M(), out = [];
    if (!p.jibun && !m.normName(p.text)) return [];
    for (const b of list || []) {
      let r = -1;
      if (p.jibun) {
        if (p.dong && !dongEq(b.d, p.dong) && !String(b.d).startsWith(p.dong.replace(/동$/, ''))) continue;
        const j = jibunOf(b.j);
        r = j === p.jibun ? 0 : j.startsWith(p.jibun + '-') ? 2 : -1;
      } else {
        const a = m.matchName(nameOf(b), p.text), d = m.matchName(`${b.d} ${nameOf(b)}`, p.text);
        r = a >= 0 ? (a === 0 ? 1 : 3) : d >= 0 ? 3 : -1;
      }
      if (r >= 0) out.push([r, -((b.tr || []).length), b]);
    }
    out.sort((x, y) => x[0] - y[0] || x[1] - y[1] || nameOf(x[2]).localeCompare(nameOf(y[2]), 'ko'));
    return out.slice(0, limit || 12).map(x => x[2]);
  }
  function dongs(list) { return [...new Set((list || []).map(b => b.d))].sort((a, b) => a.localeCompare(b, 'ko')); }
  function inDong(list, d) { return (list || []).filter(b => b.d === d).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ko') || String(a.j).localeCompare(String(b.j), 'ko', { numeric: true })); }

  /* ---------- 매매 ---------- */
  /** 거래 목록(최신순). 전체 기간 자료(h.ta)가 있으면 그것(full=true), 없으면 카드의 최근 3년 거래(tr, 최대 10건) — 대지권은 tr 에서 같은 날·같은 금액으로 붙임
      → {full, list:[{ymd, date, area, floor, amt, direct(null=모름), land}]} */
  function tradesOf(b, h) {
    const land = new Map((b.tr || []).map(t => [`${String(t[0]).slice(0, 8)}|${t[1]}`, t[3] || null]));
    const ta = h && h.ta && h.ta[keyOf(b)];
    const fl = v => { const n = parseInt(v, 10); return isFinite(n) ? n : null; };
    const one = (ymd, amt, area, floor, direct) => {
      const s = String(ymd);
      return { ymd: s, date: `${s.slice(0, 4)}.${s.slice(4, 6)}${s.slice(6, 8) && s.slice(6, 8) !== '00' ? '.' + s.slice(6, 8) : ''}`, area: +area, floor: fl(floor), amt: +amt, direct, land: land.get(`${s.slice(0, 8)}|${amt}`) || null };
    };
    if (Array.isArray(ta) && ta.length) return { full: true, list: ta.map(t => one(t[0], t[3], t[1], t[2], t[4] === 1)) };
    return { full: false, list: (b.tr || []).map(t => one(t[0], t[1], t[2], t[4], null)) };
  }
  /** 신고가 표시: 그 전까지 같은 전용면적(소수 첫째 자리)에서 가장 높았던 값보다 비싼 거래(직거래 제외). 전체 기간 자료일 때만 — 일부 거래만으로는 표시하지 않음 */
  function markHighs(tr) {
    if (!tr || !tr.full) return tr;
    const best = {};
    [...tr.list].sort((a, b) => a.ymd.localeCompare(b.ymd)).forEach(t => {
      if (t.direct) return;
      const a = Math.round(t.area * 10) / 10;
      if (a in best && t.amt > best[a]) t.hi = true;
      best[a] = Math.max(best[a] || 0, t.amt);
    });
    return tr;
  }
  /** 대표 전용면적: 최근 3년 거래(없으면 전체) 전용의 중간값(소수 둘째 자리) */
  function repArea(b, tr, to) {
    const from = M().ymAdd(to, -35) + '01';
    const r = (tr ? tr.list : []).filter(t => t.ymd >= from).map(t => t.area);
    const a = med(r.length ? r : (tr ? tr.list.map(t => t.area) : []));
    return a ? Math.round(a * 100) / 100 : b.a;
  }
  /** 매매 시세 추이: 달마다 그 달까지 3개월 매매(직거래 제외)의 ㎡당 가격 중간값 × 대표 전용(100만 원 단위) → {months, s, cnt: Map} */
  function priceSeries(tr, months, area) {
    const by = {}, c = {};
    (tr ? tr.list : []).forEach(t => { const ym = ymOf(t.ymd); c[ym] = (c[ym] || 0) + 1; if (!t.direct && t.area > 0) (by[ym] = by[ym] || []).push(t.amt / t.area); });
    const s = months.map((ym, i) => { const pool = [].concat(...months.slice(Math.max(0, i - 2), i + 1).map(m => by[m] || [])); return pool.length ? Math.round(med(pool) * area / 100) * 100 : 0; });
    const cnt = new Map(); months.forEach(ym => cnt.set(ym, c[ym] || 0));
    return { months, s, cnt };
  }
  /** 마지막 값(최근 3개월 안) / 기간 제한 없는 마지막 값 */
  function latest(a, months) { for (let i = a.length - 1; i >= Math.max(0, a.length - 3); i--) if (a[i] > 0) return { v: a[i], at: months[i] }; return null; }
  function lastAny(a, months) { for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return { v: a[i], at: months[i] }; return null; }
  /** 최고가(직거래 제외): 전체 hi·최근 1년 hi1 → {amt, ymd, area} */
  function highs(tr, to) {
    const ok = (tr ? tr.list : []).filter(t => t.direct !== true);
    const top = a => a.length ? a.reduce((x, y) => (y.amt > x.amt ? y : x)) : null;
    const y1 = M().ymAdd(to, -11) + '01';
    return { hi: top(ok), hi1: top(ok.filter(t => t.ymd >= y1)) };
  }
  /** 최근 1년 매매 수(직거래 포함, 신고 건수 그대로) */
  const n12 = (tr, to) => { const y1 = M().ymAdd(to, -11) + '01'; return (tr ? tr.list : []).filter(t => t.ymd >= y1).length; };

  /* ---------- 동 ---------- */
  /** 동 요약: 다음 자료 갱신부터 h.ds(1년 매매 수·㎡당 중간값·금액 중간값·건물 수), 지금은 카드 파일의 대지지분 평당가(dm)·동 전세가율(djl)만
      → {n, ppm, price, nb, landPy:{m, c}, jr:{r, at, nj, ns}} (없는 칸은 null) */
  function dongSum(doc, h, d) {
    const s = h && h.ds && h.ds[d], dm = doc && doc.dm && doc.dm[d], jl = doc && doc.djl && doc.djl[d];
    if (!s && !dm && !jl) return null;
    return { n: s ? s[0] : null, ppm: s ? s[1] : null, price: s ? s[2] : null, nb: s ? s[3] : null,
      landPy: dm ? { m: dm.m, c: dm.c } : null, jr: jl ? { r: jl.r, at: jl.at, nj: jl.nj, ns: jl.ns } : null };
  }
  /** 동 시세 비교선(공용 차트 opts.gu 모양: 평당가 → 차트가 이 건물 전용으로 환산) — h.dss(㎡당, 기준 h.hm) */
  function dongLine(h, d, area) {
    const s = h && h.dss && h.dss[d]; if (!s || !h.hm || !h.to) return null;
    const months = monthsFrom(h.hm, h.to), n = months.length, a = new Array(n).fill(0);
    for (let k = 1; k < s.length; k++) { const i = s[0] + k - 1; if (i >= 0 && i < n) a[i] = +s[k] > 0 ? Math.round(s[k] * 3.3058 * 10) / 10 : 0; }
    return a.some(v => v > 0) ? { name: `${d} 빌라`, me: '이 건물', s: a, months, area } : null;
  }

  /* ---------- 전월세(rent/v) ---------- */
  /** 이 건물의 전월세 행(평형별): 동·지번·이름이 같은 행 */
  const rentRows = (doc, b) => ((doc && doc.units) || []).filter(u => u[0] === b.d && String(u[3]) === String(b.j) && (u[1] || '') === (b.n || ''));
  /** 계약 목록(모든 평형, 최신순) → {j: 전세, w: 월세} [{ymd, date, area, floor, dep, rent, ct, term, pre, preRent}] */
  function contracts(rows) {
    const R = root.JDJ_RENT || (typeof require === 'function' ? require('./rent-core.js') : null);
    const all = [].concat(...rows.map(u => R.deals(u))).sort((a, b) => String(b.ymd).localeCompare(String(a.ymd)) || b.dep - a.dep);
    return { j: all.filter(x => x.jeonse), w: all.filter(x => !x.jeonse) };
  }
  /** 차트 전세 선: 대표 전용에 가장 가까운 평형의 3개월 전세 보증금 중간값 ÷ 그 평형 전용 × 대표 전용(㎡당으로 맞춤) → 매매 months 에 맞춘 배열(없으면 null)
      rentDoc = rent/v/{구}.json(m0~to), hist = rent/v/h/{구}.json(rm~to, 있으면 더 긴 기간) */
  function jeonseLine(rows, rentDoc, hist, months, area) {
    const R = root.JDJ_RENT || (typeof require === 'function' ? require('./rent-core.js') : null);
    const ok = rows.filter(u => u[4] > 0).sort((x, y) => Math.abs(x[4] - area) - Math.abs(y[4] - area));
    if (!ok.length || !rentDoc) return null;
    const u = ok[0], f = area / u[4], mp = new Map();
    const hr = hist && R.histRow(hist, u), full = hr ? R.seriesFull(hr, hist) : null;
    if (full) full.months.forEach((ym, i) => { if (full.j[i] > 0) mp.set(ym, full.j[i]); });
    const t = R.series(u, rentDoc); t.months.forEach((ym, i) => { if (t.j[i] > 0) mp.set(ym, t.j[i]); });
    const a = months.map(ym => mp.has(ym) ? Math.round(mp.get(ym) * f / 100) * 100 : 0);
    return a.some(v => v > 0) ? { a, band: u[2], area: u[4] } : null;
  }

  /* ---------- 점수(미래가치) ---------- */
  /** 과거에 맞춰 본 결과가 통과한 보유 기간(villa/index.json bt) */
  const passed = ix => Object.keys((ix && ix.bt) || {}).filter(h => ix.bt[h] && ix.bt[h].status === 'pass').sort((a, b) => a - b);
  /** 점수 칸 머리 문장 — 통과한 기간이 없으면 '점수 준비 중'(날짜 약속 없음) */
  function scoreHead(ix, b) {
    const ps = passed(ix).filter(h => b && b.sc && b.sc[h] != null);
    if (ps.length) return { ok: true, hs: ps };
    const filling = !!(ix && ix.fill && (ix.fill.trade || ix.fill.rent));
    return { ok: false, text: filling ? '점수 준비 중 — 집코드는 예전 빌라 기록을 채우는 중이에요. 자료가 다 모이면 과거 자료와 맞춰 본 뒤 자동으로 점수가 나와요.'
      : '점수 준비 중 — 집코드는 빌라 점수를 과거 자료와 맞춰 보는 중이에요. 잘 맞은 보유 기간이 확인되면 자동으로 점수가 나와요.' };
  }
  /** 예전 기록 채우는 중(한 줄, 날짜 약속 없음) — 다 채우면 index.fill 이 false 가 되어 자동으로 사라짐 */
  const fillNote = ix => !!(ix && ix.fill && (ix.fill.trade || ix.fill.rent));

  const API = { keyOf, nameOf, monthsFrom, jibunOf, parseQ, isRoad, dongEq, search, dongs, inDong, tradesOf, markHighs, repArea, priceSeries, latest, lastAny,
    highs, n12, dongSum, dongLine, rentRows, contracts, jeonseLine, passed, scoreHead, fillNote };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_VILLA = API;
})(typeof self !== 'undefined' ? self : this);
