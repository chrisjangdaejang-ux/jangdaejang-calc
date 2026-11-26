/* 대출 한도 계산기(loan/) '은행별 공시 금리표' — 아직 꺼져 있어요(자료 없음).
   켜는 조건: 아래 ENABLED 를 true 로 바꾸고, 엔진이 jangdaejang-data 에 data/loan_rates.json 을 올리면 보여요.
   운영자 미리 보기: 주소 끝에 ?preview=rates (자료 파일이 있을 때만 칸이 생김).
   ── 자료 원천(대표 할 일) ──
   금융감독원 「금융상품 한눈에」(금융상품통합비교공시, https://finlife.fss.or.kr) 오픈 API 인증키가 엔진에 아직 없어요
   (jangdaejang-engine docs/data_sources_status.md 2026-11-26 확인: 등록된 키 없음). 키를 받으면 엔진에 FSS_FINLIFE_KEY 로 넣고
   주택담보대출·전세자금대출 상품 API를 하루 한 번 받아 아래 모양으로 저장해요.
   data/loan_rates.json = { asof:'YYYY-MM-DD'(공시 기준일), src:{nm, url}, mortgage:[{bank, kind:'고정'|'변동'|'혼합', min, max, avg|null}], jeonse:[{bank, kind, min, max, avg|null}] }
   화면 원칙: 공시 금리 그대로·기준일 표시, 특정 은행을 권하지 않음(가나다순), '공시 금리이며 개인 금리는 심사로 달라져요'.
   사용자가 금리를 누르면 계산기의 '예상 대출 금리' 칸에 넣어 다시 계산해요. */
(function () {
  'use strict';
  var ENABLED = false;
  var on = ENABLED || /[?&]preview=rates(&|$)/.test(location.search);
  var box = document.getElementById('rateTable');
  if (!on || !box) return;
  var JB = window.JDJ_BASE || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0; return { DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; })(location.pathname);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pct = function (v) { return v == null || !isFinite(+v) ? '-' : (+v).toFixed(2) + '%'; };
  var tab = 'mortgage', D = null;
  function ok(r) { return r && typeof r.bank === 'string' && isFinite(+r.min) && isFinite(+r.max) && +r.min > 0 && +r.max < 30; }
  function draw() {
    var rows = (D[tab] || []).filter(ok).slice().sort(function (a, b) { return a.bank.localeCompare(b.bank, 'ko'); });
    if (!rows.length) { box.hidden = true; return; }
    box.innerHTML = '<h2>은행별 공시 금리</h2><p class="muted" style="font-size:14px;margin:0 0 8px">' + esc(D.asof) + ' 공시 기준 · 공시 금리이며 개인 금리는 심사로 달라져요. 금리를 누르면 위 계산에 넣어요.</p>' +
      '<div class="seg c2" id="rtTab" style="margin-bottom:10px"><button type="button" data-v="mortgage" class="' + (tab === 'mortgage' ? 'on' : '') + '">주택담보대출</button><button type="button" data-v="jeonse" class="' + (tab === 'jeonse' ? 'on' : '') + '">전세자금대출</button></div>' +
      '<table class="costtbl" style="width:100%"><thead><tr><th style="text-align:left">은행 · 유형</th><th class="num">최저</th><th class="num">최고</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(r.bank) + ' <small>' + esc(r.kind || '') + '</small></td><td class="num"><button type="button" class="rtp" data-r="' + (+r.min) + '">' + pct(r.min) + '</button></td><td class="num"><button type="button" class="rtp" data-r="' + (+r.max) + '">' + pct(r.max) + '</button></td></tr>'; }).join('') +
      '</tbody></table><p class="muted" style="font-size:13px;margin:8px 0 0">출처: ' + (D.src && D.src.url ? '<a href="' + esc(D.src.url) + '" target="_blank" rel="noopener">' + esc(D.src.nm) + ' ↗</a>' : esc((D.src && D.src.nm) || '금융감독원 금융상품 한눈에')) + ' · 집예보는 대출을 중개하지 않아요.</p>';
    box.hidden = false;
  }
  box.addEventListener('click', function (e) {
    var t = e.target.closest('#rtTab button'); if (t) { tab = t.dataset.v; draw(); return; }
    var b = e.target.closest('.rtp'); if (!b) return;
    var inp = document.getElementById('rate'); if (!inp) return;
    inp.value = b.dataset.r; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus();
  });
  fetch(JB.DATA + 'data/loan_rates.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !/^\d{4}-\d{2}-\d{2}$/.test(String(j.asof || ''))) return; D = j; draw();
  }).catch(function () {});
})();
