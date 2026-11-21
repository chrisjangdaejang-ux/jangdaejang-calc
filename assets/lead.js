/* 집코드 '중개사 연락 받기' — 공용 (JDJ_LEAD)
   - 이용자가 따로 동의한 경우에만, 이용자가 고른(최대 3곳) 또는 공개 순번 규칙으로 정해진(2곳) 그 동네 제휴 중개사에게 문의를 전달한다.
   - 집코드는 중개하지 않고 중개 보수를 받지 않는다. 매물을 게시하지 않는다. 화면에 '제휴·광고' 표시.
   - 서버(agent-backend.gs v19)의 공개 목록에 lead 칸이 있을 때만 켜진다(재배포 전에는 버튼이 나오지 않음).
   - 연락처는 서버로만 보내고 이 기기·통계(GA)에는 남기지 않는다. 이 기기에는 취소 링크(문의 번호·취소 열쇠)만 남긴다.
   사용: JDJ_LEAD.mount(el, {src:'report'|'mine'|'alert'|'sell'|'compare', kind:'buy'|'sell'|'both', g:'11680', gn:'강남구', k:'11680|대치동|은마', apt:'은마', band:'84㎡대'})
         JDJ_LEAD.open(ctx) — 바로 창 열기 */
(function (root) {
  'use strict';
  const CONSENT_V = 'lead-2026-11-21';      // 서버 LEAD_CONSENT_V 와 같아야 함
  const MINE_KEY = 'jdj_leads';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => root.JDJ_AGENTS;
  const track = (n, p) => { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(n, p || {}); } catch (e) {} };
  const KIND = { buy: '사고 싶어요', sell: '팔고 싶어요', both: '팔고 사려고 해요' };
  const WHEN = ['언제든 괜찮아요', '평일 낮', '평일 저녁', '주말', '문자 먼저 주세요'];

  /* ---------- 순수 함수 (테스트용) ---------- */
  function phoneOk(v) { const d = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return /^01[016789]\d{7,8}$/.test(d) ? d : ''; }
  function candidates(list, g) { return (list || []).filter(a => Array.isArray(a.r) && a.r.indexOf(g) >= 0); }
  /** 보낼 내용 만들기 → {ok, body} 또는 {ok:false, err} */
  function payload(ctx, f, lead) {
    lead = lead || { pick: 3, turn: 2 };
    if (!ctx || !/^\d{5}$/.test(String(ctx.g || ''))) return { ok: false, err: '지역을 다시 골라 주세요.' };
    if (!KIND[f.kind]) return { ok: false, err: '사려는지 팔려는지 골라 주세요.' };
    const mode = f.mode === 'turn' ? 'turn' : 'pick';
    const ids = (f.ids || []).filter((x, i, a) => /^A[0-9A-F]{7}$/.test(x) && a.indexOf(x) === i);
    if (mode === 'pick' && !ids.length) return { ok: false, err: '연락받을 중개사를 1곳 이상 골라 주세요.' };
    if (mode === 'pick' && ids.length > lead.pick) return { ok: false, err: `중개사는 ${lead.pick}곳까지 고를 수 있어요.` };
    const phone = phoneOk(f.phone); if (!phone) return { ok: false, err: '휴대폰 번호를 정확히 입력해 주세요(010으로 시작).' };
    if (!f.agree) return { ok: false, err: '아래 [개인정보 제3자 제공 동의]에 체크해 주세요. 동의하셔야 중개사에게 연락처를 전해 드릴 수 있어요.' };
    const memo = String(f.memo || '').replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, 100);
    return { ok: true, body: { action: 'leadCreate', src: ctx.src || 'report', kind: f.kind, g: ctx.g, gn: ctx.gn || '', k: ctx.k || '', apt: ctx.apt || '', band: ctx.band || '',
      mode, ids: mode === 'pick' ? ids : [], phone, when: WHEN.indexOf(f.when) >= 0 ? f.when : WHEN[0], memo, agree: true, cv: CONSENT_V } };
  }

  /* ---------- 화면 ---------- */
  let css = false;
  function style() {
    if (css || typeof document === 'undefined') return; css = true;
    const s = document.createElement('style');
    s.textContent = `.ldcta{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;background:#F2F6FF;border:1px solid #D6E2FF;border-radius:16px;padding:14px 16px;margin:10px 0}
.ldcta b{font-size:15.5px;color:#191F28}.ldcta span{display:block;font-size:13.5px;color:#4E5968;margin-top:2px}
.ldcta button,.ldf .go{font:inherit;font-weight:700;font-size:15px;border:0;border-radius:14px;background:#2F6BFF;color:#fff;padding:11px 16px;cursor:pointer;min-height:44px}
.ldbg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:flex-end;justify-content:center}
@media(min-width:641px){.ldbg{align-items:center}}
.ldm{background:#fff;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:20px 18px 24px;box-sizing:border-box;color:#191F28;font-family:inherit}
@media(min-width:641px){.ldm{border-radius:20px}}
.ldm h3{margin:0 0 4px;font-size:19px;letter-spacing:-.03em}.ldm .sub{margin:0 0 12px;font-size:14px;color:#4E5968;line-height:1.55}
.ldm .x{float:right;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#4E5968;min-width:44px;min-height:44px}
.ldf h4{font-size:15px;margin:16px 0 6px}.ldf .row{display:flex;flex-wrap:wrap;gap:6px}
.ldf .ch{font:inherit;font-size:14px;font-weight:700;border:1px solid #E5E8EB;background:#fff;color:#4E5968;border-radius:999px;padding:9px 13px;cursor:pointer;min-height:40px}
.ldf .ch.on{background:#2F6BFF;border-color:#2F6BFF;color:#fff}
.ldf .ag{display:flex;gap:10px;align-items:flex-start;border:1px solid #E5E8EB;border-radius:14px;padding:10px 12px;margin:6px 0;cursor:pointer}
.ldf .ag input{margin-top:4px;width:18px;height:18px}.ldf .ag b{font-size:15px}.ldf .ag small{display:block;color:#4E5968;font-size:13px;margin-top:2px}
.ldf .tag{display:inline-block;font-size:12px;font-weight:700;color:#4E5968;background:#F2F4F6;border-radius:6px;padding:1px 6px;margin-left:6px;vertical-align:1px}
.ldf input[type=tel],.ldf select,.ldf textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;border:1px solid #E5E8EB;border-radius:12px;padding:11px 12px;background:#fff;color:#191F28}
.ldf textarea{min-height:60px;resize:vertical}
.ldf .rule{font-size:13.5px;color:#4E5968;background:#F9FAFB;border-radius:12px;padding:10px 12px;margin:6px 0;line-height:1.55}
.ldf table{width:100%;border-collapse:collapse;font-size:13.5px;margin:6px 0}.ldf th,.ldf td{border-bottom:1px solid #F0F1F3;padding:7px 6px;text-align:left;vertical-align:top}.ldf th{width:30%;color:#4E5968;font-weight:700}
.ldf .agree{display:flex;gap:8px;align-items:flex-start;font-size:14.5px;font-weight:700;margin:10px 0}.ldf .agree input{width:20px;height:20px;margin-top:1px}
.ldf .msg{font-size:14px;font-weight:700;color:#C2410C;margin:8px 0 0;min-height:1em}.ldf .go{width:100%;margin-top:10px}
.ldf .disc{font-size:12.5px;color:#6B7684;margin:10px 0 0;line-height:1.5}
.lddone{background:#F2F6FF;border-radius:14px;padding:14px;margin-top:8px;font-size:14.5px;line-height:1.6}.lddone a{color:#2F6BFF;font-weight:700}`;
    document.head.appendChild(s);
  }
  const nm = a => a.t === 'm' ? a.nm + ' 공인중개사' : a.n;
  function shuffle(a) { return a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]); }
  function saveMine(x) { try { const j = JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); j.unshift(x); localStorage.setItem(MINE_KEY, JSON.stringify(j.slice(0, 20))); } catch (e) {} }
  function cancelUrl(r) { return A().api + '?action=leadCancel&id=' + encodeURIComponent(r.id) + '&t=' + encodeURIComponent(r.cancel); }

  function on() { const a = A(); if (!a || !a.ready) return Promise.resolve(null); return a.list().then(j => (j && j.lead && j.lead.v === CONSENT_V) ? j : null).catch(() => null); }

  async function mount(el, ctx) {
    if (!el) return;
    const j = await on(); if (!j) { el.innerHTML = ''; return; }
    const cand = candidates(j.agents, ctx.g); if (!cand.length) { el.innerHTML = ''; return; }
    style();
    const what = ctx.kind === 'sell' ? '팔 계획' : ctx.kind === 'both' ? '팔고 살 계획' : '살 계획';
    el.innerHTML = `<div class="ldcta"><div><b>${esc(ctx.gn || '이 동네')} 제휴 중개사에게 연락 받기</b><span>${esc(what)}이 있으면 고른 중개사에게만 번호를 전해 드려요 · 제휴·광고</span></div><button type="button">연락 받기</button></div>`;
    el.querySelector('button').onclick = () => open(ctx);
  }

  async function open(ctx) {
    const j = await on(); if (!j) return;
    style();
    const lead = j.lead, cand = shuffle(candidates(j.agents, ctx.g));
    const f = { kind: ctx.kind || 'buy', mode: 'pick', ids: [], when: WHEN[0] };
    let bg = document.getElementById('ldbg');
    if (!bg) { bg = document.createElement('div'); bg.id = 'ldbg'; bg.className = 'ldbg'; document.body.appendChild(bg); }
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bg.onclick = e => { if (e.target === bg) close(); };
    track('lead_open', { src: ctx.src || '', n: cand.length });
    const place = ctx.apt ? `${ctx.apt}${ctx.band ? ' ' + ctx.band : ''} · ${ctx.gn || ''}` : (ctx.gn || '');
    bg.innerHTML = `<div class="ldm" role="dialog" aria-modal="true" aria-labelledby="ldt"><button class="x" type="button" aria-label="닫기">×</button>
      <h3 id="ldt">중개사 연락 받기</h3><p class="sub">${esc(place)}<br>고르신 제휴 중개사에게만 휴대폰 번호를 전해 드려요. 중개사가 직접 연락드려요.</p>
      <div class="ldf">
        <h4>어떤 상담이 필요하세요?</h4><div class="row" id="ldK">${Object.keys(KIND).map(k => `<button type="button" class="ch ${f.kind === k ? 'on' : ''}" data-k="${k}">${KIND[k]}</button>`).join('')}</div>
        <h4>누구에게 받을까요?</h4><div class="row" id="ldM"><button type="button" class="ch on" data-m="pick">제가 고를게요 (최대 ${lead.pick}곳)</button><button type="button" class="ch" data-m="turn">아무 곳이나 먼저 (${lead.turn}곳)</button></div>
        <div id="ldList">${cand.map(a => `<label class="ag"><input type="checkbox" value="${esc(a.id)}"><span><b>${esc(nm(a))}</b><span class="tag">제휴·광고</span>${a.rv && a.rv.n ? ` <small style="display:inline;color:#191F28">★ ${esc(a.rv.avg)} (${esc(a.rv.n)})</small>` : ''}<small>${a.t === 'm' ? esc(a.n) + ' 소속 · ' : ''}${esc(a.ogn)} ${esc(a.dong)}${a.intro ? ' · ' + esc(a.intro) : ''}</small></span></label>`).join('')}
          <p class="rule">이 지역을 고른 제휴 중개사 ${cand.length}곳을 모두 보여 드려요. 순서는 열 때마다 무작위로 섞여요(이용료와 상관없어요).</p></div>
        <p class="rule" id="ldTurn" hidden>순번 규칙(공개): 이 지역을 고른 제휴 중개사 중 <b>순번 문의를 가장 오래전에 받은 곳부터 ${lead.turn}곳</b>에 보내요. 같으면 무작위예요. 상품·이용료·리뷰·미래가치 점수는 순번에 영향을 주지 않아요. 보낸 뒤 어느 곳에 갔는지 바로 알려 드려요.</p>
        <h4>휴대폰 번호</h4><input type="tel" id="ldP" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000">
        <h4>연락 편한 때</h4><select id="ldW">${WHEN.map(w => `<option>${w}</option>`).join('')}</select>
        <h4>남길 말 <small style="font-weight:500;color:#6B7684">(선택 · 100자)</small></h4><textarea id="ldN" maxlength="100" placeholder="예: 내년 봄 입주 생각 중이에요"></textarea>
        <h4>개인정보 제3자 제공 동의 (필수)</h4>
        <table><tr><th>받는 곳</th><td id="ldTo">위에서 고른 제휴 중개사무소</td></tr>
          <tr><th>쓰는 목적</th><td>매수·매도 상담 연락</td></tr>
          <tr><th>주는 항목</th><td>휴대폰 번호, 단지·평형(있으면), 연락 편한 때, 남길 말</td></tr>
          <tr><th>보관 기간</th><td>받은 중개사 화면에 ${lead.keep}일 동안 보여요. 그 뒤 집코드 서버에서 지워요. 보낸 뒤 받는 [문의 취소] 링크를 누르면 바로 지워요.</td></tr>
          <tr><th>거부할 권리</th><td>동의하지 않으셔도 돼요. 이 경우 문의만 보낼 수 없고, 집코드의 다른 기능은 그대로 쓸 수 있어요.</td></tr></table>
        <label class="agree"><input type="checkbox" id="ldA"> 위 내용대로 고른 중개사에게 제 연락처를 주는 데 동의해요</label>
        <div class="msg" id="ldMsg" role="alert"></div>
        <button type="button" class="go" id="ldGo">연락 받기 신청</button>
        <p class="disc">집코드는 중개하지 않아요. 고르신 중개사에게 문의를 전해 드리기만 하고, 중개 보수나 건별 수수료를 받지 않아요. 매물·가격·계약 조건은 중개사무소에 직접 확인하세요. 같은 번호로는 하루 3건까지 보낼 수 있어요.</p>
      </div></div>`;
    const $ = id => bg.querySelector('#' + id);
    bg.querySelector('.x').onclick = close;
    const paintTo = () => {
      const picked = f.ids.map(id => cand.find(a => a.id === id)).filter(Boolean).map(nm);
      $('ldTo').textContent = f.mode === 'turn' ? `순번 규칙으로 정해질 이 지역 제휴 중개사 ${lead.turn}곳 (보낸 뒤 이름을 알려 드려요)` : (picked.length ? picked.join(', ') : '위에서 고른 제휴 중개사무소');
    };
    $('ldK').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; f.kind = b.dataset.k; $('ldK').querySelectorAll('.ch').forEach(x => x.classList.toggle('on', x === b)); };
    $('ldM').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; f.mode = b.dataset.m; $('ldM').querySelectorAll('.ch').forEach(x => x.classList.toggle('on', x === b));
      $('ldList').hidden = f.mode === 'turn'; $('ldTurn').hidden = f.mode !== 'turn'; paintTo(); };
    $('ldList').onchange = e => {
      const c = e.target; if (!c.matches('input[type=checkbox]')) return;
      if (c.checked && f.ids.length >= lead.pick) { c.checked = false; $('ldMsg').textContent = `중개사는 ${lead.pick}곳까지 고를 수 있어요.`; return; }
      f.ids = [...$('ldList').querySelectorAll('input:checked')].map(x => x.value); $('ldMsg').textContent = ''; paintTo();
    };
    $('ldGo').onclick = () => {
      Object.assign(f, { phone: $('ldP').value, when: $('ldW').value, memo: $('ldN').value, agree: $('ldA').checked });
      const p = payload(ctx, f, lead);
      if (!p.ok) { $('ldMsg').textContent = p.err; return; }
      const go = $('ldGo'); go.disabled = true; go.textContent = '보내는 중이에요…';
      A().post(p.body).then(r => {
        saveMine({ id: r.id, cancel: cancelUrl(r), at: new Date().toISOString().slice(0, 10), place, to: (r.to || []).map(x => x.n) });
        track('lead_send', { src: ctx.src || '', mode: p.body.mode, n: (r.to || []).length });
        bg.querySelector('.ldf').innerHTML = `<div class="lddone"><b>보냈어요.</b> ${esc((r.to || []).map(x => x.n).join(', '))}에서 연락드릴 거예요.<br>
          문의 번호 ${esc(r.id)} · 연락처는 ${esc(r.keep)}일 뒤 지워져요.<br>마음이 바뀌면 <a href="${esc(cancelUrl(r))}" target="_blank" rel="noopener">문의 취소하고 연락처 지우기</a>를 누르세요(이 기기에도 링크를 저장해 뒀어요).</div>
          <p class="disc">집코드는 중개하지 않아요. 계약·중개 보수는 중개사무소와 직접 정하세요.</p><button type="button" class="go" id="ldClose">닫기</button>`;
        bg.querySelector('#ldClose').onclick = close;
      }).catch(e => { $('ldMsg').textContent = e.message || '보내지 못했어요. 잠시 뒤 다시 시도해 주세요.'; go.disabled = false; go.textContent = '연락 받기 신청'; });
    };
  }

  const API = { CONSENT_V, KIND, WHEN, phoneOk, candidates, payload, mount, open, on };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_LEAD = API;
})(typeof self !== 'undefined' ? self : this);
