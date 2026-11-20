/* 세금 계산 결과마다 붙는 '믿을 수 있게' 상자 — 기준일 · 적용 조항 · 이 계산이 다루지 않는 경우(세무사 확인 필요) · 오류 신고
   - 내용은 tax-engine.js 의 AS_OF / LAW / SCOPE 에서 가져온다(세법이 바뀌면 엔진 한 곳만 고침).
   - 결과 칸(#cgtRes 등)이 다시 그려질 때마다 상자가 없으면 맨 끝에 다시 붙인다(tax-ui.js 는 건드리지 않음).
   - 다른 화면·새 결과 칸도 data-taxlaw="cgt|order|acq|prop|cpt|gift" 를 달면 같은 상자가 붙는다.
   - 오류 신고: 기존 상담 신청 구글 폼(buy·switch 와 같은 폼)에 '세금 계산 오류 신고 · 세금 종류'와 결과 금액·기준일만 미리 채움.
     입력한 매도가·취득가 같은 숫자는 자동으로 담지 않는다(보내는 분이 폼에서 직접 적음). */
(function () {
  'use strict';
  const T = window.JDJ_TAX; if (!T || !T.LAW) return;
  const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLScCG7wzIlY3FE6EHU5QWo92uW5NQe7aiP-GJ9jvh41Rx2E8Zw/viewform';
  const SLOTS = { cgtRes: 'cgt', oOut: 'order', aRes: 'acq', pRes: 'prop', cRes: 'cpt', gRes: 'gift' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dKo = s => { const [y, m, d] = s.split('-').map(Number); return y + '년 ' + m + '월 ' + d + '일'; };
  const css = document.createElement('style');
  css.textContent = '.taxlaw{margin-top:14px;padding:14px;border-radius:14px;background:var(--gray,#f5f6f8);font-size:14px;line-height:1.6;color:var(--sub,#4e5968)}' +
    '.taxlaw .tl-d{font-weight:800;color:var(--text,#191f28)}.taxlaw .tl-a{margin:4px 0 0}' +
    '.taxlaw details{margin-top:8px}.taxlaw summary{cursor:pointer;font-weight:700;color:var(--text,#191f28);min-height:32px}' +
    '.taxlaw ul{margin:6px 0 0;padding-left:18px}.taxlaw li{margin:4px 0}.taxlaw li b{color:var(--text,#191f28)}' +
    '.taxlaw .tl-r{display:inline-flex;align-items:center;min-height:44px;margin-top:6px;font-weight:700;color:var(--blue,#3182f6);text-decoration:underline}';
  document.head.appendChild(css);

  function formUrl(kind, host) {
    const big = host.querySelector('.big');
    const q = new URLSearchParams({ usp: 'pp_url' });
    q.set('entry.1054811896', '세금 계산 오류 신고 · ' + T.LAW[kind].name);
    q.set('entry.658364183', ('[세금 계산 오류 신고] ' + T.LAW[kind].name + (big ? ' · 화면 결과 ' + big.textContent.trim() : '') +
      ' · ' + T.AS_OF + ' 법령 기준 · ' + location.origin + location.pathname + '#' + (kind === 'order' ? 'order' : kind) +
      ' | 어떤 점이 이상한지 적어 주세요: ').slice(0, 1500));
    return FORM + '?' + q.toString().replace(/\+/g, '%20');
  }
  function box(kind, host) {
    const L = T.LAW[kind], S = T.SCOPE[kind] || [];
    const el = document.createElement('div');
    el.className = 'taxlaw'; el.setAttribute('data-taxlaw-box', kind);
    el.innerHTML = '<div class="tl-d">' + dKo(T.AS_OF) + ' 현행 법령 기준</div>' +
      '<p class="tl-a">적용 조항: ' + esc(L.arts.join(', ')) + '</p>' +
      (S.length ? '<details><summary>이 계산이 다루지 않는 경우 (세무사 확인이 필요해요)</summary><ul>' +
        S.map(([k, why]) => '<li><b>' + esc(k) + '</b> — ' + esc(why) + '</li>').join('') + '</ul></details>' : '') +
      '<a class="tl-r" target="_blank" rel="noopener" data-track="tax_error_report" href="#">계산이 이상하면 알려 주세요 ›</a>';
    el.querySelector('.tl-r').addEventListener('click', e => { e.currentTarget.href = formUrl(kind, host); });
    return el;
  }
  function ensure(host, kind) {
    if (!host || !T.LAW[kind]) return;
    if (host.hidden || !host.firstElementChild) return;
    if (host.querySelector(':scope > [data-taxlaw-box]')) return;
    host.appendChild(box(kind, host));
  }
  function scan() {
    Object.keys(SLOTS).forEach(id => ensure(document.getElementById(id), SLOTS[id]));
    document.querySelectorAll('[data-taxlaw]').forEach(el => ensure(el, el.getAttribute('data-taxlaw')));
  }
  function boot() {
    scan();
    const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(scan, 30); });
    mo.observe(document.querySelector('main') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
