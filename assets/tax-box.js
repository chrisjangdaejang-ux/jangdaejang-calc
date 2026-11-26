/* 단지 화면 '세금' 칸 (/mine/ 내 집 시세 카드, /buy/report/ 단지 카드) + '이 결과로 상담받기'
   - 시세를 그대로 넣어 취득세 · 보유세(공시가격: 그 단지·평형 호별 중간값을 미리 넣고 출처 한 줄 — assets/gongsi.js, 고칠 수 있음.
     공시가격 자료가 없는 단지는 직접 입력. 시세×현실화율 추정은 하지 않음) · 양도세(취득가·취득일 입력)
   - 계산식은 /tax/tax-engine.js(JDJ_TAX)를 그대로 씀. 입력값은 이 기기 밖으로 보내지 않음.
   - [자세히] → /tax/ 로 값 넘김: 주소 # 뒤에만 담아(서버·통계로 가지 않음) 받는 화면이 읽고 바로 지움
   - 상담: 기존 상담 신청서(구글 폼)를 그대로 씀. 연락처는 신청서에 직접 적고, 이 화면은 조건 요약만 미리 채움(금액은 동의할 때만). */
(function () {
  'use strict';
  /* 근거 문구: tax/tax-verified.js(테스트가 모두 통과할 때 만드는 파일)의 숫자만 씀. 파일이 없으면 확인 안내만 */
  function verNote() {
    const V = (typeof window !== 'undefined' && window.JDJ_TAX_VERIFIED) || null;
    const tail = '신고 전에 홈택스·위택스나 세무사와 확인해 주세요.';
    return V && V.ntsTotal > 0 ? `세금 계산 화면과 같은 계산 엔진이에요(국세청 공개 계산 사례 ${V.ntsTotal}건과 같은 결과). ${tail}` : tail;
  }
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const BASE = JB.SITE;
  const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLScCG7wzIlY3FE6EHU5QWo92uW5NQe7aiP-GJ9jvh41Rx2E8Zw/viewform';
  const F_REGION = 'entry.397234060', F_MEMO = 'entry.658364183';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = v => parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10) || 0;
  const MAN = 10000;
  function krw(w) {
    if (w == null) return '-';
    w = Math.round(w / MAN); if (w === 0) return '0원';
    const e = Math.floor(Math.abs(w) / 10000), m = Math.abs(w) % 10000;
    return (w < 0 ? '−' : '') + (e ? e.toLocaleString('ko-KR') + '억' + (m ? ' ' : '') : '') + (m ? m.toLocaleString('ko-KR') + '만' : '') + ' 원';
  }
  const pct = r => (Math.round(r * 10000) / 100) + '%';
  const today = () => { const t = new Date(), p = n => String(n).padStart(2, '0'); return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); };
  const track = (n, p) => { try { if (window.JDJ && JDJ.track) JDJ.track(n, p || {}); } catch (e) {} };

  /* ---------- 엔진 불러오기(필요할 때만) ---------- */
  let loading = null;
  function load() {
    if (window.JDJ_TAX && window.JDJ_ADJ) return Promise.resolve();
    if (loading) return loading;
    const add = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    loading = (window.JDJ_ADJ ? Promise.resolve() : add(BASE + 'tax/adjusted-areas.js')).then(() => window.JDJ_TAX ? null : add(BASE + 'tax/tax-engine.js?v=4'))
      .then(() => window.JDJ_GONGSI ? null : add(BASE + 'assets/gongsi.js?v=4').catch(() => null));     // 공시가격 자료는 없어도 세금 칸은 그대로
    return loading;
  }

  /* ---------- 지역 → 조정대상지역 표의 이름 ---------- */
  function adjRegion(sidoFull, gu) {
    const s = String(sidoFull || ''), g = String(gu || '').trim();
    if (/^서울/.test(s)) return { sido: '서울', gu: g };
    if (/^경기/.test(s)) {
      const list = window.JDJ_ADJ ? JDJ_ADJ.guList('경기') : [];
      if (list.indexOf(g) >= 0) return { sido: '경기', gu: g };
      if (/^화성시/.test(g)) return { sido: '경기', gu: '화성시 그 밖의 구' };
      return { sido: '경기', gu: '그 밖의 시·군' };
    }
    if (/^인천/.test(s)) return { sido: '인천', gu: '' };
    return { sido: '그 밖의 지역', gu: '' };
  }

  /* ---------- 스타일 ---------- */
  function css() {
    if (document.getElementById('txbCss')) return;
    const st = document.createElement('style'); st.id = 'txbCss';
    st.textContent = `.txb [hidden],.txc [hidden]{display:none!important}
.txb h3{font-size:16px;margin:0 0 8px;font-weight:900}
.txb .tsec{border-top:1px solid var(--line2,#F0F1F3);padding:14px 0}
.txb .tsec:first-of-type{border-top:0;padding-top:0}
.txb .seg{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.txb .seg button{font:inherit;font-size:14px;font-weight:700;min-height:44px;padding:0 12px;border-radius:999px;background:var(--gray,#F2F4F6);color:var(--sub,#3E4754);border:1px solid transparent;cursor:pointer}
.txb .seg button.on{border-color:var(--blue,#4338CA);color:var(--blue,#4338CA);background:var(--blue-l,#EEEDFB)}
.txb .f2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}
.txb .f2>*{min-width:0}
.txb label.l{display:block;font-size:13.5px;font-weight:700;color:var(--sub,#3E4754);margin-bottom:4px}
.txb .in{display:flex;align-items:center;gap:6px;background:var(--gray,#F2F4F6);border-radius:12px;padding:4px 12px;border:2px solid transparent;min-height:48px}
.txb .in:focus-within{border-color:var(--blue,#4338CA)}
.txb .in input,.txb .in select{border:0;outline:none;background:transparent;font:inherit;font-size:16px;font-weight:700;flex:1;min-width:0;color:var(--text,#191F28);padding:0;min-height:44px;box-shadow:none}
.txb .in input[type=date]{font-size:14.5px;letter-spacing:-.3px}
.txb .in span{font-size:14px;font-weight:700;color:var(--sub2,#4E5968);white-space:nowrap}
.txb .out{background:var(--gray2,#F9FAFB);border:1px solid var(--line,#E5E8EB);border-radius:14px;padding:12px 14px;margin-top:4px}
.txb .out .big{font-size:22px;font-weight:900;letter-spacing:-.4px;font-variant-numeric:tabular-nums}
.txb .out small{display:block;font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.55;margin-top:2px}
.txb .out .pl{display:inline-block;font-size:13px;font-weight:700;border-radius:999px;padding:2px 10px;margin-left:6px;vertical-align:3px;background:var(--blue-l,#EEEDFB);color:var(--blue,#4338CA)}
.txb .out .pl.ok{background:var(--pos-l,#E6F5EE);color:var(--pos,#0E7A4F)}.txb .out .pl.no{background:var(--neg-l,#FDECE4);color:var(--neg,#C2410C)}
.txb .tog{display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:700;margin:0 0 8px;min-height:44px;cursor:pointer}
.txb .tog input{width:20px;height:20px;flex:none}
.txb .hint{font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.55;margin:0 0 8px}
.txb .hint a{color:var(--blue,#4338CA)}
.txb a.more{display:inline-flex;align-items:center;min-height:44px;font-size:14.5px;font-weight:700;color:var(--blue,#4338CA);text-decoration:none}
.txb .gos{display:grid;gap:8px;margin-top:6px}
.txb .gos .btn{width:100%}
.txb .note1{font-size:13px;color:var(--sub2,#4E5968);margin:12px 0 0;line-height:1.55}
.txc{margin-top:16px;border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:16px;background:#fff}
.txc h3{font-size:17px;margin:0 0 4px;font-weight:900}
.txc .d{font-size:14px;color:var(--sub2,#4E5968);margin:0 0 10px;line-height:1.55}
.txc .opt{border-top:1px solid var(--line2,#F0F1F3);padding:12px 0 4px}
.txc .opt b{display:block;font-size:15.5px}
.txc .opt small{display:block;font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.55;margin:2px 0 8px}
.txc .btn{width:100%}
.txc .ready{display:inline-block;font-size:12.5px;font-weight:700;color:var(--sub2,#4E5968);background:var(--line2,#F0F1F3);border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:2px}
.txc select{width:100%;min-height:48px;font:inherit;font-size:15.5px;font-weight:700;border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:0 10px;background:#fff;margin-bottom:8px}
.txc .tog{display:flex;align-items:flex-start;gap:8px;font-size:14px;margin:8px 0 0;cursor:pointer;line-height:1.5}
.txc .tog input{width:20px;height:20px;flex:none;margin-top:1px}`;
    document.head.appendChild(st);
  }

  /* ---------- 상담 연결 ---------- */
  /** ctx: { from:'세금 칸'|'넘기는 방법 비교', region, conds:[금액 없는 조건], amounts:[금액 문장], field:'양도'|'증여'|'상속' } (함수로 넘기면 누를 때 다시 읽음) */
  function consultHtml(id) {
    return `<div class="txc" id="${id}">
  <h3>이 결과로 상담받기</h3>
  <p class="d">연락처는 다음 화면(상담 신청서)에 직접 적어 주세요. 이 화면은 계산 조건만 미리 채워 드려요.</p>
  <div class="opt"><b>부동산 전문가 상담 · 부동산 전망 + 세금</b><small>부동산 전문가가 직접, 이 집의 앞으로 흐름과 세금을 같이 봐 드려요.</small>
    <a class="btn primary" data-txc="jdj" href="${FORM}" target="_blank" rel="noopener">부동산 전문가에게 상담 신청</a></div>
  <div class="opt"><b>분야별 제휴 세무사<span class="ready">준비 중</span></b><small>제휴 세무사를 모시는 중이에요. 지금 신청을 남겨 주시면 분야에 맞는 세무사가 정해지는 대로 연락드려요.</small>
    <select data-txc-field aria-label="상담 분야"><option value="양도">양도 전문 (팔 때 양도세)</option><option value="증여">증여 전문 (증여·저가 양도)</option><option value="상속">상속 전문 (상속세·상속주택)</option></select>
    <a class="btn ghost" data-txc="tax" href="${FORM}" target="_blank" rel="noopener">제휴 세무사 상담 신청</a></div>
  <label class="tog"><input type="checkbox" data-txc-amt> 계산에 넣은 금액(시세·취득가·세금)도 신청서에 함께 적기 (선택)</label>
</div>`;
  }
  function bindConsult(root, ctxFn) {
    if (!root) return;
    const fld = root.querySelector('[data-txc-field]');
    const c0 = ctxFn(); if (fld && c0.field) fld.value = c0.field;
    root.querySelectorAll('a[data-txc]').forEach(a => a.addEventListener('click', () => {
      const c = ctxFn(), withAmt = root.querySelector('[data-txc-amt]').checked, kind = a.dataset.txc;
      const head = kind === 'jdj' ? '[세금 상담 · 부동산 전문가 상담]' : '[제휴 세무사 상담 신청 · ' + (fld ? fld.value : '') + ' 전문 · 준비 중]';
      const memo = [head, c.from].concat(c.conds || []).concat(withAmt ? (c.amounts || []) : []).filter(Boolean).join(' | ').slice(0, 900);
      const q = new URLSearchParams({ usp: 'pp_url' });
      if (c.region) q.set(F_REGION, c.region);
      q.set(F_MEMO, memo);
      a.href = FORM + '?' + q.toString().replace(/\+/g, '%20');
      track(kind === 'jdj' ? 'tax_consult_jdj' : 'tax_consult_partner', { from: c.from, field: fld ? fld.value : '', amt: withAmt ? 1 : 0 });
    }));
  }

  /* ---------- 세금 칸 ---------- */
  let seq = 0;
  /** o: { price(만원), area(㎡), sido(시·도 전체 이름), gu(시·군·구 이름), apt, band, mode:'mine'|'buy', bpEl, bdEl(매수가·매수 시기 입력칸),
          code(시군구 코드)·dong·jibun(공시가격 찾기용 — 없으면 직접 입력만) } */
  function mount(el, o) {
    if (!el || !(o.price > 0)) return Promise.resolve(false);
    css();
    return load().then(() => render(el, o)).catch(() => { el.innerHTML = ''; return false; });
  }
  function render(el, o) {
    const T = window.JDJ_TAX, A = window.JDJ_ADJ, id = 'txb' + (++seq), D = today();
    const rg = adjRegion(o.sido, o.gu), adjNow = A.isAdjusted(rg.sido, rg.gu, D) === true;
    const P = o.price * MAN, over85 = o.area > 85, own = o.mode !== 'buy';
    const st = { n: 1, temp: false, one: 'y', hs: 1, ask: 'y' };
    el.classList.add('panel', 'txb'); el.hidden = false;
    el.innerHTML = `<h2>세금<small style="display:block;font-size:13.5px;font-weight:500;color:var(--sub2);margin-top:4px;letter-spacing:0">시세 ${krw(P)} 기준 · 2026년 11월 시행 법령 · ${adjNow ? '지금 조정대상지역' : '지금 조정대상지역 아님'} · 입력값은 이 기기 안에서만 계산해요</small></h2>
  <div class="tsec"><h3>사면 내는 취득세</h3>
    <div class="hint">이 집을 산 뒤 세대 전체 주택 수</div>
    <div class="seg" data-k="n">${[1, 2, 3, 4].map(n => `<button type="button" data-v="${n}" class="${n === 1 ? 'on' : ''}">${n === 4 ? '4채 이상' : n + '채'}</button>`).join('')}</div>
    <label class="tog" data-temp hidden><input type="checkbox"> 이사용이에요 (기존 집을 기한 안에 팔 예정 — 기존 집도 조정대상지역이면 2년, 아니면 3년)</label>
    ${own ? '' : '<label class="tog" data-first><input type="checkbox"> 생애 처음 사는 집이에요 (본인·배우자 모두 집을 가진 적 없음 — 12억 원 이하면 취득세 200만 원 한도 감면)</label>'}
    <div class="out" data-o="acq" aria-live="polite"></div>
    <a class="more" data-a="acq" href="#" data-track="taxbox_acq_more">취득세 자세히 ›</a></div>
  <div class="tsec"><h3>해마다 내는 보유세</h3>
    <div class="f2"><div><label class="l" for="${id}s">올해 공시가격</label><div class="in"><input id="${id}s" inputmode="numeric" autocomplete="off" placeholder="공시가격"><span>만 원</span></div></div>
      <div><label class="l" for="${id}o">세대 주택 수</label><div class="in"><select id="${id}o"><option value="y">이 집 한 채</option><option value="n">다른 집도 있어요</option></select></div></div></div>
    <div data-gsn hidden></div>
    <p class="hint" data-gsh>${esc(o.apt || '이 집')}의 공시가격은 <a href="https://www.realtyprice.kr/notice/main/mainBody.htm" target="_blank" rel="noopener">부동산공시가격알리미 ↗</a>에서 동·호수로 확인해 넣어 주세요. 시세로 공시가격을 추정하지 않아요.</p>
    <div class="out" data-o="hold" aria-live="polite"></div>
    <a class="more" data-a="prop" href="#" data-track="taxbox_prop_more">재산세 자세히 ›</a></div>
  ${own ? `<div class="tsec"><h3>팔면 내는 양도세 (오늘 시세로 판다면)</h3>
    <div class="f2"><div><label class="l" for="${id}p">산 가격</label><div class="in"><input id="${id}p" inputmode="numeric" autocomplete="off" placeholder="60,000"><span>만 원</span></div></div>
      <div><label class="l" for="${id}d">산 날 (잔금일)</label><div class="in"><input id="${id}d" type="date" min="1990-01-01" max="${D}"></div></div></div>
    <div class="f2"><div><label class="l" for="${id}r">실제로 거주한 기간</label><div class="in"><input id="${id}r" inputmode="numeric" autocomplete="off" placeholder="0"><span>개월</span></div></div>
      <div><label class="l" for="${id}h">세대 주택 수 (이 집 포함)</label><div class="in"><select id="${id}h"><option value="1">1채</option><option value="2">2채</option><option value="3">3채 이상</option></select></div></div></div>
    <div data-ask hidden><label class="l" for="${id}k">사실 때 조정대상지역이었나요? (이 지역·기간은 자동 판정이 어려워요)</label><div class="in"><select id="${id}k"><option value="y">네 (모르면 이쪽이 보수적)</option><option value="n">아니요</option></select></div></div>
    <p class="hint" data-bdh hidden>매수 시기(연·월)만 알고 있어 그달 1일로 넣었어요. 정확한 잔금일로 고쳐 주세요 — 하루 차이로 비과세·공제율이 바뀔 수 있어요.</p>
    <div class="out" data-o="cgt" aria-live="polite"></div>
    <a class="more" data-a="cgt" href="#" data-track="taxbox_cgt_more">양도세 자세히 · 언제 팔면 줄어드는지 ›</a></div>` : ''}
  <div class="gos"><a class="btn ghost" data-a="xfer" href="#" data-track="taxbox_transfer">이 집 어떻게 넘기는 게 유리할까? (양도·저가 양도·증여·상속 비교) ›</a></div>
  ${consultHtml(id + 'c')}
  <p class="note1">${verNote()}</p>`;
    const q = s => el.querySelector(s), $i = suf => document.getElementById(id + suf);
    const fmt = inp => { const v = num(inp.value); inp.value = v ? v.toLocaleString('ko-KR') : ''; };
    el.querySelectorAll('input[inputmode=numeric]').forEach(i => i.addEventListener('input', () => { if (i.id !== id + 'r') fmt(i); else i.value = i.value.replace(/[^0-9]/g, '').slice(0, 3); upd(); }));
    el.querySelectorAll('select, input[type=date], input[type=checkbox]').forEach(i => i.addEventListener('change', upd));
    q('.seg[data-k="n"]').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.n = +b.dataset.v; q('.seg[data-k="n"]').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); upd(); });
    // 내 집 매수가·매수 시기 칸에서 가져오기
    const pull = () => {
      if (!own) return;
      if (o.bpEl && !$i('p').value && num(o.bpEl.value)) $i('p').value = num(o.bpEl.value).toLocaleString('ko-KR');
      if (o.bdEl && !$i('d').value && /^\d{4}-\d{2}$/.test(o.bdEl.value)) { $i('d').value = o.bdEl.value + '-01'; q('[data-bdh]').hidden = false; }
    };
    pull();
    if (own) { [o.bpEl, o.bdEl].forEach(x => x && x.addEventListener('change', () => { pull(); upd(); })); $i('d').addEventListener('input', () => { q('[data-bdh]').hidden = true; }); }

    let gs = null;                                     // 공시가격 자동 채움(assets/gongsi.js attach 결과)
    const gsd = () => gs && !gs.edited() ? gs.info.d : '';   // 넘기는 화면에 출처 표시용(고친 값이면 안 넘김)
    const hash = (v, kv) => BASE + 'tax/' + '#' + v + ';' + Object.entries(kv).filter(([, x]) => x !== '' && x != null).map(([k, x]) => k + '=' + encodeURIComponent(x)).join(';');
    let last = {};
    function upd() {
      // 취득세
      const tw = q('[data-temp]'); tw.hidden = !(st.n === 2 && adjNow);
      const fw = q('[data-first]'); if (fw) fw.hidden = st.n !== 1;
      const first = !!fw && !fw.hidden && fw.querySelector('input').checked;
      // 단지 화면은 아파트라 생애최초 한도 200만 원(소형주택·인구감소지역 300만 원은 /tax/ 취득세 화면에서 고름)
      const a = T.acqTax({ price: P, houses: st.n, adj: adjNow, temp: !tw.hidden && tw.querySelector('input').checked, over85, first });
      q('[data-o="acq"]').innerHTML = `<span class="big">${krw(a.total)}</span><span class="pl ${a.heavy ? 'no' : ''}">취득세율 ${pct(a.rate)}</span>
        <small>취득세 ${krw(a.acq)}${a.relief ? ' − 생애최초 감면 ' + krw(a.relief) : ''} + 지방교육세 ${krw(a.edu)}${a.farm ? ' + 농어촌특별세 ' + krw(a.farm) : ''} · ${esc(a.why)}${over85 ? ' · 전용 85㎡ 초과' : ''}${a.first ? '<br>3년 안에 팔거나 임대하면 감면세액을 다시 내요.' : a.notes.length ? '<br>' + esc(a.notes[0]) : ''}<br>지방세법 제11조 제1항 제8호·제13조의2·제151조${a.first ? ', 지방세특례제한법 제36조의3' : ''}, 농어촌특별세법 제5조</small>`;
      q('[data-a="acq"]').href = hash('acq', { pr: o.price, n: st.n, sd: rg.sido, gu: rg.gu, o85: over85 ? 1 : '', fh: first ? 1 : '' });
      // 보유세
      const std = num($i('s').value) * MAN, one = $i('o').value === 'y';
      let hold = '';
      if (std > 0) {
        const pt = T.propertyTax({ price: std, one });
        if (one) { const ct = T.compTax({ prices: [std], one: true, age: 0, years: 0 }); hold = `<span class="big">${krw(pt.total + ct.total)}</span><span class="pl">한 해</span><small>재산세 ${krw(pt.total)} (7월·9월 나눠 냄)${ct.total ? ' + 종합부동산세 ' + krw(ct.total) + ' (12월, 나이·보유기간 공제 전)' : ' · 종부세 없음 (1세대1주택 공시가격 12억 원 이하)'}<br>지방세법 제110조·제111조·제111조의2, 종합부동산세법 제8조·제9조</small>`; }
        else hold = `<span class="big">${krw(pt.total)}</span><span class="pl">재산세</span><small>다른 집이 있으면 종합부동산세는 가진 집 공시가격을 모두 합쳐 계산해요 → <a href="${hash('cpt', {})}">종부세 계산</a><br>지방세법 제110조·제111조 (공정시장가액비율 60%)</small>`;
      } else hold = '<small style="margin:0">공시가격을 넣으면 재산세·종합부동산세가 바로 나와요.</small>';
      q('[data-o="hold"]').innerHTML = hold;
      q('[data-a="prop"]').href = hash('prop', { std: std ? std / MAN : '', one: one ? 'y' : 'n', gs: std ? gsd() : '' });
      const ca = q('[data-o="hold"] a'); if (ca) ca.href = hash('cpt', { std: std ? std / MAN : '', gs: std ? gsd() : '' });
      // 양도세
      let cgt = null;
      if (own) {
        const ap = num($i('p').value) * MAN, ad = $i('d').value, rm = num($i('r').value), hs = +$i('h').value;
        const askAdj = ad ? A.isAdjusted(rg.sido, rg.gu, ad) : false;
        q('[data-ask]').hidden = askAdj !== 'ask';
        const acqAdj = askAdj === 'ask' ? $i('k').value === 'y' : askAdj === true;
        if (ap > 0 && ad && ad <= D) {
          cgt = T.calcCGT({ acqDate: ad, acqPrice: ap, saleDate: D, salePrice: P, expenses: 0, residMonths: rm, houses: hs, acqAdj, saleAdj: adjNow, tempTwo: null });
          const pl = cgt.exempt === 'full' ? '<span class="pl ok">비과세</span>' : cgt.exempt === 'partial' ? '<span class="pl">12억 초과분만 과세</span>' : cgt.heavy ? `<span class="pl no">중과 +${Math.round(cgt.heavy * 100)}%p</span>` : '';
          q('[data-o="cgt"]').innerHTML = `<span class="big">${krw(cgt.total)}</span>${pl}<small>양도차익 ${krw(cgt.gain)} · 보유 ${cgt.holdY}년 · 장기보유특별공제 ${pct(cgt.ltdRate)} · 지방소득세 포함 · 필요경비 0원 가정<br>소득세법 제89조·제95조·제104조, 지방세법 제103조의3</small>`;
        } else q('[data-o="cgt"]').innerHTML = '<small style="margin:0">산 가격과 산 날을 넣으면 오늘 팔 때 양도세가 나와요.</small>';
        q('[data-a="cgt"]').href = hash('cgt', { sp: o.price, ap: ap ? ap / MAN : '', ad, sd: rg.sido, gu: rg.gu, hs, rm, ask: askAdj === 'ask' ? $i('k').value : '' });
        last = { ap, ad, rm, hs };
      }
      const xk = { mk: o.price, sd: rg.sido, gu: rg.gu, ar: o.area || '', std: std ? std / MAN : '', gs: std ? gsd() : '', ap: last.ap ? last.ap / MAN : '', ad: last.ad || '', rm: last.rm || '', hs: last.hs || '' };
      q('[data-a="xfer"]').href = BASE + 'tax/transfer/#' + Object.entries(xk).filter(([, x]) => x !== '' && x != null).map(([k, x]) => k + '=' + encodeURIComponent(x)).join('&');
      el._ctx = { a, std, cgt };
    }
    upd();
    // 공시가격: 그 단지·평형 호별 중간값을 미리 넣기(자료가 없거나 받기 실패면 지금처럼 직접 입력)
    if (window.JDJ_GONGSI && o.code && o.dong && o.jibun != null) {
      JDJ_GONGSI.get(o).then(info => {
        if (!info || !el.contains($i('s'))) return;
        gs = JDJ_GONGSI.attach($i('s'), info, q('[data-gsn]'));
        if (gs) { q('[data-gsh]').hidden = true; track('taxbox_gongsi_fill', { band: o.band || '' }); upd(); }
      }).catch(() => {});
    }
    bindConsult($i('c'), () => {
      const c = el._ctx || {};
      return { from: '세금 칸 · ' + (o.apt || '') + ' ' + (o.band || ''), region: (o.sido || '') + ' ' + (o.gu || ''), field: '양도',
        conds: [own ? '내 집' : '살 집 후보', adjNow ? '조정대상지역' : '비조정대상지역', '산 뒤 ' + st.n + '채'].filter(Boolean),
        amounts: ['시세 ' + krw(P), c.a ? '취득세 ' + krw(c.a.total) : '', c.std ? '공시가격 ' + krw(c.std) : '', c.cgt ? '오늘 팔면 양도세 ' + krw(c.cgt.total) : ''] };
    });
    return true;
  }
  /** 보일 때 한 번만 그리기 (단지 카드 '자세한 리포트' 안처럼 처음엔 숨은 곳) */
  function lazy(el, o) {
    if (!el || el._txb) return;
    el._txb = 1;
    const go = () => mount(el, o);
    if (!('IntersectionObserver' in window)) return go();
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); go(); } });
    io.observe(el);
  }
  window.JDJ_TAXBOX = { mount, lazy, consultHtml, bindConsult, adjRegion, css, load };
})();
