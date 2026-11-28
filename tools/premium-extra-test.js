/* 프리미엄 단지 리포트 추가 칸(assets/premium-extra.js) 검증 — 실행: node tools/premium-extra-test.js </dev/null
   ① 보유 기간별 세금 표: 세금 계산 엔진(tax/tax-engine.js) 결과와 한 원까지 같음 — 따로 세율·공제를 두지 않음(두 번째 세금 엔진 없음)
      1주택 비과세·12억 넘는 부분·장기보유특별공제·단기 세율·조정대상지역 거주 요건·다주택(종부세 빼고 재산세만)
   ② 금액은 이 기기에만: 주소(URL)·서버로 보내지 않음, 공시가격 시세×비율 추정 없음, 팔 가격 기본값 = 지금 시세(오른다고 가정 안 함 표시)
   ③ 과거 사례: 공개 자료의 사례를 그대로(숫자 지어내지 않음) · 가운데 값·가장 낮은~높은 곳 계산 · 5곳 미만이면 싣지 않음 · 지번 없음 · 보장 아님 안내
   ④ 가격 시나리오: 검증 기준을 채운 기간만 범위(보수·기준·낙관 = 하위 25%·가운데·상위 25%), 나머지는 '아직 믿을 만한 범위가 나오지 않아 싣지 않았어요'
      + 기간마다 검증 적중률 · 한 값 예측 없음 · 권유·보장 문구 없음
   ⑤ 리포트 끝 '준비 중' 칸: 실제로 빠진 것만(모두 실리면 칸 없음)
   ⑥ 화면 연결·버전: 세 리포트 화면이 같은 버전을 부름, 기존 구매자도 같은 링크로(상품·결제일로 막지 않음) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let ok = 0, bad = 0;
const check = (m, c, x) => { if (c) ok++; else { bad++; console.log('실패:', m, x !== undefined ? JSON.stringify(x).slice(0, 500) : ''); } };
const T = require('../tax/tax-engine.js');
const X = require('../assets/premium-extra.js');
const SRC = rd('assets/premium-extra.js'), PR = rd('assets/premium-report.js');

/* ---------- ① 세금 표 = 엔진 결과 ---------- */
const today = '2026-11-28';
const base = { T, price: 150000, buy: 100000, sale: 150000, std: 80000, houses: 1, resid: 2, today, adj: true };
const R = X.taxRows(base);
check('기간 1·2·3·5·7년', R.rows.map(r => r.h).join(',') === '1,2,3,5,7', R.rows.map(r => r.h));
const sale = h => T.addDays(T.addYears(today, h), 1);
const eng = (h, o) => T.calcCGT(Object.assign({ acqDate: today, acqPrice: 1e9, saleDate: sale(h), salePrice: 15e8, expenses: 0, residMonths: Math.min(2, h) * 12, houses: 1, acqAdj: true, saleAdj: true, tempTwo: null }, o || {}));
R.rows.forEach(r => check(`${r.h}년: 양도세 = 엔진 calcCGT 결과(원 단위)`, r.cgt === eng(r.h).total, [r.cgt, eng(r.h).total]));
check('1년: 2년 안 60% 단기 세율', R.rows[0].tag === '2년 안 60%' && eng(1).kind === 'short60', R.rows[0]);
check('2년(거주 2년): 1주택 비과세 요건 충족 → 12억 넘는 부분만', R.rows[1].exempt === 'partial' && R.rows[1].tag === '12억 넘는 부분만', R.rows[1]);
check('3년: 장기보유특별공제 표2(보유 12% + 거주 8%)가 엔진 그대로', eng(3).ltdRate === 0.2 && R.rows[2].cgt === eng(3).total);
const pt = T.propertyTax({ price: 8e8, one: true }).total;
const ct = y => T.compTax({ prices: [8e8], one: true, age: 0, years: y }).total;
check('보유세 한 해 = 재산세 + 종부세(엔진)', R.rows[0].hold1 === pt + ct(0), [R.rows[0].hold1, pt, ct(0)]);
let s7 = 0; for (let k = 1; k <= 7; k++) s7 += pt + ct(k - 1);
check('보유세 7년 합계 = 해마다 엔진 결과 합(보유 5년부터 보유기간 공제)', R.rows[4].holdSum === s7, [R.rows[4].holdSum, s7]);
check('세금 합계 = 보유세 합계 + 양도세', R.rows.every(r => r.total === r.holdSum + r.cgt));
const R0 = X.taxRows(Object.assign({}, base, { resid: 0 }));
check('조정대상지역에서 사고 거주 0년이면 2년 보유해도 비과세 아님', R0.rows[1].exempt === 'none' && R0.rows[1].cgt === eng(2, { residMonths: 0 }).total && R0.rows[1].cgt > 0, R0.rows[1]);
const Rn = X.taxRows(Object.assign({}, base, { resid: 0, adj: false }));
check('비조정대상지역이면 거주 없이 2년 보유로 비과세 판정', Rn.rows[1].exempt === 'partial', Rn.rows[1]);
const Rs = X.taxRows(Object.assign({}, base, { sale: 100000 }));
check('팔 가격 = 산 가격이면 양도세 0원(차익 없음)', Rs.rows.every(r => r.cgt === 0 && r.tag === '차익 없음'));
const R2 = X.taxRows(Object.assign({}, base, { houses: 2, resid: 0 }));
check('2주택: 보유세는 재산세만(표준세율), 종부세는 넣지 않음', R2.rows[0].hold1 === T.propertyTax({ price: 8e8, one: false }).total && !R2.one, R2.rows[0]);
check('2주택 조정대상지역: 다주택 중과가 엔진 그대로', R2.rows[2].cgt === eng(3, { houses: 2, residMonths: 0 }).total && /중과/.test(R2.rows[2].tag), R2.rows[2]);
const R3 = X.taxRows(Object.assign({}, base, { houses: 3 }));
check('3주택 이상: 엔진에 3주택으로', R3.rows[2].cgt === eng(3, { houses: 3 }).total);
const Rg = X.taxRows(Object.assign({}, base, { std: 0 }));
check('공시가격이 없으면 보유세 칸 비움(추정 안 함)', Rg.rows.every(r => r.hold1 == null && r.holdSum == null));
check('두 번째 세금 엔진 없음: 세율·공제 숫자를 따로 두지 않음', !/0\.06|0\.15|0\.24|1400|BRACKETS|PT_BRK|CPT_BRK|ltdRate\s*=|HIGH_PRICE/.test(SRC) && /T\.calcCGT\(/.test(SRC) && /T\.propertyTax\(/.test(SRC) && /T\.compTax\(/.test(SRC));
check('법령 기준일·조항은 엔진 값(AS_OF·LAW)에서', /T\.AS_OF/.test(SRC) && /T\.LAW/.test(SRC));

/* ---------- ② 금액은 이 기기에만 ---------- */
check('주소·서버로 금액을 보내지 않음', !/location\.(href|hash|search)\s*=|history\.(push|replace)State|URLSearchParams|sendBeacon|XMLHttpRequest|method:\s*'POST'/.test(SRC));
check('fetch 는 공개 자료(analog) 읽기만', (SRC.match(/fetch\(/g) || []).length === 1 && /analog\//.test(SRC));
check('넣은 값은 이 기기(localStorage)에만', /localStorage\.setItem\(KEY/.test(SRC));
check('화면 HTML 의 링크에 금액이 없음', !/href=/.test(X.taxHtml({ code: '11710', dong: '가락동', apt: 'A', band: '84㎡대', P: 150000 }, 0)));
check('공시가격: 시세×비율 추정 없이 공시가격 자료(gongsi.js)만', /JDJ_GONGSI/.test(SRC) && !/현실화율\s*[*×]|\* ?0\.(6|7)\d* ?\/\/ ?공시/.test(SRC));
check('팔 가격 기본값 = 지금 시세 + 오른다고 가정하지 않았다는 표시', /q\('sale'\)\.value = comma\(mine\.sale \|\| x\.P\)/.test(SRC) && SRC.includes('팔 가격 = 지금 시세 그대로(오른다고 가정하지 않았어요)'));
check('산 가격 기본값 = 지금 시세', /q\('buy'\)\.value = comma\(mine\.buy \|\| x\.P\)/.test(SRC));
check('입력: 주택 수·실거주·산 가격·팔 가격·공시가격', ['houses', 'resid', 'buy', 'sale', 'std'].every(k => SRC.includes(`data-k="${k}"`)));
check('전문가 화면(임시 조건)에서는 저장하지 않음', /bindTax\(box, items, \{ persist: !S\._tmp \}\)/.test(PR) && /opt\.persist !== false/.test(SRC));

/* ---------- ③ 과거 사례 ---------- */
const x = { code: '11710', dong: '가락동', apt: '헬리오시티', band: '84㎡대', jb: '913', P: 150000, f: { hh: 9510 } };
const row = (nm, a, b, c) => ['서울특별시', '11500', '마곡동', nm, '84㎡대', '201510', 7, null, 28, 42, a, b, c];
const C7 = [row('가', 6, 53, 62), row('나', 21, 59, 41), row('다', 23, 65, 71), row('라', -7, -17, 30), row('마', 17, 1, 25), row('바', -5, -4, -8), row('사', 21, 54, 48)];
const IX = { sgg: { '11500': { name: '강서구' }, '11710': { name: '송파구' } } };
const AN = { meta: { to: '202610', ship: [], target: [40, 60], bt: { 1: { '04': { n: 6000, cov: 41 }, '10': { n: 6000, cov: 39 } }, 3: { '04': { n: 4000, cov: 28 }, '10': { n: 4000, cov: 29 } }, 10: { '04': { n: 0, cov: null }, '10': { n: 0, cov: null } } } },
  by: { '11710': { to: '202610', u: { '가락동|헬리오시티|84㎡대': { c: C7, now: [8, 30, 45] } } } } };
const h = X.casesHtml(x, AN, IX);
const st = X.caseStats(C7);
check('가운데 값(5년) = 사례 7곳의 가운데', st[2].med === 41 && st[2].lo === -8 && st[2].hi === 71, st[2]);
check('짝수 개면 가운데 두 값의 평균', X.caseStats(C7.slice(0, 6))[0].med === Math.round((6 + 17) / 2), X.caseStats(C7.slice(0, 6))[0]);
check('사례 7곳 모두 보이고 단지·평형·시점·그 뒤 1·3·5년', C7.every(c => h.includes('<b>' + c[3] + '</b>')) && h.includes('2015년 10월 그때') && h.includes('5년 뒤 <b>+62%</b>') && h.includes('1년 뒤 <b>−7%</b>'));
check('세대수 자료 없으면 그렇다고 표시(지어내지 않음)', h.includes('세대수 자료 없음'));
check('지번은 싣지 않음', !h.includes('913'));
check('가운데 값·가장 낮은~높은 곳 요약', h.includes('가운데 값') && h.includes('−8% ~ +71%') && h.includes('41% 올랐어요'));
check('지난 일이라 보장 없다는 안내', /보장은 없어요/.test(h));
check('이 단지 지금 모습(같은 기준)', h.includes('이 단지 지금(2026년 10월)') && h.includes('지은 지 8년') && h.includes('9,510세대') && h.includes('구 평균보다 30% 비쌈') && h.includes('최근 3년 +45%'));
check('고르는 기준값(한도·가중치)은 화면에 없음', !/±|이내|가중|배 이내|20%p|0\.12/.test(h.replace(/구 평균보다 \d+%/g, '')));
const few = X.casesHtml(x, { meta: AN.meta, by: { '11710': { to: '202610', u: { '가락동|헬리오시티|84㎡대': { c: C7.slice(0, 4) } } } } }, IX);
check('5곳 미만이면 싣지 않고 이유', few.includes('5곳보다 적어 싣지 않았어요') && !few.includes('<ol'));
check('자료 파일이 아직 없으면 준비 중 안내', X.casesHtml(x, { meta: null, by: {} }, IX).includes('준비하고 있어요'));

/* ---------- ④ 가격 시나리오 ---------- */
const s0 = X.scenHtml(x, AN);
check('기준 못 채우면 모든 기간 "아직 믿을 만한 범위가 나오지 않아 싣지 않았어요"', (s0.match(/아직 믿을 만한 범위가 나오지 않아 싣지 않았어요/g) || []).length === 5);
check('기간마다 검증 적중률(4월·10월) 표시', s0.includes('4월 기준 41% · 10월 기준 39%') && s0.includes('4월 기준 28% · 10월 기준 29%'));
check('검증할 결과가 없는 기간(10년)은 그렇다고', s0.includes('검증할 과거 결과가 아직 없어요'));
const AN2 = JSON.parse(JSON.stringify(AN)); AN2.meta.ship = [1, 3];
AN2.by['11710'].u['가락동|헬리오시티|84㎡대'].q = { 1: [-4, 3, 9, 170], 3: [-2, 12, 30, 160] };
const s1 = X.scenHtml(x, AN2);
check('실은 기간: 보수(하위 25%)·기준(가운데)·낙관(상위 25%) 세 값과 금액', s1.includes('<b>−4%</b>') && s1.includes('<b>+3%</b>') && s1.includes('<b>+9%</b>') && s1.includes('14억 4,000만 원') && s1.includes('하위 25%') && s1.includes('상위 25%'));
check('못 채운 기간(5·7·10년)은 범위 없이 안내', (s1.match(/아직 믿을 만한 범위가 나오지 않아 싣지 않았어요/g) || []).length === 3);
const AN3 = JSON.parse(JSON.stringify(AN2)); AN3.meta.ship = [];
check('자료에 범위가 있어도 검증 기준(ship)에 없으면 안 보임', !X.scenHtml(x, AN3).includes('<b>−4%</b>'));
check('한 값 예측·권유·보장 문구 없음', !/예상 가격|목표가|오를 거|사세요|파세요|추천|유망|보장해/.test(SRC) && /한 값으로 맞히려는 예측이 아니에요/.test(SRC) && /보장하지 않으며, 사고팔기를 권하는 정보가 아니에요/.test(SRC));
check('검증 설명: 그때까지 자료만 · 4월·10월 두 묶음 · 40~60%', s0.includes('그때까지 나온 자료만으로') && s0.includes('4월 시점과 10월 시점 두 묶음 모두 40~60%'));
check('자료가 아직 없으면 준비 중 안내', X.scenHtml(x, null).includes('준비하고 있어요'));

/* ---------- ⑤ 준비 중 칸 ---------- */
check('하나도 못 채우면 빠진 기간을 적음', /1년·3년·5년·7년·10년 가격 시나리오/.test(X.soonText(AN)));
check('일부만 채우면 나머지만', /^5년·7년·10년 가격 시나리오/.test(X.soonText(AN2)));
const all = JSON.parse(JSON.stringify(AN)); all.meta.ship = [1, 3, 5, 7, 10];
check('모두 채우면 칸 없음', X.soonText(all) === '');
check('추가 비용 없이 같은 링크로', /추가 비용 없이/.test(X.soonText(AN)));
check('만든 기능(세금·사례)은 준비 중 칸에 없음', !/세금|사례 비교/.test(X.soonText(AN)));

/* ---------- ⑥ 화면 연결·버전 ---------- */
const pages = ['premium/view/index.html', 'premium/r/index.html', 'premium/pro/index.html'];
const ver = (s, f) => (s.match(new RegExp(f.replace(/[.]/g, '\\.') + '\\?v=(\\d+)')) || [])[1];
['premium-extra.js', 'premium-report.js', 'gongsi.js', 'tax-engine.js', 'reg-zones.js'].forEach(f => {
  const vs = pages.map(p => ver(rd(p), f));
  check(`${f}: 세 리포트 화면 모두 같은 버전으로 불러옴`, vs.every(Boolean) && new Set(vs).size === 1, vs);
});
check('premium-extra.js 를 premium-report.js 보다 먼저', pages.every(p => { const s = rd(p); return s.indexOf('premium-extra.js') > 0 && s.indexOf('premium-extra.js') < s.indexOf('premium-report.js'); }));
const gv = new Set(require('child_process').execSync('grep -rhoE "gongsi\\.js\\?v=[0-9]+" --include=*.html --include=*.js .', { cwd: ROOT }).toString().trim().split('\n'));
check('gongsi.js 버전이 모든 곳에서 같음', gv.size === 1, [...gv]);
check('기존 구매자도 같은 링크로: 상품·결제일로 새 칸을 막지 않음', !/(paidAt|product|orderId)[^\n]{0,80}(taxHtml|casesHtml|scenHtml)/.test(PR) && /PX\(\) \? PX\(\)\.taxHtml\(x, i\)/.test(PR));
check('화면 문구: 회사명·경쟁 서비스 이름 없음', !/장대장|호갱노노|아실|직방|다방|네이버\s*부동산|KB\s*부동산|리치고/.test(SRC));
check('~요체(한다·합니다 끝맺음 없음)', !/(합니다|한다|됩니다)[.'"]/.test(SRC));

console.log(`프리미엄 추가 칸 검증: ${ok}개 통과, ${bad}개 실패`);
if (bad) process.exitCode = 1;
