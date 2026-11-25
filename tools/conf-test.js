/* 단지별 '믿을 만한 정도'(assets/conf.js): node tools/conf-test.js
   - 단계·이유는 공개 자료(f.cf) 그대로, 기준값(몇 건 미만 등)·가중치는 화면에 없음
   - 과거 성적은 'N번 중 M번 맞았어요' 말투, 기간은 data_from 에서 읽음
   - '시험·검증·채점' 단어를 쓰지 않음
   - 거래 부족 이유면 '거래가 적어 덜 확실해요' */
const C = require('../assets/conf.js');
let ok = 0, bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('FAIL', m, '\n  got:', a, '\n  exp:', b); } };
const has = (a, b, m) => eq(String(a).includes(b), true, m + ' — "' + b + '" in "' + a + '"');
const not = (a, b, m) => eq(String(a).includes(b), false, m + ' — no "' + b + '" in "' + a + '"');

const MH = { '2': { data_from: '2010-01', oos_all: [{ t0: '202110', top20: 1 }, { t0: '202210', top20: .7 }, { t0: '202310', top20: 1.3 }, { t0: '202410', top20: 1.1 }], oos_hit: 4, oos_avg: 1.09,
  q5: [[-0.58, 4, 1, 17863], [-0.28, 4, 0, 17837], [-0.47, 4, 1, 17832], [0.43, 4, 4, 17837], [0.92, 4, 4, 17809]],
  reg: { '서울특별시': { name: '서울', oos_all: [{ t0: '202110' }, { t0: '202210' }, { t0: '202310' }, { t0: '202410' }], hit: 1, ok: false }, '제주특별자치도': { name: '전국', fb: 'all' } } } };
const cnt = n => { const a = new Array(36).fill(0); for (let i = 0; i < n; i++) a[35 - (i % 12)]++; return a; };

/* 1) 많이 거래된 단지(높음) */
const H = C.build({ fv: 92, fvg: 95, cf: ['h', 'good', 2006] }, { MH, sido: '경기도', cnt: cnt(40), year: 2026 });
eq([H.lv, H.lvKo], ['h', '높음'], '높음');
eq(H.reason, '거래가 꾸준하고, 이 지역·점수대의 과거 성적도 좋았어요', '높음 이유');
has(H.facts[0], '과거에 그대로 써 봤더니 4번 중 4번 맞았어요', 'VOK 말투');
has(H.facts[0], '2010년 1월부터', '기간: data_from');
has(H.facts[0], '2021~2024년', '기간: 써 본 해');
has(H.facts[1], '같은 구 평균보다 평균 0.9%p 더 올랐어요(4번 중 4번 더 오름)', '같은 구 평균과 비교(위 분위)');
has(H.facts[2], '최근 12개월 거래가 40건', '최근 12개월 거래 수');
has(H.facts[2], '2010년 이전부터 거래가 이어져 왔어요', '자료 시작보다 이른 기록');

/* 2) 거래 적은 단지 */
const L = C.build({ fv: 20, fvg: 5, cf: ['l', 'few', 2024] }, { MH, sido: '경기도', cnt: cnt(5), year: 2026 });
eq([L.lvKo, L.reason], ['낮음', '거래가 적어 덜 확실해요'], '거래 부족 문구');
has(L.facts[1], '같은 구 평균보다 평균 0.6%p 덜 올랐어요(4번 중 3번 덜 오름)', '아래 분위: 덜 오름');
has(L.facts[2], '2024년부터 거래 기록이 있어요(약 2년)', '기록 연수');
eq(C.build({ fv: 50, fvg: 50, cf: ['m', 'few_rec', 2012] }, { MH, sido: '서울특별시', cnt: cnt(3) }).reason, '거래가 적고, 이 지역의 과거 적중률도 고르지 않았어요', '거래 부족 + 지역');

/* 3) 지역 성적: 시·도 있으면 그것, 전국 대체면 전국 */
has(C.build({ fvg: 50, cf: ['m', 'rec', 2010] }, { MH, sido: '서울특별시', cnt: cnt(20) }).facts[0], '서울 단지에 이 점수를 과거에 그대로 써 봤더니 4번 중 1번 맞았어요', '시·도 성적');
has(C.build({ fvg: 50, cf: ['m', 'rec', 2010] }, { MH, sido: '제주특별자치도', cnt: cnt(20) }).facts[0], '전국 단지에', '전국 대체');
has(C.build({ fvg: 50, cf: ['m', 'rec', 2010] }, { MH, sido: '경기도', cnt: cnt(20) }).facts[1], '차이가 크지 않았어요', '가운데 분위');

/* 4) 공개 자료에 단계가 없으면 아무것도 안 보여 줌(지어내지 않음) */
eq(C.build({ fv: 70, fvg: 70 }, { MH }), null, 'cf 없음 → 표시 없음');
eq(C.build({ fv: 70, cf: ['x', 'good'] }, { MH }), null, '모르는 단계 → 표시 없음');
eq(C.html(null), '', '빈 html');

/* 5) 말투·숨길 것: 시험·검증·채점, 기준값, 가중치 */
const all = [];
for (const lv of ['h', 'm', 'l']) for (const rc of Object.keys(C.REASON)) for (const sd of ['경기도', '서울특별시', '제주특별자치도']) for (const g of [5, 30, 50, 70, 95]) {
  const o = C.build({ fv: g, fvg: g, cf: [lv, rc, 2015] }, { MH, sido: sd, cnt: cnt(g % 17) });
  all.push(C.html(o, { more: '../guide/method/#conf' }), C.line(o));
}
const T = all.join('\n');
for (const w of ['시험', '검증', '채점', '통과', '백테스트', '표본', '가중치', '임계', '기준값', '12건 미만', '건 이상', '년 미만']) not(T, w, '쓰지 않는 말');
eq(/[가-힣]{0,6}(이상|미만)이면/.test(T), false, '판정 기준 문장 없음');
eq(Object.keys(C.LV), ['h', 'm', 'l'], '세 단계');
eq(C.line(L), '믿을 만한 정도 낮음 · 거래가 적어 덜 확실해요', '한 줄 표기');
has(C.html(H, { more: '../guide/method/#conf' }), 'href="../guide/method/#conf"', '설명 링크');
not(C.html(H, { compact: true }), 'jcf-f', '짧은 표기에는 사실 목록 없음');

/* 6) 화면 파일: 기준값·내부 메모가 화면 문구에 없음 */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../assets/conf.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const strs = (src.match(/'[^'\n]*'|`[^`]*`/g) || []).filter(s => /[가-힣]/.test(s)).join('\n');
for (const w of ['시험', '검증', '채점']) not(strs, w, 'conf.js 화면 문자열');
const method = fs.readFileSync(__dirname + '/../guide/method/index.html', 'utf8');
const sec = method.slice(method.indexOf('id="conf"'), method.indexOf('<h2><span class="n">03'));
has(sec, '높음 · 보통 · 낮음', '방법 화면 설명');
has(sec, '‘높음’이 나오지 않아요', '방법 화면: 거래 적으면 높음 없음');
for (const w of ['시험', '검증', '채점', '12건', '5년']) not(sec, w, '방법 화면 문구');

console.log(`${ok} 통과, ${bad} 실패`);
process.exit(bad ? 1 : 0);
