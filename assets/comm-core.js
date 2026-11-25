/* 집예보 '상가·건물' 분석 계산 규칙 (내 집 시세 화면 상가·건물 탭) — 화면(comm-view.js)·검사(tools/comm-test.js)가 같이 쓴다.
   자료: jangdaejang-data data/comm/index.json · comm/{구코드}.json (엔진 scripts/commercial.py 가 국토교통부 상업업무용 매매 실거래로 만든 것)
   금액 단위: 만원. ㎡당 가격: 만원/㎡. 이 파일은 공개 자료를 읽어 보여 줄 문장·숫자만 만든다(가중치·기준값 없음).
   종류: c 집합(구분상가·사무실 호실 — 건물 안 한 칸) · g 일반(통건물 — 건물 한 채 전체) */
(function (root) {
  'use strict';
  const M = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);
  const PY = 3.3058;
  const TYPES = { c: { short: '구분상가·사무실', long: '집합 건물의 한 칸(구분상가·사무실 호실)', area: '전용면적', unit: '전용 ㎡당' },
                  g: { short: '통건물', long: '건물 한 채 전체(통건물)', area: '대지면적', unit: '대지 ㎡당' } };
  const LU = { all: '전체', com: '상업지역', res: '주거지역', etc: '그 밖(공업·녹지·관리 등)' };
  const RMET = { vac: '공실률', rent: '임대료', inv: '투자수익률', inc: '소득수익률' };

  /** [시작 칸, 값…] → 길이 n 배열 (0 = 값 없음) */
  function arr(a, n) {
    const out = new Array(n).fill(0); if (!Array.isArray(a) || a.length < 2) return out;
    for (let k = 1; k < a.length; k++) { const i = a[0] + k - 1; if (i >= 0 && i < n) out[i] = +a[k] || 0; }
    return out;
  }
  function monthsFrom(a, b) { const m = M(), out = []; if (!a || !b) return out; for (let ym = a; ym <= b; ym = m.ymAdd(ym, 1)) out.push(ym); return out; }
  /** 1366.1 → '1,366만 원' (㎡당) */
  const perM2 = v => v == null || !isFinite(v) ? '-' : Math.round(v).toLocaleString() + '만 원';
  /** ㎡당 → 3.3㎡(1평)당 */
  const perPy = v => v == null || !isFinite(v) ? '-' : Math.round(v * PY).toLocaleString() + '만 원';
  /** 마지막 값(최근 3개월 안) */
  function latest(a, months) {
    for (let i = a.length - 1; i >= Math.max(0, a.length - 3); i--) if (a[i] > 0) return { v: a[i], at: months[i], stale: i < a.length - 1 };
    return null;
  }
  function lastAny(a, months) { for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return { v: a[i], at: months[i] }; return null; }
  /** 구 ㎡당 추이 → {months, lines: {all, com, res, etc, gb}} */
  function regionSeries(doc, k) {
    const months = monthsFrom(doc.hm, doc.to), n = months.length, s = (doc.ser || {})[k] || {}, out = {};
    for (const key of Object.keys(s)) out[key] = arr(s[key], n);
    return { months, lines: out, counts: arr(((doc.n || {})[k]) || null, n) };
  }
  /** 1년 비교 {now, prev, c, n, np} → 문장 조각 */
  function yearText(y) {
    if (!y) return '';
    if (y.c != null) return `최근 1년 중간값을 그 전 1년 중간값과 비교했어요`;
    if (y.now != null) return '그 전 1년 거래가 적어 비교하지 않았어요';
    return '최근 1년 거래가 적어 중간값을 내지 않았어요';
  }
  /** 거래 줄 [계약일, 동, 지번, 용도, 용도지역, 건물면적, 대지면적, 층, 금액, 표시, 준공] → 객체 */
  const ymd = v => { const s = String(v); return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8) || '01'}`; };
  function trades(rows) {
    return (rows || []).map(t => ({ date: ymd(t[0]), dong: t[1], jibun: t[2], use: t[3], lu: t[4], ba: t[5], la: t[6], floor: t[7], amt: t[8],
      direct: !!(t[9] & 1), share: !!(t[9] & 2), hi: !!(t[9] & 4), by: t[10], masked: /\*/.test(String(t[2] || '')), est: estOf(t[11]) }));
  }
  /** 통건물 추정 위치(12번째 칸): [경도, 위도, 등급 1 높음·2 보통, 건축물대장 주용도, 연면적 ㎡, 준공 연도, 좌표 출처 p 행안부 공공 좌표 | m 지도 서비스 좌표] → 객체 또는 null.
      공개 건축물대장과 대지·연면적·준공·용도가 하나로 맞는 건물이 있을 때만 엔진이 넣어 준다(지번은 공개하지 않음). */
  function estOf(e) {
    if (!Array.isArray(e) || e.length < 3) return null;
    const lng = +e[0], lat = +e[1];
    if (!(lat > 32 && lat < 39.5 && lng > 124 && lng < 132)) return null;
    return { lng, lat, band: e[2] === 1 ? 1 : 2, use: e[3] || '', tot: e[4] > 0 ? Math.round(e[4]) : null, year: e[5] > 1800 ? e[5] : null, src: e[6] === 'p' ? 'p' : 'm' };
  }
  /** 좌표 출처 한 줄(업체 이름 없이) */
  const estSrc = s => s === 'p' ? '위치는 행정안전부 주소정보 좌표 기준이에요' : '위치는 지도 서비스 좌표 기준 추정이에요';
  /** 추정 건물의 공개 건축물대장 사실 한 줄: '제2종근린생활시설 · 연면적 399㎡ · 1996년 준공' */
  function estFacts(x) {
    if (!x) return '';
    return [x.use, x.tot ? `연면적 ${x.tot.toLocaleString('ko-KR')}㎡` : '', x.year ? `${x.year}년 준공` : ''].filter(Boolean).join(' · ');
  }
  const EST_LABEL = '추정 위치 · 공개 자료(건축물대장)로 맞춰 본 결과예요';
  /** 이 거래의 ㎡당 가격 (시세 계산과 같은 기준: 집합 전용, 일반 대지) */
  function tradePpm(t, k) { const a = k === 'g' ? t.la : t.ba; return a > 0 ? t.amt / a : null; }

  /** 집합 건물 */
  const keyOf = u => `${u.d}|${u.j}`;
  const nameOf = u => `${u.d} ${u.j}${u.u ? ' (' + u.u + ')' : ''}`;
  function dongs(units) { return [...new Set((units || []).map(u => u.d))].sort((a, b) => a.localeCompare(b, 'ko')); }
  function inDong(units, d) { return (units || []).filter(u => u.d === d).sort((a, b) => b.t.length - a.t.length || String(a.j).localeCompare(String(b.j), 'ko', { numeric: true })); }
  /** 지번 찾기: '828' → 828, 828-1, 828-10 … (앞자리가 같은 것) */
  function findJibun(units, q) {
    q = String(q || '').replace(/\s/g, '').replace(/번지$/, ''); if (!/^\d/.test(q)) return [];
    return (units || []).filter(u => String(u.j) === q || String(u.j).startsWith(q + '-') || (q.includes('-') && String(u.j).startsWith(q))).slice(0, 12);
  }
  function unitSeries(u, doc) {
    const months = monthsFrom(doc.hm, doc.to), n = months.length;
    return { months, s: arr(u.s, n) };
  }
  function unitTrades(u) { return (u.t || []).map(t => ({ date: ymd(t[0]), area: t[1], floor: t[2], amt: t[3], hi: t[4] === 1, direct: !!(t[5] & 1), share: !!(t[5] & 2) })); }

  /** 점수 상태: 'ready'(통과 기간 있음) | 'filling'(과거 자료 채우는 중) | 'short'(자료 짧음) | 'fail' | 'nodata' */
  const passed = ix => Object.keys((ix && ix.bt) || {}).filter(h => ix.bt[h] && ix.bt[h].status === 'pass').sort();
  function scoreState(ix) {
    if (!ix || !ix.bt) return { s: 'nodata' };
    if (passed(ix).length) return { s: 'ready', hz: passed(ix) };
    const b = Object.values(ix.bt)[0] || {};
    if (b.status === 'nodata') return { s: 'nodata' };
    if (b.bf === 'run') return { s: 'filling', eta: b.eta || (ix.eta || {}).eta || null };
    if (Object.values(ix.bt).some(x => x && x.status === 'fail')) return { s: 'fail' };
    return { s: 'short' };
  }
  /** '2026-11-26' → '11월 26일' (해가 다르면 '2027년 1월 5일') */
  function etaText(eta, today) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(eta || '')); if (!m) return '';
    const y = (today || new Date()).getFullYear();
    return `${+m[1] !== y ? m[1] + '년 ' : ''}${+m[2]}월 ${+m[3]}일`;
  }
  /** 점수 칸 머리 문장 */
  function scoreHead(ix, today) {
    const st = scoreState(ix);
    if (st.s === 'filling') return '점수 준비 중 — 과거 자료를 채우는 중이에요. 자료가 다 모이면 자동으로 점수가 나와요.';
    if (st.s === 'nodata') return '점수 준비 중 — 상가·건물 실거래 자료를 받는 중이에요';
    if (st.s === 'short') return '점수 준비 중 — 과거 자료 기간이 아직 짧아요';
    if (st.s === 'fail') return '이 예측 방법은 과거에 써 봤을 때 맞은 횟수가 적어 점수를 보여 드리지 않아요';
    return '';
  }
  /** 보유 기간별 한 줄. bt = ix.bt[h] */
  function btText(bt, h) {
    const m = M();
    if (!bt || bt.status === 'nodata') return `${h}년 보유: 상가·건물 실거래 자료가 모이면 과거 자료로 맞춰 봐요.`;
    if (bt.status === 'short') return `${h}년 보유: 쌓인 실거래가 ${bt.from ? m.ymKo(bt.from) + '부터라' : '짧아'} 아직 과거에 써 볼 수 없어요.`
      + (bt.bf === 'run' && bt.bf_from ? ` ${m.ymKo(bt.bf_from)} 자료까지 채우면 자동으로 다시 맞춰 봐요.` : '');
    const o = (bt.oos_all || []).filter(x => x.top20 != null), n = o.length, hit = bt.oos_hit || 0;
    if (bt.status !== 'pass') return `${h}년 보유: 이 예측 방법을 과거에 그대로 써 봤더니 ${n}번 중 ${hit}번만 맞아 점수를 보여 드리지 않아요.`;
    return `${h}년 보유: 이 예측 방법을 과거에 그대로 써 봤더니 ${n}번 중 ${hit}번 맞았어요(점수 상위 20% 지역이 같은 시·도 평균보다 더 올랐는지).`;
  }
  /** 보유 기간별 문장 — 세 기간 문장이 같으면(앞 '○년 보유:'만 다름) 한 줄로 묶음 */
  function btLines(bt) {
    const hs = ['1', '2', '3'], t = hs.map(h => btText(bt && bt[h], h)), body = t.map(x => x.replace(/^\d년 보유: /, ''));
    return body.every(x => x === body[0]) ? [`1·2·3년 보유: ${body[0]}`] : t;
  }
  /** 점수(0~99, 같은 시·도 같은 종류 안 백분위) → '상위 8%' */
  function scoreRank(sc) {
    if (sc == null || !isFinite(sc)) return '';
    sc = Math.max(0, Math.min(99, Math.round(sc)));
    if (sc >= 55) return `상위 ${100 - sc}%`;
    if (sc <= 44) return `하위 ${sc + 1}%`;
    return '중간쯤';
  }

  /** 부동산원 임대동향 행 → [{area, how, items:[{label, v, at}]}] */
  function roneRows(rows) {
    return (rows || []).map(r => ({
      area: String(r[0]).split('>').map(s => s.trim()).filter(Boolean).join(' › '), how: r[1],
      items: Object.entries(r[2] || {}).map(([k, x]) => {
        const [typ, met] = k.split('|');
        return { typ, met, label: `${typ} ${RMET[met] || met}`, v: x[0], unit: x[2] || (met === 'rent' ? '' : '%'), at: x[3] || x[1] };
      }).sort((a, b) => a.label.localeCompare(b.label, 'ko'))
    }));
  }
  const HOW = { sgg: '이 시·군·구 이름이 들어간 상권', dong: '이 시·군·구 안 동 이름과 같은 상권', sido: '시·도 전체 평균' };

  /** 서울 상권 행 [이름, 구분, 분기, 매출(원), 1년 변화, 점포, 개업, 폐업] */
  function skRows(rows) {
    return (rows || []).map(r => ({ name: r[0], kind: r[1], q: r[2], sales: r[3], c: r[4], stores: r[5], open: r[6], close: r[7] }));
  }
  /** '20262' → '2026년 2분기' */
  const qLabel = q => /^\d{5}$/.test(String(q)) ? `${String(q).slice(0, 4)}년 ${String(q).slice(4)}분기` : String(q || '');
  /** 원 → '1,438억 원' */
  function eokWon(v) {
    if (v == null || !isFinite(v)) return '-';
    const e = v / 1e8; return e >= 1 ? `${Math.round(e).toLocaleString()}억 원` : `${Math.round(v / 1e4).toLocaleString()}만 원`;
  }
  function skSummary(rows) {
    const r = skRows(rows).filter(x => x.c != null);
    if (!r.length) return null;
    const up = r.filter(x => x.c > 0).length;
    return { n: r.length, up, down: r.length - up, q: r[0].q };
  }

  /** 구 수요 행 — 없는 자료는 ok=false 와 이유(확인 불가) */
  function demandRows(s, ix, doc) {
    const d = (s && s.dem) || {}, av = (ix && ix.avail) || {}, src = (ix && ix.src) || {}, m = M(), rows = [];
    const sign = v => v == null ? '-' : (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
    if (d.job) rows.push({ label: '이 지역에서 일하는 사람(일자리)', ok: true, value: `${Math.round(d.job.v).toLocaleString()}천 명`,
      note: `${m.ymKo(d.job.at)} 기준 · 1년 ${sign(d.job.c1)} · 3년 ${sign(d.job.c3)}${d.job.grp > 1 ? ' · 구가 있는 시는 시 전체 값이에요' : ''}. 일하는 사람이 많을수록 가게·사무실을 찾는 사람이 많아요.`, src: src.job });
    else rows.push({ label: '이 지역에서 일하는 사람(일자리)', ok: false, note: '이 지역 통계가 없어요.', src: src.job });
    if (d.biz) rows.push({ label: '사업체 종사자 수', ok: true, value: `${Math.round(d.biz.v).toLocaleString()}명`, note: `${String(d.biz.at).slice(0, 4)}년 기준 · 1년 ${sign(d.biz.c1)}`, src: src.biz });
    else rows.push({ label: '사업체 종사자 수', ok: false, note: av.biz ? '이 지역 통계가 없어요.' : '통계청 자료를 아직 연결하지 못했어요.', src: src.biz });
    if (d.hh && d.hh.p12 != null) rows.push({ label: '1~2인 세대 비중', ok: true, value: (d.hh.p12 * 100).toFixed(1) + '%', note: `${m.ymKo(d.hh.at)} 기준. 1~2인 세대가 많으면 편의점·음식점 같은 생활 가게 수요가 많은 편이에요.`, src: src.hh });
    else rows.push({ label: '1~2인 세대 비중', ok: false, note: av.hh ? '이 지역 통계가 없어요.' : '행정안전부 자료를 아직 연결하지 못했어요.', src: src.hh });
    const sb = doc && doc.sub;
    if (sb && sb.length) {
      const tot = sb.reduce((a, x) => a + x[1], 0);
      rows.push({ label: '지하철역 이용객(이 시·군·구 안 서울 지하철역)', ok: true, value: `하루 약 ${tot.toLocaleString()}명`,
        note: sb.slice(0, 4).map(x => `${x[0]}역 ${x[1].toLocaleString()}명${x[2] != null ? `(1년 ${sign(x[2])})` : ''}`).join(' · ') + ' — 승차+하차, 최근 1년 하루 평균. 역은 가장 가까운 행정동 기준으로 구를 정했어요.', src: src.sub });
    } else rows.push({ label: '지하철역 이용객', ok: false, note: av.sub ? '이 자료는 서울 지하철역만 있어요.' : '서울 열린데이터 자료를 아직 연결하지 못했어요.', src: src.sub });
    return rows;
  }
  /** 공급(신축 상가) 행 */
  function supplyRow(s, ix) {
    const nb = s && s.nb, av = (ix && ix.avail) || {};
    if (nb) return { label: '새로 짓는 상가(근린생활·판매 1,000㎡ 이상)', ok: true, value: `${nb.n.toLocaleString()}곳 · 연면적 ${nb.ar.toLocaleString()}㎡`,
      note: '허가·착공·준공 직후 단계를 합친 수예요. 주변에 새 상가가 많이 생기면 세입자 구하기가 어려워질 수 있어요.', src: (ix.src || {}).nb };
    return { label: '새로 짓는 상가', ok: false, note: av.nb ? '이 지역에는 찾은 신축 상가가 없어요(서울·인천·경기만 찾아요).' : '건축 인허가 자료 연결을 기다리고 있어요.', src: (ix && ix.src || {}).nb };
  }

  const API = { PY, TYPES, LU, RMET, HOW, arr, monthsFrom, perM2, perPy, latest, lastAny, regionSeries, yearText, trades, estOf, estFacts, estSrc, EST_LABEL, tradePpm, keyOf, nameOf, dongs, inDong,
    findJibun, unitSeries, unitTrades, passed, scoreState, etaText, scoreHead, btText, btLines, scoreRank, roneRows, skRows, qLabel, eokWon, skSummary, demandRows, supplyRow };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_COMM = API;
})(typeof self !== 'undefined' ? self : this);
