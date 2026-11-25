/* 예측 맞히기 채점 — 화면 없음. 예측 맞히기 화면(quiz/)·첫 화면 카드·서버 채점(tools/agent-backend.gs v54)이 함께 쓴다.
   - 아래 'PRED-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있다. tools/predict-test.js 가 두 곳이 같은지 확인한다.
   - 문제와 정답은 공개 data/quiz/week.json(엔진 predict_quiz.py — 공개 자료로만 만들고 정함). 여기서는 포인트·연속 적중·배지·주간 순위만 계산한다.
   - 포인트는 재미용이에요. 현금·상품·혜택으로 바꾸지 않아요(PQ_NOTE).
   window.JDJ_PRED_CORE */
(function (root) {
'use strict';
/* PRED-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/predict-test.js 가 비교). */
const PQ_NOTE = '포인트는 재미용이며 현금이나 상품으로 바꿀 수 없어요.';
const PQ_PTS = 10, PQ_BONUS = 5, PQ_BONUS_FROM = 3;      // 맞히면 10점, 3번 연속 맞힐 때부터 한 번마다 5점 더
const PQ_KIND = { rs: '서울 아파트값', rg: '구 대결', pm: '단지 대결', cy: '청약 경쟁률' };
const PQ_BADGES = [
  { id: 'first', t: '첫 예측', s: '처음으로 예측을 남겼어요' },
  { id: 's3', t: '3연속 적중', s: '세 번 연속으로 맞혔어요' },
  { id: 's5', t: '5연속 적중', s: '다섯 번 연속으로 맞혔어요' },
  { id: 'n10', t: '예측 10번', s: '결과가 나온 예측이 10번이 됐어요' },
  { id: 'wk4', t: '4주 연속 참여', s: '네 주 연속으로 예측했어요' },
  { id: 'pm1', t: '단지 대결 승리', s: '단지 대결을 맞혔어요' },
  { id: 'cy3', t: '청약 감별사', s: '청약 경쟁률을 세 번 맞혔어요' }
];
function pqEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
/** 'YYYY-MM-DD' → ISO 주 'YYYY-Www' */
function pqWeek(iso) {
  const d = new Date(Date.UTC(+String(iso).slice(0, 4), +String(iso).slice(5, 7) - 1, +String(iso).slice(8, 10)));
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7 + 3);                       // 그 주 목요일
  const y = d.getUTCFullYear(), j4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((d.getTime() - j4.getTime()) / 864e5 - 3 + (j4.getUTCDay() + 6) % 7) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
/** 지금 답할 수 있는 문제인지(마감 전). now = 'YYYY-MM-DDTHH:MM+09:00' 꼴 한국 시각 글자 */
function pqIsOpen(q, now) { return !!(q && q.close && String(q.close) > String(now)); }
/** 별명 정리: 2~10자, 한글·영문·숫자·띄어쓰기·밑줄만. 전화번호·주소처럼 보이면 버림 */
function pqNick(s) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 10 || !/^[0-9A-Za-z가-힣 _]+$/.test(s) || /\d{4,}/.test(s) || /(관리자|운영자|집예보|admin)/i.test(s)) return '';
  return s;
}
function pqDefaultNick(uh) { return '예측러 ' + String(uh || '').replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase(); }
/** 고른 사람 비율: counts {보기키: 명} → [{k, t, n, pct}] (반올림 합이 100이 되게) */
function pqShare(opts, counts) {
  counts = counts || {};
  const rows = (opts || []).map(o => ({ k: o.k, t: o.t, n: Math.max(0, Math.round(Number(counts[o.k]) || 0)) })), tot = rows.reduce((a, r) => a + r.n, 0);
  if (!tot) return rows.map(r => Object.assign(r, { pct: 0 }));
  const raw = rows.map(r => r.n * 100 / tot), fl = raw.map(Math.floor);
  let left = 100 - fl.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - fl[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(x => { if (left > 0) { fl[x[1]]++; left--; } });
  return rows.map((r, i) => Object.assign(r, { pct: fl[i] }));
}
/** 한 사람 점수: answers = [{id, k}] · qs = 정답이 정해진 문제 [{id, kind, st('done'|'void'), ans, rat, wk}]
    → { pts, n(채점된 수), ok, streak(지금 연속 적중), best, hist[{id, kind, k, ans, ok, pts, rat}], badges[id] } — 정답 정한 순서(rat)대로 */
function pqScore(answers, qs) {
  const mine = {}; (answers || []).forEach(a => { if (a && a.id) mine[a.id] = a.k; });
  const done = (qs || []).filter(q => q && mine[q.id] != null && (q.st === 'done' || q.st === 'void'))
    .sort((a, b) => String(a.rat || '') < String(b.rat || '') ? -1 : String(a.rat || '') > String(b.rat || '') ? 1 : a.id < b.id ? -1 : 1);
  let pts = 0, n = 0, ok = 0, streak = 0, best = 0, cy = 0, pm = 0;
  const hist = done.map(q => {
    if (q.st === 'void') return { id: q.id, kind: q.kind, k: mine[q.id], ans: null, ok: null, pts: 0, rat: q.rat || '', void: true };
    n++;
    const hit = mine[q.id] === q.ans;
    let p = 0;
    if (hit) { ok++; streak++; best = Math.max(best, streak); p = PQ_PTS + (streak >= PQ_BONUS_FROM ? PQ_BONUS : 0); if (q.kind === 'cy') cy++; if (q.kind === 'pm') pm++; }
    else streak = 0;
    pts += p;
    return { id: q.id, kind: q.kind, k: mine[q.id], ans: q.ans, ok: hit, pts: p, rat: q.rat || '' };
  });
  const wks = Object.keys((answers || []).reduce((m, a) => { if (a && a.wk) m[a.wk] = 1; return m; }, {})).sort();
  let run = 0, runBest = 0, prev = '';
  wks.forEach(w => { run = prev && pqNextWeek(prev) === w ? run + 1 : 1; runBest = Math.max(runBest, run); prev = w; });
  const b = [];
  if ((answers || []).length) b.push('first');
  if (best >= 3) b.push('s3');
  if (best >= 5) b.push('s5');
  if (n >= 10) b.push('n10');
  if (runBest >= 4) b.push('wk4');
  if (pm >= 1) b.push('pm1');
  if (cy >= 3) b.push('cy3');
  return { pts: pts, n: n, ok: ok, streak: streak, best: best, hist: hist, badges: b };
}
/** 'YYYY-Www' 다음 주 */
function pqNextWeek(w) {
  const y = +w.slice(0, 4), n = +w.slice(6), jan4 = Date.UTC(y, 0, 4), dow = (new Date(jan4).getUTCDay() + 6) % 7, mon = jan4 - dow * 864e5 + (n - 1) * 7 * 864e5;
  return pqWeek(new Date(mon + 7 * 864e5).toISOString().slice(0, 10));
}
/** 주간 순위: users = [{nick, answers}], qs = 정답 정한 문제, week = 'YYYY-Www'(정답을 정한 날 기준) → [{rank, nick, pts, ok, n}] 위에서 max 명. 0점은 뺌, 같은 점수는 같은 등수 */
function pqBoard(users, qs, week, max) {
  const wq = (qs || []).filter(q => q && q.rat && pqWeek(String(q.rat).slice(0, 10)) === week);
  const rows = (users || []).map(u => { const S = pqScore(u.answers, qs), ids = {}; wq.forEach(q => { ids[q.id] = 1; });
    const h = S.hist.filter(x => ids[x.id]); return { nick: u.nick, pts: h.reduce((a, x) => a + x.pts, 0), ok: h.filter(x => x.ok).length, n: h.filter(x => !x.void).length }; })
    .filter(r => r.pts > 0).sort((a, b) => b.pts - a.pts || b.ok - a.ok || (a.nick < b.nick ? -1 : 1));
  let rank = 0, last = null;
  rows.forEach((r, i) => { if (last === null || r.pts !== last) { rank = i + 1; last = r.pts; } r.rank = rank; });
  return rows.slice(0, max || 10);
}
/** 결과 문장: 문제 q(정답 정함) + 내 보기 k */
function pqResultLine(q, k) {
  if (!q) return '';
  const t = o => ((q.opts || []).find(x => x.k === o) || {}).t || '';
  if (q.st === 'void') return `무효예요 — ${q.why || '정답을 정할 수 없었어요'}. 포인트와 연속 기록에는 영향이 없어요.`;
  if (q.st !== 'done') return '결과 발표를 기다리고 있어요.';
  const head = k == null ? `정답은 '${t(q.ans)}'였어요.` : k === q.ans ? `맞혔어요! 정답은 '${t(q.ans)}'였어요.` : `아쉬워요. 정답은 '${t(q.ans)}'였어요.`;
  return head + (q.why ? ` (${q.why})` : '');
}
/* PRED-CORE END */

const API = { NOTE: PQ_NOTE, PTS: PQ_PTS, BONUS: PQ_BONUS, BONUS_FROM: PQ_BONUS_FROM, KIND: PQ_KIND, BADGES: PQ_BADGES, esc: pqEsc, week: pqWeek, nextWeek: pqNextWeek, isOpen: pqIsOpen,
  nick: pqNick, defaultNick: pqDefaultNick, share: pqShare, score: pqScore, board: pqBoard, resultLine: pqResultLine };
root.JDJ_PRED_CORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
