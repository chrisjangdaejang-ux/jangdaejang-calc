/* 대출·최대 매수액 공용 계산 + 공유 링크 개인값 제거 검증 — 실행: node tools/loan-test.js
   계산기(buy/)와 리포트(buy/report/)가 같은 함수(assets/loan-core.js)로 같은 금액을 내는지,
   공유 주소에 연소득·현금·대출이 남지 않는지 확인한다. 금액 단위: 만원 */
const fs = require('fs'), path = require('path');
const L = require('../assets/loan-core.js');
const SH = require('../assets/share.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: got === want, name, got, want, basis }); }

// 1. 같은 조건(서울·무주택·주기형 4%·30년, 연소득 7,000, 현금 4억)
const base = { own: 'none', rtype: 'cyc', income: 7000, cash: 40000, debt: 0, rate: 4, term: 30 };
const buyC = L.ctx(Object.assign({ g: 'reg', costsOn: true, large: false }, base));   // 계산기: 기타 비용 기본 1,000만
const repC = L.ctx(Object.assign({ g: 'reg', etc: 1000 }, base));                     // 리포트: 기타 비용 1,000만
const mBuy = L.maxPrice(buyC), mRep = L.maxPrice(repC, L.dsrMax(repC), false);
check('서울 계산기 = 리포트 최대 매수액', mBuy, mRep, '같은 함수·같은 가정');
check('서울 최대 매수액', mBuy, 63100, 'LTV 40%: P − 0.4P + 취득세·중개보수 + 1,000만 ≤ 4억');
check('서울 대출', Math.round(L.loanAt(mBuy, buyC, L.dsrMax(buyC)).L), 25240, '6억3,100 × 40%');
// 기타 비용을 빼면 예전 계산기 값(6억4,600)이 되는지 — 차이의 원인이 기타 비용 1,000만이었음
check('기타 비용 0이면 6억4,600', L.maxPrice(L.ctx(Object.assign({ g: 'reg', etc: 0 }, base))), 64600, '예전 계산기 값');
// 2. 지역 상관없음: 계산기·리포트 모두 비규제 수도권 기준
check('지역 상관없음 요약 기준', L.ANY_GROUP, 'capfree', '계산기 안내 문구와 같은 기준');
const anyC = L.ctx(Object.assign({ g: L.ANY_GROUP }, base));
const mAny = L.maxPrice(anyC);
check('지역 상관없음 계산기 = 리포트', mAny, L.maxPrice(L.ctx(Object.assign({ g: 'capfree', etc: 1000 }, base)), L.dsrMax(anyC), false), '');
check('지역 상관없음 > 규제지역', mAny > mBuy, true, 'LTV 70% vs 40%');
// 3. 부대비용 끄면 기타 비용도 빠짐
check('부대비용 끄면 추가 비용 0', L.extra(60000, L.ctx(Object.assign({ g: 'reg', costsOn: false }, base))), 0, '');
// 4. 두 화면이 공용 함수를 실제로 쓰는지(소스에 자체 계산이 남아 있지 않은지)
const buySrc = fs.readFileSync(path.join(__dirname, '../buy/index.html'), 'utf8');
const repSrc = fs.readFileSync(path.join(__dirname, '../buy/report/index.html'), 'utf8');
check('계산기가 공용 함수 사용', /JDJ_LOAN\.maxPrice/.test(buySrc) && /loan-core\.js/.test(buySrc), true, '');
check('리포트가 공용 함수 사용', /JDJ_LOAN\.maxPrice/.test(repSrc) && /loan-core\.js/.test(repSrc), true, '');
check('계산기에 자체 반복 계산 없음', /for\s*\(let P=1000/.test(buySrc), false, '');
check('리포트에 자체 반복 계산 없음', /for\(let P=1000/.test(repSrc), false, '');
// 5. 공유 주소에 개인값 없음
check('예전 공유 주소 개인값 감지', SH.hasPersonal('?i=7000&c=40000&o=none&r=seoul'), true, '');
check('개인값 제거', SH.stripPersonal('?i=7000&c=40000&d=0&n=%ED%99%8D&e=1000&o=none&r=seoul'), '?o=none&r=seoul', '');
check('개인값 없는 주소', SH.hasPersonal('?o=none&r=seoul&sd=all'), false, '');
check('계산기→리포트 주소에 연소득 없음', /new URLSearchParams\(\{i:c\.income/.test(buySrc), false, '');
const swSrc = fs.readFileSync(path.join(__dirname, '../switch/index.html'), 'utf8');
check('갈아타기→리포트 주소에 연소득 없음', /URLSearchParams\(\{i:/.test(swSrc), false, '');

/* 2026-11-26 품질 점검: 대출 한도 → 내 집 마련으로 넘어갈 때 조건 채우기, 리포트에서 돌아올 때 지역 유지, 이상값 안내 */
{ const loanSrc = fs.readFileSync(path.join(__dirname, '../loan/index.html'), 'utf8');
  check('대출→내 집 마련 링크에 지역·보유·금리 채움', /function buyLink\(o\)/.test(loanSrc) && /q\.set\('o', S\.own\)/.test(loanSrc) && /q\.set\('sd', sdn\)/.test(loanSrc), true, '');
  check('대출→내 집 마련 주소에 연소득·대출 없음(이 기기에만)', /q\.set\('i'|q\.set\('d'/.test(loanSrc), false, '개인값');
  check('대출: 음수 입력을 양수로 읽지 않음', /if \(\/\^\\s\*-\/\.test/.test(loanSrc), true, '');
  check('대출: 집값 1,000억·금리 20% 넘으면 안내', /o\.price > 10000000/.test(loanSrc) && /o\.rate > 20/.test(loanSrc), true, '');
  check('내 집 마련: 주소 r(지역) 읽기', /QS\.get\('r'\) && \[\.\.\.\$\('region'\)\.options\]/.test(buySrc), true, '리포트 돌아가기');
  check('내 집 마련: 대출 화면에서 온 연소득을 이 기기 저장값에서', /QS\.get\('src'\)==='loan'/.test(buySrc), true, ''); }

let pass = 0;
rows.forEach(r => { if (r.ok) pass++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name.padEnd(30) + ' ' + String(r.got).slice(0, 14).padEnd(14) + ' ' + (r.ok ? '' : '기대 ' + r.want + ' ') + (r.basis || '')); });
console.log('\n' + pass + '/' + rows.length + ' 통과');
if (pass !== rows.length) process.exit(1);
