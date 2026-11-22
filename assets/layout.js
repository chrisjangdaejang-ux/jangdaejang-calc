/* 집코드 화면 배치 도우미 (assets/layout.css 와 함께, docs/design_guide.md)
   1) PC 오른쪽 요약 칸: <body data-lay="side" data-lay-key=".stats" data-lay-title=".dhead h2"> (본문 칸 = [data-lay-main] 또는 main)
      - data-lay-title 이 없으면 핵심 숫자 칸이 든 카드의 h2 를 제목으로
      - 1200px 이상에서만 main 오른쪽에 붙는다. 휴대폰에서는 아무것도 하지 않는다.
      - 핵심 숫자: data-lay-key 로 고른 칸을 그대로 복사해 보여 줌(읽기 전용, 숫자를 새로 만들지 않음)
      - 이 화면 목차: main 안의 보이는 h2 제목(data-lay-toc 로 바꿀 수 있음)으로 만들고, 누르면 그 칸으로 이동. 지금 보는 칸은 파랑
   2) 휴대폰 긴 칸 접기: <body data-lay-fold="#polSec .panel,#taxSec">
      - 767px 이하에서 900px 보다 긴 칸만 접고 '펼쳐 보기' 버튼. 내용은 그대로 두고 높이만 줄인다.
   화면 내용이 나중에 그려져도(결과 화면) 따라서 다시 만든다. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var PC = '(min-width:1200px)', MO = '(max-width:767px)';
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var txt = function (el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('small,.sr,button,.jw-star,[aria-hidden="true"]'), function (x) { x.remove(); });
    Array.prototype.forEach.call(c.querySelectorAll('*'), function (x) { x.appendChild(document.createTextNode(' ')); });
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  };
  var shown = function (el) { return !!(el && el.offsetParent !== null && el.getBoundingClientRect().height > 0); };

  function start() {
    var B = document.body, main = document.querySelector('[data-lay-main]') || document.querySelector('main');
    if (!B || !main) return;
    var side = B.getAttribute('data-lay') === 'side', foldSel = B.getAttribute('data-lay-fold');
    var aside = null, toc = null, sum = null, links = [], timer = 0, n = 0;

    function buildAside() {
      if (!mq(PC)) { if (aside) { aside.hidden = true; main.classList.remove('lay-has-aside'); } return; }
      if (!aside) {
        aside = document.createElement('aside'); aside.className = 'lay-aside'; aside.setAttribute('aria-label', '이 화면 요약');
        aside.innerHTML = '<div class="lay-aside-in"><div class="lay-sum" hidden></div><nav class="lay-toc" aria-label="이 화면 목차" hidden><b>이 화면 목차</b><ol></ol></nav><a class="lay-top" href="#">맨 위로 ↑</a></div>';
        main.appendChild(aside);
        sum = aside.querySelector('.lay-sum'); toc = aside.querySelector('.lay-toc');
        aside.querySelector('.lay-top').addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      }
      /* 핵심 숫자(복사) */
      var keySel = B.getAttribute('data-lay-key'), titleSel = B.getAttribute('data-lay-title');
      var key = null, title = null;
      if (keySel) Array.prototype.some.call(main.querySelectorAll(keySel), function (el) { if (!aside.contains(el) && shown(el)) { key = el; return true; } return false; });
      if (titleSel) Array.prototype.some.call(main.querySelectorAll(titleSel), function (el) { if (!aside.contains(el) && shown(el)) { title = el; return true; } return false; });
      if (key && !title) { var box = key.closest('.panel,section'); title = box && box.querySelector('h2'); }
      if (key) {
        var c = key.cloneNode(true);
        Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
        Array.prototype.forEach.call(c.querySelectorAll('button,a,input,select'), function (x) { x.setAttribute('tabindex', '-1'); });
        c.removeAttribute('id'); c.className = 'lay-kv'; c.removeAttribute('style');
        sum.innerHTML = ''; if (title) { var t = document.createElement('b'); t.textContent = txt(title); sum.appendChild(t); }
        sum.appendChild(c); sum.setAttribute('aria-hidden', 'true'); sum.hidden = false;
      } else sum.hidden = true;
      /* 목차 */
      var hs = Array.prototype.filter.call(main.querySelectorAll(B.getAttribute('data-lay-toc') || 'h2'), function (h) { return !aside.contains(h) && shown(h) && txt(h); });
      links = [];
      var ol = toc.querySelector('ol'); ol.innerHTML = '';
      hs.slice(0, 14).forEach(function (h) {
        if (!h.id) h.id = 'lay-s' + (++n);
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + h.id; a.textContent = txt(h); a.title = a.textContent;
        a.addEventListener('click', function (e) { e.preventDefault(); var y = h.getBoundingClientRect().top + window.pageYOffset - 80; window.scrollTo({ top: y, behavior: 'smooth' }); });
        li.appendChild(a); ol.appendChild(li); links.push([h, a]);
      });
      toc.hidden = hs.length < 2;
      var any = !sum.hidden || !toc.hidden;
      aside.hidden = !any; main.classList.toggle('lay-has-aside', any);
      spy();
    }
    function spy() {
      if (!links.length) return;
      var cur = null;
      links.forEach(function (p) { if (p[0].getBoundingClientRect().top < 140) cur = p; });
      links.forEach(function (p) { p[1].classList.toggle('on', p === (cur || links[0])); });
    }
    function fold() {
      if (!foldSel || !mq(MO)) return;
      Array.prototype.forEach.call(document.querySelectorAll(foldSel), function (el) {
        if (el.dataset.layFold || !shown(el) || el.scrollHeight < 900) return;
        el.dataset.layFold = '1'; el.classList.add('lay-fold');
        var h = el.querySelector('h2,h3'), b = document.createElement('button');
        b.type = 'button'; b.className = 'lay-more'; b.setAttribute('aria-expanded', 'false');
        b.textContent = '펼쳐 보기 ▾';
        var open = function () { el.classList.remove('lay-fold'); b.remove(); };
        b.addEventListener('click', function () { open(); if (window.jdjStat) window.jdjStat('feature_use', { feature: 'lay_unfold' }); });
        el.addEventListener('focusin', open);
        el.parentNode.insertBefore(b, el.nextSibling);
        if (h) b.setAttribute('aria-label', txt(h) + ' 펼쳐 보기');
      });
    }
    /* 3) 결과 링크로 들어온 휴대폰: <body data-lay-jump="#res"> — 주소에 조건이 있고 아직 스크롤하지 않았으면 결과 첫 칸(핵심 숫자)으로 한 번만 내려 줌 */
    var jumpSel = B.getAttribute('data-lay-jump'), jumped = !jumpSel || !location.search || !mq(MO), t0 = Date.now();
    function jump() {
      if (jumped) return;
      if (Date.now() - t0 > 8000 || window.pageYOffset > 60) { jumped = true; return; }
      var el = null;
      Array.prototype.some.call(document.querySelectorAll(jumpSel), function (x) { if (shown(x) && x.getBoundingClientRect().height > 200) { el = x; return true; } return false; });
      if (!el) return;
      jumped = true;
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 64), behavior: 'auto' });
    }
    /* 4) 핵심 숫자 먼저: <body data-lay-keyfirst=".stats"> — 그 칸이 든 카드 안에서 제목·평형 바로 아래로(보이는 순서만, 내용 그대로) */
    var kfSel = B.getAttribute('data-lay-keyfirst');
    function keyFirst() {
      if (!kfSel) return;
      Array.prototype.forEach.call(main.querySelectorAll(kfSel), function (k) { var p = k.parentNode; if (p && p !== main && !p.classList.contains('lay-kf')) { p.classList.add('lay-kf'); k.classList.add('lay-kf-k'); } });
    }
    function run() { timer = 0; keyFirst(); if (side) buildAside(); fold(); jump(); }
    function later() { if (!timer) timer = setTimeout(run, 250); }
    run();
    if (window.MutationObserver) new MutationObserver(function (m) {
      for (var i = 0; i < m.length; i++) if (!aside || !aside.contains(m[i].target)) { later(); return; }
    }).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('resize', later);
    window.addEventListener('scroll', function () { if (links.length && aside && !aside.hidden) spy(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
