/* '이 집 어떻게 넘기는 게 유리할까?' 화면 — 계산은 이 브라우저 안에서만 (tax/transfer-engine.js) */
(function () {
  'use strict';
  const T = window.JDJ_TAX, A = window.JDJ_ADJ, X = window.JDJ_XFER, BX = window.JDJ_TAXBOX;
  const $ = id => document.getElementById(id);
  const MAN = 10000;
  const pad = n => String(n).padStart(2, '0');
  const TODAY = (() => { const t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); })();
  const num = el => parseInt(String(el.value).replace(/[^0-9]/g, ''), 10) || 0;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function krw(w) {
    if (w == null) return '-';
    w = Math.round(w / MAN); if (w === 0) return '0원';
    const e = Math.floor(Math.abs(w) / 10000), m = Math.abs(w) % 10000;
    return (w < 0 ? '−' : '') + (e ? e.toLocaleString('ko-KR') + '억' + (m ? ' ' : '') : '') + (m ? m.toLocaleString('ko-KR') + '만' : '') + ' 원';
  }
  if (window.TAX_REVIEW_DONE === true) $('reviewBadge').hidden = true;

  /* ---------- 입력 ---------- */
  const fmt = el => { const raw = el.value.replace(/[^0-9]/g, '').slice(0, 7); el.value = raw ? Number(raw).toLocaleString('ko-KR') : ''; };
  document.querySelectorAll('#xf input.money').forEach(m => m.addEventListener('input', () => { fmt(m); const c = $(m.id + 'C'); if (c) c.textContent = num(m) ? krw(num(m) * MAN) : ''; }));
  $('rm').addEventListener('input', () => { $('rm').value = $('rm').value.replace(/[^0-9]/g, '').slice(0, 3); });
  const st = { hs: 1, minor: 0, ch: 0, kids: 1, pa: 0 };
  [['hs', 'hs'], ['minor', 'minor'], ['ch', 'ch'], ['kids', 'kids'], ['pa', 'pa']].forEach(([id, k]) => $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; st[k] = +b.dataset.v;
    $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    if (k === 'kids') $('paW').hidden = st.kids !== 0;
  }));
  $('sp').addEventListener('change', () => { $('sgW').hidden = !$('sp').checked; });
  $('el').addEventListener('input', () => { $('el').value = $('el').value.replace(/[^0-9]/g, '').slice(0, 2); });
  $('dy').addEventListener('input', () => { $('dy').value = $('dy').value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5); });
  const ages = () => String($('ma').value || '').split(/[^0-9]+/).filter(Boolean).map(Number).filter(a => a < 19).slice(0, 10);
  // 지역
  $('sd').innerHTML = A.SIDO.map(s => '<option>' + s + '</option>').join('');
  const fillGu = () => { const l = A.guList($('sd').value); $('gu').innerHTML = l.length ? l.map(g => '<option>' + g + '</option>').join('') : '<option value="">전체</option>'; $('gu').disabled = !l.length; };
  $('sd').value = '서울'; fillGu(); $('gu').value = '마포구';
  const adjAt = d => A.isAdjusted($('sd').value, $('gu').value, d);
  const updAdj = () => {
    const now = adjAt(TODAY) === true;
    $('adjTxt').textContent = '오늘 기준 ' + (now ? '조정대상지역이에요 (증여 취득세 중과·양도세 중과 판단에 써요).' : '조정대상지역이 아니에요.');
    const a = $('ad').value ? adjAt($('ad').value) : false;
    $('askW').hidden = a !== 'ask';
  };
  $('sd').addEventListener('change', () => { fillGu(); updAdj(); });
  $('gu').addEventListener('change', updAdj); $('ad').addEventListener('change', updAdj);
  updAdj();
  // 저가 양도 빠른 선택
  $('lpQ').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const mk = num($('mk')) * MAN; if (!mk) { $('err').textContent = '시세를 먼저 넣어 주세요.'; return; }
    const v = b.dataset.r === 'free' ? X.lowPrice(mk, 0).giftFreeMin : Math.round(mk * +b.dataset.r / MAN) * MAN;
    $('lp').value = Math.round(v / MAN).toLocaleString('ko-KR'); $('lp').dispatchEvent(new Event('input'));
    $('lpQ').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('err').textContent = '';
  });
  $('mk').addEventListener('change', () => { if (!num($('lp')) && num($('mk'))) { $('lp').value = Math.round(num($('mk')) * 0.8).toLocaleString('ko-KR'); $('lp').dispatchEvent(new Event('input')); } });

  /* 단지 화면 '세금' 칸에서 넘어온 값 (#mk=..&std=.. — 주소 # 뒤에만, 읽고 바로 지움) */
  (function prefill() {
    const h = (location.hash || '').slice(1); if (!/(^|[&;])mk=/.test(h)) return;
    const P = {}; h.split(/[&;]/).forEach(x => { const i = x.indexOf('='); if (i > 0) { try { P[x.slice(0, i)] = decodeURIComponent(x.slice(i + 1)); } catch (e) {} } });
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    const money = (id, v) => { if (v && /^\d{1,7}$/.test(v)) { $(id).value = (+v).toLocaleString('ko-KR'); $(id).dispatchEvent(new Event('input')); } };
    money('mk', P.mk); money('std', P.std); money('ap', P.ap);
    // 단지 세금 칸에서 미리 넣은 공시가격(같은 평형 호별 중간값)이면 출처 한 줄(assets/gongsi.js) — 고칠 수 있음
    if (window.JDJ_GONGSI && /^\d{4}-\d{2}-\d{2}$/.test(P.gs || '') && /^\d{1,7}$/.test(P.std || '') && $('stdGs') && JDJ_GONGSI.attach($('std'), { v: +P.std, d: P.gs }, $('stdGs')) && $('stdHelp'))
      $('stdHelp').textContent = '공시가격은 상속 취득세와 증여 취득세 중과(3억 원 기준)를 정하는 데 써요. 비워 두면 그 칸은 계산하지 않아요.';     // 알리미 안내는 위 출처 줄에 있음
    if (P.sd && A.SIDO.indexOf(P.sd) >= 0) { $('sd').value = P.sd; fillGu(); if (P.gu && [...$('gu').options].some(o => o.value === P.gu)) $('gu').value = P.gu; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(P.ad || '')) $('ad').value = P.ad;
    if (/^\d{1,3}$/.test(P.rm || '')) $('rm').value = P.rm;
    if (+P.ar > 85) $('o85').checked = true;
    if (P.hs === '1' || P.hs === '2' || P.hs === '3') { st.hs = +P.hs; $('hs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === P.hs)); }
    /* 길잡이(solve/) 등에서 넘어온 증여 조건: mn=1 미성년 자녀 · ch=받기 전 자녀 세대 주택 수(0~2) · pr=10년 안 받은 증여 · db=함께 넘길 채무 · lp=싸게 팔 값 · ex=필요경비 · kids=자녀 수 · sp=1 배우자 있음 · co=1 동거 10년 (금액은 만 원) */
    const seg = (id, k, v) => { const b = $(id).querySelector('button[data-v="' + v + '"]'); if (b) { st[k] = +v; $(id).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); } };
    if (P.mn === '1' || P.mn === '0') seg('minor', 'minor', P.mn);
    if (/^\d$/.test(P.ch || '')) seg('ch', 'ch', P.ch);
    if (/^\d$/.test(P.kids || '')) { seg('kids', 'kids', P.kids); $('paW').hidden = st.kids !== 0; }
    money('pr', P.pr); money('db', P.db); money('ex', P.ex);
    if (P.sp === '1') { $('sp').checked = true; $('sgW').hidden = false; }
    if (P.co === '1') $('co').checked = true;
    if (/^\d{1,7}$/.test(P.lp || '')) money('lp', P.lp);
    else if (num($('mk'))) { $('lp').value = Math.round(num($('mk')) * 0.8).toLocaleString('ko-KR'); $('lp').dispatchEvent(new Event('input')); }
    updAdj();
    if (!validate()) setTimeout(run, 0);   // 필요한 값(시세·산 날·산 가격)이 다 왔으면 바로 비교 결과까지
  })();

  function validate() {
    if (!num($('mk'))) return '지금 시세를 넣어 주세요.';
    if (!$('ad').value) return '부모님이 산 날을 넣어 주세요.';
    if ($('ad').value > TODAY) return '산 날은 오늘 이전이어야 해요.';
    if (!num($('ap'))) return '부모님이 산 가격을 넣어 주세요.';
    if (num($('lp')) > num($('mk'))) return '싸게 파는 값이 시세보다 커요.';
    if (num($('db')) >= num($('mk'))) return '함께 넘길 채무가 시세보다 같거나 커요.';
    if (num($('std')) > num($('mk')) * 2) return '공시가격이 시세보다 너무 커요. 다시 확인해 주세요.';
    if (st.kids === 0 && st.pa === 0 && !$('sp').checked) return '상속받을 사람이 없어요. 자녀 수나 배우자·부모님을 골라 주세요.';
    if (+$('dy').value > 90) return '기대여명이 너무 커요. 다시 확인해 주세요.';
    return '';
  }

  /* ---------- 결과 ---------- */
  const TITLE = { sell: '제3자에게 시세대로 팔기', low: '자녀에게 싸게 팔기', gift: '자녀에게 증여', inherit: '상속까지 보유' };
  let LAST = null;
  function run() {
    const err = validate(); $('err').textContent = err; if (err) return;
    const mk = num($('mk')) * MAN, ad = $('ad').value;
    let acqAdj = adjAt(ad); if (acqAdj === 'ask') acqAdj = $('ask').value === 'y';
    const p = { today: TODAY, market: mk, std: num($('std')) * MAN, over85: $('o85').checked, adjNow: adjAt(TODAY) === true,
      owner: { acqDate: ad, acqPrice: num($('ap')) * MAN, expenses: num($('ex')) * MAN, residMonths: num($('rm')), houses: st.hs, acqAdj: acqAdj === true, saleAdj: adjAt(TODAY) === true },
      child: { minor: !!st.minor, houses: st.ch, prior: num($('pr')) * MAN },
      low: { price: (num($('lp')) || Math.round(num($('mk')) * 0.8)) * MAN }, gift: { debt: num($('db')) * MAN },
      inh: { other: num($('io')) * MAN, fin: num($('fi')) * MAN, debt: num($('id')) * MAN, funeral: num($('fu')) * MAN, spouse: $('sp').checked,
        spouseGets: $('sp').checked && num($('sg')) ? num($('sg')) * MAN : null, children: st.kids, parents: st.kids ? 0 : st.pa,
        minorAges: ages(), elderly: num($('el')), disabledYears: +$('dy').value || 0, cohab: $('co').checked } };
    const R = X.compareTransfer(p);
    LAST = { p, R };
    const WHAT = {
      sell: '부모님이 시세 ' + krw(mk) + '에 다른 사람에게 팔아요. 자녀에게 넘어가는 건 없어요.',
      low: '부모님이 자녀에게 ' + krw(R.paths[1].price) + '에 팔아요 (시세보다 ' + krw(mk - R.paths[1].price) + ' 싸게).',
      gift: '부모님이 자녀에게 그냥 넘겨줘요' + (p.gift.debt ? ' (전세보증금·대출 ' + krw(p.gift.debt) + '도 함께 넘기는 부담부증여)' : '') + '.',
      inherit: '부모님이 계속 갖고 계시다가 상속으로 넘어가요. 지금 시세로 상속된다고 보고 계산했어요.'
    };
    const fams = R.paths.map(x => x.family).filter(v => v != null), maxF = Math.max(1, ...fams);
    $('bars').innerHTML = R.paths.map(x => '<div class="bar' + (R.best === x ? ' best' : '') + '"><div class="h"><span>' + TITLE[x.key] + '</span><span>' + (x.family == null ? '계산에 공시가격 필요' : krw(x.family)) + '</span></div>' +
      '<div class="t"><i style="width:' + (x.family == null ? 0 : Math.max(1, x.family / maxF * 100)).toFixed(1) + '%"></i></div></div>').join('');
    const itemLi = (who, it) => '<li><span><span class="who">' + who + '</span>' + esc(it.k) + '</span><span class="v">' + (it.v == null ? '확인 필요' : krw(it.v)) + '</span>' +
      (it.sub ? '<span class="sub">' + esc(it.sub) + '</span>' : '') + (it.law ? '<span class="law">근거: ' + esc(it.law) + '</span>' : '') + '</li>';
    $('cards').innerHTML = R.paths.map(x => {
      const keepTxt = x.key === 'sell' || x.key === 'low' ? krw(x.ownerKeeps) : x.key === 'gift' ? '0원 (집을 넘김)' : '집을 계속 보유';
      return '<section class="card' + (R.best === x ? ' best' : '') + '" id="c_' + x.key + '"><h3>' + TITLE[x.key] + '</h3><p class="what">' + esc(WHAT[x.key]) + '</p>' +
        '<div class="fam"><span>부모님 + 자녀 세금 합계</span><b>' + (x.family == null ? '확인 필요' : krw(x.family)) + '</b></div>' +
        '<div class="st3"><div class="s"><div class="k">부모님이 낼 세금</div><div class="v">' + (x.owner.total == null ? '확인 필요' : krw(x.owner.total)) + '</div></div>' +
        '<div class="s"><div class="k">자녀가 낼 세금</div><div class="v">' + (x.recv.items.some(i => i.v == null) ? '확인 필요' : krw(x.recv.total)) + '</div></div>' +
        '<div class="s"><div class="k">자녀가 준비할 돈</div><div class="v">' + (x.cash == null ? '확인 필요' : krw(x.cash)) + '</div></div>' +
        '<div class="s"><div class="k">부모님 손에 남는 돈</div><div class="v">' + keepTxt + '</div></div></div>' +
        (x.key === 'inherit' && x.hold ? '<div class="need">보유하는 동안 해마다 보유세 약 <b>' + krw(x.hold.total) + '</b>(올해 공시가격 기준, 재산세 ' + krw(x.hold.prop) + (x.hold.comp ? ' + 종부세 ' + krw(x.hold.comp) : '') + ')를 내요.</div>' : '') +
        (x.need.length ? '<div class="need">' + x.need.map(esc).join('<br>') + '</div>' : '') +
        (x.unsure.length ? '<div class="unsure"><b>세무사 확인 필요</b> · ' + x.unsure.map(esc).join(' · ') + '</div>' : '') +
        '<details class="how"><summary>계산 근거 · 법 조항</summary><ul class="items">' +
        x.owner.items.map(i => itemLi('부모님', i)).join('') + x.recv.items.map(i => itemLi('자녀', i)).join('') + '</ul></details>' +
        '<details class="how"><summary>조심할 점</summary><ul class="cau" style="margin-bottom:12px">' + x.cautions.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul></details></section>';
    }).join('');
    $('asm').innerHTML = R.assumptions.concat([
      '부모님 양도세는 오늘 판다고 보고, 필요경비는 넣은 값(없으면 0원)으로 계산했어요.',
      '증여 취득세 중과(12%)와 상속 취득세는 공시가격으로 판단해요. 공시가격을 비우면 그 칸은 계산하지 않아요.',
      '상속세 공제: ' + (R.paths[3].inh.soleSpouse ? '배우자 단독상속이라 기초공제 2억 + 그 밖의 인적공제' : R.paths[3].inh.lumpUsed ? '일괄공제 5억 원(기초공제 2억 + 그 밖의 인적공제 ' + krw(R.paths[3].inh.pers.sum) + '보다 큼)' : '기초공제 2억 + 그 밖의 인적공제 ' + krw(R.paths[3].inh.pers.sum) + '(일괄공제 5억보다 큼)') + ', 장례비 ' + krw(R.paths[3].inh.funeralDed) + (R.paths[3].inh.finDed ? ', 금융재산공제 ' + krw(R.paths[3].inh.finDed) : '') + '을 반영했어요. 봉안시설 비용·상속인별 증여세액공제 한도는 넣지 않았어요.'
    ]).map(x => '<li>' + esc(x) + '</li>').join('');
    // 상담
    if (BX && !$('cwrap').innerHTML) {
      BX.css();
      $('cwrap').innerHTML = BX.consultHtml('xc');
      BX.bindConsult($('xc'), consultCtx);
    } else if (BX) { const f = $('xc').querySelector('[data-txc-field]'); if (f) f.value = consultCtx().field; }
    $('out').hidden = false;
    if (window.jdjStat) jdjStat('feature_use', { feature: 'tax_transfer' });
    $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function consultCtx() {
    if (!LAST) return { from: '넘기는 방법 비교' };
    const { p, R } = LAST;
    const field = R.best ? (R.best.key === 'inherit' ? '상속' : R.best.key === 'sell' ? '양도' : '증여') : '증여';
    return { from: '넘기는 방법 비교', region: $('sd').value + ' ' + $('gu').value, field,
      conds: ['부모 ' + (p.owner.houses >= 3 ? '3채 이상' : p.owner.houses + '채'), (p.child.minor ? '미성년' : '성년') + ' 자녀(받기 전 ' + p.child.houses + '채)', p.adjNow ? '조정대상지역' : '비조정대상지역',
        p.gift.debt ? '부담부증여 검토' : '', p.inh.spouse ? '배우자 생존' : '', p.inh.cohab ? '동거주택 해당' : '', R.best ? '세금 합계 최소: ' + TITLE[R.best.key] : ''].filter(Boolean),
      amounts: ['시세 ' + krw(p.market), p.std ? '공시가격 ' + krw(p.std) : '', '취득가 ' + krw(p.owner.acqPrice) + '(' + p.owner.acqDate + ')', '저가 양도가 ' + krw(p.low.price)]
        .concat(R.paths.map(x => TITLE[x.key] + ' 합계 ' + (x.family == null ? '확인 필요' : krw(x.family)))).filter(Boolean) };
  }
  $('xf').addEventListener('submit', e => { e.preventDefault(); run(); });
  $('edit').addEventListener('click', () => { $('xf').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
})();
