/* 주간 실거래 동향(/weekly/) 글·숫자 규칙 — 화면(assets/weekly-view.js)·테스트(tools/weekly-test.js) 공용, DOM 없음.
   자료: /jangdaejang-data/data/weekly/ (비공개 엔진 scripts/weekly.py — 국토교통부 아파트 매매 실거래가로 만든 우리 통계)
     index.json(주 목록) · {주}.json(그 주 최신 판 + versions) · {주}/v{n}.json·csv(판마다 고정 보관본)
   숫자는 자료 그대로만 쓴다(여기서 새 숫자를 만들지 않음). 표본 기준 미만(chg 없음)은 변동률 대신 '표본 부족'.
   window.JDJ_WEEKLY */
(function (root) {
  'use strict';
  const DATA = '/jangdaejang-data/data/weekly/';
  const PAGE = '/jangdaejang-calc/weekly/';
  const ORIGIN = 'https://chrisjangdaejang-ux.github.io';
  const WRE = /^\d{4}-\d{2}$/;

  /** 주소 → 주 ID('2026-46') / null. /weekly/2026-46/ 또는 ?w=2026-46 */
  function weekFrom(pathname, search) {
    const m = String(pathname || '').match(/\/weekly\/(\d{4}-\d{2})\/?/);
    if (m) return m[1];
    const q = new URLSearchParams(search || '').get('w');
    return q && WRE.test(q) ? q : null;
  }
  /** ?v=2 → 2 / null */
  function verFrom(search) {
    const v = Number(new URLSearchParams(search || '').get('v'));
    return Number.isInteger(v) && v > 0 ? v : null;
  }
  const num = n => n == null ? '—' : Number(n).toLocaleString('ko-KR');
  /** 변동률 글: +0.25% · −0.10% · 0.00% (자료의 소수 둘째 자리 그대로) */
  function pct(x, d) {
    if (x == null || isNaN(x)) return '—';
    d = d == null ? 2 : d;
    const v = Number(x), s = Math.abs(v).toFixed(d);
    return (v > 0 ? '+' : v < 0 ? '−' : '') + s + '%';
  }
  const share = x => x == null ? '—' : Number(x).toFixed(1) + '%';
  const md = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${+p[1]}/${+p[2]}` : ''; };
  const dot = iso => String(iso || '').replace(/-/g, '.');
  function period(V) { return `${md(V.from)}~${md(V.to)}`; }
  function weekName(V) { const y = String(V.w).slice(0, 4), n = +String(V.w).slice(5); return `${y}년 ${n}번째 주(${period(V)} 계약)`; }
  function statusText(V) { return V.status === 'final' ? '확정' : '잠정(신고 진행 중)'; }
  function verText(V) { return `제${V.ver}판 · ${V.status === 'final' ? '확정' : '잠정'}`; }
  /** 기준 'w'(그 주) / 'm'(최근 4주) → 화면에 쓸 값 */
  function pick(row, basis) {
    const x = basis === 'm' ? (row && row.m) || {} : row || {};
    return { chg: x.chg == null ? null : x.chg, lo: x.lo == null ? null : x.lo, hi: x.hi == null ? null : x.hi, np: x.np || 0, gap: x.gap,
      ok: x.chg != null };
  }
  /** 변동률 칸 글: 표본 부족이면 '표본 부족(비교 12건)' */
  function chgCell(row, basis, min) {
    const p = pick(row, basis);
    if (row && row.old) return { t: '자료 확인 늦음', cls: 'na' };
    if (!p.ok) return { t: '표본 부족', sub: `기준 ${min}건`, cls: 'na' };
    return { t: pct(p.chg), sub: p.lo != null ? `${pct(p.lo)} ~ ${pct(p.hi)}` : '', cls: p.chg > 0 ? 'up' : p.chg < 0 ? 'dn' : 'eq' };
  }
  /** 거래량 변화 글(같은 신고 기간끼리만) */
  function volCell(row, V) {
    if (!row || row.vc == null) return { t: '—', why: V && V.vol_basis ? '지난주 거래 없음' : '같은 신고 기간 비교 준비 중' };
    return { t: pct(row.vc, 1), why: `지난주 ${num(row.vp)}건(같은 신고 기간)` };
  }
  /** 부동산원 참고 글 */
  function roneCell(row) {
    const r = row && row.ro;
    if (!r) return { t: '—', why: '' };
    return { t: pct(r.chg), why: r.nm || r.t };
  }
  function levelRows(V, lv, sd) {
    return (V.rows || []).filter(r => r.lv === lv && (!sd || r.sd === sd));
  }
  function row(V, c) { return (V.rows || []).find(r => r.c === c) || null; }
  function sidos(V) { return levelRows(V, 'sd').map(r => r.nm); }
  /** 인용 글(기자용) — 첫 줄은 정해진 형식 그대로 */
  function cite(V, site) {
    const s = site || '집예보';
    return { line: `자료: ${s} 주간 실거래 동향(국토교통부 실거래가 분석, ${dot(V.asof)} 기준)`,
      detail: `${weekName(V)} ${verText(V)}${V.status === 'final' ? '' : ' — 늦게 신고되는 거래가 들어오면 숫자가 바뀔 수 있어요'}`,
      url: `${ORIGIN}${PAGE}${V.w}/?v=${V.ver}` };
  }
  function urls(V, ver) {
    const v = ver || V.ver;
    return { csv: `${DATA}${V.w}/v${v}.csv`, json: `${DATA}${V.w}/v${v}.json`, page: `${PAGE}${V.w}/`, perma: `${PAGE}${V.w}/?v=${v}` };
  }
  /** 큰 제목: 전국 그 주 변동률(없으면 거래 건수만) */
  function headline(V) {
    const k = row(V, '00') || {};
    if (k.chg == null) return `${period(V)} 전국 아파트 매매 ${num(k.n)}건`;
    return `${period(V)} 전국 아파트, 같은 집 직전 거래보다 중간값 ${pct(k.chg)}`;
  }
  /** 막대 그래프 눈금: 보이는 값(변동률·오차 범위) 중 가장 큰 절댓값을 0.5%p 단위로 올림, 최소 1% */
  function scaleMax(rows, basis) {
    let m = 0;
    rows.forEach(r => { const p = pick(r, basis); if (!p.ok || r.old) return; [p.chg, p.lo, p.hi].forEach(v => { if (v != null) m = Math.max(m, Math.abs(v)); }); });
    return Math.max(1, Math.ceil(m * 2) / 2);
  }
  /** 날짜 차이(일) */
  function days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  /** 확정까지 남은 안내 */
  function finalNote(V) {
    if (V.status === 'final') return `계약 후 30일 신고 기한이 지난 자료(${dot(V.asof)} 기준)로 확정했어요. 확정한 판은 다시 바꾸지 않아요.`;
    return `계약 후 30일 안에 신고하면 되므로 거래가 더 들어와요. 매주 월요일 다시 계산해 새 판을 내고, ${md(V.final_on)} 이후 자료로 확정해요.`;
  }

  const API = { DATA, PAGE, ORIGIN, weekFrom, verFrom, num, pct, share, md, dot, period, weekName, statusText, verText, pick, chgCell, volCell,
    roneCell, levelRows, row, sidos, cite, urls, headline, scaleMax, days, finalNote };
  root.JDJ_WEEKLY = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
