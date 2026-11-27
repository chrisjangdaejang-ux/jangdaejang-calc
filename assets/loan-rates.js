/* 대출 한도 계산기(loan/) '은행별 대출 금리표'.
   자료: 엔진 scripts/pubfeeds.py 가 jangdaejang-data 에 올리는 data/loan_rates.json
     = { asof:'YYYY-MM-DD'(받은 날), per:'최근 1개월 실행분', src:{nm, url}, jeonse:[{bank, kind, min, max, avg|null, n}], mortgage:[…] }
   전세대출: 한국주택금융공사 「전세자금대출 고객 특성별 금리 정보」(공공데이터포털 15082044, 대표 활용신청 승인 2026-11-26) —
     공사 보증 전세대출이 실제로 실행된 금리(은행별 최저·최고·가중평균, 건수 30건 미만 은행은 엔진이 뺌). 정책 대출(낮은 금리)이 섞여 있어
     최저 금리는 누구나 받는 금리가 아니라는 문장을 꼭 붙여요.
   주택담보대출: 금융감독원 「금융상품 한눈에」 오픈 API 인증키가 아직 없어 비어 있어요(키를 받으면 mortgage 에 같은 모양으로).
   운영자 미리 보기: 주소 끝에 ?preview=rates. 화면 원칙: 받은 값 그대로·기준일 표시, 특정 은행을 권하지 않음(가나다순).
   사용자가 금리를 누르면 계산기의 '예상 대출 금리' 칸에 넣어 다시 계산해요. 검사: tools/closing-test.js */
(function () {
  'use strict';
  var ENABLED = true;   // 2026-11-27 켬: 주택금융공사 전세대출 은행별 금리(15082044) 실제 응답 확인(15개 은행, 30건 이상 10곳만 공개)
  var on = ENABLED || /[?&]preview=rates(&|$)/.test(location.search);
  var box = document.getElementById('rateTable');
  if (!on || !box) return;
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pct = function (v) { return v == null || !isFinite(+v) ? '-' : (+v).toFixed(2) + '%'; };
  var tab = 'mortgage', D = null;
  function ok(r) { return r && typeof r.bank === 'string' && isFinite(+r.min) && isFinite(+r.max) && +r.min > 0 && +r.max < 30; }
  var KIND = { mortgage: '주택담보대출', jeonse: '전세자금대출' };
  function tabs() { return Object.keys(KIND).filter(function (k) { return (D[k] || []).filter(ok).length; }); }
  function draw() {
    var ks = tabs();
    if (!ks.length) { box.hidden = true; return; }
    if (ks.indexOf(tab) < 0) tab = ks[0];
    var rows = (D[tab] || []).filter(ok).slice().sort(function (a, b) { return a.bank.localeCompare(b.bank, 'ko'); });
    var hasAvg = rows.some(function (r) { return r.avg != null && isFinite(+r.avg); });
    var note = tab === 'jeonse' && D.per
      ? esc(D.asof) + ' 받은 자료 · ' + esc(D.per) + ' · 한국주택금융공사 보증 전세대출이 실제로 나간 금리예요. 정책 대출(낮은 금리)이 섞여 있어 최저 금리는 누구나 받을 수 있는 금리가 아니에요. 내 금리는 심사로 달라져요.'
      : esc(D.asof) + ' 공시 기준 · 공시 금리이며 개인 금리는 심사로 달라져요.';
    box.innerHTML = '<h2>은행별 ' + (ks.length > 1 ? '대출' : KIND[ks[0]]) + ' 금리</h2><p class="muted" style="font-size:14px;margin:0 0 8px">' + note + ' 금리를 누르면 위 계산에 넣어요.</p>' +
      (ks.length > 1 ? '<div class="seg c2" id="rtTab" style="margin-bottom:10px">' + ks.map(function (k) { return '<button type="button" data-v="' + k + '" class="' + (tab === k ? 'on' : '') + '">' + KIND[k] + '</button>'; }).join('') + '</div>' : '') +
      '<table class="costtbl" style="width:100%"><thead><tr><th style="text-align:left">은행' + (tab === 'jeonse' ? '' : ' · 유형') + '</th>' + (hasAvg ? '<th class="num">평균</th>' : '') + '<th class="num">최저</th><th class="num">최고</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var b = function (v) { return v == null || !isFinite(+v) ? '-' : '<button type="button" class="rtp" data-r="' + (+v) + '">' + pct(v) + '</button>'; };
        return '<tr><td>' + esc(r.bank) + (tab === 'jeonse' ? (r.n ? ' <small>' + (+r.n).toLocaleString('ko-KR') + '건</small>' : '') : ' <small>' + esc(r.kind || '') + '</small>') + '</td>' + (hasAvg ? '<td class="num">' + b(r.avg) + '</td>' : '') + '<td class="num">' + b(r.min) + '</td><td class="num">' + b(r.max) + '</td></tr>';
      }).join('') +
      '</tbody></table><p class="muted" style="font-size:13px;margin:8px 0 0">' + (hasAvg ? '평균은 대출 금액으로 가중한 평균이에요. ' : '') + '출처: ' + (D.src && D.src.url ? '<a href="' + esc(D.src.url) + '" target="_blank" rel="noopener">' + esc(D.src.nm) + ' ↗</a>' : esc((D.src && D.src.nm) || '공공 자료')) + ' · 집예보는 대출을 중개하지 않아요.</p>';
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
