/* 분양 상담 연결(성과형 리드, v77) 자동 확인 — 실행: node tools/leads-test.js </dev/null
   ① 숨김: LEADS_ENABLED=false(화면·서버) · 새 화면 검색 제외·준비 중 · 상품 표·개인정보·환불 칸은 켜는 날만 · 다른 화면에 고정 링크 없음
   ② 계산 규칙(assets/leads-core.js = 서버 LEADS-CORE 글자 그대로): 단가(단계·등급·지역 등급·무료 체험) · 등급 A/B/C · 지역 등급(상위 20%·다음 30%·나머지 50%, 15억↑ 한 등급 위)
      · 예산 맞음 · 합침(30일) · 이의 자동 처리(48시간·상한 20%) · 이상한 비율 · 동의 문구
   ③ 서버(가짜 시트·문자·메일): 문 닫힘 · 휴대폰 인증 · 상담 신청(동의·암호화·공유 항목만) · 무료 체험 · 크레딧 차감·잔액 부족 · 합침 · 이의 → 확인 → 네/아니요/48시간
      · 상한 → 예외 → 대표 요약 메일 한 번 누르기 · 방문 확정 · 동의 거두기 · 6개월 뒤 삭제 · 현장 채팅(하트 수) · 결제 잠금
   실제 서버·문자·결제에 접속하지 않아요. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }
const L = require('../assets/leads-core.js');

/* ---------- ① 숨김 ---------- */
const cfg = read('assets/config.js'), GS = read('tools/agent-backend.gs');
check('config: LEADS_ENABLED=false', /LEADS_ENABLED:\s*false\b/.test(cfg) && !/LEADS_ENABLED:\s*true/.test(cfg));
check('서버: LEADS_ENABLED=false · PAID_OPEN=false', /const LEADS_ENABLED = false;/.test(GS) && /const PAID_OPEN = false;/.test(GS));
check('서버: v77 변경 요약이 맨 위', GS.indexOf('v77 변경 요약') > 0 && GS.indexOf('v77 변경 요약') < GS.indexOf('v76 변경 요약'));
const pages = ['ad/console/index.html', 'my/leads/index.html', 'lead/confirm/index.html'];
pages.forEach(p => {
  const h = read(p);
  check(p + ': 검색 제외·주소 전달 막음', /<meta name="robots" content="noindex, nofollow">/.test(h) && /no-referrer/.test(h));
  check(p + ': 꺼져 있으면 준비 중(또는 링크 확인)', /id="soon"/.test(h) && /\$\('soon'\)\.hidden = on/.test(h));
  check(p + ': 규칙·화면 도구를 같은 판으로', h.includes('leads-core.js?v=1') && h.includes('leads.js?v=1') && h.includes('config.js?v=17'));
});
const walk = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name.startsWith('.') || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.html$/.test(e.name)) out.push(p); }); return out; };
const linking = walk(ROOT, []).map(p => path.relative(ROOT, p)).filter(p => !/^(ad\/console|my\/leads|lead\/confirm)\//.test(p)).filter(p => /href="[^"]*(ad\/console|my\/leads|lead\/confirm)\//.test(read(p)));
check('꺼짐: 새 화면으로 가는 고정 링크 없음', linking.length === 0, linking);
const sm = ['sitemap.xml'].concat(fs.readdirSync(path.join(ROOT, 'sitemaps')).map(f => 'sitemaps/' + f)).filter(f => /\.xml$/.test(f));
check('사이트맵에 새 주소 없음', sm.every(f => !/ad\/console|my\/leads|lead\/confirm/.test(read(f))));
const pv = read('privacy/index.html'), rf = read('refund/index.html');
check('개인정보처리방침: 분양 상담 연결 칸은 켜는 날만(제3자 제공·보관·확인 연락)', /<section id="leads2" data-leads-only hidden>/.test(pv) && /받는 자의 보유 기간/.test(pv.slice(pv.indexOf('id="leads2"'))) && /LEADS_ENABLED===true/.test(pv));
check('환불 정책: 크레딧 칸은 켜는 날만 · 48시간 · 20% · 30일 · 5건', /<section id="lead" data-leads-only hidden>/.test(rf) && ['48시간', '20%', '30일', '처음 5건'].every(t => rf.slice(rf.indexOf('id="lead"')).includes(t)));
globalThis.JDJ_SITE = { PAID_OPEN: false };
delete require.cache[require.resolve('../assets/products.js')];
let PR = require('../assets/products.js');
check('상품 안내: 꺼져 있으면 크레딧 상품이 표·목록에 없음', !PR.LIST.some(p => p.id === 'lead_credit') && !PR.table().includes('lead_credit') && PR.get('lead_credit') === null);
globalThis.JDJ_SITE = { PAID_OPEN: false, LEADS_ENABLED: true };
const lc = PR.ALL.find(p => p.id === 'lead_credit');
check('상품 안내: 켜면 보임 · 가장 싼 값 = B등급 3등급 지역 · 무료 체험·하트 수가 규칙과 같음', PR.shown(lc) && PR.table().includes('data-product="lead_credit"') && lc.amount === L.PRICE.lead.B[3]
  && lc.includes.join(' ').includes(`처음 ${L.RULES.trialFree}건`) && lc.includes.join(' ').includes(`하트 ${L.PRICE.chat.hearts}개`));
globalThis.JDJ_SITE = { PAID_OPEN: false };
const ap = read('assets/ads-proto.js'), ads = read('assets/ads.js');
check('광고 카드: leads 스크립트는 켜졌거나 미리 보기일 때만 불러옴', /LEADS_ENABLED === true\) \|\| ls\.get\('jdj_leads_pv'\)/.test(ap) && /LEADS_ENABLED === true\) \|\| pv\)/.test(ads));
check('시안 카드 단추 이름: 상담 받기', ap.includes('data-adp-act="lead">상담 받기</button>'));

/* ---------- ② 계산 규칙 ---------- */
const core = read('assets/leads-core.js'), blk = s => s.slice(s.indexOf('/* LEADS-CORE BEGIN'), s.indexOf('/* LEADS-CORE END */'));
check('LEADS-CORE: 화면과 서버가 글자 하나까지 같음', blk(core).length > 1000 && blk(core) === blk(GS));
const P = L.PRICE;
check('단가: ① 대화 = 하트 2~3개', P.chat.hearts >= 2 && P.chat.hearts <= 3);
check('단가: ② B 2~3만 · A 5~8만(1등급이 가장 비쌈)', [1, 2, 3].every(r => P.lead.B[r] >= 20000 && P.lead.B[r] <= 30000 && P.lead.A[r] >= 50000 && P.lead.A[r] <= 80000) && P.lead.A[1] >= P.lead.A[2] && P.lead.A[2] >= P.lead.A[3] && P.lead.B[1] >= P.lead.B[3]);
check('단가: ③ 방문 확정 +3~5만 · ④ 성공보수 꺼짐', [1, 2, 3].every(r => P.visit[r] >= 30000 && P.visit[r] <= 50000) && P.success.on === false && L.price('success', {}).free === true);
check('값: A등급 1등급 지역 8만', L.price('lead', { grade: 'A', rg: 1 }).won === 80000);
check('값: B등급 3등급 지역 2만', L.price('lead', { grade: 'B', rg: 3 }).won === 20000);
check('값: C등급은 받지 않음', L.price('lead', { grade: 'C', rg: 1 }).won === 0 && L.price('lead', { grade: 'C', rg: 1 }).why === 'grade');
check('값: 무료 체험이 남으면 0원(trial)', L.price('lead', { grade: 'A', rg: 1, trialLeft: 2 }).won === 0 && L.price('lead', { grade: 'A', rg: 1, trialLeft: 2 }).why === 'trial');
check('값: 지역 등급을 모르면 3등급', L.price('lead', { grade: 'A' }).won === P.lead.A[3]);
check('값: 방문 확정 2등급', L.price('visit', { rg: 2 }).won === P.visit[2]);
check('값: 대화 = 하트', L.price('chat', {}).hearts === P.chat.hearts && L.price('chat', {}).won === 0);
check('무료 체험 기본 5건', L.RULES.trialFree === 5);
/* 등급 */
check('등급: 휴대폰 확인 전이면 등급 없음', L.grade({ budget: 'fit', noHome: true, live: 'sgg' }).grade === '');
check('등급: 예산 맞음 + 무주택 + 같은 구 = A', L.grade({ verified: true, budget: 'fit', noHome: true, live: 'sgg' }).grade === 'A');
check('등급: 예산 맞음만 = B', L.grade({ verified: true, budget: 'fit' }).grade === 'B');
check('등급: 예산 안 맞으면 다른 게 많아도 C', L.grade({ verified: true, budget: 'no', noHome: true, cy: 'fit', live: 'sgg', views: 5, plan: true, time: true }).grade === 'C');
check('등급: 확인만 하고 기록 없음 = C', L.grade({ verified: true }).grade === 'C');
check('등급: 같은 구 + 시간 = B(예산 모름)', L.grade({ verified: true, live: 'sgg', time: true }).grade === 'B');
check('등급: 예산 조금 모자람이면 A 아님', L.grade({ verified: true, budget: 'near', noHome: true, cy: 'fit', live: 'sgg', views: 3, plan: true, time: true }).grade === 'B');
check('등급: 관심 깊이(열람 3번·자금 계산·희망 시간)도 셈', L.grade({ verified: true, budget: 'fit', views: 3, plan: true, time: true }).grade === 'A' && L.grade({ verified: true, budget: 'fit', views: 2, plan: true }).grade === 'B');
/* 예산 맞음 */
check('예산: 6~9억 vs 6.2~8.9억 = 맞음', L.budgetFit(60000, 90000, 62000, 89000) === 'fit');
check('예산: 3~6억 vs 6.2억~ = 조금 모자람', L.budgetFit(30000, 60000, 62000, 89000) === 'near');
check('예산: ~3억 vs 6.2억~ = 아님', L.budgetFit(0, 30000, 62000, 89000) === 'no');
check('예산: 15억~ vs 6.2~8.9억 = 아님(예산이 훨씬 큼 — 겹치지 않음)', L.budgetFit(150000, 1e7, 62000, 89000) === 'no');
check('예산: 모르면 빈 값', L.budgetFit(0, 0, 62000, 89000) === '' && L.budgetFit(60000, 90000, 0, 0) === '');
/* 지역 등급 */
const syn = {}; for (let i = 0; i < 10; i++) syn['1' + String(i).padStart(4, '0')] = { s: Array(14).fill(1000 * (10 - i)), c: Array(14).fill(10) };
const RG = L.regionGrades(syn);
check('지역 등급: 10곳 → 1등급 2 · 2등급 3 · 3등급 5', [1, 2, 3].map(g => Object.values(RG).filter(x => x.g === g).length).join() === '2,3,5', RG);
check('지역 등급: 거래 금액 큰 순서', RG['10000'].g === 1 && RG['10001'].g === 1 && RG['10002'].g === 2 && RG['10004'].g === 2 && RG['10005'].g === 3 && RG['10000'].rank === 1);
const syn2 = { a: { s: [9999, 100, 100], c: [999, 1, 1] }, b: { s: [100, 100, 100], c: [5, 5, 5] } };
check('지역 등급: 최근 12개월만(오래된 큰 달은 빼고)', L.regionGrades(syn2, 2).b.amt > L.regionGrades(syn2, 2).a.amt);
check('지역 등급: 거래 금액 = 건수 × 3.3㎡당 가격 × 84㎡ 환산', Math.abs(L.regionGrades({ x: { s: [3000], c: [2] } }, 12).x.amt - Math.round(2 * 3000 * 84 / 3.3058)) <= 1);
check('현장 등급: 분양가 가운데 15억↑ → 한 등급 위 · 1등급은 그대로', L.siteGrade(3, 140000, 170000) === 2 && L.siteGrade(1, 200000, 220000) === 1 && L.siteGrade(2, 60000, 90000) === 2 && L.siteGrade(undefined, 0, 0) === 3);
const T = JSON.parse(read('assets/ad-tiers.json')), cnt = [1, 2, 3].map(g => T.tiers.filter(t => t.t === g).length), N = T.tiers.length;
check('등급표(ad-tiers.json): 새 규칙(20%·30%·50%)으로 만든 것', cnt[0] === Math.ceil(N * 0.2) && cnt[0] + cnt[1] === Math.ceil(N * 0.5) && /상위 20% = 1등급/.test(T.basis) && T.rule && T.rule.top === 20, cnt);
check('광고 상품 안내(/ad/): 등급 기준 문구가 새 규칙', /상위 20%는 1등급/.test(read('ad/index.html')) && !/상위 10~40%/.test(read('ad/index.html')) && /15억 원 이상/.test(read('ad/index.html')));
/* 합침 */
const now = Date.parse('2026-12-01T10:00:00+09:00'), day = 86400000;
const list = [{ id: 'a', ph: 'p1', site: 'S1', at: now - 10 * day, st: L.ST.ok }, { id: 'b', ph: 'p1', site: 'S2', at: now - day, st: L.ST.ok }, { id: 'c', ph: 'p2', site: 'S1', at: now - 40 * day, st: L.ST.ok }, { id: 'd', ph: 'p3', site: 'S1', at: now - day, st: L.ST.gone }];
check('합침: 같은 사람+현장 30일 안', L.dup(list, 'p1', 'S1', now).id === 'a');
check('합침: 다른 현장은 새 신청', !L.dup(list, 'p1', 'S3', now));
check('합침: 30일 지나면 새 신청', !L.dup(list, 'p2', 'S1', now));
check('합침: 동의를 거둔 신청은 합치지 않음', !L.dup(list, 'p3', 'S1', now));
/* 이의 자동 처리 */
const lead = { st: L.ST.ok, at: now - day, won: 30000, free: 0 };
check('이의: 7일 안 과금 신청 → 손님 확인 보냄', L.dispute(lead, { t: 'ask', why: 'noreach' }, now).act === 'send' && L.dispute(lead, { t: 'ask', why: 'deny' }, now).st === L.ST.ask);
check('이의: 7일 지나면 못 냄', L.dispute(Object.assign({}, lead, { at: now - 8 * day }), { t: 'ask', why: 'noreach' }, now).act === '');
check('이의: 무료 신청은 대상 아님', L.dispute(Object.assign({}, lead, { free: 1, won: 0 }), { t: 'ask', why: 'noreach' }, now).act === '');
check('이의: 모르는 이유는 거절', L.dispute(lead, { t: 'ask', why: 'x' }, now).act === '');
const asked = { st: L.ST.ask, at: now - day, askAt: now - 3600e3, won: 30000 }, cap = { billed: 10, refunded: 0 };
check('확인: 네 → 확인됨 + 광고주 알림', L.dispute(asked, { t: 'answer', yes: true }, now, cap).act === 'notify' && L.dispute(asked, { t: 'answer', yes: true }, now, cap).st === L.ST.valid);
check('확인: 아니요 → 자동 환불', L.dispute(asked, { t: 'answer', yes: false }, now, cap).act === 'refund' && L.dispute(asked, { t: 'answer', yes: false }, now, cap).why === 'no');
check('확인: 47시간 무응답이면 아직', L.dispute(Object.assign({}, asked, { askAt: now - 47 * 3600e3 }), { t: 'tick' }, now, cap).act === '');
check('확인: 48시간 무응답 → 자동 환불', L.dispute(Object.assign({}, asked, { askAt: now - 48 * 3600e3 }), { t: 'tick' }, now, cap).act === 'refund');
check('확인: 48시간 지나 [네]를 눌러도 환불(늦은 답)', L.dispute(Object.assign({}, asked, { askAt: now - 49 * 3600e3 }), { t: 'answer', yes: true }, now, cap).act === 'refund');
check('상한: 과금 10건이면 자동 환불 2건까지', L.capOk({ billed: 10, refunded: 1 }) && !L.capOk({ billed: 10, refunded: 2 }));
check('상한: 과금 3건이면 1건까지(올림)', L.capOk({ billed: 3, refunded: 0 }) && !L.capOk({ billed: 3, refunded: 1 }));
check('상한: 넘으면 예외 목록', L.dispute(asked, { t: 'answer', yes: false }, now, { billed: 10, refunded: 2 }).act === 'exc' && L.dispute(asked, { t: 'answer', yes: false }, now, { billed: 10, refunded: 2 }).st === L.ST.exc);
check('이상한 비율: 광고주 이의 40%↑(10건↑)', L.anomaly({ leads: 10, disputes: 4 }, {}).includes('adv_rate') && !L.anomaly({ leads: 9, disputes: 9 }, {}).length && !L.anomaly({ leads: 10, disputes: 3 }, {}).length);
check('이상한 비율: 손님 30일 6건↑ · 아니요 2번↑', L.anomaly({}, { leads30: 6 }).includes('cust_many') && L.anomaly({}, { no: 2 }).includes('cust_no') && !L.anomaly({}, { leads30: 5, no: 1 }).length);
/* 동의 문구 */
const ct = L.consentText({ co: '예시 시행사', site: '예시 현장', fields: ['time', 'budget'] });
check('동의 문구: 받는 곳·현장·목적·항목·보관 기간·거부·거두는 곳·판', ['예시 시행사', '예시 현장', '목적', '희망 상담 시간', '예산 구간', '6개월', '동의하지 않아도', 'my/leads/', L.CONSENT_V].every(t => ct.includes(t)) && !ct.includes('매수 가능 금액'));
check('공유 항목: 금액은 기본으로 체크되지 않음 · 꼭 필요한 건 이름·휴대폰·등급뿐', !L.FIELDS.find(f => f.k === 'amount').def && L.FIELDS.filter(f => f.need).map(f => f.k).join() === 'name,phone,grade');

/* ---------- ③ 서버 ---------- */
const AD_ID = 'AD1A2B3C4D';
function env(o) {
  o = o || {};
  const sms = [], kakao = [];
  const E = require('./gs-harness')({ now: o.now || '2026-12-01T10:00:00+09:00', cache: true,
    patch: g => { if (o.counsel) g = g.replace('const COUNSEL_OPEN = false;', 'const COUNSEL_OPEN = true;').replace('const HEART_OPEN = false;', 'const HEART_OPEN = true;'); return o.closed ? g : g.replace('const LEADS_ENABLED = false;', 'const LEADS_ENABLED = true;'); },
    fetch: (url, opt) => {
      if (/ad-tiers\.json/.test(url)) return { getResponseCode: () => 200, getContentText: () => read('assets/ad-tiers.json') };
      if (/solapi/.test(url)) {
        const m = JSON.parse(opt.payload).messages[0];
        if (m.kakaoOptions) { if (!E.props.SOLAPI_TPL_LEAD_CONFIRM_OK) return { getResponseCode: () => 400, getContentText: () => '{}' }; kakao.push(m); } else sms.push(m);
        return { getResponseCode: () => 200, getContentText: () => '{}' };
      }
      return null;
    } });
  E.sms = sms; E.kakao = kakao;
  E.props.SOLAPI_API_KEY = 'k'; E.props.SOLAPI_API_SECRET = 's'; E.props.SOLAPI_FROM = '0234445008'; E.props.BRIEF_ADMIN_IDS = JSON.stringify(['k900']);
  const run = s => vm.runInContext(s, E.ctx);
  /* 승인된 분양 광고 한 줄(서울 강남구 · 분양가 14~18억 → 가운데 16억: 15억↑ 한 등급 위) */
  run(`(function(){ const sh = adSheet(); const r = ADH.map(() => ''); r[ADC['id']]='${AD_ID}'; r[ADC['회사명']]='예시시행(주)'; r[ADC['단지명']]='예시 강남 더힐'; r[ADC['시도']]='서울특별시'; r[ADC['시군구']]='강남구';
    r[ADC['유형']]='아파트'; r[ADC['세대수']]=300; r[ADC['분양가최저(만원)']]=140000; r[ADC['분양가최고(만원)']]=180000; r[ADC['모집공고승인']]='승인'; r[ADC['공고문URL']]='https://example.com/notice';
    r[ADC['승인']]=true; r[ADC['시작일']]=new Date('2026-11-01T00:00:00+09:00'); r[ADC['종료일']]=new Date('2026-12-31T00:00:00+09:00'); r[ADC['상품']]='분양 상담 연결'; r[ADC['상담받을이메일']]='ads@example.com'; sh.appendRow(r); })()`);
  E.run = run;
  E.admin = E.member(900);
  return E;
}
const otpFlow = (E, s, phone) => {
  const a = E.post({ action: 'leadOtp', s, phone });
  const code = ((E.sms[E.sms.length - 1] || {}).text || '').match(/인증번호 (\d{6})/);
  const v = code ? E.post({ action: 'leadVerify', s, phone, code: code[1] }) : {};
  return { a, code: code && code[1], vt: v.vt, v };
};
const submit = (E, s, vt, extra) => E.post(Object.assign({ action: 'leadSubmit', s, vt, ad: AD_ID, name: '김예시', time: '주말', memo: '84㎡ 궁금해요', mail: 'me@example.com',
  fields: ['time', 'memo', 'budget'], share: { budget: '15억~', cy: '50~64점', amount: 170000 }, sig: { budget: 'fit', noHome: true, live: 'sgg', views: 1 }, agree: true, cv: L.CONSENT_V }, extra || {}));

{ /* 문 닫힘 */
  const E = env({ closed: true }), s = E.member(1);
  check('닫힘: 일반 회원은 인증번호도 못 받음', E.post({ action: 'leadOtp', s, phone: '01012345678' }).code === 'closed');
  check('닫힘: 광고주 화면도 막힘', E.post({ action: 'leadAdv', s }).code === 'closed');
  check('닫힘: 운영자 계정은 열림(미리 보기)', E.post({ action: 'leadOtp', s: E.admin, phone: '01012345678' }).ok === true);
  check('닫힘: 매일·매월 처리도 쉼', E.ctx.leadDaily() === 0 && E.ctx.leadMonthly() === 0);
  check('GET leadConfig: 열림 여부·단가', JSON.parse(E.get({ action: 'leadConfig' }).s).open === false && JSON.parse(E.get({ action: 'leadConfig' }).s).price.chat.hearts === L.PRICE.chat.hearts);
}
{
  const E = env(), s = E.member(1), s2 = E.member(2), adv = E.member(50);
  const advUid = E.run(`csUid('k50')`);
  /* 운영자가 광고주 만들기 */
  check('운영자만 광고주를 만듦', E.post({ action: 'leadAdminAdv', s, co: 'x', ads: AD_ID }).code === 'admin');
  const mk = E.post({ action: 'leadAdminAdv', s: E.admin, co: '예시시행(주)', ads: AD_ID, member: advUid, mail: 'adv@example.com' });
  check('광고주 계정: 무료 체험 5건으로 시작', mk.ok && E.post({ action: 'leadAdv', s: adv }).adv.trial === 5, mk);
  /* 인증 */
  check('인증: 번호 형식', E.post({ action: 'leadOtp', s, phone: '0101' }).code === 'field');
  const o1 = otpFlow(E, s, '010-1111-2222');
  check('인증: 문자로 6자리 → 확인 토큰', o1.a.ok && /^\d{6}$/.test(o1.code || '') && /^[0-9a-f]{64}$/.test(o1.vt || ''), o1);
  check('인증: 인증번호는 시트에 남지 않음', !JSON.stringify(Object.values(E.sheets).map(x => x.rows)).includes(o1.code));
  E.post({ action: 'leadOtp', s: s2, phone: '01033334444' });
  const good = E.sms[E.sms.length - 1].text.match(/인증번호 (\d{6})/)[1], bad = String((+good + 1) % 1000000).padStart(6, '0');
  check('인증: 틀린 번호는 거절', E.post({ action: 'leadVerify', s: s2, phone: '01033334444', code: bad }).code === 'otp');
  check('인증: 다른 번호로 확인 못 함', E.post({ action: 'leadVerify', s: s2, phone: '01099998888', code: '123456' }).code === 'otp');
  /* 신청 */
  check('신청: 동의 없으면 거절', submit(E, s, o1.vt, { agree: false }).code === 'consent');
  check('신청: 동의 문구 판이 다르면 거절', submit(E, s, o1.vt, { cv: 'old' }).code === 'consent');
  const r1 = submit(E, s, o1.vt);
  check('신청: A등급(예산 맞음·무주택·같은 구) · 무료 체험', r1.ok && r1.grade === 'A' && !r1.dup, r1);
  check('신청: 확인 토큰은 한 번만', submit(E, s, o1.vt).code === 'otp');
  const sh = E.sheets['분양리드'].rows, H = sh[0], row = sh[1], c = h => row[H.indexOf(h)];
  check('저장: 이름·휴대폰은 암호화 + 가린 번호 · 원래 번호 없음', /^e1\./.test(c('연락처')) && /^e1\./.test(c('이름')) && c('가린번호') === '010-****-2222' && !JSON.stringify(sh).includes('01011112222') && !JSON.stringify(sh).includes('김예시'));
  const shr = JSON.parse(c('공유'));
  check('저장: 손님이 고른 항목만(가점·금액은 안 고름 → 없음)', shr.v.budget === '15억~' && !('cy' in shr.v) && !('amount' in shr.v) && shr.f.join() === 'time,memo,budget');
  check('저장: 지역 등급 — 강남구 1등급(15억↑여도 1등급)', c('지역등급') === 1);
  check('저장: 무료 체험이라 0원 · 남은 체험 4건', c('금액') === 0 && c('무료') === true && E.post({ action: 'leadAdv', s: adv }).adv.trial === 4);
  check('동의 기록: 시각·판·문구 지문·항목', E.sheets['분양리드동의'].rows.length === 2 && E.sheets['분양리드동의'].rows[1][5] === L.CONSENT_V && /^h[0-9a-f]{16}$/.test(E.sheets['분양리드동의'].rows[1][6]) && E.sheets['분양리드동의'].rows[1][8] === '동의');
  check('광고주 알림 메일이 감', E.mails.some(m => m === 'adv@example.com'));
  check('광고주 알림 메일: 연락처는 넣지 않음(서버 글)', !/연락처: \$\{/.test(GS.slice(GS.indexOf('function ldSubmit'), GS.indexOf('function ldAdvMail'))) && /연락처는 메일에 넣지 않아요/.test(GS));
  const A1 = E.post({ action: 'leadAdv', s: adv });
  check('광고주 화면: 이름·전화가 열림 · 공유 항목 · 무료 표시', A1.leads[0].name === '김예시' && A1.leads[0].phone === '010-1111-2222' && A1.leads[0].share.budget === '15억~' && A1.leads[0].free === true && A1.leads[0].canDispute === false);
  check('광고주 화면: 다른 회원은 못 봄', E.post({ action: 'leadAdv', s: s2 }).code === 'noadv');
  /* 합침 */
  const o1b = otpFlow(E, s, '01011112222'), r1b = submit(E, s, o1b.vt);
  check('합침: 같은 번호·같은 현장 30일 안 → 같은 신청 · 과금·체험 그대로', r1b.dup === true && r1b.id === r1.id && E.sheets['분양리드'].rows.length === 2 && E.post({ action: 'leadAdv', s: adv }).adv.trial === 4);
  /* 체험을 다 쓰면 과금 */
  E.run(`(function(){ const a = ldAdvs()[0]; ldA(a, '무료남은', 0); ldA(a, '크레딧', 100000); })()`);
  const o2 = otpFlow(E, s2, '01033334444'), r2 = submit(E, s2, o2.vt, { sig: { budget: 'fit' }, fields: [] });
  const A2 = E.post({ action: 'leadAdv', s: adv });
  check('과금: B등급 1등급 지역 3만 원 차감', r2.grade === 'B' && A2.adv.credit === 100000 - L.PRICE.lead.B[1] && A2.leads[0].won === L.PRICE.lead.B[1], [r2, A2.adv]);
  check('원장: 차감 기록', E.sheets['분양리드원장'].rows.some(r => r[2] === '차감' && r[3] === -L.PRICE.lead.B[1]));
  /* 이의 → 확인 */
  check('이의: 남의 신청은 못 함', E.post({ action: 'leadDispute', s: s2, id: r2.id, why: 'noreach' }).code === 'noadv');
  check('이의: 무료 신청은 못 함', E.post({ action: 'leadDispute', s: adv, id: r1.id, why: 'noreach' }).code === 'field');
  const d2 = E.post({ action: 'leadDispute', s: adv, id: r2.id, why: 'noreach' });
  check('이의: 손님에게 문자로 확인(알림톡 템플릿 없으면 문자)', d2.ok && d2.sent === 'sms' && /상담 신청하셨나요\?/.test(E.sms[E.sms.length - 1].text) && /lead\/confirm\/#t=[0-9a-f]{64}/.test(E.sms[E.sms.length - 1].text), d2);
  const tok = E.sms[E.sms.length - 1].text.match(/#t=([0-9a-f]{64})/)[1];
  check('이의: 같은 건 두 번 못 냄', E.post({ action: 'leadDispute', s: adv, id: r2.id, why: 'deny' }).code === 'field');
  check('확인 링크: 현장 이름 미리 보기', E.post({ action: 'leadConfirm', t: tok, peek: true }).site === '예시 강남 더힐');
  const cf = E.post({ action: 'leadConfirm', t: tok, ans: 'no' });
  const A3 = E.post({ action: 'leadAdv', s: adv });
  check('아니요 → 자동 환불 · 크레딧 돌아옴 · 연락처 지움', cf.res === 'refund' && A3.adv.credit === 100000 && A3.leads[0].st === L.ST.refund && A3.leads[0].name === '', [cf, A3.adv]);
  check('확인 링크는 한 번만', E.post({ action: 'leadConfirm', t: tok, ans: 'yes' }).code === 'token');
  /* 48시간 무응답 · 상한 */
  const mkLead = (n, ph) => { const sx = E.member(100 + n), o = otpFlow(E, sx, ph); return submit(E, sx, o.vt, { sig: { budget: 'fit' }, fields: [] }); };
  E.run(`(function(){ const a = ldAdvs()[0]; ldA(a, '크레딧', 1000000); })()`);
  const more = [1, 2, 3, 4, 5, 6, 7, 8].map(i => mkLead(i, '0105555' + String(1000 + i)));
  check('과금 건이 더 쌓임', more.every(x => x.ok && !x.dup), more.filter(x => !x.ok));
  /* 이번 달 과금 9건(r2 + 8) → 상한 ceil(9×20%)=2, 이미 1건 환불 → 1건 더 */
  E.post({ action: 'leadDispute', s: adv, id: more[0].id, why: 'deny' });
  E.post({ action: 'leadDispute', s: adv, id: more[1].id, why: 'deny' });
  E.now += 47 * 3600e3; check('47시간: 아직 처리 안 함', E.ctx.leadDaily() === 0);
  E.now += 1 * 3600e3 + 1000; const n48 = E.ctx.leadDaily();
  const A4 = E.post({ action: 'leadAdv', s: adv }), st = id => A4.leads.find(x => x.id === id).st;
  check('48시간 무응답: 하나는 자동 환불 · 상한을 넘는 하나는 예외 목록', n48 === 2 && [st(more[0].id), st(more[1].id)].sort().join() === [L.ST.refund, L.ST.exc].sort().join(), [n48, st(more[0].id), st(more[1].id)]);
  const X = E.post({ action: 'leadAdminExc', s: E.admin });
  check('예외 목록: 상한 이유', X.list.some(x => x.kind === 'cap'), X);
  /* 월간 대표 메일 + 한 번 누르기 */
  E.mails.length = 0; E.ctx.leadMonthly();
  const mm = E.mails.find(m => m && m.htmlBody && /월간 요약/.test(m.subject));
  check('월간 대표 메일: 예외마다 [환불]/[유지] 서명 링크', !!mm && /action=leadExc&amp;id=X|action=leadExc&id=X/.test(mm.htmlBody) && /op=refund/.test(mm.htmlBody) && /op=keep/.test(mm.htmlBody), mm && mm.subject);
  const link = mm.htmlBody.match(/href="([^"]*op=refund[^"]*)"/)[1].replace(/&amp;/g, '&'), q = Object.fromEntries(new URL(link).searchParams);
  check('한 번 누르기: 서명이 틀리면 처리 안 함', /처리하지 못했어요/.test(E.get(Object.assign({}, q, { k: 'bad' })).s));
  check('한 번 누르기: 환불', /환불했어요/.test(E.get(q).s) && E.post({ action: 'leadAdv', s: adv }).leads.filter(x => x.st === L.ST.refund).length === 3);
  check('한 번 누르기: 두 번째는 처리 안 함', /처리하지 못했어요/.test(E.get(q).s));
  /* 방문 확정 */
  const vb = E.post({ action: 'leadAdv', s: adv }).adv.credit, v1 = E.post({ action: 'leadVisit', s: adv, id: more[2].id });
  check('방문 확정: 1등급 지역 5만 원 · 한 번만', v1.ok && v1.won === L.PRICE.visit[1] && E.post({ action: 'leadAdv', s: adv }).adv.credit === vb - L.PRICE.visit[1] && E.post({ action: 'leadVisit', s: adv, id: more[2].id }).already === true, v1);
  check('방문 확정: 환불된 신청은 안 됨', E.post({ action: 'leadVisit', s: adv, id: r2.id }).code === 'field');
  /* 잔액 부족 → 가림 → 충전하면 열림 */
  E.run(`(function(){ const a = ldAdvs()[0]; ldA(a, '크레딧', 0); })()`);
  const rh = mkLead(20, '01077770000'), Ah = E.post({ action: 'leadAdv', s: adv }), hl = Ah.leads.find(x => x.id === rh.id);
  check('잔액 부족: 연락처 가림 · 잔액 부족 상태', hl.st === L.ST.hold && hl.name === '' && hl.phone === '010-****-0000');
  E.post({ action: 'leadAdminAdv', s: E.admin, op: 'credit', adv: Ah.adv.id, won: 50000 });
  const Ah2 = E.post({ action: 'leadAdv', s: adv }), hl2 = Ah2.leads.find(x => x.id === rh.id);
  check('충전하면 열림 · 차감', hl2.st === L.ST.ok && hl2.phone === '010-7777-0000' && Ah2.adv.credit === 50000 - L.PRICE.lead.B[1]);
  /* 손님: 내 신청 · 거두기 */
  const M = E.post({ action: 'leadMine', s });
  check('내 상담 신청: 받은 곳·보낸 항목·보관 기한', M.list.length === 1 && M.list[0].co === '예시시행(주)' && M.list[0].fields.join() === 'time,memo,budget' && /^\d{4}-\d{2}-\d{2}$/.test(M.list[0].until));
  check('남의 신청은 못 거둠', E.post({ action: 'leadWithdraw', s: s2, id: r1.id }).code === 'none');
  E.mails.length = 0;
  const w = E.post({ action: 'leadWithdraw', s, id: r1.id }), rw = E.sheets['분양리드'].rows.find(r => r[0] === r1.id);
  check('거두기: 연락처 바로 지움 · 철회 기록 · 광고주에게 삭제 요청 메일', w.ok && rw[H.indexOf('연락처')] === '' && rw[H.indexOf('이름')] === '' && rw[H.indexOf('상태')] === L.ST.gone
    && E.sheets['분양리드동의'].rows.some(r => r[1] === r1.id && r[8] === '철회') && E.mails.some(m => /동의 철회/.test(m && (m.subject || '') + '') || (typeof m === 'string')), E.mails.map(m => m && m.subject));
  /* 6개월 뒤 자동 삭제 */
  E.now += 190 * day; E.ctx.leadDaily();
  check('6개월 지나면 연락처 자동 삭제(숫자 기록은 남음)', E.sheets['분양리드'].rows.slice(1).every(r => r[H.indexOf('연락처')] === '') && E.sheets['분양리드'].rows.length > 5);
  /* 결제 잠금 */
  check('크레딧 충전: 결제 잠금', E.post({ action: 'leadCreditOrder', s: adv }).code === 'paid_closed');
}
{ /* ① 대화 열기: 고민 상담 채팅 · 현장이 수락할 때 하트 LD_PRICE.chat.hearts 개 */
  const E = env({ counsel: true }), s = E.member(1);
  const pro = E.member(60), proUid = E.run(`csUid('k60')`);
  E.run(`(function(){ const r = []; r[CSPC['id']]='P0000000001'; r[CSPC['회원']]='${proUid}'; r[CSPC['종류']]='sales'; r[CSPC['상태']]=CS_PRO_ST.ok; r[CSPC['이름']]='김상담'; csSheet(SH_CSP).appendRow(CSPH.map((h,i)=>r[i]===undefined?'':r[i]));
    htGrant('${proUid}', 5, '시험'); })()`);
  E.post({ action: 'leadAdminAdv', s: E.admin, co: '예시시행(주)', ads: AD_ID, pro: 'P0000000001' });
  const ch = E.post({ action: 'leadChat', s, ad: AD_ID, title: '잔여 세대', body: '84㎡ 남향 잔여 세대가 있나요? 중도금 대출은 어떻게 되나요?' });
  check('대화 열기: 채팅방이 현장 종류로 열림 · 연락처 안 감', ch.ok && /^R[0-9A-F]{10}$/.test(ch.room) && E.run(`String(csRoomById('${ch.room}').r[CSRMC['종류']])`) === 'site', ch);
  const before = E.run(`htBalance('${proUid}')`), acc = E.post({ action: 'csRoomAccept', s: pro, id: ch.room });
  check('대화 열기: 현장이 수락하면 하트 ' + L.PRICE.chat.hearts + '개', acc.ok && before - E.run(`htBalance('${proUid}')`) === L.PRICE.chat.hearts, [acc, before]);
  check('대화 열기: 성과 보고에 대화 1건', E.sheets['분양리드원장'].rows.some(r => r[2] === '대화'));
}
/* 화면 문구: 경쟁 앱 이름·투자 권유 없음 · ~요체 */
const UI = ['assets/leads.js', 'ad/console/index.html', 'my/leads/index.html', 'lead/confirm/index.html'].map(read).join('\n');
check('화면: 경쟁 앱 이름 없음', !/직방|호갱노노|다방|네이버\s?부동산|아실|리치고|부동산114/.test(UI));
check('화면: 투자 권유·확정 수익 문구 없음', !/확정 수익|수익 보장|투자하세요|사세요|지금 사야|프리미엄 보장|마감임박/.test(UI));
check('화면: 반말 안내 없음(~해라·~하자)', !/해라[.'"]|하자[.'"]/.test(UI));
check('로그: 관심 저장(ads) 받음', /const AD_LOG = \['adv', 'adm', 'adc', 'ads'\]/.test(GS));

console.log(`분양 상담 연결 검증: ${pass}개 통과, ${fail}개 실패`);
if (fail) process.exit(1);
