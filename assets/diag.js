/* 진단 리포트 공용 틀 — 전세 안전 점검(jeonse/safety/)이 처음 쓰고, 청약·세금·대출 결과도 같은 틀로 옮길 수 있어요.
   브라우저 window.JDJ_DIAG, node require 둘 다(시험: node tools/diag-test.js </dev/null). 설명서: /home/claude/benchmark/diag-api.md 와 같은 내용.

   화면 순서(늘 같음)
     ① 한 줄 결론(먹색 카드 · 왼쪽 색 띠 + 아이콘 · 신호 개수 칩 · 기준일)
     ② 신호등 항목 카드(이름 · 판정 칩(아이콘+글자) · 값 · 근거 한 줄 · '왜 그런가요?')
     ③ '왜 이런 결과인가요?' 한 번에 펼치는 칸(항목마다 이유 문장 + 출처·확인일)
     ④ '다음 할 일' 체크리스트(체크 상태는 이 기기에만 · 진행 막대 · 바깥 공식 사이트는 새 창)
     ⑤ 공유·저장(휴대폰 공유창 → 안 되면 주소 복사 · PDF로 저장 = 인쇄 창)

   API
     JDJ_DIAG.mount(el, rep, opt)  el 안에 그리고 펼침·체크·공유를 연결해요. 다시 부르면 다시 그려요(체크 상태는 그대로).
     JDJ_DIAG.html(rep, opt)       HTML 글자만 돌려줘요(node 시험용).
     JDJ_DIAG.LV                   { g:'괜찮아요', y:'주의', r:'위험', n:'확인 필요' }

   rep = {
     title  결론 카드 위 작은 이름(예: '전세 안전 점검')
     lv     전체 판정 'g'|'y'|'r'|'n' (모르는 값은 'n')
     head   한 줄 결론(~요체, 권유 금지)
     sub    결론 아래 한 줄(선택)
     asof   기준일(예: '2026.10 실거래 기준')
     items  [{ id, t 이름, lv, v 값(짧게), s 근거 한 줄, why:[문장…], src:[{ n 이름, u 주소, at 'YYYY-MM-DD' 확인일 }] }]
     todo   [{ id, t 할 일, s 설명, href, ext 1(바깥 사이트), ln 바깥 사이트 이름, alt:{ n, u } 두 번째 바깥 링크 }]
     note   맨 아래 정보 제공 문구(선택)
   }
   opt = {
     base    사이트 안 링크 앞에 붙일 주소(보통 화면이 쓰는 사이트 첫 주소)
     key     체크 상태를 기기에 남길 이름(localStorage 'jdj_diag_' + key). 없으면 남기지 않음
     share   { url, title, text } — 공유 단추(휴대폰 공유창 → 안 되면 주소 복사). 개인 금액은 넣지 않아요
     shareNote 공유 단추 아래 한 줄
     print   true 면 'PDF로 저장' 단추(인쇄 창)
     track   집계 이름 앞부분(data-track="{track}_share" 등)
   }
   규칙: 판정 색은 상태색(좋음 #0E7A4F · 주의 #A15C07 · 위험 #B42318)과 아이콘(✓ ! ✕ ?)·글자를 함께 써요. 남색은 누르는 것에만.
        자료가 없으면 숫자를 만들지 않고 lv 'n' + 이유 문장. 숫자·판정은 이 틀이 만들지 않아요(화면·계산 파일이 넘긴 그대로). */
(function (root) {
  'use strict';
  const LV = { g: '괜찮아요', y: '주의', r: '위험', n: '확인 필요' };
  const IC = { g: '✓', y: '!', r: '✕', n: '?' };
  const ORDER = ['r', 'y', 'g', 'n'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lvOf = v => (LV[v] ? v : 'n');
  const dayKo = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${m[1]}.${m[2]}.${m[3]} 확인` : ''; };
  const href = (t, base) => t.ext || /^https?:/.test(t.href || '') ? t.href : (base || '') + (t.href || '');

  function chip(lv) { lv = lvOf(lv); return `<span class="dg-chip dg-${lv}"><i aria-hidden="true">${IC[lv]}</i>${LV[lv]}</span>`; }
  function srcHtml(src) {
    if (!src || !src.length) return '';
    return `<p class="dg-src">출처 · ${src.map(s => s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.n)} ↗</a>${s.at ? ` <small>(${esc(dayKo(s.at))})</small>` : ''}` : `${esc(s.n)}${s.at ? ` <small>(${esc(dayKo(s.at))})</small>` : ''}`).join(' · ')}</p>`;
  }

  function html(rep, opt) {
    rep = rep || {}; opt = opt || {};
    const lv = lvOf(rep.lv), items = rep.items || [], todo = rep.todo || [], tr = opt.track ? esc(opt.track) : 'diag';
    const cnt = {}; items.forEach(i => { const l = lvOf(i.lv); cnt[l] = (cnt[l] || 0) + 1; });
    const chips = ORDER.filter(l => cnt[l]).map(l => `<span class="dg-cnt dg-${l}">${LV[l]} ${cnt[l]}</span>`).join('');
    const head = `<section class="dg-head dg-${lv}" aria-label="한 줄 결론">
      <div class="dg-ht"><span class="dg-title">${esc(rep.title || '진단 결과')}</span><span class="dg-cnts">${chips}</span></div>
      <h2 class="dg-one"><i class="dg-ic" aria-hidden="true">${IC[lv]}</i><span>${esc(rep.head || '')}</span></h2>
      ${rep.sub ? `<p class="dg-sub">${esc(rep.sub)}</p>` : ''}${rep.asof ? `<p class="dg-asof">${esc(rep.asof)}</p>` : ''}
    </section>`;
    const cards = `<div class="dg-cards">${items.map(i => { const l = lvOf(i.lv); return `<article class="dg-card dg-${l}" data-dg="${esc(i.id)}">
      <div class="dg-ct"><h3>${esc(i.t)}</h3>${chip(l)}</div>
      <p class="dg-v">${esc(i.v)}</p>
      <p class="dg-s">${esc(i.s || '')}${i.why && i.why.length ? `<span class="dg-pcw"> <button type="button" class="dg-wb" data-why="${esc(i.id)}" aria-controls="dgw-${esc(i.id)}">왜 그런가요?</button></span>` : ''}</p>
      ${i.why && i.why.length ? `<button type="button" class="dg-wb dg-cbtn" data-why="${esc(i.id)}" aria-controls="dgw-${esc(i.id)}">왜 그런가요?</button>` : ''}
    </article>`; }).join('')}</div>`;
    const why = items.some(i => i.why && i.why.length) ? `<details class="dg-why" id="dgWhy"><summary>왜 이런 결과인가요?<small>항목마다 이유와 출처</small></summary>
      ${items.filter(i => i.why && i.why.length).map(i => `<div class="dg-wi" id="dgw-${esc(i.id)}" tabindex="-1">
        <h3>${chip(i.lv)} ${esc(i.t)} · ${esc(i.v)}</h3>${i.s ? `<p class="dg-ws">${esc(i.s)}</p>` : ''}<ul>${i.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>${srcHtml(i.src)}</div>`).join('')}
    </details>` : '';
    const td = todo.length ? `<section class="dg-todo" aria-labelledby="dgTodoT"><div class="dg-tt"><h2 id="dgTodoT">다음 할 일</h2><span class="dg-prog" aria-live="polite"><b data-dg-done>0</b> / ${todo.length} 확인</span></div>
      <div class="dg-bar" aria-hidden="true"><i data-dg-bar style="width:0%"></i></div>
      <ul>${todo.map(t => `<li data-todo-li="${esc(t.id)}"><label><input type="checkbox" data-todo="${esc(t.id)}"><span><b>${esc(t.t)}</b>${t.s ? `<small>${esc(t.s)}</small>` : ''}</span></label>
        ${t.href ? `<span class="dg-tl"><a href="${esc(href(t, opt.base))}"${t.ext ? ' target="_blank" rel="noopener"' : ''} data-track="${tr}_todo_${esc(t.id)}">${esc(t.ln || (t.ext ? '바로 가기' : '열어 보기'))}${t.ext ? ' ↗' : ' ›'}</a>${t.alt && t.alt.u ? `<a href="${esc(t.alt.u)}" target="_blank" rel="noopener" data-track="${tr}_todo_${esc(t.id)}_alt">${esc(t.alt.n)} ↗</a>` : ''}</span>` : ''}</li>`).join('')}</ul>
    </section>` : '';
    const sh = opt.share || opt.print ? `<section class="dg-share" aria-label="공유·저장"><div class="dg-sb">
      ${opt.share ? `<button type="button" class="dg-btn" data-dg-share data-track="${tr}_share">공유하기</button>` : ''}
      ${opt.print ? `<button type="button" class="dg-btn" data-dg-print data-track="${tr}_print">PDF로 저장 · 인쇄</button>` : ''}</div>
      ${opt.shareNote ? `<p class="dg-sn">${esc(opt.shareNote)}</p>` : ''}<p class="dg-msg" data-dg-msg aria-live="polite"></p></section>` : '';
    const note = rep.note ? `<p class="dg-note">${esc(rep.note)}</p>` : '';
    return `<div class="dg">${head}${cards}${why}${td}${sh}${note}</div>`;
  }

  function store(key) {
    const k = key ? 'jdj_diag_' + key : null;
    return {
      get() { if (!k) return {}; try { return JSON.parse(root.localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } },
      set(v) { if (!k) return; try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };
  }

  function mount(el, rep, opt) {
    if (!el) return;
    opt = opt || {};
    el.innerHTML = html(rep, opt);
    const box = el.firstElementChild, st = store(opt.key), done = st.get(), todo = (rep && rep.todo) || [];
    const prog = () => {
      const n = todo.filter(t => done[t.id]).length;
      const b = box.querySelector('[data-dg-done]'), bar = box.querySelector('[data-dg-bar]');
      if (b) b.textContent = n;
      if (bar) bar.style.width = (todo.length ? Math.round(n / todo.length * 100) : 0) + '%';
    };
    box.querySelectorAll('[data-todo]').forEach(c => {
      c.checked = !!done[c.dataset.todo];
      c.closest('li').classList.toggle('on', c.checked);
      c.addEventListener('change', () => { if (c.checked) done[c.dataset.todo] = 1; else delete done[c.dataset.todo]; c.closest('li').classList.toggle('on', c.checked); st.set(done); prog(); });
    });
    prog();
    const why = box.querySelector('#dgWhy');
    box.querySelectorAll('[data-why]').forEach(b => b.addEventListener('click', () => {
      if (!why) return; why.open = true;
      const t = box.querySelector('#dgw-' + (root.CSS && root.CSS.escape ? root.CSS.escape(b.dataset.why) : b.dataset.why));
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); try { t.focus({ preventScroll: true }); } catch (e) {} }
    }));
    const msg = t => { const m = box.querySelector('[data-dg-msg]'); if (m) m.textContent = t; };
    const sb = box.querySelector('[data-dg-share]');
    if (sb && opt.share) sb.addEventListener('click', async () => {
      const s = opt.share;
      try { if (root.navigator && root.navigator.share) { await root.navigator.share({ title: s.title, text: s.text, url: s.url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await root.navigator.clipboard.writeText(s.url); msg('주소를 복사했어요. 원하는 곳에 붙여 넣어 주세요.'); } catch (e) { msg('주소: ' + s.url); }
    });
    const pb = box.querySelector('[data-dg-print]');
    if (pb) pb.addEventListener('click', () => {
      const was = why ? why.open : false; if (why) why.open = true;
      const back = () => { if (why) why.open = was; root.removeEventListener('afterprint', back); };
      root.addEventListener('afterprint', back);
      root.print();
    });
    return box;
  }

  const API = { LV, IC, html, mount, esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_DIAG = API;
})(typeof window !== 'undefined' ? window : this);
