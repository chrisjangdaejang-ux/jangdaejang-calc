/* 첫 화면 '하루 세 번 바뀌는 카드' 계산 — 화면(index.html)·테스트(tools/today-test.js) 공용, DOM 없음.
   시간대(한국 시각): 아침 05:00~11:59 = 모닝 브리핑 요약 · 낮 12:00~17:59 = 오늘 새로 신고된 거래 · 저녁 18:00~04:59 = 오늘의 신고가·큰 하락 TOP
     (실거래 공개 자료는 하루 4번 갱신 — 03:21·09:21·15:21·21:21 에 시작해 2~3시간 뒤 공개. 그래서 낮 카드는 09:21 갱신분, 저녁 카드는 15:21 갱신분부터 채워짐)
   그 시간대 자료가 비어 있으면 있는 카드로 대신 보여 주고 그 까닭을 한 줄로 밝힌다(숫자를 지어내지 않음).
   자료: brief/market.json(모닝 브리핑 ①, at = 만든 시각) · today/index.json(엔진 today_feed.py — at = 갱신 시각, by.all·by.sNN = 오늘 새 거래 수·최근 거래·신고가 TOP·큰 하락 TOP)
         today/quiz.json(오늘의 문제 — 그 거래는 엔진이 카드에서 이미 뺐고, 여기서 한 번 더 거름)
   window.JDJ_TODAY */
(function (root) {
  'use strict';
  const SLOTS = [['am', '아침'], ['day', '낮'], ['pm', '저녁']];
  /** Date → 한국 시각 {date 'YYYY-MM-DD', h, mi} */
  function kst(now) {
    const k = new Date(+now + 9 * 3600000);
    return { date: k.toISOString().slice(0, 10), h: k.getUTCHours(), mi: k.getUTCMinutes() };
  }
  /** 지금 시간대: 'am' | 'day' | 'pm' */
  function slot(now) { const h = kst(now).h; return h >= 5 && h < 12 ? 'am' : h >= 12 && h < 18 ? 'day' : 'pm'; }
  /** 오늘 카드로 쓸 수 있는 자료 날짜인지: 한국 날짜가 같거나, 새벽 0~5시(저녁 카드가 이어지는 때)에는 어제 자료도 */
  function dayOk(d, now) {
    const k = kst(now);
    if (d === k.date) return true;
    return k.h < 5 && d === new Date(Date.parse(k.date + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
  }
  /** '2026-11-21T14:02+09:00' → '14:02 기준', 날짜가 오늘이 아니면 '11월 20일 21:40 기준'. 시각이 없으면 날짜만 */
  function asOf(at, today) {
    const s = String(at || ''), d = s.slice(0, 10), t = s.slice(11, 16);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
    const md = `${+d.slice(5, 7)}월 ${+d.slice(8, 10)}일`;
    if (!/^\d\d:\d\d$/.test(t)) return `${md} 기준`;
    return d === today ? `${t} 기준` : `${md} ${t} 기준`;
  }
  /** 문제 거래 빼기(엔진이 이미 뺐지만 한 번 더) */
  function noQuiz(list, Q) {
    const q = Q && Q.q; if (!q) return list || [];
    return (list || []).filter(x => !(x.g === q.g && x.d === q.d && x.a === q.a && x.b === q.b && x.dt === q.dt && x.p === q.p));
  }
  /** 지역 카드: today/index.json by[sid] (없으면 전국 all) → {where:'all'|sid, n, nhi, ndrop, nsus, new, hi, drop} */
  function scope(T, sid, Q) {
    const by = (T && T.by) || {}, w = sid && by[sid] ? sid : 'all', c = by[w];
    if (!c) return null;
    return { where: w, n: c.n || 0, nhi: c.nhi || 0, ndrop: c.ndrop || 0, nsus: c.nsus || 0, new: noQuiz(c.new, Q), hi: noQuiz(c.hi, Q), drop: noQuiz(c.drop, Q) };
  }
  /** 보여 줄 카드 고르기. M = market.json, T = today/index.json, now = Date, sid = 고른 시·도
      → {want 시간대, show 보여 줄 카드, why ''|'empty'(그 시간대 자료가 아직 비어 다른 카드)|'none'(보여 줄 것 없음), today} */
  function pick(M, T, now, sid, Q) {
    const want = slot(now), today = kst(now).date;
    const okAm = !!(M && M.date && (dayOk(M.date, now) || want === 'am'));
    const sc = T && dayOk(T.date, now) ? scope(T, sid, Q) : null;
    const okDay = !!(sc && sc.new.length);
    const okPm = !!(sc && (sc.hi.length || sc.drop.length));
    const has = { am: okAm, day: okDay, pm: okPm };
    if (has[want]) return { want, show: want, why: '', today };
    const order = { am: ['day', 'pm'], day: ['am', 'pm'], pm: ['day', 'am'] }[want];
    const alt = order.find(k => has[k]);
    return alt ? { want, show: alt, why: 'empty', today } : { want, show: want, why: 'none', today };
  }
  /** 금액 짧게(만원 → '13.6억' · '9,850만') */
  function eok(man) {
    man = Math.round(+man || 0); if (!(man > 0)) return '';
    if (man < 10000) return man.toLocaleString('ko-KR') + '만';
    const v = Math.round(man / 1000) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + '억';
  }
  const md = d => { const s = String(d || ''); return s.length >= 8 ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : ''; };
  /** 거래 한 줄 꼬리표(모닝 브리핑과 같은 말) */
  function tags(x) {
    const out = [];
    if (x.up != null) out.push({ c: 'hi', t: '신고가' });
    else if (x.dr != null && x.dr <= -10) out.push({ c: 'dn', t: `최근 2년 최고가보다 ${Math.abs(x.dr).toFixed(0)}% 낮음` });
    if (x.x) out.push({ c: 'x', t: '직거래' });
    if (x.sus) out.push({ c: 'x', t: '특수 거래 의심' });
    return out;
  }
  const API = { SLOTS, kst, slot, dayOk, asOf, noQuiz, scope, pick, eok, md, tags };
  root.JDJ_TODAY = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
