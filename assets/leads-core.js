/* 집예보 분양 상담 연결(성과형 리드) — 계산 규칙 한 곳 (대표 승인 2026-11-27)
   - 화면(assets/leads.js · my/leads/ · lead/confirm/ · ad/console/)과 서버(tools/agent-backend.gs 'v77 분양 상담 연결' 칸)가 같은 글자를 써요.
     아래 LEADS-CORE 블록은 서버에 그대로 복사돼 있어요(node tools/leads-test.js 가 두 곳이 같은지 확인).
   - 지금은 숨김: assets/config.js LEADS_ENABLED · 서버 LEADS_ENABLED 가 false 면 어떤 화면에도 칸·단추가 없고 서버도 운영자 계정만 받아요.
     대표 미리 보기: 주소 끝 ?preview=leads 를 붙여 한 번 열면 그 기기에서만 보여요(끄기 ?preview=off). 미리 보기는 실제로 보내지 않는 '예시' 흐름이에요.
   - 값을 바꿀 때는 LD_PRICE · LD_RULES · LD_REGION 만 고치면 화면·서버·시험이 함께 바뀌어요(두 곳을 똑같이).
   단계: ① 대화 열기(손님이 현장에 질문 → 현장이 답하면 광고주 하트 LD_PRICE.chat.hearts 개 — 고민 상담 하트 그대로)
         ② 검증된 상담 신청(휴대폰 확인 + 이 광고주에게 연락처 제공 동의 — 등급 A/B × 지역 등급 단가)
         ③ 방문 예약 확정(광고주가 확정 표시 → 성과금 추가) ④ 계약 성사 성공보수(설계만, 꺼짐)
   window.JDJ_LDCORE */
(function (root) {
'use strict';
/* LEADS-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/leads-test.js 가 비교). */
const LD_V = 'leads-2026-11-27';
const LD_CONSENT_V = 'ldc-2026-11-27';                 // 제3자 제공 동의 문구 판 — 문구를 바꾸면 판을 올려요(동의 기록에 판·문구 지문이 남아요)
/* 단가(런칭가, 원 · VAT 별도) — 지역 등급 1·2·3 */
const LD_PRICE = {
  chat: { hearts: 3 },                                 // ① 대화 열기: 현장이 첫 답을 보낼 때 하트 3개(하트 1개 1,400~1,950원 → 약 4~6천 원). 2~3개 사이에서 고름
  lead: { A: { 1: 80000, 2: 65000, 3: 50000 },         // ② 검증된 상담 신청 A 등급: 5~8만
          B: { 1: 30000, 2: 25000, 3: 20000 },         //                     B 등급: 2~3만
          C: { 1: 0, 2: 0, 3: 0 } },                   //   C 등급(신호가 약함): 받지 않음 — 광고주에게는 '관심 단계'로 무료 전달(대표 확인 필요)
  visit: { 1: 50000, 2: 40000, 3: 30000 },             // ③ 방문 예약 확정 성과금(+3~5만)
  success: { on: false, pct: 0, cap: 0 }               // ④ 계약 성사 성공보수 — 설계만(꺼짐). 공인중개사법·분양대행 검토 전에는 켜지 않음
};
/* 자동 처리 규칙 */
const LD_RULES = {
  trialFree: 5,          // 새 광고주 첫 N건 무료(상담 신청 ②만)
  dupDays: 30,           // 같은 사람(휴대폰) + 같은 현장 30일 안 다시 신청 → 하나로 합침, 과금 없음
  disputeDays: 7,        // 광고주가 [연락이 안 돼요]/[신청한 적 없대요]를 누를 수 있는 기간(전달한 날부터)
  confirmHours: 48,      // 손님 확인 대기 — 이 안에 답이 없으면 자동 환불
  capPct: 20,            // 한 광고주 한 달 자동 환불 상한(그달 과금한 상담 신청 수의 %) — 넘는 것은 예외 목록으로
  keepDays: 183,         // 광고주에게 전달한 연락처 보관(6개월) 뒤 자동 삭제
  otpMin: 5, otpTry: 5,  // 휴대폰 인증번호 유효 5분 · 5번 틀리면 다시 받기
  anomaly: { advMin: 10, advRate: 40, custLeads30: 6, custNo: 2 }   // 광고주 이의 비율 40%↑(10건 이상일 때) · 손님 30일 6건↑ 또는 '아니요' 2번↑ → 예외 목록
};
/* 지역 등급(기간형 광고 지역 단가와 같은 표): 시·군·구별 최근 12개월 아파트 거래 금액 합계(건수 × 평균 거래가) 상위 20% = 1등급, 다음 30% = 2등급, 나머지 50% = 3등급.
   현장 분양가(범위의 가운데 값)가 15억 이상이면 한 등급 위. 해마다 우리 자료로 다시 계산(node tools/ad-tiers-build.js). */
const LD_REGION = { months: 12, top: 20, mid: 30, m2: 84, premiumMan: 150000 };
/* 손님이 고를 수 있는 공유 항목 — need: 늘 보냄(동의 화면에 표시) · def: 처음에 체크돼 있는지 */
const LD_FIELDS = [
  { k: 'name', t: '이름', need: true },
  { k: 'phone', t: '휴대폰 번호(확인된 번호)', need: true },
  { k: 'grade', t: '상담 준비 정도(A·B·C 등급만 — 등급을 만든 값은 보내지 않아요)', need: true },
  { k: 'time', t: '희망 상담 시간', def: true },
  { k: 'budget', t: '예산 구간(예: 6~9억 — 금액이 아니라 구간)', def: false },
  { k: 'noHome', t: '무주택 여부', def: false },
  { k: 'cy', t: '청약 가점 구간(예: 50~64점)', def: false },
  { k: 'live', t: '사는 곳(시·군·구 이름)', def: false },
  { k: 'amount', t: '이 기기에서 계산한 매수 가능 금액(원 단위 그대로)', def: false },
  { k: 'memo', t: '남기는 말', def: true }
];
const LD_TIMES = ['평일 오전', '평일 오후', '평일 저녁(6~9시)', '주말', '아무 때나'];
const LD_WHY = { noreach: '연락이 안 돼요', deny: '신청한 적 없대요' };
const LD_ST = { ok: '전달', ask: '확인 중', valid: '확인됨', refund: '환불', exc: '예외 검토', dup: '합침', gone: '철회', hold: '잔액 부족' };

const ldArr = v => (Array.isArray(v) ? v : []);
/** 시·군·구 거래 금액 합계로 등급 매기기. sgg = { code: { s: [월별 3.3㎡당 평균가(만원)], c: [월별 거래 건수] } } (공개 index.json 모양)
    → { code: { g, amt(84㎡ 환산 거래 금액 합계, 만원), rank } } */
function ldRegionGrades(sgg, months) {
  months = months || LD_REGION.months;
  const py = LD_REGION.m2 / 3.3058, rows = [];
  Object.keys(sgg || {}).forEach(code => {
    const o = sgg[code] || {}, s = ldArr(o.s), c = ldArr(o.c), n = Math.min(s.length, c.length);
    let amt = 0; for (let i = Math.max(0, n - months); i < n; i++) amt += (+c[i] || 0) * (+s[i] || 0) * py;
    rows.push({ code: code, amt: Math.round(amt) });
  });
  rows.sort((a, b) => (b.amt - a.amt) || a.code.localeCompare(b.code));
  const N = rows.length, c1 = Math.ceil(N * LD_REGION.top / 100), c2 = Math.ceil(N * (LD_REGION.top + LD_REGION.mid) / 100), out = {};
  rows.forEach((r, i) => { out[r.code] = { g: i < c1 ? 1 : i < c2 ? 2 : 3, amt: r.amt, rank: i + 1 }; });
  return out;
}
/** 현장 지역 등급: 시·군·구 등급에서 분양가(범위 가운데 값, 만원) 15억 이상이면 한 등급 위. 등급을 모르면 3 */
function ldSiteGrade(g, pmin, pmax) {
  g = [1, 2, 3].indexOf(+g) >= 0 ? +g : 3;
  const lo = +pmin || 0, hi = +pmax || lo, mid = lo && hi ? (lo + hi) / 2 : (lo || hi);
  return mid >= LD_REGION.premiumMan ? Math.max(1, g - 1) : g;
}
/** 예산 구간(만원 [lo, hi)) 과 분양가 범위(만원) 비교 → 'fit' 겹침 · 'near' 20% 안쪽으로 모자람 · 'no' · '' 모름 */
function ldBudgetFit(lo, hi, pmin, pmax) {
  lo = +lo; hi = +hi; pmin = +pmin || 0; pmax = +pmax || pmin;
  if (!(hi > 0) || !(pmin > 0)) return '';
  if (hi > pmin && lo <= pmax) return 'fit';
  if (hi <= pmin && hi >= pmin * 0.8) return 'near';
  return 'no';
}
/** 상담 준비 정도 등급(이 기기에서 계산). sig = { verified, budget('fit'|'near'|'no'|''), noHome, cy('fit'|'no'|''), live('sgg'|'sido'|''), views, plan, time }
    → { grade: 'A'|'B'|'C'|'', pts } — 휴대폰 확인 전이면 '' (상담 신청이 아님) */
function ldGrade(sig) {
  sig = sig || {};
  if (sig.verified !== true) return { grade: '', pts: 0 };
  let p = 0;
  if (sig.budget === 'fit') p += 3; else if (sig.budget === 'near') p += 1;
  if (sig.noHome === true) p += 1;
  if (sig.cy === 'fit') p += 1;
  if (sig.live === 'sgg') p += 2; else if (sig.live === 'sido') p += 1;
  if ((+sig.views || 0) >= 3) p += 1;
  if (sig.plan === true) p += 1;
  if (sig.time === true) p += 1;
  const grade = sig.budget === 'fit' && p >= 6 ? 'A' : (sig.budget !== 'no' && p >= 3) ? 'B' : 'C';
  return { grade: grade, pts: p };
}
/** 단계별 값. step: 'chat'|'lead'|'visit'|'success' · o = { grade, rg(현장 지역 등급), trialLeft }
    → { won, hearts, free, why } */
function ldPrice(step, o) {
  o = o || {}; const rg = [1, 2, 3].indexOf(+o.rg) >= 0 ? +o.rg : 3;
  if (step === 'chat') return { won: 0, hearts: LD_PRICE.chat.hearts, free: false, why: 'chat' };
  if (step === 'visit') return { won: LD_PRICE.visit[rg], hearts: 0, free: false, why: 'visit' };
  if (step === 'success') return { won: 0, hearts: 0, free: true, why: LD_PRICE.success.on ? 'success' : 'off' };
  if (step !== 'lead') return { won: 0, hearts: 0, free: true, why: 'none' };
  const t = LD_PRICE.lead[o.grade] || LD_PRICE.lead.C, won = t[rg] || 0;
  if (!won) return { won: 0, hearts: 0, free: true, why: 'grade' };
  if ((+o.trialLeft || 0) > 0) return { won: 0, hearts: 0, free: true, why: 'trial' };
  return { won: won, hearts: 0, free: false, why: 'lead' };
}
/** 같은 사람 + 같은 현장 30일 안 신청이 이미 있으면 그 신청(합침). list = [{ id, ph(휴대폰 지문), site, at(ms), st }] */
function ldDup(list, ph, site, now) {
  const lim = LD_RULES.dupDays * 86400000;
  return ldArr(list).filter(x => x && x.ph === ph && x.site === site && x.st !== LD_ST.gone && x.st !== LD_ST.dup && now - (+x.at || 0) <= lim)
    .sort((a, b) => b.at - a.at)[0] || null;
}
/** 광고주가 이의를 낼 수 있는지 */
function ldCanDispute(lead, now) {
  if (!lead || [LD_ST.ok, LD_ST.hold].indexOf(lead.st) < 0) return false;
  return now - (+lead.at || 0) <= LD_RULES.disputeDays * 86400000 && !(+lead.free) && (+lead.won || 0) > 0;
}
/** 이의 처리 상태 바꾸기(사람 손 없음). ev = { t: 'ask', why } | { t: 'answer', yes } | { t: 'tick' }
    → { st, act: 'send'(손님 확인 메시지) | 'notify'(광고주에게 확인됐다고) | 'refund' | 'exc'(상한 넘음 → 예외 목록) | '' , why }
    cap = { billed(이번 달 과금 건수), refunded(이번 달 자동 환불 건수) } */
function ldDispute(lead, ev, now, cap) {
  lead = lead || {}; ev = ev || {};
  if (ev.t === 'ask') {
    if (!LD_WHY[ev.why] || !ldCanDispute(lead, now)) return { st: lead.st, act: '' };
    return { st: LD_ST.ask, act: 'send', why: ev.why };
  }
  if (lead.st !== LD_ST.ask) return { st: lead.st, act: '' };
  const late = now - (+lead.askAt || 0) >= LD_RULES.confirmHours * 3600000;
  if (ev.t === 'answer' && ev.yes === true && !late) return { st: LD_ST.valid, act: 'notify' };
  if ((ev.t === 'answer' && ev.yes === false) || (ev.t === 'tick' && late) || (ev.t === 'answer' && late)) {
    return ldCapOk(cap) ? { st: LD_ST.refund, act: 'refund', why: ev.t === 'tick' || late ? 'noanswer' : 'no' } : { st: LD_ST.exc, act: 'exc', why: 'cap' };
  }
  return { st: lead.st, act: '' };
}
/** 이번 달 자동 환불을 하나 더 해도 되는지(상한 = 과금 건수의 capPct%, 올림) */
function ldCapOk(cap) {
  cap = cap || {}; const billed = +cap.billed || 0, done = +cap.refunded || 0;
  return done + 1 <= Math.ceil(billed * LD_RULES.capPct / 100);
}
/** 이상한 비율 찾기 → 이유 목록. adv = { leads, disputes } · cust = { leads30, no } */
function ldAnomaly(adv, cust) {
  const A = LD_RULES.anomaly, out = [];
  adv = adv || {}; cust = cust || {};
  if ((+adv.leads || 0) >= A.advMin && (+adv.disputes || 0) * 100 / adv.leads >= A.advRate) out.push('adv_rate');
  if ((+cust.leads30 || 0) >= A.custLeads30) out.push('cust_many');
  if ((+cust.no || 0) >= A.custNo) out.push('cust_no');
  return out;
}
/** 제3자 제공 동의 문구(화면에 보이는 글 = 서버가 기록하는 글). o = { co(받는 회사), site(현장), fields([k]), keep(일) } */
function ldConsentText(o) {
  o = o || {};
  const F = LD_FIELDS.filter(f => f.need || ldArr(o.fields).indexOf(f.k) >= 0).map(f => f.t.replace(/\(.*\)$/, ''));
  return `[개인정보 제3자 제공 동의 · ${LD_CONSENT_V}] 받는 곳: ${o.co || ''} · 현장: ${o.site || ''} · 목적: 이 현장 분양 상담 연락(전화·문자) · `
    + `제공 항목: ${F.join(', ')} · 받는 곳의 보관 기간: 받은 날부터 ${Math.round((o.keep || LD_RULES.keepDays) / 30)}개월 또는 상담이 끝나거나 동의를 거두면 바로 삭제 · `
    + `동의하지 않아도 집예보의 다른 기능은 그대로 쓸 수 있어요(이 현장 상담 연결만 안 돼요). 동의는 내 상담 신청(my/leads/)에서 언제든 거둘 수 있어요.`;
}
/* LEADS-CORE END */

const API = { V: LD_V, CONSENT_V: LD_CONSENT_V, PRICE: LD_PRICE, RULES: LD_RULES, REGION: LD_REGION, FIELDS: LD_FIELDS, TIMES: LD_TIMES, WHY: LD_WHY, ST: LD_ST,
  regionGrades: ldRegionGrades, siteGrade: ldSiteGrade, budgetFit: ldBudgetFit, grade: ldGrade, price: ldPrice, dup: ldDup, canDispute: ldCanDispute,
  dispute: ldDispute, capOk: ldCapOk, anomaly: ldAnomaly, consentText: ldConsentText };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.JDJ_LDCORE = API;
})(typeof window !== 'undefined' ? window : globalThis);
