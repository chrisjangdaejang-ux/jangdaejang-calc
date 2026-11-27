/* 청약 공고 한 곳의 무료 진단 + 유료 3가지(assets/cy-plan.js) 자동 확인 — 실행: node tools/cy-plan-test.js </dev/null
   ① 내 돈 계획표: 손으로 계산한 예시 3개(이자후불제·LTV 한도 / 이자 내가 매달 / 중도금 대출 없음)와 날짜별 모자라는 돈이 같음, .ics
   ② 전략표·주택형별 당첨 가능성: 고민 찾기(guide-core cy_where)와 청약 가점 화면이 쓰는 같은 판정(예상 커트라인·가능성) — 숫자·글자가 같음
   ③ 평형별 분양가 비교·전매제한·실거주의무·재당첨 제한·입지 거리
   ④ 입주 가격: 검증을 마친 기간이 없으면 가격 범위 숫자를 내지 않음(요인 카드만)
   ⑤ 유료 미리 보기: 실제 자료 한 줄 + '자세히 보기 (유료)' + 결제 닫힘 안내, 화면 문구 원칙 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('XX ' + name, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } }

const ctx = { console, fetch: () => Promise.reject(new Error('no net')), location: { pathname: '/jangdaejang-calc/chungyak/price/', search: '' }, JDJ_SITE: { PAID_OPEN: false, PAY_REVIEW: false } };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['tax/tax-engine.js', 'assets/loan-rules.js', 'assets/rec-core.js', 'assets/loan-core.js', 'assets/cy-price.js', 'assets/sale-status.js', 'assets/premium-teaser.js', 'assets/cy-plan.js']) vm.runInContext(read(f), ctx, { filename: f });
ctx.JDJ_CYE = require('../chungyak/cy-engine.js');
const P = ctx.JDJ_CYPLAN, E = ctx.JDJ_CYE;
check('모듈 로드', !!(P && ctx.JDJ_CYP && ctx.JDJ_LOAN && ctx.JDJ_SALE && ctx.JDJ_TEASER));

/* ---------- ① 내 돈 계획표 — 손 계산 예시 ---------- */
// 예시 1: 분양가 6억, 계약금 10%(6,000만) · 중도금 60%(3억 6,000만) 3회(1억 2,000만씩) · 중도금 대출 LTV 50%(3억까지) · 이자후불제 연 4%
//   대출: 1회 1억 2,000 · 2회 1억 2,000 · 3회 6,000(나머지 6,000은 내 돈) → 중도금 대출 3억
//   이자(입주 2028.1.1에 한꺼번에): (12,000×275일 + 12,000×184일 + 6,000×92일) × 4% ÷ 365 = 6,060,000 × 0.04 ÷ 365 = 664.1 → 664만 원
//   잔금 = 60,000 − 6,000 − 36,000 = 18,000 · 잔금 대출 2억 4,000 → 입주 때 = 18,000 + 30,000(중도금 대출 상환) − 24,000 + 664 = 24,664
//   취득세 등 660 → 내 돈 합계 = 6,000 + 6,000 + 24,664 + 660 = 37,324
//   가진 돈 1억(2026.12.1) · 보증금 2억(2027.12.15 돌려받음)
//   날짜별: 계약 뒤 4,000 → 3회차(2027.10.1) −2,000(처음 모자람 2,000) → 보증금 +20,000 = 18,000 → 잔금 −6,664 → 취득세 −7,324(가장 많이 모자람)
const o1 = { price: 60000, dp: 10, mid: 60, n: 3, midDates: ['20270401', '20270701', '20271001'], ct: '20270101', move: '20280101', midLoan: true, midInt: 'after', rate: 4, ltv: 0.5, loan: 24000, tax: 660,
  cash: 10000, dep: { amt: 20000, date: '20271215' }, sale: { amt: 0, date: '' }, today: '20261201' };
const R1 = P.plan(o1);
check('예시1: 계약금 6,000 · 중도금 회차 12,000씩', R1.down === 6000 && R1.each.join() === '12000,12000,12000', [R1.down, R1.each]);
check('예시1: 중도금 대출은 LTV 50% = 3억까지(3회차 일부는 내 돈)', R1.midLoanAmt === 30000 && R1.rows.find(r => r.t === '중도금 3회차').out === 6000, R1.rows);
check('예시1: 이자후불제 이자 664만 원(날짜 수 275·184·92일)', R1.interest === 664 && P.days('20270401', '20280101') === 275 && P.days('20270701', '20280101') === 184 && P.days('20271001', '20280101') === 92, R1.interest);
check('예시1: 입주 때 낼 돈 24,664 = 잔금 18,000 + 중도금 대출 상환 30,000 − 잔금 대출 24,000 + 이자 664', R1.moveOut === 24664 && R1.bal === 18000 && R1.loan === 24000, R1.moveOut);
check('예시1: 내 돈 합계 37,324', R1.total === 37324, R1.total);
check('예시1: 처음 모자라는 날 2027.10.1 · 2,000만 원', R1.firstShort && R1.firstShort.date === '20271001' && R1.firstShort.amt === 2000, R1.firstShort);
check('예시1: 가장 많이 모자라는 금액 7,324(입주 때 취득세까지)', R1.maxShort === 7324 && R1.end === -7324, [R1.maxShort, R1.end]);
check('예시1: 날짜 순서(가진 돈 → 계약 → 회차 → 보증금 → 잔금 → 취득세)', R1.rows.map(r => r.k).join() === 'cash,down,mid,mid,mid,dep,bal,tax', R1.rows.map(r => r.k));
// 예시 2: 같은 조건, LTV 한도 없음(1) · 이자는 내가 매달(다음 납부일까지 모아 표시)
//   7.1까지 1회 대출 12,000 × 91일 × 4%/365 = 119.67 → 120 · 10.1까지 24,000 × 92일 = 241.97 → 242 · 입주까지 36,000 × 92일 = 362.96 → 363 → 합 725
//   입주 때 = 18,000 + 36,000 − 24,000 = 30,000(이자는 이미 냄), 합계 = 6,000 + 0 + 30,000 + 660 + 725 = 37,385
const R2 = P.plan(Object.assign({}, o1, { ltv: 1, midInt: 'self', dep: null, cash: 0 }));
check('예시2: 매달 내는 이자 120·242·363 = 725', R2.rows.filter(r => r.k === 'int').map(r => r.out).join() === '120,242,363' && R2.interest === 725, R2.rows.filter(r => r.k === 'int'));
check('예시2: 입주 때 30,000 · 합계 37,385', R2.moveOut === 30000 && R2.total === 37385, [R2.moveOut, R2.total]);
// 예시 3: 중도금 대출 없이 내 돈 · 잔금 대출 한도(24,000)가 잔금(18,000)보다 크면 잔금만큼만 빌림 → 입주 때 0 + 취득세
const R3 = P.plan(Object.assign({}, o1, { midLoan: false, midInt: 'free', cash: 0, dep: null }));
check('예시3: 중도금 대출 0 · 잔금 대출은 잔금만큼(18,000) · 입주 때 0', R3.midLoanAmt === 0 && R3.loan === 18000 && R3.moveOut === 0 && R3.interest === 0 && R3.total === 6000 + 36000 + 660, R3);
check('예시3: 무이자(시행사 부담)는 이자 0', P.plan(Object.assign({}, o1, { midInt: 'free' })).interest === 0);
// 회차 날짜를 비우면 계약~입주 사이를 고르게(365일 ÷ 4 → 91·183·274일 뒤)
check('회차 날짜 고르게: 2027.4.2 · 7.3 · 10.2', P.evenDates('20270101', '20280101', 3).join() === '20270402,20270703,20271002', P.evenDates('20270101', '20280101', 3));
check('회차 날짜가 회차 수와 다르면 고르게 다시', P.plan(Object.assign({}, o1, { n: 2 })).dates.length === 2);
// 집 판 돈이 계약 전에 들어오면 모자람이 없어짐
check('집 판 돈 반영', P.plan(Object.assign({}, o1, { sale: { amt: 20000, date: '20270301' } })).firstShort === null);
const ics = P.planIcs(R1, '테스트 84A', 'https://x/');
check('.ics: 낼 돈 있는 날만(계약·3회차·잔금·취득세 = 4개) · 일주일 전 알림', (ics.match(/BEGIN:VEVENT/g) || []).length === 4 && ics.includes('TRIGGER:-P7D') && ics.includes('DTSTART;VALUE=DATE:20271001') && ics.includes('2\\,000만 원 모자라요'), ics.slice(0, 300));
// 잔금 대출 = cy-price fund(=loan-core) 값 그대로
const F = ctx.JDJ_CYP.fund({ price: 120000, g: '11290', own: 'none', income: 0, dp: 10, mid: 60, midLoan: true, large: false });
check('잔금 대출 한도는 내 집 마련 계산기(loan-core)와 같은 값 · 규제지역 LTV 40%', F.loan === 48000 && F.ltv === 0.4 && P.loanRuleTxt(F).includes('LTV(집값 대비 대출 비율) 40%') && P.loanRuleTxt(F).includes('4억 8,000만 원'), P.loanRuleTxt(F));

/* ---------- ② 판정이 고민 찾기·청약 가점 화면과 같음 ---------- */
const NOTI = [
  { no: 'N1', n: '서울가단지', sd: '서울특별시', g: '중랑구', ad: '서울특별시 중랑구 1', k: '민영', pb: '20261120', sp: ['', ''], r1: ['20261201', '20261201'], rc: ['20261201', '20261203'], pw: '20261210', f: ['투기과열지구', '조정대상지역'], u: 'https://www.applyhome.co.kr/x1',
    ty: [['059.0000A', 59, 40, 20, 50000], ['084.0000A', 84, 30, 10, 80000]], cut: [{ band: 0, lo: 60, hi: 69, avg: 66, scope: '같은 시·도', nCx: 44, nRows: 182, from: '202411', to: '202608' }, { band: 1, lo: 56, hi: 62, avg: 60, scope: '같은 시·도', nCx: 34, nRows: 130, from: '202411', to: '202608' }] },
  { no: 'N2', n: '서울나단지', sd: '서울특별시', g: '강서구', ad: '서울특별시 강서구 2', k: '민영', pb: '20261125', sp: ['', ''], r1: ['20261208', '20261208'], rc: ['20261208', '20261210'], pw: '20261210', f: ['투기과열지구'], u: 'https://www.applyhome.co.kr/x2',
    ty: [['084.0000A', 84, 50, 10, 90000]], cut: [{ band: 1, lo: 66, hi: 72, avg: 69, scope: '같은 시·도', nCx: 30, nRows: 120, from: '202411', to: '202608' }] },
  { no: 'N3', n: '경기다단지', sd: '경기도', g: '수원시', ad: '경기도 수원시 3', k: '민영', pb: '20261125', sp: ['', ''], r1: ['20261208', '20261208'], rc: ['20261208', '20261210'], pw: '20261217', f: [], u: '',
    ty: [['084.0000A', 84, 50, 10, 60000], ['101.0000A', 101, 20, 0, 80000]], cut: [{ band: 1, lo: 40, hi: 50, avg: 45, scope: '같은 시·도', nCx: 30, nRows: 120, from: '202411', to: '202608' }] },
  { no: 'N4', n: '끝난단지', sd: '서울특별시', g: '중구', ad: '서울특별시 중구 4', k: '민영', pb: '20260901', sp: ['', ''], r1: ['20260910', '20260910'], rc: ['20260910', '20260912'], pw: '20260920', f: [], ty: [['084.0000A', 84, 10, 0, 1]], cut: [] },
  { no: 'N5', n: '부산공공', sd: '부산광역시', g: '강서구', ad: '부산광역시 강서구 5', k: '국민', pb: '20261125', sp: ['', ''], r1: ['20261208', '20261208'], rc: ['20261208', '20261210'], pw: '20261217', f: ['분양가상한제', '공공주택지구'], ty: [['059.0000A', 59, 50, 50, 30000]] }
];
const S = P.strategy(NOTI, 64, null, '20261126', 'all');
check('전략표: 진행·예정 민영 공고만(끝난 공고·국민주택 제외)', S.n === 3 && !S.rows.some(r => r.no === 'N4' || r.no === 'N5'), S.rows.map(r => r.no));
check('전략표: 순서 = 가능성 높음 → 경합 → 낮음 → 추첨제 · 같은 판정은 여유 큰 순', S.rows.map(r => r.no + r.tyName).join() === 'N384A,N184A,N159A,N284A,N3101A', S.rows.map(r => [r.no + r.tyName, r.d && r.d.g, r.margin]));
check('전략표: 여유 = 내 가점 − 범위 상단(64 − 50 = +14)', S.rows[0].margin === 14 && S.rows[0].d.g === 'hi');
check('전략표: 85㎡ 초과 비규제 = 추첨제(가점 없음)', S.rows[4].lt.noGajum && !S.rows[4].d);
check('전략표: 같은 날 발표(12.10) 공고는 한 곳만 신청 안내', S.rows.find(r => r.no === 'N2').cons.some(c => /같은 공고 1곳과는 한 사람이 한 건만 신청할 수 있어요\(두 건 넣으면 모두 무효 — 같은 단지 특별공급·일반공급 1건씩은 가능, 부부는 각자 신청 가능\)/.test(c)));
/* 2026-11-27 원문 대조: 1인 1건은 국민·민영, 전국 모든 공고에 함께 적용(공고문 — 규칙 제21조 제3항 제24호) → 경기 N3(12.17)과 부산 국민 N5(12.17)도 같은 날 */
check('전략표: 같은 날 발표 셈에 국민주택·다른 시·도 공고도 넣음(N3 ↔ N5)', S.rows.find(r => r.no === 'N3').cons.some(c => /발표일\(2026\.12\.17\)이 같은 공고 1곳/.test(c)), S.rows.find(r => r.no === 'N3').cons);
check('전략표: 투기과열지구 당첨 → 재당첨 제한 10년', S.rows.find(r => r.no === 'N1').rewin === 10 && S.rows.find(r => r.no === 'N3').rewin === 0);
const Sn = P.strategy(NOTI, 64, { m: { mySido: '부산광역시', mySgg: '해운대구' } }, '20261126', 'near');
check('전략표: 볼 범위 = 내 시·도(부산엔 민영 없음)', Sn.n === 0 && Sn.scope === '부산광역시' && P.strategyHTML(Sn).includes('전국으로 바꿔'));
const Sk = P.strategy(NOTI, 64, { m: { mySido: '경기도', mySgg: '수원시 팔달구' } }, '20261126', 'near');
check('전략표: 수도권에 살면 수도권 전체 · 경기 수원 → 수원 공고 해당지역, 서울 공고 기타지역', Sk.n === 3 && Sk.scope === '수도권' && Sk.rows.find(r => r.no === 'N3').here === true && Sk.rows.find(r => r.no === 'N1').here === false, Sk.rows.map(r => [r.no, r.here, r.cons[0]]));
// 1순위 판정: 저장된 답(통장 가입 2025년 → 규제지역 24개월 못 채움)
const A = { own: false, birth: '1988-03-01', married: true, marDate: '2016-05-01', soldDate: '', sold: false, deps: 2, dep: {}, accDate: '2025-06-01', noAcc: false, spAcc: '', spNone: true, ref: '2026-11-26', quick: null };
const Sr = P.strategy(NOTI, 64, { A, e: { head: 'y', win: 'n', house: '0', ever: 'y', kids: '1', dep: '1500', cnt: '' }, m: { mySido: '서울특별시', mySgg: '중랑구' } }, '20261126', 'all');
check('전략표: 1순위 어려움(규제지역 통장 24개월) → 맨 뒤로', Sr.rows.find(r => r.no === 'N1').block && Sr.rows.find(r => r.no === 'N1').cons.some(c => /1순위 어려움/.test(c)) && Sr.rows[Sr.rows.length - 1].block, Sr.rows.map(r => [r.no, r.block]));
/* 고민 찾기(guide-core cy_where) 답과 같은 숫자·판정 */
const G = require('../assets/guide-core.js'), SC = JSON.parse(read('assets/guide/scenarios.json'));
const gr = G.solve(SC.sc.find(s => s.id === 'cy_where'), { myscore: 64, csido: '서울특별시' }, { L: ctx.JDJ_LOAN, CY: E, SALE: ctx.JDJ_SALE, today: '2026-11-26', cyNotices: NOTI, cyRows: [] });
const gt = (gr.tables || [])[0];
check('고민 찾기 답이 계산됨', gt && gt.rows.length === 3, gr);
const Ss = P.strategy(NOTI, 64, null, '20261126', 'all'), BT = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
(gt ? gt.rows : []).forEach(row => {
  const name = row[0].t, band = BT.indexOf(row[3]), cut = row[4], pg = row[5].t.split(' ')[0] === '가능성' ? row[5].t.split(' (')[0] : row[5].t.split(' (')[0];
  const mine = Ss.rows.filter(r => r.name === name && r.band === band);
  const myCut = mine[0] && mine[0].p ? (mine[0].p.lo === mine[0].p.hi ? `${mine[0].p.lo}점` : `${mine[0].p.lo}~${mine[0].p.hi}점`) : '';
  const myG = mine[0] && mine[0].d ? { hi: '가능성 높음', mid: '경합', lo: '낮음' }[mine[0].d.g] : '';
  check(`고민 찾기 = 전략표: ${name} ${row[3]} 커트라인 ${cut} · ${pg}`, mine.length && myCut === cut && myG === pg, [row, myCut, myG]);
  /* 무료 화면(주택형별 당첨 가능성)도 같은 범위·같은 판정 글자 */
  const n = NOTI.find(x => x.n === name), html = P.typeOddsHTML(n, 64, [], '20261126');
  check(`무료 당첨 가능성 = 고민 찾기: ${name} ${row[3]}`, html.includes(`예상 최저 당첨 가점 <b>${cut}</b>`) && html.includes(`>${pg}<`), html.slice(0, 300));
});
check('무료 당첨 가능성: 국민주택은 커트라인 대신 순차제 안내', P.typeOddsHTML(NOTI[4], 64, [], '20261126').includes('납입 횟수·금액 순'));
check('무료 당첨 가능성: 만든 방법(범위·단지·주택형 수·기간)', P.methodTxt(E.cutOf(NOTI[0], 1)).includes('과거 34개 단지 130개 주택형(2024.11~2026.08 공고)'));
const rows = [['중랑구', 'X단지', '202607', 84.9, 1, 'h', 55, 60.5, 69, '12.30', 'Q1'], ['노원구', 'Y단지', '202608', 84.5, 1, 'h', 50, 58, 66, '8.00', 'Q2'], ['중랑구', 'Z단지', '202301', 84, 1, 'h', 40, 45, 50, '2.0', 'Q3'], ['중랑구', 'W단지', '202607', 59, 0, 'h', 60, 61, 62, '3', 'Q4'], ['중랑구', 'V단지', '202607', 84, 1, 'o', 30, 31, 32, '1', 'Q5']];
const sim = P.similar(rows, NOTI[0], 1, '20261126', 5);
check('비슷한 단지 과거 결과: 같은 면적대·해당지역·최근 2년·같은 구 먼저', sim.map(x => x.name).join() === 'X단지,Y단지' && sim[0].rate === 12.3 && sim[0].lo === 55, sim);

/* ---------- ③ 평형별 분양가·규칙·입지 ---------- */
const D = { name: '테스트', sd: '서울특별시', gn: '영등포구', g: '11560', hh: 218, dataTo: '202610', updated: '2026-11-27', ct: ['20261214'], mv: '203003', no: '2026000560', sid: 's00',
  bands: [{ b: 1, q: [7645, 7982, 8260], scope: '반경 1km', n: 16, apts: 2, span: [20251225, 20261028], lack: false }],
  types: [{ ty: '084.9409A', area: 84.94, hh: 110, price: 182700 }, { ty: '059.9000A', area: 59.9, hh: 20, price: 100000 }],
  complexes: [{ name: '아크로타워스퀘어', dong: '영등포동7가', band: 1, by: 2017, d: 0.85, med: 7996, n: 15 }, { name: '포레나영등포센트럴', dong: '영등포동7가', band: 1, by: 2020, d: 0.69, med: 7017, n: 1 }, { name: '작은집', band: 0, by: 2020, d: 0.2, med: 9000, n: 3 }] };
const tc = P.typeCompare(D);
// 84A: 182,700 ÷ (84.94 ÷ 3.3058) = 7,110.6 → 7,111 · 주변 중간값 7,982 → 7,111/7,982 − 1 = −10.9% → 11% 낮아요 · 같은 면적 = 7,982 × 84.94 ÷ 3.3058 = 205,091
check('평형별: 84A 3.3㎡당 7,111만 · 주변 중간값보다 11% 낮음 · 같은 면적 주변값 20억 5,091만', tc[1].name === '84A' && tc[1].ppy === 7111 && tc[1].pct === -11 && tc[1].nearWon === 205091, tc[1]);
check('평형별: 비교 단지는 같은 면적대만 가까운 순', tc[1].cx.map(c => c.name).join() === '포레나영등포센트럴,아크로타워스퀘어');
check('평형별: 면적대 자료가 없으면 숫자 없이 비교 자료 부족', tc[0].lack && !tc[0].pct);
const th = P.typeCompareHTML(D);
check('평형별 화면: 근거 단지·계약일·실거래 기준월', th.includes('아크로타워스퀘어(2017년 준공, 0.8km') && th.includes('2025.12.25~2026.10.28') && th.includes('2026년 10월까지') && th.includes('11% 낮아요') && th.includes('비교 자료 부족'), th.slice(0, 400));
check('평형별: 토지임대부는 비교 안 함', P.typeCompare({ bands: [{ b: 1, lease: true }], types: [{ ty: '074A', area: 74, hh: 1, price: 30000 }] })[0].lease);
const ru = n => P.rules(Object.assign({ n: 'x', sd: '서울특별시', g: '', ad: '서울특별시 x', ty: [] }, n));
check('전매: 수도권 규제지역 3년 · 재당첨 10년', ru({ f: ['투기과열지구'] }).resale === '3년' && ru({ f: ['투기과열지구'] }).rewin.y === 10);
check('전매: 서울 비규제 민간 = 과밀억제권역 1년', ru({ f: [] }).resale === '1년' && !ru({ f: [] }).live.has && ru({ f: [] }).rewin.y === 0);
check('전매: 경기 화성 비규제 6개월 · 수원 1년', ru({ sd: '경기도', ad: '경기도 화성시 x', g: '화성시 병점구', f: [] }).resale === '6개월' && ru({ sd: '경기도', ad: '경기도 수원시 x', g: '수원시 영통구', f: [] }).resale === '1년');
check('전매·거주: 수도권 공공택지 분양가상한제 3년 · 실거주 5년/3년', ru({ sd: '경기도', ad: '경기도 화성시 x', g: '화성시', f: ['분양가상한제', '공공주택지구'] }).resale === '3년' && /80% 미만이면 5년, 80~100%면 3년/.test(ru({ sd: '경기도', ad: '경기도 화성시 x', g: '화성시', f: ['분양가상한제', '공공주택지구'] }).live.txt));
check('전매: 비수도권 공공택지 분상제 1년 · 광역시 6개월 · 그 외 없음', ru({ sd: '경상남도', ad: '경상남도 사천시 x', g: '사천시', f: ['분양가상한제', '공공주택지구'] }).resale === '1년' && ru({ sd: '부산광역시', ad: '부산광역시 동구 x', g: '동구', f: [] }).resale === '6개월' && ru({ sd: '충청남도', ad: '충청남도 논산시 x', g: '논산시', f: [] }).resale === '없음');
check('거주: 실거주의무 있으면 3년 안에 입주 시작 안내(2024. 3. 개정)', /3년 안에 들어가 살기 시작하면 돼요/.test(ru({ f: ['분양가상한제'] }).live.txt) && ru({ f: ['분양가상한제'] }).rewin.y === 10);
check('재당첨: 조정대상지역 7년', ru({ sd: '경상남도', ad: '경상남도 x', g: '창원시', f: ['조정대상지역'] }).rewin.y === 7);
/* ---------- 2026-11-27 법령 원문 대조 예시(주택법 시행령 별표 3 <2024. 6. 18.>·주택법 제57조의2 <2024. 3. 19.>·시행령 제60조의2·주택공급에 관한 규칙 제54조) ---------- */
{
  /* 예1) 경기 화성 공공택지 토지임대부(비규제): 전매 10년(별표 3 제7호) · 실거주 5년·유예 없음(제57조의2 ①단서 괄호, 시행령 제60조의2 ①) · 재당첨 5년(제54조 ②3) */
  const L1 = ru({ n: '화성 토지임대부 x', sd: '경기도', ad: '경기도 화성시 x', g: '화성시', f: ['공공주택지구'] });
  check('예1 토지임대부: 전매 10년 · 실거주 5년(입주 유예 없음) · 재당첨 5년', L1.resale === '10년' && L1.live.has && /5년 동안 직접 살아야/.test(L1.live.txt) && /유예 없이/.test(L1.live.txt) && !/3년 안에 들어가/.test(L1.live.txt) && L1.rewin.y === 5, [L1.resale, L1.live.txt, L1.rewin]);
  /* 예2) 수도권 밖 토지임대부도 실거주 5년(제57조의2 ① 제4호는 지역 구분 없음) */
  const L2 = ru({ n: '세종 토지임대부 x', sd: '세종특별자치시', ad: '세종특별자치시 x', g: '', f: [] });
  check('예2 비수도권 토지임대부: 전매 10년 · 실거주 있음', L2.resale === '10년' && L2.live.has, [L2.resale, L2.live]);
  /* 예3) 수도권 밖 분양가상한제(공공택지): 전매 1년 · 실거주 없음(제2호 행정중심복합도시 삭제 2024. 3. 19.) · 재당첨 10년 */
  const L3 = ru({ sd: '세종특별자치시', ad: '세종특별자치시 x', g: '', f: ['분양가상한제', '공공주택지구'] });
  check('예3 비수도권 분상제: 전매 1년 · 실거주 없음(행복도시 예외 문구 없음) · 재당첨 10년', L3.resale === '1년' && !L3.live.has && !/행정중심복합도시/.test(L3.live.txt) && L3.rewin.y === 10, [L3.resale, L3.live.txt]);
  /* 예4) 서울 민간택지 분양가상한제(투기과열): 전매 3년 · 실거주 80% 미만 3년/80~100% 2년, 최초 입주가능일부터 3년 안 입주 · 재당첨 10년 */
  const L4 = ru({ f: ['투기과열지구', '분양가상한제'] });
  check('예4 서울 민간택지 분상제: 전매 3년 · 실거주 3년/2년 · 3년 안 입주 · 재당첨 10년', L4.resale === '3년' && /80% 미만이면 3년, 80~100%면 2년/.test(L4.live.txt) && /최초 입주가 가능한 날부터 3년 안에/.test(L4.live.txt) && L4.rewin.y === 10);
  /* 예5) 재당첨 제한 중 제한 범위: 비규제지역 민영주택은 빼고(제54조 ① 괄호) */
  check('예5 재당첨 제한 범위 = 비규제지역 민영주택 제외', /비규제지역 민영주택을 뺀 다른 분양주택/.test(L4.rewin.txt) && !/분양가상한제 단지 등에 청약할 수 없어요/.test(L4.rewin.txt));
  /* 예6) 규제 표시 없는 국민주택(공공분양): '보통 없음'이 아니라 공고문 확인 */
  const L6 = ru({ k: '국민', sd: '충청남도', ad: '충청남도 논산시 x', g: '논산시', f: [] });
  check('예6 규제 표시 없는 공공분양: 재당첨 공고문 확인', L6.rewin.chk && !L6.rewin.y && P.rulesHTML(Object.assign({ n: 'x', sd: '충청남도', g: '논산시', ad: '충청남도 논산시 x', ty: [], k: '국민', f: [] })).includes('공고문 확인'));
  /* 예7) 비규제 민영: 재당첨 제한 없음 · 제한 범위 문구도 붙이지 않음 */
  check('예7 비규제 민영: 재당첨 없음', ru({ f: [] }).rewin.y === 0 && !ru({ f: [] }).rewin.chk && !/뺀 다른 분양주택/.test(ru({ f: [] }).rewin.txt));
  /* 예8) 전매 화면: 기간 안 소유권이전등기 시 종료(별표 3 제1호 다목) */
  check('예8 전매 화면: 소유권이전등기 시 종료 안내', P.rulesHTML(Object.assign({ n: 'x', sd: '서울특별시', g: '', ad: '서울특별시 x', ty: [], f: ['투기과열지구'] })).includes('소유권이전등기를 마치면 그때 끝나요'));
}
check('거리: 문래역 예시 약 485m(직선)', Math.abs(P.distM([126.900096, 37.51899], [126.89466, 37.51755]) - 506) < 60, P.distM([126.900096, 37.51899], [126.89466, 37.51755]));
const poi = { at: { st: '2026-11-27', sc: '2026-11-21' }, st: [['문래', 126.8947, 37.5180], ['먼역', 127.2, 37.9]], sc: [['가까운중학교', 126.9010, 37.5200]] };
const dm = { checked: '2026-11-20', items: [{ id: 'l1', type: 'line', name: '새 노선', stage: '공사 중', path: [[126.901, 37.519], [127.1, 37.6]], stage_src: { org: '서울시', title: 't', url: 'https://x' } }, { id: 'a1', type: 'area', name: '먼 구역', stage: '계획', at: [127.3, 37.9] }] };
const Lc = P.locSummary([126.900096, 37.51899], poi, dm);
check('입지: 1.5km 안 역·1km 안 중학교·2km 안 개발만, 걷는 시간 = 거리 ÷ 67m', Lc.st.length === 1 && Lc.st[0].n === '문래' && Lc.st[0].walk === Math.max(1, Math.round(Lc.st[0].m / 67)) && Lc.sc.length === 1 && Lc.dev.length === 1 && Lc.dev[0].id === 'l1', Lc);
check('입지: 좌표 없으면 숫자 없이 안내', P.locHTML(P.locSummary(null, poi, dm), D).includes('좌표가 아직 없어'));
check('입지 화면: 출처·직선 거리 안내·초등학교 배정 안내', P.locHTML(Lc, D).includes('서울시 역사마스터 정보') && P.locHTML(Lc, D).includes('직선 거리') && P.locHTML(Lc, D).includes('통학구역'));

/* ---------- ④ 입주 가격 — 검증을 마친 기간이 없으면 범위 숫자 없음 ---------- */
check('입주 가격: 다시 만드는 모델의 검증 마친 기간 없음(지금)', Array.isArray(P.REBUILD_PASS) && P.REBUILD_PASS.length === 0);
const fh = P.factorsHTML(D, Lc);
check('입주 가격: 범위 예측을 내지 않는다고 분명히', fh.includes('입주 때 가격 범위 예측은 아직 내놓지 않아요') && !/억 원|만 원/.test(fh), fh.slice(0, 300));
check('입주 가격: 요인 카드 = 과거 효과(2·3년)와 맞은 횟수 그대로', P.FACTORS.length === 4 && fh.includes('+1.8~+2.1%p') && fh.includes('10번 중 8~9번') && fh.includes('+0.35%p'));
check('입주 가격: 가까운 공사 중 노선이면 이 단지 해당', P.factors(D, Lc)[0].hit === true && P.factors(D, P.locSummary([127.5, 36.5], poi, dm))[0].hit === false);

/* ---------- ⑤ 유료 미리 보기 · 점검 리포트 · 문구 ---------- */
const N0 = Object.assign({}, NOTI[0], { no: '2026000560', ct: ['20261214'] });
const tz = P.teasers(D, N0, 'k~x', { notices: NOTI, my: 64, prof: null, today: '20261126', loc: Lc });
check('미리 보기: 세 칸 · 실제 자료 한 줄 · 유료 단추 · 결제는 곧 열려요', (tz.match(/class="jpt"/g) || []).length === 3 && tz.includes('84A형(최고 18억 2,700만 원)에 당첨되면, 계약금이 10%일 때 계약일 2026.12.14에 1억 8,270만 원이 먼저 필요해요.')
  && tz.includes('지금 진행·예정 민영 공고 3곳의 주택형 5개를 내 가점 64점 기준으로') && (tz.match(/자세히 보기 \(유료\)/g) || []).length === 3 && tz.includes('결제는 곧 열려요') && tz.includes('premium/checkout/?p=cy&amp;k=k~x'), tz.slice(0, 600));
const rep = P.diagReport(N0, D, { my: 64, A, e: { head: 'y', win: 'n', house: '0', ever: 'y', kids: '1', dep: '1500' }, m: { mySido: '서울특별시', mySgg: '중랑구', stay: 'y', spSold: 'n', right: 'n', spHouse: 'n' } });
check('점검 리포트: 5가지(가능성·1순위·특공·3대 실수·전매) · 진단 틀 모양', rep.items.map(i => i.id).join() === 'odds,rank1,special,mk,rule' && rep.todo.length === 5 && ['g', 'y', 'r', 'n'].includes(rep.lv), rep.items.map(i => [i.id, i.lv, i.v]));
check('점검 리포트: 1순위 어려움(통장 24개월) → 위험 · 할 일 링크에 공고 번호', rep.items[1].lv === 'r' && rep.lv === 'r' && rep.todo.some(t => t.href === 'chungyak/?no=2026000560#eligH'));
const DG = require('../assets/diag.js'), dh = DG.html(rep, { base: '/', print: true });
check('점검 리포트: 진단 틀로 그려짐(결론·카드·다음 할 일)', dh.includes('dg-head') && dh.includes('이 공고 청약 점검') && dh.includes('다음 할 일'));
const repN = P.diagReport(N0, D, { my: null });
check('점검 리포트: 답이 없으면 숫자 없이 확인 필요', repN.items.filter(i => i.id !== 'rule').every(i => i.lv === 'n'));
const all = th + P.typeOddsHTML(NOTI[0], 64, rows, '20261126') + P.locHTML(Lc, D) + P.rulesHTML(NOTI[0]) + fh + tz + P.strategyHTML(Sr) + P.planHTML(R1, o1) + dh + P.loanRuleTxt(F);
check('문구: ~요체(습니다 없음)', !/습니다/.test(all), (all.match(/[가-힣]*습니다/g) || []).slice(0, 3));
check('문구: 금지 단어 없음(시험·통과·회사명·투자 권유)', !/시험|통과|장대장|사세요|매수하세요|추천 단지|무조건/.test(all), (all.match(/시험|통과|장대장[가-힣]*|사세요|매수하세요|추천 단지|무조건/g) || []));
check('문구: 경쟁 서비스 이름 없음', !/(호갱노노|직방|아실|리치고|네이버\s*부동산|청약\s*알리미|다방)/.test(all + read('assets/cy-plan.js')));
check('문구: undefined·NaN 없음', !/undefined|NaN/.test(all));

/* ---------- 화면 연결 ---------- */
const pg = read('chungyak/price/index.html'), pv = read('premium/view/index.html'), cy = read('chungyak/index.html'), sw = read('sw.js');
const ver = (s, f) => ((s.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1]);
check('상세 화면: 무료 칸(점검·평형별·당첨 가능성·입지·전매)과 유료 미리 보기', ['cyDiagS', 'cyTypeS', 'cyOddsS', 'cyLocS', 'cyRuleS', 'P.teasers(', 'JDJ_DIAG.mount', 'premium-teaser.js', 'cy-plan.js', 'cy-engine.js', 'cy-list.js'].every(t => pg.includes(t)));
check('상세 화면: 가점은 이 기기 저장값(jdj_cy)만, 서버로 안 보냄', pg.includes('P.profile()') && !/fetch\([^)]*jdj_cy/.test(pg));
check('유료 열람: 세 가지를 그리는 파일 불러옴', pv.includes('cy-plan.js') && pv.includes('cy-engine.js') && read('assets/cy-price.js').includes('JDJ_CYPLAN.mountPaid'));
check('청약 화면: 세부 진단·3대 실수 답을 이 기기에 저장(공고별 화면이 다시 씀)', cy.includes("localStorage.setItem('jdj_cy_e'") && cy.includes("localStorage.setItem('jdj_cy_m'") && cy.includes("UP.get('no')"));
check('버전: cy-plan.js 가 화면·sw 에서 같음', ver(pg, 'cy-plan.js') && ver(pg, 'cy-plan.js') === ver(pv, 'cy-plan.js') && ver(pg, 'cy-plan.js') === ver(sw, 'cy-plan.js'));
check('버전: cy-price.js 가 모든 곳에서 같음', new Set(['chungyak/price/index.html', 'chungyak/index.html', 'premium/view/index.html', 'bunyang/index.html', 'sw.js'].map(f => ver(read(f), 'cy-price.js'))).size === 1);

/* 실제 공개 자료(선택): node tools/cy-plan-test.js /path/to/data </dev/null — chungyak/price/*.json·notices.json·scores·poi·devmap·bunyang/notices.json 으로 모든 공고를 그려 오류·금지 단어 확인 */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'chungyak/notices.json'))) {
  const J = f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return null; } };
  const NS = J('chungyak/notices.json').rows, BJ = (J('bunyang/notices.json') || {}).rows || [], DM = J('devmap.json'), IX = J('chungyak/index.json');
  let n = 0; const bad = [];
  fs.readdirSync(path.join(dir, 'chungyak/price')).forEach(f => {
    const d = J('chungyak/price/' + f), N = NS.find(x => x.no === d.no); if (!N) return;
    const sf = IX && IX.scores.sido.find(x => E.sidoNorm(x.n) === E.noticeSido(N)), sr = sf ? (J('chungyak/scores/' + sf.f + '.json') || {}).rows || [] : [];
    const B = BJ.find(b => b.no === d.no), L = P.locSummary(B && B.xy, J('poi/' + d.sid + '.json'), DM);
    const h = P.typeCompareHTML(d) + P.typeOddsHTML(N, 60, sr, '20261127') + P.locHTML(L, d) + P.rulesHTML(N) + P.factorsHTML(d, L) + P.teasers(d, N, 'k', { notices: NS, my: 60, today: '20261127', loc: L })
      + require('../assets/diag.js').html(P.diagReport(N, d, { my: 60 }), {});
    const R = P.plan({ price: (d.types[0] || {}).price || 50000, dp: 10, mid: 60, n: 6, ct: (d.ct || [])[0] || '20270101', move: (d.mv || '203001') + '01', midLoan: true, midInt: 'after', rate: 4.5, ltv: 0.4, loan: 20000, tax: 500, cash: 5000 });
    if (/undefined|NaN|습니다|시험|통과/.test(h + P.planHTML(R))) bad.push([d.no, (h.match(/.{30}(undefined|NaN|습니다|시험|통과).{10}/) || [])[0]]);
    n++;
  });
  const S2 = P.strategy(NS, 60, null, '20261127', 'all');
  check(`실제 자료 ${n}곳: 무료 칸·미리 보기·계획표 오류 없음 · 전략표 ${S2.types}개`, n > 0 && !bad.length && S2.types > 0, bad.slice(0, 5));
}
console.log(`${pass}/${pass + fail} 맞음`);
process.exit(fail ? 1 : 0);
