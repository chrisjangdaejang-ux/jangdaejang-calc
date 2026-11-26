/* 집예보가 먼저 챙겨 드려요(PROACTIVE) 자동 확인 — 실행: node tools/proactive-test.js </dev/null
   ① 기한 계산(assets/cal-core.js, 손으로 센 날짜): 비과세 보유 2년·거주 2년, 일시적 2주택 처분 기한(2026.10.1 개정: 조정→조정·2026.8.4 이후 2년, 그 밖 3년 — tax-engine 과 같은 값),
      180·90일 단계, 기능이 꺼지면 안 생김, 3채 이상이면 비과세 날짜 없음, 금액 칸 버림
   ② 내 동네 규제·구역 단계(assets/proactive-core.js): 적용 지역·14일·신청일 이후·제외 지역, 단계가 올라간 구역만
   ③ 서버(tools/agent-backend.gs v64, 가짜 시트·메일·공개 자료): 블록 글자 그대로 · 꺼짐(PROACTIVE_ENABLED=false)이면 아무것도 안 감 ·
      켜면 하루 한 통 안에 달력·규제·구역·내 집 단지 거래 · 다시 안 보냄 · 알린 구역 단계 기록 · 끄기 링크 · 금액 없음
   ④ 화면: 기능 플래그 · 소개 페이지 OG·대표 문구 · 기억하는 것 · 구역 따라보기 · 서비스 워커 · 문구 규칙 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = require('../assets/cal-core.js'), A = require('../assets/alerts-core.js'), P = require('../assets/proactive-core.js'), TX = require('../tax/tax-engine.js');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 700) : ''); } }

/* ---------- ① 기한 ---------- */
const K = '11710|잠실동|35|잠실엘스|84㎡대', H = c => [{ key: K, name: '잠실엘스 84㎡대', cal: c }];
const T0 = '2026-11-26', ON = { pro: true, n: 1 };
let ev = C.events(H({ t: 'own', acq: '2024-12-20', adj: 'y', rs: '2025-01-10' }), T0, ON);
const by = k => ev.filter(e => e.k === k);
check('보유 2년: 취득 2024-12-20 → 2026-12-20', by('hold2').length === 1 && by('hold2')[0].d === '2026-12-20', by('hold2'));
check('거주 2년: 전입 2025-01-10 → 2027-01-10(조정대상지역 취득)', by('live2').length === 1 && by('live2')[0].d === '2027-01-10');
check('보유 2년 문구: 12억 원 초과분 과세·여유 있게·세무사 확인, 조정대상지역이면 거주도', /12억 원/.test(by('hold2')[0].s) && /세무사/.test(by('hold2')[0].s) && /2년 이상 살기도/.test(by('hold2')[0].p));
check('전입이 취득보다 먼저면 취득일부터 셈', C.events(H({ t: 'own', acq: '2025-03-01', adj: 'y', rs: '2024-01-01' }), T0, ON).find(e => e.k === 'live2').d === '2027-03-01');
check('취득 당시 조정대상지역 아님 → 거주 날짜 없음·문구로 알림', (() => { const e = C.events(H({ t: 'own', acq: '2025-03-01', adj: 'n', rs: '2025-03-01' }), T0, ON); return !e.some(x => x.k === 'live2') && /거주 요건\)은 없어요/.test(e.find(x => x.k === 'hold2').p); })());
check('2017.8.3 전 취득은 거주 요건 없음', !C.events(H({ t: 'own', acq: '2017-01-10', adj: 'y', rs: '2017-01-10' }), '2017-06-01', ON).some(e => e.k === 'live2'));
check('3채 이상이면 비과세 날짜 없음', !C.events(H({ t: 'own', acq: '2024-12-20' }), T0, { pro: true, n: 3 }).some(e => e.k === 'hold2'));
check('기능이 꺼져 있으면(pro 없음) 새 날짜가 하나도 안 생김', !C.events(H({ t: 'own', acq: '2024-12-20', adj: 'y', rs: '2025-01-10', t2: { d: '2025-01-05' } }), T0, { n: 1 }).some(e => C.RULES[e.k].pro));
const t2 = (o, today) => C.events(H(Object.assign({ t: 'own', acq: '2023-01-01' }, o)), today || T0, ON).find(e => e.k === 'tmp2');
const ex = (old, nw, oa, na) => TX.tempTwoDeadline(old, oa, nw, na).end;
check('일시적 2주택: 2026.8.4 이후 새 집, 두 집 모두 조정 → 2년(2026-09-01 → 2028-09-01, 세금 계산기와 같음)', t2({ t2: { d: '2026-09-01', oa: 'y', na: 'y' } }, '2028-05-01').d === '2028-09-01' && ex('2023-01-01', '2026-09-01', true, true) === '2028-09-01');
check('일시적 2주택: 8.3 전에 계약금 → 3년', t2({ t2: { d: '2026-09-01', oa: 'y', na: 'y', pre: true } }, '2029-05-01').d === '2029-09-01');
check('일시적 2주택: 8.3 이전 취득 → 3년(2025-02-10 → 2028-02-10, 세금 계산기와 같음)', t2({ t2: { d: '2025-02-10', oa: 'y', na: 'y' } }, '2027-12-01').d === '2028-02-10' && ex('2023-01-01', '2025-02-10', true, true) === '2028-02-10');
check('일시적 2주택: 새 집이 비조정 → 3년', t2({ t2: { d: '2026-09-01', oa: 'y', na: 'n' } }, '2029-05-01').d === '2029-09-01' && ex('2023-01-01', '2026-09-01', true, false) === '2029-09-01');
check('일시적 2주택: 조정 여부를 모르면 더 이른 2년으로 알리고 그렇다고 밝힘', (() => { const e = t2({ t2: { d: '2026-09-01' } }, '2028-05-01'); return e.d === '2028-09-01' && /더 이른 2년 기준/.test(e.s); })());
check('일시적 2주택: 종전 집 산 지 1년 안에 새 집 → 특례 못 받는다는 안내', /1년이 지나기 전/.test(t2({ acq: '2025-06-01', t2: { d: '2026-01-10', oa: 'n', na: 'n' } }, '2028-10-01').p));
const tmpEv = t2({ t2: { d: '2025-02-10', oa: 'y', na: 'y' } }, '2027-08-20');   // 2028-02-10 까지 174일
check('처분 기한 단계: 174일 전 → 180일 단계, 85일 전 → 90일 단계, 매일·주간 모두', C.due([tmpEv], 'daily', {})[0].stage === 'd180' && C.due([Object.assign({}, tmpEv, { dd: 85 })], 'weekly', {})[0].stage === 'd90');
check('처분 기한: 90일 단계를 보냈으면 180일 단계는 안 감', C.due([tmpEv], 'daily', { [tmpEv.id + '|d90']: 1 }).length === 0);
check('다른 날짜는 예전처럼 30·7·1일 단계만(180일 단계 없음)', C.stage(170, 'daily') === '' && C.stage(170, 'daily', true) === 'd180');
check('계약갱신요구 기간 시작·마감, 취득세 60일, 재산세·종부세는 그대로', ['renewO', 'renewC'].every(k => C.events(H({ t: 'jeonse', cs: '2025-08-31', ce: '2027-08-31' }), T0, ON).some(e => e.k === k)) && C.events(H({ t: 'own', acq: '2026-11-10' }), T0, ON).find(e => e.k === 'acq').d === '2027-01-09');
const cl = C.clean({ t: 'own', acq: '2024-12-20', rs: '2025-01-10', adj: 'y', t2: { d: '2026-09-01', oa: 'y', na: 'x', pre: 'yes', price: 1 }, price: 150000, loan: 3 });
check('저장 정리: 날짜·예/아니요만, 금액·모르는 칸 버림', JSON.stringify(cl) === JSON.stringify({ t: 'own', acq: '2024-12-20', sell: '', rs: '2025-01-10', adj: 'y', t2: { d: '2026-09-01', oa: 'y', na: '', pre: false } }), cl);
check('새 규칙은 모두 법령 출처(국가법령정보센터)', ['hold2', 'live2', 'tmp2'].every(k => C.RULES[k].ok && C.RULES[k].src.every(s => /law\.go\.kr/.test(C.SRC[s].url))) && /lsiSeq=290841/.test(C.SRC.tmp26.url) && /expcSeq=338247/.test(C.SRC.own1.url));

/* ---------- ② 규제·구역 ---------- */
const POL = { policies: [
  { id: 'pA', name: '송파구 토지거래허가구역 재지정', types: ['토허'], dir: 'tight', in: ['11710'], not: [], stages: [{ s: '발표', d: '2026-11-18' }, { s: '시행', d: '2026-11-20', note: '효력' }], src: [['서울시 발표', 'https://news.seoul.go.kr/x']] },
  { id: 'pB', name: '강남 일부 해제', types: ['규제지역'], dir: 'ease', in: ['11680'], stages: [{ s: '해제', d: '2026-11-21' }], src: [] },
  { id: 'pC', name: '서울 전역(송파 제외)', types: ['규제지역'], dir: 'tight', in: ['11'], not: ['11710'], stages: [{ s: '시행', d: '2026-11-22' }] },
  { id: 'pD', name: '잠실동만', types: ['토허'], dir: 'tight', in: ['11710:잠실동'], stages: [{ s: '연장', d: '2026-11' }] },
  { id: 'pE', name: '대출 정책', types: ['대출'], in: ['11'], stages: [{ s: '시행', d: '2026-11-25' }] },
  { id: 'pF', name: '옛 지정', types: ['토허'], in: ['11710'], stages: [{ s: '시행', d: '2026-10-01' }] }] };
const AR = P.areas([{ code: '11710', dong: '잠실동' }, { code: '11710', dong: '잠실동' }, { code: '11710', dong: '풍납동' }]);
check('내 동네 목록: 같은 동은 한 번', AR.length === 2);
let re = P.regEvents(POL, AR, '2026-11-26', '2026-11-19', c => c === '11710' ? '송파구' : '');
check('규제 알림: 내 동네만·14일 안·신청일(11/19) 이후·대출만 있는 정책 뺌·제외 지역 뺌', re.map(e => e.key).join() === 'r|pA|시행|2026-11-20', re.map(e => e.key));
check('규제 알림 문구: 동네 이름·단계·출처 링크', /송파구 잠실동, 송파구 풍납동/.test(re[0].t) && /효력이 생겼어요/.test(re[0].t) && re[0].u === 'https://news.seoul.go.kr/x');
re = P.regEvents(POL, AR, '2026-11-12', '', c => '송파구');
check('달만 확인된 단계(2026-11)는 그 달 1일로 보고 "2026년 11월"로 적음', re.some(e => e.key === 'r|pD|연장|2026-11-01' && /^2026년 11월 연장/.test(e.s)));
check('동 단위 정책은 그 동에만', P.regEvents(POL, [{ g: '11710', d: '풍납동' }], '2026-11-12', '', () => '').every(e => e.pid !== 'pD'));
const Z = { stages: { 5: '조합설립인가', 7: '사업시행인가' }, z: [{ id: '11710가락1', n: '가락1', gn: '송파구', umd: '가락동', st: 7, sn: '사업시행인가', h: [[5, '202001'], [7, '202605']] }, { id: '11710가락2', n: '가락2', st: 5, sn: '조합설립인가', h: [] }] };
const ze = P.zoneEvents(Z, [{ id: '11710가락1', st: 5, n: '가락1' }, { id: '11710가락2', st: 5 }, { id: '11710없음', st: 1 }]);
check('구역 단계: 올라간 구역만(5→7), 같은 단계·없는 구역은 안 알림', ze.length === 1 && ze[0].key === 'z|11710가락1|7' && /사업시행인가/.test(ze[0].t) && /2026년 5월/.test(ze[0].s), ze);
check('구역 단계가 자료 고침으로 내려가도 안 알림', P.zoneEvents(Z, [{ id: '11710가락1', st: 8 }]).length === 0);
const pvc = A.cleanPv({ home: true, reg: 'y', zone: true, zones: [{ id: '11710가락1', st: 5, n: '<b>가락1</b>', price: 9 }, { id: 'bad', st: 1 }, { id: '11710가락1', st: 7 }], amt: 1 });
check('설정 정리: 직접 켠 것만 true, 구역은 id·단계·이름만, 잘못된 id·겹침 버림', JSON.stringify(pvc) === JSON.stringify({ home: true, reg: false, zone: true, zones: [{ id: '11710가락1', st: 5, n: 'b 가락1 /b' }], cv: '', at: '' }), pvc);
check('기본 설정은 모두 꺼짐·동의 없음', JSON.stringify(A.cleanPrefs({}).pv) === JSON.stringify({ home: false, reg: false, zone: false, zones: [], cv: '', at: '' }) && !A.pvOk(A.cleanPrefs({}).pv));
check('동의 문구: 새 알림 종류(기한·내 집 단지 거래·규제·재개발 단계)를 따로 적고 판 번호가 있음', /세금·계약 기한 알림/.test(A.PV_TEXT) && /내 집 단지 새 거래/.test(A.PV_TEXT) && /규제지역/.test(A.PV_TEXT) && /재개발·재건축 구역 단계/.test(A.PV_TEXT) && /^pv-\d{4}-\d{2}-\d{2}$/.test(A.PV_V) && A.V === 'alerts-2026-11-26');
const mh = P.mailHtml(ze.concat(P.regEvents(POL, AR, '2026-11-26', '', () => '송파구')), { web: 'https://x/', off: 'https://api?pv=1' });
check('메일 칸: 구역 지도 링크·끄기 링크·설정·기억하는 것 링크, 광고 없음', /villa\/zone\/\?z=/.test(mh) && /pv=1/.test(mh) && /my\/memory\//.test(mh) && !/광고/.test(mh));

/* ---------- ③ 서버 ---------- */
const gs = read('tools/agent-backend.gs');
const blk = (s, n) => { const a = s.indexOf(`/* ${n}-CORE BEGIN`), b = s.indexOf(`/* ${n}-CORE END */`); return a >= 0 && b > a ? s.slice(a, b) : null; };
check('서버 PRO-CORE·CAL-CORE·ALERTS-CORE = 화면 파일(글자 그대로)', blk(gs, 'PRO') && blk(gs, 'PRO') === blk(read('assets/proactive-core.js'), 'PRO') && blk(gs, 'CAL') === blk(read('assets/cal-core.js'), 'CAL') && blk(gs, 'ALERTS') === blk(read('assets/alerts-core.js'), 'ALERTS'));
const LAUNCHED = /PROACTIVE_ENABLED: true,/.test(read('assets/config.js'));
check(LAUNCHED ? '출시 뒤: 서버·화면 기능 플래그 모두 켜짐' : '출시 전: 서버·화면 기능 플래그 모두 꺼짐', LAUNCHED ? /^const PROACTIVE_ENABLED = true;/m.test(gs) : /^const PROACTIVE_ENABLED = false;/m.test(gs) && /PROACTIVE_ENABLED: false,/.test(read('assets/config.js')));
check('서버 v64·v65 변경 요약(맨 위, 따로 실행할 함수 없음)', gs.indexOf('v65 변경 요약') > 0 && gs.indexOf('v65 변경 요약') < gs.indexOf('v64 변경 요약') && gs.indexOf('v64 변경 요약') < gs.indexOf('v63 변경 요약') && /v65 변경 요약 \([^)]*따로 실행할 함수 없음/.test(gs));
/* 출시 스크립트: 미리 보기만(파일은 안 바꿈) */
const LP = require('./proactive-launch.js').plan();
if (!LAUNCHED) {
  const g2 = LP.out.get('tools/agent-backend.gs') || '', top = (gs.slice(0, 40000).match(/\* v(\d+) 변경 요약/g) || []).map(x => +x.match(/\d+/)[0]), nx = Math.max.apply(null, top) + 1;
  check('출시 스크립트: 화면·서버 플래그 켜기 + 서버 새 판(가장 큰 판+1) + alerts/ 검색 열기 + 사이트맵 + 서비스 워커', /PROACTIVE_ENABLED: true,/.test(LP.out.get('assets/config.js') || '') && /^const PROACTIVE_ENABLED = true;/m.test(g2) && g2.indexOf(` * v${nx} 변경 요약`) > 0 && g2.indexOf(` * v${nx} 변경 요약`) < g2.indexOf(` * v${nx - 1} 변경 요약`) && !/noindex/.test(LP.out.get('alerts/index.html') || 'noindex') && /\/alerts\/<\/loc>/.test(LP.out.get('sitemaps/pages.xml') || '') && /jdj-v\d+/.test(LP.out.get('sw.js') || ''), LP.notes);
  check('출시 스크립트: 사이트맵에는 한 번만, 다른 주소는 그대로', (() => { const x = LP.out.get('sitemaps/pages.xml'); return x.split('/alerts/</loc>').length === 2 && x.split('<url>').length === read('sitemaps/pages.xml').split('<url>').length + 1; })());
} else check('출시 뒤: 스크립트를 다시 돌려도 바꿀 것이 없음(서비스 워커 제외)', !LP.out.has('assets/config.js') && !LP.out.has('tools/agent-backend.gs') && !LP.out.has('alerts/index.html'));
check('출시 체크리스트 문서', /proactive-launch\.js --apply/.test(read('docs/launch_checklist.md')) && /noindex/.test(read('docs/launch_checklist.md')) && /pages\.xml/.test(read('docs/launch_checklist.md')));
check('알림톡은 템플릿 자리만(준비 전엔 메일만)', /PV_ALIMTALK = \{ prop: 'SOLAPI_TPL_PROACTIVE', ready: false/.test(gs) && /kakao: \{ ready: \(\) => false/.test(gs));
const HOMEP = { sd: 's00', code: '11710', dong: '잠실동', jibun: '35', apt: '잠실엘스', band: '84㎡대', t: '2026-11-01' };
const ZON = { stages: Z.stages, z: Z.z };
function world(on, consent) {
  consent = consent === undefined ? true : consent;
  const E = require('./gs-harness')({ now: '2026-11-10T07:10:00+09:00', patch: g => g.replace(/^const PROACTIVE_ENABLED = (true|false);/m, `const PROACTIVE_ENABLED = ${!!on};`),
    data: { 'index.json': { sgg: { '11710': { name: '송파구', sido: '서울특별시' } }, sido: [] }, 'chungyak/notices.json': { rows: [] }, 'policy.json': POL, 'redev/zones.json': ZON,
      'today/g/11710.json': { g: '11710', date: '2026-11-26', d0: '2026-11-25', rows: [{ d: '잠실동', j: '35', a: '잠실엘스', b: '84㎡대', dt: 20261124, ar: 84.8, f: 12, p: 300000, day: '2026-11-26', s: '06:01' }] } } });
  const cal = { h: { [K]: { t: 'own', acq: '2024-12-20', adj: 'y', rs: '2025-01-10', t2: { d: '2024-05-20', oa: 'y', na: 'y' } } }, n: 1, ms: 1 };
  const s1 = E.member(1, { homes: [HOMEP], cal: cal });
  const r = E.post({ action: 'alertJoin', s: s1, consent: true, email: 'a@example.com', v: A.V, prefs: { cal: true, pv: { home: true, reg: true, zone: true, zones: [{ id: '11710가락1', st: 5, n: '가락1' }], cv: consent ? '' : A.PV_V } }, pvConsent: consent, pvv: consent ? A.PV_V : '' });
  return { E, s1, r };
}
let W = world(true);
check('켜짐: 내 집 + 먼저 챙겨 드려요만 켜도 신청됨 · alertMine pv:1', W.r.ok && W.r.pv === 1 && W.r.sub.prefs.pv.reg === true && W.r.sub.prefs.pv.zones.length === 1, W.r);
W.E.now = Date.parse('2026-11-26T07:10:00+09:00');
let n0 = W.E.mails.length; W.E.T.alertsDaily();
let mm = W.E.mails.slice(n0).filter(m => m.to === 'a@example.com');
check('하루 한 통: 내 집 단지 새 거래 + 달력(보유 2년·처분 기한) + 내 동네 규제 + 구역 단계', mm.length === 1 && /잠실엘스/.test(mm[0].htmlBody) && /보유 2년이 차는 날/.test(mm[0].htmlBody) && /일시적 2주택/.test(mm[0].htmlBody) && /토지거래허가구역/.test(mm[0].htmlBody) && /사업시행인가/.test(mm[0].htmlBody), mm.map(m => m.subject));
check('메일: 이 알림만 끄기(pv=1) 링크·광고 없음·금액 원문 없음(거래가는 공개 자료)', mm[0] && /alertOff[^"]*pv=1/.test(mm[0].htmlBody) && !/\(광고\)/.test(mm[0].subject));
const subRow = () => W.E.sheets['알림구독'].rows.slice(1).find(x => x[W.E.T.AXC['카카오id']] === 'k1');
check('알린 구역 단계를 설정에 적음(5→7, 다시 안 보내게)', JSON.parse(subRow()[W.E.T.AXC['설정']]).pv.zones[0].st === 7);
check('기록: 종류 pv, 연락처·날짜 원문 없음', W.E.sheets['알림기록'].rows.some(r => r[3] === 'pv') && !JSON.stringify(W.E.sheets['알림기록'].rows).includes('@') && !JSON.stringify(W.E.sheets['알림기록'].rows).includes('2024-12-20'));
W.E.now += 86400000; n0 = W.E.mails.length; W.E.T.alertsDaily();
check('다음 날: 같은 규제·구역 소식은 다시 안 감', !W.E.mails.slice(n0).some(m => m.to === 'a@example.com' && /토지거래허가구역|사업시행인가/.test(m.htmlBody)));
const idA = subRow()[W.E.T.AXC['id']];
const off = W.E.get({ action: 'alertOff', id: idA, t: W.E.T.axTok(idA), pv: '1' }).s;
const pvAfter = JSON.parse(subRow()[W.E.T.AXC['설정']]).pv;
check('끄기 링크(pv=1): 내 집 단지·규제·구역 알림만 꺼지고 다른 설정은 그대로', /구역 알림을 껐어요/.test(off) && !pvAfter.home && !pvAfter.reg && !pvAfter.zone && JSON.parse(subRow()[W.E.T.AXC['설정']]).cal === true);
/* 브리핑 메일 구독자: 브리핑 안에 함께 */
W = world(true); W.E.now = Date.parse('2026-11-26T07:10:00+09:00');
const M = W.E.T.axMorning(new Date(W.E.now)), xb = M.forUser('k1');
check('모닝 브리핑 안에 넣을 칸에 먼저 챙겨 드려요 소식', xb && xb.PVI.length === 3 && /먼저 챙겨 드려요/.test(xb.html), xb && xb.PVI.map(e => e.key));
M.done(xb);
check('브리핑에 넣은 뒤 기록 → 같은 날 다시 안 넣음', W.E.T.axMorning(new Date(W.E.now)).forUser('k1') === null);
/* 기존 구독자(먼저 챙겨 드려요 동의 없음): 켜 두어도 안 감 → 새 문구로 다시 동의하면 감 */
W = world(true, false);
check('동의 없이 신청(화면이 cv 를 지어 보내도 무시) → 동의 기록 없음', W.r.ok && !A.pvOk(W.r.sub.prefs.pv) && W.r.pvv === A.PV_V, W.r.sub && W.r.sub.prefs.pv);
W.E.now = Date.parse('2026-11-26T07:10:00+09:00'); n0 = W.E.mails.length; W.E.T.alertsDaily();
mm = W.E.mails.slice(n0).filter(m => m.to === 'a@example.com');
check('동의 없음: 새 기한·내 집 단지·규제·구역 소식이 메일에 없음', mm.every(m => !/토지거래허가구역|사업시행인가|보유 2년|일시적 2주택|먼저 챙겨 드려요|신고가 거래/.test(m.htmlBody)), mm.map(m => m.subject));
let rp = W.E.post({ action: 'alertPrefs', s: W.s1, prefs: Object.assign({}, W.r.sub.prefs, { pv: Object.assign({}, W.r.sub.prefs.pv, { cv: A.PV_V }) }) });
check('설정 저장으로 동의를 지어 보내도 무시', rp.ok && !A.pvOk(rp.sub.prefs.pv));
rp = W.E.post({ action: 'alertPrefs', s: W.s1, prefs: rp.sub.prefs, pvConsent: true, pvv: A.PV_V });
check('알림 센터에서 새 문구로 다시 동의 → 동의 판·시각 기록', rp.ok && A.pvOk(rp.sub.prefs.pv) && /^2026-11-26T07:10/.test(rp.sub.prefs.pv.at), rp.sub && rp.sub.prefs.pv);
rp = W.E.post({ action: 'alertPrefs', s: W.s1, prefs: Object.assign({}, rp.sub.prefs, { pv: Object.assign({}, rp.sub.prefs.pv, { cv: '' }) }) });
check('동의 뒤 다른 설정을 저장해도 동의는 그대로', A.pvOk(rp.sub.prefs.pv));
W.E.now += 86400000; n0 = W.E.mails.length;
const M3 = W.E.T.axMorning(new Date(W.E.now)), x3 = M3.forUser('k1');
check('다시 동의한 뒤에는 먼저 챙겨 드려요 소식이 들어감', x3 && x3.PVI.length === 3);
/* 꺼짐 */
W = world(false);
check('꺼짐: alertMine pv:0', W.r.ok && W.r.pv === 0);
W.E.now = Date.parse('2026-11-26T07:10:00+09:00'); n0 = W.E.mails.length; W.E.T.alertsDaily();
mm = W.E.mails.slice(n0).filter(m => m.to === 'a@example.com');
check('꺼짐: 규제·구역·내 집 단지·비과세·처분 기한 소식이 메일에 없음(기존 달력만)', mm.every(m => !/토지거래허가구역|사업시행인가|잠실엘스.*신고|보유 2년|일시적 2주택|먼저 챙겨 드려요/.test(m.htmlBody)), mm.map(m => m.subject));

/* ---------- ④ 화면 ---------- */
const cfg = read('assets/config.js'), proj = read('assets/proactive.js'), intro = read('alerts/index.html'), mem = read('my/memory/index.html'), home = read('index.html'), cal = read('mine/calendar/index.html'), center = read('my/alerts/index.html'), zone = read('villa/zone/index.html'), sw = read('sw.js');
check('화면 부품: 플래그가 꺼지면 칸을 만들지 않음 + 미리 보기(?preview=pro)', /PROACTIVE_ENABLED === true/.test(proj) && /if \(!on\(\)\) return '';/.test(proj) && /preview/.test(proj));
check('대표 문구 "집값도, 할 일도 미리 알려 드려요" — 소개 페이지 제목·OG·첫 화면 칸', /<title>집값도, 할 일도 미리 알려 드려요/.test(intro) && /og:title" content="집값도, 할 일도 미리 알려 드려요/.test(intro) && /SLOGAN = '집값도, 할 일도 미리 알려 드려요'/.test(proj) && /집예보가 먼저 챙겨 드려요|가 먼저 챙겨 드려요/.test(proj));
check('소개 페이지: OG 이미지(1200×630)·설명·출시 전 검색 제외·꺼지면 준비 중', /og:image" content="[^"]+assets\/og\/alerts\.png/.test(intro) && fs.existsSync(path.join(ROOT, 'assets/og/alerts.png')) && /og:description/.test(intro) && (LAUNCHED ? !/name="robots" content="noindex"/.test(intro) : /name="robots" content="noindex"/.test(intro) && !/\/alerts\/<\/loc>/.test(read('sitemaps/pages.xml'))) && /준비 중이에요/.test(intro));
check('소개 페이지: 법령 근거 링크와 "곧 나와요"(없는 기능)', ['lsJoLnkSeq=1007847519', 'expcSeq=338247', 'lsiSeq=290841', 'archives/200082'].every(u => intro.includes(u)) && /곧 나와요/.test(intro) && /알림톡/.test(intro));
check('첫 화면·달력·알림 센터·내 집 시세에 칸 자리', /id="proCard"/.test(home) && /JDJ_PRO\.mount\(document\.getElementById\('proCard'\), 'home'\)/.test(home) && /PRO\.mount\(\$\('proCard'\), 'calendar'\)/.test(cal) && /PRO\.mount\(\$\('proCard'\), 'alerts'\)/.test(center) && /'mine'\)/.test(read('mine/index.html')));
check('달력: 전입일·조정대상지역(자동 확인)·일시적 2주택 칸, pro 로 계산, 예상 종부세는 기기에서', /data-f="\$\{k\}"|dateF\('rs'/.test(cal) && /adjusted-areas\.js/.test(cal) && /pro: !!\(PRO && PRO\.on\(\)\)/.test(cal) && /TX\.compTax/.test(cal) && /이 기기에서만 계산/.test(cal));
check('알림 센터: 신청 때 따로 동의 칸(새 알림 종류 문구), 기존 구독자는 켤 때 다시 동의', /id="agreePv"/.test(center) && /AC\.PV_TEXT/.test(center) && /pvConsent: pvC/.test(center) && /id="pvAgreeBtn"/.test(center) && /동의하고 메일로 받기/.test(center) && /pvConsent: true, pvv: AC\.PV_V/.test(center));
check('알림 센터: 먼저 챙겨 드려요 세 가지 스위치(직접 켜기)·구역 합치기·서버 준비 확인', /id="pvHome"|sw\('pvHome'/.test(center) && /sw\('pvReg'/.test(center) && /sw\('pvZone'/.test(center) && /pvMergeLocal/.test(center) && /MINE\.pv === 1/.test(center));
check('기억하는 것: 저장 위치(이 기기·내 계정)·금액은 기기에만·지우기·플래그', /금액은 이 기기에만/.test(mem) && /data-del/.test(mem) && /이 기기 \+ 내 계정/.test(mem) && /PRO\.on\(\)/.test(mem) && /noindex/.test(mem));
check('기억하는 것 목록: 금액 칸(보증금·계산기)은 이 기기에만으로 표시', (() => { global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; global.location = { pathname: '/jangdaejang-calc/', search: '' }; global.window = global; require('../assets/proactive.js'); const I = global.JDJ_PRO.INV; return I.filter(x => x.money && x.id !== 'rp').every(x => x.where === 'device') && ['homes', 'favs', 'cal', 'ta', 'cy', 'alerts', 'zones'].every(id => I.some(x => x.id === id)); })());
check('구역 지도: 따라보기 버튼(플래그)·알림 메일 링크(?z=)', /data-follow/.test(zone) && /PRO\.on\(\)/.test(zone) && /get\('z'\)/.test(zone) && /proactive\.js/.test(zone));
check('서비스 워커: 소개·기억하는 것·화면 부품', /'\.\/alerts\/'/.test(sw) && /'\.\/my\/memory\/'/.test(sw) && /proactive\.js\?v=2/.test(sw));
const words = [intro, mem, proj, cal, center].join('\n');
check('경쟁 앱 이름·회사 이름 없음', !/호갱|직방|아실|리치고|다방|네이버\s?부동산|부동산\s?플래닛|장대장부동산그룹/.test(words));
const say = [proj.match(/sub = \{[\s\S]*?\}\[where\]/)[0], intro.replace(/<[^>]+>/g, ' '), mem.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')].join(' ') + C.events(H({ t: 'own', acq: '2024-12-20', adj: 'y', rs: '2025-01-10', t2: { d: '2026-09-01' } }), '2026-12-01', ON).map(e => e.t + e.s + (e.p || '')).join(' ') + mh;
check('문구: ~요 말투, 딱딱한 말투·보장 표현 없음', !/습니다|십시오|보장|무조건|반드시 오릅/.test(say));

console.log(`\n먼저 챙겨 드려요 확인: ${pass}개 통과, ${fail}개 실패`);
if (fail) process.exitCode = 1;
