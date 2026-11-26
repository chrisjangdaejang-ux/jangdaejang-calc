/* 집예보 '단지 이름으로 물어보기' 입력창 — 홈·내 집 시세·단지 비교 화면 위쪽.
   문장에서 단지 1~3곳을 찾아(assets/ask-core.js) 1곳이면 내 집 시세, 2~3곳이면 단지 비교(ask/)로 보낸다.
   대화형 답변을 만들지 않고, 공개 통계(국토교통부 실거래·공공 데이터)로 정해진 계산만 한다.
   '많이 찾는 단지' 칩은 실제 조회 집계(assets/stat.js 의 ask_use → 운영자가 assets/ask-popular.json 에 기록)로만 보여 주고,
   집계가 아직 없으면 '예시' 표시를 붙인 예시 질문을 보여 준다.
   필요: assets/mine-core.js, assets/ask-core.js (+ 있으면 stat.js) · 사용: JDJ_ASK.mount(요소, {from:'home'|'mine'|'ask', value}) */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/';
  const POP = JB.SITE + 'assets/ask-popular.json';
  const EXAMPLES = ['잠실엘스 헬리오시티 비교', '목동 신시가지 7단지 지금 사도 될까?', '은마 래미안대치팰리스 34평', '헬리오시티'];
  /* 찾는 순서: 문장에 시·도 이름이 있으면 그 시·도부터, 아니면 서울 → 경기·인천 → 나머지 */
  const TIERS = [['s00'], ['s08', 's03'], ['s01', 's02', 's04', 's05', 's06', 's07', 's09', 's10', 's11', 's12', 's13', 's14', 's15']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = {};
  const get = (k, url) => C[k] || (C[k] = fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(url); return r.json(); }).catch(e => { delete C[k]; throw e; }));
  const GROUPS = new Map(), LOADED = new Set();
  let IX = null;

  async function index() { if (!IX) IX = await get('ix', DATA + 'index.json'); return IX; }
  async function loadSido(sd) {
    if (LOADED.has(sd)) return;
    const M = root.JDJ_MINE;
    let rows;
    try { rows = ((await get('p' + sd, DATA + 'price/' + sd + '.json')).units || []).map(M.listRow); }
    catch (e) { rows = ((await get('s' + sd, DATA + sd + '.json')).units || []); }
    for (const [k, d] of M.groupDanji(rows)) { d.sd = sd; GROUPS.set(sd + '|' + k, d); }
    LOADED.add(sd);
  }
  const sggName = c => ((IX && IX.sgg[c]) || {}).name || '';
  const sidoShort = sd => ((IX && IX.sido.find(s => s.id === sd)) || {}).short || '';
  function tiersFor(text) {
    const hit = (IX ? IX.sido : []).filter(s => text.indexOf(s.short) >= 0 || text.indexOf(s.name) >= 0).map(s => s.id);
    if (!hit.length) return TIERS;
    return [hit].concat(TIERS.map(t => t.filter(x => hit.indexOf(x) < 0)).filter(t => t.length));
  }
  /** 문장 → 결과. 앞 단계 시·도에서 모든 낱말이 단지로 풀리면 거기서 멈춤 */
  async function ask(text, onStep, maxTiers) {
    const A = root.JDJ_ASK_CORE;
    await index();
    let res = null;
    for (const tier of tiersFor(text).slice(0, maxTiers || 99)) {
      if (onStep) onStep(tier);
      await Promise.all(tier.map(sd => loadSido(sd).catch(() => null)));
      res = A.parse(text, GROUPS);
      if (res.segs.length && !res.skipped.length) break;
    }
    return res;
  }

  /* ---------- 화면 ---------- */
  const CSS = '.jask{margin:0 0 14px;padding:18px;border-radius:18px;background:#F4F7FF;border:1.5px solid #C9D8FF}'
    + '.jask h2{margin:0;font-size:19px;font-weight:900;letter-spacing:-.4px}.jask h2 small{display:block;font-size:14px;font-weight:500;color:#4E5968;margin-top:3px;letter-spacing:0}'
    + '.jask form{display:flex;gap:8px;margin-top:12px}.jask input{flex:1;min-width:0;font:inherit;font-size:16px;min-height:50px;padding:0 14px;border:1.5px solid #C9D8FF;border-radius:14px;background:#fff;color:#191F28}'
    + '.jask input:focus{outline:0;border-color:#2560E8;box-shadow:0 0 0 3px rgba(47,107,255,.15)}'
    + '.jask form button{flex:none;font:inherit;font-size:16px;font-weight:800;min-height:50px;padding:0 18px;border:0;border-radius:14px;background:#2560E8;color:#fff;cursor:pointer}'
    + '.jask .msg{font-size:14.5px;line-height:1.55;color:#3E4754;margin-top:10px}.jask .msg:empty{display:none}.jask .msg.err{color:#C2410C;font-weight:700}'
    + '.jask .cands{display:grid;gap:10px;margin-top:10px}.jask .cands:empty{display:none}'
    + '.jask .cg b{display:block;font-size:15px;margin-bottom:6px}.jask .cg .row{display:flex;flex-wrap:wrap;gap:6px}'
    + '.jask .chip{font:inherit;font-size:14.5px;font-weight:700;min-height:44px;padding:4px 14px;border:1px solid #D1D6DB;border-radius:999px;background:#fff;color:#3E4754;cursor:pointer;text-align:left;line-height:1.3}'
    + '.jask .chip small{display:block;font-size:12.5px;font-weight:500;color:#4E5968}.jask .chip.on{border-color:#2560E8;background:#E8F0FF;color:#1F56E0}.jask .chip:hover{border-color:#2560E8}'
    + '.jask .pop{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}.jask .pop>span{font-size:13.5px;font-weight:700;color:#4E5968;margin-right:2px}'
    + '.jask .pop .ex{display:inline-block;font-size:11.5px;font-weight:800;color:#8A6D17;background:#FBF5E3;border:1px solid #EFE2B8;border-radius:5px;padding:0 5px;margin-left:4px;vertical-align:1px}'
    + '.jask .pop .chip{min-height:44px;font-size:14px;font-weight:600}'
    + '.jask .tp{display:flex;flex-direction:column;gap:4px;margin-top:10px;padding:14px;border-radius:14px;background:#fff;border:1.5px solid #2560E8;text-decoration:none;color:#191F28}'
    + '.jask .tp b{font-size:16px;font-weight:800;color:#1F56E0}.jask .tp small{font-size:13.5px;color:#4E5968;line-height:1.5}.jask .tp:hover{background:#F4F7FF}'
    + '.jask .note{font-size:13px;color:#4E5968;margin:10px 0 0;line-height:1.5}'
    + '@media(max-width:420px){.jask{padding:16px 14px}.jask form button{padding:0 14px}}';
  function css() { if (document.getElementById('jaskCss')) return; const s = document.createElement('style'); s.id = 'jaskCss'; s.textContent = CSS; document.head.appendChild(s); }

  function mount(el, opt) {
    if (!el) return; opt = opt || {}; css();
    const from = opt.from || 'home';
    el.classList.add('jask');
    el.innerHTML = `<h2>단지 이름으로 물어보기<small>통계로 답해요 · 단지 1곳은 시세와 전망, 2~3곳은 나란히 비교해 드려요</small></h2>
      <form role="search" novalidate><label class="sr" for="jaskQ" style="position:absolute;left:-9999px">단지 이름으로 물어보기</label>
        <input id="jaskQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="예: 잠실엘스 헬리오시티" value="${esc(opt.value || '')}">
        <button type="submit">물어보기</button></form>
      <div class="msg" role="status" aria-live="polite"></div>
      <div class="cands"></div>
      <div class="pop" aria-label="많이 찾는 단지"></div>
      <p class="note">국토교통부 실거래가와 공공 데이터를 정해진 규칙으로 계산해 보여 드려요. 입력한 문장은 저장하거나 보내지 않아요.</p>`;
    const f = el.querySelector('form'), q = el.querySelector('input'), msg = el.querySelector('.msg'), cbox = el.querySelector('.cands'), pop = el.querySelector('.pop');
    const say = (t, err) => { msg.textContent = t || ''; msg.classList.toggle('err', !!err); };
    let RUN = 0, CUR = null;

    function go(picks, hint) {
      const A = root.JDJ_ASK_CORE;
      const ps = picks.map(d => ({ d, band: A.pickBand(d, hint) }));
      if (root.jdjStat) {
        try {
          root.jdjStat('feature_use', { feature: 'ask', from });
          root.jdjStat('ask_use', { n: ps.length, from });
          ps.forEach(p => root.jdjStat('ask_use', { danji: [p.d.code, p.d.dong, p.d.apt].join('|') }));
        } catch (e) {}
      }
      const url = A.target(ps.map(p => ({ d: p.d, band: hint ? p.band : '' })), hint, from);
      if (opt.onGo) opt.onGo(url, ps); else root.location.href = url;
    }
    function label(d) { return `${esc(d.apt)}<small>${esc(sidoShort(d.sd))} ${esc(sggName(d.code))} ${esc(d.dong)} · 최근 3년 거래 ${Number(d.n || 0).toLocaleString()}건</small>`; }
    function paint() {
      const r = CUR; if (!r) { cbox.innerHTML = ''; return; }
      const open = r.segs.map((s, i) => [s, i]).filter(([s]) => !s.chosen);
      if (!open.length) { go(r.segs.map(s => s.chosen), r.hint); return; }
      say(`${open.length === r.segs.length && r.segs.length === 1 ? '' : '찾은 단지: ' + r.segs.filter(s => s.chosen).map(s => s.chosen.apt).join(', ') + '. '}아래에서 어느 단지인지 골라 주세요.`);
      cbox.innerHTML = open.map(([s, i]) => `<div class="cg"><b>‘${esc(s.q)}’ — 어느 단지인가요?</b><div class="row">${s.cands.map((d, k) => `<button type="button" class="chip" data-s="${i}" data-k="${k}">${label(d)}</button>`).join('')}</div></div>`).join('');
    }
    function showTopic(tp, picks) {
      const where = tp.where ? tp.where + ' ' : '';
      say(tp.msg || `이 질문은 ‘${tp.title}’ 화면에서 바로 확인할 수 있어요.${where ? ` ${where.trim()} 조건을 넣어 열어 드려요.` : ''}`);
      cbox.innerHTML = `<a class="tp" href="${esc(tp.url)}" data-track="ask_topic_${esc(tp.id)}"><b>${esc(where)}${esc(tp.title)} 바로 보기 ›</b><small>${esc(tp.desc)}</small></a>`
        + ((picks || []).length ? `<div class="cg"><b>문장 속 단지 시세를 보려면</b><div class="row">${picks.slice(0, 3).map((d, k) => `<button type="button" class="chip" data-pk="${k}">${label(d)}</button>`).join('')}</div></div>` : '');
      CUR = null; TP_PICKS = picks || [];
      if (root.jdjStat) try { root.jdjStat('feature_use', { feature: 'ask_topic', from, topic: tp.id }); } catch (e) {}
    }
    let TP_PICKS = [];
    cbox.addEventListener('click', e => {
      const pk = e.target.closest('[data-pk]'); if (pk) { const d = TP_PICKS[+pk.dataset.pk]; if (d) go([d], null); return; }
      const b = e.target.closest('[data-s]'); if (!b || !CUR) return;
      const s = CUR.segs[+b.dataset.s]; s.chosen = s.cands[+b.dataset.k]; paint();
    });
    async function run(text) {
      text = String(text || '').trim(); const my = ++RUN; cbox.innerHTML = '';
      if (text.replace(/\s/g, '').length < 2) { say('단지 이름을 두 글자 이상 넣어 주세요. 예: 잠실엘스 헬리오시티 비교', true); return; }
      if (!root.JDJ_ASK_CORE || !root.JDJ_MINE) { say('잠시 뒤 다시 눌러 주세요. 화면을 불러오는 중이에요.', true); return; }
      say('단지를 찾는 중이에요…');
      let r;
      /* 주제 질문(분양·순위 등)이면 단지 이름은 첫 지역 묶음에서만 찾아요(모든 시·도 자료를 받지 않게) */
      let pre = null; try { await index(); pre = root.JDJ_ASK_CORE.topic ? root.JDJ_ASK_CORE.topic(text, IX) : null; } catch (e) {}
      try { r = await ask(text, t => { if (my === RUN && t[0] !== 's00') say('다른 지역에서도 찾는 중이에요…'); }, pre && !pre.danjiOk ? 1 : 0); }
      catch (e) { if (my === RUN) say('자료를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.', true); return; }
      if (my !== RUN) return;
      /* 단지 이름이 아닌 질문(분양·순위·재개발·전월세 등)은 그 질문에 답하는 화면으로 — '서울'을 단지 이름으로 찾던 문제(2026-11-26) */
      const A = root.JDJ_ASK_CORE;
      if (r && A.regionWord) r.segs = r.segs.filter(sg => !(sg.pick || sg.cands.length) || !A.regionWord(sg.q, IX));
      if (r && pre && A.topicWord) r.segs = r.segs.filter(sg => !A.topicWord(sg.q));
      let tp = A.topic ? A.topic(text, IX) : null;
      if (!tp && A.topic && r && !r.segs.length && A.regionOf(text, IX).sd) tp = A.topic(text + ' 순위', IX);   // '송파구'처럼 지역 이름만 → 지역 순위
      if (tp) {
        const one = r && r.segs.length === 1 ? (r.segs[0].pick || (r.segs[0].cands.length === 1 ? r.segs[0].cands[0] : null)) : null;
        if (tp.danjiOk && one) {   // '헬리오시티 전세' → 그 단지의 전월세 화면
          const band = A.pickBand(one, r.hint), q2 = new URLSearchParams({ sd: one.sd, d: one.key }); if (band) q2.set('b', band);
          say(`${one.apt} ${tp.title} 화면으로 이동해요…`);
          if (root.jdjStat) try { root.jdjStat('feature_use', { feature: 'ask_topic', from, topic: tp.id }); } catch (e) {}
          const u = tp.url.split('?')[0] + '?' + q2.toString();
          if (opt.onGo) opt.onGo(u, []); else root.location.href = u;
          return;
        }
        /* 재개발·재건축 질문에 구역 이름(예: '은마 재건축')이 있으면 그 구역을 바로 열기 */
        if (tp.id === 'zone' && r) {
          try {
            const Z = await get('zones', DATA + 'redev/zones.json'), nz = x => String(x || '').replace(/\s|아파트|재건축|재개발|정비구역|구역/g, '');
            const words = (r.tokens || []).map(nz).filter(w => w.length >= 2 && !A.topicWord(w) && !A.regionWord(w, IX));
            const pickN = r.segs.filter(sg => sg.pick).map(sg => nz(sg.pick.apt));
            let hit = null;
            for (const w of pickN.concat(words)) { const hs = (Z.z || []).filter(z => nz(z.n) === w || (w.length >= 2 && nz(z.n).indexOf(w) === 0)); if (hs.length === 1) { hit = hs[0]; break; } }
            if (my !== RUN) return;
            if (hit) tp = Object.assign({}, tp, { url: tp.url.split('?')[0] + '?z=' + encodeURIComponent(hit.id), where: '', msg: `‘${hit.n}’ 구역의 지금 단계와 착공 예상 시기는 재개발·재건축 구역 지도에서 바로 볼 수 있어요.`, title: `${hit.n} 구역 단계·착공 예상`, desc: `${hit.gn || ''} ${hit.umd || ''} · 지금 단계${hit.sn ? ' ' + hit.sn : ''}와 단계별 실제 날짜, 착공까지 보통 몇 년 걸리는지 보여 드려요`.trim() });
          } catch (e) {}
        }
        showTopic(tp, r && r.segs.filter(sg => sg.pick).map(sg => sg.pick));
        return;
      }
      if (!r || !r.segs.length) {
        say(`‘${text}’에서 단지 이름을 찾지 못했어요. 단지 이름을 실거래 신고 이름처럼 넣어 보세요(예: 헬리오시티, 목동신시가지7). 최근 3년 동안 거래가 있었던 아파트만 찾을 수 있어요.`, true);
        return;
      }
      r.segs.forEach(s => { s.chosen = s.pick || (s.cands.length === 1 ? s.cands[0] : null); });
      CUR = r;
      if (r.more) say(`단지는 한 번에 ${root.JDJ_ASK_CORE.MAX}곳까지 비교해요. 앞의 ${root.JDJ_ASK_CORE.MAX}곳으로 보여 드릴게요.`);
      if (r.segs.every(s => s.chosen)) { say(r.segs.length === 1 ? `${r.segs[0].chosen.apt} 시세 화면으로 이동해요…` : `${r.segs.map(s => s.chosen.apt).join(', ')} 비교 화면으로 이동해요…`); go(r.segs.map(s => s.chosen), r.hint); return; }
      paint();
    }
    f.addEventListener('submit', e => { e.preventDefault(); run(q.value); });

    /* 많이 찾는 단지: 실제 조회 집계만(최소 조회 수 이상), 없으면 예시 질문 */
    function exChips() {
      pop.innerHTML = `<span>이렇게 물어보세요<i class="ex">예시</i></span>` + EXAMPLES.map(t => `<button type="button" class="chip" data-q="${esc(t)}">${esc(t)}</button>`).join('');
    }
    exChips();
    fetch(POP, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => {
      const min = j && j.min > 0 ? j.min : 20;
      const items = ((j && j.items) || []).filter(x => x && x.apt && x.n >= min).slice(0, 6);
      if (!items.length) return;
      pop.innerHTML = `<span>많이 찾는 단지<small style="font-weight:500"> (${esc(j.period || '최근 집계')})</small></span>` + items.map(x => `<button type="button" class="chip" data-q="${esc(x.apt)}">${esc(x.apt)}</button>`).join('');
    }).catch(() => {});
    pop.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; q.value = b.dataset.q; run(b.dataset.q); });
    return { run };
  }
  root.JDJ_ASK = { mount, ask, groups: () => GROUPS, index };
})(typeof self !== 'undefined' ? self : this);
