/* 집코드 미래가치 리포트 '분석 설명' (한 줄 결론 → 핵심 요약 → 줄별 자세히 보기)
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
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const Q5 = { 4: '가장 높은 20%', 3: '상위 21~40%', 2: '중간 20%', 1: '하위 21~40%', 0: '가장 낮은 20%' };
  const KINDS = ['r1', 'r2', 'r3', 'price', 'watch', 'fit'];
  const BANNED = ['요인', '참고 정보', '참고만', '영향 작음', '순전입률', '백분위', '가중치', '계수', '임계', '보장하지', '책임지지', '투자 판단은', '모델'];

  /* ---------- 숫자·말 도우미 ---------- */
  function J(w, a, b) {
    const c = String(w).trim().slice(-1).charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return w + ((c - 0xAC00) % 28 ? a : b);
    const d = String(w).trim().slice(-1);
    if (/[0-9]/.test(d)) return w + ('013678'.includes(d) ? a : b);
    if (d === '%') return w + b;
    return w + a;
  }
  const r1 = v => (Math.round(Math.abs(v) * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const pctAbs = v => r1(v * 100) + '%';                                  // 0.268 → '26.8%'
  const pctSg = v => (v > 0.0005 ? '+' : v < -0.0005 ? '−' : '') + r1(v * 100) + '%';
  const n0 = v => Math.round(v).toLocaleString('ko-KR');
  /* 신설역 이름·거리 — 개통 전 예정 위치(엔진 rail.py pl=1, 거리 50m 단위)면 '○○역(개통 예정) · 예정 위치 기준 약 ○m'.
     개통해서 서울시 역사마스터 정보(공공 좌표)에 들어오면 엔진이 pl 을 빼서 자동으로 보통 표시 */
  const rlNm = R => R.pl ? `${/역$/.test(R.st || '') ? R.st : (R.st || '') + '역'}(개통 예정)` : R.st;
  const rlAt = (R, pre) => R.m == null ? '' : R.pl ? `예정 위치 기준 약 ${Math.round(R.m).toLocaleString('ko-KR')}m` : `${pre || ''}${Math.round(R.m).toLocaleString('ko-KR')}m`;
  const topPct = v => (v = Math.round(v), v >= 50 ? `상위 ${Math.max(1, 100 - v)}%` : `하위 ${Math.max(1, v)}%`);
  const ymKo = v => `${String(v).slice(0, 4)}년 ${parseInt(String(v).slice(4, 6), 10)}월`;
  function won(man) {
    man = Math.round(man); if (!(man > 0)) return '';
    const e = Math.floor(man / 10000), r = man % 10000;
    return !e ? n0(r) + '만 원' : e + '억' + (r ? ' ' + n0(r) + '만' : '') + ' 원';
  }
  const eok = man => (Math.round(man / 1000) / 10).toFixed(1).replace(/\.0$/, '') + '억';
  const VOK = m => !!(m && (m.oos_all || []).length >= 2 && m.oos_avg > 0 && 2 * (m.oos_hit != null ? m.oos_hit : (m.oos_all || []).filter(o => (o.top20 || 0) > 0).length) >= (m.oos_all || []).length);
  /* 지역별 검증 성적(model_h.json 기간별 reg[시·도 이름]): 이 단지 시·도 성적이 있으면 그 성적으로 통과 여부·검증 카드를 쓴다.
     reg 가 없거나(예전 자료) 시험할 단지가 적어 전국으로 대체(fb='all')한 시·도는 전국 성적. 도는 도 지역 묶음(fb='do').
     → { oos_all, oos_hit, oos_avg, ok, where(성적을 낸 곳 이름), fb } — 통과 기준은 엔진이 정한 ok 그대로 */
  function MR(MH, h, sido) {
    const m = MH && MH[String(h)]; if (!m) return null;
    const r = m.reg && sido ? m.reg[sido] : null;
    if (!r || r.fb === 'all' || !(r.oos_all || []).length)
      return { oos_all: m.oos_all, oos_hit: m.oos_hit || 0, oos_avg: m.oos_avg, ok: VOK(m), where: '전국', fb: r && r.fb === 'all' ? 'all' : '', q5: m.q5, from: m.data_from };
    const v = r.oos_all.map(o => o.top20).filter(x => x != null);
    return { oos_all: r.oos_all, oos_hit: r.hit || 0, oos_avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, ok: !!r.ok, where: r.name, fb: r.fb || '', q5: m.q5, from: m.data_from };
  }
  const VR = m => !!(m && m.ok);
  /* 용어 풀이: 한 묶음(요약 전체 / 펼친 문단 하나) 안에서 처음 나올 때만 */
  const GL = { '%p': '%p(두 상승률의 차이)', '전세가율': '전세가율(집값 대비 전셋값 비율)', '평당': '평당(전용 3.3㎡당)' };
  /* 용어 풀이는 괄호 대신 화면에서 점선+누르면 설명 상자(plain-words.js tipDom) — 문장에는 용어만 */
  function glosser() { return t => t; }
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
  /* ---------- 구 이유 문장(공용): 순위 화면 구별 미래가치 · 지도 구 카드 · 리포트 지역 흐름 ----------
     guPast: 구 과거 사례 한 문장(evidence.json region × 구 지금 구간 index.json r.eb). 사례가 없거나, 과거 방향이 이번 이유 방향과 다르거나,
     사례 절반 이상이 그 방향이 아니면 '' (숫자를 지어내지 않음).
     → { t: '과거 서울에서 1년 상승률이 하위 20%였던 구는 이후 2년 서울 평균보다 평균 3.9%p 더 올랐어요(사례 24건 중 15건).', e } | null */
  const GQ = { 0: '하위 20%', 1: '하위 21~40%', 2: '중간 20%', 3: '상위 21~40%', 4: '상위 20%' };
  const GCOND = { mom: '1년 상승률이', jr: '전세가율이' };
  function guPast(c, kind, up) {
    const e = regionEv(c, kind);
    if (!e || !GQ[e.b] || Math.sign(e.ex) !== (up ? 1 : -1) || Math.abs(e.ex) < 0.2) return null;
    const k = e.hit == null ? null : Math.round(e.n * (up ? e.hit : 100 - e.hit) / 100);
    if (k != null && k * 2 <= e.n) return null;
    const SD = c.sido, UNIT = c.unit || '구';
    return { e, t: `과거 ${SD}에서 ${GCOND[kind]} ${GQ[e.b]}였던 ${J(UNIT, '은', '는')} 이후 2년 ${SD} 평균보다 평균 ${r1(e.ex)}%p ${up ? '더' : '덜'} 올랐어요` + (k != null ? `(사례 ${n0(e.n)}건 중 ${n0(k)}건).` : '.') };
  }
  /* guWhy: 구 점수를 가장 많이 움직인 항목(index.json r.up/down) 한 가지를 사실 → 비교 → 과거 사례 → 그래서 순으로.
     c = { IX, code, gs, EV(evidence.json, 없으면 과거 사례·그래서 생략), f(단지 fx, 선택: 입주 물량 등 문장용), PL }
     → null | { rp(실제 등수), pos, name, k(mom·jr·기타), up(점수를 올린 항목인지), fact, cmp, past, so, text(사실~그래서), line(그래서가 없으면 '점수를 올린 가장 큰 이유: ' 앞에 붙임) } */
  function guWhy(c) {
    const PL = c.PL || root.JDJ_PLAIN, IX = c.IX;
    if (!PL || !IX || !IX.sgg || c.gs == null) return null;
    const rp = PL.regionPlace(IX, c.code, c.gs); if (!rp) return null;
    const ri = PL.regionInfo(IX, c.code), g = IX.sgg[c.code] || {}, sdo = (IX.sido || []).find(s => s.name === g.sido) || {};
    const R = g.r || {}, SR = sdo.r || {}, NM = ri.name || '이 지역', SD = ri.short, UNIT = ri.unit === '구' ? '구' : '시·군·구';
    const rg = PL.regionText(Object.assign({}, c.f || {}, { gs: c.gs }), IX, c.code, null);
    const items = rg.items || [];
    const it = (rp.pos === '하위권' ? items.find(x => !x.up) : rp.pos === '상위권' ? items.find(x => x.up) : null) || items[0];
    if (!it) return null;
    const up = it.up, cx = { IX, code: c.code, EV: c.EV, sid: sdo.id, sido: SD, unit: UNIT };
    const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.round(Math.abs(v) * 10) / 10).toFixed(1) + '%';
    let k = 'etc', fact = it.t, cmp = '', past = null;
    if (it.nm === '구 시세 최근 1년 흐름' && R.mom != null) {
      k = 'mom';
      fact = `${NM} 전체 시세가 최근 1년 ${sg(R.mom)}로 ${Math.abs(R.mom) < 0.05 ? '거의 그대로예요' : R.mom > 0 ? '올랐어요' : '내렸어요'}.`;
      if (SR.mom != null) { const d = R.mom - SR.mom; cmp = `${SD} ${UNIT} 중간값(${sg(SR.mom)})${Math.abs(d) < 0.5 ? '과 비슷해요' : `보다 ${r1(d)}%p ${d > 0 ? '높아요' : '낮아요'}`}.`; }
    } else if (it.nm === '구 전세가율' && R.jr != null) {
      k = 'jr';
      fact = `${NM} 전체 전세가율이 ${r1(R.jr)}%예요.`;
      if (SR.jr != null) { const d = R.jr - SR.jr; cmp = `${SD} ${UNIT} 중간값(${r1(SR.jr)}%)${Math.abs(d) < 2 ? '과 비슷해요' : `보다 ${r1(d)}%p ${d > 0 ? '높아요' : '낮아요'}`}.`; }
      const m = /다만 .*$/.exec(it.t); if (m) cmp += ' ' + m[0];
    }
    if (k !== 'etc' && c.EV) past = guPast(cx, k, up);
    const so = past ? (rp.pos === '중위권' ? `그래서 이 점은 ${NM} 점수를 ${up ? '올렸어요' : '낮췄어요'}.` : `그래서 ${NM} 점수를 ${up ? '높게' : '낮게'} 봤어요.`) : '';
    const text = [fact, cmp, past ? past.t : '', so].filter(Boolean).join(' ');
    return { rp, pos: rp.pos, name: NM, k, up, fact, cmp, past: past ? past.t : '', ev: past ? past.e : null, so, text,
      line: so ? text : `점수를 ${up ? '올린' : '낮춘'} 가장 큰 이유: ` + text };
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
        return { sum: `${G('평당')} 시세가 ${t}`, fact: `${A} ${G('평당')} 시세가 ${t}.`, cmp: where('rel', '구 안 가격 수준') ? `${J(where("rel", "구 안 가격 수준"), "이에요", "예요")}.` : '', ev: 'rel', cond: `같은 구 안 가격 수준이 ${Q5[qb('rel')] || ''}` };
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

  const WN = { mom: '최근 6개월 시세 흐름', jr: '전세가율', rel: '구 안 가격 수준', dd: '하락기 움직임', lg: '대장 단지와의 가격 차이', sch: '가까운 중학교 전입',
    size: '단지 규모', liq: '거래량', sub: '역까지 거리', stg: '재건축 단계' };
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

  /* =====================================================================
     오를 이유 · 조심할 점 · 지켜볼 것 (why3)
     항목마다 사실(숫자·비교 기준) → 과거 사례 성적(그 조건을 과거 시점에 그대로 대입해 2년 뒤와 비교) → 그래서.
     - 이유·조심할 점은 공개 사례 표(evidence.json)에서 같은 방향이 확인된 것만: 사례 다수가 그 방향이고,
       시기별로도 절반 넘게 같은 방향일 때. 사례가 없거나 반대·엇갈리면 그 항목은 이유에 넣지 않는다.
     - 지켜볼 것은 날짜·단계가 있는 것(신설역·주변 개발사업·대규모 공급·재건축·정책 일정). 과거 사례가 엇갈리면 숫자만 적고 '그래서'는 붙이지 않는다.
     → { up:[it], dn:[it], watch:[it], key(관심 단지 알림 키), apt }
       it = { k, t(제목), o(한 줄), d:[사실, 과거 사례, 그래서], ev(시기별 표), evBase, when(지켜볼 것 날짜 YYYYMM), devHtml } */
  const W3MIN = { n: 30, rn: 20, ex: 0.5, sh: 55 };
  const W3COND = {
    mom: '최근 6개월 상승 폭이', rc: '예전 최고가 회복 정도가', dd: '하락기 방어가', jr: '전세가율이', rel: '같은 구 안 가격 수준이',
    lg: '동네 대장 단지 대비 가격이', sch: '가까운 중학교 전입이'
  };
  const W3MEAN = {
    mom: { up: '최근 쉬어 간 단지가 이후 따라 오른 경우가 많았어요', dn: '최근 짧게 많이 오른 단지가 이후 쉬어 간 경우가 많았어요' },
    rc: { up: '예전 최고가를 덜 회복한 단지가 이후 따라 오른 경우가 많았어요', dn: '예전 최고가를 이미 많이 회복한 단지는 이후 덜 오른 경우가 많았어요' },
    dd: { up: '하락기에 많이 내렸던 단지가 이후 더 오른 경우가 많았어요', dn: '하락기에 잘 버틴 단지는 이후 덜 오른 경우가 많았어요' },
    jr: { up: '전세가율이 이 수준인 단지가 이후 더 오른 경우가 많았어요', dn: '전세가율이 이 수준인 단지가 이후 덜 오른 경우가 많았어요' },
    rel: { up: '구 안에서 비싼 단지가 이후에도 더 오른 경우가 많았어요', dn: '구 안에서 싼 단지가 이후에도 덜 오른 경우가 많았어요' },
    lg: { up: '대장 단지와 이 정도 차이인 단지가 이후 더 오른 경우가 많았어요', dn: '대장 단지와 이 정도 차이인 단지가 이후 덜 오른 경우가 많았어요' },
    sch: { up: '학생이 모이는 학교 근처 단지가 이후 더 오른 경우가 많았어요', dn: '학생이 빠지는 학교 근처 단지가 이후 덜 오른 경우가 많았어요' },
    stg: { up: '이 단계 재건축 단지가 이후 더 오른 경우가 많았어요', dn: '이 단계 재건축 단지가 이후 덜 오른 경우가 많았어요' },
    rail: { up: '이 단계 신설역 가까운 단지가 이후 더 오른 경우가 많았어요', dn: '이 단계 신설역 가까운 단지가 이후 덜 오른 경우가 많았어요' }
  };
  const RAILST = { plan: '계획 확정·착공 전', build: '공사 중', open: '개통 2년 이내' };
  /* 확장 과거 사례(evidence.json xkinds, 엔진 evidence.XCtx): 구간 이름 → 말. 구간 경계는 사실을 나누는 기준(자료 정의)이고 표시 기준(W3MIN)과 별개 */
  const XB = {
    sd: { d300: '300m 이내', d500: '300~500m', d700: '500~700m', d1000: '700m~1km', dfar: '1km 초과' },
    sw: { w5: '5분 이내', w10: '5~10분', w15: '10~15분', w20: '15~20분', wfar: '20분 초과(또는 역 정보 없음)' },
    hh: { h0: '300세대 미만', h1: '300~499세대', h2: '500~999세대', h3: '1,000~1,999세대', h4: '2,000세대 이상' },
    pa: { a0: '60㎡ 미만(소형 위주)', a1: '60~75㎡', a2: '75~85㎡', a3: '85~100㎡', a4: '100㎡ 이상(대형 위주)' },
    pd: { d1: '1가지', d2: '2가지', d3: '3가지', d4: '4가지 이상' },
    sv: { v0: '없었던', v1: '1,000세대 미만이었던', v2: '1,000~2,999세대였던', v3: '3,000세대 이상이었던' },
    scr: { top: '상위 3분의 1', mid: '중간 3분의 1', low: '하위 3분의 1' },
    ag: { n5: '5년 이내', n10: '6~10년', m19: '11~19년', p24: '20~24년', r29: '25~29년(재건축 연한 30년 직전)', r30: '30년 이상(재건축 연한 도달)' }
  };
  /* 흔히 하는 생각(이 구간이면 더 오른다/덜 오른다) — 과거 사례가 반대면 그 사실을 한 마디 덧붙인다(원인은 지어내지 않음) */
  const XNORM = { sd: { d300: 1, d500: 1, dfar: -1 }, sw: { w5: 1, wfar: -1 }, hh: { h4: 1, h0: -1 }, pa: { a4: 1 }, sv: { v3: -1, v2: -1 }, scr: { top: 1, low: -1 }, ag: { n5: 1, r29: 1, r30: 1 } };
  /* 뺀 항목(엔진 excluded.json 키) → 같은 내용을 본 확장 사례 종류 */
  const XKIND_OF = { sub: ['sd', 'sw'], size: ['hh'], liq: ['tv12', 'to'], new: ['ag'], old: ['ag'], sch: ['scr'] };
  const XORD = ['sd', 'sw', 'hh', 'pa', 'pd', 'tv6', 'tv12', 'to', 'sv', 'scr', 'ag'];
  const ymAdd = (ym, n) => { let y = +String(ym).slice(0, 4), m = +String(ym).slice(4, 6) + n; while (m > 12) { y++; m -= 12; } while (m < 1) { y--; m += 12; } return `${y}${String(m).padStart(2, '0')}`; };
  const ymSh = v => `${String(v).slice(2, 4)}.${parseInt(String(v).slice(4, 6), 10)}`;
  /* 확장 사례 조건 문구(화면 이유 칸과 /guide/method/ 가 같은 말을 쓰게): '역까지 직선 거리가 300m 이내였던 서울' */
  function xCond(k, b, SD) {
    const lab = (XB[k] || {})[b], w = lab ? (/(m|㎡)$/.test(lab) ? '였던' : J(lab, '이었던', '였던').slice(lab.length)) : '', q = /^[0-4]$/.test(String(b)) ? Q5[+b] : '';   // '1km' '60㎡' 는 받침 없이 읽음
    switch (k) {
      case 'sd': return lab && `역까지 직선 거리가 ${lab}${w} ${SD}`;
      case 'sw': return lab && `역까지 걸어서 ${lab}${w} ${SD}`;
      case 'hh': return lab && `세대수가 ${lab}${w} ${SD}`;
      case 'pa': return lab && `세대당 평균 전용면적이 ${lab}${w} ${SD}`;
      case 'pd': return lab && `최근 5년 거래된 평형 구간이 ${lab}${w} ${SD}`;
      case 'tv6': return q && `거래량이 그 전 6개월보다 늘어난 정도가 ${SD} 단지 중 ${q}였던`;
      case 'tv12': return q && `거래량이 그 전 12개월보다 늘어난 정도가 ${SD} 단지 중 ${q}였던`;
      case 'to': return q && `세대수 대비 1년 거래 비율이 ${SD} 단지 중 ${q}였던`;
      case 'sv': return lab && `반경 1.5km 안 2년 안 입주가 ${lab} ${SD}`;
      case 'scr': return lab && `가까운 중학교가 구 안 전입 순위 ${lab}${w} ${SD}`;
      case 'ag': return lab && `지은 지 ${lab}${w} ${SD}`;
      default: return '';
    }
  }
  /* 사례 표 한 종류의 구간별 문장(/guide/method/ '뺀 항목'·과거 사례 목록용, 화면 이유 칸과 같은 표시 기준 w3dir)
     → [{ b, ok, up, text }] — ok 가 false 인 구간은 '비슷해서 이유로 쓰지 않음' */
  function xCases(EV, k, sid, SD) {
    const T = EV && EV.sido && EV.sido[sid] && EV.sido[sid][k]; if (!T) return [];
    const ord = Object.keys(XB[k] || { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 });
    return ord.filter(b => T[b] && T[b].n > 0 && T[b].ex != null).map(b => {
      const e = T[b], r = w3dir(e, W3MIN.n), cond = xCond(k, b, SD);
      if (!cond) return null;
      if (r) return { b, ok: true, up: r.up, text: `${cond} 단지 ${n0(e.n)}건 중 ${n0(r.k)}건이 2년 뒤 자기 구 평균보다 ${r.up ? '더' : '덜'} 올랐어요(평균 ${r.up ? '+' : '−'}${r1(e.ex)}%p, 시점 ${r.np}번 중 ${r.same}번 같은 방향).` };
      return { b, ok: false, up: e.ex > 0, text: `${cond} 단지 ${n0(e.n)}건은 ${n0(Math.round(e.n * e.hit / 100))}건(${e.hit}%)이 자기 구 평균보다 더 올라, 더 오른 단지와 덜 오른 단지가 비슷했어요.` };
    }).filter(Boolean);
  }
  /* 확장 사례 한 종류: 이 단지 사실 + 과거 조건 문구 + 그래서 앞 해석. 사실값이 없으면 null(숫자를 지어내지 않음)
     c: why3 cx (f, apt, sgg, sido, IX), b: 지금 구간 */
  function xFact(k, b, cx) {
    const f = cx.f, X = f.xf || {}, A = J(cx.apt, '은', '는'), SG = cx.sgg, SD = cx.sido, end = (cx.IX && cx.IX.dataTo) || '';
    const lab = (XB[k] || {})[b];
    const q = /^[0-4]$/.test(String(b)) ? Q5[+b] : '';
    switch (k) {
      case 'sd': {
        if (!X.sd || !lab) return null;
        return { t: `${X.sd[0]}역까지 직선 ${n0(X.sd[1])}m`, fact: `${A} 가장 가까운 지하철역(${X.sd[0]}역)까지 직선으로 ${n0(X.sd[1])}m예요.`, cond: xCond(k, b, SD), mean: ['역에서 이 거리인 단지가 이후 더 오른 경우가 많았어요', '역에서 이 거리인 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'sw': {
        if (f.sub == null || !lab) return null;
        const st = f.subs ? f.subs.replace(/\s+/g, ' ') : '지하철역';
        const t = f.sub >= 30 ? 'K-apt에 걸어서 갈 지하철역 정보가 없어요' : `K-apt 기준 ${st}까지 걸어서 ${f.sub <= 5 ? '5분 이내' : f.sub > 20 ? '20분 넘게' : f.sub + '분 이내'}예요`;
        return { t: t.replace(/예요$|어요$/, ''), fact: `${A} ${t}.`, cond: xCond(k, b, SD),
          mean: ['역까지 이 정도 거리인 단지가 이후 더 오른 경우가 많았어요', '역까지 이 정도 거리인 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'hh': {
        if (!f.hh || !lab) return null;
        return { t: `${n0(f.hh)}세대 단지`, fact: `${A} ${n0(f.hh)}세대예요(K-apt).`, cond: xCond(k, b, SD),
          mean: ['이 규모 단지가 이후 더 오른 경우가 많았어요', '이 규모 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'pa': {
        if (X.pa == null || !lab) return null;
        return { t: `세대당 평균 전용 ${r1(X.pa)}㎡`, fact: `${A} 세대당 평균 전용면적이 ${r1(X.pa)}㎡예요(K-apt 주거전용면적 합계 ÷ 세대수).`, cond: xCond(k, b, SD), mean: ['평형 구성이 이런 단지가 이후 더 오른 경우가 많았어요', '평형 구성이 이런 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'pd': {
        if (!X.pd || !lab) return null;
        return { t: `최근 5년 거래된 평형 ${X.pd}가지`, fact: `${A} 최근 5년 실거래가 있었던 평형 구간이 ${X.pd}가지예요.`, cond: xCond(k, b, SD), mean: ['평형 구성이 이런 단지가 이후 더 오른 경우가 많았어요', '평형 구성이 이런 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'tv6': case 'tv12': {
        const T = X.tv; if (!T || !q || !end) return null;
        const w = k === 'tv6' ? 6 : 12, c = k === 'tv6' ? T[0] : T[2], p = k === 'tv6' ? T[1] : T[3];
        const a1 = ymAdd(end, -w), a2 = ymAdd(end, -1), b1 = ymAdd(end, -2 * w), b2 = ymAdd(end, -w - 1);
        const ch = c === p ? '과 같아요' : `보다 ${c > p ? '늘었어요' : '줄었어요'}`;
        return { t: `최근 ${w}개월 거래 ${n0(c)}건(그 전 ${w}개월 ${n0(p)}건)`,
          fact: `${A} 최근 ${w}개월(${ymSh(a1)}~${ymSh(a2)}) 실거래가 단지 전체 ${n0(c)}건으로, 그 전 ${w}개월(${ymSh(b1)}~${ymSh(b2)}) ${n0(p)}건${ch}.`,
          cond: xCond(k, b, SD),
          mean: [`거래가 이렇게 ${+b >= 3 ? '늘던' : +b <= 1 ? '줄던' : '움직이던'} 단지가 이후 더 오른 경우가 많았어요`, `거래가 이렇게 ${+b >= 3 ? '늘던' : +b <= 1 ? '줄던' : '움직이던'} 단지가 이후 덜 오른 경우가 많았어요`] };
      }
      case 'to': {
        const T = X.tv; if (!T || !f.hh || !q) return null;
        const pc = T[2] / f.hh * 100;
        return { t: `1년 거래 ${n0(T[2])}건 · 세대수의 ${r1(pc)}%`, fact: `${A} 최근 1년 실거래가 단지 전체 ${n0(T[2])}건으로, ${n0(f.hh)}세대의 ${r1(pc)}%예요.`, cond: xCond(k, b, SD), mean: ['거래 회전이 이 정도인 단지가 이후 더 오른 경우가 많았어요', '거래 회전이 이 정도인 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'sv': {
        const V = X.sv; if (!lab) return null;
        const til = end ? ymKo(ymAdd(end, 24)) : '2년 뒤';
        const t = V && V[0] ? `반경 1.5km 안 ${til}까지 입주 예정 ${n0(V[0])}세대(청약홈 공고 ${V[1]}건)` : '반경 1.5km 안 2년 안 입주 예정 공고 없음';
        const fact = V && V[0] ? `${A} 반경 1.5km 안에 ${til}까지 입주 예정인 청약홈 공고가 ${V[1]}건, ${n0(V[0])}세대예요. 청약홈에는 조합원 몫이 빠져 있어 실제 입주는 더 많을 수 있어요.`
          : `${A} 반경 1.5km 안에 ${til}까지 입주 예정인 청약홈 공고가 없어요(조합원 몫만 있는 재건축 입주는 빠져 있을 수 있어요).`;
        return { t, fact, cond: xCond(k, b, SD),
          mean: ['주변 입주가 이 정도였던 단지가 이후 더 오른 경우가 많았어요', '주변 입주가 이 정도였던 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'scr': {
        const sc = f.sc; if (!Array.isArray(sc) || !sc[0] || !(sc[5] >= 3) || !lab) return null;
        return { t: `가까운 ${sc[0]} ${SG} ${sc[5]}곳 중 ${sc[4]}위`, fact: `가까운 ${sc[0]}는 ${SG} 중학교 ${sc[5]}곳 중 학생이 많이 모이는 순서로 ${sc[4]}위예요.`, cond: xCond(k, b, SD), mean: ['학생이 이만큼 모이는 학교 근처 단지가 이후 더 오른 경우가 많았어요', '학생이 이만큼 모이는 학교 근처 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      case 'ag': {
        const by = f.by, yr = cx.year || (end ? +String(end).slice(0, 4) : null); if (!by || !yr || !lab) return null;
        const a = yr - by;
        return { t: `${by}년 준공 · ${a}년 차`, fact: `${A} ${by}년에 지어져 ${a}년 차예요.`, cond: xCond(k, b, SD),
          mean: ['이 연식 단지가 이후 더 오른 경우가 많았어요', '이 연식 단지가 이후 덜 오른 경우가 많았어요'] };
      }
      default: return null;
    }
  }
  /* 사례 표 한 칸 → 방향 판단(사례 다수 + 시기별 다수가 같은 방향일 때만) */
  function w3dir(e, nmin) {
    if (!e || !(e.n >= nmin) || e.ex == null || Math.abs(e.ex) < W3MIN.ex || e.hit == null) return null;
    const up = e.ex > 0, k = Math.round(e.n * (up ? e.hit : 100 - e.hit) / 100);
    if (k * 100 < e.n * W3MIN.sh) return null;
    const per = (e.per || []).filter(p => p && p[2] != null), same = per.filter(p => up ? p[2] > 0 : p[2] < 0).length;
    if (per.length < 2 || same * 2 <= per.length) return null;   // 시점 2번 이상 대입해 본 사례만(학교 자료처럼 1번뿐이면 이유로 안 씀)
    return { up, k, np: per.length, same, from: per.length ? per.map(p => String(p[0])).sort()[0] : null, to: per.length ? per.map(p => String(p[0])).sort().slice(-1)[0] : null };
  }
  const recOne = (e, r, who, base) => `과거 ${who} ${n0(e.n)}건 중 ${n0(r.k)}건이 2년 뒤 ${base}보다 ${r.up ? '더' : '덜'} 올랐어요(평균 ${r.up ? '+' : '−'}${r1(e.ex)}%p).`;
  const recPer = r => r.np ? ` 시점을 바꿔 ${ymKo(r.from)}~${ymKo(r.to)} 사이 ${r.np}번 그대로 대입해 봤더니 ${r.np}번 중 ${r.same}번 같은 방향이었어요.` : '';
  /* 정책 대상 지역(policy-view.js applies 와 같은 규칙, 동 단위 지정은 동이 맞을 때만) */
  function polHit(p, sgg, dong) {
    const tok = t => t === 'all' || (t === 'metro' ? ['11', '28', '41'].includes(sgg.slice(0, 2)) : t === 'nonmetro' ? !['11', '28', '41'].includes(sgg.slice(0, 2))
      : t.includes(':') ? t.split(':')[0] === sgg && !!dong && (dong === t.split(':')[1] || String(dong).split(' ').pop() === t.split(':')[1]) : t.length === 2 ? sgg.slice(0, 2) === t : t === sgg);
    return (p.in || []).some(tok) && !(p.not || []).some(tok);
  }
  const ymOf = d => { const a = String(d || '').split('-'); return a[0] + (a[1] ? a[1].padStart(2, '0') : '12'); };
  const dKo = d => { const a = String(d || '').split('-'); return a[1] ? `${a[0]}년 ${+a[1]}월` : `${a[0]}년`; };

  function why3(f, c) {
    const PL = c.PL || root.JDJ_PLAIN || {}, IX = c.IX || {};
    const g = (IX.sgg && IX.sgg[c.code]) || {}, sdo = (IX.sido || []).find(s => s.name === g.sido) || {};
    const SG = g.name || '같은 구', SD = sdo.short || g.sido || '', sid = sdo.id, A = J(c.apt, '은', '는'), AG = J(c.apt, '이', '가');
    const ri = PL.regionInfo ? PL.regionInfo(IX, c.code) : { unit: '구' }, UNIT = ri.unit === '구' ? '구' : '시·군·구';
    const cx = Object.assign({}, c, { f, sgg: SG, sido: SD, sid });
    const out = { up: [], dn: [], watch: [], apt: c.apt, sido: SD, sgg: SG };
    const jb = c.jibun || (c.dev && c.dev.u && c.dev.u.jibun);
    if (c.code && c.dong && jb) out.key = [c.code, c.dong, jb, c.apt].join('|');
    if (out.key && sid && c.band) out.place = { sd: sid, code: c.code, dong: c.dong, jibun: jb, apt: c.apt, band: c.band };   // 관심 목록에 넣을 단지·평형
    if (!f) return out;
    const P = priceFacts(cx), cand = [];
    const unitBase = '자기 구 평균', who = `${SD}에서 비슷한 단지`;
    /* ① 단지 사례(5분위·단계) */
    const ub = f.eb || {};
    const qOf = k => /^[0-4]$/.test(String(ub[k])) ? Q5[+ub[k]] : '';
    const factOf = k => {
      const F = k === 'rc' ? null : unitFact(k, cx, t => t);
      if (k === 'rc') {
        if (!P || !P.pk || P.pkIsNow) return P && P.pkIsNow ? { t: '최근 3년 최고 시세 수준', fact: `${A} 지금 ${'평당'} 시세가 최근 3년 중 가장 높은 수준이에요(${ymKo(P.at)} ${won(P.now)}).` } : null;
        const pc = Math.round(P.now / P.pk * 100);
        return { t: `최근 3년 최고 시세의 ${pc}%까지 회복`, fact: `${A} 지금 ${'평당'} 시세가 ${won(P.now)}으로, 최근 3년 최고였던 ${ymKo(P.pkAt)}(${won(P.pk)})의 ${pc}%예요.` };
      }
      if (k === 'rail') {
        const RL = f.rl; if (!RL || RL.x) return null;
        return { t: `${RL.line} ${rlNm(RL)}${RL.m != null ? (RL.pl ? ` · ${rlAt(RL)}` : ` 직선 ${n0(RL.m)}m`) : ''}(${RAILST[ub.rail] || ''})`, fact: `${A} ${RL.line} ${rlNm(RL)}${RL.m != null ? (RL.pl ? ` · ${rlAt(RL)} 거리` : `까지 직선 ${n0(RL.m)}m`) : ' 근처'}예요.` };
      }
      if (!F) return null;
      return { t: F.sum.replace(/\(.*\)$/, ''), fact: [F.fact, F.cmp].filter(Boolean).join(' ') };
    };
    for (const k of ['rel', 'mom', 'rc', 'dd', 'jr', 'lg', 'sch', 'stg', 'rail']) {
      if (ub[k] == null || (k === 'rail' && ub[k] === 'none') || (k === 'stg' && String(ub[k]) === '0')) continue;
      const e = unitEv(cx, k), r = w3dir(e, W3MIN.n); if (!r) continue;
      const F = factOf(k); if (!F) continue;
      const cond = k === 'stg' ? `재건축 ${(PL.STAGE && PL.STAGE[ub.stg]) || ub.stg + '단계'} 단계였던` : k === 'rail' ? `${RAILST[ub.rail] || ''}인 신설역 700m 안이었던` : `${W3COND[k]} ${SD} 단지 중 ${qOf(k)}였던`;
      const mean = (W3MEAN[k] || {})[r.up ? 'up' : 'dn'] || '';
      cand.push({ side: r.up ? 'up' : 'dn', k, sc: Math.abs(e.ex) * (r.k / e.n), t: F.t, o: recOne(e, r, who, unitBase),
        d: [F.fact, `과거 ${SD}에서 ${cond} 단지 ${n0(e.n)}건을 2년 뒤와 비교해 봤더니 ${n0(r.k)}건이 ${unitBase}보다 ${r.up ? '더' : '덜'} 올랐고, 평균 차이는 ${r.up ? '+' : '−'}${r1(e.ex)}%p였어요.` + recPer(r),
          `그래서 ${mean ? mean.replace(/많았어요$/, '많았던 만큼') + ', ' : '이 점은 '}${AG} 앞으로 2년 ${SG} 평균보다 ${r.up ? '더 오를 쪽이에요' : '덜 오를 수 있어요'}.`],
        ev: e, evBase: '자기 구 평균 대비' });
    }
    /* ①-2 확장 사례(역 거리·평형 구성·거래 흐름·주변 입주·중학교 순위·연식): 같은 표시 기준(W3MIN·w3dir), 거래 흐름은 6·12개월 중 하나만 */
    const xs = [];
    for (const k of XORD) {
      if (ub[k] == null) continue;
      const e = unitEv(cx, k), r = w3dir(e, W3MIN.n); if (!r) continue;
      const F = xFact(k, ub[k], cx); if (!F) continue;
      const nm = (XNORM[k] || {})[ub[k]], against = nm != null && nm !== (r.up ? 1 : -1);
      const mean = F.mean[r.up ? 0 : 1];
      xs.push({ side: r.up ? 'up' : 'dn', k, grp: /^tv/.test(k) ? 'tv' : k, sc: Math.abs(e.ex) * (r.k / e.n), t: F.t, o: recOne(e, r, who, unitBase),
        d: [F.fact, `과거 ${F.cond} 단지 ${n0(e.n)}건을 2년 뒤와 비교해 봤더니 ${n0(r.k)}건이 ${unitBase}보다 ${r.up ? '더' : '덜'} 올랐고, 평균 차이는 ${r.up ? '+' : '−'}${r1(e.ex)}%p였어요.` + recPer(r)
          + (against ? ' 흔히 생각하는 것과 반대지만 과거 사례는 이랬어요.' : ''),
          `그래서 ${mean.replace(/많았어요$/, '많았던 만큼')}, ${AG} 앞으로 2년 ${SG} 평균보다 ${r.up ? '더 오를 쪽이에요' : '덜 오를 수 있어요'}.`],
        ev: e, evBase: '자기 구 평균 대비' });
    }
    /* 같은 묶음(거래 흐름 6·12개월)이 서로 반대 방향이면 엇갈린 것으로 보고 둘 다 뺀다 */
    xs.sort((a, b) => b.sc - a.sc).forEach(x => { if (!xs.some(y => y.grp === x.grp && y.side !== x.side) && !cand.some(y => y.grp && y.grp === x.grp)) cand.push(x); });
    /* ② 구 흐름 사례(구 1년 상승률·구 전세가율) */
    const R = g.r || {}, SR = sdo.r || {};
    for (const k of ['mom', 'jr']) {
      const e = regionEv(cx, k), r = w3dir(e, W3MIN.rn); if (!r || R[k] == null) continue;
      const fact = k === 'mom' ? `${SG} 아파트 전체 시세가 최근 1년 ${R.mom >= 0 ? '+' : '−'}${r1(R.mom)}% ${Math.abs(R.mom) < 0.05 ? '그대로예요' : R.mom > 0 ? '올랐어요' : '내렸어요'}` + (SR.mom != null ? `(${SD} ${UNIT} 중간값 ${SR.mom >= 0 ? '+' : '−'}${r1(SR.mom)}%).` : '.')
        : `${SG} 아파트 전체 전세가율이 ${r1(R.jr)}%예요` + (SR.jr != null ? `(${SD} ${UNIT} 중간값 ${r1(SR.jr)}%).` : '.');
      const t = k === 'mom' ? `${SG} 전체 최근 1년 ${R.mom >= 0 ? '+' : '−'}${r1(R.mom)}%` + (SR.mom != null ? `(${SD} ${UNIT} 중간값 ${SR.mom >= 0 ? '+' : '−'}${r1(SR.mom)}%)` : '')
        : `${SG} 전체 전세가율 ${r1(R.jr)}%` + (SR.jr != null ? `(${SD} ${UNIT} 중간값 ${r1(SR.jr)}%)` : '');
      const cond = `${GCOND[k]} ${SD} ${UNIT} 중 ${GQ[e.b]}였던 ${UNIT}`;
      cand.push({ side: r.up ? 'up' : 'dn', k: 'g' + k, kind: k, sc: Math.abs(e.ex) * (r.k / e.n), t, o: recOne(e, r, `${SD}에서 비슷한 ${UNIT}`, `${SD} 평균`),
        d: [fact, `과거 ${SD}에서 ${cond} ${n0(e.n)}곳(시점별로 센 수)을 2년 뒤와 비교해 봤더니 ${n0(r.k)}곳이 ${SD} 평균보다 ${r.up ? '더' : '덜'} 올랐고, 평균 차이는 ${r.up ? '+' : '−'}${r1(e.ex)}%p였어요.` + recPer(r),
          `그래서 ${SG} 전체 흐름은 앞으로 2년 ${SD} 평균보다 ${r.up ? '더 오를 쪽이에요' : '덜 오를 수 있어요'} — ${c.apt}에도 같은 방향으로 작용해요.`],
        ev: e, evBase: `${SD} 평균 대비` });
    }
    /* 같은 통계가 단지·구에서 반대 방향이면 구 쪽을 뺀다(사례가 많은 단지 쪽만) */
    const conflict = x => x.kind && cand.some(y => y.k === x.kind && y.side !== x.side);
    const pick = side => cand.filter(x => x.side === side && !conflict(x)).sort((a, b) => b.sc - a.sc).slice(0, 3).map(x => { delete x.sc; delete x.side; delete x.grp; return x; });
    out.up = pick('up'); out.dn = pick('dn');

    /* ③ 지켜볼 것: 날짜·단계가 있는 것 */
    const W = [];
    const RL = f.rl;
    if (RL && !RL.x && !RL.opened) {
      const dl = RL.dl || {}, tg = RL.target || dl.cur;
      const st = RL.stage === 'plan' ? '계획 확정, 착공 전' : '공사 중';
      const late = dl.delay > 0 && dl.orig_s ? ` 처음 목표(${String(dl.orig_s).slice(0, 4)}년)보다 ${dl.delay}개월 늦어졌어요.` : '';
      const e = ub.rail && ub.rail !== 'none' ? unitEv(cx, 'rail') : null, r = w3dir(e, W3MIN.n);
      const past = e && e.n ? `과거 ${SD}에서 ${RAILST[ub.rail] || ''}인 신설역 700m 안 단지 ${n0(e.n)}건 중 ${n0(Math.round(e.n * e.hit / 100))}건(${e.hit}%)이 2년 뒤 ${unitBase}보다 더 올랐어요(평균 ${e.ex >= 0 ? '+' : '−'}${r1(e.ex)}%p).` + (r ? '' : ' 더 오른 단지와 덜 오른 단지가 비슷해서 오를 이유로는 넣지 않았어요.') : '';
      W.push({ k: 'rail', when: tg || '', t: `${RL.line} ${RL.st} 개통${tg ? ` — 목표 ${ymKo(tg)}` : ''}`,
        o: `${A} ${RL.line} ${rlNm(RL)}${RL.m != null ? (RL.pl ? ` · ${rlAt(RL)} 거리` : `까지 직선 ${n0(RL.m)}m`) : ' 근처'}예요(${st}).` + late,
        d: [`${A} ${RL.line} ${rlNm(RL)}${RL.m != null ? (RL.pl ? ` · ${rlAt(RL)} 거리` : `까지 직선 ${n0(RL.m)}m`) : ' 근처'}예요. 지금 ${st} 단계이고, 개통 목표는 ${tg ? ymKo(tg) : '공식 자료로 확인 안 됨'}이에요.` + late, past,
          r ? `그래서 개통 일정이 앞당겨지거나 늦어지는 발표가 나오면 다시 확인해야 해요.` : ''], ev: e, evBase: '자기 구 평균 대비' });
    }
    /* 주변 개발사업(공식 원문 확인 사업, 다음 단계 날짜가 있는 가장 가까운 곳) */
    const DD = c.dev && c.dev.data;
    if (DD && DD.units && DD.projects && c.code && c.dong && jb) {
      const byId = {}; DD.projects.forEach(p => { byId[p.id] = p; });
      const recs = (DD.units[[c.code, c.dong, jb].join('|')] || []).filter(r => byId[r[0]] && (byId[r[0]].plan || []).length).sort((a, b) => a[1] - b[1]);
      const x = recs[0];
      if (x) {
        const p = byId[x[0]], nx = p.plan[0], last = (p.stages || []).slice(-1)[0];
        const DV = root.JDJDev, cs = DV && DV.caseOf ? DV.caseOf(p, x[2]) : null;
        const km = (Math.round(x[1] / 100) / 10).toFixed(1);
        W.push({ k: 'dev', when: ymOf(nx.d), t: `${p.short} ${nx.s} — 목표 ${dKo(nx.d)}`,
          o: `${A} ${p.short}에서 약 ${km}km예요${last ? `(지금 ${last.s} 단계, ${dKo(last.d)})` : ''}.`,
          d: [`${A} ${p.short}에서 약 ${km}km예요.${last ? ` 마지막으로 확인된 단계는 ${dKo(last.d)} ${last.s}이고,` : ''} 다음 단계는 ${dKo(nx.d)} ${nx.s} 목표예요.`,
            cs && cs.t ? (DV.factCase ? DV.factCase(cs.t) : cs.t) : '', ''],
          devHtml: DV && DV.detailHtml ? DV.detailHtml(DD, c.dev.u, c.dev.o || {}) : '' });
      }
    }
    /* 대규모 공급(같은 생활권·가까운 곳, 입주 전) */
    const SP = c.SP;
    if (f.sl && SP && SP.zones) {
      const zs = f.sl.map(([id, ring]) => [SP.zones[id], ring]).filter(([z]) => z && !z.x && z.st !== 3);
      if (zs.length) {
        const nm = z => z.n.replace(/\s*(공공주택지구|공공택지|지구)$/, '').replace(/^(서울|경기|인천)\s*/, '');
        const pYm = v => String(v).length >= 6 ? String(v).slice(0, 6) : String(v) + '12', pKo = v => String(v).length >= 6 ? ymKo(v) : v + '년';
        const tot = zs.reduce((a, [z]) => a + (z.u || 0), 0), plans = zs.map(([z]) => z.plan).filter(Boolean).sort((a, b) => pYm(a).localeCompare(pYm(b)));
        const ring = zs.some(([, r]) => r === 'n') ? 'near' : 'life', where = ring === 'near' ? '가까운 곳' : '같은 생활권';
        const RR = SP.ring && SP.ring[ring] && SP.ring[ring].ann;
        W.push({ k: 'supply', when: plans[0] ? pYm(plans[0]) : '', t: `${where} 대규모 공급 ${r1(tot / 10000)}만 가구${plans[0] ? ` — 첫 입주 목표 ${pKo(plans[0])}` : ''}`,
          o: `${zs.map(([z]) => `${nm(z)} ${r1(z.u / 10000)}만 가구${z.plan ? `(${pKo(z.plan)} 입주 목표)` : ''}`).join(', ')} 공급이 발표돼 있어요.`,
          d: [`${A} ${where}에 대규모 공급 ${zs.length}곳, 모두 ${n0(tot)}가구가 발표돼 있어요: ` + zs.map(([z]) => `${z.n} ${n0(z.u)}가구(${z.h && z.h[0] ? ymKo(z.h[0][0]) + ' 발표' : '발표 시기 확인 안 됨'}${z.plan ? `, 첫 입주 목표 ${pKo(z.plan)}` : ''})`).join(', ') + '.',
            RR && RR.n >= 3 && RR.ex != null ? `과거 ${where}에 대규모 공급이 발표된 단지 ${RR.n}곳은 이후 2년 ${unitBase}보다 평균 ${r1(RR.ex)}%p ${RR.ex >= 0 ? '더' : '덜'} 올랐어요.`
              + (RR.sig ? '' : ' 다만 사례마다 차이가 커서 오를 이유나 조심할 점으로는 넣지 않았어요.') : '', ''] });
      }
    }
    /* 주변 입주 예정(반경 1.5km, 청약홈 공고): 이유·조심할 점에 안 들어갔을 때만 — 과거 사례는 숫자 그대로, 같은 방향이 확인 안 되면 '그래서' 없음 */
    const SV = (f.xf || {}).sv;
    if (SV && SV[0] > 0 && SV[2] && !out.up.concat(out.dn).some(x => x.k === 'sv')) {
      const e = ub.sv ? unitEv(cx, 'sv') : null, r = w3dir(e, W3MIN.n), lab = (XB.sv || {})[ub.sv];
      const k = e && e.n ? Math.round(e.n * e.hit / 100) : 0;
      W.push({ k: 'sv', when: SV[2], t: `반경 1.5km 입주 예정 ${n0(SV[0])}세대 — 첫 입주 ${ymKo(SV[2])}`,
        o: `${A} 반경 1.5km 안에 2년 안 입주 예정인 청약홈 공고가 ${SV[1]}건, ${n0(SV[0])}세대예요.`,
        d: [`${A} 반경 1.5km 안에 2년 안 입주 예정인 청약홈 공고가 ${SV[1]}건, ${n0(SV[0])}세대이고, 첫 입주는 ${ymKo(SV[2])} 예정이에요. 청약홈에는 조합원 몫이 빠져 있어 실제 입주는 더 많을 수 있어요.`,
          e && e.n && lab ? `과거 ${SD}에서 반경 1.5km 안 2년 안 입주가 ${lab} 단지 ${n0(e.n)}건 중 ${n0(k)}건(${e.hit}%)이 2년 뒤 ${unitBase}보다 더 올랐어요(평균 ${e.ex >= 0 ? '+' : '−'}${r1(e.ex)}%p).` + (r ? '' : ' 더 오른 단지와 덜 오른 단지가 비슷해서 오를 이유나 조심할 점으로는 넣지 않았어요.') : '',
          ''], ev: e && e.n ? e : null, evBase: '자기 구 평균 대비' });
    }
    /* 재건축 진행 단계(서울 정비구역) */
    const z = f.rz;
    if (z && z.lv && PL.STAGE && z.lv < 10) {
      W.push({ k: 'stg', when: '', t: `재건축 다음 단계: ${PL.STAGE[z.lv + 1]}`, o: `${A} 재건축 10단계 중 ${z.lv}번째인 ${PL.STAGE[z.lv]} 단계예요${z.ym ? `(${ymKo(z.ym)})` : ''}.`,
        d: [`${A} 재건축 10단계 중 ${z.lv}번째인 ${PL.STAGE[z.lv]} 단계예요${z.ym ? `(${ymKo(z.ym)})` : ''}. 다음은 ${PL.STAGE[z.lv + 1]} 단계예요.`, '', ''] });
    }
    /* 정책 일정(시행 전 단계가 남은 정책 중 이 지역·가격대에 해당하는 것) */
    const POL = c.pol, nowYm = c.nowYm || (IX.dataTo || '');
    if (POL && POL.policies && c.code) {
      const eokNow = P && c.area ? P.now * c.area / 3.3058 / 10000 : null;
      for (const p of POL.policies) {
        if (!(p.status === 'active' || p.status === 'bill') || !(p.plan || []).length || !polHit(p, c.code, c.dong)) continue;
        if (p.ptier && p.ptier[0] && !(eokNow != null && eokNow >= p.ptier[0])) continue;
        const nx = p.plan.filter(s => ymOf(s.d) >= nowYm); if (!nx.length) continue;
        W.push({ k: 'pol', when: ymOf(nx[0].d), t: `${p.name.replace(/\(.*\)$/, '')} — ${dKo(nx[0].d)} ${nx[0].s}`,
          o: `지금 ${p.stage} 단계예요. ` + nx.map(s => `${dKo(s.d)} ${s.s}`).join(', ') + ' 예정이에요.',
          d: [`${p.name}: 지금 ${p.stage} 단계이고, 다음 일정은 ` + nx.map(s => `${dKo(s.d)} ${s.s}${s.note ? `(${s.note})` : ''}`).join(', ') + '예요.' + (p.price ? ` 대상은 ${p.price}이에요` + (eokNow ? `(${c.apt} ${c.band || ''} 지금 시세 약 ${r1(eokNow)}억 원).` : '.') : ''),
            (p.verdict || [])[0] && p.verdict[0].text ? p.verdict[0].text : '', ''] });
      }
    }
    out.watch = W.sort((a, b) => (a.when || '999999').localeCompare(b.when || '999999')).slice(0, 4);
    return out;
  }
  /* why3 문장 검사: 금지어(시험·통과 등)·숫자 없는 한 줄·지어낸 '그래서'(과거 사례 없는 그래서) */
  function lint3(W) {
    const bad = [], BAN = BANNED.concat(['시험', '통과']);
    const nm = [W.apt, W.sgg].filter(Boolean);
    ['up', 'dn', 'watch'].forEach(s => (W[s] || []).forEach((x, i) => {
      [x.t, x.o].concat(x.d || []).forEach(t => { if (!t) return; let u = t; nm.forEach(n => { u = u.split(n).join('〇'); }); BAN.forEach(b => { if (u.includes(b)) bad.push(`${s}${i}: 금지어 '${b}' — ${t}`); }); });
      if (!/\d/.test(x.o)) bad.push(`${s}${i}: 한 줄에 숫자 없음 — ${x.o}`);
      if (s !== 'watch' && !(x.ev && x.d[1])) bad.push(`${s}${i}: 과거 사례 없는 이유`);
      if (x.d[2] && !/^그래서 /.test(x.d[2])) bad.push(`${s}${i}: 마지막 문장이 '그래서'가 아님`);
    }));
    return bad;
  }

  /* ---------- 줄 만들기 ---------- */
  function build(f, c) {
    c = Object.assign({}, c, { f });
    const PL = c.PL || root.JDJ_PLAIN || {}, IX = c.IX || {};
    const g = (IX.sgg && IX.sgg[c.code]) || {}, sdo = (IX.sido || []).find(s => s.name === g.sido) || {};
    c.sgg = g.name || '같은 구'; c.sido = sdo.short || g.sido || ''; c.sid = sdo.id; c.year = c.year || new Date().getFullYear();
    const A = J(c.apt, '은', '는'), SG = c.sgg, SD = c.sido, MH = c.MH || {};
    const MV = h => MR(MH, h, g.sido);
    const out = { head: '', gap: '', lines: [], names: [c.apt, c.dong, c.sgg, f.ln, f.subs].filter(Boolean) };
    if (!f || f.fv == null) return out;
    const Gs = glosser();                         // 요약(맨 위 + 요약 줄)용 풀이
    const fh = f.fh || {};
    /* 오를 이유·조심할 점·지켜볼 것(why3): 기본 노출. 여기서 쓴 과거 사례·앞으로 볼 일정은 아래 4단계 설명에서 다시 쓰지 않는다 */
    const W3 = c.why3 !== false ? why3(f, c) : null;
    if (W3 && (W3.up.length || W3.dn.length || W3.watch.length)) out.why3 = W3;
    const w3k = new Set(W3 ? W3.up.concat(W3.dn).map(x => x.k) : []);
    const longH = [3, 5].filter(h => fh[h] != null && VR(MV(h)));
    const L = longH[0];
    const sL = L != null ? fh[L] : null;
    const rp = PL.regionPlace ? PL.regionPlace(IX, c.code, f.gs) : null;
    const regionUsed = c.regionUsed !== false && f.gs != null && rp;

    /* ① 한 줄 결론(대표 확정 11/20): 시·도 기준 + 구 기준을 함께.
       '{단지}는 앞으로 2년 {시·도} 아파트 평균보다 …. {이유 구절}, {구} 안에서만 보면 상위/하위 N%예요.'
       두 기준이 같은 방향이면 '{구} 안에서도 …'. 이유 구절은 구 흐름이 순위를 실제로 움직였을 때(구 안 순위와 차이 10 이상, 같은 방향)만,
       그 구 점수를 가장 많이 움직인 항목(index.json r.up/down)의 사실값으로. 3년 이상 문장은 이어서 그대로. */
    const R = g.r || {}, SR = sdo.r || {}, ri = PL.regionInfo ? PL.regionInfo(IX, c.code) : { unit: '구' }, UNIT = ri.unit || '구';
    const regGap = f.fvg != null ? f.fvg - f.fv : 0;          // 구 안 순위 − 지역 흐름까지 더한 시·도 순위
    const regDrive = !!(regionUsed && Math.abs(regGap) >= 10 && rp.pos !== '중위권' && (regGap > 0 ? rp.pos === '하위권' : rp.pos === '상위권'));
    const regClause = () => {
      if (!regDrive || side(f.fv) === 0) return '';
      const dn = regGap > 0, names = (dn ? R.down : R.up) || [];
      for (const nm of names) {
        if (nm === '구 시세 최근 1년 흐름' && R.mom != null && SR.mom != null) {
          if (dn && R.mom > SR.mom) return `${SG} 전체가 최근 1년 ${r1(R.mom)}% 올라(${SD} ${UNIT} 중간값 ${r1(SR.mom)}%) 쉬어 갈 차례이기 때문이고`;
          if (!dn && R.mom < SR.mom) return `${SG} 전체가 최근 1년 ${R.mom < 0 ? r1(R.mom) + '% 내려' : r1(R.mom) + '%로 덜 올라'}(${SD} ${UNIT} 중간값 ${r1(SR.mom)}%) 따라 오를 여지가 있기 때문이고`;
        }
        if (nm === '구 전세가율' && R.jr != null && SR.jr != null && Math.abs(R.jr - SR.jr) >= 2) {
          if (dn && R.jr < SR.jr) return `${SG} 전체 ${Gs('전세가율')}이 ${r1(R.jr)}%로 ${SD} ${UNIT} 중간값(${r1(SR.jr)}%)보다 낮아 실거주 수요가 받쳐 주는 힘이 약하기 때문이고`;
          if (!dn && R.jr > SR.jr) return `${SG} 전체 ${Gs('전세가율')}이 ${r1(R.jr)}%로 ${SD} ${UNIT} 중간값(${r1(SR.jr)}%)보다 높아 실거주 수요가 받쳐 주기 때문이고`;
        }
      }
      return `${SG} 전체 흐름이 ${rp.text}로 ${dn ? '약하기' : '강하기'} 때문이고`;
    };
    /* 결론에는 과거 시험을 통과한 기간만(대표 확정 11/20). model_h 가 없으면 확인할 수 없어 2년은 그대로 둔다 */
    const ok2 = !c.MH || !MH['2'] || VR(MV(2));
    {
      let h = '';
      if (ok2) {
        h = `${A} 앞으로 2년 ${SD} 아파트 ${lean(f.fv)}.`;
        if (f.fvg != null && SG) {
          const same = side(f.fvg) !== 0 && side(f.fvg) === side(f.fv);
          const rc = regClause();
          h += ' ' + (rc ? rc + ', ' : '') + `${SG} 안에서${same ? '도' : '만 보면'} ${topPct(f.fvg)}예요.`;
        }
        if (sL != null) h += ` ${L}년 이상 길게 보면 ${lean(sL)}.`;
      } else if (sL != null) h = `${A} ${L}년 이상 길게 보면 ${SD} 아파트 ${lean(sL)}.`;
      else { const w = (MV(2) || {}).where; h = `${A} 1~7년 전망 모두 ${w && w !== '전국' ? w + ' 단지로 ' : ''}과거에 써 봤을 때 맞은 횟수가 적어 결론을 내지 않았어요.`; }
      out.head = h;
    }
    /* 이 예측, 믿을 수 있나요? — 기간별 과거 시험 성적(이 단지 시·도 단지로 시험, 단지가 적으면 도 지역 묶음·전국) */
    out.trust = [1, 2, 3, 5, 7].filter(h => (h === 2 ? f.fv : fh[h]) != null && MV(h) && (MV(h).oos_all || []).length)
      .map(h => { const m = MV(h), per = (m.oos_all || []).filter(o => o && o.t0).slice().sort((x, y) => String(x.t0).localeCompare(String(y.t0)));
        return { h, n: m.oos_all.length, hit: m.oos_hit || 0, ok: VR(m), avg: m.oos_avg, where: m.where, fb: m.fb, from: m.from, per: per.map(o => [String(o.t0), o.top20, o.bottom20]) }; });
    out.sidoShort = SD;
    out.regionOk = !!regionUsed;
    out.headH = (ok2 ? [2] : []).concat(sL != null ? [L] : []);
    out.dim = [1, 2, 3, 5, 7].filter(h => (h === 2 ? f.fv : fh[h]) != null && MV(h) && !VR(MV(h))).map(h => `${h}년 ${topPct(h === 2 ? f.fv : fh[h])}`);

    /* ② 이유 줄 */
    const reasons = [];
    if (regDrive && R.mom != null) {
      const dn = regGap > 0, G = glosser();
      const hiMom = SR.mom != null && R.mom > SR.mom;
      const times = SR.mom > 0 && R.mom / SR.mom >= 1.8 ? `의 약 ${Math.round(R.mom / SR.mom)}배` : '';
      const sum = `${SG} 전체 시세가 최근 1년 ${r1(R.mom)}% ${R.mom >= 0 ? '올라' : '내려'}` + (SR.mom != null ? ` ${SD} ${UNIT} 중간값(${r1(SR.mom)}%)${times || (hiMom ? '보다 높아요' : '보다 낮아요')}` : '')
        + ` — 그래서 앞으로 2년 ${SG} 흐름은 ${rp.text}로 ${dn ? '약한' : '강한'} 편이에요.`;
      const fact = `${SG} 아파트 ${G('평당')} 시세는 최근 1년 ${r1(R.mom)}% ${R.mom >= 0 ? '올랐어요' : '내렸어요'}` + (R.jr != null ? `. ${SG} 전체 ${G('전세가율')}은 ${r1(R.jr)}%예요.` : '.');
      const cmp = SR.mom != null ? `${SD} ${rp.n}개 ${UNIT}의 중간값은 1년 상승률 ${r1(SR.mom)}%` + (SR.jr != null && R.jr != null ? `, 전세가율 ${r1(SR.jr)}%예요. ${J(SG, '은', '는')} 상승률이 ${r1(R.mom - SR.mom)}${G('%p')} ${R.mom > SR.mom ? '높고' : '낮고'}, 전세가율은 ${r1(R.jr - SR.jr)}%p ${R.jr > SR.jr ? '높아요' : '낮아요'}.` : `예요. ${J(SG, '은', '는')} ${r1(R.mom - SR.mom)}${G('%p')} ${R.mom > SR.mom ? '높아요' : '낮아요'}.`) : '';
      /* 과거 사례 문장은 순위 화면·지도 구 카드와 같은 공용 guPast */
      const gp = w3k.has('gmom') ? null : guPast(Object.assign({}, c, { unit: UNIT === '구' ? '구' : '시·군·구' }), 'mom', !dn), e = gp ? gp.e : null, past = gp ? gp.t : '';
      const sameSide = side(f.fvg) !== 0 && side(f.fvg) === side(f.fv);
      const so = sameSide ? `그래서 ${c.apt}의 2년 순위(${SD} ${topPct(f.fv)})는 ${SG} 전체 흐름 때문에 더 ${dn ? '낮아졌어요' : '높아졌어요'}. ${SG} 안에서만 비교해도 ${A} ${topPct(f.fvg)}예요.`
        : `그래서 ${c.apt}의 2년 순위(${SD} ${topPct(f.fv)})는 단지보다 ${SG} 전체 흐름 때문에 ${dn ? '낮아졌어요' : '높아졌어요'}. ${SG} 안에서만 비교하면 ${A} ${topPct(f.fvg)}예요.`;
      reasons.push({ k: 'reg', t: sum, d: [fact, cmp, past, so], ev: e, evBase: `${SD} 평균 대비` });
    }
    /* 단지 자체: 2년 점수 방향 태그 → 사실값이 있는 것만, 이미 쓴 통계는 다시 안 씀 */
    const usedEv = new Set([...w3k].filter(k => !k.startsWith('g')));
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
        const so = `그래서 ${J(WN[k] || '이 점', '은', '는')} ${c.apt}의 ${h}년 점수를 ${up ? '올렸어요' : '낮췄어요'}` + (h === 2 && regionUsed && reasons.length ? ` — ${SG} 전체 흐름과는 ${up === (regGap <= 0) ? '같은' : '반대'} 방향이에요.` : '.');
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
      const cmp = [P.gu ? `${SG} 아파트 전체 ${G('평당')} 시세는 ${won(P.gu)}` + (P.sd ? `, ${SD} ${P.nsd}개 ${UNIT} 중간값은 ${J(won(P.sd), '이에요', '예요')}.` : '이에요.') : '',
        P.pk && !P.pkIsNow ? `${c.apt}의 최근 3년 최고 시세는 ${ymKo(P.pkAt)} ${J(won(P.pk), '이었어요', '였어요')}.` : '',
        lg != null && !lead ? `${c.dong} 대장 단지 ${f.ln || ''}는 같은 평형 기준 ${c.apt}보다 ${Math.round((1 / lg - 1) * 100)}% 비싸요.` : ''].filter(Boolean).join(' ');
      let past = '', e = null;
      const relE = !usedEv.has('rel') && unitEv(c, 'rel');
      if (relE && Math.abs(relE.ex) >= 0.5) {
        e = relE; usedEv.add('rel');
        past = `과거 ${SD}에서 같은 구 안 가격 수준이 ${Q5[relE.b]}였던 단지 ${n0(relE.n)}건은 2년 뒤 같은 구 평균보다 ${ppMore(relE.ex, G)} 올랐어요(${hitTxt(relE, relE.ex < 0)}).`;
      }
      const hi = vsGu != null && vsGu >= 0.1;
      const so = '그래서 ' + [hi ? `${A} ${SG} 안에서 이미 비싼 편이에요(${SG} 전체보다 ${Math.round(vsGu * 100)}% 비쌈)` : vsGu != null && vsGu <= -0.1 ? `${A} ${SG} 안에서 싼 편이에요(${SG} 전체보다 ${Math.round(-vsGu * 100)}% 쌈)` : `${A} ${SG} 안에서 중간 가격대예요(${SG} 전체 시세와 차이 ${vsGu != null ? Math.round(Math.abs(vsGu) * 100) : 0}%)`,
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
        parts.push(`신설역 1곳(${RL.line} ${rlNm(RL)}, ${st}${RL.m != null ? `, ${rlAt(RL, '직선 ')}` : ''})`);
        if (!RL.opened) nextTxt.push(`${RL.line} ${rlNm(RL)}(${RL.target ? `개통 목표 ${ymKo(RL.target)}` : RL.m != null ? rlAt(RL, '직선 ') : '신설역 1곳'})`);
        facts.push(`${A} ${RL.line} ${rlNm(RL)}${RL.m != null ? (RL.pl ? ` · ${rlAt(RL)} 거리` : `까지 직선 ${n0(RL.m)}m`) : ' 근처'}예요(${st}${RL.target && !RL.opened ? `, 개통 목표 ${ymKo(RL.target)}` : ''}).`);
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
      if (parts.length && !(out.why3 && out.why3.watch.length)) {
        const so = !parts.length ? '' : nextTxt.length ? `그래서 ${A} ${nextTxt.join(', ')}의 다음 단계 발표가 나올 때 다시 확인해야 해요.`
          : `그래서 ${RL.line} ${RL.st} 개통(${ymKo(RL.stym)}) 뒤 ${c.apt} 시세가 ${SG} 전체보다 더 움직였는지 함께 보세요.`;
        lines.push({ k: 'watch', t: `앞으로 볼 변수: ${parts.join(' · ')}.`, d: [facts.join(' '), '', pasts.join(' '), so], devHtml });
      }
    }

    /* ⑤ 보유 기간별로 맞는 사람 */
    {
      const G = glosser();
      const hs = (ok2 ? [2] : []).concat([3, 5, 7].filter(h => fh[h] != null && VR(MV(h))));
      if (hs.length >= 2) {
        const sc = h => h === 2 ? f.fv : fh[h];
        const good = hs.filter(h => side(sc(h)) > 0), bad = hs.filter(h => side(sc(h)) < 0);
        const lab = h => `${h}년 ${topPct(sc(h))}`;
        let sum;
        if (bad.includes(2) && good.length) sum = `2년 안에 팔 계획이면 불리한 쪽(${lab(2)})이고, ${good[0]}년 이상 보유할 사람에게 맞아요(${good.map(lab).join(', ')}).`;
        else if (good.includes(2) && bad.length) sum = `2년 안팎 짧게 보유할 사람에게 맞고(${lab(2)}), ${bad[0]}년 이상 길게 보면 불리한 쪽이에요(${bad.map(lab).join(', ')}).`;
        else if (good.length === hs.length) sum = `짧게(${hs[0]}년) 보유해도, 길게(${hs[hs.length - 1]}년) 보유해도 유리한 쪽이에요(${hs.map(lab).join(', ')}).`;
        else if (bad.length === hs.length) sum = `짧게(${hs[0]}년) 보유해도, 길게(${hs[hs.length - 1]}년) 보유해도 불리한 쪽이에요(${hs.map(lab).join(', ')}).`;
        else sum = `보유 기간별 순위는 ${hs.map(lab).join(', ')}예요 — 기간에 따라 평균과 비슷한 구간이 섞여 있어요.`;
        const fact = `${A} ${SD} 아파트 전체와 비교해 ` + hs.map(h => `${h}년 기준 ${topPct(sc(h))}`).join(', ') + '예요.';
        const tested = hs.filter(h => MV(h) && MV(h).oos_all);
        const cmp = tested.length ? `이 예측 방법을 과거에 그대로 써 봤더니 `
          + tested.map(h => { const m = MV(h); return `${h}년 전망은 ${m.oos_all.length}번 중 ${m.oos_hit}번`; }).join(', ') + ` 맞았어요${whereNote(tested.map(h => Object.assign({ h }, MV(h))), SD, '(', ')')}.` : '';
        const pq = [];
        for (const h of hs) {
          if (h === 2) continue;
          const m = MH[String(h)], q = m && m.q5, b = Math.min(4, Math.floor(sc(h) / 20)), x = q && q[b];
          if (x && x[1] >= 2) pq.push(`과거에 그대로 써 봤을 때 ${h}년 순위가 ${Q5[b]}였던 단지는 ${h}년 뒤 같은 구 평균보다 ${ppMore(x[0], G)} 올랐어요(${x[1]}번 중 ${x[2]}번 더 오름, 사례 ${n0(x[3])}건).`);
        }
        const so = '그래서 ' + (bad.includes(2) && good.length ? `${A} 단기 시세 차익보다 ${good[0]}년 이상 실거주·보유 목적에 더 맞아요.`
          : good.includes(2) && bad.length ? `${A} 오래 묵히기보다 2년 안팎 보유 계획에 더 맞아요.`
          : good.length === hs.length ? `${A} 보유 기간과 관계없이 유리한 쪽이에요(${hs.map(lab).join(', ')}).` : bad.length === hs.length ? `${A} 보유 기간과 관계없이 평균보다 덜 오를 쪽이에요(${hs.map(lab).join(', ')}).` : `${A} 보유 기간을 정한 뒤 해당 기간 순위(${hs.map(lab).join(', ')})를 기준으로 보세요.`);
        lines.push({ k: 'fit', t: sum, d: [fact, cmp, pq.join(' '), so], hz: hs.map(h => [h, sc(h), MV(h)]) });
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
    out.lines = lines.filter(x => x.t).slice(0, 6).map(x => { x.d = x.d.map(s => s || ''); return x; });
    return out;
  }


  /* =====================================================================
     다른 카테고리(전월세·빌라·오피스텔·갈아타기·청약) — 아파트와 같은 원칙
     한 줄 결론 → 핵심 요약 3~5줄 → 줄별 4단계(사실→비교→과거 흐름→그래서). 확인 안 된 숫자는 문장째 생략.
     화면이 이미 계산한 공개 자료 값만 받는다(c). 반환 N 은 html()/bind()/lint() 를 그대로 쓴다.
     ===================================================================== */
  const STEPS = {
    jeonse: ['이 집 숫자', '비교', '과거 흐름', '그래서'], villa: ['이 건물 숫자', '비교', '과거 흐름', '그래서'],
    offi: ['이 건물 숫자', '비교', '과거 흐름', '그래서'], offiR: ['이 지역 숫자', '비교', '과거 흐름', '그래서'],
    sw: ['내 숫자', '비교', '계산 기준', '그래서'], cy: ['내 숫자', '비교', '과거 당첨 결과', '그래서']
  };
  /* 카테고리 줄 종류(집계 stat.js 허용 목록과 같음) */
  const CKINDS = ['jr', 'jflow', 'hug', 'jw', 'jgu', 'jsup', 'jmig', 'jpol', 'zone', 'land', 'age', 'right', 'deal', 'yield', 'rate', 'dem', 'osup', 'score', 'cgt', 'loan', 'cost', 'top', 'cut', 'pick', 'past', 'time'];
  function mk(cat, head, lines, ex) {
    const N = Object.assign({ cat, head: head || '', gap: '', names: [], trust: [], headH: [], dim: [], step: STEPS[cat] }, ex || {});
    N.lines = (lines || []).filter(x => x && x.t).slice(0, 5).map(x => ({ k: x.k, t: x.t, d: [0, 1, 2, 3].map(i => (x.d || [])[i] || '') }));
    if (!N.lines.length && !/\d/.test(N.head)) N.head = '';
    return N;
  }
  const P0 = v => Math.round(v * 100) + '%';
  /* 천 명 단위 → '약 90.1만 명' / '8,500명' */
  const ppl = k => { const v = Math.round(k * 1000); return v >= 10000 ? `${r1(v / 10000)}만 명` : `${n0(v)}명`; };
  const chg = (v, more, less) => Math.abs(v) < 0.005 ? '비슷해요' : `${P1(Math.abs(v))} ${v > 0 ? more : less}`;                        // 0.428 → '43%'
  const P1 = v => r1(v * 100) + '%';                                // 0.428 → '42.8%'
  const updn = (v, a, b) => v > 0 ? a : b;
  /* 두 값 비교: 2% 미만은 '비슷' */
  const vs = (v, base, hi, lo, same) => { const d = v / base - 1; return Math.abs(d) < 0.02 ? same : `${Math.round(Math.abs(d) * 100)}% ${d > 0 ? hi : lo}`; };
  const medianOf = a => median(a);

  /* ---------- 전월세 jeonse/ ----------
     c = { name, band, kind(a|v|o|d), sgg, sido, unit('구'|'시·군·구'), sm(JDJ_RENT.summary), g(rent index 의 구), peers([{code, sup, jr}] 같은 시·도),
           gch1(구 전세 1년 변화 {pct}), gLast({v, at}), dep(내가 넣은 보증금, 선택), pub·senior(선택), hug{ratio, pub}, pol({now:[...]} 선택), area } */
  function jeonse(c) {
    const sm = c.sm || {}, nm = c.name, A = J(nm, '은', '는'), SG = c.sgg, SD = c.sido, UNIT = c.unit || '구', apt = c.kind === 'a';
    const KND = { a: '아파트', v: '빌라', o: '오피스텔', d: '단독·다가구' }[c.kind] || '아파트';
    if (!SG) return mk('jeonse', '', []);
    /* 전세가율: 아파트는 매매·전세 시세, 그 밖은 같은 건물(동) 계약이 각각 3건 이상일 때만 */
    const jr0 = sm.jr && sm.jr.r > 0 ? sm.jr : null, jr = jr0 && (jr0.s > 0 || ((jr0.nj || 0) >= 3 && (jr0.ns || 0) >= 3)) ? jr0 : null;
    const j = sm.j && sm.j.v > 0 ? sm.j.v : null, g = c.g || {}, HUG = c.hug || null;
    const s = jr && jr.s > 0 ? jr.s : null;
    const bandTxt = c.band ? ` ${c.band}` : '';
    /* HUG 보증 한도: 공시가격을 넣었으면 공시가격 기준, 아파트는 매매 시세(실거래) 기준 */
    let cap = null, capBase = '';
    if (HUG && c.pub > 0) { cap = c.pub * HUG.pub * HUG.ratio - (c.senior || 0); capBase = `공시가격 ${won(c.pub)}`; }
    else if (HUG && apt && s) { cap = s * HUG.ratio - (c.senior || 0); capBase = `매매 시세 ${won(s)}`; }
    if (cap != null && !(cap > 0)) cap = 0;
    /* HUG 보증 대상 보증금 상한: 수도권(서울·인천·경기) 7억 원, 그 밖 5억 원 */
    const capMetro = /^(11|28|41)/.test(String(c.code || '')), capLim = capMetro ? 70000 : 50000, capRaw = cap;
    const capHit = cap != null && cap > capLim; if (capHit) cap = capLim;
    const capLimTxt = `${capMetro ? '수도권' : '수도권 밖'} 보증금 상한 ${won(capLim)}`;
    const dep = c.dep > 0 ? c.dep : null;

    /* ① 한 줄 결론 */
    let head = '';
    if (dep && j) {
      const dv = dep / j - 1, same = Math.abs(dv) < 0.02;
      head = `이 집 전세 ${J(won(dep), '은', '는')} 같은 평형 최근 전세 중간값(${won(j)})${same ? '과 비슷하' : `보다 ${Math.round(Math.abs(dv) * 100)}% ${dv > 0 ? '높' : '낮'}`}`
        + (s ? `고, 매매 시세의 ${P0(dep / s)}예요(전세가율).` : '아요.');
    } else if (j) {
      const ch = sm.ch1;
      head = `${nm}${bandTxt} 전세 시세 ${J(won(j), '은', '는')} ` + (ch ? (Math.abs(ch.pct) < 0.01 ? '1년 전과 비슷하' : `1년 전보다 ${P1(Math.abs(ch.pct))} ${ch.pct > 0 ? '올랐' : '내렸'}`) : `${ymKo(sm.j.at)} 기준이`)
        + (jr ? `고, ${s ? '매매 시세' : jr.b === 'd' ? `같은 동 ${KND} 매매 시세` : '같은 건물 매매 시세'}의 ${P0(jr.r)}예요(전세가율).` : (ch ? '어요.' : '에요.'));
    }
    if (cap != null) {
      const hc = `HUG 보증은 보증금 ${won(cap) || '0원'}까지 돼요${capHit ? `(${capMetro ? '수도권' : '수도권 밖'} 상한)` : ''}`;
      head += (head ? ' ' : '') + (cap <= 0 ? `${capBase} 기준으로 HUG 보증 가입이 어려워요(한도 0원).`
        : dep ? `${hc} — 이 보증금은 ${dep > cap ? `한도보다 ${won(dep - cap)} 많아 가입이 어려워 위험해요.` : `한도보다 ${won(cap - dep)} 적어 가입할 수 있어요.`}`
        : j && j > cap * 1.02 ? `${hc} — 지금 전세 시세(${won(j)})로는 가입이 어려워요.` : `${hc} — 보증금이 그보다 크면 위험해요.`);
    }

    const L = [];
    /* ② 전세가율 위치 */
    if (jr) {
      const gj = g.jr && g.jr[0] > 0 ? g.jr[0] : null, jrs = (c.jrs || []).filter(v => v > 0);
      const d1 = jrs.length > 12 ? jrs[jrs.length - 1] - jrs[jrs.length - 13] : null;   // ‰ → %p×10
      const pk = jrs.length ? Math.max(...jrs) : null;
      const t = `전세가율 ${P0(jr.r)}` + (apt && gj ? `로 ${SG} 아파트 중간값(${P0(gj)})보다 ${Math.abs(jr.r - gj) < 0.01 ? '비슷해요' : `${r1(Math.abs(jr.r - gj) * 100)}%p ${jr.r > gj ? '높아요' : '낮아요'}`}` : '예요')
        + (d1 != null && Math.abs(d1) >= 5 ? ` — 1년 새 ${r1(Math.abs(d1) / 10)}%p ${d1 > 0 ? '올랐어요' : '내렸어요'}.` : '.');
      const fact = s ? `${nm}${bandTxt} 전세가율은 ${ymKo(jr.at || sm.j.at)} 기준 ${P1(jr.r)}예요(전세 ${won(jr.j || j)} ÷ 매매 ${won(s)}).`
        : `${nm}${bandTxt} 전세가율은 ${P1(jr.r)}예요(최근 1년 전세 계약 ${n0(jr.nj || 0)}건 ÷ ${jr.b === 'd' ? `같은 동 ${KND}` : '같은 건물'} 매매 ${n0(jr.ns || 0)}건, ㎡당 중간값).`;
      const cmp = gj && apt ? `${SG} 아파트 ${n0(g.jr[1])}개 단지·평형의 전세가율 중간값은 ${P1(gj)}예요.` : '';
      const past = d1 != null ? `1년 전 전세가율은 ${r1(jrs[jrs.length - 13] / 10)}%였어요` + (pk && pk > jrs[jrs.length - 1] + 5 ? `. 자료가 있는 기간 중 가장 높았던 값은 ${r1(pk / 10)}%예요.` : '.') : '';
      const so = jr.r >= 1 ? `그래서 전셋값이 집값의 ${P0(jr.r)}로 집값보다 높아, 집을 팔아도 전세금을 다 돌려받기 어려워요(깡통전세 위험).`
        : `그래서 집값이 지금보다 ${P0(1 - jr.r)} 넘게 내리면 집을 팔아도 이 전셋값을 다 돌려주기 어려워요` + (jr.r >= 0.8 ? ` — 전세가율 ${P0(jr.r)}는 위험 쪽이에요.` : '.');
      L.push({ k: 'jr', t, d: [fact, cmp, past, so] });
    }
    /* ③ 최근 전셋값 흐름 */
    if (sm.ch1 && j) {
      const ch = sm.ch1, gc = c.gch1;
      const t = `전셋값이 최근 1년 ${Math.abs(ch.pct) < 0.01 ? `${pctSg(ch.pct)}로 비슷해요` : `${P1(Math.abs(ch.pct))} ${ch.pct > 0 ? '올랐어요' : '내렸어요'}`}` + (gc ? `(${SG} 아파트 전체 ${pctSg(gc.pct)}).` : '.');
      const fact = `${nm}${bandTxt} 전세 시세는 ${ymKo(ch.fromAt)} ${won(ch.from)}에서 ${ymKo(ch.toAt)} ${J(won(ch.to), '으로', '로')}${Math.abs(ch.pct) < 0.01 ? ' 비슷해요.' : ` ${P1(Math.abs(ch.pct))} ${ch.pct > 0 ? '올랐어요' : '내렸어요'}.`}`;
      const cmp = gc && c.gLast ? `같은 기간 ${SG} 아파트 전체 전셋값(3.3㎡당 ${n0(c.gLast.v)}만 원)은 ${pctSg(gc.pct)}예요.` : '';
      const past = sm.ch3 ? `3년 전(${ymKo(sm.ch3.fromAt)}) 전세 시세는 ${J(won(sm.ch3.from), '으로', '로')}, 지금은 그때보다 ${Math.abs(sm.ch3.pct) < 0.01 ? '비슷해요' : `${P1(Math.abs(sm.ch3.pct))} ${sm.ch3.pct > 0 ? '높아요' : '낮아요'}`}.` : '';
      const dv = ch.to - ch.from;
      const so = Math.abs(ch.pct) < 0.01 ? `그래서 같은 집을 1년 전과 비슷한 ${won(ch.to)} 안팎에 구할 수 있어요.` : `그래서 같은 집을 구하려면 1년 전보다 ${won(Math.abs(dv))} ${dv > 0 ? '더 줘야' : '덜 줘도'} 돼요.`;
      L.push({ k: 'jflow', t, d: [fact, cmp, past, so] });
    }
    /* ⑤ 주변 입주 물량 */
    {
      const peers = (c.peers || []).filter(p => p.code), n = peers.length, sup = g.sup && g.sup.n > 0 ? g.sup : null;
      const withS = peers.filter(p => p.sup > 0).sort((a, b) => b.sup - a.sup), rk = sup ? withS.findIndex(p => p.code === c.code) + 1 : 0;
      if (sup && n >= 3 && rk > 0) {
        const rows = sup.rows || [], mvs = rows.map(r => r[2]).filter(Boolean).sort();
        const t = `앞으로 2년 ${SG} 아파트 입주 예정 ${n0(sup.n)}세대 — ${SD} ${n}개 ${UNIT} 중 ${rk}번째로 많아요.`;
        const fact = `${SG}에 입주 예정인 단지는 ${rows.length}곳이에요: ` + rows.slice(0, 3).map(r => `${r[0]} ${n0(r[1])}세대(${ymKo(r[2])})`).join(', ') + (rows.length > 3 ? ` 외 ${rows.length - 3}곳.` : '.');
        const md = medianOf(peers.map(p => p.sup || 0).concat(peers.some(p => p.code === c.code) ? [] : [sup.n]));
        const cmp = `${SD} ${n}개 ${UNIT} 중 입주 예정이 있는 곳은 ${withS.length}곳이고, ${UNIT}별 중간값은 ${n0(md || 0)}세대예요.`;
        const so = mvs.length ? `그래서 ${ymKo(mvs[0])}${mvs.length > 1 && mvs[mvs.length - 1] !== mvs[0] ? `~${ymKo(mvs[mvs.length - 1])}` : ''} 입주 때 새 전세 물건이 한꺼번에 나와 세입자가 고를 집이 늘어요.` : `그래서 입주 때 새 전세 물건 ${n0(sup.n)}세대가 한꺼번에 나와 세입자가 고를 집이 늘어요.`;
        L.push({ k: 'jsup', t, d: [fact, cmp, '', so] });
      } else if (sup) {
        const rows = (sup.rows || []).filter(r => r[2]);
        const t = `앞으로 2년 ${SG} 아파트 입주 예정 ${n0(sup.n)}세대예요.`;
        const fact = rows.length ? `${SG}에 입주 예정인 단지는 ${rows.length}곳이에요: ` + rows.slice(0, 3).map(r => `${r[0]} ${n0(r[1])}세대(${ymKo(r[2])})`).join(', ') + (rows.length > 3 ? ` 외 ${rows.length - 3}곳.` : '.') : '';
        L.push({ k: 'jsup', t, d: [fact, '', '', `그래서 입주 때 새 전세 물건 ${n0(sup.n)}세대가 한꺼번에 나와 세입자가 고를 집이 늘어요.`] });
      } else if (!sup && n >= 3) {
        const t = `앞으로 2년 ${SG} 아파트 입주 예정이 0세대예요(${SD} ${n}개 ${UNIT} 중 ${withS.length}곳은 있어요).`;
        L.push({ k: 'jsup', t, d: [`청약홈 분양 공고 기준으로 ${SG}에는 앞으로 2년 안에 입주하는 아파트가 0곳이에요.`, `${SD}에서 입주 예정이 있는 ${UNIT}는 ${n}곳 중 ${withS.length}곳이에요.`, '',
          `그래서 새 아파트 입주로 전세 물건이 한꺼번에 늘어날 일이 앞으로 2년 동안 ${SG}에는 0건이에요.`] });
      }
    }
    /* ⑥ 정비사업 이주(있을 때만) */
    if (g.mig && (g.mig.rows || []).length) {
      const m = g.mig, rows = m.rows, mv = rows.filter(r => r[4]).length;
      const t = `${SG} 정비사업 ${rows.length}곳이 이주 단계예요` + (m.n ? `(기존 ${n0(m.n)}가구)` : '') + ` — 살던 가구가 주변에서 전셋집을 찾아요.`;
      const fact = rows.slice(0, 3).map(r => `${r[0]}${r[2] ? ` ${n0(r[2])}가구` : ''}(${r[4] ? `${ymKo(r[4])} 이주 시작` : r[3] ? `${ymKo(r[3])} 관리처분인가` : '관리처분 단계'})`).join(', ') + (rows.length > 3 ? ` 외 ${rows.length - 3}곳` : '') + ` — ${rows.length}곳 모두 관리처분인가 뒤 착공 전이에요.`;
      const cmp = `${rows.length}곳 중 ${mv}곳은 이주를 시작했고 ${rows.length - mv}곳은 이주 전이에요.`;
      const so = `그래서 이주가 이어지는 동안 ${SG} 전세 수요가 ${m.n ? `최대 ${n0(m.n)}가구만큼` : `${rows.length}곳만큼`} 늘 수 있어요.`;
      L.push({ k: 'jmig', t, d: [fact, cmp, '', so] });
    }
    /* ⑦ 정책 */
    const pn = c.pol && c.pol.now && c.pol.now.length ? c.pol.now : null;
    if (pn) {
      const p0 = pn[0].p, rc = (pn[0].rec || []).find(o => o.jx != null);
      const t = `전월세에 영향을 주는 정책 ${pn.length}개가 ${SG}에 적용돼요` + (rc ? ` — '${p0.name}'(${ymKo(p0.date.replace(/-/g, '').slice(0, 6))} 발표) 뒤 ${SG} ${rc.label} 전세 보증금이 ${pctSg(rc.jx / 100)} 움직였어요.` : ` — 가장 최근은 '${p0.name}'(${ymKo(p0.date.replace(/-/g, '').slice(0, 6))} 발표)예요.`);
      const fact = pn.slice(0, 3).map(x => `'${x.p.name}'(${ymKo(x.p.date.replace(/-/g, '').slice(0, 6))}, ${x.badge || '시행 중'})`).join(', ') + `이 ${SG} 전월세 계약·전세대출에 적용돼요.`;
      const cmp = rc ? `발표 전 3개월(${ymKo(rc.before[0])}~)과 최근 3개월(${ymKo(rc.after[0])}~)을 비교한 값이에요(같은 단지 전세 ${n0(rc.jxn || 0)}쌍).` : '';
      const so = `그래서 계약·대출 전에 아래 '전월세에 영향을 주는 정책' 칸에서 ${pn.length}개 정책의 대상 조건을 확인하세요.`;
      L.push({ k: 'jpol', t, d: [fact, cmp, '', so] });
    }
    /* ④ HUG 보증 한도 */
    if (cap != null && cap > 0 && j) {
      const room = cap - j;
      const t = `HUG 보증 한도 ${won(cap)} — 지금 전세 시세(${won(j)})${Math.abs(room) < j * 0.02 ? '와 비슷해요.' : `보다 ${won(Math.abs(room))} ${room > 0 ? '여유가 있어요.' : '모자라요.'}`}`;
      const fact = `HUG 전세보증금반환보증 한도는 ${capBase}의 ${Math.round(HUG.ratio * 100)}%${c.pub > 0 ? `(공시가격 × ${r1(HUG.pub * 100)}% = ${J(won(c.pub * HUG.pub), '이', '가')} 주택가격)` : ''}${c.senior > 0 ? `에서 선순위채권 ${won(c.senior)}을 뺀 ${won(capRaw)}` : `인 ${won(capRaw)}`}${capHit ? `이지만, ${capLimTxt}에 걸려 ${won(cap)}까지예요.` : '예요.'}`;
      const cmp = `이 평형 최근 전세 중간값은 ${J(won(j), '이에요', '예요')}.`;
      const so = room > 0 ? `그래서 보증금을 ${won(cap)} 아래로 맞춰야 보증에 가입할 수 있어요${c.senior > 0 ? '' : ' — 근저당이 있으면 그 금액만큼 한도가 줄어요'}.` : `그래서 이 집 시세 수준(${won(j)})의 보증금은 보증 가입이 어려워요.`;
      L.push({ k: 'hug', t, d: [fact, cmp, '', so] });
    }
    /* 같은 구 아파트 평균과 3.3㎡당 전셋값 비교(다른 줄이 모자랄 때 채움) */
    if (apt && j && c.area > 0 && c.gLast && c.gLast.v > 0) {
      const per = j / c.area * 3.3058, gv = c.gLast.v, dv = per / gv - 1, same = Math.abs(dv) < 0.02;
      const t = `3.3㎡당 전셋값 ${n0(per)}만 원 — ${SG} 아파트 평균(${n0(gv)}만 원)${same ? '과 비슷해요.' : `보다 ${Math.round(Math.abs(dv) * 100)}% ${dv > 0 ? '높아요' : '낮아요'}.`}`;
      const fact = `${nm}${bandTxt} 전세 시세 ${J(won(j), '을', '를')} 전용 ${r1(c.area)}㎡로 나눠 3.3㎡당 값으로 바꾸면 ${n0(per)}만 원이에요.`;
      const cmp = `${SG} 아파트 전체 전셋값은 ${ymKo(c.gLast.at)} 기준 3.3㎡당 ${n0(gv)}만 원이에요.`;
      const so = `그래서 같은 넓이를 ${SG} 평균 값으로 빌리면 약 ${won(gv * c.area / 3.3058)}이에요.`;
      L.push({ k: 'jgu', t, d: [fact, cmp, '', so] });
    }
    /* 전세 vs 월세(전환율): 다른 줄이 모자랄 때 채움 */
    if (j && sm.wr && sm.wr.v > 0 && sm.wd && j > sm.wd.v) {
      const cv = sm.wr.v * 12 / (j - sm.wd.v), cvT = `${(Math.round(cv * 1000) / 10).toFixed(1)}%`;
      const t = `월세는 보증금 ${won(sm.wd.v) || '0원'}에 월 ${n0(sm.wr.v)}만 원 — 전세와 견준 전환율은 연 ${cvT}예요.`;
      const fact = `${nm}${bandTxt} 최근 월세 시세는 ${ymKo(sm.wr.at)} 기준 보증금 ${won(sm.wd.v) || '0원'}, 월 ${n0(sm.wr.v)}만 원이에요.`;
      const cmp = `전세 ${J(won(j), '과', '와')} 월세 보증금의 차이 ${won(j - sm.wd.v)}에 대해 1년 월세 ${won(sm.wr.v * 12)}을 내는 셈이라 연 ${cvT}예요.`;
      const so = `그래서 전세대출 금리가 연 ${cvT}보다 낮으면 전세가, 높으면 월세가 매달 덜 들어요.`;
      L.push({ k: 'jw', t, d: [fact, cmp, '', so] });
    }
    return mk('jeonse', head, L, { names: [nm, SG, c.dong, ...(g.sup ? g.sup.rows.map(r => r[0]) : []), ...(g.mig ? g.mig.rows.map(r => r[0]) : []), ...(pn || []).map(x => x.p.name)].filter(Boolean) });
  }

  /* ---------- 빌라·재개발 villa/ ----------
     c = { b(건물), zones(구 안 모든 구역), dm(동별 대지지분 평당가 중간값 {m, c}), dongB(같은 동 건물들), sgg, year(올해), ym(자료 끝 YYYYMM), PL } */
  const REL = ['구역 안', '구역 대표 지번', '같은 동 구역', '같은 동 구역 밖'];
  function villa(c) {
    const b = c.b, Z = c.zones || [], nm = b.n && !/^\(?[\d\-]+\)?$/.test(b.n) ? b.n : `${b.d} ${b.j} 건물`, A = J(nm, '은', '는'), SG = c.sgg, D = b.d;
    const now = c.ym ? +String(c.ym).slice(0, 4) + (+String(c.ym).slice(4, 6) - 1) / 12 : (c.year || new Date().getFullYear());
    const yrs = ym => now - (+String(ym).slice(0, 4) + (+String(ym).slice(4, 6) - 1) / 12);
    const zs = (b.z || []).filter(z => z[1] !== 3 && Z[z[0]]).slice().sort((x, y) => x[1] - y[1] || (Z[y[0]].lv - Z[x[0]].lv));
    const z0 = zs[0] ? Z[zs[0][0]] : null, rel = zs[0] ? zs[0][1] : null, rk = zs[0] ? zs[0][2] : null;
    const allOut = (b.z || []).length && (b.z || []).every(z => z[1] === 3);
    const ST = (c.PL && c.PL.STAGE) || {};
    const dmm = c.dm && c.dm[D];
    const ppOk = b.pp > 0 && b.l > 0 && !(b.l > b.a * 4);
    const age = b.y ? Math.max(0, Math.floor(now - b.y)) : null;
    /* 같은 단계 구역의 첫 공식 단계 뒤 경과 연수(구 안, 3곳 이상일 때만) */
    const el = z0 && z0.b ? yrs(z0.b) : null;
    const peer = z0 ? Z.filter(z => z !== z0 && z.lv === z0.lv && z.b && !z.x).map(z => yrs(z.b)) : [];
    const pm = peer.length >= 3 ? median(peer) : null;
    const yN = v => v < 1 ? '1년 안' : `${Math.round(v)}년`;
    const yAfter = v => v < 1 ? '1년이 안 됐어요' : `${Math.round(v)}년째예요`;

    let head = '';
    if (z0) head = `${A} ${REL[rel]}인 ${z0.n} ${z0.t.replace(/\(.*\)/, '')}(10단계 중 ${z0.lv}단계, ${z0.st})과 연결돼 있고` + (el != null ? `, 첫 공식 단계(${ymKo(z0.b)}) 뒤 ${yAfter(el)}` + (pm != null ? `(${SG} 같은 단계 구역 중간값 ${yN(pm)}).` : '.') : ' 단계 날짜 자료는 없어요.');
    else if (allOut) head = `${A} 같은 동 정비구역 ${(b.z || []).length}곳의 공식 경계 밖이에요.`;
    else head = `${A} 같은 동에 연결된 재개발 정비구역이 0곳이에요.`;
    let land = null;
    if (ppOk && dmm && dmm.m > 0) { const dv = b.pp / dmm.m - 1; land = [`대지지분 평당가 ${n0(b.pp)}만 원은 ${D} 빌라 중간값` + (Math.abs(dv) < 0.02 ? '과 비슷하' : `보다 ${Math.round(Math.abs(dv) * 100)}% ${dv > 0 ? '비싸' : '싸'}`), Math.abs(dv) < 0.02 ? '비슷해요' : dv > 0 ? '비싸요' : '싸요']; }
    if (land && age != null) head += ` ${land[0]}고, ${b.y}년에 지은 ${age}년 된 건물이에요.`;
    else if (land) head += ' ' + land[0].replace(/(비슷하|비싸|싸)$/, land[1]) + '.';
    else if (age != null) head += ` ${b.y}년에 지은 ${age}년 된 건물이에요.`;

    const L = [];
    if (z0) {
      const zl = Z.filter(z => z.lv > 0), hi = zl.filter(z => z.lv > z0.lv).length;
      const t = `${J(`${z0.n} ${z0.t.replace(/\(.*\)/, '')}`, '은', '는')} 10단계 중 ${z0.lv}단계(${z0.st})예요 — 이 건물은 ${REL[rel]}에 있어요.`;
      const fact = `${J(z0.n, '은', '는')} ${z0.b ? `${ymKo(z0.b)}에 첫 공식 단계를 밟았고 ` : ''}지금 10단계 중 ${z0.lv}번째인 ${z0.st} 단계예요.`;
      const cmp = zl.length >= 3 ? `${SG} 정비구역 ${zl.length}곳 중 이보다 단계가 높은 곳은 ${hi}곳이에요.` : '';
      const past = el != null && el >= 1 && z0.lv >= 2 ? `${J(z0.n, '은', '는')} 첫 공식 단계 뒤 한 단계에 평균 ${r1(el / Math.max(1, z0.lv - 1))}년씩 걸려 ${z0.lv}단계까지 왔어요` + (pm != null ? `(${SG} 같은 ${z0.lv}단계 구역의 첫 단계 뒤 경과 중간값 ${r1(pm)}년).` : '.') : '';
      const so = z0.lv < 10 ? `그래서 다음은 ${z0.lv + 1}단계인 ${ST[z0.lv + 1] || '다음'} 단계예요 — ${z0.lv >= 8 ? '이주·착공이 가까워요' : z0.lv >= 5 ? '조합이 생겨 사업 주체가 정해졌어요' : '아직 조합 설립 전이라 사업 계획이 바뀔 수 있어요'}.` : `그래서 ${J(z0.n, '은', '는')} 10단계(착공)까지 와서 공사 중이에요.`;
      L.push({ k: 'zone', t, d: [fact, cmp, past, so] });
    }
    if (ppOk && dmm && dmm.m > 0) {
      const dv = b.pp / dmm.m - 1, same = Math.abs(dv) < 0.02;
      const all = (c.allB || []).filter(x => x.pp > 0 && x.l > 0 && !(x.l > x.a * 4)).map(x => x.pp), gm = all.length >= 5 ? median(all) : null;
      const t = `대지지분 평당가 ${n0(b.pp)}만 원 — ${D} 빌라 중간값(${n0(dmm.m)}만 원, ${n0(dmm.c)}건)${same ? '과 비슷해요.' : `보다 ${Math.round(Math.abs(dv) * 100)}% ${dv > 0 ? '비싸요' : '싸요'}.`}`;
      const fact = `${A} 최근 거래가 ${won(b.p)}, 대지권 ${r1(b.l)}㎡(${r1(b.l / 3.3058)}평)라 대지지분 평당가가 ${n0(b.pp)}만 원이에요.`;
      const zi = z0 && z0.pin && z0.pout && z0.pin[0] && z0.pout[0] ? z0 : null;
      const cmp = [`${D} 빌라 최근 12개월 ${n0(dmm.c)}건의 대지지분 평당가 중간값은 ${n0(dmm.m)}만 원이에요.`, gm ? `${SG} 빌라 ${n0(all.length)}곳 중간값은 ${n0(gm)}만 원이에요.` : '',
        zi ? `${zi.n} 구역 안 거래는 ${n0(zi.pin[0])}만 원(${zi.pin[1]}건), 같은 동 구역 밖은 ${n0(zi.pout[0])}만 원(${zi.pout[1]}건)이에요.` : ''].filter(Boolean).join(' ');
      const so = same ? `그래서 같은 돈으로 ${D} 중간 수준과 비슷한 대지지분을 사는 셈이에요(차이 ${Math.round(Math.abs(dv) * 100)}%).`
        : `그래서 같은 돈으로 ${D} 중간 수준보다 대지지분을 ${Math.round(Math.abs(dmm.m / b.pp - 1) * 100)}% ${dv < 0 ? '더 많이' : '덜'} 사는 셈이에요.`;
      L.push({ k: 'land', t, d: [fact, cmp, '', so] });
    }
    if (age != null) {
      const ages = (c.dongB || []).filter(x => x.y).map(x => Math.floor(now - x.y));
      const md = ages.length >= 5 ? median(ages) : null, older = ages.filter(a => a > age).length;
      const t = `${b.y}년에 지어 ${age}년 됐어요` + (md != null ? ` — ${D}에서 거래된 빌라 중간값(${md}년)${Math.abs(age - md) < 1 ? '과 비슷해요.' : `보다 ${Math.round(Math.abs(age - md))}년 ${age > md ? '오래됐어요' : '새것이에요'}.`}` : '.');
      const fact = `${A} ${b.y}년에 지은 ${b.t || '빌라'}로, 올해 ${age}년째예요.`;
      const cmp = md != null ? `최근 거래가 있는 ${D} 빌라 ${ages.length}곳의 건축 연수 중간값은 ${md}년이에요.` : '';
      const so = md != null ? `그래서 ${D} 거래 빌라 ${ages.length}곳 중 이 건물보다 오래된 곳은 ${older}곳(${Math.round(older / ages.length * 100)}%)이에요.` : `그래서 이 건물은 지은 지 ${age}년이 지났어요.`;
      L.push({ k: 'age', t, d: [fact, cmp, '', so] });
    }
    if (z0 && rel <= 1 && z0.b && b.y && (rk === 'o' || rk === 'r')) {
      const by = +String(z0.b).slice(0, 4);
      const t = rk === 'o' ? `${b.y}년 건축으로 ${z0.n}의 첫 공식 단계(${ymKo(z0.b)})보다 ${by - b.y}년 먼저 지어 입주권을 받을 가능성이 높아요.`
        : `${b.y}년 건축으로 ${z0.n}의 첫 공식 단계(${ymKo(z0.b)}) 뒤에 지어 현금청산 위험이 있어요.`;
      const fact = `${A} ${b.y}년에 지었고, ${z0.n}의 가장 이른 공식 단계는 ${J(ymKo(z0.b), '이에요', '예요')}.`;
      const cmp = `입주권은 권리산정기준일 전에 지은 건물이어야 받을 수 있어요 — 이 건물은 그 추정일(${ymKo(z0.b)})보다 ${Math.abs(by - b.y)}년 ${rk === 'o' ? '앞서요' : '늦어요'}.`;
      const so = rk === 'o' ? `그래서 ${z0.n} 사업이 이어지면 이 건물은 새 아파트 입주권 대상일 가능성이 높아요(기준일 추정보다 ${by - b.y}년 앞섬).`
        : `그래서 ${z0.n} 사업이 진행되면 새 아파트 대신 현금으로 정산받을 수 있어요(기준일 추정보다 ${b.y - by}년 늦음).`;
      L.push({ k: 'right', t, d: [fact, cmp, '', so] });
    }
    /* 최근 거래: 전용 ㎡당 값을 같은 동 거래 빌라와 비교(다른 줄이 모자랄 때 채움) */
    if (b.p > 0 && b.a > 0 && /^\d{6}/.test(String(b.dt || ''))) {
      const per = b.p / b.a, at = ymKo(String(b.dt).slice(0, 6));
      const ps = (c.dongB || []).filter(x => x !== b && x.p > 0 && x.a > 0).map(x => x.p / x.a), md = ps.length >= 5 ? median(ps) : null;
      const dv = md ? per / md - 1 : 0, same = Math.abs(dv) < 0.02;
      const t = `최근 거래 ${won(b.p)}(${at}, 전용 ${r1(b.a)}㎡)` + (md ? ` — 전용 ㎡당 ${n0(per)}만 원으로 ${D} 빌라 중간값(${n0(md)}만 원)${same ? '과 비슷해요.' : `보다 ${Math.round(Math.abs(dv) * 100)}% ${dv > 0 ? '비싸요' : '싸요'}.`}` : '예요.');
      const fact = `${A} ${at}에 전용 ${r1(b.a)}㎡가 ${won(b.p)}에 거래됐어요(전용 ㎡당 ${n0(per)}만 원).`;
      const cmp = md ? `최근 거래가 있는 ${D} 빌라 ${ps.length}곳의 전용 ㎡당 거래가 중간값은 ${n0(md)}만 원이에요.` : '';
      const so = md ? `그래서 같은 넓이(전용 ${r1(b.a)}㎡)를 ${D} 중간 수준 값으로 사면 약 ${won(md * b.a)}이에요.` : `그래서 전용 3.3㎡(1평)당 ${n0(per * 3.3058)}만 원에 거래된 셈이에요.`;
      L.push({ k: 'deal', t, d: [fact, cmp, '', so] });
    }
    return mk('villa', head, L, { names: [nm, D, SG, z0 && z0.n, b.n].filter(Boolean) });
  }

  /* ---------- 오피스텔 mine/?t=o ----------
     c = { u(건물, 없으면 지역만), s(offi index 의 구), sgg, sido, name, mort{v, at}, base{v, at}, bt(index.bt), pass(통과 기간), rankText, scoreRank } */
  function offi(c) {
    const u = c.u, s = c.s || {}, SG = c.sgg, SD = c.sido, d = s.dem || {}, job = d.job, sup = s.sup, mort = c.mort, y = u && u.y && u.y.r > 0 ? u.y : null;
    const RT = c.rankText || (rk => rk ? `상위 ${rk[0]}%` : '');
    const L = [];
    let head = '';
    const nm = u ? c.name : SG, A = J(nm, '은', '는');
    if (y) {
      const g = u.rk && u.rk.g, gm = s.y && s.y[0] > 0 ? s.y : null;
      head = `${A} 임대수익률 ${P1(y.r)}로 ` + (gm ? `${SG} 오피스텔 중간값(${P1(gm[0])})${Math.abs(y.r - gm[0]) < 0.001 ? '과 비슷하' : `보다 ${r1(Math.abs(y.r - gm[0]) * 100)}%p ${y.r > gm[0] ? '높' : '낮'}`}고` : g ? `${SG} 오피스텔 ${g[2]}곳 중 ${RT(g)}이고` : `${ymKo(y.at)} 기준이고`)
        + (mort ? `, 주택담보대출 금리(${mort.v}%)보다 ${r1(Math.abs(y.r * 100 - mort.v))}%p ${y.r * 100 >= mort.v ? '높아요' : '낮아요'}.` : '.');
      if (mort && y.r * 100 < mort.v) head += ' 대출을 끼고 사면 월세로 이자를 다 못 내요.';
      const t = `수익률 ${P1(y.r)}` + (g ? ` — ${SG} 오피스텔 ${g[2]}곳 중 ${RT(g)}` : '') + (u.rk && u.rk.d ? `, 같은 동 ${u.rk.d[2]}곳 중 ${RT(u.rk.d)}` : '') + '.';
      const fact = `${A} 최근 1년 월세 계약 ${n0(y.nw || 0)}건과 매매 ${n0(y.ns || 0)}건으로 계산한 표면 수익률이 ${P1(y.r)}예요(${ymKo(y.at)} 기준, 보증금 ${won(y.dep)} · 월세 ${n0(y.mr)}만 원 예시).`;
      const cmp = gm ? `${SG}에서 수익률을 계산할 수 있는 오피스텔 ${gm[1]}곳의 중간값은 ${P1(gm[0])}예요.` : '';
      const ys = (u.ys || []).filter(v => v > 0), y1 = ys.length > 12 ? ys[ys.length - 13] / 1000 : null;
      const past = y1 ? `1년 전 수익률은 ${P1(y1)}였어요 — ${Math.abs(y.r - y1) < 0.001 ? '비슷해요' : `${r1(Math.abs(y.r - y1) * 100)}%p ${y.r > y1 ? '올랐어요' : '내렸어요'}`}.` : '';
      const ex = y.p && u.a ? Math.round(y.p * u.a / 100) * 100 : null;
      const so = ex ? `그래서 ${won(ex)}짜리 한 채(전용 ${u.a}㎡)를 보증금 ${won(y.dep)}을 끼고 사면 내 돈 ${won(ex - y.dep)}으로 1년에 월세 ${won(y.mr * 12)}을 받는 셈이에요.` : `그래서 내 돈 1억 원당 1년에 월세 약 ${won(y.r * 10000)}을 받는 셈이에요.`;
      L.push({ k: 'yield', t, d: [fact, cmp, past, so] });
      if (mort) {
        const sp = Math.round((y.r * 100 - mort.v) * 100) / 100;
        L.push({ k: 'rate', t: `주택담보대출 금리 ${mort.v}% 대비 수익률이 ${r1(Math.abs(sp))}%p ${sp >= 0 ? '높아요' : '낮아요'}.`,
          d: [`예금은행 주택담보대출 금리는 ${ymKo(mort.at)} 신규 기준 ${mort.v}%예요.`, c.base ? `한국은행 기준금리는 ${c.base.v}%(${ymKo(c.base.at)})예요.` : '', '',
            sp >= 0 ? `그래서 대출로 산 돈 1억 원당 1년 이자보다 월세가 약 ${won(sp * 100)} 더 들어와요(세금·관리비·공실 전).` : `그래서 대출로 산 돈 1억 원당 1년 이자가 월세보다 약 ${won(-sp * 100)} 더 나가요(세금·관리비·공실 전).`] });
      }
    } else if (job) {
      const c1 = job.c1 || 0;
      head = `${SG}에서 일하는 사람(오피스텔 임대수요)은 ${ppl(job.v)}으로 1년 전${Math.abs(c1) < 0.005 ? '과 비슷하고' : `보다 ${P1(Math.abs(c1))} ${c1 > 0 ? '늘었고' : '줄었고'}`}` + (job.rk ? `(늘어난 폭 전국 ${job.rk[2]}개 시·군·구 중 ${RT(job.rk)})` : '')
        + `, 앞으로 2년 새 오피스텔 입주 예정은 ${n0((sup && sup.o) || 0)}실이에요.`;
    }
    if (job) {
      const t = `${SG}에서 일하는 사람 ${ppl(job.v)} — 1년 전${Math.abs(job.c1 || 0) < 0.005 ? '과 비슷해요' : `보다 ${chg(job.c1 || 0, '늘었어요', '줄었어요')}`}` + (job.rk ? `(늘어난 폭 전국 ${RT(job.rk)}).` : '.');
      const fact = `${SG} 근무지 기준 취업자는 ${ymKo(job.at)} ${ppl(job.v)}이에요${job.grp > 1 ? '(구가 있는 시는 시 전체 값)' : ''}.`;
      const cmp = job.rk ? `1년 증가 폭을 전국 ${job.rk[2]}개 시·군·구와 비교하면 ${J(RT(job.rk), '이에요', '예요')}.` : '';
      const hh = d.hh && d.hh.p12 != null ? `1~2인 세대 비중은 ${P1(d.hh.p12)}예요${d.hh.d3 != null ? `(3년 전보다 ${r1(Math.abs(d.hh.d3) * 100)}%p ${d.hh.d3 >= 0 ? '늘었어요' : '줄었어요'})` : ''}.` : '';
      const past = job.c3 != null ? `3년 전보다 ${Math.abs(job.c3) < 0.005 ? '비슷해요' : `${P1(Math.abs(job.c3))} ${job.c3 > 0 ? '늘었어요' : '줄었어요'}`}. ${hh}`.trim() : hh;
      const so = Math.abs(job.c1 || 0) < 0.005 ? `그래서 ${SG}에서 오피스텔 세입자가 될 직장인 수는 1년 전과 비슷한 ${ppl(job.v)} 안팎이에요.` : `그래서 ${SG}에서 오피스텔 세입자가 될 직장인이 1년 새 약 ${ppl(Math.abs(job.v * (job.c1 || 0) / (1 + (job.c1 || 0))))} ${(job.c1 || 0) >= 0 ? '늘었어요' : '줄었어요'}.`;
      L.push({ k: 'dem', t, d: [fact, cmp, past, so] });
    }
    {
      const o = (sup && sup.o) || 0, rows = (sup && sup.rows) || [];
      const t = `앞으로 2년 ${SG} 오피스텔·도시형생활주택 입주 예정 ${n0(o)}실·세대` + (sup && sup.apt ? `(아파트 ${n0(sup.apt)}세대 별도).` : '.');
      const fact = o ? `청약홈 공고 기준 ${rows.length}곳이에요: ` + rows.slice(0, 3).map(r => `${r[0]} ${n0(r[1])}실(${ymKo(r[2])})`).join(', ') + (rows.length > 3 ? ` 외 ${rows.length - 3}곳.` : '.') : `청약홈 공고 기준 ${SG}에 앞으로 2년 입주하는 오피스텔은 0곳이에요.`;
      const cmp = job && o ? `일하는 사람 1,000명당 새 오피스텔 ${r1(o / job.v)}실이에요.` : '';
      const so = o ? `그래서 ${ymKo(rows.map(r => r[2]).sort()[0])}부터 새 오피스텔 ${n0(o)}실이 세입자를 함께 찾아요.` : `그래서 앞으로 2년 ${SG}에서 새 오피스텔과 세입자를 나눠 가질 일은 0건이에요.`;
      if (sup || job) L.push({ k: 'osup', t, d: [fact, cmp, '', so] });
    }
    if (u && u.sc && (c.pass || []).length) {
      const h = c.pass[0], sc = u.sc[h];
      if (sc != null) L.push({ k: 'score', t: `${h}년 보유 종합 점수 ${sc}점 — ${SD} 오피스텔 중 ${(c.scoreRank || (v => v))(sc)}.`,
        d: [`${A} 수익률과 가격 흐름을 합친 ${h}년 점수가 ${sc}점이에요(100점 만점, 50점이 가운데).`, '', '', `그래서 ${SD} 오피스텔 100곳을 줄 세우면 ${100 - sc}등 안팎이에요.`] });
    }
    /* 검증 카드: 오피스텔 점수(bt) 중 시험 기록이 있는 기간 */
    const trust = Object.keys(c.bt || {}).filter(h => (c.bt[h].oos_all || []).filter(o => o && o.top20 != null).length).map(h => {
      const m = c.bt[h], per = m.oos_all.filter(o => o && o.t0 && o.top20 != null).sort((x, y) => String(x.t0).localeCompare(String(y.t0)));
      return { h: +h, n: m.oos_all.filter(o => o && o.top20 != null).length, hit: m.oos_hit || 0, ok: m.status === 'pass', avg: m.oos_avg, from: m.data_from || m.from, per: per.map(o => [String(o.t0), o.top20, o.bottom20]) };
    });
    return mk(y ? 'offi' : 'offiR', head, L, { names: [nm, SG].concat(((sup && sup.rows) || []).map(r => r[0])).filter(Boolean), trust: u && u.sc ? trust : [], headH: [],
      tunit: '오피스텔', tbase: '같은 시·군·구 평균', tscope: '전국 오피스텔로 써 본 결과예요.' });
  }

  /* ---------- 갈아타기 switch/ ----------
     c = { sale, acq, cgt, status(loss|free|part|tax), gain, why(비과세·중과 이유 한 줄), holdY, residM, fee, oldLoan, net, extra, cash, P, L, by(LTV|CAP|DSR|BAN), ltv, dsrL, rate, term,
           pick{apt, band, sido, sgg, fv, rank, P, mon, ch3}, oneOff, P2, newMonthly, keepMonthly, n3 } */
  function sw(c) {
    const W = won, L = [];
    if (!(c.sale > 0)) return mk('sw', '', []);
    const cg = c.cgt > 0 ? W(c.cgt) : '0원';
    let head = `지금 집을 ${W(c.sale)}에 팔면 양도세 ${cg}` + (c.status === 'free' ? '(1세대 1주택 비과세)' : '') + `·대출 상환 뒤 ${W(Math.max(0, c.net)) || '0원'}이 남아`;
    if (c.P > 0) { const df = c.P - c.sale; head += `, 새 대출 ${W(c.L) || '0원'}을 더해 최대 ${W(c.P)} 집까지 갈아탈 수 있어요 — 지금 집보다 ${Math.abs(df) < c.sale * 0.01 ? '비슷한 값이에요.' : `${W(Math.abs(df))} ${df > 0 ? '더 비싼' : '싼'} 집이에요.`}`; }
    else head += '요. 이 돈으로는 갈아탈 집 값을 계산할 수 없어요(0원).';
    {
      const eff = c.gain > 0 ? c.cgt / c.gain : 0;
      const t = c.status === 'loss' ? `양도차익이 0원 이하라 양도세가 0원이에요.` : c.status === 'free' ? `양도세 0원 — 1세대 1주택 비과세(보유 ${c.holdY}년).`
        : `양도세 ${cg}(지방세 포함) — 양도차익 ${W(c.gain)}의 ${P1(eff)}예요.`;
      const fact = `${W(c.acq)}에 사서 ${W(c.sale)}에 팔면 필요경비를 뺀 양도차익이 ${c.gain > 0 ? W(c.gain) : '0원'}이에요.`;
      const cmp = c.why ? `${c.why}` + (/[.요]$/.test(c.why) ? '' : '.') : '';
      const so = c.tip || `그래서 매도 중개보수 ${J(W(c.fee), '과', '와')} 대출 상환 ${W(c.oldLoan) || '0원'}까지 빼면 손에 ${W(Math.max(0, c.net)) || '0원'}이 남아요.`;
      L.push({ k: 'cgt', t, d: [fact, cmp && /\d/.test(cmp) ? cmp : '', '', so] });
    }
    if (c.P > 0) {
      const BY = { LTV: `집값의 ${Math.round(c.ltv * 100)}%(LTV)`, CAP: '가격구간별 대출 한도', DSR: '소득 기준 상환 한도(DSR 40%)', DTI: '소득 기준 상환 한도(DTI)', BAN: '다주택 주담대 금지' }[c.by] || c.by;
      const t = c.by === 'BAN' ? `새 대출 0원 — 다주택은 이 지역에서 주택구입 주담대를 받을 수 없어요.` : `새 대출 ${W(c.L)} — 한도는 ${BY}에 맞춰 정해져요.`;
      const fact = `최대 집값 ${W(c.P)} 기준으로 LTV 한도는 ${W(c.P * c.ltv) || '0원'}, 소득(DSR) 한도는 ${W(c.dsrL) || '0원'}이에요.`;
      const cmp = `자기자본 ${W(c.cash)} + 새 대출 ${W(c.L) || '0원'}에서 취득세·중개 ${J(W(c.buyCost), '과', '와')} 기타 ${W(c.etc) || '0원'}을 빼면 집값 ${J(W(c.P), '이에요', '예요')}.`;
      const so = c.by === 'DSR' ? `그래서 연소득이 1,000만 원 늘면 한도가 약 ${W(c.dsrPer1k)} 늘어요.` : c.by === 'LTV' ? `그래서 자기자본이 1,000만 원 늘면 살 수 있는 집값이 약 ${W(Math.round(1000 / (1 - c.ltv)))} 늘어요.` : `그래서 대출 한도는 이 지역·가격 규칙(${W(c.L) || '0원'})에 묶여 있어요.`;
      L.push({ k: 'loan', t, d: [fact, cmp, '', so] });
    }
    if (c.oneOff > 0 && c.P2 > 0) {
      const up = c.P2 > c.sale, be = up ? c.oneOff / (c.P2 - c.sale) : null;
      const t = `한 번에 나가는 비용 ${W(c.oneOff)}` + (be != null ? ` — 두 집이 같이 ${P1(be)} 넘게 올라야 메워져요.` : ` — 더 싼 집으로 옮겨 집값 차이 ${J(W(c.sale - c.P2), '으로', '로')} 채워요.`);
      const fact = `양도세 ${cg}, 매도 중개보수 ${W(c.fee)}, 새 집 취득세·중개 ${W(c.buyCost2)}, 기타 ${W(c.etc) || '0원'}을 더한 값이에요.`;
      const cmp = c.n3 != null && c.pickName ? `비교 단지 ${c.pickName}의 약 3년 평당가 변동은 ${pctSg(c.n3)}예요.` : '';
      const mon = c.keepMonthly != null ? `매달 대출 상환은 ${n0(c.newMonthly)}만 원으로 지금보다 ${n0(Math.abs(c.newMonthly - c.keepMonthly))}만 원 ${c.newMonthly >= c.keepMonthly ? '늘어요' : '줄어요'}.` : `매달 대출 상환은 ${n0(c.newMonthly)}만 원이에요.`;
      const so = be != null ? `그래서 갈아탄 뒤 집값이 ${P1(be)} 넘게 오르지 않으면 지금 집에 남는 쪽이 순자산이 더 커요. ${mon}` : `그래서 갈아타면 순자산은 비용만큼 줄지만 대출은 ${W(c.L) || '0원'}으로 맞춰져요. ${mon}`;
      L.push({ k: 'cost', t, d: [fact, cmp, '', so] });
    }
    if (c.pick && c.pick.fv != null) {
      const p = c.pick;
      const t = `예산 안 미래가치 1위: ${p.apt} ${p.band}(${p.fv}점, ${p.rank}) — 추정 시세 ${W(p.P)}, 매달 상환 ${n0(p.mon)}만 원.`;
      const fact = `${p.apt} ${p.band}는 ${p.sido} ${p.sgg} ${p.dong} 단지예요(추정 시세 ${W(p.P)}).`;
      const cmp = `예산 안에 드는 단지 ${n0(p.total)}곳 중 미래가치 점수가 가장 높아요.` + (p.ch3 != null ? ` 약 3년 평당가 변동은 ${pctSg(p.ch3)}예요.` : '');
      const so = `그래서 대출·취득세를 다 내고도 ${W(p.left) || '0원'}이 남는 단지 중 가장 먼저 볼 곳이에요.`;
      L.push({ k: 'top', t, d: [fact, cmp, '', so] });
    }
    return mk('sw', head, L, { names: c.pick ? [c.pick.apt, c.pick.sgg, c.pick.dong] : [] });
  }

  /* ---------- 청약 chungyak/ ----------
     c = { my, h, d, cc(무주택·부양가족·통장 점수), items([{name, sido, sgg, band, lo, hi, g(hi|mid|lo), need}] 가능성 순), cnt{hi, mid, lo}, scope, nNotice,
           hist{sido, span, n, hit, pct, med}, years(다음 목표까지 몇 년, 목표 점수) } */
  function cy(c) {
    if (c.my == null) return mk('cy', '', []);
    const my = c.my, it = c.items || [], hi = it.filter(x => x.g === 'hi'), mid = it.filter(x => x.g === 'mid');
    const uniq = a => [...new Set(a.map(x => x.name))];
    const rng = x => x.lo === x.hi ? `${x.lo}점` : `${x.lo}~${x.hi}점`;
    const top = hi[0] || mid[0] || it[0];
    let head;
    if (top) {
      head = `내 가점 ${my}점은 ${top.name} ${top.band} 예상 커트라인(${rng(top)})${top.g === 'hi' ? '보다 높아요' : top.g === 'mid' ? '에 들어가요' : `보다 ${top.need}점 낮아요`}`
        + (hi.length ? ` — 당첨 가능성 높은 단지 ${uniq(hi).length}곳.` : mid.length ? ` — 경합인 단지 ${uniq(mid).length}곳.` : ` — 지금 공고 ${n0(c.nNotice || 0)}곳 중 가능성 높은 단지는 0곳이에요.`);
    } else if (c.hist && c.hist.n) head = `내 가점 ${my}점이면 ${c.hist.sido} ${c.hist.span} 주택형 ${n0(c.hist.n)}개 중 ${c.hist.pct}%에서 당첨될 점수였어요.`;
    else head = `내 가점은 84점 만점 중 ${my}점이에요.`;
    const L = [];
    {
      const P = [['무주택기간', c.h, 32], ['부양가족', c.d, 35], ['통장 가입기간', c.cc, 17]].filter(x => x[1] != null);
      const gap = P.slice().sort((a, b) => (b[2] - b[1]) - (a[2] - a[1]))[0];
      L.push({ k: 'pick', t: `가점 ${my}점 = 무주택기간 ${c.h}점 + 부양가족 ${c.d}점 + 통장 ${c.cc}점(84점 만점의 ${Math.round(my / 84 * 100)}%).`,
        d: [`무주택기간 ${c.h}/32점, 부양가족 ${c.d}/35점, 청약통장 가입기간 ${c.cc}/17점이에요.`, `가장 많이 남은 칸은 ${gap[0]}으로 만점까지 ${gap[2] - gap[1]}점이에요.`, '',
          `그래서 점수를 올릴 여지가 가장 큰 건 ${gap[0]}(${gap[2] - gap[1]}점)이에요.`] });
    }
    if (it.length) {
      const show = (hi.length ? hi : mid.length ? mid : it).slice(0, 3);
      const t = `지금 공고 중 가능성 높음 ${uniq(hi).length}곳 · 경합 ${uniq(mid).length}곳 — ` + (hi.length || mid.length ? '' : '가장 가까운 곳은 ') + show.map(x => `${x.name} ${x.band}(${rng(x)})`).join(', ') + '.';
      const fact = show.map(x => `${x.name}(${x.sido} ${x.sgg}) ${x.band}의 예상 최저 당첨 가점은 ${J(rng(x), '이에요', '예요')}`).join('. ') + '.';
      const cmp = `${c.scope} 민영 공고 ${n0(c.nNotice || 0)}곳의 면적대별로 보면 가능성 높음 ${c.cnt.hi}개, 경합 ${c.cnt.mid}개, 낮음 ${c.cnt.lo}개예요.`;
      const so = hi.length ? `그래서 ${hi[0].name} ${hi[0].band}처럼 커트라인 상단(${hi[0].hi}점) 이상인 곳부터 1순위로 넣어 보세요.` : mid.length ? `그래서 ${mid[0].name} ${mid[0].band}는 커트라인 위쪽(${mid[0].hi}점)까지 ${mid[0].need}점 남은 경합이에요.` : `그래서 지금 공고는 커트라인 아래쪽까지 가장 가까운 곳도 ${top.need}점 모자라요.`;
      L.push({ k: 'cut', t, d: [fact, cmp, '', so] });
    }
    if (c.hist && c.hist.n) {
      const H = c.hist;
      L.push({ k: 'past', t: `${H.sido} ${H.span} 주택형 ${n0(H.n)}개 중 ${H.pct}%(${n0(H.hit)}개)는 최저 당첨 가점이 ${my}점 이하였어요.`,
        d: [`청약홈 공식 결과로 ${H.sido} ${H.span} 공고 주택형 ${n0(H.n)}개의 최저 당첨 가점을 모았어요.`, `최저 당첨 가점 중간값은 ${H.med}점이고, 내 점수는 그보다 ${Math.abs(my - H.med)}점 ${my >= H.med ? '높아요' : '낮아요'}.`,
          `${n0(H.hit)}개 주택형은 내 점수 이하에서 당첨자가 나왔어요.`, `그래서 ${H.sido}에서는 과거 주택형 10개 중 약 ${Math.round(H.pct / 10)}개가 내 점수로 닿는 수준이었어요.`] });
    }
    if (c.years && c.years.y > 0) {
      const Y = c.years;
      L.push({ k: 'time', t: `지금 조건이 이어지면 약 ${Y.y}년 뒤 ${Y.target}점(${Y.name} 커트라인 상단)에 닿아요.`,
        d: [`무주택기간·통장 가입기간이 1년씩 늘 때마다 점수를 다시 매겼어요(부양가족 ${c.d}점은 그대로).`, `지금 ${my}점에서 ${Y.target - my}점이 더 필요해요.`, '',
          `그래서 ${Y.y}년 안에 청약할 계획이면 ${Y.name}급 단지는 추첨제 물량도 함께 노려야 해요(목표 ${Y.target}점).`] });
    }
    return mk('cy', head, L, { names: it.map(x => x.name) });
  }

  /* ---------- 화면 자료 → 빌더 입력(화면과 tools/narrative-cat-test.js 가 같이 씀) ---------- */
  /* 전월세: o = { IX, RX, R(JDJ_RENT), PL, code, kind, name, dong, band, u, meta, dep, pub, senior, pol(policy.json), PV(JDJPolicy) } */
  function jeonseFrom(o) {
    const R = o.R, sm = R.summary(o.u, o.meta), g = (o.RX && o.RX.sgg && o.RX.sgg[o.code]) || {};
    const ri = o.PL && o.PL.regionInfo ? o.PL.regionInfo(o.IX, o.code) : { short: '', unit: '구', name: '' };
    const sdn = ((o.IX.sgg || {})[o.code] || {}).sido;
    const peers = Object.keys(o.RX.sgg || {}).filter(k => ((o.IX.sgg || {})[k] || {}).sido === sdn).map(k => ({ code: k, sup: ((o.RX.sgg[k].sup) || {}).n || 0 }));
    const gs = R.guSeries(g), gch1 = gs ? R.change(gs.s, gs.months, 12) : null, gLast = gs ? R.latest(gs.s, gs.months) : null;
    let pol = null;
    if (o.pol && o.PV) {
      const f = o.PV.forCodes(o.pol, [{ sgg: o.code, dong: o.dong }], 'jeonse');
      pol = { now: f.now.map(x => ({ p: x.p, badge: o.PV.badge(x.p)[0], rec: ((o.pol.recent || {})[o.code] || {})[x.p.id] || [] })) };
    }
    return { name: o.name, dong: o.dong, band: o.band, kind: o.kind, code: o.code, sgg: ri.name || ((o.IX.sgg || {})[o.code] || {}).name, sido: ri.short, unit: ri.unit,
      sm, g, peers, gch1, gLast, area: o.u && o.u[4], jrs: ((o.u && o.u[11]) || {}).jrs, dep: o.dep, pub: o.pub, senior: o.senior, hug: R.HUG, pol };
  }
  /* 빌라: o = { b, CUR(구 파일 {b, z, dm, meta}), IDX(villa index), PL } */
  function villaFrom(o) {
    return { b: o.b, zones: o.CUR.z || [], dm: o.CUR.dm || {}, dongB: (o.CUR.b || []).filter(x => x.d === o.b.d), allB: o.CUR.b || [], sgg: (o.CUR.meta || {}).n || '', ym: o.IDX && o.IDX.to, PL: o.PL };
  }
  /* 오피스텔: o = { u(없으면 지역만), OX(offi index), g, O(JDJ_OFFI), sggName, sidoShort } */
  function offiFrom(o) {
    const O = o.O, rate = o.OX && o.OX.rate;
    return { u: o.u || null, s: (o.OX && o.OX.sgg && o.OX.sgg[o.g]) || {}, sgg: o.sggName, sido: o.sidoShort, name: o.u ? O.nameOf(o.u) : '',
      mort: rate ? O.lastRate(rate.mort) : null, base: rate ? O.lastRate(rate.base) : null, bt: (o.OX && o.OX.bt) || {}, pass: O.passed(o.OX),
      rankText: O.rankText, scoreRank: O.scoreRank };
  }
  /* 갈아타기: o = { L(화면 last), SW(JDJ_SWITCH), x(비교·1위 단지, 선택), total, keepMonthly, why, tip, pickRank, sgg(code→{sido, name}), n3 } */
  function swFrom(o) {
    const L = o.L, S = L.S, R = S.r || {}, x = o.x, W = 10000;
    const status = R.gain <= 0 ? 'loss' : R.exempt === 'full' ? 'free' : R.exempt === 'partial' ? 'part' : 'tax';
    const ld = L.ld || { L: 0, by: 'LTV' }, c = L.c || {};
    const P2 = x ? x.P : (L.T || L.P), nd2 = P2 ? (x ? x.nd : o.SW.need(P2, c, L.dsr, L.oo)) : null;
    const cm = nd2 ? o.SW.compare({ price: L.sale, oldLoan: L.oldLoan, oldMonthly: o.keepMonthly || null, extra: L.extra }, { S, P: P2, nd: nd2, c: x ? x.c : c, etc: L.etc, extra: L.extra }) : null;
    const dsr2 = c.income ? o.SW.dsrMax(Object.assign({}, c, { income: c.income + 1000 })) - o.SW.dsrMax(c) : 0;
    const sg = x && o.sgg ? (o.sgg(x.code) || {}) : {};
    return { sale: L.sale, acq: o.acq, cgt: S.cgt, status, gain: Math.max(0, (R.gain || 0) / W), holdY: R.holdY, fee: S.fee, oldLoan: L.oldLoan, net: S.net, cash: L.cash,
      P: L.P, L: ld.L, by: ld.by, ltv: c.ltv || 0, dsrL: L.dsr, etc: L.etc, buyCost: L.P ? o.SW.need(L.P, c, L.dsr, L.oo).cost.total : 0, dsrPer1k: Math.round(dsr2),
      why: o.why, tip: o.tip, oneOff: cm ? cm.oneOff : 0, P2: P2 || 0, buyCost2: nd2 ? nd2.cost.total : 0, newMonthly: cm ? cm.newMonthly : 0, keepMonthly: cm ? cm.keepMonthly : null,
      n3: x && x.ch3 != null ? x.ch3 : null, pickName: x ? `${x.apt} ${x.band}` : '',
      pick: x && x.hasFv ? { apt: x.apt, band: x.band, dong: x.dong, sido: sg.sido || '', sgg: sg.name || '', fv: x.disp != null ? x.disp : x.fx.fv, rank: o.pickRank || '', P: x.P, mon: x.mon, ch3: x.ch3, left: x.left, total: o.total || 0 } : null };
  }
  const cat = { jeonse, villa, offi, sw, cy, jeonseFrom, villaFrom, offiFrom, swFrom };

  /* ---------- 문장 규칙 검사(tools/narrative-test.js) ---------- */
  function sentences(t) { return String(t || '').split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean); }
  function lint(N) {
    const bad = [], all = [];
    const NM = (N.names || []).slice().sort((a, b) => b.length - a.length);
    const check = (where, t, needNum) => {
      if (!t) return;
      for (const nm of NM) t = t.split(nm).join('〇');      /* 단지·동 이름 속 글자(예: 세계수영)는 금지어 검사에서 뺀다 */
      for (const w of BANNED) if (t.includes(w)) bad.push(`${where}: 금지어 '${w}' — ${t}`);
      if (needNum && !/\d/.test(t)) bad.push(`${where}: 숫자 없음 — ${t}`);
      for (const s of sentences(t)) all.push([where, s]);
    };
    check('head', N.head, true); check('gap', N.gap, true);
    N.lines.forEach((x, i) => {
      check(`t${i}`, x.t, true);
      x.d.forEach((p, j) => { if (!p) return; check(`d${i}.${j}`, p, true); });
      const blk = x.d.filter(Boolean).join(' ');
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
      h += `<div class="nar-pro"><b>보유 기간별 순위</b><table><thead><tr><th>기간</th><th>${E(c.sido)} 안 순위</th><th>과거 성적</th></tr></thead><tbody>`
        + x.hz.map(([hh, s, m]) => `<tr><td>${hh}년</td><td class="num">${E(topPct(s))}</td><td>${m && m.oos_all ? `${m.oos_all.length}번 중 ${m.oos_hit}번 맞음` : '-'}</td></tr>`).join('') + '</tbody></table></div>';
    }
    if (x.chart) h += spark(c, 340, 120);
    return h;
  }
  /* 검증 카드 끝 문장: 어느 지역 단지로 시험했는지 — 기간마다 다르면 기간별로 */
  const DO_NAMES = '강원·충북·충남·전북·경북·경남·제주';
  function whereOne(t, sd) {
    if (!t || t.where === '전국') return t && t.fb === 'all' && sd ? `${sd} 단지만으로는 써 볼 단지가 적어 전국 단지로` : '전국 단지로';
    if (t.fb === 'do') return `${sd ? sd + '처럼 ' : ''}도 지역(${DO_NAMES}) 단지를 묶어`;
    return `${t.where} 단지로`;
  }
  function whereNote(T, sd, pre, post) {
    T = (T || []).filter(Boolean); if (!T.length) return '';
    const ws = T.map(t => whereOne(t, sd)), u = [...new Set(ws)];
    const s = u.length === 1 ? `${u[0]} 써 본 결과예요` : u.map(w => `${T.filter((t, i) => ws[i] === w).map(t => t.h != null ? t.h + '년' : '').filter(Boolean).join('·')}은 ${w}`).join(', ') + ' 써 본 결과예요';
    return pre != null ? `${pre}${s.replace(/결과예요$/, '결과')}${post}` : s + '.';
  }
  /* 오를 이유·조심할 점·지켜볼 것 칸. 무료: 제목 + 한 줄. 프리미엄(o.premium): 항목마다 사실·과거 사례·그래서 + 시기별 표 */
  function w3html(W, o) {
    o = o || {};
    if (!W || !(W.up.length || W.dn.length || W.watch.length)) return '';
    const pro = !!o.premium, id = (o.id || 'nar') + '-w3';
    const LB = ['이 단지 숫자', '과거에 이런 경우', '의미'];
    const li = (x, cls) => `<li class="w3-li"><b class="w3-t">${E(x.t)}</b><span class="w3-o">${E(x.o)}</span>`
      + (pro ? `<div class="w3-d">${x.d.map((p, j) => p ? `<p class="nar-p"><b>${LB[j]}</b>${E(p)}</p>` : '').join('')}`
        + (x.ev && x.ev.per && x.ev.per.length ? proHtml({ ev: x.ev, evBase: x.evBase }, {}) : '')
        + (x.devHtml ? `<details class="w3-dv"><summary>주변 개발사업 자세히(공식 원문 확인)</summary><div class="nar-dev dv-sec">${x.devHtml}</div></details>` : '') + '</div>' : '') + '</li>';
    const col = (arr, cls, name) => arr.length ? `<div class="w3-col ${cls}"><h4 class="w3-k">${name} <span>${arr.length}</span></h4><ol class="w3-ol">${arr.map(x => li(x, cls)).join('')}</ol></div>` : '';
    const AU = root.JDJ_AUTH, alert = W.key && o.alert !== false && AU && AU.on && AU.on();
    const miss = [W.up.length ? '' : '오를 이유', W.dn.length ? '' : '조심할 점'].filter(Boolean);
    return `<div class="w3${pro ? ' w3x' : ''}" id="${E(id)}">`
      + `<h3 class="w3-h">${[W.up.length ? `오를 이유 ${W.up.length}` : '', W.dn.length ? `조심할 점 ${W.dn.length}` : '', W.watch.length ? '지켜볼 것' : ''].filter(Boolean).join(' · ')}</h3>`
      + `<p class="w3-lead">공공 통계를 과거 시점에 그대로 대입해 2년 뒤 실제로 어땠는지 확인된 것만 이유로 적었어요.</p>`
      + `<div class="w3-grid">${col(W.up, 'w3-up', '오를 이유')}${col(W.dn, 'w3-dn', '조심할 점')}`
      + (W.watch.length || alert ? `<div class="w3-col w3-wt"><h4 class="w3-k">지켜볼 것</h4>${W.watch.length ? `<ol class="w3-ol">${W.watch.map(x => li(x, 'w3-wt')).join('')}</ol>` : ''}`
        + (alert ? `<button type="button" class="w3-alert" data-w3-alert="${E(W.key)}" data-w3-name="${E(W.apt)}"${W.place ? ` data-w3-place="${E(JSON.stringify(W.place))}"` : ''}>이 단지 알림 받기</button><span class="w3-msg" role="status"></span>` : '') + '</div>' : '')
      + `</div>`
      + (miss.length ? `<p class="w3-miss">${E(miss.join('·'))}: 과거 사례에서 같은 방향이 확인된 항목이 없어 적지 않았어요.</p>` : '')
      + (pro ? '' : `<p class="w3-pro">항목별 숫자와 과거 시기별 결과는 프리미엄 리포트에서 펼쳐 볼 수 있어요.</p>`)
      + `</div>`;
  }
  function html(N, o) {
    o = o || {};
    if (!N || !N.head) return '';
    const id = o.id || 'nar';
    const T = N.trust || [];
    /* 과거 성적 카드(대표 확정 11/20): 첫 줄 = 결론에 쓴 기간을 '과거에 그대로 써 봤더니 N번 중 M번 맞았어요(예: 언제~언제 자료만으로 → 결과)',
       다음 줄 = 다른 기간 한 줄씩(결론에서 뺀 기간은 '참고로만'), [자세히 보기] = 기간별 회차 결과표만. 횟수·시점은 자료 그대로 */
    const PLx = root.JDJ_PLAIN;
    const unit = N.tunit || '단지', base = N.tbase || '같은 구 평균';
    const mOf = t => ({ oos_all: t.per.map(p => ({ t0: p[0], top20: p[1] })).concat(Array(Math.max(0, t.n - t.per.length)).fill({})), oos_hit: t.hit, oos_avg: t.avg, data_from: t.from });
    const HH = N.headH || [];
    const ordT = T.slice().sort((a, b) => (b.ok - a.ok) || ((HH.includes(b.h) ? 1 : 0) - (HH.includes(a.h) ? 1 : 0)) || (HH.indexOf(a.h) - HH.indexOf(b.h)) || (a.h - b.h));
    const lead = ordT.find(t => t.ok && HH.includes(t.h)) || ordT.find(t => t.ok);
    let trust = '';
    if (T.length && PLx && PLx.trackHead) {
      const tl = t => t.ok ? `${t.h}년 전망: 과거에 그대로 써 봤더니 ${t.n}번 중 ${t.hit}번 맞았어요.` : PLx.trackRef(mOf(t), t.h, { base });
      const lines = (lead ? `<p class="nar-t1">${E((T.length > 1 ? `${lead.h}년 전망: ` : '') + PLx.trackHead(mOf(lead), lead.h, { unit, base }))}</p>` : '')
        + (() => { const o = ordT.filter(t => t !== lead && t.ok);
          return !o.length ? '' : o.length === 1 && !lead ? `<p class="nar-t2">${E(tl(o[0]))}</p>`
            : `<p class="nar-t2">${E(`${lead ? '다른 기간도 ' : ''}과거에 그대로 써 봤더니 ` + o.map(t => `${t.h}년 전망 ${t.n}번 중 ${t.hit}번`).join(', ') + ' 맞았어요.')}</p>`; })()
        + ordT.filter(t => t !== lead && !t.ok).map(t => `<p class="nar-t2 ref">${E(tl(t))}</p>`).join('');
      const rows = ordT.filter(t => PLx.trackRuns(mOf(t), t.h).length).map(t => `<div class="nar-tone${t.ok ? '' : ' ref'}"><b class="nar-th">${t.h}년 전망</b><ul class="nar-trows">`
        + PLx.trackRuns(mOf(t), t.h).map(r => { const x = PLx.trackRow(r), i = x.lastIndexOf(': '); return `<li><span>${E(x.slice(0, i))}</span><b class="${r.hit ? 'hit' : 'miss'}">${E(x.slice(i + 2))}</b></li>`; }).join('')
        + '</ul></div>').join('');
      trust = `<div class="nar-trust">${lines}<button type="button" class="nar-tbtn" data-nar-trust aria-expanded="false" aria-controls="${id}-trust">자세히 보기</button>`
        + `<div class="nar-trust-body" id="${id}-trust" hidden>${rows}<p class="nar-tnote">${N.tscope ? E(N.tscope) : E(whereNote(T, N.sidoShort))}</p></div></div>`;
    }
    return `<section class="nar" id="${E(id)}" data-nar="1" data-nogloss${N.cat ? ` data-cat="${E(N.cat)}"` : ''}>`
      + `<p class="nar-head">${E(N.head)}</p>` + trust
      + '<p class="nar-str" data-jdj-str="card" hidden style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#6B5A2E"></p>' /* 강점 문구(assets/strength.js 있는 화면만 채움) */
      + (N.why3 && o.why3 !== false ? w3html(N.why3, o) : '')
      + (N.gap ? `<p class="nar-gap">${E(N.gap)}</p>` : '')
      + `<div class="nar-tools"><span>핵심 요약 ${N.lines.length}줄</span><button type="button" class="nar-all" data-nar-all aria-expanded="false">전체 펼치기</button></div>`
      + `<ol class="nar-list">` + N.lines.map((x, i) => {
        const open = i === 0 && !o.closed, pid = `${id}-d${i}`, ps = x.d.map((p, j) => p ? `<p class="nar-p"><b>${(N.step || STEP)[j]}</b>${E(p)}</p>` : '').join('');
        return `<li class="nar-li" data-k="${E(x.k)}"><div class="nar-sum">${E(x.t)}</div>`
          + (x.k === 'fit' && N.dim && N.dim.length ? `<div class="nar-dim">참고로만 보여 드리는 기간: ${E(N.dim.join(', '))}</div>` : '')
          + `<button type="button" class="nar-more" data-nar-k="${E(x.k)}" aria-expanded="${open}" aria-controls="${pid}">${open ? '접기' : '자세히 보기'}</button>`
          + `<div class="nar-det" id="${pid}"${open ? '' : ' hidden'}>${ps}${x.devHtml ? `<div class="nar-dev dv-sec"><b class="nar-devh">주변 개발사업(공식 원문 확인)</b>${x.devHtml}</div>` : ''}${o.premium ? proHtml(x, o.c || {}) : ''}</div></li>`;
      }).join('') + `</ol>`
      + (N.dim && N.dim.length && !N.lines.some(x => x.k === 'fit') ? `<div class="nar-dim">참고로만 보여 드리는 기간: ${E(N.dim.join(', '))}</div>` : '')
      + `<p class="nar-foot"><a class="nar-terms" href="${JB.SITE}track/" data-track="nar_to_track">성적표</a> · <a class="nar-terms" href="${JB.SITE}guide/terms/">용어 모아 보기</a> · 밑줄 점선 단어를 누르면 바로 아래에 설명이 나와요.</p></section>`;
  }
  const CSS = `.nar{margin:12px 0 6px;padding:14px 14px 10px;border:1px solid #E6DFC8;border-radius:14px;background:#FFFDF7}
.nar-head{font-size:17px;line-height:1.55;font-weight:800;color:#1F1F1F;margin:0 0 8px;word-break:keep-all}
.nar-gap{font-size:13.5px;line-height:1.6;color:#5A4A1A;background:#F7EFD6;border-radius:10px;padding:8px 10px;margin:0 0 10px;word-break:keep-all}
.nar-tools{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#6B6B6B;margin:4px 0 6px}
.nar-all{border:1px solid #D9CFAE;background:#fff;border-radius:999px;padding:5px 12px;font-size:12.5px;color:#5A4A1A;cursor:pointer;min-height:44px}
.nar-list{list-style:none;margin:0;padding:0;counter-reset:n}
.nar-li{border-top:1px solid #EFE9D6;padding:10px 0 8px;counter-increment:n}
.nar-sum{font-size:15px;line-height:1.6;font-weight:600;color:#222;word-break:keep-all;padding-left:26px;position:relative}
.nar-sum:before{content:counter(n);position:absolute;left:0;top:2px;width:19px;height:19px;border-radius:50%;background:#B8942A;color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center}
.nar-more{margin:6px 0 0 26px;border:0;background:none;color:#7D6210;font-weight:700;font-size:13.5px;padding:6px 0;cursor:pointer;min-height:44px}
.nar-det{margin:4px 0 2px 26px;padding:10px 12px;background:#F8F4E8;border-radius:10px}
.nar-p{margin:0 0 8px;font-size:14px;line-height:1.7;color:#333;word-break:keep-all}.nar-p:last-child{margin-bottom:0}
.nar-p b{display:block;font-size:11.5px;color:#7D6210;letter-spacing:.02em;margin-bottom:1px}
.nar-pro{margin-top:10px;font-size:13px}.nar-pro b{display:block;margin-bottom:4px;color:#5A4A1A}
.nar-pro table{width:100%;border-collapse:collapse;font-size:12.5px}.nar-pro th,.nar-pro td{border-bottom:1px solid #E6DFC8;padding:5px 4px;text-align:left}.nar-pro .num{text-align:right;font-variant-numeric:tabular-nums}
.nar-pro small{color:#6B6B6B}
.nar-dev{margin-top:10px;padding-top:8px;border-top:1px dashed #D9CFAE;font-size:14px;line-height:1.65}.nar-devh{display:block;font-size:12.5px;color:#7D6210;margin-bottom:2px}.nar-dev .dv-one{padding:6px 0}.nar-dev .dv-p{margin:4px 0;font-size:14px;line-height:1.7}.nar-dev .dv-note{font-size:12.5px;color:#6B6B6B}
.nar-chart{margin:10px 0 0}.nar-chart svg{width:100%;height:auto;display:block}.nar-chart figcaption{font-size:12px;color:#555;margin-top:2px}
.nar-chart i{display:inline-block;width:12px;height:3px;vertical-align:middle;margin:0 4px 0 6px}.nar-chart i.me{background:#B8942A}.nar-chart i.gu{background:#B9B2A0}
.nar-trust{margin:0 0 10px;padding:10px 12px;background:#F8F4E8;border-radius:10px;font-size:14px;line-height:1.6;color:#333;word-break:keep-all}
.nar-t1{margin:0 0 4px;font-weight:600;color:#3A3220}.nar-t2{margin:2px 0 0;font-size:13px;color:#555}.nar-t2.ref{color:#8C8C8C}
.nar-tbtn{border:0;background:none;color:#7D6210;font-weight:700;font-size:13.5px;padding:6px 0 0;cursor:pointer;min-height:32px}
.nar-tbtn:after{content:' ▾'}.nar-tbtn[aria-expanded="true"]:after{content:' ▴'}
.nar-trust-body{margin-top:6px;padding-top:8px;border-top:1px solid #E6DFC8}
.nar-tone{margin-bottom:8px}.nar-th{display:block;font-size:13px;color:#5A4A1A}.nar-tone.ref .nar-th,.nar-tone.ref li{color:#9A9A9A}
.nar-trows{list-style:none;margin:2px 0 0;padding:0;font-size:12.5px;font-variant-numeric:tabular-nums}
.nar-trows li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 8px;padding:3px 0;border-top:1px solid #E6DFC8}
.nar-trows b{font-weight:700;white-space:nowrap}.nar-trows b.hit{color:#1F5FA8}.nar-trows b.miss{color:#B4473A}.nar-tone.ref .nar-trows b{color:#9A9A9A}
.nar-tnote{margin:4px 0 0;font-size:12.5px;color:#6B6B6B}
.nar-dim{margin:4px 0 0 26px;font-size:13px;color:#9A9A9A;line-height:1.55;word-break:keep-all}
.nar-foot{margin:10px 0 2px;font-size:12.5px;color:#6B6B6B}.nar-terms{color:#7D6210;font-weight:700}
.w3{margin:0 0 12px;padding:12px 12px 8px;background:#fff;border:1px solid #E6DFC8;border-radius:12px}
.w3-h{margin:0 0 2px;font-size:16px;font-weight:800;color:#1F1F1F;letter-spacing:-.01em}
.w3-lead{margin:0 0 8px;font-size:12.5px;line-height:1.5;color:#6B6B6B;word-break:keep-all}
.w3-grid{display:grid;grid-template-columns:1fr;gap:10px}
.w3-col{border-radius:10px;padding:8px 10px 6px}.w3-col.w3-up{background:#EEF4FC}.w3-col.w3-dn{background:#FBEFEC}.w3-col.w3-wt{background:#F8F4E8}
.w3-k{margin:0 0 4px;font-size:13.5px;font-weight:800}.w3-k span{display:inline-block;min-width:18px;padding:0 5px;border-radius:9px;color:#fff;font-size:11.5px;text-align:center;margin-left:2px}
.w3-up .w3-k{color:#1F5FA8}.w3-up .w3-k span{background:#1F5FA8}.w3-dn .w3-k{color:#B4473A}.w3-dn .w3-k span{background:#B4473A}.w3-wt .w3-k{color:#7D6210}
.w3-d td,.w3-d th{color:#333}.w3-dv>summary{cursor:pointer;font-size:13px;color:#7D6210;font-weight:700;margin-top:6px}
.w3-ol{list-style:none;margin:0;padding:0}
.w3-li{padding:6px 0;border-top:1px solid rgba(0,0,0,.06)}.w3-li:first-child{border-top:0}
.w3-t{display:block;font-size:14.5px;line-height:1.5;color:#1F1F1F;word-break:keep-all}
.w3-o{display:block;font-size:13.5px;line-height:1.6;color:#444;word-break:keep-all;margin-top:1px}
.w3-d{margin-top:6px;padding:8px 10px;background:rgba(255,255,255,.75);border-radius:8px}
.w3-alert{margin:6px 0 4px;width:100%;min-height:40px;border:1px solid #B8942A;background:#fff;color:#5A4A1A;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer}
.w3-msg{display:block;font-size:12.5px;color:#4E5968}.w3-msg:empty{display:none}
.w3-miss,.w3-pro{margin:8px 0 0;font-size:12.5px;line-height:1.5;color:#6B6B6B;word-break:keep-all}
@media(min-width:900px){.nar-head{font-size:18.5px}.nar-sum{font-size:15.5px}.w3-grid{grid-template-columns:repeat(auto-fit,minmax(0,1fr))}.w3x .w3-grid{grid-template-columns:1fr}}`;
  function css(doc) {
    doc = doc || root.document; if (!doc || doc.getElementById('nar-css')) return;
    const s = doc.createElement('style'); s.id = 'nar-css'; s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s);
  }
  /* [이 단지 알림 받기]: 이 단지·평형을 관심 목록에 넣음(assets/watch.js) → 새 거래·신고가는 알림 센터(my/alerts/)와 메일로. 관심 목록 부품이 없으면 알림 센터로 */
  function w3alert(b) {
    const msg = b.nextElementSibling, W = root.JDJ_WATCH, base = (root.JDJ_BASE && root.JDJ_BASE.SITE) || '/';
    try { root.jdjStat && root.jdjStat('nar_open', { line: 'w3alert' }); } catch (_) { }
    let p = null; try { p = JSON.parse(b.getAttribute('data-w3-place') || 'null'); } catch (_) { }
    if (!W || !p) { root.location.href = base + 'my/alerts/'; return; }
    const done = () => { b.textContent = '✓ 관심 목록에 있어요'; b.disabled = true;
      if (msg) msg.innerHTML = `이 단지에 새 거래·신고가가 나오면 <a href="${base}my/alerts/">알림 센터</a>에서 알려 드려요. 메일로도 받을 수 있어요. 카카오톡 알림은 준비하고 있어요.`; };
    if (W.has(p)) { done(); return; }
    b.disabled = true;
    W.toggle(p).then(r => { if (r && r.added) done(); else { b.disabled = false; } }, () => { b.disabled = false; });
  }
  /* 펼침 동작 + 줄 종류별 집계(stat.js, 개인정보 없음) + 개발사업 칸 채우기 */
  function bind(el, o) {
    o = o || {}; if (!el || el.__nar) return; el.__nar = true; css(el.ownerDocument);
    const stat = k => { try { root.jdjStat && root.jdjStat('nar_open', { line: k }); } catch (_) { } };
    const set = (b, open) => { const d = el.ownerDocument.getElementById(b.getAttribute('aria-controls')); if (!d) return; d.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '접기' : '자세히 보기'; };
    el.addEventListener('click', e => {
      const t = e.target.closest('[data-nar-trust]');
      if (t && el.contains(t)) { const d = el.ownerDocument.getElementById(t.getAttribute('aria-controls')), open = t.getAttribute('aria-expanded') !== 'true';
        if (d) d.hidden = !open; t.setAttribute('aria-expanded', String(open)); t.textContent = open ? '접기' : '자세히 보기'; if (open) stat('trust'); return; }
      const w = e.target.closest('[data-w3-alert]');
      if (w && el.contains(w)) { w3alert(w); return; }
      const b = e.target.closest('.nar-more');
      if (b && el.contains(b)) { const open = b.getAttribute('aria-expanded') !== 'true'; set(b, open); if (open) stat(b.dataset.narK); return; }
      const a = e.target.closest('[data-nar-all]');
      if (a) { const sec = a.closest('.nar'), open = a.getAttribute('aria-expanded') !== 'true';
        sec.querySelectorAll('.nar-more').forEach(x => set(x, open)); a.setAttribute('aria-expanded', String(open)); a.textContent = open ? '전체 접기' : '전체 펼치기'; if (open) stat('all'); }
    });
    /* 어려운 용어: 점선 + 누르면 바로 아래 설명 상자(plain-words.js tipDom, 한 번에 하나) */
    const PLx = root.JDJ_PLAIN;
    if (PLx && PLx.tipDom) PLx.tipDom(el, { blockSel: '.nar-head,.nar-gap,.nar-sum,.nar-dim,.nar-p,.nar-t1,.nar-tnote,.w3-t,.w3-o', onOpen: () => stat('term') });
  }
  const NAR = { build, html, bind, lint, css, sentences, BANNED, KINDS, CKINDS, cat, guWhy, guPast, why3, lint3, w3html, xCases, xCond, XKIND_OF };
  root.JDJ_NAR = NAR;
  if (typeof module !== 'undefined' && module.exports) module.exports = NAR;
})(typeof window !== 'undefined' ? window : globalThis);
