/* 고민 해결 길잡이 — 대표 질문 '보유 현금 + 담보대출로 살 수 있는 서울 아파트'(budget_apts) 확인 · 실행: node tools/guide-budget-test.js </dev/null
   자료: tools/guide-budget-fixture.json(공개 자료 s00.json 서울 84㎡대·59㎡대 단지 일부, index.json months·구·갱신일, model_h.json 2년 성적, policy.json, price/구.json 개별 거래 일부)
   ① 자연스러운 질문 8개 이상 → 이 고민 · 문장에서 현금·소득·평형·지역·신축·생애최초·'추천' 읽기 · 좁히는 질문 하나씩(연소득 → 평형 → 출퇴근지 → 신축 → 생애최초)
   ② 대출 규칙 대조: loan-rules 가격대별 상한(15억 이하 6억 · 25억 이하 4억 · 초과 2억) · 15억 문턱(15억 1천만 원 집은 대출 4억 → 못 삼) · 소득을 넣으면 스트레스 DSR 로 한도가 줄어듦
   ③ 단지 목록: 조건 검색 엔진(rec-core search — 내 집 마련 맞춤 단지와 같은 함수) 그대로 · 숫자 = 엔진·자료 그대로(bandSummary 시세·건수·기간, loan-core need·monthly, 점수는 과거 성적 기준을 넘을 때만 표시) · 같은 입력 같은 결과 · 위험 신호
      (두 화면 대조는 tools/guide-same-test.js)
   ④ 카드 문구: 권유 없음·추천 순위 아님·출처·믿을 이유 · 화면 연결(버전·서비스 워커·첫 화면 '많이 받는 고민') */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
const B = require('../assets/guide-budget.js'), G = require('../assets/guide-core.js'), L = require('../assets/loan-core.js'), MC = require('../assets/mine-core.js'), PT = require('../assets/pro-tools-core.js'), RK = require('../assets/rank-core.js');
globalThis.JDJ_GBUDGET = B;   // guide-core 가 대화·계산에서 이 파일을 찾음(브라우저에서는 window.JDJ_GBUDGET)
const SC = JSON.parse(read('assets/guide/scenarios.json')), LEX = JSON.parse(read('assets/guide/lexicon.json')), DATA = Object.assign({}, SC, { lex: LEX });
const FX = JSON.parse(read('tools/guide-budget-fixture.json'));
const IX = { months: FX.months, sgg: FX.sgg, updated: FX.updated };
const X = { units: FX.units, IX, MH: FX.mh, pol: FX.policy, MODEL: { fixture: 1 } };   // MODEL: 2년 기본 모델이 있는 보통 때(내용은 보유 기간 섞기에서 '있음'만 봐요)
const REC = require('../assets/rec-core.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }
const CTX = { sgg: Object.keys(FX.sgg).map(c => ({ code: c, name: FX.sgg[c].name, sido: '서울특별시', short: '서울' })), sido: [{ name: '서울특별시', short: '서울' }], today: '2026-11-26' };
const E = { L, MC, hz: 2 };
const st0 = q => B.init(B.ID, G.extract(q, CTX));

/* ---------- ① 질문 이해 ---------- */
const QS = ['서울에서 10억 보유금과 나머지 담보대출로 구입할 수 있는 최고의 아파트 단지 10개 추천해줘', '현금 10억 있는데 대출 받아서 살 수 있는 서울 아파트 추천', '10억 있는데 서울 아파트 어디 사요?',
  '보유금 8억 + 대출로 서울 아파트 TOP 10', '12억 가지고 대출 끼고 살 만한 서울 아파트 단지 알려줘', '현금 7억이면 서울 어디 아파트 살 수 있어요', '10억 + 주담대로 강남3구 아파트 살 수 있는 곳',
  '내 돈 10억에 대출 최대로 받으면 서울 어느 단지까지 돼요?', '9억으로 서울 아파트 살 수 있는 단지 보여줘', '현금 10억 대출 끼고 살 수 있는 서울 84㎡ 아파트 베스트 10'];
QS.forEach(q => { const r = G.classify(q, DATA, CTX); check(`분류 "${q}"`, r.top && r.top.id === B.ID, r.scores.slice(0, 3)); });
check('자연스러운 질문 8개 이상', QS.length >= 8);
[['3억 있는데 얼마짜리 집 살 수 있어요?', 'budget'], ['조건에 맞는 아파트를 찾아 주세요', 'find_home'], ['대출 얼마까지 받을 수 있어요', 'loan_limit'], ['몸테크 할 만한 아파트 현금 5억', 'rebuild_live'],
  ['재개발 투자 어디가 좋을까요', 'redev_budget'], ['대출로 집 사려면 얼마나 빌릴 수 있나요', 'loan_limit'], ['내 집 마련 언제 사면 좋을까요', 'buy_when']].forEach(([q, id]) => check(`다른 고민은 그대로 "${q}" → ${id}`, (G.classify(q, DATA, CTX).top || {}).id === id, G.classify(q, DATA, CTX).scores.slice(0, 3)));
const SCB = SC.sc.find(s => s.id === B.ID);
check('시나리오: 대표 고민(pri·lead)·ext budget·계산 함수·전문가 대출', SCB && SCB.pri === 1 && SCB.lead === 1 && SCB.ext === 'budget' && SCB.solve === 'budgetApts' && G.SOLVERS.indexOf('budgetApts') >= 0 && SCB.expert === 'loan');
check('시나리오: 출처가 모두 출처 표에', SCB.src.every(k => SC.src[k]) && B.SRC.every(k => SC.src[k]));
check('기존 대표 고민 순서는 그대로(새 고민은 재개발 두 고민 다음)', SC.sc[6].id === 'redev_budget' && SC.sc[7].id === 'rebuild_live' && SC.sc[8].id === B.ID);

let s = st0(QS[0]);
check('문장: 10억 보유금 → 현금 10억 · 추천이라는 말 표시', s.cash === 100000 && s.rec === 1 && s.inc == null, s);
check('문장: 보유금 8억 + 대출', st0(QS[3]).cash === 80000);
check('문장: 10억 + 주담대로 강남3구 → 현금·지역', st0(QS[6]).cash === 100000 && st0(QS[6]).gname === '강남3구' && st0(QS[6]).gus.length === 3);
check('문장: 9억으로 서울 → 현금 9억', st0(QS[8]).cash === 90000);
const s2 = st0('연봉 8천 맞벌이 현금 10억 마포구 신축 국평 생애최초 아파트 추천');
check('문장: 연봉·현금·마포구·신축·국평·생애최초', s2.cash === 100000 && s2.inc === 8000 && s2.gname === '마포구' && s2.newb === 5 && s2.size === '84' && s2.own === 'first', s2);
check('문장: 15억 이하는 현금이 아니라 집값 상한', st0('15억 이하 서울 아파트 중 최고의 단지 10개').cash == null && st0('15억 이하 서울 아파트 중 최고의 단지 10개').pcap === 150000);
check('좁히기: 현금을 말했으면 연소득부터', B.next(B.ID, s) === 'rinc');
check('좁히기: 현금을 모르면 현금부터', B.next(B.ID, st0('서울 아파트 TOP 10 추천')) === 'rcash');
let s3 = B.set(B.ID, s, 'rinc', '7000');
check('좁히기 순서: 연소득 → 평형', B.next(B.ID, s3) === 'rsize'); s3 = B.set(B.ID, s3, 'rsize', '84');
check('좁히기 순서: 평형 → 출퇴근지', B.next(B.ID, s3) === 'rwork'); s3 = B.set(B.ID, s3, 'rwork', '마용성');
check('좁히기 순서: 출퇴근지 → 신축', B.next(B.ID, s3) === 'rnew' && s3.gus.length === 3); s3 = B.set(B.ID, s3, 'rnew', '0');
check('좁히기 순서: 신축 → 생애최초', B.next(B.ID, s3) === 'rfirst'); s3 = B.set(B.ID, s3, 'rfirst', 'y');
check('다 답하면 더 묻지 않음', B.next(B.ID, s3) === '' && s3.own === 'first');

/* 대화창(guide-core chatStart·chatNext·chatAnswer)으로 하나씩 */
{
  const mem = { m: {}, from: {} };
  const S = G.chatStart(QS[0], DATA, CTX, mem);
  check('대화: 이 고민으로 시작 · 상태에 현금', S.id === B.ID && S.nf && S.nf.cash === 100000);
  let nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: nx.ext };
  check('대화: 첫 질문 = 연 소득(하나만)', nx.key === 'rinc' && nx.quick.length >= 3);
  check('대화: 글로 답 "7천만 원"', G.chatAnswer(S, '7천만 원', DATA, CTX).ok && S.nf.inc === 7000, S.nf);
  nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화: 평형 → 단추 84', nx.key === 'rsize' && G.chatAnswer(S, '', DATA, CTX, '84').ok && S.nf.size === '84');
  nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화: 출퇴근지 → "강남3구"', nx.key === 'rwork' && G.chatAnswer(S, '강남3구', DATA, CTX).ok && S.nf.gname === '강남3구');
  nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화: 신축 → 몰라요(건너뜀)', nx.key === 'rnew' && G.chatAnswer(S, '몰라요', DATA, CTX).ok && G.chatNext(S, DATA, null).key === 'rfirst');
  S.asked = { key: 'rfirst', nf: 1, ext: 1 };
  check('대화: 생애최초 "네 처음이에요" 뒤 질문 끝', G.chatAnswer(S, '네 처음이에요', DATA, CTX).ok && S.nf.own === 'first' && G.chatNext(S, DATA, null) === null, S.nf);
}

/* ---------- ② 대출 규칙 대조·15억 문턱·소득 ---------- */
check('대출 규칙표: 집값 15억 이하 6억 · 25억 이하 4억 · 초과 2억(수도권·규제지역)', JSON.stringify(L.R.CAP.v) === JSON.stringify([{ upTo: 150000, max: 60000 }, { upTo: 250000, max: 40000 }, { upTo: null, max: 20000 }]), L.R.CAP.v);
check('대출 규칙표: 서울은 전역 규제지역 · 무주택 LTV 40% · 생애최초 70%', L.R.groupOf('11680') === 'reg' && L.R.groupOf('11350') === 'reg' && L.R.ltvOf('reg', 'none') === 0.4 && L.R.ltvOf('reg', 'first') === 0.7);
const s10 = st0('현금 10억 서울 아파트 추천');
const C10 = B.capOf(s10, L);
const K = B.ctxOf(s10, L), P10 = L.maxPrice(K.c, K.dsr);
check('최대 집값 = loan-core maxPrice(대출 한도 계산기와 같은 함수)', C10.P === P10 && C10.ex === true);
check('현금 10억(소득 미입력) → 최대 15억 · 대출 6억(LTV 40% = 상한)', C10.P === 150000 && C10.loan === 60000, [C10.P, C10.loan, C10.by]);
const nd = L.need(150000, K.c, K.dsr), cd = L.costDetail(150000, K.c);
check('비용 = 취득세(세금 엔진)·중개보수(공용 함수)·이사 등 기타 비용', Math.abs(C10.tax - (cd.acq - cd.relief + cd.edu + cd.farm)) < 1e-6 && Math.abs(C10.broker - L.brokerSale(150000).broker) < 1e-6 && C10.etc === L.ETC_DEFAULT && Math.abs(C10.need - nd.need) < 1e-6);
check('월 상환 = loan-core monthly(연 4% 가정·30년)', Math.abs(C10.pay - L.monthly(60000, 4, 30)) < 1e-6 && C10.rate === 4 && C10.term === 30);
const CL = B.cliffs(s10, L), c15 = CL.find(x => x.b === 150000);
check('15억 문턱: 15억 집 대출 6억 · 15억 1천만 원 집 대출 4억', c15 && c15.lo.L === 60000 && c15.hi.P === 151000 && c15.hi.L === 40000 && c15.hi.cap === 40000, c15);
check('15억 문턱: 15억은 살 수 있고 15억 1천만 원은 못 삼(필요한 내 돈 > 10억)', c15.lo.ok && !c15.hi.ok && c15.hi.need > 100000 && Math.abs(c15.hi.need - L.need(151000, K.c, K.dsr).need) < 1e-6);
const line = B.cliffLine(B.mainCliff(CL, C10.P));
check('15억 문턱 문장: "15억 1,000만 원짜리 집은 … 4억으로 줄어 … 오히려 못 사요"', /15억 1,000만 원짜리 집은/.test(line) && /6억에서 4억으로 줄어/.test(line) && /오히려 못 사요/.test(line), line);
check('15억 넘는 구간에서 10억으로 살 수 있는 집 없음(문턱 위 최대 0)', c15.top === 0);
const c12 = B.cliffs(st0('현금 12억'), L).find(x => x.b === 150000);
check('현금 12억이면 15억 넘는 집도 일부 가능(문턱 위 최대 = need 로 다시 계산)', c12.top > 150000 && L.need(c12.top, B.ctxOf(st0('현금 12억'), L).c, B.ctxOf(st0('현금 12억'), L).dsr).need <= 120000);
const sI7 = Object.assign({}, s10, { inc: 7000 }), C7 = B.capOf(sI7, L), K7 = B.ctxOf(sI7, L);
check('연소득 7천만 원 → 스트레스 DSR 로 한도가 줄어 최대 집값이 15억보다 낮음', C7.P < 150000 && C7.by === 'DSR' && C7.P === L.maxPrice(K7.c, K7.dsr) && C7.P0 === 150000, [C7.P, C7.by]);
check('스트레스 금리 = 대출 규칙표(수도권·규제지역 3단계)', K7.c.stress === L.R.stressAdd('reg', 'cyc', '5-9') && K7.c.stress > 0);
check('연소득 1억 → 이 현금에선 소득 기준이 한도를 줄이지 않음', B.capOf(Object.assign({}, s10, { inc: 10000 }), L).P === 150000);
check('소득을 넣으면 문장이 바뀜(줄어든 값 · 그대로)', /15억 원에서 .*으로 줄었어요/.test(B.incomeLine(sI7, C7)) && /소득에 따라 실제 한도가 줄 수 있어요/.test(B.incomeLine(s10, C10)));
check('생애최초는 LTV 70% — 15억 집 대출은 상한 6억 그대로', B.capOf(Object.assign({}, s10, { own: 'first' }), L).loan === 60000 && B.ctxOf(Object.assign({}, s10, { own: 'first' }), L).c.ltv === 0.7);

/* ---------- ③ 단지 목록 ---------- */
const R = B.rowsOf(s10, X, E);
const SQ = REC.search(B.searchQ(s10, X, E));
check('목록: 검색 화면처럼 조건에 맞는 단지 전부(10곳씩 더 보기 · 조건 충족 평형 수는 따로)', R.n === SQ.list.length && R.n > 10 && SQ.picked.length === 10 && R.total >= R.n, [R.n, R.total]);
check('목록: 단지·순서 = rec-core search(내 집 마련 맞춤 단지와 같은 엔진)', JSON.stringify(R.rows.map(r => [r.code, r.apt, r.band, r.price])) === JSON.stringify(SQ.list.map(x => [x.code, x.apt, x.band, x.P])) && R.total === SQ.total);
check('목록: 첫 10곳은 묶음마다 한 구에서 3곳까지(검색 화면과 같은 고르기)', ['a', 'b'].every(g => Object.values(R.rows.slice(0, 10).filter(r => r.grp === g).reduce((o, r) => { o[r.code] = (o[r.code] || 0) + 1; return o; }, {})).every(n => n <= 3)));
check('목록: 추천 순 = 예산에 맞는 단지(최대 집값의 85% 이상) 먼저 → 예산보다 싼 단지', R.sort === 'rec' && R.rows.every((r, i, a) => !i || !(a[i - 1].grp === 'b' && r.grp === 'a')) && R.rows.every(r => r.grp === (r.price >= REC.FIT_A * C10.P ? 'a' : 'b')) && R.nA + R.nB === R.n, [R.nA, R.nB]);
check('목록: 예산에 비해 너무 싼 단지(최대 집값의 55% 미만)는 빠짐', R.rows.every(r => r.price >= 0.55 * C10.P));
check('목록: 서울·84㎡대/59㎡대만 · 한 단지 한 줄', R.rows.every(r => /^11/.test(r.code) && (r.band === '84㎡대' || r.band === '59㎡대')) && new Set(R.rows.map(r => r.key)).size === R.n);
check('목록: 시세 = mine-core bandSummary(내 집 시세와 같은 계산)', R.rows.every(r => r.price === MC.bandSummary(r.u, IX.months).price));
check('목록: 내 돈으로 살 수 있는 단지만(need ≤ 현금) · 대출·월 상환 = loan-core', R.rows.every(r => { const n = L.need(r.price, K.c, K.dsr); return n.need <= 100000 && r.loan === Math.floor(n.loan.L) && Math.abs(r.pay - L.monthly(n.loan.L, 4, 30)) < 1e-6; }));
check('목록: 건수·기간 = 시세가 쓴 3개월의 거래 수(자료 그대로)', R.rows.every(r => { const c = MC.counts(r.u[7]), i = IX.months.indexOf(r.at); return r.p3 && r.p3.to === r.at && r.p3.from === IX.months[i - 2] && r.n3 === c[i - 2] + c[i - 1] + c[i]; }));
check('목록: 준공·세대수·역 = 자료 값', R.rows.every(r => r.by === (r.u[9].by || null) && r.hh === (r.u[9].hh || null) && r.sub === (r.u[9].sub != null ? r.u[9].sub : null)));
check('목록: 15억 넘는 단지는 없음(10억 현금 기준)', R.rows.every(r => r.price <= 150000));
check('점수: 서울 과거 성적(vcheck)이 기준을 넘어 점수 표시 · 순서는 미래가치 점수 순(검색 화면과 같음)', R.fvOk && R.track.ok && R.track.n === RK.vcheck(FX.mh, '서울특별시').n && R.rows.some(r => r.fv != null) && ['a', 'b'].every(g => { const rs = R.rows.filter(r => r.grp === g && r.fv != null); return !rs.length || rs[0].fv === Math.max(...rs.map(r => r.fv)); }));
const Rbad = B.rowsOf(s10, Object.assign({}, X, { MH: { 2: { oos_all: [{ t0: '202010', top20: -1 }, { t0: '202110', top20: -2 }], oos_avg: -1.5 } } }), E);
const sig = rs => JSON.stringify(rs.map(r => [r.key, r.band, r.price, r.loan]));
check('점수: 과거 성적이 기준 미달이면 점수를 싣지 않음(단지·순서는 검색 화면과 같은 그대로)', !Rbad.fvOk && Rbad.rows.every(r => r.fv == null) && sig(Rbad.rows) === sig(R.rows));
{ const Rd = B.rowsOf(Object.assign({}, s10, { sort: 'deal' }), X, E), Sd = REC.search(Object.assign(B.searchQ(s10, X, E), { sort: 'deal' }));
  check('정렬 단추(거래 많은 순) = 검색 화면과 같은 rec-core 정렬 · 거래 많은 순', Rd.sort === 'deal' && sig(Rd.rows) === JSON.stringify(Sd.list.map(x => [[x.code, x.dong, x.jb, x.apt].join('|'), x.band, x.P, Math.floor(x.nd.loan.L)])) && Rd.rows.every((r, i, a) => !i || a[i - 1].n12u >= r.n12u) && /data-bsort/.test(read('assets/guide-budget.js'))); }
check('같은 입력 같은 결과: 두 번 계산 · 원본 자료는 그대로(보유 기간 점수는 복사본에)', sig(B.rowsOf(s10, X, E).rows) === sig(R.rows) && FX.units.every(u => !u[9] || u[9].fvSort === undefined));
check('같은 입력 같은 결과: 대출 계산도 같음', JSON.stringify(B.capOf(s10, L)) === JSON.stringify(B.capOf(st0('현금 10억 서울 아파트 추천'), L)));
check('평형 84㎡대만', B.rowsOf(Object.assign({}, s10, { size: '84' }), X, E).rows.every(r => r.band === '84㎡대'));
check('지역(마용성)만', B.rowsOf(B.set(B.ID, s10, 'rwork', '마용성'), X, E).rows.every(r => ['마포구', '용산구', '성동구'].indexOf(r.gu) >= 0));
check('신축 5년 이내만(자료 날짜 기준 연수)', B.rowsOf(Object.assign({}, s10, { newb: 5 }), X, E).rows.every(r => r.by && +FX.updated.slice(0, 4) - r.by <= 5));
check('소득 7천이면 조건에 맞는 단지가 줄어듦', B.rowsOf(sI7, X, E).total < R.total);
/* 위험 신호 */
const RK0 = r => B.risks(r, L.R.CAP.v).map(x => x.k);
check('위험: 비교 거래 적음 = 최근 1년 3건 미만', R.rows.every(r => (RK0(r).indexOf('thin') >= 0) === ((r.n12 || 0) < MC.FEW)) && B.risks({ thin: true, n12: 1 }, L.R.CAP.v).some(x => x.k === 'thin'));
check('위험: 15억 문턱 = 최근 1년 시세가 15억을 넘은 적이 있는 단지', R.rows.filter(r => r.capB).every(r => r.range.hi > 150000 && r.price <= 150000) && R.rows.some(r => r.capB));
check('위험: 재건축 단계 = 자료 rz · 단계 이름(redev-core)', R.rows.filter(r => r.rz).every(r => B.risks(r, L.R.CAP.v).find(x => x.k === 'rz').t.indexOf(r.rz.lv + '단계') >= 0) && R.rows.some(r => r.rz));
check('위험: 전세가율 40% 미만 낮은 편 · 60% 이상 높은 편(단지 화면과 같은 구간)', R.rows.filter(r => r.jr != null).every(r => { const t = B.risks(r, L.R.CAP.v).find(x => x.k === 'jr').t; return r.jr < 0.4 ? /낮은 편/.test(t) : r.jr >= 0.6 ? /높은 편/.test(t) : !/편/.test(t); }));
check('위험: 토지거래허가 = 정책 표(서울 아파트 지정)', R.th && R.th.v === 'apt');
const sR = R.rows.filter(r => FX.price[r.code]).map(r => [r, B.susCount(r, FX.price[r.code], IX.months, MC, PT)]);
check('위험: 특수 거래 의심 = pro-tools-core judge(최근 1년)', sR.length > 0 && sR.some(x => x[1] > 0) && sR.every(([r, n]) => { const u = FX.price[r.code].units.find(x => x[0] === r.code && x[1] === r.dong && String(x[8]) === String(r.jibun) && x[2] === r.apt && x[3] === r.band); return !u || n === PT.judge(MC.trades(u)).filter(t => t.sus && t.ymd >= +(String(+IX.months[35].slice(0, 4) - 1) + IX.months[35].slice(4) + '01')).length; }));

/* ---------- ④ 카드 문구 ---------- */
const r1 = G.solve(SCB, { _nf: s10 }, Object.assign({ BX: X, today: '2026-11-26' }, E));
const txt = JSON.stringify(Object.assign({}, r1, { _R: 0, _C: 0, _CL: 0, _st: 0 }));
check('카드 계산됨(guide-core solve → S.budgetApts)', r1 && !r1.err && !r1.need && /최대 15억 원짜리 집/.test(r1.head) && r1.nums.length >= 3 && r1.tables[0].rows.length === 10, r1 && (r1.err || r1.need || r1.head));
check('카드: 권유 문구 없음 · 말투', !G.BAD.test(txt) && !/습니다|사세요|추천\s*단지|BEST|베스트\s*\d/.test(txt), (txt.match(G.BAD) || txt.match(/습니다|사세요/) || [])[0]);
check('카드: 빈 값·NaN 없음', !/NaN|undefined|Infinity/.test(txt));
check('카드: 검색 화면과 같은 순서 설명 · 출처·기간·갱신일', /내 집 마련 맞춤 단지\(조건 검색\) 화면과 같은 계산/.test(r1.tables[0].note) && /국토교통부 실거래/.test(r1.tables[0].note) && /자료 갱신 2026\.11\.26/.test(r1.tables[0].note) && /호가 아님/.test(r1.tables[0].note));
check("카드: '추천'이라는 말에는 '근거와 함께 정리(추천 순위 아님)'", r1.rec === B.REC_LINE && /추천 순위 아님/.test(B.REC_LINE));
check('카드: 현금을 모르면 되묻기(숫자 지어내지 않음)', (G.solve(SCB, { _nf: st0('서울 아파트 TOP 10') }, Object.assign({ BX: X }, E)).need || [])[0] === 'cash');
const W = B.warnOf(s10, C10, L).join(' ');
check('주의점: 소득 미입력·토지거래허가 실거주·6개월 전입·신용대출·금리 가정·호가', ['소득 기준(DSR)', '토지거래허가', '6개월 안에', '신용대출', '가정', '호가'].every(k => W.indexOf(k) >= 0), W);
const T = B.trustOf(R, X, L), TT = JSON.stringify(T);
check('믿을 이유: 출처·갱신 주기·같은 답·과거 성적(guide/method)·위험 기준', T.length === 4 && /하루 4번/.test(TT) && /같은 단지·순서·숫자/.test(TT) && /guide\/method\/#trk/.test(TT) && /9번 중 7번/.test(TT) && /60% 넘게 비싸거나/.test(TT) && /loan\/#rules/.test(TT));
check('믿을 이유·화면 문구에 다른 서비스 이름 없음', !/(호갱노노|직방|아실|리치고|네이버\s*부동산|부동산\s*지인|챗GPT|ChatGPT|GPT|Gemini|제미나이|클로드|Claude|뤼튼|생성형)/i.test(read('assets/guide-budget.js').replace(/^\/\*[\s\S]*?\*\//, '') + TT));
const NL = B.nextLinks(s10, R, C10, { BASE: '/', expertLink: k => ({ t: '확인된 대출상담사에게 물어보기', href: '/counsel/pros/?c=' + k, k: 'pro' }) });
check('다음 단계: 대출 계산(값 채움)·관심 단지 알림·확인된 전문가', NL.length === 3 && /loan\/\?p=\d+&g=11\d{3}&o=none&n=/.test(NL[0].href) && /my\/watch\//.test(NL[1].href) && NL[2].k === 'pro');
globalThis.JDJ_ASK_CORE = require('../assets/ask-core.js');
check('다음 단계: 고른 단지 비교(2~3곳) = 단지 비교 화면 주소', /ask\/\?k=/.test(B.cmpUrl(R.rows, R.rows.slice(0, 2).map(r => r.key))) && B.cmpUrl(R.rows, [R.rows[0].key]) === '');
delete globalThis.JDJ_ASK_CORE;

/* ---------- 화면 연결 ---------- */
const gjs = read('assets/guide.js'), gcore = read('assets/guide-core.js'), sw = read('sw.js'), solve = read('solve/index.html'), home = read('index.html'), gb = read('assets/guide-budget.js');
check('guide.js: 미리 불러오기·즉답·길잡이 화면·대화에서 이 파일로', /'assets\/guide-budget\.js\?v=4': 'JDJ_GBUDGET'/.test(gjs) && /JDJ_GBUDGET\.instant/.test(gjs) && /JDJ_GBUDGET\.flow/.test(gjs) && /JDJ_GBUDGET\.chatCard/.test(gjs));
check('guide-core: 계산 함수·대화 좁히기 연결', /S\.budgetApts/.test(gcore) && /JDJ_GBUDGET\.chatQ/.test(gcore) && /JDJ_GBUDGET\.answer/.test(gcore));
check('길잡이 화면·서비스 워커에 이 파일', /assets\/guide-budget\.js\?v=4/.test(solve) && /'\.\/assets\/guide-budget\.js\?v=4'/.test(sw));
check("첫 화면 '많이 받는 고민': lead 고민을 맨 앞에", /\.filter\(s => s\.pri\)\.sort\(\(x, y\) => \(y\.lead/.test(gjs) && /guide\.js\?v=19/.test(home));
check('화면: 정렬 단추에 추천 순위 아님 · 즉답(바로 답) · 믿을 이유 접힌 칸', /추천 순위 아님/.test(gb) && /바로 답/.test(gb) && /details class="gbtr"><summary>이 답을 믿을 수 있는 이유/.test(gb));
check('화면: 진한 꽉 찬 단추는 묶음마다 1개(즉답: 목록 보기 · 길잡이 화면: 고른 단지 비교)', (gb.match(/class="p"/g) || []).length === 1 && /\.gbcmp a\{[^}]*background:var\(--blue/.test(gb));
check('화면: 색은 토큰(var(--…))으로', (gb.match(/var\(--/g) || []).length > 40);
check('화면이 불러오는 파일 번호 = 원격 최고 번호(pro-tools-core·watch·rank-core·result.css)', /pro-tools-core\.js\?v=3/.test(gb) && /watch\.js\?v=9/.test(gb) && /watch-core\.js\?v=2/.test(gb) && /rank-core\.js\?v=8/.test(gb) && /result\.css\?v=3/.test(gb) && /'\.\/assets\/pro-tools-core\.js\?v=3'/.test(sw) && /rank-core\.js\?v=8/.test(solve));
/* 길잡이 ↔ 검색 화면 오가기 */
const su = B.sameUrl(Object.assign({}, s10, { inc: 8000, size: '84', newb: 5, own: 'first' }), IX, '/');
check("결과 아래 '같은 조건으로 검색 화면에서 보기': 내 집 마련 맞춤 단지 주소(서울·평형·생애최초·신축 — 개인값은 주소에 없음)", /^\/buy\/report\/\?sd=/.test(su) && /ar=84/.test(decodeURIComponent(su)) && /o=first/.test(su) && /nb=5/.test(su) && /from=guide/.test(su) && !/[?&](i|c|d|n|e)=/.test(su), su);
check('소득을 모르면 검색 화면 주소를 만들지 않음(검색 화면은 소득 기준까지 계산)', B.sameUrl(s10, IX, '/') === null && /연 소득을 고르면/.test(gb));
check('개인값은 이 탭에만(sessionStorage jdj_gfin) · 검색 화면이 from=guide 일 때 읽음', /jdj_gfin/.test(gb) && /jdj_gfin/.test(read('buy/report/index.html')) && B.sameFin({ inc: 8000, cash: 100000 }).c === 100000);
check('자료 파일: 공개 자료에서 뽑은 일부(기간·갱신일)', FX.months.length === 36 && /^\d{4}-\d{2}-\d{2}$/.test(FX.updated) && FX.units.length >= 100);

console.log(`\n보유 현금 + 대출 서울 아파트 길잡이: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
