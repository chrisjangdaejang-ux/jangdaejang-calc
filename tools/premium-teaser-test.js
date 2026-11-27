/* 무료·유료 기준(대표 승인 2026-11-26, 엔진 docs/pricing_policy.md) 검증 — 실행: node tools/premium-teaser-test.js </dev/null
   ① 유료 미리 보기 칸(assets/premium-teaser.js): 실제 문장만, 없으면 줄 없음, 자물쇠 없음, 결제 닫힘이면 '곧 열려요'(심사용 결제 중엔 없음)
   ② 화면 전체: 자물쇠 그림 없음 · 무료 로그인 안내는 '무료' 를 분명히 · 상품 안내에 무료/유료 칸 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let ok = 0, bad = 0;
const check = (m, c, x) => { if (c) ok++; else { bad++; console.log('실패:', m, x !== undefined ? JSON.stringify(x) : ''); } };

globalThis.JDJ_SITE = { PAID_OPEN: false, PAY_REVIEW: true };
const T = require('../assets/premium-teaser.js');
let h = T.html({ preview: '과거 단지 10건 중 7건이 더 올랐어요. 둘째 문장', key: '11710|잠실동|잠실엘스|84', track: 't' });
check('미리 보기: 첫 문장만', h.includes('과거 단지 10건 중 7건이 더 올랐어요.') && !h.includes('둘째 문장'), h);
check('단추 문구', h.includes('>자세히 보기 (유료)</a>'));
check('단지 키 → 상품 안내', h.includes('premium/?p=single&amp;k=11710%7C'), h);
check('유료 표시', h.includes('<span class="jpt-tag">유료</span>'));
check('자물쇠·흐림 없음', !/🔒|blur\(/.test(h + T.CSS));
check('심사용 결제 중엔 곧 열려요 없음', !h.includes('곧 열려요'));
check('미리 보기 문장이 없으면 줄 자체가 없음', !T.html({}).includes('jpt-p'));
check('글자 이스케이프', T.html({ preview: '<b>x' }).includes('&lt;b&gt;x'));
globalThis.JDJ_SITE = { PAID_OPEN: false, PAY_REVIEW: false };
check('결제 닫힘 → 곧 열려요', T.html({}).includes('결제는 곧 열려요'));
globalThis.JDJ_SITE = { PAID_OPEN: true, PAY_REVIEW: false };
check('결제 열림 → 곧 열려요 없음', !T.html({}).includes('곧 열려요'));
check('config: 지금은 결제 닫힘 + 심사용 결제', /PAID_OPEN:\s*false/.test(read('assets/config.js')) && /PAY_REVIEW:\s*true/.test(read('assets/config.js')));

/* ② 화면 */
const SCREENS = ['index.html', 'mine/index.html', 'map/index.html', 'buy/index.html', 'buy/report/index.html', 'villa/index.html', 'land/index.html', 'premium/index.html', 'about/index.html', 'all/index.html',
  'assets/price-sheet.js', 'assets/narrative.js', 'assets/comm-view.js', 'assets/villa-view.js', 'assets/land-core.js', 'assets/mine-core.js'];
SCREENS.forEach(f => check(`자물쇠 그림 없음: ${f}`, !read(f).includes('🔒')));
const ps = read('assets/price-sheet.js'), br = read('buy/report/index.html');
check('실거래 더보기 로그인 안내: 무료 분명히', /무료 로그인하면 전부 볼 수 있어요/.test(ps) && /카카오 간편 로그인\(무료\)하고 전부 보기/.test(ps));
check('리포트 상세(대출·현금·월 상환)는 로그인 잠금 없음', !/repLocked|jdj-locked|report_detail/.test(br) && /결제는 필요 없어요/.test(ps));
['mine/index.html', 'buy/report/index.html'].forEach(f => { const s = read(f);
  check(`미리 보기 칸 불러옴: ${f}`, /premium-teaser\.js\?v=\d+/.test(s) && s.indexOf('premium-teaser.js') < s.indexOf('narrative.js?v=')); });
check('리포트: 단지 키를 미리 보기에 넘김', /premKey:\s*k/.test(br) && /premKey:\s*pk/.test(read('mine/index.html')));
check('리포트: 예전 프리미엄 문구 없음', !br.includes('프리미엄 리포트 (9,900원)'));
const pm = read('premium/index.html');
check('상품 안내: 무료/유료 칸', pm.includes('id="freepaid"') && pm.includes('무료로 쓰는 기능') && pm.includes('유료 기능') && pm.includes('미래가치 상세 리포트'));
check('상품 안내: 수수료 서류는 공식 사이트로', /iros\.go\.kr/.test(pm));
check('상품 안내: 투자 권유 아님', pm.includes('매수·매도를 권하지 않아요'));
const sw = read('sw.js');
check('sw: 미리 보기 칸 미리 저장', /premium-teaser\.js\?v=\d+/.test(sw));
const v = f => ((read(f).match(/premium-teaser\.js\?v=(\d+)/) || [])[1]);
check('미리 보기 칸 버전이 모든 곳에서 같음', new Set(['sw.js', 'mine/index.html', 'buy/report/index.html'].map(v)).size === 1);

console.log(`무료·유료 기준 검증: ${ok}개 통과, ${bad}개 실패`);
if (bad) process.exitCode = 1;
