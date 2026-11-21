/* '집값 맞혀 보기' 하루 한 문제 — 계산만(화면 quiz/·테스트 tools/quiz-test.js 공용, DOM 없음).
   자료: today/quiz.json (엔진 scripts/today_feed.py — 그날 첫 갱신에서 한 번 고름)
     q = 문제 거래 {g, sid, sd, gn, d(동), j(지번), a(단지), b(평형), ar(전용㎡), f(층), dt(계약일), p(금액 만원), hi(신고가 1/0)}
     near = 같은 단지·같은 평형 앞뒤 1년 거래 [[계약일, 전용㎡, 층, 금액]] (직거래 뺌, 최신순)
   보기: 진짜 금액 1개 + 그럴듯한 다른 금액 3개(진짜와 5% 이상·서로 4% 이상 차이, 진짜의 0.7~1.35배 안, 진짜 금액과 같은 자릿수 단위로 반올림).
     같은 문제는 누구에게나 같은 보기(문제 id 로 정한 순서). 정답 위치는 문제마다 달라짐.
   설명: 숫자는 near·q 에서만 계산(가운데 값·차이 %·층 비교·최근 흐름). 점수·포인트·상품 없음.
   개인 기록(이 기기 localStorage 'jdj_quiz'): 연속 참여 일수·최고 기록·푼 문제 수·맞힌 수 — 서버로 보내지 않음.
   window.JDJ_QUIZ */
(function (root) {
  'use strict';
  const KEY = 'jdj_quiz';
  /** 같은 문자열 → 같은 난수열 (mulberry32) */
  function rng(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** 진짜 금액이 떨어지는 가장 큰 단위(1억·5천만·1천만·5백만·1백만) — 보기를 같은 단위로 맞춰 '딱 떨어지는 숫자'가 힌트가 되지 않게 */
  function unit(p) { for (const g of [10000, 5000, 1000, 500, 100]) if (p % g === 0 && p / g >= 8) return g; return 100; }
  /** 보기 4개(작은 금액부터) → [{v, ok}] */
  function options(Q) {
    const P = Math.round(+(Q && Q.q && Q.q.p) || 0);
    if (!(P > 0)) return [];
    const r = rng('opt|' + (Q.id || P)), g = unit(P);
    const above = Math.floor(r() * 4);                       // 진짜보다 큰 보기 수 0~3 → 정답 위치가 문제마다 다름
    const band = [[0.07, 0.12], [0.14, 0.20], [0.22, 0.30]];
    const want = [];
    for (let i = 0; i < 3; i++) {
      const up = i < above, k = up ? i : i - above, [lo, hi] = band[k];
      const m = lo + r() * (hi - lo);
      want.push(up ? P * (1 + m) : P * (1 - m));
    }
    const ok = v => v > 0 && Math.abs(v / P - 1) >= 0.05 && v >= P * 0.7 && v <= P * 1.35;
    const out = [];
    want.forEach(w => {
      let v = Math.round(w / g) * g;
      const dir = w > P ? 1 : -1;
      let step = 0;
      while ((!ok(v) || out.some(o => Math.abs(o / v - 1) < 0.04)) && step < 40) { v += dir * g; step++; }
      if (!ok(v) || out.some(o => Math.abs(o / v - 1) < 0.04)) {      // 단위가 너무 커서 못 맞추면 1백만 원 단위로 다시
        v = Math.round(w / 100) * 100; step = 0;
        while ((!ok(v) || out.some(o => Math.abs(o / v - 1) < 0.04)) && step < 400) { v += dir * 100; step++; }
      }
      out.push(v);
    });
    return out.map(v => ({ v, ok: false })).concat([{ v: P, ok: true }]).sort((a, b) => a.v - b.v);
  }
  const median = a => { const v = a.slice().sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : 0; };
  /** 만원 → '7억 9,000만 원' */
  function won(m) {
    m = Math.round(+m || 0); const e = Math.floor(m / 10000), r = m % 10000;
    if (e && r) return `${e}억 ${r.toLocaleString('ko-KR')}만 원`;
    if (e) return `${e}억 원`;
    return `${r.toLocaleString('ko-KR')}만 원`;
  }
  const ymd = d => { const s = String(d); return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`; };
  const days = (a, b) => Math.round((Date.parse(ymd(b).replace(/\./g, '-')) - Date.parse(ymd(a).replace(/\./g, '-'))) / 86400000);
  /** 왜 이 값이었나: {verdict 'high'|'low'|'mid', med, n, diff(%), lines[]} — 같은 단지·같은 평형 앞뒤 1년 거래로만 */
  function explain(Q) {
    const q = Q.q, near = (Q.near || []).filter(x => x[3] > 0);
    if (!near.length) return { verdict: 'mid', med: 0, n: 0, diff: 0, lines: ['같은 단지·같은 평형의 앞뒤 1년 거래가 없어 비교하지 못했어요.'] };
    const med = median(near.map(x => x[3])), diff = Math.round((q.p / med - 1) * 1000) / 10;
    const verdict = diff >= 3 ? 'high' : diff <= -3 ? 'low' : 'mid';
    const lines = [];
    lines.push(`같은 단지·같은 평형의 앞뒤 1년 거래 ${near.length}건 가운데 값은 ${won(med)}이에요. 이번 거래는 그보다 ${verdict === 'mid' ? `차이가 ${Math.abs(diff).toFixed(1)}%로 거의 같아요` : `${Math.abs(diff).toFixed(1)}% ${diff > 0 ? '높아요' : '낮아요'}`}.`);
    const fl = near.map(x => x[2]).filter(x => x != null && x > 0);
    if (q.f != null && fl.length >= 3) {
      const mf = median(fl);
      if (q.f <= 3 && mf > 5) lines.push(`${q.f}층 저층 거래예요(다른 거래 가운데 층은 ${Math.round(mf)}층). 저층은 같은 단지에서도 낮게 거래되는 편이에요.`);
      else if (q.f >= mf + 5) lines.push(`${q.f}층으로 다른 거래(가운데 ${Math.round(mf)}층)보다 높은 층이에요. 높은 층은 전망·햇빛 때문에 비싸게 거래되는 편이에요.`);
      else if (q.f <= mf - 5) lines.push(`${q.f}층으로 다른 거래(가운데 ${Math.round(mf)}층)보다 낮은 층이에요.`);
    }
    const before = near.filter(x => days(x[0], q.dt) > 0), recent = before.filter(x => days(x[0], q.dt) <= 90), older = before.filter(x => days(x[0], q.dt) > 90);
    if (recent.length >= 2 && older.length >= 2) {
      const a = median(recent.map(x => x[3])), b = median(older.map(x => x[3])), c = Math.round((a / b - 1) * 1000) / 10;
      if (Math.abs(c) >= 2) lines.push(`이 거래 전 3개월 거래(${recent.length}건) 가운데 값이 그 전(${older.length}건)보다 ${Math.abs(c).toFixed(1)}% ${c > 0 ? '높아, 값이 오르는 흐름이었어요' : '낮아, 값이 내리는 흐름이었어요'}.`);
    }
    if (q.hi) lines.push('이 평형에서 그때까지 가장 비싼 값보다 높게 거래된 신고가였어요.');
    return { verdict, med, n: near.length, diff, lines };
  }
  /* ---------- 개인 기록(이 기기) ---------- */
  function load(raw) {
    let o = null; try { o = JSON.parse(raw || 'null'); } catch (e) { o = null; }
    o = o && typeof o === 'object' ? o : {};
    return { v: 1, last: /^\d{4}-\d{2}-\d{2}$/.test(o.last || '') ? o.last : '', streak: +o.streak || 0, best: +o.best || 0, n: +o.n || 0, ok: +o.ok || 0, h: o.h && typeof o.h === 'object' ? o.h : {} };
  }
  const prevDay = d => new Date(Date.parse(d + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
  /** 오늘 답 남기기(하루 한 번 — 이미 답했으면 그대로). 연속 참여: 어제도 풀었으면 +1, 아니면 1부터 */
  function record(S, Q, pickV, today) {
    S = load(JSON.stringify(S || {}));
    if (S.h[today]) return S;
    const ok = +pickV === +Q.q.p;
    S.streak = S.last === prevDay(today) ? S.streak + 1 : 1;
    S.best = Math.max(S.best, S.streak); S.last = today; S.n += 1; if (ok) S.ok += 1;
    S.h[today] = { id: Q.id, pick: +pickV, ok: ok ? 1 : 0 };
    Object.keys(S.h).sort().slice(0, -14).forEach(k => { delete S.h[k]; });   // 최근 14일만
    return S;
  }
  /** 화면에 보일 연속 일수: 오늘·어제 푼 기록이 없으면 끊긴 것(0) */
  const streakNow = (S, today) => S && (S.last === today || S.last === prevDay(today)) ? S.streak : 0;
  /** 오늘 문제를 이미 풀었는지(같은 문제 id) */
  const answered = (S, Q, today) => !!(S && Q && S.h && S.h[today] && S.h[today].id === Q.id);

  const API = { KEY, rng, unit, options, median, won, ymd, explain, load, record, streakNow, answered, prevDay };
  root.JDJ_QUIZ = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
