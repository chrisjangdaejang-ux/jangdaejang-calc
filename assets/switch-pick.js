/* 첫 화면 '이사 갈 집 구하기' 칸: 처음 누르면 [집이 있어요]·[전월세 살아요] 두 단추를 칸 바로 아래에 펼치고,
   고른 값은 기기에 기억(localStorage, 막혀 있으면 기억만 안 함)해서 다음부터는 칸을 누르면 바로 그 화면으로 가요.
   - 자바스크립트가 꺼져 있으면 칸의 원래 주소(switch/)로 그대로 이동(점진적 향상)
   - 이동한 화면 위쪽 '자가 | 전월세' 탭은 그대로라 언제든 바꿀 수 있어요
   - 클릭 집계: 단추 data-track(home_switch_pick_own / home_switch_pick_rent) + jdjStat feature_use
   검증: node tools/switch-pick-test.js </dev/null */
(function (root) {
  'use strict';
  var KEY = 'jdj_home_switch_pick';
  var OPTS = [
    { v: 'own', href: 'switch/', b: '집이 있어요', s: '팔고 이사 가기', track: 'home_switch_pick_own' },
    { v: 'rent', href: 'switch/rent/', b: '전월세 살아요', s: '보증금으로 이사 갈 집 찾기', track: 'home_switch_pick_rent' }
  ];
  function opt(v) { for (var i = 0; i < OPTS.length; i++) if (OPTS[i].v === v) return OPTS[i]; return null; }
  function load(ls) { try { var v = ls && ls.getItem(KEY); return opt(v) ? v : null; } catch (e) { return null; } }
  function save(ls, v) { if (!opt(v)) return false; try { ls.setItem(KEY, v); return true; } catch (e) { return false; } }
  function lsOf(w) { try { return w.localStorage; } catch (e) { return null; } }

  function mount(a, w) {
    w = w || root; if (!a || a.dataset.swpick) return null;
    var d = w.document, ls = lsOf(w), id = 'swPick';
    a.dataset.swpick = '1';
    var picked = load(ls);
    if (picked) { a.setAttribute('href', opt(picked).href); return { picked: picked }; }   // 기억한 화면으로 바로(가운데 클릭·새 탭도 같은 곳)

    var box = null;
    a.setAttribute('role', 'button');
    a.setAttribute('aria-expanded', 'false');
    a.setAttribute('aria-controls', id);
    function build() {
      box = d.createElement('div');
      box.className = 'swpick'; box.id = id; box.setAttribute('role', 'group'); box.setAttribute('aria-label', '지금 사는 집');
      box.innerHTML = '<p class="swpick-q">지금 사는 집이 어떤가요?</p><div class="swpick-row">' + OPTS.map(function (o) {
        return '<a href="' + o.href + '" data-track="' + o.track + '" data-pick="' + o.v + '"><b>' + o.b + '</b><small>' + o.s + '</small></a>';
      }).join('') + '</div><p class="swpick-n">고른 화면은 기억해 두었다가 다음부터 바로 열어 드려요. 화면 위 탭에서 언제든 바꿀 수 있어요.</p>';
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('a[data-pick]'); if (!b) return;
        save(ls, b.getAttribute('data-pick'));
        if (w.jdjStat) w.jdjStat('feature_use', { feature: b.getAttribute('data-track') });
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); a.focus(); }
        else if (e.key === ' ' && e.target.closest && e.target.closest('a[data-pick]')) { e.preventDefault(); e.target.click(); }
      });
      a.parentNode.insertBefore(box, a.nextSibling);
    }
    function open() {
      if (!box) build(); box.hidden = false;
      a.setAttribute('aria-expanded', 'true'); a.classList.add('swpick-on');
      a.parentNode.classList.add('swpick-open');
      var f = box.querySelector('a[data-pick]'); if (f) f.focus();
      if (box.scrollIntoView && w.innerHeight) { var r = box.getBoundingClientRect(); if (r.bottom > w.innerHeight) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    }
    function close() {
      if (box) box.hidden = true;
      a.setAttribute('aria-expanded', 'false'); a.classList.remove('swpick-on');
      a.parentNode.classList.remove('swpick-open');
    }
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;   // 새 탭으로 열기는 원래 주소 그대로
      e.preventDefault();
      if (a.getAttribute('aria-expanded') === 'true') close(); else open();
    });
    a.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); a.click(); } });
    return { open: open, close: close };
  }

  var API = { KEY: KEY, OPTS: OPTS, load: load, save: save, mount: mount };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else {
    root.JDJ_SWPICK = API;
    var go = function () { mount(root.document.querySelector('a[data-track="home_to_switch"]')); };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', go); else go();
  }
})(typeof window !== 'undefined' ? window : this);
