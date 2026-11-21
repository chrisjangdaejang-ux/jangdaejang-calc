/* 단지 '오를 이유 · 조심할 점 · 지켜볼 것'(assets/narrative.js why3) 검증 — 실행: node tools/why3-test.js
   원칙: 항목마다 사실 → 과거 사례 성적(N건 중 M건·평균 %p·시기별 N번 중 M번) → 그래서.
   과거 사례가 없거나 반대·엇갈리면 이유에 넣지 않고(지켜볼 것은 숫자만, '그래서' 없음), 숫자를 지어내지 않는다. '시험·통과' 표현 금지. */
require('../assets/plain-words.js');
const PL = globalThis.JDJ_PLAIN;
const N = require('../assets/narrative.js');
let ok = 0, bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('실패:', m, '\n  받음:', JSON.stringify(a), '\n  기대:', JSON.stringify(b)); } };
const has = (t, s, m) => eq(String(t).includes(s), true, m + ` — '${s}' 없음: ${t}`);
const not = (t, s, m) => eq(String(t).includes(s), false, m + ` — '${s}' 있음: ${t}`);

const months = []; for (let y = 2023, m = 11; months.length < 36; m++) { if (m > 12) { m = 1; y++; } months.push(`${y}${String(m).padStart(2, '0')}`); }
const IX = { months, dataTo: '202610', sgg: {}, sido: [{ id: 's00', name: '서울특별시', short: '서울', ngs: 25, r: { mom: 9.5, jr: 51.9 } }] };
for (let i = 0; i < 24; i++) IX.sgg['11' + String(100 + i)] = { sido: '서울특별시', name: i + '구', s: Array(36).fill(4000 + i * 100) };
IX.sgg['11710'] = { sido: '서울특별시', name: '송파구', s: Array(36).fill(8000), r: { mom: 26.8, jr: 36.5, eb: { mom: 4, jr: 0 }, up: [], down: ['구 시세 최근 1년 흐름'] } };
const per = (a) => a.map((x, i) => [String(202410 - i * 100), 300, x, x > 0 ? 60 : 40]);
const EV = { sido: { s00: {
  rel: { '4': { n: 1973, ex: 2.82, hit: 60, per: per([4.64, 7.52, 0.73, -2.09]) } },          // 같은 방향 3/4 → 오를 이유
  mom: { '0': { n: 1392, ex: 2.66, hit: 59, per: per([-3.12, -2.42, 6.75, 9.69]) } },          // 시기별 2/4 → 빠짐
  rc: { '3': { n: 1419, ex: -1.94, hit: 42, per: per([-2.73, -0.2, -2.54, -2.66]) } },         // 4/4 → 조심할 점
  jr: { '0': { n: 1406, ex: 2.26, hit: 57, per: per([4.79, 4.24, -5.62]) } },                   // 2/3 → 오를 이유
  lg: { '2': { n: 1857, ex: 0.76, hit: 52, per: per([1.25, 2.06, -0.01, -0.48]) } },           // 52% → 빠짐
  rail: { build: { n: 756, ex: 0.83, hit: 52, per: per([1.93, 1.57, 1.57, -2.03]) } } } },
  region: { sido: { s00: { mom: { '4': { n: 36, ex: -2.65, hit: 39, per: per([-0.69, -1.69, -2.29, -7.45, 3.68, -7.02]) } },
    jr: { '0': { n: 24, ex: -2.67, hit: 40, per: per([-4.18, -7.61, 4.17]) } } } } } };
const SP = { zones: { seoripul: { n: '서울 서리풀 공공주택지구', u: 20000, st: 1, h: [['202411', 'ann']], plan: '2031' } }, ring: { life: { ann: { n: 23, ex: 3.83, sig: false } } } };
const POL = { policies: [
  { id: 'p1', name: '2026년 세제개편안(종부세 개편)', status: 'bill', stage: '입법예고', plan: [{ s: '국회 심사', d: '2026-12' }, { s: '시행', d: '2028-01' }], in: ['all'], not: [], price: '시가 약 20억 원 초과', ptier: [20, null], verdict: [] },
  { id: 'p2', name: '지난 정책', status: 'past', stage: '시행', plan: [{ s: '시행', d: '2027-01' }], in: ['all'], not: [] },
  { id: 'p3', name: '다른 구 정책', status: 'active', stage: '발표', plan: [{ s: '시행', d: '2027-03' }], in: ['11680'], not: [] }] };
const DEV = { projects: [{ id: 'mice', short: '잠실 국제교류복합지구', stages: [{ s: '계획 결정', d: '2026-07-28' }], plan: [{ s: '준공', d: '2032' }], cases: {} }],
  units: { '11710|잠실동|19': [['mice', 590, '0~1km', '201404', 267.3, 251.5]] } };
const s = Array(36).fill(0).map((_, i) => i < 27 ? 9000 + i * 160 : i === 27 ? 13293 : 12845);
const f = { fv: 25, fvg: 65, gs: 10, fh: { 3: 77 }, mom: -0.003, jr: 0.38, lg: 0.73, ln: '아시아선수촌아파트', dd: -0.013, rc: 0.987,
  eb: { mom: 0, rc: 3, jr: 0, rel: 4, lg: 2, rail: 'build' }, why: { '2': ['mom+', 'reg-'] }, wf: { rel: [0.5124, -0.1642, 91], mom: [-0.0027, 0.0233, 14] },
  rl: { line: 'GTX-C', st: '창동역', stage: 'start_real', opened: false, target: '203109', m: 504, dl: { orig_s: '2028', delay: 33 } },
  sl: [['seoripul', 'l', 0]] };
const C = { apt: '잠실엘스', dong: '잠실동', code: '11710', band: '84㎡대', area: 84.8, IX, EV, SP, PL, year: 2026, s, regionUsed: true, jibun: '19', pol: POL, dev: { data: DEV, u: { code: '11710', dong: '잠실동', jibun: '19' }, o: { apt: '잠실엘스' } } };
const W = N.why3(f, C);

/* ① 이유·조심할 점: 사례 다수 + 시기별 다수가 같은 방향인 것만 */
eq(W.up.map(x => x.k), ['rel', 'jr'], '오를 이유: 가격 수준·전세가율(최근 흐름은 시기별 2/4라 빠짐, 대장 대비는 52%라 빠짐)');
eq(W.dn.map(x => x.k), ['gmom', 'rc'], '조심할 점: 구 1년 흐름·고점 회복');
eq(W.dn.concat(W.up).some(x => x.k === 'gjr'), false, '단지 전세가율(더 오름)과 반대인 구 전세가율 사례는 뺌');
const rel = W.up[0];
eq(rel.o, '과거 서울에서 비슷한 단지 1,973건 중 1,184건이 2년 뒤 자기 구 평균보다 더 올랐어요(평균 +2.8%p).', '한 줄: N건 중 M건·평균 %p');
has(rel.t, '송파구 전체 시세보다 51% 비싸요', '제목: 사실(비교 기준 포함)');
has(rel.d[1], '4번 중 3번 같은 방향이었어요', '시기별: 과거에 그대로 대입해 봤더니 N번 중 M번');
has(rel.d[1], '2021년 10월~2024년 10월', '시기별: 언제부터 언제까지');
eq(/^그래서 /.test(rel.d[2]), true, '그래서 문장');
has(W.dn[0].o, '과거 서울에서 비슷한 구 36건 중 22건이 2년 뒤 서울 평균보다 덜 올랐어요(평균 −2.7%p).', '구 흐름: 비교 기준은 서울 평균');
has(W.dn[1].t, '최근 3년 최고 시세의 97%까지 회복', '고점 회복: 시세 자료로 센 사실');

/* ② 지켜볼 것: 날짜 순, 엇갈린 사례는 숫자만·'그래서' 없음 */
eq(W.watch.map(x => x.k), ['pol', 'rail', 'supply', 'dev'], '지켜볼 것: 날짜 순(정책 2026.12 → 역 2031.9 → 공급 2031 → 개발 2032)');
const rail = W.watch.find(x => x.k === 'rail');
has(rail.t, 'GTX-C 창동역 개통 — 목표 2031년 9월', '신설역: 단계·날짜');
has(rail.o, '처음 목표(2028년)보다 33개월 늦어졌어요', '신설역: 지연');
has(rail.d[1], '756건 중 393건(52%)', '신설역: 엇갈린 과거 사례도 숫자 그대로');
eq(rail.d[2], '', '신설역: 사례가 엇갈리면 그래서 없음');
has(W.watch[0].o, '2026년 12월 국회 심사, 2028년 1월 시행 예정이에요', '정책: 다음 일정');
has(W.watch[0].d[0], '지금 시세 약', '정책: 가격 조건 대상 확인');
eq(N.why3(f, Object.assign({}, C, { area: 30 })).watch.some(x => x.k === 'pol'), false, '정책: 가격 조건(20억 원) 아래면 빠짐');
has(W.watch.find(x => x.k === 'supply').d[1], '오를 이유나 조심할 점으로는 넣지 않았어요', '공급: 뚜렷하지 않은 사례는 이유에서 뺌');
has(W.watch.find(x => x.k === 'dev').t, '잠실 국제교류복합지구 준공 — 목표 2032년', '개발사업: 다음 단계');
eq(W.key, '11710|잠실동|19|잠실엘스', '관심 단지 알림 키');

/* ③ 사례가 없으면 지어내지 않음 */
const W0 = N.why3(Object.assign({}, f, { rl: null, sl: null }), Object.assign({}, C, { EV: {}, pol: null, dev: null }));
eq([W0.up.length, W0.dn.length, W0.watch.length], [0, 0, 0], '사례·일정 자료가 없으면 항목 없음');
eq(N.build(Object.assign({}, f, { rl: null, sl: null }), Object.assign({}, C, { EV: {}, pol: null, dev: null })).why3, undefined, '항목이 없으면 칸 없음');

/* ④ 문장 규칙 · 4단계 설명과 중복 없음 */
eq(N.lint3(W), [], 'why3 문장 규칙(금지어·숫자·과거 사례 없는 이유·그래서)');
const R = N.build(f, C);
eq(!!R.why3, true, '리포트에 기본 노출');
eq(R.lines.some(x => x.k === 'watch'), false, '앞으로 볼 변수 줄은 지켜볼 것으로 옮김');
eq(N.lint(R), [], '4단계 설명 문장 규칙(같은 과거 통계 반복 없음)');
const four = R.lines.map(x => x.d.join(' ')).join(' ');
not(four, '1,973건', '가격 수준 과거 사례는 why3 에만');
not(four, '사례 36건', '구 흐름 과거 사례는 why3 에만');
eq(N.build(f, Object.assign({}, C, { why3: false })).why3, undefined, 'why3:false 면 예전 설명 그대로');

/* ⑤ 화면: 무료 = 제목 + 한 줄, 프리미엄 = 사실·과거 사례·그래서 + 시기별 표 */
const free = N.html(R, { id: 't' }), pro = N.html(R, { id: 't', premium: true });
has(free, '<h3 class="w3-h">오를 이유 2 · 조심할 점 2 · 지켜볼 것</h3>', '칸 제목: 실제 개수');
not(free, 'class="w3-d"', '무료: 근거 상세 없음');
has(free, '프리미엄 리포트에서 펼쳐 볼 수 있어요', '무료: 유료 안내');
has(pro, 'class="w3-d"', '프리미엄: 근거 상세');
has(pro, '시기별 과거 사례', '프리미엄: 시기별 표');
for (const w of ['시험', '통과', '가중치', '임계']) not(free + pro, w, '금지 표현');
not(free, 'data-w3-alert', '로그인 기능이 꺼져 있으면 알림 버튼 없음');
globalThis.JDJ_AUTH = { on: () => true, user: () => null };
has(N.html(R, { id: 't' }), 'data-w3-alert="11710|잠실동|19|잠실엘스"', '로그인 기능이 켜져 있으면 [관심 단지 알림 받기]');
delete globalThis.JDJ_AUTH;
const Wn = N.why3(Object.assign({}, f, { eb: { rel: 4 } }), Object.assign({}, C, { IX: Object.assign({}, IX, { sgg: Object.assign({}, IX.sgg, { '11710': Object.assign({}, IX.sgg['11710'], { r: {} }) }) }) }));
has(N.w3html(Wn, {}), '조심할 점: 과거 사례에서 같은 방향이 확인된 항목이 없어 적지 않았어요.', '빈 쪽은 이유를 밝힘');

/* ⑥ 확장 과거 사례(역 거리·평형 구성·거래 흐름·주변 입주·연식): 같은 표시 기준, 통념과 반대 결과도 그대로, 거래 흐름은 하나만 */
const EVX = { sido: { s00: Object.assign({}, EV.sido.s00, {
  sd: { d300: { n: 1758, ex: -2.1, hit: 40, per: per([-1.5, -2.2, -3.1, 0.4]) } },              // 역 300m 안인데 덜 오름(통념과 반대)
  tv6: { '4': { n: 2006, ex: 1.2, hit: 58, per: per([0.9, 1.4, 1.1, 2.0]) } },
  tv12: { '4': { n: 1999, ex: 1.76, hit: 59, per: per([1.5, 2.2, 1.1, 2.0]) } },               // 6·12개월 둘 다 → 더 큰 쪽 하나
  hh: { h4: { n: 320, ex: 2.47, hit: 52, per: per([3, 2, -1, 4]) } },                          // 52% → 빠짐
  sv: { v2: { n: 249, ex: -0.4, hit: 49, per: per([-0.5, 0.2, -1, 0.3]) } },                    // 엇갈림 → 지켜볼 것(숫자만)
  ag: { r29: { n: 1484, ex: -3.75, hit: 40, per: per([-2.2, -4.5, 0.3, -6.4]) } } }) },
  region: EV.region, all: null };
const fx = Object.assign({}, f, { rl: null, sl: null, hh: 5678, by: 2008, sub: 5, eb: Object.assign({}, f.eb, { sd: 'd300', tv6: 4, tv12: 4, hh: 'h4', sv: 'v2', ag: 'r29' }),
  xf: { sd: ['잠실새내', 280], tv: [98, 59, 157, 120], sv: [1200, 2, '202709'] } });
const WX = N.why3(fx, Object.assign({}, C, { EV: EVX, pol: null, dev: null }));
const sdI = WX.dn.find(x => x.k === 'sd');
eq(!!sdI, true, '역 300m 안인데 과거에 덜 올랐으면 조심할 점');
has(sdI.d[0], '가장 가까운 지하철역(잠실새내역)까지 직선으로 280m예요.', '역: 사실(역 이름·거리)');
has(sdI.d[1], '과거 역까지 직선 거리가 300m 이내였던 서울 단지 1,758건을 2년 뒤와 비교해 봤더니 1,055건이 자기 구 평균보다 덜 올랐고, 평균 차이는 −2.1%p였어요.', '역: 과거 사례');
has(sdI.d[1], '흔히 생각하는 것과 반대지만 과거 사례는 이랬어요.', '역: 통념과 반대인 결과도 그대로');
eq(/^그래서 /.test(sdI.d[2]), true, '역: 그래서');
eq(WX.up.filter(x => /^tv/.test(x.k)).map(x => x.k), ['tv12'], '거래 흐름은 6·12개월 중 하나(사례가 더 뚜렷한 쪽)');
has(WX.up.find(x => x.k === 'tv12').d[0], '최근 12개월(25.10~26.9) 실거래가 단지 전체 157건으로, 그 전 12개월(24.10~25.9) 120건보다 늘었어요.', '거래 흐름: 기간·건수 사실');
eq(WX.up.concat(WX.dn).some(x => x.k === 'hh'), false, '같은 방향 52%는 이유에서 뺌');
const WX2 = N.why3(Object.assign({}, fx, { eb: Object.assign({}, fx.eb, { tv6: 0 }) }), Object.assign({}, C, { pol: null, dev: null,
  EV: { sido: { s00: Object.assign({}, EVX.sido.s00, { tv6: { '0': { n: 2000, ex: -1.6, hit: 42, per: per([-1, -2, -1.5, -2]) } } }) }, region: EV.region } }));
eq(WX2.up.concat(WX2.dn).some(x => /^tv/.test(x.k)), false, '거래 흐름 6개월·12개월이 반대 방향이면 엇갈린 것으로 보고 뺌');
has(WX.dn.find(x => x.k === 'ag').t, '2008년 준공 · 18년 차', '연식: 사실');
const svW = WX.watch.find(x => x.k === 'sv');
has(svW.t, '반경 1.5km 입주 예정 1,200세대 — 첫 입주 2027년 9월', '주변 입주: 지켜볼 것(날짜)');
has(svW.d[1], '249건 중 122건(49%)', '주변 입주: 엇갈린 사례는 숫자 그대로');
eq(svW.d[2], '', '주변 입주: 엇갈리면 그래서 없음');
eq(N.lint3(WX), [], '확장 사례 문장 규칙');
const xc = N.xCases(EVX, 'sd', 's00', '서울');
eq(xc[0].ok && !xc[0].up, true, '가이드용 사례 문장: 화면과 같은 표시 기준');
has(xc[0].text, '역까지 직선 거리가 300m 이내였던 서울 단지 1,758건 중 1,055건이 2년 뒤 자기 구 평균보다 덜 올랐어요(평균 −2.1%p, 시점 4번 중 3번 같은 방향).', '가이드용 사례 문장');
eq(N.xCases(EVX, 'hh', 's00', '서울')[0].ok, false, '가이드: 기준 미달 구간은 비슷했다고만');
eq(N.why3(Object.assign({}, fx, { xf: {} }), Object.assign({}, C, { EV: EVX, pol: null, dev: null })).dn.some(x => x.k === 'sd'), false, '사실값(xf)이 없으면 숫자를 지어내지 않고 뺌');

/* ④ 개통 전 신설역(공공 좌표 없음, 엔진 pl=1·50m 단위): '○○역(개통 예정) · 예정 위치 기준 약 ○m', 개통해서 공공 좌표가 되면(pl 없음) 보통 표시 */
const WP = N.why3(Object.assign({}, f, { rl: Object.assign({}, f.rl, { line: '서부선', st: '명지대', m: 300, pl: 1 }) }), C).watch.find(x => x.k === 'rail');
has(WP.o, '서부선 명지대역(개통 예정) · 예정 위치 기준 약 300m 거리예요', '개통 예정 역: 예정 위치 기준 약 ○m');
eq(/직선/.test(WP.o), false, '개통 예정 역: 직선 거리처럼 쓰지 않음');
const WO = N.why3(Object.assign({}, f, { rl: Object.assign({}, f.rl, { line: '서부선', st: '명지대', m: 312 }) }), C).watch.find(x => x.k === 'rail');
eq([/개통 예정|예정 위치/.test(WO.o), /명지대까지 직선 312m/.test(WO.o)], [false, true], '공공 좌표로 바뀐 역(pl 없음): 개통 예정 표시가 자동으로 빠짐');
console.log(`오를 이유·조심할 점·지켜볼 것 검증: ${ok}개 통과, ${bad}개 실패`);
if (bad) process.exitCode = 1;
