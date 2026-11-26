/* 집예보 공용 광고 칸 (assets/ad-slot.js) — 위치 계획: docs/ad_slots.md · 광고 상품: /ad/
   페이지에 넣는 법
     <div data-ad-slot="mine_end" data-ad-cat="mine" data-ad-after="#res" hidden></div>
     <script src="assets/ad-slot.js?v=6" defer></script>
   - data-ad-slot  : 칸 이름(docs/ad_slots.md 표의 slot id)
   - data-ad-cat   : 화면 종류(아래 CATS) — 받을 수 있는 업종과 집예보 안내 광고를 정함
   - data-ad-skip-if : 이 선택자가 보이면 칸을 숨김(예: 모닝 브리핑 전용 광고 자리가 그날 광고로 채워졌을 때)
   - data-ad-after : 이 칸보다 먼저 이용자가 봐야 하는 결과(선택자). 결과가 보일 때만 칸을 보여 줌
   - data-ad-list + data-ad-every : 긴 목록 사이 칸. 목록(선택자)의 N번째 항목 뒤에 한 번만 끼움(목록을 다시 그리면 다시 끼움)
   원칙
   - 외부(유료) 광고 칸에는 언제나 '광고' 표시. 유료 광고가 없으면 빈 칸 대신 그 화면에 맞는 집예보 자체 서비스 안내를 보여 주는데,
     이건 광고가 아니라 집예보 서비스라 '광고' 대신 '집예보 소식' 꼬리표와 서비스 카드 모양으로 그림(사람들이 광고로 보고 건너뛰지 않게).
     칸 자리·높이·휴대폰 한 화면 개수 규칙은 그대로라, 그 자리에 유료 광고가 들어오면 '광고' 표시로 바로 바뀜
   - 결과·계산 칸([aria-live]·.result·#res·#result·#report 안)에는 절대 그리지 않음 — 특히 세금 계산 결과
   - data-ad-top : 화면 위쪽 한 줄 배너(제목·검색 바로 아래). 높이를 처음부터 잡아 두어 그려져도 아래 내용이 튀지 않음
   - 휴대폰(폭 720px 미만)에서는 한 화면(스크롤 한 번 분량)에 광고 최대 2개(분양 목록 상단 광고 .jad 포함). 상단 배너가 먼저 자리를 잡고,
     같은 화면에 넘치는 목록 사이 칸은 아래 항목으로 내려가고, 끝 칸은 그리지 않음
   - 칸 높이를 고정해 광고를 바꿔 끼워도 아래 내용이 밀리지 않음. 위치는 늘 본문 흐름 안(고정·떠 있는 칸 없음)이라 하단 탭을 가리지 않음
   - 광고 자료: data/ads.json {ads:[{id, slot, cat, advertiser, industry, fee, title, text, image, link, start, end, regno}]}
   - 대출 상담 광고는 금융소비자보호법에 따라 광고주의 '대출성 상품 판매대리·중개업자 등록번호'(regno)가 있어야만 싣고, 칸에 그 번호를 함께 보여 줌
   - 기록: 보임(화면에 절반 이상 1초) ad_slot_view · 누름 ad_slot_click — 칸·광고 id 만(JDJ.track → GA4). 누름은 data-track="adslot_칸이름" 으로도 집계 */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var B = JB.SITE;
  var DATA = B + 'data/ads.json';
  var MOBILE_W = 720, MOBILE_MAX = 2;

  /* 화면 종류별: 이름 · 받을 수 있는 업종 · 유료 광고가 없을 때 보여 줄 집예보 안내 광고 */
  var CATS = {
    home:     { name: '홈',          ind: ['대출 상담', '법무사', '보증보험', '이사', '인테리어', '세무사', '시행사', '분양대행사'], house: ['mine', 'brief'] },
    map:      { name: '지도',        ind: ['시행사', '분양대행사', '대출 상담', '이사', '인테리어'], house: ['brief', 'mine'] },
    rank:     { name: '순위',        ind: ['시행사', '분양대행사', '대출 상담', '이사', '인테리어'], house: ['brief', 'mine'] },
    mine:     { name: '내 집 시세',  ind: ['대출 상담', '이사', '인테리어', '법무사', '세무사'], house: ['brief', 'buy'] },
    ask:      { name: '단지 비교',   ind: ['대출 상담', '이사', '인테리어', '법무사'], house: ['brief', 'buy'] },
    tax:      { name: '세금',        ind: ['세무사'], house: ['brief', 'mine'], flatOnly: true, note: '세금 계산 결과와 관계없는 광고예요' },
    chungyak: { name: '청약',        ind: ['시행사', '분양대행사'], house: ['brief', 'mine'] },
    bunyang:  { name: '분양',        ind: ['시행사', '분양대행사'], house: ['dev', 'brief'] },
    villa:    { name: '빌라·재개발', ind: ['법무사', '감정평가', '보증보험', '이사'], house: ['brief', 'mine'] },
    jeonse:   { name: '전월세',      ind: ['보증보험', '법무사', '이사'], house: ['brief', 'mine'] },
    switch:   { name: '갈아타기',    ind: ['대출 상담', '세무사', '법무사', '이사', '인테리어'], house: ['brief', 'mine'], flatOnly: true, note: '계산 결과와 관계없는 광고예요' },
    brief:    { name: '모닝 브리핑', ind: ['시행사', '분양대행사', '대출 상담', '세무사', '이사'], house: ['mine', 'brief'], flatOnly: true },
    report:   { name: '리포트',      ind: ['대출 상담', '법무사', '이사', '인테리어', '시행사', '분양대행사'], house: ['brief', 'mine'], note: '계산·분석 결과와 관계없는 광고예요' },
    land:     { name: '땅',          ind: ['감정평가', '법무사', '세무사'], house: ['brief', 'mine'], flatOnly: true },
    agent:    { name: '중개사',      ind: ['중개사 도구'], house: ['agent', 'brief'] },
    loan:     { name: '대출 한도',   ind: ['대출 상담'], house: ['mine', 'buy'], flatOnly: true, note: '계산 결과와 관계없는 광고예요' }
  };
  /* 대출 상담 광고: 등록번호(regno) 필수 — 금융위원회 등록 '대출성 상품 판매대리·중개업자' 번호. 화면에 그대로 보여 줌 */
  var LOAN_IND = '대출 상담', REGNO_LABEL = '대출성 상품 판매대리·중개업자 등록번호';
  function okRegno(v) { v = String(v == null ? '' : v).trim(); return v.length >= 4 && v.length <= 40 && /\d/.test(v) && /^[0-9A-Za-z가-힣\-\s().]+$/.test(v); }
  /* /ad/ '업종 심사'에서 받지 않는 업종 — 어느 칸에도 싣지 않음 */
  var BLOCK = ['대부업', '미등록 대출 중개', '기획부동산', '지분 쪼개기', '확정 수익', '무자격 중개', '미승인 분양'];
  /* 세무사는 정액 광고비만(세무사법: 소개·알선 대가 금지) — 어느 화면이든 fee 가 'flat' 이 아니면 싣지 않음 */
  var FLAT_ONLY_IND = ['세무사'];

  function site() { var s = root.JDJ_SITE && root.JDJ_SITE.SITE_NAME; return (s && String(s).trim()) || '집예보'; }
  /* 집예보 안내 광고(하우스 광고) */
  function houseAd(kind) {
    var S = site();
    var H = {
      brief: { title: S + ' 모닝 브리핑 7일 무료', text: '매일 아침 7시, 관심 동네의 새 실거래·신고가·급매·청약 소식을 받아 보세요. 자동 결제는 없어요.', link: B + 'brief/subscribe/', cta: '7일 무료로 받아 보기' },
      agent: { title: S + ' 중개사 플러스', text: '손님에게 보낼 아침 브리핑 카드, 매물 설명서, 주간 블로그·인스타 글을 한 번에 준비해 드려요.', link: B + 'brief/subscribe/?p=brief_pro_plus', cta: '중개사 플러스 보기' },
      dev:   { title: S + ' 분양가 비교 리포트', text: '시행사·분양대행사용 — 예정 분양가가 주변 시세와 비교해 어디쯤인지 숫자로 보여 드려요.', link: B + 'pro/developer/', cta: '리포트 보기' },
      loan:  { title: '내 대출 한도는 얼마?', text: '집값·지역·연소득만 넣으면 LTV·DSR 중 무엇이 한도를 막는지 바로 알려 드려요. 회원가입 없이 무료.', link: B + 'loan/', cta: '대출 한도 계산' },
      buy:   { title: '내 예산으로 살 수 있는 집', text: '소득·현금만 넣으면 대출 한도와 살 수 있는 단지를 바로 보여 드려요. 입력값은 이 기기에만 남아요.', link: B + 'buy/', cta: '계산해 보기' },
      mine:  { title: '우리 집 시세, 한 번에 보기', text: '단지 이름만 넣으면 실거래 시세와 앞으로의 흐름을 쉬운 말로 보여 드려요.', link: B + 'mine/', cta: '내 집 시세 보기' }
    };
    var h = H[kind] || H.brief;
    return { id: 'house_' + (H[kind] ? kind : 'brief'), house: true, advertiser: S, title: h.title, text: h.text, link: h.link, cta: h.cta };
  }

  function kstToday(now) {
    var d = new Date((now || Date.now()) + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  var arr = function (v) { return v == null || v === '' ? [] : Array.isArray(v) ? v : [v]; };
  var okLink = function (u) { return /^https:\/\/[^\s"'<>\\`]+$/.test(String(u || '')); };

  /** 이 칸·화면에 실을 수 있는 광고인지 (순수 함수 — tools/ad-slot-test.js 가 확인) */
  function allowed(ad, slot, cat, today) {
    if (!ad || !ad.id || !ad.title || !okLink(ad.link)) return false;
    var c = CATS[cat]; if (!c) return false;
    var slots = arr(ad.slot), cats = arr(ad.cat);
    if (slots.length ? slots.indexOf(slot) < 0 : cats.indexOf(cat) < 0) return false;
    if (cats.length && cats.indexOf(cat) < 0) return false;
    if (!ad.start || !ad.end || today < ad.start || today > ad.end) return false;
    var ind = String(ad.industry || '');
    if (BLOCK.some(function (b) { return ind.indexOf(b) >= 0; })) return false;
    if (c.ind.indexOf(ind) < 0) return false;
    if ((c.flatOnly || FLAT_ONLY_IND.indexOf(ind) >= 0) && ad.fee !== 'flat') return false;
    if (ind === LOAN_IND && !okRegno(ad.regno)) return false;
    return true;
  }
  /* ---------- 지역 ----------
     광고의 region: '' 또는 없음 = 전국, 2자리 = 시·도(법정동 코드 앞 2자리, 예: 11 서울), 5자리 = 시·군·구(예: 11680 강남구).
     화면 지역 rg = { sido: '11', sgg: '11680' }(모르면 빈 값). */
  function normRegion(r) { r = String(r == null ? '' : r).trim(); return /^\d{5}$/.test(r) || /^\d{2}$/.test(r) ? r : ''; }
  /** 광고 지역이 화면 지역에 맞는 정도: 3 = 같은 시·군·구, 2 = 같은 시·도, 1 = 전국 광고, 0 = 다른 지역(싣지 않음) */
  function regionScore(adRegion, rg) {
    var r = normRegion(adRegion); rg = rg || {};
    if (!r) return 1;
    if (r.length === 5) return rg.sgg && rg.sgg === r ? 3 : 0;
    var sd = rg.sido || (rg.sgg ? rg.sgg.slice(0, 2) : '');
    return sd && sd === r ? 2 : 0;
  }
  /** 칸에 보일 광고 1개: 그 지역 광고(시·군·구 → 시·도) → 전국 광고 → 집예보 안내 광고. 같은 단계 안에서는 시작일 → id 순, used 에 있는 것은 피함 */
  function pick(ads, slot, cat, today, used, rg) {
    used = used || [];
    var l = (ads || []).filter(function (a) { return allowed(a, slot, cat, today) && regionScore(a.region, rg) > 0; })
      .sort(function (a, b) { return (regionScore(b.region, rg) - regionScore(a.region, rg)) || String(a.start).localeCompare(String(b.start)) || String(a.id).localeCompare(String(b.id)); });
    var fresh = l.filter(function (a) { return used.indexOf(a.id) < 0; });
    if (fresh[0] || l[0]) return fresh[0] || l[0];
    var hs = arr((CATS[cat] || {}).house);   /* 안내 광고도 같은 화면에서 겹치지 않게 다음 것으로 */
    for (var i = 0; i < hs.length; i++) if (used.indexOf('house_' + hs[i]) < 0) return houseAd(hs[i]);
    return houseAd(hs[0]);
  }
  /** 같은 자리·같은 지역에는 한 광고주만: 칸(slot, 없으면 화면 cat)이 겹치고 지역이 같고 기간이 겹치는 다른 광고주 짝 → [[id, id], …] */
  function conflicts(ads) {
    var out = [], L = (ads || []).filter(function (a) { return a && a.id; });
    var where = function (a) { var s = arr(a.slot); return s.length ? s.map(function (x) { return 's:' + x; }) : arr(a.cat).map(function (x) { return 'c:' + x; }); };
    var meet = function (a, b) {
      var A = where(a), B = where(b);
      if (A.some(function (x) { return B.indexOf(x) >= 0; })) return true;
      /* 한쪽은 칸 이름, 다른 쪽은 화면 전체(cat)면 그 화면의 칸끼리 겹침 */
      var cs = function (X) { return X.filter(function (x) { return x[0] === 'c'; }).map(function (x) { return x.slice(2); }); };
      var ss = function (X) { return X.filter(function (x) { return x[0] === 's'; }).map(function (x) { return x.slice(2).split('_')[0]; }); };
      return cs(A).some(function (c) { return ss(B).indexOf(c) >= 0; }) || cs(B).some(function (c) { return ss(A).indexOf(c) >= 0; });
    };
    for (var i = 0; i < L.length; i++) for (var j = i + 1; j < L.length; j++) {
      var a = L[i], b = L[j];
      if (normRegion(a.region) !== normRegion(b.region)) continue;
      if (String(a.advertiser || '') === String(b.advertiser || '')) continue;
      if (!(a.start <= b.end && b.start <= a.end)) continue;
      if (meet(a, b)) out.push([a.id, b.id]);
    }
    return out;
  }

  /** 위치 y 에 칸을 하나 더 넣으면 한 화면(높이 H) 안 광고가 MOBILE_MAX 를 넘는지 — others: 이미 있는 광고들의 y */
  function tooMany(others, y, H) {
    return others.filter(function (o) { return Math.abs(o - y) < H; }).length >= MOBILE_MAX;
  }

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cut = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  var OWN_TAG = '<span class="jas-tag jas-own">' + '집예보 소식' + '</span>';
  /* 집예보 모닝 브리핑 안내는 구독 화면으로 바로 — 어느 칸에서 왔는지(cta=slot_칸이름)를 붙여 구독까지 이어졌는지 셈(brief/subscribe · assets/brief-cta.js) */
  function houseLink(ad, slot) {
    var l = String(ad.link || '');
    if (ad.id !== 'house_brief' || !/^[a-z][a-z_]{2,30}$/.test(String(slot || ''))) return l;
    return l + (l.indexOf('?') < 0 ? '?' : '&') + 'cta=slot_' + slot;
  }
  /** 칸 안쪽 HTML — 외부 광고는 어떤 경우에도 '광고' 표시, 집예보 자체 서비스 안내는 '집예보 소식' 표시 */
  function html(ad, slot, cat, top) {
    var c = CATS[cat] || {}, house = !!ad.house;
    var reg = !house && String(ad.industry || '') === LOAN_IND && okRegno(ad.regno) ? REGNO_LABEL + ' ' + String(ad.regno).trim() : '';
    var tag = house ? OWN_TAG.replace('집예보', esc(site())) : '<span class="jas-tag">광고</span>';
    var link = house ? houseLink(ad, slot) : ad.link;
    var bc = house && ad.id === 'house_brief' ? ' data-bcta-at="slot_' + esc(slot) + '"' : '';
    if (top) {   /* 상단 한 줄 배너: [광고]/[집예보 소식] 제목 · 설명 … 보기 › — 높이 고정 */
      return '<a class="jas-c jas-bar" href="' + esc(link) + '"' + (house ? '' : ' target="_blank" rel="sponsored noopener nofollow"') + ' data-track="adslot_' + esc(slot) + '" data-ad-id="' + esc(ad.id) + '"' + bc + '>'
        + tag + '<span class="jas-t"><b>' + esc(cut(ad.title, 24)) + '</b><small>' + esc(reg || cut(ad.text, 60)) + '</small></span>'
        + '<span class="jas-go">' + esc(cut(ad.cta || '자세히', 12)) + ' ›</span></a>';
    }
    var sun = '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="4"/><path d="M12 3v2M4.9 6.9l1.4 1.4M19.1 6.9l-1.4 1.4M3 13h2M19 13h2M4 20h16"/></svg>';
    var img = !house && okLink(ad.image) ? '<img class="jas-img" src="' + esc(ad.image) + '" alt="" width="56" height="56" loading="lazy">'
      : '<span class="jas-img jas-ic" aria-hidden="true">' + (ad.id === 'house_brief' ? sun : '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>') + '</span>';
    var rel = house ? '' : ' target="_blank" rel="sponsored noopener nofollow"';
    return '<div class="jas-h">' + tag + '<small>' + (house ? esc(site()) + '가 직접 만든 서비스예요' : esc(cut(ad.advertiser, 24)) + ' · 광고주가 비용을 내고 싣는 광고예요') + '</small></div>'
      + '<a class="jas-c" href="' + esc(link) + '"' + rel + ' data-track="adslot_' + esc(slot) + '" data-ad-id="' + esc(ad.id) + '"' + bc + '>'
      + img + '<span class="jas-t"><b>' + esc(cut(ad.title, 24)) + '</b><small>' + esc(cut(ad.text, 60)) + '</small></span>'
      + '<span class="jas-go">' + esc(cut(ad.cta || '자세히', 12)) + ' ›</span></a>'
      + (reg ? '<p class="jas-n jas-reg">' + esc(cut(ad.advertiser, 24)) + ' · ' + esc(reg) + '</p>' : '')
      + (c.note && !house ? '<p class="jas-n">' + esc(c.note) + '</p>' : '');
  }

  var api = { CATS: CATS, BLOCK: BLOCK, LOAN_IND: LOAN_IND, REGNO_LABEL: REGNO_LABEL, okRegno: okRegno, allowed: allowed, pick: pick, regionScore: regionScore, normRegion: normRegion, conflicts: conflicts, html: html, houseAd: houseAd, kstToday: kstToday, tooMany: tooMany, MOBILE_MAX: MOBILE_MAX, BAN: '[aria-live],.result,#res,#result,#report,#gRes,output' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  root.JDJ_ADSLOT = api;

  /* ---------- 화면 ---------- */
  var ADS = null;
  function load() {
    if (!ADS) ADS = fetch(DATA, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { return j && Array.isArray(j.ads) ? j.ads : []; }).catch(function () { return []; });
    return ADS;
  }
  var track = function (ev, p) { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(ev, p); } catch (e) {} };
  var agLog = function (t, id) { try { var A = root.JDJ_AGENTS; if (A && A.log && id) A.log(t, id, ''); } catch (e) {} };
  var mobile = function () { return (root.innerWidth || 9999) < MOBILE_W; };
  var BAN = api.BAN;
  /* 집예보 소식(자체 서비스 안내) 카드 모양 — 외부 광고(회색 칸·'광고' 표시)와 한눈에 구분되게 */
  (function () {
    if (document.getElementById('jasOwnCss')) return;
    var st = document.createElement('style'); st.id = 'jasOwnCss';
    st.textContent = '.jas.jas-house{background:#F3F7FF;border-color:#D6E3FF}.jas.jas-top.jas-house{background:none;border:0}'
      + '.jas-house .jas-c{border-color:#C9D8FF;box-shadow:0 1px 6px rgba(37,96,232,.06)}.jas-house .jas-c:hover{border-color:#2560E8}'
      + '.jas-tag.jas-own{background:#2560E8;border-color:#2560E8;color:#fff}'
      + '.jas-house [data-ad-id="house_brief"]{background:#FFF9EA;border-color:#EED9A4}.jas-house [data-ad-id="house_brief"]:hover{border-color:#D9B95C}'
      + '.jas-house [data-ad-id="house_brief"] .jas-ic{background:#FFE7A8}.jas-house [data-ad-id="house_brief"] .jas-ic svg{stroke:#9A6B00}';
    document.head.appendChild(st);
  })();
  /* 모닝 브리핑 권유(assets/brief-cta.js): 광고 칸이 있는 화면이면 함께 불러옴(맞춤 권유·바닥 띠·누름 기록) */
  if (!document.querySelector('script[src*="brief-cta.js"]')) { var bs = document.createElement('script'); bs.src = B + 'assets/brief-cta.js?v=1'; bs.defer = true; document.head.appendChild(bs); }
  /* 휴대폰 한 화면(화면 높이만큼) 안에 이 칸 말고 광고가 이미 2개면 true — 상단 배너가 먼저 자리를 잡고, 나머지 칸이 비켜 감 */
  function crowded(el) {
    if (!mobile()) return false;
    var others = Array.prototype.filter.call(document.querySelectorAll('.jas:not([hidden]),.jad:not([hidden]),.bad:not([hidden])'), function (x) { return x !== el && x.offsetParent !== null; })
      .map(function (x) { return x.getBoundingClientRect().top; });
    return tooMany(others, el.getBoundingClientRect().top, root.innerHeight || 800);
  }
  function used(except) {
    return Array.prototype.map.call(document.querySelectorAll('.jas [data-ad-id]'), function (a) { return a.closest('.jas') === except ? '' : a.getAttribute('data-ad-id'); });
  }
  /* ---------- 화면 지역 ----------
     순서: JDJ_ADSLOT.setRegion() 으로 화면이 알려 준 값 → 칸(또는 감싼 요소)의 data-ad-region → 주소의 g(5자리)·d·k 안 5자리 코드·sd(sNN)
     → 홈에서 고른 지역(이 기기 jdj_home_region). 이름(시·도·시·군·구)이나 sNN 은 공개 index.json 으로 코드로 바꿈. 모르면 전국. */
  var HINT = null, IXP = null;
  function ix() { if (!IXP) IXP = fetch(JB.DATA + 'data/index.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); return IXP; }
  function hintOf(el) {
    if (HINT) return HINT;
    var a = el && el.closest && el.closest('[data-ad-region]'); if (a && normRegion(a.getAttribute('data-ad-region'))) return { code: a.getAttribute('data-ad-region') };
    try {
      var q = new URLSearchParams(location.search), g = q.get('g') || '', m = ((q.get('d') || '') + '|' + (q.get('k') || '')).match(/(?:^|[|!])(\d{5})(?=[|!]|$)/);
      if (/^\d{5}$/.test(g)) return { code: g };
      if (m) return { code: m[1] };
      if (/^s\d{2}$/.test(q.get('sd') || '')) return { sd: q.get('sd') };
      if (location.pathname.replace(/index\.html$/, '') === B) { var h = JSON.parse(localStorage.getItem('jdj_home_region') || 'null'); if (h && /^s\d{2}$/.test(h.sd || '')) return { sd: h.sd, g: /^\d{5}$/.test(h.g || '') ? h.g : '' }; }
    } catch (e) {}
    return null;
  }
  var short = function (s) { return String(s || '').replace(/(특별자치시|특별자치도|특별시|광역시|통합특별시|도)$/, ''); };
  /** 지역 힌트 → { sido: '11', sgg: '11680' } (Promise) */
  function resolve(h) {
    if (!h) return Promise.resolve({ sido: '', sgg: '' });
    var c = normRegion(h.code || h.g);
    if (c.length === 5) return Promise.resolve({ sido: c.slice(0, 2), sgg: c });
    if (c.length === 2 && !h.sd) return Promise.resolve({ sido: c, sgg: '' });
    return ix().then(function (IX) {
      if (!IX || !IX.sgg) return { sido: '', sgg: '' };
      var sdName = '';
      if (h.sd) sdName = ((IX.sido || []).filter(function (x) { return x.id === h.sd; })[0] || {}).name || '';
      if (h.sido) { var w = String(h.sido); sdName = ((IX.sido || []).filter(function (x) { return x.name === w || x.short === w || short(x.name) === short(w); })[0] || {}).name || ''; }
      if (!sdName) return { sido: '', sgg: '' };
      var keys = Object.keys(IX.sgg).filter(function (k) { return IX.sgg[k].sido === sdName; });
      var sido = keys.length ? keys[0].slice(0, 2) : '', sgg = '';
      if (h.gu) { var gu = String(h.gu); sgg = keys.filter(function (k) { return IX.sgg[k].name === gu; })[0] || keys.filter(function (k) { var n = IX.sgg[k].name; return n.slice(-gu.length) === gu && n.charAt(n.length - gu.length - 1) === ' '; })[0] || ''; }
      return { sido: sido, sgg: sgg };
    });
  }
  var hkey = function (h) { return h ? JSON.stringify(h) : ''; };
  var SEEN = {};
  function watch(el) {
    if (!('IntersectionObserver' in root)) return;
    if (el._io) el._io.disconnect();
    var t = null;
    el._io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        clearTimeout(t);
        if (!e.isIntersecting) return;
        t = setTimeout(function () {
          var a = el.querySelector('[data-ad-id]'); if (!a) return;
          var k = el.dataset.adSlot + '|' + a.getAttribute('data-ad-id'); if (SEEN[k]) return; SEEN[k] = 1;
          var house = /^house_/.test(a.getAttribute('data-ad-id'));
          track('ad_slot_view', { slot_id: el.dataset.adSlot, ad_id: a.getAttribute('data-ad-id'), house: house ? 1 : 0, cat: el.dataset.adCat, region: el._rgv || '전국' });
          if (a.getAttribute('data-ad-id') === 'house_brief') try { if (root.jdjStat) root.jdjStat('brief_cta', { cta_at: 'slot_' + el.dataset.adSlot, act: 'view' }); } catch (x) {}
          if (!house) agLog('adv', a.getAttribute('data-ad-id'));
        }, 1000);
      });
    }, { threshold: 0.5 });
    el._io.observe(el);
  }
  /* 그리기: 안내 광고를 먼저 바로 그리고(빈 칸 없음), 유료 광고 자료가 오면 같은 크기 칸에서 바꿔 끼움 */
  function draw(el) {
    var slot = el.dataset.adSlot, cat = el.dataset.adCat;
    var inLst = el.classList.contains('jas-li');
    if (!CATS[cat] || ((!inLst || cat === 'tax') && el.parentElement && el.parentElement.closest(BAN))) { el.hidden = true; return; }
    var top = el.hasAttribute('data-ad-top');
    el.classList.add('jas'); if (top) el.classList.add('jas-top');
    el.setAttribute('role', 'complementary'); el.setAttribute('aria-label', '광고');
    var put = function (ad) {
      el.innerHTML = html(ad, slot, cat, top); el.hidden = false;
      el.classList.toggle('jas-house', !!ad.house); el.setAttribute('aria-label', ad.house ? site() + ' 소식' : '광고');
      watch(el);
    };
    if (!el.firstChild) put(pick([], slot, cat, '', used(el))); else el.hidden = false;
    if (!top && crowded(el)) { el.hidden = true; return; }
    el._put = put; fill(el);
    if (!el._wired) {
      el._wired = 1;
      el.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('[data-ad-id]'); if (!a) return;
        var id = a.getAttribute('data-ad-id'), house = /^house_/.test(id);
        track('ad_slot_click', { slot_id: slot, ad_id: id, house: house ? 1 : 0, cat: cat, region: el._rgv || '전국' });
        if (!house) agLog('adc', id);
      });
    }
  }
  /* 광고 고르기: 화면 지역을 알아낸 뒤 그 지역 광고 → 전국 광고 → 안내 광고 */
  function fill(el) {
    var h = hintOf(el), tok = (el._ftok = (el._ftok || 0) + 1); el._hk = hkey(h);
    Promise.all([load(), resolve(h)]).then(function (v) {
      if (tok !== el._ftok || !el.isConnected || el.hidden || !el._put) return;
      var rg = v[1]; el._rgv = rg.sgg || rg.sido || '';
      var ad = pick(v[0], el.dataset.adSlot, el.dataset.adCat, kstToday(), used(el), rg);
      var cur = el.querySelector('[data-ad-id]');
      if (!cur || cur.getAttribute('data-ad-id') !== ad.id) el._put(ad);
    });
  }
  /** 화면이 지역을 알려 줌: { code: '11680' | '11' } · { sido: '서울', gu: '마포구' } · { sd: 's00', g: '11680' }. null 이면 주소 등에서 다시 찾음 */
  function setRegion(h) {
    HINT = h || null;
    document.querySelectorAll('.jas[data-ad-slot]').forEach(function (el) { if (!el.hidden && el._put && el._hk !== hkey(hintOf(el))) fill(el); });
  }
  /* 결과가 보일 때만 칸을 보여 줌 */
  function shown(sel) {
    var t = document.querySelector(sel);
    return !!(t && !t.hidden && t.offsetParent !== null && t.textContent.trim());
  }
  var GATES = [], gq = 0;
  function gateAll() { gq = 0; GATES.forEach(function (f) { f(); }); }
  function gate(el) {
    var sel = el.dataset.adAfter;
    var run = function () {
      var skip = el.dataset.adSkipIf && document.querySelector(el.dataset.adSkipIf);   /* 그 화면 전용 광고가 이미 보이면 비켜 줌 */
      if (shown(sel) && !skip) { if (el.hidden && !el._capped) { draw(el); if (el.hidden) el._capped = 1; } else if (!el.hidden && el._put && el._hk !== hkey(hintOf(el))) fill(el); }
      else if (!el.hidden) { el.hidden = true; }
    };
    GATES.push(run); run();
    if (GATES.length === 1 && 'MutationObserver' in root)   /* 결과는 나중에 그려지므로 문서 전체 변화를 보고 다음 프레임에 한 번만 확인 */
      new MutationObserver(function () { if (!gq) gq = (root.requestAnimationFrame || setTimeout)(gateAll); })
        .observe(document.body, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true });
  }
  /* 긴 목록 사이: 목록의 N번째 항목 뒤에 칸 하나 (목록이 N개보다 짧으면 넣지 않음) */
  function inList(tpl) {
    var sel = tpl.dataset.adList, every = Math.max(4, +tpl.dataset.adEvery || 10);
    var box = function () { return document.querySelector(sel); };
    var place = function () {
      var l = box(); if (!l || l._jasSkip) return;
      if (l.querySelector(':scope > .jas-li')) return;
      var items = Array.prototype.filter.call(l.children, function (x) { return !x.classList.contains('jas-li') && !x.hidden; });
      if (items.length <= every) return;
      var li = document.createElement(l.tagName === 'OL' || l.tagName === 'UL' ? 'li' : 'div');
      li.className = 'jas-li';
      li.dataset.adSlot = tpl.dataset.adSlot; li.dataset.adCat = tpl.dataset.adCat;
      /* N번째 뒤부터, 같은 화면에 광고가 이미 2개면 N개씩 더 아래로 */
      for (var k = every; k < items.length; k += every) {
        items[k - 1].after(li); draw(li);
        if (!li.hidden) return;
      }
      l._jasSkip = 1; li.remove();
    };
    place();
    var host = document.querySelector(tpl.dataset.adListHost || sel);
    if (host && 'MutationObserver' in root) new MutationObserver(function () { place(); }).observe(host, { childList: true, subtree: true });
  }
  function start() {
    var all = Array.prototype.slice.call(document.querySelectorAll('[data-ad-slot]'));
    all.sort(function (a, b) { return (b.hasAttribute('data-ad-top') ? 1 : 0) - (a.hasAttribute('data-ad-top') ? 1 : 0); });
    all.forEach(function (el) {
      if (el.classList.contains('jas-li') || el._jas) return; el._jas = 1;
      if (el.dataset.adList) { el.hidden = true; inList(el); return; }
      if (el.dataset.adAfter) gate(el); else draw(el);
    });
  }
  api.start = start; api.load = load; api.setRegion = setRegion; api.resolveRegion = resolve; api.regionHint = hintOf;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
