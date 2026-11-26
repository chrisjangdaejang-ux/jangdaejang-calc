/* 첫 화면 '하루 세 번 바뀌는 카드' 자동 확인 — 실행: node tools/today-test.js </dev/null
   assets/today-core.js: 한국 시각 시간대 나누기(아침 05~12시 브리핑 · 낮 12~18시 오늘 새로 신고된 거래 · 저녁 18~05시 신고가·큰 하락 TOP),
   그 시간대 자료가 비면 다른 카드로 대신하는 규칙, 'HH:MM 기준' 글, 오늘의 문제 거래 빼기. 첫 화면 순서(소개 글·광고·지도 버튼 다음에 카드)도 본다. */
const fs = require('fs'), path = require('path');
const TD = require('../assets/today-core.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }
const at = (hhmm, d) => new Date(`${d || '2026-11-21'}T${hhmm}:00+09:00`);   // 한국 시각

/* ---------- 시간대 ---------- */
check('시간대 경계(한국 시각)', ['04:59', '05:00', '11:59', '12:00', '17:59', '18:00', '23:59', '00:30'].map(t => TD.slot(at(t))),
  ['pm', 'am', 'am', 'day', 'day', 'pm', 'pm', 'pm'], '아침 05~12 · 낮 12~18 · 저녁 18~05');
check('UTC 시각과 무관(한국 09:00 = UTC 00:00)', TD.slot(new Date('2026-11-21T00:00:00Z')), 'am', '');
check('한국 날짜', TD.kst(new Date('2026-11-20T15:30:00Z')), { date: '2026-11-21', h: 0, mi: 30 }, 'UTC 15:30 = 한국 다음 날 00:30');

/* ---------- 기준 시각 글 ---------- */
check('오늘이면 시각만', TD.asOf('2026-11-21T14:02+09:00', '2026-11-21'), '14:02 기준', '');
check('다른 날이면 날짜까지', TD.asOf('2026-11-20T21:40+09:00', '2026-11-21'), '11월 20일 21:40 기준', '');
check('시각이 없으면 날짜만', TD.asOf('2026-11-21', '2026-11-21'), '11월 21일 기준', '');
check('값이 없으면 빈 글', TD.asOf('', '2026-11-21'), '', '');

/* ---------- 카드 고르기 ---------- */
const M = { date: '2026-11-21', at: '2026-11-21T05:12+09:00', kr: { n: 10 } };
const x = (o) => Object.assign({ g: '11710', d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', p: 300000, dt: 20261103, s: '14:02' }, o);
const T = { date: '2026-11-21', at: '2026-11-21T14:02+09:00', by: { all: { n: 3, nhi: 1, ndrop: 1, new: [x({}), x({ a: '리센츠' })], hi: [x({ up: 5.3 })], drop: [x({ a: '트리지움', dr: -12.0 })] },
  s00: { n: 1, nhi: 0, ndrop: 0, new: [x({ a: '리센츠' })], hi: [], drop: [] } } };
check('아침 → 브리핑', TD.pick(M, T, at('08:00')), { want: 'am', show: 'am', why: '', today: '2026-11-21' }, '');
check('낮 → 오늘 새로 신고된 거래', TD.pick(M, T, at('13:00')).show, 'day', '');
check('저녁 → 신고가·큰 하락 TOP', TD.pick(M, T, at('19:00')).show, 'pm', '');
const T0 = { date: '2026-11-21', at: '2026-11-21T06:10+09:00', by: { all: { n: 0, nhi: 0, ndrop: 0, new: [], hi: [], drop: [] } } };
check('낮인데 오늘 새 거래가 아직 없으면 브리핑으로 대신(까닭 표시)', TD.pick(M, T0, at('13:00')), { want: 'day', show: 'am', why: 'empty', today: '2026-11-21' }, '');
const Tn = { date: '2026-11-21', at: '2026-11-21T11:40+09:00', by: { all: { n: 2, nhi: 0, ndrop: 0, new: [x({})], hi: [], drop: [] } } };
check('저녁인데 신고가·큰 하락이 없으면 오늘 새 거래로', TD.pick(M, Tn, at('19:00')).show, 'day', '');
const Ty = Object.assign({}, T, { date: '2026-11-20', at: '2026-11-20T23:50+09:00' });
check('어제 자료는 낮에는 쓰지 않음', TD.pick(M, Ty, at('13:00')).show, 'am', '');
check('새벽(0~5시)에는 어제 저녁 자료로 저녁 카드', TD.pick({ date: '2026-11-21' }, Ty, at('01:00', '2026-11-21')).show, 'pm', '');
check('아무 자료도 없으면 none', TD.pick(null, null, at('13:00')).why, 'none', '');
check('아침에는 어제 브리핑이라도 보여 줌(날짜 표시)', TD.pick({ date: '2026-11-20' }, null, at('05:05')).show, 'am', '');

/* ---------- 지역·문제 거래 ---------- */
check('지역 카드: 그 시·도 자료', TD.scope(T, 's00').new.map(r => r.a), ['리센츠'], '');
check('지역 자료가 없으면 전국', TD.scope(T, 's05').where, 'all', '');
const Q = { q: { g: '11710', d: '잠실동', a: '트리지움', b: '84㎡대', dt: 20261103, p: 300000 } };
check('오늘의 문제 거래는 TOP·새 거래 목록에서 뺌', TD.scope(T, '', Q).drop.length, 0, '같은 단지·평형·계약일·금액');
check('문제와 다른 거래는 그대로', TD.scope(T, '', Q).new.length, 2, '');
check('꼬리표: 신고가·하락·직거래·특수 거래 의심', [TD.tags({ up: 3 }), TD.tags({ dr: -12.4, x: 1, sus: 1 }).map(t => t.t)],
  [[{ c: 'hi', t: '신고가' }], ['최근 2년 최고가보다 12% 낮음', '직거래', '특수 거래 의심']], '모닝 브리핑과 같은 말');
check('짧은 금액', [TD.eok(300000), TD.eok(93000), TD.eok(9850)], ['30억', '9.3억', '9,850만'], '');

/* ---------- 첫 화면 ---------- */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const iQ = html.indexOf('<section class="qh"'), iAd = html.indexOf('data-ad-slot="home_top"'), iMy = html.indexOf('class="myh"'), iT3 = html.indexOf('id="t3"'), iHero = html.indexOf('class="hero"');
/* 첫 화면 개편(대표 승인 시안 2026-11-26): 질문 칸 → 광고 배너 → 내 집·할 일 → 오늘 카드 → (아래) 이렇게 계산해요(소개 글) */
check('첫 휴대폰 화면 순서: 무엇이 고민이세요 → 광고 배너 → 내 집·할 일 → 오늘 카드 → 소개 글', iQ < iAd && iAd < iMy && iMy < iT3 && iT3 < iHero, true, '');
check('오늘 카드·관심 한 줄·문제 카드는 처음에 숨김(자료가 있을 때만 보임)', [/id="t3" hidden/.test(html), /id="wRow"[^>]*hidden/.test(html), /id="qzCard"[^>]*hidden/.test(html)], [true, true, true], '');
check('카드마다 기준 시각', /t3At/.test(html) && /TD\.asOf\(/.test(html), true, '');
check('금지어 없음', ['시험', '검증', '채점'].filter(w => html.slice(html.indexOf('id="t3"')).includes(w)), [], '');

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
