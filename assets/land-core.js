/* 땅 위험 신호 체크(land/) 계산 — 브라우저 window.JDJ_LAND, node require 둘 다.
   자료: jangdaejang-data/data/land/index.json · data/land/<시군구>.json (엔진 scripts/land_feed.py — build_site.py 끝에서 매 실행)
     <시군구>.json: from~to 한 달에 한 칸씩 s.n·s.h(시·군·구 월별 거래·지분거래), e[읍면동].n·h, e.f {YYYYMM: 1|2}(지분거래 급증 신호), e.fz(최근 6개월 단계),
       pj/pu {지목|용도지역: [일반 거래 수, 25%, 가운데, 75%, 90%, 지분 거래 수, 지분 가운데]} ㎡당 원(최근 36개월 · 거래가 적으면 null), y {지목: [[연도, 수, 가운데]]}
   숫자를 새로 만들지 않아요: 화면 숫자는 자료 값 그대로이거나 그 합·나눗셈(비율)뿐. '갑자기 늘었다' 기준은 엔진(비공개)에만 있고 여기엔 단계(0·1·2)만 와요.
   비교 위치 문장은 그 동네 실제 거래의 4분위(75%·90%) 그대로 — 따로 정한 기준값 없음. */
(function (root) {
  'use strict';
  var MIN_N = 10;          // 지분 비율을 보여 줄 최소 거래 수(적으면 '자료가 부족해요')
  var PY = 3.305785;       // 1평 = 3.305785㎡

  function ymAdd(ym, k) { var y = +ym.slice(0, 4), m = +ym.slice(4) + k; while (m > 12) { y++; m -= 12; } while (m < 1) { y--; m += 12; } return y + (m < 10 ? '0' : '') + m; }
  function months(d) { var out = [], m = d.from; while (m <= d.to) { out.push(m); m = ymAdd(m, 1); } return out; }
  function sum(a, i0, i1) { var s = 0; for (var i = Math.max(0, i0); i < Math.min(a.length, i1); i++) s += a[i] || 0; return s; }
  function last(a, k) { return sum(a, a.length - k, a.length); }

  /** 최근 k개월 지분거래 비율: 이 읍·면·동 vs 같은 시·군·구 전체 */
  function shareStat(d, emd, k) {
    k = k || 12; var e = d.e[emd]; if (!e) return null;
    var n = last(e.n, k), h = last(e.h, k), sn = last(d.s.n, k), sh = last(d.s.h, k), M = months(d);
    return { k: k, n: n, h: h, r: n ? h / n : null, sn: sn, sh: sh, sr: sn ? sh / sn : null, enough: n >= MIN_N && sn >= MIN_N,
      from: M[Math.max(0, M.length - k)], to: M[M.length - 1] };
  }

  /** 임야·밭·논 같은 땅(a.n·a.h — 기획부동산이 주로 파는 땅 종류)만 본 지분거래: 최근 6개월 vs 그 전 3년.
      아파트 재건축 대지·도로처럼 도시 땅의 지분거래는 빼고 봐요(엔진 급증 신호와 같은 숫자). */
  var RURAL = ['임야', '전', '답', '과수원', '목장용지', '잡종지'];
  function ruralStat(d, emd, w, b) {
    w = w || 6; b = b || 36; var e = d.e[emd]; if (!e || !e.a || !d.s.a) return null;
    var L0 = e.a.n.length, i0 = L0 - w, p0 = Math.max(0, i0 - b), pm = i0 - p0, M = months(d);
    var n = sum(e.a.n, i0, L0), h = sum(e.a.h, i0, L0), pn = sum(e.a.n, p0, i0), ph = sum(e.a.h, p0, i0), sn = sum(d.s.a.n, i0, L0), sh = sum(d.s.a.h, i0, L0);
    // 같은 곳 시간 비교: 이 읍·면·동 최근 w개월(n·h·r·avgNow) vs 그 전 pm개월(pn·ph·pr·avgPrev)
    // 같은 기간 지역 비교: 최근 w개월 이 읍·면·동 vs 같은 시·군·구 전체(sn·sh·sr)
    return { w: w, n: n, h: h, r: n ? h / n : null, pm: pm, pn: pn, ph: ph, pr: pn ? ph / pn : null, avgNow: h / w, avgPrev: pm ? ph / pm : null,
      sn: sn, sh: sh, sr: sn ? sh / sn : null, tg: e.tg === undefined ? null : e.tg, enough: n + pn >= MIN_N && pm >= 12,
      from: M[i0], to: M[L0 - 1], pfrom: M[p0], pto: M[i0 - 1] };
  }

  /** 변화 단계(엔진 tg — 기준은 비공개, 단계만 옴) → 화면 말·색. 급증 신호(fz)가 켜졌으면 색은 신호 쪽 */
  var TG = { '2': ['많이 늘었어요', 'y'], '1': ['조금 늘었어요', 'n'], '0': ['비슷해요', 'g'], '-1': ['줄었어요', 'g'], '9': ['건수와 비율이 엇갈려요', 'n'] };
  function trend(tg, fz) {
    var t = tg == null ? ['자료가 부족해요', 'n'] : TG[String(tg)] || ['자료가 부족해요', 'n'];
    return { t: t[0], lv: fz === 2 ? 'r' : fz === 1 ? 'y' : t[1] };
  }
  /** 같은 곳 시간 비교 한 문장(숫자 그대로): 건수·비율이 각각 늘었는지 줄었는지 */
  function trendLine(ru) {
    var one = function (x) { return (Math.round(x * 10) / 10).toLocaleString('ko-KR'); };
    var dc = ru.avgNow - ru.avgPrev, dr = (ru.r || 0) - (ru.pr || 0), tg = ru.tg;
    var cnt = '한 달 평균 지분거래는 ' + one(ru.avgPrev) + '건 → ' + one(ru.avgNow) + '건', rat = '지분 비율은 ' + pct(ru.pr) + ' → ' + pct(ru.r);
    if (tg === 0) return cnt + ', ' + rat + '로 큰 차이가 없어요.';
    if ((tg === 1 && dc <= 0) || (tg === -1 && dc >= 0)) return cnt + '으로 비슷하지만, ' + rat + '로 ' + (dr > 0 ? '올랐어요.' : '내렸어요.');
    var cw = Math.abs(dc) < 0.05 ? '그대로였고' : dc > 0 ? '늘었고' : '줄었고', rw = Math.abs(dr) < 0.005 ? '그대로예요' : dr > 0 ? '올랐어요' : '내렸어요';
    return cnt + '으로 ' + cw + ', ' + rat + '로 ' + rw + '.';
  }

  /** 급증 신호: 단계(0·1·2)와 최근 3년 안 신호가 켜졌던 달 묶음 [[시작, 끝], …] */
  function flags(d, emd) {
    var e = d.e[emd]; if (!e) return { lv: 0, runs: [] };
    var M = months(d), lim = M[Math.max(0, M.length - 36)], ks = Object.keys(e.f || {}).filter(function (m) { return m >= lim; }).sort(), runs = [];
    ks.forEach(function (m) { var r = runs[runs.length - 1]; if (r && ymAdd(r[1], 1) === m) r[1] = m; else runs.push([m, m]); });
    return { lv: e.fz || 0, runs: runs };
  }

  /** 월별 막대(최근 k개월) / 연도별 막대(전체) — [{t 이름, n 거래, h 지분}] */
  function monthBars(d, emd, k) {
    var e = d.e[emd], M = months(d), i0 = Math.max(0, M.length - (k || 36)), out = [];
    for (var i = i0; i < M.length; i++) out.push({ t: M[i], n: e.n[i] || 0, h: e.h[i] || 0 });
    return out;
  }
  function yearBars(d, emd) {
    var e = d.e[emd], M = months(d), by = {}, out = [];
    M.forEach(function (m, i) { var y = m.slice(0, 4); by[y] = by[y] || { t: y, n: 0, h: 0, mo: 0 }; by[y].n += e.n[i] || 0; by[y].h += e.h[i] || 0; by[y].mo++; });
    Object.keys(by).sort().forEach(function (y) { out.push(by[y]); });
    return out;
  }

  /** 같은 지목 가격 자료: 이 읍·면·동 → 모자라면 시·군·구 전체 */
  function pickStats(d, emd, jimok) {
    var a = d.e[emd] && d.e[emd].pj && d.e[emd].pj[jimok];
    if (a && a[2] != null) return { st: a, scope: 'emd' };
    var b = d.pj && d.pj[jimok];
    if (b && b[2] != null) return { st: b, scope: 'sgg', emdN: a ? a[0] : 0 };
    return { st: a || b || null, scope: null };
  }

  /** 제시받은 ㎡당 가격이 주변 일반 거래(지분거래 제외) 안에서 어디쯤인지 — 4분위 값 그대로 비교 */
  function compare(st, per) {
    if (!st || st[2] == null || !(per > 0)) return null;
    var pos = per > st[4] ? 'p90' : per > st[3] ? 'p75' : per >= st[1] ? 'mid' : 'low';
    return { per: per, mult: per / st[2], pos: pos, lv: pos === 'p90' ? 'r' : pos === 'p75' ? 'y' : 'g' };
  }

  /** 주소 글자로 시·군·구·읍·면·동 찾기 — '경기 용인시 처인구 포곡읍 마성리 산 12' → {c, e} */
  var SIDO_SHORT = { '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시', '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시', '울산': '울산광역시',
    '세종': '세종특별자치시', '경기': '경기도', '강원': '강원특별자치도', '충북': '충청북도', '충남': '충청남도', '전북': '전북특별자치도', '전남': '전라남도', '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도' };
  function findPlace(ix, text) {
    var t = String(text || '').replace(/[(),·]/g, ' ').replace(/\s+/g, ' ').trim(); if (!t) return null;
    var toks = t.split(' '), best = null;
    (ix.sido || []).forEach(function (s) {
      var sidoHit = toks.some(function (w) { return w === s.n || SIDO_SHORT[w] === s.n || (w.length >= 2 && s.n.indexOf(w) === 0); });
      s.g.forEach(function (g) {
        var parts = g.n.split(' '), gs = 0;
        parts.forEach(function (p) { if (toks.indexOf(p) >= 0) gs += 2; else if (toks.indexOf(p.replace(/[시군구]$/, '')) >= 0 && p.length > 2) gs += 1; });
        var emd = null;
        for (var i = 0; i < toks.length && !emd; i++) if (g.e.indexOf(toks[i]) >= 0) emd = toks[i];
        if (!gs && !emd) return;
        var sc = gs * 3 + (emd ? 4 : 0) + (sidoHit ? 1 : 0) + (gs === parts.length * 2 ? 1 : 0);
        if (!gs && emd && !sidoHit) sc = 1;                       // 동 이름만 맞음(전국에 같은 이름 많음) → 가장 약하게
        if (!best || sc > best.sc) best = { c: g.c, e: emd, sc: sc, n: g.n, sd: s.n };
        else if (sc === best.sc) best.tie = true;
      });
    });
    return best && !(best.tie && best.sc <= 1) ? { c: best.c, e: best.e, n: best.n, sd: best.sd } : null;
  }

  /** 막대 그래프 SVG(지분 진한 색 + 일반 연한 색 쌓기). 접근성: role=img + 요약 글 */
  function barsSvg(rows, o) {
    o = o || {}; var W = o.w || 640, H = o.h || 180, pl = 30, pb = 22, pt = 8, cw = W - pl - 4, ch = H - pb - pt;
    var mx = 0; rows.forEach(function (r) { if (r.n > mx) mx = r.n; }); mx = mx || 1;
    var step = Math.pow(10, Math.floor(Math.log(mx) / Math.LN10)), top = Math.ceil(mx / step) * step; if (top / step > 5 && step >= 1) step *= 2; top = Math.ceil(mx / step) * step;
    var bw = cw / rows.length, g = [], i;
    for (var v = 0; v <= top; v += step) { var y = pt + ch - ch * v / top; g.push('<line x1="' + pl + '" x2="' + (W - 4) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="gl"/><text x="' + (pl - 4) + '" y="' + (y + 4).toFixed(1) + '" class="ax" text-anchor="end">' + v + '</text>'); }
    for (i = 0; i < rows.length; i++) {
      var r = rows[i], x = pl + i * bw + bw * 0.15, w = Math.max(1, bw * 0.7), hn = ch * r.n / top, hh = ch * r.h / top;
      g.push('<rect x="' + x.toFixed(1) + '" y="' + (pt + ch - hn).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hn.toFixed(1) + '" class="bn"><title>' + label(r.t) + ' 거래 ' + r.n + '건 · 지분 ' + r.h + '건</title></rect>');
      if (r.h) g.push('<rect x="' + x.toFixed(1) + '" y="' + (pt + ch - hh).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hh.toFixed(1) + '" class="bh"/>');
      var lab = r.t.length === 4 ? (rows.length > 12 ? (i % 2 === 0 || i === rows.length - 1 ? r.t.slice(2) + '년' : '') : r.t + '년') : (r.t.slice(4) === '01' || (i === 0 && +r.t.slice(4) <= 9) ? r.t.slice(2, 4) + '.' + r.t.slice(4) : '');
      if (lab) g.push('<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" class="ax" text-anchor="middle">' + lab + '</text>');
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '" preserveAspectRatio="none">' + g.join('') + '</svg>';
  }

  function label(ym) { return ym.length === 4 ? ym + '년' : ym.slice(0, 4) + '년 ' + (+ym.slice(4)) + '월'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function won(n) {
    n = Math.round(n); if (n >= 1e8) { var e = Math.floor(n / 1e8), m = Math.round((n % 1e8) / 1e4); return e + '억' + (m ? ' ' + m.toLocaleString('ko-KR') + '만' : '') + ' 원'; }
    if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('ko-KR') + '만 원';
    return n.toLocaleString('ko-KR') + '원';
  }
  /** ㎡당 원 → '㎡당 12만 원(평당 40만 원)' */
  function perM2(v) { return '㎡당 ' + won(v) + '(평당 ' + won(v * PY) + ')'; }
  function pct(r) { return r == null ? '-' : (Math.round(r * 1000) / 10) + '%'; }
  function times(x) { return (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10) + '배'; }
  function span(a, b) { return a === b ? label(a) : label(a) + '~' + (a.slice(0, 4) === b.slice(0, 4) ? (+b.slice(4)) + '월' : label(b)); }
  function num(v) { v = String(v == null ? '' : v).replace(/[^0-9.]/g, ''); return v ? Number(v) : 0; }

  var API = { MIN_N: MIN_N, PY: PY, ymAdd: ymAdd, months: months, shareStat: shareStat, ruralStat: ruralStat, trend: trend, trendLine: trendLine, RURAL: RURAL, flags: flags, monthBars: monthBars, yearBars: yearBars,
    pickStats: pickStats, compare: compare, findPlace: findPlace, barsSvg: barsSvg, label: label, esc: esc, won: won, perM2: perM2, pct: pct, times: times, span: span, num: num };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.JDJ_LAND = API;
})(typeof window !== 'undefined' ? window : null);
