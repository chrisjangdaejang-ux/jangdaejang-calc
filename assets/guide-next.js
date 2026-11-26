/* 결과 화면 끝 '이어서 하면 좋은 것' 3개 + 고민 상담 시드 글 → 고민 해결 길잡이 링크 (공통 부품)
   - 켜짐: assets/config.js GUIDE_ENABLED === true, 또는 대표 미리 보기(주소 끝 ?preview=guide 로 한 번 열면 이 기기에서만 · ?preview=off 로 끔).
     꺼져 있으면 아무 칸도 만들지 않아요(자리 [data-gnext]·[data-gseed] 는 비어 있는 채로 숨김).
   - 자리: <div data-gnext="loan" hidden></div> — 값은 assets/guide/scenarios.json 의 after 표 키(loan·buy·report·switch·rentsw·tax·transfer·chungyak·jeonse·mine·zone·calendar).
     고민 상담 질문 화면(counsel/)은 시드 글에 <div data-gseed="s01"> 를 두고, counsel/seed.json 의 guide 값으로 이어지는 길잡이를 보여 줘요.
   - 조건 검색 화면 위쪽 '말로 물어보기' 입구: <div data-gask="report" hidden></div>(report·buy) — 꺼져 있으면 숨김.
   - 개인 값은 다루지 않아요(링크만). window.JDJ_GNEXT = { on, mount } */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var BASE = JB.SITE, PV = 'jdj_guide_preview';
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  (function () { try { var q = new URLSearchParams(location.search).get('preview'); if (q === 'guide') ls.set(PV, '1'); else if (q === 'off') ls.del(PV); } catch (e) {} })();
  function on() { return !!(root.JDJ_SITE && root.JDJ_SITE.GUIDE_ENABLED === true) || ls.get(PV) === '1'; }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var CSS = '.gnx{max-width:560px;margin:28px auto 8px;padding:0 20px;box-sizing:border-box}.gnx[hidden]{display:none}' +
    '.gnx h2{margin:0 0 4px;font-size:18px;font-weight:900;letter-spacing:-.4px;color:#191F28}.gnx p.s{margin:0 0 10px;font-size:14px;color:#4E5968}' +
    '.gnx ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}.gnx a{display:flex;align-items:center;gap:12px;min-height:60px;padding:12px 16px;border-radius:14px;border:1.5px solid #D4D1F5;background:#F7F9FF;color:#191F28;text-decoration:none}' +
    '.gnx a:hover{border-color:#4338CA}.gnx a b{display:block;font-size:15.5px;font-weight:800;line-height:1.4}.gnx a small{display:block;font-size:13.5px;color:#4E5968;margin-top:2px;line-height:1.45}' +
    '.gnx a .n{flex:none;width:28px;height:28px;border-radius:50%;background:#4338CA;color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center}.gnx a .go{margin-left:auto;flex:none;color:#4338CA;font-size:20px;font-weight:800}' +
    '.gsd{display:flex;align-items:center;gap:10px;margin:12px 0 0;padding:12px 14px;border-radius:12px;background:#F5F4FD;border:1.5px solid #C9C6F2;color:#3730A3;text-decoration:none;font-weight:800;font-size:15px;min-height:48px}' +
    '.gsd small{display:block;font-weight:500;color:#4E5968;font-size:13px}.gask{margin:0 0 12px;background:var(--blue-l,#F5F4FD);color:var(--blue-d,#3730A3)}';
  function css() { if (document.getElementById('gnxCss')) return; var s = document.createElement('style'); s.id = 'gnxCss'; s.textContent = CSS; document.head.appendChild(s); }
  var DATA = null;
  function data() { return DATA || (DATA = fetch(BASE + 'assets/guide/scenarios.json?v=9', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { DATA = null; return null; })); }
  function link(id, from) { return BASE + 'solve/?s=' + encodeURIComponent(id) + (from ? '&from=' + encodeURIComponent(from) : ''); }
  function mount(el) {
    var key = el.getAttribute('data-gnext'); if (!key || el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1');
    data().then(function (D) {
      if (!D || !D.after || !D.after[key]) return;
      var list = D.after[key].map(function (id) { return D.sc.filter(function (s) { return s.id === id; })[0]; }).filter(Boolean).slice(0, 3);
      if (!list.length) return;
      css(); el.className = (el.className + ' gnx').trim();
      el.innerHTML = '<h2>이어서 하면 좋은 것</h2><p class="s">이 결과와 함께 많이 챙기는 것을 내 조건으로 바로 계산해 드려요.</p><ol>' + list.map(function (s, i) {
        return '<li><a href="' + esc(link(s.id, key)) + '" data-track="gnext_' + esc(key) + '_' + esc(s.id) + '"><span class="n">' + (i + 1) + '</span><span><b>' + esc(s.t) + '</b><small>' + esc(s.sub || '') + '</small></span><span class="go" aria-hidden="true">›</span></a></li>';
      }).join('') + '</ol>';
      el.hidden = false;
    });
  }
  var SEED = null;
  function seedMount(el) {
    var sid = el.getAttribute('data-gseed'); if (!sid || el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1');
    (SEED || (SEED = fetch(BASE + 'counsel/seed.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }))).then(function (S) {
      var it = S && S.items ? S.items.filter(function (x) { return x && x.sid === sid; })[0] : null;
      if (!it || !it.guide) return;
      css();
      el.innerHTML = '<a class="gsd" href="' + esc(link(it.guide, 'counsel')) + '" data-track="gseed_' + esc(it.guide) + '"><span>내 조건으로 바로 계산해 보기 ›<small>고민 해결 길잡이가 짧은 질문 몇 개로 숫자와 다음 단계를 찾아 드려요</small></span></a>';
    });
  }
  /* 조건 검색 화면 위쪽 '말로 물어보기' 입구: <div data-gask="report" hidden></div> — 길잡이가 꺼져 있으면 숨긴 채로 둬요.
     길잡이는 같은 계산(조건 검색 엔진)을 쓰는 지름길이라, 한 문장으로 물어도 이 화면과 같은 결과가 나와요. */
  var ASK = { report: '현금 10억 + 대출로 살 수 있는 서울 아파트', buy: '현금 3억, 연봉 7천이면 얼마짜리 집까지 살 수 있어요?' };
  function askMount(el) {
    var key = el.getAttribute('data-gask'); if (!key || el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1'); css();
    el.innerHTML = '<a class="gsd gask" href="' + esc(BASE + 'solve/?chat=1&from=' + encodeURIComponent(key)) + '" data-track="gask_' + esc(key) + '"><span>말로 물어보기 ›<small>조건을 하나씩 고르지 않고 ‘' + esc(ASK[key] || '내 조건으로 살 수 있는 집') + '’처럼 한 문장으로 물어도 이 화면과 같은 계산으로 답해 드려요</small></span></a>';
    el.hidden = false;
  }
  function scan() { if (!on()) return; document.querySelectorAll('[data-gnext]').forEach(mount); document.querySelectorAll('[data-gseed]').forEach(seedMount); document.querySelectorAll('[data-gask]').forEach(askMount); }
  function start() {
    scan();
    if (!on() || typeof MutationObserver === 'undefined') return;
    var t = null; new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = null; scan(); }, 150); }).observe(document.body, { childList: true, subtree: true });
  }
  function boot() {
    if (root.JDJ_SITE) return start();
    /* 설정 파일을 읽지 않는 화면(세금·청약·내 집 마련)은 여기서 한 번 읽어요 */
    var s = document.createElement('script'); s.src = BASE + 'assets/config.js?v=12'; s.onload = start; s.onerror = start; document.head.appendChild(s);
  }
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  root.JDJ_GNEXT = { on: on, mount: mount };
})(typeof window !== 'undefined' ? window : this);
