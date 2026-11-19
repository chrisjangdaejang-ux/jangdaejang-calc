/* 오피스텔 취득세 간단 계산 + 주택 수 포함 안내 (세금 계산기 '취득세' 화면 아래 #offi 상자)
   오피스텔은 건축법상 업무시설이라 주거용으로 써도 취득할 때는 주택이 아닌 '그 밖의 부동산' 세율을 적용한다.
   · 취득세 4% — 지방세법 제11조 제1항 제7호 나목(유상거래, 주택 외)
   · 지방교육세 0.4% — 지방세법 제151조 제1항 제1호: (표준세율 4% − 2%) × 20%
   · 농어촌특별세 0.2% — 농어촌특별세법 제5조 제1항 제6호: 취득세율을 2%로 한 세액의 10%
   합계 4.6% (전용면적·주택 수와 관계없이 같다). 금액 단위: 만원 입력 → 원 단위 계산(원 미만 버림). 확인일 2026-11-19 */
(function (root) {
  'use strict';
  const RATE = { acq: 0.04, edu: 0.004, rural: 0.002 };
  function offiAcqTax(priceMan) {
    const p = Math.max(0, Math.round(+priceMan || 0)) * 10000;
    const acq = Math.floor(p * RATE.acq), edu = Math.floor(p * RATE.edu), rural = Math.floor(p * RATE.rural);
    return { price: p, acq, edu, rural, total: acq + edu + rural, rate: RATE.acq + RATE.edu + RATE.rural };
  }
  const API = { offiAcqTax, RATE, CHECKED: '2026-11-19' };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }
  root.JDJ_OFFI_TAX = API;
  const won = w => { const m = Math.round(w / 10000), e = Math.floor(m / 10000), r = m % 10000; return (e ? e.toLocaleString() + '억' : '') + (r ? (e ? ' ' : '') + r.toLocaleString() + '만' : '') + '원'; };
  function boot() {
    const inp = document.getElementById('oPrice'), out = document.getElementById('oRes'); if (!inp || !out) return;
    const run = () => {
      const v = parseInt(String(inp.value).replace(/[^\d]/g, ''), 10);
      if (!v) { out.innerHTML = ''; return; }
      inp.value = v.toLocaleString();
      const r = offiAcqTax(v);
      out.innerHTML = `<b>합계 약 ${won(r.total)}</b> (매수가의 4.6%)<br>취득세 ${won(r.acq)} · 지방교육세 ${won(r.edu)} · 농어촌특별세 ${won(r.rural)}`;
    };
    inp.addEventListener('input', run);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof self !== 'undefined' ? self : this);
