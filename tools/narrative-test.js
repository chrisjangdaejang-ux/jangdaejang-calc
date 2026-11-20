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
const MH = { '1': { oos_all: [{ t0: '202410', top20: -0.1, bottom20: 0.7 }, { t0: '202510', top20: -0.3, bottom20: 0.1 }], oos_avg: -0.5, oos_hit: 0 }, '2': { oos_all: [{}, {}, {}, {}], oos_avg: 1.1, oos_hit: 4 },
  '3': { oos_all: [{ t0: '202310', top20: -0.4, bottom20: 0.5 }, { t0: '202110', top20: 4.7, bottom20: -6.1 }, { t0: '202210', top20: 0.7, bottom20: 0.5 }], oos_avg: 1.7, oos_hit: 2, q5: [[-2.0, 4, 1, 900], [-0.6, 4, 1, 900], [0.1, 4, 2, 900], [1.2, 4, 3, 900], [2.4, 4, 4, 900]] },
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
/* 대표 확정(11/20): 시·도 기준 + 구 기준, 이유 구절은 구 흐름이 순위를 실제로 움직였을 때만 */
eq(R.head, '잠실엘스는 앞으로 2년 서울 아파트 평균보다 덜 오를 가능성이 커요. 송파구 전체가 최근 1년 26.8% 올라(서울 구 중간값 9.5%) 쉬어 갈 차례이기 때문이고, 송파구 안에서만 보면 상위 35%예요. 3년 이상 길게 보면 평균보다 더 오를 가능성이 커요.', '결론: 시·도 + 구 기준 + 이유 구절');
eq(N.build(Object.assign({}, fE, { fv: 72, fvg: 80, fh: { 3: 78 } }), C).head, '잠실엘스는 앞으로 2년 서울 아파트 평균보다 더 오를 가능성이 커요. 송파구 안에서도 상위 20%예요. 3년 이상 길게 보면 평균보다 더 오를 가능성이 커요.', '결론: 같은 방향이면 구 안에서도, 이유 구절 없음');
eq(N.build(Object.assign({}, fE, { fv: 50, fh: {} }), C).head, '잠실엘스는 앞으로 2년 서울 아파트 평균과 비슷하게 움직일 쪽이에요. 송파구 안에서만 보면 상위 35%예요.', '결론: 비슷하면 이유 구절 없음');
eq(N.build(Object.assign({}, fE, { fv: 25, fvg: 30 }), C).head.split('. ')[1], '송파구 안에서도 하위 30%예요', '결론: 구 흐름 차이 작으면(단지 자체) 이유 구절 없음');
eq(N.build(fE, Object.assign({}, C, { regionUsed: false })).head.includes('때문이고'), false, '결론: 지역 흐름 미사용이면 이유 구절 없음');
{ /* 전세가율이 구 점수를 내린 주된 항목이면 전세가율 사실로 */
  const IXj = JSON.parse(JSON.stringify(IX)); IXj.sgg['11710'].r.down = ['구 전세가율'];
  has(N.build(fE, Object.assign({}, C, { IX: IXj })).head, '송파구 전체 전세가율이 36.5%로 서울 구 중간값(51.9%)보다 낮아 실거주 수요가 받쳐 주는 힘이 약하기 때문이고', '결론: 전세가율 이유'); }
/* 전국: 시·군·구 단위(경기), 구 흐름이 올린 경우 */
{
  const IXg = { months, dataTo: months[35], sgg: {}, sido: [{ id: 's08', name: '경기도', short: '경기', ngs: 30, r: { mom: 5.0, jr: 60.0 } }] };
  for (let i = 0; i < 29; i++) IXg.sgg['41' + String(100 + i)] = { sido: '경기도', name: i % 2 ? `가${i}시` : `나${i}군`, s: Array(36).fill(2000 + i * 10) };
  IXg.sgg['41135'] = { sido: '경기도', name: '성남시 분당구', s: Array(36).fill(5000), r: { mom: 1.2, jr: 55, up: ['구 시세 최근 1년 흐름'], down: [] } };
  const fg = { fv: 80, fvg: 55, gs: 95, fh: { 3: 60 }, mom: 0.02, eb: {}, why: { '2': ['reg+'] } };
  const Rg = N.build(fg, { apt: '시범우성', dong: '서현동', code: '41135', band: '84㎡대', area: 84, IX: IXg, EV: {}, MH, SP: {}, PL, year: 2026, s: Array(36).fill(5100), regionUsed: true });
  eq(Rg.head, '시범우성은 앞으로 2년 경기 아파트 평균보다 더 오를 가능성이 커요. 성남시 분당구 전체가 최근 1년 1.2%로 덜 올라(경기 시·군·구 중간값 5%) 따라 오를 여지가 있기 때문이고, 성남시 분당구 안에서도 상위 45%예요. 3년 이상 길게 보면 평균보다 더 오를 쪽이에요.', '전국: 경기 시·군·구');
  eq(N.lint(Rg), [], '전국: 경기 문장 규칙');
  not(Rg.lines.map(x => x.t + x.d.join(' ')).join(' '), '개 구', '전국: 시·군·구 단위');
}
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
has(jr.t, '전세가율이 38%예요(송파구 단지 중간값 52%)', '전세가율 풀이·비교');
/* 최근 흐름 −0.3%: 비슷해요 + 과거 사례 + 쉬운 해석 */
has(R.lines[1].t, '최근 6개월 시세가 −0.3%로 그 전 6개월과 비슷해요', '0에 가까운 값은 비슷해요');
has(R.lines[1].t, '쉬어 간 단지가 이후 따라 오른 경우가 많아 2년 점수를 올렸어요', '방향 같은 사례 → 쉬운 해석');
has(R.lines[1].d[2], '단지 1,392건은 2년 뒤 같은 구 평균보다 평균 2.7%p', '과거 사례 숫자');
/* 가격 위치: 구·서울·고점·대장 */
const pr = R.lines.find(x => x.k === 'price');
has(pr.t, '평당 1억 2,845만 원으로', '가격: 평당 풀이');
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
has(ft.d[2], '과거 시험에서 3년 순위가 상위 21~40%였던 단지는 3년 뒤 같은 구 평균보다 평균 1.2%p 더 올랐어요(시험 4번 중 3번 더 오름, 사례 900건)', '점수대별 과거 시험');
/* ④ 기간별 엇갈림 이유 */
eq(R.gap, '2년(하위 28%)과 3년(상위 22%) 순위가 다른 이유: 2년 순위에만 송파구 전체 흐름(서울 25개 구 중 22위)이 더해지고, 3년 순위는 단지 자체 조건으로만 매기기 때문이에요.', '엇갈림 이유');
eq(N.build(Object.assign({}, fE, { fh: { 3: 50 } }), C).gap, '', '차이 작으면 이유 줄 없음');
/* 문장 규칙 전체 */
eq(N.lint(R), [], '문장 규칙(금지어·숫자·%p 풀이·그래서·반복)');
for (const wd of ['요인', '참고 정보', '영향 작음', '순전입률', '백분위', '가중', '계수', '임계']) not(all, wd, '금지어');
not(all, '%p 높고, 전세가율은 15.4%p(두', '%p 풀이는 문단마다 처음 한 번');
/* 용어는 괄호 풀이 대신 화면에서 점선+설명 상자(plain-words tipDom) */
not(all, '(두 상승률의 차이)', '문장 안 괄호 풀이 없음');
eq(typeof PL.tipDom, 'function', '용어 설명 상자 함수');
eq(['%p', '전세가율', '평당', '중간값', '상위', '하위', '과거 시험'].every(k => PL.TIP[k] && /\d|[가-힣]/.test(PL.TIP[k])), true, '용어 설명 글');
/* 결론에는 과거 시험 통과 기간만, 못 한 기간은 '참고'로 흐리게 */
eq(R.dim, ['1년 상위 45%', '7년 상위 1%'], '참고 기간(1·7년) 목록');
eq(/1년 (상위|하위|이상)|7년/.test(R.head), false, '참고 기간은 결론에 없음');
eq(R.trust.map(t => [t.h, t.n, t.hit, t.ok]), [[1, 2, 0, false], [2, 4, 4, true], [3, 3, 2, true], [5, 3, 3, true], [7, 1, 1, false]], '신뢰 카드: 기간별 성적');
{ const MHx = Object.assign({}, MH, { '2': { oos_all: [{}, {}], oos_avg: -0.2, oos_hit: 0 } });
  const Rx = N.build(fE, Object.assign({}, C, { MH: MHx }));
  eq(Rx.head, '잠실엘스는 3년 이상 길게 보면 서울 아파트 평균보다 더 오를 가능성이 커요.', '2년이 시험 통과 못 하면 결론은 긴 기간만');
  eq(Rx.dim.includes('2년 하위 28%'), true, '2년은 참고로');
  eq(N.lint(Rx), [], '2년 미통과도 규칙 통과'); }
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
has(H, '이 점수는 이렇게 검증했어요', 'HTML: 검증 카드 제목');
has(H, '2021년 10월까지의 자료만으로 3년 점수를 매긴 뒤, 실제 3년 뒤(2024년 10월) 시세와 맞춰 봤어요. 같은 방법으로 2022·2023년에도 해 봤어요. 결과: 3번 중 2번, 점수가 높았던 단지들이 실제로 같은 구 평균보다 더 많이 올랐어요. 그래서 이 점수를 결론에 썼어요.', 'HTML: 실제 시점·횟수 문장');
has(H, '<td>2023.10</td><td class="num">−0.4%</td><td class="num">+0.5%</td><td>틀림</td>', 'HTML: 시점별 표(틀림 그대로)');
has(H, '맞은 횟수가 적어서 결론에는 넣지 않고 참고로만 보여 드려요.', 'HTML: 참고 기간 문장');
not(H, '표본', '용어: 표본 안 씀');
has(H, 'class="nar-dim">참고(과거 시험에서 잘 맞지 않았어요): 1년 상위 45%, 7년 상위 1%', 'HTML: 참고 기간 흐리게');
has(H, 'href="/jangdaejang-calc/guide/terms/">용어 모아 보기', 'HTML: 용어 모아 보기');
eq(fs.existsSync(path.join(__dirname, '..', 'guide', 'terms', 'index.html')), true, '용어 모아 보기 페이지');
has(H, 'data-nar-k="price"', 'HTML: 줄 종류(집계용)');
not(N.html(R, { id: 'nt' }), 'nar-pro', '무료: 사례 표 없음');
const HP = N.html(R, { id: 'np', premium: true, c: Object.assign({}, C, { sgg: '송파구', sido: '서울' }) });
has(HP, '시기별 과거 사례', '프리미엄: 시기별 표');
has(HP, '보유 기간별 순위', '프리미엄: 기간별 상세');
has(HP, '<svg', '프리미엄: 차트');
/* 집계 허용 목록(stat.js)에 줄 종류가 모두 있음 */
const st = fs.readFileSync(path.join(__dirname, '..', 'assets', 'stat.js'), 'utf8');
eq(N.KINDS.concat(['all', 'trust', 'term']).every(k => st.includes(`'${k}'`)), true, 'stat.js 줄 종류 허용');
has(st, 'nar_open:', 'stat.js 이벤트 허용');

/* 지역별 검증 성적(model_h reg): 이 단지 시·도 성적으로 카드·결론, 없거나 전국 대체면 전국 */
{
  const reg = (oa, hit, ok, extra) => Object.assign({ name: '서울', oos_all: oa, hit, ok }, extra || {});
  const MHr = JSON.parse(JSON.stringify(MH));
  MHr['2'].reg = { '서울특별시': reg([{ t0: '202310', top20: -0.5, bottom20: 0.4 }, { t0: '202410', top20: -0.2, bottom20: 0.3 }], 0, false) };
  MHr['3'].reg = { '서울특별시': reg([{ t0: '202110', top20: 2.1, bottom20: -1.0 }, { t0: '202210', top20: 0.9, bottom20: -0.2 }], 2, true) };
  MHr['5'].reg = { '서울특별시': { name: '전국', fb: 'all' } };
  const Rr = N.build(fE, Object.assign({}, C, { MH: MHr }));
  eq(Rr.trust.map(t => [t.h, t.n, t.hit, t.ok, t.where]), [[1, 2, 0, false, '전국'], [2, 2, 0, false, '서울'], [3, 2, 2, true, '서울'], [5, 3, 3, true, '전국'], [7, 1, 1, false, '전국']], '지역 성적: 기간별(서울 있으면 서울, 대체·없음은 전국)');
  eq(Rr.head.startsWith('잠실엘스는 3년 이상 길게 보면'), true, '지역 성적: 서울에서 2년 불통과면 결론에서 2년 뺌');
  const Hr = N.html(Rr, { id: 't' });
  has(Hr, '1년·7년은 전국 단지로, 2년·3년은 서울 단지로, 5년은 서울 단지만으로는 시험할 단지가 적어 전국 단지로 시험한 결과예요.', '지역 성적: 카드 끝 문장(기간별)');
  has(Hr, '<td>2023.10</td><td class="num">−0.5%</td><td class="num">+0.4%</td><td>틀림</td>', '지역 성적: 서울 시점 표');
  const MHs = JSON.parse(JSON.stringify(MH));
  for (const h of ['1', '2', '3', '5', '7']) MHs[h].reg = { '서울특별시': reg(MHs[h].oos_all.map((o, i) => ({ t0: o.t0 || `20${21 + i}10`, top20: 1, bottom20: -1 })), MHs[h].oos_all.length, MHs[h].oos_all.length >= 2) };
  const Hs = N.html(N.build(fE, Object.assign({}, C, { MH: MHs })), { id: 't' });
  has(Hs, '서울 단지로 시험한 결과예요.', '지역 성적: 모두 서울이면 한 문장');
  not(Hs, '전국 단지로', '지역 성적: 모두 서울이면 전국 문구 없음');
  has(N.html(R, { id: 't' }), '전국 단지로 시험한 결과예요.', '지역 성적 없음(예전 자료): 전국');
  const MHd = JSON.parse(JSON.stringify(MH)); MHd['2'].reg = { '경기도': reg([{ t0: '202310', top20: 1, bottom20: -1 }, { t0: '202410', top20: 1, bottom20: -1 }], 2, true, { name: '도 지역', fb: 'do' }) };
  eq(N.build(fE, Object.assign({}, C, { MH: MHd })).trust.find(t => t.h === 2).where, '전국', '지역 성적: 다른 시·도 성적은 안 씀');
}

/* 실제 자료(옆에 jangdaejang-data 가 있으면): 전국 모든 단지·평형에 문장 규칙 적용 */
{
  const D = path.join(__dirname, '..', '..', 'jangdaejang-data', 'data');
  if (fs.existsSync(path.join(D, 'index.json'))) {
    const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(D, f))); } catch (e) { return null; } };
    const IXr = rd('index.json'), EVr = rd('evidence.json'), MHr = rd('model_h.json'), SPr = rd('supply.json'), Mr = rd('model.json') || {};
    let n = 0, probs = [];
    for (const sd of IXr.sido) {
      const S = rd(sd.id + '.json'); if (!S) continue;
      for (const u of S.units) {
        const f = u.find(y => y && typeof y === 'object' && !Array.isArray(y)); if (!f || f.fv == null) continue;
        const Rr = N.build(f, { apt: u[2], dong: u[1], code: u[0], band: u[3], area: u[4], IX: IXr, EV: EVr, MH: MHr, SP: SPr, PL, year: 2026, s: u[6], regionUsed: !!(Mr.region && Mr.region.used) });
        n++; const L = N.lint(Rr); if (L.length) probs.push(`${sd.short} ${u[2]} ${u[3]}: ${L[0]}`);
        if (/undefined|NaN|null/.test(Rr.head + Rr.lines.map(x => x.t + x.d.join('')).join(''))) probs.push(`${sd.short} ${u[2]}: undefined/NaN`);
      }
    }
    if (probs.length) console.log(probs.slice(0, 10).join('\n'));
    eq([n > 1000, probs.length], [true, 0], `실제 자료 전국 ${n}개 단지·평형 문장 규칙`);
  } else console.log('(실제 자료 저장소가 옆에 없어 전국 단지 검사는 건너뜀)');
}

console.log(`분석 설명 문장 규칙 검증: ${ok}개 통과, ${bad}개 실패`);
process.exit(bad ? 1 : 0);
