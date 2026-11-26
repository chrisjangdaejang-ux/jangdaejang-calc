/* 재개발·재건축 구역 지도(assets/redev-core.js) 확인: node tools/redev-test.js
   ① 거르기(사업 종류·신속통합기획·진행 단계·구·이주 주변·맞힌 기록) ② 정렬(착공 예상 이른 순, 이미 착공은 맨 뒤)
   ③ 착공까지 문장: 숫자는 자료 값 그대로, 검증 못 한 그룹은 '참고', 1기 신도시·착공 완료·날짜 모순은 예상 없음
   ④ 단계 이력: 원자료 날짜 순서 + 예상 착공은 따로 표시 ⑤ 이주 주변 전세: 원인 단정 없음 ⑥ 미래가치 링크 ⑦ 실제 엔진 결과(줄인 사본) 점검 */
'use strict';
const fs = require('fs'), path = require('path');
const R = require('../assets/redev-core.js');
let ok = 0, bad = 0;
const eq = (a, b, m) => { const s = JSON.stringify(a) === JSON.stringify(b); if (s) ok++; else { bad++; console.log('FAIL', m, '\n  got:', JSON.stringify(a), '\n  exp:', JSON.stringify(b)); } };
const has = (a, b, m) => eq(String(a).includes(b), true, m + ' — "' + b + '"');
const not = (a, b, m) => eq(String(a).includes(b), false, m + ' — 없어야 함 "' + b + '"');

const D = {
  asof: '202606', cuts: ['202406', '202412'], near_km: 1.5, new_years: 10,
  groups: { rd: '재개발(단독주택 재건축 포함)', rb: '재건축', ct: '도시정비형 재개발', al: '모든 유형' },
  speed: {
    '8|rd|': { from: 8, typ: 'rd', reg: '', n: 20, nc: 30, p20: 44, p50: 50, p80: 63, ok: 1 },
    '7|rb|': { from: 7, typ: 'rb', reg: '', n: 13, nc: 43, p20: 47, p50: 61, p80: 93, ok: 0 },
    '5|rb|': { from: 5, typ: 'rb', reg: '', n: 13, nc: 114, p20: 84, p50: null, p80: null, ok: 0 }
  },
  hold: { '8|rd': { n: 68, hit: 46, base: 40, rate: 0.676, brate: 0.588, ok: 1, exp: 20, act: 28 },
          '7|rb': { n: 55, hit: 53, base: 55, rate: 0.964, brate: 1, ok: 0, exp: 8.6, act: 0 } }
};
const Z = [
  { id: 'a', g: '11290', gn: '성북구', n: '장위4', t: 'rd', st: 8, sn: '관리처분인가', h: [[5, '201001'], [7, '201801'], [8, '202405']], sp: { k: '8|rd|', from: 8, el: 25, ok: 1, y: [2028, 2029] },
    mv: { r: [{ g: '11290', gn: '성북구', d: '장위동', km: 0.4, a: [2.7, 5, '202610'] }, { g: '11290', gn: '성북구', d: '석관동', km: 1.1, v: [-1.2, 8, '202609'] }], n0: 6 }, old: 1200, pt: [127.05, 37.61] },
  { id: 'b', g: '11680', gn: '강남구', n: '은마', t: 'rb', st: 7, sn: '사업시행인가', sh: 1, h: [[3, '201001'], [7, '202301']], sp: { k: '7|rb|', from: 7, el: 41, ok: 0, y: [2027, 2030] }, pt: [127.06, 37.5] },
  { id: 'c', g: '11140', gn: '중구', n: '세운', t: 'ct', st: 10, sn: '착공', h: [[8, '202201'], [10, '202504']] },
  { id: 'd', g: '11680', gn: '강남구', n: '개포', t: 'rb', st: 5, sn: '조합설립인가', h: [[5, '201501']], sp: { k: '5|rb|', from: 5, el: 137, ok: 0 } },
  { id: 'e', g: '', gn: '분당', n: '샛별마을', t: 'nt', st: null, sn: '특별정비구역 지정', hn: [['선도지구 선정', '202411'], ['특별정비구역 지정', '202601']] },
  { id: 'f', g: '11290', gn: '성북구', n: '모순', t: 'rd', st: 8, sn: '관리처분인가', x: 1, h: [[8, '202001']] },
  { id: 'g', g: '11290', gn: '성북구', n: '신통후보', t: 'rd', st: 1, sn: '신속통합기획 대상지 선정', sh: 1, h: [[1, '202201']] }
];

/* ① 거르기 */
eq(R.filter(Z, {}).length, 7, '거르기 없음 → 전부');
eq(R.filter(Z, { type: 'rb' }).map(z => z.id), ['b', 'd'], '재건축만');
eq(R.filter(Z, { type: 'sh' }).map(z => z.id), ['b', 'g'], '신속통합기획 표시 구역만');
eq(R.filter(Z, { stage: 'mgmt' }).map(z => z.id), ['a', 'f'], '관리처분·이주 단계');
eq(R.filter(Z, { stage: 'zone' }).map(z => z.id), ['e'], '1기 신도시 특별정비구역 지정 → 구역 지정 묶음');
eq(R.filter(Z, { gu: '11680' }).map(z => z.id), ['b', 'd'], '구 거르기');
eq(R.filter(Z, { mv: true }).map(z => z.id), ['a'], '이주 주변 전세 자료 있는 곳만');
eq(R.filter(Z, { ok: true }).map(z => z.id), ['a'], '맞힌 기록 있는 예상만');
eq(R.filter(Z, { q: '장위' }).map(z => z.id), ['a'], '이름 찾기');

/* ② 정렬 */
eq(R.sort(Z, 'soon').map(z => z.id).slice(0, 2), ['b', 'a'], '착공 예상 이른 순(2027 → 2028)');
eq(R.sort(Z, 'soon').slice(-1)[0].id, 'c', '이미 착공한 구역은 맨 뒤');
eq(R.sort(Z, 'stage')[0].id, 'c', '단계 높은 순 첫째 = 착공');

/* ③ 착공까지 */
const a = R.speed(Z[0], D);
eq(a.badge, 'ok', '검증 그룹 + 예상 연도 → 맞힌 기록 있음');
has(a.head, '관리처분인가부터 착공까지 보통 3.7년~5.3년(과거 비슷한 구역 50곳 기준, 중간값 4.2년)', '보통 범위·구역 수·중간값은 자료 값(44·63·50달, 20+30곳)');
has(a.mine, '착공은 2028~2029년 무렵', '구역 예상 연도는 자료 sp.y 그대로');
has(a.mine, '2.1년 지났어요', '지난 기간 25달 → 2.1년');
has(a.why, '68번 중 46번 맞았어요(68%)', '과거로 돌아가 맞힌 성적 그대로');
const b = R.speed(Z[1], D);
eq(b.badge, 'ref', '검증 못 한 그룹 → 참고');
has(b.why, '참고로만 보세요', '참고 이유 안내');
has(b.why, "55번 중 53번 맞아", '참고여도 실제 성적은 그대로');
const d = R.speed(Z[3], D);
has(d.head, '절반 넘게 아직 착공 전이라 보통 기간을 알 수 없어요', '중간값도 없으면 기간을 지어내지 않음');
has(d.mine, '비교할 수 있는 과거 사례가 모자라', '예상 연도 없고 보통 기간도 모르면 오래 걸린다고 단정하지 않음');
/* 2026-11-26: 은마(조합설립 뒤 2.8년, 보통 7~10.5년)에 '이미 대부분보다 오래 걸리고 있어요'라고 나오던 문제 — 보통 범위를 실제로 넘긴 구역만 그렇게 씀 */
{
  const D2 = Object.assign({}, D, { speed: Object.assign({}, D.speed, { '5|rb|x': { from: 5, typ: 'rb', reg: '', n: 13, nc: 114, p20: 84, p50: 126, p80: null, ok: 0 } }) });
  const young = R.speed({ id: 'y', t: 'rb', st: 7, h: [[5, '202309'], [7, '202607']], sp: { k: '5|rb|x', from: 5, el: 33, ok: 0 } }, D2);
  eq(/오래 걸리고 있어요/.test(young.mine), false, '보통 기간(중간값 10.5년)보다 짧게 지난 구역은 오래 걸린다고 하지 않음');
  has(young.mine, '2.8년 지났어요', '지난 기간은 그대로');
  const old = R.speed({ id: 'o', t: 'rb', st: 5, h: [[5, '201001']], sp: { k: '5|rb|x', from: 5, el: 150, ok: 0 } }, D2);
  has(old.mine, '이미 비슷한 구역 대부분보다 오래 걸리고 있어요', '보통 기간(중간값)을 넘긴 구역만 오래 걸린다고 씀');
}
eq(R.speed(Z[2], D).state, 'done', '이미 착공 → 예상 없음');
has(R.speed(Z[2], D).head, '2025년 4월', '착공 날짜는 원자료');
eq(R.speed(Z[4], D).state, 'nt', '1기 신도시 → 예상 없음(사례 없음)');
eq(R.speed(Z[5], D).state, 'chk', '날짜 모순 구역 → 예상 없음');
eq(R.speed(Z[6], D).state, 'early', '조합 전 → 기준 날짜 없음');
for (const z of Z) { const s = R.speed(z, D); for (const k of ['head', 'mine', 'why']) if (s[k]) { not(s[k], 'undefined', z.n + ' ' + k); not(s[k], 'NaN', z.n + ' ' + k); not(s[k], 'null', z.n + ' ' + k); } }

/* ④ 단계 이력 */
const tl = R.timeline(Z[0], D);
eq(tl.map(r => r.name), ['조합설립인가', '사업시행인가', '관리처분인가', '착공 예상'], '이력 순서 + 끝에 착공 예상');
eq([tl[2].at, tl[3].at, tl[3].est, tl[3].ok], ['2024년 5월', '2028~2029년', true, true], '과거는 실제 달, 예상은 연도 범위로 따로 표시');
eq(R.timeline(Z[2], D).some(r => r.est), false, '착공한 구역은 예상 없음');
eq(R.timeline(Z[5], D).some(r => r.est), false, '모순 구역은 예상 없음');
eq(R.timeline(Z[4], D).map(r => r.at), ['2024년 11월', '2026년 1월'], '1기 신도시 단계 날짜');
/* 원자료 날짜가 순서대로가 아니어도 날짜 순으로 */
eq(R.timeline({ t: 'rd', h: [[7, '202005'], [5, '202101']] }, D).map(r => r.lv), [7, 5], '날짜 순 정렬(번호 순 아님)');

/* ⑤ 이주 주변 전세 */
const m = R.mv(Z[0], D);
eq(m.rows.map(r => r.line), ['아파트 +2.7%(5곳)', '빌라 -1.2%(8곳)'], '동별 변화·집 수 자료 그대로');
has(m.head, '기존 1,200가구', '기존 가구 수');
has(m.note, '이주 때문이라고 볼 근거는 아니에요', '원인 단정하지 않음');
const m0 = R.mv({ st: 9, mv: { r: [], n0: 7 } }, D);
has(m0.none, '7개 동 모두', '자료 없는 경우 안내');
eq(R.mv(Z[1], D), null, '관리처분 전 구역은 이주 칸 없음');

/* ⑥ 미래가치 링크 */
eq(R.nbHref('/jangdaejang-calc/', { sd: 's00', g: '11110', d: '평동', j: '233', n: '경희궁자이(3단지)', b: '84㎡대' }),
  '/jangdaejang-calc/mine/?sd=s00&d=' + encodeURIComponent('11110|평동|233|경희궁자이(3단지)') + '&b=' + encodeURIComponent('84㎡대'), '내 집 시세 화면 주소 규칙(sd·d·b)');
eq(R.yrs(12), '1년', '12달 → 1년(.0 없음)'); eq(R.yrs(30), '2.5년', '30달 → 2.5년'); eq(R.ym('202405'), '2024년 5월', '달 표기');
eq(R.holdRows(D).map(r => [r.stage, r.typ, r.ok]), [['사업시행인가', '재건축', false], ['관리처분인가', '재개발(단독주택 재건축 포함)', true]], '맞혀 본 결과 표');

/* ⑦ 실제 엔진 결과(줄인 사본: tools/e2e/fallback/data/redev/zones.json) */
const FX = path.join(__dirname, 'e2e', 'fallback', 'data', 'redev', 'zones.json');
if (fs.existsSync(FX)) {
  const X = JSON.parse(fs.readFileSync(FX, 'utf8'));
  eq(['z', 'speed', 'hold', 'asof', 'src', 'obs_from', 'min_ev', 'nmin_ok'].every(k => k in X), true, '실제: 필요한 칸 모두 있음');
  const okKeys = new Set(Object.keys(X.hold).filter(k => X.hold[k].ok));
  eq(X.z.filter(z => z.sp && z.sp.ok && !okKeys.has(z.sp.from + '|' + (z.t === 'dd' ? 'rd' : z.t))).map(z => z.n), [], '실제: 맞힌 기록 표시는 과거 성적 기준을 넘은 그룹만');
  eq(Object.values(X.hold).filter(h => h.ok).every(h => h.n >= X.nmin_ok && h.hit * 2 >= h.n && h.hit > h.base), true, '실제: 기준 = 판정 수·절반 이상·모두 안 함보다 높음');
  eq(X.z.filter(z => z.sp && !X.speed[z.sp.k]).length, 0, '실제: 모든 예상에 분포 자료가 있음');
  const r3 = v => Math.round(v * 1000) / 1000 === v;
  eq(X.z.every(z => (!z.pt || z.pt.every(r3)) && (!z.poly || z.poly.every(r => r.every(p => p.every(r3))))), true, '실제: 공개 좌표는 소수 셋째 자리');
  eq(X.z.filter(z => z.mv).every(z => z.st === 8 || z.st === 9), true, '실제: 이주 주변 칸은 관리처분·이주 단계만');
  eq(X.z.every(z => (z.h || []).every(h => /^\d{6}$/.test(h[1]))), true, '실제: 이력 날짜는 원자료 YYYYMM');
  let txt = '';
  for (const z of X.z) { const s = R.speed(z, X); txt += [s.head, s.mine, s.why].join(' '); const mm = R.mv(z, X); if (mm) txt += mm.head + mm.none + mm.rows.map(r => r.line).join(''); }
  eq(/undefined|NaN|null|\[object/.test(txt), false, '실제: 문장에 코드 값 없음');
  eq(/습니다/.test(txt), false, '실제: 문장은 ~요 말투');
}

console.log(`\nredev-test: ${ok} 통과, ${bad} 실패`);
process.exit(bad ? 1 : 0);
