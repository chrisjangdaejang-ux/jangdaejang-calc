/* 고민 해결 길잡이 — 재개발 예산(redev_budget)·재건축 몸테크(rebuild_live) 확인 · 실행: node tools/guide-redev-test.js </dev/null
   자료: data/redev-budget.json(구역 안 빌라 실거래) + tools/guide-redev-fixture.json(구역·정책 표·점수 자료 일부 — 실제 공개 자료에서 뽑은 것)
   ① 자연스러운 질문 → 맞는 고민 · 넓은 질문은 좁히는 질문 하나씩(이미 말한 값은 건너뜀)
   ② 숫자는 자료 그대로: 구역 안 실거래 건수·가격대 = 자료 파일, 착공까지 = redev-core speed, 시세 = mine-core bandSummary, 최대 집값 = loan-core maxPrice
   ③ 토지거래허가·투기과열 지위 양도 제한 = 정책 표 + 도시정비법 제39조 규칙, 확실하지 않은 규정은 '확인 필요'
   ④ 권유 문구 없음·추천 순위 아님 표시·주의점·다음 단계·화면 연결(버전·서비스 워커) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
const X1 = require('../assets/guide-redev.js'), G = require('../assets/guide-core.js'), RD = require('../assets/redev-core.js'), MC = require('../assets/mine-core.js'), L = require('../assets/loan-core.js');
const SC = JSON.parse(read('assets/guide/scenarios.json')), LEX = JSON.parse(read('assets/guide/lexicon.json')), DATA = Object.assign({}, SC, { lex: LEX });
const FX = JSON.parse(read('tools/guide-redev-fixture.json')), BUD = JSON.parse(read('data/redev-budget.json'));
const IX = { months: FX.months, sgg: FX.sgg };
const X = { zones: FX.zones, pol: FX.policy, bud: BUD, IX, units: FX.units };
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }
const CTX = { sgg: [{ code: '11680', name: '강남구', sido: '서울특별시', short: '서울' }, { code: '11350', name: '노원구', sido: '서울특별시', short: '서울' }, { code: '11470', name: '양천구', sido: '서울특별시', short: '서울' }], sido: [{ name: '서울특별시', short: '서울' }], today: '2026-11-26' };
const Y = +new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 4);

/* ---------- ① 분류·좁히기 ---------- */
const QS = {
  redev_budget: ['3~5억으로 재개발 투자한다면 어디가 좋을까요?', '재개발 빌라 5억 이하로 살 수 있는 곳', '소액으로 재개발 투자하고 싶어요 3억 있어요', '4억으로 입주권 노려볼 재개발 구역', '재개발 투자 어디가 좋을까요', '노원구 재개발 지분 투자 4억 예산'],
  rebuild_live: ['재건축 실거주하면서 몸테크 하기에 보유 금액에 적합한 단지는?', '몸테크 할 만한 아파트 현금 5억', '낡은 아파트 살면서 재건축 기다리기', '몸빵하면서 재건축 기다릴 단지', '30년 넘은 아파트 실거주로 사고 싶어요 7억', '오래된 아파트 사서 재건축까지 버티기']
};
for (const [id, qs] of Object.entries(QS)) qs.forEach(q => { const r = G.classify(q, DATA, CTX); check(`분류 [${id}] "${q}"`, r.top && r.top.id === id, r.scores.slice(0, 3)); });
['재개발 진행 단계', '재건축 관리처분 뒤 입주권', '재개발 투자 단계별 체크'].forEach(q => check(`단계 질문은 그대로 단계 고민 "${q}"`, G.classify(q, DATA, CTX).top.id === 'redev_stage'));
check('대표 고민 그룹(pri)·재개발 묶음·ext 표시', ['redev_budget', 'rebuild_live'].every(id => { const s = SC.sc.find(x => x.id === id); return s && s.pri === 1 && s.cat === 'redev' && s.ext === 'redev' && s.expert === 'redev'; }));
check('대표 고민 6개는 맨 앞 그대로, 새 고민은 그다음', SC.sc[6].id === 'redev_budget' && SC.sc[7].id === 'rebuild_live');
check('출처가 모두 출처 표에 있고 공식 주소', ['redev39', 'redev77', 'redev73', 'toh17', 'rrc', 'cgt154', 'policy_1015', 'eum', 'molit_rv'].every(k => SC.src[k] && /^https:\/\/[\w.-]*(go\.kr|korea\.kr)\//.test(SC.src[k].url)));
check('동의어: 몸빵 → 몸테크, 재개발에 투자 → 재개발투자', G.norm('몸빵 단지', LEX).hay.indexOf('몸테크') >= 0 && G.norm('재개발에 투자', LEX).hay.indexOf('재개발투자') >= 0);

let st = X1.init('redev_budget', G.extract('3~5억으로 재개발 투자한다면 어디가 좋을까요?', CTX), DATA);
check('좁히기: 3~5억 범위를 읽음', st.bud && st.bud[0] === 30000 && st.bud[1] === 50000, st.bud);
check('좁히기: 예산을 말했으면 지역부터', X1.next('redev_budget', st) === 'rgu');
let s2 = X1.init('redev_budget', G.extract('재개발 투자 어디가 좋을까요', CTX), DATA);
check('넓은 질문: 예산부터 묻기', X1.next('redev_budget', s2) === 'rbud');
s2 = X1.set('redev_budget', s2, 'rbud', '30000-50000'); s2 = X1.set('redev_budget', s2, 'rgu', '노도강');
check('좁히기 순서: 예산 → 지역 → 실거주 → 기간 → 대출', X1.next('redev_budget', s2) === 'rlive' && s2.gus.length === 3);
s2 = X1.set('redev_budget', s2, 'rlive', 'n'); s2 = X1.set('redev_budget', s2, 'rwait', '0'); s2 = X1.set('redev_budget', s2, 'rloan', 'y');
check('다 답하면 더 묻지 않음', X1.next('redev_budget', s2) === '');
const s3 = X1.init('rebuild_live', G.extract('몸테크 하고 싶어요 현금 5억 연봉 8천 4인 가족', CTX), DATA);
check('몸테크: 현금·소득·가족 수를 문장에서 읽고 지역부터', s3.cash === 50000 && s3.inc === 8000 && s3.size === 'm' && s3.live === 'y' && X1.next('rebuild_live', s3) === 'rgu', s3);
check('몸테크 넓은 질문: 현금부터', X1.next('rebuild_live', X1.init('rebuild_live', G.extract('몸테크 단지', CTX), DATA)) === 'rcash');

/* ---------- 대화창(guide-core chatStart·chatNext·chatAnswer)으로 하나씩 ---------- */
{
  const mem = { m: {}, from: {} };
  let S = G.chatStart('3~5억으로 재개발 투자한다면 어디가 좋을까요?', DATA, CTX, mem);
  check('대화: 재개발 예산 고민으로 시작 · 상태에 범위', S.id === 'redev_budget' && S.nf && S.nf.bud[1] === 50000);
  let nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: nx.ext };
  check('대화: 첫 질문 = 지역(단추에 서울 전체)', nx.key === 'rgu' && nx.quick.some(q => q[0] === 'all'));
  G.chatAnswer(S, '', DATA, CTX, 'all'); nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화: 단추 답 → 실거주 질문', nx.key === 'rlive' && S.nf.gname === '서울 전체');
  check('대화: 글로 답("네 들어가 살 수 있어요")', G.chatAnswer(S, '네 들어가 살 수 있어요', DATA, CTX).ok && S.nf.live === 'y');
  nx = G.chatNext(S, DATA, null); S.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화: 몰라요 → 건너뜀', nx.key === 'rwait' && G.chatAnswer(S, '몰라요', DATA, CTX).ok && G.chatNext(S, DATA, null).key === 'rloan');
  S.asked = { key: 'rloan', nf: 1, ext: 1 }; G.chatAnswer(S, '아니요 내 돈으로 사요', DATA, CTX);
  check('대화: 대출 답 뒤 질문 끝', S.nf.loan === 'n' && G.chatNext(S, DATA, null) === null);
  let T = G.chatStart('몸테크 하고 싶어요', DATA, CTX, mem); nx = G.chatNext(T, DATA, null); T.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화 몸테크: 현금 → "5억"', nx.key === 'rcash' && G.chatAnswer(T, '5억', DATA, CTX).ok && T.nf.cash === 50000);
  nx = G.chatNext(T, DATA, null); T.asked = { key: nx.key, nf: 1, ext: 1 };
  check('대화 몸테크: 소득 → "7천만 원"', nx.key === 'rinc' && G.chatAnswer(T, '7천만 원', DATA, CTX).ok && T.nf.inc === 7000, T.nf);
  nx = G.chatNext(T, DATA, null); T.asked = { key: nx.key, nf: 1, ext: 1 }; G.chatAnswer(T, '노도강', DATA, CTX);
  nx = G.chatNext(T, DATA, null); T.asked = { key: nx.key, nf: 1, ext: 1 }; G.chatAnswer(T, '4명이에요', DATA, CTX);
  nx = G.chatNext(T, DATA, null); T.asked = { key: nx.key, nf: 1, ext: 1 }; G.chatAnswer(T, '10년', DATA, CTX);
  check('대화 몸테크: 지역·가족·기간까지 읽고 끝', T.nf.gname === '노도강' && T.nf.size === 'm' && T.nf.wait === 10 && G.chatNext(T, DATA, null) === null, T.nf);
  check('대화: 못 알아들으면 힌트(금액 예시)', /억/.test(G.chatHint({ key: 'rcash', nf: 1, q: X1.Q.rcash })));
}

/* ---------- ② 재개발: 숫자 = 자료 그대로 ---------- */
const R = X1.redevRows(X1.init('redev_budget', G.extract('3~5억 재개발 투자', CTX)), X);
check('재개발 3~5억: 구역이 나옴', R.n > 10, R.n);
check('재개발: 구역마다 예산 안 실거래 건수·최저·최고 = 자료 파일', R.rows.every(r => { const tr = BUD.z[r.z.g + '|' + r.n].i.filter(t => t[0] >= 30000 && t[0] <= 50000).map(t => t[0]); return tr.length === r.n1 && Math.min(...tr) === r.lo && Math.max(...tr) === r.hi && r.nAll === BUD.z[r.z.g + '|' + r.n].i.length; }));
check('재개발: 단계 = 서울시 추진현황 단계 · 착공한 구역은 뺌', R.rows.every(r => r.st === r.z.st && r.st < 10));
check('재개발: 착공 예상 = redev-core speed 의 연도 그대로', R.rows.filter(r => r.z.sp && r.z.sp.y).every(r => r.lf.t.indexOf(String(r.z.sp.y[0])) >= 0 && RD.speed(r.z, FX.zones).state === 'est'));
/* 순서 = 재개발·재건축 구역 화면(villa/zone/)과 같은 redev-core sort · 기본값 '착공 예상 빠른 순'(구역 화면 S.sort 기본값) */
const ZS = read('villa/zone/index.html'), zDef = (/const S = \{[^}]*sort: '(\w+)'/.exec(ZS) || [])[1];
check('재개발: 기본 순서 = 구역 화면 기본값(착공 예상 빠른 순)', zDef === 'soon' && X1.init('redev_budget', {}).sort === zDef && X1.SORTS.redev_budget[0][0] === 'soon' && /착공 예상 빠른 순/.test(ZS) && X1.SORTS.redev_budget[0][1] === '착공 예상 빠른 순');
const zOrd = (rows, how) => JSON.stringify(RD.sort(rows.map(r => r.z), how).map(z => z.id || z.n));
check('재개발: 착공 예상 빠른 순 = 구역 화면과 같은 함수(redev-core sort soon)', JSON.stringify(R.rows.map(r => r.z.id || r.z.n)) === zOrd(R.rows, 'soon'));
const Rs = X1.redevRows(Object.assign(X1.init('redev_budget', G.extract('3~5억 재개발 투자', CTX)), { sort: 'stage' }), X);
check('재개발: 단계 높은 순 = 구역 화면과 같은 함수(redev-core sort stage)', JSON.stringify(Rs.rows.map(r => r.z.id || r.z.n)) === zOrd(Rs.rows, 'stage') && Rs.rows.every((r, i) => !i || Rs.rows[i - 1].st >= r.st));
const Rw = X1.redevRows(Object.assign(X1.init('redev_budget', G.extract('3~5억 재개발 투자', CTX)), { wait: 5 }), X);
check('재개발: 5년 안쪽만 → 착공 예상(연도 끝)이 5년 안쪽인 구역만, 뺀 수 안내', Rw.rows.every(r => r.lf.y != null && r.lf.y <= 5) && Rw.waitOut > 0 && Rw.n < R.n);
const Rn = X1.redevRows(X1.set('redev_budget', X1.init('redev_budget', G.extract('3~5억 재개발 투자', CTX)), 'rgu', '노원구'), X);
check('재개발: 구를 고르면 그 구만', Rn.rows.every(r => r.gu === '노원구'));
const dsum = R.dist.reduce((s, d) => s + d.n, 0);
check('재개발: 단계 분포 합 = 구역 수', dsum === R.n, [dsum, R.n]);
const T1 = X1.tableOf('redev_budget', R, { BASE: '/' }, 0);
check('재개발 표: 구역·구·단계·남은 기간·구역 안 실거래·토허·지위양도 7칸, 구역은 구역 지도로', T1.head.length === 7 && T1.rows.every(x => /villa\/zone\/\?z=/.test(x[0].href)));

/* ---------- ③ 정책 표·법 규칙 ---------- */
check('토허: 서울 빌라 = 아파트만 지정(정책 표) · 구역은 확인 필요', X1.toh(FX.policy, '11350', '상계동', 'villa').v === 'apt' && /확인 필요/.test(X1.toh(FX.policy, '11350', '상계동', 'villa').t));
check('토허: 압구정동은 동 단위 지정(2021) · 확인 필요', X1.toh(FX.policy, '11680', '압구정동', 'villa').v === 'dong');
check('토허: 서울 아파트는 지정 · 허가 뒤 직접 거주', X1.toh(FX.policy, '11350', '상계동', 'apt').v === 'apt');
check('토허: 정책 표에 없는 곳(부산)은 지정 없음', X1.toh(FX.policy, '26110', '', 'apt').v === 'none');
check('지위 양도: 재개발 관리처분(8) 뒤 제한 · 확인 필요', X1.limit(FX.policy, { t: 'rd', g: '11350', st: 8 }).v === 'on' && /확인 필요/.test(X1.limit(FX.policy, { t: 'rd', g: '11350', st: 8 }).t));
check('지위 양도: 재개발 사업시행(7)은 아직 없음', X1.limit(FX.policy, { t: 'rd', g: '11350', st: 7 }).v === 'pre');
check('지위 양도: 재건축 조합설립(5) 뒤 제한, 추진위(4)는 아직', X1.limit(FX.policy, { t: 'rb', g: '11350', st: 5 }).v === 'on' && X1.limit(FX.policy, { t: 'rb', g: '11350', st: 4 }).v === 'pre');
check('지위 양도: 투기과열지구가 아니면 해당 없음', X1.limit({ policies: [] }, { t: 'rb', g: '11350', st: 6 }).v === 'none');
const Rl = X1.redevRows(Object.assign(X1.init('redev_budget', { raw: '' }), { live: 'n', gus: ['강남구'] }), X);
check('실거주 못 하면 동 단위 토허 구역은 뺌', Rl.rows.every(r => r.th.v !== 'dong'));

/* ---------- 몸테크: 시세·대출·연결 ---------- */
const sb = X1.init('rebuild_live', G.extract('몸테크 현금 5억 연봉 1억', CTX));
const B = X1.rebuildRows(sb, X, { MC, L });
const c0 = L.ctx({ g: L.R.groupOf('11470'), own: 'none', income: 10000, cash: 50000, debt: 0, rate: 4 }), P0 = L.maxPrice(c0);
check('몸테크: 최대 집값 = loan-core maxPrice(대출 한도 계산기와 같은 함수)', B.cap && B.cap.P === P0 && !B.cap.ex, [B.cap, P0]);
check('몸테크: 단지 시세 = mine-core bandSummary · 최대 집값 이하', B.n > 0 && B.rows.every(r => r.price === MC.bandSummary(r.u, IX.months).price && r.price <= P0), B.n);
check('몸테크: 재건축 단계 연결이거나 준공 30년 넘은 단지만, 이주·착공 단계는 뺌', B.rows.every(r => (r.z && r.z.st < 9) || r.age >= 30));
const ZI = X1.zoneIndex(FX.zones), PL = X1.plainSet(FX.units), uOf = n => FX.units.find(u => u[2] === n);
const zn = n => { const z = X1.zoneOf(ZI, uOf(n), PL); return z ? z.n : ''; };
check('이름 연결: 목동신시가지10 → 목동10단지(목동1단지 아님)', zn('목동신시가지10') === '목동10단지', zn('목동신시가지10'));
check('이름 연결: 목동신시가지1 → 목동1단지', zn('목동신시가지1') === '목동1단지');
check('이름 연결: 한강맨숀 → 한강맨션아파트, 한강(대우)는 연결 안 함', zn('한강맨숀') === '한강맨션아파트' && zn('한강(대우)') === '');
check('이름 연결: 은마 → 은마아파트 · 헬리오시티는 없음', zn('은마') === '은마아파트' && zn('헬리오시티') === '');
const Bm = X1.rebuildRows(Object.assign({}, sb, { size: 'm' }), X, { MC, L });
check('몸테크: 3~4명(60~85㎡)만', Bm.rows.every(r => r.area > 60 && r.area <= 85.5));
const Bc = X1.rebuildRows(Object.assign({}, sb, { sort: 'cheap' }), X, { MC, L }), Bo = X1.rebuildRows(Object.assign({}, sb, { sort: 'old' }), X, { MC, L });
check('몸테크 정렬: 시세 낮은 순 · 오래된 순', Bc.rows.every((r, i) => !i || Bc.rows[i - 1].price <= r.price) && Bo.rows.every((r, i) => !i || (Bo.rows[i - 1].by || 9999) <= (r.by || 9999)));
const Bn = X1.rebuildRows(X1.init('rebuild_live', G.extract('몸테크 현금 5억', CTX)), X, { MC, L });
check('몸테크: 소득을 모르면 소득 기준을 뺀 예시로 표시', Bn.cap && Bn.cap.ex === true && /소득 기준\(DSR\)을 빼고/.test(X1.warnOf('rebuild_live', {}, Bn, X)[0]));
check('몸테크: 금액 전 첫 카드 = 단지 수·단계 분포(가격 거르기 없음)', X1.rebuildRows(X1.init('rebuild_live', { raw: '몸테크' }), X, { MC, L }).n >= B.n);

/* ---------- ④ 카드: 권유 없음·주의점·법령·출처 ---------- */
for (const [id, a] of [['redev_budget', { _nf: X1.init('redev_budget', G.extract('3~5억 재개발 투자', CTX)) }], ['rebuild_live', { _nf: sb }]]) {
  const r = G.solve(SC.sc.find(s => s.id === id), a, { RX: X, MC, L, today: '2026-11-26' });
  const txt = JSON.stringify(Object.assign({}, r, { _R: 0, _st: 0 }));
  check(`${id}: 카드 계산됨`, r && !r.err && !r.need && r.head && r.nums.length >= 2, r && (r.err || r.need));
  check(`${id}: 권유 문구 없음 · 말투`, !G.BAD.test(txt) && !/습니다|사세요|추천\s*단지/.test(txt), (txt.match(G.BAD) || txt.match(/습니다|사세요/) || [])[0]);
  check(`${id}: 빈 값·NaN 없음`, !/NaN|undefined|Infinity/.test(txt));
  check(`${id}: 출처·법령 근거가 모두 출처 표에`, r.src.every(k => SC.src[k]) && r.info.every(x => SC.src[x.src]));
  check(`${id}: 확실하지 않은 규정은 '확인 필요'(지위 양도 예외)`, r.info.some(x => x.src === 'redev39' && x.ok === false));
  check(`${id}: 추천 순위 아님 표시`, /추천 순위가 아니에요/.test(r.tables[0].note));
}
const W1 = X1.warnOf('redev_budget', { loan: 'y', live: 'n' }, R, X).join(' ');
check('재개발 주의점: 입주권/현금청산·권리산정기준일·분담금·이주비·취득세·지위 양도·토허 실거주·대출', ['현금청산', '권리산정기준일', '분담금', '이주비', '취득세', '지위 양도', '토지거래허가', 'LTV'].every(k => W1.indexOf(k) >= 0));
const W2 = X1.warnOf('rebuild_live', {}, B, X).join(' ');
check('몸테크 주의점: 노후 불편·이주·재초환·분담금·지위 양도·비과세 기간·토허', ['주차', '누수', '이주비', '재건축초과이익', '분담금', '조합설립인가', '제154조', '토지거래허가'].every(k => W2.indexOf(k) >= 0));
check('법령 근거: 재초환·비과세 기간 합산은 확인 필요', X1.infoOf('rebuild_live').filter(x => x.src === 'rrc' || x.src === 'cgt154').every(x => !x.ok));

/* ---------- 화면 연결 ---------- */
const gjs = read('assets/guide.js'), gcore = read('assets/guide-core.js'), sw = read('sw.js'), solve = read('solve/index.html'), gx = read('assets/guide-redev.js');
check('guide.js: 즉답·양식·대화에서 이 파일로 넘김', /JDJ_GREDEV\.instant/.test(gjs) && /JDJ_GREDEV\.flow/.test(gjs) && /JDJ_GREDEV\.chatCard/.test(gjs) && /'assets\/guide-redev\.js\?v=4'/.test(gjs));
check('guide-core: 계산 함수·대화 좁히기 연결', /S\.redevBudget/.test(gcore) && /S\.rebuildLive/.test(gcore) && /JDJ_GREDEV\.chatQ/.test(gcore) && G.SOLVERS.indexOf('redevBudget') >= 0 && G.SOLVERS.indexOf('rebuildLive') >= 0);
check('길잡이 화면이 이 파일을 읽음 · 서비스 워커 목록에 있음', /assets\/guide-redev\.js\?v=4/.test(solve) && /assets\/guide-redev\.js\?v=4/.test(sw) && /data\/redev-budget\.json/.test(sw));
check('화면 문구에 경쟁 서비스·AI 이름 없음', !/(호갱노노|직방|아실|리치고|네이버\s*부동산|부동산\s*지인|ChatGPT|GPT|Gemini|Claude|클로드)/i.test(gx));
check('화면: 정렬 단추에 추천 순위 아님 · 즉답 먼저(바로 답)', /추천 순위 아님/.test(gx) && /바로 답/.test(gx));
check('자료 파일: 기간·출처가 있음', BUD.from && BUD.to && /국토교통부/.test(BUD.src) && Object.keys(BUD.z).length > 100);

console.log(`\n재개발 예산·재건축 몸테크 길잡이: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
