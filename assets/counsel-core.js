/* 고민 상담 · 하트 — 계산 규칙(분류·전문가 종류·하트 상품표·사용처·환불 계산·개인정보 가림·간단 욕설 거르기·목록 순서)
   - 화면(assets/counsel.js · counsel/)과 서버(tools/agent-backend.gs '고민 상담·하트' 칸)가 같은 글자를 써요.
     아래 COUNSEL-CORE 블록은 서버에 그대로 복사돼 있어요(node tools/counsel-test.js 가 두 곳이 같은지 확인).
   - 하트 값(상품표·사용처)은 대표가 정하기 전 초안이에요. 바꿀 때는 CS_PACKS · CS_USES 두 줄만 고치면 화면·서버·환불 계산이 함께 바뀌어요.
   - 여기 있는 욕설 목록은 누구나 아는 간단한 낱말뿐이에요. 더 촘촘한 거르기는 서버의 비공개 설정(살아보니와 같은 설정)이 맡아요.
   window.JDJ_CSCORE */
(function (root) {
'use strict';
/* COUNSEL-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/counsel-test.js 가 비교). */
const CS_V = 'counsel-2026-11-25';
/* 질문 분류 */
const CS_CATS = [['buy', '매수·매도'], ['rent', '전월세'], ['tax', '세금'], ['loan', '대출'], ['sub', '청약·분양'], ['redev', '재개발·재건축'], ['legal', '등기·법률'], ['etc', '기타']];
/* 답변하는 전문가 5종 — no: 확인할 번호 칸 이름(없으면 null) · org: 소속 칸 이름 · orgNeed: 소속 필수 · where: 운영자가 확인할 곳 */
const CS_PROS = {
  broker: { name: '공인중개사', no: '중개사무소 개설등록번호', org: '중개사무소 이름', orgNeed: true, where: '국가공간정보포털 부동산중개업 조회(등록·영업 상태)' },
  tax: { name: '세무사', no: '세무사 등록번호', org: '세무사무소 이름', orgNeed: false, where: '한국세무사회 세무사 찾기' },
  sales: { name: '분양상담사', no: null, org: '소속 분양대행사', orgNeed: true, where: '소속 분양대행사 확인(재직 확인서 또는 명함·사업자등록증)' },
  judicial: { name: '법무사', no: '법무사 등록번호', org: '법무사사무소 이름', orgNeed: false, where: '대한법무사협회 법무사 찾기' },
  loan: { name: '대출상담사', no: '금융위원회 대출모집인 등록번호', org: '소속 금융회사(위탁사)', orgNeed: true, where: '대출모집인 등록 조회(금융소비자 정보포털 파인 또는 대출모집인 통합조회)' }
};
const CS_PRO_MAX = 5;                                 // 질문 하나에 전문가 답변 최대 수(상담팀 공식 답변은 따로)
const CS_CAT_ONLY = { loan: ['loan'] };               // 분류마다 답할 수 있는 전문가 종류(없으면 모두) — 대출은 등록된 대출모집인만
const CS_LEN = { title: [5, 60], body: [20, 2000], answer: [20, 3000], nick: [0, 12] };
/* 하트 상품표(초안) — won: 결제 금액(원) · n: 하트 수 */
const CS_PACKS = [{ id: 'h2', won: 3900, n: 2 }, { id: 'h6', won: 9900, n: 6 }, { id: 'h13', won: 19900, n: 13 }, { id: 'h35', won: 49000, n: 35 }];
/* 하트 사용처(초안) — n: 쓰는 하트 수. 일반 공개 질문·답변 보기는 무료 */
const CS_USES = {
  private: { n: 3, name: '전문가 1:1 비공개 상담 요청' },
  bump: { n: 1, name: '내 질문 위로 올리기', hours: 24 },
  pick: { n: 2, name: '원하는 전문가 지정 질문' }
};
/* 환불 규칙: 결제 후 days 일 안에 전혀 쓰지 않은 하트는 전액 · 일부 쓴 경우 남은 하트만큼(쓴 하트는 묶음 할인 전 단가로 계산) · 무상 하트는 대상 아님
   lateFee: days 가 지난 뒤 환불할 때 떼는 비율(0 = 떼지 않음, 대표가 정할 값) */
const CS_REFUND = { days: 7, lateFee: 0 };

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

const API = { V: CS_V, CATS: CS_CATS, PROS: CS_PROS, PRO_MAX: CS_PRO_MAX, CAT_ONLY: CS_CAT_ONLY, LEN: CS_LEN, PACKS: CS_PACKS, USES: CS_USES, REFUND: CS_REFUND,
  catName: csCatName, pack: csPack, unit: csUnit, packInfo: csPackInfo, refund: csRefund, alloc: csAlloc, mask: csMask, bad: csBad, canAnswer: csCanAnswer, order: csOrder, checkText: csCheckText };
root.JDJ_CSCORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
