/* 내가 뗀 등기부 올리기(무료) — 전세 안전 점검(jeonse/safety/)·내 전셋집 지킴이(jeonse/guard/)가 함께 써요.
   사용자가 인터넷등기소에서 직접 뗀 등기사항증명서 PDF를 이 기기 안에서만 읽어요(pdf.js, assets/vendor/pdfjs — 고를 때만 불러옴).
   파일·글자·이름은 집예보 서버를 포함해 어디에도 보내지 않고, 저장하지도 않아요(화면을 닫으면 사라져요). 분석은 assets/guard-core.js parseText·parseReg·regReport.
   JDJ_REGUP.mount(el, { base, dep: () => 보증금(만원), price: () => 집값(만원), brand: {…}|() => {…}, print, onReg(reg), onResult(sum) })  — 결과 진단은 assets/diag.js 로 el 안에 그려요. */
(function (root) {
  'use strict';
  const G = root.JDJ_GUARD, DG = root.JDJ_DIAG;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `.ru{border:1.5px solid var(--line,#E5E8EB);border-radius:16px;background:#fff;padding:16px;margin:14px 0}
.ru h3{margin:0 0 4px;font-size:18px}.ru .ru-free{display:inline-block;font-size:12.5px;font-weight:800;color:#0E7A4F;background:#E7F6EF;border-radius:999px;padding:2px 8px;margin-left:6px;vertical-align:2px}
.ru p{margin:6px 0;font-size:14.5px;line-height:1.6;word-break:keep-all}.ru .ru-priv{background:#F2F4F6;border-radius:12px;padding:10px 12px;font-size:14px;color:#333D4B}
.ru details{margin:10px 0;border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:0 12px}.ru summary{cursor:pointer;font-weight:800;min-height:46px;display:flex;align-items:center;font-size:15px}
.ru ol{margin:4px 0 12px;padding-left:22px;font-size:14.5px;line-height:1.65}.ru ol li{margin:2px 0;word-break:keep-all}
.ru .ru-pick{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border-radius:14px;background:var(--blue,#4338CA);color:#fff;font:inherit;font-size:16.5px;font-weight:800;cursor:pointer;border:0;box-sizing:border-box}
.ru .ru-pick input{position:absolute;width:1px;height:1px;opacity:0}.ru .ru-msg{font-size:14.5px;margin:8px 0 0;min-height:1em}.ru .ru-msg.err{color:#B42318}.ru .ru-msg.ok{color:#0E7A4F}
.ru .ru-res{margin-top:12px}.ru .ru-src{font-size:13px;color:#6B7684}
.ez{border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:14px;margin:14px 0;background:#fff}.ez h3{margin:0 0 8px;font-size:18px}.ez h3 small,.ez h4 small{font-weight:600;color:#6B7684;font-size:13px;margin-left:4px}
.ez h4{margin:12px 0 6px;font-size:16px}.ez-part p{margin:4px 0;font-size:14.5px;line-height:1.6}.ez-rows{list-style:none;margin:0;padding:0}.ez-rows li{display:flex;gap:10px;padding:10px 0;border-top:1px solid #F0F1F3}
.ez-rows li.ez-off{opacity:.62}.ez-rows li.ez-off b{text-decoration:line-through}.ez-no{flex:none;min-width:34px;height:26px;border-radius:8px;background:#F2F4F6;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center}
.ez-rows b{font-size:15px}.ez-rows p{margin:3px 0 0;font-size:14.5px;line-height:1.6;color:#333D4B;word-break:keep-all}.ez-tag{display:inline-block;font-size:12.5px;font-weight:800;border-radius:999px;padding:1px 8px;margin-left:4px;vertical-align:1px}
.ez-none{color:#4E5968;font-size:14.5px}.ez-src{font-size:12.5px;color:#6B7684;line-height:1.6;margin:10px 0 0}.ez-brand{display:flex;gap:10px;align-items:center;border-bottom:1px solid #F0F1F3;padding:0 0 10px;margin:0 0 10px}.ez-brand small{display:block;color:#6B7684;font-size:12.5px}.ez-brand img{border-radius:8px;object-fit:cover}
.sim{border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:14px;margin:14px 0;background:#FBFBFC}.sim h3{margin:0 0 4px;font-size:18px}.sim .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}@media(max-width:560px){.sim .g{grid-template-columns:1fr}}
.sim label{font-size:13.5px;font-weight:700;display:block;margin-bottom:3px}.sim input{width:100%;font:inherit;font-size:16px;min-height:46px;border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:0 10px;box-sizing:border-box}
.sim .out{font-size:15.5px;line-height:1.65;background:#fff;border-radius:12px;padding:10px 12px;border:1px solid #F0F1F3}.sim .out b{font-size:17px}.sim small{color:#6B7684;font-size:12.5px;line-height:1.55;display:block}
.tk{border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:14px;margin:14px 0}.tk h3{margin:0 0 6px;font-size:18px}.tk ol{margin:0;padding-left:20px;font-size:14.5px;line-height:1.65}.tk li{margin:6px 0;word-break:keep-all}.tk small{color:#6B7684;font-size:12.5px;display:block;margin-top:6px}`;
  function style() { if (document.getElementById('ruCss')) return; const s = document.createElement('style'); s.id = 'ruCss'; s.textContent = CSS; document.head.appendChild(s); }

  /** 인터넷등기소에서 등기부(열람) PDF 받는 순서 — 2026-11-27 공개 안내글 기준(공식 화면 이름이 조금 다를 수 있어요) */
  const GET_STEPS = [
    '대법원 인터넷등기소(www.iros.go.kr)에 들어가 로그인해요.',
    '[등기열람/발급] → [부동산] → [열람하기]를 눌러요.',
    '주소로 집을 찾고, 아파트·빌라처럼 호수가 있는 집은 동·호수까지 정확히 골라요.',
    "'말소사항 포함'으로 고르면 지워진 기록까지 보여서 더 정확해요.",
    '열람 수수료 1,100원(2026년 11월 23일부터)을 결제해요. 이 돈은 법원에 내는 수수료이고 집예보와는 상관없어요.',
    '열람 화면에서 [저장](또는 [인쇄] → PDF로 저장)을 눌러 PDF 파일로 저장해요.',
    '아래 [등기부 PDF 고르기]를 눌러 저장한 파일을 골라요.'
  ];

  let LIB = null;
  function pdfjs(base) {
    return LIB || (LIB = import(base + 'assets/vendor/pdfjs/pdf.min.mjs').then(m => { m.GlobalWorkerOptions.workerSrc = base + 'assets/vendor/pdfjs/pdf.worker.min.mjs'; return m; }).catch(e => { LIB = null; throw e; }));
  }
  /** PDF → 줄 글자(같은 높이의 글자를 왼쪽부터 이어 붙임) */
  async function pdfText(buf, base) {
    const m = await pdfjs(base);
    const doc = await m.getDocument({ data: buf, cMapUrl: base + 'assets/vendor/pdfjs/cmaps/', cMapPacked: true, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
    const lines = [];
    for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
      const tc = await (await doc.getPage(p)).getTextContent(), rows = [];
      tc.items.forEach(it => { if (!it.str) return; const y = it.transform[5], x = it.transform[4]; let r = rows.find(z => Math.abs(z.y - y) < 2.5); if (!r) rows.push(r = { y: y, a: [] }); r.a.push({ x: x, s: it.str }); });
      rows.sort((a, b) => b.y - a.y).forEach(r => lines.push(r.a.sort((a, b) => a.x - b.x).map(z => z.s).join(' ')));
    }
    try { doc.destroy(); } catch (e) {}
    return lines.join('\n');
  }

  function mount(el, opt) {
    if (!el || !G) return;
    opt = opt || {}; style();
    const base = opt.base || '';
    el.innerHTML = `<section class="ru" aria-labelledby="ruT">
      <h3 id="ruT">내가 뗀 등기부 올리기<span class="ru-free">무료</span></h3>
      <p>인터넷등기소에서 직접 뗀 등기부(PDF)를 고르면 집주인·근저당·압류·경매·신탁 같은 위험 신호를 쉬운 말로 정리하고, <b>선순위 채권</b> 칸도 채워 드려요.</p>
      <p class="ru-priv"><span aria-hidden="true">🔒</span> <b>파일은 이 기기 안에서만 읽어요.</b> 파일·이름·주민번호는 집예보 서버를 포함해 어디에도 보내지 않고 저장하지도 않아요. 화면을 닫으면 사라져요.</p>
      <details><summary>등기부 PDF 받는 방법(열람 수수료 1,100원)</summary><ol>${GET_STEPS.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <p class="ru-src">메뉴 이름은 2026년 11월 27일 공개 안내글로 정리했어요. 인터넷등기소 화면이 바뀌면 이름이 조금 다를 수 있어요. <a href="https://www.iros.go.kr/" target="_blank" rel="noopener">인터넷등기소 열기 ↗</a></p></details>
      <label class="ru-pick" data-track="regup_pick"><input type="file" accept="application/pdf,.pdf" data-ru-file><span aria-hidden="true">📄</span> 등기부 PDF 고르기</label>
      <p class="ru-msg" data-ru-msg aria-live="polite"></p>
      <div class="ru-res" data-ru-res></div>
    </section>`;
    const msg = (t, c) => { const m = el.querySelector('[data-ru-msg]'); m.className = 'ru-msg' + (c ? ' ' + c : ''); m.textContent = t || ''; };
    const inp = el.querySelector('[data-ru-file]');
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; inp.value = '';
      if (!f) return;
      if (f.size > 15 * 1024 * 1024) return msg('파일이 너무 커요(15MB까지). 등기부 PDF가 맞는지 확인해 주세요.', 'err');
      msg('이 기기에서 등기부를 읽는 중이에요…');
      let text = '';
      try { text = await pdfText(new Uint8Array(await f.arrayBuffer()), base); }
      catch (e) { return msg('PDF를 열지 못했어요. 비밀번호가 걸려 있거나 손상된 파일일 수 있어요. 인터넷등기소에서 다시 저장해 주세요.', 'err'); }
      const reg = G.parseText(text);
      if (!reg.ok) return msg(text.replace(/\s/g, '').length < 30 ? '글자를 읽을 수 없는 PDF예요(사진처럼 저장된 파일). 인터넷등기소 열람 화면에서 [저장]으로 받은 PDF를 골라 주세요.' : '등기부 모양을 찾지 못했어요. 인터넷등기소에서 받은 등기사항증명서 PDF가 맞는지 확인해 주세요.', 'err');
      text = '';                                                   // 원문 글자는 바로 버림(나눈 줄은 이 화면을 그리는 동안만 기기 메모리에)
      const sum = render(el.querySelector('[data-ru-res]'), reg, opt);
      msg(`다 읽었어요. 지워지지 않은 근저당·전세권 등 ${sum.liens.length}건을 찾았어요. 원본과 꼭 맞춰 보세요.`, 'ok');
      if (root.jdjStat) try { root.jdjStat('feature_use', { feature: 'regup' }); } catch (e) {}   // 집계에는 '썼다'만(내용 없음)
      if (opt.onReg) opt.onReg(reg);                               // 중개사 확인·설명서 칸 보조(같은 기기 안)
      if (opt.onResult) opt.onResult(sum);
    });
  }
  /** 결과 한 벌: 진단(diag.js) + 쉽게 읽는 등기부 + 내 보증금 순서(참고 계산) + 특약 문구 예시. 업체 열람 결과(같은 모양)도 이 함수로 그려요 */
  function render(box, reg, opt) {
    opt = opt || {}; style();
    const base = opt.base || '', sum = G.parseReg(reg), dep0 = opt.dep ? opt.dep() : 0, price0 = opt.price ? opt.price() : 0;
    const rep = G.regReport(sum, { dep: dep0 });
    box.innerHTML = '<div data-ru-dg></div>' + G.easyView(reg, { brand: typeof opt.brand === 'function' ? opt.brand() : opt.brand }) + `<section class="sim" aria-labelledby="simT"><h3 id="simT">내 보증금 순서 — 참고 계산</h3>
      <small>집이 경매로 팔린다고 가정하고, 나보다 앞선 권리(을구 근저당·전세권 등 합계)를 먼저 빼면 내 보증금이 얼마나 남는지 단순하게 계산해요. 법률 판단이 아니라 참고 계산이에요.</small>
      <div class="g"><div><label for="simP">집값(시세, 만원)</label><input id="simP" inputmode="numeric" value="${price0 ? Math.round(price0).toLocaleString() : ''}" placeholder="예: 50,000"></div>
        <div><label for="simR">경매에서 팔릴 비율(%)</label><input id="simR" inputmode="numeric" value="80"></div>
        <div><label for="simD">내 보증금(만원)</label><input id="simD" inputmode="numeric" value="${dep0 ? Math.round(dep0).toLocaleString() : ''}" placeholder="예: 30,000"></div></div>
      <div class="out" data-sim-out aria-live="polite"></div>
      <small>가정: 경매에서 시세의 80%에 팔린다고 놓았어요(지역·시기마다 크게 달라요 — 직접 바꿔 보세요). 경매 비용, 집주인 세금(당해세), 소액 임차인 최우선변제, 나보다 먼저 들어온 다른 세입자 보증금은 넣지 않았어요. 내 전입·확정일자가 근저당보다 빠르면 그 근저당은 나보다 뒤예요.</small></section>
      <section class="tk" aria-labelledby="tkT"><h3 id="tkT">계약서에 넣을 만한 특약 문구 예시</h3><ol>${G.clauses(sum).map(c => `<li>${G.esc(c)}</li>`).join('')}</ol>
      <small>여러 계약에서 널리 쓰이는 일반 예시예요. 내 계약에 맞는지, 문구를 어떻게 다듬을지는 중개사·법률 전문가와 꼭 확인하세요.</small></section>`;
    if (DG) DG.mount(box.querySelector('[data-ru-dg]'), rep, { base: base, track: 'regup', print: !!opt.print });
    const n = id => Number(String(box.querySelector('#' + id).value || '').replace(/[^\d.]/g, '')) || 0;
    const sim = () => {
      const r = G.simulate({ price: n('simP'), ratio: n('simR') / 100, dep: n('simD'), senior: sum.senior }), out = box.querySelector('[data-sim-out]');
      if (!(n('simP') > 0) || !(n('simD') > 0)) { out.innerHTML = '집값과 내 보증금을 넣으면 계산해 드려요.'; return; }
      out.innerHTML = `예상 매각가 <b>${G.man(r.sale)}</b> − 앞선 권리 <b>${G.man(r.ahead)}</b> → 돌려받을 수 있는 보증금 <b>${G.man(r.back.lo)} ~ ${G.man(r.back.hi)}</b>${r.short > 0 ? `<br><span style="color:#B42318;font-weight:800">최대 ${G.man(r.short)}을(를) 돌려받지 못할 수 있어요.</span>` : '<br><span style="color:#0E7A4F;font-weight:800">이 가정에서는 보증금 전액이 남아요.</span>'}<br><small>범위는 팔릴 비율을 ${Math.round(r.ratio * 100) - 10}%~${Math.round(r.ratio * 100)}%로 놓고 계산했어요.</small>`;
    };
    ['simP', 'simR', 'simD'].forEach(id => box.querySelector('#' + id).addEventListener('input', sim)); sim();
    return sum;
  }
  root.JDJ_REGUP = { mount, render, pdfText, GET_STEPS };
})(typeof window !== 'undefined' ? window : this);
