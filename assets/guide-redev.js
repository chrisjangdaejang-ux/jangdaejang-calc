/* 고민 해결 길잡이 — 재개발·재건축 예산 고민 2개(assets/guide.js·guide-core.js 가 scenarios.json 의 ext:"redev" 시나리오를 이 파일로 넘겨요)
   ① redev_budget  "3~5억 원으로 재개발 투자한다면 어디가 좋을까요?"
   ② rebuild_live  "재건축 실거주하면서 몸테크 하기에, 보유 금액에 맞는 단지는?"
   원칙: 투자 권유·'여기 사세요' 없음. 예산 조건에 맞는 구역·단지를 공개 자료로 정리(참고)하고, 정렬은 고른 기준일 뿐 추천 순위가 아니에요.
   숫자는 모두 공개 자료·기존 엔진 그대로:
     - 구역·단계·착공까지 기간 통계: data/redev/zones.json(서울시 정비사업 추진현황) + assets/redev-core.js speed()
     - 구역 안 빌라 실거래: data/redev/budget.json(엔진이 만들면) 또는 data/redev-budget.json(tools/redev-budget-build.js — 국토교통부 연립·다세대 매매 실거래 최근 3년)
     - 아파트 시세: 점수 자료 sNN.json + assets/mine-core.js bandSummary(내 집 시세와 같은 계산) · 준공연도 f.by
     - 대출로 살 수 있는 최대 집값: assets/loan-core.js ctx·maxPrice(대출 한도 계산기와 같은 함수)
     - 토지거래허가구역·투기과열지구: data/policy.json(정책 표 — 공식 발표를 확인한 정책만)
   법 규정 중 확실하지 않은 것은 '확인 필요' 표시와 법령 링크(scenarios.json src).
   node tools/guide-test.js 가 이 파일을 함께 확인해요. window.JDJ_GREDEV */
(function (root) {
  'use strict';
  const RDc = () => root.JDJ_REDEV || (typeof require === 'function' ? require('./redev-core.js') : null);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function won(man) {
    if (man == null || !isFinite(man)) return '';
    let v = Math.round(Math.abs(man)); const e = Math.floor(v / 10000), m = v % 10000;
    return (man < 0 ? '−' : '') + (e ? e.toLocaleString('ko-KR') + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString('ko-KR') + '만' : (e ? '' : '0')) + ' 원';
  }
  const wonS = man => won(man).replace(/ 원$/, '');
  const ymK = s => { s = String(s || ''); return /^\d{6}/.test(s) ? `${s.slice(0, 4)}년 ${+s.slice(4, 6)}월` : ''; };
  const todayY = () => +new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 4);
  const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : Math.round((s[k - 1] + s[k]) / 2); };

  const IDS = ['redev_budget', 'rebuild_live'];
  const is = id => IDS.indexOf(id) >= 0;
  /* ---------- 좁히는 질문(대화창 규칙: 한 번에 하나, 결과를 크게 바꾸는 순서) ---------- */
  const GROUPS = { '강남3구': ['강남구', '서초구', '송파구'], '마용성': ['마포구', '용산구', '성동구'], '노도강': ['노원구', '도봉구', '강북구'], '금관구': ['금천구', '관악구', '구로구'], '강남권': ['강남구', '서초구', '송파구'], '동북권': ['성북구', '동대문구', '중랑구', '강북구', '도봉구', '노원구', '광진구', '성동구'], '서남권': ['양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구'] };
  const GU_Q = { type: 'choice', t: '어느 쪽을 보세요?', opts: [['all', '서울 전체'], ['강남3구', '강남3구'], ['마용성', '마포·용산·성동'], ['노도강', '노원·도봉·강북'], ['금관구', '금천·관악·구로']], free: 'gu' };
  const WAIT_Q = { type: 'choice', t: '착공(공사 시작)까지 얼마나 기다릴 수 있나요?', opts: [['5', '5년 안쪽'], ['10', '10년까지'], ['0', '상관없어요']], hint: '착공 예상은 과거 비슷한 구역의 기간 통계예요(공사 기간은 따로)' };
  const Q = {
    rbud: { type: 'money', t: '사려는 빌라 가격대는 얼마쯤이세요?', opts: [['0-30000', '3억 이하'], ['30000-50000', '3~5억'], ['50000-70000', '5~7억'], ['70000-', '7억 넘게']], free: 'money' },
    rgu: GU_Q,
    rlive: { type: 'choice', t: '산 뒤에 직접 들어가 살 수 있나요?', opts: [['y', '네, 들어가 살 수 있어요'], ['n', '아니요, 세입자를 두고 사야 해요']], hint: '토지거래허가구역은 허가 뒤 직접 살아야 해서 세입자를 둔 채 사기 어려워요' },
    rwait: WAIT_Q,
    rloan: { type: 'choice', t: '살 때 대출이 필요하세요?', opts: [['y', '네, 필요해요'], ['n', '아니요, 내 돈으로 사요']] },
    rcash: { type: 'money', t: '집 사는 데 쓸 수 있는 돈(현금)은 얼마인가요?', opts: [['20000', '2억'], ['30000', '3억'], ['50000', '5억'], ['70000', '7억']], free: 'money', hint: '금액은 이 기기에만 저장돼요' },
    rinc: { type: 'money', t: '부부 합산 연 소득(세전)은 얼마인가요?', opts: [['5000', '5천만 원'], ['7000', '7천만 원'], ['10000', '1억 원'], ['15000', '1억 5천만 원']], free: 'money', hint: '대출 한도(DSR)를 계산할 때만 써요. 이 기기에만 저장돼요' },
    rsize: { type: 'choice', t: '함께 살 가족은 몇 명인가요?', opts: [['s', '1~2명(전용 60㎡ 이하도 괜찮아요)'], ['m', '3~4명(전용 60~85㎡)'], ['l', '5명 이상(전용 85㎡ 넘게)'], ['0', '상관없어요']], hint: '오래된 단지는 평형이 작은 곳이 많아요' }
  };
  const ORDER = { redev_budget: ['rbud', 'rgu', 'rlive', 'rwait', 'rloan'], rebuild_live: ['rcash', 'rinc', 'rgu', 'rsize', 'rwait'] };
  const SORTS = { redev_budget: [['stage', '단계 높은 순'], ['soon', '착공 예상 이른 순']], rebuild_live: [['stage', '단계 높은 순'], ['old', '오래된 순'], ['cheap', '시세 낮은 순']] };
  const has = (st, k) => ({ rbud: st.bud != null, rgu: st.gus != null, rlive: st.live != null, rwait: st.wait != null, rloan: st.loan != null, rcash: st.cash != null, rinc: st.inc != null, rsize: st.size != null })[k];

  /** 문장에서 읽기: 금액 범위·지역·실거주·기다릴 기간·대출·가족 수 */
  function read(st, sl, id) {
    sl = sl || {}; const flat = String(sl.raw || '').replace(/\s/g, ''), M = sl.money || {};
    let got = false;
    const rg = /(\d+(?:\.\d+)?)\s*(?:억)?\s*[~\-–]\s*(\d+(?:\.\d+)?)\s*억/.exec(sl.raw || '') || /(\d+(?:\.\d+)?)억?에서(\d+(?:\.\d+)?)억/.exec(flat);
    if (id === 'redev_budget') {
      if (rg) { st.bud = [Math.round(+rg[1] * 10000), Math.round(+rg[2] * 10000)]; got = true; }
      else { const v = M.price || M.cash || M.salep || M.dep; if (v) { st.bud = /(이상|넘는|넘게|초과)/.test(flat) ? [v, null] : [0, v]; got = true; } }
      if (/대출(없이|안받|필요없|은안)|내돈으로|현금으로만/.test(flat)) { st.loan = 'n'; got = true; } else if (/대출(받|필요|끼|을받|도받)/.test(flat)) { st.loan = 'y'; got = true; }
    } else {
      const raw = String(sl.raw || ''), amt = (n, u, n2) => Math.round(u === '억' ? +n * 10000 + (n2 ? +n2 * 1000 : 0) : /천/.test(u) ? +n * 1000 : +n);
      const mc = /(현금|가진\s*돈|보유\s*금액|보유|모은\s*돈|예산|자금|종잣돈)\s*(?:은|는|이|이요|만)?\s*(\d+(?:\.\d+)?)\s*억(?:\s*(\d)\s*천)?/.exec(raw);
      const mi = /(연봉|연\s*소득|소득|맞벌이)\s*(?:은|는|이|합쳐서|합산)?\s*(\d+(?:\.\d+)?)\s*(억|천만|천|만)(?:\s*(\d)\s*천)?/.exec(raw);
      if (mc) { st.cash = amt(mc[2], '억', mc[3]); got = true; }
      if (mi) { st.inc = amt(mi[2], mi[3], mi[4]); got = true; }
      if (st.cash == null) { if (M.cash != null || M.price != null) { st.cash = M.cash != null ? M.cash : M.price; got = true; } else if (rg) { st.cash = Math.round(+rg[2] * 10000); got = true; } }
      if (st.inc == null && M.income != null && M.income !== st.cash) { st.inc = M.income; got = true; }
      const fam = /(\d)\s*(?:인|명)\s*(?:가족|가구|식구)?/.exec(sl.raw || '') || /가족\s*(\d)/.exec(sl.raw || '');
      if (fam && /(가족|식구|인가구|명이|명과|명|인)/.test(flat)) { const n = +fam[1]; if (n >= 1 && n <= 9) { st.size = n <= 2 ? 's' : n <= 4 ? 'm' : 'l'; got = true; } }
      if (sl.area) { st.size = sl.area <= 60 ? 's' : sl.area <= 85 ? 'm' : 'l'; got = true; }
      if (sl.own === 'first') st.own = 'first'; else if (sl.own === 'one') st.own = 'one';
      if (/생애최초|생애첫|첫집/.test(flat)) st.own = 'first';
    }
    for (const g of Object.keys(GROUPS)) if (flat.indexOf(g) >= 0) { st.gus = GROUPS[g].slice(); st.gname = g === '강남권' ? '강남3구' : g; got = true; break; }
    if (!st.gus && sl.region && /^11/.test(String(sl.region.code || ''))) { st.gus = [sl.region.name]; st.gname = sl.region.name; got = true; }
    if (/서울전체|서울어디든|서울아무데/.test(flat)) { st.gus = []; st.gname = '서울 전체'; got = true; }
    if (/(실거주|직접살|들어가살|들어가서살|살면서|몸테크|몸빵)/.test(flat)) { st.live = 'y'; got = true; }
    else if (/(전세끼|전세를끼|갭투자|갭으로|세입자를두|세끼고|월세끼)/.test(flat)) { st.live = 'n'; got = true; }
    const w = /(\d+)\s*년\s*(?:안|이내|정도|쯤|까지|은|이상)?\s*(?:기다|버틸|걸려도|투자)/.exec(sl.raw || '') || /(\d+)년(?:안|이내|정도|쯤|까지)?(?:기다|버틸)/.exec(flat);
    if (w) { st.wait = +w[1] <= 6 ? 5 : 10; got = true; } else if (/(오래기다려도|기간상관없|얼마나걸려도|오래걸려도)/.test(flat)) { st.wait = 0; got = true; }
    return got;
  }
  function init(id, sl, D) {
    const st = { id, bud: null, gus: null, gname: '', live: null, wait: null, loan: null, cash: null, inc: null, size: null, own: 'none', sort: 'stage', _skip: [] };
    read(st, sl, id);
    return st;
  }
  function next(id, st) { return (ORDER[id] || []).find(k => !has(st, k) && (st._skip || []).indexOf(k) < 0) || ''; }
  /** 답 하나(단추 값 또는 직접 입력) */
  function set(id, st, key, val) {
    const o = Object.assign({}, st, { _skip: (st._skip || []).slice() });
    if (key === 'rbud') { if (Array.isArray(val)) o.bud = val; else { const m = String(val).split('-'); o.bud = [+m[0] || 0, m[1] === '' || m[1] == null ? null : +m[1]]; } }
    if (key === 'rgu') { if (val === 'all' || val === '') { o.gus = []; o.gname = '서울 전체'; } else if (GROUPS[val]) { o.gus = GROUPS[val].slice(); o.gname = val; } else { o.gus = [val]; o.gname = val; } }
    if (key === 'rlive') o.live = val === 'n' ? 'n' : 'y';
    if (key === 'rwait') o.wait = +val || 0;
    if (key === 'rloan') o.loan = val === 'n' ? 'n' : 'y';
    if (key === 'rcash') o.cash = +val || 0;
    if (key === 'rinc') o.inc = +val || 0;
    if (key === 'rsize') o.size = val === '0' ? '0' : val;
    return o;
  }
  /** 대화창 직접 입력: 지금 물은 칸(key)에 맞춰 읽기 · 읽었으면 true */
  function answer(id, st, text, sl, key) {
    const t = String(text || '').trim(), flat = t.replace(/\s/g, '');
    const before = JSON.stringify(st);
    const s2 = Object.assign({}, sl || {}, { raw: t });
    read(st, s2, id);
    const num = /^(\d+(?:\.\d+)?)(억|억원|억정도|억쯤)?(이하|까지|정도|쯤)?$/.exec(flat);
    if (key === 'rbud' && st.bud == null && num && +num[1] > 0 && +num[1] <= 100) st.bud = [0, Math.round(+num[1] * 10000)];
    if (key === 'rcash' && st.cash == null && num && +num[1] > 0 && +num[1] <= 100) st.cash = Math.round(+num[1] * 10000);
    if (key === 'rinc' && st.inc == null) { const ms = sl && sl.moneys && sl.moneys[0]; if (ms) st.inc = ms.v; else if (num) st.inc = +num[1] <= 30 ? Math.round(+num[1] * 10000) : Math.round(+num[1]); }
    if (key === 'rgu' && st.gus == null && /전체|어디든|상관없/.test(flat)) { st.gus = []; st.gname = '서울 전체'; }
    if (key === 'rlive' && st.live == null) { if (/^(네|예|응|가능|돼|되|살수|들어가)/.test(flat)) st.live = 'y'; else if (/^(아니|아뇨|못|안돼|어려)/.test(flat)) st.live = 'n'; }
    if (key === 'rloan' && st.loan == null) { if (/^(네|예|응|필요|받)/.test(flat)) st.loan = 'y'; else if (/^(아니|아뇨|없|필요없|안)/.test(flat)) st.loan = 'n'; }
    if (key === 'rwait' && st.wait == null) { const m = /(\d+)/.exec(flat); if (m) st.wait = +m[1] <= 6 ? 5 : 10; else if (/상관없|오래/.test(flat)) st.wait = 0; }
    if (key === 'rsize' && st.size == null) { const m = /(\d)/.exec(flat); if (m) st.size = +m[1] <= 2 ? 's' : +m[1] <= 4 ? 'm' : 'l'; else if (/상관없/.test(flat)) st.size = '0'; }
    return JSON.stringify(st) !== before;
  }

  /* ---------- 정책 표: 토지거래허가구역·투기과열지구 ---------- */
  const act = p => p && p.status === 'active' && (p.stage === '시행' || !p.stage);
  const inArea = (p, g, dong) => (p.in || []).some(x => x === 'all' || x === String(g).slice(0, 2) || x === g || (dong && x === g + ':' + dong)) && (p.not || []).indexOf(g) < 0;
  /** 그 구(동)의 토지거래허가 지정: kind 'villa'|'apt' → {v:'dong'|'apt'|'none', t, pid} */
  function toh(pol, g, dong, kind) {
    const L = ((pol && pol.policies) || []).filter(p => act(p) && (p.types || []).indexOf('토허') >= 0 && p.dir === 'tight');
    const dongP = L.find(p => (p.in || []).some(x => x.indexOf(':') > 0) && inArea(p, g, dong) && (p.in || []).indexOf(g + ':' + dong) >= 0);
    const aptP = L.find(p => inArea(p, g, '') && /아파트/.test((p.plain || '') + (p.name || '')) && !(p.in || []).some(x => x.indexOf(':') > 0));
    if (kind === 'apt') {
      if (aptP || dongP) return { v: 'apt', t: '지정 · 허가 뒤 직접 거주', pid: (aptP || dongP).id };
      return { v: 'none', t: '정책 표에 지정 없음', pid: '' };
    }
    if (dongP) return { v: 'dong', t: '동 일부 지정 · 확인 필요', pid: dongP.id };
    if (aptP) return { v: 'apt', t: '아파트만 지정 · 구역 지정은 확인 필요', pid: aptP.id };
    return { v: 'none', t: '정책 표에 지정 없음 · 확인 필요', pid: '' };
  }
  function overheat(pol, g) {
    const p = ((pol && pol.policies) || []).find(x => act(x) && (x.types || []).indexOf('규제지역') >= 0 && x.dir === 'tight' && /투기과열/.test((x.name || '') + (x.plain || '')) && !/해제/.test(x.name || '') && inArea(x, g, ''));
    return p ? p.id : '';
  }
  /** 조합원 지위 양도 제한(도시정비법 제39조 제2항): 투기과열지구 재건축은 조합설립인가 뒤, 재개발은 관리처분계획인가 뒤 — 예외·부칙은 확인 필요 */
  function limit(pol, z) {
    const rb = z.t === 'rb' || z.t === 'dd', on = overheat(pol, z.g), lv = +z.st || 0;
    if (!on) return { v: 'none', t: '투기과열지구 아님' };
    if (rb) return lv >= 5 ? { v: 'on', t: '제한(조합설립 뒤 · 예외 확인)' } : { v: 'pre', t: '아직 없음 · 조합설립 뒤 제한' };
    return lv >= 8 ? { v: 'on', t: '제한(관리처분 뒤 · 확인 필요)' } : { v: 'pre', t: '아직 없음 · 관리처분 뒤 제한(확인 필요)' };
  }

  /* ---------- 착공까지 기간 통계(redev-core speed 그대로) ---------- */
  function left(z, ZD) {
    const RD = RDc(), s = RD.speed(z, ZD), sp = z.sp, Y = todayY();
    if (s.state === 'est') {
      const g = ZD.speed && ZD.speed[sp.k], from = RD.SHORT[g.from] || '';
      const base = g.p20 != null && g.p80 != null ? `${from}→착공 보통 ${RD.yrs(g.p20)}~${RD.yrs(g.p80)}` : g.p50 != null ? `${from}→착공 중간값 ${RD.yrs(g.p50)}` : `${from}→착공 비교 사례 부족`;
      if (sp.y) return { t: `착공 ${sp.y[0] === sp.y[1] ? sp.y[0] : sp.y[0] + '~' + sp.y[1]}년 무렵${sp.ok ? '' : '(참고)'}`, s: base, y: sp.y[1] - Y, y0: sp.y[0] - Y, ok: !!sp.ok };
      return { t: base, s: '이 구역 착공 시기는 따로 예상하지 않았어요', y: null };
    }
    const T = { done: '이미 착공', early: '조합설립 전 · 기간 통계 없음', few: '비교 사례 부족', chk: '자료 확인 중', nt: '예상 없음' };
    return { t: T[s.state] || '예상 없음', s: '', y: null };
  }
  const stName = st => (RDc().SHORT[st] || '') ;

  /* ---------- ① 재개발: 예산 안 구역 안 빌라 실거래가 있는 구역 ---------- */
  const inBud = (p, b) => !b || ((!b[0] || p >= b[0]) && (b[1] == null || p <= b[1]));
  const RD_T = { rd: 1, ct: 1, dd: 1 };
  function redevRows(st, X) {
    const ZD = X.zones || {}, B = (X.bud && X.bud.z) || {}, pol = X.pol;
    const out = [], refOnly = []; let noTr = 0, started = 0, waitOut = 0, livOut = 0;
    for (const z of ZD.z || []) {
      if (!RD_T[z.t] || !/^11/.test(String(z.g))) continue;
      if (st.gus && st.gus.length && st.gus.indexOf(z.gn) < 0) continue;
      if ((+z.st || 0) >= 10) { started++; continue; }
      const b = B[z.g + '|' + z.n];
      const tr = b ? b.i.filter(t => inBud(t[0], st.bud)) : [];
      if (!tr.length) {
        if (b && b.d && Object.keys(b.d).some(k => inBud(+k * 1000 + 500, st.bud))) refOnly.push(z); else noTr++;
        continue;
      }
      const ps = tr.map(t => t[0]), lf = left(z, ZD), th = toh(pol, z.g, z.umd || '', 'villa');
      if (st.live === 'n' && th.v === 'dong') { livOut++; continue; }
      if (st.wait && !(lf.y != null && lf.y <= st.wait)) { waitOut++; continue; }
      out.push({ z, id: z.id, n: z.n, gu: z.gn, dong: z.umd || '', st: +z.st || 0, stn: stName(z.st), lf, th, lim: limit(pol, z),
        n1: tr.length, nAll: b.i.length, lo: Math.min(...ps), hi: Math.max(...ps), md: med(ps), at: tr.map(t => t[1]).sort().pop(), how: b.bd ? '구역 안(공식 경계)' : '구역 대표 지번', ib: b.ib });
    }
    sortRows(out, st.sort, 'redev_budget');
    const dist = RDc().SG.map(g => ({ k: g[0], t: g[1], n: out.filter(r => g[2].indexOf(r.st) >= 0).length })).filter(d => d.k !== 'start');
    return { rows: out, n: out.length, dist, refOnly: refOnly.length, noTr, started, waitOut, livOut, trN: out.reduce((s, r) => s + r.n1, 0) };
  }
  function sortRows(rows, how, id) {
    const yk = r => r.lf && r.lf.y != null ? r.lf.y : 999;
    const f = how === 'soon' ? (a, b) => yk(a) - yk(b) || b.st - a.st
      : how === 'old' ? (a, b) => (a.by || 9999) - (b.by || 9999) || b.st - a.st
      : how === 'cheap' ? (a, b) => a.price - b.price
      : (a, b) => b.st - a.st || yk(a) - yk(b) || (id === 'rebuild_live' ? (a.by || 9999) - (b.by || 9999) : 0);
    return rows.sort((a, b) => f(a, b) || String(a.n || a.apt).localeCompare(String(b.n || b.apt), 'ko'));
  }

  /* ---------- ② 재건축 몸테크: 살 수 있는 재건축 단계·준공 30년 넘은 단지 ---------- */
  const OLD = 30;
  const nm = s => String(s || '').replace(/\(.*?\)/g, '').replace(/(아파트|맨션|맨숀|신시가지|단지|차|apt|\s|·|,)/gi, '').toLowerCase();
  const nmB = s => String(s || '').replace(/[()]/g, '').replace(/(아파트|맨션|맨숀|신시가지|단지|차|apt|\s|·|,)/gi, '').toLowerCase();
  const stem = d => String(d || '').replace(/\d*(동|가|로)?\d*가?$/, '').replace(/(동|가)$/, '');
  /** 재건축 구역(서울, t='rb') ↔ 점수 자료 단지 — 이름으로 연결(참고). 같은 구(구역에 동 자료가 있으면 같은 동)에서
      구역 이름(앞의 동 이름을 뗀 것 포함)과 단지 이름이 '같을 때만'. 단지 이름 괄호 속 말(대우·선경 등)이 구역 이름에 없으면,
      괄호 없는 같은 이름 단지가 그 동에 따로 있을 때는 연결하지 않아요(예: 한강(대우) ↛ 한강맨숀 구역). 목동1 ↔ 목동10 처럼 숫자가 다르면 다른 단지. */
  function zoneIndex(ZD) {
    const by = {};
    for (const z of (ZD && ZD.z) || []) if (z.t === 'rb' && /^11/.test(String(z.g))) {
      const k = nm(z.n), sd = stem(z.umd), ks = [k];
      if (sd && k.indexOf(sd) === 0 && k.length > sd.length + 1) ks.push(k.slice(sd.length).replace(/^동/, ''));
      (by[z.g] = by[z.g] || []).push({ z, ks: ks.filter(x => x.length >= 2) });
    }
    return by;
  }
  function zoneOf(IXZ, u, plain) {
    const L = IXZ[u[0]]; if (!L) return null;
    const a = nm(u[2]), b = nmB(u[2]), par = /\(.*?\)/.test(u[2]); if (a.length < 2) return null;
    for (const x of L) {
      if (x.z.umd && x.z.umd !== u[1]) continue;
      if (x.ks.indexOf(b) >= 0) return x.z;
      if (x.ks.indexOf(a) >= 0 && (!par || !(plain && plain[u[0] + '|' + u[1] + '|' + a]))) return x.z;
    }
    return null;
  }
  /** 괄호 없는 이름 목록(같은 동에 '한강맨숀'처럼 괄호 없이 같은 이름이 있는지) */
  function plainSet(units) { const o = {}; for (const u of units || []) if (!/\(.*?\)/.test(u[2])) o[u[0] + '|' + u[1] + '|' + nm(u[2])] = 1; return o; }
  const SIZE = { s: a => a <= 60, m: a => a > 60 && a <= 85.5, l: a => a > 85.5 };
  /** 보유 금액 + 대출로 살 수 있는 최대 집값(loan-core 그대로). 소득을 모르면 소득 기준(DSR)을 빼고 계산한 예시(ex=true) */
  function maxPrice(L, g, st) {
    if (!L || !(st.cash > 0)) return null;
    const noInc = !(st.inc > 0);
    const c = L.ctx({ g, own: st.own || 'none', income: noInc ? 1e7 : +st.inc, cash: +st.cash, debt: 0, rate: 4 });
    const P = L.maxPrice(c), n = P ? L.need(P, c) : null;
    return { P, loan: n ? Math.floor(n.loan.L) : 0, by: n ? n.loan.by : '', ltv: c.ltv, ex: noInc, rate: c.rate, term: c.term };
  }
  function rebuildRows(st, X, E) {
    const ZD = X.zones || {}, pol = X.pol, MC = E && E.MC, L = E && E.L, months = (X.IX && X.IX.months) || [], sgg = (X.IX && X.IX.sgg) || {};
    const Y = todayY(), IXZ = X._zi || (X._zi = zoneIndex(ZD)), PL = X._pl || (X._pl = plainSet(X.units));
    const mp = {}, cap = g => mp[g] || (mp[g] = maxPrice(L, g, st));
    const by = {}; let gone = 0, over = 0, sizeOut = 0, waitOut = 0, all = 0;
    for (const u of X.units || []) {
      const gu = (sgg[u[0]] || {}).name || ''; if (!/^11/.test(String(u[0]))) continue;
      if (st.gus && st.gus.length && st.gus.indexOf(gu) < 0) continue;
      const f = u[9] && typeof u[9] === 'object' ? u[9] : {}, z = zoneOf(IXZ, u, PL), age = f.by ? Y - f.by : null;
      if (!z && !(age != null && age >= OLD)) continue;
      if (z && (+z.st || 0) >= 9) { gone++; continue; }
      if (!u[6] || !MC) continue;
      const sm = MC.bandSummary(u, months); if (!(sm.price > 0) || sm.stale && !(sm.recent3 > 0) && !(sm.cnt12 > 0)) continue;
      const key = u[0] + '|' + u[1] + '|' + u[2]; all++;
      const area = +u[4] || 0;
      if (st.size && st.size !== '0' && SIZE[st.size] && !SIZE[st.size](area)) { (by[key] = by[key] || { skip: 's' }); continue; }
      const g = L && L.R ? L.R.groupOf(u[0]) : 'reg', M = cap(g);
      if (M && !(sm.price <= M.P)) { (by[key] = by[key] || { skip: 'p' }); continue; }
      const lf = z ? left(z, ZD) : { t: '추진 단계 정보 없음', s: `준공 ${age}년`, y: null };
      if (st.wait && !(lf.y != null && lf.y <= st.wait)) { (by[key] = by[key] || { skip: 'w' }); continue; }
      const row = { key, u, code: u[0], gu, dong: u[1], apt: u[2], band: u[3], area, price: sm.price, at: sm.at, n12: sm.cnt12, by: f.by || null, age, z, st: z ? +z.st || 0 : 0,
        stn: z ? stName(z.st) : '추진 단계 정보 없음', lf, th: toh(pol, u[0], u[1], 'apt'), lim: z ? limit(pol, z) : (overheat(pol, u[0]) ? { v: 'pre', t: '단계 모름 · 조합설립 뒤 제한' } : { v: 'none', t: '투기과열지구 아님' }) };
      const cur = by[key];
      if (!cur || cur.skip || row.area > cur.area) by[key] = row;   // 한 단지는 조건에 맞는 가장 넓은 평형 하나로
    }
    const keys = Object.keys(by), rows = keys.map(k => by[k]).filter(r => !r.skip);
    keys.forEach(k => { const r = by[k]; if (r.skip === 's') sizeOut++; else if (r.skip === 'p') over++; else if (r.skip === 'w') waitOut++; });
    sortRows(rows, st.sort, 'rebuild_live');
    const RD = RDc();
    const dist = [{ k: 'none', t: '추진 단계 정보 없음', n: rows.filter(r => !r.z).length }].concat(RD.SG.filter(g => g[0] !== 'start').map(g => ({ k: g[0], t: g[1], n: rows.filter(r => r.z && g[2].indexOf(r.st) >= 0).length }))).filter(d => d.n || d.k !== 'mgmt');
    const ps = rows.map(r => r.price);
    const anyG = rows[0] ? (L && L.R ? L.R.groupOf(rows[0].code) : 'reg') : (L && L.R ? L.R.groupOf('11680') : 'reg');
    return { rows, n: rows.length, dist, gone, over, sizeOut, waitOut, cap: cap(anyG), lo: ps.length ? Math.min(...ps) : null, hi: ps.length ? Math.max(...ps) : null, zoned: rows.filter(r => r.z).length };
  }

  /* ---------- 글: 머리·표·주의점·법령(확인 필요) ---------- */
  function chipsOf(st, id) {
    const c = [st.gname || '서울'];
    if (id === 'redev_budget') { if (st.bud) c.push(st.bud[1] != null ? (st.bud[0] ? `${wonS(st.bud[0])}~${wonS(st.bud[1])}` : `${wonS(st.bud[1])} 이하`) : `${wonS(st.bud[0])} 넘게`); if (st.live) c.push(st.live === 'y' ? '실거주 가능' : '세입자 두고 매수'); if (st.wait) c.push(`착공 ${st.wait}년 안쪽`); if (st.loan) c.push(st.loan === 'y' ? '대출 필요' : '대출 없이'); }
    else { if (st.cash != null) c.push(`현금 ${wonS(st.cash)}`); if (st.inc != null) c.push(st.inc ? `연 소득 ${wonS(st.inc)}` : '소득 미입력'); if (st.size && st.size !== '0') c.push({ s: '60㎡ 이하', m: '60~85㎡', l: '85㎡ 넘게' }[st.size]); if (st.wait) c.push(`착공 ${st.wait}년 안쪽`); }
    return c;
  }
  function headOf(id, st, R) {
    const ch = chipsOf(st, id).join(' · ');
    if (id === 'redev_budget') return R.n ? `${ch} — 구역 안 빌라 실거래가 예산 안에 있는 재개발 구역 ${R.n}곳이에요` : `${ch} — 예산 안 빌라 실거래가 있는 재개발 구역을 찾지 못했어요`;
    if (st.cash == null) return `${ch} — 재건축 단계이거나 준공 30년이 넘은 아파트 ${R.n.toLocaleString()}곳이에요`;
    return R.n ? `${ch}으로 살 수 있는 재건축 단계·준공 30년 넘은 아파트 ${R.n.toLocaleString()}곳이에요` : `${ch}으로 살 수 있는 재건축 단계·준공 30년 넘은 아파트를 찾지 못했어요`;
  }
  function basisOf(id, st, R, X) {
    if (id === 'redev_budget') {
      const b = X.bud || {}, z = X.zones || {};
      return `구역 안(공식 경계·구역 대표 지번) 빌라(연립·다세대) 매매 실거래 ${ymK(b.from)}~${ymK(b.to)} 기준이에요. 구역·단계는 서울시 정비사업 추진현황(${ymK(z.asof)} 기준)이에요. 정렬은 고른 기준일 뿐 추천 순위가 아니에요.`;
    }
    const m = (X.IX && X.IX.months) || [];
    return `시세는 최근 3개월 실거래 중간값(내 집 시세와 같은 계산, ${ymK(m[m.length - 1])}까지)이에요. 재건축 단계는 서울시 정비사업 추진현황의 단지 이름으로 연결했어요(참고). 정렬은 고른 기준일 뿐 추천 순위가 아니에요.`;
  }
  /** 표: {head, rows} — 칸 값 {t, href} 는 링크, {t, g} 는 색 */
  function tableOf(id, R, H, lim) {
    const rows = lim ? R.rows.slice(0, lim) : R.rows;
    const BASE = (H && H.BASE) || '';
    if (id === 'redev_budget') return { title: '예산 안 실거래가 있는 구역', head: ['구역', '구', '단계(10단계 중)', '착공까지(과거 통계)', '구역 안 빌라 실거래(예산 안)', '토지거래허가', '조합원 지위 양도'],
      rows: rows.map(r => [{ t: r.n, href: BASE + 'villa/zone/?z=' + encodeURIComponent(r.id) }, `${r.gu}${r.dong ? ' ' + r.dong : ''}`, `${r.st}단계 ${r.stn}`, r.lf.t + (r.lf.s && r.lf.y != null ? ` · ${r.lf.s}` : ''), `${r.lo === r.hi ? wonS(r.lo) : wonS(r.lo) + '~' + wonS(r.hi)} · ${r.n1}건(전체 ${r.nAll}건 · 최근 ${ymK(r.at)}) · ${r.how}`, { t: r.th.t, g: r.th.v === 'dong' ? 'lo' : 'mid' }, { t: r.lim.t, g: r.lim.v === 'on' ? 'lo' : r.lim.v === 'pre' ? 'mid' : 'hi' }]) };
    return { title: '살 수 있는 재건축 단계·노후 단지', head: ['단지', '구·동', '준공', '평형', '최근 실거래 시세', '재건축 단계', '착공까지(과거 통계)', '토지거래허가', '조합원 지위 양도'],
      rows: rows.map(r => [{ t: r.apt, href: H && H.mineUrl ? H.mineUrl(r) : BASE + 'mine/' }, `${r.gu} ${r.dong}`, r.by ? `${r.by}년(${r.age}년)` : '-', r.band, `${wonS(r.price)}${r.at ? ` · ${ymK(r.at)}` : ''}`, r.z ? `${r.st}단계 ${r.stn}` : '추진 단계 정보 없음', r.lf.t, { t: r.th.t, g: r.th.v === 'apt' ? 'mid' : 'hi' }, { t: r.lim.t, g: r.lim.v === 'on' ? 'lo' : r.lim.v === 'pre' ? 'mid' : 'hi' }]) };
  }
  /** 손해 피하는 주의점(법령 이름만, 숫자는 법령·정책 표에 있는 것만) */
  function warnOf(id, st, R, X) {
    if (id === 'redev_budget') {
      const w = [
        '입주권 vs 현금청산: 같은 집이라도 권리산정기준일 뒤 지분을 쪼개 산 집, 여러 명이 나눠 가진 집은 새 아파트를 받을 권리(입주권) 대신 돈으로 정산(현금청산)될 수 있어요. 구역의 권리산정기준일은 이 자료에 없어요 — 구청 고시로 꼭 확인하세요.',
        '추가 분담금: 새 아파트를 받으려고 더 낼 돈은 감정평가(종전자산 평가)와 관리처분계획에서 정해져요. 지금은 누구도 정확히 알 수 없어요.',
        '이주비·기간: 이주 때 받는 이주비 대출 조건과 공사 기간 동안 살 곳 비용을 따로 준비해야 해요. 착공까지 기간은 과거 통계일 뿐, 구역마다 크게 늘어질 수 있어요.',
        '취득세: 빌라도 주택이라 우리 세대 주택 수에 따라 세율이 달라져요(다주택은 중과). 세금 계산에서 내 주택 수로 확인하세요.',
        '조합원 지위 양도 제한: 서울은 투기과열지구라 재개발은 관리처분계획인가 뒤 산 사람은 원칙적으로 조합원이 될 수 없어요(예외 요건·적용 시점은 확인 필요).',
        '토지거래허가구역: 허가구역 안 주택은 허가를 받고 직접 살아야 해서 세입자를 둔 채(전세 끼고) 사기 어려워요. 정책 표의 서울 지정은 아파트 대상이라 빌라는 대부분 해당이 없지만, 구역·동 단위로 따로 지정된 곳이 있어요 — 토지이음에서 주소로 확인하세요.'
      ];
      if (st.loan === 'y') w.splice(4, 0, '대출: 서울은 규제지역이라 주택담보대출 비율(LTV)이 40%로 묶여 있고, 빌라는 은행이 보는 시세가 실거래보다 낮게 잡혀 한도가 더 적을 수 있어요(은행 확인 필요).');
      if (st.live === 'n') w.push('세입자를 두고 산다면: 보증금이 얼마 남는지보다, 이주 때 보증금을 먼저 돌려줘야 하는 일정까지 계산해 두세요.');
      return w;
    }
    const w = [
      '노후 주거 불편: 30년 넘은 단지는 주차 공간 부족·누수·배관 녹물·엘리베이터 없음 같은 불편이 흔해요. 재건축까지 길게는 10년 넘게 살 수 있다는 전제로 집을 직접 보세요.',
      '이주 시기와 이주비: 관리처분인가 뒤 이주가 시작되면 정해진 때에 집을 비워야 해요. 그동안 살 곳 비용과 이주비 대출 조건을 미리 확인하세요.',
      '재건축 초과이익 환수: 재건축으로 오른 집값 가운데 일정 기준을 넘는 이익은 부담금으로 낼 수 있어요(재건축초과이익 환수에 관한 법률). 금액은 준공 때 정해져 지금 알 수 없어요.',
      '추가 분담금: 감정평가와 관리처분계획에서 정해져요. 공사비가 오르면 늘어날 수 있어요.',
      '조합원 지위 양도 제한: 서울은 투기과열지구라 재건축은 조합설립인가 뒤 산 사람은 원칙적으로 조합원이 될 수 없어요. 10년 보유·5년 거주 1주택자 등 예외가 있으니 매수 전에 꼭 확인하세요.',
      '1주택 비과세: 보유·거주 2년 요건을 셀 때 재건축 기간(멸실·공사 기간)을 어떻게 더하는지는 규정이 복잡해요(소득세법 시행령 제154조 — 확인 필요). 팔기 전에 세무사와 확인하세요.',
      '토지거래허가구역: 서울 아파트는 허가를 받아야 사고, 허가 뒤 정해진 기간 직접 살아야 해요. 실거주라 살 수는 있지만 허가 절차(구청)와 입주 시기를 미리 맞추세요.'
    ];
    if (R && R.cap && R.cap.ex) w.unshift('연 소득을 넣기 전이라 대출은 소득 기준(DSR)을 빼고 계산한 최대예요. 소득을 넣으면 살 수 있는 단지가 줄 수 있어요.');
    return w;
  }
  /** 법령 근거 목록: ok=true '법령 확인', false '확인 필요' (src 는 scenarios.json 출처 id) */
  function infoOf(id) {
    if (id === 'redev_budget') return [
      { t: '투기과열지구 재개발은 관리처분계획인가 뒤 양수한 사람은 조합원이 될 수 없어요(도시정비법 제39조 제2항). 예외(상속·이혼, 근무·질병 이전, 10년 보유·5년 거주 1주택자 등)와 적용되는 구역(사업시행인가 신청 시점 등 부칙)은 확인이 필요해요.', ok: false, src: 'redev39' },
      { t: '권리산정기준일 뒤 토지를 쪼개거나 단독·다가구를 다세대로 바꾸는 등으로 늘어난 집은 분양받을 권리가 제한돼요(도시정비법 제77조). 구역별 기준일은 구청 고시로 확인해야 해요.', ok: true, src: 'redev77' },
      { t: '분양신청을 하지 않거나 분양 대상에서 빠지면 손실보상(현금청산) 협의를 해요(도시정비법 제73조).', ok: true, src: 'redev73' },
      { t: '토지거래허가구역 안에서 허가받은 주택은 허가 목적대로 일정 기간 직접 써야 해요(부동산 거래신고 등에 관한 법률 제17조). 구역·동 단위 지정은 토지이음에서 주소로 확인해 주세요.', ok: false, src: 'toh17' },
      { t: '주택 수에 따른 취득세 중과(지방세법 제13조의2)', ok: true, src: 'acq13_2' }
    ];
    return [
      { t: '투기과열지구 재건축은 조합설립인가 뒤 양수한 사람은 조합원이 될 수 없어요(도시정비법 제39조 제2항). 예외 요건(10년 보유·5년 거주 1주택자 등)은 매수 전에 확인이 필요해요.', ok: false, src: 'redev39' },
      { t: '재건축 초과이익 부담금(재건축초과이익 환수에 관한 법률) — 부과 기준·감면은 법령으로 확인하세요.', ok: false, src: 'rrc' },
      { t: '1세대 1주택 보유·거주기간 계산과 재건축 기간(소득세법 시행령 제154조) — 멸실·공사 기간 통산 여부는 확인이 필요해요.', ok: false, src: 'cgt154' },
      { t: '토지거래허가구역 안 허가 주택은 정해진 기간 직접 거주해야 해요(부동산 거래신고 등에 관한 법률 제17조). 세입자가 있는 집을 산 무주택자 유예 특례는 정책 표 기준 2027년 12월 31일까지 신청이에요.', ok: false, src: 'toh17' }
    ];
  }
  /** 위쪽 숫자 칸 */
  function numsOf(id, st, R, X) {
    if (id === 'redev_budget') {
      const n = [{ k: '예산 안 실거래가 있는 구역', v: `${R.n}곳`, s: `구역 안 빌라 거래 ${R.trN.toLocaleString()}건` }];
      const top = R.dist.filter(d => d.n).map(d => `${d.t} ${d.n}`).join(' · ');
      n.push({ k: '단계 분포', v: top || '없음', s: '서울시 정비사업 추진현황 단계' });
      if (R.refOnly) n.push({ k: '경계 자료 없이 같은 동 거래만 있는 구역', v: `${R.refOnly}곳`, s: '구역 안인지 알 수 없어 표에서 뺐어요(참고)' });
      return n;
    }
    const n = [{ k: st.cash == null ? '재건축 단계·노후 단지' : '살 수 있는 단지', v: `${R.n.toLocaleString()}곳`, s: `재건축 단계 연결 ${R.zoned}곳 · 추진 단계 정보 없음 ${R.n - R.zoned}곳` }];
    if (R.cap && R.cap.P) n.push({ k: '대출 포함 최대 집값', v: won(R.cap.P), s: `대출 ${won(R.cap.loan)}(담보 비율 ${Math.round(R.cap.ltv * 100)}%${R.cap.ex ? ' · 소득 기준 빼고' : ''}) − 취득세·중개보수 등` });
    if (R.lo != null) n.push({ k: '시세 범위', v: `${wonS(R.lo)} ~ ${wonS(R.hi)}`, s: '최근 3개월 실거래 중간값' });
    return n;
  }

  /* ---------- 길잡이 계산 함수(guide-core S.redevBudget·S.rebuildLive 가 부름) ----------
     a = {_nf: 좁히기 상태} 또는 문장 값 · E.RX = {zones, bud, pol, units, IX} · 카드 모양은 다른 고민과 같음 */
  function solve(id, a, E) {
    const X = (E && E.RX) || null; if (!X || !X.zones) return { err: 'nodata' };
    const st = a._nf || init(id, { raw: a._raw || '', money: {} });
    const R = id === 'redev_budget' ? redevRows(st, X) : rebuildRows(st, X, E);
    if (id === 'rebuild_live' && st.cash == null && !a._nf) return { need: ['cash'] };
    const T = tableOf(id, R, E.H, E.lim || 0);
    return { head: headOf(id, st, R), nums: numsOf(id, st, R, X), tables: R.n ? [Object.assign(T, { note: basisOf(id, st, R, X) })] : [], warn: warnOf(id, st, R, X), info: infoOf(id),
      note: chipsOf(st, id).join(' · ') + (id === 'rebuild_live' ? ` · ${st.own === 'first' ? '생애 첫 집' : st.own === 'one' ? '1주택' : '무주택'} 기준 대출` : '') + ' — 이 기기에서만 계산했어요',
      src: id === 'redev_budget' ? ['molit_rv', 'cleanup', 'redev39', 'redev77', 'policy_1015', 'eum'] : ['molit_rt', 'cleanup', 'loan', 'redev39', 'rrc', 'cgt154', 'policy_1015'], _R: R, _st: st };
  }

  /* ================= 화면(브라우저) ================= */
  const CSS = '.grx .gsort{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 0}.grx .gsort span{font-size:12.5px;color:#6B7684;font-weight:700}.grx .gsort button{font:inherit;font-size:13px;font-weight:800;min-height:38px;padding:0 12px;border-radius:999px;border:1.5px solid #D4D1F5;background:#fff;color:#3730A3;cursor:pointer}.grx .gsort button[aria-pressed="true"]{background:#4338CA;border-color:#4338CA;color:#fff}' +
    '.grx .gsort em{font-style:normal;font-size:12px;color:#7A5C0F;background:#FBF5E3;border-radius:6px;padding:2px 6px}.grx .gchip2{display:inline-flex;align-items:center;font-size:12.5px;font-weight:800;color:#3730A3;background:#EEEDFB;border-radius:999px;padding:3px 10px;margin:0 4px 4px 0}.grx .gmore{font:inherit;font-weight:800;font-size:14px;min-height:44px;width:100%;margin-top:8px;border-radius:12px;border:1.5px dashed #C9C6F2;background:#fff;color:#3730A3;cursor:pointer}' +
    '.grx .gdist div{grid-template-columns:120px 1fr 52px}.grx .gnq .h{margin:-4px 0 8px;font-size:12.5px;color:#4E5968}.grx .gload{margin:8px 0 0;font-size:13px;color:#6B7684}@media(max-width:560px){.grx .gdist div{grid-template-columns:96px 1fr 44px}}';
  function css() { if (typeof document === 'undefined' || document.getElementById('grxCss')) return; const s = document.createElement('style'); s.id = 'grxCss'; s.textContent = CSS; document.head.appendChild(s); }
  /* 자료 불러오기(한 번만) — H: guide.js 가 넘기는 도구 {BASE, DATA, getJ, IX, MC, L, unitsOf(sd)} */
  let XP = null;
  function load(H, id) {
    const base = XP || (XP = Promise.all([
      H.getJ('rxz', H.DATA + 'redev/zones.json'),
      H.getJ('rxp', H.DATA + 'policy.json').catch(() => null)
    ]).then(([zones, pol]) => ({ zones, pol, IX: H.IX })).catch(e => { XP = null; throw e; }));
    if (id === 'redev_budget') return base.then(X => X.bud ? X : H.getJ('rxb', H.DATA + 'redev/budget.json').catch(() => H.getJ('rxb2', H.BASE + 'data/redev-budget.json')).then(b => { X.bud = b; return X; }));
    return base.then(X => X.units ? X : H.unitsOf('s00').then(u => { X.units = u; return X; }));
  }
  function distHtml(R) {
    const mx = Math.max(1, ...R.dist.map(d => d.n));
    return `<div class="gdist">${R.dist.map(d => `<div class="${d.n ? 'on' : ''}"><span>${esc(d.t)}</span><i style="width:${Math.round(d.n / mx * 100)}%"></i><b>${d.n.toLocaleString()}곳</b></div>`).join('')}</div>`;
  }
  function sortHtml(id, st) { return `<div class="gsort" role="group" aria-label="정렬"><span>정렬</span>${SORTS[id].map(s => `<button type="button" data-rsort="${s[0]}" aria-pressed="${st.sort === s[0]}">${esc(s[1])}</button>`).join('')}<em>추천 순위 아님</em></div>`; }
  function nqHtml(id, st, H) {
    const k = next(id, st); if (!k) return '';
    const q = Q[k], gus = H.IX && H.IX.sgg ? Object.keys(H.IX.sgg).filter(c => /^11/.test(c)).map(c => H.IX.sgg[c].name).sort((x, y) => x.localeCompare(y, 'ko')) : [];
    return `<div class="gnq" data-rk="${esc(k)}"><p class="t">${esc(q.t)}</p>${q.hint ? `<p class="h">${esc(q.hint)}</p>` : ''}<div class="o">${q.opts.map(o => `<button type="button" data-rv="${esc(o[0])}">${esc(o[1])}</button>`).join('')}${q.free === 'money' ? '<span class="fr"><input type="text" inputmode="numeric" placeholder="직접: 예 4억" aria-label="금액 직접 입력"><button type="button" data-rfree="1">적용</button></span>' : ''}${q.free === 'gu' ? `<select aria-label="구 고르기" data-rgu="1"><option value="">다른 구 고르기</option>${gus.map(n => `<option>${esc(n)}</option>`).join('')}</select>` : ''}</div><button type="button" class="sk" data-rskip="1">이대로 보기</button></div>`;
  }
  function moneyIn(t) {
    const s = String(t || '').replace(/[,\s원]/g, ''); if (!s) return null;
    const m = /^(\d+(?:\.\d+)?)억(?:(\d+)(천)?(만)?)?$/.exec(s); if (m) return Math.round(+m[1] * 10000 + (m[2] ? (m[3] ? +m[2] * 1000 : +m[2]) : 0));
    const n = /^(\d+(?:\.\d+)?)(천만|천|만)?$/.exec(s); if (!n) return null; const v = +n[1];
    return n[2] === '천만' || n[2] === '천' ? v * 1000 : n[2] === '만' ? v : v <= 100 ? Math.round(v * 10000) : Math.round(v);
  }
  /** 다음 단계(값 채운 링크) */
  function nextLinks(id, st, R, H) {
    const B = H.BASE, r0 = R.rows[0], L = [];
    if (id === 'redev_budget') {
      L.push({ t: '구역 지도에서 단계·착공 예상 자세히', s: r0 ? `${r0.n}부터 열어요 · 비슷한 구역 과거 기간` : '서울 정비구역 단계·과거 기간', href: B + 'villa/zone/' + (r0 ? '?z=' + encodeURIComponent(r0.id) : ''), k: 'calc' });
      L.push({ t: '빌라 시세·입주권 위험 보기', s: r0 ? `${r0.gu} ${r0.dong || ''} 구역 빌라만` : '건물별 실거래·대지지분·구역 안팎', href: B + 'villa/' + (r0 ? `?g=${encodeURIComponent(r0.z.g)}${r0.dong ? '&d=' + encodeURIComponent(r0.dong) : ''}&f=z` : ''), k: 'calc' });
      const p = st.bud && st.bud[1] != null ? st.bud[1] : r0 ? r0.md : null;
      L.push({ t: '취득세 계산(내 주택 수로)', s: p ? `${won(p)} 빌라 기준으로 채워 열어요` : '주택 수에 따라 세율이 달라요', href: H.hrefOf({ href: 'tax/#acq', tax: 'acq', k: 'calc' }, { price: p || '', region: r0 && H.regionOf ? H.regionOf(r0.z.g) : null }), k: 'calc' });
      L.push({ t: '구역 단계가 바뀌면 알림 받기', s: '관심 구역을 고르고 알림을 켜요', href: B + 'villa/zone/' + (r0 ? '?z=' + encodeURIComponent(r0.id) : ''), k: 'alert' });
    } else {
      L.push({ t: '단지 시세·미래가치(참고) 보기', s: r0 ? `${r0.apt} ${r0.band}` : '내 집 시세에서 단지를 찾아요', href: r0 && H.mineUrl ? H.mineUrl(r0) : B + 'mine/', k: 'calc' });
      const p = r0 ? r0.price : (R.cap && R.cap.P) || '';
      L.push({ t: '대출 한도 자세히 계산', s: p ? `${won(p)} 집 · 내 소득으로 채워 열어요` : 'LTV·DSR·생애최초까지', href: B + `loan/?p=${p || ''}&g=${r0 ? r0.code : '11680'}&o=${st.own === 'first' ? 'first' : st.own === 'one' ? 'one' : 'none'}`.replace(/p=&/, ''), k: 'calc' });
      L.push({ t: '재건축 구역 단계 알림 켜기', s: r0 && r0.z ? `${r0.z.n} 단계가 바뀌면 알려 드려요` : '구역 지도에서 단지를 골라 알림을 켜요', href: B + 'villa/zone/' + (r0 && r0.z ? '?z=' + encodeURIComponent(r0.z.id) : ''), k: 'alert' });
    }
    const pro = H.expertLink ? H.expertLink('redev') : null;
    if (pro) L.push(Object.assign({}, pro, { t: id === 'redev_budget' ? pro.t.replace('재개발 전문가', '재개발 전문가') : pro.t.replace('재개발 전문가', '재건축 전문가') }));
    return L;
  }
  function nextHtml(L, id) {
    const IC = { calc: '계', alert: '알', pro: '전' };
    return `<section class="gn3" aria-label="다음 단계"><h3>다음 단계</h3><ol>${L.map((n, i) => `<li><a class="${i === 0 ? 'main' : ''}" href="${esc(n.href)}"${n.ext ? ' target="_blank" rel="noopener"' : ''} data-track="guide_next_${esc(id)}_${esc(n.k)}"><span class="ic" aria-hidden="true">${IC[n.k] || '›'}</span><span><b>${esc(n.t)}</b><small>${esc(n.s || '')}</small></span><span class="go" aria-hidden="true">›</span></a></li>`).join('')}</ol></section>`;
  }
  function infoHtml(D, id) {
    return `<ul class="ginfo">${infoOf(id).map(x => { const s = (D.src || {})[x.src] || {}; return `<li><span class="bd ${x.ok ? 'ok' : 'no'}">${x.ok ? '법령 확인' : '확인 필요'}</span>${esc(x.t)} ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">근거 ›</a>` : ''}</li>`; }).join('')}</ul>`;
  }
  /** 카드 본문(즉답·양식 화면 공통): full=true 면 표 전체·주의점·법령·다음 단계까지 */
  function body(id, st, X, H, full) {
    const E = { MC: H.MC, L: H.L };
    const R = id === 'redev_budget' ? redevRows(st, X) : rebuildRows(st, X, E);
    const T = tableOf(id, R, H, full ? (st._all ? 0 : 20) : 6);
    const chips = chipsOf(st, id).map(c => `<span class="gchip2">${esc(c)}</span>`).join('');
    let extra = [];
    if (id === 'redev_budget') { if (R.started) extra.push(`이미 착공한 구역 ${R.started}곳은 뺐어요(빌라가 아니라 입주권으로 거래돼요)`); if (R.waitOut) extra.push(`착공 예상이 ${st.wait}년 안쪽이 아니거나 예상이 없는 구역 ${R.waitOut}곳은 뺐어요`); if (R.livOut) extra.push(`동 단위 토지거래허가 지정이 있는 구역 ${R.livOut}곳은 뺐어요`); }
    else { if (R.gone) extra.push(`이주·착공 단계라 지금 들어가 살 수 없는 단지 ${R.gone}곳은 뺐어요`); if (R.over) extra.push(`최대 집값보다 비싼 단지 ${R.over}곳은 뺐어요`); if (R.sizeOut) extra.push(`평형이 맞지 않는 단지 ${R.sizeOut}곳은 뺐어요`); if (R.waitOut) extra.push(`착공 예상이 ${st.wait}년 안쪽이 아니거나 예상이 없는 단지 ${R.waitOut}곳은 뺐어요`); }
    const nums = numsOf(id, st, R, X).slice(0, 3).map(n => `<div><small>${esc(n.k)}</small><b>${esc(n.v)}</b>${n.s ? `<span>${esc(n.s)}</span>` : ''}</div>`).join('');
    const tb = R.n ? H.tablesHtml([Object.assign(T, { note: '' })]) + (!full && R.n > 6 ? `<p class="gtn">외 ${R.n - 6}곳은 ‘전체 표와 주의점 보기’에서 볼 수 있어요.</p>` : full && !st._all && R.n > 20 ? `<button type="button" class="gmore" data-rall="1">${R.n - 20}곳 더 보기</button>` : '') : `<p class="gtn">조건에 맞는 곳이 없어요. 조건을 하나 풀어 보세요.</p>`;
    return { R, html: `<div>${chips}</div><h3>${esc(headOf(id, st, R))}</h3><p class="exn">${esc(basisOf(id, st, R, X))}${id === 'redev_budget' ? ' 단독·다가구 실거래는 아직 들어 있지 않아요.' : ''}</p>
      <div class="gnums">${nums}</div>${distHtml(R)}${R.n > 1 ? sortHtml(id, st) : ''}${tb}${extra.length ? `<p class="gtn">${esc(extra.join(' · '))}</p>` : ''}` };
  }
  function wireBox(box, id, getSt, setSt, redraw) {
    box.querySelectorAll('[data-rsort]').forEach(b => b.addEventListener('click', () => { const st = getSt(); st.sort = b.dataset.rsort; setSt(st); redraw(); }));
    const all = box.querySelector('[data-rall]'); if (all) all.addEventListener('click', () => { const st = getSt(); st._all = 1; setSt(st); redraw(); });
    const q = box.querySelector('.gnq'); if (!q) return;
    const k = q.dataset.rk, put = v => { setSt(set(id, getSt(), k, v)); redraw(); };
    q.querySelectorAll('[data-rv]').forEach(b => b.addEventListener('click', () => put(b.dataset.rv)));
    const fr = q.querySelector('[data-rfree]'); if (fr) fr.addEventListener('click', () => { const v = moneyIn(q.querySelector('input').value); if (v) put(k === 'rbud' ? [0, v] : v); });
    const gs = q.querySelector('[data-rgu]'); if (gs) gs.addEventListener('change', () => { if (gs.value) put(gs.value); });
    q.querySelector('[data-rskip]').addEventListener('click', () => { const st = getSt(); st._skip = (st._skip || []).concat([k]); setSt(st); redraw(); });
  }
  /** 첫 화면 즉답 카드 */
  async function instant(ans, H) {
    css();
    const id = H.sc.id; let st = init(id, H.slots || {}, H.D);
    ans.innerHTML = `<section class="ginst grx"><div class="gi-hd"><span class="bd ex">불러오는 중</span><span class="tt">${esc(H.sc.t)}</span></div><h3>구역·실거래 자료를 불러오고 있어요…</h3></section>`;
    let X; try { X = await load(H, id); } catch (e) { if (H.live()) ans.innerHTML = `<section class="ginst grx"><h3>자료를 불러오지 못했어요. 잠시 뒤 다시 해 주세요.</h3><div class="gbtn"><a class="p" href="${esc(H.solveUrl(id, '&from=inst'))}">길잡이에서 보기 ›</a></div></section>`; return; }
    const draw = () => {
      if (!H.live()) return;
      const B = body(id, st, X, H, false);
      ans.innerHTML = `<section class="ginst grx"><div class="gi-hd"><span class="bd ok">바로 답</span><span class="tt">${esc(H.sc.t)}</span></div>${B.html}${nqHtml(id, st, H)}
        <div class="gbtn"><a class="p" href="${esc(H.solveUrl(id, '&from=inst'))}" data-rgo="1" data-track="guide_inst_go">전체 표와 주의점 보기 ›</a><a href="${esc(H.BASE + 'villa/zone/')}" data-track="guide_inst_calc">구역 지도 ›</a></div>${H.fbHtml(id, 'top')}</section>`;
      H.fbWire(ans);
      wireBox(ans, id, () => st, s => { st = s; H.stat('guide_narrow', { k: id }); }, draw);
      const go = ans.querySelector('[data-rgo]'); if (go) go.addEventListener('click', () => H.hand(st));
    };
    draw();
  }
  /** 길잡이 화면(solve/?s=…) — 즉답 먼저, 좁히는 질문은 카드 안에서 하나씩 */
  async function flow(el, H) {
    css();
    const id = H.sc.id, KEY = 'jdj_grx_' + id;
    let st = null;
    try { const sv = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (sv && sv.id === id) st = sv; } catch (e) {}
    if (H.inSt && H.inSt.id === id) st = H.inSt;
    if (!st) st = init(id, H.slots || {}, H.D);
    if (id === 'rebuild_live' && st.cash == null && H.mem && H.mem.m && H.mem.m.cash != null) { st.cash = +H.mem.m.cash; st._mc = 1; }
    if (id === 'rebuild_live' && st.inc == null && H.mem && H.mem.m && H.mem.m.income != null) { st.inc = +H.mem.m.income; st._mc = 1; }
    el.innerHTML = `<div class="gflow">${H.head}<p class="gsub">구역·실거래 자료를 불러오는 중이에요…</p></div>`; el.hidden = false;
    let X; try { X = await load(H, id); } catch (e) { el.innerHTML = `<div class="gflow">${H.head}<p class="gerr">자료를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p></div>`; return; }
    const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    const draw = () => {
      const B = body(id, st, X, H, true), L = nextLinks(id, st, B.R, H);
      el.innerHTML = `<div class="gflow">${H.head}
        <section class="gcard grx" aria-labelledby="gHead"><span class="gk">바로 답 · 참고</span>${B.html.replace('<h3>', '<h2 id="gHead" style="font-size:20px">').replace('</h3>', '</h2>')}${nqHtml(id, st, H)}
          <div class="gwarn"><h3>손해 피하는 주의점</h3><ul>${warnOf(id, st, B.R, X).map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>
          ${infoHtml(H.D, id)}
          <p class="gnote">조건: ${esc(chipsOf(st, id).join(' · '))}${st._mc ? ' · 가진 돈·소득은 이 기기에 저장된 값으로 채웠어요' : ''} <button type="button" data-redit="1">조건 처음부터</button></p>
          <details class="gsrc"><summary>출처 보기</summary><ul>${(id === 'redev_budget' ? ['molit_rv', 'cleanup', 'policy_1015', 'eum', 'redev39', 'redev77', 'redev73', 'toh17'] : ['molit_rt', 'cleanup', 'loan', 'policy_1015', 'redev39', 'rrc', 'cgt154', 'toh17']).map(k => (H.D.src || {})[k]).filter(Boolean).map(s => `<li><a href="${esc(/^https?:/.test(s.url) ? s.url : H.BASE + s.url)}" target="_blank" rel="noopener">${esc(s.nm)}</a></li>`).join('')}</ul></details></section>
        ${H.fbHtml(id, 'solve')}${nextHtml(L, id)}${H.afterHtml(H.sc, H.D)}
        <p class="gdis">${esc(H.site())}는 공공데이터와 법령을 정해진 규칙으로 정리해 보여 드리는 정보 제공 서비스이며, 특정 구역·단지의 매수를 권유하지 않아요. 표의 순서는 고른 정렬 기준일 뿐 추천 순위가 아니에요. 세금·법률·대출의 최종 판단은 자격 있는 전문가와 확인해 주세요.</p></div>`;
      H.fbWire(el);
      wireBox(el, id, () => st, s => { st = s; save(); H.stat('guide_narrow', { k: id }); }, draw);
      const ed = el.querySelector('[data-redit]'); if (ed) ed.addEventListener('click', () => { st = init(id, {}, H.D); save(); draw(); window.scrollTo(0, 0); });
    };
    H.stat('guide_solve', { s: id });
    draw(); save();
  }
  /** 대화창 미니 카드 */
  async function chatCard(ST, H) {
    const id = ST.id, X = await load(H, id), st = ST.nf;
    const R = id === 'redev_budget' ? redevRows(st, X) : rebuildRows(st, X, { MC: H.MC, L: H.L });
    const nums = numsOf(id, st, R, X).slice(0, 2).map(n => ({ k: n.k, v: n.v }));
    const ex2 = R.rows.slice(0, 4).map(r => id === 'redev_budget' ? [`${r.n} (${r.gu}) ${r.st}단계`, r.lo === r.hi ? wonS(r.lo) : `${wonS(r.lo)}~${wonS(r.hi)}`] : [`${r.apt} (${r.gu}) ${r.z ? r.st + '단계' : r.by + '년'}`, wonS(r.price)]);
    return { head: headOf(id, st, R), nums, ex2, ex: `단계 높은 순(추천 순위 아님) · ${id === 'redev_budget' ? '구역 안 빌라 최근 3년 실거래' : '최근 3개월 실거래 중간값'} 기준이에요.` , n: R.n };
  }
  /** 대화창 질문 꼴(guide-core chatNext 가 씀) */
  function chatQ(id, st) { const k = next(id, st); if (!k) return null; const q = Q[k]; return { key: k, nf: 1, ext: 1, q, quick: q.opts.slice() }; }

  const API = { IDS, is, Q, ORDER, SORTS, GROUPS, init, next, set, answer, read, toh, overheat, limit, left, redevRows, rebuildRows, zoneIndex, zoneOf, plainSet, maxPrice, tableOf, warnOf, infoOf, numsOf, headOf, chipsOf, solve, chatQ, chatCard, instant, flow, load, moneyIn, nm };
  root.JDJ_GREDEV = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
