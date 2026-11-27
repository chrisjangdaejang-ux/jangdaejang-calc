/* 매물 가격 확인(check/) 검사 — 실행: node tools/check-test.js
   ① 매물 글 읽기: 여러 가지 금액 쓰는 법(억·천·만·원·쉼표·소수점), 전세·월세, 평과 ㎡, 공급/전용, 층
   ② 비교 계산: 기준 값 = ㎡당 중간값 × 전용 × 층 보정, 기간 넓히기(6→12개월), 층 보정(자료가 적으면 안 함), 점 그림 순서·위치 문장
   ③ 주소에 금액이 없는지: prefillUrl 이 금액을 버리는지, 공유로 받은 글을 주소에서 지우는지, 사이트 안 모든 check/ 링크·manifest·sw 캐시 규칙
   ④ 내가 본 매물(localStorage) 정리·겹침·지우기 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require('../assets/check-core.js');
const rows = [];
function check(name, got, want) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ① 금액 */
const MONEY = [
  ['매매 12억 5,000', 'sale', 125000], ['12.5억', 'sale', 125000], ['12억', 'sale', 120000], ['12억5천', 'sale', 125000], ['12억 5천만원', 'sale', 125000],
  ['9억8천500', 'sale', 98500], ['3천만원', 'sale', 3000], ['8,500만원', 'sale', 8500], ['8500만', 'sale', 8500], ['1,250,000,000원', 'sale', 125000],
  ['매매가 125,000', 'sale', 125000], ['호가: 31억', 'sale', 310000], ['매매 9억 (전용 59㎡)', 'sale', 90000], ['전세 6억', 'jeonse', 60000], ['전세금 3억 5,000만 원', 'jeonse', 35000],
  ['전세가 4.2억', 'jeonse', 42000], ['12억 84㎡ 12층', 'sale', 120000], ['매매 12억 84㎡', 'sale', 120000]
];
for (const [t, k, v] of MONEY) { const p = C.parsePrice(t); check(`금액: '${t}' → ${k} ${v}`, p && [p.kind, p.price], [k, v]); }
const WOL = [['월세 1000/150', 1000, 150], ['월세 1억/200', 10000, 200], ['보증금 5000 월 120', 5000, 120], ['반전세 2억/50', 20000, 50], ['월세 보증금 3,000 / 월 90', null, null]];
for (const [t, d, r] of WOL) { const p = C.parsePrice(t); if (d == null) continue; check(`월세: '${t}' → ${d}/${r}`, p && [p.kind, p.deposit, p.rent], ['wolse', d, r]); }
check('toMan: 단위 없는 작은 숫자는 만원', C.toMan('85000'), 85000);
check('toMan: 1억 원보다 큰 단위 없는 숫자는 원', C.toMan('850000000'), 85000);
check('toMan: 못 읽는 글', C.toMan('협의'), null);
check('금액 없음 → null', C.parsePrice('남향 올수리 84㎡ 12층'), null);

/* ① 면적·층 */
const AREA = [
  ['전용 84.97㎡', { excl: 84.97 }], ['전용면적: 59.99m2', { excl: 59.99 }], ['84.97m²', { excl: 84.97 }], ['공급 112.4㎡ 전용 84.97㎡', { excl: 84.97, supply: 112.4 }],
  ['112.4/84.97㎡', { excl: 84.97, supply: 112.4 }], ['공급/전용 112.4/84.97㎡', { excl: 84.97, supply: 112.4 }], ['전용/공급 84.97/112.4㎡', { excl: 84.97, supply: 112.4 }],
  ['34평', { supply: 112.4, py: 34 }], ['34평형', { supply: 112.4, py: 34 }], ['전용 25.7평', { excl: 84.96 }], ['34/25평', { excl: 82.65, supply: 112.4 }]
];
for (const [t, w] of AREA) { const a = C.parseArea(t) || {}; check(`면적: '${t}'`, Object.keys(w).reduce((o, k) => (o[k] = a[k], o), {}), w); }
check('평은 공급 기준으로 봄(basis)', C.parseArea('34평').basis, 'py-supply');
check('㎡ 와 평 환산(1평 = 3.3058㎡)', C.parseArea('전용 10평').excl, 33.06);
check('면적 없음', C.parseArea('매매 12억'), null);
const FL = [['12층', { floor: 12 }], ['12/25층', { floor: 12, total: 25 }], ['12층/25층', { floor: 12, total: 25 }], ['고/25층', { word: '고', total: 25 }], ['저층', { word: '저' }], ['해당층 7', { floor: 7 }]];
for (const [t, w] of FL) check(`층: '${t}'`, C.parseFloor(t), w);
check('층: 25층 건물은 매물 층이 아님', C.parseFloor('25층 건물'), null);
check('층: 월세 1000/150 을 층으로 읽지 않음', C.parseFloor('월세 1000/150'), null);

/* ① 글 전체 */
const L1 = C.parseListing('[매매] 래미안대치팰리스 101동\n서울시 강남구 대치동\n매매 32억 5,000\n공급/전용 112.4/84.97㎡ · 12/25층 · 남향 · 올수리');
check('글: 단지 이름·동·구', [L1.name, L1.dong, L1.sgg], ['래미안대치팰리스', '대치동', '강남구']);
check('글: 가격·면적·층', [L1.price.price, L1.area.excl, L1.floor.floor], [325000, 84.97, 12]);
check('글: 종류 짐작 아파트', L1.type, 'apt');
check('글: 오피스텔', C.guessType('역삼 센트럴 오피스텔 전세 2억'), 'offi');
check('글: 빌라', C.guessType('신축 빌라 투룸 매매 3억'), 'villa');
check('글: 상가', C.guessType('1층 상가 전용 45㎡ 매매 9억'), 'comm');
check('글: 토지', C.guessType('임야 330㎡ 1억 2천'), 'land');
check('글: 단지명 칸이 있으면 그것', C.nameHint('단지명: 헬리오시티\n매매 20억').name, '헬리오시티');
check('매물 글처럼 보임', C.looksLikeListing('은마 34평 매매 22억'), true);
check('단지 이름만은 매물 글 아님', C.looksLikeListing('헬리오시티'), false);
check('가격 없는 글은 매물 글 아님', C.looksLikeListing('헬리오시티 84㎡ 12층'), false);

/* ② 비교 계산 */
const T = (d, area, floor, amt, direct) => [d, area, floor, amt, direct ? 1 : 0, 0];
const raw = [T(20261010, 84, 10, 100000), T(20260920, 84, 5, 98000), T(20260815, 84, 12, 102000), T(20260701, 84, 2, 95000), T(20260601, 84, 8, 99000), T(20260505, 84, 7, 50000, true), T(20251201, 84, 9, 90000)];
const ts = C.normTrades(raw, 'apt');
check('거래 정리: 직거래 표시', ts.filter(t => t.direct).length, 1);
const r = C.evaluate({ trades: ts, to: '202610', area: 84, price: 105000 });
check('기간: 최근 6개월(2026.05~10), 직거래 빼고 5건', [r.from, r.to, r.n, r.months], ['202605', '202610', 5, 6]);
check('기준 = ㎡당 중간값 × 전용(층 정보 없으면 보정 없음)', r.base, Math.round(99000 / 84 * 84));
check('차이 = 매물 ÷ 기준 − 1', Math.round(r.diff * 10000), Math.round((105000 / 99000 - 1) * 10000));
check('문장: 약 6% 높은 편', C.diffWord(r.diff).text, '최근 거래보다 약 6% 높은 편이에요');
check('문장: 2% 안은 비슷한 편', C.diffWord(-0.015).text, '최근 거래와 비슷한 편이에요');
check('문장: 비교 대상 이름 바꾸기(받침에 맞는 조사)', [C.diffWord(-0.1, '전세 시세').text, C.diffWord(0, '전세 시세').text], ['전세 시세보다 약 10% 낮은 편이에요', '전세 시세와 비슷한 편이에요']);
check('점 그림: 싼 것부터', r.pts.map(p => p.amt), [95000, 98000, 99000, 100000, 102000]);
check('위치 문장: 모두보다 높음', C.rankText(r, 105000), '5건 거래보다 모두 높아요');
const r2 = C.evaluate({ trades: ts, to: '202610', area: 84, price: 99500 });
check('위치 문장: 싼 쪽에서 4번째', C.rankText(r2, 99500), '5건 중 싼 쪽에서 4번째 자리예요');
check('면적 환산: 다른 면적 매물은 ㎡당 × 매물 면적', C.evaluate({ trades: ts, to: '202610', area: 42, price: 0 }).base, Math.round(99000 / 84 * 42));
const few = C.normTrades([T(20261001, 84, 3, 100000), T(20260210, 84, 3, 90000), T(20260110, 84, 3, 92000)], 'apt');
const rf = C.evaluate({ trades: few, to: '202610', area: 84, price: 100000 });
check('6개월 거래가 3건 미만이면 12개월로 넓힘(넓혔다고 표시)', [rf.months, rf.n, rf.widened], [12, 3, true]);
check('거래가 하나도 없으면 null', C.evaluate({ trades: [], to: '202610', area: 84, price: 1 }), null);
const rv = C.evaluate({ trades: C.normTrades([['20240101', 30000, 30, 15, '3'], ['20250101', 32000, 30, 15, '2']], 'villa'), to: '202610', area: 30, price: 31000, spans: [6, 12, 36] });
check('빌라: 36개월까지 넓힘', [rv.months, rv.n], [36, 2]);

/* ② 층 보정 */
const mk = [];
for (let m = 0; m < 30; m++) { const ym = C.ymAdd('202401', m), d = +(ym + '15'); mk.push(T(d, 84, 2, 97000)); mk.push(T(d, 84, 8, 100000)); mk.push(T(d, 84, 18, 103000)); }
const mts = C.normTrades(mk, 'apt');
const fLow = C.floorFactor(mts, { floor: 2 }), fHigh = C.floorFactor(mts, { floor: 19 }), fMid = C.floorFactor(mts, { floor: 8 });
check('층 무리: 저층 1~3, 고층 = 가장 높은 층의 2/3 이상', [fLow.group, fMid.group, fHigh.group, fLow.maxFloor], ['low', 'mid', 'high', 18]);
check('층 보정 배수 = 그 층 무리 rel 중간값 ÷ 전체 rel 중간값', [fLow.factor, fHigh.factor], [Math.round(97000 / 100000 * 1000) / 1000, Math.round(103000 / 100000 * 1000) / 1000]);
check('층 보정 쓴 거래 수', [fLow.ok, fLow.nAll, fLow.n], [true, 90, 30]);
const rr = C.evaluate({ trades: mts, to: '202606', area: 84, price: 0, floor: { floor: 2 } });
check('기준 값에 층 보정이 곱해짐', rr.base, Math.round(rr.ppm * 84 * fLow.factor));
const thin = C.floorFactor(C.normTrades(mk.slice(0, 12), 'apt'), { floor: 2 });
check('거래가 15건 미만이면 층 보정 안 함(이유 thin)', [thin.ok, thin.factor, thin.reason], [false, 1, 'thin']);
check('층을 모르면 보정 안 함', C.floorFactor(mts, {}).reason, 'nofloor');
check('낱말 층(고층)', C.floorFactor(mts, { word: '고' }).group, 'high');

/* ② 그 밖 계산 */
check('전세 끼고 사기: 현금 = 가격 − 전세, 전세가율', C.gapCash(100000, 60000), { cash: 40000, ratio: 0.6 });
const R = require('../assets/loan-rules.js');
const lh = C.loanHint(100000, R, 'capfree', 'none');
check('대출 한도 어림: LTV 와 가격대별 최대 금액 중 작은 값', lh.max, Math.min(Math.floor(100000 * R.ltvOf('capfree', 'none')), R.capOf(100000, 'capfree')));
check('대출 한도 어림: 25억 넘는 집은 가격대별 최대 금액', C.loanHint(300000, R, 'capfree', 'none').by, 'cap');
check('월세 수익률 = 월세×12 ÷ (가격 − 보증금)', Math.round(C.yieldOf(60000, 5000, 250) * 10000), Math.round(250 * 12 / 55000 * 10000));
const cr = [[20261001, '역삼동', '1-1', '근생', '일반상업', 50, 100, 1, 50000, 0], [20260901, '역삼동', '1-2', '근생', '일반상업', 40, 80, 1, 48000, 0], [20260801, '역삼동', '8**', '근생', '일반상업', 30, 60, 1, 99000, 1], [20251001, '역삼동', '1-3', '근생', '일반상업', 50, 100, 1, 10, 0]];
const cs = C.commStat(cr, '역삼동', 'c', '202610');
check('상가: 같은 동 최근 12개월, 직거래 빼고 ㎡당 중간값', [cs.n, cs.ppm], [2, (1000 + 1200) / 2]);
check('상가: 건물 한 채는 대지면적 기준', C.commStat(cr, '역삼동', 'g', '202610').ppm, (500 + 600) / 2);

/* ③ 주소에 금액 없음 */
const u1 = C.prefillUrl('/s/', { sd: 's00', d: '11680|대치동|316|은마', b: '84㎡대', t: 'apt', price: 125000, text: '매매 12억' });
check('prefillUrl: 단지 키·평형·종류만', u1, '/s/check/?sd=s00&d=' + encodeURIComponent('11680|대치동|316|은마') + '&b=' + encodeURIComponent('84㎡대') + '&t=apt');
check('prefillUrl: 금액처럼 보이는 값은 버림', C.prefillUrl('/', { d: '12억 5천', b: '84㎡대' }), '/check/?b=' + encodeURIComponent('84㎡대'));
check('hasAmount: 금액', ['12억', '5,000만원', 'p=125000', '?text=abc', '3천만'].map(C.hasAmount), [true, true, true, true, true]);
check('hasAmount: 단지 키·평형·구 코드는 금액 아님', ['84㎡대', '11680|대치동|316|은마', 's00', '11680'].map(C.hasAmount), [false, false, false, false]);
const sh = C.readShare('?title=' + encodeURIComponent('매물') + '&text=' + encodeURIComponent('은마 매매 31억') + '&src=pwa', '/jangdaejang-calc/check/', '');
check('공유로 받은 글: title·text 합쳐 읽음', sh.text, '매물\n은마 매매 31억');
check('공유로 받은 글: 주소에서 title·text·url 을 지움', sh.clean, '/jangdaejang-calc/check/?src=pwa');
check('공유로 받은 글이 없으면 주소 그대로', C.readShare('?sd=s00', '/check/', '').clean, null);
const mem = (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();
C.stash(mem, { text: '매매 12억' });
check('넘겨주기: sessionStorage 로 한 번만', [C.take(mem), C.take(mem)], ['매매 12억', '']);

const page = read('check/index.html');
const iShare = page.indexOf('readShare(location.search'), iTrack = page.indexOf('assets/track.js'), iCfg = page.indexOf('assets/config.js');
check('check/: 공유 글을 통계 스크립트보다 먼저 꺼내고 주소에서 지움', iShare > 0 && iShare < iTrack && iShare < iCfg && /history\.replaceState\(null, '', r\.clean\)/.test(page), true);
check('check/: 다른 사이트로 주소를 보내지 않음(referrer 끔)', /<meta name="referrer" content="no-referrer">/.test(page), true);
check('check/: fetch 는 공개 자료 읽기(GET)만', !/method:\s*['"]POST/i.test(page) && !/sendBeacon|XMLHttpRequest/.test(page), true);
check('check/: 통계에는 금액 없이 기능 이름만', [...page.matchAll(/stat\('feature_use', (\{[^}]*\})/g)].every(m => !/price|deposit|rent|text|want|o\.p/.test(m[1])), true);
check('check/: 화면 제목', /<h1>이 매물, 적당한 가격일까요\?<\/h1>/.test(page), true);
check('check/: 투자 점수·판정 문구 없음', !/투자가치\s*(높|낮|좋)|매수\s*추천|사세요|지금이 기회/.test(page), true);

/* 사이트 안 모든 check/ 링크에 금액 칸이 없는지 */
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['.git', 'node_modules', 'apt', 'comm', 'cy', 'weekly', 'sitemaps', 'data'].includes(f.name)) continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(html|js|webmanifest)$/.test(f.name) && !/check-test\.js$/.test(f.name)) files.push(p); } })(ROOT);
const bad = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/check\/\?[^"'`<>\s]*/g)) { const q = m[0].replace(/&amp;/g, '&'); if (/[?&](p|price|amt|won|dep|deposit|rent|want|text|title|v)=/.test(q) || C.hasAmount(q.replace(/\$\{[^}]*\}/g, ''))) bad.push(path.relative(ROOT, f) + ': ' + q.slice(0, 80)); }
}
check('사이트 안 check/ 링크에 금액 칸 없음', bad, []);
check('check/ 로 가는 곳: 첫 화면·내 집 시세·지도·상가·건물·땅 체크·중개사 도구', ['index.html', 'mine/index.html', 'map/index.html', 'assets/comm-view.js', 'land/index.html', 'agent/pro/index.html'].filter(f => !/check\//.test(read(f))), []);

const man = JSON.parse(read('manifest.webmanifest'));
check('manifest: 공유 받기(share_target) GET → check/', man.share_target && [man.share_target.action, man.share_target.method, man.share_target.params], ['./check/', 'GET', { title: 'title', text: 'text', url: 'url' }]);
const sw = read('sw.js');
check('sw.js: check/ 미리 저장 + check-core 판', sw.includes("'./check/'") && sw.includes(`'./assets/check-core.js?v=${(page.match(/check-core\.js\?v=(\d+)/) || [])[1]}'`), true);
check('sw.js: 주소에 값이 붙은 check/ 는 기기 캐시에 저장 안 함', /startsWith\(BASE \+ 'check\/'\) && u\.search\) return/.test(sw), true);
const vOf = (t, f) => (t.match(new RegExp(f.replace(/[.]/g, '\\.') + '\\?v=(\\d+)')) || [])[1];
check('check-core 판이 모든 화면에서 같음', [...new Set(['check/index.html', 'index.html', 'mine/index.html', 'sw.js'].map(f => vOf(read(f), 'check-core.js')))].length, 1);

/* ④ 내가 본 매물 */
let L = C.seenAdd([], { t: 'apt', apt: '은마', band: '74㎡대', kind: 'sale', price: 310000, floor: 5, d: '11680|대치동|316|은마', sd: 's00', b: '74㎡대', diff: -0.05 });
L = C.seenAdd(L, { t: 'apt', apt: '은마', band: '74㎡대', kind: 'sale', price: 310000, floor: 5, d: '11680|대치동|316|은마', sd: 's00', b: '74㎡대', diff: -0.05 });
check('같은 매물은 한 줄', L.length, 1);
check('목록 id 에 금액 없음', /310000|31억/.test(L[0].id), false);
L = C.seenSet(L, L[0].id, { want: 300000 });
check('원하는 가격 저장', L[0].want, 300000);
L = C.seenAdd(L, { t: 'offi', apt: '<b>센트럴</b>', kind: 'jeonse', price: 20000, g: '11680' });
check('위험한 글자 정리', L[0].apt, 'b센트럴/b');
check('최신이 위', L.map(x => x.t), ['offi', 'apt']);
check('지우기', C.seenDel(L, L[0].id).length, 1);
check('깨진 저장값은 빈 목록', C.seenParse('{x'), []);
check('최대 개수', Array.from({ length: 40 }, (_, i) => i).reduce((a, i) => C.seenAdd(a, { t: 'apt', apt: 'a' + i, kind: 'sale', price: i + 1 }), []).length, C.SEEN_MAX);
check('목록 HTML: 지우기 단추·금액은 화면에만', /data-seen-del=/.test(C.seenHtml(L)) && !/href=/.test(C.seenHtml(L)), true);
check('원하는 가격 ±3% 거래 수', C.nearWant([{ amt: 97000 }, { amt: 100000 }, { amt: 104000 }], 100000), 2);
check('localStorage 읽기·쓰기 실패해도 멈추지 않음', [C.seenLoad({ getItem() { throw new Error('x'); } }), C.seenSave({ setItem() { throw new Error('x'); } }, [])], [[], false]);

const badRows = rows.filter(x => !x.ok);
for (const x of rows) console.log((x.ok ? 'ok   ' : 'FAIL ') + x.name + (x.ok ? '' : `\n     got  ${JSON.stringify(x.got)}\n     want ${JSON.stringify(x.want)}`));
console.log(`\n매물 가격 확인: ${rows.length - badRows.length}/${rows.length} 통과`);
process.exit(badRows.length ? 1 : 0);
