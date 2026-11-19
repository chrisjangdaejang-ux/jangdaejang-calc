/* 장대장 '오피스텔' 분석 계산 규칙 (내 집 시세 화면 오피스텔 탭) — 화면(offi-view.js)·검증(tools/offi-test.js)이 같이 쓴다.
   자료: /jangdaejang-data/data/offi/index.json · offi/{구코드}.json (엔진 scripts/offi.py 가 국토교통부 오피스텔 매매·전월세 실거래로 만든 것)
   금액 단위: 만원. 수익률: 0~1. 이 파일은 공개 자료를 읽어 보여 줄 문장·숫자만 만든다(가중치·임계값 없음). */
(function (root) {
  'use strict';
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);

  /** [시작 칸, 값…] → 길이 n 배열 (0 = 값 없음) */
  function arr(a, n) {
    const out = new Array(n).fill(0); if (!Array.isArray(a) || a.length < 2) return out;
    for (let k = 1; k < a.length; k++) { const i = a[0] + k - 1; if (i >= 0 && i < n) out[i] = +a[k] || 0; }
    return out;
  }
  function monthsFrom(a, b) { const m = M(), out = []; if (!a || !b) return out; for (let ym = a; ym <= b; ym = m.ymAdd(ym, 1)) out.push(ym); return out; }
  /** 건물 키(URL·선택 값): 동|지번 (지번이 없으면 동|#이름) */
  const keyOf = u => `${u.d}|${u.j || '#' + u.n}`;
  /** 표시 이름: 이름이 없거나 지번 꼴이면 '동 지번 오피스텔' */
  const nameOf = u => (u.n && !/^\(?[\d\-]+\)?$/.test(u.n)) ? u.n : `${u.d} ${u.j || ''} 오피스텔`.replace(/\s+/g, ' ');

  /** 매매 시세 추이(금액): 월별 ㎡당 시세(3개월 이동 중앙) × 대표 전용면적, 100만 원 단위 반올림 → {months, s} */
  function priceSeries(u, meta) {
    const months = monthsFrom(meta.hm, meta.to), n = months.length;
    const s = arr(u.s, n).map(v => v > 0 ? Math.round(v * u.a / 100) * 100 : 0);
    return { months, s };
  }
  /** 마지막 값(최근 3개월 안) */
  function latest(a, months) {
    for (let i = a.length - 1; i >= Math.max(0, a.length - 3); i--) if (a[i] > 0) return { v: a[i], at: months[i], stale: i < a.length - 1 };
    return null;
  }
  /** 마지막 실제 값(기간 제한 없음) */
  function lastAny(a, months) { for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return { v: a[i], at: months[i] }; return null; }
  const change = (a, months, back) => M().changeBack(a, months, back);
  /** 수익률 추이(%) → {months, y} (값 없는 달 0) */
  function yieldSeries(u, meta) {
    const months = monthsFrom(meta.hm, meta.to), n = months.length;
    return { months, y: arr(u.ys, n).map(v => v > 0 ? v / 10 : 0) };
  }
  /** 0.0482 → '4.82%' */
  const pct = (r, d) => r == null ? '-' : (r * 100).toFixed(d == null ? 2 : d) + '%';
  /** 순위 [상위 %, 하위 %, 개수] → '상위 12%' 또는 '하위 30%' (가운데면 '중간') */
  function rankText(rk) {
    if (!Array.isArray(rk) || rk.length < 3) return '';
    const [top, bot] = rk;
    if (top <= 45) return `상위 ${top}%`;
    if (bot <= 45) return `하위 ${bot}%`;
    return '중간쯤';
  }
  /** 종합 점수(0~99, 같은 시·도 오피스텔 안 백분위) → '상위 8%' / '하위 3%' / '중간쯤' */
  function scoreRank(sc) {
    if (sc == null || !isFinite(sc)) return '';
    sc = Math.max(0, Math.min(99, Math.round(sc)));
    if (sc >= 55) return `상위 ${100 - sc}%`;
    if (sc <= 44) return `하위 ${sc + 1}%`;
    return '중간쯤';
  }
  /** 금리 시계열 {YYYYMM: %} 의 마지막 값 */
  function lastRate(s) {
    if (!s || typeof s !== 'object') return null;
    const ks = Object.keys(s).filter(k => /^\d{6}$/.test(k) && isFinite(+s[k])).sort();
    return ks.length ? { v: +s[ks[ks.length - 1]], at: ks[ks.length - 1] } : null;
  }
  /** 수익률 − 금리 (%p). r = 0~1, rate = % */
  const spread = (r, rate) => (r == null || rate == null) ? null : Math.round((r * 100 - rate) * 100) / 100;

  /** 매매 목록 */
  const ymd = v => { const s = String(v); return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8) || '01'}`; };
  function trades(u) {
    return (u.t || []).map(t => ({ date: ymd(t[0]), area: t[1], floor: t[2], amt: t[3], hi: t[4] === 1, direct: t[5] === 1 }));
  }
  const CT = ['신규', '갱신', ''];
  function rents(u) {
    return (u.wr || []).map(t => ({ date: ymd(t[0]), area: t[1], floor: t[2], dep: t[3], rent: t[4], ct: CT[t[5]] || '' }));
  }
  /** 이 월세 계약 하나의 표면 수익률 (매매 ㎡당 가격 p 기준) */
  function contractYield(p, area, dep, rent) {
    const base = p * area - dep; return base > 0 && rent > 0 ? rent * 12 / base : null;
  }
  /** 월세 회전(추정): 최근 1년 전월세 계약 수 ÷ 원자료로 확인된 서로 다른 층·면적 수 */
  function turnover(to) {
    if (!to || !to.k || to.k < 3) return null;
    return { n: to.n, k: to.k, r: Math.round(to.n / to.k * 100) / 100 };
  }
  /** 매매가에서 보증금을 뺀 실제 들어가는 돈과 연 월세 (대표 전용면적 기준 예시) */
  function example(u) {
    const y = u.y; if (!y) return null;
    const price = Math.round(y.p * u.a / 100) * 100, dep = y.dep, rent = y.mr;
    return { price, dep, rent, cash: price - dep, year: rent * 12, r: contractYield(y.p, u.a, dep, rent) };
  }

  /** 같은 구 건물: 동 목록·동별 건물 */
  function dongs(units) { return [...new Set((units || []).map(u => u.d))].sort((a, b) => a.localeCompare(b, 'ko')); }
  function inDong(units, d) { return (units || []).filter(u => u.d === d).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ko')); }
  /** 이름 검색(한 구 안) — 내 집 시세 단지 검색과 같은 규칙(JDJ_MINE.matchName) */
  function search(units, q, limit) {
    const m = M(); if (!m.normName(q)) return [];
    const out = [];
    for (const u of units || []) { const r = m.matchName(nameOf(u), q); if (r >= 0) out.push([r, -((u.t || []).length + (u.wr || []).length), u]); }
    out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return out.slice(0, limit || 12).map(x => x[2]);
  }

  /** 구 단위 임대수요 지표 → 화면 행 [{k, label, ok, value, note, src}] — 자료가 없으면 ok=false 와 이유 */
  function demandRows(s, ix, u, sggName) {
    const d = (s && s.dem) || {}, av = (ix && ix.avail) || {}, src = (ix && ix.src) || {}, rows = [];
    const sign = v => v == null ? '' : (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
    const m = M();
    if (d.job) rows.push({ k: 'job', label: '주변 일자리(그 지역에서 일하는 사람)', ok: true,
      value: `${Math.round(d.job.v).toLocaleString()}천 명`, note: `${m.ymKo(d.job.at)} 기준 · 1년 ${sign(d.job.c1) || '-'} · 3년 ${sign(d.job.c3) || '-'}${d.job.grp > 1 ? ' · 구가 있는 시는 시 전체 값이에요' : ''}${d.job.rk ? ` · 1년 증감 전국 ${rankText(d.job.rk)}` : ''}`, src: src.job });
    else rows.push({ k: 'job', label: '주변 일자리', ok: false, note: '이 지역 통계가 없어요', src: src.job });
    if (d.biz) rows.push({ k: 'biz', label: '사업체 종사자 수', ok: true, value: `${Math.round(d.biz.v).toLocaleString()}명`,
      note: `${String(d.biz.at).slice(0, 4)}년 기준 · 1년 ${sign(d.biz.c1) || '-'} · 3년 ${sign(d.biz.c3) || '-'}`, src: src.biz });
    else rows.push({ k: 'biz', label: '사업체 종사자 수', ok: false, note: av.biz ? '이 지역 통계가 없어요' : '통계청 자료 연결 중이에요(확인 불가)', src: src.biz });
    if (d.hh && d.hh.p12 != null) rows.push({ k: 'hh', label: '1~2인 세대 비중', ok: true, value: pct(d.hh.p12, 1),
      note: `${m.ymKo(d.hh.at)} 기준${d.hh.p1 != null ? ` · 1인 세대 ${pct(d.hh.p1, 1)}` : ''}${d.hh.d3 != null ? ` · 3년 전보다 ${d.hh.d3 >= 0 ? '+' : ''}${(d.hh.d3 * 100).toFixed(1)}%p` : ''}`, src: src.hh });
    else rows.push({ k: 'hh', label: '1~2인 세대 비중', ok: false, note: av.hh ? '이 지역 통계가 없어요' : '행정안전부 자료 연결 중이에요(확인 불가)', src: src.hh });
    const sb = u && u.sub;
    if (sb && sb.length) rows.push({ k: 'sub', label: '가까운 지하철역 이용객', ok: true,
      value: sb.map(x => `${x[0]}역 하루 ${x[2].toLocaleString()}명`).join(' · '),
      note: sb.map(x => `${x[0]}역까지 약 ${x[1].toLocaleString()}m${x[3] != null ? `, 1년 ${sign(x[3])}` : ''}`).join(' · ') + ' (승차+하차, 최근 1년 하루 평균)', src: src.sub });
    else rows.push({ k: 'sub', label: '가까운 지하철역 이용객', ok: false,
      note: !av.sub ? '서울 열린데이터 자료 연결 중이에요(확인 불가)' : '가까운 서울 지하철역이 없거나 건물 위치를 아직 확인하지 못했어요. 이 자료는 서울 시내 역만 있어요', src: src.sub });
    rows.push({ k: 'univ', label: '주변 대학 재학생 수', ok: false, note: '대학알리미 자료를 아직 연결하지 못했어요(확인 불가)', src: '' });
    const to = u && turnover(u.to);
    if (to) rows.push({ k: 'to', label: '전월세 계약 회전(추정)', ok: true, value: `최근 1년 ${to.n}건`,
      note: `원자료로 확인된 서로 다른 층·면적 ${to.k}곳 기준 약 ${to.r}회 — 실제 호실 수가 아니라 추정이에요`, src: src.rent });
    else if (u) rows.push({ k: 'to', label: '전월세 계약 회전(추정)', ok: false, note: '계약이 적어 추정하지 않았어요', src: src.rent });
    return rows;
  }
  /** 공급 위험 행 */
  function supplyRows(s, ix) {
    const sp = s && s.sup, m = M(), rows = [];
    rows.push({ k: 'ofc', label: '오피스텔·도시형생활주택·민간임대 입주 예정(앞으로 2년)', ok: true,
      value: sp && sp.o ? `${sp.o.toLocaleString()}실·세대` : '공고 없음',
      list: (sp && sp.rows || []).map(r => ({ name: r[0], n: r[1], mv: m.ymKo(r[2]), k: r[3] })), src: (ix && ix.src || {}).sup });
    if (sp && sp.apt) rows.push({ k: 'apt', label: '아파트 입주 예정(앞으로 2년, 참고)', ok: true, value: `${sp.apt.toLocaleString()}세대`, src: '청약홈 분양 공고' });
    rows.push({ k: 'stay', label: '생활형숙박시설 입주 예정', ok: false, note: '청약홈에 없는 시설이라 공식 목록을 아직 확인하지 못했어요(확인 불가)' });
    rows.push({ k: 'permit', label: '오피스텔 건축 인허가', ok: false, note: '시·군·구 단위 공식 인허가 목록을 아직 연결하지 못했어요(확인 불가)' });
    return rows;
  }
  /** 검증 결과 문장. bt = index.bt[h] */
  function btText(bt, h) {
    if (!bt || bt.status === 'nodata') return `${h}년: 오피스텔 실거래 자료가 모이면 검증해요`;
    if (bt.status === 'short') return `${h}년: 과거 자료 기간이 짧아 아직 검증하지 못했어요${bt.from ? `(매매 자료 ${M().ymKo(bt.from)}부터)` : ''}`;
    const o = (bt.oos_all || []).filter(x => x.top20 != null);
    const s = o.length ? `표본 외 ${o.length}번 중 ${bt.oos_hit}번 맞음, 점수 상위 20%가 같은 구 평균보다 평균 ${bt.oos_avg > 0 ? '+' : ''}${bt.oos_avg}%` : '표본 외 결과 없음';
    return `${h}년: ${bt.status === 'pass' ? '검증 통과' : '검증 미통과(점수 공개 안 함)'} · ${s}`;
  }
  const passed = ix => Object.keys((ix && ix.bt) || {}).filter(h => ix.bt[h] && ix.bt[h].status === 'pass').sort();

  /** 점수 이유(사실 문장) — 공개 자료의 사실값만으로 만든다 */
  function reasons(u, s, ix) {
    const out = [], y = u.y;
    if (y && u.rk && u.rk.g) out.push(`임대수익률 ${pct(y.r)} — 같은 시·군·구 오피스텔 ${u.rk.g[2]}곳 중 ${rankText(u.rk.g)}예요.`);
    if (y && u.rk && u.rk.d) out.push(`같은 동 ${u.rk.d[2]}곳 중에서는 ${rankText(u.rk.d)}예요.`);
    (u.rl || []).forEach(r => out.push(`${r[0]} ${r[1]}: 지금 '${r[2]}' 단계(${M().ymKo(r[3])})${r[4] === 'dong' ? ' — 역세권 동 기준' : ''}.`));
    const d = s && s.dem && s.dem.job;
    if (d && d.c1 != null) out.push(`이 지역 일자리는 1년 전보다 ${d.c1 >= 0 ? '+' : ''}${(d.c1 * 100).toFixed(1)}% (통계청 지역별고용조사).`);
    return out;
  }

  const API = { arr, monthsFrom, keyOf, nameOf, priceSeries, latest, lastAny, change, yieldSeries, pct, rankText, scoreRank, lastRate, spread, trades, rents,
    contractYield, turnover, example, dongs, inDong, search, demandRows, supplyRows, btText, passed, reasons };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_OFFI = API;
})(typeof self !== 'undefined' ? self : this);
