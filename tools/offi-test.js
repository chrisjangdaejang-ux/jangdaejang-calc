/* 오피스텔 탭 계산 규칙 자동 검증 — 실행: node tools/offi-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/offi-core.js(시계열 해독·수익률 공식·순위 문구·금리 스프레드·검색·지표 행·검증 문장)와 tax/offi-tax.js(오피스텔 취득세 4.6%),
   (자료 폴더를 주면) 공개 자료 offi/index.json 모양과 가중치·임계값이 없는지. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
global.JDJ_MINE = require('../assets/mine-core.js');
const O = require('../assets/offi-core.js'), T = require('../tax/offi-tax.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }

check('[시작 칸, 값…] 해독', O.arr([1, 5, 0, 7], 5), [0, 5, 0, 7, 0]);
const u = { d: '역삼동', j: '600', n: '테스트오피스텔', a: 25, by: 2013, s: [0, 800, 0, 820], ys: [0, 0, 45, 48],
  t: [[20261003, 25, 7, 21000, 1, 0], [20260905, 25, 3, 20000, 0, 1]], wr: [[20261001, 25, 5, 1000, 76, 0]],
  y: { r: 0.048, p: 800, ns: 5, nw: 4, dep: 1000, mr: 76, at: '202610' }, rk: { d: [20, 85, 8], g: [70, 31, 40] }, to: { n: 12, k: 10 } };
const meta = { hm: '202607', to: '202610' };
check('건물 키', O.keyOf(u), '역삼동|600');
check('지번 없는 건물 키', O.keyOf({ d: '역삼동', j: '', n: 'A' }), '역삼동|#A');
check('이름이 지번 꼴이면 동·지번 표시', O.nameOf({ d: '역삼동', j: '12', n: '12' }), '역삼동 12 오피스텔');
const ps = O.priceSeries(u, meta);
check('시세 = ㎡당 시세 × 대표 전용, 100만 원 단위', ps.s, [20000, 0, 20500, 0]);
check('최근 시세: 마지막 달 없으면 최근 3개월 안 앞 달', O.latest(ps.s, ps.months), { v: 20500, at: '202609', stale: true });
check('수익률 추이(‰×10 → %)', O.yieldSeries(u, meta).y, [0, 4.5, 4.8, 0]);
check('수익률 = 연 월세 ÷ (매매가 − 보증금)', O.contractYield(800, 25, 1000, 76), 76 * 12 / 19000);
check('보증금이 매매가 이상이면 계산 안 함', O.contractYield(800, 25, 20000, 76), null);
const ex = O.example(u);
check('예시: 매매가·들어가는 돈·1년 월세', [ex.price, ex.cash, ex.year], [20000, 19000, 912]);
check('순위 문구: 상위', O.rankText([20, 85, 8]), '상위 20%');
check('순위 문구: 하위', O.rankText([70, 31, 40]), '하위 31%');
check('순위 문구: 가운데', O.rankText([50, 52, 9]), '중간쯤');
check('점수 순위 문구', [O.scoreRank(92), O.scoreRank(2), O.scoreRank(50), O.scoreRank(null)], ['상위 8%', '하위 3%', '중간쯤', '']);
check('금리 마지막 값', O.lastRate({ '202608': 4.1, '202609': 4.05 }), { v: 4.05, at: '202609' });
check('수익률 − 금리 (%p)', O.spread(0.048, 4.05), 0.75);
check('매매 목록: 신고가·직거래', O.trades(u).map(t => [t.date, t.hi, t.direct]), [['2026.10.03', true, false], ['2026.09.05', false, true]]);
check('월세 목록', O.rents(u)[0], { date: '2026.10.01', area: 25, floor: 5, dep: 1000, rent: 76, ct: '신규' });
check('회전(추정) = 1년 계약 ÷ 확인된 층·면적 수', O.turnover(u.to), { n: 12, k: 10, r: 1.2 });
check('회전: 층·면적이 너무 적으면 추정 안 함', O.turnover({ n: 3, k: 2 }), null);
check('이름 검색', O.search([u, { d: '논현동', j: '1', n: '다른빌딩' }], '테스트').map(O.keyOf), ['역삼동|600']);
check('동 목록', O.dongs([u, { d: '논현동' }, u]), ['논현동', '역삼동']);
const ix = { avail: { job: true }, src: { job: 'KOSIS' }, bt: { '1': { status: 'short', from: '201101' }, '2': { status: 'pass', from: '201601', oos_all: [{ t0: '202210', top20: 2.1 }, { t0: '202310', top20: -0.5 }], oos_hit: 1, oos_avg: 0.8 }, '3': { status: 'nodata' } } };
const dr = O.demandRows({ dem: { job: { v: 900.7, at: '202606', c1: 0.01, c3: -0.02, grp: 1 } } }, ix, u, '강남구');
check('임대수요: 일자리 있음', [dr[0].k, dr[0].ok, dr[0].value], ['job', true, '901천 명']);
check('임대수요: 없는 자료는 확인 불가', dr.filter(r => !r.ok).map(r => r.k), ['biz', 'hh', 'sub', 'univ']);
check('임대수요: 회전(추정) 행', dr.find(r => r.k === 'to').ok, true);
const sr = O.supplyRows({ sup: { o: 320, apt: 87, rows: [['A', 320, '202707', '오피스텔']] } }, ix);
check('공급: 오피스텔 공고 합계·목록', [sr[0].value, sr[0].list[0].mv], ['320실·세대', '2027년 7월']);
check('공급: 생활형숙박시설·인허가 확인 불가', sr.filter(r => !r.ok).map(r => r.k), ['stay', 'permit']);
check('검증 통과 기간만', O.passed(ix), ['2']);
check('검증 문장: 자료 짧음', O.btText(ix.bt['1'], '1'), '1년: 과거 자료 기간이 짧아 아직 써 보지 못했어요(매매 자료 2011년 1월부터)');
check('과거 성적 문장: 씀', O.btText(ix.bt['2'], '2'), '2년: 이 예측 방법을 과거에 그대로 써 봤더니 2번 중 1번 맞았어요. (예: 2016년 1월~2022년 자료만으로 2024년을 예측 → 실제로 점수 상위 20% 오피스텔이 같은 시·군·구 평균보다 더 올랐어요)');
check('과거 성적 문장: 안 씀', O.btText({ status: 'fail', oos_all: [{ t0: '202210', top20: -1 }, { t0: '202310', top20: 0.5 }, { t0: '202410', top20: -0.2 }], oos_hit: 1 }, '3'), '3년: 과거에 써 봤을 때 3번 중 1번만 맞아 점수를 보여 드리지 않아요');
check('미통과지만 절반 넘게 맞음: 참고로만(이유: 거래 많은 건물)', O.btText({ status: 'fail', why: ['hit', 'sig', 'thin'], oos_all: [{ top20: 3 }, { top20: 4 }, { top20: -3 }, { top20: 1 }, { top20: 2 }, { top20: 3 }], oos_hit: 5 }, '2'), '2년: 과거에 그대로 써 봤더니 6번 중 5번 맞았지만, 거래가 많은 건물만 따로 보면 잘 맞지 않아 점수는 보여 드리지 않고 참고로만 알려 드려요');
check('이유 문장: 다른 달 기준', O.whyText(['alt']), '다른 달을 기준으로 다시 맞춰 보면 결과가 흔들려');
check('이유 문장: 우연', O.whyText(['sig']), '차이가 우연일 수 있을 만큼 작아');
for (const h of ['1', '2', '3']) check(`과거 성적 문장 ${h}년: 시험·통과·표본 외 안 씀`, /시험|통과|표본 외/.test(O.btText(ix.bt[h], h)), false);

/* 오피스텔 취득세 */
const tx = T.offiAcqTax(20000);
check('오피스텔 취득세 2억: 4% + 0.4% + 0.2%', [tx.acq, tx.edu, tx.rural, tx.total], [8000000, 800000, 400000, 9200000]);
check('합계 세율 4.6%', Math.round(tx.rate * 1000) / 1000, 0.046);

/* 공개 자료 모양(선택) */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'offi', 'index.json'))) {
  const raw = fs.readFileSync(path.join(dir, 'offi', 'index.json'), 'utf8'), j = JSON.parse(raw);
  check('공개 index: 상태·검증·출처', ['status', 'bt', 'src', 'sgg'].every(k => k in j), true);
  check('공개 index: 가중치·통계값 없음', /"(w|stats|lo|hi)":/.test(raw), false);
}

// ---------- 매매·전세 시세 추이·전세가율·건수·전월세 요약 (아파트 화면 공용 차트 모양) ----------
const uj = Object.assign({}, u, { js: [1, 600, 0, 0], tc: [0, 2, 0, 1, 1], jl: [[20261005, 25, 3, 15000, 1]], nj: 1 });
const hj = O.histOf(uj, meta);
check('전세 = ㎡당 전세 × 대표 전용, 100만 원 단위', hj.j, [0, 15000, 0, 0]);
check('전세가율 = 같은 달 둘 다 실제 값일 때만', hj.jr, [0, 0, 0, 0]);
const hj2 = O.histOf(Object.assign({}, uj, { js: [0, 600, 0, 610] }), meta);
check('전세가율 계산', hj2.jr.map(v => Math.round(v * 1000) / 1000), [0.75, 0, 0.746, 0]);
check('월별 매매 건수: tc(전체 기간)', [...O.cntMap(uj, meta)], [['202607', 2], ['202608', 0], ['202609', 1], ['202610', 1]]);
check('월별 매매 건수: tc 없으면 최근 3년 목록으로', [...O.cntMap(u, meta)], [['202607', 0], ['202608', 0], ['202609', 1], ['202610', 1]]);
const rnow = O.rentNow(Object.assign({}, uj, { js: [0, 600, 0, 610] }), meta);
check('전월세 요약: 최근 전세 시세·전세가율·계약 수·월세 중간값(수익률 계산 값과 같게)', [rnow.jNow, rnow.jr && Math.round(rnow.jr.v * 1000), rnow.nj, rnow.nw, rnow.wDep, rnow.wRent, rnow.wFromY],
  [{ v: 15300, at: '202609', stale: true }, 746, 1, 1, 1000, 76, true]);
check('최근 전세 계약 목록', O.jeonses(uj), [{ date: '2026.10.05', area: 25, floor: 3, dep: 15000, ct: '갱신' }]);
const ar = O.areaRent({ d: '역삼동', a: 30 }, { dr: { 역삼동: { jeonse: [12, 20000, 24, 830], wolse: [30, 1000, 80, 23] } } }, { rs: { jeonse: [99, 1, 1, 1] } }, '강남구');
check('계약 없는 건물: 같은 동 요약 먼저', [ar.scope, ar.j.n, ar.w.rent], ['dong', 12, 80]);
check('같은 동 없으면 시·군·구 요약', O.areaRent({ d: '논현동' }, { dr: {} }, { rs: { wolse: [5, 1000, 70, 20] } }, '강남구').scope, 'gu');
check('둘 다 없으면 null', O.areaRent({ d: '논현동' }, {}, {}, '강남구'), null);
// 공용 차트 세로축: 둥근 눈금·읽기 쉬운 금액
const PS = require('../assets/price-sheet.js');
check('세로축 눈금: 35억·40억·45억·50억', PS.niceTicks(331100, 525100).map(PS.eokAxis), ['35억', '40억', '45억', '50억']);
check('세로축 금액: 0.1억 단위가 아니면 만 단위까지', [PS.eokAxis(525000), PS.eokAxis(10500), PS.eokAxis(8000)], ['52.5억', '1억 500만', '8,000만']);
// 거래 없던 달 값 칸 = 한 줄, 전세가율 주의 칩(HUG 90% 기준, 체크리스트 링크)
const tf = PS.tipFn({ months: ['202505', '202506', '202507'], rows: [{ k: '매매', a: [10000, 0, 11000], c: '#000' }], cnt: new Map([['202505', 1], ['202506', 0], ['202507', 2]]), noFill: true });
check('거래 없던 달: 한 줄 안내', [tf(1).empty, tf(1).say, !!tf(0).empty], [true, '2025.06, 거래가 없던 달이에요', false]);
check('전세가율 칩: 90% 이상만·체크리스트 링크', [PS.jrChip(0.89, '202610'), /전세가율 91%/.test(PS.jrChip(0.91, '202610', '../jeonse/checklist/')), /jeonse\/checklist\//.test(PS.jrChip(0.91))], ['', true, true]);
const bad = rows.filter(r => !r.ok);
bad.forEach(r => console.log('실패:', r.name, '| 결과', JSON.stringify(r.got), '| 기대', JSON.stringify(r.want)));
console.log(`offi 테스트 ${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
