/* 집예보 '이 매물, 적당한 가격일까요?'(check/) 공용 계산 — 화면(check/index.html)·첫 화면 찾기 칸·중개사 카드·tools/check-test.js 가 같이 쓴다.
   ─────────────────────────────────────────────────────────────
   원칙
   - 붙여 넣은 매물 글은 이 기기 안에서만 읽어요(서버·통계로 보내지 않음). 금액은 주소(URL)에 절대 넣지 않아요.
     다른 화면에서 넘겨줄 때는 단지 키·평형·종류만 주소에, 금액·글은 sessionStorage(이 탭에만) 또는 # 뒤에만.
   - 숫자는 공개 실거래(국토교통부)에서 그대로 모은 값의 중간값·비율·순서뿐이에요. 점수·판정('투자가치 높음' 같은 말)은 만들지 않아요.
   - 금액 단위: 만원. 면적: ㎡(전용). 1평 = 3.3058㎡.
   window.JDJ_CHECK = { parse…, evaluate…, floorFactor…, prefillUrl…, seen… }  · node: module.exports 같은 것 */
(function (root) {
  'use strict';
  var PY = 3.3058;
  var SEEN_KEY = 'jdj_check_seen', SEEN_MAX = 30, HAND_KEY = 'jdj_check_in';
  var MIN_DEALS = 3;                 // 비교에 쓰는 최소 거래 수(이보다 적으면 기간·범위를 넓히고 그렇다고 적어요)

  /* ───────── 작은 도구 ───────── */
  function median(a) {
    var v = (a || []).filter(function (x) { return typeof x === 'number' && isFinite(x); }).sort(function (x, y) { return x - y; }), n = v.length;
    if (!n) return null; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  }
  function ymAdd(ym, k) { var s = String(ym), t = +s.slice(0, 4) * 12 + (+s.slice(4, 6) - 1) + k; return String(Math.floor(t / 12)) + String(t % 12 + 1).padStart(2, '0'); }
  function ymLabel(ym) { ym = String(ym || ''); return ym.length >= 6 ? ym.slice(0, 4) + '.' + ym.slice(4, 6) : ''; }
  /** 만원 → '12억 5,000만 원' */
  function won(man) {
    man = Math.round(+man || 0); var neg = man < 0; man = Math.abs(man);
    var e = Math.floor(man / 10000), r = man % 10000;
    var s = (e ? e.toLocaleString('ko-KR') + '억' : '') + (r ? (e ? ' ' : '') + r.toLocaleString('ko-KR') + '만' : '') + ' 원';
    return man ? (neg ? '-' : '') + s : '0원';
  }
  /** 만원 → 짧게 '12.5억' · '9,800만' (점 그림 눈금용) */
  function eok(man) { man = +man || 0; return man >= 10000 ? (Math.round(man / 1000) / 10).toString().replace(/\.0$/, '') + '억' : Math.round(man).toLocaleString('ko-KR') + '만'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pctText(r, d) { if (r == null || !isFinite(r)) return '-'; var v = Math.abs(r * 100); return (d == null ? Math.round(v) : v.toFixed(d)) + '%'; }

  /* ───────── 1) 매물 글 읽기 ───────── */
  /** 금액 글자 → 만원. '12억 5,000' 125000 · '12.5억' 125000 · '12억5천' 125000 · '9억8천500' 98500 · '3천만' 3000
      '8,500만원' 8500 · '1,250,000,000원' 125000 · 단위 없는 숫자: 1억 원(=1억)보다 크면 원, 아니면 만원으로 봐요. 못 읽으면 null */
  function toMan(s) {
    if (s == null) return null;
    var t = String(s).replace(/[,\s]/g, '').replace(/만원$|만$/, function (m) { return m; });
    if (!t) return null;
    var m;
    var restMan = function (r) {                         // 억 뒤의 나머지: '5000' '5000만' '5천' '5천500' '5천만'
      r = String(r || '').replace(/원$/, '').replace(/만$/, '');
      if (!r) return 0;
      var k = /^(\d+)천(\d*)$/.exec(r); if (k) return +k[1] * 1000 + (k[2] ? +k[2] : 0);
      if (/^\d+$/.test(r)) return +r;
      return NaN;
    };
    if ((m = /^(\d+(?:\.\d+)?)억(.*)$/.exec(t))) { var rest = restMan(m[2]); if (isNaN(rest)) return null; return Math.round(+m[1] * 10000 + rest); }
    if ((m = /^(\d+)천(\d*)만?원?$/.exec(t))) return +m[1] * 1000 + (m[2] ? +m[2] : 0);
    if ((m = /^(\d+(?:\.\d+)?)만원?$/.exec(t))) return Math.round(+m[1]);
    if ((m = /^(\d+)원$/.exec(t))) return Math.round(+m[1] / 10000);
    if ((m = /^(\d+(?:\.\d+)?)$/.exec(t))) { var v = +m[1]; return v >= 100000000 ? Math.round(v / 10000) : Math.round(v); }
    return null;
  }
  /* 금액 한 덩어리(정규식 조각) — 뒤에 ㎡·평·층·동·호가 붙은 숫자는 금액으로 보지 않아요 */
  var NUM = '\\d[\\d,]*(?![\\d,])';
  var NOT_UNIT = '(?!\\s*(?:㎡|m²|m2|평|층|동|호|년|%|세대|개|분|km|m\\b))';
  var MONEY = '(?:' + NUM + '(?:\\.\\d+)?\\s*억(?:\\s*' + NUM + NOT_UNIT + '(?:\\s*천(?:\\s*\\d+' + NOT_UNIT + ')?)?\\s*만?(?:\\s*원)?)?'
    + '|' + NUM + '\\s*천(?:\\s*\\d+' + NOT_UNIT + ')?\\s*만(?:\\s*원)?'
    + '|' + NUM + '(?:\\.\\d+)?\\s*만\\s*원?'
    + '|' + NUM + '\\s*원'
    + '|' + NUM + NOT_UNIT + ')';
  var RE_SALE = new RegExp('(?:매매(?:가|가격|금액)?|매도가|호가|희망가|가격|금액)\\s*[:：]?\\s*(' + MONEY + ')');
  var RE_JEON = new RegExp('전세(?:가|금|보증금)?\\s*[:：]?\\s*(' + MONEY + ')');
  var RE_WOL = new RegExp('(?:월세|반전세|보증부\\s*월세)\\s*[:：]?\\s*(' + MONEY + ')\\s*[/／]\\s*(' + MONEY + ')');
  var RE_WOL2 = new RegExp('보증금\\s*[:：]?\\s*(' + MONEY + ')[\\s,·]*(?:월세|월|차임)\\s*[:：]?\\s*(' + MONEY + ')');
  var RE_ANY = new RegExp('(' + NUM + '(?:\\.\\d+)?\\s*억(?:\\s*' + NUM + NOT_UNIT + '(?:\\s*천(?:\\s*\\d+' + NOT_UNIT + ')?)?\\s*만?(?:\\s*원)?)?|' + NUM + '\\s*천(?:\\s*\\d+' + NOT_UNIT + ')?\\s*만(?:\\s*원)?|' + NUM + '(?:\\.\\d+)?\\s*만\\s*원?|\\d{1,3}(?:,\\d{3}){2,}\\s*원|\\d{8,}\\s*원)');

  /** 가격 → { kind: 'sale'|'jeonse'|'wolse', price(매매·전세 만원), deposit·rent(월세 만원), raw } 또는 null */
  function parsePrice(text) {
    var t = String(text || ''), m;
    if ((m = RE_WOL.exec(t)) || (m = RE_WOL2.exec(t))) {
      var d = toMan(m[1]), r = toMan(m[2]);
      if (d != null && r != null) return { kind: 'wolse', deposit: d, rent: r, raw: m[0].trim() };
    }
    if ((m = RE_JEON.exec(t))) { var j = toMan(m[1]); if (j) return { kind: 'jeonse', price: j, raw: m[0].trim() }; }
    if ((m = RE_SALE.exec(t))) { var p = toMan(m[1]); if (p) return { kind: 'sale', price: p, raw: m[0].trim() }; }
    if ((m = RE_ANY.exec(t))) { var q = toMan(m[1]); if (q) return { kind: /월세/.test(t) ? 'wolse' : 'sale', price: q, raw: m[0].trim(), guess: true }; }
    return null;
  }

  /** 면적 → { excl(전용㎡), supply(공급㎡), py(평 숫자 그대로), basis: 'excl'|'supply'|'py-supply'|'py-excl'|'bare' } 또는 null
      '전용 84.97㎡' · '공급 112㎡' · '112.4/84.97㎡'(큰 값 공급·작은 값 전용) · '34평'(평형 = 보통 공급 기준) · '전용 25.7평' */
  var U = '(㎡|m²|m2|평)';
  function parseArea(text) {
    var t = String(text || '').replace(/제곱미터/g, '㎡'), out = {}, m;
    var toM2 = function (v, u) { v = +v; return u === '평' ? Math.round(v * PY * 100) / 100 : v; };
    /* '112.4/84.97㎡'·'공급/전용 112.4/84.97㎡' 처럼 두 숫자를 / 로 붙인 꼴을 먼저(큰 값 공급·작은 값 전용) */
    if ((m = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:㎡|m²|m2)?\\s*[/／]\\s*(\\d+(?:\\.\\d+)?)\\s*' + U).exec(t))) {
      var a = toM2(m[1], m[3]), b = toM2(m[2], m[3]), hi = Math.max(a, b), lo = Math.min(a, b);
      if (lo > 0 && hi / lo >= 1.02 && hi / lo <= 2.2) { out.excl = lo; out.supply = hi; out.basis = m[3] === '평' ? 'py-excl' : 'excl'; }
    }
    if (!out.excl && (m = new RegExp('전용(?:면적)?\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)(?![\\d.]*\\s*[/／])\\s*' + U + '?').exec(t))) { out.excl = toM2(m[1], m[2] || '㎡'); out.basis = m[2] === '평' ? 'py-excl' : 'excl'; }
    if (!out.supply && (m = new RegExp('공급(?:면적)?\\s*[:：]?\\s*(\\d+(?:\\.\\d+)?)(?![\\d.]*\\s*[/／])\\s*' + U + '?').exec(t))) { out.supply = toM2(m[1], m[2] || '㎡'); if (!out.basis) out.basis = 'supply'; }
    if (!out.excl && !out.supply && (m = /(\d+(?:\.\d+)?)\s*평(?:형)?/.exec(t))) { out.py = +m[1]; out.supply = toM2(m[1], '평'); out.basis = 'py-supply'; }
    if (!out.excl && !out.supply && (m = /(\d+(?:\.\d+)?)\s*(?:㎡|m²|m2)/.exec(t))) { out.excl = +m[1]; out.basis = 'bare'; }
    if (!out.excl && !out.supply) return null;
    if (out.excl && !(out.excl > 5 && out.excl < 2000)) return null;
    return out;
  }

  /** 층 → { floor, total, word: '저'|'중'|'고' } 또는 null.  '12층' · '12/25층' · '12층/25층' · '고/25층' · '저층' */
  function parseFloor(text) {
    var t = String(text || ''), m;
    if ((m = /(\d{1,3})\s*층?\s*[/／]\s*(\d{1,3})\s*층/.exec(t))) { var f = +m[1], n = +m[2]; if (f >= 1 && f <= n) return { floor: f, total: n }; }
    if ((m = /(저|중|고)\s*층?\s*[/／]\s*(\d{1,3})\s*층/.exec(t))) return { word: m[1], total: +m[2] };
    if ((m = /(?:해당\s*층|층수)\s*[:：]?\s*(\d{1,3})/.exec(t))) return { floor: +m[1] };
    if ((m = /(?:^|[^\d])(\d{1,3})\s*층(?!\s*(?:건물|짜리))/.exec(t))) return { floor: +m[1] };
    if ((m = /(저|중|고)층/.exec(t))) return { word: m[1] };
    return null;
  }

  /** 매물 종류 짐작: apt(아파트) · offi(오피스텔) · villa(빌라) · comm(상가·건물) · land(토지) */
  function guessType(text) {
    var t = String(text || '');
    if (/오피스텔/.test(t)) return 'offi';
    if (/토지|임야|지목|농지|대지\s*\d|(?:^|\s)(?:전|답)\s*\d/.test(t) && !/아파트/.test(t)) return 'land';
    if (/상가|점포|사무실|근린|꼬마\s*빌딩|통\s*건물|빌딩|구분\s*상가/.test(t)) return 'comm';
    if (/빌라|다세대|연립|도시형/.test(t)) return 'villa';
    return 'apt';
  }

  /* 단지 이름이 아닌 낱말(매물 글에 흔한 말) */
  var STOP = ['매매', '전세', '월세', '반전세', '보증금', '전용', '공급', '면적', '계약', '층', '저층', '중층', '고층', '해당층', '방', '욕실', '화장실', '남향', '남동향', '남서향', '동향', '서향', '북향',
    '확장', '올수리', '수리', '리모델링', '급매', '급급매', '초급매', '입주', '즉시입주', '입주가능', '협의', '가능', '융자', '융자없음', '대출', '주차', '관리비', '엘리베이터', '역세권', '학군', '초품아',
    '매물', '가격', '호가', '희망가', '금액', '만원', '억', '아파트', '단지', '동', '호', '세대', '거실', '주방', '베란다', '발코니', '시스템', '에어컨', '옵션', '풀옵션', '인테리어', '조망', '뷰', '한강뷰',
    '네고', '문의', '연락', '주세요', '드립니다', '있음', '없음', '좋음', '깨끗', '깔끔', '신축', '구축', '준공', '사용승인', '년식', '현관', '구조', '판상형', '타워형', '복도식', '계단식', '중개', '부동산',
    '공인중개사', '사무소', '전화', '세안고', '세안고매매', '갭', '갭투자', '전세끼고', '실입주', '실거주', '투자', '추천', '최저가', '로얄층', '로열층', '탑층', '꼭대기', '1층', '정보', '상세', '설명', '특징'];
  var STOP_RE = /^(?:\d+(?:동|호|층|평|평형|세대|개|년|년식|대|㎡|m²|m2|억|만|원|만원|천)?|[A-Za-z]?\d+[A-Za-z]?(?:동|호)|\d+(?:\.\d+)?|방\d|욕실\d|화\d)$/;
  /** 단지 이름 후보 글자(+ 동 이름) — 이 글자로 우리 단지 목록에서 찾아요(assets/ask.js). 주소 낱말(시·구·동)은 따로 */
  function nameHint(text) {
    var t = String(text || '').replace(/\r/g, '\n');
    var m, label = /(?:단지\s*명?|아파트\s*명|건물\s*명|매물\s*명)\s*[:：]\s*([^\n,/|]+)/.exec(t);
    var dong = '', sgg = '';
    var all = t.replace(/https?:\/\/\S+/g, ' ').replace(new RegExp(MONEY, 'g'), ' ').replace(/[\[\]{}()<>"'“”‘’!?~·•★☆※#@*=+_|\\]/g, ' ').replace(/[,:：/／]/g, ' ');
    var toks = all.split(/\s+/).filter(Boolean);
    var keep = [];
    for (var i = 0; i < toks.length; i++) {
      var w = toks[i].replace(/^[.\-]+|[.\-]+$/g, '');
      if (!w || w.length < 2 && !/^\d+차$/.test(w)) continue;
      if (/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(특별시|광역시|특별자치시|특별자치도|도)?$/.test(w)) continue;
      if (/^[가-힣]{1,5}(시|군|구)$/.test(w) && !/아파트|단지/.test(w)) { if (/구$/.test(w)) sgg = sgg || w; continue; }
      if (/^[가-힣]{1,5}\d?(동|가|읍|면|리)$/.test(w) && !/^\d/.test(w) && w.length <= 6 && !/단지|타운|마을|빌$/.test(w)) { if (/동$/.test(w)) dong = dong || w; continue; }
      if (STOP.indexOf(w) >= 0 || STOP_RE.test(w)) continue;
      if (/[㎡]|m²|m2/.test(w) || /^\d+(\.\d+)?(평|층)/.test(w)) continue;
      if (!/[가-힣A-Za-z]/.test(w)) continue;
      keep.push(w);
    }
    var name = label ? label[1].trim() : keep.slice(0, 3).join(' ');
    return { name: name.replace(/\s+/g, ' ').trim().slice(0, 40), dong: dong, sgg: sgg };
  }

  /** 붙여 넣은 글 한 번에 → { type, price, area, floor, name, dong, sgg, ok(무엇이든 읽었는지) } */
  function parseListing(text) {
    var t = String(text || '').slice(0, 4000);
    var price = parsePrice(t), area = parseArea(t), floor = parseFloor(t), nh = nameHint(t);
    return { type: guessType(t), price: price, area: area, floor: floor, name: nh.name, dong: nh.dong, sgg: nh.sgg, ok: !!(price || area || floor || nh.name) };
  }
  /** 첫 화면 찾기 칸: 매물 글처럼 보이나(가격 + 면적·층·매매/전세 같은 말 중 하나 이상) */
  function looksLikeListing(text) {
    var t = String(text || ''); if (t.replace(/\s/g, '').length < 6) return false;
    var p = parsePrice(t); if (!p || p.guess && !/억|만\s*원?/.test(p.raw)) return false;
    var hints = 0;
    if (parseArea(t)) hints++;
    if (parseFloor(t)) hints++;
    if (/매매|전세|월세|호가|매물|급매|보증금/.test(t)) hints++;
    return hints >= 1;
  }

  /* ───────── 2) 실거래 비교 ───────── */
  /** 개별 거래 행(공개 자료 모양) → 공통 모양 {d: YYYYMMDD, ym, area, floor, amt, direct}
      fmt 'apt' price/{구}.json u[11] = [계약일, 전용, 층, 금액, 유형(1 직거래), 신고가]
          'offi' offi/{구}.json t      = [계약일, 전용, 층, 금액, 유형, 신고가]
          'villa' villa/{구}.json tr    = ['계약일', 금액, 전용, 대지권, '층'] */
  function normTrades(rows, fmt) {
    return (rows || []).map(function (r) {
      if (!Array.isArray(r)) return null;
      var o = fmt === 'villa' ? { d: String(r[0]), amt: +r[1], area: +r[2], floor: parseInt(r[4], 10) || null, direct: false }
        : { d: String(r[0]), area: +r[1], floor: r[2] == null ? null : +r[2], amt: +r[3], direct: r[4] === 1 };
      o.ym = o.d.slice(0, 6);
      return o.amt > 0 && o.area > 0 && /^\d{6}/.test(o.d) ? o : null;
    }).filter(Boolean);
  }
  function within(ts, from, to) { return ts.filter(function (t) { return !t.direct && t.ym >= from && t.ym <= to; }); }

  /** 층 보정 — 우리 공개 실거래로만 구해요(따로 정한 % 없음).
      방법: ① 같은 단지·같은 평형의 최근 3년 거래(직거래 제외)마다 ㎡당 가격을 그 거래 앞뒤 2개월(5개월 창) 같은 평형 거래의 ㎡당 중간값으로 나눠
              '그 시기 보통 값 대비 몇 배'(rel)를 구해요(창 안 거래가 3건 미만이면 그 거래는 빼요 — 시기 차이를 지우기 위해).
            ② 층을 세 무리로 나눠요: 저층 = 1~3층, 고층 = 이 평형에서 거래된 가장 높은 층의 3분의 2 이상(가장 높은 층이 9층 이상일 때만), 그 밖 = 중층.
            ③ 보정 배수 = (그 층 무리 rel 의 중간값) ÷ (전체 rel 의 중간값).
            ④ 쓸 수 있는 거래가 15건 미만이거나 그 층 무리 거래가 5건 미만이면 보정하지 않고 '자료가 적어 층 보정을 하지 않았어요'라고 알려요.
      floor: 매물 층(숫자) 또는 word '저'·'중'·'고'. 반환 { ok, factor, group, n(그 층 무리 수), nAll, maxFloor, reason } */
  var FLOOR_MIN_ALL = 15, FLOOR_MIN_GROUP = 5;
  function floorGroup(floor, word, maxFloor) {
    if (word) return word === '저' ? 'low' : word === '고' ? (maxFloor >= 9 ? 'high' : 'mid') : 'mid';
    if (!(floor >= 1)) return '';
    if (floor <= 3) return 'low';
    if (maxFloor >= 9 && floor >= Math.ceil(maxFloor * 2 / 3)) return 'high';
    return 'mid';
  }
  var GROUP_KO = { low: '저층(1~3층)', mid: '중층', high: '고층' };
  function floorFactor(trades, fl) {
    fl = fl || {};
    var ts = (trades || []).filter(function (t) { return !t.direct && t.floor >= 1; });
    var maxFloor = ts.reduce(function (m, t) { return Math.max(m, t.floor); }, 0);
    var group = floorGroup(fl.floor, fl.word, maxFloor);
    var base = { ok: false, factor: 1, group: group, groupKo: GROUP_KO[group] || '', n: 0, nAll: 0, maxFloor: maxFloor };
    if (!group) return Object.assign(base, { reason: 'nofloor' });
    var rels = [];
    ts.forEach(function (t) {
      var win = ts.filter(function (x) { return x.ym >= ymAdd(t.ym, -2) && x.ym <= ymAdd(t.ym, 2); });
      if (win.length < 3) return;
      var ref = median(win.map(function (x) { return x.amt / x.area; }));
      if (ref > 0) rels.push({ g: floorGroup(t.floor, '', maxFloor), r: (t.amt / t.area) / ref });
    });
    var mine = rels.filter(function (x) { return x.g === group; });
    base.nAll = rels.length; base.n = mine.length;
    if (rels.length < FLOOR_MIN_ALL || mine.length < FLOOR_MIN_GROUP) return Object.assign(base, { reason: 'thin' });
    var f = median(mine.map(function (x) { return x.r; })) / median(rels.map(function (x) { return x.r; }));
    return Object.assign(base, { ok: true, factor: Math.round(f * 1000) / 1000, reason: '' });
  }

  /** 매물 가격을 최근 실거래와 비교.
      o = { trades(normTrades 결과), to(자료 마지막 달 YYYYMM), area(매물 전용㎡), price(매물 만원), floor:{floor,word}, floorTrades(층 보정용 3년 거래, 없으면 trades) }
      기간: 최근 6개월(자료 마지막 달 포함) → 거래가 3건 미만이면 12개월로 넓혀요(넓혔다고 적음). o.spans 로 바꿀 수 있어요(빌라 [6, 12, 36]).
      기준 값 = 그 기간 ㎡당 중간값 × 매물 전용 × 층 보정 배수. 반환 null(거래 없음) 또는
      { n, from, to, months, ppm, base, diff(매물 ÷ 기준 − 1), ff(층 보정), pts([{amt(매물 면적 환산), d, floor}]), rank, lo, hi, widened } */
  function evaluate(o) {
    var ts = o.trades || [], to = String(o.to || ''), area = +o.area || 0, price = +o.price || 0;
    if (!to || !(area > 0)) return null;
    var spans = o.spans || [6, 12], span = 0, use = [];
    for (var i = 0; i < spans.length; i++) { span = spans[i]; use = within(ts, ymAdd(to, -(span - 1)), to); if (use.length >= MIN_DEALS) break; }
    if (!use.length) return null;
    var ppm = median(use.map(function (t) { return t.amt / t.area; }));
    var ff = floorFactor(o.floorTrades || ts, o.floor);
    var base = Math.round(ppm * area * (ff.ok ? ff.factor : 1));
    var pts = use.map(function (t) { return { amt: Math.round(t.amt / t.area * area), d: t.d, floor: t.floor }; }).sort(function (a, b) { return a.amt - b.amt; });
    var r = { n: use.length, from: ymAdd(to, -(span - 1)), to: to, months: span, ppm: ppm, base: base, ff: ff, pts: pts,
      lo: pts[0].amt, hi: pts[pts.length - 1].amt, widened: span > 6, few: use.length < MIN_DEALS };
    if (price > 0) {
      r.diff = price / base - 1;
      r.rank = pts.filter(function (p) { return p.amt < price; }).length;   // 매물보다 싼 거래 수
    }
    return r;
  }
  /** 비교 문장: '최근 거래보다 약 5% 낮은 편이에요' (차이가 2% 안이면 '비슷한 편') */
  function diffWord(diff, ref) {
    if (diff == null || !isFinite(diff)) return { dir: '', text: '' };
    ref = ref || '최근 거래';
    var p = Math.round(Math.abs(diff) * 100), jo = /[가-힣]$/.test(ref) && (ref.charCodeAt(ref.length - 1) - 0xAC00) % 28 ? '과' : '와';
    if (Math.abs(diff) < 0.02) return { dir: 'same', pct: p, text: ref + jo + ' 비슷한 편이에요' };
    return { dir: diff < 0 ? 'low' : 'high', pct: p, text: ref + '보다 약 ' + p + '% ' + (diff < 0 ? '낮은' : '높은') + ' 편이에요' };
  }
  /** 점 그림 위치 문장: '6건 중 싼 쪽에서 3번째 자리' */
  function rankText(r, price) {
    if (!r || !r.pts || !r.pts.length || !(price > 0)) return '';
    var n = r.pts.length, below = r.rank;
    if (price < r.lo) return n + '건 거래보다 모두 낮아요';
    if (price > r.hi) return n + '건 거래보다 모두 높아요';
    return n + '건 중 싼 쪽에서 ' + (below + 1) + '번째 자리예요';
  }

  /** 거래가 적을 때 넓히기: 같은 단지의 비슷한 평형(전용 차이 15% 안) 거래를 ㎡당으로 합쳐요 */
  function similarBands(units, me, pick) {
    var a = +me[4] || 0;
    return (units || []).filter(function (u) { return u !== me && u[0] === me[0] && u[1] === me[1] && u[2] === me[2] && u[8] === me[8] && a > 0 && Math.abs((+u[4] || 0) / a - 1) <= 0.15; })
      .reduce(function (s, u) { return s.concat(pick(u)); }, []);
  }
  /** 같은 동 비슷한 평형 단지들 ㎡당 비교(최근 12개월, 단지마다 거래 2건 이상) → [{apt, n, ppm, me}] ㎡당 낮은 순 */
  function peers(units, me, to, pick) {
    var from = ymAdd(to, -11), out = [], seen = {};
    (units || []).forEach(function (u) {
      if (u[0] !== me[0] || u[1] !== me[1] || u[3] !== me[3]) return;
      var k = [u[2], u[8]].join('|'); if (seen[k]) return;
      var ts = within(pick(u), from, to); if (ts.length < 2) return;
      seen[k] = 1;
      out.push({ apt: u[2], n: ts.length, ppm: median(ts.map(function (t) { return t.amt / t.area; })), me: u === me || (u[2] === me[2] && u[8] === me[8]) });
    });
    return out.sort(function (a, b) { return a.ppm - b.ppm; });
  }

  /** 전세 끼고 사기: 필요한 현금 = 매물 가격 − 전세 보증금(시세). 전세가율 = 전세 ÷ 매물 가격. 세금·중개보수·이사 비용은 따로 */
  function gapCash(price, jeonse) {
    if (!(price > 0) || !(jeonse > 0)) return null;
    return { cash: Math.max(0, price - jeonse), ratio: jeonse / price };
  }
  /** 대출 한도 어림(소득·DSR 빼고 LTV·가격대별 최대 금액만): R = assets/loan-rules.js, g = 'reg'|'capfree'|'local', own = 'none'|'first'
      반환 { ltv, cap, max, by: 'ltv'|'cap' } */
  function loanHint(price, R, g, own) {
    if (!R || !(price > 0)) return null;
    var ltv = R.ltvOf ? R.ltvOf(g, own) : null; if (ltv == null) return null;
    var cap = R.capOf ? R.capOf(price, g) : Infinity, byLtv = Math.floor(price * ltv);
    var max = Math.min(byLtv, cap);
    return { ltv: ltv, cap: cap, max: max, by: byLtv <= cap ? 'ltv' : 'cap' };
  }
  /** 월세 수익률(1년 월세 ÷ (매물 가격 − 보증금)) */
  function yieldOf(price, deposit, rent) {
    price = +price || 0; deposit = +deposit || 0; rent = +rent || 0;
    if (!(price > deposit) || !(rent > 0)) return null;
    return rent * 12 / (price - deposit);
  }
  /** 상가·건물 거래 줄(comm 공개 자료 tr) → 같은 동·같은 종류 최근 12개월 ㎡당 중간값. 지번은 쓰지도 돌려주지도 않아요.
      rows: [계약일, 동, 지번, 용도, 용도지역, 건물면적, 대지면적, 층, 금액, 표시], kind 'c'(집합: 건물면적) | 'g'(통건물: 대지면적) */
  function commStat(rows, dong, kind, to) {
    var from = ymAdd(to, -11), ps = [];
    (rows || []).forEach(function (t) {
      if (!Array.isArray(t) || (dong && t[1] !== dong)) return;
      var ym = String(t[0]).slice(0, 6); if (ym < from || ym > to) return;
      if (t[9] & 1 || t[9] & 2) return;                  // 직거래·지분 거래 빼기
      var a = kind === 'g' ? +t[6] : +t[5]; if (!(a > 0) || !(t[8] > 0)) return;
      ps.push(t[8] / a);
    });
    if (!ps.length) return null;
    ps.sort(function (a, b) { return a - b; });
    return { n: ps.length, ppm: median(ps), lo: ps[0], hi: ps[ps.length - 1], from: from, to: to, pts: ps };
  }

  /* ───────── 3) 주소·넘겨주기(금액은 주소에 넣지 않음) ───────── */
  var URL_KEYS = ['sd', 'd', 'b', 't', 'g', 'dn', 'mode', 'src'];
  /** 다른 화면 → check/ 주소. 단지 키(sd·d)·평형(b)·종류(t)·구(g)·동(dn)·모드만 — 금액·글은 받지 않아요 */
  function prefillUrl(site, o) {
    var q = [];
    URL_KEYS.forEach(function (k) {
      var v = o && o[k]; if (v == null || v === '') return;
      v = String(v).slice(0, 80);
      if (hasAmount(v)) return;                          // 금액처럼 보이는 값은 버림
      q.push(k + '=' + encodeURIComponent(v));
    });
    return String(site || '') + 'check/' + (q.length ? '?' + q.join('&') : '');
  }
  /** 금액이 들어 있나: '억'·'만원'·'원' 금액, 4자리 넘는 숫자 덩어리(평형 '84㎡대'·구 코드 5자리·지번은 예외로 봄) */
  function hasAmount(s) {
    s = String(s || '');
    try { s = decodeURIComponent(s); } catch (e) {}
    if (/\d\s*억|\d\s*만\s*원?|\d\s*천\s*만|\d[\d,]*\s*원(?![가-힣])/.test(s)) return true;
    if (/(?:^|[?&#])(?:p|price|amt|v|won|dep|deposit|rent|want|text|title|q)=/i.test(s)) return true;
    return false;
  }
  /** 공유하기(share_target)로 받은 값 읽기 → { text, clean(주소에서 title·text·url 을 뺀 경로) } */
  function readShare(search, path, hash) {
    var p; try { p = new URLSearchParams(search || ''); } catch (e) { return { text: '', clean: null }; }
    var parts = ['title', 'text', 'url'].map(function (k) { return p.get(k) || ''; }).filter(Boolean);
    if (!parts.length) return { text: '', clean: null };
    ['title', 'text', 'url'].forEach(function (k) { p.delete(k); });
    var rest = p.toString();
    return { text: parts.join('\n').slice(0, 4000), clean: (path || '') + (rest ? '?' + rest : '') + (hash || '') };
  }
  /** 같은 탭 안에서 글·금액 넘겨주기(sessionStorage) */
  function stash(ss, o) { try { ss.setItem(HAND_KEY, JSON.stringify({ t: String(o && o.text || '').slice(0, 4000), at: Date.now() })); return true; } catch (e) { return false; } }
  function take(ss) {
    try { var v = ss.getItem(HAND_KEY); ss.removeItem(HAND_KEY); if (!v) return ''; var o = JSON.parse(v); return o && Date.now() - (+o.at || 0) < 30 * 60000 ? String(o.t || '') : ''; } catch (e) { return ''; }
  }

  /* ───────── 4) 내가 본 매물(이 기기 localStorage 에만) ───────── */
  var SAFE = function (s, n) { return String(s == null ? '' : s).replace(/[<>"'&\n\r]/g, '').slice(0, n || 40); };
  function cleanSeen(x) {
    if (!x || typeof x !== 'object') return null;
    var o = { id: SAFE(x.id, 120), t: /^(apt|offi|villa|comm|land)$/.test(x.t) ? x.t : 'apt', at: +x.at || 0, apt: SAFE(x.apt), band: SAFE(x.band, 16), dong: SAFE(x.dong, 20),
      sd: /^s\d\d$/.test(x.sd) ? x.sd : '', g: /^\d{5}$/.test(x.g) ? x.g : '', d: SAFE(x.d, 120), b: SAFE(x.b, 16), kind: /^(sale|jeonse|wolse)$/.test(x.kind) ? x.kind : 'sale',
      price: +x.price > 0 ? Math.round(+x.price) : 0, deposit: +x.deposit > 0 ? Math.round(+x.deposit) : 0, rent: +x.rent > 0 ? Math.round(+x.rent) : 0,
      area: +x.area > 0 ? Math.round(+x.area * 100) / 100 : 0, floor: +x.floor > 0 ? Math.round(+x.floor) : 0, diff: isFinite(+x.diff) && x.diff !== null && x.diff !== '' ? Math.round(+x.diff * 1000) / 1000 : null,
      want: +x.want > 0 ? Math.round(+x.want) : 0 };
    if (!o.id) return null;
    return o;
  }
  /* 같은 매물인지 보는 표시(금액 포함) — 이 기기 안에서 겹침을 막는 데만 쓰고 주소·화면 어디에도 내보내지 않아요 */
  function seenSig(x) { return [x.t || 'apt', x.d || x.apt || '', x.b || x.band || '', x.kind || 'sale', Math.round(+x.price || +x.deposit || 0), Math.round(+x.rent || 0), x.floor || ''].join('~'); }
  function seenParse(s) { try { var a = JSON.parse(s || '[]'); return Array.isArray(a) ? a.map(cleanSeen).filter(Boolean).slice(0, SEEN_MAX) : []; } catch (e) { return []; } }
  /** 목록 칸 id: 금액이 들어가지 않는 짧은 값(시각 + 난수) */
  function seenId() { return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function seenAdd(list, x) {
    var sig = seenSig(x), old = (list || []).filter(function (y) { return seenSig(y) === sig; })[0];
    var o = cleanSeen(Object.assign({}, old || {}, x, { id: (old && old.id) || x.id || seenId(), at: Date.now(), want: x.want || (old && old.want) || 0 })); if (!o) return list || [];
    return [o].concat((list || []).filter(function (y) { return y.id !== o.id && seenSig(y) !== sig; })).slice(0, SEEN_MAX);
  }
  function seenSet(list, id, patch) { return (list || []).map(function (y) { return y.id === id ? cleanSeen(Object.assign({}, y, patch)) || y : y; }); }
  var TYPE_KO = { apt: '아파트', offi: '오피스텔', villa: '빌라', comm: '상가·건물', land: '토지' };
  /** '내가 본 매물' 목록 HTML — 열기 단추(data-seen-open)·지우기 단추(data-seen-del). 금액은 화면에만, 링크 주소에는 넣지 않아요 */
  function seenHtml(list) {
    if (!list || !list.length) return '<p class="cks-none">아직 평가한 매물이 없어요. 매물을 평가하면 이 기기에 자동으로 모여요.</p>';
    return '<ul class="cks-list">' + list.map(function (x) {
      var dw = x.diff != null ? diffWord(x.diff) : null, dt = new Date(x.at || 0);
      var when = x.at ? (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일' : '';
      var sub = [TYPE_KO[x.t] || '', x.band || (x.area ? x.area + '㎡' : ''), x.floor ? x.floor + '층' : '', when].filter(Boolean).join(' · ');
      return '<li><button type="button" class="cks-open" data-seen-open="' + esc(x.id) + '"><b>' + esc(x.apt || x.dong || '이름 없는 매물') + '</b><span class="cks-p">' + esc(priceLine(x)) + '</span>'
        + (dw && dw.text ? '<span class="cks-d cks-' + dw.dir + '">' + esc(dw.text.replace(/이에요$/, '')) + '</span>' : '')
        + (x.want ? '<span class="cks-w">원하는 가격 ' + esc(won(x.want)) + '</span>' : '')
        + '<small>' + esc(sub) + '</small></button>'
        + '<button type="button" class="cks-del" data-seen-del="' + esc(x.id) + '" aria-label="' + esc((x.apt || '이 매물') + ' 지우기') + '">지우기</button></li>';
    }).join('') + '</ul>';
  }
  var SEEN_CSS = '.cks-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.cks-list li{display:flex;gap:6px;align-items:stretch;border:1px solid #E5E8EB;border-radius:14px;background:#fff}'
    + '.cks-open{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;font:inherit;background:none;border:0;padding:10px 12px;cursor:pointer;color:#191F28;min-height:56px}'
    + '.cks-open b{font-size:15.5px}.cks-p{font-size:14.5px;font-weight:700}.cks-d{font-size:13px;font-weight:700;color:#4E5968}.cks-d.cks-low{color:#1D63D8}.cks-d.cks-high{color:#CC2536}'
    + '.cks-w{font-size:12.5px;color:#8A6D1E;font-weight:700}.cks-open small{font-size:12.5px;color:#4E5968}'
    + '.cks-del{flex:none;font:inherit;font-size:13.5px;font-weight:700;color:#4E5968;background:#F2F4F6;border:0;border-radius:0 13px 13px 0;padding:0 12px;min-width:64px;min-height:44px;cursor:pointer}.cks-none{font-size:14px;color:#4E5968;margin:0}';
  var OPEN_KEY = 'jdj_check_open';
  /** 목록 단추 연결(check/·내 집 시세 공용): 열기 = 이 탭 sessionStorage 에 id 만 두고 check/ 로(주소에는 단지 키·평형·종류만) */
  function seenWire(box, site, ls, ss, onChange) {
    if (!box || box._ckw) return; box._ckw = 1;
    box.addEventListener('click', function (e) {
      var del = e.target.closest && e.target.closest('[data-seen-del]'), op = e.target.closest && e.target.closest('[data-seen-open]');
      if (del) { var list = seenDel(seenLoad(ls), del.getAttribute('data-seen-del')); seenSave(ls, list); if (onChange) onChange(list); return; }
      if (op) {
        var id = op.getAttribute('data-seen-open'), x = seenLoad(ls).filter(function (y) { return y.id === id; })[0]; if (!x) return;
        try { ss.setItem(OPEN_KEY, id); } catch (er) {}
        root.location.href = prefillUrl(site, { t: x.t, sd: x.sd, d: x.d, b: x.b, g: x.t === 'apt' ? '' : x.g });
      }
    });
  }
  function takeOpen(ss) { try { var v = ss.getItem(OPEN_KEY); ss.removeItem(OPEN_KEY); return v || ''; } catch (e) { return ''; } }
  function seenDel(list, id) { return (list || []).filter(function (y) { return y.id !== id; }); }
  function seenLoad(ls) { try { return seenParse(ls.getItem(SEEN_KEY)); } catch (e) { return []; } }
  function seenSave(ls, list) { try { ls.setItem(SEEN_KEY, JSON.stringify((list || []).slice(0, SEEN_MAX))); return true; } catch (e) { return false; } }
  /** 원하는 가격 근처(±3%) 최근 거래 수 — 이 기기 안에서만 계산 */
  function nearWant(pts, want) { if (!(want > 0) || !pts) return 0; return pts.filter(function (p) { return Math.abs(p.amt / want - 1) <= 0.03 + 1e-9; }).length; }
  function priceLine(x) {
    if (!x) return '';
    if (x.kind === 'wolse') return '월세 ' + eok(x.deposit) + '/' + (x.rent || 0).toLocaleString('ko-KR') + '만';
    return (x.kind === 'jeonse' ? '전세 ' : '매매 ') + won(x.price);
  }

  var API = { PY: PY, MIN_DEALS: MIN_DEALS, SEEN_KEY: SEEN_KEY, SEEN_MAX: SEEN_MAX, HAND_KEY: HAND_KEY, FLOOR_MIN_ALL: FLOOR_MIN_ALL, FLOOR_MIN_GROUP: FLOOR_MIN_GROUP, GROUP_KO: GROUP_KO, URL_KEYS: URL_KEYS,
    median: median, ymAdd: ymAdd, ymLabel: ymLabel, won: won, eok: eok, esc: esc, pctText: pctText,
    toMan: toMan, parsePrice: parsePrice, parseArea: parseArea, parseFloor: parseFloor, guessType: guessType, nameHint: nameHint, parseListing: parseListing, looksLikeListing: looksLikeListing,
    normTrades: normTrades, floorGroup: floorGroup, floorFactor: floorFactor, evaluate: evaluate, diffWord: diffWord, rankText: rankText, similarBands: similarBands, peers: peers,
    gapCash: gapCash, loanHint: loanHint, yieldOf: yieldOf, commStat: commStat,
    prefillUrl: prefillUrl, hasAmount: hasAmount, readShare: readShare, stash: stash, take: take,
    cleanSeen: cleanSeen, seenParse: seenParse, seenId: seenId, seenSig: seenSig, seenAdd: seenAdd, seenSet: seenSet, seenDel: seenDel, seenHtml: seenHtml, SEEN_CSS: SEEN_CSS, seenWire: seenWire, takeOpen: takeOpen, OPEN_KEY: OPEN_KEY, TYPE_KO: TYPE_KO, seenLoad: seenLoad, seenSave: seenSave, nearWant: nearWant, priceLine: priceLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.JDJ_CHECK = API;
})(typeof self !== 'undefined' ? self : this);
