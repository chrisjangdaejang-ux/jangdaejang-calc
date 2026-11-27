/* 청약 공고 목록(/cy/) — 카드 · 상태 칩 · D-day · 마감 임박 순 · 지역 필터 · 달력 보기 · '내 달력에 추가'(.ics 내려받기)
   자료: 같은 폴더 notices.json(청약홈 분양정보, 엔진 seo_pages.py 가 매일 갱신) · 분양가 비교는 jangdaejang-data data/chungyak/price.json
   (assets/cy-price.js 와 같은 값·같은 문장 — 이 파일은 숫자를 새로 만들지 않고 날짜 비교·고르기만 해요).
   LH 공공분양·임대 공고: LH_ENABLED 가 true 이고 data/lh/notices.json(엔진 scripts/pubfeeds.py)이 있을 때만 같은 목록에 '공공임대'·'LH 공공분양' 칩으로 섞어요
   (2026-11-27 켬 — 자료 파일이 없으면 아무것도 안 보여요. 끌 때는 LH_ENABLED=false, 미리 보기 ?preview=lh).
   node 테스트: tools/cy-list-test.js */
(function (root) {
  'use strict';
  var LH_ENABLED = true;   // 2026-11-27 켬: 활용신청 승인(11/26) 뒤 실제 응답 품질 확인(공고 168건 중 일정 있는 164건, 시·도 99%, 링크 100%) — 엔진 scripts/pubfeeds.py
  var LABEL = { pre: '접수 예정', on: '접수 중', wait: '발표 대기', ct: '계약', done: '마감' };
  var ORDER = { on: 0, pre: 1, wait: 2, ct: 3, done: 4 };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString('ko-KR'); };
  function ymd(d) { if (!d) d = new Date(); if (typeof d === 'string') return d.replace(/-/g, '').slice(0, 8); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
  var dot = function (s) { s = String(s || ''); return s.length >= 8 ? s.slice(0, 4) + '.' + s.slice(4, 6) + '.' + s.slice(6, 8) : ''; };
  var md = function (s) { s = String(s || ''); return s.length >= 8 ? (+s.slice(4, 6)) + '/' + (+s.slice(6, 8)) : ''; };
  function toDate(s) { s = String(s || ''); return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)); }
  function days(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
  function plus1(s) { var d = toDate(s); d.setDate(d.getDate() + 1); return ymd(d); }
  var arr = function (v) { return Array.isArray(v) ? v : v ? [v] : []; };

  /* 일정: 접수 시작(특별공급·일반 중 빠른 날) · 접수 끝 · 발표 · 계약 시작·끝 */
  function dates(x) {
    var sp = arr(x.sp), rc = arr(x.rc), ct = arr(x.ct);
    var b = [sp[0], rc[0]].filter(Boolean).sort()[0] || '';
    var e = [rc[1], sp[1]].filter(Boolean).sort().pop() || '';
    return { b: b, e: e, pw: x.pw || '', c0: ct[0] || '', c1: ct[1] || ct[0] || '' };
  }
  /* 상태: 접수 시작 전 → 접수 예정 / 접수 기간 → 접수 중 / 접수 끝~발표일 → 발표 대기 / 발표 뒤~계약 끝 → 계약 / 그 뒤 → 마감
     (접수 예정·접수 중·발표 대기 판정은 assets/sale-status.js 와 같은 날짜 비교) */
  function stOf(x, today) {
    var t = ymd(today), d = dates(x);
    if (!d.b && !d.e) return 'done';
    if (d.b && t < d.b) return 'pre';
    if (d.e && t <= d.e) return 'on';
    if (d.pw && t <= d.pw) return 'wait';
    if (d.c1 && t <= d.c1) return 'ct';   // 계약일을 모르는 공고는 발표 뒤 '마감'(날짜를 짐작하지 않음)
    return 'done';
  }
  /* D-day 문장 */
  function dday(x, today) {
    var t = ymd(today), d = dates(x), s = stOf(x, t), n;
    var dd = function (k) { return k === 0 ? 'D-day' : 'D-' + k; };
    if (s === 'pre') { n = days(t, d.b); return { k: n, txt: '접수 시작 ' + dd(n) }; }
    if (s === 'on') { n = days(t, d.e); return { k: n, txt: n === 0 ? '오늘 접수 마감' : '마감 ' + dd(n) }; }
    if (s === 'wait') { n = days(t, d.pw); return { k: n, txt: n === 0 ? '오늘 당첨자 발표' : '발표 ' + dd(n) }; }
    if (s === 'ct') {
      if (d.c0 && t < d.c0) { n = days(t, d.c0); return { k: n, txt: '계약 시작 ' + dd(n) }; }
      if (d.c1) { n = days(t, d.c1); return { k: n, txt: n === 0 ? '오늘 계약 마감' : '계약 마감 ' + dd(n) }; }
      return { k: 99, txt: '계약 일정은 공고문 확인' };
    }
    return { k: 999, txt: '마감' };
  }
  /* 정렬: 마감 임박 순(접수 중 → 접수 예정 → 발표 대기 → 계약 → 마감, 같은 상태 안에서 남은 날이 적은 순) · 최신 공고 순 */
  function sortRows(rows, how, today) {
    var t = ymd(today);
    var k = function (x) { return how === 'new' ? [-(+(x.pb || 0)), x.n] : [ORDER[stOf(x, t)], dday(x, t).k, x.n]; };
    return rows.slice().sort(function (a, b) { var x = k(a), y = k(b); for (var i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; } return 0; });
  }
  /* 분양가 범위(주택형 최고 분양가 중 가장 낮은·높은 값, 만원) */
  function priceRange(x) {
    var v = (x.ty || []).map(function (t) { return t[4]; }).filter(function (p) { return p > 0; });
    if (!v.length) return null;
    return { lo: Math.min.apply(null, v), hi: Math.max.apply(null, v) };
  }
  function won(m) { var e = Math.floor(m / 10000), r = m % 10000; return e ? e + '억' + (r ? ' ' + fmt(r) + '만' : '') : fmt(r) + '만'; }
  /* 분양가 vs 주변 신축: cy-price 공개 요약(price.json rows[no].bands)의 첫 면적대 — 문장은 cy-price.js posTxt 와 같게 */
  var TIER = ['하위', '중간', '상위'], BAND = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'];
  function nearTxt(p) {
    if (!p || !p.bands || !p.bands.length) return null;
    var b = p.bands.filter(function (z) { return !z.lack && !z.lease && z.tier != null; })[0] || p.bands[0];
    if (b.lease) return { tier: null, t: '토지임대부라 주변 아파트 거래와 같은 조건으로 비교하지 않았어요' };
    if (b.lack || b.tier == null) return { tier: null, t: '주변 신축 비교 거래가 모자라 위치를 정하지 않았어요' };
    return { tier: b.tier, t: BAND[b.b] + ' 3.3㎡당 ' + fmt(b.ppy) + '만 원 · 주변 신축 거래(' + b.scope + ' ' + fmt(b.n) + '건) 대비 ' + TIER[b.tier] + ' 구간에 가까워요' };
  }

  /* ---------- 달력 파일(.ics) — 하루 종일 일정, 기기 달력 앱이 그대로 읽음 ---------- */
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function events(x) {
    var sp = arr(x.sp), rc = arr(x.rc), r1 = arr(x.r1), ct = arr(x.ct), ev = [];
    var add = function (k, b, e, t) { if (b) ev.push({ k: k, b: b, e: e || b, t: t }); };
    add('sp', sp[0], sp[1], '특별공급 접수');
    if (r1[0]) add('r1', r1[0], r1[0], '1순위 접수(해당지역)');
    if (r1[1] && r1[1] !== r1[0]) add('r1e', r1[1], r1[1], '1순위 접수(기타지역)');
    if (!r1[0] && rc[0]) add('rc', rc[0], rc[1], '청약 접수');
    add('pw', x.pw, x.pw, '당첨자 발표');
    add('ct', ct[0], ct[1], '계약');
    return ev;
  }
  function ics(x, opt) {
    opt = opt || {};
    var stamp = (opt.now || ymd()) + 'T000000Z', url = opt.url || '';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jipyebo//cy//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc('청약 일정 · ' + x.n)];
    events(x).forEach(function (v) {
      L.push('BEGIN:VEVENT', 'UID:' + x.no + '-' + v.k + '@jipyebo', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + v.b, 'DTEND;VALUE=DATE:' + plus1(v.e),
        'SUMMARY:' + icsEsc('[청약] ' + x.n + ' ' + v.t),
        'DESCRIPTION:' + icsEsc(v.t + ' ' + dot(v.b) + (v.e !== v.b ? '~' + dot(v.e) : '') + ' · 시간·자격은 입주자모집공고문과 청약홈이 기준이에요' + (x.u ? '\n' + x.u : '')),
        url ? 'URL:' + url : '', 'BEGIN:VALARM', 'TRIGGER:-PT15H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(x.n + ' ' + v.t), 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.filter(Boolean).join('\r\n') + '\r\n';
  }
  /* 달력 칸: 그 달의 주(월요일 시작이 아닌 일요일 시작) × 7일, 날마다 일정 */
  function monthGrid(rows, y, m) {
    var first = new Date(y, m - 1, 1), start = new Date(first); start.setDate(1 - first.getDay());
    var byDay = {};
    rows.forEach(function (x) { events(x).forEach(function (v) { var d = toDate(v.b), e = toDate(v.e); for (var g = 0; d <= e && g < 40; g++) { var k = ymd(d); (byDay[k] = byDay[k] || []).push({ no: x.no, n: x.n, k: v.k, t: v.t }); d.setDate(d.getDate() + 1); } }); });
    var weeks = [], d = new Date(start);
    for (var w = 0; w < 6; w++) {
      var wk = [];
      for (var i = 0; i < 7; i++) { var k = ymd(d); wk.push({ d: k, inM: d.getMonth() === m - 1, ev: byDay[k] || [] }); d.setDate(d.getDate() + 1); }
      weeks.push(wk);
      if (d.getMonth() !== m - 1 && w >= 3) break;
    }
    return weeks;
  }
  /* LH 공고(data/lh/notices.json — 엔진이 공공데이터포털 '한국토지주택공사 분양임대공고문 조회'로 만들 모양)
     rows: [{ id, n, sd, g, kind('공공분양'|'공공임대'|'행복주택'|…), pb, rc:[시작,끝], pw, u }] → 이 목록 행 모양으로 */
  function fromLH(j) {
    return ((j && j.rows) || []).filter(function (r) { return r && r.id && r.n; }).map(function (r) {
      var rent = !/분양/.test(r.kind || '');
      return { no: 'lh-' + r.id, n: r.n, sd: r.sd || '', g: r.g || '', k: rent ? '공공임대' : 'LH 공공분양', lh: true, rent: rent, kind: r.kind || '', pb: r.pb || '', sp: [], rc: arr(r.rc), r1: [], pw: r.pw || '', u: r.u || '', hh: r.hh || 0, ty: [], f: [] };
    });
  }

  /* ---------- 화면 ---------- */
  function card(x, t, P) {
    var s = stOf(x, t), dd = dday(x, t), d = dates(x), pr = priceRange(x), nr = nearTxt(P && P[x.no]);
    var sch = [];
    if (arr(x.sp)[0]) sch.push('특별공급 <b>' + md(x.sp[0]) + '</b>');
    if (arr(x.r1)[0]) sch.push('1순위 <b>' + md(x.r1[0]) + (x.r1[1] && x.r1[1] !== x.r1[0] ? '~' + md(x.r1[1]) : '') + '</b>');
    else if (d.b) sch.push('접수 <b>' + md(d.b) + (d.e && d.e !== d.b ? '~' + md(d.e) : '') + '</b>');
    if (x.pw) sch.push('발표 <b>' + md(x.pw) + '</b>');
    if (d.c0) sch.push('계약 <b>' + md(d.c0) + (d.c1 && d.c1 !== d.c0 ? '~' + md(d.c1) : '') + '</b>');
    var flags = (x.f || []).filter(function (f) { return /투기과열|조정대상|분양가상한제|토지임대부/.test(f); }).slice(0, 2);
    var href = x.lh ? x.u : x.no + '/';
    return '<li class="cyl-c" data-st="' + s + '" data-no="' + esc(x.no) + '">'
      + '<div class="cyl-top"><span class="cyl-st cyl-' + s + '">' + LABEL[s] + '</span><span class="cyl-dd' + (s === 'on' && dd.k <= 1 ? ' hot' : '') + '">' + esc(dd.txt) + '</span></div>'
      + '<a class="cyl-n" href="' + esc(href) + '"' + (x.lh ? ' target="_blank" rel="noopener"' : '') + '>' + esc(x.n) + '</a>'
      + '<div class="cyl-tags"><span class="cyl-k' + (x.rent ? ' rent' : '') + '">' + esc(x.rent ? '공공임대' : x.lh ? 'LH 공공분양' : x.k === '민영' ? '민영' : '공공분양') + '</span>' + flags.map(function (f) { return '<span class="cyl-f">' + esc(f) + '</span>'; }).join('') + '</div>'
      + '<div class="cyl-loc">' + esc((x.sd || '') + ' ' + (x.g || '')) + (x.hh ? ' · ' + fmt(x.hh) + '세대' : '') + (x.kind && x.lh ? ' · ' + esc(x.kind) : '') + '</div>'
      + (sch.length ? '<div class="cyl-sch">' + sch.join('<i>·</i>') + '</div>' : '')
      + (pr ? '<div class="cyl-pr">분양가 <b>' + won(pr.lo) + (pr.hi !== pr.lo ? '~' + won(pr.hi) : '') + '원</b><small>주택형별 최고 분양가 기준</small></div>' : '')
      + (nr ? '<div class="cyl-near' + (nr.tier == null ? ' na' : ' t' + nr.tier) + '">' + esc(nr.t) + '</div>' : '')
      + '<div class="cyl-act">' + (events(x).length ? '<button type="button" class="cyl-ics" data-ics="' + esc(x.no) + '">내 달력에 추가</button>' : '')
      + (x.lh ? '' : '<a class="cyl-go" href="' + esc(x.no) + '/">일정·분양가 자세히</a>') + '</div></li>';
  }
  function download(name, text) {
    try {
      var b = new Blob([text], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) {}
  }
  /* 사이트 첫 주소 — 받은 분양 광고 확인하기 링크용 */
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var SITE = JB.SITE;
  function mount(el, opt) {
    opt = opt || {};
    var DATA = opt.data, t = ymd(opt.today), rows = [], P = {}, F = { sd: '', st: '', sort: 'due', view: 'list', y: +t.slice(0, 4), m: +t.slice(4, 6), day: t };
    var lhOn = LH_ENABLED || /[?&]preview=lh\b/.test((root.location && root.location.search) || '');
    function vis() {
      return rows.filter(function (x) { var s = stOf(x, t); return (!F.sd || x.sd === F.sd) && (F.st === 'all' ? true : F.st ? (F.st === 'rent' ? x.rent : s === F.st) : s !== 'done'); });
    }
    function chips() {
      var c = { '': '진행 중 전체', pre: LABEL.pre, on: LABEL.on, wait: LABEL.wait, ct: LABEL.ct, all: '지난 공고까지' };
      if (lhOn && rows.some(function (x) { return x.rent; })) c.rent = '공공임대';
      return Object.keys(c).map(function (k) { var n = k === '' || k === 'all' ? '' : ' ' + rows.filter(function (x) { return (!F.sd || x.sd === F.sd) && (k === 'rent' ? x.rent : stOf(x, t) === k); }).length; return '<button type="button" data-st="' + k + '" class="' + (F.st === k ? 'on' : '') + '">' + c[k] + n + '</button>'; }).join('');
    }
    function list(v) {
      if (!v.length) return '<p class="cyl-empty">' + (F.sd ? esc(F.sd) + '에는 ' : '') + '조건에 맞는 공고가 없어요. 위에서 다른 상태나 지역을 골라 보세요.</p>';
      return '<ol class="cyl">' + sortRows(v, F.sort, t).map(function (x) { return card(x, t, P); }).join('') + '</ol>';
    }
    function cal(v) {
      var W = monthGrid(v, F.y, F.m), K = { sp: '특', r1: '1', r1e: '1', rc: '접', pw: '발', ct: '계' };
      var h = '<div class="cyl-calh"><button type="button" data-mv="-1" aria-label="지난달">‹</button><b>' + F.y + '년 ' + F.m + '월</b><button type="button" data-mv="1" aria-label="다음 달">›</button></div>'
        + '<div class="cyl-leg"><span class="e-sp">특 특별공급</span><span class="e-r1">1 1순위</span><span class="e-pw">발 발표</span><span class="e-ct">계 계약</span></div>'
        + '<table class="cyl-cal"><thead><tr>' + ['일', '월', '화', '수', '목', '금', '토'].map(function (d) { return '<th>' + d + '</th>'; }).join('') + '</tr></thead><tbody>';
      W.forEach(function (wk) {
        h += '<tr>' + wk.map(function (c) {
          var seen = {}, ev = c.ev.filter(function (e) { var k = e.no + e.k.slice(0, 2); if (seen[k]) return false; seen[k] = 1; return true; });
          return '<td data-day="' + c.d + '" class="' + (c.inM ? '' : 'out') + (c.d === t ? ' today' : '') + (c.d === F.day ? ' pick' : '') + '"><span class="dn">' + (+c.d.slice(6, 8)) + '</span>'
            + ev.slice(0, 3).map(function (e) { return '<a class="ev e-' + e.k.replace('e', '').replace('rc', 'r1') + '" href="' + (String(e.no).indexOf('lh-') === 0 ? '#' : esc(e.no) + '/') + '" title="' + esc(e.n + ' ' + e.t) + '"><i>' + K[e.k] + '</i>' + esc(e.n) + '</a>'; }).join('')
            + (ev.length > 3 ? '<span class="more">+' + (ev.length - 3) + '</span>' : '') + '</td>';
        }).join('') + '</tr>';
      });
      h += '</tbody></table>';
      var dayEv = [];
      if (F.day) W.forEach(function (wk) { wk.forEach(function (c) { if (c.d === F.day) dayEv = c.ev; }); });
      if (F.day && dayEv.length) h += '<div class="cyl-day"><b>' + dot(F.day) + ' 일정 ' + dayEv.length + '건</b><ul>' + dayEv.map(function (e) { var lh = String(e.no).indexOf('lh-') === 0; return '<li><span class="ev e-' + e.k.replace('e', '').replace('rc', 'r1') + '">' + esc(e.t) + '</span> ' + (lh ? esc(e.n) : '<a href="' + esc(e.no) + '/">' + esc(e.n) + '</a>') + '</li>'; }).join('') + '</ul></div>';
      return h + '<p class="cyl-note">날짜 칸을 누르면 그날 일정이 모두 아래에 나와요. 칸 안에는 3개까지만 보이고 나머지는 +숫자로 표시해요.</p>';
    }
    function draw() {
      var v = vis(), sds = [];
      rows.forEach(function (x) { if (x.sd && sds.indexOf(x.sd) < 0) sds.push(x.sd); });
      sds.sort(function (a, b) { return a.localeCompare(b, 'ko'); });
      el.innerHTML = '<div class="cyl-bar"><label class="cyl-sd"><span>지역</span><select data-f="sd"><option value="">전국</option>' + sds.map(function (s) { return '<option' + (F.sd === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label>'
        + '<div class="cyl-seg" role="group" aria-label="보기"><button type="button" data-view="list" class="' + (F.view === 'list' ? 'on' : '') + '">목록</button><button type="button" data-view="cal" class="' + (F.view === 'cal' ? 'on' : '') + '">달력</button></div>'
        + (F.view === 'list' ? '<div class="cyl-seg" role="group" aria-label="순서"><button type="button" data-sort="due" class="' + (F.sort === 'due' ? 'on' : '') + '">마감 임박 순</button><button type="button" data-sort="new" class="' + (F.sort === 'new' ? 'on' : '') + '">최신 공고 순</button></div>' : '') + '</div>'
        + '<div class="cyl-chips">' + chips() + '</div>'
        + '<p class="cyl-cnt">' + (F.view === 'list' ? '공고 <b>' + v.length + '</b>곳' : '이 달 일정') + ' · 오늘 ' + dot(t) + ' 기준</p>'
        + '<a class="cyl-adc" href="' + SITE + 'bunyang/check/" data-track="cy_to_adcheck" style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;margin:0 0 12px;padding:10px 14px;border:1px solid #D4D1F5;border-radius:14px;background:#F5F8FF;color:#191F28;text-decoration:none;font-size:15px;line-height:1.45;word-break:keep-all"><span><b>분양 문자·카톡을 받았나요?</b> 받은 분양 광고 확인하기 — 가격·잔금 유예·실거주 문구를 공개 자료와 맞춰 봐요</span><span aria-hidden="true" style="color:#4338CA;font-weight:800">›</span></a>'
        + (F.view === 'list' ? list(v) : cal(v));
      el.querySelectorAll('[data-st]').forEach(function (b) { if (b.tagName === 'BUTTON') b.onclick = function () { F.st = b.dataset.st; draw(); }; });
      el.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { F.view = b.dataset.view; draw(); }; });
      el.querySelectorAll('[data-sort]').forEach(function (b) { b.onclick = function () { F.sort = b.dataset.sort; draw(); }; });
      el.querySelectorAll('td[data-day]').forEach(function (td) { td.onclick = function (ev) { if (ev.target.closest('a')) return; F.day = td.dataset.day; draw(); var d = el.querySelector('.cyl-day'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }; });
      el.querySelectorAll('[data-mv]').forEach(function (b) { b.onclick = function () { F.m += +b.dataset.mv; if (F.m < 1) { F.m = 12; F.y--; } if (F.m > 12) { F.m = 1; F.y++; } draw(); }; });
      var sel = el.querySelector('[data-f="sd"]'); if (sel) sel.onchange = function () { F.sd = sel.value; draw(); };
      el.querySelectorAll('[data-ics]').forEach(function (b) { b.onclick = function () {
        var x = rows.filter(function (r) { return r.no === b.dataset.ics; })[0]; if (!x) return;
        download('청약일정_' + String(x.n).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) + '.ics', ics(x, { url: root.location ? root.location.href.split('#')[0].replace(/[^/]*$/, '') + (x.lh ? '' : x.no + '/') : '' }));
        if (root.JDJ && root.JDJ.track) root.JDJ.track('cy_ics', { no: x.no });
      }; });
    }
    var get = function (u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
    return Promise.all([get(opt.notices || 'notices.json'), DATA ? get(DATA + 'data/chungyak/price.json') : null, lhOn && DATA ? get(DATA + 'data/lh/notices.json') : null]).then(function (r) {
      rows = ((r[0] && r[0].rows) || []).slice();
      P = (r[1] && r[1].rows) || {};
      rows.forEach(function (x) { if (!x.ct && P[x.no] && P[x.no].ct) x.ct = P[x.no].ct; });   // 계약일: 공고 자료에 없으면 분양가 분석 자료의 계약일
      if (r[2]) rows = rows.concat(fromLH(r[2]));
      if (rows.length) draw();
      return rows.length;
    });
  }
  var api = { LH_ENABLED: LH_ENABLED, LABEL: LABEL, dates: dates, stOf: stOf, dday: dday, sortRows: sortRows, priceRange: priceRange, nearTxt: nearTxt, events: events, ics: ics, monthGrid: monthGrid, fromLH: fromLH, card: card, mount: mount, ymd: ymd };
  root.JDJ_CYL = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
