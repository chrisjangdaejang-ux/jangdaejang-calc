/* 전세 갈아타기(switch/rent/ + assets/tswitch-core.js) 자동 검증 — 실행: node tools/tswitch-test.js
   ① 최근 신규 전세 중간값이 전세 만기 알림(cal-core)과 같은 규칙 ② 거리·역·나아진 점 ③ 더 나은 집·더 싼 집 고르기
   ④ HUG 추정·갱신 안내·매수 전환(만기 알림과 같은 규칙) ⑤ 전망 과거 시험 결과 파일과 화면 문구 ⑥ 배치(탭·전월세 단추)·개인 금액은 기기에만 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const T = require('../assets/tswitch-core.js');
const HG = require('../assets/hug-core.js');
const C = require('../assets/cal-core.js');
const rows = [];
const near = (a, b, t) => typeof a === 'number' && Math.abs(a - b) <= (t == null ? 1e-9 : t);
function check(name, got, want, tol) { rows.push({ ok: typeof want === 'number' ? near(got, want, tol) : JSON.stringify(got) === JSON.stringify(want), name, got, want }); }
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------- ① 최근 6개월 신규 전세 중간값 ---------- */
const today = '2026-11-25';
const deals = [
  [20261101, 84, 5, 60000, 0, 0], [20261010, 84, 9, 62000, 0, 0], [20260901, 84, 3, 58000, 0, 2], [20260801, 84, 3, 70000, 0, 1],   // 갱신(1)은 빼요
  [20260701, 84, 7, 30000, 120, 0],                                                                                                    // 월세는 빼요
  [20260520, 84, 7, 50000, 0, 0]                                                                                                       // 6개월 전보다 앞이라 빼요
];
const u = ['가락동', '시험단지', '84㎡대', '1', 84.2, 10, 2, [0, 60000], [], [], deals, { by: 2010 }];
const rn = T.recentNew(u, today);
check('최근 6개월 신규 순수 전세만(갱신·월세·6개월 밖 제외) 3건', rn.n, 3);
check('중간값 60,000', rn.med, 60000);
check('3건 미만이면 중간값을 쓰지 않음', T.recentNew(Object.assign([], u, { 10: deals.slice(0, 2) }), today).med, 0);
/* cal-core 와 같은 규칙인지: 같은 행으로 전세 만기 알림의 '갈 수 있는 단지' 계산과 비교 */
const sc = C.taScan({ '11710': { units: [u] } }, [{ g: '11710', d: '가락동' }], '84㎡대', today, 60000);
check('전세 만기 알림 fitList 중간값과 같음', sc.fitList.length ? sc.fitList[0].mr : null, rn.med);

/* 최근 1년 흐름(참고) */
const J = [0]; for (let i = 0; i < 37; i++) J.push(i < 12 ? 0 : 50000 + i * 100);
const tr = T.trend1(['', '', '', '', 0, 0, 0, J], { m0: '202310', to: '202610' });
check('1년 흐름: 마지막 달 2026.10', tr && tr.at, '202610');
check('1년 흐름: 12개월 전 2025.10', tr && tr.from, '202510');
check('1년 흐름 변화율', tr && tr.pct, (53600 - 52400) / 52400, 1e-12);

/* ---------- ② 거리·역 ---------- */
check('직선 거리(경도 0.01°·북위 37.5°) ≈ 0.882km', T.km([127, 37.5], [127.01, 37.5]), 0.8822, 0.001);
const st = [['가락시장', 127.11808, 37.49257], ['송파', 127.1121, 37.4997]];
const ns = T.nearSt([127.1071, 37.49742], st, 3000);
check('가장 가까운 역 이름', ns && ns.nm, '송파');
check('걷는 시간 = 직선 m ÷ 67 반올림', ns && ns.min, Math.max(1, Math.round(ns.m / 67)));
check('3km 밖 역은 없음', T.nearSt([127.5, 37.5], st, 3000), null);
const dong = { '11710|가락동': [127.11, 37.497, 10], '11710|문정동': [127.12, 37.485, 8] };
check('단지 좌표가 있으면 단지 위치', T.locate('11710', '가락동', '913', { '11710|가락동|913': [127.1071, 37.49742] }, dong).by, 'apt');
check('없으면 동 가운데 점', T.locate('11710', '가락동', '999', {}, dong).by, 'dong');

/* ---------- ③ 나아진 점·고르기 ---------- */
const cur = { key: 'k0', commute: 6.0, st: { m: 510 }, by: 2018, area: 84.9, sc: ['가중', -0.5], med: 134500 };
const a = { key: 'k1', commute: 5.0, st: { m: 300 }, by: 2020, area: 99, sc: ['나중', 0.5], med: 100000, safe: true, b: '84㎡대' };
const g = T.gains(a, cur).map(x => x.k);
check('나아진 점 6가지(출퇴근·역·준공·넓이·학군·안전)', g, ['commute', 'st', 'by', 'area', 'sch', 'safe']);
check('넓이 차이(평)', T.gains(a, cur).find(x => x.k === 'area').v, Math.round((99 - 84.9) / 3.3058 * 10) / 10);
const small = { key: 'k2', commute: 5.7, st: { m: 450 }, by: 2018, area: 85.5, sc: ['x', -0.2], med: 90000 };
check('기준보다 작은 차이는 세지 않음(0.3km·60m·0년·0.2평·0.3%p)', T.gains(small, cur).length, 0);
check('자료가 한쪽에만 있으면 비교하지 않음', T.gains({ key: 'k3', commute: 1, by: 2025 }, { key: 'k0' }).length, 0);
const list = T.pick([a, small, Object.assign({}, a, { key: 'k4', med: 200000 }), Object.assign({}, a, { key: 'k0' })], cur, { dep: 120000, loan: 5000, near: 0 });
check('예산(보증금 12억 + 대출 5천, 중개보수 포함) 넘는 곳·지금 집은 빼요', list.map(r => r.key), ['k1', 'k2']);
check('나아진 점 많은 순', list[0].key, 'k1');
check('여유 = 예산 − 중간값', list[0].room, 25000);
check('걸러 보기: 안전 통과만', T.filt(list, ['safe']).map(r => r.key), ['k1']);
const ch = T.cheaper([Object.assign({}, a, { commute: 6.9 }), Object.assign({}, a, { key: 'k5', commute: 7.2 }), Object.assign({}, a, { key: 'k6', b: '59㎡대', commute: 5 })], cur, 134500, { band: '84㎡대', work: true });
check('더 싼 집: 같은 평형 · 출퇴근 +1km 안만', ch.map(r => r.key), ['k1']);
check('절약액 = 기준 − 중간값', ch[0].save, 34500);
const ch2 = T.cheaper([Object.assign({}, a, { p: [127.11, 37.5] }), Object.assign({}, a, { key: 'k7', p: [127.2, 37.5] })], Object.assign({}, cur, { p: [127.1, 37.5] }), 134500, { band: '84㎡대', work: false });
check('출퇴근지가 없으면 지금 집 직선 2km 안만', ch2.map(r => r.key), ['k1']);

/* ---------- ③-2 중개보수·이사 계획·조건 맞춤 ---------- */
/* 상한요율(주택 임대차): 5천 미만 0.5%(20만) · 1억 미만 0.4%(30만) · 6억 미만 0.3% · 12억 미만 0.4% · 15억 미만 0.5% · 그 위 0.6% */
check('중개보수: 전세 4천만 → 0.5% = 20만 + 부가세 = 22만', T.brokerFee(4000).fee, 22);   // 부가세 10% 포함(최대) — 2026-11-26 통일
check('중개보수: 전세 9천만 → 0.4% 36만 → 한도 30만', T.brokerFee(9000).fee, 33);
check('중개보수: 전세 3억 → 0.3% = 90만', T.brokerFee(30000).fee, 99);
check('중개보수: 전세 6억(이상 구간) → 0.4% = 240만', T.brokerFee(60000).fee, 264);
check('중개보수: 전세 13억 → 0.5% = 650만', T.brokerFee(130000).fee, 715);
check('중개보수: 전세 15억 → 0.6% = 900만', T.brokerFee(150000).fee, 990);
check('월세 거래금액 = 보증금 + 월세 × 100', T.brokerFee(10000, 100).base, 20000);
check('그 값이 5천 미만이면 보증금 + 월세 × 70', T.brokerFee(1000, 30).base, 3100);
check('중개보수 출처(공식 요율표·확인 날짜)', [/공인중개사법 시행규칙/.test(T.FEE_SRC.nm), T.FEE_SRC.checked], [true, '2026-11-25']);
const pj = T.plan({ med: 50000 }, { dep: 45000, cash: 6000, move: 300, cost: 'all' });
check('이사 계획(전세, 이사 비용 포함): 차액 5천 + 중개보수 165(150 + 부가세) + 이사비 300', [pj.mode, pj.diff, pj.fee, pj.out], ['j', 5000, 165, 5465]);
check("'이사 비용까지 포함'이면 보수·이사비까지 모자랄 때 전세로는 안 됨", T.plan({ med: 50000 }, { dep: 45000, cash: 5000, move: 300, cost: 'all' }), null);
check("'보증금만으로'(기본)는 보증금이 예산 안이면 됨(이사에 드는 돈은 그대로 보여 줌)", [T.plan({ med: 50000 }, { dep: 45000, cash: 5000, move: 300 }).mode, T.plan({ med: 50000 }, { dep: 45000, cash: 5000, move: 300 }).out], ['j', 5465]);
const ph = T.plan({ med: 100000, cv: { r: 0.05, n: 9 } }, { dep: 80000, cash: 5000, move: 200, rentMax: 100, cost: 'all' });
check('반전세: 월세 = (전세 − 낼 보증금) × 전환율 ÷ 12', ph.rent, Math.ceil((100000 - ph.dep2) * 0.05 / 12));
check('반전세: 낼 보증금 = 예산 − 중개보수 − 이사비', ph.dep2, Math.floor(85000 - ph.fee - 200));
check('반전세: 월세 감당액을 넘으면 안 됨', T.plan({ med: 100000, cv: { r: 0.05, n: 9 } }, { dep: 80000, cash: 5000, move: 200, rentMax: 50, cost: 'all' }), null);
check('반전세: 전환율 자료가 없으면 안 함', T.plan({ med: 100000 }, { dep: 80000, cash: 5000, rentMax: 500 }), null);
const base = { key: 'kk', commute: 6, st: { m: 600 }, by: 2005, area: 84, med: 50000 };
const pr = [Object.assign({}, base, { key: 'p1', st: { m: 300 }, med: 40000 }), Object.assign({}, base, { key: 'p2', by: 2020, med: 40000 }), Object.assign({}, base, { key: 'p3', by: 2021, med: 45000, safe: true })];
check('대중교통이면 역 거리 무게 두 배 → 역 가까운 곳 먼저', T.pick(pr.slice(0, 2), base, { near: 0, dep: 50000, mode: 'transit' })[0].key, 'p1');
check('최대 연식 10년: 2015년 전 준공은 빠짐', T.pick(pr, base, { near: 0, dep: 50000, ageMax: 10, year: 2026 }).map(r => r.key).sort(), ['p2', 'p3']);
check('보증금 줄이기: 지금 보증금보다 낮은 곳만', T.pick(pr.concat([Object.assign({}, base, { key: 'p4', med: 50000 })]), base, { near: 0, dep: 50000, cash: 9000, reduce: true }).every(r => r.med < 50000), true);
check('원하는 보증금 범위(최소 4억 2천)', T.pick(pr, base, { near: 0, dep: 50000, lo: 42000 }).map(r => r.key), ['p3']);
check('보증보험 가입 가능한 곳만', T.pick(pr, base, { near: 0, dep: 50000, safeOnly: true }).map(r => r.key), ['p3']);
check('최대 통근 거리(직선 5km) 넘는 곳 빠짐', T.pick([Object.assign({}, pr[0], { commute: 7 })], base, { near: 0, dep: 50000, cmax: 5 }).length, 0);
check('맞벌이: 두 번째 출퇴근지도 나아진 점으로 셈', T.gains({ commute2: 3 }, { commute2: 5 }).map(g => g.k), ['commute2']);
check('자녀 중·고: 학군 무게 2', T.weights({ hh: 'high' }).sch, 2);
check('후보마다 이사 계획(보증금 차액·중개보수·이사비)', !!T.pick(pr, base, { near: 0, dep: 50000, move: 100 })[0].plan, true);


/* ---------- 예산 근처·기간 넓히기(대표 사용 후 고침 2026-11-25) ---------- */
const nb = [{ key: 'n1', med: 120000 }, { key: 'n2', med: 160000 }, { key: 'n3', med: 179000 }, { key: 'n4', med: 152000 }].map(x => Object.assign({ by: 2010, area: 114 }, x));
check("더 나은 집은 예산 근처(85~100%)만 — 18억이면 15억 3천 이상, 12억은 빠짐", T.pick(nb, null, { dep: 180000 }).map(r => r.key).sort(), ['n2', 'n3']);
check('예산 근처 비율은 설정값(near)', T.pick(nb, null, { dep: 180000, near: 0.6 }).length, 4);
check("12억은 '더 싼 집'에는 나옴", T.cheaper(nb.map(r => Object.assign({ p: [127, 37.5], b: '114㎡대' }, r)), { key: 'c', b: '114㎡대', p: [127.001, 37.5] }, 180000, { band: '114㎡대' }).some(r => r.key === 'n1'), true);
check("이사 비용 포함이면 아래 끝도 보수·이사비를 뺀 금액 기준", T.nearLo({ dep: 180000, move: 300, cost: 'all' }), Math.round((180000 - 300 - T.brokerFee(180000).fee) * 0.85));
check('보증금 줄이기·직접 넣은 최소값이 있으면 예산 근처 조건은 쓰지 않음', [T.pick(nb, null, { dep: 180000, reduce: true }).length, T.pick(nb, null, { dep: 180000, lo: 100000 }).length], [4, 4]);
const dl = [[20261020, 114, 5, 170000, 0, 0], [20260210, 114, 5, 166000, 0, 0]];
const ua = ['삼성동', 'x', '114㎡대', '1', 114, 0, 0, [0], [], [], dl, {}];
const ra = T.recentAuto(ua, today, T.WIN.a);
check('아파트: 6개월 3건이 안 되면 12개월 2건으로 넓힘', [ra.w, ra.n, ra.med], [12, 2, 168000]);
check('기간 늘리기: 24개월 2건', T.WIN.long, [[24, 2]]);
check('평형 넓히기: 114㎡대 → 99·114·135㎡대', T.bandsNear('114㎡대'), ['99㎡대', '114㎡대', '135㎡대']);
/* ---------- ④ HUG·갱신·매수 ---------- */
const h1 = T.hugEst(HG, 60000, 107000, true, 'a');
check('HUG: 공시가격 × 140% × 90% = 기준', h1.limit, Math.round(107000 * 1.4 * 0.9));
check('HUG: 6억은 수도권 한도 7억 안 → 통과', h1.ok, true);
const h2 = T.hugEst(HG, 95000, 174500, true, 'a');
check('HUG: 9.5억은 수도권 한도 7억 초과 → 불통과(한도 때문)', [h2.ok, h2.capOk], [false, false]);
check('HUG: 공시가격 없으면 계산 안 함', T.hugEst(HG, 50000, 0, true, 'a').need, 'pub');
check('갱신 안내: 지금 단지 시세 < 내 보증금', [T.renewHint(100000, 120000), T.renewHint(130000, 120000), T.renewHint(0, 120000)], [true, false, false]);
const LN = require('../assets/loan-core.js'), M = require('../assets/mine-core.js');
check('매수 전환: 자료 없으면 빈 목록', T.buyFit(null, '11710', LN, M, [{ g: '11710', d: '' }], '', 60000, 0, 0, null), []);
const months = []; for (let i = 0; i < 36; i++) { const y = 2023 + Math.floor((10 + i - 1) / 12), m = ((10 + i - 1) % 12) + 1; months.push(y + String(m).padStart(2, '0')); }
const PF = { months, units: [['11710', '가락동', '시험단지', '84㎡대', 84, 30, new Array(36).fill(3000), '0'.repeat(33) + '111', '1']] };
const price = M.bandSummary(PF.units[0], months).price, ctx0 = LN.ctx({ g: LN.R.groupOf('11710'), own: 'none', income: 9000, cash: 60000 + 200000 });
const bf = T.buyFit(PF, '11710', LN, M, [{ g: '11710', d: '가락동' }], '84㎡대', 60000, 200000, 9000, null);
check('매수 전환: 필요 현금 = 내 집 마련 계산기 규칙(LN.need)', bf.length && bf[0].cashUse, LN.need(price, ctx0).need);
check('매수 전환: 현금이 모자라면 빠짐', T.buyFit(PF, '11710', LN, M, [{ g: '11710', d: '가락동' }], '84㎡대', 1000, 0, 9000, null).length, 0);
check('매수 전환: 다른 동은 빠짐', T.buyFit(PF, '11710', LN, M, [{ g: '11710', d: '문정동' }], '84㎡대', 60000, 200000, 9000, null).length, 0);
/* 만기 알림 화면과 같은 대출 규칙 문구(무주택·같은 함수) */
const page = read('switch/rent/index.html'), cal = read('mine/calendar/index.html');
check('매수 전환은 만기 알림과 같은 대출 함수(LN.ctx own none · LN.need)', /LN\.ctx\(\{ g: LN\.R\.groupOf\(g\), own: 'none'/.test(read('assets/tswitch-core.js')) && /LN\.ctx\(\{ g: LN\.R\.groupOf\(g\), own: 'none'/.test(cal), true);

/* ---------- ⑤ 2년 뒤 전망: 과거 시험 결과 ---------- */
const bt = JSON.parse(read('data/rent-dir-bt.json'));
check('전망 시험: 잠금 시험 2개', bt.lock.length, 2);
check('전망 시험: 판정 규칙(평균÷표준오차 ≥ 2 · 절반 이상 + · 잠금 + · 권역 2곳)과 결과가 맞음', bt.ok, bt.dev.t >= 2 && bt.dev.pos * 2 >= bt.dev.n && bt.lockMean > 0 && Object.values(bt.groups).filter(x => x > 0).length >= 2);
check('불합격이면 화면에 전망 숫자 대신 이유', bt.ok || /전망 숫자는 보여 드리지 않아요/.test(page), true);
check('카드의 1년 흐름은 참고·전망 아님 표시', /최근 1년 전세 흐름[^`]*참고[^`]*전망이 아니에요/.test(page), true);

/* ---------- ⑥ 배치·개인 금액 ---------- */
const sw = read('switch/index.html'), js = read('jeonse/index.html');
check("갈아타기: '자가'·'전월세' 탭", /class="swtabs"[^\n]*자가[^\n]*href="rent\/"[^\n]*전월세/.test(sw), true);
check("전세 갈아타기: 같은 탭, '전월세'가 지금 화면", /class="swtabs"[^\n]*href="\.\.\/"[^\n]*자가[^\n]*aria-current="page"[^\n]*전월세/.test(page), true);
check("전월세 첫 화면: '전세 갈아타기' 단추(만기 알림보다 위)", js.indexOf('id="tswCta"') > 0 && js.indexOf('id="tswCta"') < js.indexOf('class="tacta"'), true);
check('위치 표시 이름표(back.js)', /'switch\/rent\/': \['전세 갈아타기', 'switch\/'\]/.test(read('assets/back.js')), true);
check("기본 칸 5개 + 나머지는 '조건 더 넣기' 안", /<details class="more2" id="moreCond"><summary>조건 더 넣기<\/summary>/.test(page) && page.indexOf('id="cash2"') > page.indexOf('id="moreCond"') && page.indexOf('id="dep"') < page.indexOf('id="moreCond"'), true);
check('주차·반려동물은 자료 없음 안내만(거르지 않음)', /주차 대수 자료가 아직 없어/.test(page) && /반려동물 허용 여부는 공개 자료가 없어요/.test(page), true);
check('전세대출 한도는 규칙표에 없어 추정하지 않는다고 밝힘', /전세대출 한도 규칙이 없어 추정하지 않아요/.test(page), true);
check('보증금·대출·현금·소득은 서버로 보내지 않음(fetch POST·서버 함수 없음)', !/method:\s*'POST'|JDJ_AUTH|AU\.update|userSave/.test(page), true);
check('금액을 주소에 싣지 않음', !/[?&](dep|jl|cash|inc)=/.test(page), true);
check('보증금은 전세 만기 알림과 같은 기기 칸(jdj_ta_me)', /const TK = 'jdj_ta_me'/.test(page), true);
check('화면 문구에 경쟁 앱 이름 없음', !/호갱|직방|다방|리치고|네이버\s?부동산|KB\s?부동산/.test(page.replace(/KB시세/g, '')), true);
check('화면 문구 ~습니다 없음', !/[가-힣](습니다|십시오)/.test(page), true);
/* 위치 표 파일 */
const xy = JSON.parse(read('assets/xy/11.json'));
check('위치 표: 서울 공동주택 1만 곳 넘음', Object.keys(xy.rows).length > 10000, true);
check('위치 표: 헬리오시티(송파구 가락동 913) 좌표', Array.isArray(xy.rows['11710|가락동|913']), true);

/* 2026-11-26 품질 점검: 음수 보증금·조사·문구 */
{ const h = read('switch/rent/index.html');
  check('전세 갈아타기: 음수 보증금(-5)을 5로 읽지 않음', /const num = v => \{ if \(\/\^\\s\*-\/\.test/.test(h), true);
  check("전세 갈아타기: '집예보은(는)' 대신 받침에 맞는 조사", /\$\{esc\(SITE\)\}은\(는\)/.test(h), false);
  check('전세 갈아타기: 남는 돈 설명이 더하기로 보이지 않음', h.includes('(보증금 차액 + 중개보수 + 이사비)'), false); }

const bad = rows.filter(r => !r.ok);
rows.forEach(r => console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)));
console.log(`${rows.length - bad.length}/${rows.length} 통과`);
process.exit(bad.length ? 1 : 0);
