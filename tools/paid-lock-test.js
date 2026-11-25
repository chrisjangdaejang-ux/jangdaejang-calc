/* 유료 판매 잠금(서버 PAID_OPEN · 화면 assets/config.js PAID_OPEN) 검증 — 실행: node tools/paid-lock-test.js </dev/null
   통신판매업 신고번호가 나오기 전: 돈을 받는 요청은 서버가 모두 거절하고, 무료 체험·문의 등은 그대로 지나가는지 확인합니다.
   (실제 서버에는 접속하지 않습니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const GS = read('tools/agent-backend.gs');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

const MSG = '유료 이용권은 곧 열려요. 지금은 7일 무료 체험만 할 수 있어요.';
const touched = [];
const ctx = {
  console, Date, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isNaN, encodeURIComponent, decodeURIComponent,
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  /* 잠긴 요청은 시트·토스·잠금에 닿기 전에 끝나야 함 — 닿으면 기록 */
  SpreadsheetApp: { getActive: () => { touched.push('sheet'); throw new Error('sheet'); } },
  LockService: { getScriptLock: () => { touched.push('lock'); return { waitLock() {}, releaseLock() {} }; } },
  UrlFetchApp: { fetch: () => { touched.push('fetch'); throw new Error('fetch'); } },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
  CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
  Utilities: { formatDate: d => new Date(d).toISOString().slice(0, 10), getUuid: () => '00000000-0000-0000-0000-000000000000' }
};
vm.createContext(ctx);
vm.runInContext(GS + '\n;globalThis.__T = { PAID_OPEN, PAID_ACTIONS, PAID_CLOSED_MSG, BRIEF_ACTIONS, PAY_ACTIONS };', ctx);
const T = ctx.__T;
const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);

check('서버: 지금은 판매 잠금(PAID_OPEN=false)', T.PAID_OPEN === false);
check('서버: 안내 문구', T.PAID_CLOSED_MSG === MSG, T.PAID_CLOSED_MSG);

/* 1) 돈을 받는 요청은 모두 거절(시트·토스에 닿기 전에) */
const PAID = ['createOrder', 'confirmPayment', 'briefOrder', 'briefConfirm', 'briefChangeQuote', 'briefChange', 'quizVoucherUse', 'htOrder', 'htConfirm', 'mvChargeOrder', 'mvChargeConfirm'];   // v55 예측 맞히기 리포트 이용권 쓰기도 유료 잠금 · 고민 상담 하트 충전도 · v57 이사 견적 포인트 충전도
check('잠금 목록 = 결제 요청 전부', JSON.stringify(Object.keys(T.PAID_ACTIONS).sort()) === JSON.stringify(PAID.slice().sort()), Object.keys(T.PAID_ACTIONS));
PAID.forEach(a => {
  touched.length = 0;
  const r = post({ action: a, s: 'x', product: 'brief', paymentKey: 'pk_test', orderId: 'JDJ000000-0000000000', amount: 3900 });
  check(`거절: ${a}`, r.ok === false && r.err === MSG && r.code === 'paid_closed', r);
  check(`거절: ${a} 는 시트·토스에 닿지 않음`, touched.length === 0, touched);
});

/* 2) 토스 승인(tossCall 'confirm')·새 주문번호(newOrderId)를 쓰는 함수는 모두 잠금 목록의 요청으로만 들어옴 — 새 결제 흐름을 만들고 잠금에 안 넣으면 여기서 걸림 */
const fnOf = i => { const all = [...GS.slice(0, i).matchAll(/\nfunction (\w+)\s*\(/g)]; return all.length ? all[all.length - 1][1] : ''; };
const callers = re => { const out = new Set(); for (const m of GS.matchAll(re)) out.add(fnOf(m.index)); return [...out].sort(); };
const confirmFns = callers(/tossCall\('confirm'/g), orderFns = callers(/(?<!function )newOrderId\(\)/g);
check('토스 승인을 부르는 함수', JSON.stringify(confirmFns) === JSON.stringify(['briefChangeConfirm', 'briefConfirm', 'confirmPayment', 'htConfirm', 'mvChargeConfirm']), confirmFns);
check('새 주문을 만드는 함수', JSON.stringify(orderFns) === JSON.stringify(['briefChange', 'briefOrder', 'createOrder', 'htOrder']), orderFns);
check('요금제 올리기 승인은 briefConfirm 안에서만', /function briefConfirm[^]*?briefChangeConfirm\(/.test(GS));

/* 3) 무료 요청은 잠금에 걸리지 않음(이 가짜 환경에선 다른 이유로 실패해도, 잠금 문구로 거절되면 안 됨) */
['briefTrial', 'briefMine', 'briefStop', 'briefRefund', 'briefUpdate', 'briefAdPref', 'openReport', 'findOrder', 'refundRequest', 'adInquiry', 'adApply', 'alertJoin', 'kakaoLogin', 'userSave', 'agencyApply', 'partnerApply'].forEach(a => {
  let r; try { r = post({ action: a }); } catch (e) { r = { ok: false, err: 'threw:' + e.message }; }
  check(`통과: ${a}`, r.err !== MSG && r.code !== 'paid_closed', r);
});
check('briefTrial 은 BRIEF_ACTIONS 에 그대로', !!T.BRIEF_ACTIONS.briefTrial && !T.PAID_ACTIONS.briefTrial);

/* 4) briefConfig 가 판매 여부를 알려 줌 */
ctx.briefChannels = () => ({ email: true, kakao: false, webpush: false });
const cfg = JSON.parse(ctx.doGet({ parameter: { action: 'briefConfig' } }).s);
check('briefConfig.paid = false', cfg.ok && cfg.paid === false, cfg);

/* 5) 화면: 설정·결제 버튼 잠금·오류 코드 대신 쉬운 안내 */
const conf = read('assets/config.js');
check('화면 설정 PAID_OPEN=false (서버와 같은 값)', /PAID_OPEN:\s*false/.test(conf));
const sub = read('brief/subscribe/index.html');
check('구독 화면: 설정·서버 값으로 결제 잠금', /JDJ_SITE\.PAID_OPEN/.test(sub) && /cfg\.paid === false/.test(sub));
check('구독 화면: 잠기면 버튼 글자 "유료 이용권은 곧 열려요"', (sub.match(/유료 이용권은 곧 열려요/g) || []).length >= 3);
check('구독 화면: 결제 누름도 막음', /if \(!PAID\) return msg\(/.test(sub));
check('구독 관리: 요금제 바꾸기 잠금', /JDJ_SITE\.PAID_OPEN/.test(read('brief/manage/index.html')));
const co = read('premium/checkout/index.html');
check('리포트 결제 화면: 설정을 읽고 결제 버튼 잠금', /assets\/config\.js\?v=\d+/.test(co) && /JDJ_SITE\.PAID_OPEN/.test(co) && /!PAID \|\| \$\('payBtn'\)\.disabled/.test(co));
/* 6) 토스 심사용 테스트 결제(PAY_REVIEW): 테스트 키일 때만, 서버 주문 없이 결제창만, 실제 키면 잠금 그대로 */
const payjs = read('assets/pay.js');
const mkPay = (key, site) => { const w = { JDJ_SITE: site }; vm.runInNewContext(payjs.replace(/const CLIENT_KEY = '[^']*'/, `const CLIENT_KEY = '${key}'`), { window: w, location: { pathname: '/jangdaejang-calc/premium/' }, document: { readyState: 'loading', addEventListener() {} }, localStorage: { getItem: () => null } }); return w.JDJ_PAY; };
check('심사 모드: 테스트 키 + PAY_REVIEW → 켜짐', mkPay('test_ck_x', { PAID_OPEN: false, PAY_REVIEW: true }).review() === true);
check('심사 모드: 실제 키(live_ck_)면 PAY_REVIEW 여도 꺼짐', mkPay('live_ck_x', { PAID_OPEN: false, PAY_REVIEW: true }).review() === false);
check('심사 모드: PAY_REVIEW=false 면 꺼짐', mkPay('test_ck_x', { PAID_OPEN: false, PAY_REVIEW: false }).review() === false);
check('심사 모드: 결제 화면은 심사 때 createOrder 를 부르지 않고 REVIEW- 주문번호', /const o = REVIEW[\s\S]{0,200}P\.REVIEW_PREFIX[\s\S]{0,600}: await P\.post\('createOrder'/.test(co));
check('심사 모드: 결제 화면에 "테스트 결제 · 실제 청구 없음"', co.includes('테스트 결제 · 실제 청구 없음') && payjs.includes("'테스트 결제 · 실제 청구 없음'"));
const suc = read('premium/success/index.html');
check('심사 모드: 완료 화면은 REVIEW- 주문이면 승인 요청 없이 끝냄', suc.indexOf('P.REVIEW_PREFIX') > 0 && suc.indexOf('P.REVIEW_PREFIX') < suc.indexOf("P.post('confirmPayment'"));
check('서버는 그대로: PAID_OPEN=false 면 createOrder 거절', !!T.PAID_ACTIONS.createOrder && T.PAID_OPEN === false);
const biz = read('assets/biz.js');
check('바닥글: 통신판매업 신고번호(제2026-서울강남-06774호)·정보 제공 안내·약관 링크', /mailOrderNo: '제2026-서울강남-06774호'/.test(biz) && biz.includes('특정 부동산의 매수·매도를 권유하지 않아요') && /terms\/[\s\S]*privacy\/[\s\S]*refund\//.test(biz));
['premium/index.html', 'premium/checkout/index.html', 'terms/index.html', 'about/index.html', 'brief/index.html', 'brief/subscribe/index.html'].forEach(f => check(`정보 제공 안내 문구: ${f}`, /특정 부동산의 매수·매도를 권유하지 않(아요|습니다)/.test(read(f))));
['premium/index.html', 'about/index.html', 'index.html', 'terms/index.html', 'refund/index.html', 'buy/index.html', 'assets/premium-report.js'].forEach(f => check(`권유처럼 읽히는 표현 없음: ${f}`, !/매수 리포트|매도 타이밍|사세요|파세요|유망|추천 단지/.test(read(f))));
const FB = '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.';
['assets/agents.js', 'assets/pay.js', 'assets/auth.js', 'assets/client-brief.js', 'assets/community.js', 'my/alerts/index.html'].forEach(f => check(`쉬운 오류 안내: ${f}`, read(f).includes(FB)));
/* agents.js 의 변환: 'unknown' → 쉬운 안내, 한글 안내는 그대로 */
const win = {}; vm.runInNewContext(read('assets/agents.js'), { window: win, localStorage: { getItem: () => '' }, fetch: () => Promise.reject(new Error('x')), setTimeout, clearTimeout, navigator: {}, document: { addEventListener() {} }, addEventListener() {}, Set, console });
const et = win.JDJ_ERRTEXT;
check('오류 글 변환: unknown → 쉬운 안내', et && et('unknown') === FB);
check('오류 글 변환: auth·영문 예외 → 쉬운 안내', et && et('auth') === FB && et('Exception: Service invoked too many times') === FB && et('') === FB);
check('오류 글 변환: 한글 안내는 그대로', et && et(MSG) === MSG);
['ad/index.html', 'pro/developer/index.html', 'bunyang/agency/index.html'].forEach(f => check(`예전 서버(unknown) 대체 접수 유지: ${f}`, read(f).includes("err.raw === 'unknown'")));

console.log(`유료 판매 잠금 검증: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
