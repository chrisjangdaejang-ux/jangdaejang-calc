/* 고민 상담·하트 자동 확인 — 실행: node tools/counsel-test.js </dev/null
   ① 규칙(assets/counsel-core.js): 하트 상품표·사용처·환불 계산(7일 안 안 씀 = 전액, 일부 씀 = 묶음 할인 전 단가로 뺀 나머지, 무상 = 대상 아님)·
      쓰는 순서(무상 먼저, 환불 요청 중인 묶음 건너뜀)·개인정보 가림(전화·주민번호)·간단 욕설·전문가 답변 수 제한·대출은 대출모집인만·위로 올리기 순서
   ② 숨김: config COUNSEL_ENABLED·HEART_ENABLED=false, 서버 COUNSEL_OPEN·HEART_OPEN=false · counsel/ 은 '준비 중'·검색 제외 · 메뉴·링크·sitemap 없음 · 약관 초안 숨김
   ③ 서버(tools/agent-backend.gs): 문 닫힘·운영자 미리 보기 · 질문(로그인·가림·막기) · 전문가 신청 → 승인 전 답변 불가 · 5명 제한 · 상담팀 답변 ·
      연락처는 고른 전문가에게만 · 비공개 상담 · 하트 결제(서버 확인 뒤에만 지급, 금액 위조 거절, PAID_OPEN 잠금) · 하트 쓰기 · 환불 요청 → 운영자 승인 · 신고 임시조치 · 시드 공개 · 탈퇴
   가짜 시트·메일·토스 위에서만 돌고 실제 서버에는 접속하지 않아요. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }
const C = require('../assets/counsel-core.js');

/* ---------- ① 규칙 ---------- */
check('상품표 초안: 3,900원 2개 · 9,900원 6개 · 19,900원 13개 · 49,000원 35개', JSON.stringify(C.PACKS.map(p => [p.won, p.n])) === JSON.stringify([[3900, 2], [9900, 6], [19900, 13], [49000, 35]]));
check('사용처 초안: 1:1 비공개 3 · 위로 올리기 1(24시간) · 지정 질문 2', C.USES.private.n === 3 && C.USES.bump.n === 1 && C.USES.bump.hours === 24 && C.USES.pick.n === 2);
check('묶음 할인 전 단가 = 가장 작은 묶음 1개 값(1,950원)', C.unit() === 1950);
check('상품표: 큰 묶음일수록 1개 값이 싸짐', C.PACKS.map(C.packInfo).every((p, i, a) => !i || p.per < a[i - 1].per));
const D = 86400000, T0 = Date.parse('2026-12-01T10:00:00+09:00');
const lot = (n, won, kind) => ({ kind: kind || 'paid', n, won, at: T0 });
check('환불: 7일 안·안 씀 → 전액', JSON.stringify(C.refund(lot(6, 9900), 0, T0 + 3 * D)) === JSON.stringify({ won: 9900, full: true, why: 'full' }));
check('환불: 일부 씀 → 결제액 − 쓴 하트 × 1,950원', C.refund(lot(6, 9900), 2, T0 + D).won === 9900 - 2 * 1950 && C.refund(lot(6, 9900), 2, T0 + D).why === 'part');
check('환불: 많이 쓰면 0원 아래로 내려가지 않음', C.refund(lot(35, 49000), 30, T0 + D).won === 0);
check('환불: 다 쓰면 환불 금액 없음', C.refund(lot(2, 3900), 2, T0).why === 'none');
check('환불: 무상 하트는 대상 아님', C.refund(lot(3, 0, 'free'), 0, T0).won === 0 && C.refund(lot(3, 0, 'free'), 0, T0).why === 'free');
check('환불: 7일 지난 뒤 안 쓴 하트는 같은 계산(떼는 비율 0 — 대표가 정할 값)', C.REFUND.lateFee === 0 && C.refund(lot(6, 9900), 0, T0 + 8 * D).won === 9900 && C.refund(lot(6, 9900), 0, T0 + 8 * D).full === false);
const lots = [{ id: 'P1', kind: 'paid', left: 2, at: 1 }, { id: 'F1', kind: 'free', left: 1, at: 5 }, { id: 'P2', kind: 'paid', left: 6, at: 3, lock: true }, { id: 'P3', kind: 'paid', left: 6, at: 4 }];
check('하트 쓰기: 무상 먼저 → 오래된 결제 묶음 → 환불 요청 중인 묶음은 건너뜀', JSON.stringify(C.alloc(lots, 4)) === JSON.stringify({ ok: true, take: { F1: 1, P1: 2, P3: 1 } }));
check('하트 쓰기: 모자라면 실패', C.alloc(lots, 10).ok === false);
const mk = C.mask('제 번호 010-1234-5678, 집 02 123 4567, 주민번호 900101-1234567 이에요. 6억 5천, 84㎡, 2024년 3월');
check('개인정보 가림: 휴대폰·지역번호·주민번호 → ***, 금액·면적·날짜는 그대로', mk.hit && !/1234-5678|123 4567|1234567/.test(mk.text) && /6억 5천, 84㎡, 2024년 3월/.test(mk.text), mk.text);
check('개인정보 가림: +82 · 붙여 쓴 번호', !/\d{4}/.test(C.mask('+82 10 9876 5432 / 01098765432').text));
check('간단 욕설: 띄어 쓰거나 기호를 넣어도 걸림', C.bad('씨 발') && C.bad('병.신') && !C.bad('시세가 발표됐어요') && !C.bad('병원 근처 신축'));
check('글 확인: 길이·욕설', !C.checkText('title', '집').ok && C.checkText('title', '전세 계약 갱신 문의').ok && !C.checkText('body', '지랄 같은 집주인 때문에 너무 힘들어요 정말로요').ok);
const pro = (id, kind) => ({ id, kind, ok: true });
check('답변: 확인 전 전문가는 불가', C.canAnswer({ id: 'E1', kind: 'broker', ok: false }, { cat: 'buy' }, []).why === 'unverified');
check('답변: 대출 분류는 대출상담사만', C.canAnswer(pro('E1', 'broker'), { cat: 'loan' }, []).why === 'kind' && C.canAnswer(pro('E2', 'loan'), { cat: 'loan' }, []).ok);
check('답변: 전문가 5명까지(상담팀 답변은 세지 않음)', C.canAnswer(pro('E9', 'tax'), { cat: 'tax' }, [{ pro: 'a' }, { pro: 'b' }, { pro: 'c' }, { pro: 'd' }, { pro: '' }]).ok
  && C.canAnswer(pro('E9', 'tax'), { cat: 'tax' }, [{ pro: 'a' }, { pro: 'b' }, { pro: 'c' }, { pro: 'd' }, { pro: 'e' }]).why === 'full');
check('답변: 한 전문가는 한 번만 · 비공개는 지정된 전문가만', C.canAnswer(pro('E1', 'tax'), { cat: 'tax' }, [{ pro: 'E1' }]).why === 'dup' && C.canAnswer(pro('E1', 'tax'), { cat: 'tax', priv: true, to: 'E2' }, []).why === 'private');
const ord = C.order([{ id: 'a', at: 3 }, { id: 'b', at: 1, up: 100, upAt: 50 }, { id: 'c', at: 2, up: 5, upAt: 4 }, { id: 'd', at: 0, up: 100, upAt: 60 }], 10);
check('목록 순서: 올리기가 살아 있는 질문 먼저(최근 올린 순) → 새 질문 순', ord.map(x => x.id).join('') === 'dbac', ord.map(x => x.id));

/* ---------- ② 숨김 ---------- */
const cfg = read('assets/config.js'), GS = read('tools/agent-backend.gs');
check('config: COUNSEL_ENABLED=false · HEART_ENABLED=false', /COUNSEL_ENABLED:\s*false\b/.test(cfg) && /HEART_ENABLED:\s*false\b/.test(cfg) && !/(COUNSEL|HEART)_ENABLED:\s*true/.test(cfg));
check('서버: COUNSEL_OPEN=false · HEART_OPEN=false · PAID_OPEN=false', /const COUNSEL_OPEN = false;/.test(GS) && /const HEART_OPEN = false;/.test(GS) && /const PAID_OPEN = false;/.test(GS));
const blk = (s, n) => { const a = s.indexOf(`/* ${n}-CORE BEGIN`), b = s.indexOf(`/* ${n}-CORE END */`); return a >= 0 && b > a ? s.slice(a, b) : null; };
check('서버 COUNSEL-CORE = 화면 counsel-core.js(글자 그대로)', !!blk(GS, 'COUNSEL') && blk(GS, 'COUNSEL') === blk(read('assets/counsel-core.js'), 'COUNSEL'));
check('서버: doPost 가 고민 상담 요청을 받음 · 탈퇴 때 지움', /if \(CS_ACTIONS\[b\.action\]\) return out\(csDispatch\(b\)\);/.test(GS) && /try \{ csUserGone\(u\.k\); \} catch \(e\) \{\}/.test(GS));
check('서버: 전문가에게 하트를 나눠 주는 정산 기능 없음', !/(정산|settle|payout)[^\n]*(하트|heart)|(하트|heart)[^\n]*(정산|settle|payout)/i.test(blk(GS, 'COUNSEL') + GS.slice(GS.indexOf('// ===== 고민 상담·하트 ====='))
  .replace(/전문가에게 하트를 나눠 주는 정산 기능은 없음\(세무 확인 뒤\)/g, '')));


/* ---------- ② 숨김(화면) ---------- */
function clientCtx(o) {
  o = o || {};
  const store = Object.assign({}, o.ls || {}), sstore = {};
  const ctx = { console, JSON, Promise, URLSearchParams, setTimeout,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    sessionStorage: { getItem: k => (k in sstore ? sstore[k] : null), setItem: (k, v) => { sstore[k] = String(v); }, removeItem: k => { delete sstore[k]; } },
    location: { pathname: '/jangdaejang-calc/counsel/', search: o.search || '', hash: '' } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(cfg.replace(/if \(typeof document === 'undefined'\) return;/, 'return;') + (o.on ? ';window.JDJ_SITE.COUNSEL_ENABLED=true;' : '') + (o.heart ? ';window.JDJ_SITE.HEART_ENABLED=true;' : '') + (o.paid ? ';window.JDJ_SITE.PAID_OPEN=true;' : ''), ctx);
  vm.runInContext(read('assets/counsel-core.js'), ctx);
  vm.runInContext(read('assets/counsel.js'), ctx);
  return ctx.JDJ_CS;
}
const SES = JSON.stringify({ s: 'a'.repeat(64), nick: '운영자' });
check('꺼짐: enabled·heartOn·payOn 모두 false', [clientCtx().enabled(), clientCtx().heartOn(), clientCtx().payOn()].every(v => v === false));
check('꺼짐: 주소에 ?preview=counsel 만으로는 안 열림', clientCtx({ search: '?preview=counsel' }).enabled() === false);
check('꺼짐: 미리 보기 표시만 있고 로그인이 없으면 안 열림', clientCtx({ ls: { jdj_cs_preview: '1' }, search: '?preview=counsel' }).enabled() === false);
const pvc = clientCtx({ ls: { jdj_cs_preview: '1', jdj_auth: SES }, search: '?preview=counsel' });
check('운영자 미리 보기: 운영자 기기(로그인) + ?preview=counsel → 고민 상담·하트 열림, 결제는 잠김', pvc.enabled() && pvc.heartOn() && !pvc.payOn());
check('운영자 미리 보기: 안쪽 링크에 preview 가 이어짐', /counsel\/heart\/\?preview=counsel$/.test(pvc.link('counsel/heart/')) && /\?id=Q1&preview=counsel$/.test(pvc.link('counsel/?id=Q1')));
check('켜는 날: COUNSEL_ENABLED 만 켜면 하트는 그대로 숨김', clientCtx({ on: true }).enabled() && !clientCtx({ on: true }).heartOn());
check('켜는 날: 결제 버튼은 HEART_ENABLED + PAID_OPEN 둘 다', !clientCtx({ on: true, heart: true }).payOn() && clientCtx({ on: true, heart: true, paid: true }).payOn());
const pages = ['counsel/index.html', 'counsel/expert/index.html', 'counsel/heart/index.html', 'counsel/admin/index.html'];
pages.forEach(f => {
  const h = read(f);
  check(`${f}: 검색 제외(noindex)`, /<meta name="robots" content="noindex, nofollow">/.test(h));
  check(`${f}: 공통 파일(config·counsel-core·counsel·back)`, /assets\/config\.js\?v=\d+/.test(h) && /assets\/counsel-core\.js\?v=1/.test(h) && /assets\/counsel\.js\?v=1/.test(h) && /assets\/back\.js\?v=1" defer/.test(h));
  check(`${f}: 화면 글에 회사 이름·서비스 이름을 직접 쓰지 않음(설정 SITE_NAME 을 씀)`, !/장대장|집예보/.test(h));
});
['counsel/index.html', 'counsel/expert/index.html', 'counsel/heart/index.html'].forEach(f => {
  const h = read(f);
  check(`${f}: 꺼져 있으면 '준비 중'`, /CS\.(enabled|heartOn)\(\)\) \{ app\.innerHTML = CS\.soonHtml\(\); return; \}/.test(h));
  check(`${f}: 사업자 정보(biz.js?v=3)·로그인·탭 메뉴`, /assets\/biz\.js\?v=3/.test(h) && /assets\/auth\.js\?v=\d+/.test(h) && /assets\/tabbar\.js\?v=\d+/.test(h));
});
check('counsel.js: 준비 중 안내', /준비 중이에요/.test(read('assets/counsel.js')) && !/장대장|집예보/.test(read('assets/counsel.js') + read('assets/counsel-core.js').replace(/\/\*[^]*?\*\//g, '')));
check('운영자 화면: 주소 전달 막음(no-referrer) · 머리줄 로그인 칩 없음', /no-referrer/.test(read('counsel/admin/index.html')) && /data-noacct/.test(read('counsel/admin/index.html')));
const walk = (d, out) => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { if (e.name.startsWith('.') || e.name === 'node_modules') return; const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(apt|cy|comm|sitemaps|data|tools|docs|design)$/.test(e.name) || d !== ROOT) walk(p, out); } else if (/\.html$/.test(e.name)) out.push(p); }); return out; };
const all = walk(ROOT, []).map(p => path.relative(ROOT, p));
const unhid = h => h.replace(/<section id="[a-z]+" data-(cs|heart)-only hidden>[^]*?<\/section>/g, '');
const linking = all.filter(p => !p.startsWith('counsel/')).filter(p => /counsel\//.test(unhid(read(p)).replace(/<!--[^]*?-->/g, '')));
check('꺼짐: counsel/ 밖의 어떤 화면에도 고민 상담·하트로 가는 링크가 없음(숨긴 약관 초안 안 제외)', linking.length === 0, linking);
check('꺼짐: 탭 메뉴·공용 배치에 고민 상담 항목이 없음', !/counsel|고민 상담/.test(read('assets/tabbar.js') + read('assets/layout.js')));
const sm = ['sitemap.xml'].concat(fs.readdirSync(path.join(ROOT, 'sitemaps')).map(f => 'sitemaps/' + f)).filter(f => /\.xml$/.test(f));
check('사이트맵에 counsel 주소 없음', sm.every(f => !/\/counsel\//.test(read(f))));
const terms = read('terms/index.html'), priv = read('privacy/index.html'), refund = read('refund/index.html');
check('약관: 고민 상담·하트 조항 초안은 숨김', /<section id="counsel" data-cs-only hidden>/.test(terms) && /<section id="heart" data-heart-only hidden>/.test(terms) && /제44조의2/.test(terms) && /현금이나 다른 포인트로 바꾸거나/.test(terms));
check('개인정보처리방침·환불 정책: 초안 숨김', /<section id="counsel" data-cs-only hidden>/.test(priv) && /<section id="heart" data-heart-only hidden>/.test(refund));
check("'변호사 검토 필요'는 내부 주석에만(화면 글에는 없음)", [terms, priv, refund].every(h => /<!--[^>]*고민 상담[^>]*변호사 검토 필요/.test(h) || /<!--[^>]*하트[^>]*변호사 검토 필요/.test(h))
  && !/고민 상담[^<]{0,40}변호사 검토 필요/.test([terms, priv, refund].map(h => h.replace(/<!--[^]*?-->/g, '')).join('')));
check('숨긴 초안은 COUNSEL_ENABLED(하트는 HEART_ENABLED 도) 켜질 때만 보임', [terms, priv, refund].every(h => /S\.COUNSEL_ENABLED!==true\)return;[^<]*data-cs-only[^<]*S\.HEART_ENABLED!==true\)return;[^<]*data-heart-only/.test(h)));
check('환불 정책 숫자 = 규칙 파일(7일 · 1,950원)', /7일 안에 하나도 쓰지 않은/.test(refund) && refund.includes(C.unit().toLocaleString('ko-KR') + '원') && C.REFUND.days === 7);
const SH = require('../assets/share-head.js');
check('머리줄 공유: 운영자·하트·전문가 화면에는 단추 없음, 고민 상담 목록에는 있음', ['counsel/admin/', 'counsel/heart/', 'counsel/expert/'].every(p => SH.isPrivate('/jangdaejang-calc/' + p)) && !SH.isPrivate('/jangdaejang-calc/counsel/'));
const sw = read('sw.js');
check('서비스 워커: 하트 결제키가 담긴 주소는 저장 안 함 · 공용 파일', /counsel\/heart\/'\) && u\.search\) return;/.test(sw) && /counsel-core\.js\?v=1/.test(sw) && /counsel\.js\?v=1/.test(sw));
/* 시드 글 */
const seed = JSON.parse(read('counsel/seed.json'));
check('시드: 15개 · 모두 draft:true · 분류가 맞음 · 영상 칸(videoUrl) 있음', seed.items.length === 15 && seed.items.every(x => x.draft === true && C.catName(x.cat) && x.videoUrl === '' && /^s\d{2}$/.test(x.sid)) && new Set(seed.items.map(x => x.sid)).size === 15);
check('시드: 제목·질문·답변 길이가 규칙 안', seed.items.every(x => C.checkText('title', x.title).ok && C.checkText('body', x.q).ok && C.checkText('answer', x.a).ok), seed.items.filter(x => !C.checkText('answer', x.a).ok).map(x => x.sid));
check('시드: 답변은 ~요 말투 · 확인할 곳 안내 · 회사 이름 없음', seed.items.every(x => /요\./.test(x.a) && /확인/.test(x.a) && !/장대장/.test(x.q + x.a)));
check('시드: 분류가 고루(매수·매도·전월세·세금·대출·청약·재개발·등기)', ['buy', 'rent', 'tax', 'loan', 'sub', 'redev', 'legal'].every(c => seed.items.some(x => x.cat === c)));

/* ---------- ③ 서버 ---------- */
const sg = b => Array.from(b).map(x => x > 127 ? x - 256 : x), us = a => Buffer.from(a.map(x => x & 255));
let toss = [], tossReply = null, seedJson = null;
function env(o) {
  o = o || {};
  const E = require('./gs-harness')({ now: '2026-12-01T10:00:00+09:00', patch: g => {
    if (o.open) g = g.replace('const COUNSEL_OPEN = false;', 'const COUNSEL_OPEN = true;').replace('const HEART_OPEN = false;', 'const HEART_OPEN = true;');
    if (o.paid) g = g.replace('const PAID_OPEN = false;', 'const PAID_OPEN = true;');
    return g; } });
  Object.assign(E.ctx.Utilities, {
    base64EncodeWebSafe: a => us(a).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: s => sg(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')),
    newBlob: x => typeof x === 'string' ? { getBytes: () => sg(Buffer.from(x, 'utf8')) } : { getDataAsString: () => us(x).toString('utf8') } });
  const base = E.ctx.UrlFetchApp.fetch;
  E.ctx.UrlFetchApp.fetch = (url, opt) => {
    const send = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
    if (/api\.tosspayments\.com/.test(url)) { toss.push({ url, body: opt && opt.payload ? JSON.parse(opt.payload) : null, idem: opt && opt.headers && opt.headers['Idempotency-Key'] }); return send(...tossReply(url, opt && opt.payload ? JSON.parse(opt.payload) : null)); }
    if (/counsel\/seed\.json/.test(url)) return seedJson ? send(200, seedJson) : send(404, {});
    return base(url, opt);
  };
  E.props.TOSS_SECRET_KEY = 'test_sk_dummy';
  E.props.BRIEF_ADMIN_IDS = JSON.stringify(['k900']);
  return E;
}
const sheetRows = (E, n) => (E.sheets[n] ? E.sheets[n].rows : []);
let E = env();
const u1 = E.member(101), adm = E.member(900);
let r = E.post({ action: 'csList', s: u1 });
check('닫힘: 목록은 open:false 만', r.ok && r.open === false && !r.items, r);
r = E.post({ action: 'csAsk', s: u1, cat: 'buy', title: '첫 집 매수 고민이에요', body: '전세 끼고 사는 게 나을지 실거주로 들어가는 게 나을지 궁금해요.' });
check('닫힘: 일반 회원은 질문 못 함', !r.ok && r.code === 'closed', r);
r = E.post({ action: 'csList', s: adm });
check('닫힘: 운영자 계정은 미리 보기로 목록을 봄', r.ok && r.open === true, r);
r = E.post({ action: 'htMine', s: adm });
check('닫힘: 운영자는 하트 화면도 미리 보기', r.ok && r.balance === 0 && r.pay === false, r);

E = env({ open: true });
const a = E.member(1), b2 = E.member(2), p1 = E.member(11), p2 = E.member(12), p3 = E.member(13), pl = E.member(14), boss = E.member(900);
r = E.post({ action: 'csAsk', cat: 'buy', title: '첫 집 매수 고민이에요', body: '전세 끼고 사는 게 나을지 실거주로 들어가는 게 나을지 궁금해요.' });
check('질문: 로그인해야 함', !r.ok && r.code === 'auth', r);
r = E.post({ action: 'csAsk', s: a, cat: 'zzz', title: '첫 집 매수 고민이에요', body: '전세 끼고 사는 게 나을지 실거주로 들어가는 게 나을지 궁금해요.' });
check('질문: 분류 확인', !r.ok && /분류/.test(r.err));
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '첫 집 매수 고민이에요', body: '연락 주세요 010-1234-5678 (주민 900101-1234567) 전세 끼고 사는 게 나을지 궁금해요.' });
const q1 = r.id;
check('질문: 올라감 · 전화·주민번호는 가려서', r.ok && r.masked === true && /^Q[0-9A-F]{10}$/.test(q1), r);
const qrow = sheetRows(E, '상담질문')[1];
check('질문: 시트에 카카오 회원번호 대신 되돌릴 수 없는 값 · 원래 번호 없음', !JSON.stringify(qrow).includes('k1') && !/1234-5678|1234567/.test(JSON.stringify(qrow)), qrow);
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '광고 글입니다', body: '좋은 매물 많아요 https://example.com 에서 보세요 정말 좋아요.' });
check('질문: 인터넷 주소는 막음', !r.ok && r.code === 'filter', r);
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '집주인 때문에 화나요', body: '이 씨발 집주인이 보증금을 안 돌려줘요 어떻게 해야 하나요.' });
check('질문: 욕설은 막음', !r.ok && /욕설/.test(r.err), r);
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '별명 확인', body: '별명이 이상하면 막는지 확인하는 질문이에요 감사합니다.', nick: '집예보 상담팀' });
check('질문: 상담팀·운영자처럼 보이는 별명은 막음', !r.ok && /별명/.test(r.err), r);
r = E.post({ action: 'csList' });
check('목록: 로그인 없이도 봄 · 질문한 사람은 "익명 ○○○○"', r.ok && r.items.length === 1 && /^익명 [0-9A-F]{4}$/.test(r.items[0].who) && r.items[0].cn === '매수·매도', r);
r = E.post({ action: 'csGet', id: q1 });
check('상세: 로그인 없이도 봄 · 가린 본문 · 답변 칸은 로그인 안내', r.ok && /\*\*\*/.test(r.q.body) && r.can.answer.why === 'login', r);

/* 전문가 신청 */
r = E.post({ action: 'csProApply', s: p1, kind: 'broker', name: '김중개', no: '11680-2020-00123', org: '', phone: '010-2222-3333', email: 'p1@example.com', agree: true });
check('전문가 신청: 공인중개사는 사무소 이름 필수', !r.ok && /사무소/.test(r.err), r);
r = E.post({ action: 'csProApply', s: p1, kind: 'broker', name: '김중개', no: '11680-2020-00123', org: '행복공인중개사사무소', area: '강남구', intro: '강남 아파트 매매 15년', phone: '010-2222-3333', email: 'p1@example.com', agree: true });
const e1 = r.id;
check('전문가 신청: 확인 대기로 들어감', r.ok && r.st === '확인 대기', r);
check('전문가 신청: 연락처는 암호화해 보관', !JSON.stringify(sheetRows(E, '상담전문가')).includes('01022223333'));
r = E.post({ action: 'csProApply', s: p1, kind: 'tax', name: '김중개', no: '12345', phone: '010-2222-3333', email: 'p1@example.com', agree: true });
check('전문가 신청: 한 사람 한 신청', !r.ok, r);
r = E.post({ action: 'csAnswer', s: p1, id: q1, text: '실거주 요건과 대출 조건을 먼저 확인해 보시는 게 좋아요. 지역마다 달라요.' });
check('승인 전: 답변 못 함', !r.ok && /자격 확인/.test(r.err), r);
r = E.post({ action: 'csProApply', s: pl, kind: 'loan', name: '이대출', no: '2024-00001234', org: '○○저축은행', phone: '010-4444-5555', email: 'pl@example.com', agree: true });
const eL = r.id;
r = E.post({ action: 'csAdminQueue', s: a });
check('운영자 화면: 일반 회원은 못 엶', !r.ok && r.code === 'admin', r);
r = E.post({ action: 'csAdminQueue', s: boss });
check('운영자 화면: 새 질문·전문가 신청(확인할 곳·연락처 보임)', r.ok && r.fresh.length === 1 && r.pros.length === 2 && r.pros[0].phone === '010-2222-3333' && /국가공간정보포털/.test(r.pros[0].where), r.pros);
r = E.post({ action: 'csAdminPro', s: boss, id: e1, op: 'no' });
check('반려는 이유가 있어야', !r.ok, r);
E.mails.length = 0;
r = E.post({ action: 'csAdminPro', s: boss, id: e1, op: 'ok' });
check('승인 + 결과 메일', r.ok && E.mails.some(m => m.to === 'p1@example.com'), E.mails);
E.post({ action: 'csAdminPro', s: boss, id: eL, op: 'ok' });
r = E.post({ action: 'csAnswer', s: p1, id: q1, text: '실거주 요건과 대출 조건을 먼저 확인해 보시는 게 좋아요. 지역마다 달라요.' });
const ans1 = r.id;
check('승인 뒤: 답변 올라감', r.ok && !r.hold, r);
r = E.post({ action: 'csAnswer', s: p1, id: q1, text: '한 번 더 답해 보려고 합니다. 같은 전문가는 한 번만 되나요?' });
check('같은 전문가는 한 번만', !r.ok && /이미 답했/.test(r.err), r);
r = E.post({ action: 'csAnswer', s: boss, id: q1, text: '집예보 상담팀이에요. 실거주 의무가 있는지부터 확인해 보세요. 공고문에 적혀 있어요.' });
check('운영자 답변 = 집예보 상담팀', r.ok, r);
r = E.post({ action: 'csGet', id: q1 });
check('상세: 상담팀 답변이 맨 위 · 전문가 답변에 종류·이름·사무소', r.ok && r.answers[0].who.kind === 'team' && r.answers[0].who.name === '집예보 상담팀' && r.answers[1].who.kn === '공인중개사' && r.answers[1].who.org === '행복공인중개사사무소', r.answers);
check('상세: 남에게는 연락처 보냄 여부도 안 보임', r.answers.every(x => x.sent === undefined));
/* 5명 제한 */
const more = [21, 22, 23, 24, 25].map(n => E.member(n));
more.forEach((s, i) => { const x = E.post({ action: 'csProApply', s, kind: 'tax', name: '세무' + '가나다라마'[i], no: '1000' + i, phone: '010-7777-000' + i, email: `t${i}@example.com`, agree: true }); E.post({ action: 'csAdminPro', s: boss, id: x.id, op: 'ok' }); });
const res5 = more.map(s => E.post({ action: 'csAnswer', s, id: q1, text: '세무 관점에서는 취득세와 보유세를 함께 따져 보셔야 해요. 자세한 건 따로 확인해요.' }));
check('전문가 답변은 질문마다 5명까지(상담팀 제외)', res5.slice(0, 4).every(x => x.ok) && !res5[4].ok && /5개/.test(res5[4].err), res5.map(x => x.err || 'ok'));
/* 대출 분류 */
r = E.post({ action: 'csAsk', s: b2, cat: 'loan', title: '주택담보대출 한도 문의', body: '연봉 6천에 신용대출이 조금 있는데 주담대 한도가 어느 정도 나올지 궁금해요.' });
const qL = r.id;
r = E.post({ action: 'csAnswer', s: p1, id: qL, text: '대출 한도는 소득과 기존 대출에 따라 달라요. 은행에 꼭 확인해 보세요.' });
check('대출 질문: 공인중개사는 답 못 함', !r.ok && /대출모집인/.test(r.err), r);
r = E.post({ action: 'csAnswer', s: pl, id: qL, text: 'DSR 규제를 먼저 계산해 보셔야 해요. 기존 신용대출도 함께 들어가요.' });
check('대출 질문: 등록된 대출상담사는 답함', r.ok, r);

/* 연락처 보내기 */
r = E.post({ action: 'csContact', s: b2, aid: ans1, phone: '010-9999-8888', agree: true });
check('연락처: 내 질문이 아니면 못 보냄', !r.ok, r);
r = E.post({ action: 'csContact', s: a, aid: ans1, phone: '010-9999-8888' });
check('연락처: 동의해야 보냄', !r.ok && /동의/.test(r.err), r);
r = E.post({ action: 'csContact', s: a, aid: ans1, phone: '010-9999-8888', note: '저녁에 연락 주세요', agree: true });
check('연락처: 고른 전문가에게 보냄 · 시트에는 암호화', r.ok && r.sent && !JSON.stringify(sheetRows(E, '상담답변')).includes('01099998888'), r);
r = E.post({ action: 'csProMine', s: p1 });
check('전문가 내 답변함: 보낸 연락처가 그 전문가에게만 보임', r.ok && r.answers[0].contact && r.answers[0].contact.phone === '01099998888' && r.answers[0].contact.note === '저녁에 연락 주세요', r.answers);
r = E.post({ action: 'csProMine', s: more[0] });
check('다른 전문가에게는 안 보임', r.ok && r.answers.every(x => !x.contact), r.answers);
r = E.post({ action: 'csGet', s: a, id: q1 });
check('질문한 분: 어느 전문가에게 보냈는지 보임', r.answers.find(x => x.id === ans1).sent === true && r.answers.filter(x => x.sent).length === 1);
r = E.post({ action: 'csContact', s: a, aid: ans1, off: true });
check('연락처: 보낸 것을 거둘 수 있음', r.ok && E.post({ action: 'csProMine', s: p1 }).answers[0].contact === null);

/* 신고 → 임시조치 */
const rp = [E.member(31), E.member(32), E.member(33)];
r = E.post({ action: 'csReport', s: rp[0], id: ans1, why: 'zz' });
check('신고: 이유 골라야', !r.ok);
r = rp.map(s => E.post({ action: 'csReport', s, id: ans1, why: 'ad' }));
check('신고: 쌓이면 바로 가림(임시조치)', r.some(x => x.hidden), r);
r = E.post({ action: 'csGet', id: q1 });
check('가린 답변은 목록에서 빠짐', !r.answers.some(x => x.id === ans1));
r = E.post({ action: 'csAdminQueue', s: boss });
check('운영자: 가린 답변이 검토 칸에', r.holdA.some(x => x.id === ans1 && x.reps.length >= 2), r.holdA);
E.post({ action: 'csAdminAct', s: boss, id: ans1, op: 'show' });
check('운영자: 다시 보이기', E.post({ action: 'csGet', id: q1 }).answers.some(x => x.id === ans1));
r = E.post({ action: 'csAdminAct', s: boss, id: q1, op: 'video', url: 'https://www.youtube.com/watch?v=abcdefghijk' });
check('운영자: 영상으로 답한 고민 연결', r.ok && E.post({ action: 'csGet', id: q1 }).q.video === 'https://www.youtube.com/watch?v=abcdefghijk', r);
check('운영자: 유튜브가 아닌 주소는 거절', !E.post({ action: 'csAdminAct', s: boss, id: q1, op: 'video', url: 'https://evil.example/x' }).ok);

/* 하트: 결제 잠금 */
r = E.post({ action: 'htOrder', s: a, pack: 'h6', agree: true });
check('하트 충전: PAID_OPEN=false 면 서버가 거절', !r.ok && r.code === 'paid_closed', r);
r = E.post({ action: 'csAsk', s: a, cat: 'tax', title: '양도세 비과세 문의', body: '일시적 2주택 비과세 기한이 어떻게 되는지 세무사님께 묻고 싶어요.', use: 'private', to: more[0] && E.post({ action: 'csExperts', kind: 'tax' }).list[0].id });
check('하트 없이 1:1 비공개 상담은 못 함(글도 올라가지 않음)', !r.ok && r.code === 'heart' && !sheetRows(E, '상담질문').some(x => x[5] === '양도세 비과세 문의'), r);

/* 하트: 결제 열림 */
E = env({ open: true, paid: true });
const h = E.member(1), boss2 = E.member(900), tx = E.member(41);
const eT = E.post({ action: 'csProApply', s: tx, kind: 'tax', name: '박세무', no: '12345', org: '박세무회계', phone: '010-1212-3434', email: 'tx@example.com', agree: true }).id;
E.post({ action: 'csAdminPro', s: boss2, id: eT, op: 'ok' });
r = E.post({ action: 'htOrder', s: h, pack: 'h9', agree: true });
check('충전: 없는 묶음 거절', !r.ok);
r = E.post({ action: 'htOrder', s: h, pack: 'h6' });
check('충전: 안내 동의 필요', !r.ok && /동의/.test(r.err));
r = E.post({ action: 'htOrder', s: h, pack: 'h6', agree: true });
const o1 = r;
check('충전 주문: 금액은 서버 상품표(9,900원)', r.ok && r.amount === 9900 && /하트 6개/.test(r.orderName), r);
check('주문만으로는 하트 0개', E.post({ action: 'htMine', s: h }).balance === 0);
toss = []; tossReply = (url, body) => [200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: '2026-12-01T10:05:00+09:00' }];
r = E.post({ action: 'htConfirm', s: h, orderId: o1.orderId, paymentKey: 'pk_test_1', amount: 100 });
check('금액을 바꾼 승인 요청은 토스에 보내지도 않고 거절', !r.ok && toss.length === 0 && /금액/.test(r.err), r);
r = E.post({ action: 'htOrder', s: h, pack: 'h6', agree: true });
const o2 = r;
tossReply = (url, body) => [200, { status: 'DONE', orderId: body.orderId, totalAmount: 100, method: '카드' }];
r = E.post({ action: 'htConfirm', s: h, orderId: o2.orderId, paymentKey: 'pk_test_2', amount: 9900 });
check('토스 응답 금액이 다르면 지급 안 함', !r.ok && E.post({ action: 'htMine', s: h }).balance === 0, r);
const o3 = E.post({ action: 'htOrder', s: h, pack: 'h6', agree: true });
tossReply = (url, body) => [400, { code: 'REJECT_CARD_PAYMENT', message: '한도 초과' }];
r = E.post({ action: 'htConfirm', s: h, orderId: o3.orderId, paymentKey: 'pk_test_3', amount: 9900 });
check('토스 승인 실패면 지급 안 함', !r.ok && E.post({ action: 'htMine', s: h }).balance === 0, r);
const o4 = E.post({ action: 'htOrder', s: h, pack: 'h6', agree: true });
tossReply = (url, body) => [200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: '2026-12-01T10:05:00+09:00' }];
r = E.post({ action: 'htConfirm', s: E.member(77), orderId: o4.orderId, paymentKey: 'pk_test_4', amount: 9900 });
check('다른 사람이 승인 요청하면 거절', !r.ok, r);
toss = [];
r = E.post({ action: 'htConfirm', s: h, orderId: o4.orderId, paymentKey: 'pk_test_4', amount: 9900 });
check('토스 승인 확인 뒤 하트 6개 지급', r.ok && r.n === 6 && r.balance === 6 && toss.length === 1 && toss[0].body.amount === 9900, r);
r = E.post({ action: 'htConfirm', s: h, orderId: o4.orderId, paymentKey: 'pk_test_4', amount: 9900 });
check('같은 승인을 다시 보내도 두 번 지급하지 않음', r.ok && r.balance === 6, r);
/* 쓰기 */
r = E.post({ action: 'csAsk', s: h, cat: 'tax', title: '양도세 비과세 문의', body: '일시적 2주택 비과세 기한이 어떻게 되는지 세무사님께 묻고 싶어요.', use: 'private', to: eT });
const qP = r.id;
check('1:1 비공개 상담: 하트 3개 쓰고 올라감', r.ok && r.hearts === 3, r);
check('비공개 상담: 목록에 안 보임', !E.post({ action: 'csList' }).items.some(x => x.id === qP));
check('비공개 상담: 다른 사람은 못 봄', !E.post({ action: 'csGet', s: E.member(78), id: qP }).ok);
r = E.post({ action: 'csGet', s: tx, id: qP });
check('비공개 상담: 지정된 전문가는 보고 답할 수 있음', r.ok && r.can.answer.ok === true, r.can);
check('지정된 전문가 답변함에 들어옴', E.post({ action: 'csProMine', s: tx }).inbox.some(x => x.id === qP));
r = E.post({ action: 'csAsk', s: h, cat: 'buy', title: '갈아타기 순서 고민', body: '지금 집을 먼저 팔지 새 집을 먼저 살지 순서가 고민이에요. 조언 부탁해요.' });
const qB = r.id;
r = E.post({ action: 'csBump', s: h, id: qB });
check('위로 올리기: 하트 1개 · 24시간', r.ok && r.hearts === 2 && r.until - E.now === 24 * 3600000, r);
check('위로 올리기: 목록 맨 위', E.post({ action: 'csList' }).items[0].id === qB && E.post({ action: 'csList' }).items[0].upOn === true);
check('위로 올리기: 이미 올라가 있으면 다시 안 씀', !E.post({ action: 'csBump', s: h, id: qB }).ok && E.post({ action: 'htMine', s: h }).balance === 2);
r = E.post({ action: 'csAsk', s: h, cat: 'tax', title: '세무사 지정 질문', body: '증여세 신고 기한과 필요한 서류가 궁금해서 지정해서 여쭤봐요.', use: 'pick', to: eT });
check('지정 질문: 하트 2개(남은 0개)', r.ok && r.hearts === 0, r);
r = E.post({ action: 'csBump', s: h, id: r.id });
check('하트가 모자라면 못 씀', !r.ok && r.code === 'heart', r);
let m = E.post({ action: 'htMine', s: h });
check('내역: 사용 3건(무엇에 썼는지)', m.uses.length === 3 && m.uses.some(x => /비공개/.test(x.what)), m.uses);
check('내역: 다 쓴 묶음은 환불 금액 없음', m.lots[0].left === 0 && m.lots[0].refund.why === 'none', m.lots);
/* 환불 */
const o5 = E.post({ action: 'htOrder', s: h, pack: 'h13', agree: true });
E.post({ action: 'htConfirm', s: h, orderId: o5.orderId, paymentKey: 'pk_test_5', amount: 19900 });
E.now += 2 * 86400000;
m = E.post({ action: 'htMine', s: h });
const lot13 = m.lots.find(x => x.n === 13);
check('7일 안·안 쓴 묶음: 전액 환불 안내', lot13.refund.won === 19900 && lot13.refund.full, lot13);
const lot6 = m.lots.find(x => x.n === 6);
r = E.post({ action: 'htRefundReq', s: h, lot: lot6.id });
check('다 쓴 묶음은 환불 요청 불가', !r.ok, r);
E.now += 25 * 3600000;
r = E.post({ action: 'csBump', s: h, id: qB });
check('올림이 끝난 뒤 다시 올리기 → 13개 묶음에서 1개', r.ok && r.hearts === 12, r);
m = E.post({ action: 'htMine', s: h });
const l13 = m.lots.find(x => x.n === 13);
check('일부 쓴 묶음: 19,900 − 1 × 1,950', l13.refund.won === 19900 - 1950 && !l13.refund.full, l13);
r = E.post({ action: 'htRefundReq', s: h, lot: l13.id, why: '생각보다 안 쓰게 돼서요' });
check('환불 요청: 계산한 금액으로 접수 · 바로 환불하지 않음', r.ok && r.won === 17950 && toss.filter(x => /cancel/.test(x.url)).length === 0, r);
check('환불 요청 중인 묶음은 잔액에서 빠짐(더 못 씀)', E.post({ action: 'htMine', s: h }).balance === 0);
r = E.post({ action: 'csAdminQueue', s: boss2 });
check('운영자: 환불 요청 목록', r.refunds.length === 1 && r.refunds[0].refund === 17950 && r.refunds[0].used === 1, r.refunds);
toss = []; tossReply = (url, body) => [200, { status: 'PARTIAL_CANCELED' }];
r = E.post({ action: 'csAdminRefund', s: h, id: l13.id, op: 'ok' });
check('환불 승인은 운영자만', !r.ok && r.code === 'admin', r);
r = E.post({ action: 'csAdminRefund', s: boss2, id: l13.id, op: 'ok' });
check('운영자 승인 → 토스 부분 취소(그 금액만)', r.ok && r.won === 17950 && toss.length === 1 && /pk_test_5\/cancel$/.test(toss[0].url) && toss[0].body.cancelAmount === 17950, toss);
m = E.post({ action: 'htMine', s: h });
check('환불 끝: 내역에 남고 잔액 0', m.balance === 0 && m.refunds.length === 1 && m.refunds[0].won === 17950, m);
r = E.post({ action: 'csAdminRefund', s: boss2, id: l13.id, op: 'ok' });
check('같은 환불을 두 번 하지 않음', !r.ok);
/* 무상 하트 */
E.post({ action: 'csAdminGrant', s: boss2, id: qB, n: 2, memo: '오픈 기념' });
m = E.post({ action: 'htMine', s: h });
check('무상 하트: 잔액에 더해지고 환불 대상 아님', m.balance === 2 && m.lots[0].kind === 'free' && m.lots[0].refund === null, m.lots[0]);
check('무상 하트 환불 요청 불가', !E.post({ action: 'htRefundReq', s: h, lot: m.lots[0].id }).ok);
/* 답 없는 지정 질문 하트 돌려주기 */
E.now += 8 * 86400000;
r = E.post({ action: 'csAdminQueue', s: boss2 });
check('운영자: 7일 넘게 답 없는 지정·비공개 질문', r.late.some(x => x.id === qP), r.late.map(x => x.id));
r = E.post({ action: 'csAdminReturn', s: boss2, id: qP });
check('운영자가 누르면 하트를 돌려줌', r.ok && r.balance === 5, r);
check('같은 걸 두 번 돌려주지 않음', !E.post({ action: 'csAdminReturn', s: boss2, id: qP }).ok);

/* 시드 */
seedJson = JSON.parse(read('counsel/seed.json'));
r = E.post({ action: 'csAdminSeed', s: boss2, sid: 's01', op: 'pub' });
check('시드 공개: 질문 + 상담팀 답변으로', r.ok && E.post({ action: 'csGet', id: r.id }).answers[0].who.kind === 'team' && E.post({ action: 'csGet', id: r.id }).q.seed === true, r);
E.post({ action: 'csAdminSeed', s: boss2, sid: 's01', op: 'hide' });
check('시드 숨김: 목록에서 빠짐', !E.post({ action: 'csList' }).items.some(x => x.seed));
E.post({ action: 'csAdminSeed', s: boss2, sid: 's01', op: 'pub' });
check('시드 다시 공개: 새로 만들지 않고 그 글을 다시', E.post({ action: 'csList' }).items.filter(x => x.seed).length === 1 && sheetRows(E, '상담질문').filter(x => x[14] === 's01').length === 1);

/* 지우기·탈퇴 */
r = E.post({ action: 'csDelete', s: tx, id: qB });
check('남의 글은 못 지움', !r.ok);
r = E.post({ action: 'csDelete', s: h, id: qB });
check('내 글 지우기: 내용은 바로 비움', r.ok && !JSON.stringify(sheetRows(E, '상담질문')).includes('갈아타기 순서 고민'));
E.post({ action: 'userDelete', s: h });
check('탈퇴: 질문 내용 지움 · 하트 결제 기록은 남김', !JSON.stringify(sheetRows(E, '상담질문')).includes('양도세 비과세 문의') && sheetRows(E, '하트내역').length > 3);

console.log(fail ? `고민 상담·하트: ${pass}개 통과, ${fail}개 실패` : `고민 상담·하트: ${pass}개 통과`);
process.exit(fail ? 1 : 0);
