/* 분양·청약 공고 상태 공용 판정 — 분양(bunyang/)과 청약 가점(chungyak/)이 같은 함수·같은 이름을 씁니다.
   공고 일정(특별공급 sp·일반 접수 rc·당첨자 발표 pw, 날짜 YYYYMMDD)과 오늘 날짜로 계산:
   접수 시작 전 → 분양예정 / 접수 기간 → 청약중 / 접수 끝~발표일 → 발표 대기 / 발표 후 → 입주예정(입주 시기가 있으면) */
(function (root) {
  'use strict';
  var LABEL = { pre: '분양예정', on: '청약중', wait: '발표 대기', mv: '입주예정', done: '마감', plan: '분양예정 · 시기 미정' };
  function ymd(d) { if (!d) d = new Date(); if (typeof d === 'string') return d.replace(/-/g, '').slice(0, 8); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
  function dates(x) {
    var sp = x.sp || [], rc = x.rc || [];
    var b = [sp[0], rc[0]].filter(Boolean).sort()[0] || '';
    var e = [rc[1], sp[1]].filter(Boolean).sort().pop() || '';
    return { b: b, e: e, pw: x.pw || '' };
  }
  /** x: 공고 행, today: 'YYYYMMDD' | 'YYYY-MM-DD' | Date. 일정이 없는 행(입주예정·시기 미정)은 원래 st 를 그대로 */
  function status(x, today) {
    var t = ymd(today), d = dates(x);
    if (!d.b && !d.e) return x.st || null;
    if (d.b && t < d.b) return 'pre';
    if (d.e && t <= d.e) return 'on';
    if (d.pw && t <= d.pw) return 'wait';
    return x.mv ? 'mv' : 'done';
  }
  /** 청약 접수가 아직 의미 있는 공고(접수 예정·접수 중·발표 대기) */
  function isLive(x, today) { var s = status(x, today); return s === 'pre' || s === 'on' || s === 'wait'; }
  var api = { LABEL: LABEL, status: status, isLive: isLive, ymd: ymd };
  root.JDJ_SALE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
