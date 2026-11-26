/* 가로 칩 줄 공통 도우미 — 칩이 화면 밖으로 잘려 '안 보이는데 있는지도 모르는' 일이 없게.
   쓰는 법: 칩 줄(가로 flex) 요소에 data-chiprow 를 붙이면 자동으로 적용(나중에 innerHTML 로 그려도 됨).
     data-chiprow="필터 더보기"  → 휴대폰에서 펼치기 버튼 글자(비우면 '필터 더보기')
   · 768px 이상: 칩이 다음 줄로 넘어가며 모두 보임(가로 스크롤 없음)
   · 768px 미만: 가로로 넘기기 + 오른쪽 흐림 + '›' 넘기기 버튼 + '필터 더보기'(누르면 여러 줄로 모두 펼침)
                 + 칩 단위로 멈추는 스크롤, 마지막 칩도 버튼에 가리지 않게 오른쪽 여백
   JS 없이도 칩 줄은 원래 페이지 CSS 대로 보임(이 파일은 보조). */
(function () {
  if (window.JDJ_CHIPROW) return;
  const CSS = `
.cr-box{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%}
.cr-vp{position:relative;flex:1 1 auto;min-width:0}
.cr-box>.cr-vp>.cr{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scroll-padding-inline:12px 52px;padding-inline-end:52px}
.cr-box>.cr-vp>.cr::-webkit-scrollbar{display:none}
.cr-box>.cr-vp>.cr>*{scroll-snap-align:start}
.cr-fade{position:absolute;top:0;bottom:0;right:0;width:64px;pointer-events:none;background:linear-gradient(to right,rgba(255,255,255,0),var(--cr-bg,#fff) 70%);opacity:0;transition:opacity .15s}
.cr-fade.l{right:auto;left:0;width:28px;background:linear-gradient(to left,rgba(255,255,255,0),var(--cr-bg,#fff))}
.cr-nx{position:absolute;right:0;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:1px solid #C5CCD6;background:#fff;color:#191F28;font:inherit;font-size:24px;font-weight:700;line-height:1;padding:0 0 3px 2px;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.14);display:none;align-items:center;justify-content:center}
.cr-nx:focus-visible,.cr-more:focus-visible{outline:3px solid #4338CA;outline-offset:2px}
.cr-box.cr-ov:not(.cr-end) .cr-fade:not(.l){opacity:1}
.cr-box.cr-ov:not(.cr-st) .cr-fade.l{opacity:1}
.cr-box.cr-ov:not(.cr-end) .cr-nx{display:flex}
.cr-more{flex:none;display:none;align-items:center;gap:3px;min-height:44px;padding:0 11px;border-radius:999px;border:1px solid #C5CCD6;background:#F2F4F6;color:#191F28;font:inherit;font-size:13.5px;font-weight:700;white-space:nowrap;cursor:pointer}
.cr-more i{font-style:normal;font-size:11px}
.cr-box.cr-ov .cr-more,.cr-box.cr-open .cr-more{display:inline-flex}
.cr-box.cr-open{align-items:flex-start}
.cr-box.cr-open>.cr-vp>.cr{flex-wrap:wrap;overflow:visible;padding-inline-end:0;row-gap:6px}
.cr-box.cr-open .cr-fade,.cr-box.cr-open .cr-nx{display:none}
@media(min-width:768px){
  .cr-box>.cr-vp>.cr{flex-wrap:wrap;overflow:visible;padding-inline-end:0;row-gap:6px}
  .cr-fade,.cr-nx,.cr-box .cr-more,.cr-box.cr-ov .cr-more{display:none!important}
}`;
  function css() {
    if (document.getElementById('cr-css')) return;
    const s = document.createElement('style'); s.id = 'cr-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function bgOf(el) {
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const c = getComputedStyle(a).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c)) return c;
    }
    return '#fff';
  }
  let n = 0;
  function attach(el) {
    if (!el || el.__cr) return el && el.__cr;
    css();
    const label = el.getAttribute('data-chiprow') || '필터 더보기';
    if (!el.id) el.id = 'cr' + (++n);
    const box = document.createElement('div'); box.className = 'cr-box';
    const vp = document.createElement('div'); vp.className = 'cr-vp';
    el.parentNode.insertBefore(box, el);
    box.appendChild(vp); vp.appendChild(el); el.classList.add('cr');
    const fl = document.createElement('span'); fl.className = 'cr-fade l'; fl.setAttribute('aria-hidden', 'true');
    const fr = document.createElement('span'); fr.className = 'cr-fade'; fr.setAttribute('aria-hidden', 'true');
    const nx = document.createElement('button'); nx.type = 'button'; nx.className = 'cr-nx'; nx.textContent = '›';
    nx.setAttribute('aria-label', '오른쪽 항목 더 보기'); nx.tabIndex = -1;   // 키보드는 칩 사이 이동만으로 자동 스크롤됨
    const mo = document.createElement('button'); mo.type = 'button'; mo.className = 'cr-more';
    mo.setAttribute('aria-controls', el.id); mo.setAttribute('aria-expanded', 'false');
    vp.appendChild(fl); vp.appendChild(fr); vp.appendChild(nx); box.appendChild(mo);
    let open = false, raf = 0;
    const paint = () => { mo.innerHTML = open ? '접기 <i aria-hidden="true">▲</i>' : `${label} <i aria-hidden="true">▼</i>`; };
    const update = () => {
      raf = 0;
      if (!box.isConnected) return;
      box.style.setProperty('--cr-bg', bgOf(box));
      const ov = !open && el.scrollWidth > el.clientWidth + 2;
      box.classList.toggle('cr-ov', ov);
      box.classList.toggle('cr-st', el.scrollLeft <= 2);
      box.classList.toggle('cr-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    const later = () => { if (!raf) raf = requestAnimationFrame(update); };
    nx.addEventListener('click', () => el.scrollBy({ left: Math.max(120, el.clientWidth * 0.7), behavior: 'smooth' }));
    mo.addEventListener('click', () => {
      open = !open; box.classList.toggle('cr-open', open); mo.setAttribute('aria-expanded', String(open)); paint(); update();
      if (!open) el.scrollLeft = 0;
    });
    el.addEventListener('scroll', later, { passive: true });
    window.addEventListener('resize', later);
    if (window.ResizeObserver) new ResizeObserver(later).observe(el);
    new MutationObserver(later).observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    paint(); update();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
    return (el.__cr = { update: later, box });
  }
  function scan(root) { (root || document).querySelectorAll('[data-chiprow]').forEach(attach); }
  window.JDJ_CHIPROW = { attach, scan };
  const boot = () => {
    scan();
    new MutationObserver(ms => {
      for (const m of ms) for (const x of m.addedNodes) if (x.nodeType === 1 && !(x.classList && x.classList.contains('cr-box'))) {
        if (x.hasAttribute('data-chiprow')) attach(x); else if (x.querySelector('[data-chiprow]')) scan(x);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
