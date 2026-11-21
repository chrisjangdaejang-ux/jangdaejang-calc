/* 지도 '지역 분석'(assets/region-core.js) 자동 검증 — 실행: node tools/region-test.js [자료 폴더(선택, 예: /tmp/dlatest/data)]
   증감률·거래량·입주 예정·정비사업 값이 자료를 그대로 나눈/더한 값인지, 자료 없는 칸을 메우지 않는지,
   과거 성적 문장이 evidence.json 숫자 그대로인지(절반 넘지 않으면 방향을 말하지 않음), '시험·통과' 같은 말이 없는지 확인한다. */
const fs = require('fs'), path = require('path');
const R = require('../assets/region-core.js');
const rows = [];
function check(name, got, want, basis) { rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want, basis }); }
const r1 = v => Math.round(v * 10) / 10;

/* 연월·시계열 */
check('연월 더하기', [R.ymAdd('202601', -1), R.ymAdd('202512', 1), R.ymAdd('202610', -120)], ['202512', '202601', '201610'], '');
const s = ['202501', 1000, 0, 1100, 1200, 1210, 1220, 1230, 1240, 1250, 1260, 1270, 1280, 1300];   // 2025.1 ~ 2026.1
check('점: 값 0(그 3개월 거래 없음)은 뺌', R.points(s).length, 12, '13칸 중 0 하나');
check('1년 증감 = 2026.1 ÷ 2025.1 − 1', r1(R.change(s, 12).pct), 30, '1300/1000');
check('1개월 증감', r1(R.change(s, 1).pct), r1((1300 / 1280 - 1) * 100), '');
check('그 달 값이 없으면 null(앞뒤로 메우지 않음): 11개월 전 = 2025.2(0)', R.change(s, 11), null, '');
check('기간이 자료보다 길면 null', R.change(s, 36), null, '');
check('전체 = 처음 값부터', r1(R.change(s, 0).pct), 30, '');
check('그래프 점: 3개월', R.slice(s, 3).map(p => p.ym), ['202510', '202511', '202512', '202601'], '');

/* 거래 */
const c36 = Array(24).fill(5).concat(Array(12).fill(10));
check('거래량: 최근 1년 120건, 그 전 60건 → +100%', R.vol(c36), { y1: 120, y0: 60, pct: 100 }, '');
check('최근 3개월 30건 → 거래 적음 아님 / 18건 → 거래 적음', [R.few(c36), R.few([6, 6, 6])], [false, true], `기준 ${R.FEW}건`);

/* 지표 값 */
const g = { s, j: ['202501', 800], sup: [100, 50, 0, 2], dev: { '재개발': 3, '재건축': 2 }, uns: [12, 30, 1] };
const x = { c: c36, r: { jr: 61.3 } };
const st = R.stat('price', g, x, { period: '1y' });
check('가격 변화(1년): +30.0%, 평당 1,300만, 빨강', [st.main, st.sub, st.tone, st.src], ['+30.0%', '평당 1,300만', 'up', 'deal'], '');
check('거래 적은 구는 회색(값은 그대로)', R.stat('price', g, { c: [1, 1, 1] }, { period: '1y' }).tone, 'few', '');
check('기간 자료 없으면 빈칸', R.stat('price', g, x, { period: '3y' }).v, null, '2023.1 자료 없음');
check('부동산원 월간 지수가 있으면 지수로', R.stat('price', Object.assign({}, g, { ix: { ms: ['202501', 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112.5] } }), x, { period: '1y' }).main, '+12.5%', '');
check('주간: 지수 없으면 자료 없음', R.stat('price', g, x, { period: '1y', freq: 'w' }).tone, 'na', '');
const wk = { ix: { ws: [Array.from({ length: 53 }, (_, i) => 'w' + i), Array.from({ length: 53 }, (_, i) => 100 + i / 10)] } };
check('주간 1년(52주) 증감', R.stat('price', Object.assign({}, g, wk), x, { period: '1y', freq: 'w' }).main, R.sgn((105.2 / 100 - 1) * 100), '');
check('거래량 값', R.stat('vol', g, x, {}).main, '+100.0%', '');
check('입주 예정: 3년 합 150세대', [R.stat('sup', g, x).main, R.stat('sup', g, x).sub], ['150세대', '1년 안 100'], '');
check('입주 예정 자료 없는 구 = 0세대(공고 없음)', R.stat('sup', {}, x).v, 0, '');
check('정비사업 개수·유형', [R.stat('dev', g, x).main, R.stat('dev', g, x).sub], ['5곳', '재개발 3·재건축 2'], '');
check('전세가율 = index.json r.jr', R.stat('jr', g, x).main, '61%', '');
check('미분양', R.stat('uns', g, x).main, '12호', '');
check('외지인 자료 없으면 빈칸', R.stat('out', g, x).tone, 'na', '');
check('보합 구간 ±0.5%', [R.tone(0.4), R.tone(-0.5), R.tone(0.5)], ['flat', 'dn', 'up'], '');
check('지표 버튼: 외지인 자료 없으면 숨김', [R.has('out', { gu: { a: g } }), R.has('dev', { gu: { a: g } }), R.has('uns', { gu: { a: {} } })], [false, true, false], '');
check('순서: 값 큰 순, 자료 없음 뒤', R.rank([{ code: 'a', st: { v: 1 } }, { code: 'b', st: { v: null } }, { code: 'c', st: { v: 5 } }]).map(r => r.code), ['c', 'a', 'b'], '');
check('동그라미 크기 단계', [R.size(10, 10), R.size(-4, 10), R.size(1, 10), R.size(null, 10)], [3, 2, 1, 1], '');
check('평당가 줄임', [R.ppy(4520), R.ppy(12782)], ['4,520만', '1.3억'], '');

/* 과거 성적 */
const EV = { horizon: 24, periods: ['202410', '202110'], region: { periods: ['202410', '201910'], sido: { s00: {
  mom: { 4: { n: 36, ex: -2.65, hit: 39 }, 1: { n: 30, ex: 2.49, hit: 60 } }, jr: { 4: { n: 10, ex: 0.1, hit: 50 } } } } },
  sido: { s00: { stg: { 0: { n: 3000, hit: 46 }, 4: { n: 44, hit: 66 }, 7: { n: 46, hit: 67 } } } } };
const pl = R.pastLine('price', EV, 's00', '서울', { price: true });
check('과거 성적: 상위 20% 구 36번 중 22번 덜 오름(61%)', pl.past, '과거 서울에서 최근 1년 많이 오른(상위 20%) 구는 이후 2년 서울 평균보다 36번 중 22번 덜 올랐어요.', 'hit 39% → 덜 오른 22번');
check('자료 기간 = 첫 시점 ~ 마지막 시점 + 2년', pl.span, '2019년 10월~2026년 10월', '');
check('점수 사용 여부 그대로', [pl.used, R.pastLine('vol', EV, 's00', '서울', { vol: false }).used, R.pastLine('vol', EV, 's00', '서울', null).used], [true, false, null], '');
check('절반이면 방향을 말하지 않음', R.pastLine('jr', EV, 's00', '서울', {}).past, '과거 서울에서 전세가율이 높은(상위 20%) 구는 이후 2년 서울 평균보다 더 오른 건 10번 중 5번으로, 한쪽으로 뚜렷하진 않았어요.', '');
check('사례 없는 지표(입주 예정·다른 시·도)는 빈 문장', [R.pastLine('sup', EV, 's00', '서울', {}).past, R.pastLine('price', EV, 's08', '경기', {}).past], ['', ''], '');
check('정비사업: 재건축 단계(0 제외) 합 90번 중 60번 더 오름', R.pastLine('dev', EV, 's00', '서울', {}).past, '과거 서울에서 재건축 사업 단계에 있던 단지는 이후 2년 같은 구 평균보다 90번 중 60번 더 올랐어요.', '29+31');
check('고른 구 지금 구간', R.guPast('price', EV, 's00', '서울', '노원구', { mom: 1 }), '노원구는 지금 서울에서 최근 1년 상승률이 하위 21~40%예요. 과거 서울에서 이 구간이던 구는 이후 2년 서울 평균보다 30번 중 18번 더 올랐어요.', '');
check('받침 조사', [R.eun('양평군'), R.eun('강남구')], ['은', '는'], '');
const all = JSON.stringify([pl, R.pastLine('dev', EV, 's00', '서울', {}), R.guPast('price', EV, 's00', '서울', '노원구', { mom: 1 })]);
check("문장에 '시험'·'통과' 없음", /시험|통과/.test(all), false, '표기 원칙');

/* 그래프 */
const yr = ['201601'].concat(Array.from({ length: 121 }, (_, i) => 1000 + i * 10));   // 2016.1 ~ 2026.1
check('증감 막대 3년 = 해마다 3개', R.bars(R.slice(yr, 36), 36).map(b => b.lab), ['24년', '25년', '26년'], '');
check('증감 막대 1년 = 월별 12개', R.bars(R.slice(yr, 12), 12).length, 12, '');
check('눈금', R.ticks(0, 100, 4), [0, 25, 50, 75, 100], '');

/* 실제 자료 (선택) */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'index.json'))) {
  const IX = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const rf = path.join(dir, 'region', 's00.json');
  if (fs.existsSync(rf)) {
    const RG = JSON.parse(fs.readFileSync(rf, 'utf8'));
    let bad = 0, n = 0;
    for (const code in RG.gu) {
      const gg = RG.gu[code], xx = IX.sgg[code] || {};
      // 지역 파일 매매 시계열의 마지막 36개월 = index.json sgg[].s (같은 정의)
      // (index.json 은 36개월 창 안에서만 3개월 이동 중간값을 내 첫 두 달이 다름 → 셋째 달부터 비교)
      const byYm = new Map(R.points(gg.s).map(q => [q.ym, q.v]));
      n++; if ((xx.s || []).some((v, i) => i >= 2 && v > 0 && byYm.get(IX.months[i]) !== v)) bad++;
    }
    check(`실제 자료: 서울 ${n}개 구 매매 시계열 = index.json 최근 값(셋째 달부터)`, bad, 0, 'price/h 와 index.json 같은 정의');
  }
}

const fail = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `\n      got ${JSON.stringify(r.got)}\n      want ${JSON.stringify(r.want)}  (${r.basis})`));
console.log(`\n${rows.length - fail.length}/${rows.length} 통과`);
process.exit(fail.length ? 1 : 0);
