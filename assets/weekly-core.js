/* 주간 실거래 동향(/weekly/) 글·숫자 규칙 — 화면(assets/weekly-view.js)·테스트(tools/weekly-test.js) 공용, DOM 없음.
   자료: jangdaejang-data data/weekly/ (비공개 엔진 scripts/weekly.py — 국토교통부 아파트 매매 실거래가로 만든 우리 통계)
     index.json(주 목록) · {주}.json(그 주 최신 판 + versions) · {주}/v{n}.json·csv(판마다 고정 보관본)
   숫자는 자료 그대로만 쓴다(여기서 새 숫자를 만들지 않음). 표본 기준 미만(chg 없음)은 변동률 대신 '표본 부족'.
   window.JDJ_WEEKLY */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/weekly/';
  const PAGE = JB.SITE + 'weekly/';
  /* 대표 주소(canonical·인용 주소): assets/config.js 의 SITE_URL(도메인을 바꾸면 따라 바뀜). 화면 경로(PAGE)는 지금 열린 주소 기준 */
  const SITE_URL = String(((root && root.JDJ_SITE) || {}).SITE_URL || 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc').replace(/\/+$/, '');
  const ORIGIN = SITE_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');
  const WRE = /^\d{4}-\d{2}$/;

  /** 주소 → 주 ID('2026-46') / null. /weekly/2026-46/ 또는 ?w=2026-46 */
  function weekFrom(pathname, search) {
    const m = String(pathname || '').match(/\/weekly\/(\d{4}-\d{2})\/?/);
    if (m) return m[1];
    const q = new URLSearchParams(search || '').get('w');
    return q && WRE.test(q) ? q : null;
  }
  /** ?v=2 → 2 / null */
  function verFrom(search) {
    const v = Number(new URLSearchParams(search || '').get('v'));
    return Number.isInteger(v) && v > 0 ? v : null;
  }
  const num = n => n == null ? '—' : Number(n).toLocaleString('ko-KR');
  /** 변동률 글: +0.25% · −0.10% · 0.00% (자료의 소수 둘째 자리 그대로) */
  function pct(x, d) {
    if (x == null || isNaN(x)) return '—';
    d = d == null ? 2 : d;
    const v = Number(x), s = Math.abs(v).toFixed(d);
    return (v > 0 ? '+' : v < 0 ? '−' : '') + s + '%';
  }
  const share = x => x == null ? '—' : Number(x).toFixed(1) + '%';
  const md = iso => { const p = String(iso || '').split('-'); return p.length === 3 ? `${+p[1]}/${+p[2]}` : ''; };
  const dot = iso => String(iso || '').replace(/-/g, '.');
  function period(V) { return `${md(V.from)}~${md(V.to)}`; }
  function weekName(V) { const y = String(V.w).slice(0, 4), n = +String(V.w).slice(5); return `${y}년 ${n}번째 주(${period(V)} 계약)`; }
  function statusText(V) { return V.status === 'final' ? '확정' : '잠정(신고 진행 중)'; }
  function verText(V) { return `제${V.ver}판 · ${V.status === 'final' ? '확정' : '잠정'}`; }
  /** 기준 'w'(그 주) / 'm'(최근 4주) → 화면에 쓸 값 */
  function pick(row, basis) {
    const x = basis === 'm' ? (row && row.m) || {} : row || {};
    return { chg: x.chg == null ? null : x.chg, lo: x.lo == null ? null : x.lo, hi: x.hi == null ? null : x.hi, np: x.np || 0, gap: x.gap,
      med: x.med == null ? null : x.med, ok: x.chg != null };
  }
  /** 변동률 칸 글: 표본 부족이면 '표본 부족(비교 12건)' */
  function chgCell(row, basis, min) {
    const p = pick(row, basis);
    if (row && row.old) return { t: '자료 확인 늦음', cls: 'na' };
    if (!p.ok) return { t: '표본 부족', sub: `기준 ${min}건`, cls: 'na' };
    return { t: pct(p.chg), sub: p.lo != null ? `${pct(p.lo)} ~ ${pct(p.hi)}` : '', med: p.med != null ? `중간값 ${pct(p.med)}` : '', cls: p.chg > 0 ? 'up' : p.chg < 0 ? 'dn' : 'eq' };
  }
  /** 거래량 변화 글(같은 신고 기간끼리만) */
  function volCell(row, V) {
    if (!row || row.vc == null) return { t: '—', why: V && V.vol_basis ? '지난주 거래 없음' : '같은 신고 기간 비교 준비 중' };
    return { t: pct(row.vc, 1), why: `지난주 ${num(row.vp)}건(같은 신고 기간)` };
  }
  /** 부동산원 참고 글 */
  function roneCell(row) {
    const r = row && row.ro;
    if (!r) return { t: '—', why: '' };
    return { t: pct(r.chg), why: r.nm || r.t };
  }
  function levelRows(V, lv, sd) {
    return (V.rows || []).filter(r => r.lv === lv && (!sd || r.sd === sd));
  }
  function row(V, c) { return (V.rows || []).find(r => r.c === c) || null; }
  function sidos(V) { return levelRows(V, 'sd').map(r => r.nm); }
  /** 인용 글(기자용) — 첫 줄은 정해진 형식 그대로 */
  function cite(V, site) {
    const s = site || '집예보';
    return { line: `자료: ${s} 주간 실거래 동향(국토교통부 실거래가 분석, ${dot(V.asof)} 기준)`,
      detail: `${weekName(V)} ${verText(V)}${V.status === 'final' ? '' : ' — 늦게 신고되는 거래가 들어오면 숫자가 바뀔 수 있어요'}`,
      url: `${SITE_URL}/weekly/${V.w}/?v=${V.ver}` };
  }
  function urls(V, ver) {
    const v = ver || V.ver;
    return { csv: `${DATA}${V.w}/v${v}.csv`, json: `${DATA}${V.w}/v${v}.json`, page: `${PAGE}${V.w}/`, perma: `${PAGE}${V.w}/?v=${v}` };
  }
  /** 큰 제목: 전국 그 주 변동률(없으면 거래 건수만) */
  function headline(V) {
    const k = row(V, '00') || {};
    if (k.chg == null) return `${period(V)} 전국 아파트 매매 ${num(k.n)}건`;
    return `${period(V)} 전국 아파트, 같은 집 직전 거래보다 ${pct(k.chg)}`;
  }
  /** 막대 그래프 눈금: 보이는 값(변동률·오차 범위) 중 가장 큰 절댓값을 0.5%p 단위로 올림, 최소 1% */
  function scaleMax(rows, basis) {
    let m = 0;
    rows.forEach(r => { const p = pick(r, basis); if (!p.ok || r.old) return; [p.chg, p.lo, p.hi].forEach(v => { if (v != null) m = Math.max(m, Math.abs(v)); }); });
    return Math.max(1, Math.ceil(m * 2) / 2);
  }
  /** 날짜 차이(일) */
  function days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  /** 확정까지 남은 안내 */
  function finalNote(V) {
    if (V.status === 'final') return `계약 후 30일 신고 기한이 지난 자료(${dot(V.asof)} 기준)로 확정했어요. 확정한 판은 다시 바꾸지 않아요.`;
    return `계약 후 30일 안에 신고하면 되므로 거래가 더 들어와요. 매주 월요일 다시 계산해 새 판을 내고, ${md(V.final_on)} 이후 자료로 확정해요.`;
  }

  /* ---------- 발표 시각(매주 월요일 오전 7시) ---------- */
  const RELEASE = '매주 월요일 오전 7시(한국 시각)';
  /** 발표 시각이 지났는지(release 가 없으면 지난 것으로) */
  function released(x, now) { return !x || !x.release || Date.parse(x.release) <= +(now || Date.now()); }
  /** 'YYYY-MM-DDTHH:MM+09:00' → '11월 23일(월) 오전 7시' */
  function whenText(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return '';
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), h = +m[4], mi = +m[5];
    return `${+m[2]}월 ${+m[3]}일(${'일월화수목금토'[d.getUTCDay()]}) ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시${mi ? ` ${mi}분` : ''}`;
  }
  /** 고침 일정 글: 제1판 발표 → 매주 월요일 새 판 → 확정 예정 */
  function scheduleText(V) {
    const fin = V.final_on ? new Date(V.final_on + 'T00:00:00Z') : null;
    if (fin) while (fin.getUTCDay() !== 1) fin.setUTCDate(fin.getUTCDate() + 1);
    const fmon = fin ? `${fin.getUTCMonth() + 1}월 ${fin.getUTCDate()}일(월)` : '';
    return V.status === 'final' ? `발표 ${RELEASE} · 이 주는 확정됐어요(제${V.ver}판).` :
      `발표 ${RELEASE} · 늦게 신고된 거래를 넣어 매주 월요일 오전 7시에 새 판을 내고, ${fmon} 오전 7시 판에서 확정해요.`;
  }
  /* ---------- 다른 지표 ---------- */
  const ymText = ym => ym ? `${String(ym).slice(0, 4)}년 ${+String(ym).slice(4, 6)}월` : '';
  /** 외지인 매수 비율 칸(시·도 밖 거주자, 월 단위) */
  function obCell(row) {
    const o = row && row.ob;
    if (!o) return { t: '—', why: '' };
    if (o.sd == null) return { t: '표본 부족', why: `${ymText(o.ym)} ${num(o.n)}건`, cls: 'na' };
    return { t: share(o.sd), why: `${ymText(o.ym)} · ${num(o.n)}건 중`, sg: o.sg };
  }
  /** 급매 비율 칸 */
  function usCell(row) {
    if (!row || row.ub == null) return { t: '—', why: '' };
    if (row.us == null) return { t: row.ub ? '표본 부족' : '—', why: row.ub ? `${num(row.ub)}건` : '', cls: 'na' };
    return { t: share(row.us), why: `${num(row.nu)}건 / ${num(row.ub)}건` };
  }
  /** 연식별·규모별 표 줄 */
  function segRows(V, code, kind, basis) {
    return ((((V.seg || {})[code] || {})[kind]) || []).map(a => { const x = a[basis] || {};
      return { nm: a.nm, n: x.n || 0, np: x.np || 0, chg: x.chg == null ? null : x.chg, lo: x.lo == null ? null : x.lo, hi: x.hi == null ? null : x.hi, ok: x.chg != null }; });
  }
  /* ---------- 공식 지수와 나란히 본 기록 ---------- */
  function cmpSummary(C) {
    if (!C || !C.all || !C.all.n) return null;
    const f = a => a && { n: a.n, pct: a.pct, same: a.same, nz: a.nz, nzPct: a.nz_pct, ours0: a.ours0, gap: a.gap_med };
    return Object.assign(f(C.all), { from: C.from, to: C.to, m: C.m || 1, m1: C.m1 ? f(C.m1.all) : null });
  }
  /** 방법 변경 설명의 0.00% 횟수 글(compare.json 그대로) */
  function zeroText(S) {
    if (!S || !S.m1) return null;
    const p = (a) => `${num(a.n)}번 중 ${num(a.ours0)}번`;
    return { m1: `${S.from}~${S.to} 주를 같은 규칙으로 다시 계산해 보니 전국·시·도 ${p(S.m1)}이 0.00%였어요.`,
      m2: `같은 기간에 가운데 50% 평균은 ${p(S)}만 0.00%였어요.`,
      p: `(${S.from}~${S.to} 주 전국·시·도 ${p(S.m1)}). 가운데 50% 평균으로 바꾸자 같은 기간 ${num(S.ours0)}번으로 줄었음` };
  }
  /** 방법 판 이름(판 JSON method.m) */
  function methodName(V) { return ((V && V.method) || {}).m >= 2 ? '가운데 50% 평균' : '중간값'; }

  /* ---------- 보도자료실(/press/) — 기자가 그대로 붙여 쓰는 짧은 칼럼체(~다). 숫자는 판 자료 그대로 ---------- */
  function josa(w, a, b) { const c = String(w).slice(-1); if (/[가-힣]/.test(c)) return (c.charCodeAt(0) - 0xAC00) % 28 ? a : b; return /[013678]/.test(c) ? a : b; }
  function korDate(iso) { const p = String(iso).split('-'); return `${+p[1]}월 ${+p[2]}일`; }
  function pressPeriod(V) { const a = String(V.from).split('-'), b = String(V.to).split('-'); return a[1] === b[1] ? `${+a[1]}월 ${+a[2]}~${+b[2]}일` : `${korDate(V.from)}~${korDate(V.to)}`; }
  /** 순위 범위 문구: 엔진 top5 는 비교 거래가 표본 기준(method.min, 지금 30건) 이상인 시·군·구만 줄 세움 — '가장 많이 오른'은 그 안에서 1위라는 뜻 */
  function minText(V) { const m = ((V && V.method) || {}).min; return m ? `비교 거래 ${num(m)}건 이상인` : '표본 기준을 넘은'; }
  /** 제목 후보(최대 3개) */
  function pressTitles(V) {
    const k = row(V, '00') || {}, s = row(V, '11') || {}, t = (((V.top || {}).m || {}).up || [])[0], out = [];
    if (s.chg != null) out.push(`지난주 서울 아파트, 같은 집 직전 거래보다 ${pct(s.chg)}`);
    if (k.chg != null) out.push(`지난주 전국 아파트 실거래 ${pct(k.chg)}…비교 거래 ${num(k.np)}건`);
    if (t) out.push(`최근 4주 아파트값 가장 많이 오른 곳은 ${t.sd} ${t.nm}(${pct(t.chg)}, ${minText(V)} 시·군·구 중)`);
    if (k.hs != null && out.length < 3) out.push(`지난주 아파트 거래 ${share(k.hs)}가 신고가`);
    return out.slice(0, 3);
  }
  /** 핵심 숫자 3개 */
  function pressKeys(V) {
    const k = row(V, '00') || {}, s = row(V, '11') || {};
    return [
      { lb: `전국 같은 집 비교 변동률(${methodName(V)})`, v: k.chg == null ? '표본 부족' : pct(k.chg), nt: `비교 ${num(k.np)}건 · 오차 범위 ${pct(k.lo)} ~ ${pct(k.hi)}${k.med != null && methodName(V) !== '중간값' ? ` · 중간값 ${pct(k.med)}` : ''}` },
      { lb: `서울 같은 집 비교 변동률(${methodName(V)})`, v: s.chg == null ? '표본 부족' : pct(s.chg), nt: `비교 ${num(s.np)}건${s.med != null && methodName(V) !== '중간값' ? ` · 중간값 ${pct(s.med)}` : ''}` },
      { lb: '전국 신고가 비율', v: k.hs == null ? num(k.nh) + '건' : share(k.hs), nt: `거래 ${num(k.n)}건(해제 제외) 중 ${num(k.nh)}건` }];
  }
  /** 기사용 문장(칼럼체) */
  function pressLines(V, site) {
    const k = row(V, '00') || {}, s = row(V, '11') || {}, S = site || '집예보', out = [];
    const prov = V.status !== 'final';
    out.push(`${S} 주간 실거래 동향에 따르면 지난주(${pressPeriod(V)} 계약) 전국 아파트 매매는 ${num(k.n)}건 신고됐다${prov ? '(잠정)' : ''}.`);
    if (k.chg != null) out.push(methodName(V) === '중간값' ? `같은 단지·같은 면적의 직전 거래와 비교한 가격 변동률 중간값은 ${pct(k.chg)}다. 비교한 거래는 ${num(k.np)}건이다.` :
      `같은 단지·같은 면적의 직전 거래와 비교한 가격 변동률(가운데 50% 평균)은 ${pct(k.chg)}다. 중간값은 ${pct(k.med)}, 비교한 거래는 ${num(k.np)}건이다.`);
    if (k.up != null) out.push(`직전 거래보다 비싸게 팔린 거래는 ${share(k.up)}, 싸게 팔린 거래는 ${share(k.dn)}였다.`);
    if (s.chg != null) out.push(`서울은 ${pct(s.chg)}였다(비교 ${num(s.np)}건).`);
    const t = (((V.top || {}).m || {}).up || [])[0], d = (((V.top || {}).m || {}).down || [])[0];
    if (t) out.push(`${minText(V)} 시·군·구 중 최근 4주 기준 가장 많이 오른 곳은 ${t.sd} ${t.nm}${josa(t.nm, '으로', '로')} ${pct(t.chg)}였다(비교 ${num(t.np)}건).`);
    if (d) out.push(`같은 기준에서 가장 많이 내린 곳은 ${d.sd} ${d.nm}(${pct(d.chg)}, 비교 ${num(d.np)}건)이다.`);
    if (k.hs != null) out.push(`전국 신고가 비율은 ${share(k.hs)}였다.`);
    out.push(prov ? `이 수치는 계약 후 30일인 신고 기한이 끝나지 않은 잠정치다. 늦게 신고된 거래가 반영되면 매주 월요일 새 판으로 바뀐다.` : `신고 기한이 지난 자료로 확정한 수치다.`);
    out.push(`이 통계는 국토교통부 실거래가를 분석한 것으로, 조사 기반인 한국부동산원 주간 아파트 가격동향과 계산 방식이 다르다.`);
    return out;
  }

  /** 주 이름(YYYY-WW, ISO 주) → 그 주 월·일요일(YYYY-MM-DD)과 발표 시각(다음 월요일 오전 7시, 한국 시각) */
  function weekDates(w) {
    if (!WRE.test(String(w || ''))) return null;
    const y = +w.slice(0, 4), n = +w.slice(5), j4 = new Date(Date.UTC(y, 0, 4)), d = (j4.getUTCDay() + 6) % 7;
    const mon = new Date(Date.UTC(y, 0, 4 - d + (n - 1) * 7)), sun = new Date(+mon + 6 * 864e5), rel = new Date(+mon + 7 * 864e5);
    const iso = t => t.toISOString().slice(0, 10);
    return { from: iso(mon), to: iso(sun), release: iso(rel) + 'T07:00:00+09:00' };
  }
  /** 자료가 없는 주를 열었을 때 문구 — 진행 중·발표 전인 주는 발표 시각을, 그 밖은 사실대로(2026-11-26: 이번 주 주소에서 '통계를 찾지 못했어요'만 나오던 문제) */
  function missingText(w, latest, now) {
    const D = weekDates(w); now = +(now || Date.now());
    if (!D) return '주 이름을 알아보지 못했어요. 아래 가장 최근 주를 봐 주세요.';
    const range = `${md(D.from)}~${md(D.to)}`, end = Date.parse(D.to + 'T23:59:59+09:00'), rel = Date.parse(D.release);
    if (latest && w <= latest) return `${w} 주(${range}) 통계를 찾지 못했어요. 아래 가장 최근 주를 봐 주세요.`;
    if (now < Date.parse(D.from + 'T00:00:00+09:00')) return `${w} 주(${range})는 아직 오지 않은 주예요. 이 주 통계는 ${whenText(D.release) || '그다음 월요일 오전 7시'}에 발표해요.`;
    if (now <= end) return `${w} 주(${range})는 아직 진행 중이에요. 이 주 통계는 ${whenText(D.release) || '다음 주 월요일 오전 7시'}에 발표해요.`;
    if (now < rel) return `${w} 주(${range}) 통계는 ${whenText(D.release) || '월요일 오전 7시'}에 발표해요.`;
    return `${w} 주(${range}) 통계를 아직 받지 못했어요. 잠시 뒤 다시 확인해 주세요.`;
  }
  const API = { weekDates, missingText, DATA, PAGE, ORIGIN, SITE_URL, weekFrom, verFrom, num, pct, share, md, dot, period, weekName, statusText, verText, pick, chgCell, volCell,
    roneCell, levelRows, row, sidos, cite, urls, headline, scaleMax, days, finalNote, RELEASE, released, whenText, scheduleText, ymText, obCell, usCell, segRows, cmpSummary, zeroText, methodName, pressTitles, pressKeys, pressLines, pressPeriod };
  root.JDJ_WEEKLY = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
