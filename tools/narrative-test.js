/* 미래가치 리포트 '분석 설명'(assets/narrative.js) 문장 규칙 검증 — 실행: node tools/narrative-test.js
   규칙: 한 줄 결론 → 핵심 요약(줄마다 숫자) → 펼친 문단 4단계(사실·비교·과거 사례·그래서),
   전문 용어 금지/즉시 풀이(%p 첫 등장 풀이), 0에 가까운 값은 '비슷해요', 확인 안 된 숫자는 문장 생략,
   같은 통계 반복 금지(공급 묶기), 방어적 면책 금지, 가중치·계수·임계값 비공개 */
const fs = require('fs'), path = require('path');
require('../assets/plain-words.js');
const PL = globalThis.JDJ_PLAIN;
const N = require('../assets/narrative.js');
let ok = 0, bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('실패:', m, '\n  받음:', JSON.stringify(a), '\n  기대:', JSON.stringify(b)); } };
const has = (t, s, m) => eq(String(t).includes(s), true, m + ` — '${s}' 없음: ${t}`);
const not = (t, s, m) => eq(String(t).includes(s), false, m + ` — '${s}' 있음: ${t}`);

/* 서울 25개 구 + 송파구 */
const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(`${y}${String(m).padStart(2, '0')}`); }
const IX = { months, dataTo: months[35], sgg: {}, sido: [{ id: 's00', name: '서울특별시', short: '서울', ngs: 25, r: { mom: 9.5, jr: 51.9 } }] };
for (let i = 0; i < 24; i++) IX.sgg['11' + String(100 + i)] = { sido: '서울특별시', name: i + '구', s: Array(36).fill(4000 + i * 100) };
IX.sgg['11710'] = { sido: '서울특별시', name: '송파구', s: Array(36).fill(8000).map((v, i) => v + i * 16), r: { mom: 26.8, jr: 36.5, eb: { mom: 4, jr: 0 }, up: ['인구 증가'], down: ['구 시세 최근 1년 흐름', '구 전세가율'] } };
const EV = { sido: { s00: { mom: { '0': { n: 1392, ex: 2.66, hit: 59, per: [['202410', 431, -3.12, 41], ['202310', 283, -2.42, 41], ['202210', 205, 6.75, 79], ['202110', 473, 9.69, 79]] } },
  rel: { '4': { n: 1973, ex: 2.82, hit: 60, per: [['202410', 633, 4.64, 71]] } }, jr: { '0': { n: 1406, ex: 2.26, hit: 57, per: [] } } } },
  region: { sido: { s00: { mom: { '4': { n: 30, ex: -2.1, hit: 27, per: [['202410', 5, -1.8, 20]] } } } } } };
const MH = { '1': { oos_all: [{}, {}], oos_avg: -0.5, oos_hit: 0 }, '2': { oos_all: [{}, {}, {}, {}], oos_avg: 1.1, oos_hit: 4 },
  '3': { oos_all: [{}, {}, {}, {}], oos_avg: 2.1, oos_hit: 4, q5: [[-2.0, 4, 1, 900], [-0.6, 4, 1, 900], [0.1, 4, 2, 900], [1.2, 4, 3, 900], [2.4, 4, 4, 900]] },
  '5': { oos_all: [{}, {}, {}], oos_avg: 2.5, oos_hit: 3, q5: [null, null, null, [1.6, 3, 3, 700], [3.0, 3, 3, 700]] }, '7': { oos_all: [{}], oos_avg: 5, oos_hit: 1 } };
const SP = { zones: { seoripul: { n: '서울 서리풀 공공주택지구', u: 20000, st: 1, h: [['202411', 'ann']], plan: '2031' }, topyeong2: { n: '구리토평2 공공주택지구', u: 18500, st: 1, h: [['202311', 'ann']] } },
  ring: { life: { ann: { n: 23, ex: 3.83, sig: false } } } };
const s = Array(36).fill(0).map((_, i) => i < 27 ? 9000 + i * 160 : i === 27 ? 13293 : 12845);
const fE = { fv: 28, fvg: 65, gs: 14, fh: { 1: 55, 3: 78, 5: 85, 7: 99 }, mom: -0.003, jr: 0.38, lg: 0.73, ln: '아시아선수촌아파트', hh: 5678, by: 2008,
  eb: { mom: 0, jr: 0, rel: 4, lg: 2 }, why: { '2': ['reg-', 'mom+', 'jr-'], '3': ['size+'] }, wf: { mom: [-0.003, 0.012, 9], jr: [0.38, 0.52, 21], rel: [0.5, 0, 92], size: [5678, 880, 99] },
  sl: [['seoripul', 'l', 0], ['topyeong2', 'l', 0]], sc: ['신천중학교', -0.1, 2024, 2026, 15, 29, '11710', 300] };
const C = { apt: '잠실엘스', dong: '잠실동', code: '11710', band: '84㎡대', area: 84.8, IX, EV, MH, SP, PL, year: 2026, s, regionUsed: true };
const R = N.build(fE, C);
const all = [R.head, R.gap].concat(...R.lines.map(x => [x.t].concat(x.d))).join(' ');

/* ① 한 줄 결론: 2년과 긴 기간 방향이 다르면 두 기간을 함께, 비교 기준(서울 아파트 평균) */
eq(R.head, '잠실엘스는 앞으로 2년은 서울 아파트 평균보다 덜 오를 가능성이 크고, 3년 이상 보면 평균보다 더 오를 가능성이 커요.', '결론: 기간별 방향');
eq(N.build(Object.assign({}, fE, { fv: 72, fvg: 80, fh: { 3: 78 } }), C).head, '잠실엘스는 앞으로 2년도, 3년 이상 길게 봐도 서울 아파트 평균보다 더 오를 가능성이 커요.', '결론: 같은 방향');
eq(N.build(Object.assign({}, fE, { fv: 50, fh: {} }), C).head, '잠실엘스는 앞으로 2년 서울 아파트 평균과 비슷하게 움직일 쪽이에요.', '결론: 긴 기간 검증 없음');
eq(N.build(Object.assign({}, fE, { fv: null }), C).lines.length, 0, '점수 없으면 설명 없음');

/* ② 요약 줄: 종류 순서·줄마다 숫자 */
eq(R.lines.map(x => x.k), ['r1', 'r2', 'r3', 'price', 'watch', 'fit'], '요약 줄 종류');
eq(R.lines.every(x => /\d/.test(x.t)), true, '요약 줄마다 숫자');
has(R.lines[0].t, '송파구 전체 시세가 최근 1년 26.8% 올라 서울 구 중간값(9.5%)의 약 3배', '이유 1: 지역 흐름 사실·비교');
has(R.lines[0].t, '서울 25개 구 중 22위', '이유 1: 실제 순위');
/* ③ 펼친 문단 4단계: 마지막은 '그래서' */
eq(R.lines.every(x => x.d.length === 4 && /^그래서 /.test(x.d[3])), true, '펼친 문단 4단계 + 그래서');
has(R.lines[0].d[2], '과거 서울에서 1년 상승률이 가장 높은 20%에 들었던 구는 이후 2년 서울 평균보다 평균 2.1%p 덜 올랐어요(사례 30건 중 22건이 덜 오름)', '지역 과거 사례(%p 풀이는 같은 문단 앞에서)');
has(R.lines[0].d[3], '송파구 안에서만 비교하면 잠실엘스는 상위 35%예요', '그래서: 구 안 순위');
/* 과거 사례는 방향이 같을 때만: 전세가율 낮음(jr-)인데 과거엔 더 오름(+2.26) → 사례 문장 없음 */
const jr = R.lines.find(x => x.t.includes('전세가율'));
eq(jr.d[2], '', '방향 다른 과거 사례는 생략');
has(jr.t, '전세가율(집값 대비 전셋값 비율)이 38%예요(송파구 단지 중간값 52%)', '전세가율 풀이·비교');
/* 최근 흐름 −0.3%: 비슷해요 + 과거 사례 + 쉬운 해석 */
has(R.lines[1].t, '최근 6개월 시세가 −0.3%로 그 전 6개월과 비슷해요', '0에 가까운 값은 비슷해요');
has(R.lines[1].t, '쉬어 간 단지가 이후 따라 오른 경우가 많아 2년 점수를 올렸어요', '방향 같은 사례 → 쉬운 해석');
has(R.lines[1].d[2], '단지 1,392건은 2년 뒤 같은 구 평균보다 평균 2.7%p', '과거 사례 숫자');
/* 가격 위치: 구·서울·고점·대장 */
const pr = R.lines.find(x => x.k === 'price');
has(pr.t, '평당(전용 3.3㎡당) 1억 2,845만 원으로', '가격: 평당 풀이');
has(pr.t, '최근 3년 최고였던 2026년 2월보다 3.4% 낮아요', '가격: 고점 대비');
has(pr.t, '잠실동 대장 아시아선수촌아파트보다 27% 낮아요', '가격: 대장 대비');
has(pr.d[1], '서울 25개 구 중간값은', '가격: 서울 비교');
/* 앞으로 볼 변수: 공급 2곳은 한 줄, 과거 통계 한 번 */
const w = R.lines.find(x => x.k === 'watch');
has(w.t, '같은 생활권 대규모 공급 2곳(서리풀 2만 가구, 구리토평2 1.9만 가구, 발표 단계)', '공급 묶기');
eq((all.match(/23곳/g) || []).length, 1, '공급 과거 통계 한 번만');
/* 보유 기간별: 검증 통과 기간만(1·7년 제외), 점수대별 과거 시험 */
const ft = R.lines.find(x => x.k === 'fit');
eq(ft.t, '2년 안에 팔 계획이면 불리한 쪽(2년 하위 28%)이고, 3년 이상 보유할 사람에게 맞아요(3년 상위 22%, 5년 상위 15%).', '보유 기간별 요약');
not(ft.d.join(' '), '7년', '검증 안 된 기간 제외');
has(ft.d[2], '과거 시험에서 3년 순위가 상위 21~40%였던 단지는 3년 뒤 같은 구 평균보다 평균 1.2%p(두 상승률의 차이) 더 올랐어요(시험 4번 중 3번 더 오름, 사례 900건)', '점수대별 과거 시험');
/* ④ 기간별 엇갈림 이유 */
eq(R.gap, '2년(하위 28%)과 3년(상위 22%) 순위가 다른 이유: 2년 순위에만 송파구 전체 흐름(서울 25개 구 중 22위)이 더해지고, 3년 순위는 단지 자체 조건으로만 매기기 때문이에요.', '엇갈림 이유');
eq(N.build(Object.assign({}, fE, { fh: { 3: 50 } }), C).gap, '', '차이 작으면 이유 줄 없음');
/* 문장 규칙 전체 */
eq(N.lint(R), [], '문장 규칙(금지어·숫자·%p 풀이·그래서·반복)');
for (const wd of ['요인', '참고 정보', '영향 작음', '순전입률', '백분위', '가중', '계수', '임계']) not(all, wd, '금지어');
not(all, '%p(두 상승률의 차이) 높고, 전세가율은 15.4%p(두', '%p 풀이는 문단마다 처음 한 번');
/* 확인 안 된 숫자: 근거 자료 없으면 과거 사례 문장 없음 */
const R0 = N.build(fE, Object.assign({}, C, { EV: null, MH: { '2': MH['2'], '3': Object.assign({}, MH['3'], { q5: null }) } }));
eq(R0.lines.every(x => !x.d[2] || x.k === 'watch'), true, '근거 자료 없으면 사례 문장 생략');
eq(N.lint(R0), [], '근거 없어도 규칙 통과');
/* 지역 흐름을 점수에 안 쓰면 지역 이유·엇갈림 이유 없음 */
const R1 = N.build(fE, Object.assign({}, C, { regionUsed: false }));
eq(R1.lines.some(x => x.t.includes('송파구 전체 시세가')), false, '지역 흐름 미사용 → 지역 이유 없음');
/* 학군 −0.1%: 과장 금지('비슷해요') */
const RS = N.build(Object.assign({}, fE, { why: { '2': ['sch-'], '3': [] } }), C);
const sl = RS.lines.find(x => x.t.includes('신천중학교'));
has(sl.t, '전학 온 학생과 떠난 학생이 비슷해요(한 해 평균 −0.1%)', '학군 −0.1%는 비슷해요');
eq(sl.d[2], '', '학군 비슷하면 사례 없음');
/* lint 자체 */
eq(N.lint({ head: '요인이 많아요 1', gap: '', lines: [] }).length > 0, true, 'lint: 금지어 잡음');
eq(N.lint({ head: '결론 1', gap: '', lines: [{ t: '숫자 없는 줄', d: ['a 1', '', '', '그래서 2'] }] }).some(x => x.includes('숫자 없음')), true, 'lint: 숫자 없음 잡음');

/* HTML: 첫 줄만 펼침, 전체 펼치기, 줄 종류 표시 */
const H = N.html(R, { id: 'nt' });
eq((H.match(/class="nar-det" id="nt-d\d+"( hidden)?/g) || []).map(x => x.includes('hidden')), [false, true, true, true, true, true], 'HTML: 첫 줄만 펼침');
has(H, 'data-nar-all', 'HTML: 전체 펼치기');
has(H, 'data-nar-k="price"', 'HTML: 줄 종류(집계용)');
not(N.html(R, { id: 'nt' }), 'nar-pro', '무료: 사례 표 없음');
const HP = N.html(R, { id: 'np', premium: true, c: Object.assign({}, C, { sgg: '송파구', sido: '서울' }) });
has(HP, '시기별 과거 사례', '프리미엄: 시기별 표');
has(HP, '보유 기간별 순위', '프리미엄: 기간별 상세');
has(HP, '<svg', '프리미엄: 차트');
/* 집계 허용 목록(stat.js)에 줄 종류가 모두 있음 */
const st = fs.readFileSync(path.join(__dirname, '..', 'assets', 'stat.js'), 'utf8');
eq(N.KINDS.concat(['all']).every(k => st.includes(`'${k}'`)), true, 'stat.js 줄 종류 허용');
has(st, 'nar_open:', 'stat.js 이벤트 허용');

console.log(`분석 설명 문장 규칙 검증: ${ok}개 통과, ${bad}개 실패`);
process.exit(bad ? 1 : 0);
