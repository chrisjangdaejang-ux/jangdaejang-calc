/* 장대장 프리미엄 리포트 화면 (premium/view/) — 결제 확인 후에만 호출
   - 무료 리포트(buy/report/)와 같은 공개 실거래 자료(jangdaejang-data data/)와 같은 표시 문구 규칙으로 단지 상세를 보여 줍니다.
   - 미래가치 점수는 자료 파일에 이미 계산되어 들어 있는 값을 그대로 씁니다(점수 계산식·가중치는 이 파일에 없습니다).
   - 대출·필요 현금은 공개된 대출 규제(LTV·DSR·가격구간 한도)와 취득세·중개보수 법정 기준으로 계산합니다(무료 리포트와 같은 기준). */
(function () {
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const P = window.JDJ_PAY, PL = window.JDJ_PLAIN, esc = P.esc, DATA = P.DATA, PY = 3.3058;
  /* ---------- 대출 규제 기준 (2026.7.1 규제지역: 서울 전역 + 경기 15곳) — 무료 리포트와 동일 ---------- */
  const REG_GG = ['41290','41210','41135','41131','41133','41117','41111','41115','41173','41465','41430','41450','41597','41463','41310'];
  const isReg = c => c.startsWith('11') || REG_GG.includes(c);
  const isCap = c => c.startsWith('11') || c.startsWith('41') || c.startsWith('28');
  /* 대출 계산은 대출 한도 계산기(loan/)·내 집 마련(buy/)·갈아타기(switch/)와 같은 assets/loan-core.js(규칙은 assets/loan-rules.js) */
  const LOAN = () => window.JDJ_LOAN;   // 화면마다 불러오는 순서가 달라 쓸 때 읽음
  const TYPE_RATIO = { var:1, mix:.8, cyc:.4 };   // 금리 유형 이름 확인용(실제 비율은 loan-rules.js)
  const TYPE_NAME = { var:'변동금리', mix:'혼합형', cyc:'주기형' };
  const OWN_NAME = { none:'무주택', first:'생애최초', one:'1주택(처분조건)', multi:'다주택' };
  const BY_TXT = { LTV:'LTV(집값 대비 비율)', CAP:'가격구간별 대출 한도', DSR:'소득(DSR 40%)', DTI:'소득(DTI)', BAN:'주택구입 주담대 불가' };
  const RZ_LV = {1:'신속통합기획 대상지 선정',2:'신속통합기획 완료',3:'정비구역 지정',4:'추진위원회 승인',5:'조합설립인가',6:'건축심의',7:'사업시행인가',8:'관리처분인가',9:'이주',10:'착공'};

  const S = load();
  /* 새 분석 설명(assets/narrative.js) — 대표 승인(11/20)으로 기본 적용, ?nar=0 이면 예전 설명. 프리미엄은 펼친 곳에 사례 표·기간별 상세·차트를 더한다 */
  const NARON = !/[?&]nar=0(&|$)/.test(location.search) && !!window.JDJ_NAR;
  function load() {
    let s = {}; try { s = JSON.parse(localStorage.getItem('jdj_prem_cond') || '{}') || {}; } catch (e) {}
    return { income: +s.income || 7000, cash: +s.cash || 40000, own: OWN_NAME[s.own] ? s.own : 'none', rtype: TYPE_RATIO[s.rtype] != null ? s.rtype : 'cyc',
      rate: +s.rate || 4.0, term: +s.term || 30, etc: s.etc != null ? +s.etc : 1000, debt: 0 };
  }
  function save() { if (S._tmp) return; try { localStorage.setItem('jdj_prem_cond', JSON.stringify(S)); } catch (e) {} }
  const groupOf = c => isReg(c) ? 'reg' : (isCap(c) ? 'capfree' : 'local');
  function ctxFor(g) { return LOAN().ctx({ g, own: S.own, rtype: S.rtype, band: '5-9', income: S.income, debt: S.debt, rate: S.rate, term: S.term }); }
  const monthly = (L, rate, term) => { const i = rate / 1200, n = term * 12; if (L <= 0) return 0; return i === 0 ? L / n : L * i / (1 - Math.pow(1 + i, -n)); };
  /* 취득세는 세금 계산 화면·무료 리포트와 같은 엔진(tax/tax-engine.js buyerAcqTax, 원 단위 → 만원) */
  function costDetail(p, c, large) {
    const t = window.JDJ_TAX.buyerAcqTax(p * 10000, { own: S.own, regulated: c.regulated, large: !!large });
    const rate = Math.round(t.rate * 10000) / 100, acq = t.acq / 10000, edu = t.edu / 10000, farm = t.farm / 10000, relief = t.relief / 10000;
    let br, cap = Infinity; if (p < 5000) { br = .6; cap = 25; } else if (p < 20000) { br = .5; cap = 80; } else if (p < 90000) br = .4; else if (p < 120000) br = .5; else if (p < 150000) br = .6; else br = .7;
    const broker = Math.min(p * br / 100, cap) * 1.1;
    return { rate, tax: acq - relief + edu + farm, broker, total: acq - relief + edu + farm + broker };
  }
  function loanAt(p, c) { return LOAN().loanAt(p, c); }

  /* ---------- 표시 도우미 ---------- */
  const fmt = man => { man = Math.round(man); if (man <= 0) return '0원'; const e = Math.floor(man / 10000), r = man % 10000; return !e ? r.toLocaleString() + '만원' : e + '억' + (r ? ' ' + r.toLocaleString() + '만' : '') + '원'; };
  const fmtS = man => man >= 10000 ? (Math.round(man / 1000) / 10).toString().replace(/\.0$/, '') + '억' : Math.round(man).toLocaleString() + '만';
  const lastNZ = a => { for (let i = a.length - 1; i >= Math.max(0, a.length - 3); i--) if (a[i] > 0) return a[i]; return 0; };
  const lastAny = a => { for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return a[i]; return 0; };
  const change6 = a => { const n = a.length, x = a[n - 1] || a[n - 2], y = a[n - 7] || a[n - 8]; return (x > 0 && y > 0) ? (x - y) / y : null; };
  const pct = v => Math.round(Math.abs(v) * 100);
  const ym = v => v ? `${String(v).slice(0, 4)}.${String(v).slice(4)}` : '';

  function chart(series, months) {
    const v = series.map((y, i) => [i, y]).filter(p => p[1] > 0); if (v.length < 2) return '<p class="links">최근 거래가 적어 시세 흐름 그래프를 그리지 않았습니다.</p>';
    const W = 640, H = 170, L = 46, R = 10, T = 12, B = 26;
    const ys = v.map(p => p[1]), y0 = Math.min(...ys) * 0.97, y1 = Math.max(...ys) * 1.03, n = series.length - 1;
    const sx = x => L + x / n * (W - L - R), sy = y => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
    const d = v.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
    const ticks = [y0, (y0 + y1) / 2, y1].map(y => `<text x="${L - 6}" y="${sy(y) + 4}" text-anchor="end">${Math.round(y).toLocaleString()}</text><line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}" stroke="#E5E8EB"/>`).join('');
    const xl = [0, Math.round(n / 2), n].map(i => `<text x="${sx(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n ? 'end' : 'middle'}">${months && months[i] ? ym(months[i]) : ''}</text>`).join('');
    const lp = v[v.length - 1];
    return `<svg class="pr-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 3년 평당가 흐름(만원)"><g font-size="11" fill="#6B7684">${ticks}${xl}</g>
      <path d="${d}" fill="none" stroke="#2560E8" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${sx(lp[0])}" cy="${sy(lp[1])}" r="4" fill="#2560E8"/></svg>
      <p class="links" style="margin-top:2px">평당가(만원/3.3㎡), 국토교통부 실거래가 월별 중간값 · 거래 없는 달은 건너뜀</p>`;
  }

  /* 미래가치 점수가 움직인 이유 — 무료 리포트 상세와 같은 '쉬운 말' 규칙(assets/plain-words.js) */
  /* 순위 비교 기준: 같은 시·도 아파트(옛 자료는 같은 구) — 곳 수는 index.json 값만 */
  function fvBase(x, ctx) {
    const f = x.f || {}, g = ctx.IX.sgg[x.code] || {};
    return (f.gs != null || f.fvg != null) ? PL.rankBase(ctx.IX, x.code, 'fv') : { name: `${g.name || ''} 아파트` };
  }
  const fvRank = (x, ctx, v) => PL.rank(v == null ? (x.f || {}).fv : v, fvBase(x, ctx));
  const fvgRank = (x, ctx) => PL.rank(x.f.fvg, { name: '아파트', n: PL.rankBase(ctx.IX, x.code, 'fvg').n });
  function reasonsOf(x, ctx) {
    const f = x.f || {}, r = [], IX = ctx.IX, G = ctx.G, sgg = (IX.sgg[x.code] || {}).name || '', ri = PL.regionInfo(IX, x.code);
    /* 근거 등급(data/evidence.json): 프리미엄은 시기별 값까지 */
    const EV = kind => PL.evid(ctx.EV, x.sd, f.eb, kind, ri.short, G);
    if (f.fv != null) r.push(['f', `이 단지는 미래가치 점수가 ${fvRank(x, ctx)}예요` + (f.fvg != null ? ` · ${sgg} 안에서는 ${fvgRank(x, ctx)}예요` : '') + '.']);
    /* 2년 점수를 올린·내린 요인: 이 단지 실제 값·비교 기준·과거 같은 조건 통계(시기별) — 아래 표(whyTable)와 함께 */
    const W = PL.whyItems(f, { h: '2', apt: x.apt, dong: x.dong, sgg, sido: ri.short, sid: x.sd, ev: ctx.EV, G, rp: PL.regionPlace(IX, x.code, f.gs),
      regionUsed: !!(ctx.MODEL && ctx.MODEL.region && ctx.MODEL.region.used), sp: ctx.SP, year: new Date().getFullYear(), IX, code: x.code });
    x._why = W;
    for (const it of W.items) r.push(['f', PL.whyLine(it), it.ev]);
    { const hz = {}; for (const h of [1, 3, 5, 7]) hz[h] = PL.VOK(ctx.MH && ctx.MH[h]);
      const hg = PL.hzGapLine(f, { apt: x.apt, dong: x.dong, sgg, sido: ri.short, G, sp: ctx.SP, year: new Date().getFullYear(), rp: PL.regionPlace(IX, x.code, f.gs),
        regionUsed: !!(ctx.MODEL && ctx.MODEL.region && ctx.MODEL.region.used), IX, code: x.code, hzOk: hz });
      if (hg) r.push(['f', '보유 기간별 차이: ' + hg]); }
    if (f.rz) r.push(['f', PL.rzText(f.rz, G, ym), EV('stg')]);
    if (f.eg) { const g = f.eg.v - f.eg.b - f.eg.p; r.push(['f', `재건축이 끝나면${f.eg.done ? `(예상 준공 ${f.eg.done}년 전후)` : ''} 기대 차익은 약 ${g >= 0 ? '+' : '−'}${PL.eokR(Math.abs(g))}이에요 — 지역 새 아파트 시세로 본 같은 평형 가치 ${PL.eokR(f.eg.v)}, 예상 분담금 ${f.eg.b >= 0 ? PL.eokR(f.eg.b) : '환급 ' + PL.eokR(-f.eg.b)}, 지금 시세 ${PL.eokR(f.eg.p)} (간이 추정)`]); }
    if (f.landavg || f.vl) r.push(['f', '재건축 사업성(단지): ' + [f.landavg ? `세대당 평균 대지지분 ${f.landavg}평` : '', f.vl ? `용적률 ${Math.round(f.vl)}%` : ''].filter(Boolean).join(' · ') + (f.land ? ` · 이 평형 대지지분 약 ${f.land}평` : '')]);
    const rg = PL.regionText(f, IX, x.code, G, ctx.EV);
    if (rg.fact || rg.why.length || rg.ref.length) r.push(['f', PL.regionLine(rg, `${sgg} 지역 흐름:`)]);
    if (f.sl && ctx.SP && ctx.SP.zones) for (const ln of PL.supplyLines(f, ctx.SP, G)) r.push(ln);
    { const rn = PL.renewalLine(f, ctx.SP, G, ctx.EV); if (rn) { r.push(['f', rn.text]); if (rn.ref) r.push(['', rn.ref]); } }
    if (f.sp && !(f.sl && ctx.SP && ctx.SP.zones)) for (const [nm, units, , stg, mv] of f.sp.slice(0, 2)) {
      const SG = ['', '발표 단계', '분양·착공 단계', '입주 진행 중'];
      r.push([stg >= 2 ? 'c' : 'f', `주변 공급: 가까운 공공택지 ${nm} · 약 ${(units / 10000).toFixed(units >= 10000 ? 1 : 2).replace(/\.?0+$/, '')}만 가구 — ${SG[stg] || '계획'}${mv ? ` · 첫 입주 목표 ${String(mv).slice(0, 4)}년` : ''}`]);
    }
    if (f.dd != null && Math.abs(f.dd) >= 0.03 && !W.keys.has('dd')) r.push([f.dd > 0 ? 'f' : 'c', PL.ddText(f.dd, G) + (f.dd > 0 ? ' — 집값이 흔들릴 때 잘 버틴 편이에요' : ' — 시장에 따라 오르내림이 큰 편이에요'), EV('dd')]);
    if (f.rc != null && Math.abs(f.rc) >= 0.03 && Math.abs(f.rc) < 0.5) r.push(['f', PL.rcText(f.rc, G), EV('rc')]);
    if (f.lg != null && !W.keys.has('lg')) r.push(['f', (f.ln === x.apt || f.lg >= 0.995) ? `${x.dong} 대장 단지예요 — 같은 평형끼리 비교해 동에서 가장 비싸게 거래돼요` : `${x.dong} 대장 단지(${f.ln})보다 같은 평형 기준 시세가 ${pct(1 - f.lg)}% 낮아요`, EV('lg')]);
    if (f.rl && !['rlp', 'rls', 'rlo', 'rld'].some(k => W.keys.has(k))) { const R = f.rl, SK = { plan: '계획 확정', start: '착공', start_real: '본공사 착수', delay: '개통 지연', open: '개통' };
      r.push(['f', `신규 노선: ${R.line} ${R.pl ? `${/역$/.test(R.st || '') ? R.st : R.st + '역'}(개통 예정)` : R.st}${R.m != null ? (R.pl ? ` · 예정 위치 기준 약 ${R.m.toLocaleString()}m` : `까지 직선 ${R.m.toLocaleString()}m`) : ' 인근'} — ` + (R.x ? '노선 계획 공식 취소·제외' : R.opened ? `${ym(R.stym)} 개통` : `${ym(R.stym)} ${SK[R.stage] || R.stage}` + (R.dl ? `, ${PL.delayText(R.dl, '개통')}` : (R.target ? `, 개통 목표 ${ym(R.target)}` : '') + (R.delays ? `(일정 지연 ${R.delays}회)` : ''))) + (R.pre != null ? ` · ${ym(R.first)} 이후 이 단지는 구 평균보다 ${Math.abs(R.pre)}% ${R.pre >= 0 ? '더' : '덜'} 올랐어요` : ''), EV('rail')]); }
    if (f.sub != null) r.push(['f', f.sub >= 30 ? '지하철역이 걸어가기엔 먼 편이에요(도보 20분 이상)' : `${f.subs ? f.subs.replace(/\s+/g, ' ') : '지하철역'}까지 도보 ${f.sub <= 5 ? '5분 이내' : f.sub + '분 이내'}` + (f.sub <= 10 ? ' — 역세권' : '')]);
    if (f.sch != null && !W.keys.has('sch')) r.push(['f', '학군: ' + PL.schText(f.sch, f.schn, G), EV('sch')]);
    if (f.jr != null) r.push([f.jr < 0.4 ? 'c' : 'f', PL.jrText(f, x.P, x.jst, ri.short, G, f.by), EV('jr')]);
    if (x.n >= 60) r.push(['', `거래 활발: 최근 실거래 ${x.n}건 — 거래가 꾸준한 단지예요`]);
    else if (x.n < 24) r.push(['c', `거래량 적음: 최근 실거래 ${x.n}건 — 거래가 적어 시세가 크게 흔들려 보일 수 있어요`]);
    if (x.ch != null && !W.keys.has('mom')) r.push([x.ch >= 0.08 ? 'c' : '', '최근 6개월: ' + PL.momText(x.ch, G), EV('mom')]);
    return r;
  }

  /* 보유 기간별: 과거에 그대로 써 본 결과(맞은 횟수)를 그대로 적고, 판정 기준에 못 미친 기간은 '참고만' */
  function horizons(x, ctx) {
    const f = x.f || {};
    return [1, 2, 3, 5, 7].map(h => {
      const mm = h === 2 ? ((ctx.MH && ctx.MH['2']) || ctx.MODEL) : (ctx.MH && ctx.MH[h]);
      const v = h === 2 ? f.fv : (f.fh && f.fh[h] != null ? f.fh[h] : null);
      const ok = PL.VOK(mm);
      return { h, v, ok, rec: PL.hzLabel(mm) };
    });
  }

  function money(x) {
    const c = ctxFor(groupOf(x.code)), l = loanAt(x.P, c), cd = costDetail(x.P, c, x.area > 85), need = x.P - l.L + cd.total + S.etc, mon = monthly(l.L, c.rate, c.term);
    return { c, l, cd, need, mon, left: S.cash - need };
  }

  function unitHtml(x, ctx, i, total) {
    const f = x.f || {}, IX = ctx.IX, g = IX.sgg[x.code] || {}, Y = new Date().getFullYear(), m = money(x);
    const rs = reasonsOf(x, ctx), hz = horizons(x, ctx), G = ctx.G;
    const li = r => `<li class="${r[0]}">${esc(r[1])}${r[2] ? PL.evHtml(r[2], true, esc) : ''}</li>`;
    const okH = hz.filter(z => z.ok && z.v != null).map(z => z.h + '년'), refH = hz.filter(z => !z.ok && z.v != null).map(z => z.h + '년');
    const mm2 = (ctx.MH && ctx.MH['2']) || ctx.MODEL;
    return `<section class="pr-unit" id="u${i}"><div class="pr-sec" data-sec="sum">
      <div class="pr-head"><div>
        <div class="pr-crk">${total > 1 ? `단지 ${i + 1} · ` : ''}${esc(g.sido || '')} ${esc(g.name || '')} ${esc(x.dong)}</div>
        <h2>${esc(x.apt)}</h2>
        <div class="pr-loc">${esc(x.band)} (전용 ${x.area}㎡)${PL.ageText(f.by, Y) ? ` · ${PL.ageText(f.by, Y, '준공')}` : ''}${f.hh ? ` · ${f.hh.toLocaleString()}세대` : ''}${isReg(x.code) ? ' · 규제지역' : ''}</div>
        ${window.JDJ_PRICE ? `<div class="noprint" style="margin-top:10px">${window.JDJ_PRICE.btn({ sd: x.sd, sgg: x.code, dong: x.dong, apt: x.apt, band: x.band, jibun: x.jb }, 'premium')}${window.JDJ_PRICE.loanHref && x.P > 0 ? ` <a class="pr-loan" href="${esc(window.JDJ_PRICE.loanHref({ src: 'premium', price: x.P, code: x.code, apt: x.apt, band: x.band, area: x.area }))}" data-track="premium_to_loan" style="display:inline-flex;align-items:center;min-height:44px;font-weight:700;color:#2560E8;text-decoration:none">이 집 대출 한도 계산하기 ›</a>` : ''}</div>` : ''}
      </div>${f.fv != null ? `<div class="ring" aria-label="미래가치 ${f.fv}점"><b>${f.fv}</b><small>미래가치</small></div>` : ''}</div>
      <div class="pr-stats">
        <div><span>추정 시세</span><b>${fmtS(x.P)}</b><small>${x.stale ? '최근 3개월 거래 없음 · 마지막 거래 기준' : '최근 3개월 실거래 중간값'}</small></div>
        <div><span>최근 6개월</span><b>${x.ch == null ? '-' : (x.ch >= 0 ? '+' : '') + (x.ch * 100).toFixed(1) + '%'}</b><small>평당가 변화</small></div>
        <div><span>실거래</span><b>${x.n}건</b><small>자료 기간 거래 수</small></div>
        <div><span>구 평균 대비</span><b>${x.rel == null ? '-' : (x.rel >= 0 ? `${Math.round(x.rel * 100)}% 낮음` : `${Math.round(-x.rel * 100)}% 높음`)}</b><small>평당가 기준</small></div>
      </div></div>
      <div class="pr-sec" data-sec="trend"><h3>최근 3년 시세 흐름</h3>${chart(x.series, IX.months)}</div>
      <div class="pr-sec" data-sec="fv"><h3>미래가치 점수와 그 이유</h3>
      ${NARON && f.fv != null ? window.JDJ_NAR.html(window.JDJ_NAR.build(f, { apt: x.apt, dong: x.dong, code: x.code, band: x.band, area: x.area, IX, EV: ctx.EV, MH: ctx.MH, SP: ctx.SP, PL, year: Y, s: x.series,
        regionUsed: !!(ctx.MODEL && ctx.MODEL.region && ctx.MODEL.region.used), jibun: x.jb, pol: ctx.POL, dev: ctx.DEVP ? { data: ctx.DEVP, u: { code: x.code, dong: x.dong, jibun: x.jb }, o: { apt: x.apt, sggName: c => (IX.sgg[c] || {}).name || '' } } : null }),
        { id: 'narP' + i, premium: true, c: { s: x.series, IX, code: x.code, apt: x.apt, sgg: g.name || '', sido: PL.regionInfo(IX, x.code).short } }) : ''}
      ${f.fv != null ? PL.easy(esc(`이 단지는 앞으로 2년 동안 다른 아파트보다 더 오를 가능성을 매긴 순위에서 ${fvRank(x, ctx)}예요.`)) : ''}
      <ul class="pr-reasons">${rs.map(li).join('') || '<li>이 단지는 아직 미래가치 점수를 낼 자료가 부족합니다.</li>'}</ul>
      ${x._why ? PL.whyTable(f, x._why, { sgg: g.name || '', sido: PL.regionInfo(IX, x.code).short }, esc) : ''}</div>
      <div class="pr-sec" data-sec="hz"><h3>보유 기간별 미래가치</h3>
      ${okH.length ? PL.easy(esc(`과거에 그대로 써 봤을 때 잘 맞은 ${okH.join('·')} 점수를 중심으로 보세요.` + (refH.length ? ` ${refH.join('·')} 점수는 맞은 횟수가 적어 참고로만 보세요.` : ''))) : ''}
      <div class="tblwrap"><table class="pr-tbl"><thead><tr><th>보유 기간</th><th>점수</th><th>과거 성적</th></tr></thead><tbody>
        ${hz.map(z => `<tr${z.ok ? '' : ' class="jp-ref"'}><td>${z.h}년</td><td><b>${z.v != null ? z.v + '점' : '-'}</b>${z.v != null ? `<br><small>${esc(fvRank(x, ctx, z.v))}</small>` : ''}</td><td>${esc(z.rec)}</td></tr>`).join('')}
      </tbody></table></div>
      <details class="jp-check"><summary>이 점수 방식을 믿을 수 있나요?</summary><p>${esc(PL.checkText(mm2, 2, G, { from: ctx.MODEL && ctx.MODEL.data_from }))}</p></details></div>
      <div class="pr-sec" data-sec="money"><h3>대출·필요 현금 <small>(${S._ro ? '아래 계산 조건 기준' : '아래 내 조건 기준'})</small></h3>
      ${PL.easy(esc(`지금 조건이면 대출 ${PL.won(m.l.L)}을 받고도 현금 ${PL.won(m.need)}이 필요해요. ` + (m.left >= 0 ? `보유 현금으로 낼 수 있고 ${PL.won(m.left)}이 남아요.` : `보유 현금보다 ${PL.won(-m.left)} 부족해요.`)))}
      <div class="pr-stats">
        <div><span>대출 가능액</span><b>${fmtS(m.l.L)}</b><small>${BY_TXT[m.l.by]} 기준</small></div>
        <div><span>취득세 등</span><b>${fmtS(m.cd.tax)}</b><small>취득세율 ${m.cd.rate}% · 지방교육세 포함</small></div>
        <div><span>중개보수</span><b>${fmtS(m.cd.broker)}</b><small>법정 상한·부가세 포함</small></div>
        <div class="${m.left >= 0 ? 'pos' : 'neg'}"><span>필요 현금</span><b>${fmtS(m.need)}</b><small>${m.left >= 0 ? `보유 현금으로 가능 · ${fmt(m.left)} 남음` : `보유 현금보다 ${fmt(-m.left)} 부족`}</small></div>
        <div><span>월 상환액</span><b>${Math.round(m.mon).toLocaleString()}만</b><small>${m.c.rate}% · ${m.c.term}년 원리금균등 · 월소득의 ${S.income ? Math.round(m.mon / (S.income / 12) * 100) : 0}%</small></div>
      </div></div>
    </section>`;
  }

  function compareHtml(items, ctx) {
    if (items.length < 2) return '';
    const Y = new Date().getFullYear(), rows = [
      ['추정 시세', x => fmtS(x.P)], ['미래가치(2년)', x => x.f && x.f.fv != null ? `${x.f.fv}점 (${fvRank(x, ctx)})` : '-'],
      ['필요 현금', x => fmtS(money(x).need)], ['월 상환', x => Math.round(money(x).mon).toLocaleString() + '만'],
      ['최근 6개월', x => x.ch == null ? '-' : (x.ch >= 0 ? '+' : '') + (x.ch * 100).toFixed(1) + '%'],
      ['준공·세대', x => ((x.f && PL.ageText(x.f.by, Y)) || '-') + (x.f && x.f.hh ? ` · ${x.f.hh.toLocaleString()}세대` : '')],
      ['지하철', x => !x.f || x.f.sub == null ? '-' : x.f.sub >= 30 ? '도보 20분 이상' : `도보 ${x.f.sub <= 5 ? '5분 이내' : x.f.sub + '분 이내'}`],
      ['하락기 방어', x => x.f && x.f.dd != null ? PL.ddText(x.f.dd, ctx.G, '').replace('최근 3년 하락기에 ', '') : '-']
    ];
    const sc = items.filter(x => x.f && x.f.fv != null).sort((a, b) => b.f.fv - a.f.fv), ch = items.slice().sort((a, b) => money(a).need - money(b).need)[0];
    const ez = sc.length >= 2 && sc[0].f.fv !== sc[1].f.fv ? (sc[0] === ch ? `${PL.J(sc[0].apt, '은', '는')} 2년 점수가 가장 높고, 필요한 현금도 가장 적어요.` : `2년 점수는 ${PL.J(sc[0].apt, '이', '가')} 가장 높고, 필요한 현금은 ${PL.J(ch.apt, '이', '가')} 가장 적어요.`) : '';
    return `<section class="pr-unit pr-sec" data-sec="cmp"><h2 style="margin-top:0">한눈에 비교</h2>${ez ? PL.easy(esc(ez)) : ''}<div class="tblwrap"><table class="pr-tbl"><thead><tr><th></th>${items.map(x => `<th>${esc(x.apt)}<br><small>${esc(x.band)}</small></th>`).join('')}</tr></thead>
      <tbody>${rows.map(([k, fn]) => `<tr><td>${k}</td>${items.map(x => `<td>${esc(fn(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }

  function condHtml() {
    if (S._ro) return `<p class="pr-condp">${S._ro === 'money' ? `대출 계산 조건: 연소득 ${fmt(S.income)} · 보유 현금 ${fmt(S.cash)} · ${OWN_NAME[S.own]} · ${TYPE_NAME[S.rtype] || '주기형'} ${S.rate}% · ${S.term}년 · 기타 비용 ${fmt(S.etc)}` : ''}</p>`;
    const o = (v, t) => `<option value="${v}" ${S.own === v ? 'selected' : ''}>${t}</option>`;
    return `<section class="pr-cond noprint"><b>내 조건</b> <small>바꾸면 대출·필요 현금이 바로 다시 계산됩니다(이 기기에만 저장).</small>
      <div class="pr-cgrid">
        <label>연소득(만원)<input id="cI" inputmode="numeric" value="${S.income}"></label>
        <label>보유 현금(만원)<input id="cC" inputmode="numeric" value="${S.cash}"></label>
        <label>주택 보유<select id="cO">${o('none', '무주택')}${o('first', '생애최초')}${o('one', '1주택(처분조건)')}${o('multi', '다주택')}</select></label>
        <label>금리(%)<input id="cR" inputmode="decimal" value="${S.rate}"></label>
      </div></section>
      <p class="pr-condp">계산 조건: 연소득 ${fmt(S.income)} · 보유 현금 ${fmt(S.cash)} · ${OWN_NAME[S.own]} · ${TYPE_NAME[S.rtype] || '주기형'} ${S.rate}% · ${S.term}년 · 기타 비용 ${fmt(S.etc)}</p>`;
  }

  /* opt(전문가 이름 리포트 assets/pro-report.js 가 씀): cond — 이 화면에서만 쓸 계산 조건(이 기기 저장값을 바꾸지 않음),
     readOnly — 조건 입력 칸 없이 읽기 전용('money' 면 조건 한 줄 표시), cover(order, items, dataTo) — 표지 HTML, after(box, items) — 그린 뒤 */
  async function render(box, keys, order, opt) {
    opt = opt || {};
    if (opt.cond) { const c = opt.cond; Object.assign(S, { income: +c.income || S.income, cash: c.cash != null ? +c.cash : S.cash, own: OWN_NAME[c.own] ? c.own : S.own, rate: +c.rate || S.rate, rtype: TYPE_RATIO[c.rtype] != null ? c.rtype : S.rtype, term: +c.term || S.term }); }
    if (opt.readOnly) S._ro = opt.readOnly;
    if (opt.cond) S._tmp = 1;
    box.innerHTML = '<div class="msg info"><span class="spin"></span>리포트를 만드는 중입니다…</div>';
    const j = async u => { try { const r = await fetch(DATA + u); return r.ok ? r.json() : null; } catch (e) { return null; } };
    const [IX, MODEL, MH, EV, SP, POL] = await Promise.all([P.index(), j('model.json'), j('model_h.json'), j('evidence.json'), j('supply.json'), NARON ? j('policy.json') : null]);
    const ctx = { IX, MODEL, MH, EV, SP, POL, DEVP: NARON && window.JDJDev ? await window.JDJDev.load(DATA).catch(() => null) : null };
    const items = [], miss = [];
    for (const k of keys) {
      const p = P.keyParse(k); if (!p) continue;
      try {
        const units = await P.sido(p.sd), u = units.find(u => u[0] === p.code && u[1] === p.dong && u[2] === p.apt && u[3] === p.band);
        if (!u) { miss.push(p); continue; }
        const [code, dong, apt, band, area, n, series] = u, recent = lastNZ(series), ppy = recent || lastAny(series), sp = IX.sgg[code] ? lastNZ(IX.sgg[code].s) : 0;
        items.push({ jst: PL.jrStats(units), sd: p.sd, jb: u[8], code, dong, apt, band, area, n, series, P: Math.round(ppy * area / PY / 100) * 100, stale: !recent, ch: change6(series), rel: sp ? (sp - ppy) / sp : null, f: (window.JDJ_MINE ? window.JDJ_MINE.cleanFx(u[9]) : u[9]) || null });
      } catch (e) { miss.push(p); }
    }
    const dataTo = IX.dataTo ? IX.dataTo.slice(0, 4) + '년 ' + parseInt(IX.dataTo.slice(4), 10) + '월' : '';
    const draw = () => {
      ctx.G = PL.gloss();
      box.innerHTML = (opt.cover ? opt.cover(order, items, dataTo) : `<div class="pr-cover">
          <span class="tag">PREMIUM INSIGHT · ${esc(order.product)}</span>
          <h1>${items.length > 1 ? '후보 단지 심층 비교' : esc((items[0] || {}).apt || '단지') + ' 심층 리포트'}</h1>
          <div class="pr-meta">주문번호 ${esc(order.orderId)} · 결제일 ${esc(order.paidAt)} · 열람 기간 ${esc(order.expires)}까지 · 실거래 자료 ${dataTo}까지 반영</div>
          <p class="pr-str" data-jdj-str="report" hidden style="margin:12px 0 0;font-size:14.5px;line-height:1.6"></p>
        </div>`) + `
        ${condHtml()}
        ${miss.length ? `<div class="msg err">최근 실거래 자료에서 찾지 못한 단지가 있습니다: ${miss.map(p => esc(p.apt + ' ' + p.band)).join(', ')}. 시스템 문제로 받지 못한 내용은 환불 정책에 따라 전액 환불해 드립니다.</div>` : ''}
        ${compareHtml(items, ctx)}
        ${items.map((x, i) => unitHtml(x, ctx, i, items.length)).join('')}
        <section class="pr-soon"><b>심층 분석은 순차 제공됩니다</b><p>1~10년 가격 시나리오(보수·기준·낙관), 비슷한 조건이었던 과거 단지 사례 비교, 매도 타이밍·세금(양도세·보유세) 시뮬레이션은 준비되는 대로 이 리포트에 추가됩니다. 같은 링크(또는 주문번호)로 열람 기간 동안 추가 비용 없이 보실 수 있습니다.</p></section>
        <p class="pr-disc">국토교통부 실거래가 등 공공기관 공식 자료로 만든 과거 데이터 기반 분석 정보예요. 자세한 분석 방법은 <a href="${JB.SITE}about/">서비스 소개</a>에서 볼 수 있어요. 실제 대출 한도와 세금은 금융기관·세무 전문가에게 확인하세요. 집코드는 부동산 중개를 하지 않습니다. · 작성 집코드</p>`;
      const on = (id, k, num) => { const e = document.getElementById(id); if (!e) return; e.onchange = () => { const v = num ? parseFloat(String(e.value).replace(/[^0-9.]/g, '')) : e.value; if (!num || v > 0) S[k] = v; save(); draw(); }; };
      on('cI', 'income', true); on('cC', 'cash', true); on('cO', 'own', false); on('cR', 'rate', true);
      if (NARON) box.querySelectorAll('.nar').forEach(el => { const x = items[+el.id.slice(4)];
        window.JDJ_NAR.bind(el); });
      if (opt.after) opt.after(box, items, { dataTo: IX.dataTo || '' });
    };
    draw();
    return items.length;
  }
  /* 편집 화면: 지금 계산 조건(대출 칸을 넣을 때 고객 링크에 함께 저장) */
  const cond = () => ({ income: S.income, cash: S.cash, own: S.own, rate: S.rate, rtype: S.rtype, term: S.term });
  window.JDJ_PREMIUM = { render, cond };
})();
