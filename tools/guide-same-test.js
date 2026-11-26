/* 길잡이(solve/) ↔ 조건 검색 화면이 '같은 엔진·같은 결과'인지 자동 대조 · 실행: node tools/guide-same-test.js </dev/null
   대표 취지(2026-11-27): 조건을 하나씩 고르는 화면과 길잡이 문장 한 번은 같은 계산이어야 해요. 길잡이는 조건 검색의 지름길일 뿐 따로 고르는 규칙이 없어요.
   ① 현금 + 대출 서울 아파트(budget_apts) ↔ 내 집 마련 맞춤 단지(buy/report): 화면 코드(buy/report/index.html 안 함수)를 그대로 떼어 돌려,
      길잡이의 '같은 조건으로 검색 화면에서 보기' 주소·넘긴 값으로 연 화면과 길잡이 목록의 단지·순서·숫자(시세·대출·필요한 내 돈)·조건 충족 수가 같은지
   ② 조건에 맞는 아파트 찾기(find_home) ↔ 지도(map/): 지도 화면 코드(필터 FOPT·주소 읽기)로 '같은 조건으로 지도에서 보기' 주소를 열었을 때 같은 필터·같은 대표 평형·같은 순서인지
   ③ 다른 시나리오: 대응 화면과 같은 계산 함수·같은 기본값을 쓰는지(정적 점검) · 대응 화면이 없는 시나리오 목록
   ④ 오가기: 길잡이 결과 아래 '같은 조건으로 … 보기', 조건 검색 화면 위쪽 '말로 물어보기'(길잡이가 꺼져 있으면 숨김)
   자료: tools/guide-budget-fixture.json(공개 자료 일부). 환경변수 JDJ_DATA=공개 자료 data 폴더(index.json·s00.json·model.json·model_h.json·s00_xy.json)가 있으면 실제 자료로도 대조해요. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), read = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
const REC = require('../assets/rec-core.js'), L = require('../assets/loan-core.js'), MC = require('../assets/mine-core.js'), MAPC = require('../assets/map-core.js');
const B = require('../assets/guide-budget.js'), G = require('../assets/guide-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- 화면 코드 떼어 오기 ---------- */
const RPT = read('buy/report/index.html'), MAP = read('map/index.html');
/** 'function 이름(' 부터 짝 맞는 } 까지 */
function fnSrc(src, name) {
  const i = src.indexOf('function ' + name + '('); if (i < 0) throw new Error('없음: ' + name);
  let j = src.indexOf('{', i), d = 0;
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  throw new Error('짝 없음: ' + name);
}
/** 줄 하나(앞부분으로 찾기) */
const lineSrc = (src, head) => { const i = src.indexOf(head); if (i < 0) throw new Error('없음: ' + head); return src.slice(i, src.indexOf('\n', i)); };
/** 'const 이름 = {' … '};' 묶음 */
function objSrc(src, head) { const i = src.indexOf(head); if (i < 0) throw new Error('없음: ' + head); let j = src.indexOf('{', i), d = 0; for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, src.indexOf(';', k) + 1); } } }

/** 내 집 마련 맞춤 단지 화면을 주소(search)·이 탭 저장값(ss)·자료로 열었을 때 고른 단지 */
function reportRun(search, ss, data) {
  const code = [
    objSrc(RPT, 'const NOTES = '), fnSrc(RPT, 'noteKey'), fnSrc(RPT, 'noteOf'),
    'const REC = window.JDJ_REC; const isReg = REC.isReg, isCap = REC.isCap;',
    lineSrc(RPT, 'const BANDS = ['), lineSrc(RPT, 'const num = s =>'),
    lineSrc(RPT, 'const GFIN = '), objSrc(RPT, 'const FIN = (function()'), lineSrc(RPT, 'const Q = new URLSearchParams'), lineSrc(RPT, 'const FV = '),
    objSrc(RPT, 'const S = {'), lineSrc(RPT, "{ const ar=(Q.get('ar')"),
    'let IX = null;', lineSrc(RPT, 'const ANY = {'),
    fnSrc(RPT, 'groupOf'), fnSrc(RPT, 'ctxFor'), lineSrc(RPT, 'const capByPrice = '), fnSrc(RPT, 'need'), fnSrc(RPT, 'maxPrice'),
    'let MODEL = DATA.MODEL, MH = DATA.MH;', lineSrc(RPT, 'let HZ=2;'), lineSrc(RPT, "try{ HZ = parseInt("), lineSrc(RPT, 'if(!(HZ>=1&&HZ<=10)) HZ=2;'),
    lineSrc(RPT, 'const VOK=m=>'), lineSrc(RPT, 'const HLIST=()=>'), fnSrc(RPT, 'hzMix'), fnSrc(RPT, 'applyHz'),
    fnSrc(RPT, 'sggName'), fnSrc(RPT, 'sidoOfCode'), fnSrc(RPT, 'lastNZ'), fnSrc(RPT, 'defaultSido'), fnSrc(RPT, 'sggsOfSido'), fnSrc(RPT, 'defaultSggs'),
    fnSrc(RPT, 'searchQ'), fnSrc(RPT, 'pickCandidates'), fnSrc(RPT, 'nearMisses'),
    'IX = DATA.IX;', lineSrc(RPT, "    S.sido = (Q.get('sd')==='all'"), lineSrc(RPT, "    S.sggs = (Q.get('g')"), lineSrc(RPT, "    { const gs=(Q.get('gs')"),
    'const units = DATA.units.map(u => { const v = u.slice(); if (u[9] && typeof u[9] === "object") v[9] = Object.assign({}, u[9]); return v; }); applyHz(units);',
    'const ctxBy={}, dsrBy={}, maxBy={};', lineSrc(RPT, "  for (const g of ['reg','capfree','local']){ const c=ctxFor(g);"),
    'OUT.r = pickCandidates(units, maxBy, ctxBy, dsrBy); OUT.S = S; OUT.maxBy = maxBy; OUT.HZ = HZ; OUT.near = OUT.r.picked.length ? [] : nearMisses(units, ctxBy, dsrBy);'
  ].join('\n');
  const store = (o) => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } });
  const win = { JDJ_REC: REC, JDJ_LOAN: L, JDJ_MINE: MC, JDJ_REGION_NOTES: data.notes || undefined, JDJ_SHARE: { loadFin: () => null } };
  const OUT = {};
  const ctx = { window: win, JDJ_LOAN: L, JDJ_MINE: MC, JDJ_SHARE: win.JDJ_SHARE, location: { search, pathname: '/buy/report/' }, URLSearchParams, sessionStorage: store(ss || {}), localStorage: store({}), DATA: data, OUT, Date, JSON, Math, Set, Map, Object, String, parseInt, parseFloat, isNaN, Number, Array };
  vm.runInNewContext(code, ctx, { filename: 'buy/report(떼어 온 코드)' });
  return OUT;
}

/* ---------- 자료 ---------- */
const FX = JSON.parse(read('tools/guide-budget-fixture.json'));
const NOTES = (() => { const w = {}; vm.runInNewContext(read('assets/region-notes.js'), { window: w }); return w.JDJ_REGION_NOTES; })();
const SGG0 = {}; Object.keys(FX.sgg).forEach(c => { SGG0[c] = Object.assign({ s: [] }, FX.sgg[c]); });   // 일부 자료엔 구 평당가(s)가 없어 빈 칸으로(두 화면 똑같이)
const SETS = [{ nm: '공개 자료 일부(fixture)', IX: { months: FX.months, sgg: SGG0, updated: FX.updated, sido: [{ id: 's00', name: '서울특별시', short: '서울' }] }, units: FX.units, MH: FX.mh, MODEL: { fixture: 1 }, pol: FX.policy }];
const DD = process.env.JDJ_DATA;
if (DD && fs.existsSync(path.join(DD, 's00.json'))) {
  const J = f => JSON.parse(fs.readFileSync(path.join(DD, f), 'utf8'));
  const IXr = J('index.json'), U = J('s00.json').units; U.forEach(u => { if (u[9] && typeof u[9] === 'object') MC.cleanFx(u[9]); });
  SETS.push({ nm: '실제 공개 자료(' + IXr.updated + ')', IX: IXr, units: U, MH: J('model_h.json'), MODEL: J('model.json'), pol: null, xy: fs.existsSync(path.join(DD, 's00_xy.json')) ? J('s00_xy.json').xy : null });
}

/* ---------- ① 현금 + 대출 서울 아파트 ↔ 내 집 마련 맞춤 단지 ---------- */
const CASES = [
  ['현금 10억 · 연 소득 1억 · 서울 전체 · 84㎡대·59㎡대', { cash: 100000, inc: 10000, size: '0', gus: [], own: 'none' }],
  ['현금 7억 · 연 소득 7천 · 84㎡대', { cash: 70000, inc: 7000, size: '84', gus: [], own: 'none' }],
  ['현금 12억 · 연 소득 1억 5천 · 마용성 · 59㎡대 · 10년 이내 신축 · 생애최초', { cash: 120000, inc: 15000, size: '59', gus: ['마포구', '용산구', '성동구'], gname: '마용성', newb: 10, own: 'first' }],
  ['현금 5억 · 연 소득 8천 · 노도강 · 생애최초', { cash: 50000, inc: 8000, size: '0', gus: ['노원구', '도봉구', '강북구'], gname: '노도강', own: 'first' }],
  ['현금 10억 · 연 소득 2억 · 강남3구 · 5년 이내 신축', { cash: 100000, inc: 20000, size: '0', gus: ['강남구', '서초구', '송파구'], gname: '강남3구', newb: 5, own: 'none' }],
  ['현금 10억 · 연 소득 1억 · 집값 12억 이하', { cash: 100000, inc: 10000, size: '0', gus: [], own: 'none', pcap: 120000 }],
  ['현금 3억 · 연 소득 5천(살 수 있는 단지가 거의 없음)', { cash: 30000, inc: 5000, size: '84', gus: [], own: 'none' }]
];
const sigG = R => R.rows.map(r => [r.code, r.dong, r.apt, r.band, r.price, r.loan, Math.round(r.need)]);
const sigS = P => P.picked.map(x => [x.code, x.dong, x.apt, x.band, x.P, Math.floor(x.nd.loan.L), Math.round(x.nd.need)]);
for (const D of SETS) {
  const X = { units: D.units, IX: D.IX, MH: D.MH, MODEL: D.MODEL, pol: D.pol, notes: NOTES };
  for (const [nm, o] of CASES) {
    const st = Object.assign(B.init(B.ID, {}), o);
    const url = B.sameUrl(st, D.IX, '/'), fin = B.sameFin(st);
    check(`[${D.nm}] ${nm}: '같은 조건으로 검색 화면에서 보기' 주소`, /^\/buy\/report\/\?/.test(url || ''), url);
    if (!url) continue;
    const pg = reportRun(url.slice(url.indexOf('?')), { jdj_gfin: JSON.stringify(fin) }, Object.assign({ notes: NOTES }, D));
    const R = B.rowsOf(st, X, { L, MC, hz: 2 });
    check(`[${D.nm}] ${nm}: 검색 화면이 같은 조건으로 열림(현금·소득·평형·구·신축·집값 상한·보유)`,
      pg.S.cash === st.cash && pg.S.income === st.inc && pg.S.debt === 0 && pg.S.etc === 1000 && pg.S.own === (st.own === 'first' ? 'first' : 'none') && pg.S.newb === (st.newb || 0) && pg.S.pmax === (st.pcap || 0)
      && JSON.stringify([...pg.S.areas].sort()) === JSON.stringify((st.size === '84' ? ['84㎡대'] : st.size === '59' ? ['59㎡대'] : ['59㎡대', '84㎡대']).sort())
      && JSON.stringify([...pg.S.sggs].sort()) === JSON.stringify(Object.keys(D.IX.sgg).filter(c => /^11/.test(c) && (!st.gus.length || st.gus.indexOf(D.IX.sgg[c].name) >= 0)).sort()) && pg.HZ === 2,
      { S: Object.assign({}, pg.S, { sggs: [...pg.S.sggs].length, areas: [...pg.S.areas] }) });
    check(`[${D.nm}] ${nm}: 최대 집값 같음`, pg.maxBy.reg === B.capOf(st, L).P, [pg.maxBy.reg, B.capOf(st, L).P]);
    check(`[${D.nm}] ${nm}: 단지·순서·시세·대출·필요한 내 돈 같음(${R.n}곳)`, JSON.stringify(sigG(R)) === JSON.stringify(sigS(pg.r)), { guide: sigG(R).slice(0, 3), page: sigS(pg.r).slice(0, 3) });
    check(`[${D.nm}] ${nm}: 조건 충족 평형 수 같음(${R.total})`, R.total === pg.r.total, [R.total, pg.r.total]);
    check(`[${D.nm}] ${nm}: 맞는 단지가 없을 때 '조금만 더 준비하면' 단지도 같음`, R.n || JSON.stringify(R.near.map(x => x.apt)) === JSON.stringify(pg.near.slice(0, 3).map(x => x.apt)));
  }
  /* 보유 기간(예상 보유 기간 막대): 검색 화면에서 고른 값(이 기기 jdj_hz)을 길잡이도 똑같이 읽음 */
  const st5 = Object.assign(B.init(B.ID, {}), CASES[0][1]);
  const R5 = B.rowsOf(st5, X, { L, MC, hz: 5 }), pg5 = (() => { const url = B.sameUrl(st5, D.IX, '/'); return reportRun(url.slice(url.indexOf('?')) + '&hz=5', { jdj_gfin: JSON.stringify(B.sameFin(st5)) }, Object.assign({ notes: NOTES }, D)); })();
  check(`[${D.nm}] 보유 기간 5년으로 바꿔도 두 화면 같음`, pg5.HZ === 5 && JSON.stringify(sigG(R5)) === JSON.stringify(sigS(pg5.r)));
}
check('소득을 모르면 길잡이는 소득 기준(DSR)을 빼고 계산하고, 검색 화면 주소는 만들지 않음(소득을 고르라고 안내)', B.sameUrl(Object.assign(B.init(B.ID, {}), { cash: 100000 }), SETS[0].IX, '/') === null);
check('개인값(연소득·현금)은 주소에 없음 — 이 탭 저장값(sessionStorage)으로만', SETS.every(D => CASES.every(([, o]) => { const u = B.sameUrl(Object.assign(B.init(B.ID, {}), o), D.IX, '/'); return !/[?&](i|c|d|n|e)=/.test(u); })));
check('검색 화면은 from=guide 가 아니면 이 탭 저장값을 쓰지 않음', (() => { const pg = reportRun('?sd=' + encodeURIComponent('서울특별시'), { jdj_gfin: JSON.stringify(B.sameFin({ cash: 100000, inc: 10000 })) }, Object.assign({ notes: NOTES }, SETS[0])); return pg.S.cash === 40000 && pg.S.income === 7000; })());

/* ---------- ② 조건에 맞는 아파트 찾기 ↔ 지도 ---------- */
function mapState(search, IX) {
  const code = ['const C = JDJ_MAPC;', 'const Q = new URLSearchParams(SEARCH);', objSrc(MAP, 'const S = { mode:'), 'let IX = IXD;', lineSrc(MAP, 'const FOPT = () =>'), 'OUT.S = S; OUT.opt = FOPT();'].join('\n');
  const OUT = {}; vm.runInNewContext(code, { JDJ_MAPC: MAPC, URLSearchParams, SEARCH: search, IXD: IX, OUT, Date, String, Math, Number }); return OUT;
}
for (const D of SETS) {
  /* 좌표: 실제 자료면 sNN_xy.json, 일부 자료면 단지마다 자리만 만들어(필터·순서 대조용) */
  const xy = D.xy || (() => { const o = {}; let i = 0; for (const u of D.units) { const k = [u[0], u[1], u[8]].join('|'); if (!o[k]) { o[k] = [126.9 + (i % 50) * 0.004, 37.5 + Math.floor(i / 50) * 0.004]; i++; } } return o; })();
  const FC = [['서울 84㎡ 9억~15억', { sido: '서울특별시', area: 84, budget: [90000, 150000] }], ['마포구 59㎡ 7억 이하 신축', { sido: '서울특별시', gus: ['마포구'], gname: '마포구', area: 59, budget: [0, 70000], age: 5 }],
    ['강남3구 역세권 25억 넘게', { sido: '서울특별시', gus: ['강남구', '서초구', '송파구'], gname: '강남3구', budget: [250000, null], station: 10 }], ['노도강 10년 이내 · 가격 상관없이', { sido: '서울특별시', gus: ['노원구', '도봉구', '강북구'], age: 10 }]];
  for (const [nm, st] of FC) {
    const R = G.findHomes(D.units, D.IX, st, MC, null, xy, 's00'), url = G.findMapUrl(st, R, '/');
    const M = mapState(url.slice(url.indexOf('?')), D.IX);
    check(`[${D.nm}] ${nm}: 지도 주소로 연 필터 = 길잡이 필터`, JSON.stringify(M.opt) === JSON.stringify(R.opt), { map: M.opt, guide: R.opt, url });
    /* 지도 목록: 보이는 단지(여기서는 고른 구 안 전부) → C.pick(d, months, FOPT()) → '거래 많은 순'(b.p − a.p, p = d.n) */
    const nameOf = c => (D.IX.sgg[c] || {}).name;
    const items = MAPC.danjiList(D.units, xy, 's00').filter(d => !st.gus || st.gus.indexOf(nameOf(d.code)) >= 0).map(d => ({ d, b: MAPC.pick(d, D.IX.months, M.opt) })).filter(x => x.b);
    const LROWS = items.map(({ d, b }) => ({ k: d.key, band: b.band, price: b.price, p: d.n || 0 })).sort((a, b) => b.p - a.p);
    check(`[${D.nm}] ${nm}: 단지·대표 평형·시세·순서가 지도 목록과 같음(${R.n}곳)`, JSON.stringify(R.rows.map(r => [r.key, r.band, r.price])) === JSON.stringify(LROWS.map(r => [r.k, r.band, r.price])), { g: R.rows.slice(0, 2).map(r => [r.key, r.band]), m: LROWS.slice(0, 2) });
    check(`[${D.nm}] ${nm}: 가격 분포 칸 = 지도 가격대 칸`, R.dist.map(x => x.id).join() === MAPC.PRICES.filter(p => p.id).map(p => p.id).join());
  }
}
check('지도: 직접 고른 가격 범위(r…-…)·준공·역 거리를 주소로 읽고 다시 남김', /S\.age \? p\.set\('ag'/.test(MAP) && /S\.stn \? p\.set\('sn'/.test(MAP) && MAPC.priceOf('r0-70000').t === '7억 이하' && MAPC.priceId(90000, 150000) === 'p15' && MAPC.priceId(250000, null) === 'p99');
check('길잡이 좁히는 질문의 가격대 칸 = 지도 가격대 칸', JSON.stringify(JSON.parse(read('assets/guide/scenarios.json')).narrow.q.budget.opts.map(o => MAPC.priceId(+o[0].split('-')[0], o[0].split('-')[1] === '' ? null : +o[0].split('-')[1]))) === JSON.stringify(MAPC.PRICES.filter(p => p.id).map(p => p.id)));

/* ---------- ③ 다른 시나리오: 대응 화면과 같은 계산 함수·같은 기본값(정적 점검) ---------- */
const GC = read('assets/guide-core.js'), GX = read('assets/guide-redev.js'), TAXUI = read('tax/tax-ui.js'), LOAN = read('loan/index.html'), BUY = read('buy/index.html'), CY = read('chungyak/index.html'), JS = read('jeonse/index.html'), TSW = read('assets/tswitch-core.js'), ZONE = read('villa/zone/index.html'), SWC = read('switch/switch-core.js');
const SAME = [
  ['budget 예산', /L\.ctx\(\{ g, own, income: \+a\.income \|\| 0, cash, debt: \+a\.debt \|\| 0, rate: a\.lrate > 0 \? \+a\.lrate : 4 \}\)/.test(GC) && /let own='none', rtype='cyc'/.test(BUY) && /id="rate" inputmode="decimal" value="4\.0"/.test(BUY) && /id="costs" checked/.test(BUY) && /JDJ_LOAN\.maxPrice\(c, dsr\)/.test(BUY)],
  ['loan_limit 대출 한도', /E\.L\.limit\(\{ price: \+a\.price/.test(GC) && /L\.limit\(\{ price: o\.price, g: S\.g, own: S\.own/.test(LOAN) && /const S = \{ own: 'none', rtype: 'var'/.test(LOAN) && /rtype: o\.rtype \|\| 'var'/.test(read('assets/loan-core.js'))],
  ['special_loan 정책 대출', /E\.L\.policyLoans\(/.test(GC) && /L\.policyLoans\(/.test(LOAN)],
  ['acq_tax 취득세', /E\.T\.acqTax\(\{ price:/.test(GC) && /T\.acqTax\(\{ price: p, houses: aN/.test(TAXUI)],
  ['prop_tax 재산세·종부세', /E\.T\.propertyTax\(/.test(GC) && /E\.T\.compTax\(/.test(GC) && /T\.propertyTax\(/.test(TAXUI) && /T\.compTax\(/.test(TAXUI)],
  ['sell_when·transfer_tax 양도세 시기', /T\.timeline\(h, \{ today, months: 60 \}\)/.test(GC) && /T\.timeline\(Object\.assign\(\{\}, h\), \{ today: TODAY, months: 60/.test(TAXUI)],
  ['multi_order 매도 순서', /T\.compareOrders\(houses, \{ today, start, interval: 12, growth: 0 \}\)/.test(GC) && /T\.compareOrders\(houses, \{ today: TODAY, start, interval, growth: 0 \}\)/.test(TAXUI)],
  ['gift_when 증여', /T\.giftTax\(/.test(GC) && /T\.giftAcqTax\(/.test(GC) && /T\.giftTax\(/.test(TAXUI) && /T\.giftAcqTax\(/.test(TAXUI)],
  ['cy_where 청약 가점', /CY\.total\(A, E\.today\)/.test(GC) && /CY\.total\(/.test(CY) && /cy-engine\.js/.test(CY)],
  ['deposit_safe 보증금 안전', /E\.H\.check\(\{ dep: \+a\.dep/.test(GC) && /months: 24/.test(GC) && /HG\.check\(\{ dep, senior: 0, pub: pub \|\| 0, type: .*months: 24 \}\)/.test(TSW) && /E\.KK\.estimate\(/.test(GC) && /KK\.estimate\(/.test(JS)],
  ['wolse_conv 전세·월세 비교', /E\.RC\.compare\(\{ jeon: J, wDep: D, wRent: W/.test(GC) && /JDJ_RENT/.test(JS)],
  ['broker_fee 중개보수', /L0\.brokerSale\(/.test(GC) && /L0\.brokerLease\(/.test(GC) && /LOAN\.brokerSale\(/.test(SWC)],
  ['redev_budget 재개발 구역(순서)', /RDc\(\)\.sort\(out\.map\(r => r\.z\), st\.sort === 'stage' \? 'stage' : 'soon'\)/.test(GX) && /function current\(\) \{ return R\.sort\(R\.filter\(D\.z, S\), S\.sort\); \}/.test(ZONE) && /sort: 'soon'/.test(ZONE)]
];
SAME.forEach(([nm, ok]) => check(`같은 엔진·같은 기본값: ${nm}`, ok));
/* 대응하는 조건 검색 화면이 없는 시나리오(체크리스트·날짜 계산·안내형) — 표시만(tools 결과 보고용) */
const NOSCREEN = ['rental_biz', 'buy_when', 'first_home', 'buy_cost', 'exempt', 'temp2', 'jeonse_renew', 'rent_raise', 'contract_check', 'rent_to_buy', 'move_time', 'high_bargain', 'school_move', 'commute', 'redev_stage', 'rebuild_live', 'switch_order'];
const SCN = JSON.parse(read('assets/guide/scenarios.json')).sc.map(s => s.id);
check('시나리오 목록이 이 점검표와 맞음(새 시나리오가 생기면 여기에 대응 화면을 적어 주세요)', SCN.every(id => NOSCREEN.indexOf(id) >= 0 || ['budget_apts', 'find_home', 'budget', 'loan_limit', 'special_loan', 'acq_tax', 'prop_tax', 'sell_when', 'transfer_tax', 'multi_order', 'gift_when', 'cy_where', 'deposit_safe', 'wolse_conv', 'broker_fee', 'redev_budget'].indexOf(id) >= 0), SCN.filter(id => NOSCREEN.indexOf(id) < 0));

/* ---------- ④ 오가기 ---------- */
const GN = read('assets/guide-next.js'), GB = read('assets/guide-budget.js'), GJ = read('assets/guide.js');
check("길잡이 결과 아래 '같은 조건으로 검색 화면에서 보기'(현금+대출 서울 아파트) · '같은 조건으로 지도에서 보기'(조건에 맞는 아파트 찾기)", /같은 조건으로 검색 화면에서 보기/.test(GB) && /data-gsame/.test(GB) && /같은 조건으로 지도에서 보기/.test(GC) && /같은 조건으로 지도에서 보기/.test(GJ));
check("조건 검색 화면 위쪽 '말로 물어보기' 자리(내 집 마련 맞춤 단지·내 집 마련 계산기)", /<div class="noprint" data-gask="report" hidden><\/div>/.test(RPT) && /data-gask="buy" hidden/.test(BUY) && RPT.indexOf('data-gask') < RPT.indexOf('id="settings"'));
check("'말로 물어보기'는 길잡이가 켜졌을 때만 채움(꺼져 있으면 hidden 그대로)", /function scan\(\) \{ if \(!on\(\)\) return;[^\n]*data-gask[^\n]*askMount/.test(GN) && /말로 물어보기/.test(GN) && /solve\/\?chat=1&from=/.test(GN));
check('진한 꽉 찬 단추를 늘리지 않음(오가기 링크는 테두리 칸)', /\.gbx \.gbsame\{[^}]*background:#fff/.test(GB) && /\.gsame\{[^}]*background:#fff/.test(GJ) && !/\.gask\{[^}]*background:var\(--blue\)/.test(GN));
check('화면 파일 번호: rec-core v6 · guide-budget v2 · guide-core v12 · guide v14 · guide-next v8 · map-core v6 · scenarios v9', /rec-core\.js\?v=6/.test(RPT) && /rec-core\.js\?v=6/.test(read('switch/index.html')) && /rec-core\.js\?v=6/.test(read('solve/index.html')) && /map-core\.js\?v=6/.test(MAP) && /map-core\.js\?v=6/.test(read('solve/index.html')) && /map-core\.js\?v=6/.test(read('index.html'))
  && /guide-next\.js\?v=8/.test(RPT) && /guide-budget\.js\?v=2/.test(read('solve/index.html')) && /guide\.js\?v=14/.test(read('index.html')) && /scenarios\.json\?v=9/.test(GN) && /'\.\/assets\/rec-core\.js\?v=6'/.test(read('sw.js')));

console.log(`\n길잡이 ↔ 조건 검색 화면 같은 결과 대조(${SETS.map(s => s.nm).join(' · ')}): ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
