/* 동네 중개사 파트너 — 계산 규칙(값·가격·자리·동 바꾸기·이웃 동·브리핑에 실을 글 고르기)
   - 화면(assets/dongne.js·dongne/)과 서버(tools/agent-backend.gs 'v50' 칸)가 같은 글자를 써요. 아래 DONGNE-CORE 블록은 서버에 그대로 복사돼 있어요.
   - 거르는 낱말은 여기 없어요(비공개 엔진 data/partner/rules.json → 서버 스크립트 속성).
   - 숫자는 대표 승인 값(2026-11-23 바뀐 요금): 한 동 3자리 선착순 + 대기, 사무소 동 포함 3개 동 기본, 최대 10개 동.
     가입 때 카드 등록(토스 자동결제), 첫 달 무료, 둘째 달부터 월 9,900원 자동 결제(동 하나 더 월 5,000원).
     연간: 12개월 99,000원(2개월 할인), 동 하나 더 연 50,000원. 해지는 버튼 하나, 그달 말까지 이용.
     창립 파트너(문 연 날부터 3개월 안 가입): '창립 파트너' 표시 영구 · 같은 동 안 노출 순서 우선 · 추가 동 영구 20% 할인.
     결제 실패: 3일 동안 다시 시도·안내 → 그래도 안 되면 노출 멈춤, 자리는 14일 지킴. 안내 메일: 월간 첫 결제 7일 전, 연간 갱신 30일·7일 전. */
(function (root) {
  'use strict';
/* DONGNE-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/dongne-test.js 가 비교). */
const DP_RULE = { slots: 3, incl: 3, max: 10, base: 9900, extra: 5000, yearBase: 99000, yearExtra: 50000, freeMonths: 1, foundMonths: 3, foundExtraOff: 0.2,
  retryDays: 3, holdDays: 14, noticeM: [7], noticeY: [30, 7], foundKeepDays: 30, swapDays: 30,
  /* 묶음 혜택(기존 중개사 제휴 = 검색 결과 노출 함께 쓰는 사무소) — 지금은 끔. 시범 운영 뒤 대표가 정해요.
     'off' 없음 · 'include' 제휴 가입자는 기본 3개 동 무료(추가 동만 결제) · 'discount' 둘 다 가입하면 bundlePct% 할인 */
  bundleMode: 'off', bundlePct: 0, cutoffH: 22, textMax: 200, nearK: 8, postDays: 7, idleDays: 28, bestBoost: 2, reportW: 3 };
const DP_TOPICS = [['deal', '거래 분위기'], ['rent', '전세·월세 동향'], ['rebuild', '재건축·재개발 진행'], ['life', '학군·생활'], ['traffic', '교통·공사']];
function dpTopicName(id) { for (let i = 0; i < DP_TOPICS.length; i++) if (DP_TOPICS[i][0] === id) return DP_TOPICS[i][1]; return ''; }
/** 동 열쇠: '시군구코드|법정동 이름' (브리핑이 쓰는 동 단위와 같음) */
function dpKey(g, dn) {
  g = String(g == null ? '' : g); dn = String(dn == null ? '' : dn).replace(/[|<>\u0000-\u001F]/g, '').trim();
  return /^\d{5}$/.test(g) && /^[가-힣0-9·.]{1,20}$/.test(dn) ? g + '|' + dn : '';
}
function dpSplit(key) { const i = String(key || '').indexOf('|'); return i < 0 ? { g: '', dn: '' } : { g: key.slice(0, i), dn: key.slice(i + 1) }; }
/** 날짜 글자 'YYYY-MM-DD' → 그날 한국 0시의 ms */
function dpDayMs(ymdS) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymdS || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - 9 * 3600000 : NaN; }
function dpYmd(ms) { const d = new Date(ms + 9 * 3600000); return d.toISOString().slice(0, 10); }
function dpAddDays(ymdS, n) { return dpYmd(dpDayMs(ymdS) + n * 86400000); }
function dpAddMonths(ymdS, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymdS || '')); if (!m) return '';
  const y = +m[1], mo = +m[2] - 1 + n, d = +m[3], last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo, Math.min(d, last))).toISOString().slice(0, 10);
}
/** 그날 아침 브리핑에 실을 수 있는 글의 마감: 전날 22시(한국) */
function dpCutoff(ymdS) { return dpDayMs(ymdS) - (24 - DP_RULE.cutoffH) * 3600000; }
/** 이 시각에 쓴 글이 실리는 브리핑 날짜(22시 전이면 다음 날 아침, 22시부터는 그다음 날 아침) */
function dpBriefDay(ms) { const k = dpYmd(ms), next = dpAddDays(k, 1); return ms < dpCutoff(next) ? next : dpAddDays(k, 2); }
/** 창립 파트너: 문 연 날(launch)부터 3개월 안에 가입 */
function dpFounding(launchYmd, joinYmd) { return !!launchYmd && !!joinYmd && joinYmd >= launchYmd && joinYmd < dpAddMonths(launchYmd, DP_RULE.foundMonths); }
/** 한 번 결제 금액: n = 고른 동 수(사무소 동 포함), o = { plan: 'm'(월간)|'y'(연간), founding(창립 혜택이 살아 있음), affiliate(중개사 제휴도 함께) }.
    창립 파트너는 추가 동만 20% 할인(10원 아래 버림). 묶음 혜택은 DP_RULE.bundleMode 를 따름(지금 'off') */
function dpPrice(n, o) {
  o = o || {};
  n = Math.max(1, Math.min(DP_RULE.max, Math.round(Number(n) || 1)));
  const y = o.plan === 'y', extraN = Math.max(0, n - DP_RULE.incl), one = y ? DP_RULE.yearExtra : DP_RULE.extra;
  const each = o.founding ? Math.floor(one * (1 - DP_RULE.foundExtraOff) / 10) * 10 : one, base0 = y ? DP_RULE.yearBase : DP_RULE.base;
  const bm = o.affiliate ? DP_RULE.bundleMode : 'off', pct = Math.max(0, Math.min(100, Number(DP_RULE.bundlePct) || 0));
  const base = bm === 'include' ? 0 : base0, sum = base + extraN * each;
  const total = bm === 'discount' && pct ? Math.floor(sum * (1 - pct / 100) / 10) * 10 : sum;
  return { n: n, plan: y ? 'y' : 'm', incl: Math.min(n, DP_RULE.incl), extraN: extraN, extraEach: each, base: base, baseList: base0, extraSum: extraN * each, total: total,
    bundle: bm !== 'off' ? bm : '', bundleOff: sum - total + (base0 - base), months: y ? 12 : 1, monthly: y ? Math.round(total / 12) : total };
}
/** 묶음 혜택 안내 문장(화면용). 꺼져 있으면 빈 글자 */
function dpBundleText() {
  if (DP_RULE.bundleMode === 'include') return '중개사 제휴(검색 결과 노출)를 함께 쓰는 사무소는 기본 3개 동이 무료예요.';
  if (DP_RULE.bundleMode === 'discount' && Number(DP_RULE.bundlePct) > 0) return `중개사 제휴(검색 결과 노출)를 함께 쓰면 ${Number(DP_RULE.bundlePct)}% 할인해요.`;
  return '';
}
/** 첫 결제일: 가입일 + 무료 1개월(같은 날짜, 없는 날이면 그달 말일) */
function dpFirstCharge(joinYmd) { return dpAddMonths(joinYmd, DP_RULE.freeMonths); }
/** 다음 결제일: 이번 결제일 + 1개월(월간) 또는 12개월(연간) */
function dpNextCharge(chargeYmd, plan) { return dpAddMonths(chargeYmd, plan === 'y' ? 12 : 1); }
/** 그달 말일(해지하면 이날까지 이용) */
function dpMonthEnd(ymdS) { const m = /^(\d{4})-(\d{2})/.exec(String(ymdS || '')); return m ? new Date(Date.UTC(+m[1], +m[2], 0)).toISOString().slice(0, 10) : ''; }
/** 오늘 보내야 할 결제 안내(며칠 전): 월간은 첫 결제만 7일 전, 연간은 결제마다 30일·7일 전. 없으면 0 */
function dpNoticeDue(plan, chargeYmd, todayYmd, first) {
  if (!chargeYmd || !todayYmd) return 0;
  const left = Math.round((dpDayMs(chargeYmd) - dpDayMs(todayYmd)) / 86400000);
  const list = plan === 'y' ? DP_RULE.noticeY : first ? DP_RULE.noticeM : [];
  return list.indexOf(left) >= 0 ? left : 0;
}
/** 결제 실패 뒤: 실패한 날부터 3일 동안 날마다 다시 시도, 그다음은 노출 멈춤(자리는 14일 지킴), 그 뒤 해지. 돌려줌 'retry'|'stop'|'end' */
function dpFailStep(failYmd, todayYmd) {
  const d = Math.round((dpDayMs(todayYmd) - dpDayMs(failYmd)) / 86400000);
  return d <= DP_RULE.retryDays ? 'retry' : d <= DP_RULE.retryDays + DP_RULE.holdDays ? 'stop' : 'end';
}
/** 두 점([경도, 위도]) 사이 거리(km) */
function dpDist(a, b) {
  const R = 6371, r = x => x * Math.PI / 180, dLa = r(b[1] - a[1]), dLo = r(b[0] - a[0]);
  const h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** 이웃 동: 가운데 점끼리 가까운 순 k개(자기 동 빼고). pts = { '시군구|동': [경도, 위도, …] } */
function dpNear(key, pts, k) {
  const c = pts && pts[key]; if (!c) return [];
  return Object.keys(pts).filter(x => x !== key && pts[x] && isFinite(pts[x][0]) && isFinite(pts[x][1]))
    .map(x => ({ k: x, d: dpDist(c, pts[x]) })).sort((a, b) => a.d - b.d || (a.k < b.k ? -1 : 1)).slice(0, k || DP_RULE.nearK)
    .map(x => ({ key: x.k, km: Math.round(x.d * 10) / 10 }));
}
/** 동 슬롯 바꾸기: 그 자리에서 마지막으로 바꾼 뒤 30일이 지나야 해요. 돌려줌 { ok, wait(남은 날) } */
function dpSwapOk(lastSwapYmd, todayYmd) {
  if (!lastSwapYmd) return { ok: true, wait: 0 };
  const left = DP_RULE.swapDays - Math.round((dpDayMs(todayYmd) - dpDayMs(lastSwapYmd)) / 86400000);
  return left > 0 ? { ok: false, wait: left } : { ok: true, wait: 0 };
}
/** 같은 입력이면 늘 같은 값(돌려 보여 주기용) */
function dpHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** 글 점수 = 최근일수록(7일 안, 하루에 1점씩 줄어듦) + 도움돼요 − 신고×3 + 지난달 우수 동네 소식 가산 */
function dpScore(p, dayYmd) {
  const age = (dpCutoff(dayYmd) - Number(p.at)) / 86400000;
  const rec = Math.max(0, DP_RULE.postDays - age);
  return Math.round((rec + (Number(p.help) || 0) - (Number(p.rep) || 0) * DP_RULE.reportW + (p.boost ? DP_RULE.bestBoost : 0)) * 100) / 100;
}
/** 한 동에서 그날 실을 글 하나 고르기. posts = [{ id, pid(파트너), at(ms), help, rep, boost }], prevPid = 어제 실린 파트너.
    p.found = 창립 파트너(점수가 같을 때 먼저). 마감 전(전날 22시 전)·최근 7일 글만. 점수가 높은 순, 어제와 같은 파트너는 다른 파트너 글이 있으면 뒤로. 같으면 날짜로 섞음 */
function dpPickPost(posts, dayYmd, prevPid) {
  const cut = dpCutoff(dayYmd), from = cut - DP_RULE.postDays * 86400000;
  const ok = (posts || []).filter(p => p && Number(p.at) < cut && Number(p.at) >= from)
    .map(p => ({ p: p, s: dpScore(p, dayYmd), t: dpHash(dayYmd + '|' + p.id) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.p.found ? 1 : 0) - (a.p.found ? 1 : 0) || a.t - b.t);   // 점수가 같으면 창립 파트너 먼저
  if (!ok.length) return null;
  const other = ok.find(x => x.p.pid !== prevPid);
  return (ok[0].p.pid === prevPid && other ? other : ok[0]).p;
}
/** 한 동의 파트너 순서: 오늘 글이 실린 파트너 먼저, 다음은 창립 파트너, 다음은 최근 7일 안에 글을 쓴 파트너, 글이 없는 파트너는 이름 카드로 뒤에(날마다 순서를 돌려요) */
function dpOrder(pids, pickPid, activeSet, dayYmd, foundSet) {
  const f = x => foundSet && foundSet[x] ? 1 : 0, a2 = x => activeSet && activeSet[x] ? 1 : 0;
  return (pids || []).slice().sort((a, b) => (b === pickPid) - (a === pickPid) || f(b) - f(a) || a2(b) - a2(a) || dpHash(dayYmd + '|' + a) - dpHash(dayYmd + '|' + b));
}
/** 구독자 한 지역에서 보여 줄 동: 동을 골랐으면 그 동. 구 전체면 관심 단지가 있는 동 먼저, 그다음 파트너가 있는 동을 날마다 돌아가며 하나 */
function dpAreaDongs(area, partnerKeys, aptDongs, dayYmd) {
  const g = String(area && area.g || ''), dn = String(area && area.dn || '');
  if (dn) { const k = dpKey(g, dn); return partnerKeys.indexOf(k) >= 0 ? [k] : []; }
  const inG = partnerKeys.filter(k => k.slice(0, 6) === g + '|').sort();
  if (!inG.length) return [];
  const first = (aptDongs || []).map(d => dpKey(g, d)).filter((k, i, a) => k && inG.indexOf(k) >= 0 && a.indexOf(k) === i).slice(0, 1);
  const rest = inG.filter(k => first.indexOf(k) < 0);
  const rot = rest.length ? [rest[Math.floor(dpDayMs(dayYmd) / 86400000) % rest.length]] : [];
  return first.concat(rot);
}
/** 주 열쇠: 그 주 월요일 날짜 */
function dpWeek(ymdS) { const ms = dpDayMs(ymdS), wd = new Date(ms + 9 * 3600000).getUTCDay(); return dpYmd(ms - ((wd + 6) % 7) * 86400000); }
/** 이번 주 우수 동네 소식: 지난 7일 공개 글 중 도움돼요 − 신고×3 이 가장 높은 글(도움돼요 1 이상). 시군구마다 하나 + 전체에서 하나 */
function dpBest(posts, weekYmd) {
  const from = dpDayMs(weekYmd) - 7 * 86400000, to = dpDayMs(weekYmd);
  const ok = (posts || []).filter(p => Number(p.at) >= from && Number(p.at) < to && (Number(p.help) || 0) >= 1)
    .map(p => ({ p: p, s: (Number(p.help) || 0) - (Number(p.rep) || 0) * DP_RULE.reportW, t: dpHash(weekYmd + '|' + p.id) }))
    .filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.t - b.t);
  const byG = {};
  ok.forEach(x => { const g = String(x.p.key || '').slice(0, 5); if (g && !byG[g]) byG[g] = x.p.id; });
  return { top: ok.length ? ok[0].p.id : '', byG: byG };
}
/** 공인중개사법 표시 의무(제18조의2, 시행령 제17조의2): 사무소 명칭·소재지·연락처·등록번호·개업공인중개사 성명(소속이면 소속공인중개사 성명도) */
function dpLegal(c) {
  c = c || {};
  const who = c.kind === 'member' ? `대표 ${c.ceo || ''} · 소속공인중개사 ${c.name || ''}` : `대표 ${c.name || ''}`;
  return [c.office || '', c.addr || '', c.tel || '', '등록번호 ' + (c.reg || ''), who];
}
/* DONGNE-CORE END */
  const api = { DP_RULE, DP_TOPICS, dpTopicName, dpKey, dpSplit, dpDayMs, dpYmd, dpAddDays, dpAddMonths, dpCutoff, dpBriefDay, dpFounding, dpPrice, dpBundleText, dpFirstCharge, dpNextCharge, dpMonthEnd, dpNoticeDue, dpFailStep, dpDist, dpNear,
    dpSwapOk, dpHash, dpScore, dpPickPost, dpOrder, dpAreaDongs, dpWeek, dpBest, dpLegal };
  root.JDJ_DPCORE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
