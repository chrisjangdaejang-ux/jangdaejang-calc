/* 집예보 분양 광고 시안(숨김) — assets/ads-proto.js
   대표 확인용 시안이에요. 실제 광고는 하나도 없고, 모든 칸은 '예시 광고'(가상 현장·가상 광고주)예요.
   - 켜짐: assets/config.js ADS_PROTO === true, 또는 대표 미리 보기(주소 끝 ?preview=ads 로 한 번 열면 이 기기에서만 · ?preview=off 로 끔).
     꺼져 있으면 아무것도 그리지 않아요(칸·링크·기록 없음).
   - 자리 4곳(스크립트 태그의 data-page): home(홈 섹션 사이 피드 카드) · map(지도 'AD' 핀 + 아래 카드) · bunyang(공고 목록 4번째 뒤 목록 카드) · buy(계산 결과 바깥 '예산에 맞는 분양').
     + 'brief'(화면 자리 아님): 모닝 브리핑 카톡 브랜드 메시지 광고 1건 — 서버가 관심 지역만으로 고름(briefPick, 아래).
   - 맞춤(타깃팅)은 이 기기 안에서만: 공개 광고 목록(여기서는 EXAMPLES)을 받아 '지금 보는 지역·이 기기에서 계산한 예산 구간·무주택 여부·청약 가점 구간'과
     광고 조건을 이 브라우저가 직접 맞춰 봐요. 예산·가점·무주택 같은 값은 서버로 보내지 않고, 기록(시안은 기록 자체를 하지 않음)에도 칸·광고 id 만 남겨요.
   - 지키는 것: 언제나 '광고' 표시 · 핵심 숫자(계산 결과·점수) 안에는 넣지 않음 · 유료 리포트 안에는 넣지 않음 · 휴대폰 한 화면 최대 1칸 · 같은 광고 하루 3번까지(이 기기에서 셈).
   설계 문서: 비공개 엔진 docs/ads/ads-plan.md · 시험: node tools/ads-proto-test.js </dev/null */
(function (root) {
  'use strict';
  var FC_MAX = 3;            /* 같은 광고 하루 최대 노출(이 기기) */
  var PREVIEW_KEY = 'jdj_ads_proto';

  /* 예산 구간(만원) — 이 기기에서 계산한 최대 매수 가능 금액을 구간 이름으로만 바꿔 씀 */
  var BUDGET = [[0, 30000, '~3억'], [30000, 60000, '3~6억'], [60000, 90000, '6~9억'], [90000, 120000, '9~12억'], [120000, 150000, '12~15억'], [150000, Infinity, '15억~']];
  function budgetBand(man) {
    man = +man; if (!(man > 0)) return '';
    for (var i = 0; i < BUDGET.length; i++) if (man >= BUDGET[i][0] && man < BUDGET[i][1]) return BUDGET[i][2];
    return '';
  }
  /* 청약 가점 구간(84점 만점) */
  function cyBand(s) {
    if (s === '' || s == null) return ''; s = +s; if (!(s >= 0) || s > 84) return '';
    return s < 30 ? '~29점' : s < 50 ? '30~49점' : s < 65 ? '50~64점' : '65점~';
  }

  /* 예시 광고 목록 — 실제 운영 때는 공개 파일(data/ad-catalog.json)로 같은 모양을 내려받아요. 개인 정보는 들어 있지 않음 */
  var EXAMPLES = [
    { id: 'ex_gangseo', example: true, advertiser: '예시 시행사(가상)', name: '예시 마곡 리버뷰(가상 현장)', kind: '아파트',
      sido: '서울특별시', sgg: '강서구', code: '11500', units: 612, move: '2029년 3월', price: '분양가 6억 2천~8억 9천만 원(공고 기준·예시)',
      line: '9호선 역까지 걸어서 8분 · 전용 59·84㎡', verified: true,
      target: { codes: ['11500', '11470', '11560', '41210'], sido: ['11'], budget: ['6~9억', '9~12억'], noHome: 'prefer', pages: ['home', 'map', 'bunyang', 'buy', 'brief'] } },
    { id: 'ex_hanam', example: true, advertiser: '예시 분양대행사(가상)', name: '예시 하남 그린시티(가상 현장)', kind: '아파트',
      sido: '경기도', sgg: '하남시', code: '41450', units: 980, move: '2029년 9월', price: '분양가 5억 4천~7억 6천만 원(공고 기준·예시)',
      line: '3기 신도시 생활권 · 전용 74·84㎡', verified: true,
      target: { codes: ['41450', '11740', '11710'], sido: ['41', '11'], budget: ['3~6억', '6~9억'], noHome: 'prefer', cy: ['30~49점', '50~64점', '65점~'], pages: ['home', 'map', 'bunyang', 'buy', 'brief'] } },
    { id: 'ex_small', example: true, advertiser: '예시 시행사(가상)', name: '예시 역세권 소형 오피스텔(가상 현장)', kind: '오피스텔',
      sido: '서울특별시', sgg: '영등포구', code: '11560', units: 148, move: '2028년 6월', price: '분양가 2억 9천~3억 8천만 원(예시)',
      line: '전용 24~39㎡ · 1~2인 가구', verified: false,
      target: { codes: [], sido: [], budget: ['~3억', '3~6억'], pages: ['home', 'map', 'bunyang', 'buy'] } }
  ];

  var arr = function (v) { return v == null || v === '' ? [] : Array.isArray(v) ? v : [v]; };
  var short = function (s) { return String(s || '').replace(/(특별자치시|특별자치도|특별시|광역시|통합특별시|도)$/, ''); };

  /** 광고 조건과 이 기기의 맥락(ctx)이 맞는 정도 — 0 이면 싣지 않음. 순수 함수(tools/ads-proto-test.js)
      ctx = { page, code(5자리 시·군·구), sido(이름 또는 2자리), sggName, budget(구간 이름), noHome(true/false/undefined), cy(구간 이름) } */
  function score(ad, ctx) {
    if (!ad || !ad.id || !ad.target) return 0;
    ctx = ctx || {}; var t = ad.target, s = 1, why = [];
    if (arr(t.pages).length && arr(t.pages).indexOf(ctx.page) < 0) return 0;
    /* 지역: 같은 시·군·구(또는 광고가 고른 주변 시·군·구) 3점 · 같은 시·도 1점 · 지역 조건이 있는데 둘 다 아니면 0 */
    var codes = arr(t.codes), sidos = arr(t.sido), code = /^\d{5}$/.test(ctx.code || '') ? ctx.code : '';
    var sdc = code ? code.slice(0, 2) : (/^\d{2}$/.test(ctx.sido || '') ? ctx.sido : '');
    var sameName = ctx.sggName && short(ctx.sido) === short(ad.sido) && ctx.sggName === ad.sgg;
    if (codes.length || sidos.length) {
      if ((code && codes.indexOf(code) >= 0) || sameName) { s += 3; why.push('region'); }
      else if ((sdc && sidos.indexOf(sdc) >= 0) || (!sdc && ctx.sido && short(ctx.sido) === short(ad.sido))) { s += 1; why.push('sido'); }
      else if (code || sdc || ctx.sido) return 0;      /* 다른 지역을 보는 중이면 싣지 않음 */
    }
    /* 예산: 구간이 맞으면 +2, 구간을 알고 있는데 안 맞으면 싣지 않음(살 수 없는 집 광고는 보여 주지 않기) */
    if (arr(t.budget).length && ctx.budget) { if (arr(t.budget).indexOf(ctx.budget) >= 0) { s += 2; why.push('budget'); } else return 0; }
    /* 무주택: 'only' 면 무주택일 때만, 'prefer' 면 무주택이면 +1 */
    if (t.noHome === 'only' && ctx.noHome !== true) return 0;
    if (t.noHome && ctx.noHome === true) { s += 1; why.push('nohome'); }
    /* 청약 가점 구간 */
    if (arr(t.cy).length && ctx.cy) { if (arr(t.cy).indexOf(ctx.cy) >= 0) { s += 1; why.push('cy'); } else return 0; }
    return { s: s, why: why };
  }
  /** 이 자리에 보일 광고 1개(점수 높은 순 → id 순). used: 이미 이 화면에 나온 id, fc: 이 기기 오늘 노출 수 {id: n} */
  function choose(list, ctx, used, fc, ignoreCap) {
    used = used || []; fc = fc || {};
    var c = (list || []).map(function (a) { var r = score(a, ctx); return r ? { a: a, s: r.s, why: r.why } : null; })
      .filter(function (x) { return x && used.indexOf(x.a.id) < 0 && (ignoreCap || (fc[x.a.id] || 0) < FC_MAX); })
      .sort(function (x, y) { return (y.s - x.s) || String(x.a.id).localeCompare(String(y.a.id)); });
    return c[0] || null;
  }
  /** '왜 이 광고가 보이나요?' 문장 — 이 기기 안에서 맞춘 조건만 말함 */
  function whyText(hit, ctx) {
    var w = (hit && hit.why) || [], out = [];
    if (w.indexOf('region') >= 0) out.push('지금 보고 계신 지역(' + (ctx.sggName || hit.a.sgg) + ')');
    else if (w.indexOf('sido') >= 0) out.push('지금 보고 계신 시·도');
    if (w.indexOf('budget') >= 0) out.push('이 기기에서 계산한 예산 구간(' + ctx.budget + ')');
    if (w.indexOf('nohome') >= 0) out.push('무주택으로 고르신 조건');
    if (w.indexOf('cy') >= 0) out.push('이 기기에서 계산한 청약 가점 구간(' + ctx.cy + ')');
    return (out.length ? out.join(', ') + '이 광고주가 정한 조건에 맞아서 보여요.' : '광고주가 지역을 정하지 않은 광고라서 보여요.')
      + ' 맞춰 보는 일은 이 휴대폰(브라우저) 안에서만 하고, 예산·가점 같은 값은 집예보 서버나 광고주에게 보내지 않아요.';
  }
  function today() { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); }
  /** 하루 노출 수(이 기기) 다음 상태 — 날짜가 바뀌면 새로 셈 */
  function bump(st, id, day) {
    st = st && st.d === day ? st : { d: day, n: {} };
    st.n[id] = (st.n[id] || 0) + 1; return st;
  }

  /** 모닝 브리핑 카톡 브랜드 메시지의 광고 1건 — 이 규칙은 서버(tools/agent-backend.gs bmAdPick)가 그대로 씀(tools/brief-bm-test.js 가 대조).
      쓰는 값은 구독자가 고른 관심 지역(시·군·구 5자리 코드)뿐 — 예산·가점·무주택 같은 다른 개인 정보는 쓰지 않음.
      싣는 광고: 예시가 아님 · verified(분양 현장 확인) · target.pages 에 'brief' · 게재 기간(start~end) 안 · 관심 지역(같은 시·군·구 3점, 같은 시·도 1점)이 맞음.
      fc = { 광고id: 최근 BRIEF_FC.days일 노출 수 } — BRIEF_FC.max 이상이면 뺌. opt.examples = 시안 대조용(실제 발송은 안 씀) */
  var BRIEF_FC = { days: 7, max: 2 };
  function briefPick(list, codes, fc, day, opt) {
    opt = opt || {}; fc = fc || {};
    codes = arr(codes).map(String).filter(function (c) { return /^\d{5}$/.test(c); });
    if (!codes.length) return null;
    var sds = codes.map(function (c) { return c.slice(0, 2); });
    var c = (list || []).map(function (a) {
      if (!a || !a.id || !a.target || !a.name || !a.advertiser) return null;
      if (a.example && !opt.examples) return null;
      if (a.verified !== true) return null;
      if (arr(a.target.pages).indexOf('brief') < 0) return null;
      if (day && ((a.start && day < a.start) || (a.end && day > a.end))) return null;
      if ((fc[a.id] || 0) >= BRIEF_FC.max) return null;
      var tc = arr(a.target.codes), ts = arr(a.target.sido);
      var s = tc.some(function (x) { return codes.indexOf(x) >= 0; }) || codes.indexOf(a.code) >= 0 ? 3 : ts.some(function (x) { return sds.indexOf(x) >= 0; }) ? 1 : 0;
      return s ? { a: a, s: s } : null;
    }).filter(Boolean).sort(function (x, y) { return (y.s - x.s) || String(x.a.id).localeCompare(String(y.a.id)); });
    return c[0] ? c[0].a : null;
  }

  var api = { EXAMPLES: EXAMPLES, FC_MAX: FC_MAX, BRIEF_FC: BRIEF_FC, budgetBand: budgetBand, cyBand: cyBand, score: score, choose: choose, whyText: whyText, bump: bump, briefPick: briefPick };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  root.JDJ_ADPROTO = api;

  /* ---------- 켜짐 확인 ---------- */
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  if (/[?&]preview=ads(&|$)/.test(location.search)) ls.set(PREVIEW_KEY, '1');
  if (/[?&]preview=off(&|$)/.test(location.search)) ls.del(PREVIEW_KEY);
  var preview = ls.get(PREVIEW_KEY) === '1';
  function on() { return (root.JDJ_SITE && root.JDJ_SITE.ADS_PROTO === true) || preview; }
  if (!on()) { api.set = function () {}; return; }

  var me = document.currentScript, PAGE = (me && me.getAttribute('data-page')) || '';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- 이 기기의 맥락(서버로 보내지 않음) ---------- */
  var CTX = { page: PAGE };
  (function () {
    try {
      var q = new URLSearchParams(location.search), g = q.get('g') || '';
      if (/^\d{5}$/.test(g)) CTX.code = g;
      var h = JSON.parse(ls.get('jdj_home_region') || 'null'); if (!CTX.code && h && /^\d{5}$/.test(h.g || '')) CTX.code = h.g;
      var b = JSON.parse(ss.get('jdj_adp_ctx') || 'null');     /* 같은 탭에서 계산기가 남긴 구간 값(이름만) */
      if (b) { if (b.budget) CTX.budget = b.budget; if (typeof b.noHome === 'boolean') CTX.noHome = b.noHome; if (b.cy) CTX.cy = b.cy; }
    } catch (e) {}
  })();
  var NAMES = { '11500': '강서구', '11470': '양천구', '11560': '영등포구', '41210': '광명시', '41450': '하남시', '11740': '강동구', '11710': '송파구', '11680': '강남구' };
  if (CTX.code && NAMES[CTX.code]) CTX.sggName = NAMES[CTX.code];

  /* ---------- 모양 ---------- */
  (function () {
    var st = document.createElement('style'); st.id = 'adpCss';
    st.textContent = ''
      + '.adp{margin:18px 0;font-size:15px}.adp *{box-sizing:border-box}'
      + '.adp-h{display:flex;align-items:center;gap:6px;margin:0 0 6px;font-size:12.5px;color:#6B7280}'
      + '.adp-tag{display:inline-block;font-size:12px;font-weight:800;line-height:1;padding:4px 6px;border-radius:5px;background:#374151;color:#fff}'
      + '.adp-ex{background:#FFF1D6;color:#8A5A00;border:1px solid #F1C982}'
      + '.adp-c{display:block;background:#fff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;color:#111827;text-decoration:none}'
      + '.adp-img{position:relative;height:120px;background:linear-gradient(135deg,#DCE7F7,#F4F7FB 60%,#E8EEF8)}'
      + '.adp-img svg{position:absolute;right:14px;bottom:0;height:96px;width:auto}'
      + '.adp-img .adp-lbl{position:absolute;left:12px;top:10px;font-size:12px;color:#4B5563;background:rgba(255,255,255,.85);border-radius:6px;padding:3px 7px}'
      + '.adp-b{padding:12px 14px 14px}.adp-nm{font-size:16.5px;font-weight:800;letter-spacing:-.3px;line-height:1.4}'
      + '.adp-loc{font-size:13.5px;color:#6B7280;margin-top:2px}.adp-ln{font-size:14px;color:#374151;margin-top:6px}'
      + '.adp-pr{font-size:14px;font-weight:700;margin-top:4px}'
      + '.adp-ok{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:12.5px;font-weight:800;color:#1D4ED8;background:#EAF1FF;border-radius:999px;padding:3px 9px}'
      + '.adp-no{display:inline-block;margin-top:8px;font-size:12.5px;color:#6B7280;background:#F3F4F6;border-radius:999px;padding:3px 9px}'
      + '.adp-act{display:flex;gap:8px;margin-top:10px}.adp-act button{flex:1;min-height:44px;border-radius:12px;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer}'
      + '.adp-act .s{background:#fff;border:1px solid #D1D5DB;color:#111827}.adp-act .p{background:#1D4ED8;border:1px solid #1D4ED8;color:#fff}'
      + '.adp-why{margin-top:8px;font-size:12.5px;color:#6B7280}.adp-why summary{cursor:pointer;font-weight:700;color:#4B5563;min-height:32px;display:flex;align-items:center}'
      + '.adp-why p{margin:4px 0 0;line-height:1.55}'
      + '.adp-row{display:flex;gap:12px;align-items:center;padding:14px;border:1px solid #E5E7EB;border-radius:16px;background:#fff}'
      + '.adp-row .adp-th{flex:none;width:64px;height:64px;border-radius:12px;background:linear-gradient(135deg,#DCE7F7,#EEF3FA);display:flex;align-items:flex-end;justify-content:center;overflow:hidden}'
      + '.adp-row .adp-th svg{height:54px}'
      + '.adp-pin{position:absolute;z-index:650;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer}'
      + '.adp-pin b{display:flex;align-items:center;gap:4px;background:#1D4ED8;color:#fff;font-size:13px;font-weight:800;border-radius:10px;padding:5px 8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25)}'
      + '.adp-pin b i{font-style:normal;font-size:10.5px;background:#fff;color:#1D4ED8;border-radius:4px;padding:1px 4px}'
      + '.adp-pin:after{content:"";width:0;height:0;border:7px solid transparent;border-top-color:#1D4ED8;margin-top:-1px}'
      + '.adp-sheet{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));z-index:900;width:calc(100% - 24px);max-width:480px;margin:0;box-shadow:0 8px 28px rgba(0,0,0,.18);border-radius:16px;background:#fff}'
      + '.adp-sheet .adp-row{border:0}.adp-x{position:absolute;right:6px;top:4px;width:36px;height:36px;border:0;background:none;font-size:20px;color:#9CA3AF;cursor:pointer}'
      + '.adp-home{margin:22px 20px 0}'
      + '.adp-bar{position:relative;z-index:2000;background:#111827;color:#fff;font-size:12.5px;text-align:center;padding:5px 8px}'
      + '.adp-bar a{color:#FCD34D}'
      + '@media(min-width:720px){.adp-sheet{left:auto;right:24px;transform:none;bottom:24px;width:420px}.adp-img{height:140px}}';
    document.head.appendChild(st);
  })();
  var BLD = '<svg viewBox="0 0 120 96" aria-hidden="true"><rect x="8" y="30" width="30" height="66" rx="2" fill="#9DB4D8"/><rect x="44" y="8" width="34" height="88" rx="2" fill="#7C9CCB"/><rect x="84" y="40" width="28" height="56" rx="2" fill="#B5C7E3"/>'
    + '<g fill="#fff" opacity=".8"><rect x="50" y="18" width="6" height="6"/><rect x="66" y="18" width="6" height="6"/><rect x="50" y="32" width="6" height="6"/><rect x="66" y="32" width="6" height="6"/><rect x="50" y="46" width="6" height="6"/><rect x="66" y="46" width="6" height="6"/><rect x="14" y="40" width="6" height="6"/><rect x="26" y="40" width="6" height="6"/><rect x="90" y="50" width="6" height="6"/><rect x="100" y="50" width="6" height="6"/></g></svg>';
  var HEAD = '<p class="adp-h"><span class="adp-tag">광고</span><span class="adp-tag adp-ex">예시</span><span>가상 광고주 · 대표 확인용 시안</span></p>';
  var badge = function (a) { return a.verified ? '<span class="adp-ok" title="집예보가 입주자 모집 공고와 광고 문구를 대조했어요">✓ 집예보 확인 — 공고와 대조한 분양 정보</span>' : '<span class="adp-no">공고 대조 전 · 광고주 제공 정보</span>'; };
  var why = function (hit) { return '<details class="adp-why"><summary>왜 이 광고가 보이나요?</summary><p>' + esc(whyText(hit, CTX)) + '</p></details>'; };
  var acts = '<div class="adp-act"><button type="button" class="s" data-adp-act="save">관심 저장</button><button type="button" class="p" data-adp-act="lead">상담 신청</button></div>';

  function feedCard(hit, label) {
    var a = hit.a;
    return HEAD + '<div class="adp-c"><div class="adp-img">' + BLD + '<span class="adp-lbl">' + esc(label) + '</span></div><div class="adp-b">'
      + '<div class="adp-nm">' + esc(a.name) + '</div><div class="adp-loc">' + esc(a.sido + ' ' + a.sgg) + ' · ' + esc(a.kind) + ' ' + a.units.toLocaleString('ko-KR') + '세대 · 입주 ' + esc(a.move) + '</div>'
      + '<div class="adp-ln">' + esc(a.line) + '</div><div class="adp-pr">' + esc(a.price) + '</div>' + badge(a) + acts + why(hit) + '</div></div>';
  }
  function rowCard(hit, sub) {
    var a = hit.a;
    return '<div class="adp-row"><span class="adp-th">' + BLD + '</span><span style="min-width:0;flex:1"><span class="adp-tag" style="margin-right:4px">광고</span><span class="adp-tag adp-ex">예시</span>'
      + '<div class="adp-nm" style="margin-top:4px;font-size:15.5px">' + esc(a.name) + '</div><div class="adp-loc">' + esc(sub || (a.sgg + ' · ' + a.units.toLocaleString('ko-KR') + '세대 · ' + a.price)) + '</div>' + badge(a) + '</span></div>';
  }
  function fc() { try { var s = JSON.parse(ls.get('jdj_adp_fc') || 'null'); return s && s.d === today() ? s.n : {}; } catch (e) { return {}; } }
  function seen(id) { try { ls.set('jdj_adp_fc', JSON.stringify(bump(JSON.parse(ls.get('jdj_adp_fc') || 'null'), id, today()))); } catch (e) {} }
  var USED = [];
  function pickFor(page) { var h = choose(EXAMPLES, Object.assign({}, CTX, { page: page }), USED, fc(), preview); if (h) { USED.push(h.a.id); seen(h.a.id); } return h; }
  function wire(el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-adp-act]'); if (!b) return;
      alert(b.getAttribute('data-adp-act') === 'save'
        ? '시안이에요. 실제로는 이 기기의 관심 목록에 저장되고, 광고주에게는 \'관심 저장 몇 건\' 숫자만 보여요.'
        : '시안이에요. 실제로는 집예보 상담 신청서가 열리고, 이름·연락처는 "이 광고주에게 제공" 동의를 따로 받은 뒤에만 광고주에게 전달돼요.');
    });
  }
  /* 미리 보기 표시 띠 */
  if (preview && !(root.JDJ_SITE && root.JDJ_SITE.ADS_PROTO === true)) {
    var bar = document.createElement('div'); bar.className = 'adp-bar';
    bar.innerHTML = '분양 광고 시안 미리 보기 중 · 이 기기에서만 보여요 · <a href="?preview=off">끄기</a>';
    (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })).then(function () { document.body.prepend(bar); });
  }

  /* ---------- 자리 ---------- */
  function home() {
    var after = document.querySelector('section.myh') || document.querySelector('section.svc');
    if (!after) return;
    var h = pickFor('home'); if (!h) return;
    var el = document.createElement('aside'); el.className = 'adp adp-home'; el.setAttribute('aria-label', '광고');
    el.innerHTML = feedCard(h, '분양 소식'); after.after(el); wire(el);
  }
  function map() {
    var m = document.getElementById('map'); if (!m) return;
    var h = pickFor('map'); if (!h) return;
    var pin = document.createElement('div'); pin.className = 'adp-pin'; pin.setAttribute('role', 'button'); pin.setAttribute('aria-label', '광고 분양 현장 ' + h.a.name);
    pin.innerHTML = '<b><i>AD</i>' + esc(h.a.name.replace(/\(가상 현장\)/, '').trim()) + '</b>';
    pin.style.left = '62%'; pin.style.top = '40%';
    var host = m.parentElement; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(pin);
    var sh = document.createElement('aside'); sh.className = 'adp-sheet'; sh.setAttribute('aria-label', '광고');
    sh.innerHTML = '<button type="button" class="adp-x" aria-label="광고 닫기">×</button>' + rowCard(h);
    document.body.appendChild(sh); wire(sh);
    /* 한 화면 유료 광고 1개: 분양 핀 카드가 떠 있는 동안 지도 위 한 줄 칸은 비켜 줌 */
    var top = document.querySelector('.mtop .jas-top'); if (top) top.style.display = 'none';
    sh.querySelector('.adp-x').addEventListener('click', function () { sh.hidden = true; });
    pin.addEventListener('click', function () { sh.hidden = false; });
  }
  function bunyang() {
    var place = function () {
      var l = document.querySelector('#list .cards'); if (!l || l.querySelector(':scope > .adp')) return;
      var items = Array.prototype.filter.call(l.children, function (x) { return x.classList.contains('card'); });
      if (items.length < 4) return;
      var h = pickFor('bunyang'); if (!h) return;
      var el = document.createElement('div'); el.className = 'adp'; el.style.margin = '0'; el.setAttribute('aria-label', '광고');
      el.innerHTML = rowCard(h, h.a.sgg + ' · ' + h.a.kind + ' ' + h.a.units.toLocaleString('ko-KR') + '세대 · ' + h.a.price) + why(h);
      items[3].after(el); wire(el);
    };
    var host = document.getElementById('list'); if (!host) return;
    place(); new MutationObserver(place).observe(host, { childList: true, subtree: true });
  }
  var buyEl = null;
  function buy() {
    if (buyEl) buyEl.remove(); buyEl = null;
    if (!CTX.budget) return;                               /* 계산 전에는 그리지 않음 */
    var anchor = document.querySelector('[data-ad-slot="buy_end"]') || document.querySelector('.rules'); if (!anchor) return;
    USED = USED.filter(function (x) { return x.indexOf('ex_') !== 0; });
    var h = pickFor('buy'); if (!h) return;
    buyEl = document.createElement('aside'); buyEl.className = 'adp wrap'; buyEl.setAttribute('aria-label', '광고');
    buyEl.style.maxWidth = '720px'; buyEl.style.margin = '18px auto'; buyEl.style.padding = '0 20px';
    buyEl.innerHTML = '<p style="font-size:17px;font-weight:800;margin:0">예산 구간(' + esc(CTX.budget) + ')에 맞는 분양</p><p style="font-size:13px;color:#6B7280;margin:2px 0 10px">계산 결과와 관계없는 광고예요</p>' + feedCard(h, '예산에 맞는 분양');
    anchor.before(buyEl); wire(buyEl);
    var end = document.querySelector('[data-ad-slot="buy_end"]'); if (end) end.style.display = 'none';   /* 한 화면 광고 1개 */
  }
  /** 계산기가 이 기기 안에서 구간을 알려 줌(값 그대로가 아니라 구간 이름으로 바꿔 이 탭에만 둠) */
  api.set = function (v) {
    v = v || {};
    if (v.budget != null) CTX.budget = budgetBand(v.budget);
    if (v.own != null) CTX.noHome = v.own === 'none' || v.own === 'first';
    if (v.cy != null) CTX.cy = cyBand(v.cy);
    ss.set('jdj_adp_ctx', JSON.stringify({ budget: CTX.budget || '', noHome: CTX.noHome, cy: CTX.cy || '' }));
    if (PAGE === 'buy') { clearTimeout(api._t); api._t = setTimeout(buy, 300); }
  };
  api.ctx = function () { return Object.assign({}, CTX); };
  var run = function () { if (PAGE === 'home') home(); else if (PAGE === 'map') map(); else if (PAGE === 'bunyang') bunyang(); else if (PAGE === 'buy') buy(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})(typeof window !== 'undefined' ? window : globalThis);
