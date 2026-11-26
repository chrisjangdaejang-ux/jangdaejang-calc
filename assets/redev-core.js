/* 재개발·재건축 구역 지도(villa/zone/) — 글자·거르기·정렬·착공 예상 문장 (화면은 이 파일 함수만 부름 · node tools/redev-test.js 로 확인)
   자료: jangdaejang-data/data/redev/zones.json (엔진 scripts/redev_map.py — villa.py 끝에서 매일 만듦)
   - 단계 이력은 서울시 정비사업 추진현황(서울 열린데이터광장) 원자료 날짜 그대로. 이 파일은 날짜·숫자를 만들지 않고 자료 값만 글로 바꿔요.
   - 착공까지 기간: 과거 비슷한 구역(같은 유형·권역)의 기준 단계 → 착공 기간 분포(20%·50%·80% 지점, 자료 speed).
     구역별 예상 연도(sp.y)는 그 단계에서 이미 지난 기간을 넘긴 구역들만으로 계산한 값(엔진).
     과거 시점으로 거꾸로 맞혀 본 결과(hold)가 기준(판정 10건 이상·절반 이상·'모두 착공 안 함'보다 잘 맞힘)을 넘은 그룹만 sp.ok=1 → '맞힌 기록 있음', 나머지는 '참고'.
   - 이주 주변 전세(mv): 관리처분·이주 단계 구역 가까운 동의 1년 전세 보증금 변화(국토교통부 전월세 실거래, 같은 집·같은 평형). 원인은 말하지 않아요.
   window.JDJ_REDEV = { TYPES, COLOR, STAGES, SG, typeName, stageGroup, filter, sort, yrs, ym, speed, timeline, mv, nbHref, holdRows, regName } */
(function (root) {
  'use strict';
  var TYPES = { rd: '재개발', rb: '재건축', ct: '도시정비형 재개발', dd: '단독주택 재건축', nt: '1기 신도시 정비' };
  var COLOR = { rd: '#2560E8', rb: '#E8590C', ct: '#7C3AED', dd: '#0F9D58', nt: '#D6336C' };
  var STAGES = { 1: '신속통합기획 대상지 선정', 2: '신속통합기획 완료', 3: '정비구역 지정', 4: '추진위원회 승인', 5: '조합설립인가', 6: '건축심의',
    7: '사업시행인가', 8: '관리처분인가', 9: '이주', 10: '착공' };
  var SHORT = { 1: '대상지 선정', 2: '기획 완료', 3: '구역 지정', 4: '추진위', 5: '조합 설립', 6: '건축심의', 7: '사업시행', 8: '관리처분', 9: '이주', 10: '착공' };
  /* 진행 단계 거르기 묶음 */
  var SG = [['plan', '계획', [1, 2]], ['zone', '구역 지정·추진위', [3, 4]], ['union', '조합 설립·심의', [5, 6]], ['impl', '사업시행인가', [7]],
    ['mgmt', '관리처분·이주', [8, 9]], ['start', '착공', [10]]];
  var NT_SG = { '선도지구 선정': 'plan', '특별정비구역 지정': 'zone', '사업시행계획 인가': 'impl', '관리처분계획 인가': 'mgmt', '이주': 'mgmt', '착공': 'start' };
  /* 단계 쉬운 풀이 */
  var PLAIN = {
    1: '서울시가 빠르게 계획을 세워 주기로 고른 곳(신속통합기획)이에요. 아직 정식 구역은 아니에요.',
    2: '서울시와 함께 세운 계획안이 나온 단계예요. 정식 구역 지정이 이어져요.',
    3: '재개발·재건축을 하기로 정식으로 정한 구역이에요.',
    4: '집주인들이 조합을 만들려고 모인 준비 모임(추진위원회)이 승인된 단계예요.',
    5: '집주인들이 조합을 만들어 구청 허가를 받은 단계예요. 설계·인허가가 남아 있어요.',
    6: '무엇을 몇 층으로 지을지 건축 심의를 받은 단계예요.',
    7: '구청이 사업 계획(사업시행계획)을 허가한 단계예요. 이제 누가 어떤 집을 받을지 정해요.',
    8: '누가 어떤 집을 받고 얼마를 내는지(관리처분계획)가 허가된 단계예요. 곧 이사·철거가 시작돼요.',
    9: '주민이 이사를 나가고 철거를 앞둔 단계예요.',
    10: '공사를 시작한 단계예요.'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function typeName(z) { return TYPES[z.t] || '정비사업'; }
  function stageGroup(z) {
    if (z.t === 'nt') return NT_SG[z.sn] || 'plan';
    for (var i = 0; i < SG.length; i++) if (SG[i][2].indexOf(z.st) >= 0) return SG[i][0];
    return 'plan';
  }
  function ym(s) { s = String(s || ''); return /^\d{6}$/.test(s) ? s.slice(0, 4) + '년 ' + (+s.slice(4)) + '월' : ''; }
  /* 달 수 → '3.5년'(소수 첫째 자리, .0 은 뺌) */
  function yrs(m) { if (m == null || !isFinite(m)) return ''; var y = Math.round(m / 12 * 10) / 10; return (y % 1 ? y.toFixed(1) : String(y)) + '년'; }
  function regName(r) { return r ? '서울 ' + r : '서울 전체'; }
  function groupName(D, g) { return (D.groups && D.groups[g]) || g; }
  function started(z) { var h = z.h || []; for (var i = 0; i < h.length; i++) if (h[i][0] === 10) return h[i][1]; return null; }

  /* 거르기: o = {type: ''|코드|'sh', stage: ''|SG 코드, gu: ''|구코드, mv: bool(이주 주변 자료 있는 곳만), ok: bool(맞힌 기록 있는 예상만), q: 이름} */
  function filter(zs, o) {
    o = o || {};
    var q = String(o.q || '').replace(/\s/g, '');
    return (zs || []).filter(function (z) {
      if (o.type === 'sh') { if (!z.sh) return false; }
      else if (o.type && z.t !== o.type) return false;
      if (o.stage && stageGroup(z) !== o.stage) return false;
      if (o.gu && z.g !== o.gu) return false;
      if (o.mv && !(z.mv && z.mv.r && z.mv.r.length)) return false;
      if (o.ok && !(z.sp && z.sp.ok && z.sp.y)) return false;
      if (q && (z.n + (z.umd || '') + (z.gn || '')).replace(/\s/g, '').indexOf(q) < 0) return false;
      return true;
    });
  }
  /* 정렬: 'soon' 착공 예상 이른 순(예상 없는 곳은 뒤, 이미 착공한 곳은 맨 뒤) · 'stage' 단계 높은 순 · 'name' 이름순 */
  function sort(zs, how) {
    var a = (zs || []).slice();
    var key = function (z) {
      if (how === 'stage') return [-(z.st || 0), z.n];
      if (how === 'name') return [0, z.n];
      if (started(z)) return [9999, z.n];
      return [z.sp && z.sp.y ? z.sp.y[0] + (z.sp.y[1] - z.sp.y[0]) / 100 : 9000 - (z.st || 0), z.n];
    };
    return a.sort(function (x, y) { var p = key(x), q = key(y); return p[0] - q[0] || String(p[1]).localeCompare(String(q[1]), 'ko'); });
  }

  /* 착공까지: {state, head, base, mine, badge('ok'|'ref'|''), why} — 숫자는 모두 자료(speed·sp) 그대로 */
  function speed(z, D) {
    var c = started(z);
    if (z.t === 'nt') return { state: 'nt', head: '1기 신도시 정비는 2024년에 시작해 착공까지 간 과거 사례가 아직 없어요. 그래서 착공 시기는 예상하지 않았어요.', badge: '' };
    if (c) return { state: 'done', head: '이미 착공했어요(' + ym(c) + ').', badge: '' };
    if (z.x) return { state: 'chk', head: '이 구역은 원자료의 단계 날짜가 서로 맞지 않아 착공 시기를 예상하지 않았어요. 구청에 확인해 주세요.', badge: '' };
    var sp = z.sp, g = sp && D && D.speed ? D.speed[sp.k] : null;
    if (!sp || !g) {
      if (!z.st || z.st < 5) return { state: 'early', head: '조합설립인가 전이라 착공까지 기간을 셀 기준 날짜가 아직 없어요.', badge: '' };
      return { state: 'few', head: '비슷한 과거 구역 가운데 착공까지 간 곳이 적어 기간을 예상하지 않았어요.', badge: '' };
    }
    var from = STAGES[g.from], n = g.n + g.nc, who = groupName(D, g.typ) + ' · ' + regName(g.reg);
    var base;
    if (g.p20 != null && g.p80 != null) base = from + '부터 착공까지 보통 ' + yrs(g.p20) + '~' + yrs(g.p80) + '(과거 비슷한 구역 ' + n + '곳 기준, 중간값 ' + yrs(g.p50) + ')';
    else if (g.p50 != null) base = from + '부터 착공까지 중간값 ' + yrs(g.p50) + '(과거 비슷한 구역 ' + n + '곳 기준). 오래 걸린 곳은 자료 기간보다 길어 끝 범위는 알 수 없어요';
    else base = from + '부터 착공까지, 과거 비슷한 구역 ' + n + '곳 가운데 절반 넘게 아직 착공 전이라 보통 기간을 알 수 없어요';
    var mine = sp.y ? '이 구역은 ' + from + ' 뒤 ' + yrs(sp.el) + ' 지났어요. 비슷한 구역 흐름대로라면 착공은 ' + (sp.y[0] === sp.y[1] ? sp.y[0] + '년' : sp.y[0] + '~' + sp.y[1] + '년') + ' 무렵이에요.'
      /* 예상 연도가 없을 때: 실제로 보통 범위(80% 지점, 없으면 중간값)를 넘긴 구역만 '오래 걸리고 있어요'.
         그 밖(예: 은마 — 조합설립 뒤 2.8년, 중간값 10.5년)은 비교 사례가 모자란 것이라 그렇게 쓰지 않아요(2026-11-26 바로잡음) */
      : (function () { var lim = g.p80 != null ? g.p80 : g.p50;
          return lim != null && sp.el > lim ? '이 구역은 ' + from + ' 뒤 ' + yrs(sp.el) + ' 지나, 이미 비슷한 구역 대부분보다 오래 걸리고 있어요.'
            : '이 구역은 ' + from + ' 뒤 ' + yrs(sp.el) + ' 지났어요. 비교할 수 있는 과거 사례가 모자라 이 구역의 착공 시기는 따로 예상하지 않았어요.'; })();
    var h = D.hold && D.hold[g.from + '|' + (z.t === 'dd' ? 'rd' : z.t)];
    var why = sp.ok && h ? '과거 시점(' + (D.cuts || []).map(ym).join('·') + ')으로 돌아가 그때 자료만으로 맞혀 보니, 이 유형·단계는 ' + h.n + '번 중 ' + h.hit + '번 맞았어요(' + Math.round(h.rate * 100) + '%).'
      : h && h.n ? '과거 시점으로 돌아가 맞혀 보니 이 유형·단계는 ' + h.n + '번 중 ' + h.hit + '번 맞아, 아무것도 예상하지 않았을 때보다 낫지 않았어요. 참고로만 보세요.'
        : '이 유형·단계는 과거 시점으로 돌아가 맞혀 볼 사례가 모자라요. 참고로만 보세요.';
    return { state: 'est', head: base, mine: mine, badge: sp.ok && sp.y ? 'ok' : 'ref', why: why, who: who };
  }

  /* 단계 이력: [{lv, name, at, plain, est}] — 과거는 원자료 날짜, 예상 착공은 est=true(연도 범위) */
  function timeline(z, D) {
    var rows = [];
    if (z.t === 'nt') { (z.hn || []).forEach(function (h) { rows.push({ name: h[0], at: ym(h[1]) }); }); return rows; }
    (z.h || []).slice().sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[0] - b[0]; })
      .forEach(function (h) { rows.push({ lv: h[0], name: STAGES[h[0]] || '', at: ym(h[1]), plain: PLAIN[h[0]] || '' }); });
    var sp = z.sp;
    if (sp && sp.y && !started(z) && !z.x) rows.push({ lv: 10, name: '착공 예상', at: sp.y[0] === sp.y[1] ? sp.y[0] + '년' : sp.y[0] + '~' + sp.y[1] + '년', est: true, ok: !!sp.ok });
    return rows;
  }

  /* 이주 주변 동 전세: [{dong, line}] + note */
  function mv(z, D) {
    if (!z.mv) return null;
    var rows = (z.mv.r || []).map(function (r) {
      var p = [];
      if (r.a) p.push('아파트 ' + (r.a[0] > 0 ? '+' : '') + r.a[0] + '%(' + r.a[1] + '곳)');
      if (r.v) p.push('빌라 ' + (r.v[0] > 0 ? '+' : '') + r.v[0] + '%(' + r.v[1] + '곳)');
      var at = (r.a || r.v)[2];
      return { dong: r.d, gn: r.gn || '', km: r.km, line: p.join(' · '), at: ym(at), up: (r.a || r.v)[0] > 0, flat: (r.a || r.v)[0] === 0 };
    });
    var st = z.st === 9 ? '이주 단계' : '관리처분인가 단계';
    var head = '이 구역은 ' + st + '예요' + (z.old ? '(기존 ' + z.old.toLocaleString('ko-KR') + '가구, 서울시 정비사업 추진현황)' : '') + '. 이주가 시작되면 가까운 동에서 전셋집을 찾는 사람이 늘 수 있어서, 주변 동의 지금 전세 흐름을 모아 보여 드려요.';
    var none = rows.length ? '' : '반경 ' + D.near_km + 'km 안 ' + z.mv.n0 + '개 동 모두 같은 집 비교가 가능한 전세 계약이 적어(동마다 5곳 미만) 보여 드릴 숫자가 없어요.';
    return { head: head, rows: rows, none: none, note: '최근 1년 전세 보증금 변화 = 같은 단지(건물)·같은 평형의 최근 3개월 순수 전세 중간값을 1년 전과 비교한 값들의 중간값이에요(국토교통부 전월세 실거래). 주변 전세 흐름일 뿐, 이 구역 이주 때문이라고 볼 근거는 아니에요.' };
  }

  function nbHref(site, nb) { return site + 'mine/?sd=' + encodeURIComponent(nb.sd) + '&d=' + encodeURIComponent([nb.g, nb.d, nb.j, nb.n].join('|')) + '&b=' + encodeURIComponent(nb.b); }

  /* 과거로 돌아가 맞혀 본 결과 표: [{stage, typ, n, hit, rate, brate, ok, exp, act}] */
  function holdRows(D) {
    var out = [];
    Object.keys(D.hold || {}).sort().forEach(function (k) {
      var h = D.hold[k], p = k.split('|');
      out.push({ stage: STAGES[p[0]] || p[0], typ: groupName(D, p[1]), n: h.n, hit: h.hit, rate: h.rate, brate: h.brate, ok: !!h.ok, exp: h.exp, act: h.act });
    });
    return out;
  }

  var api = { TYPES: TYPES, COLOR: COLOR, STAGES: STAGES, SHORT: SHORT, SG: SG, PLAIN: PLAIN, esc: esc, typeName: typeName, stageGroup: stageGroup, filter: filter, sort: sort,
    yrs: yrs, ym: ym, speed: speed, timeline: timeline, mv: mv, nbHref: nbHref, holdRows: holdRows, regName: regName, started: started };
  root.JDJ_REDEV = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
