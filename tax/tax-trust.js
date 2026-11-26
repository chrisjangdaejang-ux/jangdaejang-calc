/* 세금 계산 결과마다 붙는 '믿을 수 있게' 상자 — 기준일 · 적용 조항 · 이 계산이 다루지 않는 경우(세무사 확인 필요) · 오류 신고
   - 내용은 tax-engine.js 의 AS_OF / LAW / SCOPE 에서 가져온다(세법이 바뀌면 엔진 한 곳만 고침).
   - 결과 칸(#cgtRes 등)이 다시 그려질 때마다 상자가 없으면 맨 끝에 다시 붙인다(tax-ui.js 는 건드리지 않음).
   - 다른 화면·새 결과 칸도 data-taxlaw="cgt|order|acq|prop|cpt|gift" 를 달면 같은 상자가 붙는다.
   - 오류 신고: 기존 상담 신청 구글 폼(buy·switch 와 같은 폼)에 '세금 계산 오류 신고 · 세금 종류'와 결과 금액·기준일만 미리 채움.
     입력한 매도가·취득가 같은 숫자는 자동으로 담지 않는다(보내는 분이 폼에서 직접 적음).
   - 2026-11-26: 맨 위에 근거 배지 — '국세청 공개 계산 사례 N건과 같은 결과'. N은 tax/tax-verified.js(테스트 tools/tax-official-test.js 가
     모두 통과할 때 만드는 파일)에서만 읽는다. 그 계산기에 맞춰 본 국세청 사례가 없으면 중립 안내(조문 산식 확인 건수)만.
     window.JDJ_TAX_BADGE(kind) → 배지 HTML(다른 화면에서도 씀) */
(function () {
  'use strict';
  const V = window.JDJ_TAX_VERIFIED || null;
  const dKo0 = s => { const [y, m, d] = String(s).split('-').map(Number); return y + '년 ' + m + '월 ' + d + '일'; };
  /** 근거 배지: kind(cgt|order|acq|prop|cpt|gift|xfer|all) → HTML. 숫자는 테스트 산출물에서만 */
  function badge(kind) {
    if (!V || !V.by) return '';
    const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const b = kind === 'all' ? { nts: V.ntsTotal, seoul: Object.keys(V.by).reduce((n, k) => n + V.by[k].seoul, 0), ntsPages: [] } : V.by[kind];
    if (!b) return '';
    const base = dKo0(V.asOf) + ' 시행 법령 기준';
    if (b.nts > 0) {
      const pg = b.ntsPages && b.ntsPages.length ? ' (' + b.ntsPages.join('·') + '쪽)' : '';
      return '<p class="tvb ok" data-tvb="' + e(kind) + '"><b>근거 확인</b><span>국세청 공개 계산 사례 ' + b.nts + '건과 같은 결과예요 · ' + e(base) +
        '<small>' + e(V.books.NTS) + pg + ' 계산 예시를 이 계산기에 넣어 책자 숫자와 한 원까지 같은지 확인했어요' + (b.seoul ? ' · 서울시 지방세 책자 사례 ' + b.seoul + '건도 같아요' : '') + '.</small></span></p>';
    }
    return '<p class="tvb" data-tvb="' + e(kind) + '"><b>계산 근거</b><span>' + e(base) + ' 법 조문 산식으로 계산해요' +
      '<small>' + (b.formula ? '조문 산식으로 만든 확인 사례 ' + b.formula + '건과 같은 결과예요. ' : '') + '이 계산에 바로 맞춰 볼 국세청 공개 계산 사례는 아직 없어요.</small></span></p>';
  }
  window.JDJ_TAX_BADGE = badge;
  { const c0 = document.createElement('style');
    c0.textContent = '.tvb{margin:10px 0 0;display:flex;gap:8px;align-items:flex-start;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.55;background:var(--gray2,#f7f8fa);border:1px solid var(--line,#e5e8eb);color:var(--sub,#4e5968)}' +
      '.tvb b{flex:none;font-size:13px;border-radius:6px;padding:2px 8px;margin-top:1px;background:#4E5968;color:#fff}.tvb.ok{background:#ECF8F2;border-color:#BFE5D1;color:#0B5C3B}.tvb.ok b{background:#0E7A4F}' +
      '.tvb small{display:block;font-size:13px;color:inherit;opacity:.85;margin-top:2px}';
    document.head.appendChild(c0); }
  document.querySelectorAll('[data-tvb-slot]').forEach(el => { el.innerHTML = badge(el.getAttribute('data-tvb-slot')); });
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
    el.innerHTML = '<div class="tl-d">' + dKo(T.AS_OF) + ' 현행 법령 기준</div>' + badge(kind) +
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
