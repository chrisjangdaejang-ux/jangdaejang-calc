/* 집예보 모닝 브리핑 구독 권유 (assets/brief-cta.js) — 자체 서비스 안내라 '광고' 꼬리표를 달지 않음(외부 광고는 assets/ad-slot.js)
   1) 첫 화면 카드  : <div id="bctaHome" data-bcta-home></div> — 오늘 brief/market.json 숫자 2~3줄(자료에 있는 값만) + [7일 무료로 받아 보기]
   2) 맞춤 권유     : <div data-bcta="mine_res" data-g="11710" data-dn="잠실동" hidden></div> — 결과가 그려지면 그 동네를 미리 채운 구독 링크.
                      한 화면에 한 번만(먼저 보인 자리 하나 — 같은 자리가 다시 그려지면 그 자리만 다시 채움). data-g 가 없으면 화면 지역(JDJ_REGION.sgg·홈 지역)
   3) 관심 단지 ★ 직후 : assets/watch.js 알림 줄 끝에 starLine(단지) 한 줄
   4) 바닥 띠       : 아래 STRIP_PAGES 화면에서 조금 내려 읽은 뒤에만. 하루 1번, [닫기] 누르면 7일 동안 안 보임(localStorage — 막혀 있으면 이번 화면만)
   - 이미 구독 중(jdj_brief_sub = '1')이면 2)~4)는 그리지 않고, 1)은 '오늘 브리핑 보기'로 바뀜
   - 기록: jdjStat('brief_cta', {cta_at: 자리, act: view|click|close}) + 누름은 data-track="bcta_자리" — 구독 화면은 주소의 cta= 로 어느 자리에서 왔는지 받아
     체험 시작 때 act: 'sub' 로 남김(brief/subscribe/). 주소 이름 src 는 유입 채널(assets/track.js)이라 쓰지 않음 */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var B = JB.SITE, DATA = JB.DATA + 'data/';
  var AT = ['home_card', 'mine_res', 'buy_res', 'ta_done', 'watch_star', 'strip'];
  var STRIP_PAGES = ['mine', 'rank', 'jeonse', 'chungyak', 'bunyang', 'villa', 'tax', 'switch', 'buy', 'loan', 'ask', 'weekly', 'move', 'land', 'quiz', 'guide', 'sell'];
  var STRIP_KEY = 'jdj_bcta_strip', MUTE_KEY = 'jdj_bcta_mute', HIDE_DAYS = 7;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var nf = function (n) { return Number(n).toLocaleString('ko-KR'); };
  function site() { var s = root.JDJ_SITE && root.JDJ_SITE.SITE_NAME; return (s && String(s).trim()) || '집예보'; }
  function kst(now) { return new Date((now == null ? Date.now() : now) + 9 * 3600 * 1000).toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  var okG = function (g) { return /^\d{5}$/.test(String(g || '')); };
  var okDn = function (d) { return /^[가-힣0-9·.]{1,20}$/.test(String(d || '')); };

  /** 구독 화면 주소: 동네(d=구코드-동, brief/subscribe 가 받아 첫 동네로 넣음) + 어느 자리에서 왔는지(cta) */
  function subUrl(at, g, dn) {
    var q = [];
    if (okG(g)) q.push('d=' + encodeURIComponent(g + (okDn(dn) ? '-' + dn : '')));
    if (AT.indexOf(at) >= 0 || /^slot_[a-z][a-z_]{2,30}$/.test(at)) q.push('cta=' + at);
    return B + 'brief/subscribe/' + (q.length ? '?' + q.join('&') : '');
  }
  /** 바닥 띠를 오늘 보여도 되는지 — st = {day: 마지막으로 보인 날, until: 닫은 뒤 다시 보일 수 있는 첫날} */
  function stripDue(st, today) {
    st = st || {};
    if (st.until && today < st.until) return false;
    return st.day !== today;
  }
  /** 첫 화면 미리 보기 — market.json 에 있는 숫자만 씀(없는 값은 빼고, 지어내지 않음).
      stats = 전국 새 매매·신고가·크게 내린 거래(최근 2년 최고가보다 10% 넘게 낮은 거래) 건수, lines = 서울·이번 주 청약 한 줄씩 */
  function preview(M) {
    var o = { stats: [], lines: [] }; if (!M) return o;
    var k = M.kr || {}, s = M.seoul || {}, cy = M.cy || {};
    if (k.n > 0) o.stats = [[k.n, '전국 새 매매'], [k.nhi || 0, '신고가'], [k.ndrop || 0, '크게 내린 거래']];
    if (s.n > 0) o.lines.push({ k: '서울', t: '새 매매 ' + nf(s.n) + '건 중 신고가 ' + nf(s.nhi || 0) + '건' });
    if (cy.n > 0) o.lines.push({ k: '청약', t: '이번 주 접수 ' + nf(cy.n) + '곳' + (cy.hh ? ' · ' + nf(cy.hh) + '세대' : '') });
    return o;
  }
  /** '2026-11-26' → '11월 26일(목)' */
  function dateLabel(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return (+m[2]) + '월 ' + (+m[3]) + '일(' + '일월화수목금토'.charAt(d.getUTCDay()) + ')';
  }
  /** 동네 이름표: 동이 있으면 '잠실동', 없으면 '송파구', 모르면 '' */
  function placeName(g, dn, IX) {
    if (okDn(dn)) return dn;
    var v = IX && IX.sgg && IX.sgg[g]; return v && v.name ? String(v.name) : '';
  }
  /** 첫 화면 카드 HTML */
  function homeHtml(o) {
    o = o || {};
    var S = site(), place = o.place || '', pv0 = o.pv || { stats: [], lines: [] }, sub = !!o.sub;
    var head = place ? esc(place) + ' 새 거래, 아침 7시에 받아 보세요' : '우리 동네 새 거래, 아침 7시에 받아 보세요';
    var has = pv0.stats.length || pv0.lines.length;
    /* 자료가 오기 전에는 같은 높이의 빈 칸(아래 내용이 튀지 않게) */
    var pv = '<div class="bc-pv' + (has ? '' : ' bc-wait') + '"><p class="bc-pvh"><span>오늘 브리핑 미리 보기</span>' + (o.date ? '<small>' + esc(o.date) + '</small>' : '') + '</p>'
      + (pv0.stats.length ? '<div class="bc-st">' + pv0.stats.map(function (x) { return '<div><b>' + nf(x[0]) + '건</b><small>' + esc(x[1]) + '</small></div>'; }).join('') + '</div>' : '')
      + (pv0.lines.length ? '<p class="bc-ln">' + pv0.lines.map(function (l) { return '<span><b>' + esc(l.k) + '</b> ' + esc(l.t) + '</span>'; }).join('') + '</p>' : '')
      + (has ? '' : '<p class="bc-ln"><span>' + (o.failed ? '오늘 미리 보기를 불러오지 못했어요. 아래 전체 보기에서 확인해 주세요.' : '불러오는 중이에요…') + '</span></p>') + '</div>';
    var go = sub
      ? '<a class="bc-btn" href="' + esc(B + 'brief/') + '" data-track="bcta_home_card_open" data-bcta-at="home_card">오늘 브리핑 보기</a>'
      : '<a class="bc-btn" href="' + esc(subUrl('home_card', o.g, '')) + '" data-track="bcta_home_card" data-bcta-at="home_card">7일 무료로 받아 보기<small>카드 등록 없이 시작 · 자동 결제 없음</small></a>';
    return '<div class="bc-top"><span class="bc-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="4"/><path d="M12 3v2M4.9 6.9l1.4 1.4M19.1 6.9l-1.4 1.4M3 13h2M19 13h2M4 20h16"/></svg></span>'
      + '<span class="bc-ey">' + esc(S) + ' 모닝 브리핑 · 매일 아침 7시</span></div>'
      + '<h2 class="bc-h">' + head + '</h2>'
      + '<p class="bc-s">새 실거래·신고가·급매·청약 소식을 한 번에 모아 드려요</p>'
      + pv + go
      + '<p class="bc-n">' + (sub ? '구독 중이에요 · <a href="' + esc(B + 'brief/manage/') + '" data-track="bcta_home_card_manage">받을 동네 바꾸기 ›</a>'
        : '<a href="' + esc(B + 'brief/') + '" data-track="bcta_home_card_sample">오늘 브리핑 전체 보기 ›</a>') + '</p>';
  }
  /** 맞춤 권유 한 줄 HTML */
  function nudgeHtml(at, g, dn, place) {
    var t = place ? esc(place) + ' 새 거래를 매일 아침 받아 보세요' : '우리 동네 새 거래를 매일 아침 받아 보세요';
    return '<a class="bn-a" href="' + esc(subUrl(at, g, dn)) + '" data-track="bcta_' + esc(at) + '" data-bcta-at="' + esc(at) + '">'
      + '<span class="bn-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="4"/><path d="M12 3v2M4.9 6.9l1.4 1.4M19.1 6.9l-1.4 1.4M3 13h2M19 13h2M4 20h16"/></svg></span>'
      + '<span class="bn-t"><b>' + t + '</b><small>새 실거래·신고가·청약을 아침 7시에 · 7일 무료 · 자동 결제 없음</small></span><span class="bn-go">받아 보기 ›</span></a>'
      + '<button type="button" class="bn-x" aria-label="이 안내 닫기" data-bcta-x="' + esc(at) + '">×</button>';
  }

  var api = { AT: AT, STRIP_PAGES: STRIP_PAGES, HIDE_DAYS: HIDE_DAYS, subUrl: subUrl, stripDue: stripDue, preview: preview, dateLabel: dateLabel, placeName: placeName, homeHtml: homeHtml, nudgeHtml: nudgeHtml, kst: kst, addDays: addDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;
  if (root.JDJ_BRIEFCTA) return;
  root.JDJ_BRIEFCTA = api;

  /* ---------- 화면 ---------- */
  var ls = {
    get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { root.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };
  var subbed = function () { return ls.get('jdj_brief_sub') === '1'; };
  var stat = function (at, act) { try { if (root.jdjStat) root.jdjStat('brief_cta', { cta_at: at, act: act }); } catch (e) {} };
  var J = function (u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
  var IXP = null; function ix() { if (!IXP) IXP = J(DATA + 'index.json'); return IXP; }
  function homeRegion() { try { var h = JSON.parse(ls.get('jdj_home_region') || 'null'); return h && okG(h.g) ? h.g : ''; } catch (e) { return ''; } }
  function pageRegion() { var R = root.JDJ_REGION; return R && okG(R.sgg) ? R.sgg : homeRegion(); }

  function css() {
    if (document.getElementById('bctaCss')) return;
    var s = document.createElement('style'); s.id = 'bctaCss';
    s.textContent =
      /* 첫 화면 카드 */
      '.bcta-home{margin:14px 20px 0;padding:18px 18px 16px;border-radius:18px;background:linear-gradient(180deg,#FFF6DF 0%,#FFFCF4 70%);border:1.5px solid #EED9A4;color:#191F28;box-shadow:0 2px 12px rgba(184,148,42,.12)}' +
      '.bcta-home[hidden]{display:none}' +
      '.bcta-home .bc-top{display:flex;align-items:center;gap:8px;margin:0 0 6px}' +
      '.bcta-home .bc-ic{flex:none;width:30px;height:30px;border-radius:9px;background:#FFE7A8;display:inline-flex;align-items:center;justify-content:center}' +
      '.bcta-home .bc-ic svg{width:19px;height:19px;fill:none;stroke:#9A6B00;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
      '.bcta-home .bc-ey{font-size:13.5px;font-weight:800;color:#8A5F00;letter-spacing:-.2px}' +
      '.bcta-home .bc-h{margin:0;font-size:20px;line-height:1.38;font-weight:900;letter-spacing:-.5px;word-break:keep-all}' +
      '.bcta-home .bc-s{margin:4px 0 0;font-size:14.5px;line-height:1.5;color:#3E4754;word-break:keep-all}' +
      '.bcta-home .bc-pv{margin:12px 0 0;padding:10px 12px 9px;border-radius:12px;background:#fff;border:1px solid #F0E3C2;min-height:108px;box-sizing:border-box}' +
      '.bcta-home .bc-pvh{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:0 0 7px;font-size:13px;font-weight:800;color:#4E5968}' +
      '.bcta-home .bc-pvh small{font-size:12.5px;font-weight:600;color:#5F6B7A}' +
      '.bcta-home .bc-st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}' +
      '.bcta-home .bc-st div{padding:6px 4px;border-radius:9px;background:#F7F8FA;text-align:center;min-width:0}' +
      '.bcta-home .bc-st b{display:block;font-size:16.5px;font-weight:900;letter-spacing:-.3px;font-variant-numeric:tabular-nums;line-height:1.25}' +
      '.bcta-home .bc-st small{display:block;font-size:12px;color:#4E5968;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bcta-home .bc-ln{display:flex;flex-wrap:wrap;gap:2px 12px;margin:7px 0 0;font-size:13.5px;line-height:1.45;color:#191F28;word-break:keep-all}' +
      '.bcta-home .bc-ln b{font-size:12.5px;font-weight:800;color:#4338CA;margin-right:2px}' +
      '.bcta-home .bc-wait .bc-ln{color:#5F6B7A}' +
      '.bcta-home .bc-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:58px;margin:14px 0 0;border-radius:14px;background:#4338CA;color:#fff;font-size:17.5px;font-weight:900;text-decoration:none;letter-spacing:-.3px;box-shadow:0 4px 14px rgba(67,56,202,.28)}' +
      '.bcta-home .bc-btn:hover{background:#3730A3}' +
      '.bcta-home .bc-btn small{display:block;margin-top:1px;font-size:12.5px;font-weight:600;opacity:.92;letter-spacing:0}' +
      '.bcta-home .bc-n{margin:8px 0 0;font-size:13px;color:#4E5968;text-align:center;line-height:1.5;word-break:keep-all}' +
      '.bcta-home .bc-n a{color:#4338CA;font-weight:700;text-decoration:none}' +
      '@media(max-width:420px){.bcta-home{margin-top:8px;padding:11px 14px 10px}.bcta-home .bc-top{margin-bottom:3px}.bcta-home .bc-ic{width:26px;height:26px}.bcta-home .bc-h{font-size:18px}.bcta-home .bc-s{font-size:13px;margin-top:2px;letter-spacing:-.2px}'
        + '.bcta-home .bc-pv{margin-top:7px;padding:6px 10px 7px;min-height:0}.bcta-home .bc-pvh{margin-bottom:4px}.bcta-home .bc-st div{padding:3px 2px}.bcta-home .bc-st b{font-size:15.5px}.bcta-home .bc-ln{margin-top:5px;font-size:13px}.bcta-home .bc-btn{margin-top:9px;min-height:54px;font-size:17px}}' +
      /* 맞춤 권유 한 줄 */
      '.bcta-n{position:relative;display:block;margin:16px 0;max-width:100%}' +
      '.bcta-n[hidden]{display:none!important}' +
      '.bcta-n .bn-a{display:flex;align-items:center;gap:12px;padding:12px 40px 12px 14px;border-radius:14px;background:#FFF9EA;border:1px solid #EED9A4;color:#191F28;text-decoration:none}' +
      '.bcta-n .bn-a:hover{border-color:#D9B95C}' +
      '.bcta-n .bn-ic{flex:none;width:36px;height:36px;border-radius:10px;background:#FFE7A8;display:inline-flex;align-items:center;justify-content:center}' +
      '.bcta-n .bn-ic svg{width:21px;height:21px;fill:none;stroke:#9A6B00;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
      '.bcta-n .bn-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.bcta-n .bn-t b{font-size:15px;font-weight:800;line-height:1.4;word-break:keep-all}' +
      '.bcta-n .bn-t small{font-size:12.5px;color:#4E5968;line-height:1.45;word-break:keep-all}' +
      '.bcta-n .bn-go{flex:none;font-size:13.5px;font-weight:800;color:#4338CA;white-space:nowrap}' +
      '.bcta-n .bn-x{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;background:none;color:#5F6B7A;font-size:20px;line-height:1;border-radius:8px;cursor:pointer}' +
      '.bcta-n .bn-x:hover{background:rgba(0,0,0,.05)}' +
      '@media(max-width:420px){.bcta-n .bn-go{display:none}}' +
      /* 관심 단지 알림 줄 안 한 줄 */
      '.bcta-tl{display:block;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.18)}' +
      '.bcta-tl a{color:#FFD873!important;font-weight:800}' +
      /* 바닥 띠: 휴대폰은 아래 탭 바로 위 한 줄(높이 52px), PC 는 오른쪽 아래 작은 카드 */
      '.bcta-strip{position:fixed;left:10px;right:10px;bottom:calc(66px + env(safe-area-inset-bottom));z-index:55;display:flex;align-items:center;gap:10px;height:52px;padding:0 6px 0 12px;border-radius:14px;background:#191F28;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.22);max-width:540px;margin:0 auto}' +
      '.bcta-strip[hidden]{display:none!important}' +
      '.bcta-strip .bs-a{flex:1;min-width:0;display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;height:100%}' +
      '.bcta-strip .bs-t{flex:1;min-width:0;font-size:14px;font-weight:700;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bcta-strip .bs-go{flex:none;height:34px;display:inline-flex;align-items:center;padding:0 12px;border-radius:10px;background:#FFD873;color:#191F28;font-size:13.5px;font-weight:900;white-space:nowrap}' +
      '.bcta-strip .bs-x{flex:none;width:36px;height:36px;border:0;background:none;color:#C9CED6;font-size:20px;line-height:1;cursor:pointer;border-radius:10px}' +
      '.bcta-strip .bs-x:hover{background:rgba(255,255,255,.08)}' +
      '@media(min-width:1024px){.bcta-strip{left:auto;right:20px;bottom:20px;width:440px;margin:0}}' +
      '@media print{.bcta-home,.bcta-n,.bcta-strip{display:none!important}}';
    document.head.appendChild(s);
  }

  /* 누름·닫기·보임 기록 */
  var SEEN = {};
  function seen(el, at) {
    if (SEEN[at] || !('IntersectionObserver' in root)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !SEEN[at]) { SEEN[at] = 1; stat(at, 'view'); io.disconnect(); } }); }, { threshold: 0.5 });
    io.observe(el);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-bcta-at]'); if (a) stat(a.getAttribute('data-bcta-at'), 'click');
    var x = e.target.closest && e.target.closest('[data-bcta-x]');
    if (x) {
      var at = x.getAttribute('data-bcta-x'); stat(at, 'close'); CLOSED = 1;
      ls.set(MUTE_KEY, addDays(kst(), 3));   /* 맞춤 권유를 닫으면 3일 동안 쉬어요 */
      document.querySelectorAll('[data-bcta]').forEach(function (n) { n.hidden = true; n.innerHTML = ''; });
    }
  }, true);

  /* ---------- 1) 첫 화면 카드 ---------- */
  function home() {
    var el = document.querySelector('[data-bcta-home]'); if (!el || el._done) return; el._done = 1;
    css(); el.classList.add('bcta-home');
    var g = homeRegion(), sub = subbed();
    var paint = function (M, IX, failed) {
      var place = g ? placeName(g, '', IX) : '';
      el.innerHTML = homeHtml({ pv: preview(M), date: M ? dateLabel(M.date) : '', place: place, g: g, sub: sub, failed: failed });
      el.hidden = false;
    };
    paint(null, null);   /* 자료가 오기 전에도 단추는 바로 보이게 */
    seen(el, 'home_card');
    Promise.all([J(DATA + 'brief/market.json'), g ? ix() : Promise.resolve(null)]).then(function (v) { paint(v[0], v[1], !v[0]); });
  }

  /* ---------- 2) 맞춤 권유(한 화면 한 번) ---------- */
  var FIRST = '', CLOSED = 0;
  function muted() { var u = ls.get(MUTE_KEY); return !!(u && kst() < u); }
  function visible(n) { return !!(n && n.isConnected && n.offsetParent !== null); }
  function fillOne(n) {
    var at = n.getAttribute('data-bcta');
    if (AT.indexOf(at) < 0 || CLOSED || subbed() || muted() || (FIRST && FIRST !== at)) { n.hidden = true; return; }
    var aft = n.getAttribute('data-bcta-after'), host = aft ? document.querySelector(aft) : null;
    if (aft && !(host && !host.hidden && host.offsetParent !== null)) { n.hidden = true; return; }
    var g = n.getAttribute('data-g') || '', dn = n.getAttribute('data-dn') || '';
    if (!okG(g)) { g = pageRegion(); dn = ''; }
    var key = g + '|' + dn;
    if (n._k === key && !n.hidden) return;
    n._k = key; css(); n.classList.add('bcta-n'); n.setAttribute('role', 'complementary'); n.setAttribute('aria-label', site() + ' 모닝 브리핑 안내');
    n.innerHTML = nudgeHtml(at, g, dn, okDn(dn) ? dn : ''); n.hidden = false;
    FIRST = at; seen(n, at);
    if (okG(g) && !okDn(dn)) ix().then(function (IX) { var p = placeName(g, '', IX); if (p && n._k === key) n.innerHTML = nudgeHtml(at, g, dn, p); });
  }
  var q = 0;
  function scan() {
    q = 0;
    var ns = Array.prototype.slice.call(document.querySelectorAll('[data-bcta]'));
    ns.forEach(fillOne);
    /* 같은 자리 칸이 여럿 보이면(다시 그린 화면) 첫 칸만 */
    var shown = ns.filter(function (n) { return !n.hidden && visible(n); });
    shown.slice(1).forEach(function (n) { n.hidden = true; });
  }
  function watchDom() {
    if (!('MutationObserver' in root)) return;
    new MutationObserver(function () { if (!q) q = (root.requestAnimationFrame || setTimeout)(scan); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-g', 'data-dn'] });
  }

  /* ---------- 3) 관심 단지 ★ 넣은 직후(assets/watch.js 알림 줄) ---------- */
  /** p = 관심 단지 {code, dong, apt} — 보여도 되면 한 줄 HTML, 아니면 '' (한 화면 한 번) */
  function starLine(p) {
    if (!p || CLOSED || subbed() || muted() || (FIRST && FIRST !== 'watch_star')) return '';
    FIRST = 'watch_star'; stat('watch_star', 'view');
    var dn = okDn(p.dong) ? p.dong : '';
    return '<span class="bcta-tl">' + (dn ? esc(dn) : '이 동네') + ' 새 거래도 매일 아침 받아 볼까요? <a href="' + esc(subUrl('watch_star', p.code, dn)) + '" data-track="bcta_watch_star" data-bcta-at="watch_star">7일 무료로 받아 보기 ›</a></span>';
  }
  api.starLine = function (p) { css(); return starLine(p); };

  /* ---------- 4) 바닥 띠 ---------- */
  function stripPage() {
    var p = location.pathname.replace(/index\.html$/, '');
    if (p.indexOf(B) !== 0) return false;
    var seg = p.slice(B.length).split('/')[0];
    return STRIP_PAGES.indexOf(seg) >= 0;
  }
  function stripState() { try { return JSON.parse(ls.get(STRIP_KEY) || 'null') || {}; } catch (e) { return {}; } }
  function strip() {
    if (!stripPage() || subbed() || document.querySelector('.bcta-strip')) return;
    var today = kst(); if (!stripDue(stripState(), today)) return;
    var fired = 0;
    var go = function () {
      if (fired) return;
      /* 조금 읽은 뒤에만(한 화면의 60% 넘게 내렸을 때) · 이 화면에서 이미 맞춤 권유가 보였거나 다른 안내(홈 화면 추가·공유 안내·고정 단추)가 떠 있으면 쉼 */
      if ((root.scrollY || 0) < (root.innerHeight || 800) * 0.6) return;
      fired = 1; root.removeEventListener('scroll', go);
      if (FIRST || CLOSED || document.querySelector('.jdjpwa,#stk:not([hidden]),.jsh-toast')) return;
      var st = stripState(); st.day = today; if (!ls.set(STRIP_KEY, JSON.stringify(st))) return;   /* 기록을 못 남기는 브라우저면 매번 뜨지 않게 아예 안 보임 */
      css();
      var g = pageRegion(), el = document.createElement('div');
      el.className = 'bcta-strip'; el.setAttribute('role', 'complementary'); el.setAttribute('aria-label', site() + ' 모닝 브리핑 안내');
      el.innerHTML = '<a class="bs-a" href="' + esc(subUrl('strip', g, '')) + '" data-track="bcta_strip" data-bcta-at="strip"><span class="bs-t">매일 아침 7시, 우리 동네 새 거래 소식</span><span class="bs-go">7일 무료</span></a>'
        + '<button type="button" class="bs-x" aria-label="닫기 — 7일 동안 보지 않기">×</button>';
      el.querySelector('.bs-x').onclick = function () {
        var s2 = stripState(); s2.until = addDays(today, HIDE_DAYS); ls.set(STRIP_KEY, JSON.stringify(s2));
        stat('strip', 'close'); el.remove();
      };
      document.body.appendChild(el); stat('strip', 'view');
    };
    root.addEventListener('scroll', go, { passive: true });
  }

  function start() { home(); scan(); watchDom(); strip(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
