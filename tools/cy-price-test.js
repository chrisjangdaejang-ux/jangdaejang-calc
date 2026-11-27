/* 청약 공고별 분양가·입지 분석 화면(assets/cy-price.js) 자동 확인 — 실행: node tools/cy-price-test.js [공개 자료 폴더(선택, 예: /tmp/site/data)]
   ① 문장: 위치는 '구간에 가까워요'까지, 차이는 범위로만, 표본이 적으면 '비교 자료 부족', 토지임대부는 비교하지 않음
   ② 자금 계획: 내 집 마련 계산기와 같은 loan-core.js 로 계산하고, 시점별 금액을 더하면 합계와 같음
   ③ 유료 리포트 키: 결제 서버 단지 키 형식 그대로 + 서버 가격표(cy)와 화면 가격이 같음
   ④ 화면 문구 원칙(~요체, 금지 단어, 회사명 대신 집예보, 광고와 무관 문구), 청약 화면·상세 화면 연결
   자료 폴더를 주면 실제 chungyak/price.json 의 모든 공고로 카드·상세를 그려 오류·금지 단어가 없는지 봅니다. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('XX ' + name, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } }

const ctx = { console, window: undefined, fetch: () => Promise.reject(new Error('no net')), location: { origin: 'https://x', search: '' }, localStorage: { getItem: () => null, setItem() {} } };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['assets/reg-zones.js', 'tax/tax-engine.js', 'assets/loan-rules.js', 'assets/rec-core.js', 'assets/loan-core.js', 'assets/cy-price.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
// rec-core 는 module 이 없으면 root.JDJ_REC 로 붙음
const C = ctx.JDJ_CYP, L = ctx.JDJ_LOAN;
check('모듈 로드', !!(C && L && ctx.JDJ_REC));

const bandHi = { b: 1, types: 2, hh: 85, pmin: 120000, pmax: 124000, ppy: 4741, rep: { area: 84.9, price: 120000 }, scope: '반경 1km', n: 12, apts: 2, q: [4100, 4300, 4500], pct: 91.7, tier: 2, lack: false, m: [-14, -5], span: [20251201, 20261020], sale_med: 4400, sale_n: 3 };
const bandLack = { b: 0, types: 1, hh: 35, pmin: 80000, pmax: 80000, ppy: 4415, rep: { area: 59.9, price: 80000 }, scope: '표본 부족', n: 0, apts: 0, q: null, pct: null, tier: null, lack: true };
const bandLease = Object.assign({}, bandHi, { lease: true, tier: null }); delete bandLease.m;
const R = { no: '2026000001', name: '테스트 단지', sd: '서울특별시', sid: 's00', g: '11290', gn: '성북구', dg: '장위동', k: '민영', pb: '20261101', ct: ['20261201'], mv: '202905', hh: 300,
  bands: [bandLack, bandHi], comp: { n: 3, rated: 2, low: 1, top: [{ name: 'A', d: 1.2, pb: '20260601', rate: 0.8, lo: 40, avg: 50 }, { name: 'B', d: 2, pb: '20260301', rate: 12.5, lo: 55, avg: 60 }] },
  fv: { near: [40, 56, 70], near_n: 120, gu: [44, 58, 69], gu_n: 129, past: { from: '201710', to: '202410', h: 24, months: 85, win: 50, top: 23.4, bot: 22.3 } },
  sup: [500, 0, 913, 3], uns: { ym: '202609', now: 25, y1: 10, grp: 1 }, und: null, reg: true, risks: ['주변보다 높은 분양가', '미분양 증가'] };

// ① 문장
const card = C.card(R);
check('카드: 분석 칸은 광고와 구분 표시', card.includes('cyp') && card.includes('집예보 분석 · 광고와 무관'), card.slice(0, 200));
check('카드: 위치는 구간에 가까움까지', card.includes('상위 구간에 가까워요') && !/비싸다|적정하다|저평가/.test(card));
check('카드: 위치 근거(범위·표본 수)', card.includes('반경 1km 12건') && card.includes('92%보다 높아요'));
check('카드: 차이는 범위(하한~상한) + 대표 주택형 금액', card.includes('14% 낮음 ~ 5% 낮음') && card.includes('-1억 6,800만 원 ~ -6,000만 원'), C.marginTxt(bandHi));
check('카드: 표본 부족이면 숫자 대신 비교 자료 부족', card.includes('비교 자료 부족') && !C.marginTxt(bandLack));
check('카드: 토지임대부는 비교 조건 다름', C.card(Object.assign({}, R, { bands: [bandLease] })).includes('비교 조건 다름') && !C.marginTxt(bandLease));
check('카드: 주변 청약(경쟁률 범위·미달)', card.includes('1순위 최고 경쟁률 0.8~12.5대 1') && card.includes('1순위 미달 1곳'));
check('카드: 미래가치 분포', card.includes('반경 2km 아파트 120곳의 미래가치 점수 중간값 56점'));
check('카드: 상세 링크', card.includes('chungyak/price/?no=2026000001'));
check('과거 성적: N번 중 M번', C.pastTxt(R.fv.past, R.sd).includes('85번 중 50번'));

const D = Object.assign({}, R, { bands: [bandLack, bandHi, bandLease], comp: [{ name: 'A', gn: '성북구', dg: '', d: 1.2, pb: '20260601', hh: 100, rate: 0.8, lo: 40, avg: 50, band: {} }, { name: 'B', d: 2, pb: '20260301', rate: null, lo: null, avg: null, band: {} },
  { name: 'C', d: null, pb: '20250301', rate: 3, lo: 30, avg: 35, band: {} }, { name: 'D', d: 2.9, pb: '20250101', rate: 5, lo: 31, avg: 36, band: {} }],
  fv: Object.assign({}, R.fv, { newer: [50, 62, 71], newer_n: 17 }), risks: [['미분양 증가', '성북구 미분양이 1년 전 10호에서 2026년 9월 25호로 늘었어요.']],
  table: [{ band: 1, grp: '신축(준공 5년 이내)', scope: '1km', q: [4100, 4300, 4500], n: 12, apts: 2 }], complexes: [{ name: 'X', dong: '장위동', by: 2022, band: 1, d: 0.4, med: 4300, n: 6 }],
  uns_series: [['202510', 10], ['202609', 25]], pp: { a3049: { v: -3.4, ym: '202610', rk: 18, of: 25 } }, pol: [{ date: '2025-10-15', name: '10·15 대책', plain: '설명' }], pol_at: '2026-11-19',
  types: [{ ty: '059.9000A', area: 59.9, hh: 35, price: 80000 }, { ty: '084.9000A', area: 84.9, hh: 60, price: 120000 }], dataTo: '202610', updated: '2026-11-20' });
const free = C.detail(D, D, { paid: false }), paid = C.detail(D, D, { paid: true });
check('상세(무료): 주변 분양 전체(2026-11-27 대표 승인 — 주변 거래 사례는 무료)', (free.match(/<tr><td>[A-D]<br>/g) || []).length === 4 && !free.includes('유료 리포트'));
check('상세(유료): 연식·범위별 표·비교 단지·미분양 추이·인구·정책', ['1-1. 연식·범위별', '가까운 비교 단지', '최근 24개월 미분양', '30~40대 인구 3년 증감', '10·15 대책'].every(t => paid.includes(t)));
check('상세(무료): 연식·범위별 표·비교 단지·미분양 추이도 무료(유료는 assets/cy-plan.js 세 가지)', free === paid && free.includes('1-1. 연식·범위별') && free.includes('최근 24개월 미분양'));
check('상세: 광고가 분석에 영향 없음 명시', free.includes('광고 여부는 분석 숫자에 영향을 주지 않아요'));
check('상세: 리스크(불리한 숫자) 그대로', free.includes('6. 살펴볼 점') && free.includes('25호로 늘었어요'));
check('상세: 지금 거래 기준(입주 때 가격 아님)', free.includes('입주 때 가격이 아니에요'));

// ② 자금 계획(서울 규제지역 12억 무주택, 계약 10%·중도금 60% 대출)
const o = { price: 120000, g: '11290', own: 'none', income: 0, dp: 10, mid: 60, midLoan: true, large: false };
const F = C.fund(o);
const c = L.ctx({ g: 'reg', own: 'none', income: 0, cash: 0, etc: 0, large: false }); c.dtiRatio = null;   // 소득 0 = 소득 규칙(DSR·DTI) 빼고
const ln = L.loanAt(120000, c, Infinity), cd = L.costDetail(120000, c, false);
check('자금: 잔금 주담대 = loan-core 같은 함수(규제지역 LTV 40%·한도 6억 중 작은 값)', F.loan === ln.L && F.loan === 48000, F);
check('자금: 계약금 10%', F.down === 12000);
check('자금: 중도금 대출이면 중도금 기간 내 돈 0', F.midCash === 0 && F.mid === 72000);
check('자금: 중도금 대출이 잔금 대출보다 크면 입주 때 차액도 냄', F.short === 72000 - 48000 && F.moveCash === 120000 - 12000 - 48000);
check('자금: 취득세 등(중개보수 없음)', Math.abs(F.tax - (cd.acq - cd.relief + cd.edu + cd.farm)) < 1e-6 && F.tax < cd.total);
check('자금: 시점별 합 = 합계', Math.abs(F.down + F.midCash + F.moveCash + F.tax - F.total) < 1e-6);
const F2 = C.fund(Object.assign({}, o, { midLoan: false }));
check('자금: 중도금을 내 돈으로 내면 입주 때 = 잔금 − 대출', F2.midCash === 72000 && F2.moveCash === Math.max(0, 36000 - 48000));
const F3 = C.fund(Object.assign({}, o, { income: 5000 }));
check('자금: 소득을 넣으면 DSR 반영(대출이 같거나 작아짐)', F3.loan <= F.loan);
const F4 = C.fund(Object.assign({}, o, { g: '47290' }));
check('자금: 지방 비규제 LTV 70%', F4.ltv === 0.7 && F4.g === 'local');
const FH = C.fundHTML(D, o, F);
check('자금 화면: 시점 3개 + 공고문 기준 안내', ['계약할 때', '중도금 기간', '입주할 때(잔금)', '입주자모집공고문'].every(t => FH.includes(t)));

// ③ 유료 키
const pay = fs.readFileSync(path.join(ROOT, 'assets/pay.js'), 'utf8');
const pctx = { console, window: {}, localStorage: { getItem: () => null, setItem() {} }, fetch() {}, document: { readyState: 'complete', addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {} }), body: { appendChild() {}, prepend() {} }, querySelector: () => null, getElementById: () => ({}) } }; pctx.window = pctx; vm.createContext(pctx);
vm.runInContext(pay, pctx);
const P = pctx.JDJ_PAY; ctx.JDJ_PAY = P;
const key = C.keyOf(R);
check('키: 결제 서버 형식(평형 자리 cy+공고번호)', !!P.keyParse(key) && P.keyParse(key).band === 'cy2026000001' && C.isCyKey(key) && C.noOfKey(key) === '2026000001', key);
check('키: 일반 단지 키는 청약 키 아님', !C.isCyKey(P.keyOf({ sd: 's00', code: '11290', dong: '장위동', apt: 'X', band: '84㎡' })));
const be = fs.readFileSync(path.join(ROOT, 'tools/agent-backend.gs'), 'utf8');
const m = be.match(/cy:\s*\{ name: '([^']+)', amount: (\d+)/);
check('서버 가격표(cy) = 결제 화면 가격 = 상세 화면 가격', m && P.PRODUCTS.cy && m[1] === P.PRODUCTS.cy.name && +m[2] === P.PRODUCTS.cy.amount && C.PRODUCT.name === m[1] && C.PRODUCT.amount === +m[2], m);
// 2026-11-27 이름 변경: '청약 분양가 리포트' → '청약 당첨 플랜'(키 cy·9,900원 그대로). 옛 이름 주문도 계속 처리
check('이름 변경: 화면·서버 모두 청약 당첨 플랜 9,900원', P.PRODUCTS.cy.name === '청약 당첨 플랜' && P.PRODUCTS.cy.amount === 9900 && m && m[1] === '청약 당첨 플랜');
check('이름 변경: 화면이 옛 이름(재배포 전 서버·예전 주문)을 새 이름으로', P.prodName('장대장 청약 분양가 리포트 · X') === '장대장 청약 당첨 플랜 · X' && P.prodName('단지 리포트') === '단지 리포트' && P.prodName(undefined) === '');
{ const ps = be.match(/const PRICE = \{[\s\S]*?\n\};/), fk = be.match(/function productKeyOf\(name\) \{[^\n]*\}/), fl = be.match(/function productLabel\(name\) \{[^\n]*\}/);
  const sx = {}; vm.createContext(sx);
  if (ps && fk && fl) vm.runInContext(ps[0] + '\n' + fk[0] + '\n' + fl[0] + ';globalThis.K = productKeyOf; globalThis.L = productLabel;', sx);
  check('서버: 옛 이름·새 이름 주문 모두 상품 cy 로 찾음(결제 승인·이용권)', sx.K && sx.K('청약 분양가 리포트') === 'cy' && sx.K('청약 당첨 플랜') === 'cy' && sx.K('단지 리포트') === 'single' && sx.K('없는 상품') === '');
  check('서버: 영수증·조회는 새 이름, 모르는 이름은 그대로', sx.L && sx.L('청약 분양가 리포트') === '청약 당첨 플랜' && sx.L('모닝 브리핑') === '모닝 브리핑');
  check('서버: 영수증·결제 완료 응답이 productLabel 사용', (be.match(/product: productLabel\(r\[OC\['상품'\]\]\)/g) || []).length >= 2); }
const SITE_FILES = ['assets/pay.js', 'assets/cy-price.js', 'assets/cy-plan.js', 'premium/index.html', 'premium/checkout/index.html', 'premium/view/index.html', 'premium/success/index.html', 'about/index.html', 'chungyak/price/index.html'];
check('이름 변경: 화면 파일에 옛 이름 문구 없음(pay.js 변환표만)', SITE_FILES.every(f => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); return f === 'assets/pay.js' ? (t.match(/청약 분양가 리포트/g) || []).length === 1 : !t.includes('청약 분양가 리포트'); }));
check('키: 결제 모듈 keyOf 와 같은 문자열', key === P.keyOf({ sd: R.sid, code: R.g, dong: R.dg, apt: R.name, band: 'cy' + R.no }));
check('서버: 청약 키와 상품이 맞지 않으면 거절', /keys\.some\(x => \/~cy\\d\+\$\/\.test\(x\.k\)\) !== !!P\.cy/.test(be));
const bpk = be.match(/function parseKey\(k\) \{[\s\S]*?\n\}/);
if (bpk) { const bx = {}; vm.createContext(bx); vm.runInContext((be.match(/function str\([^)]*\) \{[^\n]*\n?[^\n]*\}/) || [''])[0] + '\n' + bpk[0] + ';globalThis.pk = parseKey;', bx); check('서버 parseKey 가 청약 키를 받음', !!bx.pk(key), key); }

// ④ 문구 원칙
const all = card + free + paid + FH + C.card(Object.assign({}, R, { bands: [bandLease] }));
check('화면: 금지 단어 없음', !/시험|통과|장대장부동산그룹|장대장/.test(all), (all.match(/시험|통과|장대장[가-힣]*/g) || []));
check('화면: ~요체(습니다 없음)', !/습니다/.test(all), (all.match(/[가-힣]*습니다/g) || []).slice(0, 5));
const cy = fs.readFileSync(path.join(ROOT, 'chungyak/index.html'), 'utf8');
check('청약 화면: cy-price.js 와 카드', /assets\/cy-price\.js\?v=\d+/.test(cy) && cy.includes('JDJ_CYP.card(CYP[n.no])') && /cy-price\.css\?v=\d+/.test(cy));
const pg = fs.readFileSync(path.join(ROOT, 'chungyak/price/index.html'), 'utf8');
check('상세 화면: 자금 계획·유료 결제(cy)·브로슈어 안내', pg.includes('mountFund') && pg.includes('checkout/?p=cy') && pg.includes('#p-brochure') && /loan-core\.js\?v=\d+/.test(pg));
const pv = fs.readFileSync(path.join(ROOT, 'premium/view/index.html'), 'utf8');
check('유료 열람: 청약 키면 청약 리포트로', pv.includes('JDJ_CYP.renderPaid') && pv.includes('isCyKey'));
const dev = fs.readFileSync(path.join(ROOT, 'pro/developer/index.html'), 'utf8');
check('시행사 안내: 현장 분석 브로슈어 상품·가격 칸·샘플', dev.includes('id="p-brochure"') && dev.includes('data-pp="brochure"') && dev.includes('sample-brochure.pdf') && fs.existsSync(path.join(ROOT, 'pro/developer/sample-brochure.pdf')));

// 실제 자료(선택)
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'chungyak/price.json'))) {
  const ix = JSON.parse(fs.readFileSync(path.join(dir, 'chungyak/price.json'), 'utf8'));
  let n = 0, bad = [];
  for (const [no, r] of Object.entries(ix.rows || {})) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, 'chungyak/price', no + '.json'), 'utf8'));
      const h = C.card(r) + C.detail(d, d, { paid: true });
      if (/undefined|NaN|시험|통과|습니다/.test(h)) bad.push([no, (h.match(/undefined|NaN|시험|통과|[가-힣]*습니다/) || [])[0]]);
      (d.types || []).forEach(t => { const f = C.fund({ price: t.price, g: d.g, own: 'none', dp: 10, mid: 60, midLoan: true, large: t.area > 85 }); if (!(f.total > 0)) bad.push([no, 'fund']); });
      n++;
    } catch (e) { bad.push([no, String(e)]); }
  }
  check(`실제 자료 ${n}곳: 카드·상세·자금 계획 오류 없음`, n > 0 && !bad.length, bad.slice(0, 5));
}

// 분양 예정(공고 전): 주변 신축 평당 시세 참고값 — 분양가 추정 없음
const PH = { dataTo: '202610', r: { r1: 1, r2: 2, min_n: 10, age: 10 } };
const P1 = { n: '장위9', gn: '성북구', xy: true, r1: { n: 12, med: 4100, lo: 3900, hi: 4400, apts: 2, span: [20260101, 20260930] }, r2: { n: 5, lack: true }, gu: { n: 40, med: 3800, lo: 3300, hi: 4300, apts: 6, span: [20251101, 20261020] } };
const pc = C.planCard(P1, PH);
check('예정: 반경·같은 구 중간값·범위·건수·기준일', pc.includes('반경 1km') && pc.includes('4,100만 원') && pc.includes('3,900~4,400만 원') && pc.includes('12건') && pc.includes('2026.1.1~2026.9.30') && pc.includes('2026년 10월까지'), pc);
check('예정: 표본 적은 범위는 비교 자료 부족', /반경 2km<\/span><span class="v na">비교 자료 부족/.test(pc), pc);
check('예정: 분양가 추정 아님·공고되면 바뀜 안내', pc.includes('분양가를 추정한 값이 아니에요') && pc.includes('분양가가 공고되면 분양가 비교 분석으로 바뀌어요'));
const pc2 = C.planCard({ n: 'x', gn: '종로구', xy: false, gu: { n: 3, lack: true } }, PH);
check('예정: 좌표 없음·전부 부족 → 숫자 없이 안내', !pc2.includes('cyp-pr') && pc2.includes('반경 비교는 하지 않았어요') && pc2.includes('비교 자료 부족') && !/\d,\d{3}만 원/.test(pc2), pc2);
check('예정: 목록용 짧은 카드는 설명 없이', !C.planCard(P1, PH, { short: true }).includes('추정한 값이 아니에요') && C.planNote(PH).includes('추정한 값이 아니에요'));
check('예정: 금지 단어 없음', !/시험|통과/.test(pc + pc2));
console.log(`${pass}/${pass + fail} 맞음`);
process.exit(fail ? 1 : 0);
