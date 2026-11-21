/* 집코드 지도 '지역 분석' 계산 — 화면(map/)과 tools/region-test.js 가 함께 쓴다. 지도 엔진과 상관없는 순수 계산만.
   자료(모두 공개):
     region/sNN.json (엔진 region_pulse.py): gu[구] = { s: [시작 연월, 매매 평당가…], j: [시작 연월, 전세 평당가…],
        sup: [1년 안, 1~2년, 2~3년 입주 예정 세대, 단지 수], uns: [최근, 1년 전, 묶인 구 수], dev: {재개발, 재건축, 주거환경개선},
        out: [외지인 매입 %, 1년 전 %], ix: {ms/mj: [시작 연월, 지수…], ws/wj: [[시점…], [지수…]]} }, used: {지표: 참·거짓}, src
     index.json sgg[구]: c(최근 36개월 거래 건수), r.jr(전세가율 %), r.eb(지금 구간)
     evidence.json: region.sido[시·도][지표][구간 0~4] = {n, ex, hit} (과거 구 사례: 이후 2년 같은 시·도 평균 대비), sido[시·도].stg(재건축 단계 단지)
   원칙: 값은 자료를 그대로 나누기·빼기만(증감률 = 나중 ÷ 처음 − 1). 자료가 없으면 빈칸. 과거 성적은 evidence.json 에 있는 것만 문장으로.
   window.JDJ_REGC */
(function (root) {
  'use strict';

  const IND = [
    { id: 'price', t: '가격 변화', d: '구 전체 아파트 평당가(실거래 중간값)가 고른 기간에 얼마나 변했는지' },
    { id: 'vol', t: '거래량', d: '최근 1년 아파트 매매 건수와 그 전 1년 대비 증감' },
    { id: 'sup', t: '입주 예정', d: '앞으로 3년 안에 입주할 예정인 아파트 세대(분양 공고 기준)' },
    { id: 'uns', t: '미분양', d: '분양하고 아직 안 팔린 집' },
    { id: 'jr', t: '전세가율', d: '집값 대비 전셋값 비율' },
    { id: 'out', t: '외지인 매입', d: '아파트를 산 사람 중 다른 시·군·구에 사는 사람 비율' },
    { id: 'dev', t: '정비사업', d: '재개발·재건축·주거환경개선 구역 수' }
  ];
  const PERIODS = [{ id: '1y', t: '1년', m: 12 }, { id: '3y', t: '3년', m: 36 }, { id: '5y', t: '5년', m: 60 }, { id: '10y', t: '10년', m: 120 }, { id: 'all', t: '전체', m: 0 }];
  const FEW = 20;           // 최근 3개월 거래가 이보다 적으면 '거래 적음'(중간값이 몇 건에 흔들림) — 화면 표시 기준
  const COL = { up: '#E5484D', dn: '#2F6BFF', flat: '#6B7684', few: '#B0B8C1', seq: '#6D4AFF', na: '#B0B8C1', sale: '#6D4AFF', jeon: '#0E8A7A' };

  /* ---------- 연월 ---------- */
  function ymAdd(ym, n) { let y = +String(ym).slice(0, 4), m = +String(ym).slice(4, 6) + n; while (m > 12) { y++; m -= 12; } while (m < 1) { y--; m += 12; } return y + String(m).padStart(2, '0'); }
  function ymDiff(a, b) { return (+String(b).slice(0, 4) - +String(a).slice(0, 4)) * 12 + (+String(b).slice(4, 6) - +String(a).slice(4, 6)); }
  const ymDot = ym => ym ? String(ym).slice(0, 4) + '.' + (+String(ym).slice(4, 6)) : '';

  /* ---------- 시계열 [시작 연월, 값…] ---------- */
  /** → [{ym, v}] (값 0·null = 그 달 자료 없음 → 뺌) */
  function points(ser) {
    if (!Array.isArray(ser) || ser.length < 2) return [];
    const out = [];
    for (let i = 1; i < ser.length; i++) if (ser[i] > 0) out.push({ ym: ymAdd(ser[0], i - 1), v: ser[i] });
    return out;
  }
  const at = (pts, ym) => { const p = pts.find(x => x.ym === ym); return p ? p.v : null; };
  /** 기간 증감: 마지막 값과 그 m개월 전 값(m=0 → 처음 값). 그 달 값이 없으면 null(앞뒤 달로 메우지 않음)
      → {pct(%), a(처음), b(마지막), from, to} | null */
  function change(ser, m) {
    const p = points(ser); if (p.length < 2) return null;
    const last = p[p.length - 1], from = m ? ymAdd(last.ym, -m) : p[0].ym, a = at(p, from);
    if (!(a > 0)) return null;
    return { pct: (last.v / a - 1) * 100, a, b: last.v, from, to: last.ym };
  }
  /** 기간 안의 점들(그래프용). m=0 → 전체 */
  function slice(ser, m) { const p = points(ser); if (!p.length || !m) return p; const from = ymAdd(p[p.length - 1].ym, -m); return p.filter(x => x.ym >= from); }

  /* ---------- 가격지수(부동산원) ---------- */
  /** 주간 [[시점…], [지수…]] → 마지막 값과 n주 전 값 증감 % | null */
  function idxWeekly(w, nWeeks) {
    if (!w || !Array.isArray(w[1]) || w[1].length < 2) return null;
    const v = w[1], b = v[v.length - 1], i = nWeeks ? v.length - 1 - nWeeks : 0, a = v[i];
    if (!(a > 0) || !(b > 0) || i < 0) return null;
    return { pct: (b / a - 1) * 100, a, b, from: w[0][i], to: w[0][v.length - 1] };
  }

  /* ---------- 거래 ---------- */
  const sum = a => (a || []).reduce((s, x) => s + (x > 0 ? x : 0), 0);
  /** 최근 3개월 거래가 FEW 건 미만이면 '거래 적음' */
  const few = c => Array.isArray(c) && c.length >= 3 ? sum(c.slice(-3)) < FEW : true;
  /** 최근 12개월 vs 그 전 12개월 → {y1, y0, pct|null} */
  function vol(c) {
    if (!Array.isArray(c) || c.length < 12) return null;
    const y1 = sum(c.slice(-12)), y0 = c.length >= 24 ? sum(c.slice(-24, -12)) : null;
    return { y1, y0, pct: y0 > 0 ? (y1 / y0 - 1) * 100 : null };
  }

  /* ---------- 말 ---------- */
  const n0 = v => Math.round(v).toLocaleString('ko-KR');
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.round(Math.abs(v) * 10) / 10).toFixed(1) + '%';
  /** 평당가(만원) → '4,520만' / '1.2억' */
  const ppy = v => !(v > 0) ? '' : v >= 10000 ? (Math.round(v / 1000) / 10) + '억' : n0(v) + '만';

  /* ---------- 지표 하나의 구 값 ----------
     g = region 파일 gu[구], x = index.json sgg[구], o = {period, freq('m'|'w')}
     → { v(색·순서용 숫자|null), main(큰 글자), sub(작은 글자), tone('up'|'dn'|'flat'|'seq'|'few'|'na'), src('deal'|'idx'), note } */
  function stat(ind, g, x, o) {
    g = g || {}; x = x || {}; o = o || {};
    const P = PERIODS.find(p => p.id === o.period) || PERIODS[0];
    const sp = points(g.s), last = sp.length ? sp[sp.length - 1].v : null;
    const NA = { v: null, main: '', sub: '자료 없음', tone: 'na' };
    if (ind === 'price') {
      if (o.freq === 'w') {
        const w = g.ix && g.ix.ws, r = w && idxWeekly(w, P.m ? Math.round(P.m * 52 / 12) : 0);
        if (!r) return NA;
        return { v: r.pct, main: sgn(r.pct), sub: ppy(last) ? '평당 ' + ppy(last) : '', tone: tone(r.pct), src: 'idx', from: r.from, to: r.to };
      }
      const ix = g.ix && g.ix.ms ? change(g.ix.ms, P.m) : null;
      const ch = ix || change(g.s, P.m);
      if (!ch) return Object.assign({}, NA, { sub: last ? '평당 ' + ppy(last) : '자료 없음', main: last ? '기간 자료 없음' : '' });
      const isFew = !ix && few(x.c);
      return { v: ch.pct, main: sgn(ch.pct), sub: '평당 ' + ppy(last), tone: isFew ? 'few' : tone(ch.pct), few: isFew, src: ix ? 'idx' : 'deal', from: ch.from, to: ch.to };
    }
    if (ind === 'vol') {
      const r = vol(x.c); if (!r) return NA;
      return { v: r.pct, main: r.pct == null ? n0(r.y1) + '건' : sgn(r.pct), sub: `1년 ${n0(r.y1)}건`, tone: r.pct == null ? 'seq' : tone(r.pct), y1: r.y1, y0: r.y0 };
    }
    if (ind === 'sup') {
      if (!g.sup) return { v: 0, main: '0세대', sub: '3년 안 예정 없음', tone: 'seq0' };
      const t = g.sup[0] + g.sup[1] + g.sup[2];
      return { v: t, main: n0(t) + '세대', sub: `1년 안 ${n0(g.sup[0])}`, tone: t > 0 ? 'seq' : 'seq0', sup: g.sup };
    }
    if (ind === 'uns') {
      if (!g.uns || g.uns[0] == null) return NA;
      return { v: g.uns[0], main: n0(g.uns[0]) + '호', sub: g.uns[1] != null ? `1년 전 ${n0(g.uns[1])}호` : '', tone: g.uns[0] > 0 ? 'seq' : 'seq0', grp: g.uns[2] > 1 ? g.uns[2] : 0 };
    }
    if (ind === 'jr') {
      const r = x.r && x.r.jr; if (r == null) return NA;
      return { v: r, main: Math.round(r) + '%', sub: '전세가율', tone: 'seq' };
    }
    if (ind === 'out') {
      if (!g.out) return NA;
      return { v: g.out[0], main: g.out[0].toFixed(1) + '%', sub: g.out[1] != null ? `1년 전 ${g.out[1].toFixed(1)}%` : '', tone: 'seq' };
    }
    if (ind === 'dev') {
      const d = g.dev || {}, t = (d['재개발'] || 0) + (d['재건축'] || 0) + (d['주거환경개선'] || 0);
      return { v: t, main: t + '곳', sub: [d['재개발'] ? '재개발 ' + d['재개발'] : '', d['재건축'] ? '재건축 ' + d['재건축'] : ''].filter(Boolean).join('·') || (t ? '주거환경 ' + t : '구역 없음'), tone: t ? 'seq' : 'seq0', dev: d };
    }
    return NA;
  }
  /** 증감 색: ±0.5% 안은 보합 */
  const tone = p => p == null ? 'na' : p >= 0.5 ? 'up' : p <= -0.5 ? 'dn' : 'flat';
  /** 이 지표에 자료가 있는 구가 하나라도 있나(없으면 버튼을 숨김) */
  function has(ind, R, IX) {
    const gu = (R && R.gu) || {};
    if (ind === 'price' || ind === 'vol') return true;
    if (ind === 'jr') return true;
    if (ind === 'sup') return !!(R && R.src && R.src.sup);
    if (ind === 'uns') return Object.values(gu).some(g => g.uns && g.uns[0] != null);
    if (ind === 'out') return Object.values(gu).some(g => g.out);
    if (ind === 'dev') return Object.values(gu).some(g => g.dev);
    return false;
  }
  const hasWeekly = R => Object.values((R && R.gu) || {}).some(g => g.ix && g.ix.ws);

  /* ---------- 줄 세우기 ---------- */
  /** rows [{code, st}] → 값 큰 순(자료 없음은 뒤, 거래 적음은 값 순서 그대로 두되 표시만) */
  function rank(rows) { return rows.slice().sort((a, b) => (a.st.v == null) - (b.st.v == null) || (b.st.v || 0) - (a.st.v || 0)); }
  /** 동그라미 크기 단계(1~3): 같은 시·도 안 |값| 최댓값 대비 */
  function size(v, max) { if (v == null || !(max > 0)) return 1; const r = Math.abs(v) / max; return r >= 0.66 ? 3 : r >= 0.33 ? 2 : 1; }

  /* ---------- 과거 성적 한 줄 ---------- */
  const PAST = { price: ['mom', '최근 1년 많이 오른(상위 20%)'], jr: ['jr', '전세가율이 높은(상위 20%)'], sup: ['sup', '입주 물량이 많은(상위 20%)'],
    uns: ['uns', '미분양이 많은(상위 20%)'], out: ['ob6', '외지인 매입 비율이 높은(상위 20%)'] };
  const GQ = { 0: '하위 20%', 1: '하위 21~40%', 2: '중간 20%', 3: '상위 21~40%', 4: '상위 20%' };
  const GCOND = { mom: '최근 1년 상승률이', jr: '전세가율이', sup: '입주 물량이', uns: '미분양이', ob6: '외지인 매입 비율이' };
  function span(periods, h) {
    const p = (periods || []).slice().sort(); if (!p.length) return '';
    const a = p[0], b = ymAdd(p[p.length - 1], h || 24);
    return `${String(a).slice(0, 4)}년 ${+String(a).slice(4, 6)}월~${String(b).slice(0, 4)}년 ${+String(b).slice(4, 6)}월`;
  }
  /** e = {n, hit(%)} → {dir: 'more'|'less'|'', k} — 절반 넘게 한쪽이면 그 방향 */
  function majority(e) {
    const more = Math.round(e.n * e.hit / 100), less = e.n - more;
    return more * 2 > e.n ? { dir: 'more', k: more } : less * 2 > e.n ? { dir: 'less', k: less } : { dir: '', k: more };
  }
  function sentence(SD, who, e, base) {
    const m = majority(e);
    if (!m.dir) return `과거 ${SD}에서 ${who} 이후 2년 ${base}보다 더 오른 건 ${n0(e.n)}번 중 ${n0(m.k)}번으로, 한쪽으로 뚜렷하진 않았어요.`;
    return `과거 ${SD}에서 ${who} 이후 2년 ${base}보다 ${n0(e.n)}번 중 ${n0(m.k)}번 ${m.dir === 'more' ? '더' : '덜'} 올랐어요.`;
  }
  /** 지표 옆 한 줄: { past: 문장|'', span: '2019년 10월~2026년 10월', used: true|false|null }
      EV = evidence.json, sid = 's00', SD = '서울', used = region 파일 used */
  function pastLine(ind, EV, sid, SD, used) {
    const u = used && typeof used[ind] === 'boolean' ? used[ind] : null;
    let past = '', sp = '';
    if (EV && PAST[ind]) {
      const [k, cond] = PAST[ind], R = EV.region && EV.region.sido && EV.region.sido[sid], e = R && R[k] && R[k]['4'];
      if (e && e.n >= 5 && e.hit != null) { past = sentence(SD, `${cond} 구는`, e, SD + ' 평균'); sp = span(EV.region.periods, EV.horizon); }
    } else if (EV && ind === 'dev') {
      const st = EV.sido && EV.sido[sid] && EV.sido[sid].stg;
      if (st) {
        let n = 0, more = 0;
        for (const b in st) if (b !== '0' && st[b] && st[b].n) { n += st[b].n; more += Math.round(st[b].n * st[b].hit / 100); }
        if (n >= 5) { past = sentence(SD, '재건축 사업 단계에 있던 단지는', { n, hit: 100 * more / n }, '같은 구 평균'); sp = span(EV.periods, EV.horizon); }
      }
    }
    return { past, span: sp, used: u };
  }
  /** 고른 구의 지금 구간 사례: eb = index.json sgg[구].r.eb → 문장 | '' */
  function guPast(ind, EV, sid, SD, name, eb) {
    const k = PAST[ind] && PAST[ind][0], b = eb && k ? eb[k] : null;
    const R = EV && EV.region && EV.region.sido && EV.region.sido[sid], e = b != null && R && R[k] && R[k][String(b)];
    if (!e || !(e.n >= 5) || e.hit == null || !GQ[b]) return '';
    return `${name}${eun(name)} 지금 ${SD}에서 ${GCOND[k]} ${GQ[b]}예요. ` + sentence(SD, `이 구간이던 구는`, e, SD + ' 평균');
  }

  /** 받침 있으면 '은', 없으면 '는' */
  function eun(w) { const c = String(w || '').slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '은' : '는'; }

  /* ---------- 그래프 ---------- */
  /** 증감 막대(기간이 1년이면 월별, 3년 이상이면 해마다): pts [{ym, v}] → [{lab, pct}] */
  function bars(pts, m) {
    if (!pts || pts.length < 2) return [];
    const step = m && m <= 12 ? 1 : 12, out = [], last = pts[pts.length - 1];
    for (let ym = last.ym; ; ym = ymAdd(ym, -step)) {
      const b = at(pts, ym), a = at(pts, ymAdd(ym, -step));
      if (!(a > 0)) break;
      if (b > 0) out.unshift({ ym, lab: step === 1 ? (+ym.slice(4)) + '월' : ym.slice(2, 4) + '년', pct: (b / a - 1) * 100 });
      if (m && ymDiff(ymAdd(ym, -step), last.ym) >= m) break;
      if (out.length > 30) break;
    }
    return out;
  }
  /** 값 범위 → 보기 좋은 눈금 3~5개 */
  function ticks(lo, hi, n) {
    n = n || 4; if (!(hi > lo)) { hi = lo + 1; }
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), st = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw) || raw;
    const out = []; for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  }

  const API = { IND, PERIODS, FEW, COL, ymAdd, ymDiff, ymDot, points, change, slice, idxWeekly, few, vol, stat, tone, has, hasWeekly, rank, size,
    pastLine, guPast, majority, eun, span, bars, ticks, sgn, ppy, n0, GQ };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_REGC = API;
})(typeof window !== 'undefined' ? window : globalThis);
