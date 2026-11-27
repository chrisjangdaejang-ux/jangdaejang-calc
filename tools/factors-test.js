/* 집값 요인 성적표(assets/factors-core.js) 점검 — 실행: node tools/factors-test.js </dev/null
   ① 기간 한 줄: 두 격자 중 시기가 많은 쪽, 부호·%p·n번 중 m번·구간 ② 판정 문장 ③ 단지 카드: 해당 요인만, 지역(서울·경기·인천·지방) 줄
   ④ 점수 성적: 통과 못 하면 '참고용' — 숫자는 그대로 ⑤ 화면 문장에 가중치·기준값 없음 ⑥ 첫 화면 목록용 상승 요인 id */
'use strict';
const FX = require('../assets/factors-core.js');
let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`));
}
const F = { v: 1, asof: '202610', factors: [
  { id: 'zany', name: '재건축 구역 지정 이후 모든 단계(서울)', level: 'u', src: '서울 정비구역 단계 날짜',
    h: { '2': { v: 'up', g: { '04': { n: 10, avg: 4.33, ci: [2.28, 6.63], units: 70, pos: 10, reg: {}, by: { seoul: { n: 10, avg: 4.33 } } }, '10': { n: 9, avg: 5.64, ci: [3.7, 7.79], units: 52, pos: 9, reg: {}, by: {} } } },
         '1': { v: 'up', g: { '04': { n: 11, avg: 2.14, ci: [0.19, 4.14], units: 91, pos: 9 } } } } },
  { id: 'ro', name: '신설역 개통 2년 이내(700m)', level: 'u', src: '',
    h: { '3': { v: 'down', g: { '04': { n: 5, avg: -1.17, ci: [-1.57, -0.77], units: 93, pos: 0 } } } } },
  { id: 'momh', name: '최근 6개월 많이 오름', level: 'u', h: { '2': { v: 'none', g: { '04': { n: 12, avg: -0.65, ci: [-1.81, 0.26], units: 3830, pos: 5 } } } } },
  { id: 'gsupl', name: '구 입주 물량 적음', level: 'g', h: { '1': { v: 'up', g: { '04': { n: 13, avg: 0.7, ci: [0.17, 1.21], pos: 10 } } } } }],
  untested: [{ id: 'rate', name: '금리', why: '모든 단지에 같은 날 적용' }],
  score: { '2': { status: 'fail', grids: { '04': { n: 8, avg: 0.72, ci: [-1.3, 2.91], hit: 5 }, '10': { n: 7, avg: 0.92, ci: [-1.36, 3.32], hit: 4 } }, why: ['sig', 'regime', 'base'] },
           '3': { status: 'pass', grids: { '04': { n: 6, avg: 1.2, ci: [0.1, 2], hit: 5 } } } } };

const l = FX.line(F.factors[0], '2');
check('시기 많은 격자(4월 10번) 선택', [l.b.g, l.b.n], ['04', 10]);
check('기간 한 줄', l.text, '2년 뒤 같은 구 평균보다 +4.3%p · 시기 10번 중 10번 더 올랐어요(4월 기준, 시기마다 평균 70곳) (95% 구간 +2.3~+6.6%p)');
check('판정 문장', l.verdict, '꾸준히 더 올랐어요');
check('음수 부호', FX.line(F.factors[1], '3').text.startsWith('3년 뒤 같은 구 평균보다 −1.2%p · 시기 5번 중 0번'), true);
check('구 단위 요인은 같은 시·도 평균', FX.line(F.factors[3], '1').text.startsWith('1년 뒤 같은 시·도 평균보다 +0.7%p'), true);
check('기간 자료 없으면 null', FX.line(F.factors[1], '1'), null);
const c = FX.cardsHtml(F, ['zany', 'nope'], { rtype: 'seoul' });
check('카드: 해당 요인만(없는 id 무시)', (c.match(/class="fx-c /g) || []).length, 1);
check('카드: 지역 줄', /서울 단지만 보면: 2년 \+4\.3%p\(10번\)/.test(c), true);
check('카드: 과거 평균이라는 안내', /꼭 그렇게 된다는 뜻은 아니/.test(c), true);
check('카드: 기준 달', /2026년 10월 자료까지/.test(c), true);
check('카드 없음 → 빈 문자열', FX.cardsHtml(F, []), '');
const s2 = FX.scoreRec(F, 2), s3 = FX.scoreRec(F, 3);
check('점수 성적: 미통과 숫자 그대로 + 참고용', [s2.ok, s2.n, s2.hit, /참고용/.test(s2.text)], [false, 15, 9, true]);
check('점수 성적: 통과면 참고 문구 없음', [s3.ok, /참고용/.test(s3.text)], [true, false]);
check('점수 성적 없음 → null', FX.scoreRec(F, 5), null);
check('상승 요인 id(단지 요인만)', FX.upIds(F), ['zany']);
check('문장에 가중치·기준값 단어 없음', /가중치|비중 [0-9]|임계|threshold/.test(c + s2.text), false);
console.log(`\n${pass}/${pass + fail} 통과`);
process.exit(fail ? 1 : 0);
