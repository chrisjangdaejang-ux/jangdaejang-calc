/* 집예보 미래가치 리포트 '분석 설명' (한 줄 결론 → 핵심 요약 → 줄별 자세히 보기)
   무료 리포트 buy/report/ · 내 집 시세 mine/ 공통, 프리미엄 premium/view/ 은 펼친 곳에 사례 표·기간별 상세·차트를 더한다.
   - 공개 자료 파일 값(사이트 단지 fx, index.json, evidence.json, model_h.json, supply.json)만 문장으로 바꾼다.
     가중치·계수·임계값은 이 파일에 없다(요인의 방향·순서·사실값·과거 사례 통계만).
   - 문장 규칙(tools/narrative-test.js 로 강제): 문장마다 주어+숫자+비교 기준+의미, 전문 용어 금지 또는 즉시 풀이,
     0에 가까운 값은 '비슷해요', 확인 안 된 숫자는 문장 생략, 같은 통계 반복 금지, 방어적 면책 금지.
   window.JDJ_NAR = { build(f, c), html(N, o), bind(root, o), lint(N) }
     c = { apt, dong, code, band, area, IX, EV(evidence.json), MH(model_h.json), SP(supply.json), PL(JDJ_PLAIN), year, s(이 평형 월별 평당가, IX.months 와 같은 길이), regionUsed }
     N = { head, gap, lines:[{k, t(요약 한 줄), d:[사실, 비교, 과거 사례, 그래서](빈 칸 생략), pro:{rows, per, chart}}] } */
(function (root) {
  'use strict';
  const Q5 = { 4: '가장 높은 20%', 3: '상위 21~40%', 2: '중간 20%', 1: '하위 21~40%', 0: '가장 낮은 20%' };
  const KINDS = ['r1', 'r2', 'r3', 'price', 'watch', 'fit'];
  const BANNED = ['요인', '참고 정보', '참고만', '영향 작음', '순전입률', '백분위', '가중치', '계수', '임계', '보장하지', '책임지지', '투자 판단은', '모델'];

  /* ---------- 숫자·말 도우미 ---------- */
  function J(w, a, b) {
    const c = String(w).trim().slice(-1).charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return w + ((c - 0xAC00) % 28 ? a : b);
    const d = String(w).trim().slice(-1);
    if (/[0-9]/.test(d)) return w + ('013678'.includes(d) ? a : b);
    return w + a;
  }
  const r1 = v => (Math.round(Math.abs(v) * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const pctAbs = v => r1(v * 100) + '%';                                  // 0.268 → '26.8%'
  const pctSg = v => (v > 0.0005 ? '+' : v < -0.0005 ? '−' : '') + r1(v * 100) + '%';
  const n0 = v => Math.round(v).toLocaleString('ko-KR');
  const topPct = v => (v = Math.round(v), v >= 50 ? `상위 ${Math.max(1, 100 - v)}%` : `하위 ${Math.max(1, v)}%`);
  const ymKo = v => `${String(v).slice(0, 4)}년 ${parseInt(String(v).slice(4, 6), 10)}월`;
  function won(man) {
    man = Math.round(man); if (!(man > 0)) return '';
    const e = Math.floor(man / 10000), r = man % 10000;
    return !e ? n0(r) + '만 원' : e + '억' + (r ? ' ' + n0(r) + '만' : '') + ' 원';
  }
  const eok = man => (Math.round(man / 1000) / 10).toFixed(1).replace(/\.0$/, '') + '억';
  const VOK = m => !!(m && (m.oos_all || []).length >= 2 && m.oos_avg > 0);
  /* 용어 풀이: 한 묶음(요약 전체 / 펼친 문단 하나) 안에서 처음 나올 때만 */
  const GL = { '%p': '%p(두 상승률의 차이)', '전세가율': '전세가율(집값 대비 전셋값 비율)', '평당': '평당(전용 3.3㎡당)' };
  function glosser() { const used = new Set(); return t => { if (used.has(t)) return t; used.add(t); return GL[t] || t; }; }
  /* 두 비율 차이(%p) 문구: 0.2%p 미만은 '비슷하게' */
  const ppMore = (ex, G) => Math.abs(ex) < 0.2 ? '비슷하게' : `평균 ${r1(ex)}${G('%p')} ${ex > 0 ? '더' : '덜'}`;
  /* 점수(0~100, 높을수록 더 오를 쪽) → 말 */
  function lean(s, mid) {
    if (s == null) return '';
    const [a, b] = s >= 70 ? ['평균보다 더 오를 가능성이 커요', '평균보다 더 오를 가능성이 크고'] : s >= 55 ? ['평균보다 더 오를 쪽이에요', '평균보다 더 오를 쪽이고']
      : s > 45 ? ['평균과 비슷하게 움직일 쪽이에요', '평균과 비슷하게 움직일 쪽이고'] : s > 30 ? ['평균보다 덜 오를 쪽이에요', '평균보다 덜 오를 쪽이고']
      : ['평균보다 덜 오를 가능성이 커요', '평균보다 덜 오를 가능성이 크고'];
    return mid ? b : a;
  }
  const side = s => s >= 55 ? 1 : s <= 45 ? -1 : 0;

  /* ---------- 가격 위치 사실값 ---------- */
  function lastOf(arr) { for (let i = (arr || []).length - 1; i >= 0; i--) if (arr[i] > 0) return [arr[i], i]; return [null, -1]; }
  function median(a) { const v = a.filter(x => x > 0).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
  function priceFacts(c) {
    const [now, i] = lastOf(c.s); if (!now) return null;
    const g = c.IX && c.IX.sgg && c.IX.sgg[c.code]; const sido = g && g.sido;
    const [gu] = g ? lastOf(g.s) : [null];
    const sdv = sido ? Object.values(c.IX.sgg).filter(v => v.sido === sido).map(v => lastOf(v.s)[0]) : [];
    let pk = 0, pi = -1; (c.s || []).forEach((v, j) => { if (v > pk) { pk = v; pi = j; } });
    return { now, at: c.IX.months[i], gu, sd: sdv.length >= 3 ? median(sdv) : null, nsd: sdv.length, pk, pkAt: pi >= 0 ? c.IX.months[pi] : null, pkIsNow: pi === i || now >= pk * 0.995 };
  }

  /* ---------- 과거 사례 문장 ---------- */
  function unitEv(c, kind) {
    const f = c.f, b = f.eb && f.eb[kind]; if (b == null || !c.EV || !c.EV.sido) return null;
    const e = ((c.EV.sido[c.sid] || {})[kind] || {})[String(b)];
    return e && e.n > 0 && e.ex != null ? Object.assign({ b }, e) : null;
  }
  function regionEv(c, kind) {
    const g = c.IX && c.IX.sgg && c.IX.sgg[c.code], b = g && g.r && g.r.eb && g.r.eb[kind];
    const R = c.EV && c.EV.region && c.EV.region.sido && c.EV.region.sido[c.sid];
    const e = b != null && R && R[kind] && R[kind][String(b)];
    return e && e.n > 0 && e.ex != null ? Object.assign({ b }, e) : null;
  }
  const hitTxt = (e, dn) => e.hit == null ? '' : (dn ? `${n0(e.n)}건 중 ${n0(e.n * (100 - e.hit) / 100)}건이 덜 오름` : `${n0(e.n)}건 중 ${n0(e.n * e.hit / 100)}건이 더 오름`);
  /* 시기별 표(프리미엄) */
  const perRows = (e, base) => (e && e.per || []).slice().sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(p => [`${ymKo(p[0])}부터 2년`, `${n0(p[1])}건`, `${p[2] > 0 ? '+' : p[2] < 0 ? '−' : ''}${r1(p[2])}%p`, p[3] != null ? `${p[3]}%` : '-', base]);

  /* ---------- 단지 사실 문장(요인 키별) ----------
     → {sum(요약용 짧은 사실, 비교 포함), fact, cmp, ev(과거 사례 kind)} — 사실값이 없으면 null */
  const EVK = { mom: 'mom', rel: 'rel', jr: 'jr', dd: 'dd', rc: 'rc', lg: 'lg', sch: 'sch' };
  function unitFact(k, c, G) {
    const f = c.f, WF = f.wf || {}, A = J(c.apt, '은', '는'), SG = c.sgg, SD = c.sido;
    const wfv = (key, raw) => WF[key] && WF[key][0] != null ? WF[key][0] : raw;
    const gm = key => WF[key] && WF[key][1] != null ? WF[key][1] : null;
    const sp = key => WF[key] && WF[key][2] != null ? WF[key][2] : null;
    const qb = key => f.eb && /^[0-4]$/.test(String(f.eb[key])) ? +f.eb[key] : null;
    const where = (key, what) => sp(key) != null ? `${SD} 단지 중 ${what} ${topPct(sp(key))}` : qb(key) != null ? `${SD} 단지 중 ${what} ${Q5[qb(key)]}` : '';
    switch (k) {
      case 'mom': {
        const v = wfv('mom', f.mom); if (v == null) return null;
        const flat = Math.abs(v) < 0.01;
        const s0 = flat ? `최근 6개월 시세가 ${pctSg(v)}로 그 전 6개월과 비슷해요` : `최근 6개월 시세가 그 전 6개월보다 ${pctAbs(v)} ${v > 0 ? '올랐어요' : '내렸어요'}`;
        const w = where('mom', '상승 폭');
        return { sum: s0 + (w ? `(${w})` : ''), fact: `${A} 최근 6개월 ${G('평당')} 시세가 그 전 6개월보다 ${flat ? `${pctSg(v)}로 비슷해요` : `${pctAbs(v)} ${v > 0 ? '올랐어요' : '내렸어요'}`}.`,
          cmp: [gm('mom') != null ? `같은 기간 ${SG} 단지 중간값은 ${pctSg(gm('mom'))}예요.` : '', w ? `${SD} 단지 전체와 비교하면 상승 폭이 ${w.replace(`${SD} 단지 중 상승 폭 `, '')}에 들어요.` : ''].filter(Boolean).join(' '), ev: 'mom', cond: `최근 6개월 상승 폭이 ${Q5[qb('mom')] || ''}` };
      }
      case 'jr': {
        const v = wfv('jr', f.jr); if (v == null) return null;
        const w = where('jr', '전세가율');
        return { sum: `${G('전세가율')}이 ${Math.round(v * 100)}%예요` + (gm('jr') != null ? `(${SG} 단지 중간값 ${Math.round(gm('jr') * 100)}%)` : w ? `(${w})` : ''),
          fact: `${A} ${G('전세가율')}이 ${Math.round(v * 100)}%예요.`, cmp: [gm('jr') != null ? `${SG} 단지 중간값은 ${Math.round(gm('jr') * 100)}%예요.` : '', w ? `${SD} 단지 전체와 비교하면 ${w.replace(`${SD} 단지 중 `, '')}예요.` : ''].filter(Boolean).join(' '),
          ev: 'jr', cond: `전세가율이 ${Q5[qb('jr')] || ''}` };
      }
      case 'rel': {
        const v = WF.rel ? WF.rel[0] : null; if (v == null) return null;
        const t = Math.abs(v) < 0.03 ? `${SG} 전체 시세와 비슷해요` : `${SG} 전체 시세보다 ${Math.round(Math.abs(v) * 100)}% ${v > 0 ? '비싸요' : '싸요'}`;
        return { sum: `${G('평당')} 시세가 ${t}`, fact: `${A} ${G('평당')} 시세가 ${t}.`, cmp: where('rel', '구 안 가격 수준') ? `${where('rel', '구 안 가격 수준')}이에요.` : '', ev: 'rel', cond: `같은 구 안 가격 수준이 ${Q5[qb('rel')] || ''}` };
      }
      case 'dd': {
        const v = wfv('dd', f.dd); if (v == null) return null;
        const t = Math.abs(v) < 0.01 ? `최근 3년 하락기에 ${SG} 전체와 비슷하게 내렸어요` : `최근 3년 하락기에 ${SG} 전체보다 ${r1(v * 100)}${G('%p')} ${v > 0 ? '덜' : '더'} 내렸어요`;
        return { sum: t, fact: `${A} ${t}.`, cmp: where('dd', '하락기 방어') ? `${where('dd', '하락기 방어')}예요.` : '', ev: 'dd', cond: `하락기 방어가 ${Q5[qb('dd')] || ''}` };
      }
      case 'lg': {
        const v = wfv('lg', f.lg); if (v == null) return null;
        const lead = v >= 0.995 || (f.ln && f.ln === c.apt);
        const t = lead ? `${c.dong}에서 같은 평형 시세가 가장 높은 대장 단지예요` : `같은 평형 시세가 ${c.dong} 대장 단지(${f.ln || '-'})보다 ${Math.round((1 - v) * 100)}% 낮아요`;
        return { sum: t, fact: `${A} ${t}.`, cmp: '', ev: 'lg', cond: `동네 대장 단지 대비 가격이 ${Q5[qb('lg')] || ''}` };
      }
      case 'sch': {
        const sc = f.sc; if (!Array.isArray(sc) || !sc[0]) return null;
        const [nm, p, , , r, n] = sc;
        const t = Math.abs(p) < 0.5 ? `가까운 ${nm}는 최근 3년 전학 온 학생과 떠난 학생이 비슷해요(한 해 평균 ${p > 0 ? '+' : p < 0 ? '−' : ''}${r1(p)}%)`
          : `가까운 ${nm}는 최근 3년 ${p > 0 ? '전학 온 학생이 떠난 학생보다' : '떠난 학생이 전학 온 학생보다'} 재학생의 한 해 평균 ${r1(p)}%만큼 많아요`;
        return { sum: t, fact: `${t}.`, cmp: n >= 3 && r >= 1 ? `${SG} 중학교 ${n}곳 중 학생이 많이 모이는 순서로 ${r}위예요.` : '', ev: Math.abs(p) < 0.5 ? null : 'sch', cond: `가까운 중학교 전입이 ${Q5[qb('sch')] || ''}` };
      }
      case 'size': {
        const v = wfv('size', f.hh); if (!v) return null;
        return { sum: `${n0(v)}세대 규모예요` + (gm('size') != null ? `(${SG} 단지 중간값 ${n0(gm('size'))}세대)` : ''), fact: `${A} ${n0(v)}세대예요.`, cmp: gm('size') != null ? `${SG} 단지 중간값은 ${n0(gm('size'))}세대예요.` : '' };
      }
      case 'liq': {
        const x = WF.liq; if (!x || x[0] == null) return null;
        return { sum: `최근 2년 이 평형 실거래가 ${n0(x[0])}건이에요` + (x[1] != null ? `(${SG} 중간값 ${n0(x[1])}건)` : ''), fact: `${A} 최근 2년 이 평형 실거래가 ${n0(x[0])}건이에요.`, cmp: x[1] != null ? `${SG} 단지 중간값은 ${n0(x[1])}건이에요.` : '' };
      }
      case 'sub': {
        const v = wfv('sub', f.sub); if (v == null || v >= 30) return null;
        const t = `${f.subs ? f.subs.replace(/\s+/g, ' ') : '지하철역'}까지 걸어서 ${v <= 5 ? '5분 이내' : v + '분 이내'}예요`;
        return { sum: t, fact: `${A} ${t}.`, cmp: '' };
      }
      case 'stg': {
        const z = f.rz, ST = c.PL && c.PL.STAGE;
        if (z && z.lv) return { sum: `재건축 ${(ST && ST[z.lv]) || z.lv + '단계'} 단계예요(10단계 중 ${z.lv}번째)`, fact: `${A} 재건축 10단계 중 ${z.lv}번째인 ${(ST && ST[z.lv]) || ''} 단계예요${z.ym ? `(${ymKo(z.ym)})` : ''}.`, cmp: '', ev: 'stg', cond: `재건축 ${(ST && ST[z.lv]) || ''} 단계` };
        return null;
      }
      default: return null;
    }
  }

  /* 과거 사례가 같은 방향일 때만 붙이는 쉬운 해석(요약 줄용) */
  const MEAN = {
    mom: { up: '쉬어 간 단지가 이후 따라 오른 경우가 많아', dn: '짧게 많이 오른 단지가 이후 쉬어 간 경우가 많아' },
    rel: { up: '구 안에서 비싼 단지가 이후에도 더 오른 경우가 많아', dn: '구 안에서 싼 단지가 이후에도 덜 오른 경우가 많아' },
    jr: { up: '전세가율이 이 수준인 단지가 이후 더 오른 경우가 많아', dn: '전세가율이 이 수준인 단지가 이후 덜 오른 경우가 많아' },
    dd: { up: '하락기 움직임이 이랬던 단지가 이후 더 오른 경우가 많아', dn: '하락기 움직임이 이랬던 단지가 이후 덜 오른 경우가 많아' },
    lg: { up: '대장 단지와 이 정도 차이인 단지가 이후 더 오른 경우가 많아', dn: '대장 단지와 이 정도 차이인 단지가 이후 덜 오른 경우가 많아' },
    sch: { up: '학생이 모이는 학교 근처 단지가 이후 더 오른 경우가 많아', dn: '학생이 빠지는 학교 근처 단지가 이후 덜 오른 경우가 많아' },
    stg: { up: '이 단계 재건축 단지가 이후 더 오른 경우가 많아', dn: '이 단계 재건축 단지가 이후 덜 오른 경우가 많아' }
  };

  /* ---------- 줄 만들기 ---------- */
  function build(f, c) {
    c = Object.assign({}, c, { f });
    const PL = c.PL || root.JDJ_PLAIN || {}, IX = c.IX || {};
    const g = (IX.sgg && IX.sgg[c.code]) || {}, sdo = (IX.sido || []).find(s => s.name === g.sido) || {};
    c.sgg = g.name || '같은 구'; c.sido = sdo.short || g.sido || ''; c.sid = sdo.id; c.year = c.year || new Date().getFullYear();
    const A = J(c.apt, '은', '는'), SG = c.sgg, SD = c.sido, MH = c.MH || {};
    const out = { head: '', gap: '', lines: [] };
    if (!f || f.fv == null) return out;
    const Gs = glosser();                         // 요약(맨 위 + 요약 줄)용 풀이
    const fh = f.fh || {};
    const longH = [3, 5].filter(h => fh[h] != null && VOK(MH[h]));
    const L = longH[0];
    const sL = L != null ? fh[L] : null;
    const rp = PL.regionPlace ? PL.regionPlace(IX, c.code, f.gs) : null;
    const regionUsed = c.regionUsed !== false && f.gs != null && rp;

    /* ① 한 줄 결론 */
    if (sL != null && side(sL) !== side(f.fv)) out.head = `${A} 앞으로 2년은 ${SD} 아파트 ${lean(f.fv, 1)}, ${L}년 이상 보면 ${lean(sL)}.`;
    else if (sL != null) out.head = `${A} 앞으로 2년도, ${L}년 이상 길게 봐도 ${SD} 아파트 ${lean(f.fv)}.`;
    else out.head = `${A} 앞으로 2년 ${SD} 아파트 ${lean(f.fv)}.`;

    /* ② 이유 줄 */
    const reasons = [];
    const regGap = f.fvg != null ? f.fvg - f.fv : 0;          // 구 안 순위와 지역 흐름까지 더한 순위 차이
    const R = g.r || {}, SR = sdo.r || {};
    if (regionUsed && Math.abs(regGap) >= 10 && rp.pos !== '중위권' && R.mom != null) {
      const dn = regGap > 0, G = glosser();
      const hiMom = SR.mom != null && R.mom > SR.mom;
      const times = SR.mom > 0 && R.mom / SR.mom >= 1.8 ? `의 약 ${Math.round(R.mom / SR.mom)}배` : '';
      const sum = `${SG} 전체 시세가 최근 1년 ${r1(R.mom)}% ${R.mom >= 0 ? '올라' : '내려'}` + (SR.mom != null ? ` ${SD} 구 중간값(${r1(SR.mom)}%)${times || (hiMom ? '보다 높아요' : '보다 낮아요')}` : '')
        + ` — 그래서 앞으로 2년 ${SG} 흐름은 ${rp.text}로 ${dn ? '약한' : '강한'} 편이에요.`;
      const fact = `${SG} 아파트 ${G('평당')} 시세는 최근 1년 ${r1(R.mom)}% ${R.mom >= 0 ? '올랐어요' : '내렸어요'}` + (R.jr != null ? `. ${SG} 전체 ${G('전세가율')}은 ${r1(R.jr)}%예요.` : '.');
      const cmp = SR.mom != null ? `${SD} ${rp.n}개 구의 중간값은 1년 상승률 ${r1(SR.mom)}%` + (SR.jr != null && R.jr != null ? `, 전세가율 ${r1(SR.jr)}%예요. ${SG}는 상승률이 ${r1(R.mom - SR.mom)}${G('%p')} ${R.mom > SR.mom ? '높고' : '낮고'}, 전세가율은 ${r1(R.jr - SR.jr)}%p ${R.jr > SR.jr ? '높아요' : '낮아요'}.` : `예요. ${SG}는 ${r1(R.mom - SR.mom)}${G('%p')} ${R.mom > SR.mom ? '높아요' : '낮아요'}.`) : '';
      const e = regionEv(c, 'mom');
      let past = '';
      if (e && Math.sign(e.ex) === (dn ? -1 : 1) && Math.abs(e.ex) >= 0.2)
        past = `과거 ${SD}에서 1년 상승률이 ${Q5[e.b]}에 들었던 구는 이후 2년 ${SD} 평균보다 ${ppMore(e.ex, G)} 올랐어요(사례 ${hitTxt(e, dn)}).`;
      const so = `그래서 ${c.apt}의 2년 순위(${SD} ${topPct(f.fv)})는 단지보다 ${SG} 전체 흐름 때문에 ${dn ? '낮아졌어요' : '높아졌어요'}. ${SG} 안에서만 비교하면 ${c.apt}는 ${topPct(f.fvg)}예요.`;
      reasons.push({ k: 'reg', t: sum, d: [fact, cmp, past, so], ev: e, evBase: `${SD} 평균 대비` });
    }
    /* 단지 자체: 2년 점수 방향 태그 → 사실값이 있는 것만, 이미 쓴 통계는 다시 안 씀 */
    const usedEv = new Set();
    const tagLines = (h, max) => {
      const w = (f.why && f.why[String(h)]) || [];
      const res = [];
      for (const tag of w) {
        const k = tag.slice(0, -1), up = tag.endsWith('+');
        if (k === 'reg' || res.length >= max || reasons.some(x => x.k === k)) continue;
        const G = glosser(), F = unitFact(k, c, G); if (!F) continue;
        let past = '', e = null;
        if (F.ev && !usedEv.has(F.ev)) {
          e = unitEv(c, F.ev);
          if (e && Math.sign(e.ex) === (up ? 1 : -1) && Math.abs(e.ex) >= 0.5) {
            usedEv.add(F.ev);
            past = `과거 ${SD}에서 ${F.cond} 단지 ${n0(e.n)}건은 2년 뒤 같은 구 평균보다 ${ppMore(e.ex, G)} 올랐어요(${hitTxt(e, !up)}).`;
          } else e = null;
        }
        const so = `그래서 이 점은 ${c.apt}의 ${h}년 점수를 ${up ? '올렸어요' : '낮췄어요'}` + (h === 2 && regionUsed && reasons.length ? ` — ${SG} 전체 흐름과는 ${up === (regGap <= 0) ? '같은' : '반대'} 방향이에요.` : '.');
        const mean = e && MEAN[F.ev] ? MEAN[F.ev][up ? 'up' : 'dn'] + ' ' : '';
        res.push({ k, t: `${F.sum} — ${mean ? mean : '그래서 '}${h}년 점수를 ${up ? '올렸어요' : '낮췄어요'}.`, d: [F.fact, F.cmp, past, so], ev: e, evBase: '같은 구 평균 대비', h });
      }
      return res;
    };
    reasons.push(...tagLines(2, 2));
    /* 긴 보유 기간 쪽 방향이 다르면 그 기간 이유(사실값 있는 것) 1개 */
    if (L != null && side(sL) !== side(f.fv)) reasons.push(...tagLines(L, 1));
    const RS = reasons.slice(0, 3);
    RS.forEach((x, i) => { x.k = KINDS[i]; });

    /* ③ 지금 가격 위치 */
    const P = priceFacts(c), lines = RS.slice();
    if (P) {
      const G = glosser();
      const vsGu = P.gu ? P.now / P.gu - 1 : null, vsPk = P.pk ? P.now / P.pk - 1 : null, lg = f.lg;
      const lead = lg != null && (lg >= 0.995 || f.ln === c.apt);
      const parts = [];
      if (vsGu != null) parts.push(Math.abs(vsGu) < 0.03 ? `${SG} 전체 시세와 비슷하고` : `${SG} 전체 시세보다 ${Math.round(Math.abs(vsGu) * 100)}% ${vsGu > 0 ? '비싸고' : '싸고'}`);
      if (vsPk != null) parts.push(P.pkIsNow ? '최근 3년 중 가장 높은 값이에요' : `최근 3년 최고였던 ${ymKo(P.pkAt)}보다 ${r1(-vsPk * 100)}% 낮아요`);
      const sum = `${Gs('평당')} ${won(P.now)}으로 ${parts.join(', ')}` + (lg != null ? (lead ? `. ${c.dong} 대장 단지예요.` : `. ${c.dong} 대장 ${f.ln || '단지'}보다 ${Math.round((1 - lg) * 100)}% 낮아요.`) : '.');
      const area = c.area || null;
      const fact = `${c.apt} ${c.band || ''} ${G('평당')} 시세는 ${ymKo(P.at)} 기준 ${won(P.now)}이에요` + (area ? `(전용 ${area}㎡ 한 채 약 ${eok(P.now * area / 3.3058)}).` : '.');
      const cmp = [P.gu ? `${SG} 아파트 전체 ${G('평당')} 시세는 ${won(P.gu)}` + (P.sd ? `, ${SD} ${P.nsd}개 구 중간값은 ${J(won(P.sd), '이에요', '예요')}.` : '이에요.') : '',
        P.pk && !P.pkIsNow ? `${c.apt}의 최근 3년 최고 시세는 ${ymKo(P.pkAt)} ${J(won(P.pk), '이었어요', '였어요')}.` : '',
        lg != null && !lead ? `${c.dong} 대장 단지 ${f.ln || ''}는 같은 평형 기준 ${c.apt}보다 ${Math.round((1 / lg - 1) * 100)}% 비싸요.` : ''].filter(Boolean).join(' ');
      let past = '', e = null;
      const relE = !usedEv.has('rel') && unitEv(c, 'rel');
      if (relE && Math.abs(relE.ex) >= 0.5) {
        e = relE; usedEv.add('rel');
        past = `과거 ${SD}에서 같은 구 안 가격 수준이 ${Q5[relE.b]}였던 단지 ${n0(relE.n)}건은 2년 뒤 같은 구 평균보다 ${ppMore(relE.ex, G)} 올랐어요(${hitTxt(relE, relE.ex < 0)}).`;
      }
      const hi = vsGu != null && vsGu >= 0.1;
      const so = '그래서 ' + [hi ? `${c.apt}는 ${SG} 안에서 이미 비싼 편이에요` : vsGu != null && vsGu <= -0.1 ? `${c.apt}는 ${SG} 안에서 싼 편이에요` : `${c.apt}는 ${SG} 안에서 중간 가격대예요`,
        e ? (e.ex > 0 === hi ? (hi ? '과거엔 이런 비싼 단지가 오히려 더 오른 경우가 많아, 가격 수준 자체가 약점은 아니에요' : '과거엔 이런 싼 단지가 더 오른 경우가 많았어요')
          : (hi ? '과거엔 이런 비싼 단지의 오름폭이 작은 경우가 많아, 가격 부담을 따져 봐야 해요' : '과거엔 이런 싼 단지의 오름폭이 작은 경우가 많았어요')) : '',
        P.pk && !P.pkIsNow && vsPk <= -0.03 ? `최근 3년 최고가보다 ${r1(-vsPk * 100)}% 아래예요` : ''].filter(Boolean).join('. ') + '.';
      lines.push({ k: 'price', t: sum, d: [fact, cmp, past, so], ev: e, evBase: '같은 구 평균 대비', chart: true });
    }

    /* ④ 앞으로 볼 변수: 공급(같은 조건끼리 묶기) · 신설역 · 개발사업(assets/devproj-view.js 가 있으면 비동기로) */
    {
      const G = glosser(), parts = [], facts = [], pasts = [];
      const SP = c.SP, nextTxt = [];
      if (f.sl && SP && SP.zones) {
        const grp = new Map();
        for (const [id, ring] of f.sl) {
          const z = SP.zones[id]; if (!z || z.x) continue;
          const key = (ring === 'n' ? 'near' : 'life') + '|' + (z.st === 3 ? 'move' : z.st === 2 ? 'sale' : 'ann');
          if (!grp.has(key)) grp.set(key, []);
          grp.get(key).push(z);
        }
        for (const [key, zs] of grp) {
          const [ring, st] = key.split('|'), where = ring === 'near' ? '가까운' : '같은 생활권', stg = st === 'move' ? '입주 시작' : st === 'sale' ? '분양·착공' : '발표';
          const nm = z => z.n.replace(/\s*(공공주택지구|공공택지|지구)$/, '').replace(/^(서울|경기|인천)\s*/, '');
          const tot = zs.reduce((a, z) => a + (z.u || 0), 0);
          nextTxt.push(`${where} 공급 ${r1(tot / 10000)}만 가구`);
          parts.push(`${where} 대규모 공급 ${zs.length}곳(${zs.map(z => `${nm(z)} ${r1(z.u / 10000)}만 가구`).join(', ')}, ${stg} 단계)`);
          facts.push(`${A} ${where}에 ${stg} 단계인 대규모 공급 ${zs.length}곳, 모두 ${r1(tot / 10000)}만 가구가 있어요: ` + zs.map(z => `${z.n} ${n0(z.u)}가구(${z.h && z.h[0] ? ymKo(z.h[0][0]) + ' 발표' : '발표 시기 확인 안 됨'}${z.plan ? `, 첫 입주 목표 ${z.plan}년` : ''})`).join(', ') + '.');
          const RR = SP.ring && SP.ring[ring] && SP.ring[ring][st];
          if (RR && RR.n >= 3 && RR.ex != null)
            pasts.push(`과거 ${where}에 ${stg} 단계 대규모 공급이 있던 단지 ${RR.n}곳은 이후 2년 같은 구 평균보다 ${ppMore(RR.ex, G)} 올랐지만, ${RR.sig ? '뚜렷한 차이로 볼 수 있어요' : '사례마다 차이가 커서 공통된 흐름으로 보기는 어려웠어요'}.`);
        }
      }
      const RL = f.rl;
      if (RL && !RL.x) {
        const st = RL.opened ? `${ymKo(RL.stym)} 개통` : RL.stage === 'plan' ? '계획 확정, 착공 전' : '공사 중';
        parts.push(`신설역 ${RL.line} ${RL.st}(${st})`);
        if (!RL.opened) nextTxt.push(`${RL.line} ${RL.st}${RL.target ? `(개통 목표 ${ymKo(RL.target)})` : ''}`);
        facts.push(`${A} ${RL.line} ${RL.st}${RL.m != null ? `까지 직선 ${n0(RL.m)}m` : ' 근처'}예요(${st}${RL.target && !RL.opened ? `, 개통 목표 ${ymKo(RL.target)}` : ''}).`);
        const e = unitEv(c, 'rail');
        if (e && Math.abs(e.ex) >= 0.5 && f.eb && f.eb.rail !== 'none') pasts.push(`과거 ${SD}에서 같은 단계 신설역 700m 안 단지 ${n0(e.n)}건은 2년 뒤 같은 구 평균보다 ${ppMore(e.ex, G)} 올랐어요.`);
      }
      /* 주변 개발사업(assets/devproj-view.js, 공식 원문 확인 사업만): 요약은 가장 가까운 1곳, 나머지는 펼친 곳에 */
      const DV = root.JDJDev, dd = c.dev && c.dev.data && DV ? c.dev : null;
      const dsum = dd ? DV.summaryLine(dd.data, dd.u, dd.o || {}) : null;
      let devHtml = '';
      if (dsum) {
        parts.push(dsum.replace(/^주변 개발사업: /, '개발사업 ').replace('이 단지가', J(c.apt, '이', '가')).replace(/, \d{4}년 [^,(]*목표/, ''));
        devHtml = DV.detailHtml(dd.data, dd.u, dd.o || {});
        const L0 = DV.forUnit(dd.data, dd.u)[0]; if (L0 && L0.p && L0.p.short) nextTxt.push(L0.p.short);
      }
      if (parts.length) {
        const so = !parts.length ? '' : nextTxt.length ? `그래서 ${c.apt}는 ${nextTxt.join(', ')}의 다음 단계 발표가 나올 때 다시 확인해야 해요.`
          : `그래서 ${RL.line} ${RL.st} 개통(${ymKo(RL.stym)}) 뒤 ${c.apt} 시세가 ${SG} 전체보다 더 움직였는지 함께 보세요.`;
        lines.push({ k: 'watch', t: `앞으로 볼 변수: ${parts.join(' · ')}.`, d: [facts.join(' '), '', pasts.join(' '), so], devHtml });
      }
    }

    /* ⑤ 보유 기간별로 맞는 사람 */
    {
      const G = glosser();
      const hs = [2].concat([3, 5].filter(h => fh[h] != null && VOK(MH[h])));
      if (hs.length >= 2) {
        const sc = h => h === 2 ? f.fv : fh[h];
        const good = hs.filter(h => side(sc(h)) > 0), bad = hs.filter(h => side(sc(h)) < 0);
        const lab = h => `${h}년 ${topPct(sc(h))}`;
        let sum;
        if (bad.includes(2) && good.length) sum = `2년 안에 팔 계획이면 불리한 쪽(${lab(2)})이고, ${good[0]}년 이상 보유할 사람에게 맞아요(${good.map(lab).join(', ')}).`;
        else if (good.includes(2) && bad.length) sum = `2년 안팎 짧게 보유할 사람에게 맞고(${lab(2)}), ${bad[0]}년 이상 길게 보면 불리한 쪽이에요(${bad.map(lab).join(', ')}).`;
        else if (good.length === hs.length) sum = `짧게(2년) 보유해도, 길게(${hs[hs.length - 1]}년) 보유해도 유리한 쪽이에요(${hs.map(lab).join(', ')}).`;
        else if (bad.length === hs.length) sum = `짧게(2년) 보유해도, 길게(${hs[hs.length - 1]}년) 보유해도 불리한 쪽이에요(${hs.map(lab).join(', ')}).`;
        else sum = `보유 기간별 순위는 ${hs.map(lab).join(', ')}예요 — 기간에 따라 평균과 비슷한 구간이 섞여 있어요.`;
        const fact = `${A} ${SD} 아파트 전체와 비교해 ` + hs.map(h => `${h}년 기준 ${topPct(sc(h))}`).join(', ') + '예요.';
        const tested = hs.filter(h => MH[String(h)] && MH[String(h)].oos_all);
        const cmp = tested.length ? `과거 시험(그때까지의 자료로만 순위를 매긴 뒤 실제 결과와 비교)에서 순위 상위 20% 단지가 같은 구 평균보다 더 오른 경우는 `
          + tested.map(h => { const m = MH[String(h)]; return `${h}년 ${m.oos_all.length}번 중 ${m.oos_hit}번`; }).join(', ') + '이었어요.' : '';
        const pq = [];
        for (const h of hs) {
          if (h === 2) continue;
          const m = MH[String(h)], q = m && m.q5, b = Math.min(4, Math.floor(sc(h) / 20)), x = q && q[b];
          if (x && x[1] >= 2) pq.push(`과거 시험에서 ${h}년 순위가 ${Q5[b]}였던 단지는 ${h}년 뒤 같은 구 평균보다 ${ppMore(x[0], G)} 올랐어요(시험 ${x[1]}번 중 ${x[2]}번 더 오름, 사례 ${n0(x[3])}건).`);
        }
        const so = '그래서 ' + (bad.includes(2) && good.length ? `${c.apt}는 단기 시세 차익보다 ${good[0]}년 이상 실거주·보유 목적에 더 맞아요.`
          : good.includes(2) && bad.length ? `${c.apt}는 오래 묵히기보다 2년 안팎 보유 계획에 더 맞아요.`
          : good.length === hs.length ? `${c.apt}는 보유 기간과 관계없이 유리한 쪽이에요.` : bad.length === hs.length ? `${c.apt}는 보유 기간과 관계없이 평균보다 덜 오를 쪽이에요.` : `${c.apt}는 보유 기간을 정한 뒤 해당 기간 순위를 기준으로 보세요.`);
        lines.push({ k: 'fit', t: sum, d: [fact, cmp, pq.join(' '), so], hz: hs.map(h => [h, sc(h), MH[String(h)]]) });
      }
    }

    /* 기간별 순위가 엇갈리면 이유 한 줄(데이터로 확인되는 것만) */
    if (sL != null && Math.abs(sL - f.fv) >= 30) {
      const why = [];
      if (regionUsed && Math.abs(regGap) >= 10 && Math.sign(regGap) === Math.sign(sL - f.fv))
        why.push(`2년 순위에만 ${SG} 전체 흐름(${rp.text})이 더해지고, ${L}년 순위는 단지 자체 조건으로만 매기기 때문이에요`);
      const w2 = (f.why && f.why['2']) || [], wL = (f.why && f.why[String(L)]) || [];
      if (w2.some(t => t.startsWith('mom')) && !wL.some(t => t.startsWith('mom')) && f.mom != null && Math.abs(f.mom) >= 0.05)
        why.push(`최근 6개월 시세 변화(${pctSg(f.mom)})는 2년 순위에만 크게 반영돼요`);
      if (why.length) out.gap = `2년(${topPct(f.fv)})과 ${L}년(${topPct(sL)}) 순위가 다른 이유: ${why.join('. 또 ')}.`;
    }
    /* 요약 줄 첫 %p 풀이 */
    let pDone = false;
    out.lines = lines.filter(x => x.t).slice(0, 6).map(x => { if (!pDone && /\d%p/.test(x.t)) { x.t = x.t.replace(/(\d)%p(?!\()/, '$1%p(두 상승률의 차이)'); pDone = true; } x.d = x.d.map(s => s || ''); return x; });
    return out;
  }

  /* ---------- 문장 규칙 검사(tools/narrative-test.js) ---------- */
  function sentences(t) { return String(t || '').split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean); }
  function lint(N) {
    const bad = [], all = [];
    const check = (where, t, needNum) => {
      if (!t) return;
      for (const w of BANNED) if (t.includes(w)) bad.push(`${where}: 금지어 '${w}' — ${t}`);
      if (needNum && !/\d/.test(t)) bad.push(`${where}: 숫자 없음 — ${t}`);
      if (/%p(?!\()/.test(t) && !/%p\(/.test(t) && where.startsWith('d') && /%p/.test(t)) { /* 문단 안 첫 %p 풀이는 아래에서 */ }
      for (const s of sentences(t)) all.push([where, s]);
    };
    check('head', N.head, true); check('gap', N.gap, true);
    N.lines.forEach((x, i) => {
      check(`t${i}`, x.t, true);
      x.d.forEach((p, j) => { if (!p) return; check(`d${i}.${j}`, p, true); });
      const blk = x.d.filter(Boolean).join(' ');
      const m = blk.indexOf('%p'); if (m >= 0 && blk.slice(m, m + 3) !== '%p(') bad.push(`d${i}: 문단 첫 %p 풀이 없음`);
      if (x.d.filter(Boolean).length && !/^그래서 /.test(x.d[3] || '')) bad.push(`d${i}: '그래서' 문장 없음`);
    });
    const seen = new Map();
    for (const [w, s] of all) { if (s.length < 12) continue; if (seen.has(s)) bad.push(`같은 문장 반복(${seen.get(s)}·${w}): ${s}`); else seen.set(s, w); }
    const cases = all.map(([, s]) => (s.match(/사례 [\d,]+(?:건|곳)|[\d,]+건은 2년/g) || [])).flat();
    const dup = cases.filter((x, i) => cases.indexOf(x) !== i);
    if (dup.length) bad.push('같은 과거 통계 반복: ' + dup.join(', '));
    return bad;
  }

  /* ---------- HTML ---------- */
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const STEP = ['이 단지 숫자', '비교', '과거에 이런 경우', '그래서'];
  function spark(c, w, h) {
    const s = (c.s || []).map(v => v > 0 ? v : null), g = ((c.IX && c.IX.sgg && c.IX.sgg[c.code]) || {}).s || [];
    const i0 = s.findIndex(v => v), gi0 = g.findIndex(v => v > 0); if (i0 < 0 || gi0 < 0) return '';
    const st = Math.max(i0, gi0), a = s.slice(st), b = g.slice(st).map(v => v > 0 ? v : null);
    const na = a.map(v => v && v / a.find(x => x) * 100), nb = b.map(v => v && v / b.find(x => x) * 100);
    const vs = na.concat(nb).filter(v => v != null), lo = Math.min(...vs), hi = Math.max(...vs), n = a.length;
    const X = i => (i / Math.max(1, n - 1) * (w - 8) + 4).toFixed(1), Y = v => (h - 14 - (v - lo) / ((hi - lo) || 1) * (h - 24)).toFixed(1);
    const path = arr => { let d = '', pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i) + ' ' + Y(v); pen = true; }); return d; };
    const m0 = c.IX.months[st], m1 = c.IX.months[c.IX.months.length - 1];
    return `<figure class="nar-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${E(c.apt)}과 ${E(c.sgg)} 시세 흐름(${E(ymKo(m0))}=100)">`
      + `<path d="${path(nb)}" fill="none" stroke="#B9B2A0" stroke-width="2"/><path d="${path(na)}" fill="none" stroke="#B8942A" stroke-width="2.5"/>`
      + `<text x="4" y="${h - 2}" font-size="10" fill="#6B6B6B">${E(ymKo(m0))}</text><text x="${w - 4}" y="${h - 2}" font-size="10" fill="#6B6B6B" text-anchor="end">${E(ymKo(m1))}</text></svg>`
      + `<figcaption><i class="me"></i>${E(c.apt)} <i class="gu"></i>${E(c.sgg)} 전체 · ${E(ymKo(m0))}을 100으로 맞춘 ${'평당'} 시세</figcaption></figure>`;
  }
  function proHtml(x, c) {
    let h = '';
    if (x.ev && x.ev.per && x.ev.per.length) {
      h += `<div class="nar-pro"><b>시기별 과거 사례</b><table><thead><tr><th>시작 시점</th><th>사례</th><th>평균 차이</th><th>더 오른 비율</th></tr></thead><tbody>`
        + perRows(x.ev).map(r => `<tr><td>${E(r[0])}</td><td class="num">${E(r[1])}</td><td class="num">${E(r[2])}</td><td class="num">${E(r[3])}</td></tr>`).join('')
        + `</tbody></table><small>차이는 ${E(x.evBase || '같은 구 평균 대비')} 2년 뒤 상승률 차이예요.</small></div>`;
    }
    if (x.hz) {
      h += `<div class="nar-pro"><b>보유 기간별 순위</b><table><thead><tr><th>기간</th><th>${E(c.sido)} 안 순위</th><th>과거 시험</th></tr></thead><tbody>`
        + x.hz.map(([hh, s, m]) => `<tr><td>${hh}년</td><td class="num">${E(topPct(s))}</td><td>${m && m.oos_all ? `${m.oos_all.length}번 중 ${m.oos_hit}번 통과` : '-'}</td></tr>`).join('') + '</tbody></table></div>';
    }
    if (x.chart) h += spark(c, 340, 120);
    return h;
  }
  function html(N, o) {
    o = o || {};
    if (!N || !N.head) return '';
    const id = o.id || 'nar';
    return `<section class="nar" id="${E(id)}" data-nar="1">`
      + `<p class="nar-head">${E(N.head)}</p>`
      + (N.gap ? `<p class="nar-gap">${E(N.gap)}</p>` : '')
      + `<div class="nar-tools"><span>핵심 요약 ${N.lines.length}줄</span><button type="button" class="nar-all" data-nar-all aria-expanded="false">전체 펼치기</button></div>`
      + `<ol class="nar-list">` + N.lines.map((x, i) => {
        const open = i === 0, pid = `${id}-d${i}`, ps = x.d.map((p, j) => p ? `<p class="nar-p"><b>${STEP[j]}</b>${E(p)}</p>` : '').join('');
        return `<li class="nar-li" data-k="${E(x.k)}"><div class="nar-sum">${E(x.t)}</div>`
          + `<button type="button" class="nar-more" data-nar-k="${E(x.k)}" aria-expanded="${open}" aria-controls="${pid}">${open ? '접기' : '자세히 보기'}</button>`
          + `<div class="nar-det" id="${pid}"${open ? '' : ' hidden'}>${ps}${x.devHtml ? `<div class="nar-dev dv-sec"><b class="nar-devh">주변 개발사업(공식 원문 확인)</b>${x.devHtml}</div>` : ''}${o.premium ? proHtml(x, o.c || {}) : ''}</div></li>`;
      }).join('') + `</ol></section>`;
  }
  const CSS = `.nar{margin:12px 0 6px;padding:14px 14px 10px;border:1px solid #E6DFC8;border-radius:14px;background:#FFFDF7}
.nar-head{font-size:17px;line-height:1.55;font-weight:800;color:#1F1F1F;margin:0 0 8px;word-break:keep-all}
.nar-gap{font-size:13.5px;line-height:1.6;color:#5A4A1A;background:#F7EFD6;border-radius:10px;padding:8px 10px;margin:0 0 10px;word-break:keep-all}
.nar-tools{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#6B6B6B;margin:4px 0 6px}
.nar-all{border:1px solid #D9CFAE;background:#fff;border-radius:999px;padding:5px 12px;font-size:12.5px;color:#5A4A1A;cursor:pointer;min-height:32px}
.nar-list{list-style:none;margin:0;padding:0;counter-reset:n}
.nar-li{border-top:1px solid #EFE9D6;padding:10px 0 8px;counter-increment:n}
.nar-sum{font-size:15px;line-height:1.6;font-weight:600;color:#222;word-break:keep-all;padding-left:26px;position:relative}
.nar-sum:before{content:counter(n);position:absolute;left:0;top:2px;width:19px;height:19px;border-radius:50%;background:#B8942A;color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center}
.nar-more{margin:6px 0 0 26px;border:0;background:none;color:#8A6D12;font-weight:700;font-size:13.5px;padding:6px 0;cursor:pointer;min-height:32px}
.nar-det{margin:4px 0 2px 26px;padding:10px 12px;background:#F8F4E8;border-radius:10px}
.nar-p{margin:0 0 8px;font-size:14px;line-height:1.7;color:#333;word-break:keep-all}.nar-p:last-child{margin-bottom:0}
.nar-p b{display:block;font-size:11.5px;color:#8A6D12;letter-spacing:.02em;margin-bottom:1px}
.nar-pro{margin-top:10px;font-size:13px}.nar-pro b{display:block;margin-bottom:4px;color:#5A4A1A}
.nar-pro table{width:100%;border-collapse:collapse;font-size:12.5px}.nar-pro th,.nar-pro td{border-bottom:1px solid #E6DFC8;padding:5px 4px;text-align:left}.nar-pro .num{text-align:right;font-variant-numeric:tabular-nums}
.nar-pro small{color:#6B6B6B}
.nar-dev{margin-top:10px;padding-top:8px;border-top:1px dashed #D9CFAE;font-size:14px;line-height:1.65}.nar-devh{display:block;font-size:12.5px;color:#8A6D12;margin-bottom:2px}.nar-dev .dv-one{padding:6px 0}.nar-dev .dv-p{margin:4px 0;font-size:14px;line-height:1.7}.nar-dev .dv-note{font-size:12.5px;color:#6B6B6B}
.nar-chart{margin:10px 0 0}.nar-chart svg{width:100%;height:auto;display:block}.nar-chart figcaption{font-size:12px;color:#555;margin-top:2px}
.nar-chart i{display:inline-block;width:12px;height:3px;vertical-align:middle;margin:0 4px 0 6px}.nar-chart i.me{background:#B8942A}.nar-chart i.gu{background:#B9B2A0}
@media(min-width:900px){.nar-head{font-size:18.5px}.nar-sum{font-size:15.5px}}`;
  function css(doc) {
    doc = doc || root.document; if (!doc || doc.getElementById('nar-css')) return;
    const s = doc.createElement('style'); s.id = 'nar-css'; s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s);
  }
  /* 펼침 동작 + 줄 종류별 집계(stat.js, 개인정보 없음) + 개발사업 칸 채우기 */
  function bind(el, o) {
    o = o || {}; if (!el || el.__nar) return; el.__nar = true; css(el.ownerDocument);
    const stat = k => { try { root.jdjStat && root.jdjStat('nar_open', { line: k }); } catch (_) { } };
    const set = (b, open) => { const d = el.ownerDocument.getElementById(b.getAttribute('aria-controls')); if (!d) return; d.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '접기' : '자세히 보기'; };
    el.addEventListener('click', e => {
      const b = e.target.closest('.nar-more');
      if (b && el.contains(b)) { const open = b.getAttribute('aria-expanded') !== 'true'; set(b, open); if (open) stat(b.dataset.narK); return; }
      const a = e.target.closest('[data-nar-all]');
      if (a) { const sec = a.closest('.nar'), open = a.getAttribute('aria-expanded') !== 'true';
        sec.querySelectorAll('.nar-more').forEach(x => set(x, open)); a.setAttribute('aria-expanded', String(open)); a.textContent = open ? '전체 접기' : '전체 펼치기'; if (open) stat('all'); }
    });
  }
  const NAR = { build, html, bind, lint, css, sentences, BANNED, KINDS };
  root.JDJ_NAR = NAR;
  if (typeof module !== 'undefined' && module.exports) module.exports = NAR;
})(typeof window !== 'undefined' ? window : globalThis);
