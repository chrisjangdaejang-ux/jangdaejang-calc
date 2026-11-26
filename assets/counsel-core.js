/* 고민 상담 · 하트 — 계산 규칙(분류·전문가 종류·하트 상품표·사용처·환불 계산·개인정보 가림·간단 욕설 거르기·목록 순서)
   - 화면(assets/counsel.js · counsel/)과 서버(tools/agent-backend.gs '고민 상담·하트' 칸)가 같은 글자를 써요.
     아래 COUNSEL-CORE 블록은 서버에 그대로 복사돼 있어요(node tools/counsel-test.js 가 두 곳이 같은지 확인).
   - 하트는 전문가(공인중개사 등 답변하는 분)가 충전해 쓰는 것이에요. 일반 이용자는 질문·답변 보기·전문가 지정·상담 채팅이 모두 무료예요.
     전문가는 공개 답변이 무료예요. 하트는 ① 질문 글에서 [상담 제안 보내기](첫 메시지를 보내는 순간) ② 질문한 분이 요청한 1:1 채팅을 [채팅 수락]할 때만 써요.
     질문한 분이 72시간 안에 제안을 열어 보지도 않거나, 질문이 신고로 가려진 채 확정되면 서버가 자동으로 하트를 돌려 드려요(운영자 확인 없음). 승인 때 무료 하트 CS_FREE_HEARTS 개.
   - 하트 값은 대표 확정(2026-11-25): 상품표 3,900원/2·9,900원/6·19,900원/13·49,000원/35 · 상담 제안·채팅 수락 1건 2개 · 승인 무료 5개(무료 먼저) · 환불 7일 안 미사용 전액, 그 뒤 남은 하트 10% 공제, 무료 하트 환불 없음 · 유효기간 5년.
     바꿀 때는 CS_PACKS · CS_USES · CS_FREE_HEARTS 만 고치면 화면·서버·환불 계산이 함께 바뀌어요.
   - 여기 있는 욕설 목록은 누구나 아는 간단한 낱말뿐이에요. 더 촘촘한 거르기는 서버의 비공개 설정(살아보니와 같은 설정)이 맡아요.
   window.JDJ_CSCORE */
(function (root) {
'use strict';
/* COUNSEL-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/counsel-test.js 가 비교). */
const CS_V = 'counsel-2026-11-25';
/* 질문 분류 */
const CS_CATS = [['buy', '매수·매도'], ['rent', '전월세'], ['tax', '세금'], ['loan', '대출'], ['sub', '청약·분양'], ['redev', '재개발·재건축'], ['legal', '등기·법률'], ['etc', '기타']];
/* 답변하는 전문가 8종 — no: 확인할 번호 칸 이름(없으면 null) · org: 소속 칸 이름 · orgNeed: 소속 필수 · where: 운영자가 확인할 곳
   desc: 신청 화면 설명 · badge: 확인 뒤 표시 · proof: 받을 증빙(biz 사업자등록증 사진 필수 + links 활동 링크 1~3개 / work 재직 증빙 = 소개 페이지 주소 또는 재직증명서 사진)
   check: 운영자 승인 화면의 확인 순서 · showOrg: 채팅 전에도 소속·직위를 보여도 되는 직군(사무소 정보가 아님) */
const CS_PROS = {
  broker: { name: '공인중개사', no: '중개사무소 개설등록번호', org: '중개사무소 이름', orgNeed: true, where: '국가공간정보포털 부동산중개업 조회(등록·영업 상태)' },
  tax: { name: '세무사', no: '세무사 등록번호', org: '세무사무소 이름', orgNeed: false, where: '한국세무사회 세무사 찾기' },
  sales: { name: '분양상담사', no: null, org: '소속 분양대행사', orgNeed: true, where: '소속 분양대행사 확인(재직 확인서 또는 명함·사업자등록증)' },
  judicial: { name: '법무사', no: '법무사 등록번호', org: '법무사사무소 이름', orgNeed: false, where: '대한법무사협회 법무사 찾기' },
  loan: { name: '대출상담사', no: '금융위원회 대출모집인 등록번호', org: '소속 금융회사(위탁사)', orgNeed: true, where: '대출모집인 등록 조회(금융소비자 정보포털 파인 또는 대출모집인 통합조회)' },
  consult: { name: '부동산 컨설턴트', no: null, org: '상호(사업자 이름)', orgNeed: true, where: '사업자등록증 사진과 활동 링크', badge: '확인된 컨설턴트', desc: '부동산 컨설팅 사업자 · 방송·강의 활동 확인', proof: 'biz',
    check: ['사업자등록증 사진: 업종(종목)에 부동산 컨설팅·자문이 들어 있는지', '사업자등록증의 상호·대표자 이름이 신청 내용과 같은지', '활동 링크를 열어 방송 출연·강의·저서·칼럼이 본인 것인지', '국세청 홈택스 사업자 상태 조회로 휴업·폐업이 아닌지'] },
  prof: { name: '교수·연구자', no: null, org: '소속 대학·연구기관', orgNeed: true, title: '직위(예: 부교수·책임연구원)', where: '소속 기관 소개 페이지 또는 재직증명서', badge: '확인된 교수·연구자', desc: '대학·연구기관 재직 확인', proof: 'work', showOrg: true,
    check: ['기관 소개 페이지(교원·연구원 목록)를 열어 이름·소속·직위가 같은지', '또는 재직증명서 사진의 기관·이름·직위·발급일(3개월 안)을 확인', '기관 이메일을 적었다면 기관 도메인인지'] },
  appraiser: { name: '감정평가사', no: '감정평가사 등록번호', org: '감정평가법인·사무소 이름', orgNeed: false, where: '한국감정평가사협회 감정평가사 찾기', badge: '확인된 감정평가사', desc: '감정평가사 등록번호 확인',
    check: ['한국감정평가사협회 감정평가사 찾기에서 이름·등록번호가 같은지', '소속 법인·사무소가 신청 내용과 같은지'] }
};
/** 직군별 확인 배지 글자 */
function csBadge(kind) { return (CS_PROS[kind] && CS_PROS[kind].badge) || '확인된 전문가'; }
/** 직군별 안내 한 줄(답변·채팅 화면) — 컨설턴트는 중개를 할 수 없어요 */
const CS_KIND_NOTE = { consult: '중개(거래 연결·계약 대행)는 공인중개사만 할 수 있어요.' };
const CS_PRO_MAX = 5;                                 // 질문 하나에 전문가 답변 최대 수(상담팀 공식 답변은 따로)
/* 분류마다 답·상담 제안할 수 있는 전문가(대표 확정 2026-11-25): 세금 = 세무사, 등기·법률 = 법무사, 대출 = 대출상담사(등록된 대출모집인), 나머지 분류 = 다섯 직군 모두 */
const CS_CAT_ONLY = { tax: ['tax'], legal: ['judicial'], loan: ['loan'] };
const CS_LEN = { title: [5, 60], body: [20, 2000], answer: [20, 3000], nick: [0, 12] };
/* 하트 상품표(확정) — won: 결제 금액(원) · n: 하트 수 */
const CS_PACKS = [{ id: 'h2', won: 3900, n: 2 }, { id: 'h6', won: 9900, n: 6 }, { id: 'h13', won: 19900, n: 13 }, { id: 'h35', won: 49000, n: 35 }];
/* 하트 사용처(확정, 전문가만) — n: 쓰는 하트 수
   offer: 질문 글에서 [상담 제안 보내기] — 보내는 순간 차감 · accept: 질문한 분이 요청한 1:1 채팅을 [채팅 수락] — 수락하는 순간 차감(수락하지 않으면 차감 없음) */
const CS_USES = {
  offer: { n: 2, name: '상담 제안 보내기' },
  accept: { n: 2, name: '1:1 상담 채팅 수락' }
};
const CS_FREE_HEARTS = 5;                             // 전문가 승인 때 드리는 무료 하트(한 번)
/* 환불 규칙: 결제 후 days 일 안에 전혀 쓰지 않은 하트는 전액 · 일부 쓴 경우 남은 하트만큼(쓴 하트는 묶음 할인 전 단가로 계산)
   · days 가 지난 뒤에는 남은 하트 값에서 lateFee(10%)를 떼고 · 무료 하트는 대상 아님 · 하트 유효기간은 충전한 날부터 validYears 년(지나면 쓰거나 환불할 수 없음) */
const CS_REFUND = { days: 7, lateFee: 0.1, validYears: 5 };
function csExpireAt(at) { return Number(at) + CS_REFUND.validYears * 365 * 86400000; }

/** 이 분류에 답할 수 있는 전문가 종류 목록 */
function csKindsFor(cat) { return CS_CAT_ONLY[cat] ? CS_CAT_ONLY[cat].slice() : Object.keys(CS_PROS); }
/** 분류에 맞지 않는 전문가에게 보여 줄 말 */
function csKindMsg(cat) { const k = csKindsFor(cat).map(x => (CS_PROS[x] || {}).name).filter(Boolean); return `${csCatName(cat)} 질문에는 ${k.join('·')}만 답할 수 있어요.`; }
/** 지역 글자에서 구·군·시 이름만('서울 강남구' → '강남구') */
function csGuOf(s) { const m = String(s || '').match(/([가-힣]{1,8}(?:구|군|시))\s*$/) || String(s || '').match(/([가-힣]{1,8}(?:구|군))/); return m ? m[1] : ''; }
/** 등록번호 일부만 보이기('11680-2020-00123' → '11680-20*******') */
function csNoMask(no) { no = String(no || ''); const k = Math.ceil(no.length / 2); return no ? no.slice(0, k) + '*'.repeat(Math.max(0, no.length - k)) : ''; }
/** 전문가 찾기 기본 순서 점수: 평점·응답률·답변 수·공정 순환(그날 바뀌는 고른 몫)을 섞음. w(무게)는 서버 비공개 설정에서만 — 돈으로 순위를 살 수 없음
    st: { rating(1~5|null), resp(0~1|null), answers }, turn: 0~1(그날의 순환 값) */
function csRankScore(st, w, turn) {
  w = w || {};
  const r = st.rating == null ? 0.6 : (st.rating - 1) / 4, p = st.resp == null ? 0.5 : st.resp, a = Math.min(1, Math.log(1 + (st.answers || 0)) / Math.log(51));
  return (Number(w.r) || 0) * r + (Number(w.p) || 0) * p + (Number(w.a) || 0) * a + (Number(w.f) || 0) * (Number(turn) || 0);
}
function csCatName(id) { for (let i = 0; i < CS_CATS.length; i++) if (CS_CATS[i][0] === id) return CS_CATS[i][1]; return ''; }
function csPack(id) { for (let i = 0; i < CS_PACKS.length; i++) if (CS_PACKS[i].id === id) return CS_PACKS[i]; return null; }
/** 묶음 할인 전 하트 1개 값 = 가장 작은 묶음의 하트 1개 값(원, 10원 아래 올림) */
function csUnit() {
  let best = null;
  CS_PACKS.forEach(p => { if (!best || p.n < best.n) best = p; });
  return best ? Math.ceil(best.won / best.n / 10) * 10 : 0;
}
/** 묶음마다 '하트 1개에 얼마' · 가장 작은 묶음보다 얼마나 싼지(%) — 화면 상품표용 */
function csPackInfo(p) {
  const unit = csUnit(), per = Math.round(p.won / p.n);
  return { id: p.id, won: p.won, n: p.n, per: per, off: unit ? Math.max(0, Math.round((1 - per / unit) * 100)) : 0 };
}
/** 환불 금액 계산. lot: { kind:'paid'|'free', won, n, at(ms) } · used: 이 묶음에서 쓴 하트 수 · now(ms)
    → { won, full, why } why: free(무상) · none(남은 하트 없음) · full(7일 안·안 씀) · part(쓴 만큼 빼고) */
function csRefund(lot, used, now) {
  used = Math.max(0, Math.floor(Number(used) || 0));
  if (!lot || lot.kind !== 'paid') return { won: 0, full: false, why: 'free' };
  const n = Math.floor(Number(lot.n) || 0), won = Math.floor(Number(lot.won) || 0);
  if (used >= n) return { won: 0, full: false, why: 'none' };
  if (Number(now) > csExpireAt(lot.at)) return { won: 0, full: false, why: 'expired' };
  const late = Number(now) - Number(lot.at) > CS_REFUND.days * 86400000;
  if (!used && !late) return { won: won, full: true, why: 'full' };
  let r = Math.max(0, won - used * csUnit());
  if (late && CS_REFUND.lateFee > 0) r = Math.floor(r * (1 - CS_REFUND.lateFee) / 10) * 10;
  return { won: r, full: false, why: 'part' };
}
/** 하트 쓰기: 어느 묶음에서 몇 개를 쓸지. 무상 하트 먼저(오래된 것부터), 그다음 결제 하트(오래된 것부터). 환불 요청 중인 묶음은 건너뜀
    lots: [{ id, kind, n, left, at, lock }] → { ok, take: { 묶음id: 개수 } } */
function csAlloc(lots, need) {
  need = Math.floor(Number(need) || 0);
  const list = (lots || []).filter(l => !l.lock && l.left > 0).slice().sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'free' ? -1 : 1) || (a.at - b.at));
  const take = {}; let left = need;
  for (let i = 0; i < list.length && left > 0; i++) { const t = Math.min(list[i].left, left); take[list[i].id] = t; left -= t; }
  return left > 0 ? { ok: false, take: {} } : { ok: true, take: take };
}
/* 개인정보 가림: 전화번호·주민등록번호 모양을 '***'로 */
const CS_PI = [
  /\d{6}\s*[-–]\s*[1-8]\d{6}/g,                                                   // 주민등록번호·외국인등록번호
  /(?:\+?82[\s.\-]*|0)1[016789][\s.\-)]*\d{3,4}[\s.\-]*\d{4}/g,                  // 휴대폰
  /(?:\+?82[\s.\-]*|0)(?:2|[3-6][1-5]|70|50\d?)[\s.\-)]*\d{3,4}[\s.\-]*\d{4}/g    // 지역번호·인터넷 전화·안심번호
];
function csMask(text) {
  let s = String(text == null ? '' : text), hit = false;
  CS_PI.forEach(re => { s = s.replace(re, () => { hit = true; return '***'; }); });
  return { text: s, hit: hit };
}
/* 상담 채팅 — 앱 안 1:1 대화. 채팅방 안에서는 질문한 분·전문가 모두 연락처를 자유롭게 주고받을 수 있어요([내 연락처 보내기] 단추도 있어요).
   공개 질문·공개 답변(게시판)은 광고를 막으려고 전화번호·이메일·메신저 아이디·외부 링크를 자동으로 가려요(csHideContact).
   poll: 채팅방이 열려 있을 때 새 메시지 확인 간격(초, 화면이 숨겨지면 멈춤) · keepDays: 상담이 끝난 뒤 보관 일수(지나면 자동 삭제)
   idleDays: 이 날 수 동안 메시지가 없으면 상담을 저절로 끝냄 · mailGapMin: 같은 방 같은 사람에게 알림 메일은 이 분에 한 통까지
   mailDay: 하루 채팅 알림 메일 전체 한도(개인 구글 계정 하루 100통 안에서) · mailReserve: 메일 남은 양이 이만큼이면 알림을 멈춤
   reqDays: 전문가가 이 날 수 안에 [채팅 수락]을 하지 않으면 요청이 만료(하트 차감 없음)
   offerMax: 질문 하나에 받는 상담 제안 수(먼저 온 순) · offerOpenH: 질문한 분이 이 시간 안에 제안을 열어 보지도 않으면 하트를 저절로 돌려 드림 */
const CS_CHAT = { poll: 5, keepDays: 365, idleDays: 90, reqDays: 7, offerMax: 5, offerOpenH: 72, mailGapMin: 60, mailDay: 40, mailReserve: 20, len: [1, 1000] };
const CS_CHAT_WHY = [['abuse', '욕설·비방'], ['pi', '개인 정보'], ['ad', '광고·홍보'], ['false', '사실이 아닌 내용'], ['illegal', '불법·무자격 영업'], ['etc', '기타']];
/* 신고 가림: 서로 다른 사람의 신고가 이 수만큼 쌓이면 바로 가리고 운영자가 판단(한 사람이 여러 번 신고해도 1건) — 대표 확정 */
const CS_REPORT_HIDE = 2;
/* 게시판 연락 수단 가림: 전화번호·이메일·카카오톡 등 메신저 아이디·외부 링크·길게 이어진 숫자 → '***' */
const CS_CONTACT = [
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,                                                                        // 이메일
  /(?:https?:\/\/|www\.)\S+/gi,                                                                            // 링크
  /\b[a-z0-9-]{2,}\.(?:com|net|org|kr|co|me|ly|io|link|site|xyz|shop|app|gl|to|kakao)(?:\.[a-z]{2,})?(?:\/\S*)?/gi,   // 주소(open.kakao.com 등)
  /((?:카카오톡|카톡|카카오|kakao(?:talk)?|katalk|오픈\s*채팅|라인|line|텔레그램|telegram|텔레|인스타그램|인스타|instagram|insta|위챗|wechat)\s*(?:아이디|id|계정|주소)?\s*[:：]?\s*)@?[A-Za-z0-9._-]{3,}/gi,
  /(?:\d[\s.\-)(]*){9,}\d/g                                                                                // 띄어 쓴 전화번호 같은 긴 숫자
];
function csHideContact(text) {
  let m = csMask(text), s = m.text, hit = m.hit;
  CS_CONTACT.forEach((re, i) => { s = s.replace(re, (all, pre) => { hit = true; return i === 3 ? pre + '***' : '***'; }); });
  return { text: s, hit: hit };
}
/* 간단 욕설 거르기(누구나 아는 낱말만 — 띄어쓰기·기호를 빼고 봄) */
const CS_BAD = ['씨발', '시발', '씨바', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '개새끼', '개색기', '좆', '존나', 'ㅈㄴ', '지랄', '미친놈', '미친년', '썅', '니애미', '느금마', '꺼져'];
function csNorm(s) { return String(s || '').toLowerCase().replace(/[\s.,·•~!?\-_*'"`^|/\\()[\]{}:;0-9]/g, ''); }
function csBad(text) { const n = csNorm(text); return CS_BAD.some(w => n.indexOf(w) >= 0); }
/** 이 전문가가 이 질문에 답할 수 있나. pro: { id, kind, ok(승인) } · q: { cat, priv, to } · answers: [{ pro(전문가id) }] */
function csCanAnswer(pro, q, answers) {
  if (!pro || !pro.ok) return { ok: false, why: 'unverified' };
  if (q.priv && q.to !== pro.id) return { ok: false, why: 'private' };
  const only = CS_CAT_ONLY[q.cat];
  if (only && only.indexOf(pro.kind) < 0) return { ok: false, why: 'kind' };
  const pros = (answers || []).filter(a => a.pro);
  if (pros.some(a => a.pro === pro.id)) return { ok: false, why: 'dup' };
  if (pros.length >= CS_PRO_MAX) return { ok: false, why: 'full' };
  return { ok: true, why: '' };
}
/** 목록 순서: '위로 올리기'가 살아 있는 질문(up > now)이 먼저(올린 시각 최근 순), 그다음 새 질문 순 */
function csOrder(list, now) {
  return (list || []).slice().sort((a, b) => {
    const ua = a.up > now ? a.upAt || 0 : 0, ub = b.up > now ? b.upAt || 0 : 0;
    if (!!ua !== !!ub) return ua ? -1 : 1;
    if (ua && ub && ua !== ub) return ub - ua;
    return (b.at || 0) - (a.at || 0);
  });
}
/** 질문·답변 글 확인: 길이·욕설 → { ok, err } (개인정보는 막지 않고 가려서 올림) */
function csCheckText(kind, s) {
  const L = CS_LEN[kind] || [1, 2000], t = String(s == null ? '' : s).trim();
  if (t.length < L[0]) return { ok: false, err: kind === 'title' ? `제목을 ${L[0]}자 이상 적어 주세요.` : `내용을 ${L[0]}자 이상 적어 주세요.` };
  if (t.length > L[1]) return { ok: false, err: `${L[1]}자까지 쓸 수 있어요.` };
  if (csBad(t)) return { ok: false, err: '욕설이나 남을 깎아내리는 말은 쓸 수 없어요.' };
  return { ok: true, err: '' };
}
/* COUNSEL-CORE END */

const API = { V: CS_V, REPORT_HIDE: CS_REPORT_HIDE, FREE_HEARTS: CS_FREE_HEARTS, expireAt: csExpireAt, CHAT: CS_CHAT, CHAT_WHY: CS_CHAT_WHY, hideContact: csHideContact, CATS: CS_CATS, PROS: CS_PROS, PRO_MAX: CS_PRO_MAX, CAT_ONLY: CS_CAT_ONLY, LEN: CS_LEN, PACKS: CS_PACKS, USES: CS_USES, REFUND: CS_REFUND,
  catName: csCatName, badge: csBadge, KIND_NOTE: CS_KIND_NOTE, kindsFor: csKindsFor, kindMsg: csKindMsg, guOf: csGuOf, noMask: csNoMask, rankScore: csRankScore, pack: csPack, unit: csUnit, packInfo: csPackInfo, refund: csRefund, alloc: csAlloc, mask: csMask, bad: csBad, canAnswer: csCanAnswer, order: csOrder, checkText: csCheckText };
root.JDJ_CSCORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
