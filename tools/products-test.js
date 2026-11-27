/* 유료 상품 안내 한 곳(assets/products.js) 검증 — 실행: node tools/products-test.js </dev/null
   대표 지시(2026-11-27): 돈을 내기 전에 무엇을 받는지 늘 분명하게 + 유료 구매 → 모닝 브리핑 잇기 + 구매 고객 30일 무료(꺼진 채)
   ① 모든 상품: 담긴 내용 3~5줄·들어 있지 않은 것·받는 방식·기간·환불 요약·환불 정책 링크·예시(가상 숫자)
   ② 금액이 서버·화면 표와 같음(서버 상품 키 그대로)
   ③ 유료 결제 단추가 있는 모든 화면이 상품 안내 한 곳을 씀(미리 보기 칸·결제 화면·상품 안내 표 포함)
   ④ 결제 뒤 화면(결제 완료·리포트 끝)과 무료 결과 화면에 모닝 브리핑 칸 · 이유 3가지 · 미리 채우기 동의 · GA 이벤트(개인정보 없음)
   ⑤ 구매 고객 30일 무료는 꺼진 채(화면·서버) · 유료 전환은 따로 받은 동의가 있을 때만(서버 안전장치)
   ⑥ 버전 번호가 모든 곳에서 같음 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let ok = 0, bad = 0;
const check = (m, c, x) => { if (c) ok++; else { bad++; console.log('실패:', m, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };

globalThis.JDJ_SITE = { PAID_OPEN: false, PAY_REVIEW: true };
const C = require('../assets/products.js');

/* ① 상품마다 설명이 빠짐없이 */
check('상품이 있음', C.LIST.length >= 10);
C.LIST.forEach(p => {
  check(`${p.id}: 담긴 내용 3~5줄`, Array.isArray(p.includes) && p.includes.length >= 3 && p.includes.length <= 5 && p.includes.every(t => t && t.length >= 8), p.includes);
  check(`${p.id}: 들어 있지 않은 것`, Array.isArray(p.excludes) && p.excludes.length >= 1 && p.excludes.every(Boolean));
  check(`${p.id}: 받는 방식·기간·환불`, !!(p.delivery && p.validity && p.refund && p.refundHref));
  check(`${p.id}: 환불 정책 화면이 있음`, fs.existsSync(path.join(ROOT, p.refundHref.split('#')[0], 'index.html')), p.refundHref);
  const anc = p.refundHref.split('#')[1]; if (anc) check(`${p.id}: 환불 정책 칸(#${anc})`, read('refund/index.html').includes(`id="${anc}"`));
  check(`${p.id}: 금액·이름`, p.amount > 0 && !!p.name && !!p.sub);
  check(`${p.id}: 예시(가상 숫자) 2줄 이상`, p.sample && p.sample.rows.length >= 2);
  check(`${p.id}: 사고팔기 권유 문구 없음`, !/사세요|매수하세요|추천 단지|무조건|수익 보장/.test(JSON.stringify(p)));
  check(`${p.id}: 화면 금지 단어 없음(시험·통과·회사명)`, !/시험|통과|장대장/.test(JSON.stringify(p)));
  const h = C.box(p.id, { preview: '실제 한 줄이에요. 둘째 줄', track: 't' });
  check(`${p.id}: 표준 칸에 이름·가격·담긴 내용·빠진 것·받는 방식·기간·환불 링크·예시 보기`, h.includes('유료로 보면') && h.includes(C.priceText(p)) && p.includes.every(t => h.includes(t.replace(/&/g, '&amp;').replace(/'/g, '&#39;')))
    && h.includes('들어 있지 않아요') && h.includes('받는 방식') && h.includes('기간') && h.includes('환불 정책') && h.includes('premium/sample/?p=' + p.id) && h.includes('실제 한 줄이에요.') && !h.includes('둘째 줄'));
});
check('청약: 입주 시점 시세 범위는 빠진 것으로 분명히', C.get('cy').excludes.some(t => /입주 시점 시세 범위/.test(t)));
check('청약: 날짜별 필요 현금표', C.get('cy').includes.some(t => /계약금·중도금 회차·잔금을 날짜별로/.test(t)));
check('단지 리포트: 아직 없는 것(가격 시나리오·세금)은 빠진 것으로', /가격 시나리오/.test(C.get('single').excludes[0]) && /양도세/.test(C.get('single').excludes[0]));
check('info 칸: 단추 없이 내용만(결제 단추가 이미 있는 화면)', !C.box('single', { mode: 'info' }).includes('자세히 보기 (유료)'));
check('결제 닫힘(심사용 결제 중)엔 곧 열려요 없음', !C.box('single').includes('곧 열려요'));
globalThis.JDJ_SITE = { PAID_OPEN: false }; check('결제 닫힘 → 곧 열려요', C.box('single').includes('결제는 곧 열려요'));
globalThis.JDJ_SITE = { PAID_OPEN: false, PAY_REVIEW: true };
check('없는 상품 → 빈 글자', C.box('nope') === '');
check('표: 모든 상품 줄', C.LIST.every(p => C.table().includes(`data-product="${p.id}"`)));

/* ② 금액 대조(서버 상품 키 그대로) */
const gs = read('tools/agent-backend.gs'), pay = read('assets/pay.js'), bc = read('assets/brief-core.js'), cs = read('assets/counsel-core.js'), dc = read('assets/dongne-core.js');
const amt = (src, id) => { const m = src.match(new RegExp(`\\b${id}:\\s*\\{[^}]*?amount:\\s*(\\d+)`)); return m ? +m[1] : null; };
['single', 'pack', 'cy'].forEach(id => {
  check(`${id}: 화면 결제 표(pay.js)와 같은 금액`, amt(pay, id) === C.get(id).amount, [amt(pay, id), C.get(id).amount]);
  check(`${id}: 서버 PRICE 와 같은 금액`, amt(gs.slice(gs.indexOf('const PRICE = {')), id) === C.get(id).amount);
});
['brief', 'brief_plus', 'brief_pro', 'brief_pro_plus'].forEach(id => {
  const sv = (gs.match(new RegExp(`id: '${id}',[^\\n]*?amount: (\\d+)`)) || [])[1], fr = (bc.match(new RegExp(`id: '${id}',[^\\n]*?amount: (\\d+)`)) || [])[1];
  check(`${id}: 서버·화면 요금제 표와 같은 금액`, +sv === C.get(id).amount && +fr === C.get(id).amount, [sv, fr, C.get(id).amount]);
  const T = (bc.match(new RegExp(`id: '${id}',[^\\n]*?areas: (\\d+), apts: (\\d+)`)) || []);
  check(`${id}: 관심 지역·단지 수가 담긴 내용과 같음`, C.get(id).includes.join(' ').includes(`관심 지역 ${T[1]}곳`) && C.get(id).includes.join(' ').includes(`관심 단지 ${T[2]}개`), T.slice(1));
});
const packs = [...cs.match(/CS_PACKS = \[([^\]]+)\]/)[1].matchAll(/won: (\d+), n: (\d+)/g)].map(m => [+m[1], +m[2]]);
check('하트: 가장 작은 묶음 = 표시 금액(부터)', packs[0][0] === C.get('heart').amount && C.get('heart').from === true);
check('하트: 묶음마다 담긴 내용에 개수·금액', packs.every(([w, n]) => C.get('heart').includes[0].includes(`${n}개 ${w.toLocaleString('ko-KR')}원`)), packs);
const JG = gs.match(/const JG_PRICE = \{ month: (\d+), read: (\d+), corp: (\d+)/) || [];
check('지킴이·등기 바로 확인·법인등기: 서버 JG_PRICE 와 같은 금액', +JG[1] === C.get('watch').amount && +JG[2] === C.get('read').amount && +JG[3] === C.get('corp').amount, JG.slice(1));
check('동네 파트너: 월 기본 요금', +(dc.match(/base: (\d+)/) || [])[1] === C.get('dongne').amount);

/* ③ 결제 단추가 있는 화면은 모두 상품 안내 한 곳을 씀 */
const PAY_RX = /결제하기|결제하고|충전하기|카드 등록하기|파트너 신청하기|requestPayment|requestBillingAuth/;
const SKIP = { 'assets/billing.js': '카드 등록 창 여는 공용 도우미', 'assets/dongne.js': '공용 도우미', 'assets/back.js': '화면 이름표', 'assets/config.js': '설명 주석', 'assets/products.js': '상품 안내 한 곳',
  'premium/fail/index.html': '결제 실패 안내 — 다시 결제는 상품 안내로', 'dongne/terms/index.html': '약관 본문' };
const files = [];
(function walk(d, rel) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name.startsWith('.') || ['node_modules', 'tools', 'docs', 'data', 'sitemaps', 'apt', 'comm', 'cy', 'weekly'].includes(f.name) && rel === '') continue;
    if (f.isDirectory()) walk(path.join(d, f.name), rel + f.name + '/');
    else if (/\.(html|js)$/.test(f.name)) files.push(rel + f.name);
  }
})(ROOT, '');
const payScreens = files.filter(f => !SKIP[f] && PAY_RX.test(read(f)));
const noCat = payScreens.filter(f => !/JDJ_PRODUCTS|data-jdj-paid|JDJ_TEASER\.html/.test(read(f)));
check(`결제 단추 화면 ${payScreens.length}곳 모두 상품 안내 한 곳을 씀`, noCat.length === 0, noCat);
const loadsCat = f => /assets\/products\.js\?v=\d+/.test(read(f));
payScreens.filter(f => f.endsWith('.html')).forEach(f => check(`products.js 를 불러옴: ${f}`, loadsCat(f)));
['buy/report/index.html', 'mine/index.html', 'chungyak/price/index.html'].forEach(f => { const s = read(f);
  check(`미리 보기 칸 화면: products.js 가 premium-teaser.js 보다 먼저: ${f}`, s.indexOf('assets/products.js') > 0 && s.indexOf('assets/products.js') < s.indexOf('premium-teaser.js')); });
/* 미리 보기 칸을 부르는 곳은 있는 상품 키를 넘김 */
const callers = files.filter(f => /JDJ_TEASER\.html\(|T\.html\(\{/.test(read(f)) && !/premium-teaser|products\.js/.test(f));
callers.forEach(f => { const ids = [...read(f).matchAll(/product:\s*'([a-z_]+)'/g)].map(m => m[1]);
  check(`미리 보기 칸 상품 키: ${f}`, ids.length > 0 && ids.every(id => C.get(id)), ids); });
['JDJ_PRODUCTS.box(plan', "box('heart'", "box('move_points'", "box('dongne'", 'JDJ_PRODUCTS.box(st.plan', 'JDJ_PRODUCTS.box(q.to'].forEach(k =>
  check(`결제 단추 위 상품 칸: ${k}`, payScreens.some(f => read(f).includes(k))));
const co = read('premium/checkout/index.html');
check('결제 화면: 상품 칸이 결제 단추보다 위', co.indexOf('id="pInc"') > 0 && co.indexOf('id="pInc"') < co.indexOf('id="payBtn"'));
const pm = read('premium/index.html');
check('상품 안내: 모든 유료 상품 표 + 상품 칸은 상품 안내 한 곳에서', pm.includes('id="paidTable"') && pm.includes('C.table()') && pm.includes('data-jdj-inc="single"') && pm.includes('data-jdj-inc="pack"'));
check('상품 안내: 아직 없는 기능을 판매 칸에 적지 않음', !/<li>과거 실거래 추세로 계산한 1~10년 가격 시나리오/.test(pm));
const sp = read('premium/sample/index.html');
check('예시 화면: 예시 표시·가상 숫자 안내·검색 제외', sp.includes('noindex') && sp.includes('가상으로 만든 예시') && sp.includes('smp-badge'));

/* ④ 결제 뒤·무료 결과 → 모닝 브리핑 칸 */
const BL = C.BRIEF_LINK;
['single', 'pack', 'cy', 'watch', 'read'].forEach(id => check(`${id}: 브리핑 이유 3가지·미리 보기 줄`, (BL.R[id] || []).length === 3 && (BL.S[id] || []).length >= 2));
['free_jeonse', 'free_cy', 'free_quiz', 'free_temp'].forEach(id => check(`${id}: 가벼운 칸 이유`, (BL.R[id] || []).length >= 2));
check('브리핑 칸 문구: 사고팔기 권유 없음', !/사세요|매수하세요|추천 단지|무조건|수익/.test(JSON.stringify(BL)));
const ctx = C.ctxFromKeys(['s11~11710~' + encodeURIComponent('잠실동') + '~' + encodeURIComponent('잠실엘스') + '~' + encodeURIComponent('84㎡대')]);
check('단지 키 → 맥락', ctx.g === '11710' && ctx.dn === '잠실동' && ctx.apt === '잠실엘스', ctx);
const cyx = C.ctxFromKeys(['s11~11710~' + encodeURIComponent('잠실동') + '~' + encodeURIComponent('예시공고') + '~cy2026000521']);
check('청약 키 → 공고 이름', cyx.notice === '예시공고' && !cyx.apt, cyx);
const bc1 = C.briefCard('single', ctx);
check('브리핑 칸: 이유 3가지(내 단지·동네 이름으로)·미리 보기·매일 읽는 이유·7일 무료', bc1.includes('잠실엘스에 새 실거래가') && bc1.includes('잠실동의 신고가') && bc1.includes('예시 · 내일 아침') && bc1.includes(BL.why) && bc1.includes('7일 무료로 받아 보기') && bc1.includes('월 3,900원부터'));
check('브리핑 칸: 미리 채우기 동의 칸(기본 켜짐) + 동의 끄면 동네·단지 없는 주소', bc1.includes('data-jbc-pre checked') && /data-nopre="[^"]*cta=buy_single"/.test(bc1) && /data-pre="[^"]*d=11710-[^"]*ap=/.test(bc1));
check('브리핑 칸: 금액·연락처를 주소에 싣지 않음', !/amount|contact|won=|price=/.test(bc1.match(/href="[^"]*"/g).join(' ')));
check('브리핑 칸: 구매 고객 30일 무료는 꺼진 채라 안 보임', !bc1.includes('30일 무료') && !bc1.includes('bbt=1'));
check('가벼운 칸: 미리 보기·긴 설명 없음', !C.briefCard('free_temp', {}).includes('jbc-pv'));
check('구독 화면: 미리 채운 단지(ap=) 받기 · 구독 결제 GA', /Q\.get\('ap'\)/.test(read('brief/subscribe/index.html')) && /JDJ\.track\('brief_subscribe', \{ cta: CTA/.test(read('brief/subscribe/index.html')));
const pj = read('assets/products.js');
check('GA: 칸 보임·누름(자리 이름만)', /track\('brief_card_view', at\)/.test(pj) && /track\('brief_card_click'/.test(pj) && /\{ at: at \}/.test(pj));
/* 결제한 상품마다 결제 뒤 화면에 브리핑 칸 */
const POST = { 'premium/success/index.html': ['single', 'pack', 'cy'], 'premium/view/index.html': ['single', 'pack', 'cy'] };
Object.keys(POST).forEach(f => { const s = read(f);
  check(`결제 뒤 화면 브리핑 칸: ${f}`, s.includes('briefCard(') && s.includes('idOfServerName(') && loadsCat(f));
  POST[f].forEach(id => check(`결제 뒤 화면 상품 연결(${id}): ${f}`, C.idOfServerName((gs.match(new RegExp(`${id}:\\s*\\{ name: '([^']+)'`)) || [])[1]) === id)); });
check('지킴이 결제 뒤(내 지킴이) 브리핑 칸', read('jeonse/guard/my/index.html').includes("briefCard('watch'") && loadsCat('jeonse/guard/my/index.html'));
check('등기 바로 확인 결제 뒤 브리핑 칸', read('jeonse/safety/index.html').includes("briefCard('read'"));
const pv = read('premium/view/index.html');
check('리포트 끝 브리핑 칸: 청약·단지 리포트 둘 다', (pv.match(/briefAfter\(j\);/g) || []).length === 2);
['report', 'jeonse'].forEach(g => C.LIST.filter(p => p.group === g).forEach(p => check(`유료 상품 ${p.id}: 결제 뒤 브리핑 이유가 있음`, !!BL.R[p.id])));
const FREE = { 'jeonse/safety/index.html': 'free_jeonse', 'chungyak/price/index.html': 'free_cy', 'quiz/index.html': 'free_quiz', 'temp/index.html': 'free_temp' };
Object.keys(FREE).forEach(f => check(`무료 결과 화면 가벼운 브리핑 칸: ${f}`, read(f).includes(`briefCard('${FREE[f]}'`) && loadsCat(f)));

/* ⑤ 구매 고객 30일 무료 — 꺼진 채, 전환은 따로 받은 동의가 있을 때만 */
check('화면: BUYER_TRIAL_ENABLED = false', /var BUYER_TRIAL_ENABLED = false;/.test(pj));
check('서버: BUYER_TRIAL_ENABLED = false', /const BUYER_TRIAL_ENABLED = false;/.test(gs));
check('서버: 카드 등록과 별도로 8일째부터 전환 동의', /const BBT_ASK_FROM = (\d+);/.test(gs) && +gs.match(/const BBT_ASK_FROM = (\d+);/)[1] >= 2);
check('서버: 동의 없으면 결제 안 함(baCharge 안전장치)', /if \(bbtPending\(uh, dpDay\(r\[BRAC\['다음결제일'\]\]\)\)\)/.test(gs));
check('서버: 동의 전에는 "자동 결제돼요" 문구 안 보임', /!bbtPending\(String\(r\[BRAC\['회원'\]\]\), nx\)/.test(gs));
check('서버: 해지는 잠겨 있어도·로그인 없이(메일 링크 확인값)', /if \(b\.action === 'briefBuyerOff'\) return withLock\(\(\) => bbtOff\(b\)\);/.test(gs) && /safeEq\(bbtTok\(uh\), t\)/.test(gs));
check('서버: 모든 안내 메일에 해지 링크', (gs.slice(gs.indexOf('function bbtDaily')).slice(0, 6000).match(/L\.off/g) || []).length >= 3);
check('서버: 판매 잠금', /function bbtOn\(\) \{ return BUYER_TRIAL_ENABLED && billOn\(\); \}/.test(gs));
globalThis.JDJ_SITE = { PAID_OPEN: true, BILLING_OPEN: true, BUYER_TRIAL_ENABLED: true };
const on = C.briefCard('cy', { notice: '예시공고' });
check('켜면: 구매 고객 칸이 30일 무료·따로 동의할 때만 유료', on.includes('구매 고객 30일 무료로 받기') && on.includes('bbt=1') && on.includes('따로 동의할 때만 유료'));
check('켜도: 무료 결과 화면은 7일 무료 그대로', C.briefCard('free_cy', {}).includes('7일 무료로 받아 보기'));
globalThis.JDJ_SITE = { PAID_OPEN: true, BILLING_OPEN: false, BUYER_TRIAL_ENABLED: true };
check('자동결제가 닫혀 있으면 켜도 안 보임', !C.briefCard('cy', {}).includes('30일 무료'));

/* ⑥ 버전 */
const ver = (f, a) => ((read(f).match(new RegExp(a.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1]);
const users = files.filter(f => /assets\/products\.js\?v=/.test(read(f))).concat(['sw.js']);
check('products.js 버전이 모든 곳에서 같음', new Set(users.map(f => ver(f, 'products.js'))).size === 1, users.map(f => f + ':' + ver(f, 'products.js')));
check('sw: products.js 미리 저장', /'\.\/assets\/products\.js\?v=\d+'/.test(read('sw.js')));

console.log(`유료 상품 안내·브리핑 잇기 검증: ${ok}개 통과, ${bad}개 실패`);
if (bad) process.exitCode = 1;
