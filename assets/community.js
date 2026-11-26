/* 살아보니 — 건물별 짧은 후기와 이야기 (JDJ_CM)
   - 지금은 숨김: assets/config.js COMMUNITY_ENABLED 가 false 면 화면 어디에도 칸·링크가 나오지 않아요.
     운영자 미리 보기 = 운영자 화면(community/admin/)에서 확인을 마친 기기(이 기기 저장소에 운영자 표시) + 주소에 ?preview=community.
   - 자리: 내 집 시세 화면의 아파트·빌라·오피스텔·상가·건물 결과(각 화면이 slot() 으로 빈 칸만 만들고, 여기서 채움) · community/(건물별 전체 보기)
   - 건물 번호(pid) = 종류|구 코드|동|화면이 쓰는 건물 키 — 종류 a 아파트(지번|단지 이름) · v 빌라 · o 오피스텔 · c 상가·건물(각 화면 keyOf 그대로)
   - 글쓰기·신고·인증은 기존 카카오 간편 로그인(assets/auth.js)으로만. 화면에는 닉네임 대신 건물마다 다른 별명('이웃 3F2A')이 보여요.
   - 거르는 낱말·점수는 이 파일에 없어요(서버에서만 확인). 서버: tools/agent-backend.gs 'v46' 칸. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const CFG = root.JDJ_SITE || {};
  const LS_PV = 'jdj_cm_preview', LS_AS = 'jdj_cm_admin', SS_PV = 'jdj_cm_pv', LS_AUTH = 'jdj_auth';
  const CATS = [['tr', '교통'], ['no', '소음'], ['pk', '주차'], ['sc', '학군·학원'], ['mg', '관리']];
  const WHY = [['abuse', '욕설·비방'], ['pi', '개인 정보'], ['ad', '광고·홍보'], ['dam', '집값 담합'], ['false', '사실이 아닌 내용'], ['etc', '기타']];
  const KIND = { a: '단지', v: '빌라', o: '오피스텔', c: '건물' };
  const MAX_R = 100, MAX_P = 500;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const site = () => String((root.JDJ_SITE || {}).SITE_NAME || '').trim();
  const api = () => (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || '';

  /* ---------- 켜짐 확인 ---------- */
  function adminToken() { const t = ls.get(LS_AS) || ''; return /^[0-9a-f]{64}$/.test(t) ? t : ''; }
  function preview() {
    if (typeof location === 'undefined') return false;
    if (ls.get(LS_PV) !== '1' || !adminToken()) { ss.del(SS_PV); return false; }
    if (/[?&]preview=community(&|$)/.test(location.search)) { ss.set(SS_PV, '1'); return true; }
    return ss.get(SS_PV) === '1';           // 같은 탭에서 화면이 주소를 바꿔도(단지 고르기 등) 미리 보기 유지
  }
  function enabled() { return CFG.COMMUNITY_ENABLED === true || preview(); }

  /** 건물 번호: {t, g(구 코드), d(동), k(건물 키)} → 'a|11680|개포동|12|개포자이' */
  function pidOf(p) {
    const clean = v => String(v == null ? '' : v).replace(/[<>\u0000-\u001F]/g, '').trim();
    const t = /^[aovc]$/.test(p.t) ? p.t : '', g = /^\d{5}$/.test(String(p.g)) ? String(p.g) : '', d = clean(p.d).replace(/\|/g, ' ').slice(0, 30), k = clean(p.k).slice(0, 130);
    return t && g && d && k ? [t, g, d, k].join('|') : '';
  }
  /** 각 화면이 결과 안에 넣는 빈 칸(꺼져 있으면 빈 글자) */
  function slot(p) {
    if (!enabled()) return '';
    const pid = pidOf(p); if (!pid) return '';
    return `<section class="panel cm-box" data-cm-pid="${esc(pid)}" data-cm-name="${esc(String(p.n || '').slice(0, 60))}" aria-label="살아보니"></section>`;
  }
  function pageUrl(pid, name) {
    return `${JB.SITE}community/?p=${encodeURIComponent(pid)}${name ? '&n=' + encodeURIComponent(name) : ''}${preview() && CFG.COMMUNITY_ENABLED !== true ? '&preview=community' : ''}`;
  }

  /* ---------- 서버 ---------- */
  function sess() { try { const j = JSON.parse(ls.get(LS_AUTH) || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function post(body) {
    if (!api()) return Promise.reject(new Error('서버가 아직 연결되지 않았어요.'));
    const b = Object.assign({}, body); const s = sess(), as = adminToken();
    if (s && !b.s) b.s = s; if (as && preview()) b.as = as;
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(r => r.json()).then(j => {
        if (j && j.err === 'unknown') { const e = new Error('준비 중이에요. 조금만 기다려 주세요.'); e.code = 'unknown'; throw e; }
        if (!j || !j.ok) { const t = (j && j.err) || ''; const e = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.'); e.raw = t; e.code = (j && j.code) || ''; throw e; }
        return j;
      });
  }
  const loggedIn = () => !!(root.JDJ_AUTH && root.JDJ_AUTH.user && root.JDJ_AUTH.user());
  const loginOn = () => !!(root.JDJ_AUTH && root.JDJ_AUTH.on && root.JDJ_AUTH.on());

  /* ---------- 모양 ---------- */
  const CSS = `.cm-box{--cm-star:#E8A317}
.cm-box h2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cm-box h2 small{flex-basis:100%;display:block;font-size:13.5px;font-weight:500;color:var(--sub2,#4E5968);margin-top:2px;letter-spacing:0;line-height:1.5}
.cm-tag{display:inline-flex;align-items:center;font-size:12px;font-weight:800;border-radius:999px;padding:2px 8px;background:var(--blue-l,#EEEDFB);color:var(--blue,#4338CA);white-space:nowrap}
.cm-tag.pv{background:#FFF4E0;color:#9A5B00}
.cm-sum{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;margin:12px 0 4px}
@media(min-width:700px){.cm-sum{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}}
.cm-cat{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--gray,#F2F4F6);border-radius:12px;padding:9px 12px;min-width:0}
@media(min-width:700px){.cm-cat{flex-direction:column;align-items:flex-start;gap:2px}}
.cm-cat .cm-k{font-size:14px;font-weight:700;color:var(--sub,#3E4754);white-space:nowrap}
.cm-cat .cm-v{display:flex;align-items:center;gap:6px;font-size:17px;font-weight:900;font-variant-numeric:tabular-nums;white-space:nowrap}
.cm-cat .cm-v small{font-size:12.5px;font-weight:600;color:var(--sub2,#4E5968)}
.cm-stars{color:var(--cm-star);letter-spacing:-1px;font-size:15px}
.cm-stars .cm-off{color:#D1D6DB}
.cm-n{font-size:14px;color:var(--sub2,#4E5968);margin:6px 0 0;line-height:1.55}
.cm-list{margin:10px 0 0;display:grid;gap:8px}
.cm-it{border:1px solid var(--line,#E5E8EB);border-radius:14px;padding:12px 14px;background:#fff;min-width:0}
.cm-it .cm-hd{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13.5px;color:var(--sub2,#4E5968)}
.cm-it .cm-hd b{color:var(--text,#191F28);font-weight:800}
.cm-it .cm-hd .cm-dt{margin-left:auto;white-space:nowrap}
.cm-ok{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:800;color:#0E7A4F;background:#E6F5EE;border-radius:999px;padding:1px 8px;white-space:nowrap}
.cm-it .cm-tx{margin:6px 0 0;font-size:15.5px;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}
.cm-it .cm-rs{display:flex;flex-wrap:wrap;gap:4px 10px;margin:6px 0 0;font-size:13px;color:var(--sub2,#4E5968)}
.cm-it .cm-rs span{white-space:nowrap}
.cm-it .cm-rs b{color:var(--text,#191F28)}
.cm-near{font-size:12.5px;font-weight:800;color:#9A5B00;background:#FFF4E0;border-radius:6px;padding:1px 6px;white-space:nowrap}
.cm-lnk{flex:none;font:inherit;font-size:13px;font-weight:700;color:var(--sub2,#4E5968);background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:999px;min-height:32px;padding:0 11px;cursor:pointer}
.cm-lnk:hover{border-color:var(--sub2,#4E5968)}
.cm-acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.cm-btn{display:inline-flex;align-items:center;justify-content:center;font:inherit;font-size:15px;font-weight:800;min-height:46px;padding:0 16px;border-radius:14px;border:1px solid var(--blue,#4338CA);background:var(--blue,#4338CA);color:#fff;cursor:pointer;text-decoration:none}
.cm-btn.sub{background:#fff;color:var(--blue,#4338CA)}
.cm-btn[disabled]{opacity:.55;cursor:default}
.cm-form{margin:12px 0 0;border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:14px;background:var(--gray2,#F9FAFB)}
.cm-form h3{margin:0 0 8px;font-size:16px;font-weight:900}
.cm-rate{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;border-bottom:1px solid var(--line2,#F0F1F3);max-width:480px}
.cm-rate:last-of-type{border-bottom:0}
.cm-rate .cm-rk{font-size:15px;font-weight:700;min-width:0}
.cm-rate .cm-rst{display:flex;gap:2px;flex:none}
.cm-rate .cm-rst button{font:inherit;font-size:24px;line-height:1;width:40px;height:40px;border:0;background:none;color:#D1D6DB;cursor:pointer;border-radius:10px;padding:0}
.cm-rate .cm-rst button.on{color:var(--cm-star)}
.cm-rate .cm-rst button:focus-visible{outline:3px solid #9CC0FF}
@media(max-width:360px){.cm-rate .cm-rst button{width:34px;font-size:22px}}
.cm-inp{width:100%;font:inherit;font-size:16px;border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:12px;background:#fff;color:var(--text,#191F28);resize:vertical;min-height:52px;margin-top:10px}
.cm-inp:focus{outline:0;border-color:var(--blue,#4338CA);box-shadow:0 0 0 3px rgba(67,56,202,.15)}
.cm-cnt{font-size:12.5px;color:var(--sub2,#4E5968);text-align:right;margin-top:3px;font-variant-numeric:tabular-nums}
.cm-rules{margin:8px 0 0;font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.6}
.cm-rules summary{cursor:pointer;min-height:34px;display:flex;align-items:center;font-weight:700;color:var(--sub,#3E4754)}
.cm-rules ul{margin:0;padding-left:18px}
.cm-msg{margin:8px 0 0;font-size:14.5px;line-height:1.55}.cm-msg.err{color:#C2410C}.cm-msg.ok{color:#0E7A4F}
.cm-rep{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line,#E5E8EB)}
.cm-rep p{flex-basis:100%;margin:0;font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.55}
.cm-chip{font:inherit;font-size:13.5px;font-weight:700;min-height:44px;padding:0 12px;border-radius:999px;border:1px solid var(--line,#E5E8EB);background:#fff;color:var(--sub,#3E4754);cursor:pointer}
.cm-chip[aria-pressed="true"]{border-color:#C2410C;color:#C2410C;background:#FDECE4}
.cm-board{margin:12px 0 0;padding:12px 14px;border-radius:14px;background:var(--creamc,#FBF8EF);border:1px solid var(--creamb,#EFE6CC);font-size:14.5px;line-height:1.6}
.cm-board b{font-weight:800}
.cm-sub{margin:16px 0 4px;font-size:15px;font-weight:900;color:var(--text,#191F28)}
.cm-empty{margin:10px 0 0;padding:16px;border-radius:14px;border:1px dashed var(--line,#E5E8EB);text-align:center;color:var(--sub,#3E4754);font-size:15px;line-height:1.6}
.cm-file{display:block;width:100%;font:inherit;font-size:15px;margin:8px 0 0}
.cm-gate{margin-top:10px}`;
  function style() {
    if (typeof document === 'undefined' || document.getElementById('cmCss')) return;
    const s = document.createElement('style'); s.id = 'cmCss'; s.textContent = CSS; document.head.appendChild(s);
  }
  const stars = v => { const n = Math.round(Number(v) || 0); return `<span class="cm-stars" aria-hidden="true">${'★'.repeat(n)}<span class="cm-off">${'★'.repeat(5 - n)}</span></span>`; };
  const avgTxt = v => v == null ? '-' : (Math.round(v * 10) / 10).toFixed(1);

  function itemHtml(x, o) {
    o = o || {};
    const rs = x.r ? `<div class="cm-rs">${CATS.map(([k, l]) => x.r[k] ? `<span>${l} <b>${x.r[k]}</b></span>` : '').join('')}</div>` : '';
    return `<article class="cm-it" data-id="${esc(x.id)}">
      <div class="cm-hd">${o.near ? `<span class="cm-near">다른 건물</span><b>${esc(x.n || '')}</b> · ` : ''}<b>${esc(x.who)}</b>${x.v ? '<span class="cm-ok" title="운영자가 사는 사람인지 확인했어요">✓ 실거주 인증</span>' : ''}<span class="cm-dt">${esc(x.at)}</span>${x.mine ? '<button type="button" class="cm-lnk" data-cm-del>지우기</button>' : '<button type="button" class="cm-lnk" data-cm-rep aria-label="이 글 신고">신고</button>'}</div>
      <p class="cm-tx">${esc(x.x)}</p>${rs}
    </article>`;
  }
  function summaryHtml(d) {
    if (!d.n) return '';
    return `<div class="cm-sum">${CATS.map(([k, l]) => `<div class="cm-cat"><span class="cm-k">${l}</span><span class="cm-v">${stars(d.avg[k])}${avgTxt(d.avg[k])}</span></div>`).join('')}</div>
      <p class="cm-n">후기 ${d.n}개의 평균이에요(5점 만점). 살아 본 사람의 느낌이라 사람마다 다를 수 있어요.</p>`;
  }

  /* ---------- 한 건물 칸 그리기 ---------- */
  const STATE = new WeakMap();
  function mount(el, opt) {
    if (!el || !enabled()) return;
    style();
    const pid = el.getAttribute('data-cm-pid'), name = el.getAttribute('data-cm-name') || '';
    const full = !!(opt && opt.full) || el.hasAttribute('data-cm-full');
    el.setAttribute('data-cm-on', '1');
    STATE.set(el, { pid, name, full, d: null, open: '' });
    el.innerHTML = head(pid, full) + '<p class="cm-n">후기를 불러오고 있어요…</p>';
    load(el);
  }
  function head(pid, full) {
    const t = KIND[pid[0]] || '건물', live = pid[0] === 'c' ? '써 본' : '살아 본';
    return `<h2>살아보니${preview() && CFG.COMMUNITY_ENABLED !== true ? '<span class="cm-tag pv">운영자 미리 보기</span>' : ''}<small>이 ${t}에 ${live} 사람들이 남긴 짧은 후기예요. 가격 정보가 아니라 생활 이야기예요.</small></h2>`;
  }
  function load(el) {
    const st = STATE.get(el);
    return post({ action: 'cmPlace', pid: st.pid }).then(d => { st.d = d; paint(el); }).catch(e => {
      el.innerHTML = head(st.pid, st.full) + `<p class="cm-n">${esc(e.code === 'unknown' ? '살아보니는 준비 중이에요. 조금만 기다려 주세요.' : '후기를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.')}</p>`;
    });
  }
  function paint(el) {
    const st = STATE.get(el), d = st.d, t = KIND[st.pid[0]] || '건물';
    if (!d.open) { el.innerHTML = head(st.pid, st.full) + '<p class="cm-n">살아보니는 준비 중이에요.</p>'; return; }
    const list = st.full ? d.reviews : d.reviews.slice(0, 3), me = d.me || null;
    const near = d.near && d.near.length ? `<h3 class="cm-sub">같은 ${esc(st.pid.split('|')[2])} 다른 건물 후기<small style="font-weight:500;color:var(--sub2,#4E5968);font-size:13px"> · 이 ${t} 후기가 아니에요</small></h3><div class="cm-list">${d.near.map(x => itemHtml(x, { near: true })).join('')}</div>` : '';
    const board = d.board
      ? (st.full ? postsHtml(d) : `<div class="cm-board"><b>이야기 ${d.posts.length}개</b> — 후기가 모여 이 ${t} 사람들끼리 자유롭게 이야기하는 칸이 열렸어요. <a href="${esc(pageUrl(st.pid, st.name))}">이야기 보러 가기 →</a></div>`)
      : `<div class="cm-board">후기가 <b>${d.boardMin}개</b> 모이면 이 ${t} 사람들끼리 자유롭게 이야기하는 칸이 열려요. 지금 ${d.n}개예요.</div>`;
    const more = !st.full && d.reviews.length > list.length ? `<a class="cm-btn sub" href="${esc(pageUrl(st.pid, st.name))}">후기 ${d.n}개 모두 보기</a>` : '';
    const mine = me && me.review;
    const held = me && me.held && me.held.length ? `<p class="cm-msg">${me.held.some(h => h.st === '검토대기') ? '내 글 중 운영자 확인을 기다리는 글이 있어요. 확인되면 올라가요.' : ''}${me.held.some(h => h.st === '임시조치') ? ' 내 글 중 신고로 잠시 가려진 글이 있어요(운영자가 확인 중).' : ''}</p>` : '';
    el.innerHTML = head(st.pid, st.full) + summaryHtml(d)
      + (list.length ? `<div class="cm-list">${list.map(x => itemHtml(x)).join('')}</div>` : `<div class="cm-empty">아직 이 ${t} 후기가 없어요.<br>살아 보셨다면 첫 후기를 남겨 주세요.</div>`)
      + near + held
      + `<div class="cm-acts"><button type="button" class="cm-btn" data-cm-open="r">${mine ? '내 후기 고치기' : '후기 남기기'}</button>${more}${me && !me.v ? `<button type="button" class="cm-btn sub" data-cm-open="v"${me.vWait ? ' disabled' : ''}>${me.vWait ? '실거주 인증 확인 중' : '실거주 인증 받기'}</button>` : ''}</div>`
      + `<div data-cm-form></div>` + board;
    if (st.open) openForm(el, st.open);
    bind(el);
  }
  function postsHtml(d) {
    return `<h3 class="cm-sub">이야기 <small style="font-weight:500;color:var(--sub2,#4E5968);font-size:13px">· 이 건물 사람들끼리 자유롭게</small></h3>
      ${d.posts.length ? `<div class="cm-list">${d.posts.map(x => itemHtml(x)).join('')}</div>` : '<div class="cm-empty">아직 이야기가 없어요. 첫 이야기를 남겨 주세요.</div>'}
      <div class="cm-acts"><button type="button" class="cm-btn sub" data-cm-open="p">이야기 쓰기</button></div><div data-cm-pform></div>`;
  }
  function rulesHtml() {
    return `<details class="cm-rules"><summary>이런 글은 올라가지 않아요 (눌러서 보기)</summary><ul>
      <li>전화번호·인터넷 주소·이메일, 동·호수·이름·차 번호처럼 누군지 알 수 있는 내용</li>
      <li>광고, 중개 홍보, 상담·문의 유도</li>
      <li>욕설, 남을 깎아내리는 말, 특정 집이나 사람을 겨냥한 글</li>
      <li>"얼마 아래로는 팔지 말자"처럼 집값을 정하자는 글 — 집값 담합은 법으로 금지돼 있어요</li>
    </ul>신고가 쌓인 글은 바로 가리고 운영자가 확인해요. 자세한 내용은 <a href="${JB.SITE}terms/#community">이용약관</a>에 있어요.</details>`;
  }
  function needLogin(box, what) {
    if (loggedIn()) return false;
    box.innerHTML = loginOn() && root.JDJ_AUTH.gate
      ? `<div class="cm-gate">${root.JDJ_AUTH.gate(`${what}는 카카오 간편 로그인 뒤에 할 수 있어요. 닉네임은 보이지 않고 '이웃 3F2A' 같은 별명으로 보여요.`, '카카오 간편 로그인', 'community')}</div>`
      : '<p class="cm-msg">로그인 기능을 준비하고 있어요.</p>';
    return true;
  }
  function openForm(el, kind) {
    const st = STATE.get(el), d = st.d, box = el.querySelector(kind === 'p' ? '[data-cm-pform]' : '[data-cm-form]');
    if (!box) return;
    st.open = kind;
    if (needLogin(box, kind === 'v' ? '실거주 인증' : kind === 'p' ? '이야기 쓰기' : '후기 남기기')) return;
    if (kind === 'v') {
      box.innerHTML = `<div class="cm-form"><h3>실거주 인증 받기</h3>
        <p class="cm-n" style="margin:0">관리비 고지서나 임대차 계약서처럼 이 건물에 산다는 걸 알 수 있는 사진 한 장을 올려 주세요. 이름·동·호수는 가리고 찍어도 돼요.</p>
        <p class="cm-n">사진은 운영자만 보고, 확인이 끝나면(승인이든 거절이든) 바로 지워요. 남는 건 이 건물 글 옆의 '실거주 인증' 표시 하나예요. 14일 안에 확인하지 못하면 사진은 그냥 지워져요.</p>
        <label class="cm-n" for="cmFile" style="display:block;font-weight:700;color:var(--text,#191F28)">사진 고르기</label>
        <input id="cmFile" class="cm-file" type="file" accept="image/jpeg,image/png" data-cm-file>
        <div class="cm-acts"><button type="button" class="cm-btn" data-cm-send-v>사진 보내기</button><button type="button" class="cm-btn sub" data-cm-close>닫기</button></div>
        <p class="cm-msg" data-cm-msg aria-live="polite"></p></div>`;
      return;
    }
    if (kind === 'p') {
      box.innerHTML = `<div class="cm-form"><h3>이야기 쓰기</h3>
        <textarea class="cm-inp" rows="4" maxlength="${MAX_P}" data-cm-text placeholder="이 건물에 사는 사람들과 나누고 싶은 이야기를 적어 주세요."></textarea>
        <div class="cm-cnt"><span data-cm-cnt>0</span>/${MAX_P}</div>${rulesHtml()}
        <div class="cm-acts"><button type="button" class="cm-btn" data-cm-send-p>올리기</button><button type="button" class="cm-btn sub" data-cm-close>닫기</button></div>
        <p class="cm-msg" data-cm-msg aria-live="polite"></p></div>`;
      return;
    }
    const my = d.me && d.me.review, r = (my && my.r) || {};
    box.innerHTML = `<div class="cm-form"><h3>${my ? '내 후기 고치기' : '후기 남기기'}</h3>
      ${CATS.map(([k, l]) => `<div class="cm-rate"><span class="cm-rk" id="cmL_${k}">${l}</span><span class="cm-rst" role="radiogroup" aria-labelledby="cmL_${k}" data-cm-cat="${k}" data-v="${r[k] || ''}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${r[k] === n}" aria-label="${l} ${n}점" data-n="${n}" class="${r[k] >= n ? 'on' : ''}">★</button>`).join('')}</span></div>`).join('')}
      <label class="cm-n" for="cmOne" style="display:block;margin-top:10px;font-weight:700;color:var(--text,#191F28)">한 줄 후기</label>
      <input id="cmOne" class="cm-inp" style="margin-top:4px" type="text" maxlength="${MAX_R}" data-cm-text value="${esc(my ? my.x : '')}" placeholder="예: 역까지 걸어서 7분, 밤에는 조용한 편이에요" enterkeyhint="done">
      <div class="cm-cnt"><span data-cm-cnt>${my ? my.x.length : 0}</span>/${MAX_R}</div>${rulesHtml()}
      <div class="cm-acts"><button type="button" class="cm-btn" data-cm-send-r>${my ? '고친 후기 올리기' : '후기 올리기'}</button><button type="button" class="cm-btn sub" data-cm-close>닫기</button></div>
      <p class="cm-msg" data-cm-msg aria-live="polite"></p></div>`;
  }
  /* 안내는 [올리기] 바로 아래 칸에 — 실패는 role=alert, 화면 밖이면 그 자리로만 스크롤(assets/savefb.js 가 있을 때) */
  const SF = () => root.JDJ_SAVEFB || null;
  function msg(el, t, ok) { const m = el.querySelector('[data-cm-msg]'); if (m) { m.className = 'cm-msg ' + (ok ? 'ok' : 'err'); m.textContent = t; m.setAttribute('role', ok ? 'status' : 'alert'); if (SF()) SF().reveal(m); } }
  const busyB = (t, label) => { if (SF()) SF().busy(t, label); else t.disabled = true; };
  const freeB = t => { if (SF()) SF().restore(t); else t.disabled = false; };
  /** 사진 줄이기(긴 쪽 1600px, JPG) — 사진 속 위치 정보(EXIF)도 이때 빠져요 */
  function shrink(file) {
    return new Promise((ok, no) => {
      if (!file || !/^image\/(jpeg|png)$/.test(file.type)) return no(new Error('사진 파일(JPG·PNG)만 올릴 수 있어요.'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error('사진을 읽지 못했어요. 다른 사진을 골라 주세요.')); };
      img.src = url;
    });
  }
  function bind(el) {
    const st = STATE.get(el);
    el.onclick = e => {
      const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
      if (t.hasAttribute('data-cm-open')) { openForm(el, t.getAttribute('data-cm-open')); return; }
      if (t.hasAttribute('data-cm-close')) { st.open = ''; t.closest('[data-cm-form],[data-cm-pform]').innerHTML = ''; return; }
      if (t.parentElement && t.parentElement.hasAttribute('data-cm-cat')) {
        const g = t.parentElement, n = +t.dataset.n; g.dataset.v = n;
        g.querySelectorAll('button').forEach(b => { b.classList.toggle('on', +b.dataset.n <= n); b.setAttribute('aria-checked', +b.dataset.n === n); });
        return;
      }
      if (t.hasAttribute('data-cm-send-r') || t.hasAttribute('data-cm-send-p')) {
        const kind = t.hasAttribute('data-cm-send-p') ? 'p' : 'r', form = t.closest('.cm-form'), text = form.querySelector('[data-cm-text]').value.trim();
        const r = {}; let miss = '';
        if (kind === 'r') form.querySelectorAll('[data-cm-cat]').forEach(g => { const v = +g.dataset.v; if (v) r[g.dataset.cmCat] = v; else if (!miss) miss = CATS.find(c => c[0] === g.dataset.cmCat)[1]; });
        if (miss) return msg(form, `${miss} 별점을 골라 주세요.`);
        if (text.length < (kind === 'r' ? 4 : 10)) return msg(form, kind === 'r' ? '한 줄 후기를 4글자 이상 적어 주세요.' : '이야기를 10글자 이상 적어 주세요.');
        busyB(t, '올리는 중…');
        post({ action: 'cmWrite', pid: st.pid, name: st.name, kind, r: kind === 'r' ? r : null, text }).then(j => {
          const okT = j.held ? '받았어요. 운영자가 확인한 뒤 올라가요.' : '올렸어요. 고맙습니다!';
          st.open = ''; return load(el).then(() => { const m = el.querySelector('.cm-acts'); if (m) m.insertAdjacentHTML('beforebegin', `<p class="cm-msg ok" role="status">${okT}</p>`);
            if (SF()) { SF().reveal(m ? m.previousElementSibling : el); SF().toast('✓ ' + okT); } });
        }).catch(x => { freeB(t); msg(form, x.message); });
        return;
      }
      if (t.hasAttribute('data-cm-send-v')) {
        const form = t.closest('.cm-form'), f = form.querySelector('[data-cm-file]').files[0];
        if (!f) return msg(form, '사진을 먼저 골라 주세요.');
        busyB(t, '보내는 중…'); msg(form, '보내고 있어요…', true);
        shrink(f).then(img => post({ action: 'cmVerify', pid: st.pid, name: st.name, img })).then(() => { st.open = ''; return load(el); })
          .then(() => { if (SF()) SF().toast('✓ 사진을 보냈어요.'); })
          .catch(x => { freeB(t); msg(form, x.message); });
        return;
      }
      if (t.hasAttribute('data-cm-rep')) {
        const it = t.closest('.cm-it'); if (it.querySelector('.cm-rep')) return;
        if (!loggedIn()) { it.insertAdjacentHTML('beforeend', `<div class="cm-rep">${loginOn() && root.JDJ_AUTH.gate ? root.JDJ_AUTH.gate('신고는 카카오 간편 로그인 뒤에 할 수 있어요.', '카카오 간편 로그인', 'community_report') : '<p>로그인 기능을 준비하고 있어요.</p>'}</div>`); return; }
        it.insertAdjacentHTML('beforeend', `<div class="cm-rep" role="group" aria-label="신고 이유"><p>어떤 문제가 있나요? 신고가 쌓이면 바로 가리고 운영자가 확인해요.</p>${WHY.map(([k, l]) => `<button type="button" class="cm-chip" aria-pressed="false" data-why="${k}">${l}</button>`).join('')}<button type="button" class="cm-btn sub" style="min-height:38px" data-cm-rep-go disabled>신고하기</button></div>`);
        return;
      }
      if (t.hasAttribute('data-why')) { const g = t.parentElement; g.querySelectorAll('[data-why]').forEach(b => b.setAttribute('aria-pressed', b === t)); g.querySelector('[data-cm-rep-go]').disabled = false; return; }
      if (t.hasAttribute('data-cm-rep-go')) {
        const g = t.parentElement, w = g.querySelector('[data-why][aria-pressed="true"]'), id = t.closest('.cm-it').dataset.id; if (!w) return;
        t.disabled = true;
        post({ action: 'cmReport', id, why: w.dataset.why }).then(j => { g.innerHTML = `<p>${j.hidden ? '신고를 받았어요. 이 글은 운영자가 확인할 때까지 가려져요.' : j.again ? '이미 신고한 글이에요.' : '신고를 받았어요. 운영자가 확인할게요.'}</p>`; if (j.hidden) setTimeout(() => load(el), 1200); })
          .catch(x => { t.disabled = false; g.insertAdjacentHTML('beforeend', `<p style="color:#C2410C">${esc(x.message)}</p>`); });
        return;
      }
      if (t.hasAttribute('data-cm-del')) {
        if (!confirm('이 글을 지울까요? 지우면 되돌릴 수 없어요.')) return;
        post({ action: 'cmDelete', id: t.closest('.cm-it').dataset.id }).then(() => load(el)).catch(x => alert(x.message));
      }
    };
    el.oninput = e => { const t = e.target; if (t.hasAttribute && t.hasAttribute('data-cm-text')) { const c = t.closest('.cm-form').querySelector('[data-cm-cnt]'); if (c) c.textContent = t.value.length; } };
  }

  /* ---------- 페이지 연결 ---------- */
  function scan(rootEl) { (rootEl || document).querySelectorAll('[data-cm-pid]:not([data-cm-on])').forEach(el => mount(el)); }
  function reveal() { document.querySelectorAll('[data-cm-only]').forEach(el => { el.hidden = false; }); }
  if (typeof document !== 'undefined' && enabled()) {
    const go = () => {
      reveal(); scan();
      new MutationObserver(ms => { if (ms.some(m => m.addedNodes.length)) scan(); }).observe(document.body, { childList: true, subtree: true });
      if (root.JDJ_AUTH && root.JDJ_AUTH.onChange) root.JDJ_AUTH.onChange(() => document.querySelectorAll('[data-cm-on]').forEach(el => STATE.get(el) && load(el)));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  root.JDJ_CM = { enabled, preview, pidOf, slot, mount, pageUrl, post, adminToken, KIND, CATS, site, LS_PV, LS_AS, SS_PV };
})(typeof window !== 'undefined' ? window : this);
