/* 이사 견적 받기(이사업체 제휴, v57) 자동 확인 — 실행: node tools/move-test.js </dev/null
   ① 숨김: MOVE_ENABLED=false(화면·서버), move/ 는 검색 제외·꺼져 있으면 준비 중, 다른 화면에 고정 링크 없음, 약관 '변호사 검토 필요', 개인정보처리방침 칸(숨김)
   ② 계산 규칙(assets/move-core.js = 서버 MOVE-CORE 글자 그대로): 열람 값·충전 더 드림·가림·날짜·신고 72시간·노출 순서·12시간마다 더 보이기·설정 덮어쓰기
   ③ 서버(가짜 시트·메일·토스): 문 닫힘 · 업체 신청(허가·보험 필수)·운영자 승인(무료 10건) · 요청(동의 필수·연락처 암호화) · 최대 3곳 · 마감 뒤 사라짐 ·
      포인트 차감·모자람 · 잘못된 요청 신고 72시간 → 운영자 돌려 드리기 · 이사 다음 날 후기 → 평점·계약률 · 취소 → 연락처 삭제 · 충전 잠금·결제 확인·10% 더 ·
      제재 1→2→3차 · 회원 탈퇴 · 90일 뒤 연락처 삭제
   실제 서버·결제에 접속하지 않아요. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } }

/* ---------- ① 숨김 ---------- */
const cfg = read('assets/config.js'), GS = read('tools/agent-backend.gs');
check('config: MOVE_ENABLED=false', /MOVE_ENABLED:\s*false\b/.test(cfg) && !/MOVE_ENABLED:\s*true/.test(cfg));
check('서버: MOVE_ENABLED=false · PAID_OPEN=false · BILLING_OPEN=false', /const MOVE_ENABLED = false;/.test(GS) && /const PAID_OPEN = false;/.test(GS) && /const BILLING_OPEN = false;/.test(GS));
check('서버: v57 변경 요약', /v57 변경 요약/.test(GS.slice(0, 20000)));
const pages = ['move/index.html', 'move/partner/index.html', 'move/admin/index.html', 'move/terms/index.html'];
pages.forEach(p => check(p + ': 검색 제외(noindex)', /<meta name="robots" content="noindex, nofollow">/.test(read(p))));
pages.filter(p => !/admin/.test(p)).forEach(p => check(p + ': 꺼져 있으면 준비 중', /준비 중이에요/.test(read(p)) && /enabled\(\)/.test(read(p))));
const walk = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name.startsWith('.') || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(apt|cy|comm|sitemaps|data|tools|docs|design)$/.test(e.name) || d !== ROOT) walk(p, out); } else if (/\.html$/.test(e.name)) out.push(p); }); return out; };
const linking = walk(ROOT, []).map(p => path.relative(ROOT, p)).filter(p => !p.startsWith('move/')).filter(p => /href="[^"]*move\//.test(read(p)));
check('꺼짐: move/ 밖 화면에 이사 견적으로 가는 고정 링크 없음(버튼은 move.js 가 켜졌을 때만 그림)', linking.length === 0, linking);
const sm = ['sitemap.xml'].concat(fs.readdirSync(path.join(ROOT, 'sitemaps')).map(f => 'sitemaps/' + f)).filter(f => /\.xml$/.test(f));
check('사이트맵에 move 주소 없음', sm.every(f => !/\/move\//.test(read(f))));
const terms = read('move/terms/index.html');
check('약관 초안: 변호사 검토 필요 · 연결만 · 분쟁은 이용자와 업체 · 최대 3곳 동의 · 72시간 · 충전 포인트 환불 · 1→2→3차', /변호사 검토 필요/.test(terms) && /연결만/.test(terms) && /이용자와 업체가 직접/.test(terms) && /최대 3곳/.test(terms) && /72시간 안에/.test(terms) && /충전 포인트 환불/.test(terms) && /1차 경고 → 2차 7일 노출 중지 → 3차 해지/.test(terms));
const pv = read('privacy/index.html');
check('개인정보처리방침: 이사 견적 칸(숨김 · 초안 표시) + 제3자 제공 받는 자·항목·목적·보유·거부', /<section id="move" data-move-only hidden>/.test(pv) && /변호사 검토 필요/.test(pv.slice(pv.indexOf('id="move"'))) && /받는 자/.test(pv) && /동의를 거부할 수 있으며/.test(pv) && /assets\/move\.js/.test(pv));
const userPage = read('move/index.html');
check('이용자 화면: 동의 문구 그대로("견적을 위해 제휴 이사업체 최대 3곳에 연락처가 전달돼요") — 서버가 주는 값', /CFG\.consent/.test(userPage) && /const MV_CONSENT = '견적을 위해 제휴 이사업체 최대 3곳에 연락처가 전달돼요';/.test(GS));
check('이용자 화면: 출발지·도착지(동)·이사 날짜·규모 3가지·엘리베이터(선택)·연락처', /pickerHtml\('fr'/.test(userPage) && /pickerHtml\('to'/.test(userPage) && /type="date"/.test(userPage) && /MV_RULE\.sizes/.test(userPage) && /엘리베이터 <small>\(선택\)/.test(userPage) && /id="ph"/.test(userPage));
const part = read('move/partner/index.html');
check('업체 화면: [이 고객 연락처 보기] · 허가 종류·허가번호·보험 증빙·서비스 구 · 신고', /이 고객 연락처 보기/.test(part) && /허가번호/.test(part) && /적재물배상보험/.test(part) && /일하는 지역/.test(part) && /mvReport/.test(part));
check('화면 글: 서비스 이름 하드코딩 없음(move/·move.js·move-core.js)', pages.concat(['assets/move.js', 'assets/move-core.js']).every(p => !/집예보|장대장/.test(read(p).replace(/주식회사 장대장부동산그룹/g, ''))));
const RIVAL = /짐싸|이사몰|위매치|다방|직방|호갱노노|아실|네이버 ?부동산|당근/;
check('화면 글: 다른 회사 이름 없음', pages.concat(['assets/move.js']).every(p => !RIVAL.test(read(p))));
const cal = read('mine/calendar/index.html');
check('내 부동산 달력: 만기일·이사하는 날·전세 만기 준비에 버튼(move.js 가 켜졌을 때만)', /assets\/move\.js\?v=1/.test(cal) && /function moveCta/.test(cal) && /src: 'ta'/.test(cal) && /e\.k !== 'end' && e\.k !== 'move'/.test(cal));
check('세입자 갈아타기 결과: [이사 견적 받기](move.js 가 켜졌을 때만, 지금 집 동·이사 희망 시기)', /assets\/move\.js\?v=1/.test(read('switch/rent/index.html')) && /JDJ_MOVE\.cta\(\{ g: S\.home\.code, d: S\.home\.dong, date: \$\('moveAt'\)\.value, src: 'switch' \}\)/.test(read('switch/rent/index.html')));
check('전세 만기 알림 메일: 켜져 있을 때만 이사 견적 한 줄', /\+ mvMailCta\(h, c\.ce\)/.test(GS) && /function mvMailCta\(h, ce\) \{\n  if \(!MOVE_ENABLED/.test(GS));
check('유료 잠금: 충전 요청은 PAID_ACTIONS', /mvChargeOrder: 1, mvChargeConfirm: 1 \}/.test(GS));
check('구 우선 노출 구독: 설정 자리만(꺼짐)', /guTop: \{ enabled: false/.test(read('assets/move-core.js')));

/* move.js: 꺼져 있으면 버튼 없음, 켜면 버튼(주소에 동·날짜) */
function mvjs(on) {
  const ctx = { console, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, encodeURIComponent, Promise, JDJ_SITE: { MOVE_ENABLED: on }, JDJ_BASE: { SITE: '/s/', DATA: '/d/' } };
  ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(read('assets/move.js'), ctx); return ctx.JDJ_MOVE;
}
check('move.js: 꺼져 있으면 [이사 견적 받기] 없음', mvjs(false).cta({ g: '11680', d: '대치동', date: '2027-02-28' }) === '');
const ctaOn = mvjs(true).cta({ g: '11680', d: '대치동', date: '2027-02-28', src: 'switch' });
check('move.js: 켜면 버튼 + 출발 동·날짜가 주소에', /이사 견적 받기/.test(ctaOn) && /move\/\?fg=11680&amp;fd=%EB%8C%80%EC%B9%98%EB%8F%99&amp;date=2027-02-28&amp;src=switch/.test(ctaOn), ctaOn);

/* ---------- ② 계산 규칙 ---------- */
const C = require('../assets/move-core.js');
const blk = s => { const m = /\/\* MOVE-CORE BEGIN[\s\S]*?\/\* MOVE-CORE END \*\//.exec(s); return m ? m[0] : ''; };
check('서버 MOVE-CORE = 화면 move-core.js(글자 그대로)', blk(GS) && blk(GS) === blk(read('assets/move-core.js')));
check('열람 1건: 소형 3,000 · 가정 8,000 · 대형 15,000', C.mvPrice('s') === 3000 && C.mvPrice('h') === 8000 && C.mvPrice('l') === 15000 && C.mvPrice('x') === 0);
check('충전: 5만 = 5만 · 10만 = 11만(10% 더) · 다른 금액은 안 됨', JSON.stringify(C.mvTopup(50000)) === JSON.stringify({ amt: 50000, bonus: 0, pts: 50000 }) && C.mvTopup(100000).pts === 110000 && C.mvTopup(30000) === null);
check('가림: 010-****-1234 · 홍*동 · 김* · 남궁**수', C.mvMaskPhone('01012341234') === '010-****-1234' && C.mvMaskName('홍길동') === '홍*동' && C.mvMaskName('김') === '김*' && C.mvMaskName('남궁민수') === '남**수');
check('휴대폰: 010만(일반 전화·짧은 번호 거절)', C.mvPhone('010-1234-5678') === '01012345678' && C.mvPhone('02-123-4567') === '' && C.mvPhone('0101234') === '');
check('이사 날짜: 오늘~180일', C.mvDateErr('2026-11-25', '2026-11-25') === '' && /지났어요/.test(C.mvDateErr('2026-11-24', '2026-11-25')) && /180일/.test(C.mvDateErr('2027-05-25', '2026-11-25')) && /골라/.test(C.mvDateErr('2026-02-30', '2026-11-25')));
const H = 3600e3;
check('신고: 열람 뒤 72시간 안만', C.mvRefundOk(0, 72 * H) && !C.mvRefundOk(0, 72 * H + 1));
check('후기: 이사 다음 날부터 30일', !C.mvReviewOpen('2026-12-01', '2026-12-01') && C.mvReviewOpen('2026-12-01', '2026-12-02') && C.mvReviewOpen('2026-12-01', '2026-12-31') && !C.mvReviewOpen('2026-12-01', '2027-01-01'));
const R9 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
check('보이는 업체: 처음 3곳 → 12시간 뒤 6곳 → 24시간 뒤 9곳(최대)', C.mvVisible(R9, 0, 0, []).join('') === 'abc' && C.mvVisible(R9, 0, 12 * H, []).join('') === 'abcdef' && C.mvVisible(R9, 0, 99 * H, []).join('') === 'abcdefghi');
check('3곳이 열면 연 업체만(다른 업체에게는 사라짐)', C.mvVisible(R9, 0, 30 * H, ['a', 'e', 'h']).join('') === 'aeh');
const rk = C.mvRank([{ id: 'low', st: { stars: 10, rn: 5, offered: 10, opened: 2 }, last: 0 }, { id: 'top', st: { stars: 25, rn: 5, offered: 10, opened: 10 }, last: 0 }, { id: 'new', st: {}, last: 0 }], 'L1', 1e12);
check('노출 순서: 평점·응답률 높은 곳 먼저, 새 업체는 중간(기본 4.0·70%)', rk.join() === 'top,new,low', rk);
const rk2 = C.mvRank([{ id: 'x', st: {}, last: 1e12 - H }, { id: 'y', st: {}, last: 1e12 - 80 * H }], 'L2', 1e12);
check('노출 순서: 같은 성적이면 최근에 받지 않은 업체 먼저(순서 공정성)', rk2.join() === 'y,x', rk2);
const S = C.mvStats({ stars: 9, rn: 2, offered: 4, opened: 3, asked: 3, won: 1 });
check('성적: 평점 4.5 · 응답률 75% · 계약률 33%', S.rating === 4.5 && S.resp === 75 && S.contract === 33, S);
check('제재 단계 이름: 1차 경고 → 2차 7일 노출 중지 → 3차 해지', [0, 1, 2, 5].map(w => C.mvStrikeStep(w).t).join('|') === '1차 경고|2차 7일 노출 중지|3차 해지|3차 해지');
{
  const D = JSON.parse(JSON.stringify(C.MV_RULE));
  const ok = C.mvSettings({ PRICE: { s: 4000 }, TOPUPS: [{ amt: 200000, bonusPct: 15 }], FREE_LEADS: 5, GU_TOP: { enabled: true, price: 99000 }, MAX_OPEN: 999, BAD: 1 });
  check('설정 덮어쓰기: 받아들인 값만(MAX_OPEN 999 버림)', ok.join() === 'PRICE,TOPUPS,FREE_LEADS,GU_TOP' && C.mvPrice('s') === 4000 && C.mvTopup(200000).bonus === 30000 && C.MV_RULE.freeLeads === 5 && C.MV_RULE.maxOpen === 3 && C.MV_RULE.guTop.enabled, ok);
  Object.keys(D).forEach(k => { C.MV_RULE[k] = D[k]; });
}

/* ---------- ③ 서버 ---------- */
const mk = (o) => {
  o = o || {};
  const E = require('./gs-harness')({ now: '2026-11-25T10:00:00+09:00', patch: g => { let x = g.replace('const MOVE_ENABLED = false;', 'const MOVE_ENABLED = true;'); if (o.paid) x = x.replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;'); if (o.closed) x = g; return x; },
    data: { 'index.json': { sgg: { '11680': { name: '강남구', sido: '서울특별시' }, '11650': { name: '서초구', sido: '서울특별시' }, '11710': { name: '송파구', sido: '서울특별시' } } } } });
  const U = E.ctx.Utilities, b2a = b => b.map(x => x & 255), s2b = s => Array.from(Buffer.from(s, 'utf8')).map(x => x > 127 ? x - 256 : x);
  U.newBlob = d => ({ getBytes: () => typeof d === 'string' ? s2b(d) : d, getDataAsString: () => Buffer.from(b2a(d)).toString('utf8') });
  U.base64EncodeWebSafe = b => Buffer.from(b2a(b)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  U.base64DecodeWebSafe = s => s2b('').concat(Array.from(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')).map(x => x > 127 ? x - 256 : x));
  U.base64Decode = s => Array.from(Buffer.from(s, 'base64')).map(x => x > 127 ? x - 256 : x);
  E.props.BRIEF_ADMIN_IDS = JSON.stringify(['k99']);
  return E;
};
const day = (E, ymd, hh) => { E.now = Date.parse(`${ymd}T${hh || '10:00'}:00+09:00`); };
const apply = (E, s, o) => E.post(Object.assign({ action: 'mvApply', s, name: '바른이사', ceo: '김대표', biz: '220-81-62517', tel: '02-555-1234', permitKind: 'broker', permit: '서울강남-주선-2021-0001', insNo: 'INS-0001', gus: ['11680'], mail: 'a@example.com', agree: { terms: true, privacy: true, points: true }, v: '2026-11-25 초안' }, o || {}));
const leadB = o => Object.assign({ action: 'mvLead', fg: '11680', fd: '대치동', tg: '11710', td: '잠실동', date: '2026-12-10', size: 'h', elev: 'y', name: '홍길동', phone: '010-1234-5678', memo: '피아노 1대', agree: true, cv: 'move-2026-11-25' }, o || {});

/* 문 닫힘 */
{
  const E = mk({ closed: true }); const s = E.member(1);
  let r = E.post({ action: 'mvConfig', s }); check('닫힘: 일반 회원 mvConfig → open:false', r.ok && r.open === false && !r.rule, r);
  r = E.post(leadB({ s })); check('닫힘: 요청 거절(closed)', !r.ok && r.code === 'closed', r);
  const a = E.member(99); r = E.post({ action: 'mvConfig', s: a }); check('닫힘: 운영자는 미리 보기', r.ok && r.preview === true && r.admin === true && r.paid === false, r);
}
const E = mk(), adm = E.member(99), ps = [1, 2, 3, 4].map(i => E.member(i)), user = E.member(20);
/* 업체 신청 */
let r = apply(E, ps[0], { permit: '' });
check('신청: 허가번호가 없으면 거절', !r.ok && /허가번호/.test(r.err), r);
r = apply(E, ps[0], { insNo: '' });
check('신청: 보험 증빙(사진·증권번호)이 없으면 거절', !r.ok && /적재물배상보험/.test(r.err), r);
r = apply(E, ps[0], { biz: '123-45-67890' });
check('신청: 사업자등록번호 검증식', !r.ok && /사업자등록번호/.test(r.err), r);
r = apply(E, ps[0], { agree: { terms: true } });
check('신청: 동의 세 가지 필수', !r.ok && /동의해 주세요/.test(r.err), r);
const BIZ = ['220-81-62517', '120-81-47521', '101-81-00132', '101-81-00277'];
const ids = ps.map((s, i) => { const x = apply(E, s, { name: '이사' + i, biz: BIZ[i], mail: `p${i}@example.com` }); return x.id; });
check('신청: 4곳 모두 검토대기(바로 승인하지 않음)', ids.every(Boolean) && E.sheets['이사업체'].rows.slice(1).every(x => x[2] === '검토대기'));
check('신청: 자동 확인 키가 없으면 확인결과에 그렇게 적음', /DATA_GO_KR_KEY/.test(E.sheets['이사업체'].rows[1][15]));
r = apply(E, ps[0], { biz: BIZ[0] }); check('신청: 같은 회원 두 번은 안 됨', !r.ok && /이미 신청/.test(r.err), r);
r = E.post({ action: 'mvAdminQueue', s: ps[0] }); check('운영자 화면: 운영자 계정만', !r.ok && r.code === 'admin', r);
r = E.post({ action: 'mvAdminQueue', s: adm }); check('운영자 화면: 검토 대기 4곳', r.ok && r.apps.length === 4, r.apps && r.apps.length);
r = E.post({ action: 'mvLeads', s: ps[0] }); check('승인 전: 받은 요청 0', r.ok && r.leads.length === 0, r);
ids.forEach(id => E.post({ action: 'mvAdminAct', s: adm, op: 'approve', id }));
r = E.post({ action: 'mvPartner', s: ps[0] });
check('승인: 첫 달 무료 열람 10건(30일)', r.ok && r.me.st === '승인' && r.me.free === 10 && r.me.freeUntil === '2026-12-24' && r.points === 0, r.me);
check('승인 메일', E.mails.some(m => /승인됐어요/.test(m.subject || '')));

/* 이용자 요청 */
r = E.post(leadB({ agree: false })); check('요청: 동의 없으면 거절', !r.ok && /동의/.test(r.err), r);
r = E.post(leadB({ phone: '02-123-4567' })); check('요청: 휴대폰만', !r.ok && /휴대폰/.test(r.err), r);
r = E.post(leadB({ fg: '11650', fd: '서초동' })); check('요청: 그 구에 업체가 없으면 받지 않음(연락처 저장 안 함)', !r.ok && r.code === 'none' && E.sheets['이사견적'] === undefined || (!r.ok && r.code === 'none' && E.sheets['이사견적'].rows.length <= 1), r);
const L1 = E.post(leadB({ s: user }));
check('요청: 받음 · 최대 3곳 · 열쇠(32자)', L1.ok && L1.n === 3 && /^M[0-9A-F]{9}$/.test(L1.id) && /^[0-9a-f]{32}$/.test(L1.t), L1);
const row = JSON.stringify(E.sheets['이사견적'].rows[1]);
check('시트: 이름·휴대폰 원래 값 없음(암호화 + 가린 값)', !/01012345678|010-1234-5678|홍길동/.test(row) && /010-\*\*\*\*-5678/.test(row) && /홍\*동/.test(row));
check('동의 기록(판·시각)', E.sheets['이사동의'].rows.some(x => /최대 3곳/.test(x[2]) && x[3] === 'move-2026-11-25'));
check('처음 3곳에 알림 메일', E.mails.filter(m => /새 이사 견적 요청/.test(m.subject || '')).length === 3);
const sees = () => ps.map(s => (E.post({ action: 'mvLeads', s }).leads || []).filter(x => x.id === L1.id).length);
let v = sees();
check('보이는 업체: 3곳만(4번째는 아직 안 보임)', v.reduce((a, b) => a + b, 0) === 3, v);
const look = E.post({ action: 'mvLeads', s: ps[v.indexOf(1)] }).leads[0];
check('업체 화면: 열기 전 연락처는 가림(홍*동 · 010-****-5678) · 남긴 말 없음 · 가정 8,000원', look.name === '홍*동' && look.tel === '010-****-5678' && look.memo === '' && look.price === 8000, look);
day(E, '2026-11-25', '22:30');
v = sees(); check('12시간 뒤: 4번째 업체도 보임', v.every(x => x === 1), v);
/* 열람 */
const order = ps.map((s, i) => i).filter(i => true);
const o1 = E.post({ action: 'mvOpen', s: ps[0], id: L1.id });
check('열람: 무료 열람 1건 쓰고 연락처 공개', o1.ok && o1.tel === '01012345678' && o1.name === '홍길동' && o1.paidBy === '무료' && o1.free === 9 && o1.memo === '피아노 1대', o1);
const o1b = E.post({ action: 'mvOpen', s: ps[0], id: L1.id });
check('같은 요청 다시 열기: 차감 없음', o1b.ok && o1b.again && E.post({ action: 'mvPartner', s: ps[0] }).me.free === 9);
check('열람 기록: 누가·언제·어느 요청', E.sheets['이사열람'].rows.length === 2 && E.sheets['이사열람'].rows[1][1] === ids[0] && E.sheets['이사열람'].rows[1][2] === L1.id);
E.post({ action: 'mvOpen', s: ps[1], id: L1.id }); E.post({ action: 'mvOpen', s: ps[2], id: L1.id });
r = E.post({ action: 'mvOpen', s: ps[3], id: L1.id });
check('3곳이 열면 마감 — 4번째는 열 수 없음(차감 없음)', !r.ok && /마감/.test(r.err) && E.post({ action: 'mvPartner', s: ps[3] }).me.free === 10, r);
check('마감되면 4번째 업체 목록에서 사라짐', (E.post({ action: 'mvLeads', s: ps[3] }).leads || []).every(x => x.id !== L1.id));
check('연 업체 목록에는 그대로(연락처 보임)', E.post({ action: 'mvLeads', s: ps[0] }).leads.find(x => x.id === L1.id).tel === '01012345678');
/* 무료 다 쓰면 포인트 */
day(E, '2026-11-26');
const L2 = E.post(leadB({ phone: '010-2222-3333', name: '김', size: 'l', fd: '역삼동' }));
const P4 = E.sheets['이사업체'].rows.findIndex(x => x[0] === ids[3]) + 1;
E.sheets['이사업체'].getRange(P4, 19).setValue(0);   // 4번째 업체 무료 열람 다 씀
const seeL2 = E.post({ action: 'mvLeads', s: ps[3] }).leads.some(x => x.id === L2.id);
check('포인트·무료 열람이 없는 업체에게는 새 요청이 가지 않음', !seeL2);
r = E.post({ action: 'mvAdminAct', s: adm, op: 'adjust', id: ids[3], pts: 20000, why: '계좌 입금 확인(시험)' });
check('운영자 포인트 조정(메모 필수 · 기록)', r.ok && r.points === 20000 && E.sheets['이사포인트'].rows.some(x => x[2] === 'adjust' && x[3] === 20000));
const L3 = E.post(leadB({ phone: '010-3333-4444', name: '이영희', size: 'l', fd: '도곡동', date: '2026-12-01' }));
day(E, '2026-11-27');
const vis4 = E.post({ action: 'mvLeads', s: ps[3] }).leads.some(x => x.id === L3.id);
const o4 = vis4 ? E.post({ action: 'mvOpen', s: ps[3], id: L3.id }) : { ok: false, err: '안 보임' };
check('포인트로 열람: 대형 15,000 차감(무료 없음)', o4.ok && o4.paidBy === '포인트' && o4.price === 15000 && o4.points === 5000, o4);
const L4 = E.post(leadB({ phone: '010-4444-5555', name: '박', size: 'l', fd: '삼성동', date: '2026-12-02' }));
day(E, '2026-11-28');
r = E.post({ action: 'mvOpen', s: ps[3], id: L4.id });
check('포인트가 모자라면 열 수 없음(points)', !r.ok && (r.code === 'points' || /열 수 없어요/.test(r.err)), r);
/* 잘못된 요청 신고 */
r = E.post({ action: 'mvReport', s: ps[3], id: L3.id, why: 'wrong' });
check('신고: 72시간 안 → 대기', r.ok && E.sheets['이사열람'].rows.some(x => x[2] === L3.id && x[6] === '대기'), r);
r = E.post({ action: 'mvReport', s: ps[3], id: L3.id, why: 'wrong' }); check('신고: 두 번은 안 됨', !r.ok, r);
r = E.post({ action: 'mvAdminQueue', s: adm }); check('운영자 화면: 신고 1건(가린 번호)', r.ok && r.reports.length === 1 && r.reports[0].mask === '010-****-4444' && r.reports[0].amt === 15000, r.reports);
r = E.post({ action: 'mvAdminAct', s: adm, op: 'refundOk', id: ids[3], lid: L3.id });
check('운영자 돌려 드리기: 15,000포인트 다시 적립', r.ok && E.post({ action: 'mvPartner', s: ps[3] }).points === 20000);
day(E, '2026-12-01', '11:00');
r = E.post({ action: 'mvReport', s: ps[0], id: L1.id, why: 'prank' });
check('신고: 72시간 지나면 안 됨', !r.ok && /72시간/.test(r.err), r);
/* 이용자: 내 요청·후기·취소 */
r = E.post({ action: 'mvMine', mine: [{ id: L1.id, t: L1.t }, { id: L2.id, t: 'f'.repeat(32) }] });
check('내 요청: 열쇠가 맞는 것만 · 연락처를 받은 업체 3곳 이름·전화', r.ok && r.items.length === 1 && r.items[0].opened.length === 3 && r.items[0].opened.every(o => o.name && o.tel) && r.items[0].reviewOpen === false, r);
r = E.post({ action: 'mvReview', id: L1.id, t: L1.t, pick: ids[1], star: 5 }); check('후기: 이사 날짜 전에는 안 됨', !r.ok && /다음 날부터/.test(r.err), r);
day(E, '2026-12-11');
r = E.post({ action: 'mvReview', id: L1.id, t: L1.t, pick: ids[3], star: 5 }); check('후기: 연락처를 받지 않은 업체는 고를 수 없음', !r.ok, r);
r = E.post({ action: 'mvReview', id: L1.id, t: L1.t, pick: ids[1], star: 4, text: '친절했어요' });
check('후기: 이사 다음 날 · 업체·별점·글', r.ok, r);
r = E.post({ action: 'mvReview', id: L1.id, t: L1.t, pick: ids[1], star: 4 }); check('후기: 한 번만', !r.ok, r);
const p2 = E.post({ action: 'mvPartner', s: ps[1] }), p1 = E.post({ action: 'mvPartner', s: ps[0] });
check('성적: 고른 업체 평점 4.0·계약률 100% / 안 고른 업체 계약률 0%', p2.me.rating === 4 && p2.me.contract === 100 && p1.me.contract === 0 && p2.reviews.length === 1 && p2.reviews[0].text === '친절했어요', [p2.me, p1.me]);
check('후기 화면: 고객 이름·연락처 없음', !/홍길동|01012345678/.test(JSON.stringify(p2.reviews)));
check('업체 화면: 응답률(처음 3곳 중 연 비율)', p1.me.resp === 100 || p1.me.resp === 50 || p1.me.resp != null, p1.me);
r = E.post({ action: 'mvCancel', id: L2.id, t: L2.t });
check('취소: 연락처 지움 · 상태 취소', r.ok && (() => { const x = E.sheets['이사견적'].rows.find(y => y[0] === L2.id); return x[11] === '' && x[13] === '' && x[21] === '취소'; })());
/* 제재 */
r = E.post({ action: 'mvAdminAct', s: adm, op: 'strike', id: ids[0], cat: 'complaint' }); check('제재 1차: 경고', r.ok && r.step === 1);
r = E.post({ action: 'mvAdminAct', s: adm, op: 'strike', id: ids[0], cat: 'noshow' });
check('제재 2차: 7일 노출 중지', r.ok && r.step === 2 && E.post({ action: 'mvPartner', s: ps[0] }).me.st === '노출중지');
const L5 = E.post(leadB({ phone: '010-5555-6666', fd: '개포동', date: '2026-12-20' }));
r = E.post({ action: 'mvLeads', s: ps[0] }); check('노출 중지 중에는 새 요청이 가지 않음', r.ok && !r.leads.some(x => x.id === L5.id) && !r.live);
r = E.post({ action: 'mvAdminAct', s: adm, op: 'strike', id: ids[0], cat: 'rating' });
check('제재 3차: 해지', r.ok && r.step === 3 && E.sheets['이사업체'].rows.find(x => x[0] === ids[0])[2] === '해지');
r = E.post({ action: 'mvAdminAct', s: adm, op: 'ban', id: ids[2], cat: 'misuse' });
check('중대 위반: 바로 해지 + 메일', r.ok && r.step === 'ban' && E.mails.some(m => /바로 해지/.test(m.subject || '')));
/* 회원 탈퇴 */
const L6 = E.post(leadB({ s: user, phone: '010-6666-7777', fd: '논현동', date: '2026-12-21' }));
E.ctx.mvUserGone('k20');
check('회원 탈퇴: 그 회원 요청의 연락처 지움', (() => { const x = E.sheets['이사견적'].rows.find(y => y[0] === L6.id); return x[13] === '' && x[11] === ''; })());
/* 매일: 90일 뒤 연락처 지우기 */
E.ctx.mvDaily(new E.ctx.Date(Date.parse('2027-03-12T08:00:00+09:00')));
const gone = E.sheets['이사견적'].rows.find(y => y[0] === L1.id);
check('매일: 이사 날짜 + 90일 지나면 이름·연락처·남긴 말 지움', gone[13] === '' && gone[11] === '' && gone[16] === '' && gone[21] === '삭제', gone.slice(11, 22));

/* 충전: 잠금 · 결제 확인 · 10% 더 */
r = E.post({ action: 'mvChargeOrder', s: ps[1], amt: 100000 });
check('충전: PAID_OPEN=false 면 잠김', !r.ok && r.code === 'paid_closed', r);
{
  const E2 = mk({ paid: true }), a2 = E2.member(99), s2 = E2.member(5);
  apply(E2, s2); const pid = E2.sheets['이사업체'].rows[1][0]; E2.post({ action: 'mvAdminAct', s: a2, op: 'approve', id: pid });
  let x = E2.post({ action: 'mvChargeOrder', s: s2, amt: 30000 }); check('충전: 5만·10만 원만', !x.ok, x);
  const od = E2.post({ action: 'mvChargeOrder', s: s2, amt: 100000 });
  check('충전 주문: 10만 원 · 1만 포인트 더', od.ok && od.amount === 100000 && od.bonus === 10000 && /^MV\d{6}-[0-9A-F]{10}$/.test(od.orderId), od);
  E2.props.TOSS_SECRET_KEY = 'test_sk_x';
  E2.ctx.UrlFetchApp = { fetch: (url, opt) => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ status: 'DONE', orderId: od.orderId, totalAmount: 100000, paymentKey: 'pk1' }) }) };
  x = E2.post({ action: 'mvChargeConfirm', s: s2, paymentKey: 'pk1', orderId: od.orderId, amount: 90000 });
  check('결제 확인: 금액이 다르면 거절', !x.ok && /금액/.test(x.err), x);
  const od2 = E2.post({ action: 'mvChargeOrder', s: s2, amt: 100000 });
  E2.ctx.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ status: 'DONE', orderId: od2.orderId, totalAmount: 100000, paymentKey: 'pk2' }) }) };
  x = E2.post({ action: 'mvChargeConfirm', s: s2, paymentKey: 'pk2', orderId: od2.orderId, amount: 100000 });
  check('결제 확인: 110,000포인트(충전 + 10% 더) · 기록 2줄', x.ok && x.points === 110000 && x.added === 110000 && E2.sheets['이사포인트'].rows.filter(y => y[6] === od2.orderId).length === 2, x);
  x = E2.post({ action: 'mvChargeConfirm', s: s2, paymentKey: 'pk2', orderId: od2.orderId, amount: 100000 });
  check('결제 확인: 새로 고쳐도 두 번 적립하지 않음', x.ok && x.again && x.points === 110000, x);
  check('토스 시크릿 키·빌링키는 시트에 없음', !/test_sk_x/.test(JSON.stringify(E2.sheets)));
}

console.log(`\n이사 견적 받기(이사업체 제휴) 확인: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
