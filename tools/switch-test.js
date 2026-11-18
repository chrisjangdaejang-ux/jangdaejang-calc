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
check('지방 DSR (스트레스 0.75%×40%)', SW.dsrMax(cLoc), 60621.80, '4.3% 30년', 0.01);
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

let pass = 0;
rows.forEach(r => { if (r.ok) pass++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(44) + ' ' + String(r.got).slice(0, 14).padEnd(14) + ' ' + (r.ok ? '' : '기대 ' + r.want + ' ') + (r.basis || '')); });
console.log('\n' + pass + '/' + rows.length + ' 통과');
if (pass !== rows.length) process.exit(1);
