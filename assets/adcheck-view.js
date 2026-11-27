/* 받은 분양 광고 확인하기 — 화면 조각. 분양 화면(bunyang/check/)과 고민 찾기 길잡이(ad_check)가 같은 mount 를 불러 같은 결과를 보여요.
   계산은 assets/adcheck-core.js(JDJ_ADCHK), 그림은 assets/diag.js(진단 리포트 공용 틀).
   JDJ_ADCHKV.mount(el, { base 사이트 첫 주소, from 'page'|'guide', head 위에 붙일 HTML })

   개인정보: 붙여 넣은 글·캡처는 이 기기 안에서만 읽어요. 서버로 보내지 않고 브라우저 저장소·주소에도 남기지 않아요.
   집계(data-track)는 단추 이름만 — 글 내용·금액·전화번호는 보내지 않아요.
   캡처 글자 읽기: tesseract.js 를 누른 때에만 불러와 이 기기 브라우저 안에서 읽어요(사진은 보내지 않아요). 못 불러오면 붙여 넣기로 안내. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/';
  const V = { core: 'assets/adcheck-core.js?v=1', diag: 'assets/diag.js?v=1', diagCss: 'assets/diag.css?v=1', reg: 'assets/reg-zones.js?v=1', rules: 'assets/loan-rules.js?v=4', plan: 'assets/cy-plan.js?v=4', mine: 'assets/mine-core.js?v=25' };
  const OCR_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = {};
  const getJ = u => C[u] || (C[u] = fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('nf'); return r.json(); }).catch(e => { delete C[u]; throw e; }));
  const soft = p => p.catch(() => null);
  const todayIso = () => { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); };
  function script(src) {
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = /^https?:/.test(src) ? src : JB.SITE + src; s.onload = () => ok(); s.onerror = () => no(new Error('script')); document.head.appendChild(s); });
  }
  function css(href) { if (document.querySelector(`link[data-adc="${href}"]`)) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = JB.SITE + href; l.dataset.adc = href; document.head.appendChild(l); }
  async function deps() {
    const need = [];
    if (!root.JDJ_ADCHK) need.push(script(V.core));
    if (!root.JDJ_DIAG) need.push(script(V.diag));
    if (!root.JDJ_LOAN_RULES) need.push((root.JDJ_REG ? Promise.resolve() : script(V.reg)).then(() => script(V.rules)));
    if (!root.JDJ_CYPLAN) need.push(script(V.plan));
    if (!root.JDJ_MINE) need.push(script(V.mine));
    if (!document.querySelector('link[href*="diag.css"]')) css(V.diagCss);
    await Promise.all(need.map(soft));
  }

  const SAMPLE = `(광고) 【가람숲 센트럴파크뷰】 잔여세대 선착순 분양
경기 안산시 단원구 신길동 일원 · 아파트
전용 84㎡ 분양가 4억 9,800만원 → 최대 3천만원 할인!
계약금 10% / 중도금 60% 무이자 / 잔금 30% 2년 유예
실거주 의무 없음! 전매 제한 없음!
신길온천역 도보 5분, GTX-B 개통 예정, 초품아
전세가로 내 집 마련
시공 해솔건설 · 총 1,024세대 · 지하 2층~지상 29층
※ 예시로 지어낸 광고예요(실제 현장 아님)`;

  function style() {
    if (document.getElementById('adcCss')) return;
    const s = document.createElement('style'); s.id = 'adcCss';
    s.textContent = `.adc{--b:#4338CA}
.adc .adc-in{background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:14px}
.adc label.t{display:block;font-size:15px;font-weight:800;margin:0 0 6px;color:var(--text,#191F28)}
.adc textarea{display:block;width:100%;box-sizing:border-box;min-height:168px;resize:vertical;font:inherit;font-size:16px;line-height:1.55;padding:12px;border:1px solid var(--line,#E5E8EB);border-radius:12px;color:var(--text,#191F28);background:#fff}
.adc textarea:focus{outline:0;border-color:var(--b);box-shadow:0 0 0 3px rgba(67,56,202,.15)}
.adc .adc-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}
.adc .adc-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 14px;font:inherit;font-size:15px;font-weight:700;border:1px solid var(--line,#E5E8EB);border-radius:12px;background:#fff;color:var(--text,#191F28);cursor:pointer;text-decoration:none}
.adc .adc-btn:focus-visible,.adc .adc-run:focus-visible{outline:3px solid rgba(67,56,202,.4);outline-offset:2px}
.adc .adc-file{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
.adc .adc-run{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;margin-top:12px;font:inherit;font-size:17px;font-weight:800;border:0;border-radius:14px;background:var(--b);color:#fff;cursor:pointer}
.adc .adc-run:disabled{background:#C9CCE8;cursor:default}
.adc .adc-msg{font-size:14px;color:var(--sub2,#6B7684);margin:8px 0 0;line-height:1.55;word-break:keep-all}
.adc .adc-priv{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--sub,#4E5968);background:var(--gray,#F2F4F6);border-radius:12px;padding:10px 12px;margin:0 0 12px;line-height:1.55;word-break:keep-all}
.adc .adc-priv b{color:#0E7A4F}
.adc .adc-found{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0;list-style:none}
.adc .adc-found li{font-size:13.5px;font-weight:700;padding:5px 10px;border-radius:999px;background:#EEF0FF;color:#3730A3}
.adc .adc-found li.no{background:var(--gray,#F2F4F6);color:var(--sub2,#6B7684);font-weight:600}
.adc .adc-fix{margin:14px 0 0;background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:14px;padding:12px 14px}
.adc .adc-fix summary{cursor:pointer;font-weight:800;font-size:15px;min-height:28px}
.adc .adc-fix .g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.adc .adc-fix .g>div{min-width:0}
.adc .adc-fix label{display:block;font-size:13.5px;font-weight:700;margin-bottom:4px}
.adc .adc-fix input,.adc .adc-fix select{width:100%;box-sizing:border-box;font:inherit;font-size:16px;min-height:46px;padding:0 10px;border:1px solid var(--line,#E5E8EB);border-radius:10px;background:#fff;min-width:0}
@media(max-width:420px){.adc .adc-fix .g{grid-template-columns:1fr}}
.adc .adc-res{margin-top:16px;scroll-margin-top:72px}
.adc .adc-two{display:grid;gap:10px;margin:14px 0}
@media(min-width:760px){.adc .adc-two{grid-template-columns:1fr 1fr}}
.adc .adc-box{background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:14px;padding:12px 14px}
.adc .adc-box h3{font-size:15px;margin:0 0 6px}
.adc .adc-box ul{margin:0;padding-left:18px;font-size:14.5px;line-height:1.6;word-break:keep-all}
.adc .adc-load{padding:20px 14px;text-align:center;color:var(--sub2,#6B7684);border:1px dashed var(--line,#E5E8EB);border-radius:14px;background:#fff;font-size:15px}
.adc [hidden]{display:none!important}`;
    document.head.appendChild(s);
  }

  /* 자료 불러오기(한 번만) */
  const LOAD = {};
  const ix = () => LOAD.ix || (LOAD.ix = getJ(DATA + 'index.json'));
  const rowsAll = () => LOAD.rows || (LOAD.rows = Promise.all([soft(getJ(DATA + 'bunyang/notices.json')), soft(getJ(DATA + 'bunyang/plan.json'))]).then(([n, p]) => [...((n && n.rows) || []), ...((p && p.rows) || [])].filter(x => x && x.n)));

  async function gather(ext, opt) {
    const A = root.JDJ_ADCHK, M = root.JDJ_MINE, IX = await soft(ix());
    let place = A.placeOf(ext, IX);
    if (place && place.many && opt.code) place = { code: opt.code, name: IX.sgg[opt.code].name, sido: IX.sgg[opt.code].sido, sid: ((IX.sido || []).find(s => s.name === IX.sgg[opt.code].sido) || {}).id || '', dong: (ext.addr && ext.addr.dong) || '' };
    else if (!place && opt.code && IX && IX.sgg[opt.code]) place = { code: opt.code, name: IX.sgg[opt.code].name, sido: IX.sgg[opt.code].sido, sid: ((IX.sido || []).find(s => s.name === IX.sgg[opt.code].sido) || {}).id || '', dong: '' };
    const many = place && place.many ? place.many : null; if (many) place = null;
    const rows = await rowsAll();
    const m = A.matchNotice(ext, rows, place), N = m ? m.row : null;
    if (!place && N && IX && IX.sgg[N.g]) place = { code: N.g, name: IX.sgg[N.g].name, sido: IX.sgg[N.g].sido, sid: ((IX.sido || []).find(s => s.name === IX.sgg[N.g].sido) || {}).id || '', dong: N.dg || '' };
    const ctx = { today: todayIso(), place, notice: N, R: root.JDJ_LOAN_RULES || null, rules: root.JDJ_CYPLAN ? root.JDJ_CYPLAN.rules : null, dataTo: IX && IX.dataTo, userPrice: opt.price || null, userArea: opt.area || null };
    if (!place) return { ctx, many, IX };
    const sid = place.sid, code = place.code;
    const [ny, pg, poi, dm, rg, ex, dong] = await Promise.all([
      N && N.no ? soft(getJ(DATA + 'chungyak/price.json')).then(j => j && j.rows ? j.rows[N.no] || null : null) : null,
      soft(getJ(DATA + 'price/' + code + '.json')),
      ext.station || ext.school.length ? soft(getJ(DATA + 'poi/' + sid + '.json')) : null,
      ext.dev.length || ext.school.length ? soft(getJ(DATA + 'devmap.json')) : null,
      soft(getJ(DATA + 'region/' + sid + '.json')),
      /^41/.test(code) ? soft(getJ(DATA + 'bunyang/extra.json')) : null,
      !(N && N.xy) && place.dong ? soft(getJ(JB.SITE + 'assets/dong/' + code.slice(0, 2) + '.json')) : null
    ]);
    ctx.ny = ny;
    const area = opt.area || (ext.area && ext.area.m2) || (N && N.ty && N.ty.length ? +N.ty.slice().sort((a, b) => Math.abs(a[1] - 84) - Math.abs(b[1] - 84))[0][1] : 84);
    if (pg && pg.units) ctx.near = A.nearPrice(pg.units, { dong: place.dong, area, dataTo: IX && IX.dataTo, from: IX && IX.price && IX.price.from });
    if (ext.claims.jeonse && pg && pg.units && ctx.near && !ctx.near.lack && M && pg.hist && /^price\/h\/\d{5}\.json$/.test(pg.hist.file || '')) {
      const h = await soft(getJ(DATA + pg.hist.file));
      if (h) {
        const out = [];
        ctx.near.list.forEach(r => {
          const i = pg.units.findIndex(u => u[1] === r.dong && u[2] === r.name && u[3] === r.band); if (i < 0) return;
          const row = M.histRow(h, pg.units[i], i, pg.hist.v); const t = row ? M.histSeries(h, row, 33.058) : null; if (!t) return;
          for (let k = t.j.length - 1; k >= Math.max(0, t.j.length - 3); k--) if (t.j[k] > 0) { out.push({ name: r.name, dong: r.dong, jppy: t.j[k] / 10, at: t.months[k] }); break; }
        });
        ctx.jeonse = A.nearJeonse(out);
      }
    }
    if (N && Array.isArray(N.xy)) { ctx.xy = N.xy; ctx.xyFrom = 'notice'; }
    else if (dong && dong.rows && dong.rows[code + '|' + place.dong]) { const d = dong.rows[code + '|' + place.dong]; ctx.xy = [d[0], d[1]]; ctx.xyFrom = 'dong'; }
    ctx.poi = poi; ctx.dm = dm;
    const g = rg && rg.gu && rg.gu[code];
    if (g && g.uns && g.uns[0] != null) ctx.uns = { now: g.uns[0], y1: g.uns[1], grp: g.uns[2], ym: rg.src && rg.src.uns ? rg.src.uns.ym : '' };
    if (ex && ex.status === 'ok') ctx.unsold = (ex.unsold || []).filter(r => r.g === code);
    return { ctx, many: null, IX };
  }

  function mount(el, opt) {
    if (!el) return;
    opt = opt || {};
    style();
    const base = opt.base || JB.SITE, tr = opt.from === 'guide' ? 'guide_adcheck' : 'adcheck';
    el.innerHTML = `${opt.head || ''}<div class="adc">
      <p class="adc-priv"><span aria-hidden="true">🔒</span><span><b>붙여 넣은 글과 캡처는 이 기기 안에서만 읽어요.</b> 서버로 보내지 않고, 저장하지도 않아요. 전화번호·이름은 읽지 않아요.</span></p>
      <div class="adc-in">
        <label class="t" for="adcText">받은 분양 문자·카톡 글을 붙여 넣어 주세요</label>
        <textarea id="adcText" placeholder="예: 【○○ 센트럴】 잔여세대 선착순 분양 / 전용 84㎡ 분양가 5억 → 최대 3천만원 할인 / 잔금 30% 2년 유예 / 실거주 의무 없음 / ○○역 도보 5분…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
        <div class="adc-row">
          <label class="adc-btn" for="adcFile" data-track="${tr}_ocr"><span aria-hidden="true">📷</span>캡처 사진으로 넣기</label><input class="adc-file" type="file" id="adcFile" accept="image/*">
          <button type="button" class="adc-btn" id="adcSample" data-track="${tr}_sample">예시 광고로 해 보기</button>
          <button type="button" class="adc-btn" id="adcClear">지우기</button>
        </div>
        <p class="adc-msg" id="adcMsg" aria-live="polite">문자 앱에서 글을 길게 눌러 복사한 뒤 붙여 넣으면 돼요.</p>
        <button type="button" class="adc-run" id="adcRun" data-track="${tr}_run">광고 확인하기</button>
      </div>
      <section class="adc-res" id="adcRes" aria-live="polite" hidden></section>
    </div>`;
    const $ = id => el.querySelector('#' + id), ta = $('adcText');
    let lastExt = null, fix = {};
    const msg = t => { $('adcMsg').textContent = t; };
    $('adcSample').addEventListener('click', () => { ta.value = SAMPLE; msg('지어낸 예시 광고예요. [광고 확인하기]를 눌러 보세요.'); });
    $('adcClear').addEventListener('click', () => { ta.value = ''; fix = {}; lastExt = null; $('adcRes').hidden = true; $('adcRes').innerHTML = ''; msg('지웠어요. 이 기기에도 남아 있지 않아요.'); ta.focus(); });
    $('adcFile').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { msg('사진(캡처) 파일만 읽을 수 있어요.'); return; }
      msg('캡처에서 글자를 읽는 중이에요… 처음 한 번은 글자 읽기 도구(약 10MB)를 내려받아 시간이 걸려요. 사진은 이 기기 밖으로 보내지 않아요.');
      try {
        if (!root.Tesseract) await script(OCR_SRC);
        const r = await root.Tesseract.recognize(f, 'kor+eng', { logger: m => { if (m && m.status === 'recognizing text' && m.progress != null) msg(`캡처에서 글자를 읽는 중이에요… ${Math.round(m.progress * 100)}%`); } });
        const text = String(r && r.data && r.data.text || '').replace(/[ \t]+\n/g, '\n').trim();
        if (!text) { msg('글자를 찾지 못했어요. 문자 글을 복사해 붙여 넣어 주세요.'); return; }
        ta.value = text; msg('읽은 글을 위 칸에 넣었어요. 잘못 읽은 글자가 있으면 고친 뒤 [광고 확인하기]를 눌러 주세요.');
      } catch (err) { msg('이 기기에서 글자 읽기 도구를 불러오지 못했어요. 문자 글을 길게 눌러 복사한 뒤 붙여 넣어 주세요.'); }
    });
    async function run(keep) {
      const text = ta.value;
      if (!text.trim()) { msg('광고 글을 먼저 붙여 넣어 주세요.'); ta.focus(); return; }
      const res = $('adcRes'); res.hidden = false; res.innerHTML = '<div class="adc-load">공개 자료와 맞춰 보는 중이에요…</div>';
      $('adcRun').disabled = true;
      try {
        await deps();
        const A = root.JDJ_ADCHK;
        const ext = keep && lastExt ? lastExt : A.parse(text); lastExt = ext;
        const G = await gather(ext, fix);
        const rep = A.build(ext, G.ctx);
        draw(res, ext, rep, G);
        if (!keep) res.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        res.innerHTML = '<div class="adc-load">자료를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.</div>';
        try { if (root.JDJ_DEBUG && root.JDJ_ADCHK) console.warn('[adcheck]', root.JDJ_ADCHK.scrub(String(err && err.message || err))); } catch (e) {}
      } finally { $('adcRun').disabled = false; }
    }
    $('adcRun').addEventListener('click', () => { fix = {}; run(false); });
    function draw(res, ext, rep, G) {
      const A = root.JDJ_ADCHK, DG = root.JDJ_DIAG;
      const ALL = ['주소', '역 거리', '면적', '분양가', '할인', '잔금 유예', '중도금 조건', '개발 호재', '학군', '시공사', '규모'];
      const found = `<ul class="adc-found" aria-label="광고에서 찾은 내용">${ALL.map(k => `<li class="${ext.found.indexOf(k) >= 0 ? '' : 'no'}">${ext.found.indexOf(k) >= 0 ? '✓ ' : ''}${esc(k)}</li>`).join('')}</ul>`;
      const facts = rep.items.filter(i => i.lv === 'g').map(i => `<li><b>${esc(i.t)}</b> — ${esc(i.s || i.v)}</li>`);
      const checks = rep.items.filter(i => i.lv === 'y' || i.lv === 'r').map(i => `<li><b>${esc(i.t)}</b> — ${esc(i.s || i.v)}</li>`);
      const unk = rep.items.filter(i => i.lv === 'n').map(i => `<li><b>${esc(i.t)}</b> — ${esc(i.s || i.v)}</li>`);
      const two = `<div class="adc-two"><div class="adc-box"><h3>확인한 사실</h3><ul>${facts.join('') || '<li>공개 자료와 같다고 확인한 항목이 아직 없어요.</li>'}</ul></div>
        <div class="adc-box"><h3>확인할 점</h3><ul>${checks.concat(unk).join('') || '<li>따로 확인할 점을 찾지 못했어요.</li>'}</ul></div></div>`;
      const IX = G.IX, sgOpts = G.many ? G.many : null;
      const fixBox = `<details class="adc-fix"${rep.items.some(i => i.ask) || sgOpts ? ' open' : ''}><summary>분양가·면적·지역 직접 넣기</summary>
        <p class="adc-msg">광고에 없거나 잘못 읽은 값만 넣어 주세요. 넣은 값도 이 기기 안에서만 써요.</p>
        <div class="g"><div><label for="adcP">분양가(만원)</label><input id="adcP" inputmode="numeric" placeholder="예: 49800" value="${fix.price || ''}"></div>
        <div><label for="adcA">전용면적(㎡)</label><input id="adcA" inputmode="decimal" placeholder="예: 84" value="${fix.area || ''}"></div>
        <div style="grid-column:1/-1"><label for="adcG">시·군·구</label><select id="adcG"><option value="">${G.ctx.place ? esc(G.ctx.place.sido + ' ' + G.ctx.place.name) + ' (광고에서 찾음)' : '광고에서 찾지 못했어요 — 골라 주세요'}</option>${sgOpts ? sgOpts.map(s => `<option value="${esc(s.code)}">${esc(s.sido + ' ' + s.name)}</option>`).join('') : IX && IX.sgg ? Object.keys(IX.sgg).sort((a, b) => (IX.sgg[a].sido + IX.sgg[a].name).localeCompare(IX.sgg[b].sido + IX.sgg[b].name, 'ko')).map(c => `<option value="${c}"${fix.code === c ? ' selected' : ''}>${esc(IX.sgg[c].sido + ' ' + IX.sgg[c].name)}</option>`).join('') : ''}</select></div></div>
        <button type="button" class="adc-run" id="adcRe" data-track="${tr}_fix">이 값으로 다시 확인하기</button></details>`;
      res.innerHTML = `${found}<div id="adcDiag"></div>${two}${fixBox}`;
      DG.mount(res.querySelector('#adcDiag'), rep, { base, key: '', print: true, track: tr,
        share: { url: base.replace(/^\//, location.origin + '/') + 'bunyang/check/', title: '받은 분양 광고 확인하기 | 집예보', text: A.shareText(rep) },
        shareNote: '공유하면 확인 결과 요약(항목별 신호)만 보내요. 광고 글·금액·전화번호는 들어가지 않아요.' });
      const num = s => { const v = parseFloat(String(s || '').replace(/[^\d.]/g, '')); return isFinite(v) && v > 0 ? v : null; };
      res.querySelector('#adcRe').addEventListener('click', () => {
        fix = { price: num(res.querySelector('#adcP').value), area: num(res.querySelector('#adcA').value), code: res.querySelector('#adcG').value || '' };
        if (fix.price && fix.price < 1000) fix.price = Math.round(fix.price * 10000);   // '4.98'처럼 억 단위로 넣은 경우
        run(true);
      });
    }
    return el;
  }

  const API = { mount, SAMPLE, gather };
  root.JDJ_ADCHKV = API;
})(typeof window !== 'undefined' ? window : globalThis);
