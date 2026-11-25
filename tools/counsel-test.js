/* 고민 상담·상담 채팅·전문가 하트 자동 확인 — 실행: node tools/counsel-test.js </dev/null
   ① 규칙(assets/counsel-core.js): 하트 확정값(상품표·제안/수락 2개·승인 무료 5개·환불 7일 전액/그 뒤 10% 공제·무료 하트 환불 없음·유효기간 5년)·무료 먼저 쓰기·
      게시판 연락 수단 가림·간단 욕설·분야별 답변 자격(세금=세무사·등기법률=법무사·대출=대출상담사)·전문가 순서 점수
   ② 숨김: config COUNSEL_ENABLED·HEART_ENABLED=false, 서버 COUNSEL_OPEN·HEART_OPEN=false · counsel/ 은 '준비 중'·검색 제외 · 메뉴·링크·sitemap 없음 · 약관 초안 숨김
   ③ 서버(tools/agent-backend.gs): 질문(무료)·답변·신고 2건 가림 · 상담 채팅(요청 → 전문가 수락 때 하트 / 전문가 상담 제안 → 보낼 때 하트, 5명·1번·끄기·차단) ·
      자동 환불(72시간 안 안 읽음·가린 질문) · 채팅 안 연락처 주고받기 · 5초 확인 · 알림 메일 한도 · 신고된 방만 운영자 열람 · 1년 보관 뒤 삭제 ·
      전문가 하트 결제(서버 확인 뒤에만, 금액 위조 거절, PAID_OPEN 잠금) · 환불 요청 → 운영자 승인 · 전문가 프로필·찾기·이 동네 전문가·추천 · 시드 · 탈퇴
   가짜 시트·메일·토스 위에서만 돌고 실제 서버에는 접속하지 않아요. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) pass++; else { fail++; console.log('  실패:', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } }
const C = require('../assets/counsel-core.js');

/* ---------- ① 규칙 ---------- */
check('상품표(확정): 3,900원 2개 · 9,900원 6개 · 19,900원 13개 · 49,000원 35개', JSON.stringify(C.PACKS.map(p => [p.won, p.n])) === JSON.stringify([[3900, 2], [9900, 6], [19900, 13], [49000, 35]]));
check('사용처(확정, 전문가만): 상담 제안 2 · 채팅 수락 2 · 승인 무료 5', Object.keys(C.USES).join() === 'offer,accept' && C.USES.offer.n === 2 && C.USES.accept.n === 2 && C.FREE_HEARTS === 5);
check('묶음 할인 전 단가 = 가장 작은 묶음 1개 값(1,950원)', C.unit() === 1950);
check('상품표: 큰 묶음일수록 1개 값이 싸짐', C.PACKS.map(C.packInfo).every((p, i, a) => !i || p.per < a[i - 1].per));
const D = 86400000, T0 = Date.parse('2026-12-01T10:00:00+09:00');
const lot = (n, won, kind) => ({ kind: kind || 'paid', n, won, at: T0 });
check('환불: 7일 안·안 씀 → 전액', JSON.stringify(C.refund(lot(6, 9900), 0, T0 + 3 * D)) === JSON.stringify({ won: 9900, full: true, why: 'full' }));
check('환불: 일부 씀 → 결제액 − 쓴 하트 × 1,950원', C.refund(lot(6, 9900), 2, T0 + D).won === 9900 - 2 * 1950 && C.refund(lot(6, 9900), 2, T0 + D).why === 'part');
check('환불: 많이 쓰면 0원 아래로 내려가지 않음', C.refund(lot(35, 49000), 30, T0 + D).won === 0);
check('환불: 다 쓰면 환불 금액 없음', C.refund(lot(2, 3900), 2, T0).why === 'none');
check('환불: 무상 하트는 대상 아님', C.refund(lot(3, 0, 'free'), 0, T0).won === 0 && C.refund(lot(3, 0, 'free'), 0, T0).why === 'free');
check('환불: 7일 지난 뒤에는 남은 하트 값에서 10% 공제', C.REFUND.lateFee === 0.1 && C.refund(lot(6, 9900), 0, T0 + 8 * D).won === 8910 && C.refund(lot(6, 9900), 2, T0 + 8 * D).won === 5400);
check('유효기간 5년: 지나면 환불·사용 불가', C.REFUND.validYears === 5 && C.refund(lot(6, 9900), 0, C.expireAt(T0) + 1).why === 'expired');
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
check('분야별 자격(확정): 세금=세무사 · 등기·법률=법무사 · 대출=대출상담사 · 나머지=다섯 직군', C.canAnswer(pro('E1', 'broker'), { cat: 'loan' }, []).why === 'kind' && C.canAnswer(pro('E2', 'loan'), { cat: 'loan' }, []).ok
  && C.canAnswer(pro('E1', 'broker'), { cat: 'tax' }, []).why === 'kind' && C.canAnswer(pro('E3', 'judicial'), { cat: 'legal' }, []).ok && C.canAnswer(pro('E4', 'tax'), { cat: 'legal' }, []).why === 'kind'
  && ['buy', 'rent', 'sub', 'redev', 'etc'].every(c => C.kindsFor(c).length === 5));
check('게시판 가림: 링크·카톡 아이디·이메일·전화', !/example|myid|a@b|5678/.test(C.hideContact('https://example.com 카톡 아이디 myid 메일 a@b.kr 010-1234-5678').text));
check('전문가 순서 점수: 무게가 없으면 0 · 평점·응답률·답변 수가 높을수록 위', C.rankScore({ rating: 5, resp: 1, answers: 50 }, {}, 0.5) === 0
  && C.rankScore({ rating: 5, resp: 1, answers: 50 }, { r: 1, p: 1, a: 1 }, 0) > C.rankScore({ rating: 2, resp: 0.2, answers: 1 }, { r: 1, p: 1, a: 1 }, 0));
check('등록번호는 앞 절반만 · 구 이름 뽑기', C.noMask('11680-2020-00123') === '11680-20********' && C.guOf('서울 강남구') === '강남구');
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
check('빌라·오피스텔·상가 결과와 재개발 구역 지도 상세에도 같은 칸(재개발은 분야 redev)', /JDJ_CS \? JDJ_CS\.slot\(\{ gu: /.test(read('assets/villa-view.js')) && /JDJ_CS \? JDJ_CS\.slot\(\{ gu: sggName\(S\.g\) \}\)/.test(read('assets/offi-view.js'))
  && /JDJ_CS \? JDJ_CS\.slot\(\{ gu: sggName\(g\) \}\)/.test(read('assets/comm-view.js')) && /JDJ_CS\.slot\(\{ gu: z\.gn, cat: 'redev' \}\)/.test(read('villa/zone/index.html'))
  && /assets\/counsel\.js\?v=\d+/.test(read('villa/zone/index.html')) && /assets\/agents\.js/.test(read('villa/zone/index.html')) && /data-cs-cat="redev"/.test(pvc.slot({ gu: '성북구', cat: 'redev' })) && clientCtx().slot({ gu: '성북구', cat: 'redev' }) === '');
check("단지 화면 '이 동네 확인된 전문가' 칸: 꺼져 있으면 빈 글자, 미리 보기면 칸", clientCtx().slot({ gu: '강남구' }) === '' && /data-cs-near="강남구"/.test(pvc.slot({ gu: '강남구' })) && /JDJ_CS\.slot\(\{gu: sggName\(d\.code\)\}\)/.test(read('mine/index.html')));
check('안내 문구: 전문가 글쓰기 칸(늘 회색 한 줄 + 걸러질 때 잠깐) · 고객 [채팅하기] 아래 · 채팅 열릴 때 전체 프로필 알림', pvc.MASK_NOTE === '사무소 이름과 연락처는 가려져요. 고객과 채팅이 열리면 그 고객에게 모두 공개돼요.' && pvc.CHAT_NOTE === '채팅을 시작하면 사무소 이름과 연락처를 볼 수 있어요.'
  && /CS\.maskLine\(\)/.test(read('counsel/index.html')) && /CS\.watchMask\(/.test(read('counsel/index.html')) && /CS\.maskLine\(\)/.test(read('counsel/expert/index.html')) && /setTimeout\(\(\) => \{ box\.hidden = true; \}, 3800\)/.test(read('assets/counsel.js'))
  && ['counsel/index.html', 'counsel/pro/index.html', 'counsel/pros/index.html'].every(f => /CS\.CHAT_NOTE/.test(read(f))) && /이제 전문가의 전체 프로필을 볼 수 있어요/.test(read('counsel/chat/index.html')));
const pages = ['counsel/index.html', 'counsel/expert/index.html', 'counsel/heart/index.html', 'counsel/admin/index.html', 'counsel/chat/index.html', 'counsel/pro/index.html', 'counsel/pros/index.html'];
pages.forEach(f => {
  const h = read(f);
  check(`${f}: 검색 제외(noindex)`, /<meta name="robots" content="noindex, nofollow">/.test(h));
  check(`${f}: 공통 파일(config·counsel-core·counsel·back)`, /assets\/config\.js\?v=\d+/.test(h) && /assets\/counsel-core\.js\?v=\d+/.test(h) && /assets\/counsel\.js\?v=\d+/.test(h) && /assets\/back\.js\?v=1" defer/.test(h));
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
check('머리줄 공유: 운영자·하트·전문가·채팅 화면에는 단추 없음, 고민 상담 목록에는 있음', ['counsel/admin/', 'counsel/heart/', 'counsel/expert/', 'counsel/chat/'].every(p => SH.isPrivate('/jangdaejang-calc/' + p)) && !SH.isPrivate('/jangdaejang-calc/counsel/'));
const sw = read('sw.js');
check('서비스 워커: 하트 결제키가 담긴 주소는 저장 안 함 · 공용 파일', /counsel\/heart\/'\) && u\.search\) return;/.test(sw) && /counsel-core\.js\?v=4/.test(sw) && /counsel\.js\?v=4/.test(sw));
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
  const E = require('./gs-harness')({ now: '2026-12-01T10:00:00+09:00', cache: !!o.cache, patch: g => {
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
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '매물 문의 드려요', body: '좋은 매물 많아요 https://example.com 카톡 아이디 adking 메일 ad@ad.kr 로 연락 주세요.' });
check('게시판: 외부 링크·카톡 아이디·이메일은 자동으로 가려서 올림(광고 막기)', r.ok && r.masked && !/example\.com|adking|ad@ad/.test(JSON.stringify(sheetRows(E, '상담질문'))), r);
E.post({ action: 'csDelete', s: a, id: r.id });
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '집주인 때문에 화나요', body: '이 씨발 집주인이 보증금을 안 돌려줘요 어떻게 해야 하나요.' });
check('질문: 욕설은 막음', !r.ok && /욕설/.test(r.err), r);
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '별명 확인', body: '별명이 이상하면 막는지 확인하는 질문이에요 감사합니다.', nick: '집예보 상담팀' });
check('질문: 상담팀·운영자처럼 보이는 별명은 막음', !r.ok && /별명/.test(r.err), r);
r = E.post({ action: 'csList' });
check('목록: 로그인 없이도 봄 · 질문한 사람은 "익명 ○○○○"', r.ok && r.items.length === 1 && /^익명 [0-9A-F]{4}$/.test(r.items[0].who) && r.items[0].cn === '매수·매도', r);
r = E.post({ action: 'csGet', id: q1 });
check('상세: 로그인 없이도 봄 · 가린 본문 · 답변 칸은 로그인 안내', r.ok && /\*\*\*/.test(r.q.body) && r.can.answer.why === 'login', r);

/* 전문가 신청 */
r = E.post({ action: 'csProApply', area: '서울 마포구', years: 10, s: p1, kind: 'broker', name: '김중개', no: '11680-2020-00123', org: '', phone: '010-2222-3333', email: 'p1@example.com', agree: true });
check('전문가 신청: 공인중개사는 사무소 이름 필수', !r.ok && /사무소/.test(r.err), r);
r = E.post({ action: 'csProApply', years: 10, s: p1, kind: 'broker', name: '김중개', no: '11680-2020-00123', org: '행복공인중개사사무소', area: '강남구', intro: '강남 아파트 매매 15년', phone: '010-2222-3333', email: 'p1@example.com', agree: true });
const e1 = r.id;
check('전문가 신청: 확인 대기로 들어감', r.ok && r.st === '확인 대기', r);
check('전문가 신청: 연락처는 암호화해 보관', !JSON.stringify(sheetRows(E, '상담전문가')).includes('01022223333'));
r = E.post({ action: 'csProApply', area: '서울 마포구', years: 10, s: p1, kind: 'tax', name: '김중개', no: '12345', phone: '010-2222-3333', email: 'p1@example.com', agree: true });
check('전문가 신청: 한 사람 한 신청', !r.ok, r);
r = E.post({ action: 'csAnswer', s: p1, id: q1, text: '실거주 요건과 대출 조건을 먼저 확인해 보시는 게 좋아요. 지역마다 달라요.' });
check('승인 전: 답변 못 함', !r.ok && /자격 확인/.test(r.err), r);
r = E.post({ action: 'csProApply', area: '서울 마포구', years: 10, s: pl, kind: 'loan', name: '이대출', no: '2024-00001234', org: '○○저축은행', phone: '010-4444-5555', email: 'pl@example.com', agree: true });
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
check('상세: 상담팀 답변이 맨 위 · 전문가 답변 카드는 성+○○·직군·구·경력만', r.ok && r.answers[0].who.kind === 'team' && r.answers[0].who.name === '집예보 상담팀' && r.answers[1].who.kind === 'pro' && r.answers[1].who.kn === '공인중개사' && r.answers[1].who.name === '김○○' && r.answers[1].who.gu === '강남구' && r.answers[1].who.years === 10, r.answers);
check('채팅 전 신원 정보 미노출: 답변 카드에 실명·사무소·등록번호·연락처 없음', !/김중개|행복공인중개사|11680-2020|2222-3333|p1@example/.test(JSON.stringify(r)));
r = E.post({ action: 'csAnswer', s: pl, id: q1, text: '행복 공인중개사사무소 말고 저희 ○○저축은행 창구로 오세요. 대출 조건을 먼저 확인해 보세요.' });
check('공개 답변: 자기 사무소(소속) 이름은 자동 가림', r.ok && !/○○저축은행/.test(E.post({ action: 'csGet', id: q1 }).answers.map(x => x.text).join()), r);
E.post({ action: 'csDelete', s: pl, id: r.id });
r = E.post({ action: 'csProApply', area: '서울 마포구', years: 3, s: E.member(29), kind: 'broker', name: '정중개', no: '11440-2021-00001', org: '마포행복부동산', intro: '마포행복 대표예요', phone: '010-1111-2222', email: 'm@example.com', agree: true });
check('소개에 사무소 이름이 들어가면 신청 단계에서 막음', !r.ok && /사무소 이름/.test(r.err), r);
/* 5명 제한 */
const more = [21, 22, 23, 24, 25].map(n => E.member(n));
more.forEach((s, i) => { const x = E.post({ action: 'csProApply', area: '서울 마포구', years: 10, s, kind: 'tax', name: '세무' + '가나다라마'[i], no: '1000' + i, phone: '010-7777-000' + i, email: `t${i}@example.com`, agree: true }); E.post({ action: 'csAdminPro', s: boss, id: x.id, op: 'ok' }); });
const res5 = more.map(s => E.post({ action: 'csAnswer', s, id: q1, text: '세무 관점에서는 취득세와 보유세를 함께 따져 보셔야 해요. 자세한 건 따로 확인해요.' }));
check('전문가 답변은 질문마다 5명까지(상담팀 제외)', res5.slice(0, 4).every(x => x.ok) && !res5[4].ok && /5개/.test(res5[4].err), res5.map(x => x.err || 'ok'));
/* 대출 분류 */
r = E.post({ action: 'csAsk', s: b2, cat: 'loan', title: '주택담보대출 한도 문의', body: '연봉 6천에 신용대출이 조금 있는데 주담대 한도가 어느 정도 나올지 궁금해요.' });
const qL = r.id;
r = E.post({ action: 'csAnswer', s: p1, id: qL, text: '대출 한도는 소득과 기존 대출에 따라 달라요. 은행에 꼭 확인해 보세요.' });
check('대출 질문: 공인중개사는 답 못 함', !r.ok && /대출상담사만/.test(r.err), r);
r = E.post({ action: 'csAnswer', s: pl, id: qL, text: 'DSR 규제를 먼저 계산해 보셔야 해요. 기존 신용대출도 함께 들어가요.' });
check('대출 질문: 등록된 대출상담사는 답함', r.ok, r);

/* 연락처 넘기기는 없어짐 → 앱 안 상담 채팅(질문한 분은 무료) */
r = E.post({ action: 'csContact', s: a, aid: ans1, phone: '010-9999-8888', agree: true });
check('예전 연락처 넘기기 요청(csContact)은 없음', !r.ok && r.err === 'unknown', r);
check('예전 위로 올리기(csBump)도 없음', E.post({ action: 'csBump', s: a, id: q1 }).err === 'unknown');
r = E.post({ action: 'csChatStart', s: b2, aid: ans1 });
check('채팅 요청: 내 질문이 아니면 못 함', !r.ok, r);
r = E.post({ action: 'csGet', s: a, id: q1 });
check('상세: 질문한 분에게 전문가 답변마다 채팅방 칸(아직 없음) · 미니 프로필(답변 수)', r.answers.filter(x => x.who.kind === 'pro').every(x => x.room === '' && x.stat && x.stat.answers >= 1), r.answers);
check('상세: 남에게는 채팅방 칸이 없음', E.post({ action: 'csGet', id: q1 }).answers.every(x => x.room === undefined));
r = E.post({ action: 'csChatStart', s: a, aid: ans1 });
check('채팅 요청: 하트 없이 무료로 요청(방은 수락 기다림)', r.ok && /^R/.test(r.room) && E.post({ action: 'csRoom', s: a, id: r.room, n: 0 }).st === '요청', r);

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
r = E.post({ action: 'htOrder', s: p1, pack: 'h6', agree: true });
check('하트 충전: PAID_OPEN=false 면 서버가 거절', !r.ok && r.code === 'paid_closed', r);
r = E.post({ action: 'csAsk', s: a, cat: 'buy', title: '갈아타기 순서 지정 질문', body: '지금 집을 먼저 팔지 새 집을 먼저 살지 지정한 중개사님께 여쭤보고 싶어요.', use: 'pick', to: e1 });
check('질문한 분: 전문가 지정은 무료(채팅 요청이 생김)', r.ok && /^R/.test(r.room), r);
r = E.post({ action: 'csAsk', s: a, cat: 'tax', title: '양도세 지정 질문', body: '양도세 비과세 요건을 공인중개사님께 여쭤보고 싶어서 지정해요.', use: 'pick', to: e1 });
check('세금 질문에 공인중개사 지정은 막음(세무사만)', !r.ok && /세무사만/.test(r.err), r);

/* 전문가 하트(결제 열림) */
E = env({ open: true, paid: true, cache: true });
const h = E.member(1), boss2 = E.member(900), tx = E.member(41), bk = E.member(42), u2 = E.member(43);
r = E.post({ action: 'htMine', s: h });
check('일반 회원: 하트 화면은 "전문가용" 안내만', r.ok && r.pro === false && r.balance === undefined, r);
check('일반 회원은 하트 충전 불가', !E.post({ action: 'htOrder', s: h, pack: 'h6', agree: true }).ok);
const eT = E.post({ action: 'csProApply', years: 10, s: tx, kind: 'tax', name: '박세무', no: '12345678', org: '박세무회계', area: '서울 강남구', intro: '양도세·증여세 상담', phone: '010-1212-3434', email: 'tx@example.com', agree: true }).id;
const eB = E.post({ action: 'csProApply', years: 10, s: bk, kind: 'broker', name: '최중개', no: '11680-2020-00123', org: '최공인중개사사무소', area: '서울 강남구', addr: '서울 강남구 테헤란로 1', tel: '02-1234-5678', phone: '010-3434-5656', email: 'bk@example.com', agree: true }).id;
E.post({ action: 'csAdminPro', s: boss2, id: eT, op: 'ok' }); E.post({ action: 'csAdminPro', s: boss2, id: eB, op: 'ok' });
let m = E.post({ action: 'htMine', s: tx });
check('승인 때 무료 하트 5개(한 번)', m.pro && m.balance === 5 && m.lots.length === 1 && m.lots[0].kind === 'free', m);
E.post({ action: 'csAdminPro', s: boss2, id: eT, op: 'ok' });
check('다시 승인해도 무료 하트는 한 번만', E.post({ action: 'htMine', s: tx }).balance === 5);
/* 충전 */
r = E.post({ action: 'htOrder', s: tx, pack: 'h9', agree: true });
check('충전: 없는 묶음 거절', !r.ok);
r = E.post({ action: 'htOrder', s: tx, pack: 'h6' });
check('충전: 안내 동의 필요', !r.ok && /동의/.test(r.err));
const o1 = E.post({ action: 'htOrder', s: tx, pack: 'h6', agree: true });
check('충전 주문: 금액은 서버 상품표(9,900원)', o1.ok && o1.amount === 9900 && /하트 6개/.test(o1.orderName), o1);
toss = []; tossReply = (url, body) => [200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: '2026-12-01T10:05:00+09:00' }];
r = E.post({ action: 'htConfirm', s: tx, orderId: o1.orderId, paymentKey: 'pk_test_1', amount: 100 });
check('금액을 바꾼 승인 요청은 토스에 보내지도 않고 거절', !r.ok && toss.length === 0 && /금액/.test(r.err), r);
const o2 = E.post({ action: 'htOrder', s: tx, pack: 'h6', agree: true });
tossReply = (url, body) => [200, { status: 'DONE', orderId: body.orderId, totalAmount: 100, method: '카드' }];
check('토스 응답 금액이 다르면 지급 안 함', !E.post({ action: 'htConfirm', s: tx, orderId: o2.orderId, paymentKey: 'pk_test_2', amount: 9900 }).ok && E.post({ action: 'htMine', s: tx }).balance === 5);
const o3 = E.post({ action: 'htOrder', s: tx, pack: 'h6', agree: true });
tossReply = () => [400, { code: 'REJECT_CARD_PAYMENT', message: '한도 초과' }];
check('토스 승인 실패면 지급 안 함', !E.post({ action: 'htConfirm', s: tx, orderId: o3.orderId, paymentKey: 'pk_test_3', amount: 9900 }).ok && E.post({ action: 'htMine', s: tx }).balance === 5);
const o4 = E.post({ action: 'htOrder', s: tx, pack: 'h6', agree: true });
tossReply = (url, body) => [200, { status: 'DONE', orderId: body.orderId, totalAmount: body.amount, method: '카드', approvedAt: '2026-12-01T10:05:00+09:00' }];
check('다른 사람이 승인 요청하면 거절', !E.post({ action: 'htConfirm', s: E.member(77), orderId: o4.orderId, paymentKey: 'pk_test_4', amount: 9900 }).ok);
toss = [];
r = E.post({ action: 'htConfirm', s: tx, orderId: o4.orderId, paymentKey: 'pk_test_4', amount: 9900 });
check('토스 승인 확인 뒤 하트 6개 지급(무료 5 + 6 = 11)', r.ok && r.n === 6 && r.balance === 11 && toss.length === 1, r);
check('같은 승인을 다시 보내도 두 번 지급하지 않음', E.post({ action: 'htConfirm', s: tx, orderId: o4.orderId, paymentKey: 'pk_test_4', amount: 9900 }).balance === 11);

/* 흐름 ①: 질문한 분이 요청 → 전문가 수락 때 하트 */
r = E.post({ action: 'csAsk', s: h, cat: 'tax', area: '서울 강남구', title: '양도세 비과세 문의', body: '일시적 2주택 비과세 기한이 어떻게 되는지 세무사님께 묻고 싶어요.', use: 'private', to: eT });
const qP = r.id, rm = r.room;
check('질문한 분: 1:1 비공개 상담 요청은 무료(채팅방은 수락 기다림)', r.ok && /^R/.test(rm), r);
check('비공개 상담: 목록에 안 보임 · 남은 못 봄', !E.post({ action: 'csList' }).items.some(x => x.id === qP) && !E.post({ action: 'csGet', s: E.member(78), id: qP }).ok);
check('지정된 전문가 답변함에 요청이 옴', E.post({ action: 'csProMine', s: tx }).rooms.some(x => x.id === rm && x.st === '요청'));
check('수락 전에는 메시지를 못 보냄', !E.post({ action: 'csSay', s: h, id: rm, text: '안녕하세요' }).ok);
check('채팅 전 신원 정보 미노출: 수락 전 채팅방에는 성+○○만', (x => !x.full && x.name === '박○○' && !/박세무회계|12345678/.test(JSON.stringify(x)))(E.post({ action: 'csRoom', s: h, id: rm, n: 0, full: true }).room.other));
check('고객은 익명: 전문가 쪽 채팅방에는 고객 별명만', /^익명 [0-9A-F]{4}$/.test(E.post({ action: 'csRoom', s: tx, id: rm, n: 0, full: true }).room.other.name));
check('수락은 전문가만', !E.post({ action: 'csRoomAccept', s: h, id: rm }).ok);
E.mails.length = 0;
r = E.post({ action: 'csRoomAccept', s: tx, id: rm });
check('전문가 [채팅 수락] → 하트 2개 차감(무료 먼저)', r.ok && r.hearts === 9 && E.post({ action: 'htMine', s: tx }).lots.find(l => l.kind === 'free').left === 3, r);
check('수락 다시 눌러도 두 번 차감 안 함', E.post({ action: 'csRoomAccept', s: tx, id: rm }).already && E.post({ action: 'htMine', s: tx }).balance === 9);
const stranger = E.member(79);
check('남은 채팅방에 못 들어옴', !E.post({ action: 'csRoom', s: stranger, id: rm }).ok && !E.post({ action: 'csSay', s: stranger, id: rm, text: '안녕' }).ok);
check('운영자도 신고 없는 방은 못 엶', !E.post({ action: 'csRoom', s: boss2, id: rm }).ok && !E.post({ action: 'csAdminRoom', s: boss2, id: rm }).ok);
E.mails.length = 0;
r = E.post({ action: 'csSay', s: h, id: rm, text: '안녕하세요. 제 번호 010-5555-6666, 카톡 아이디 myid77 이에요. 주민번호 900101-1234567' });
check('채팅방 안: 전화·카톡 아이디는 그대로(주민번호만 가림)', r.ok && r.hid && /010-5555-6666/.test(JSON.stringify(sheetRows(E, '상담채팅'))) && /myid77/.test(JSON.stringify(sheetRows(E, '상담채팅'))) && !/1234567/.test(JSON.stringify(sheetRows(E, '상담채팅'))), r);
check('전문가에게 알림 메일(내용 없이 링크만)', E.mails.length === 1 && E.mails[0].to === 'tx@example.com' && !/5555|안녕하세요/.test(E.mails[0].body) && /counsel\/chat\/\?id=/.test(E.mails[0].body), E.mails);
E.post({ action: 'csSay', s: h, id: rm, text: '하나 더 여쭤볼게요.' });
check('같은 방 같은 사람에게는 1시간에 1통만', E.mails.length === 1);
r = E.post({ action: 'csSay', s: tx, id: rm, text: '자세한 건 카톡 아이디 taxpark 이나 010-1212-3434 로 연락 주세요' });
check('전문가 글도 채팅방 안에서는 가리지 않음', r.ok && !r.hid, r);
r = E.post({ action: 'csRoom', s: h, id: rm, n: 0 });
check('질문한 분 화면: 메시지(수락 안내 포함) · 상대 프로필(평점·답변 수)', r.ok && r.msgs.some(x => /taxpark/.test(x.text)) && r.msgs[0].k === 's' && r.room.other.name === '박○○' && r.room.other.full && r.room.other.realName === '박세무' && r.room.other.org === '박세무회계' && r.room.other.no === '12345678' && 'answers' in r.room.other, r);
const nAll = r.n;
check('새 메시지 없으면 빈 목록', E.post({ action: 'csRoom', s: h, id: rm, n: nAll }).msgs.length === 0);
check('알림 메일 주소는 질문한 분만', !E.post({ action: 'csRoomMail', s: tx, id: rm, email: 'x@example.com' }).ok);
r = E.post({ action: 'csRoomMail', s: h, id: rm, email: 'asker@example.com' });
check('질문한 분 알림 메일 저장(암호화)', r.ok && r.mail && !JSON.stringify(sheetRows(E, '상담채팅방')).includes('asker@example.com'), r);
check('[내 연락처 보내기]: 확인(동의) 없으면 안 보냄', !E.post({ action: 'csSendContact', s: h, id: rm, phone: '010-7777-8888' }).ok);
r = E.post({ action: 'csSendContact', s: h, id: rm, phone: '010-7777-8888', agree: true });
check('[내 연락처 보내기](질문한 분): 시트에는 암호화', r.ok && !JSON.stringify(sheetRows(E, '상담채팅')).includes('77778888'), r);
r = E.post({ action: 'csRoom', s: tx, id: rm, n: nAll });
check('상대(전문가)에게 번호가 보임', r.msgs.length === 1 && r.msgs[0].k === 'c' && r.msgs[0].text === '010-7777-8888' && !r.msgs[0].mine, r);
check('[내 연락처 보내기](전문가)도 됨', E.post({ action: 'csSendContact', s: tx, id: rm, phone: '010-1212-3434', agree: true }).ok);
r = E.post({ action: 'csRoom', s: h, id: rm, n: nAll + 1, full: true });
check('질문한 분에게 전문가 번호 · 두 쪽 모두 보낸 표시', r.msgs[0].text === '010-1212-3434' && r.room.sent && r.room.gotContact, r);
E.post({ action: 'csSay', s: tx, id: rm, text: '네, 전화드릴게요.' });
check('질문한 분에게 알림 메일(알림 주소를 넣은 뒤)', E.mails.some(x => x.to === 'asker@example.com'));
r = E.post({ action: 'csChatReport', s: tx, id: rm, why: 'offsite' });
check("채팅 신고: '채팅 밖 연락 유도' 사유는 없음", !r.ok, r);
check('채팅 신고: 광고·홍보', E.post({ action: 'csChatReport', s: h, id: rm, why: 'ad' }).ok);
r = E.post({ action: 'csAdminQueue', s: boss2 });
check('운영자 화면: 신고된 채팅방 목록', r.rooms.length === 1 && r.rooms[0].id === rm && r.rooms[0].why[0] === '광고·홍보', r.rooms);
r = E.post({ action: 'csAdminRoom', s: boss2, id: rm, why: '신고 확인' });
check('운영자: 신고된 방은 열람 · 단추로 보낸 번호는 운영자에게도 안 보임', r.ok && r.msgs.length >= 6 && !JSON.stringify(r.msgs).includes('7777-8888'), r.msgs);
check('운영자 열람 기록이 남음', sheetRows(E, '상담채팅열람').length === 2 && sheetRows(E, '상담채팅열람')[1][1] === rm);
check('운영자 열람은 운영자만', !E.post({ action: 'csAdminRoom', s: h, id: rm }).ok);
check('별점은 질문한 분만 · 1~5 · 한 번', !E.post({ action: 'csRoomRate', s: tx, id: rm, star: 5 }).ok && E.post({ action: 'csRoomRate', s: h, id: rm, star: 4 }).ok && !E.post({ action: 'csRoomRate', s: h, id: rm, star: 5 }).ok);
/* 요청 거절·만료 = 차감 없음 */
r = E.post({ action: 'csAsk', s: u2, cat: 'buy', title: '중개사 지정 질문입니다', body: '전세 끼고 매수할 때 확인할 것을 지정한 중개사님께 여쭤봐요.', use: 'pick', to: eB });
const rmB = r.room, qB = r.id;
check('거절: 하트 차감 없음 · 질문한 분에게 "다른 전문가를 골라 보세요"', E.post({ action: 'csRoomDecline', s: bk, id: rmB }).ok && E.post({ action: 'htMine', s: bk }).balance === 5
  && /다른 전문가/.test(E.post({ action: 'csRoom', s: u2, id: rmB, n: 0 }).msgs.map(x => x.text).join()));
r = E.post({ action: 'csChatStart', s: u2, qid: qB, pid: eB });
check('거절된 뒤 다시 요청할 수 있음', r.ok && r.room !== rmB, r);
E.now += 8 * 86400000;
check('7일 안에 수락 안 하면 만료 · 차감 없음 · 수락 불가', E.post({ action: 'csRoom', s: u2, id: r.room, n: 0 }).st === '만료' && !E.post({ action: 'csRoomAccept', s: bk, id: r.room }).ok && E.post({ action: 'htMine', s: bk }).balance === 5);
E.now -= 8 * 86400000;

/* 흐름 ②: 전문가가 먼저 상담 제안 */
r = E.post({ action: 'csAsk', s: u2, cat: 'buy', area: '서울 강남구', title: '첫 집 매수 고민 제안 받기', body: '30대 맞벌이인데 첫 집을 어디서부터 알아봐야 할지 모르겠어요.' });
const qO = r.id;
r = E.post({ action: 'csAsk', s: h, cat: 'buy', title: '제안 받지 않는 질문입니다', body: '제안은 받지 않고 공개 답변만 보고 싶어요. 참고할게요.', offers: false });
const qOff = r.id;
r = E.post({ action: 'csGet', s: bk, id: qO });
check('전문가 화면: 제안 가능(하트 2개·남은 자리 5)', r.offer && r.offer.ok && r.offer.cost === 2 && r.offer.left === 5, r.offer);
check('제안 받기를 끈 질문에는 제안 불가', E.post({ action: 'csGet', s: bk, id: qOff }).offer.why === 'off' && !E.post({ action: 'csOffer', s: bk, id: qOff, text: '도와드릴 수 있어요. 편하게 말씀해 주세요.' }).ok);
check('분야가 맞지 않으면 제안 불가(세금 질문에 중개사)', !E.post({ action: 'csOffer', s: bk, id: qP, text: '도와드릴 수 있어요. 편하게 말씀해 주세요.' }).ok);
check('일반 회원은 제안 못 함', !E.post({ action: 'csOffer', s: h, id: qO, text: '도와드릴 수 있어요. 편하게 말씀해 주세요.' }).ok);
r = E.post({ action: 'csOffer', s: bk, id: qO, text: '강남권 첫 집 상담을 많이 해 왔어요. 예산을 알려 주시면 정리해 드릴게요.' });
const rmO = r.room;
check('[상담 제안 보내기] → 보내는 순간 하트 2개', r.ok && r.hearts === 3, r);
check('제안이 열린 순간 그 고객에게 전체 프로필(실명·사무소·주소·등록번호·사무실 전화)', (x => x.full && x.realName === '최중개' && x.org === '최공인중개사사무소' && x.addr === '서울 강남구 테헤란로 1' && x.no === '11680-2020-00123' && x.tel === '0212345678')(E.post({ action: 'csRoom', s: u2, id: rmO, n: 0, full: true }).room.other));
check('같은 전문가는 한 질문에 1번', !E.post({ action: 'csOffer', s: bk, id: qO, text: '한 번 더 제안드려요. 편하게 연락 주세요.' }).ok);
r = E.post({ action: 'csGet', s: u2, id: qO });
check('질문한 분 화면: 상담 제안 + 전문가 프로필(배지·답변 수·평점, 성+○○)', r.offers.length === 1 && r.offers[0].pro.name === '최○○' && 'rating' in r.offers[0].pro, r.offers);
check('전문가는 질문한 분 수락 전에 더 보내지 못함', !E.post({ action: 'csSay', s: bk, id: rmO, text: '답이 없으셔서 다시 연락드려요' }).ok);
/* 5명 제한 */
const five = [51, 52, 53, 54, 55].map(n => E.member(n)), fids = five.map((s2, i) => { const id = E.post({ action: 'csProApply', years: 10, s: s2, kind: 'sales', name: '분양' + '가나다라마'[i], org: '○○분양대행', area: '서울 서초구', phone: '010-8888-000' + i, email: `s${i}@example.com`, agree: true }).id; E.post({ action: 'csAdminPro', s: boss2, id: id, op: 'ok' }); return id; });
const offs = five.map(s2 => E.post({ action: 'csOffer', s: s2, id: qO, text: '분양 쪽에서도 도와드릴 수 있어요. 편하게 말씀 주세요.' }));
check('한 질문에 상담 제안은 5명까지(먼저 온 순)', offs.slice(0, 4).every(x => x.ok) && !offs[4].ok && /5개/.test(offs[4].err) && E.post({ action: 'htMine', s: five[4] }).balance === 5, offs.map(x => x.err || 'ok'));
/* 차단 */
r = E.post({ action: 'csBlock', s: u2, id: offs[0].room });
check('[이 전문가 차단]: 그 방은 끝남', r.ok && r.blocked && E.post({ action: 'csRoom', s: u2, id: offs[0].room, n: 0 }).st === '끝남', r);
E.now += 3600000;   // 질문·채팅 요청은 한 시간에 3번까지
const qO2 = E.post({ action: 'csAsk', s: u2, cat: 'sub', title: '청약 가점 계산 문의', body: '부양가족 점수에서 따로 사는 부모님이 들어가는지 궁금해요.' }).id;
check('차단된 전문가는 이 사람에게 제안 불가', E.post({ action: 'csGet', s: five[0], id: qO2 }).offer.why === 'blocked' && !E.post({ action: 'csOffer', s: five[0], id: qO2, text: '도와드릴 수 있어요. 편하게 말씀해 주세요.' }).ok);
check('차단 안 된 전문가는 제안 가능', E.post({ action: 'csOffer', s: five[1], id: qO2, text: '청약 상담을 많이 해 왔어요. 편하게 물어보세요.' }).ok);
/* 질문한 분: 대화하기 / 괜찮아요 */
r = E.post({ action: 'csRoom', s: u2, id: rmO, n: 0, full: true });
check('제안을 열면 "열어 봄" 기록 · 전문가 첫 메시지가 보임', r.room.st === '제안' && r.msgs[0].k === 'p' && /강남권/.test(r.msgs[0].text) && E.post({ action: 'csGet', s: u2, id: qO }).offers.find(x => x.room === rmO).opened);
check('[대화하기] → 대화 시작', E.post({ action: 'csOfferAnswer', s: u2, id: rmO, op: 'go' }).ok && E.post({ action: 'csSay', s: u2, id: rmO, text: '네 예산은 7억 정도예요.' }).ok);
E.post({ action: 'csRoom', s: u2, id: offs[1].room, n: 0 });
check('[괜찮아요] → 환불 없음(제안은 전달됨)', E.post({ action: 'csOfferAnswer', s: u2, id: offs[1].room, op: 'pass' }).ok && E.post({ action: 'htMine', s: five[1] }).balance === 1);
/* 자동 환불 */
E.now += 73 * 3600000;
r = E.post({ action: 'csAdminQueue', s: boss2 });
check('72시간 안에 열어 보지 않은 제안 → 하트 자동 환불(운영자 확인 없음)', E.post({ action: 'htMine', s: five[2] }).balance === 5 && E.post({ action: 'htMine', s: five[3] }).balance === 5 && r.autoRefunds.length === 3 && /72시간/.test(r.autoRefunds[0].why), r.autoRefunds);
check('열어 본 제안(괜찮아요·대화)은 환불 없음(안 열린 다른 질문 제안만 돌아옴)', E.post({ action: 'htMine', s: five[1] }).balance === 3 && E.post({ action: 'htMine', s: bk }).balance === 3);
check('기간 지난 제안은 만료로', E.post({ action: 'csRoom', s: five[2], id: offs[2].room, n: 0 }).st === '만료');
E.now -= 73 * 3600000;
/* 신고 2건(서로 다른 사람)으로 가려진 질문 → 계속 가림 → 쓴 하트 모두 자동 환불 */
const qBad = E.post({ action: 'csAsk', s: u2, cat: 'redev', title: '재개발 입주권 문의 드려요', body: '재개발 구역 빌라를 사면 입주권이 나오는지 궁금해요 알려 주세요.' }).id;
const offBad = E.post({ action: 'csOffer', s: five[2], id: qBad, text: '재개발 분양 상담을 해 드릴 수 있어요. 편하게 말씀해 주세요.' });
check('제안 보냄(하트 5 → 3)', offBad.ok && E.post({ action: 'htMine', s: five[2] }).balance === 3);
const rpA = E.member(61), rpB = E.member(62);
E.post({ action: 'csReport', s: rpA, id: qBad, why: 'false' }); r = E.post({ action: 'csReport', s: rpA, id: qBad, why: 'false' });
check('같은 사람이 여러 번 신고해도 1건(아직 안 가림)', r.already && E.post({ action: 'csGet', id: qBad }).ok);
r = E.post({ action: 'csReport', s: rpB, id: qBad, why: 'false' });
check('서로 다른 사람 2건이면 바로 가림', r.hidden && !E.post({ action: 'csGet', id: qBad }).ok, r);
check('가린 질문: 운영자가 계속 가림을 고르기 전에는 환불 없음', E.post({ action: 'htMine', s: five[2] }).balance === 3);
r = E.post({ action: 'csAdminAct', s: boss2, id: qBad, op: 'keep' });
check("운영자 '계속 가림' → 그 질문에 쓴 하트 자동 환불", r.ok && E.post({ action: 'htMine', s: five[2] }).balance === 5 && E.post({ action: 'csAdminQueue', s: boss2 }).autoRefunds.some(x => /가린 질문/.test(x.why)), r);

/* 전문가 노출 */
r = E.post({ action: 'csProPage', id: eB });
check('프로필: 직군·자격·구·경력·답변 수·평점·응답률', r.ok && r.pro.kn === '공인중개사' && r.pro.gu === '강남구' && r.pro.years === 10 && r.pro.stat.resp === 0, r.pro);
check('채팅 전 신원 정보 미노출: 프로필·찾기·동네 칸·지정 목록에 실명·사무소·주소·등록번호·전화 없음', [E.post({ action: 'csProPage', id: eB }), E.post({ action: 'csProList' }), E.post({ action: 'csProNear', gu: '강남구' }), E.post({ action: 'csExperts' }), E.post({ action: 'csGet', s: u2, id: qO })]
  .every(x => x.ok && !/최중개|최공인중개사|11680-2020|3434-5656|34345656|bk@example|박세무회계|12345678|1212-3434|테헤란로/.test(JSON.stringify(x))));
check('프로필: 세무사의 평점(대화한 고객만) · 응답률 100%', E.post({ action: 'csProPage', id: eT }).pro.stat.rating === 4 && E.post({ action: 'csProPage', id: eT }).pro.stat.resp === 1);
check('프로필: 확인되지 않은 전문가는 없음', !E.post({ action: 'csProPage', id: 'EZZZZZZZZZZ' }).ok);
r = E.post({ action: 'csProList', gu: '강남구' });
check('전문가 찾기: 구로 거르기 · 구 목록', r.ok && r.items.length === 2 && r.items.every(x => x.gu === '강남구') && r.areas.some(a2 => a2.gu === '서초구' && a2.n === 5), r);
check('전문가 찾기: 분야로 거르기(세금 = 세무사만)', E.post({ action: 'csProList', cat: 'tax' }).items.every(x => x.kind === 'tax') && E.post({ action: 'csProList', cat: 'tax' }).items.length === 1);
check('전문가 찾기: 직군으로 거르기', E.post({ action: 'csProList', kind: 'sales' }).items.length === 5);
E.props.CS_PRO_RANK = JSON.stringify({ r: 0, p: 0, a: 0, f: 1 });
const t1 = E.post({ action: 'csProList', kind: 'sales' }).items.map(x => x.id).join();
E.now += 86400000;
const t2 = E.post({ action: 'csProList', kind: 'sales' }).items.map(x => x.id).join();
E.now -= 86400000;
check('공정 순환: 날마다 순서가 바뀜(무게는 비공개 설정)', t1 !== t2 && t1.split(',').sort().join() === t2.split(',').sort().join());
delete E.props.CS_PRO_RANK;
r = E.post({ action: 'csProNear', gu: '서울 서초구' });
check('이 동네 확인된 전문가: 그 구 전문가 최대 3명', r.ok && r.items.length === 3 && r.items.every(x => x.gu === '서초구'), r);
const qR = E.post({ action: 'csAsk', s: E.member(91), cat: 'redev', title: '재개발 조합원 지위 문의', body: '재개발 구역 빌라를 사면 조합원 지위가 넘어오는지 궁금해요.' }).id;
E.post({ action: 'csAnswer', s: five[4], id: qR, text: '투기과열지구라면 조합원 지위 양도 제한부터 확인해 보셔야 해요. 조합에 꼭 문의해 보세요.' });
r = E.post({ action: 'csProNear', gu: '서초구', cat: 'redev' });
check('재개발 화면(cat=redev): 재개발·재건축 답변을 해 온 전문가가 맨 앞 · 최대 3명 · 신원 숨김', r.ok && r.cat === 'redev' && r.items.length === 3 && r.items[0].id === fids[4] && r.items.every(x => /○○$/.test(x.name) && !x.org && !x.no), r.items);
check('분야를 주면 그 분야 자격이 있는 전문가만(세금 → 세무사)', E.post({ action: 'csProNear', gu: '강남구', cat: 'tax' }).items.every(x => x.kind === 'tax') && E.post({ action: 'csProNear', gu: '강남구', cat: 'tax' }).items.length === 1);
r = E.post({ action: 'csGet', s: u2, id: qO });
check('질문 상세: 같은 구·분야 전문가 추천 3명(이미 답한 분 빼고)', r.rec.length >= 1 && r.rec.length <= 3 && r.rec.every(x => x.gu === '강남구'), r.rec);
r = E.post({ action: 'csGet', s: h, id: qP });
check('세금 질문 추천은 세무사만', r.rec.every(x => x.kind === 'tax'));

/* 환불 */
const o5 = E.post({ action: 'htOrder', s: tx, pack: 'h13', agree: true });
E.post({ action: 'htConfirm', s: tx, orderId: o5.orderId, paymentKey: 'pk_test_5', amount: 19900 });
E.now += 2 * 86400000;
m = E.post({ action: 'htMine', s: tx });
const lot13 = m.lots.find(x => x.n === 13);
check('7일 안·안 쓴 묶음: 전액 환불 안내 · 유효기간 5년 표시', lot13.refund.won === 19900 && lot13.refund.full && /^2031-/.test(lot13.until), lot13);
check('무료 하트: 환불 대상 아님', m.lots.find(x => x.kind === 'free').refund === null && !E.post({ action: 'htRefundReq', s: tx, lot: m.lots.find(x => x.kind === 'free').id }).ok);
r = E.post({ action: 'htRefundReq', s: tx, lot: lot13.id, why: '생각보다 안 쓰게 돼서요' });
check('환불 요청: 계산한 금액으로 접수 · 바로 환불하지 않음', r.ok && r.won === 19900 && toss.filter(x => /cancel/.test(x.url)).length === 0, r);
check('환불 요청 중인 묶음은 잔액에서 빠짐', E.post({ action: 'htMine', s: tx }).balance === 9);
toss = []; tossReply = () => [200, { status: 'CANCELED' }];
check('환불 승인은 운영자만', E.post({ action: 'csAdminRefund', s: tx, id: lot13.id, op: 'ok' }).code === 'admin');
r = E.post({ action: 'csAdminRefund', s: boss2, id: lot13.id, op: 'ok' });
check('운영자 승인 → 토스 부분 취소(그 금액만)', r.ok && r.won === 19900 && toss.length === 1 && /pk_test_5\/cancel$/.test(toss[0].url) && toss[0].body.cancelAmount === 19900, toss);
check('같은 환불을 두 번 하지 않음', !E.post({ action: 'csAdminRefund', s: boss2, id: lot13.id, op: 'ok' }).ok);
const lot6 = E.post({ action: 'htMine', s: tx }).lots.find(x => x.n === 6);
E.now += 8 * 86400000;
check('7일 지난 뒤: 남은 하트 값에서 10% 공제', E.post({ action: 'htMine', s: tx }).lots.find(x => x.id === lot6.id).refund.won === Math.floor(9900 * 0.9 / 10) * 10, E.post({ action: 'htMine', s: tx }).lots);
E.now -= 10 * 86400000;
check('운영자 하트 선물은 확인된 전문가에게', E.post({ action: 'csAdminGrant', s: boss2, pid: eB, n: 2 }).ok && E.post({ action: 'htMine', s: bk }).balance === 5 && !E.post({ action: 'csAdminGrant', s: boss2, pid: 'EZZZZZZZZZZ', n: 2 }).ok);

/* 보관 */
E.post({ action: 'csRoomEnd', s: h, id: rm });
check('상담 끝내기 → 더 못 보냄', !E.post({ action: 'csSay', s: tx, id: rm, text: '끝난 뒤 보내기' }).ok && E.post({ action: 'csRoom', s: tx, id: rm, n: 0 }).st === '끝남');
E.now += 366 * 86400000;
E.ctx.csChatCleanup(true);
check('끝난 지 1년 지나면 방·메시지·열람 기록 자동 삭제', !sheetRows(E, '상담채팅방').slice(1).some(x => x[0] === rm) && !sheetRows(E, '상담채팅').slice(1).some(x => x[2] === rm) && sheetRows(E, '상담채팅열람').length === 1);
E.now -= 366 * 86400000;

/* 시드 */
seedJson = JSON.parse(read('counsel/seed.json'));
r = E.post({ action: 'csAdminSeed', s: boss2, sid: 's01', op: 'pub' });
check('시드 공개: 질문 + 상담팀 답변으로', r.ok && E.post({ action: 'csGet', id: r.id }).answers[0].who.kind === 'team' && E.post({ action: 'csGet', id: r.id }).q.seed === true, r);
E.post({ action: 'csAdminSeed', s: boss2, sid: 's01', op: 'hide' });
check('시드 숨김: 목록에서 빠짐', !E.post({ action: 'csList' }).items.some(x => x.seed));
E.post({ action: 'csAdminSeed', s: boss2, sid: 's01', op: 'pub' });
check('시드 다시 공개: 새로 만들지 않고 그 글을 다시', E.post({ action: 'csList' }).items.filter(x => x.seed).length === 1 && sheetRows(E, '상담질문').filter(x => x[14] === 's01').length === 1);
check('시드 글에는 상담 제안 불가', E.post({ action: 'csGet', s: bk, id: r.id }).offer.why === 'closed');

/* 지우기·탈퇴 */
check('남의 글은 못 지움', !E.post({ action: 'csDelete', s: tx, id: qO }).ok);
E.post({ action: 'userDelete', s: u2 });
check('탈퇴: 그 사람의 채팅방·메시지·차단 기록 지움', !sheetRows(E, '상담채팅방').slice(1).some(x => [rmO, offs[1].room].indexOf(x[0]) >= 0) && !(sheetRows(E, '상담차단').slice(1).length));
check('탈퇴: 질문 내용 지움 · 하트 결제 기록은 남김', !JSON.stringify(sheetRows(E, '상담질문')).includes('첫 집 매수 고민 제안 받기') && sheetRows(E, '하트내역').length > 3);

console.log(fail ? `고민 상담·하트: ${pass}개 통과, ${fail}개 실패` : `고민 상담·하트: ${pass}개 통과`);
process.exit(fail ? 1 : 0);
