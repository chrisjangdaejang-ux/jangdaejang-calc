/* 고민 해결 길잡이 — 대표 질문 '보유 현금 + 담보대출로 살 수 있는 서울 아파트'(scenarios.json ext:"budget", id budget_apts)
   예: "서울에서 10억 보유금과 나머지 담보대출로 구입할 수 있는 최고의 아파트 단지 10개 추천해줘"
   일반 생성형 답과 다른 점(화면에 그대로 드러나게):
     - 숫자마다 출처·기간·건수·자료 갱신일을 붙여요(실거래 중간값만 — 호가·다른 시세와 섞지 않음).
     - 대출은 서울 규제(투기과열지구)·LTV·집값 구간별 상한(15억·25억 문턱)·DSR(스트레스 금리)·취득세·중개보수·이사 비용까지 넣어 '실제로 살 수 있는 값'으로.
     - 소득을 모르면 '소득에 따라 줄 수 있어요'라고 밝히고 하나씩 물어요. 같은 조건이면 언제 물어도 같은 답(정렬 순서까지 고정).
     - '추천 순위'가 아니라 조건에 맞는 단지를 근거와 함께 정리하고, 정렬은 고른 기준일 뿐이라고 표시해요.
   숫자는 모두 기존 엔진·공개 자료 그대로(새 추정 규칙 없음):
     - 최대 집값·대출·월 상환·취득세·중개보수·기타 비용: assets/loan-core.js ctx·dsrMax·need·maxPrice·monthly(대출 한도 계산기와 같은 함수), 규칙 표는 assets/loan-rules.js
     - 단지 목록·순서: assets/rec-core.js search(내 집 마련 맞춤 단지 buy/report 와 같은 조건 검색 엔진 — 같은 조건이면 같은 단지·순서·숫자, tools/guide-same-test.js)
     - 단지 시세: rec-core unitPrice(= mine-core bandSummary 시세, 내 집 시세와 같은 계산) · 건수·기간 = bandSummary·counts · 준공·세대수·역·전세가율·재건축 단계·미래가치 점수 = 자료 값
     - 미래가치 점수: 과거 성적(assets/rank-core.js vcheck — model_h.json)이 기준을 넘은 지역만, 늘 '참고'
     - 특수 거래 의심: assets/pro-tools-core.js judge(모닝 브리핑과 같은 기준) — 화면에 보이는 단지만 구별 시세 파일(price/구.json)을 불러 확인
     - 토지거래허가: data/policy.json(assets/guide-redev.js toh 그대로), 묶음 지역: guide-redev GROUPS
   node tools/guide-budget-test.js 가 이 파일을 확인해요. window.JDJ_GBUDGET */
(function (root) {
  'use strict';
  const LC = () => root.JDJ_LOAN || (typeof require === 'function' ? require('./loan-core.js') : null);
  const MCc = () => root.JDJ_MINE || (typeof require === 'function' ? require('./mine-core.js') : null);
  const RDc = () => root.JDJ_REDEV || (typeof require === 'function' ? require('./redev-core.js') : null);
  const GXc = () => root.JDJ_GREDEV || (typeof require === 'function' ? require('./guide-redev.js') : null);
  const RKc = () => root.JDJ_RANK || (typeof require === 'function' ? require('./rank-core.js') : null);
  const RCc = () => root.JDJ_REC || (typeof require === 'function' ? require('./rec-core.js') : null);
  const PTc = () => root.JDJ_PT || (typeof require === 'function' && typeof window === 'undefined' ? require('./pro-tools-core.js') : null);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function won(man) {
    if (man == null || !isFinite(man)) return '';
    const v = Math.round(Math.abs(man)), e = Math.floor(v / 10000), m = v % 10000;
    return (man < 0 ? '−' : '') + (e ? e.toLocaleString('ko-KR') + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString('ko-KR') + '만' : (e ? '' : '0')) + ' 원';
  }
  const wonS = man => won(man).replace(/ 원$/, '');
  const ymDot = s => { s = String(s || ''); return /^\d{6}/.test(s) ? `${s.slice(0, 4)}.${s.slice(4, 6)}` : ''; };
  const ymK = s => { s = String(s || ''); return /^\d{6}/.test(s) ? `${s.slice(0, 4)}년 ${+s.slice(4, 6)}월` : ''; };
  const dDot = s => String(s || '').replace(/-/g, '.');
  const todayY = () => +new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 4);

  const ID = 'budget_apts', IDS = [ID];
  const is = id => id === ID;
  const SEOUL = '11110';            // 서울 아무 구 — 서울은 25개 구 전역이 규제지역이라 대출 규칙이 같아요(loan-rules REGION.reg seoulAll)
  const RATE = 4;                   // 금리 가정(연 %) — 길잡이 다른 대출 계산과 같은 기본값, 화면에 '가정'으로 표시
  const BANDS = { 84: '84㎡대', 59: '59㎡대' };
  const GROUPS = () => (GXc() && GXc().GROUPS) || {};

  /* ---------- 좁히는 질문(대화창 규칙: 한 번에 하나) — 연소득 → 평형 → 출퇴근지 → 신축 → 생애최초 ---------- */
  const Q = {
    rcash: { type: 'money', t: '집 사는 데 쓸 수 있는 돈(현금)은 얼마인가요?', opts: [['50000', '5억'], ['70000', '7억'], ['100000', '10억'], ['150000', '15억']], free: 'money', hint: '금액은 이 기기에만 저장돼요' },
    rinc: { type: 'money', t: '부부 합산 연 소득(세전)은 얼마인가요?', opts: [['5000', '5천만 원'], ['7000', '7천만 원'], ['10000', '1억 원'], ['15000', '1억 5천만 원']], free: 'money', hint: '소득에 따라 실제 대출 한도(DSR)가 줄 수 있어요. 이 기기에서만 계산해요' },
    rsize: { type: 'choice', t: '어느 평형을 보세요?', opts: [['84', '84㎡대(34평형)'], ['59', '59㎡대(25평형)'], ['0', '둘 다 볼게요']] },
    rwork: { type: 'choice', t: '주로 출퇴근하는 곳(또는 살고 싶은 쪽)은 어디예요?', opts: [['all', '서울 어디든'], ['강남3구', '강남·서초·송파'], ['마용성', '마포·용산·성동'], ['서남권', '여의도·서남권'], ['동북권', '동북권']], free: 'gu', hint: '고른 쪽의 구 안 단지만 보여 드려요(출퇴근 시간은 계산하지 않아요)' },
    rnew: { type: 'choice', t: '새 아파트를 원하세요?', opts: [['5', '5년 이내 신축'], ['10', '10년 이내'], ['0', '상관없어요']] },
    rfirst: { type: 'choice', t: '생애 처음 사는 집인가요?', opts: [['y', '네, 생애 처음이에요'], ['n', '아니요(지금은 무주택)']], hint: '생애최초는 담보 비율(LTV)이 70%로 높아요. 집값 구간별 대출 상한(6억·4억·2억)은 같아요' }
  };
  const ORDER = ['rcash', 'rinc', 'rsize', 'rwork', 'rnew', 'rfirst'];
  const has = (st, k) => ({ rcash: st.cash != null, rinc: st.inc != null, rsize: st.size != null, rwork: st.gus != null, rnew: st.newb != null, rfirst: st.own != null })[k];

  /** 문장에서 읽기: 현금(보유금)·연 소득·평형·지역·신축·생애최초·'추천' 같은 말 */
  function read(st, sl) {
    sl = sl || {};
    const raw = String(sl.raw || ''), flat = raw.replace(/\s/g, '').toLowerCase(), M = sl.money || {};
    let got = false;
    const amt = (n, u, n2) => Math.round(u === '억' ? +n * 10000 + (n2 ? +n2 * 1000 : 0) : /천/.test(u) ? +n * 1000 : +n);
    /* 현금: '현금 10억' · '10억 보유금' · '10억 있는데' · '10억 + 대출' · '10억과 나머지 담보대출' */
    const c1 = /(현금|가진돈|보유금|보유현금|보유자금|보유|모은돈|예산|자금|종잣돈|내돈|자기자본)(?:은|는|이|이요|만|으로)?(\d+(?:\.\d+)?)억(?:(\d)천)?/.exec(flat);
    const c2 = /(\d+(?:\.\d+)?)억(?:(\d)천(?:만)?)?(?:원)?(?:의|정도|쯤)?(?:보유|현금|있|가지|가진|모았|모아|이면|으로서울|으로아파트)/.exec(flat);
    const c3 = /(\d+(?:\.\d+)?)억(?:(\d)천(?:만)?)?(?:원)?(?:과|와|에|\+|이랑|하고|이고|더하기)?(?:나머지)?(?:는|를|은)?(?:주담대|대출|담보|주택담보)/.exec(flat);
    const cm = c1 ? [c1[2], c1[3]] : c2 ? [c2[1], c2[2]] : c3 ? [c3[1], c3[2]] : null;
    if (cm) { st.cash = amt(cm[0], '억', cm[1]); got = true; }
    else if (M.cash != null) { st.cash = M.cash; got = true; }
    /* 집값 상한('15억 이하 아파트')은 현금이 아니라 거르기 값 */
    const pc = /(\d+(?:\.\d+)?)억(?:(\d)천(?:만)?)?(?:원)?(?:이하|까지|짜리|미만|안쪽)/.exec(flat);
    if (pc && !(c2 && c2.index === pc.index)) { st.pcap = amt(pc[1], '억', pc[2]); got = true; }
    const mi = /(연봉|연소득|소득|맞벌이|부부합산|합산소득)(?:은|는|이|합쳐서|합산|이요)?(\d+(?:\.\d+)?)(억|천만|천|만)(?:(\d)천)?/.exec(flat);
    if (mi) { st.inc = amt(mi[2], mi[3], mi[4]); got = true; } else if (M.income != null && M.income !== st.cash) { st.inc = M.income; got = true; }
    if (/(84㎡|84m|84제곱|34평|33평|국평|국민평형|84타입|전용84)/.test(flat)) { st.size = '84'; got = true; }
    else if (/(59㎡|59m|59제곱|25평|24평|59타입|전용59)/.test(flat)) { st.size = '59'; got = true; }
    else if (sl.area) { st.size = sl.area <= 66 ? '59' : '84'; got = true; }
    const G = GROUPS();
    for (const g of Object.keys(G)) if (flat.indexOf(g) >= 0) { st.gus = G[g].slice(); st.gname = g === '강남권' ? '강남3구' : g; got = true; break; }
    if (!st.gus && sl.region && /^11/.test(String(sl.region.code || ''))) { st.gus = [sl.region.name]; st.gname = sl.region.name; got = true; }
    if (/(신축|새아파트|새집|새로지은)/.test(flat) && !/준신축/.test(flat)) { st.newb = 5; got = true; } else if (/준신축/.test(flat)) { st.newb = 10; got = true; }
    if (/(생애최초|생애첫|첫집|처음사는집|생초)/.test(flat) || sl.own === 'first') { st.own = 'first'; got = true; }
    if (/(추천|최고|베스트|best|top|탑\d|좋은단지|좋은아파트|제일좋)/.test(flat)) st.rec = 1;
    return got;
  }
  function init(id, sl) {
    const st = { id: id || ID, cash: null, inc: null, size: null, gus: null, gname: '', newb: null, own: null, pcap: null, sort: null, rec: 0, _skip: [] };
    read(st, sl);
    return st;
  }
  function next(id, st) { return ORDER.find(k => !has(st, k) && (st._skip || []).indexOf(k) < 0) || ''; }
  /** 답 하나(단추 값 또는 직접 입력) */
  function set(id, st, key, val) {
    const o = Object.assign({}, st, { _skip: (st._skip || []).slice() });
    if (key === 'rcash') o.cash = +val || 0;
    if (key === 'rinc') o.inc = +val || 0;
    if (key === 'rsize') o.size = val === '84' || val === '59' ? val : '0';
    if (key === 'rwork') { const G = GROUPS(); if (val === 'all' || val === '') { o.gus = []; o.gname = '서울 전체'; } else if (G[val]) { o.gus = G[val].slice(); o.gname = val; } else { o.gus = [val]; o.gname = val; } }
    if (key === 'rnew') o.newb = +val || 0;
    if (key === 'rfirst') o.own = val === 'y' ? 'first' : 'none';
    return o;
  }
  /** 대화창 직접 입력: 지금 물은 칸(key)에 맞춰 읽기 · 읽었으면 true */
  function answer(id, st, text, sl, key) {
    const t = String(text || '').trim(), flat = t.replace(/\s/g, '');
    const before = JSON.stringify(st);
    read(st, Object.assign({}, sl || {}, { raw: t }));
    const num = /^(\d+(?:\.\d+)?)(억|억원|억정도|억쯤)?(이하|까지|정도|쯤|있어요|요)?$/.exec(flat);
    if (key === 'rcash' && st.cash == null) { const ms = sl && sl.moneys && sl.moneys[0]; if (ms) st.cash = ms.v; else if (num && +num[1] > 0 && +num[1] <= 200) st.cash = Math.round(+num[1] * 10000); }
    if (key === 'rinc' && st.inc == null) { const ms = sl && sl.moneys && sl.moneys[0]; if (ms) st.inc = ms.v; else if (num) st.inc = +num[1] <= 30 ? Math.round(+num[1] * 10000) : Math.round(+num[1]); else if (/^(없|0|소득없)/.test(flat)) st.inc = 0; }
    if (key === 'rsize' && st.size == null) { if (/84|34|33|국평/.test(flat)) st.size = '84'; else if (/59|25|24/.test(flat)) st.size = '59'; else if (/둘다|상관없|모두|다/.test(flat)) st.size = '0'; }
    if (key === 'rwork' && st.gus == null && /(전체|어디든|상관없|아무데)/.test(flat)) { st.gus = []; st.gname = '서울 전체'; }
    if (key === 'rwork' && st.gus == null) { const k = Object.keys(GROUPS()).find(g => flat.indexOf(g.replace(/\d/g, '')) >= 0 && g.length > 2); if (k) { st.gus = GROUPS()[k].slice(); st.gname = k; } }
    if (key === 'rnew' && st.newb == null) { const m = /(\d+)/.exec(flat); if (m) st.newb = +m[1] <= 5 ? 5 : 10; else if (/(상관없|구축|오래돼도)/.test(flat)) st.newb = 0; }
    if (key === 'rfirst' && st.own == null) { if (/^(네|예|응|맞|처음|생애)/.test(flat)) st.own = 'first'; else if (/^(아니|아뇨|아님|예전|전에)/.test(flat)) st.own = 'none'; }
    return JSON.stringify(st) !== before;
  }

  /* ---------- 대출·최대 집값(loan-core 그대로) ---------- */
  /** 서울 대출 조건: 소득을 모르면 소득 기준(DSR)을 빼고(ex=true) 계산 */
  function ctxOf(st, L) {
    L = L || LC();
    const g = L.R.groupOf(SEOUL), ex = !(st.inc > 0);
    const c = L.ctx({ g, own: st.own === 'first' ? 'first' : 'none', income: ex ? 1e7 : +st.inc, cash: +st.cash || 0, debt: 0, rate: RATE });
    return { c, g, ex, dsr: L.dsrMax(c) };
  }
  /** 보유 현금으로 살 수 있는 최대 집값과 그때 대출·비용·월 상환 */
  function capOf(st, L) {
    L = L || LC(); if (!(st.cash > 0)) return null;
    const K = ctxOf(st, L), P = L.maxPrice(K.c, K.dsr), n = P ? L.need(P, K.c, K.dsr) : null;
    const o = { P, ex: K.ex, c: K.c, dsr: K.dsr, ltv: K.c.ltv, rate: K.c.rate, term: K.c.term, stress: K.c.stress, g: K.g };
    if (n) Object.assign(o, { loan: Math.floor(n.loan.L), by: n.loan.by, need: n.need, cost: n.cost, etc: K.c.etc, pay: L.monthly(n.loan.L, K.c.rate, K.c.term), left: (+st.cash) - n.need,
      tax: n.cost.acq - n.cost.relief + n.cost.edu + n.cost.farm, broker: n.cost.broker, capAt: L.capByPrice(P, K.c) });
    if (!K.ex) { const B = ctxOf(Object.assign({}, st, { inc: null }), L); o.P0 = L.maxPrice(B.c, B.dsr); }   // 소득을 넣기 전(소득 기준 뺀) 최대 집값 — 소득을 넣으면 얼마나 달라졌는지
    return o;
  }
  /** 집값 구간별 대출 상한 문턱(15억·25억 — loan-rules CAP 표) 앞뒤 비교: 문턱 집값과 1천만 원 더 비싼 집 */
  function cliffs(st, L) {
    L = L || LC(); if (!(st.cash > 0)) return [];
    const K = ctxOf(st, L), cash = +st.cash, out = [];
    for (const r of L.R.CAP.v) {
      if (r.upTo == null) continue;
      const b = r.upTo, a = L.need(b, K.c, K.dsr), z = L.need(b + 1000, K.c, K.dsr);
      let top = 0; const nx = L.R.CAP.v.find(x => x.upTo == null || x.upTo > b), hi = nx && nx.upTo ? nx.upTo : b + 100000;
      for (let P = b + 100; P <= hi; P += 100) if (L.need(P, K.c, K.dsr).need <= cash) top = P;   // 문턱 바로 위 구간에서 살 수 있는 가장 비싼 집(없으면 0)
      out.push({ b, lo: { P: b, L: Math.floor(a.loan.L), cap: L.capByPrice(b, K.c), need: a.need, ok: a.need <= cash, by: a.loan.by },
        hi: { P: b + 1000, L: Math.floor(z.loan.L), cap: L.capByPrice(b + 1000, K.c), need: z.need, ok: z.need <= cash, by: z.loan.by }, top, nextB: nx && nx.upTo ? nx.upTo : null });
    }
    return out;
  }
  /** 화면 맨 위 문턱 한 줄: 내 돈으로 문턱 집은 사는데 1천만 원 더 비싼 집은 못 사는 곳이 있으면 그 문턱, 없으면 최대 집값에 가장 가까운 문턱 */
  function mainCliff(CL, P) { return CL.find(x => x.lo.ok && !x.hi.ok) || CL.find(x => x.b >= (P || 0)) || CL[CL.length - 1] || null; }
  function cliffLine(x) {
    if (!x) return '';
    const capT = `대출 상한이 ${wonS(x.lo.cap)}에서 ${wonS(x.hi.cap)}으로 줄어`;
    if (x.lo.ok && !x.hi.ok) return `${wonS(x.b)} 원짜리 집은 살 수 있지만, ${wonS(x.hi.P)} 원짜리 집은 ${capT} 내 돈이 ${won(x.hi.need)} 필요해 오히려 못 사요.`;
    if (x.lo.ok && x.hi.ok) return `${wonS(x.b)} 원을 넘으면 ${capT} 내 돈이 ${won(x.hi.need - x.lo.need)} 더 들어요.`;
    return `${wonS(x.b)} 원을 넘는 집은 ${capT}요.`;
  }

  /* ---------- 단지 목록(서울 전체에서 84㎡대·59㎡대, 내 돈으로 살 수 있는 곳) ---------- */
  const obj = v => v && typeof v === 'object' ? v : {};
  const yearOf = IX => +(String((IX && IX.updated) || '').slice(0, 4)) || todayY();   // 같은 자료면 같은 답(준공 연수도 자료 날짜 기준)
  /** 시세 칸의 기간·건수: bandSummary 시세(최근 3개월 실거래 중간값)가 쓴 3개월과 그 안 거래 수 */
  function span3(u, sm, months, MC) {
    const c = MC.counts(u[7]), i = months.indexOf(sm.at); if (i < 0) return null;
    const f = Math.max(0, i - 2); let n = 0; for (let k = f; k <= i; k++) n += c[k] || 0;
    return { n, from: months[f], to: months[i] };
  }
  function trackOf(X) {
    const RK = RKc(); const tr = X && X.MH && RK && RK.vcheck ? RK.vcheck(X.MH, '서울특별시') : null;
    return tr ? { n: tr.n, hit: tr.hit, ok: !!tr.ok, where: tr.where } : null;
  }
  const JR_LO = 0.4, JR_HI = 0.6;   // 전세가율 '낮은 편'·'높은 편' — 단지 화면 문장(assets/plain-words.js jrText)과 같은 구간
  /* ---------- 단지 목록 = 조건 검색 엔진(assets/rec-core.js search) 그대로 ----------
     내 집 마련 맞춤 단지 화면(buy/report)과 같은 함수·같은 조건·같은 순서(미래가치 점수 → 추천 점수, 10곳 · 한 구 3곳)라
     같은 조건이면 두 화면의 단지·순서·숫자가 같아요(tools/guide-same-test.js). 길잡이만의 목록·정렬 규칙은 두지 않아요. */
  const HZ_KEY = 'jdj_hz';
  /** 예상 보유 기간(년) — 검색 화면과 같은 값(주소 hz → 이 기기 jdj_hz → 2년) */
  function hzNow() {
    let h = 2;
    try { if (typeof location !== 'undefined') h = parseInt(new URLSearchParams(location.search).get('hz') || (root.localStorage && root.localStorage.getItem(HZ_KEY)) || '2', 10); } catch (e) {}
    return h >= 1 && h <= 10 ? h : 2;
  }
  /** 보유 기간 점수를 넣은 단지 자료(원본은 그대로 두고 복사본에 — 다른 길잡이 계산과 섞이지 않게) */
  function hzUnits(X, hz) {
    const RC = RCc(), MC = MCc(), mix = RC.hzMix(hz, X.MODEL || null, X.MH || null), k = JSON.stringify(mix);
    if (X._hz && X._hz.k === k && X._hz.src === X.units) return X._hz.units;
    const units = (X.units || []).map(u => { const v = u.slice(); if (u[9] && typeof u[9] === 'object') v[9] = Object.assign({}, u[9]); return v; });
    RC.applyHz(units, mix, MC && MC.cleanFx ? MC.cleanFx : null);
    X._hz = { k, src: X.units, units };
    return units;
  }
  const SIZE_BANDS = st => st.size === '84' ? [BANDS[84]] : st.size === '59' ? [BANDS[59]] : [BANDS[59], BANDS[84]];
  /** 서울 구 코드(고른 쪽만) */
  function sggsOf(st, IX) {
    const sgg = (IX && IX.sgg) || {};
    return Object.keys(sgg).filter(c => /^11/.test(c) && (!(st.gus && st.gus.length) || st.gus.indexOf(sgg[c].name) >= 0)).sort();
  }
  /** 검색 화면(buy/report) ctxFor 와 같은 대출 조건 — 소득을 모르면 소득 기준(DSR)을 빼고(ctxOf 와 같음) */
  function searchQ(st, X, E) {
    E = E || {};
    const L = E.L || LC(), RC = RCc(), IX = X.IX || {}, ex = !(st.inc > 0);
    const ctxBy = {}, dsrBy = {}, maxBy = {};
    for (const g of ['reg', 'capfree', 'local']) { const c = L.ctx({ g, own: st.own === 'first' ? 'first' : 'none', rtype: 'cyc', income: ex ? 1e7 : +st.inc, cash: +st.cash || 0, debt: 0, rate: RATE, term: 30, etc: L.ETC_DEFAULT }); ctxBy[g] = c; dsrBy[g] = L.dsrMax(c); maxBy[g] = L.maxPrice(c, dsrBy[g], false); }
    const NOTES = X.notes || root.JDJ_REGION_NOTES || null, sggs = sggsOf(st, IX), sggPpy = {};
    sggs.forEach(c => { const g = (IX.sgg || {})[c]; sggPpy[c] = g ? RC.lastNZ(g.s || []) : 0; });
    return { units: hzUnits(X, E.hz || hzNow()), sggs, areas: SIZE_BANDS(st), cash: +st.cash || 0, ctxBy, dsrBy, maxBy,
      need: (P, c, d, large) => L.need(P, c, d, !!large), groupOf: c => RC.isReg(c) ? 'reg' : (RC.isCap(c) ? 'capfree' : 'local'),
      noteOf: c => !!(NOTES && NOTES.notes && NOTES.notes[RC.noteKey(NOTES, IX, c)]), sggPpy,
      newb: +st.newb || 0, pmax: +st.pcap || 0, year: yearOf(IX), any: false, max: 10 };
  }
  function rowsOf(st, X, E) {
    E = E || {};
    const L = E.L || LC(), MC = E.MC || MCc(), RC = RCc(), IX = X.IX || {}, months = IX.months || [], sgg = IX.sgg || {}, Y = yearOf(IX);
    const K = ctxOf(st, L), TR = trackOf(X), fvOk = !!(TR && TR.ok);
    const pol = X.pol, GX = GXc(), th = GX && pol ? GX.toh(pol, SEOUL, '', 'apt') : null;
    if (!(st.cash > 0)) return { rows: [], n: 0, total: 0, near: [], fvOk, track: TR, th, ctx: K };
    const q = searchQ(st, X, E), S0 = RC.search(q);
    const rows = S0.picked.map(x => {
      const u = x.u, f = obj(x.fx), sm = MC.bandSummary(u, months), sp = span3(u, sm, months, MC), age = f.by ? Y - f.by : null;
      const capB = L.R.CAP.v.filter(r => r.upTo != null).map(r => r.upTo).find(b => x.P <= b && sm.range && sm.range.hi > b) || null;
      return { key: [x.code, x.dong, x.jb, x.apt].join('|'), u, code: x.code, gu: (sgg[x.code] || {}).name || '', dong: x.dong, apt: x.apt, jibun: x.jb, band: x.band, area: +x.area || 0,
        price: x.P, at: sm.at, n3: sp ? sp.n : sm.recent3, p3: sp, n12: sm.cnt12,
        range: sm.range && sm.range.months ? { lo: sm.range.lo, hi: sm.range.hi, months: sm.range.months } : null,
        by: f.by || null, age, hh: f.hh || null, fvr: fvOk && f.fvr != null ? f.fvr : null, sub: f.sub != null ? f.sub : null, subs: f.subs || '', fv: fvOk && f.fv != null ? f.fv : null,
        jr: f.jr != null && f.jr > 0 ? f.jr : null, rz: f.rz && f.rz.lv ? f.rz : null,
        loan: Math.floor(x.nd.loan.L), lby: x.nd.loan.by, pay: L.monthly(x.nd.loan.L, x.c.rate, x.c.term), need: x.nd.need, capB, thin: (sm.cnt12 || 0) < MC.FEW, th, sus: null };
    });
    const near = rows.length ? [] : RC.nearMiss(q).slice(0, 3).map(x => ({ apt: x.apt, gu: (sgg[x.code] || {}).name || '', band: x.band, P: x.P, short: x.nd.need - q.cash }));
    return { rows, n: rows.length, total: S0.total, near, fvOk, track: TR, th, ctx: K, hz: E.hz || hzNow() };
  }
  /** '같은 조건으로 검색 화면에서 보기' — 내 집 마련 맞춤 단지(buy/report) 주소. 연소득·현금은 주소가 아니라 이 탭에만(sessionStorage jdj_gfin) 넘겨요.
      연 소득을 모르면 검색 화면이 소득 기준까지 넣어 계산하므로 null(소득을 고른 뒤 열 수 있음) */
  function sameUrl(st, IX, base) {
    if (!(st.cash > 0) || !(st.inc > 0)) return null;
    const p = new URLSearchParams();
    p.set('sd', '서울특별시');
    const all = sggsOf({}, IX), gs = sggsOf(st, IX);
    if (gs.length && gs.length < all.length) p.set('gs', gs.join(','));
    p.set('ar', SIZE_BANDS(st).join(','));
    p.set('o', st.own === 'first' ? 'first' : 'none');
    if (st.newb) p.set('nb', String(st.newb));
    if (st.pcap) p.set('pm', String(st.pcap));
    p.set('from', 'guide');
    return (base || '') + 'buy/report/?' + p.toString();
  }
  /** 검색 화면으로 넘길 개인값(이 탭에만, 30분) */
  function sameFin(st) { return { i: +st.inc, c: +st.cash, d: 0, e: 1000, at: Date.now() }; }
  function handSame(st) { try { root.sessionStorage.setItem('jdj_gfin', JSON.stringify(sameFin(st))); } catch (e) {} }
  /** 위험 신호(자료에 있는 것만): [{k, t, lv:'warn'|'info'}] */
  function risks(r, CAPV) {
    const out = [], RD = RDc();
    if (r.sus) out.push({ k: 'sus', t: `특수 거래 의심 ${r.sus}건(최근 1년)`, lv: 'warn' });
    if (r.thin) out.push({ k: 'thin', t: `비교 거래 적음(최근 1년 ${r.n12 || 0}건)`, lv: 'warn' });
    if (r.capB) out.push({ k: 'cap', t: `최근 1년 시세가 ${wonS(r.capB)}을 넘은 적 있음 — 넘으면 대출 상한 ${wonS(capNext(r.capB, CAPV))}`, lv: 'warn' });
    if (r.rz) out.push({ k: 'rz', t: `재건축 ${r.rz.lv}단계(${(RD && RD.STAGES && RD.STAGES[r.rz.lv]) || ''})${r.rz.ym ? ` · ${ymDot(r.rz.ym)}` : ''}`, lv: 'info' });
    else if (r.age != null && r.age >= 30) out.push({ k: 'old', t: `준공 ${r.age}년 — 재건축을 추진할 수 있는 나이`, lv: 'info' });
    if (r.jr != null) out.push({ k: 'jr', t: `전세가율 ${Math.round(r.jr * 100)}%${r.jr < JR_LO ? '(낮은 편)' : r.jr >= JR_HI ? '(높은 편)' : ''}`, lv: 'info' });
    return out;
  }
  function capNext(b, CAPV) { const x = (CAPV || []).find(r => r.upTo == null || r.upTo > b); return x ? x.max : 0; }
  const stationT = r => r.sub == null ? '역 정보 없음' : r.sub >= 30 ? '역까지 도보 20분 넘음' : `${r.subs ? r.subs.split(' ')[0] + ' ' : '역 '}도보 ${r.sub}분`;

  /** 특수 거래 의심(최근 1년): 구별 시세 파일(price/구.json)의 개별 거래 + pro-tools-core judge — 보이는 단지만 */
  function susCount(r, P, months, MC, PT) {
    const u = (P.units || []).find(x => x[0] === r.code && x[1] === r.dong && String(x[8]) === String(r.jibun) && x[2] === r.apt && x[3] === r.band);
    if (!u || !PT || !PT.judge) return null;
    const last = String(months[months.length - 1] || ''), since = last.length === 6 ? +(String(+last.slice(0, 4) - 1) + last.slice(4, 6) + '01') : 0;
    return PT.judge(MC.trades(u)).filter(t => t.sus && t.ymd >= since).length;
  }

  /* ---------- 글 ---------- */
  function chipsOf(st) {
    const c = [st.gname && st.gname !== '서울 전체' ? `서울 ${st.gname}` : '서울 전체'];
    if (st.cash != null) c.push(`현금 ${wonS(st.cash)}`);
    c.push(st.inc > 0 ? `연 소득 ${wonS(st.inc)}` : st.inc === 0 ? '소득 없음' : '소득 미입력');
    c.push(st.size === '84' ? '84㎡대' : st.size === '59' ? '59㎡대' : '84㎡대·59㎡대');
    if (st.newb) c.push(`${st.newb}년 이내 신축`);
    if (st.pcap) c.push(`집값 ${wonS(st.pcap)} 이하`);
    c.push(st.own === 'first' ? '생애최초' : '무주택');
    return c;
  }
  const sizeT = st => st.size === '84' ? '84㎡대' : st.size === '59' ? '59㎡대' : '84㎡대·59㎡대';
  const BY = { LTV: '담보 비율(LTV)', DSR: '소득 기준(DSR)', CAP: '집값 구간별 대출 상한', DTI: '소득 기준(DTI)', BAN: '대출 금지 규칙' };
  function headOf(st, C) {
    if (!(st.cash > 0)) return '가진 돈(현금)을 알려 주시면 대출까지 더해 살 수 있는 최대 집값과 단지를 계산해 드려요';
    if (!C || !C.P) return `현금 ${won(st.cash)}으로는 서울에서 대출을 더해도 살 수 있는 집값이 나오지 않아요`;
    return `현금 ${won(st.cash)} + 대출이면 서울에서 최대 ${won(C.P)}짜리 집까지 살 수 있어요`;
  }
  function keysOf(st, C) {
    if (!C || !C.P) return [];
    return [
      { k: '그때 대출', v: won(C.loan), s: `${BY[C.by] || ''}이 한도를 정해요 · LTV ${Math.round(C.ltv * 100)}%` },
      { k: '매달 갚을 돈', v: won(Math.round(C.pay)), s: `${C.term}년 원리금 균등 · 금리 연 ${C.rate}%(가정)` },
      { k: '취득세·중개보수·이사 등', v: won(Math.round(C.tax + C.broker + C.etc)), s: `취득세 ${wonS(Math.round(C.tax))} · 중개보수 ${wonS(Math.round(C.broker))} · 이사·등기 등 ${wonS(C.etc)}(가정)` },
      { k: '쓰고 남는 돈', v: won(Math.max(0, Math.round(C.left))), s: '현금 − (집값 − 대출) − 위 비용' }
    ];
  }
  function incomeLine(st, C) {
    if (!C || !C.P) return '';
    if (C.ex) return '연 소득을 아직 몰라 소득 기준(DSR)을 빼고 계산했어요. 소득에 따라 실제 한도가 줄 수 있어요.';
    const d = C.P - (C.P0 || C.P);
    return `연 소득 ${won(st.inc)}을 넣어 스트레스 금리(${(C.rate + C.stress).toFixed(1)}%로 한도 계산)까지 반영했어요` + (d < 0 ? ` — 소득 기준 때문에 최대 집값이 ${won(C.P0)}에서 ${won(C.P)}으로 줄었어요.` : ' — 이 소득이면 소득 기준(DSR)이 한도를 줄이지 않아요.');
  }
  const REC_LINE = '조건에 맞는 단지를 근거와 함께 정리해 드려요(추천 순위 아님).';
  /* 목록 순서 설명 — 내 집 마련 맞춤 단지 화면과 같은 기준(그 화면 '순위 기준' 문장과 같은 뜻) */
  const ORDER_LINE = '단지와 순서는 내 집 마련 맞춤 단지(조건 검색) 화면과 같은 계산이에요: 미래가치 점수 순, 같으면 예산·거래량을 보고, 한 구에서 3곳까지 10곳을 골라요. 예산에 비해 너무 싼 단지(살 수 있는 최대 집값의 55% 미만)는 빼요.';
  function basisOf(R, X) {
    const IX = X.IX || {}, m = IX.months || [];
    return `시세는 국토교통부 실거래 최근 3개월 중간값(호가 아님 · ${ymK(m[m.length - 1])} 계약분까지 · 자료 갱신 ${dDot(IX.updated)})이에요. ${ORDER_LINE}`;
  }
  /** 손해 피하는 주의점: 대출 규칙표에 있는 안내(공식 발표 문장) + 계산 가정 */
  function warnOf(st, C, L) {
    L = L || LC();
    const w = [];
    if (C && C.ex) w.push('연 소득을 넣기 전이라 소득 기준(DSR)을 빼고 계산한 최대예요. 소득이 적으면 대출 한도와 살 수 있는 단지가 줄어요.');
    L.R.notesFor('reg').filter(n => ['toheo', 'movein', 'credit'].indexOf(n.id) >= 0).forEach(n => w.push(n.t));
    w.push(`금리는 연 ${RATE}%로 가정했어요. 실제 금리·은행 심사(신용·다른 대출)에 따라 한도와 매달 갚을 돈이 달라져요.`);
    w.push('시세는 최근 3개월 실거래 중간값이라 층·향·수리 상태에 따라 실제 가격은 달라요. 호가(집주인이 부르는 값)와 섞지 않았어요.');
    if (st.own !== 'first') w.push('지금 집이 있는 분(1주택 이상)은 대출 비율·세금이 달라 이 계산과 맞지 않아요. 대출 한도 계산기에서 보유 주택 수를 골라 다시 보세요.');
    return w;
  }
  /** 이 답을 믿을 수 있는 이유(접힌 칸) */
  function trustOf(R, X, L) {
    L = L || LC();
    const IX = X.IX || {}, m = IX.months || [], T = R && R.track;
    return [
      { h: '숫자 출처·갱신', t: `아파트 시세는 국토교통부 실거래가 공개 자료(하루 4번 수집)의 최근 3개월 중간값이고, ${ymK(m[m.length - 1])} 계약분까지 들어 있어요(자료 갱신 ${dDot(IX.updated)}). 대출 규칙은 금융위원회·국토교통부 공식 발표만 정리한 대출 규칙표(${dDot(L.R.ASOF)} 확인)를, 취득세는 세금 계산과 같은 엔진을, 중개보수는 법정 상한 요율을 그대로 써요.`, a: [['대출 규칙표', 'loan/#rules']] },
      { h: '같은 조건이면 같은 답', t: '조건을 하나씩 고르는 내 집 마련 맞춤 단지 화면과 같은 계산(같은 함수·같은 조건·같은 순서)을 써요. 조건이 같으면 두 화면 어디서 봐도, 언제 물어도 같은 단지·순서·숫자가 나오고, 자료가 새로 들어오면 그때만 바뀌어요.' },
      { h: '점수의 과거 성적', t: T ? (T.ok ? `미래가치 점수를 ${T.where} 단지에 과거에 그대로 써 봤더니 ${T.n}번 중 ${T.hit}번 맞았어요. 그래도 앞날을 약속하지 않아 '참고'로만 보여 드려요.` : `${T.where} 단지에 과거에 써 봤을 때 ${T.n}번 중 ${T.hit}번 맞아 기준에 못 미쳐, 이 화면에는 점수를 싣지 않았어요.`) : '과거 성적 자료를 불러오지 못해 점수를 싣지 않았어요.', a: [['과거 성적 자세히', 'guide/method/#trk']] },
      { h: '위험 신호 기준', t: `특수 거래 의심: 앞 1년 중간값보다 60% 넘게 비싸거나 앞 3개월 중간값보다 30% 넘게 싼 거래(모닝 브리핑과 같은 기준) · 비교 거래 적음: 최근 1년 거래 ${MCc().FEW}건 미만 · 문턱: 최근 1년 시세가 대출 상한이 바뀌는 집값(15억·25억)을 넘은 적이 있음 · 재건축 단계: 서울시 정비사업 추진현황 · 전세가율: ${Math.round(JR_LO * 100)}% 미만 낮은 편, ${Math.round(JR_HI * 100)}% 이상 높은 편 · 토지거래허가: 정부 발표 정책 표.` }
    ];
  }
  const SRC = ['molit_rt', 'loan', 'fsc_dsr', 'acq11', 'broker20', 'brokerSeoul', 'policy_1015'];

  /* ---------- 길잡이 계산 함수(guide-core S.budgetApts) — E.BX = {units, IX, MH, pol}, E.L, E.MC ---------- */
  function solve(id, a, E) {
    const X = (E && E.BX) || null; if (!X || !X.units) return { err: 'nodata' };
    const st = a._nf || init(ID, { raw: a._raw || '', money: {} });
    if (!(st.cash > 0)) return { need: ['cash'] };
    const L = E.L || LC(), C = capOf(st, L), R = rowsOf(st, X, E), CL = cliffs(st, L), mc = mainCliff(CL, C && C.P);
    const lim = E.lim || 10;
    return { head: headOf(st, C), nums: keysOf(st, C).slice(0, 3), ex: [incomeLine(st, C), cliffLine(mc)].filter(Boolean).join(' '),
      tables: R.n ? [{ title: `조건에 맞는 서울 ${sizeT(st)} 단지 ${R.n.toLocaleString()}곳(조건 충족 ${R.total.toLocaleString()}개 평형 중)`, note: basisOf(R, X),
        head: ['단지', '구·동', '평형', '최근 실거래 중간값', '건수·기간', '대출 · 매달', '역', '준공·세대'],
        rows: R.rows.slice(0, lim).map(r => [{ t: r.apt }, `${r.gu} ${r.dong}`, r.band, won(r.price), r.p3 ? `${r.n3}건 · ${ymDot(r.p3.from)}~${ymDot(r.p3.to)}` : '-', `${wonS(r.loan)} · 월 ${wonS(Math.round(r.pay))}`, stationT(r), `${r.by ? r.by + '년' : '-'}${r.hh ? ' · ' + r.hh.toLocaleString() + '세대' : ''}`]) }] : [],
      warn: warnOf(st, C, L), note: chipsOf(st).join(' · ') + ' — 이 기기에서만 계산했어요', rec: st.rec ? REC_LINE : '', src: SRC.slice(), _R: R, _C: C, _CL: CL, _st: st };
  }

  /* ================= 화면(브라우저) ================= */
  const CSS = [
    '.gbx .gbrec{margin:8px 0 0;padding:10px 12px;border-radius:12px;background:var(--blue-l,#EEEDFB);color:var(--blue-d,#3730A3);font-size:14px;font-weight:800;line-height:1.5}',
    '.gbx .gbv{margin:12px 0 0;padding:18px 18px 16px;border-radius:18px;background:var(--rf-ink,#17202E);color:#fff}',
    '.gbx .gbv .k{display:block;font-size:14px;font-weight:700;color:#B9BFCC;line-height:1.5}.gbx .gbv .big{display:block;margin:2px 0 0;font-size:36px;font-weight:900;letter-spacing:-1.2px;line-height:1.15;font-variant-numeric:tabular-nums;word-break:keep-all}',
    '.gbx .gbv .one{margin:8px 0 0;font-size:16px;font-weight:700;line-height:1.55;color:#fff;word-break:keep-all}.gbx .gbv .sub{margin:6px 0 0;font-size:14px;line-height:1.6;color:#D5DAE3}',
    '.gbx .gbv .cl{margin:12px 0 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.1);font-size:14.5px;font-weight:700;line-height:1.55;color:#fff}',
    '.gbx .gbk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0 0}.gbx .gbk>div{min-width:0;padding:12px 14px;border-radius:14px;background:var(--gray,#F2F4F6)}',
    '.gbx .gbk small{display:block;font-size:13px;font-weight:700;color:var(--sub2,#4E5968)}.gbx .gbk b{display:block;margin-top:2px;font-size:19px;font-weight:900;letter-spacing:-.4px;color:var(--text,#191F28);font-variant-numeric:tabular-nums}.gbx .gbk span{display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--sub2,#4E5968)}',
    '@media(min-width:768px){.gbx .gbk{grid-template-columns:repeat(4,minmax(0,1fr))}.gbx .gbv .big{font-size:44px}}',
    '.gbx .gbct{width:100%;border-collapse:collapse;margin:10px 0 0;font-size:13.5px}.gbx .gbct th,.gbx .gbct td{padding:8px 6px;border-bottom:1px solid var(--line,#E5E8EB);text-align:right;font-variant-numeric:tabular-nums}.gbx .gbct th:first-child,.gbx .gbct td:first-child{text-align:left}.gbx .gbct th{font-size:12.5px;color:var(--sub2,#4E5968);font-weight:700}.gbx .gbct td.no{color:var(--neg,#C2410C);font-weight:800}.gbx .gbct td.ok{color:var(--pos,#0E7A4F);font-weight:800}',
    '.gbx .gbin{margin:10px 0 0;font-size:13.5px;line-height:1.55;color:var(--sub,#3E4754)}.gbx .gbin b{color:var(--text,#191F28)}',
    '.gbx .gbl{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}@media(min-width:900px){.gbx .gbl{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '.gbx .gbl>li{min-width:0;border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:12px 14px;background:#fff}.gbx .gbl .t{display:flex;align-items:center;gap:8px}.gbx .gbl .t a{flex:1;font-size:17px;font-weight:900;color:var(--text,#191F28);text-decoration:none;min-width:0;word-break:keep-all;overflow-wrap:anywhere}.gbx .gbl .t a:hover{color:var(--blue,#4338CA)}',
    '.gbx .gbl .t .n{flex:none;font-size:12.5px;font-weight:800;color:var(--sub2,#4E5968)}.gbx .gbl .sb{display:inline-block;font-size:12.5px;font-weight:800;color:var(--blue-d,#3730A3);background:var(--blue-l,#EEEDFB);border-radius:999px;padding:2px 8px}',
    '.gbx .gbl .pk{flex:none;display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 10px;border-radius:999px;border:1.5px solid var(--line,#E5E8EB);font-size:13px;font-weight:800;color:var(--sub,#3E4754);cursor:pointer}.gbx .gbl .pk input{width:16px;height:16px;margin:0;accent-color:var(--blue,#4338CA)}.gbx .gbl .pk.on{border-color:var(--blue,#4338CA);background:var(--blue-l,#EEEDFB);color:var(--blue-d,#3730A3)}',
    '.gbx .gbl .t .jw-star{flex:none}.gbx .gbl .pk+.jw-star{margin-left:0}.gbx .gbl .m{display:block;margin-top:2px;font-size:13px;color:var(--sub2,#4E5968);line-height:1.5}',
    '.gbx .gbl .pr{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;margin:8px 0 0}.gbx .gbl .pr b{font-size:22px;font-weight:900;letter-spacing:-.5px;font-variant-numeric:tabular-nums;color:var(--text,#191F28)}.gbx .gbl .pr span{font-size:13px;color:var(--sub2,#4E5968)}',
    '.gbx .gbl .ev{margin:2px 0 0;font-size:12.5px;color:var(--sub2,#4E5968);line-height:1.5}',
    '.gbx .gbl dl{margin:8px 0 0;display:grid;gap:4px}.gbx .gbl dl div{display:grid;grid-template-columns:92px 1fr;gap:8px;font-size:13.5px;line-height:1.5}.gbx .gbl dt{color:var(--sub2,#4E5968)}.gbx .gbl dd{margin:0;color:var(--text,#191F28)}',
    '.gbx .gbfc{margin:10px 0 0;padding:8px 10px;border-radius:12px;background:var(--gray2,#F9FAFB);border:1px solid var(--line2,#F0F1F3)}.gbx .gbfc .h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13px;font-weight:700;color:var(--sub,#3E4754)}.gbx .gbfc .h b{font-size:17px;font-weight:900;color:var(--text,#191F28)}',
    '.gbx .gbfc .bar{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;height:8px;margin:6px 0 0}.gbx .gbfc .bar i{border-radius:3px}.gbx .gbfc .bar i:nth-child(1){background:var(--line,#E5E8EB)}.gbx .gbfc .bar i:nth-child(2){background:var(--blue-l,#EEEDFB)}.gbx .gbfc .bar i:nth-child(3){background:#C9C6F2}.gbx .gbfc .bar i:nth-child(4){background:var(--blue,#4338CA)}.gbx .gbfc .bar i:nth-child(5){background:var(--blue-d,#3730A3)}',
    '.gbx .gbfc .pin{position:absolute;top:-5px;width:4px;height:18px;margin-left:-2px;border-radius:2px;background:var(--text,#191F28);box-shadow:0 0 0 2px #fff}.gbx .gbfc .s{margin:6px 0 0;font-size:12.5px;color:var(--sub2,#4E5968)}',
    '.gbx .gbr{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px}.gbx .gbr li{font-size:12.5px;font-weight:700;line-height:1.4;border-radius:8px;padding:3px 8px;background:var(--gray,#F2F4F6);color:var(--sub,#3E4754)}.gbx .gbr li.warn{background:var(--rf-warn-l,#FFFBF2);color:var(--rf-warn,#A15C07);border:1px solid var(--rf-warn-b,#F1D19A)}',
    '.gbx .gbcmp{position:sticky;bottom:72px;z-index:5;display:flex;align-items:center;gap:8px;margin:12px 0 0;padding:10px 12px;border-radius:14px;background:#fff;border:1.5px solid #C9C6F2;box-shadow:0 4px 16px rgba(25,31,40,.08)}@media(min-width:1024px){.gbx .gbcmp{bottom:16px}}',
    '.gbx .gbcmp span{flex:1;min-width:0;font-size:13.5px;font-weight:700;color:var(--sub,#3E4754)}.gbx .gbcmp a{flex:none;display:inline-flex;align-items:center;min-height:46px;padding:0 16px;border-radius:12px;background:var(--blue,#4338CA);color:#fff;font-weight:800;font-size:15px;text-decoration:none}.gbx .gbcmp a[aria-disabled="true"]{background:var(--line,#E5E8EB);color:var(--sub2,#4E5968);pointer-events:none}',
    '.gbx details.gbtr{margin:16px 0 0;border:1.5px solid var(--line,#E5E8EB);border-radius:14px;padding:0 14px;background:#fff}.gbx details.gbtr>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:52px;cursor:pointer;list-style:none;font-size:15.5px;font-weight:800;color:var(--text,#191F28)}.gbx details.gbtr>summary::-webkit-details-marker{display:none}',
    '.gbx details.gbtr>summary::after{content:"펼치기";flex:none;font-size:14px;font-weight:700;color:var(--blue,#4338CA)}.gbx details.gbtr[open]>summary::after{content:"접기"}.gbx details.gbtr dl{margin:0 0 12px;display:grid;gap:10px}.gbx details.gbtr dt{font-size:14px;font-weight:800;color:var(--text,#191F28)}.gbx details.gbtr dd{margin:2px 0 0;font-size:13.5px;line-height:1.6;color:var(--sub,#3E4754)}.gbx details.gbtr dd a{color:var(--blue,#4338CA);font-weight:800}',
    '.gbx .gbwarn{margin:16px 0 0;padding:12px 14px;border:1.5px solid var(--rf-warn-b,#F1D19A);background:var(--rf-warn-l,#FFFBF2);border-radius:14px}.gbx .gbwarn h3{margin:0 0 6px;font-size:16px;color:var(--rf-warn,#A15C07)}.gbx .gbwarn ul{margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:var(--sub,#3E4754)}',
    '.gbx .gbsame{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0 0;min-height:52px;padding:10px 14px;border-radius:14px;border:1.5px solid var(--blue,#4338CA);background:#fff;color:var(--blue-d,#3730A3);text-decoration:none}.gbx .gbsame b{font-size:15.5px;font-weight:800}.gbx .gbsame small{display:block;font-size:13px;font-weight:500;color:var(--sub2,#4E5968);margin-top:2px}.gbx .gbsame .go{flex:none;font-size:20px;font-weight:800}',
    '.gbx p.gbsame0{margin:12px 0 0;font-size:13.5px;color:var(--sub2,#4E5968)}',
    '.gbx .gbload{margin:10px 0 0;min-height:48px;font-size:14px;color:var(--sub2,#4E5968)}',
    '.gflow.gbflow{max-width:960px}'
  ].join('');
  function css() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('gbxCss')) { const s = document.createElement('style'); s.id = 'gbxCss'; s.textContent = CSS; document.head.appendChild(s); }
  }
  /* 자료 불러오기(한 번만) — H: guide.js 도구 {BASE, DATA, getJ, IX, MC, L, unitsOf, script} */
  let XP = null;
  function load(H) {
    return XP || (XP = Promise.all([
      H.unitsOf('s00'),
      H.getJ('mh', H.DATA + 'model_h.json').catch(() => null),
      H.getJ('rxp', H.DATA + 'policy.json').catch(() => null),
      H.getJ('mdl', H.DATA + 'model.json').catch(() => null),
      root.JDJ_RANK || !H.script ? null : H.script('assets/rank-core.js?v=8'),
      /* 조건 검색 엔진(내 집 마련 맞춤 단지와 같은 파일)·지역 메모 */
      root.JDJ_REC || !H.script ? null : H.script('assets/rec-core.js?v=6'),
      root.JDJ_REGION_NOTES || !H.script ? null : H.script('assets/region-notes.js').catch(() => null)
    ]).then(([units, MH, pol, MODEL]) => ({ units, MH, pol, MODEL, IX: H.IX, notes: root.JDJ_REGION_NOTES || null, sus: {} })).catch(e => { XP = null; throw e; }));
  }
  /** 보이는 단지들의 특수 거래 의심 수(구별 시세 파일 — 한 번 받은 구는 다시 받지 않음) */
  async function loadSus(rows, X, H) {
    const need = rows.filter(r => X.sus[r.key] === undefined);
    if (!need.length) return false;
    if (!root.JDJ_PT && H.script) await H.script('assets/pro-tools-core.js?v=3');
    const PT = PTc(), MC = H.MC || MCc(), months = (X.IX && X.IX.months) || [];
    const codes = need.map(r => r.code).filter((c, i, a) => a.indexOf(c) === i);
    await Promise.all(codes.map(c => H.getJ('pg' + c, H.DATA + 'price/' + c + '.json').then(P => {
      need.filter(r => r.code === c).forEach(r => { X.sus[r.key] = susCount(r, P, months, MC, PT); });
    }).catch(() => { need.filter(r => r.code === c).forEach(r => { X.sus[r.key] = null; }); })));
    return true;
  }
  function moneyIn(t) {
    const s = String(t || '').replace(/[,\s원]/g, ''); if (!s) return null;
    const m = /^(\d+(?:\.\d+)?)억(?:(\d+)(천)?(만)?)?$/.exec(s); if (m) return Math.round(+m[1] * 10000 + (m[2] ? (m[3] ? +m[2] * 1000 : +m[2]) : 0));
    const n = /^(\d+(?:\.\d+)?)(천만|천|만)?$/.exec(s); if (!n) return null; const v = +n[1];
    return n[2] === '천만' || n[2] === '천' ? v * 1000 : n[2] === '만' ? v : v <= 100 ? Math.round(v * 10000) : Math.round(v);
  }
  function nqHtml(st, H) {
    const k = next(ID, st); if (!k) return '';
    const q = Q[k], gus = H.IX && H.IX.sgg ? Object.keys(H.IX.sgg).filter(c => /^11/.test(c)).map(c => H.IX.sgg[c].name).sort((x, y) => x.localeCompare(y, 'ko')) : [];
    return `<div class="gnq" data-bk="${esc(k)}"><p class="t">${esc(q.t)}</p>${q.hint ? `<p class="h" style="margin:-4px 0 8px;font-size:13px;color:var(--sub2,#4E5968)">${esc(q.hint)}</p>` : ''}<div class="o">${q.opts.map(o => `<button type="button" data-bv="${esc(o[0])}">${esc(o[1])}</button>`).join('')}${q.free === 'money' ? `<span class="fr"><input type="text" inputmode="numeric" placeholder="직접: 예 ${k === 'rinc' ? '8천만' : '9억'}" aria-label="금액 직접 입력"><button type="button" data-bfree="1">적용</button></span>` : ''}${q.free === 'gu' ? `<select aria-label="구 고르기" data-bgu="1"><option value="">다른 구 고르기</option>${gus.map(n => `<option>${esc(n)}</option>`).join('')}</select>` : ''}</div>${k === 'rcash' ? '' : '<button type="button" class="sk" data-bskip="1">이대로 보기</button>'}</div>`;
  }
  function verdictHtml(st, C, CL, tag) {
    if (!(st.cash > 0)) return '';
    const mc = mainCliff(CL, C && C.P);
    if (!C || !C.P) return `<div class="gbv"><span class="k">현금 ${esc(won(st.cash))} + 대출 · 서울</span><span class="big">계산 불가</span><p class="one">${esc(headOf(st, C))}</p></div>`;
    const kv = keysOf(st, C).map(n => `<div><small>${esc(n.k)}</small><b>${esc(n.v)}</b><span>${esc(n.s)}</span></div>`).join('');
    return `<div class="gbv"><span class="k">현금 ${esc(won(st.cash))} + 대출 · 서울 전역 투기과열지구 · ${st.own === 'first' ? '생애최초' : '무주택'} 기준</span><${tag || 'span'} class="big">최대 ${esc(won(C.P))}</${tag || 'span'}>
      <p class="one">${esc(headOf(st, C))}</p>${mc ? `<p class="cl">${esc(cliffLine(mc))}</p>` : ''}<p class="sub">${esc(incomeLine(st, C))}</p></div><div class="gbk">${kv}</div>`;
  }
  function cliffHtml(CL) {
    const rows = []; CL.forEach(x => { rows.push(x.lo, x.hi); });
    return `<table class="gbct"><caption style="text-align:left;font-size:14px;font-weight:800;padding:0 0 4px;color:var(--text,#191F28)">대출 상한이 바뀌는 집값(문턱) 앞뒤</caption><thead><tr><th scope="col">집값</th><th scope="col">대출 상한</th><th scope="col">받을 수 있는 대출</th><th scope="col">필요한 내 돈</th><th scope="col">내 돈으로</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(wonS(r.P))}</td><td>${esc(wonS(r.cap))}</td><td>${esc(wonS(r.L))}</td><td>${esc(wonS(Math.round(r.need)))}</td><td class="${r.ok ? 'ok' : 'no'}">${r.ok ? '살 수 있어요' : '못 사요'}</td></tr>`).join('')}</tbody></table>
      <p class="gbin">필요한 내 돈 = 집값 − 대출 + 취득세·중개보수·이사 등. ${CL.filter(x => !x.lo.ok || !x.hi.ok).map(x => x.top ? `${wonS(x.b)} 넘는 집 가운데서는 ${wonS(x.top)}까지 돼요.` : x.lo.ok ? `${wonS(x.b)}~${x.nextB ? wonS(x.nextB) : ''} 집은 이 돈으로 살 수 없어요.` : '').filter(Boolean).join(' ')}</p>`;
  }
  function fcHtml(r, T) {
    if (r.fv == null || !T || !T.ok) return '';
    return `<div class="gbfc"><div class="h"><span>미래가치 점수 · 참고</span><b>${esc(r.fv)}<small style="font-size:12.5px;font-weight:700">/100</small></b></div><div class="bar" role="img" aria-label="100점 중 ${esc(r.fv)}점"><i></i><i></i><i></i><i></i><i></i><span class="pin" style="left:${Math.max(0, Math.min(100, r.fv))}%"></span></div><p class="s">과거 ${esc(T.n)}번 중 ${esc(T.hit)}번 맞음(${esc(T.where)} 단지) · 앞날을 약속하지 않아요</p></div>`;
  }
  function cardHtml(r, i, H, R, picks) {
    const href = H.mineUrl ? H.mineUrl(r) : (H.BASE || '') + 'mine/';
    const rk = risks(r, (LC() && LC().R.CAP.v) || []), on = picks && picks.indexOf(r.key) >= 0;
    const star = root.JDJ_WATCH && root.JDJ_WATCH.star ? root.JDJ_WATCH.star({ sd: 's00', code: r.code, dong: r.dong, jibun: r.jibun, apt: r.apt, band: r.band }, { small: true }) : '';
    return `<li><div class="t"><span class="n">${i + 1}</span><a href="${esc(href)}">${esc(r.apt)}</a>${picks ? `<label class="pk${on ? ' on' : ''}"><input type="checkbox" data-bpick="${esc(r.key)}"${on ? ' checked' : ''}>비교</label>` : ''}${star}</div>
      <span class="m"><span class="sb">${esc(r.band)}</span> ${esc(r.gu)} ${esc(r.dong)} · ${r.by ? esc(r.by) + '년 준공' : '준공 정보 없음'}${r.hh ? ' · ' + esc(r.hh.toLocaleString()) + '세대' : ''} · ${esc(stationT(r))}</span>
      <div class="pr"><b>${esc(won(r.price))}</b><span>최근 실거래 중간값</span></div>
      <p class="ev">${r.p3 ? `${esc(ymDot(r.p3.from))}~${esc(ymDot(r.p3.to))} 거래 ${esc(r.n3)}건` : '거래 기간 정보 없음'} · 국토교통부 실거래 · 자료 갱신 ${esc(dDot((H.IX || {}).updated))}</p>
      <dl>${r.range ? `<div><dt>최근 1년 범위</dt><dd>${esc(wonS(r.range.lo))} ~ ${esc(wonS(r.range.hi))}(거래 있던 ${esc(r.range.months)}개월 시세)</dd></div>` : ''}<div><dt>이 가격이면</dt><dd>대출 ${esc(wonS(r.loan))} · 매달 ${esc(wonS(Math.round(r.pay)))}(연 ${RATE}% 가정) · 내 돈 ${esc(wonS(Math.round(r.need)))}</dd></div></dl>
      ${fcHtml(r, R.track)}${rk.length ? `<ul class="gbr">${rk.map(x => `<li class="${x.lv}">${esc(x.t)}</li>`).join('')}</ul>` : ''}</li>`;
  }
  function trustHtml(R, X, H) {
    const B = H.BASE || '';
    return `<details class="gbtr"><summary>이 답을 믿을 수 있는 이유</summary><dl>${trustOf(R, X).map(x => `<div><dt>${esc(x.h)}</dt><dd>${x.h === '위험 신호 기준' ? `<ul style="margin:4px 0 0;padding-left:18px">${x.t.replace(/\.$/, '').split(' · ').map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : esc(x.t)}${(x.a || []).map(a => ` <a href="${esc(B + a[1])}">${esc(a[0])} ›</a>`).join('')}</dd></div>`).join('')}</dl></details>`;
  }
  /** 다음 단계: 대출 계산(값 채움) · 관심 단지 알림 · 확인된 전문가 — 단지 비교는 목록 아래 고르기 칸 */
  function nextLinks(st, R, C, H) {
    const B = H.BASE || '', r0 = R.rows[0], L = [];
    const p = r0 ? r0.price : C && C.P ? C.P : '';
    L.push({ t: '대출 한도 자세히 계산', s: r0 ? `${r0.apt} ${r0.band} ${won(r0.price)} 기준으로 채워 열어요` : p ? `${won(p)} 집 기준으로 채워 열어요` : 'LTV·DSR·생애최초까지', href: B + `loan/?p=${p}&g=${r0 ? r0.code : SEOUL}&o=${st.own === 'first' ? 'first' : 'none'}${r0 ? `&n=${encodeURIComponent(r0.apt)}&b=${encodeURIComponent(r0.band)}&a=${Math.round(r0.area)}` : ''}`, k: 'calc' });
    L.push({ t: '관심 단지 새 거래 알림 켜기', s: root.JDJ_WATCH ? '단지 카드의 ☆관심을 누르면 새 거래·신고가를 알려 드려요' : '단지 화면에서 ☆관심을 누르면 새 거래·신고가를 알려 드려요', href: B + 'my/watch/', k: 'alert' });
    const pro = H.expertLink ? H.expertLink('loan') : null; if (pro) L.push(pro);
    return L;
  }
  function nextHtml(L) {
    return `<nav class="rf-next" aria-label="다음 단계" style="margin-top:16px">${L.map(n => `<a href="${esc(n.href)}"${n.ext ? ' target="_blank" rel="noopener"' : ''} data-track="guide_next_${ID}_${esc(n.k)}"><b>${esc(n.t)}</b><small>${esc(n.s || '')}</small></a>`).join('')}</nav>`;
  }
  function cmpUrl(rows, picks) {
    const A = root.JDJ_ASK_CORE; const sel = rows.filter(r => picks.indexOf(r.key) >= 0).slice(0, 3);
    if (!A || !A.target || sel.length < 2) return '';
    return A.target(sel.map(r => ({ d: { sd: 's00', code: r.code, dong: r.dong, jibun: r.jibun, apt: r.apt, key: ['s00', r.code, r.dong, r.jibun, r.apt].join('|') }, band: r.band })), null, 'guide');
  }
  /** 카드 본문(즉답·길잡이 화면 공통) */
  function body(st, X, H, full) {
    const L = H.L || LC(), C = capOf(st, L), CL = cliffs(st, L);
    const R = X && X.units ? rowsOf(st, X, { L, MC: H.MC }) : null;
    if (R && X.sus) R.rows.forEach(r => { if (X.sus[r.key] != null) r.sus = X.sus[r.key]; });
    const lim = full ? 10 : 3, show = R ? R.rows.slice(0, lim) : [];
    let list = '';
    if (!(st.cash > 0)) list = '';
    else if (!R) list = '<p class="gbload">서울 단지 시세를 불러오고 있어요…</p>';
    else if (!R.n) list = `<p class="gtn" style="margin-top:12px">지금 조건으로 바로 살 수 있는 단지를 찾지 못했어요. 평형·지역·신축 조건을 하나 풀어 보세요.${R.near && R.near.length ? ` 조금만 더 준비하면 되는 곳: ${R.near.map(x => `${x.apt}(${x.gu} ${x.band} · 내 돈 ${wonS(Math.round(x.short))} 부족)`).join(', ')}.` : ''}</p>`;
    else {
      const ttl = `조건에 맞는 서울 ${sizeT(st)} 단지 ${R.n.toLocaleString()}곳${st.gname && st.gname !== '서울 전체' ? `(${st.gname})` : ''}`;
      list = `<h3 class="gtt" style="margin-top:16px;font-size:18px">${esc(ttl)}</h3><p class="gtn">조건에 맞는 ${esc(R.total.toLocaleString())}개 평형 중 골랐어요. ${esc(basisOf(R, X))}</p>
        ${R.th && R.th.v === 'apt' ? '<p class="gtn">토지거래허가: 정책 표 기준 서울 아파트 전역 지정 — 허가를 받아 산 뒤 직접 살아야 해요(모든 단지 공통).</p>' : ''}
        <ul class="gbl">${show.map((r, i) => cardHtml(r, i, H, R, full ? (st._pick || []) : null)).join('')}</ul>
        ${!full && R.n > lim ? `<p class="gtn">나머지 ${(R.n - lim).toLocaleString()}곳은 ‘단지 목록 전체와 근거 보기’에서 볼 수 있어요.</p>` : ''}`;
    }
    const su = R ? sameUrl(st, H.IX || (X && X.IX), H.BASE || '') : null;
    if (R) list += su ? `<a class="gbsame" href="${esc(su)}" data-gsame="1" data-track="guide_${ID}_same"><span><b>같은 조건으로 검색 화면에서 보기</b><small>내 집 마련 맞춤 단지 화면을 지금 조건(현금·소득·지역·평형·신축·생애최초)으로 채워 열어요 — 같은 계산이라 같은 단지가 나와요</small></span><span class="go" aria-hidden="true">›</span></a>`
      : st.cash > 0 ? '<p class="gbsame0">연 소득을 고르면 이 목록을 내 집 마련 맞춤 단지(조건 검색) 화면에서 같은 조건으로 열 수 있어요. 그 화면은 소득 기준(DSR)까지 넣어 계산해요.</p>' : '';
    const cl = st.cash > 0 && C && C.P ? `<details class="gsrc" style="margin-top:10px"${full ? ' open' : ''}><summary>15억 문턱 숫자로 보기</summary>${cliffHtml(CL)}</details>` : '';
    return { R, C, CL, show, html: `${st.rec ? `<p class="gbrec">${esc(REC_LINE)}</p>` : ''}${verdictHtml(st, C, CL, full ? 'h2' : 'span')}${cl}${nqHtml(st, H)}${list}` };
  }
  function wireBox(box, getSt, setSt, redraw, R) {
    box.querySelectorAll('[data-gsame]').forEach(a => a.addEventListener('click', () => handSame(getSt())));
    box.querySelectorAll('[data-bpick]').forEach(cb => cb.addEventListener('change', () => {
      const st = getSt(); let p = (st._pick || []).slice(); const k = cb.dataset.bpick;
      if (cb.checked) { if (p.length >= 3) { cb.checked = false; return; } p.push(k); } else p = p.filter(x => x !== k);
      st._pick = p; setSt(st); redraw(true);
    }));
    const q = box.querySelector('.gnq[data-bk]'); if (!q) return;
    const k = q.dataset.bk, put = v => { setSt(set(ID, getSt(), k, v)); redraw(); };
    q.querySelectorAll('[data-bv]').forEach(b => b.addEventListener('click', () => put(b.dataset.bv)));
    const fr = q.querySelector('[data-bfree]'); if (fr) fr.addEventListener('click', () => { const v = moneyIn(q.querySelector('input').value); if (v) put(k === 'rinc' && v >= 1000000 ? Math.round(v / 10000) : v); });
    const gs = q.querySelector('[data-bgu]'); if (gs) gs.addEventListener('change', () => { if (gs.value) put(gs.value); });
    const sk = q.querySelector('[data-bskip]'); if (sk) sk.addEventListener('click', () => { const st = getSt(); st._skip = (st._skip || []).concat([k]); setSt(st); redraw(); });
  }
  function resultCss(H) {
    if (typeof document === 'undefined' || document.querySelector('link[href*="result.css"]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = (H.BASE || '') + 'assets/result.css?v=3'; document.head.appendChild(l);
  }
  /** 첫 화면 즉답 카드: 대출 계산은 바로, 단지 목록은 자료가 오면 */
  async function instant(ans, H) {
    css(); resultCss(H);
    let st = init(ID, H.slots || {}), X = null;
    const draw = () => {
      if (!H.live()) return;
      const B = body(st, X, H, false);
      ans.innerHTML = `<section class="ginst gbx"><div class="gi-hd"><span class="bd ok">바로 답</span><span class="tt">${esc(H.sc.t)}</span></div>${B.html}
        <div class="gbtn"><a class="p" href="${esc(H.solveUrl(ID, '&from=inst'))}" data-bgo="1" data-track="guide_inst_go">단지 목록 전체와 근거 보기 ›</a><a href="${esc((H.BASE || '') + 'loan/')}" data-track="guide_inst_calc">대출 한도 계산기 ›</a></div>${H.fbHtml(ID, 'top')}</section>`;
      H.fbWire(ans);
      wireBox(ans, () => st, s => { st = s; H.stat('guide_narrow', { k: ID }); }, draw);
      const go = ans.querySelector('[data-bgo]'); if (go) go.addEventListener('click', () => H.hand(st));
    };
    draw();
    try { X = await load(H); } catch (e) { X = null; }
    draw();
  }
  /** 길잡이 화면(solve/?s=budget_apts) */
  async function flow(el, H) {
    css();
    const KEY = 'jdj_gbx_' + ID;
    let st = null;
    try { const sv = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (sv && sv.id === ID) st = sv; } catch (e) {}
    if (H.inSt && H.inSt.id === ID) st = H.inSt;
    if (!st) st = init(ID, H.slots || {});
    if (st.cash == null && H.mem && H.mem.m && H.mem.m.cash != null) { st.cash = +H.mem.m.cash; st._mc = 1; }
    if (st.inc == null && H.mem && H.mem.m && H.mem.m.income != null) { st.inc = +H.mem.m.income; st._mc = 1; }
    if (H.slots && H.slots.raw && /(추천|최고|베스트|top|탑\d)/i.test(H.slots.raw)) st.rec = 1;
    el.innerHTML = `<div class="gflow gbflow">${H.head}<p class="gsub">서울 단지 시세를 불러오는 중이에요…</p></div>`; el.hidden = false;
    let X = null;
    const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const draw = keep => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0;
      const B = body(st, X, H, true), Lk = nextLinks(st, B.R || { rows: [] }, B.C, H);
      const picks = st._pick || [], cu = B.R ? cmpUrl(B.R.rows, picks) : '';
      el.innerHTML = `<div class="gflow gbflow">${H.head}
        <section class="gcard gbx" aria-label="바로 답"><span class="gk">바로 답 · 참고</span>${B.html}
          ${B.R && B.R.n > 1 ? `<div class="gbcmp"><span>${picks.length ? `고른 단지 ${picks.length}곳(최대 3곳)` : '카드의 ‘비교’를 2~3곳 고르면 나란히 비교해요'}</span><a href="${esc(cu || '#')}" aria-disabled="${cu ? 'false' : 'true'}" data-track="guide_${ID}_compare">고른 단지 비교 ›</a></div>` : ''}
          ${B.R ? trustHtml(B.R, X, H) : ''}
          <div class="gbwarn"><h3>손해 피하는 주의점</h3><ul>${warnOf(st, B.C).map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>
          <p class="gnote">조건: ${esc(chipsOf(st).join(' · '))}${st._mc ? ' · 가진 돈·소득은 이 기기에 저장된 값으로 채웠어요' : ''} <button type="button" data-bedit="1">조건 처음부터</button></p>
          <details class="gsrc"><summary>출처 보기</summary><ul>${SRC.map(k => (H.D.src || {})[k]).filter(Boolean).map(s => `<li><a href="${esc(/^https?:/.test(s.url) ? s.url : H.BASE + s.url)}" target="_blank" rel="noopener">${esc(s.nm)}</a></li>`).join('')}</ul></details></section>
        ${H.fbHtml(ID, 'solve')}${nextHtml(Lk)}${H.afterHtml(H.sc, H.D)}
        <p class="gdis">${esc(H.site())}는 공공데이터와 공식 대출 규칙을 정해진 계산으로 정리해 보여 드리는 정보 제공 서비스이며, 특정 단지의 매수를 권유하지 않아요. 목록 순서는 고른 정렬 기준일 뿐 추천 순위가 아니에요. 대출·세금의 최종 판단은 은행과 자격 있는 전문가와 확인해 주세요.</p></div>`;
      H.fbWire(el);
      if (keep && typeof window !== 'undefined') window.scrollTo(0, y);
      wireBox(el, () => st, s => { st = s; save(); H.stat('guide_narrow', { k: ID }); }, draw, B.R);
      const ed = el.querySelector('[data-bedit]'); if (ed) ed.addEventListener('click', () => { st = init(ID, {}); save(); draw(); window.scrollTo(0, 0); });
      if (B.R && X) loadSus(B.show, X, H).then(ch => { if (ch) draw(true); }).catch(() => {});
    };
    H.stat('guide_solve', { s: ID });
    draw(); save();
    try { X = await load(H); } catch (e) { X = null; }
    if (!root.JDJ_WATCH && H.script) { try { if (!root.JDJ_WATCH_CORE) await H.script('assets/watch-core.js?v=2'); await H.script('assets/watch.js?v=9'); } catch (e) {} }
    draw(true);
  }
  /** 대화창 미니 카드 */
  async function chatCard(ST, H) {
    const st = ST.nf, L = H.L || LC(), C = capOf(st, L);
    if (!(st.cash > 0)) return { head: headOf(st, C), n: 0, ex: st.rec ? REC_LINE : '' };
    const X = await load(H), R = rowsOf(st, X, { L, MC: H.MC }), mc = mainCliff(cliffs(st, L), C && C.P);
    return { head: headOf(st, C), nums: C && C.P ? [{ k: '그때 대출', v: won(C.loan) }, { k: '살 수 있는 단지', v: `${R.n.toLocaleString()}곳` }] : [],
      ex2: R.rows.slice(0, 4).map(r => [`${r.apt} (${r.gu}) ${r.band}`, wonS(r.price)]),
      ex: [st.rec ? REC_LINE : '', cliffLine(mc), incomeLine(st, C), `내 집 마련 맞춤 단지와 같은 순서(미래가치 점수 순) · 최근 3개월 실거래 중간값 · 자료 갱신 ${dDot((X.IX || {}).updated)}`].filter(Boolean).join(' '), n: R.n };
  }
  /** 대화창 질문 꼴(guide-core chatNext 가 씀) */
  function chatQ(id, st) { const k = next(id, st); if (!k) return null; const q = Q[k]; return { key: k, nf: 1, ext: 1, q, quick: q.opts.slice() }; }

  const API = { ID, IDS, is, Q, ORDER, RATE, SEOUL, init, next, set, answer, read, ctxOf, capOf, cliffs, mainCliff, cliffLine, rowsOf, searchQ, hzUnits, hzNow, sameUrl, sameFin, ORDER_LINE, risks, susCount, span3, trackOf,
    chipsOf, headOf, keysOf, incomeLine, warnOf, trustOf, basisOf, REC_LINE, SRC, solve, chatQ, chatCard, instant, flow, load, moneyIn, nextLinks, cmpUrl, stationT };
  root.JDJ_GBUDGET = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
