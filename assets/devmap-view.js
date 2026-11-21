/* 지도 '개발·교통 예정' 레이어 — 글자·카드·쉬운 풀이·표시 범위 (map/ 이 부름, 계산은 여기서만 · node tools/devmap-test.js 로 확인)
   자료: jangdaejang-data/data/devmap.json (엔진 scripts/devmap.py build)
   - 예정 연도는 공식 발표(국토교통부·정부 정책브리핑·지자체 보도자료·고시·기본계획)에 적힌 문구 그대로, 출처 이름·날짜와 함께만.
     연도가 없으면 단계(계획·공사 중 등)만 — 이 파일은 연도를 만들지 않고 자료의 due[].say 만 보여 줌
   - 점선 = 공식 정거장 순서대로 이미 운행 중인 역(공공 좌표)만 이은 선, 칠한 면 = 공식 공간자료의 구역 경계
   - 공식 경계가 없는 사업은 점 + '사업 구역 경계는 공식 고시 도면에서 확인해 주세요'(공식 고시·발표 링크). 짐작한 원·면은 없음
   window.JDJ_FUT = { load(base), label(it), cardHtml(it, o), listHtml(d, o), infoHtml(d, o), show(it, z), lineZ, areaZ, CHANGE, KIND, STAGE } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var CHANGE = '예정 시기는 사업 진행에 따라 바뀔 수 있어요.';
  var NOBOUND = '사업 구역 경계는 공식 고시 도면에서 확인해 주세요';
  /* 쉬운 풀이: 부동산을 몰라도 알아듣게 */
  var KIND = {
    '산업단지': '공장·연구소를 한곳에 모아 짓기로 정한 땅이에요. 이름에 "국가"가 붙은 국가산업단지(국가산단)는 정부(국토교통부)가 직접 지정한 큰 산업단지예요. 일자리가 늘면 주변에 사람이 모일 수 있어요.',
    '공공주택지구': '정부·공공기관이 집을 많이 짓기 위해 지정한 땅이에요(3기 신도시 같은 곳). 입주가 시작되면 주변 집 공급이 한꺼번에 늘어요.',
    '정비구역': '낡은 집을 허물고 새로 짓는 재개발·재건축을 하기로 정한 구역이에요. 단계가 뒤로 갈수록(이주·공사) 새 아파트가 가까워져요.',
    '업무 복합': '사무실·상가·주거 등을 한데 모아 짓는 큰 개발이에요. 일하는 사람과 방문객이 늘어나는 곳이에요.',
    '업무·전시 복합': '전시장·회의장(MICE)·사무실 등을 함께 짓는 큰 개발이에요. 방문객과 일자리가 늘어나는 곳이에요.',
    '환승센터': '지하철·광역철도·버스를 한곳에서 갈아탈 수 있게 짓는 시설이에요.',
    '공연장': '큰 공연을 여는 전문 공연장이에요. 방문객이 늘어 주변 상권이 바뀔 수 있어요.',
    '개발사업': '정부·지자체가 발표한 큰 개발사업이에요.',
    '노선': '새로 생기는 철도 노선이에요. 개통은 열차가 실제로 다니기 시작하는 것을 말해요.'
  };
  var STAGE = {
    '계획': '정부·지자체가 하겠다고 발표했거나 계획을 세운 단계예요. 아직 공사를 시작하지 않았어요.',
    '계획 확정': '계획이 법에 따른 절차(구역 지정·승인·협약 등)를 거쳐 정해진 단계예요. 아직 공사 전이에요.',
    '지구 지정': '정부가 그 땅을 공공주택지구로 정식 지정한 단계예요. 보상·조성 공사가 이어져요.',
    '분양 시작': '집을 팔기 시작(분양·사전청약)한 단계예요.',
    '공사 중': '착공(공사를 시작함)한 뒤 짓고 있는 단계예요.',
    '구역 지정': '재개발·재건축 구역으로 정식 지정된 단계예요.',
    '조합 준비': '집주인들이 조합을 만들려고 준비하는 단계(추진위원회)예요.',
    '조합 설립': '집주인들이 조합을 만들어 허가를 받은 단계예요. 아직 설계·인허가가 남아 있어요.',
    '인허가': '건축 심의나 사업 시행 인가를 받는 단계예요. 무엇을 몇 층으로 지을지 정해져요.',
    '이주 준비': '관리처분 인가를 받아 누가 어떤 집을 받을지 정해진 단계예요. 곧 이주·철거가 시작돼요.',
    '이주': '주민이 이사를 나가고 철거를 앞둔 단계예요.',
    '진행 중': '사업이 진행되고 있어요.'
  };
  var lineZ = 9, areaZ = 11, labelZ = 10;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fd(d) { if (!d) return ''; var a = String(d).split('-'); return a[0] + (a[1] ? '.' + (+a[1]) : '') + (a[2] ? '.' + (+a[2]) : ''); }
  function safeUrl(u) { return /^https:\/\//.test(String(u || '')) ? String(u) : ''; }
  function load(base) {
    var u = (base || JB.DATA + 'data/') + 'devmap.json';
    return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  /* 예정 연도: 자료에 공식 출처·날짜가 함께 있을 때만(자료 검사를 지나온 것도 한 번 더 확인) */
  function dues(it) {
    return (it && it.due || []).filter(function (d) { return d && d.say && d.src && d.src.official && safeUrl(d.src.url) && d.src.date && /20\d\d/.test(d.say); });
  }
  function shortName(it) {
    var n = String(it.short || it.name || '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    return n || it.name;
  }
  /* 지도 글자: '동북선 경전철 · 2027년 개통 목표' / 연도 없으면 '… · 공사 중' */
  function label(it) {
    var d = dues(it), last = d[d.length - 1];
    return { name: it.type === 'line' ? it.name : shortName(it), tail: last ? last.say : (it.stage || ''), year: !!last, approx: !!it.approx };
  }
  /* 보이는 확대 범위: 노선 9 이상(글자 10 이상), 사업 구역 11 이상, 정비구역 등 작은 구역은 자료의 zoom(15) 이상 */
  function show(it, z) {
    if (it.type === 'line') return { shape: z >= lineZ, text: z >= labelZ };
    var zz = it.zoom || areaZ;
    return { shape: z >= zz, text: z >= zz + (it.poly ? 1 : 0) };
  }
  function srcLine(s, o) {
    if (!s) return '';
    var u = safeUrl(s.url), t = esc(s.title || s.org || '');
    var when = s.date ? (s.checked ? ' · 날짜가 적히지 않은 공식 페이지라 ' + fd(s.date) + '에 확인한 내용' : '') : '';
    return '<small>출처: ' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + t + '</a>' : t) + esc(when) + '</small>';
  }
  function stageSrc(it) {
    var s = it.stage_src; if (!s) return '';
    if (s.official) return srcLine(s);
    return '<small>단계 근거: 언론 보도로 확인했어요(공식 원문은 아직 확인 중).</small>';
  }
  function cardHtml(it, o) {
    o = o || {};
    var d = dues(it), isLine = it.type === 'line';
    var meta = isLine ? '개통 예정 노선' : (it.kind || '개발사업');
    var h = '<div class="grab"></div><div class="hd"><h2>' + esc(it.name) + '</h2><button type="button" class="x" aria-label="닫기">×</button></div>'
      + '<p class="meta">' + esc(meta) + ' · ' + esc(it.stage || '') + '</p><dl class="kv">';
    h += '<dt>예정 시기</dt><dd>';
    if (d.length) h += d.map(function (x) { return '<b class="due">' + esc(x.say) + '</b>' + srcLine(x.src); }).join('');
    else h += '<span class="head">' + esc(it.due_note || '공식 발표에 적힌 예정 연도가 없어 연도는 표시하지 않아요.') + '</span>';
    h += '</dd><dt>지금 단계</dt><dd><span class="head"><b class="stg">' + esc(it.stage || '') + '</b>' + (it.stage_at ? ' <span class="ppy">' + esc(fd(it.stage_at)) + '</span>' : '') + '</span>'
      + '<small>' + esc(STAGE[it.stage] || '') + '</small>' + stageSrc(it) + '</dd>';
    var kp = KIND[isLine ? '노선' : it.kind] || '';
    if (kp) h += '<dt>쉬운 풀이</dt><dd><small class="plain">' + esc(kp) + '</small></dd>';
    if (isLine && it.stops) h += '<dt>지도 선</dt><dd><small>' + esc((it.part ? it.part + ' — ' : '') + it.stops.join(' · ')) + '. ' + esc(it.path_basis || '') + (it.skipped ? ' 개통 전 신설 정거장 ' + it.skipped + '곳은 위치를 표시하지 않았어요.' : '') + '</small>' + srcLine(it.path_src) + '</dd>';
    else if (it.poly) h += '<dt>구역 경계</dt><dd><small>공식 공간자료의 경계를 지도용으로 단순하게 줄여 그렸어요(약 100m 단위).</small>' + srcLine(it.poly_src) + '</dd>';
    else if (it.at && it.approx) h += '<dt>지도 위치</dt><dd><span class="head apx">' + esc(it.at_basis || '') + '</span>'
      + (it.approx_src || []).map(function (x) { return srcLine(x); }).join('')
      + (it.approx_data && safeUrl(it.approx_data.url) ? '<small>점 위치 계산: <a href="' + esc(it.approx_data.url) + '" target="_blank" rel="noopener noreferrer">' + esc(it.approx_data.title) + '</a></small>' : '') + '</dd>';
    else if (it.at) h += '<dt>지도 위치</dt><dd><small>' + esc(it.at_basis || '') + '</small></dd>';
    h += '</dl><p class="note chg">' + esc(CHANGE) + '</p>';
    if (!isLine && !it.poly) {
      var n = it.notice && safeUrl(it.notice.url);
      h += '<p class="note">' + (it.approx ? '' : esc(NOBOUND) + '. ') + (n ? '<a href="' + esc(n) + '" target="_blank" rel="noopener noreferrer">공식 고시·발표 보기 ›</a>' : '') + '</p>';
    }
    return h;
  }
  /* 지도에 선·구역을 그리지 못한 예정 사업 목록(공개할 수 있는 공식 위치·정거장 순서가 없어서) */
  function listHtml(dd, o) {
    var L = (dd && dd.omitted) || [];
    if (!L.length) return '';
    return '<ul class="fut-om">' + L.map(function (it) {
      var d = dues(it), last = d[d.length - 1];
      var n = it.notice && safeUrl(it.notice.url);
      return '<li><b>' + esc(it.name) + '</b> <span class="stg">' + esc(it.stage || '') + '</span>'
        + (last ? '<br><span class="due">' + esc(last.say) + '</span>' + srcLine(last.src) : (it.due_note ? '<small>' + esc(it.due_note) + '</small>' : ''))
        + '<small class="why">' + esc(it.why || '') + '</small>'
        + (n ? '<small><a href="' + esc(n) + '" target="_blank" rel="noopener noreferrer">공식 고시·발표 보기 ›</a></small>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  /* 범례 ⓘ: 표시 규칙 + 못 그린 목록 */
  function infoHtml(dd, o) {
    var om = (dd && dd.omitted) || [];
    return '<div class="grab"></div><div class="hd"><h2>개발·교통 예정 보는 법</h2><button type="button" class="x" aria-label="닫기">×</button></div>'
      + '<dl class="kv"><dt><i class="lg-line" aria-hidden="true"></i></dt><dd><small>점선은 개통 예정 노선이에요. 공식 자료에 적힌 정거장 순서대로, 이미 운행 중인 역만 이었어요. 아직 문을 열지 않은 신설역 위치는 표시하지 않아요.</small></dd>'
      + '<dt><i class="lg-area" aria-hidden="true"></i></dt><dd><small>칠한 면은 개발 구역이에요. 공식 공간자료에 있는 경계만 그렸어요.</small></dd>'
      + '<dt><i class="lg-dot" aria-hidden="true"></i></dt><dd><small>점은 공식 경계를 받지 못한 사업의 위치예요(가까운 역 등 공공 좌표). ' + esc(NOBOUND) + '.</small></dd>'
      + '<dt><i class="lg-dot ap" aria-hidden="true"></i></dt><dd><small>점선 동그라미는 대략 위치예요. 공식 발표에 읍·면·동만 나와 있어 그 읍·면·동 경계(통계청 행정구역)의 가운데에 찍었어요. 실제 사업 구역과 다를 수 있어요.</small></dd>'
      + '<dt>연도</dt><dd><small>글자에 적힌 예정 연도는 국토교통부·정부·지자체 공식 발표에 적힌 그대로예요. 공식 발표가 없으면 단계(계획·공사 중 등)만 적었어요. ' + esc(CHANGE) + '</small></dd></dl>'
      + (om.length ? '<h3 class="fut-h">지도에 못 그린 예정 사업 ' + om.length + '곳</h3><p class="note">공개할 수 있는 공식 위치나 공식 정거장 순서가 없어 지도에는 그리지 않았어요. 공식 발표에 적힌 연도는 그대로 적었어요.</p>' + listHtml(dd, o) : '')
      + (dd && dd.checked ? '<p class="note">기준일 ' + esc(fd(dd.checked)) + '(공식 원문을 마지막으로 확인한 날)</p>' : '');
  }
  /* 글자 자리 후보(화면 px, 기준점에서 띄우는 거리): 가운데 → 위 → 아래 → 오른쪽 → 왼쪽 */
  function spots(w, h) { return [[0, 0], [0, -(h + 8)], [0, h + 8], [w / 2 + 10, 0], [-(w / 2 + 10), 0]]; }
  /* 선 위 기준점: 꼭짓점과 구간 가운데(가운데 쪽부터) */
  function linePoints(path) {
    var P = [];
    for (var i = 0; i < path.length; i++) { P.push(path[i]); if (i + 1 < path.length) P.push([(path[i][0] + path[i + 1][0]) / 2, (path[i][1] + path[i + 1][1]) / 2]); }
    var m = (P.length - 1) / 2;
    return P.map(function (p, i) { return { p: p, k: Math.abs(i - m) }; }).sort(function (a, b) { return a.k - b.k; }).map(function (x) { return x.p; });
  }
  var API = { load: load, label: label, cardHtml: cardHtml, listHtml: listHtml, infoHtml: infoHtml, show: show, dues: dues, spots: spots, linePoints: linePoints,
    lineZ: lineZ, areaZ: areaZ, labelZ: labelZ, CHANGE: CHANGE, NOBOUND: NOBOUND, KIND: KIND, STAGE: STAGE, fd: fd };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_FUT = API;
})(typeof window !== 'undefined' ? window : globalThis);
