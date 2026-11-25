/* 이사 견적 받기(이사업체 제휴) — 계산 규칙
   - 화면(assets/move.js·move/)과 서버(tools/agent-backend.gs 'v57' 칸)가 같은 글자를 써요. 아래 MOVE-CORE 블록은 서버에 그대로 복사돼 있어요.
   - 숫자는 대표 승인 값(2026-11-25): 견적 요청 하나를 최대 3곳이 열어 봄 · 연락처 열람 1건 소형 3,000원 · 가정 8,000원 · 대형 15,000원
     · 충전 5만·10만 원(10만 원은 10% 더) · 승인 첫 달 무료 열람 10건 · 잘못된 요청 신고는 열람 뒤 72시간 안(운영자 확인 뒤 돌려 드림).
   - 금액·한도는 서버 스크립트 속성 MOVE_SETTINGS(JSON)로 코드 없이 바꿀 수 있어요(mvSettings). 포인트 계산은 서버에서만 해요. */
(function (root) {
  'use strict';
/* MOVE-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/move-test.js 가 비교). */
const MV_RULE = {
  /* 이사 규모와 연락처 열람 1건 값(원) */
  sizes: [
    { id: 's', t: '소형', d: '원룸·용달', price: 3000 },
    { id: 'h', t: '가정', d: '투룸~30평대', price: 8000 },
    { id: 'l', t: '대형', d: '40평 이상·사무실', price: 15000 }
  ],
  maxOpen: 3,                 // 견적 요청 하나를 열어 볼 수 있는 업체 수(다 차면 다른 업체에게는 사라짐)
  firstShow: 3,               // 처음 보여 주는 업체 수(점수 순)
  waveHours: 12, waveAdd: 3, maxShow: 9,   // 12시간마다 아직 덜 열렸으면 다음 순서 3곳에 더 보여 줌(최대 9곳)
  topups: [{ amt: 50000, bonusPct: 0 }, { amt: 100000, bonusPct: 10 }],   // 충전 단위와 더 드리는 비율
  freeLeads: 10, freeDays: 30,             // 승인 때 첫 달(30일) 무료 열람 10건
  refundHours: 72,                          // 잘못된 요청 신고: 열람 뒤 72시간 안
  dateMaxDays: 180,                         // 이사 날짜: 오늘부터 180일 안
  keepDays: 90,                             // 연락처 보관: 이사 날짜(또는 요청일) 뒤 90일
  reviewAfterDays: 1, reviewUntilDays: 30,  // 이사 다음 날부터 30일 동안 후기 받기
  maxGu: 15,                                // 업체가 고를 수 있는 서비스 구 수
  phoneDay: 2, dayMax: 300,                 // 같은 번호 하루 2건 · 하루 전체 300건
  /* 노출 순서 점수 = 평점 40% + 응답률 30% + 순서 공정성 30% (처음엔 평점 4.0·응답률 70%로 보고 시작) */
  w: { rating: 0.4, resp: 0.3, fair: 0.3 }, prior: { rating: 4, rn: 5, resp: 0.7, pn: 5 }, fairHours: 72, statDays: 90,
  stopDays: 7,                              // 2차 제재 노출 중지 기간
  lowRating: 3, lowRatingN: 5,              // 평점 3.0 아래(후기 5개 이상)면 운영자 확인 목록에
  /* 나중에(지금은 꺼짐): 구 우선 노출 월 구독 */
  guTop: { enabled: false, price: 0, slots: 1 }
};
const MV_REPORT = { wrong: '없는 번호·다른 사람 번호', prank: '장난 요청' };
const MV_ELEV = { y: '있음', n: '없음', u: '모름' };
/** 규모 하나 */
function mvSize(id) { for (let i = 0; i < MV_RULE.sizes.length; i++) if (MV_RULE.sizes[i].id === id) return MV_RULE.sizes[i]; return null; }
/** 연락처 열람 1건 값(원). 모르는 규모면 0 */
function mvPrice(id) { const s = mvSize(id); return s ? s.price : 0; }
/** 충전: 결제 금액 → { amt, bonus, pts }. 정해진 단위가 아니면 null */
function mvTopup(amt) {
  amt = Math.round(Number(amt) || 0);
  for (let i = 0; i < MV_RULE.topups.length; i++) { const t = MV_RULE.topups[i]; if (t.amt === amt) { const b = Math.floor(amt * (t.bonusPct || 0) / 100); return { amt: amt, bonus: b, pts: amt + b }; } }
  return null;
}
/** 휴대폰 번호(숫자만, 010…) 확인 */
function mvPhone(v) { const d = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return /^01[016789]\d{7,8}$/.test(d) ? d : ''; }
/** 가린 연락처: 010-****-1234 */
function mvMaskPhone(d) { d = String(d || ''); return d.length >= 10 ? d.slice(0, 3) + '-****-' + d.slice(-4) : ''; }
/** 가린 이름: 홍*동 · 김* · 남궁**수 */
function mvMaskName(n) {
  const s = String(n == null ? '' : n).replace(/\s+/g, '');
  if (!s) return '';
  if (s.length === 1) return s + '*';
  if (s.length === 2) return s[0] + '*';
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
}
/** 날짜 글자(YYYY-MM-DD) ↔ 한국 0시 ms */
function mvDayMs(ymdS) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymdS || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - 9 * 3600000 : NaN; }
function mvYmd(ms) { return new Date(ms + 9 * 3600000).toISOString().slice(0, 10); }
function mvAddDays(ymdS, n) { return mvYmd(mvDayMs(ymdS) + n * 86400000); }
/** 이사 날짜 확인: 오늘~180일 안. 돌려줌 '' 또는 고칠 점 */
function mvDateErr(d, todayYmd) {
  const ms = mvDayMs(d), t = mvDayMs(todayYmd);
  if (!isFinite(ms) || mvYmd(ms) !== d) return '이사 날짜를 골라 주세요.';
  if (ms < t) return '이사 날짜가 지났어요. 다시 골라 주세요.';
  if (ms > t + MV_RULE.dateMaxDays * 86400000) return `이사 날짜는 오늘부터 ${MV_RULE.dateMaxDays}일 안으로 골라 주세요.`;
  return '';
}
/** 잘못된 요청 신고가 아직 되는지(열람 시각 ms, 지금 ms) */
function mvRefundOk(openMs, nowMs) { return isFinite(openMs) && nowMs - openMs >= 0 && nowMs - openMs <= MV_RULE.refundHours * 3600000; }
/** 후기를 받을 수 있는지: 이사 다음 날부터 30일 */
function mvReviewOpen(moveYmd, todayYmd) {
  const d = (mvDayMs(todayYmd) - mvDayMs(moveYmd)) / 86400000;
  return d >= MV_RULE.reviewAfterDays && d <= MV_RULE.reviewUntilDays;
}
/** 같은 입력이면 늘 같은 값(같은 점수일 때 순서 섞기) */
function mvHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** 업체 성적: st = { stars: 별점 합, rn: 후기 수, offered: 처음 3곳에 든 요청 수, opened: 그중 연 수, asked: 연 요청 중 고객이 '어느 업체' 답을 한 수, won: 그중 이 업체를 고른 수 }
    돌려줌 { rating(평점, 후기 없으면 null), resp(응답률 %, 없으면 null), contract(계약률 %, 없으면 null), score 부분값 } */
function mvStats(st) {
  st = st || {};
  const rn = Number(st.rn) || 0, of = Number(st.offered) || 0, op = Math.min(of, Number(st.opened) || 0), as = Number(st.asked) || 0, wn = Math.min(as, Number(st.won) || 0);
  const P = MV_RULE.prior;
  return {
    rating: rn ? Math.round((Number(st.stars) || 0) / rn * 10) / 10 : null, rn: rn,
    resp: of ? Math.round(op / of * 100) : null, offered: of,
    contract: as ? Math.round(wn / as * 100) : null, asked: as,
    rS: ((P.rating * P.rn + (Number(st.stars) || 0)) / (P.rn + rn)) / 5,
    pS: (P.resp * P.pn + op) / (P.pn + of)
  };
}
/** 노출 순서: cands = [{ id, st(mvStats 입력), last(마지막으로 처음 3곳에 든 시각 ms, 없으면 0) }], key = 요청 id(같은 점수 섞기), now ms
    점수 = 평점 40% + 응답률 30% + 순서 공정성 30%(마지막으로 받은 지 72시간이면 만점). 돌려줌 id 목록(점수 높은 순) */
function mvRank(cands, key, nowMs) {
  const W = MV_RULE.w;
  return (cands || []).map(c => {
    const s = mvStats(c.st), age = c.last ? (nowMs - Number(c.last)) / 3600000 : MV_RULE.fairHours;
    const fair = Math.max(0, Math.min(1, age / MV_RULE.fairHours));
    return { id: c.id, sc: Math.round((W.rating * s.rS + W.resp * s.pS + W.fair * fair) * 10000) / 10000, t: mvHash(key + '|' + c.id) };
  }).sort((a, b) => b.sc - a.sc || a.t - b.t).map(x => x.id);
}
/** 지금 이 요청을 볼 수 있는 업체: ranked = 점수 순 id, made = 요청 시각 ms, opened = 이미 연 업체 id 목록.
    다 찬 요청(3곳)은 연 업체만. 아니면 처음 3곳 + 12시간마다 3곳씩 더(최대 9곳) — 이미 연 업체는 늘 포함 */
function mvVisible(ranked, madeMs, nowMs, opened) {
  opened = opened || [];
  if (opened.length >= MV_RULE.maxOpen) return opened.slice();
  const waves = Math.max(0, Math.floor((nowMs - madeMs) / (MV_RULE.waveHours * 3600000)));
  const n = Math.min(MV_RULE.maxShow, MV_RULE.firstShow + waves * MV_RULE.waveAdd);
  const out = (ranked || []).slice(0, n);
  opened.forEach(id => { if (out.indexOf(id) < 0) out.push(id); });
  return out;
}
/** 무료 열람이 아직 쓸 수 있는지(남은 수, 끝나는 날) */
function mvFreeLeft(left, untilYmd, todayYmd) { return untilYmd && todayYmd <= untilYmd ? Math.max(0, Number(left) || 0) : 0; }
/** 설정 덮어쓰기(서버 스크립트 속성 MOVE_SETTINGS · 화면은 서버가 준 rule). 이름·모양이 틀린 값은 버림. 돌려줌: 받아들인 이름 목록 */
function mvSettings(x) {
  x = x && typeof x === 'object' ? x : {};
  const ok = [], num = (v, lo, hi) => { v = Number(v); return isFinite(v) && v >= lo && v <= hi ? Math.round(v) : null; };
  const set = (name, fn) => { const r = fn(); if (r) ok.push(name); };
  if ('PRICE' in x) set('PRICE', () => {
    const p = x.PRICE; if (!p || typeof p !== 'object') return false;
    let n = 0; MV_RULE.sizes.forEach(s => { const v = num(p[s.id], 0, 200000); if (v != null) { s.price = v; n++; } }); return n > 0;
  });
  if ('TOPUPS' in x) set('TOPUPS', () => {
    const a = Array.isArray(x.TOPUPS) ? x.TOPUPS.map(t => ({ amt: num(t && t.amt, 10000, 5000000), bonusPct: num(t && t.bonusPct, 0, 50) })).filter(t => t.amt != null && t.bonusPct != null) : [];
    if (!a.length) return false; MV_RULE.topups = a.sort((p, q) => p.amt - q.amt); return true;
  });
  const one = (name, key, lo, hi) => { if (name in x) set(name, () => { const v = num(x[name], lo, hi); if (v == null) return false; MV_RULE[key] = v; return true; }); };
  one('MAX_OPEN', 'maxOpen', 1, 10); one('FIRST_SHOW', 'firstShow', 1, 20); one('WAVE_HOURS', 'waveHours', 1, 168); one('WAVE_ADD', 'waveAdd', 0, 20); one('MAX_SHOW', 'maxShow', 1, 50);
  one('FREE_LEADS', 'freeLeads', 0, 100); one('FREE_DAYS', 'freeDays', 0, 365); one('REFUND_HOURS', 'refundHours', 1, 720); one('MAX_GU', 'maxGu', 1, 80);
  if ('GU_TOP' in x) set('GU_TOP', () => {
    const g = x.GU_TOP; if (!g || typeof g !== 'object' || typeof g.enabled !== 'boolean') return false;
    MV_RULE.guTop = { enabled: g.enabled, price: num(g.price, 0, 5000000) || 0, slots: num(g.slots, 1, 5) || 1 }; return true;
  });
  return ok;
}
/** 제재 단계 이름(동네 파트너와 같은 순서): 1차 경고 → 2차 7일 노출 중지 → 3차 해지 */
function mvStrikeStep(warn) { const n = Math.min(3, (Number(warn) || 0) + 1); return { n: n, t: n === 1 ? '1차 경고' : n === 2 ? `2차 ${MV_RULE.stopDays}일 노출 중지` : '3차 해지' }; }
/* MOVE-CORE END */
  const api = { MV_RULE, MV_REPORT, MV_ELEV, mvSize, mvPrice, mvTopup, mvPhone, mvMaskPhone, mvMaskName, mvDayMs, mvYmd, mvAddDays, mvDateErr, mvRefundOk, mvReviewOpen, mvHash, mvStats, mvRank, mvVisible, mvFreeLeft, mvSettings, mvStrikeStep };
  root.JDJ_MVCORE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
