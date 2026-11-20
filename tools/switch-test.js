/* 갈아타기 계산 엔진 자동 검증 — 실행: node tools/switch-test.js
   양도세·취득세는 tax/tax-engine.js(별도 검증: tools/tax-test.js)를 그대로 쓰므로, 여기서는
   ① 엔진에 값을 제대로 넘기는지(만원↔원, 주택 수, 조정대상지역) ② 매도 정산·대출·매수 가능 상한·추천 순위·유지 비교 계산을
   손으로 계산한 값과 맞춰 본다. 금액 단위: 만원. */
const SW = require('../switch/switch-core.js');
const REC = require('../assets/rec-core.js');
const rows = [];
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.01 : tol);
function check(name, got, want, basis, tol) {
  const ok = (typeof want === 'number' && typeof got === 'number') ? near(got, want, tol) : got === want;
  rows.push({ ok, name, got, want, basis });
}
const base = { exp: 0, residMonths: 0, houses: 1, acqAdj: false, saleAdj: false, oldLoan: 0 };
const sell = o => SW.sell(Object.assign({}, base, o));

// 1. 1세대1주택 고가주택: 매도 13억, 취득 7억, 필요경비 3,000만, 보유 9년·거주 10년, 취득 당시 조정
let s = sell({ sale: 130000, acq: 70000, exp: 3000, acqDate: '2017-01-01', saleDate: '2026-12-01', residMonths: 120, acqAdj: true, saleAdj: true, oldLoan: 20000 });
check('고가주택 양도세 합계(지방세 포함)', s.cgt, 52.9522, '차익 5.7억×(1억/13억)=4,384만6,153 → 장특공 76%(보유 36%+거주 40%) → 소득 1,052만3,077 −250만 = 802만3,077 × 6% = 48만1,384 + 지방 4만8,138', 0.00001);
check('  └ 장기보유특별공제율', s.r.ltdRate, 0.76, '표2: 보유 9년 36% + 거주 10년 40%');
check('  └ 매도 중개보수 (12억~15억 0.6% + VAT)', s.fee, 858, '13억 × 0.6% = 780만 × 1.1');
check('  └ 매도 후 손에 남는 돈', s.net, 109089.0478, '13억 − 대출 2억 − 양도세 52.9522만 − 중개 858만', 0.0001);

// 2. 12억 이하 1주택 전액 비과세 (취득 당시 비조정)
s = sell({ sale: 110000, acq: 60000, acqDate: '2023-06-01', saleDate: '2026-12-01' });
check('12억 이하 1주택 비과세 → 양도세 0', s.cgt, 0, '소득세법 제89조 제1항 제3호');
check('  └ 매도 중개보수 (9억~12억 0.5% + VAT)', s.fee, 605, '11억 × 0.5% = 550만 × 1.1');

// 3. 2주택 중과: 양도일 조정대상지역, 장특공 배제 (tax-test 5번과 같은 자료)
s = sell({ sale: 80000, acq: 50000, acqDate: '2016-01-01', saleDate: '2026-12-01', houses: 2, saleAdj: true });
check('2주택 중과 +20%p 양도세 합계', s.cgt, 16787.1, '2.975억×58%−1,994만 = 1억5,261만 + 지방 1,526만1천', 0.00001);
check('  └ 중과 가산 세율', s.r.heavy, 0.2, '소득세법 제104조 제7항');

// 4. 필요경비 추정: 산 가격 7억 → 취득세 1.67% + 지방교육세 + 중개보수 0.4%
const e = SW.expEstimate(70000);
check('필요경비 추정 (7억 취득)', e.total, 1593.9, '취득세 7억×1.67%=1,169만 + 교육세 116.9만 + 중개 280만×1.1=308만', 0.0001);
s = sell({ sale: 90000, acq: 70000, exp: null, acqDate: '2020-01-01', saleDate: '2026-12-01' });
check('  └ 비워 두면 추정값 사용', s.exp, 1594, '1,593.9만 반올림');

// 5. 새 집 취득비용 (tax-engine 취득세 + 중개보수)
const o1 = { income: 9000, debt: 0, rate: 4, term: 30, rtype: 'cyc', houses: 1, etc: 1000, cash: 100000 };
const cReg = SW.ctx('reg', o1);
let bc = SW.buyCost(100000, cReg, o1);
check('1주택 갈아타기 10억 취득비용 (일시적 2주택 일반세율)', bc.total, 3850, '취득세 3% 3,000만 + 교육세 300만 + 중개 0.5% 500만×1.1');
bc = SW.buyCost(100000, cReg, Object.assign({}, o1, { large: true }));
check('  └ 85㎡ 초과 농어촌특별세 0.2% 추가', bc.total, 4050, '+ 10억 × 0.2% = 200만');
const o2 = Object.assign({}, o1, { houses: 2 });
bc = SW.buyCost(100000, SW.ctx('reg', o2), o2);
check('2주택(1채 매도 후 1채 매수) 조정지역 취득 → 8% 중과', bc.total, 8950, '8% 8,000만 + 교육세 0.4% 400만 + 중개 550만 (지방세법 제13조의2)');

// 6. 새 대출
const dsr = SW.dsrMax(cReg);
check('DSR 한도 (연소득 9천, 5.2% 30년)', dsr, 54633.77, '월 300만 상환 여력 × 연금현가계수 (4.0% + 스트레스 3.0%×40%)', 0.01);
let l = SW.loanAt(100000, cReg, dsr);
check('규제지역 10억: LTV 40%가 한도', l.L, 40000, '10억 × 40%'); check('  └ 결정 요인', l.by, 'LTV', '');
l = SW.loanAt(200000, cReg, dsr);
check('규제지역 20억: 가격구간 한도 4억', l.L, 40000, '15억 초과 25억 이하 4억'); check('  └ 결정 요인', l.by, 'CAP', '');
l = SW.loanAt(100000, SW.ctx('reg', o2), dsr);
check('다주택 규제지역 주담대 불가', l.by, 'BAN', 'LTV 0%');
const cLoc = SW.ctx('local', o1);
check('지방 주기형 스트레스 = 0.75% × 30%', cLoc.stress, 0.225, '은행연합회 2026 하반기 운영방안: 지방 1.5%×50%, 주기형 10~30%(상한)');
check('지방 DSR (스트레스 0.225%)', SW.dsrMax(cLoc), 61164.89, '4.225% 30년: 월 300만 × 연금현가계수', 0.01);
check('월 상환액 4억 5.2% 30년 (원리금균등)', SW.monthly(40000, 5.2, 30), 219.6444, '', 0.0001);

// 7. 매수 가능 상한: 그 가격은 살 수 있고 100만 더 비싸면 못 산다
const M = SW.maxPrice(cReg, dsr, Object.assign({}, o1, { large: false }));
const nd0 = SW.need(M, cReg, dsr, o1), nd1 = SW.need(M + 100, cReg, dsr, o1);
check('매수 가능 상한: 상한가는 예산 안', nd0.need <= o1.cash, true, `상한 ${M}만, 필요 ${Math.round(nd0.need)}만 ≤ 예산 ${o1.cash}만`);
check('  └ 100만 더 비싸면 예산 초과', nd1.need > o1.cash, true, `필요 ${Math.round(nd1.need)}만`);
check('  └ 필요 자기자본 = 집값 − 대출 + 취득비용 + 기타', nd0.need, M - nd0.loan.L + nd0.cost.total + 1000, '', 0.0001);

// 8. 유지 vs 갈아타기: 순자산 차이 = 한 번에 나가는 비용
s = sell({ sale: 130000, acq: 70000, exp: 3000, acqDate: '2017-01-01', saleDate: '2026-12-01', residMonths: 120, acqAdj: true, saleAdj: true, oldLoan: 20000 });
const oC = Object.assign({}, o1, { cash: s.net + 5000 });
const nd = SW.need(150000, cReg, SW.dsrMax(cReg), oC);
const cmp = SW.compare({ price: 130000, oldLoan: 20000, extra: 5000 }, { S: s, P: 150000, nd, c: cReg, etc: 1000, extra: 5000 });
check('갈아탄 뒤 순자산 − 유지 순자산 = −(양도세+매도중개+취득비용+기타)', cmp.equityDiff, -cmp.oneOff, '같은 날 시세 기준, 비용만큼 순자산이 줄어든다', 0.0001);
check('  └ 한 번에 나가는 비용', cmp.oneOff, 52.9522 + 858 + nd.cost.total + 1000, '', 0.0001);

// 9. 조정대상지역 판정 (자료 이름 → adjusted-areas 이름)
check('서울 강남구 2020년 취득 → 조정', SW.isAdj('서울특별시', '강남구', '2020-01-01'), true, '2017.8.3~ 계속 지정');
check('성남 분당구 2024년 취득 → 비조정', SW.isAdj('경기도', '성남시 분당구', '2024-01-01'), false, '2023.1.5 해제, 2025.10.16 재지정');
check('화성시 효행구 2021년 → 직접 확인', SW.isAdj('경기도', '화성시 효행구', '2021-01-01'), 'ask', '당시 일부 지역만 지정');
check('평택시 2024년 → 비조정', SW.isAdj('경기도', '평택시', '2024-05-01'), false, '2023.1.5 이후 지정 없음');
check('부산 2019년 → 직접 확인', SW.isAdj('부산광역시', '해운대구', '2019-01-01'), 'ask', '2017~2022 지정 이력은 동마다 달라 확인');

// 10. 추천 점수·순위 (내 집 마련 리포트와 같은 공통 모듈)
check('추천 점수 계산 (미래가치 있음)', REC.scoreOf({ fit: 0.93, n: 160, ch: 0.02, rel: 0, note: true, fv: 80 }), 0.916, '공통 모듈 산식', 1e-9);
const ser = p => Array(36).fill(p);
const U = (code, apt, ppy, area, n, fv) => [code, '동', apt, '84㎡대', area, n, ser(ppy), '111', null, fv == null ? null : { fv }];
const units = [
  U('11680', 'A단지', 4000, 84, 100, 70), U('11680', 'B단지', 3000, 84, 100, 90), U('11680', 'C단지', 3000, 84, 100, 95),
  U('11680', 'D단지', 3000, 84, 100, 85), U('11680', 'E단지', 30000, 84, 100, 99), U('11680', 'F단지', 3000, 84, 100, null),
  U('11650', 'G단지', 2900, 84, 100, 60), U('11650', '지금집', 2900, 84, 100, 100)
];
const B = SW.budgets(Object.assign({}, o1, { cash: 60000 }));
const rec = SW.recommend({ units, inArea: () => true, bands: null, B, o: Object.assign({}, o1, { cash: 60000 }), exclude: u => u[2] === '지금집', max: 5 });
check('예산 초과 단지(E) 제외', rec.picked.some(x => x.apt === 'E단지'), false, '필요 자기자본 > 예산');
check('지금 집 제외', rec.picked.some(x => x.apt === '지금집'), false, '');
check('미래가치 높은 순 1위', rec.picked[0].apt, 'C단지', 'C 95 > B 90 > D 85');
check('같은 구 최대 3곳', rec.picked.filter(x => x.code === '11680').length, 3, '한 구에 몰리지 않게');
check('미래가치 없는 단지는 뒤로', rec.picked.findIndex(x => x.apt === 'F단지'), -1, '강남구 3곳이 이미 차서 빠짐');
check('다른 구 단지 포함', rec.picked[rec.picked.length - 1].apt, 'G단지', '');

// '너무 싼 단지' 제외 완화: 예산 대비 낮아도 그 지역 같은 면적 시세 이상이면 남긴다
check('예산 대비 낮고 지역 시세보다도 낮으면 제외', REC.tooCheap(0.3, 30000, 40000), true, '');
check('예산 대비 낮아도 지역 시세 이상이면 남김', REC.tooCheap(0.3, 45000, 40000), false, '예산이 큰 사람의 지방 갈아타기');
check('지역 시세 모르면 기존 기준', REC.tooCheap(0.3, 45000, 0), true, '');
check('예산 적합하면 남김', REC.tooCheap(0.9, 10000, 40000), false, '');

// 11. 갈아타기 루트 (v3): 대출 일부만 쓰기·남은 원금·과거 성적·전망·지금 갈 수 있는/조금 모자란 단지·정렬·가족 일정·루트
{
  const ndF = SW.need(100000, cReg, dsr, o1), ndS = SW.need(100000, cReg, dsr, Object.assign({}, o1, { loanUse: 0.7 }));
  check('보수적: 대출 한도의 70%만', ndS.loan.L, 28000, '10억 LTV 40% = 4억 × 70%');
  check('  └ 원래 한도 기록', ndS.loan.full, 40000, '');
  check('  └ 덜 빌린 만큼 필요 현금 증가', ndS.need - ndF.need, 12000, '4억 − 2.8억');
  check('남은 원금: 0년 = 원금', SW.balance(40000, 4, 30, 0), 40000, '');
  check('남은 원금: 만기 = 0', SW.balance(40000, 4, 30, 30), 0, '', 1e-6);
  const L = 40000, i = 4 / 1200, m = SW.monthly(L, 4, 30);
  check('남은 원금: 10년 뒤 (원리금균등 공식)', SW.balance(L, 4, 30, 10), L * Math.pow(1 + i, 120) - m * (Math.pow(1 + i, 120) - 1) / i, 'B = L(1+i)^k − M((1+i)^k−1)/i', 1e-6);
  check('남은 원금: 금리 0%', SW.balance(36000, 0, 30, 10), 24000, '원금 균등');
  check('대출 한도 구간', [SW.capBand(150000), SW.capBand(150100), SW.capBand(250000), SW.capBand(250100)].join(','), 'b15,b25,b25,over', '15억 이하 6억 / 25억 이하 4억 / 초과 2억');

  const MH = { '1': { oos_all: [{ top20: -1 }, { top20: 2 }, { top20: -1 }, { top20: -0.5 }], oos_hit: 1, oos_avg: -0.39 },
    '2': { oos_all: [{ top20: 1 }, { top20: 1 }, { top20: 2 }, { top20: 0.4 }], oos_hit: 4, oos_avg: 1.09 },
    '3': { oos_all: [{ top20: 1 }, { top20: -1 }, { top20: -2 }, { top20: 3 }], oos_hit: 2, oos_avg: 0.25 },
    '5': { oos_all: [{ top20: 1 }], oos_hit: 1, oos_avg: 1 },
    '7': { oos_all: [{ top20: 1 }, { top20: 2 }], oos_avg: 1.5, reg: { '부산광역시': { oos_all: [{}, {}, {}], hit: 1, ok: false, name: '부산' } } } };
  const V = SW.validity(MH, '서울특별시');
  check('기준: 평균 − 이면 못 넘음 (1년)', V[1].ok, false, '평균 −0.39');
  check('기준: 평균 + · 4번 중 4번 (2년)', V[2].ok, true, '');
  check('기준: 평균 + · 4번 중 2번 = 절반 → 넘음 (3년)', V[3].ok, true, '절반 이상');
  check('기준: 한 번뿐이면 못 넘음 (5년)', V[5].ok, false, '2번 이상 필요');
  check('기준: 맞은 수 없으면 top20>0 개수로 (7년)', V[7].hit, 2, '');
  check('시·도 성적이 있으면 그것 (부산 7년)', SW.validity(MH, '부산광역시')[7].ok + '/' + SW.validity(MH, '부산광역시')[7].where, 'false/부산', '엔진 ok 그대로');
  const f = { fv: 80, fh: { 1: 90, 3: 60, 5: 40, 7: 20 } };
  let ol = SW.outlook(f, V, 1);
  check('전망: 1년 보유 → 기준 넘은 가장 가까운 2년', ol.h + '/' + ol.ok, '2/true', '1년은 기준 못 넘어 쓰지 않음');
  check('  └ 2년 점수 80 → 더 오를 가능성이 커요', ol.text, '평균보다 더 오를 가능성이 커요', '70 이상');
  ol = SW.outlook(f, V, 8);
  check('전망: 8년 보유 → 7년 (기준 넘음)', ol.h + '/' + ol.s, '7/20', '');
  check('  └ 점수 20 → 덜 오를 가능성', ol.text, '평균보다 덜 오를 가능성이 커요', '');
  ol = SW.outlook({ fh: { 1: 90 } }, V, 1);
  check('기준 넘은 기간 점수가 없으면 참고로 (ok=false)', ol.h + '/' + ol.ok, '1/false', '');
  check('볼 기간: 5년 보유 → 기준 넘은 3·7 중 가까운 3(같으면 긴 쪽 7)', SW.horizonFor(V, 5), 7, '|3−5| = |7−5| → 긴 쪽');
  check('볼 기간: 4년 보유 → 3년', SW.horizonFor(V, 4), 3, '');
  check('lean 구간', [SW.lean(70), SW.lean(55), SW.lean(50), SW.lean(31), SW.lean(30)].map(t => t.slice(0, 9)).join('|'), '평균보다 더 오를|평균보다 더 오를|평균과 비슷하게 |평균보다 덜 오를|평균보다 덜 오를', '');

  // 같은 구 안 순위: 단지별 최고 평형 점수, 같은 점수는 같은 등수
  const g = SW.guRanks([['1', '동', 'A', '59', 59, 1, [], '', '', { fvg: 50 }], ['1', '동', 'A', '84', 84, 1, [], '', '', { fvg: 90 }],
    ['1', '동', 'B', '84', 84, 1, [], '', '', { fvg: 90 }], ['1', '동', 'C', '84', 84, 1, [], '', '', { fvg: 30 }], ['2', '동', 'D', '84', 84, 1, [], '', '', { fvg: 10 }]]);
  check('구 안 순위: A(최고 평형 90) 1위 / 3곳', JSON.stringify(g(['1', '동', 'A'])), '{"r":1,"n":3}', '');
  check('구 안 순위: 같은 점수 B도 1위', g(['1', '동', 'B']).r, 1, '');
  check('구 안 순위: C 3위', g(['1', '동', 'C']).r, 3, '');
  check('구 안 순위: 다른 구는 따로', JSON.stringify(g(['2', '동', 'D'])), '{"r":1,"n":1}', '');

  // scan: 갈 수 있는 단지 / 1억 이내 부족 / 세대수 / 대출 구간
  const UH = (apt, ppy, fv, hh, sc) => ['11680', '동', apt, '84㎡대', 84, 100, ser(ppy), '111', null, { fv, fvg: fv, hh, sc, fh: { 3: 100 - fv, 7: fv } }];
  const us = [UH('가', 3000, 60, 1200), UH('나', 3300, 90, 0), UH('다', 3600, 95, 500), UH('라', 4500, 99, 2000), UH('마', 9000, 99, 2000), UH('바', 2900, 40, 150, ['중', 1, 2024, 2026, 1, 10, '11680', 300])];
  const oS = Object.assign({}, o1, { cash: 60000 }), BS = SW.budgets(oS);
  const sc = SW.scan({ units: us, inArea: () => true, bands: null, B: BS, o: oS, cheap: false });
  const P = apt => REC.unitPrice(us.find(u => u[2] === apt));
  const needOf = apt => SW.need(P(apt), cReg, dsr, oS).need;
  check('갈 수 있는 단지 = 필요 현금 ≤ 자기자본', sc.can.every(x => x.need <= 60000) && sc.can.length === us.filter(u => needOf(u[2]) <= 60000).length, true, '');
  check('조금만 더: 부족 0 초과 1억 이하만', sc.near.every(x => x.short > 0 && x.short <= 10000), true, '');
  check('  └ 부족 금액 = 필요 현금 − 자기자본', sc.near.length ? Math.round(sc.near[0].short) : -1, sc.near.length ? Math.round(sc.near[0].need - 60000) : -1, '');
  check('  └ 너무 비싼 단지(마)는 어디에도 없음', [...sc.can, ...sc.near].some(x => x.apt === '마'), false, '1억 넘게 부족');
  const sc3 = SW.scan({ units: us, inArea: () => true, bands: null, B: BS, o: oS, cheap: false, hhMin: 300 });
  check('세대수 300 이상: 자료 없는(0) 단지·150세대 제외', [...sc3.can, ...sc3.near].map(x => x.apt).sort().join(''), [...sc.can, ...sc.near].filter(x => x.hh >= 300).map(x => x.apt).sort().join(''), '');
  const scB = SW.scan({ units: us, inArea: () => true, bands: null, B: BS, o: oS, cheap: false, cap: 'b15' });
  check('대출 구간 15억 이하만', [...scB.can, ...scB.near].every(x => x.P <= 150000), true, '');
  const scR = SW.scan({ units: us, inArea: () => true, bands: null, B: BS, o: Object.assign({}, oS, { reserveM: 6 }), cheap: false });
  const x0 = scR.can[0] || scR.near[0];
  check('비상금: 필요 현금 + 월 상환 6개월치로 판단', Math.round(x0.left), Math.round(60000 - x0.need - 6 * x0.mon), '');
  const so = SW.sortList(sc.can, 'fv').map(x => x.apt).join('');
  check('정렬: 미래가치 높은 순', so, sc.can.slice().sort((a, b) => b.fv - a.fv).map(x => x.apt).join(''), '');
  check('정렬: 필요 현금 적은 순', SW.sortList(sc.can, 'cash').map(x => Math.round(x.need)).join(',') === sc.can.map(x => Math.round(x.need)).sort((a, b) => a - b).join(','), true, '');
  check('정렬: 3년 점수 기준(h=3)이면 순서 반대', SW.sortList(sc.can, 'fv', 3)[0].apt, sc.can.slice().sort((a, b) => a.fv - b.fv)[0].apt, 'fh[3] = 100 − fv');
  check('정렬: 부족 금액 적은 순', SW.sortList(sc.near, 'short').every((x, k, a) => !k || a[k - 1].short <= x.short), true, '');

  // 가족 일정 (초·중등교육법 제13조: 만 6세가 된 다음 해 3월 입학)
  const S = SW.schedule([4], 2026)[0];
  check('만 4세(2022년생) → 초등 2029·중 2035·고 2038·대학 2041', [S.elem, S.mid, S.high, S.univ].join(','), '2029,2035,2038,2041', '');
  const st = SW.stages([4, 1], 2026);
  check('단계: 지금 → 첫째 6학년(2034) → 막내 대학(2044)', st.map(x => x.key + x.year).join(','), 'now2026,school2034,after2044', '');
  check('자녀 없으면 지금 → 5년 뒤', SW.stages([], 2026).map(x => x.year).join(','), '2026,2031', '');
  check('첫째가 이미 중학생이면 학군 단계 없음', SW.stages([15], 2026).some(x => x.key === 'school'), false, '');

  // 학군 좋은 편 / 단계별 고르기
  check('학군: 10곳 중 1위 → 좋은 편', SW.schoolGood({ sc: ['중', 1, 2024, 2026, 1, 10] }), true, '상위 30% 안');
  check('학군: 10곳 중 4위 → 아님', SW.schoolGood({ sc: ['중', 1, 2024, 2026, 4, 10] }), false, '');
  check('학군: 2곳뿐이면 판단 안 함', SW.schoolGood({ sc: ['중', 1, 2024, 2026, 1, 2] }), false, '');
  check('중학교 배정 전: 학군 좋은 단지(바)만', SW.pickFor(sc.can, { key: 'school' }, null, 2).apt, '바', '');
  const curGood = sc.can.find(x => x.apt === '바');
  check('  └ 지금 집이 이미 학군 좋으면 그대로', SW.pickFor(sc.can, { key: 'school' }, curGood, 2), curGood, '');
  const top = Math.max(...sc.can.map(x => x.P));
  check('적극적: 가장 비싼 축(90% 이상) 안에서', SW.pickFor(sc.can, { key: 'now' }, null, 2, 'bold').P >= top * SW.BOLD_TOP, true, '');
  check('보수적: 전체 중 미래가치 1위', SW.pickFor(sc.can, { key: 'now' }, null, 2, 'safe').apt, SW.sortList(sc.can, 'fv')[0].apt, '');

  // 루트: 단계 사이 집값은 그대로(차익 0 → 양도세 0), 남은 원금·모은 돈만 늘어남
  const pick = (oo, s, cur, h, mode) => SW.pickFor(SW.scan({ units: us, inArea: () => true, bands: null, B: SW.budgets(oo), o: oo, cheap: false, near: 0 }).can, s, cur, h, mode);
  const R = SW.route({ mode: 'safe', year: 2026, stages: [{ key: 'now', year: 2026 }, { key: 'later', year: 2031 }], cash: 60000, save: 1000, o: o1, V, pick });
  const r0 = R[0], r1 = R[1];
  check('루트 1단계: 자기자본 = 지금 쓸 수 있는 돈', r0.pool, 60000, '');
  check('  └ 대출은 한도의 70%', Math.round(r0.x.nd.loan.L), Math.round(r0.x.nd.loan.full * 0.7), '');
  check('  └ 남는 현금 = 자기자본 − 필요 현금', Math.round(r0.left), Math.round(60000 - r0.x.need), '비상금은 남는 현금 안에');
  if (r1.sale) {
    check('루트 2단계: 시세 그대로면 양도세 0', r1.sale.cgt, 0, '차익 없음');
    check('  └ 남은 대출 = 5년 상환 뒤 원금', Math.round(r1.sale.bal), Math.round(SW.balance(r0.x.nd.loan.L, o1.rate, o1.term, 5)), '');
    const net = r0.x.P - r1.sale.bal - r1.sale.fee;
    check('  └ 2단계 자기자본 = 남은 현금 + 5년 모은 돈 + 판 돈', Math.round(r1.pool), Math.round(r0.left + 5000 + net), '');
  } else check('루트 2단계: 옮기지 않으면 그대로 삶', r1.stay, true, '');
}

let pass = 0;
rows.forEach(r => { if (r.ok) pass++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(44) + ' ' + String(r.got).slice(0, 14).padEnd(14) + ' ' + (r.ok ? '' : '기대 ' + r.want + ' ') + (r.basis || '')); });
console.log('\n' + pass + '/' + rows.length + ' 통과');
if (pass !== rows.length) process.exit(1);
