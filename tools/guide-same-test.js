/* 길잡이(solve/) ↔ 조건 검색 화면이 '같은 엔진·같은 결과'인지 자동 대조 · 실행: node tools/guide-same-test.js </dev/null
   대표 취지(2026-11-27): 조건을 하나씩 고르는 화면과 길잡이 문장 한 번은 같은 계산이어야 해요. 길잡이는 조건 검색의 지름길일 뿐 따로 고르는 규칙이 없어요.
   ① 현금 + 대출 서울 아파트(budget_apts) ↔ 내 집 마련 맞춤 단지(buy/report): 화면 코드(buy/report/index.html 안 함수)를 그대로 떼어 돌려,
      길잡이의 '같은 조건으로 검색 화면에서 보기' 주소·넘긴 값으로 연 화면과 길잡이 목록의 단지·순서·숫자(시세·대출·필요한 내 돈)·조건 충족 수가 같은지
   ② 조건에 맞는 아파트 찾기(find_home) ↔ 지도(map/): 지도 화면 코드(필터 FOPT·주소 읽기)로 '같은 조건으로 지도에서 보기' 주소를 열었을 때 같은 필터·같은 대표 평형·같은 순서인지
   ③ 다른 시나리오: 대응 화면과 같은 계산 함수·같은 기본값을 쓰는지(정적 점검) · 대응 화면이 없는 시나리오 목록
   ①-2 맞춤 단지 순서: 예산에 맞는 단지(85~100%) 먼저 · 같은 점수면 집값 → 이름 · 정렬 4가지 · 재건축 단지만 · 자료 순서를 섞어도 같은 결과 · 재건축 몸테크와 같은 재건축 판정
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
const sigS = P => P.list.map(x => [x.code, x.dong, x.apt, x.band, x.P, Math.floor(x.nd.loan.L), Math.round(x.nd.need)]);
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
    check(`[${D.nm}] ${nm}: 검색 화면 첫 10곳 = 길잡이 첫 10곳`, JSON.stringify(sigG(R).slice(0, 10)) === JSON.stringify(pg.r.picked.map(x => [x.code, x.dong, x.apt, x.band, x.P, Math.floor(x.nd.loan.L), Math.round(x.nd.need)])));
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

/* ---------- ①-2 맞춤 단지 순서(대표 승인 2026-11-26): 예산에 맞는 단지 먼저 · 같은 점수 순서 고정 · 정렬 단추 4가지 · 재건축 단지만 ----------
   예산(현금 3억·5억·10억·20억) × 연 소득 × 정렬 × 재건축 단지만 — 길잡이 목록과 검색 화면(주소 so·rb 로 연 화면)이 같은지, 각 정렬 규칙이 지켜지는지, 자료 순서를 섞어도 같은지 */
const rnd = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
function shuffled(arr, seed) { const r = rnd(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const BUDS = [['현금 3억 · 연 소득 5천', 30000, 5000], ['현금 3억 · 연 소득 1억', 30000, 10000], ['현금 5억 · 연 소득 7천', 50000, 7000], ['현금 5억 · 연 소득 1억 5천', 50000, 15000],
  ['현금 10억 · 연 소득 1억', 100000, 10000], ['현금 10억 · 연 소득 2억', 100000, 20000], ['현금 20억 · 연 소득 1억', 200000, 10000], ['현금 20억 · 연 소득 3억', 200000, 30000]];
const SORT_IDS = REC.SORTS.map(x => x[0]);
const kSub = x => (x.fx && x.fx.sub != null) ? x.fx.sub : null, kBy = x => (x.fx && x.fx.by > 0) ? x.fx.by : null, kDeal = x => REC.cnt12(x.u);
/** 정렬 규칙 확인: 값 순서(값 없는 단지는 뒤) · 같은 값이면 점수 → 집값 → 이름(tieCmp) */
function sortOk(list, id) {
  const K = { stn: [kSub, 1], new: [kBy, -1], deal: [kDeal, -1] }[id];
  if (!K) return true;
  for (let i = 1; i < list.length; i++) {
    const a = K[0](list[i - 1]), b = K[0](list[i]);
    if (a == null && b != null) return false;
    if (a != null && b != null && K[1] * (b - a) < 0) return false;
    if (a === b && REC.tieCmp(list[i - 1], list[i]) > 0) return false;
  }
  return true;
}
/** 추천 순 확인: 예산에 맞는 단지(85% 이상) 먼저 · 묶음 표시가 맞음 · 묶음 첫 단지가 묶음에서 가장 앞선 단지(점수 → 집값 → 이름) */
function recOk(list, maxBy) {
  if (list.some((x, i) => i && list[i - 1].grp === 'b' && x.grp === 'a')) return 'A·B 순서';
  if (list.some(x => x.grp !== (x.P / maxBy[x.g] >= REC.FIT_A ? 'a' : 'b'))) return '묶음 표시';
  for (const g of ['a', 'b']) { const L0 = list.filter(x => x.grp === g); if (L0.length && L0.some(x => REC.tieCmp(x, L0[0]) < 0)) return '묶음 첫 단지'; }
  return '';
}
const uniqOk = list => new Set(list.map(x => x.code + '|' + x.apt)).size === list.length;
for (const D of SETS) {
  const X = { units: D.units, IX: D.IX, MH: D.MH, MODEL: D.MODEL, pol: D.pol, notes: NOTES };
  let nOk = 0, nCase = 0, nRb = 0, aEmpty = 0;
  for (const [nm, cash, inc] of BUDS) for (const so of SORT_IDS) for (const rb of [0, 1]) {
    const st = Object.assign(B.init(B.ID, {}), { cash, inc, size: '0', gus: [], own: 'none', sort: so, rb });
    const url = B.sameUrl(st, D.IX, '/'), R = B.rowsOf(st, X, { L, MC, hz: 2 });
    const pg = reportRun(url.slice(url.indexOf('?')), { jdj_gfin: JSON.stringify(B.sameFin(st)) }, Object.assign({ notes: NOTES }, D));
    const tag = `[${D.nm}] ${nm} · ${REC.SORTS.find(x => x[0] === so)[1]}${rb ? ' · 재건축 단지만' : ''}`;
    nCase++;
    const same = pg.S.sort === so && pg.S.rb === !!rb && JSON.stringify(sigG(R)) === JSON.stringify(sigS(pg.r)) && R.total === pg.r.total;
    check(`${tag}: 검색 화면(주소 so·rb)과 길잡이 목록 같음(${R.n}곳)`, same, { S: [pg.S.sort, pg.S.rb], g: sigG(R).slice(0, 2), p: sigS(pg.r).slice(0, 2) });
    const list = pg.r.list;
    check(`${tag}: 한 단지 한 번`, uniqOk(list));
    if (so === 'rec') { const e = recOk(list, pg.maxBy); check(`${tag}: 추천 순 = 예산에 맞는 단지 먼저 · 묶음마다 점수 → 집값 → 이름`, !e, e); if (list.length && !pg.r.nA) aEmpty++; }
    else check(`${tag}: 정렬 규칙(값 없는 단지는 맨 뒤 · 같은 값이면 점수 → 집값 → 이름)`, sortOk(list, so));
    if (rb) { nRb += list.length; check(`${tag}: 재건축 단지만(구역 착공 전 또는 준공 ${REC.REBUILD_AGE}년 이상)`, list.every(x => REC.rebuildOf(x.u, +String(D.IX.updated).slice(0, 4)).ok)); }
    /* 순서 고정: 자료 파일 순서를 섞어도 같은 목록 */
    if (so === 'rec' || rb === 0) {
      const sh = Object.assign({}, D, { units: shuffled(D.units, 7 + cash / 1000 + inc) });
      const pg2 = reportRun(url.slice(url.indexOf('?')), { jdj_gfin: JSON.stringify(B.sameFin(st)) }, Object.assign({ notes: NOTES }, sh));
      const R2 = B.rowsOf(st, Object.assign({}, X, { units: sh.units }), { L, MC, hz: 2 });
      check(`${tag}: 자료 순서를 섞어도 같은 순서(검색 화면·길잡이)`, JSON.stringify(sigS(pg2.r)) === JSON.stringify(sigS(pg.r)) && JSON.stringify(sigG(R2)) === JSON.stringify(sigG(R)));
    }
    if (same) nOk++;
  }
  check(`[${D.nm}] 예산 ${BUDS.length}가지 × 정렬 4가지 × 재건축 켜고 끄기: 모두 같은 결과(${nOk}/${nCase})`, nOk === nCase);
  check(`[${D.nm}] 재건축 단지만 보기에서 단지가 실제로 나옴(${nRb}곳)`, nRb > 0);
}
/* 같은 점수일 때 순서: 점수 → 집값 높은 순(예산에 가까운 쪽) → 이름 가나다순 — 넣는 순서와 상관없이 */
{
  const mk = (apt, P, sv, grp, code) => ({ code: code || '11110', dong: '동', apt, band: '84㎡대', P, hasFv: true, sortv: sv, disp: 99, score: 0.5, grp, fx: { sub: null, by: null }, u: [] });
  const items = [mk('나단지', 120000, 99, 'a'), mk('가단지', 120000, 99, 'a'), mk('다단지', 140000, 99, 'a'), mk('라단지', 130000, 99.5, 'a'), mk('마단지', 90000, 99, 'b'), mk('바단지', 95000, 99, 'b')];
  const want = ['라단지', '다단지', '가단지', '나단지', '바단지', '마단지'];
  const ok = [1, 2, 3, 4, 5, 6, 7, 8].every(seed => JSON.stringify(REC.arrange(shuffled(items, seed), { sort: 'rec' }).map(x => x.apt)) === JSON.stringify(want));
  check('같은 점수면 집값이 예산에 가까운(높은) 단지 → 이름 가나다순 · 넣는 순서를 바꿔도 같음', ok, REC.arrange(items, { sort: 'rec' }).map(x => x.apt));
  const many = []; for (let i = 0; i < 14; i++) many.push(mk('단지' + String.fromCharCode(44032 + i), 120000 - i, 99, 'a', i < 8 ? '11110' : '11140'));
  const ar = REC.arrange(many, { sort: 'rec' }), p1 = ar.slice(0, 10);
  check('추천 순 첫 10곳: 한 구 3곳까지 고르고, 고른 구가 적어 칸이 남으면 다음 순서 단지로 채움', p1.length === 10 && p1.slice(0, 6).filter(x => x.code === '11110').length === 3 && ar.length === 14);
  const miss = [Object.assign(mk('역없음', 100000, 99, 'a'), { fx: { sub: null, by: null } }), Object.assign(mk('역5분', 100000, 50, 'a'), { fx: { sub: 5, by: 2001 } }), Object.assign(mk('역10분', 100000, 99, 'a'), { fx: { sub: 10, by: 2020 } })];
  check("역 가까운 순·신축 순: 값이 없는 단지는 맨 뒤", REC.arrange(miss, { sort: 'stn' }).map(x => x.apt).join() === '역5분,역10분,역없음' && REC.arrange(miss, { sort: 'new' }).map(x => x.apt).join() === '역10분,역5분,역없음');
}
/* 재건축 몸테크(rebuild_live) ↔ 맞춤 단지 '재건축 단지만 보기' + '재건축 단계 순'(대표 승인 2026-11-26): 같은 함수(rec-core search) · 같은 예산 기준 · 같은 평형대 → 단지·순서·시세·대출·필요한 내 돈이 똑같음
   기준(두 화면 같음): 재건축 단지만 볼 때는 최대 집값 55% 아래도 빼지 않음 · 가족 수 → 평형대(1~2명 59㎡대 이하 · 3~4명 74·84㎡대 · 5명 이상 99㎡대 이상 · 상관없음 전체) */
{
  const GX = require('../assets/guide-redev.js'), GXS = read('assets/guide-redev.js');
  check('재건축 몸테크가 맞춤 단지와 같은 조건 검색(rec-core search · guide-budget searchQ)을 씀', /RC\.search\(q\)/.test(GXS) && /GB\.searchQ\(searchSt\(st\), X, E\)/.test(GXS) && !/age >= OLD/.test(GXS) && /if \(q\.rebuild && !rebuildOf\(u, q\.year \|\| 0\)\.ok\) return false;/.test(read('assets/rec-core.js')));
  check("정렬 단추: '재건축 단지만 보기'를 켰을 때만 '재건축 단계 순'", JSON.stringify(REC.sortsFor(false)) === JSON.stringify(REC.SORTS) && REC.sortsFor(true).map(x => x[1]).join() === '추천 순,역 가까운 순,신축 순,거래 많은 순,재건축 단계 순' && REC.sortEff('stage', false) === 'rec' && REC.sortEff('stage', true) === 'stage' && REC.sortId('zz') === 'rec');
  check('재건축 단지만 볼 때는 55% 아래도 뺌 없음 · 끄면 그대로 55% 기준', /if \(!q\.rebuild && sc\.fit < MIN_FIT\) continue;/.test(read('assets/rec-core.js')));
  const sigR = R => R.rows.map(r => [r.code, r.dong, r.apt, r.band, r.price, r.loan, r.need]);
  const sigP = P => P.list.map(x => [x.code, x.dong, x.apt, x.band, x.P, Math.floor(x.nd.loan.L), Math.round(x.nd.need)]);
  const RBC = [[30000, 5000, '0', [], 'none'], [50000, 8000, '0', [], 'none'], [50000, 8000, 's', [], 'first'], [70000, 7000, '0', ['노원구', '도봉구', '강북구'], 'none'], [100000, 10000, 'm', [], 'none'],
    [100000, 15000, '0', ['강남구', '서초구', '송파구'], 'one'], [150000, 20000, 'l', [], 'none'], [200000, 30000, '0', [], 'none'], [120000, 12000, 'm', ['양천구'], 'none'], [80000, 9000, '0', ['송파구'], 'first']];
  for (const D of SETS) {
    const Y = +String(D.IX.updated).slice(0, 4);
    const XR = { zones: {}, pol: D.pol, IX: D.IX, units: D.units, MH: D.MH, MODEL: D.MODEL, notes: NOTES };
    let nOk = 0, nAll = 0, nRows = 0, cheapIn = 0;
    for (const [cash, inc, size, gus, own] of RBC) for (const so of ['stage', 'rec', 'deal']) {
      const st = Object.assign(GX.init('rebuild_live', {}), { cash, inc, size, gus, own, gname: gus.length ? gus.join('·') : '서울 전체' }, so === 'stage' ? {} : { sort: so });
      const RR = GX.rebuildRows(st, XR, { MC, L, hz: 2 });
      const url = GX.sameUrl(st, D.IX, '/'), tag = `[${D.nm}] 재건축 몸테크 현금 ${cash / 10000}억 · 소득 ${inc}만 · 평형 ${size} · ${gus.length ? gus.join('·') : '서울 전체'} · ${own} · ${so}`;
      nAll++;
      if (!(/^\/buy\/report\/\?/.test(url || '') && /[?&]rb=1/.test(url) && /from=guide/.test(url) && !/[?&](i|c)=/.test(url) && (so === 'rec' ? !/[?&]so=/.test(url) : new RegExp('[?&]so=' + so).test(url)))) { check(`${tag}: 주소(재건축 단지만 · 정렬)`, false, url); continue; }
      const pg = reportRun(url.slice(url.indexOf('?')), { jdj_gfin: JSON.stringify(GX.sameFin(st)) }, Object.assign({ notes: NOTES }, D));
      const okS = pg.S.rb === true && pg.S.sort === so && pg.S.cash === cash && pg.S.income === inc && pg.S.own === own
        && JSON.stringify([...pg.S.areas].sort()) === JSON.stringify(GX.bandsOf(st).sort())
        && JSON.stringify([...pg.S.sggs].sort()) === JSON.stringify(Object.keys(D.IX.sgg).filter(c => /^11/.test(c) && (!gus.length || gus.indexOf(D.IX.sgg[c].name) >= 0)).sort());
      check(`${tag}: 검색 화면이 같은 조건(현금·소득·보유·지역·평형대·재건축 단지만·정렬)으로 열림`, okS, { S: [pg.S.rb, pg.S.sort, pg.S.own, [...pg.S.areas]] });
      const same = JSON.stringify(sigR(RR)) === JSON.stringify(sigP(pg.r)) && RR.total === pg.r.total && RR.sort === pg.S.sort;
      check(`${tag}: 두 화면 목록이 똑같음(단지·순서·시세·대출·필요한 내 돈 · ${RR.n}곳)`, same, { n: [RR.n, pg.r.list.length, RR.total, pg.r.total, RR.sort, pg.r.sort], d: sigR(RR).findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(sigP(pg.r)[i])) });
      check(`${tag}: 첫 10곳도 같음`, JSON.stringify(sigR(RR).slice(0, 10)) === JSON.stringify(sigP({ list: pg.r.picked })));
      check(`${tag}: 재건축 판정 통과 단지만`, pg.r.list.every(x => REC.rebuildOf(x.u, Y).ok));
      if (so === 'stage') {
        const lv = x => { const r = REC.rebuildOf(x.u, Y); return r.zone ? r.lv : -1; };
        check(`${tag}: 재건축 단계 순 = 단계 높은 순(단계 정보 없는 단지는 맨 뒤) · 같은 단계면 점수 → 집값 → 이름`, pg.r.list.every((x, i) => { if (!i) return true; const a = pg.r.list[i - 1]; return lv(a) > lv(x) || (lv(a) === lv(x) && REC.tieCmp(a, x) <= 0); }));
        cheapIn += pg.r.list.filter(x => x.P / pg.maxBy[x.g] < REC.MIN_FIT).length;
      }
      nRows += RR.n;
      if (okS && same) nOk++;
    }
    check(`[${D.nm}] 재건축 몸테크 예산·소득·지역·평형·정렬 ${nAll}가지 모두 두 화면 같은 결과(${nOk}/${nAll})`, nOk === nAll);
    check(`[${D.nm}] 재건축 몸테크 목록에 단지가 실제로 나옴(${nRows}곳)`, nRows > 0);
    if (D.MODEL && !D.MODEL.fixture) check(`[${D.nm}] 재건축 단지만 볼 때 예산보다 많이 싼(55% 아래) 단지도 나옴(${cheapIn}곳)`, cheapIn > 0);
  }
  check("재건축 몸테크 결과 아래 '같은 조건으로 검색 화면에서 보기'(소득을 모르면 안내만)", /같은 조건으로 검색 화면에서 보기/.test(GXS) && /같은 단지가 같은 순서로 나와요/.test(GXS) && !/고르는 기준이 같아요/.test(GXS) && /data-rsame/.test(GXS) && /jdj_gfin/.test(GXS) && GX.sameUrl(Object.assign(GX.init('rebuild_live', {}), { cash: 50000 }), SETS[0].IX, '/') === null);
  check("재건축 몸테크 기본 정렬 = 재건축 단계 순 · 정렬 단추 = 검색 화면과 같음", GX.init('rebuild_live', {}).sort === 'stage' && JSON.stringify(GX.SORTS.rebuild_live) === JSON.stringify(REC.sortsFor(true)));
  /* 구 하나만 고르면 그 구에서 10곳을 채움(대표 승인) */
  const one = REC.arrange(Array.from({ length: 14 }, (_, i) => ({ code: '11470', dong: '목동', apt: '단지' + String.fromCharCode(44032 + i), band: '84㎡대', P: 100000 - i, hasFv: true, sortv: 90, disp: 90, score: 0.5, grp: 'a', fx: {}, u: [] })), { sort: 'rec' });
  check('구 하나만 고르면 그 구 단지로 첫 10곳을 채움', one.slice(0, 10).length === 10 && one.slice(0, 10).every(x => x.code === '11470'));
}
/* 맞춤 단지 화면: 정렬 단추 4가지·재건축 단지만 보기·더 보기·묶음 제목 */
check("맞춤 단지 화면: 정렬 단추(추천 순·역 가까운 순·신축 순·거래 많은 순)·'재건축 단지만 보기'·'더 보기'·묶음 제목", JSON.stringify(REC.SORTS.map(x => x[1])) === JSON.stringify(['추천 순', '역 가까운 순', '신축 순', '거래 많은 순'])
  && /data-sort="\$\{id\}"/.test(RPT) && /id="rbOnly"/.test(RPT) && /재건축 단지만 보기/.test(RPT) && /id="moreBtn"/.test(RPT) && /예산에 맞는 단지/.test(RPT) && /예산보다 싼 단지/.test(RPT)
  && /data-bsort/.test(read('assets/guide-budget.js')) && /data-brb/.test(read('assets/guide-budget.js')) && /data-bmore/.test(read('assets/guide-budget.js')));

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
  /* 보증금 걱정 ↔ 전세 안전 점검(jeonse/safety/): 같은 계산 파일 jsafe-core(build) — 글자까지 같은지는 tools/jsafe-test.js ④(아파트·빌라·오피스텔·단독 2,600가지 넘게) */
  ['deposit_safe 보증금 안전', /JS\.fromGuide\(a, E\), rep = JS\.build\(x, \{ H: E\.H, KK: E\.KK \}\)/.test(GC) && /JS\.build\(x, \{ H, KK \}\)/.test(read('jeonse/safety/index.html')) && /H\.check\(\{ dep, senior: num\(x\.senior\)/.test(read('assets/jsafe-core.js')) && /months: 24/.test(read('assets/jsafe-core.js')) && /HG\.check\(\{ dep, senior: 0, pub: pub \|\| 0, type: .*months: 24 \}\)/.test(TSW) && /KK\.estimate\(/.test(read('assets/jsafe-core.js')) && /KK\.estimate\(/.test(JS)],
  ['wolse_conv 전세·월세 비교', /E\.RC\.compare\(\{ jeon: J, wDep: D, wRent: W/.test(GC) && /JDJ_RENT/.test(JS)],
  ['broker_fee 중개보수', /L0\.brokerSale\(/.test(GC) && /L0\.brokerLease\(/.test(GC) && /LOAN\.brokerSale\(/.test(SWC)],
  ['redev_budget 재개발 구역(순서)', /RDc\(\)\.sort\(out\.map\(r => r\.z\), st\.sort === 'stage' \? 'stage' : 'soon'\)/.test(GX) && /function current\(\) \{ return R\.sort\(R\.filter\(D\.z, S\), S\.sort\); \}/.test(ZONE) && /sort: 'soon'/.test(ZONE)],
  /* 받은 분양 광고 확인하기 ↔ bunyang/check/: 같은 화면 조각 adcheck-view mount(같은 글이면 같은 결과 — 계산 대조는 tools/adcheck-test.js) */
  ['ad_check 받은 분양 광고 확인', /r\.mount === 'adcheck'/.test(read('assets/guide.js')) && /JDJ_ADCHKV\.mount\(el\.querySelector\('#gAdc'\)/.test(read('assets/guide.js')) && /JDJ_ADCHKV\.mount\(document\.getElementById\('adc'\)/.test(read('bunyang/check/index.html'))],
];
SAME.forEach(([nm, ok]) => check(`같은 엔진·같은 기본값: ${nm}`, ok));
/* 대응하는 조건 검색 화면이 없는 시나리오(체크리스트·날짜 계산·안내형) — 표시만(tools 결과 보고용) */
const NOSCREEN = ['rental_biz', 'buy_when', 'first_home', 'buy_cost', 'exempt', 'temp2', 'jeonse_renew', 'rent_raise', 'contract_check', 'rent_to_buy', 'move_time', 'high_bargain', 'school_move', 'commute', 'redev_stage', 'rebuild_live', 'switch_order'];
const SCN = JSON.parse(read('assets/guide/scenarios.json')).sc.map(s => s.id);
check('시나리오 목록이 이 점검표와 맞음(새 시나리오가 생기면 여기에 대응 화면을 적어 주세요)', SCN.every(id => NOSCREEN.indexOf(id) >= 0 || ['budget_apts', 'find_home', 'budget', 'loan_limit', 'special_loan', 'acq_tax', 'prop_tax', 'sell_when', 'transfer_tax', 'multi_order', 'gift_when', 'cy_where', 'deposit_safe', 'wolse_conv', 'broker_fee', 'redev_budget', 'ad_check'].indexOf(id) >= 0), SCN.filter(id => NOSCREEN.indexOf(id) < 0));

/* ---------- ④ 오가기 ---------- */
const GN = read('assets/guide-next.js'), GB = read('assets/guide-budget.js'), GJ = read('assets/guide.js');
check("길잡이 결과 아래 '같은 조건으로 검색 화면에서 보기'(현금+대출 서울 아파트) · '같은 조건으로 지도에서 보기'(조건에 맞는 아파트 찾기)", /같은 조건으로 검색 화면에서 보기/.test(GB) && /data-gsame/.test(GB) && /같은 조건으로 지도에서 보기/.test(GC) && /같은 조건으로 지도에서 보기/.test(GJ));
check("조건 검색 화면 위쪽 '말로 물어보기' 자리(내 집 마련 맞춤 단지·내 집 마련 계산기)", /<div class="noprint" data-gask="report" hidden><\/div>/.test(RPT) && /data-gask="buy" hidden/.test(BUY) && RPT.indexOf('data-gask') < RPT.indexOf('id="settings"'));
check("'말로 물어보기'는 길잡이가 켜졌을 때만 채움(꺼져 있으면 hidden 그대로)", /function scan\(\) \{ if \(!on\(\)\) return;[^\n]*data-gask[^\n]*askMount/.test(GN) && /말로 물어보기/.test(GN) && /solve\/\?chat=1&from=/.test(GN));
check('진한 꽉 찬 단추를 늘리지 않음(오가기 링크는 테두리 칸)', /\.gbx \.gbsame\{[^}]*background:#fff/.test(GB) && /\.gsame\{[^}]*background:#fff/.test(GJ) && !/\.gask\{[^}]*background:var\(--blue\)/.test(GN));
check('화면 파일 번호: rec-core v9 · guide-budget v4 · guide-redev v6 · guide-core v15 · guide v22 · guide-next v10 · map-core v6 · scenarios v11', /rec-core\.js\?v=9/.test(RPT) && /rec-core\.js\?v=9/.test(read('switch/index.html')) && /rec-core\.js\?v=9/.test(read('solve/index.html')) && /rec-core\.js\?v=9/.test(read('assets/guide-budget.js')) && /rec-core\.js\?v=9/.test(read('assets/guide-redev.js')) && /guide-budget\.js\?v=4/.test(read('assets/guide-redev.js'))
  && /guide-redev\.js\?v=6/.test(read('solve/index.html')) && /guide-redev\.js\?v=6/.test(read('assets/guide.js')) && /guide-budget\.js\?v=4/.test(read('assets/guide.js')) && /map-core\.js\?v=6/.test(MAP) && /map-core\.js\?v=6/.test(read('solve/index.html')) && /map-core\.js\?v=6/.test(read('index.html'))
  && /guide-next\.js\?v=11/.test(RPT) && /guide-budget\.js\?v=4/.test(read('solve/index.html')) && /guide\.js\?v=23/.test(read('index.html')) && /scenarios\.json\?v=14/.test(GN) && /'\.\/assets\/rec-core\.js\?v=9'/.test(read('sw.js')) && /'\.\/assets\/guide-budget\.js\?v=4'/.test(read('sw.js')) && /'\.\/assets\/guide-redev\.js\?v=6'/.test(read('sw.js')));

console.log(`\n길잡이 ↔ 조건 검색 화면 같은 결과 대조(${SETS.map(s => s.nm).join(' · ')}): ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
