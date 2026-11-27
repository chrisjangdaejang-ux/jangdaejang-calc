/* 집예보 상담 신청 공용 (JDJ_CONSULT)
   - 상담 신청서(구글 설문지) 주소에는 금액·개인 금융 입력값(연소득·보유 현금·대출·집값·세금 등)을 절대 싣지 않는다.
     주소는 브라우저 기록·구글 기록·화면 공유·통계에 남을 수 있어서.
   - 대신 누르기 직전에 '내 조건 요약' 창을 띄워(이 기기 안에서 만든 글) [복사] → 설문지에 붙여 넣게 한다.
   - 주소에 넣어도 되는 것: 상담 종류, 지역 이름, 어느 화면에서 왔는지(메모). 메모·종류에 금액 모양 글자가 섞이면 지운다.
   사용: <a data-consult="이름" href="..."> + JDJ_CONSULT.provide('이름', a => ({ lines:[...], url })) 또는 JDJ_CONSULT.bind(a, fn) */
(function (root) {
  'use strict';
  const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLScCG7wzIlY3FE6EHU5QWo92uW5NQe7aiP-GJ9jvh41Rx2E8Zw/viewform';
  const F = { kind: 'entry.1054811896', region: 'entry.397234060', memo: 'entry.658364183' };
  /* 예전에 연소득·보유 현금을 받던 칸 — 주소로 채우지 않음 */
  const BANNED = ['entry.146176170', 'entry.1872979900'];
  /* 금액·비율 모양: 3억, 5,000만, 40000원, 7,000만 원, 4.2%, 1억 2,000만 */
  const AMT = /[−-]?\d[\d,.]*\s*(?:억|천만|만|천|원|%)(?:\s*\d[\d,.]*\s*(?:천만|만|천|원))*/g;
  const scrub = s => String(s == null ? '' : s).replace(AMT, '').replace(/\(\s*[,·]?\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  const hasAmount = s => { AMT.lastIndex = 0; const r = AMT.test(String(s || '')); AMT.lastIndex = 0; return r; };

  /** 상담 신청서 주소 — o: { kind, region, memo } (금액은 넣어도 지워짐) */
  function url(o) {
    o = o || {};
    const q = new URLSearchParams({ usp: 'pp_url' });
    if (o.region) q.set(F.region, scrub(o.region).slice(0, 120));
    if (o.kind) q.set(F.kind, scrub(o.kind).slice(0, 200));
    if (o.memo) q.set(F.memo, scrub(o.memo).slice(0, 900));
    return FORM + '?' + q.toString().replace(/\+/g, '%20');
  }
  /** 나가는 주소 점검(테스트용): 금액·개인 금융값이 주소에 있으면 그 이유를, 없으면 '' */
  function leak(u) {
    let x; try { x = new URL(u); } catch (e) { return ''; }
    for (const k of BANNED) if (x.searchParams.has(k)) return k;
    for (const [k, v] of x.searchParams) if (hasAmount(v)) return k + '=' + v;
    return '';
  }

  /* ---------- '내 조건 요약' 창 ---------- */
  function css() {
    if (document.getElementById('csCss')) return;
    const st = document.createElement('style'); st.id = 'csCss';
    st.textContent = `.cs-bg{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center}
.cs{background:#fff;color:var(--text,#191F28);width:100%;max-width:480px;border-radius:20px 20px 0 0;padding:20px 20px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.18);max-height:88vh;overflow:auto;font-size:15px;line-height:1.55}
@media(min-width:700px){.cs-bg{align-items:center}.cs{border-radius:20px;padding:24px}}
.cs h3{margin:0;font-size:19px;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:8px}
.cs .cs-x{border:0;background:none;font-size:24px;line-height:1;min-width:44px;min-height:44px;cursor:pointer;color:var(--sub,#4E5968)}
.cs .cs-d{margin:4px 0 12px;color:var(--sub,#4E5968);font-size:14.5px}
.cs .cs-d b{color:var(--text,#191F28)}
.cs pre{margin:0;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere;background:var(--gray,#F5F6F8);border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:12px 14px;font:inherit;font-size:14.5px;line-height:1.65;max-height:40vh;overflow:auto;user-select:all;-webkit-user-select:all}
.cs .cs-b{display:flex;gap:8px;margin-top:14px}
.cs .cs-b>*{flex:1;min-height:50px;border-radius:12px;font:inherit;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer;border:0}
.cs .cs-c{background:var(--blue-l,#E8F3FF);color:var(--blue,#1B64DA)}
.cs .cs-c.ok{background:#ECF8F2;color:#0B5C3B}
.cs .cs-o{background:var(--blue,#3182F6);color:#fff}
.cs .cs-n{margin:10px 0 0;font-size:13px;color:var(--sub,#4E5968)}`;
    document.head.appendChild(st);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const track = (n, p) => { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(n, p || {}); } catch (e) {} };
  function copyText(t, pre) {
    const fb = () => { try { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return document.execCommand('copy'); } catch (e) { return false; } };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true, () => fb());
    return Promise.resolve(fb());
  }
  function summary(lines) { return ['[집예보 · 내 조건 요약]'].concat(lines.filter(Boolean)).join('\n'); }
  let last = null;
  function close() { const b = document.querySelector('.cs-bg'); if (b) b.remove(); document.removeEventListener('keydown', onKey); if (last && last.focus) try { last.focus(); } catch (e) {} }
  function onKey(e) { if (e.key === 'Escape') close(); }
  /** o: { lines:[요약 줄], url, from } */
  function open(o) {
    css(); close(); last = document.activeElement;
    const text = summary(o.lines || []);
    const bg = document.createElement('div'); bg.className = 'cs-bg';
    bg.innerHTML = `<div class="cs" role="dialog" aria-modal="true" aria-labelledby="csT">
  <h3 id="csT">내 조건 요약<button type="button" class="cs-x" aria-label="닫기">×</button></h3>
  <p class="cs-d">아래 내용을 <b>[복사]</b>한 뒤, 이어서 열리는 <b>설문지에 붙여 넣어 주세요.</b></p>
  <pre>${esc(text)}</pre>
  <div class="cs-b"><button type="button" class="cs-c">복사</button><a class="cs-o" href="${esc(o.url || FORM)}" target="_blank" rel="noopener">설문지 열기</a></div>
  <p class="cs-n">금액은 이 기기 안에서만 계산했어요. 설문지 주소에는 금액을 싣지 않아요.</p></div>`;
    document.body.appendChild(bg);
    const pre = bg.querySelector('pre'), cb = bg.querySelector('.cs-c');
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    bg.querySelector('.cs-x').addEventListener('click', close);
    cb.addEventListener('click', () => copyText(text, pre).then(ok => {
      cb.textContent = ok ? '복사됐어요 ✓' : '길게 눌러 복사해 주세요'; cb.classList.toggle('ok', !!ok);
      track('consult_summary_copy', { from: o.from || '', ok: ok ? 1 : 0 });
    }));
    bg.querySelector('.cs-o').addEventListener('click', () => { track('consult_form_open', { from: o.from || '' }); setTimeout(close, 300); });
    document.addEventListener('keydown', onKey);
    cb.focus();
  }

  /* ---------- 버튼 연결: a[data-consult] 를 누르면 요약 창부터 ---------- */
  const P = {};
  function provide(name, fn) { P[name] = fn; }
  function bind(a, fn) { if (!a) return; const n = a.getAttribute('data-consult') || ('c' + Math.random().toString(36).slice(2, 8)); a.setAttribute('data-consult', n); P[n] = fn; }
  if (typeof document !== 'undefined') document.addEventListener('click', e => {
    const a = e.target && e.target.closest && e.target.closest('a[data-consult]'); if (!a) return;
    const fn = P[a.getAttribute('data-consult')]; if (!fn) return;
    let o; try { o = fn(a); } catch (err) { o = null; }
    if (!o) return;
    if (o.url) a.href = o.url;
    if (!o.lines || !o.lines.filter(Boolean).length) return;          // 요약할 내 조건이 없으면 바로 설문지로
    e.preventDefault();
    open(Object.assign({ from: a.getAttribute('data-consult') }, o));
  }, true);

  const api = { FORM, F, BANNED, url, leak, scrub, hasAmount, summary, open, close, provide, bind };
  root.JDJ_CONSULT = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
