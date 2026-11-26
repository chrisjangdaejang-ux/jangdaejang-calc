/* 내 집 마련 계산기(buy/) '매수 총비용 한 장' — 집값 + 취득세 + 등기 부대비용 + 중개보수 + 이사비 − 대출 = 필요한 현금
   - buy/index.html render() 가 보내는 'jdj-buy' 신호({c, P, dsr, target, region})를 받아 그린다. 계산은 assets/closing-core.js·loan-core.js 공용 함수.
   - 금액은 이 기기 안에서만 계산하고 어디로도 보내지 않는다(통계·주소에도 싣지 않음).
   - 위 '최대 매수 가능 금액'은 기타 비용 1,000만 원 가정이고, 이 칸은 항목별 공식 표로 다시 계산한 값이라 조금 다를 수 있다(화면에 적음). */
(function () {
  'use strict';
  var C = window.JDJ_CLOSING, L = window.JDJ_LOAN, box = document.getElementById('totalCard');
  if (!C || !L || !box) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var num = function (s) { var v = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return isNaN(v) ? 0 : v; };
  var won = C.won, last = null, st = { metro: null, method: 'pro' };
  var css = document.createElement('style');
  css.textContent = '#totalCard .tc-big{font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1.15;margin:2px 0 4px}' +
    '#totalCard .tc-sub{font-size:15px;color:var(--sub)}#totalCard .tc-sub b.ok{color:var(--pos)}#totalCard .tc-sub b.no{color:var(--neg)}' +
    '#totalCard table{width:100%;border-collapse:collapse;font-size:15px;margin-top:12px}#totalCard td{padding:9px 2px;border-top:1px solid var(--line2,#f0f1f3);vertical-align:top}' +
    '#totalCard td:last-child{text-align:right;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;padding-left:8px}#totalCard td small{display:block;font-size:13px;color:var(--sub2);line-height:1.5}' +
    '#totalCard tr.minus td:last-child{color:var(--pos)}#totalCard tr.tot td{border-top:2px solid var(--text);font-weight:900;font-size:16px}' +
    '#totalCard .tc-in{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}#totalCard .tc-in>*{min-width:0}' +
    '#totalCard .tc-in label{display:block;font-size:13.5px;font-weight:700;color:var(--sub);margin-bottom:4px}' +
    '#totalCard .tc-in .inp{display:flex;align-items:center;gap:6px}#totalCard .tc-in input,#totalCard .tc-in select{min-width:0;width:100%}' +
    '#totalCard details{margin-top:10px}#totalCard summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center}' +
    '#totalCard .tc-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#totalCard .tc-note{font-size:13.5px;color:var(--sub2);line-height:1.6;margin:10px 0 0}' +
    '@media (max-width:420px){#totalCard .tc-in{grid-template-columns:1fr}}';
  document.head.appendChild(css);
  box.innerHTML = '<h2>매수 총비용 한 장</h2><p class="muted" style="font-size:14px;margin:0 0 6px">집값에 세금·등기·중개·이사 비용을 더하고 대출을 빼, 잔금 때까지 필요한 현금을 한 숫자로 보여 드려요.</p>' +
    '<div class="tc-lbl muted" id="tcLbl" style="font-size:14.5px"></div><div class="tc-big" id="tcBig">-</div><div class="tc-sub" id="tcSub"></div>' +
    '<table><tbody id="tcTbl"></tbody></table>' +
    '<details id="tcMore"><summary>등기·이사 비용 직접 넣기</summary><div class="tc-in">' +
    '<div><label for="tcStd">공시가격 (국민주택채권용, 선택)</label><div class="inp"><input id="tcStd" inputmode="numeric" placeholder="모르면 비워 두세요" autocomplete="off"><span class="unit">만원</span></div></div>' +
    '<div><label for="tcDisc">채권 할인율 (그날 값, 선택)</label><div class="inp"><input id="tcDisc" inputmode="decimal" placeholder="예: 3.5" autocomplete="off"><span class="unit">%</span></div></div>' +
    '<div><label for="tcMetro">집이 있는 곳 (채권 비율)</label><select id="tcMetro"><option value="1">서울·광역시</option><option value="0">그 밖의 지역</option></select></div>' +
    '<div><label for="tcMethod">등기는 누가 하나요?</label><select id="tcMethod"><option value="pro">법무사에게 맡겨요</option><option value="e">직접 · 전자신청</option><option value="paper">직접 · 등기소 방문</option></select></div>' +
    '<div><label for="tcMove">이사비 (선택)</label><div class="inp"><input id="tcMove" inputmode="numeric" placeholder="0" autocomplete="off"><span class="unit">만원</span></div></div>' +
    '<div style="display:flex;align-items:flex-end"><a href="../move/" data-track="buy_total_to_move" style="min-height:44px;display:inline-flex;align-items:center;font-weight:700">이사 견적 받아 보기 ›</a></div>' +
    '</div></details>' +
    '<p class="tc-note" id="tcNote"></p>' +
    '<div class="tc-links"><a class="btn ghost" id="tcCheck" href="../loan/checklist/?m=buy" data-track="buy_to_checklist">잔금일 체크리스트</a><a class="btn ghost" id="tcCost" href="../tax/cost/" data-track="buy_to_cost">부대비용 자세히</a></div>';
  var $ = function (id) { return document.getElementById(id); };
  ['tcStd', 'tcMove'].forEach(function (id) { $(id).addEventListener('input', function () { var v = num($(id).value); $(id).value = v ? Math.round(v).toLocaleString('ko-KR') : ''; draw(); }); });
  $('tcDisc').addEventListener('input', draw);
  $('tcMetro').addEventListener('change', function () { st.metro = $('tcMetro').value; draw(); });
  $('tcMethod').addEventListener('change', draw);
  window.addEventListener('jdj-buy', function (e) { last = e.detail; draw(); });
  if (window.JDJ_BUY_LAST) { last = window.JDJ_BUY_LAST; draw(); }
  function draw() {
    if (!last) return;
    var c = last.c, base = last.target || last.P;
    if (!base) { $('tcBig').textContent = '-'; $('tcSub').textContent = '계산할 집값이 없어요. 조건을 바꾸거나 "점 찍어둔 집"에 매매가를 넣어 주세요.'; $('tcTbl').innerHTML = ''; return; }
    if (st.metro == null) $('tcMetro').value = last.region === 'seoul' ? '1' : '0';
    var loan = L.loanAt(base, c, last.dsr).L;   // 만원
    var m = $('tcMethod').value, sv = $('tcStd').value.trim(), dv = $('tcDisc').value.trim();
    var r = C.totalCash({ price: base * 1e4, std: sv ? num(sv) * 1e4 : null, metro: $('tcMetro').value === '1', own: c.own, regulated: c.regulated, large: c.large,
      discount: dv === '' ? null : num(dv), method: m === 'paper' ? 'paper' : 'e', self: m !== 'pro', move: num($('tcMove').value) * 1e4, loan: Math.round(loan * 1e4), cash: Math.round(c.cash * 1e4) });
    var it = {}; r.costs.items.forEach(function (x) { it[x.k] = x; });
    var reg = ['stamp', 'bond', 'reg', 'scr'].reduce(function (s, k) { return s + (it[k].v || 0); }, 0);
    $('tcLbl').textContent = (last.target ? '점 찍어둔 집 ' : '최대 매수 가능 금액 ') + won(base * 1e4) + ' 기준 · 필요한 현금';
    $('tcBig').textContent = won(r.need);
    $('tcSub').innerHTML = r.gap == null ? '' : r.gap >= 0 ? '보유 현금으로 충분해요 · <b class="ok">' + won(r.gap) + ' 남아요</b>' : '보유 현금보다 <b class="no">' + won(-r.gap) + ' 모자라요</b>';
    var row = function (k, v, s, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + k + (s ? '<small>' + s + '</small>' : '') + '</td><td>' + v + '</td></tr>'; };
    $('tcTbl').innerHTML = row('집값', won(r.costs.price)) +
      row('취득세', won(it.acq.v), esc(it.acq.note)) +
      row('등기 부대비용', won(reg), '인지세 절반 ' + won(it.stamp.v) + ' · 채권 ' + (it.bond.v == null ? '<b>계산 전</b>' : won(it.bond.v)) + ' · 등기 수수료 ' + won(it.reg.v) + ' · 법무사 ' + won(it.scr.v)) +
      row('중개보수', won(it.broker.v), '법정 상한 + 부가세(최대)') +
      row('이사비', won(r.move), r.move ? '' : '넣지 않았어요 — 아래에서 넣을 수 있어요') +
      row('대출', '−' + won(r.loan), '이 계산기의 대출 가능액', 'minus') +
      row('필요한 현금', won(r.need), '', 'tot');
    var miss = r.costs.missing;
    $('tcNote').textContent = (miss.length ? miss.join('·') + '은(는) 값을 넣지 않아 빼고 더했어요(공시가격·그날 할인율을 넣으면 더해요). ' : '') +
      '위 "최대 매수 가능 금액"은 기타 비용을 1,000만 원으로 가정해 계산해서 이 칸과 조금 다를 수 있어요. 입력한 금액은 이 기기 밖으로 보내지 않아요.';
  }
})();
