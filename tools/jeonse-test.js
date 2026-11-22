/* '전월세 시세 & 전망' 로직 자동 검증 — 실행: node tools/jeonse-test.js [자료 폴더(선택, 예: /tmp/dchk/data)]
   assets/rent-core.js 의 시계열 해독·변동률·전환율·전세 vs 월세 비교·HUG 기준 산수, 화면 문구 규칙, (자료 폴더를 주면) 공개 자료 모양. 금액 단위: 만원. */
const fs = require('fs'), path = require('path');
global.JDJ_MINE = require('../assets/mine-core.js');
const R = require('../assets/rent-core.js');
const rows = [];
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1e-9 : t);
function check(name, got, want, tol) {
  const ok = (typeof want === 'number' && typeof got === 'number') ? near(got, want, tol) : JSON.stringify(got) === JSON.stringify(want);
  rows.push({ ok, name, got, want });
}

/* ---------- 시계열 ---------- */
check('[시작 칸, 값…] 해독', R.arr([2, 5, 0, 7], 6), [0, 0, 5, 0, 7, 0]);
check('빈 값', R.arr(null, 3), [0, 0, 0]);
check('달 목록', R.monthsFrom('202511', '202602'), ['202511', '202512', '202601', '202602']);
const meta = { m0: '202310', to: '202610' };                 // 37개월
const J = []; for (let i = 0; i < 37; i++) J.push(i === 36 ? 0 : 100000 + i * 500);   // 마지막 달 계약 없음
const u = ['가락동', '헬리오시티', '84㎡대', '913', 84.9, 30, 20, [0].concat(J), [36, 30000], [36, 250], [[20261031, 84.97, 16, 140000, 0, 0], [20261020, 84.9, 3, 20000, 440, 1, '24.10~26.10', 18000, 400]],
  { cv: { r: 0.05, n: 10, j: 117000 }, jr: { r: 0.43, at: '202610', s: 290000, j: 125000, b: 'a' }, jrs: [36, 430], by: 2018 }];
const sm = R.summary(u, meta);
check('최근 전세: 마지막 달 없으면 앞 달', [sm.j.v, sm.j.at, sm.j.stale], [117500, '202609', true]);
check('전세 1년 변동(12개월 전 같은 달)', sm.ch1.pct, (117500 - 111500) / 111500);
check('전세 3년 변동: 36개월 전 달이 창 밖이면 null(값을 만들지 않음)', sm.ch3, null);
check('월세 시세', [sm.wd.v, sm.wr.v], [30000, 250]);
check('전세가율 시계열(‰ → 0~1)', R.series(u, meta).jr[36], 0.43);
const dl = R.deals(u);
check('계약 목록: 전세/월세·신규/갱신·종전 보증금', [dl[0].jeonse, dl[0].ct, dl[1].ct, dl[1].pre, dl[1].preRent, dl[1].term, dl[1].date], [true, '신규', '갱신', 18000, 400, '24.10~26.10', '2026.10.20']);

/* ---------- 공식 ---------- */
check('전환율 = (월세×12)/(전세−월세 보증금)', R.convRate(50000, 10000, 150), 150 * 12 / 40000);
check('전환율: 보증금이 전세 이상이면 없음', R.convRate(10000, 10000, 100), null);
let c = R.compare({ jeon: 50000, wDep: 10000, wRent: 150, rate: 4 });
check('비교: 전세 매달 이자 = 4억 × 4% ÷ 12', c.jCost, 40000 * 0.04 / 12);
check('비교: 월세 150 − 이자 133.3 → 전세가 덜 듦', [c.cheaper, Math.round(c.diff)], ['j', 17]);
check('비교: 손익분기 금리 = 전환율', c.be, 4.5);
c = R.compare({ jeon: 50000, wDep: 10000, wRent: 150, rate: 5 });
check('비교: 금리 5%면 월세가 덜 듦', c.cheaper, 'w');
check('비교: 금리 비워 두면 손익분기만', R.compare({ jeon: 50000, wDep: 10000, wRent: 150, rate: null }), { gap: 40000, be: 4.5, rate: null });
check('비교: 전세 ≤ 월세 보증금이면 계산 안 함', R.compare({ jeon: 1000, wDep: 2000, wRent: 50, rate: 3 }), null);
check('위험 표시: 90% 이상(HUG 가입 기준)', R.risk(0.9), { pct: 90, over: true, level: 'hi' });
check('위험 표시: 89.9%', R.risk(0.899).over, false);
check('위험 표시: 값 없음', R.risk(0), null);
check('HUG: 공시가격 2억 × 140% × 90% − 선순위 0', R.hugCap(20000, 0), { price: 28000, cap: 25200, seniorOver: false });
check('HUG: 선순위채권 > 주택가격 60%', R.hugCap(20000, 17000).seniorOver, true);
check('HUG 기준 출처는 HUG 상품개요', R.HUG.url, 'https://www.khug.or.kr/hug/web/ig/dr/igdr000001.jsp');
const G = R.groupBld([['문정동', '해피빌', '40㎡ 이하', '88-18', 30, 3, 1], ['문정동', '해피빌', '49㎡대', '88-18', 50, 2, 0], ['문정동', '', '40㎡ 이하', '1-2', 30, 1, 0]]);
check('빌라 건물 묶음(평형 묶기)', [G.size, G.get('문정동|88-18|해피빌').bands.length, G.get('문정동|88-18|해피빌').n], [2, 2, 6]);
check('이름 없는 건물 표시', R.bldName(G.get('문정동|1-2|')), '문정동 1-2 건물');
check('건물 이름 검색', R.searchBld(G, '해피').map(d => d.name), ['해피빌']);
check('구 전세 추이', R.guSeries({ js: [1, 10, 20], m60: '202601' }), { months: ['202601', '202602', '202603'], s: [0, 10, 20] });

/* ---------- 화면 문구 ---------- */
const html = fs.readFileSync(path.join(__dirname, '..', 'jeonse', 'index.html'), 'utf8');
const home = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
check('전망 자리 문구는 한 번만', html.split('전세 전망은 과거 자료와 맞춰 보는 중이에요').length - 1, 1);
check('종류 탭 4개(아파트·빌라·오피스텔·단독·다가구)', R.KINDS.map(k => k.label), ['아파트', '빌라', '오피스텔', '단독·다가구']);
check('공식 출처 링크(HUG·정책브리핑)', ['khug.or.kr/hug/web/ig/dr/igdr000001.jsp', 'korea.kr/news/policyNewsView.do?newsId=148905628'].every(s => html.includes(s)), true);
check('확인 안 된 기준 안 씀(80%·126% 등)', /80%|126%|70%/.test(html.replace(/<style[\s\S]*?<\/style>/, '')), false);
check('권유 표현 없음', /추천합니다|사세요|계약하세요|하셔야/.test(html), false);
/* QA 2026-11-21: 홈 서비스 수 = 메뉴 칸 + 내 집 시세 띠(화면에 보이는 서비스 수와 같게) */
{ const nav = (home.match(/<nav class="menu"[\s\S]*?<\/nav>/) || [''])[0], nMenu = (nav.match(/<a /g) || []).length, nMine = /class="minelink"/.test(home) ? 1 : 0, m = home.match(/<b>(\d+)가지 서비스<\/b>/);
  check('홈: n가지 서비스 = 보이는 서비스 칸 수', m && +m[1], nMenu + nMine); }
check('홈: 9가지 서비스(대출 한도 포함) + 전월세 카드', [home.includes('<b>9가지 서비스</b>'), home.includes('href="jeonse/"'), home.includes('전월세 전망 &amp; 전세사기 예방 체크')], [true, true, true]);
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
check('서비스 워커에 새 페이지 등록', sw.includes("'./jeonse/'") && sw.includes('rent-core.js'), true);
const stat = fs.readFileSync(path.join(__dirname, '..', 'assets', 'stat.js'), 'utf8');
check('익명 통계 기능 이름 jeonse', /FEATURES = \[[^\]]*'jeonse'/.test(stat), true);

/* ---------- 빌라 전세가율(재개발·빌라 화면 + 전월세 빌라 화면 공용) ---------- */
global.JDJ_PRICE = require('../assets/price-sheet.js');
const vb = { r: 0.92, at: '202610', a: 30, j: 27600, s: 30000, nj: 2, ns: 3, b: 'b', sp: ['202512', '202609'], lo: 1 };
check('빌라 근거: 전세 ÷ 매매·표본 수·기간·표본 적음', [/전세 시세 2억 7,600만원 ÷ 매매 시세 3억원/.test(R.vjBasis(vb)), /순수 전세\(월세 없는 계약\) 2건/.test(R.vjBasis(vb)), /같은 건물 매매 3건\(2025\.12~2026\.09\)/.test(R.vjBasis(vb)), /표본이 적어서/.test(R.vjBasis(vb))], [true, true, true, true]);
const vd = Object.assign({}, vb, { b: 'd', nb: 7, by: [2010, 2020], ar: [25.1, 35.8], ns: 40, lo: 0 });
check('빌라 근거: 같은 동 비슷한 빌라 기준(동·준공·면적·건물 수·건수)', [/같은 동 비슷한 빌라 기준/.test(R.vjBasis(vd, '화곡동')), /화곡동의 준공 2010~2020년, 전용 25\.1~35\.8㎡ 빌라 7곳의 매매 40건/.test(R.vjBasis(vd, '화곡동')), /표본이 적어서/.test(R.vjBasis(vd))], [true, true, false]);
const v12 = Object.assign({}, vb, { jw: 12, at: '202606' });
check('빌라 1년 전세 기준: 이름·가장 최근 계약 달·1년 표본', [R.vjWin(v12), /최근 3개월에는 이 평형 전세 계약이 없어서/.test(R.vjBasis(v12)), /최근 1년 순수 전세\(월세 없는 계약\) 2건/.test(R.vjBasis(v12)), R.vjWin(vb)], ['최근 1년 전세 계약 기준 (가장 최근 계약: 2026.06)', true, true, '']);
check('빌라: 값이 없으면 근거도 없음', R.vjBasis({ x: 'nj' }), '');
check('빌라: 계산 안 한 이유(표본 수 그대로)', [/최근 1년/.test(R.vjMiss({ x: 'nj' })), /최근 3년 1건뿐/.test(R.vjMiss({ x: 'ns', ns: 1, nd: 4 })), /같은 동 비슷한 빌라 매매도 4건뿐/.test(R.vjMiss({ x: 'ns', ns: 1, nd: 4 })), /준공 연도 자료가 없어서/.test(R.vjMiss({ x: 'ns', ns: 0, nd: null })), /이 건물/.test(R.vjMiss(null, true))], [true, true, true, true, true]);
check('빌라 단계: 90% 이상 hi(HUG 기준)·80~90% mid·그 아래 없음', [R.vjLevel(0.9), R.vjLevel(0.85), R.vjLevel(0.79), R.vjLevel(0)], ['hi', 'mid', '', '']);
check('빌라 90% 이상: 아파트·오피스텔과 같은 칩(문구·체크리스트 링크)', R.vjNote(0.93, '202610', '../jeonse/checklist/?k=v'), JDJ_PRICE.jrChip(0.93, '202610', '../jeonse/checklist/?k=v'));
const mid = R.vjNote(0.86, '202610');
check('빌라 80~90%: 주의해서 살펴보세요·HUG 기준·남은 여유 4%·체크리스트 링크', [/주의해서 살펴보세요/.test(mid), /90% 이내/.test(mid), /집값의 4%보다/.test(mid), /jeonse\/checklist\/\?k=v/.test(mid)], [true, true, true, true]);
check('빌라 80% 미만: 안내 없음', R.vjNote(0.7, '202610'), '');
check('빌라 문구: 겁주는 말·약속 없음', /절대|반드시 사기|위험합니다|안전합니다|보장/.test(R.VJ_WHY + mid + R.vjBasis(vd, '화곡동')), false);
check('빌라 평형 고르기: 전세가율 있는 평형 중 전용이 가까운 것', R.vjPick([{ a: 20, r: 0.5 }, { a: 40, x: 'nj' }, { a: 45, r: 0.7 }], 41).a, 45);
const dt = R.vjDong({ 화곡동: [2, 800, 0, 850] }, '화곡동', '202606', '202611');
check('동 추이 해독(‰ → 0~1, 앞뒤 빈 달 자름)', [dt.months, dt.a], [['202608', '202609', '202610'], [0.8, 0, 0.85]]);
check('동 추이 없음', R.vjDong({}, '화곡동', '202606', '202611'), null);
const villaHtml = fs.readFileSync(path.join(__dirname, '..', 'villa', 'index.html'), 'utf8');
check('재개발·빌라 화면: 전세가율 칸·이유·동 추이·공용 스크립트', ['jrBlock(b)', 'vWhy()', 'dongJr(d)', 'rent-core.js?v=', 'price-sheet.js?v=', 'mine-core.js?v='].every(x => villaHtml.includes(x)), true);
const jeHtml = fs.readFileSync(path.join(__dirname, '..', 'jeonse', 'index.html'), 'utf8');
check('전월세 빌라 화면: 근거·주의 칩·동 추이·이유', ['R.vjBasis(', 'R.vjNote(', 'vDongBox(c)', 'R.VJ_WHY'].every(x => jeHtml.includes(x)), true);

/* ---------- 공개 자료(선택) ---------- */
const dir = process.argv[2];
if (dir && fs.existsSync(path.join(dir, 'rent', 'index.json'))) {
  const RX = JSON.parse(fs.readFileSync(path.join(dir, 'rent', 'index.json'), 'utf8'));
  check('자료: index 칸', ['v', 'to', 'm0', 'kinds', 'sgg'].every(k => k in RX), true);
  const g = Object.keys(RX.sgg).find(k => fs.existsSync(path.join(dir, 'rent', k + '.json')));
  const A = JSON.parse(fs.readFileSync(path.join(dir, 'rent', g + '.json'), 'utf8'));
  const bad = A.units.filter(x => x.length !== 12 || !Array.isArray(x[10]) || x[10].some(t => t.length < 6 || t.length > 9));
  check('자료: 단지 행 12칸·계약 6~9칸', bad.length, 0);
  const s = R.summary(A.units[0], A);
  check('자료: 최근 전세 또는 월세 있음', !!(s.j || s.wr), true);
  const txt = fs.readFileSync(path.join(dir, 'rent', g + '.json'), 'utf8');
  check('자료: 호수·일련번호 없음', /호수|aptSeq/.test(txt), false);
}

const bad = rows.filter(r => !r.ok);
for (const r of rows) console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.name + (r.ok ? '' : ` → ${JSON.stringify(r.got)} (기대 ${JSON.stringify(r.want)})`));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
