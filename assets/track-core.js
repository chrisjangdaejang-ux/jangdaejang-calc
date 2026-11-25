/* 집예보 성적표(/track/)·점수 읽는 법(/guide/method/) 계산 — 화면·테스트(tools/track-test.js) 공용, DOM 없음.
   자료는 공개 파일 그대로 읽고 새 숫자를 만들지 않는다(가중 평균·묶음 합치기만):
     bt/index.json   엔진 scripts/backtest_monthly.py — 전국·시·도별 10분위(dec: [2년 평균 상승 %, 하락 비율 %, 같은 구 평균 대비 %p, 사례 수]),
                     요약(sum), 연도별(by_year)·국면별(by_phase, 이름 phases), 학습 자료 시작월(data_from), (계획) 전국 기준 점수 nat
     bt/g/{구}.json  단지별 과거 점수(tm: 분기 기준 월마다 [t0, 점수, 구 안 등수, 구 단지 수, 평당 시세, (상승 ‰, 같은 구 중간값 대비 ‰p, 구 안 백분위)×6·12·24개월])
     excluded.json   엔진 build_site.excluded_pub — 쓰는 항목(used)·뺀 항목(unit·off·region)의 이름과 쉬운 말 이유(가중치·기준값 없음)
   화면 말투(대표 확정 11/20): '시험·통과·검증·채점' 대신 '과거에 그대로 써 봤더니 N번 중 M번' — 이 파일이 만드는 문장에 그 단어를 쓰지 않는다.
   window.JDJ_TRACK = { scopes, shortOf, wavg, head, cards, weak, grades, regionRows, yearRows, phaseRows, period, bars, tmUnits, tmPick, tmRows, items, ITEM, ymKo, pp, pc,
                        CASE_OF, casesOf, reasonOf, method(뺀 이유·사례·표시), audit(일관성 점검),
                        RETRAIN(이번 재학습 기록), why('왜 안 쓰나요' 묶음·표), whyAudit(그 일관성 점검) } */
(function (root) {
  'use strict';
  const r1 = v => Math.round(v * 10) / 10;
  const f1 = v => r1(Math.abs(v)).toFixed(1);
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '');
  const pc = v => v == null ? '–' : sg(r1(v)) + f1(v) + '%';          // 2년 상승률
  const pp = v => v == null ? '–' : sg(r1(v)) + f1(v) + '%p';         // 같은 구 평균 대비
  const nf = v => Number(v || 0).toLocaleString('ko-KR');
  const ymNorm = v => { const t = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return /^(19|20)\d{2}(0[1-9]|1[0-2])/.test(t) ? t.slice(0, 6) : ''; };
  const ymKo = v => { v = ymNorm(v); return v ? `${v.slice(0, 4)}년 ${+v.slice(4, 6)}월` : ''; };
  const ymAdd = (v, mo) => { v = ymNorm(v); const y = +v.slice(0, 4), m = +v.slice(4, 6) - 1 + mo; return `${y + Math.floor(m / 12)}${String((m % 12 + 12) % 12 + 1).padStart(2, '0')}`; };
  const J = (w, a, b) => { const c = String(w).replace(/[^가-힣]+$/, '').slice(-1); return w + (c && (c.charCodeAt(0) - 0xAC00) % 28 ? a : b); };

  /* 시·도 짧은 이름: index.json sido[].short 가 있으면 그것, 없으면 원래 이름 */
  function shortOf(name, IX) {
    if (name === '전국') return '전국';
    const s = ((IX && IX.sido) || []).find(x => x.name === name);
    return (s && s.short) || name;
  }
  /* 범위 목록: 전국 먼저, 나머지는 공개 파일 순서 */
  function scopes(BT, IX) {
    const sc = (BT && BT.scopes) || {};
    return Object.keys(sc).sort((a, b) => (a === '전국' ? -1 : b === '전국' ? 1 : 0)).map(k => ({ key: k, name: k, short: shortOf(k, IX) }));
  }
  /* 10분위 열 i 의 사례 수 가중 평균(= 그 범위 전체 평균) */
  function wavg(dec, i) {
    let s = 0, n = 0;
    for (const d of dec || []) if (d && d[i] != null) { s += d[i] * d[3]; n += d[3]; }
    return n ? s / n : null;
  }
  /* 기간 문장: '2010년 1월부터 쌓인 공공 통계로, 2017년 10월~2024년 10월 85개 달마다 …' — data_from 이 없으면 시작월 생략 */
  function period(BT, sc, MH) {
    const from = ymNorm((BT && BT.data_from) || (MH && MH.data_from) || '');
    const a = ymKo(sc.from), b = ymKo(sc.to);
    return { from: from ? ymKo(from) : '', span: `${a}~${b}`, months: sc.months,
      text: `${from ? `${ymKo(from)}부터 쌓인 공공 통계로, ` : ''}${a}부터 ${b}까지 ${sc.months}개 달마다 그때까지 나온 자료만으로 점수를 매겨 보고, 2년 뒤 실제 시세와 맞춰 봤어요.` };
  }
  /* 헤드라인: 상위·하위 10%의 같은 구 평균 대비 + 2년 평균 상승률. base = 비교 기준 이름 */
  function head(sc, o) {
    o = o || {};
    const base = o.base || '같은 구 평균', d = sc.dec || [], t = d[9], b = d[0];
    if (!t || !b) return null;
    const mv = v => `${f1(v)}%p ${v >= 0 ? '더' : '덜'} 올랐`;
    return {
      title: `점수 상위 10% 단지는 2년 뒤 ${base}보다 ${mv(t[2])}고, 하위 10%는 ${mv(b[2])}어요`,
      sub: `2년 평균 상승률로는 점수 상위 10% 단지 ${pc(t[0])}, 하위 10% ${pc(b[0])}였어요.`,
      size: `${o.where || '전국'} ${nf(sc.units)}개 단지·평형 · 기준 월 ${nf(sc.months)}개 · ${nf(sc.cases)}건`
    };
  }
  /* 약한 지역: 하락 비율 배수 < 1(상위가 더 자주 내림) 또는 상위가 더 오른 기준 월이 60% 미만 — 숨기지 않고 표시 */
  function weak(sc) {
    const s = sc && sc.sum;
    if (!s || !s.months) return false;
    return (s.down_x != null && s.down_x < 1) || s.win_months * 100 / s.months < 60;
  }
  /* 요약 카드 3개: { big, label, note } */
  function cards(sc, o) {
    o = o || {};
    const s = sc.sum, base = o.mid || '같은 구 중간값';
    if (!s) return [];
    const c2 = s.down_x == null ? { big: '–', label: '하락 비율 비교', note: `2년 뒤 내린 비율: 하위 10% ${s.down_bot}% · 상위 10% ${s.down_top}%` }
      : s.down_x >= 1 ? { big: `${s.down_x}배`, label: '2년 뒤 내린 비율, 하위 10%가 상위 10%보다', note: `하위 10%는 ${s.down_bot}%, 상위 10%는 ${s.down_top}%가 2년 뒤 내렸어요.` }
      : { big: `${s.down_x}배`, label: '2년 뒤 내린 비율, 하위 10%가 상위 10%보다', note: `오히려 상위 10%(${s.down_top}%)가 하위 10%(${s.down_bot}%)보다 더 자주 내렸어요.` };
    return [
      { big: `${s.top_beat}%`, label: `점수 상위 10% 중 ${base}보다 더 오른 비율`, note: '아무 단지나 고르면 50% 안팎이에요.' },
      c2,
      { big: `${s.win_months}/${s.months}`, label: '상위 10%가 하위 10%보다 더 오른 기준 월', note: `과거에 그대로 써 봤더니 ${s.months}번 중 ${s.win_months}번 상위 10%가 더 올랐어요.` }
    ];
  }
  /* 등급별: 10분위를 두 칸씩 합쳐 5등급(상위 20% … 하위 20%) — 사례 수 가중 평균 */
  function grades(dec) {
    const lab = ['하위 20%', '하위 20~40%', '가운데 20%', '상위 20~40%', '상위 20%'], rng = ['0~19점', '20~39점', '40~59점', '60~79점', '80~100점'];
    const out = [];
    for (let g = 0; g < 5; g++) {
      const a = [(dec || [])[2 * g], (dec || [])[2 * g + 1]].filter(Boolean);
      if (!a.length) { out.push(null); continue; }
      out.push({ label: lab[g], range: rng[g], ret: wavg(a, 0), down: wavg(a, 1), ex: wavg(a, 2), cases: a.reduce((s, d) => s + d[3], 0) });
    }
    return out.reverse();
  }
  /* 권역별: 시·도마다 상위 10% 같은 구 대비·더 오른 달·하락 배수·약함 표시(전국 제외, 공개 순서) */
  function regionRows(BT, IX) {
    return scopes(BT, IX).filter(s => s.key !== '전국').map(s => {
      const sc = BT.scopes[s.key], d = sc.dec || [];
      return { key: s.key, short: s.short, top: d[9] && d[9][2], bot: d[0] && d[0][2], win: sc.sum && sc.sum.win_months, months: sc.sum && sc.sum.months,
        down_x: sc.sum && sc.sum.down_x, units: sc.units, weak: weak(sc) };
    });
  }
  /* 연도별(기준 월의 해): { y, top, bot, gap, win, months } — by_year 가 없으면 [] */
  function yearRows(sc) {
    const Y = (sc && sc.by_year) || {};
    return Object.keys(Y).sort().map(y => ({ y, label: `${y}년`, top: Y[y].top, bot: Y[y].bot, all: Y[y].all, top_ex: Y[y].top_ex, win: Y[y].win_months, months: Y[y].months }));
  }
  /* 국면별: phases = [[key, 설명]] (공개 파일) */
  function phaseRows(sc, phases) {
    const P = (sc && sc.by_phase) || {};
    return (phases || []).filter(p => P[p[0]]).map(([k, t]) => ({ k, label: t, top: P[k].top, bot: P[k].bot, all: P[k].all, top_ex: P[k].top_ex, win: P[k].win_months, months: P[k].months }));
  }

  /* 막대 그래프 SVG(10분위): vals 10개, o = { avg(점선), fmt, hi(강조 칸 index), title, neg(음수 색) } — 가로는 viewBox 로 늘어남 */
  function bars(vals, o) {
    o = o || {};
    const W = 340, H = 196, L = 8, R = 8, T = 30, B = 34, n = vals.length, cw = (W - L - R) / n, bw = cw * 0.62;
    const xs = vals.filter(v => v != null).concat(o.avg != null ? [o.avg] : []);
    let lo = Math.min(0, ...xs), hi = Math.max(0, ...xs);
    if (hi === lo) hi = lo + 1;
    const pad = (hi - lo) * 0.12; hi += pad; if (lo < 0) lo -= pad;
    const y = v => T + (hi - v) / (hi - lo) * (H - T - B), y0 = y(0), fmt = o.fmt || (v => r1(v));
    let s = `<svg class="tbar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.title || ''}" preserveAspectRatio="xMidYMid meet">`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}" class="ax"/>`;
    vals.forEach((v, i) => {
      if (v == null) return;
      const x = L + i * cw + (cw - bw) / 2, top = Math.min(y(v), y0), h = Math.max(1, Math.abs(y(v) - y0));
      const cls = (o.hi || []).includes(i) ? 'b hi' : v < 0 && o.neg ? 'b ng' : 'b';
      s += `<rect class="${cls}" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
      const ty = v >= 0 ? y(v) - 5 : y(v) + 13;
      s += `<text class="v${(o.hi || []).includes(i) ? ' hi' : ''}" x="${(x + bw / 2).toFixed(1)}" y="${ty.toFixed(1)}">${fmt(v)}</text>`;
      s += `<text class="xl" x="${(x + bw / 2).toFixed(1)}" y="${H - B + 16}">${i + 1}</text>`;
    });
    s += `<text class="xe" x="${L}" y="${H - 3}">← 점수 낮음(1분위)</text><text class="xe" x="${W - R}" y="${H - 3}" text-anchor="end">점수 높음(10분위) →</text>`;
    if (o.avg != null) {
      const ya = y(o.avg).toFixed(1);
      s += `<line x1="${L}" x2="${W - R}" y1="${ya}" y2="${ya}" class="avg"/><line x1="${L}" x2="${L + 18}" y1="8" y2="8" class="avg"/><text class="al" x="${L + 23}" y="11.5">${o.avgLabel || '전체 평균'} ${fmt(o.avg)}</text>`;
    }
    return s + '</svg>';
  }

  /* ---------- 내 아파트 2년 전 성적표(타임머신): bt/g/{구}.json ---------- */
  /* 단지 목록: [{ key, umd, jibun, apt, band, label }] 이름순 */
  function tmUnits(G) {
    return Object.keys((G && G.tm) || {}).map(k => { const [umd, jibun, apt, band] = k.split('|'); return { key: k, umd, jibun, apt, band, label: `${apt} · ${band}` }; })
      .sort((a, b) => a.apt.localeCompare(b.apt, 'ko') || a.band.localeCompare(b.band, 'ko'));
  }
  const REC = r => ({ t0: r[0], score: r[1], gr: r[2], gn: r[3], p0: r[4], h: { 6: [r[5], r[6], r[7]], 12: [r[8], r[9], r[10]], 24: [r[11], r[12], r[13]] } });
  /* 2년 결과가 나온 가장 최근 기준 월(= 약 2년 전 점수)과 그 뒤 실제 시세 + 지금 최근 점수 */
  function tmPick(G, key) {
    const rows = ((G && G.tm && G.tm[key]) || []).map(REC).sort((a, b) => a.t0.localeCompare(b.t0));
    if (!rows.length) return null;
    const done = rows.filter(r => r.h[24][0] != null), last = rows[rows.length - 1];
    const p = done[done.length - 1];
    let then = null;
    if (p) {
      const [c10, v10, q] = p.h[24], chg = c10 / 10, vs = v10 / 10;
      const hiS = p.score >= 80, loS = p.score < 20, beat = vs > 0;
      const verdict = hiS ? (beat ? '점수가 높았고, 실제로도 같은 구 중간보다 더 올랐어요.' : '점수는 높았지만, 실제로는 같은 구 중간보다 덜 올랐어요.')
        : loS ? (beat ? '점수는 낮았지만, 실제로는 같은 구 중간보다 더 올랐어요.' : '점수가 낮았고, 실제로도 같은 구 중간보다 덜 올랐어요.')
        : `점수는 중간쯤이었고, 실제로는 같은 구 중간보다 ${beat ? '더' : '덜'} 올랐어요.`;
      then = { t0: p.t0, end: ymAdd(p.t0, 24), score: p.score, gr: p.gr, gn: p.gn, p0: p.p0, p1: p.p0 ? Math.round(p.p0 * (1 + chg / 100)) : null,
        chg, vs, q, verdict, hit: (hiS && beat) || (loS && !beat) ? true : hiS || loS ? false : null };
    }
    return { then, now: { t0: last.t0, score: last.score, gr: last.gr, gn: last.gn, end: ymAdd(last.t0, 24) }, n: rows.length, nDone: done.length };
  }
  /* 분기별 기록(최근 순, 2년 결과가 나온 것만): [{ t0, score, gr, gn, chg, vs }] */
  function tmRows(G, key, max) {
    const rows = ((G && G.tm && G.tm[key]) || []).map(REC).filter(r => r.h[24][0] != null).sort((a, b) => b.t0.localeCompare(a.t0));
    return rows.slice(0, max || 12).map(r => ({ t0: r.t0, score: r.score, gr: r.gr, gn: r.gn, chg: r.h[24][0] / 10, vs: r.h[24][1] / 10 }));
  }

  /* ---------- 점수 항목(점수 읽는 법) ----------
     ITEM[key] = { d: 어떤 자료로 무엇을 비교하나, w: 왜 집값과 관련, s: 출처 } — 단지 항목 u_*, 지역 항목 r_*.
     어떤 항목을 쓰고 뺐는지는 excluded.json 이 정한다(여기 목록에 있어도 자료에 없으면 화면에 안 나옴). 가중치·기준값 없음. */
  const MOLIT = '국토교통부 아파트 매매 실거래가(공공데이터포털)', MOLIT_R = '국토교통부 아파트 전월세 실거래가(공공데이터포털)';
  const ITEM = {
    u_mom: { d: '이 단지·평형의 최근 6개월 시세(실거래 중간값)를 그 전과 비교해, 같은 구 다른 단지보다 빨리 오르는 중인지 봐요.', w: '집값에는 관성이 있어 먼저 움직이기 시작한 단지가 한동안 흐름을 이어 가는 경우가 많아요.', s: MOLIT },
    u_stg: { d: '정비사업이 구역 지정 → 조합설립 → 사업시행 → 관리처분 → 이주·착공 중 어디까지 왔는지, 단계별 날짜로 봐요.', w: '단계를 하나씩 넘을 때마다 사업이 멈출 위험이 줄어 그만큼 가격에 반영돼요.', s: '서울시 정비사업 추진현황(서울 열린데이터광장), 국토교통부 도시정비사업 통합 자료' },
    u_sch: { d: '가까운 중학교에 전학 온 학생과 떠난 학생 수를 비교해(순전입률), 같은 구 다른 단지 주변 학교와 견줘요.', w: '학군을 찾아 이사 오는 가구가 많은 곳은 매매·전세 수요가 해마다 새로 들어와요.', s: '교육부 학교알리미 중학교 전·출입 학생 수' },
    u_rlp: { d: '단지 가까이에 계획이 발표됐지만 아직 공사를 시작하지 않은 새 철도역이 있는지 봐요.', w: '새 역 기대감은 개통 한참 전부터 가격에 조금씩 반영돼요.', s: '국토교통부·국가철도공단·지자체 공식 발표·고시(노선별 단계 일정), 역 위치 브이월드' },
    u_rls: { d: '단지 가까이에 공사 중인 새 철도역이 있는지 봐요.', w: '착공하면 개통이 현실이 되어 기대가 한 번 더 가격에 반영되는 경우가 많아요.', s: '국토교통부·국가철도공단·지자체 공식 발표·고시' },
    u_rlo: { d: '단지 가까이에 최근 2년 안에 개통한 새 역이 있는지 봐요.', w: '개통 뒤 실제 출퇴근이 편해지면서 수요가 따라 들어오는지 확인되는 시기예요.', s: '국토교통부·국가철도공단·지자체 공식 발표·고시' },
    u_rld: { d: '단지 가까이 새 역의 개통 목표가 처음 발표보다 늦어졌는지 봐요.', w: '일정이 밀리면 미리 반영됐던 기대가 식거나 뒤로 밀리기도 해요.', s: '국토교통부·국가철도공단·지자체 공식 발표(당초 목표와 현재 예정 비교)' },
    u_spa: { d: '단지 5km 안에 공공택지·신도시가 발표됐는지(아직 분양 전) 봐요.', w: '대규모 개발 발표는 도로·학교·상권 같은 기반시설 기대를 키우기도 하고, 앞으로의 공급 부담이 되기도 해요.', s: '국토교통부·LH·iH 공식 발표(후보지 발표·지구 지정)' },
    u_sps: { d: '단지 5km 안 공공택지·신도시가 분양·착공 단계인지 봐요.', w: '분양이 시작되면 새 아파트로 수요가 옮겨 가기도 하고, 주변 기반시설이 구체화되기도 해요.', s: '국토교통부·LH·iH 공식 발표(분양·착공)' },
    u_spm: { d: '단지 5km 안 신도시·공공택지의 첫 입주가 3년 안에 있었는지 봐요.', w: '입주가 몰리면 매물과 전세가 한꺼번에 나와 주변 시세를 누르기 쉬워요.', s: '국토교통부·LH·iH 공식 발표(입주), K-apt 사용승인일' },
    u_dd: { d: '직전 하락기에 고점 대비 얼마나 덜 빠졌는지', s: MOLIT }, u_rc: { d: '직전 고점 시세를 지금 얼마나 회복했는지', s: MOLIT },
    u_mom2: { d: '최근 시세가 얼마나 급하게 오르내렸는지', s: MOLIT }, u_lg: { d: '같은 동 가장 비싼 단지(같은 평형) 대비 가격', s: MOLIT },
    u_rel: { d: '같은 구 평균 대비 가격', s: MOLIT }, u_new: { d: '지어진 지 10년 이내 새 아파트인지', s: 'K-apt 사용승인일·실거래 건축년도' },
    u_old: { d: '재건축 연한에 가까운지', s: 'K-apt 사용승인일·실거래 건축년도' }, u_jr: { d: '매매 시세 대비 전세 보증금 비율', s: MOLIT_R },
    u_liq: { d: '최근 거래가 얼마나 꾸준했는지', s: MOLIT }, u_size: { d: '단지 전체 세대수', s: 'K-apt 세대수' },
    u_sub: { d: '가까운 지하철역까지 걸어서 몇 분인지', s: 'K-apt 인근 지하철역·도보 시간' }, u_vlo: { d: '용적률·대지지분으로 본 재건축 사업성', s: '건축물대장(건축HUB)·K-apt' },
    u_land: { d: '세대당 평균 대지지분', s: '건축물대장(건축HUB)·K-apt' },
    r_sup: { d: '앞으로 2년 동안 입주할 아파트가 지금 있는 아파트에 비해 얼마나 많은지 구·시끼리 비교해요.', w: '입주가 몰리면 새 집 매물과 전세가 한꺼번에 나와 주변 시세를 누르기 쉬워요.', s: '한국부동산원 청약홈 분양정보(입주 예정월), K-apt 사용승인일' },
    r_pop: { d: '최근 1년 주민등록 인구가 늘었는지 줄었는지 구·시끼리 비교해요.', w: '사람이 들어오는 지역은 집을 찾는 수요도 함께 늘어요.', s: '통계청 KOSIS 시·군·구별 주민등록 인구(발표 시차만큼 앞선 달 값만 사용)' },
    r_hhg: { d: '최근 1년 세대수가 얼마나 늘었는지 비교해요.', w: '집은 사람 수보다 세대 수만큼 필요해요. 1~2인 가구가 늘면 인구가 그대로여도 집 수요는 커져요.', s: '통계청 KOSIS 시·군·구별 주민등록 세대' },
    r_mom: { d: '구 전체 시세가 최근 1년 동안 같은 시·도 다른 구보다 더 올랐는지 봐요.', w: '지역 단위 흐름은 단지 하나보다 관성이 커서 먼저 움직인 지역이 한동안 이어 가는 경우가 많아요.', s: MOLIT },
    r_dd: { d: '직전 하락기에 구 전체가 시·도 평균보다 얼마나 덜 빠졌는지 봐요.', w: '하락장에서 버틴 지역은 수요층이 두텁다는 뜻이에요.', s: MOLIT },
    r_rc: { d: '구 전체 시세가 직전 고점을 시·도 평균보다 얼마나 회복했는지 봐요.', w: '먼저 회복한 지역은 시장이 먼저 찾는 곳이고, 덜 회복한 지역은 따라 오를 여지가 남은 곳일 수 있어요.', s: MOLIT },
    r_jr: { d: '구 전체의 매매 시세 대비 전세 보증금 비율을 비교해요.', w: '전세가율이 높은 지역은 실거주 수요가 탄탄해 매매가를 아래에서 받쳐 줘요.', s: MOLIT_R },
    r_rel: { d: '이 구·시 시세가 같은 시·도 평균보다 비싼 쪽인지 싼 쪽인지 봐요.', w: '시기에 따라 상급지로 수요가 몰리기도 하고, 덜 오른 지역이 따라붙기도 해요.', s: MOLIT },
    r_uns: { d: '팔리지 않은 새 아파트가 지역 재고에 비해 얼마나 쌓였는지 봐요.', w: '미분양이 많다는 건 그 가격에 사려는 사람이 부족하다는 신호예요.', s: '국토교통부 시·군·구별 미분양 현황(KOSIS)' },
    r_unc: { d: '최근 1년 동안 미분양이 늘었는지 줄었는지 봐요.', w: '미분양이 줄면 공급 부담이 풀리고 있다는 뜻이에요.', s: '국토교통부 시·군·구별 미분양 현황(KOSIS)' },
    r_job: { d: '그 지역 일자리(근무지 기준 취업자)가 최근 1년 동안 얼마나 늘었는지 봐요.', w: '일자리가 늘면 가까이 살려는 사람이 늘어요.', s: '통계청 지역별고용조사(KOSIS, 반기 발표 시차 반영)' },
    r_jbr: { d: '인구에 비해 그 지역에 일자리가 얼마나 몰려 있는지 봐요.', w: '업무지구처럼 일자리가 몰린 곳은 출퇴근 수요가 꾸준해요.', s: '통계청 지역별고용조사(KOSIS)·주민등록 인구' },
    r_pop3: { d: '최근 3년 주민등록 인구 변화를 구·시끼리 비교해요.', w: '1년보다 긴 인구 흐름은 일시적 이동보다 지역의 체질을 보여 줘요.', s: '통계청 KOSIS 시·군·구별 주민등록 인구' },
    r_a3049: { d: '최근 3년 30~40대 인구 변화를 구·시끼리 비교해요.', w: '30~40대는 집을 처음 사거나 넓혀 가는 나이대라 주택 수요와 가장 가깝게 움직여요.', s: '통계청 KOSIS 시·군·구별 연령별 주민등록 인구' }
  };
  /* excluded.json → 화면 항목 묶음.
     use: 지금 점수에 쓰는 항목 [{ key, name, kind('unit'|'region'), d, w, s }] (단지 → 지역 순, 같은 이름 하나로)
     out: 넣어 봤는데 과거에 안 맞아서 뺀 항목 [{ name, plain, kind }] (방향이 바뀜·더 잘 맞히지 못함)
     nodata: 자료가 모자라 아직 못 써 본 항목 이름 [] */
  function items(EX, h) {
    if (!EX || !EX.used) return null;
    h = String(h || 2);
    const seen = new Set(), use = [], out = [], nodata = [];
    const add = (arr, kind) => (arr || []).forEach(([k, name]) => {
      if (seen.has(kind + name)) return; seen.add(kind + name);
      const I = ITEM[(kind === 'unit' ? 'u_' : 'r_') + k] || {};
      use.push({ key: k, name, kind, d: I.d || '', w: I.w || '', s: I.s || '' });
    });
    add((EX.used.unit || {})[h], 'unit');
    add(EX.used.region, 'region');
    const os = new Set();
    const put = (rows, kind) => (rows || []).forEach(x => {
      const [k, name, code, plain] = x;
      if (code === 'no_data' || code === 'short') { if (!nodata.includes(name)) nodata.push(name); return; }
      if (os.has(name)) return; os.add(name);
      const I = ITEM[(kind === 'unit' ? 'u_' : 'r_') + k] || {};
      out.push({ key: k, name, kind, code, plain: plain || '', d: I.d || '', s: I.s || '' });
    });
    put((EX.unit || {})[h], 'unit'); put(EX.off, 'unit'); put(EX.region, 'region');
    return { use, out, nodata, reasons: EX.reasons || {} };
  }

  /* ---------- 뺀 항목 이유·과거 사례·어디에 쓰는지(/guide/method/) — 대표 지적 2026-11-25 ----------
     예전에는 엔진이 모든 뺀 항목에 같은 틀의 문장('시기마다 방향이 바뀌어…')을 붙여, 아래 과거 사례(같은 방향이 뚜렷함)와 어긋났어요.
     이제 이유는 두 가지 실제 결과로 정해요: ① 엔진이 점수에 넣어 과거에 그대로 써 본 결과(code: unstable 방향이 바뀜 · no_gain 더 잘 맞히지 못함)
     ② 그 항목만 따로 떼어 본 과거 사례(evidence.json → narrative.js xCases: 구간마다 같은 방향이 뚜렷했는지 ok).
     과거 사례 표 ↔ 항목: 항목마다 자기 구간만(신축 프리미엄 = 지은 지 10년 이내, 재건축 기대감 = 25년 이상) — 같은 사례 문장이 두 항목에 붙지 않게. */
  const CASE_OF = { sub: [['sd'], ['sw']], size: [['hh']], liq: [['tv12'], ['to']], sch: [['scr']],
    new: [['ag', ['n5', 'n10']]], old: [['ag', ['r29', 'r30']]] };
  const HS = ['1', '2', '3', '5'];
  /** 과거 사례 문장 함수: 종류 → narrative.js xCases(역까지 직선 거리는 서울 자료만, 나머지는 전국) — 화면과 매일 점검이 같은 것을 씀 */
  const XS = { sd: ['s00', '서울'] };
  function xcsOf(NAR, EVD) { return k => NAR && NAR.xCases && EVD ? NAR.xCases(EVD, k, (XS[k] || ['all'])[0], (XS[k] || ['', '전국'])[1]) : []; }
  const hText = hs => hs.map(Number).sort((a, b) => a - b).join('·') + '년 보유';
  /** 항목 하나의 과거 사례: xcs(종류) → [{ b, ok, up, text }] 중 그 항목 구간만 */
  function casesOf(key, xcs) {
    if (typeof xcs !== 'function') return [];
    return (CASE_OF[key] || []).flatMap(([k, bands]) => (xcs(k) || []).filter(c => !bands || bands.includes(String(c.b))));
  }
  /** 뺀 이유(쉬운 말): 엔진 결과 code + 따로 떼어 본 과거 사례 방향 */
  function reasonOf(name, code, cases, plain) {
    const A = J(name, '은', '는'), ok = (cases || []).filter(c => c.ok);
    if (code === 'unstable' || code === 'no_gain') {
      if (ok.length) return { why: 'combo', text: `${A} 이 항목만 따로 떼어 본 과거 사례에서는 같은 방향이 뚜렷했어요(아래 과거 사례). 하지만 다른 항목과 함께 점수에 넣어 과거에 그대로 써 보니 같은 구 안에서 더 오를 단지를 더 잘 맞히지 못해 뺐어요.` };
      if ((cases || []).length) return { why: code === 'unstable' ? 'flip_mixed' : 'gain_mixed', text: code === 'unstable'
        ? `${A} 점수에 넣어 과거에 그대로 써 보니 시기마다 집값에 주는 방향이 바뀌었고(어떤 때는 오르는 쪽, 어떤 때는 내리는 쪽), 따로 떼어 본 과거 사례도 구간마다 더 오른 단지와 덜 오른 단지가 비슷해서 뺐어요.`
        : `${A} 점수에 넣어 과거에 그대로 써 보니 더 잘 맞히지 못했고, 따로 떼어 본 과거 사례도 구간마다 더 오른 단지와 덜 오른 단지가 비슷해서 뺐어요.` };
      return { why: code === 'unstable' ? 'flip' : 'gain', text: code === 'unstable'
        ? `${A} 점수에 넣어 과거에 그대로 써 보니 시기마다 집값에 주는 방향이 바뀌어(어떤 때는 오르는 쪽, 어떤 때는 내리는 쪽) 맞히지 못해 뺐어요.`
        : `${A} 점수에 넣어 과거에 그대로 써 보니 더 잘 맞히지 못해 뺐어요.` };
    }
    return { why: code || '', text: plain || '' };
  }
  /** 어디에 쓰는지 표시: 단지 점수에서는 뺐지만 구 점수에는 씀 / ○년 보유에서만 씀(그 기간 목록 기준) */
  function useMap(EX) {
    const U = (EX && EX.used) || {}, byH = {};
    for (const h of HS) for (const [k] of ((U.unit || {})[h] || [])) (byH[k] = byH[k] || []).push(h);
    const reg = new Map(); for (const [k, nm] of (U.region || [])) reg.set(k, nm);
    return { byH, reg, hs: HS.filter(h => ((U.unit || {})[h] || []).length) };
  }
  /** 화면 묶음(/guide/method/): items() + 뺀 항목마다 이유·과거 사례·표시(tags), 쓰는 항목마다 '○년 보유에서만' 표시.
      xcs: 과거 사례 종류 → 문장(narrative.js xCases 를 시·도에 맞춰 감싼 함수), 없으면 사례 없이 */
  function method(EX, h, xcs) {
    const I = items(EX, h); if (!I) return null;
    h = String(h || 2);
    const M = useMap(EX);
    I.use.forEach(x => {
      x.tags = [];
      if (x.kind === 'unit') { const hs = M.byH[x.key] || []; if (hs.length && hs.length < M.hs.length) x.tags.push({ t: 'only', text: `${hText(hs)}에서만 써요` }); }
    });
    I.out.forEach(x => {
      x.cases = x.kind === 'unit' ? casesOf(x.key, xcs) : [];
      const r = reasonOf(x.name, x.code, x.cases, x.plain); x.why = r.why; x.reason = r.text;
      x.tags = [];
      if (x.kind === 'unit' && M.reg.has(x.key)) x.tags.push({ t: 'region', text: `단지 점수에서는 뺐지만 구 점수에는 써요(‘${M.reg.get(x.key)}’)` });
      const hs = x.kind === 'unit' ? (M.byH[x.key] || []).filter(v => v !== h) : [];
      if (hs.length) x.tags.push({ t: 'only', text: `${hText(hs)}에서만 써요(${Number(h)}년 보유 점수에서는 뺐어요)` });
    });
    return I;
  }
  /** 일관성 점검(매일 자동 점검 tools/method-consistency-test.js · 화면 점검 e2e): 문제 문장 목록, 없으면 []
      ① 이유가 '방향이 바뀌었다'는데 그 항목 과거 사례는 같은 방향이 뚜렷함 ② 같은 과거 사례 문장이 두 항목에 붙음
      ③ 뺀 항목인데 다른 곳(구 점수·다른 보유 기간)에 쓰면서 그 표시가 없음 ④ 같은 이름이 쓰는 항목·뺀 항목 양쪽에 */
  function audit(I, EX, h) {
    if (!I) return [];
    h = String(h || 2);
    const bad = [], M = useMap(EX), seen = new Map();
    for (const x of I.out) {
      const ok = (x.cases || []).some(c => c.ok);
      if (ok && /방향이\s*(바뀌|뒤집|불안정)/.test(x.reason || x.plain || '')) bad.push(`${x.name}: 이유는 '방향이 바뀜'인데 과거 사례는 같은 방향이 뚜렷해요`);
      for (const c of (x.cases || [])) {
        const o = seen.get(c.text);
        if (o && o !== x.name) bad.push(`같은 과거 사례 문장이 '${o}'·'${x.name}' 두 항목에 붙어 있어요: ${c.text.slice(0, 40)}…`);
        else seen.set(c.text, x.name);
      }
      const tags = (x.tags || []).map(t => t.t);
      if (x.kind === 'unit' && M.reg.has(x.key) && !tags.includes('region')) bad.push(`${x.name}: 구 점수에는 쓰는데 '단지 점수에서는 뺐지만 구 점수에는 써요' 표시가 없어요`);
      if (x.kind === 'unit' && (M.byH[x.key] || []).some(v => v !== h) && !tags.includes('only')) bad.push(`${x.name}: 다른 보유 기간 점수에는 쓰는데 '○년 보유에서만 써요' 표시가 없어요`);
      if (I.use.some(u => u.name === x.name && u.kind === x.kind)) bad.push(`${x.name}: 쓰는 항목과 뺀 항목에 함께 있어요`);
    }
    return bad;
  }

  /* ---------- '집값에 영향을 준다는데 왜 안 쓰나요?'(/guide/method/ #why) — 대표 지적 2026-11-25 ----------
     이번 재학습 기록(엔진 리포트 2026-11-25 · retrain_plan §8): 후보 수·채택 수·빠질 항목·excluded.json 에 없는 후보(규제·거래 회전율·역 승하차 등)의 결과.
     숫자는 개수·날짜만(가중치·기준값·개선 폭 없음). 엔진이 excluded.json 에 retrain 을 내보내면 그것을 우선 씀.
     extra 줄: [종류(region|unit|all), key, 이름, 결과('out'), 한 줄 이유] */
  const RETRAIN = { day: '2026-11-25', tried: 28, adopted: 0, next: '',
    drop: [['ob6', '외지인 매수 비중']],
    extra: [
      ['region', 'x_reg', '규제지역(투기과열·조정대상) 여부', 'out', '구 점수에 넣어 봐도 더 잘 맞히지 못했어요'],
      ['region', 'x_regc', '최근 1년 새로 규제·해제된 곳', 'out', '넣었을 때와 뺐을 때 차이가 없었어요'],
      ['region', 'x_thp', '토지거래허가·분양가상한제', 'out', '넣었을 때와 뺐을 때 차이가 없었어요'],
      ['region', 'x_turn', '거래 회전율(1년 거래 ÷ 세대수)', 'out', '구 점수에 넣어 봐도 더 잘 맞히지 못했어요'],
      ['unit', 'x_ride', '가까운 역 승하차 인원 1년 변화(서울)', 'out', '시기마다 집값에 주는 방향이 바뀌었어요'],
      ['unit', 'x_dreg', '동 단위 규제(일부 동만 묶인 규제)', 'out', '넣었을 때와 뺐을 때 차이가 없었어요'],
      ['all', 'x_rate', '주택담보대출·기준금리', 'out', '전국이 같은 값이라 단지·구 순위를 가를 수 없어요'],
      ['unit', 'x_acad', '학원 수·증감', 'out', '개설·폐원 날짜 기록이 없어 과거에 써 볼 수 없었어요']] };
  /* 표에 넣을 단지 항목(흔히 집값과 연결해 생각하는 것) — 쓰는지·뺐는지는 excluded.json 이 정함 */
  const WHY_UNIT = ['sub', 'sch', 'rlp', 'rls', 'rlo', 'stg', 'new', 'old', 'mom', 'liq', 'jr', 'dd', 'size'];
  /* '바뀌는 것'(아직 값에 다 들어가지 않은 변화) — 지금 쓰는 단지 항목 중 이것만 ②에 이름으로 */
  const WHY_CHG = ['rlp', 'rls', 'rlo', 'rld', 'sch', 'stg', 'spa', 'sps', 'spm'];
  /* 표 맨 위 순서: 대표가 꼽은 '사람들이 집값을 움직인다고 믿는 것' 먼저 */
  const WHY_TOP = ['pop', 'hhg', 'ob6', 'uns', 'unc', 'x_reg', 'x_turn', 'x_ride', 'job', 'sup', 'sub', 'sch', 'x_rate', 'rlp', 'new', 'jr'];
  /* ①에 먼저 이름을 드는 '구 전체를 움직이는 것'(인구·세대·일자리·입주 물량) — 지금 구 점수에 쓰는 것만 */
  const WHY_BIG = ['pop', 'hhg', 'job', 'jbr', 'sup'];
  const RES = { use: '쓴다', region: '구 점수에만', out: '뺐다' };
  /** 한 줄 이유(뺀 항목): method() 의 why 를 짧게 */
  function whyLine(x) {
    if (x.code === 'no_data' || x.code === 'short') return '자료가 모자라 아직 과거에 써 보지 못했어요';
    if (x.kind === 'region') return '구 점수에 넣어 봐도 더 잘 맞히지 못했어요';
    if (x.why === 'combo') return '따로 보면 같은 방향이 뚜렷했지만, 다른 항목과 함께 넣으니 더 잘 맞히지 못했어요';
    if (x.why === 'flip' || x.why === 'flip_mixed') return '시기마다 집값에 주는 방향이 바뀌었어요';
    return '넣어 봐도 더 잘 맞히지 못했어요';
  }
  /** I = method(EX, h, xcs). → { rec(이번 재학습 기록), regionUsed[이름], change[이름](지금 쓰는 '바뀌는 것'), combo[이름], drop[{name, pending}],
      rows[{ key, name, res('use'|'region'|'out'), label, why, kind }](WHY_TOP 순서 먼저), counts{use, region, out} } */
  function why(EX, I, h) {
    if (!EX || !EX.used || !I) return null;
    h = String(h || 2);
    const rec = Object.assign({}, RETRAIN, EX.retrain || {});
    const U = EX.used, u2 = new Map(((U.unit || {})[h] || []).map(([k, n]) => [k, n])), reg = new Map((U.region || []).map(([k, n]) => [k, n]));
    const dropK = new Set((rec.drop || []).map(d => d[0]));
    const rows = [], seen = new Set();
    const push = r => { if (seen.has(r.name)) return; seen.add(r.name); rows.push(r); };
    const outU = new Map(I.out.filter(x => x.kind === 'unit').map(x => [x.key, x]));
    /* nodata(자료 부족) 구 후보는 method().out 에 없으므로 excluded.json 에서 직접 */
    const outR = (EX.region || []).map(([k, name, code]) => ({ key: k, name, code, kind: 'region' }));
    const merged = new Set();                                   // 단지 줄에 합친 구 항목(같은 key: 전세가율·하락기 방어력…)
    for (const k of WHY_UNIT) {
      if (u2.has(k)) { push({ key: k, name: u2.get(k), kind: 'unit', res: 'use', why: '같은 구 안에서 더 오를 단지를 가려내는 데 과거에 맞아서 써요' }); continue; }
      const x = outU.get(k); if (!x) continue;
      if (reg.has(k)) { merged.add(k); push({ key: k, name: x.name, kind: 'unit', res: 'region', why: `단지끼리 가르는 데는 안 맞았지만 구 전체 흐름에는 맞아서 구 점수(‘${reg.get(k)}’)에 써요` }); continue; }
      push({ key: k, name: x.name, kind: 'unit', res: 'out', why: whyLine(x) });
    }
    for (const [k, n] of reg) {
      if (merged.has(k)) continue;
      push({ key: k, name: n, kind: 'region', res: 'region', pending: dropK.has(k),
        why: dropK.has(k) ? '더 엄격한 기준에서는 우연과 구별되지 않아 다음 정기 업데이트부터 빠져요' : '구 전체가 같은 시·도 안에서 더 오를지 맞히는 데 과거에 맞아서 써요' });
    }
    for (const x of outR) push({ key: x.key, name: x.name, kind: 'region', res: 'out', why: whyLine(x) });
    for (const [kind, k, n, res, w] of (rec.extra || [])) push({ key: k, name: n, kind, res, why: w });
    const pos = k => { const i = WHY_TOP.indexOf(k); return i < 0 ? WHY_TOP.length : i; };
    rows.forEach((r, i) => { r.i = i; r.label = RES[r.res]; });
    rows.sort((a, b) => pos(a.key) - pos(b.key) || a.i - b.i).forEach(r => delete r.i);
    const counts = { use: 0, region: 0, out: 0 }; rows.forEach(r => counts[r.res]++);
    return {
      rec, rows, counts,
      regionUsed: [...reg].filter(([k]) => !dropK.has(k)).map(([, n]) => n),
      regionBig: WHY_BIG.filter(k => reg.has(k) && !dropK.has(k)).map(k => reg.get(k)),
      change: [...new Set(WHY_CHG.filter(k => u2.has(k)).map(k => u2.get(k)))],
      combo: I.out.filter(x => x.kind === 'unit' && x.why === 'combo').map(x => x.name),
      drop: (rec.drop || []).map(([k, n]) => ({ key: k, name: n, pending: reg.has(k) }))
    };
  }
  /** 일관성 점검(#why ↔ excluded.json · 매일 자동 점검 tools/method-consistency-test.js): 문제 문장 목록, 없으면 [] */
  function whyAudit(W, EX, h) {
    if (!W) return ['#why 묶음이 없어요'];
    h = String(h || 2);
    const bad = [], U = (EX && EX.used) || {}, by = new Map(W.rows.map(r => [r.name, r]));
    const regK = new Set((U.region || []).map(x => x[0])), u2 = new Set(((U.unit || {})[h] || []).map(x => x[0]));
    const unitOut = new Set([...(((EX || {}).unit || {})[h] || []), ...((EX || {}).off || [])].map(x => x[0]));
    for (const [k, n] of (U.region || [])) {
      const r = W.rows.find(r => r.key === k && (r.kind === 'region' || r.res === 'region'));
      if (!r) bad.push(`구 점수에 쓰는 '${n}'이 표에 없어요`);
      else if (r.res !== 'region') bad.push(`'${n}'은 구 점수에 쓰는데 표에는 '${r.label}'`);
    }
    for (const x of ((EX || {}).region || [])) { const r = by.get(x[1]); if (!r) bad.push(`뺀 구 후보 '${x[1]}'이 표에 없어요`); else if (r.res !== 'out') bad.push(`'${x[1]}'은 뺀 항목인데 표에는 '${r.label}'`); }
    for (const r of W.rows.filter(r => r.kind === 'unit' && !/^x_/.test(r.key))) {
      const want = u2.has(r.key) ? 'use' : regK.has(r.key) ? 'region' : 'out';
      if (r.res !== want) bad.push(`'${r.name}': excluded.json 기준 '${RES[want]}'인데 표에는 '${r.label}'`);
      if (want !== 'use' && !unitOut.has(r.key)) bad.push(`'${r.name}': 쓰는 항목에도 뺀 항목에도 없어요`);
    }
    if (W.rows.length !== new Set(W.rows.map(r => r.name)).size) bad.push('표에 같은 이름이 두 번 나와요');
    const c = W.counts; if (c.use + c.region + c.out !== W.rows.length) bad.push('결과별 개수 합이 표 줄 수와 달라요');
    const nu = W.regionUsed.length + W.drop.filter(d => d.pending).length;
    if (nu !== (U.region || []).length) bad.push(`구 점수에 쓰는 항목 수(${(U.region || []).length})와 ①의 이름 수(${nu})가 달라요`);
    if (W.regionBig.some(n => !W.regionUsed.includes(n))) bad.push('①에 구 점수에 쓰지 않는 이름이 있어요');
    if (W.change.some(n => !((U.unit || {})[h] || []).some(x => x[1] === n))) bad.push('②의 지금 쓰는 변화 항목에 쓰지 않는 이름이 있어요');
    if (!(W.rec.tried > 0) || !(W.rec.adopted >= 0) || W.rec.adopted > W.rec.tried) bad.push('후보 수·채택 수가 이상해요');
    for (const d of W.drop) if (!d.pending && regK.has(d.key)) bad.push(`'${d.name}'은 빠졌다는데 아직 구 점수에 써요`);
    if (W.rows.some(r => /\d+(\.\d+)?\s*%|표준오차|가중치|기준값/.test(r.why))) bad.push('한 줄 이유에 숫자 기준·가중치가 들어 있어요');
    if (W.rows.some(r => /시험|통과|검증|채점|백테스트/.test(r.why))) bad.push('한 줄 이유에 금지 단어(시험·통과·검증·채점)가 있어요');
    return bad;
  }

  const API = { scopes, shortOf, wavg, head, cards, weak, grades, regionRows, yearRows, phaseRows, period, bars, tmUnits, tmPick, tmRows, items, ITEM, ymKo, ymAdd, pp, pc, nf, J,
    CASE_OF, casesOf, reasonOf, method, audit, xcsOf, RETRAIN, why, whyAudit };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_TRACK = API;
})(typeof window !== 'undefined' ? window : this);
