/* 관심 목록 화면 부품 (JDJ_WATCH) — 계산은 assets/watch-core.js
   - 로그인 없이: 이 기기 localStorage 'jdj_watch' 에 저장(읽기·쓰기 모두 try/catch, 막혀 있으면 이번 화면에서만 기억).
   - 카카오 간편 로그인 중이면: 계정 저장 자료의 '관심 단지(favs)'와 맞춤(이 기기에서 처음 맞추거나 저장 못 한 변경이 있으면 합치고, 아니면 계정 목록을 따름).
     모닝 브리핑을 구독 중이면 관심 목록 단지 이름을 브리핑 ③ 내 관심 단지(brief.apts)에 더함(원래 있던 이름은 그대로, 우리가 넣은 이름만 뺄 때 함께 뺌).
     새 발송 채널은 없음 — 브리핑이 원래 보내는 ③ 칸을 쓴다.
   - [관심] 별 단추: JDJ_WATCH.star(p) HTML 을 아무 곳에 넣으면 눌렀을 때 넣기·빼기(문서 전체 클릭 위임). p = {sd, code, dong, jibun, apt, band}
   - 머리줄 배지: 관심 단지의 어제·오늘 새 거래 중 관심 목록 화면에서 아직 안 본 것 → '★ 새 소식 N' (없으면 안 보임). 자료 today/g/{구}.json */
(function (root) {
  'use strict';
  const C = root.JDJ_WATCH_CORE; if (!C || typeof document === 'undefined') return;
  const BASE = '/jangdaejang-calc/', DATA = '/jangdaejang-data/data/';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const AU = () => root.JDJ_AUTH && root.JDJ_AUTH.user && root.JDJ_AUTH.user() ? root.JDJ_AUTH : null;
  const stat = (n, p) => { try { if (root.jdjStat) root.jdjStat(n, p || {}); } catch (e) {} };
  let MEM = null;                                          // 저장이 막힌 브라우저용(이번 화면에서만)
  const subs = [];

  function list() { if (MEM) return MEM.slice(); return C.parse(ls.get(C.KEY)); }
  function save(l) { if (!ls.set(C.KEY, C.dump(l))) MEM = l.slice(); else MEM = null; subs.forEach(f => { try { f(l); } catch (e) {} }); paintStars(); badge(); }
  const has = p => C.has(list(), p);
  function onChange(f) { subs.push(f); }

  /* ---------- 계정 맞추기 ---------- */
  let syncP = null;
  function sync() {
    const A = AU(); if (!A) return Promise.resolve(list());
    if (syncP) return syncP;
    syncP = A.favs().then(server => {
      const local = list(), first = ls.get('jdj_watch_synced') !== '1' || ls.get('jdj_watch_dirty') === '1';
      const next = first ? C.merge(local, server) : C.merge(server, []);
      save(next); ls.set('jdj_watch_synced', '1');
      const same = JSON.stringify(next.map(C.idOf)) === JSON.stringify(C.merge(server, []).map(C.idOf));
      const done = () => { ls.set('jdj_watch_dirty', '0'); return briefSync().then(() => next, () => next); };
      return same ? done() : A.update(d => { d.favs = next; }).then(done, () => { ls.set('jdj_watch_dirty', '1'); return next; });
    }).catch(() => list());
    return syncP;
  }
  function push() {
    const A = AU(); if (!A) return Promise.resolve(false);
    ls.set('jdj_watch_dirty', '1');
    const l = list();
    return A.update(d => { d.favs = l; }).then(() => { ls.set('jdj_watch_dirty', '0'); return briefSync(); }).then(() => true, () => false);
  }
  /* 모닝 브리핑 구독 상태(한 화면에 한 번) → {sub, lim, brief} */
  let briefP = null;
  function briefState(force) {
    const A = AU(), api = root.JDJ_AGENTS && root.JDJ_AGENTS.api;
    if (!A || !api) return Promise.resolve(null);
    if (briefP && !force) return briefP;
    let s = ''; try { s = (JSON.parse(ls.get('jdj_auth') || 'null') || {}).s || ''; } catch (e) {}
    const B = root.JDJ_BRIEF;
    briefP = fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'briefMine', s }) })
      .then(r => r.json()).then(j => {
        if (!j || !j.ok) return null;
        const live = (j.subs || []).filter(x => x.active);
        const lim = live.reduce((m, x) => Math.max(m, +(x.apts || ((B && B.PRICE && B.PRICE[x.tier]) || {}).apts || 0)), 0);
        return { sub: live.length > 0, lim, brief: j.brief || { areas: [], apts: [] } };
      }).catch(() => null);
    return briefP;
  }
  function briefSync() {
    return briefState().then(st => {
      if (!st || !st.sub) return st;
      const A = AU(); if (!A) return st;
      let added = []; try { added = JSON.parse(ls.get('jdj_watch_bnames') || '[]'); } catch (e) {}
      const names = [...new Set(list().map(p => p.apt))];
      const removed = added.filter(a => !names.includes(a));
      const cur = st.brief.apts || [], next = C.briefApts(cur, names, added, removed);
      ls.set('jdj_watch_bnames', JSON.stringify(names.filter(a => !cur.includes(a) || added.includes(a))));
      if (JSON.stringify(next) === JSON.stringify(cur)) return st;
      return A.update(d => { d.brief = Object.assign({}, d.brief || {}, { apts: next }); }).then(() => { st.brief.apts = next; ls.set('jdj_brief_apts', JSON.stringify(next)); return st; }, () => st);
    });
  }

  /* ---------- 넣기·빼기 ---------- */
  function toggle(p) {
    const r = C.toggle(list(), p, today());
    if (r.full) { toast(`관심 목록은 ${C.MAX}곳까지예요. 하나를 빼고 다시 눌러 주세요.`); return Promise.resolve(r); }
    save(r.list);
    stat(r.added ? 'watch_add' : 'watch_remove');
    toast(r.added ? `관심 목록에 넣었어요. <a href="${BASE}my/watch/">관심 목록 보기 ›</a>` : '관심 목록에서 뺐어요.');
    return push().then(() => r);
  }
  const LB0 = '관심 목록에 넣기', LB1 = '관심 목록에 있어요';
  /** [관심] 별 단추 HTML. opt.small = 별만(줄 끝), opt.label = '관심 목록에 넣기' 글자까지(단지 화면) */
  function star(p, opt) {
    const c = C.clean(p); if (!c) return '';
    const on = has(c), small = opt && opt.small, lb = opt && opt.label;
    return `<button type="button" class="jw-star${small ? ' sm' : ''}${lb ? ' lb' : ''}${on ? ' on' : ''}" data-watch="${esc(JSON.stringify(c))}"${lb ? ' data-lb="1"' : ''} aria-pressed="${on}" aria-label="${esc(c.apt)} ${esc(c.band)} 관심 ${on ? '빼기' : '넣기'}">${on ? '★' : '☆'}<span>${lb ? (on ? LB1 : LB0) : '관심'}</span></button>`;
  }
  function paintStars() {
    const ids = {}; list().forEach(p => { ids[C.idOf(p)] = 1; });
    document.querySelectorAll('[data-watch]').forEach(b => {
      let p = null; try { p = JSON.parse(b.getAttribute('data-watch')); } catch (e) { return; }
      const on = !!ids[C.idOf(p)];
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', `${p.apt} ${p.band} 관심 ${on ? '빼기' : '넣기'}`);
      if (b.firstChild && b.firstChild.nodeType === 3) b.firstChild.nodeValue = on ? '★' : '☆';
      if (b.getAttribute('data-lb') && b.lastChild && b.lastChild.nodeType === 1) b.lastChild.textContent = on ? LB1 : LB0;
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-watch]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    let p = null; try { p = JSON.parse(b.getAttribute('data-watch')); } catch (er) { return; }
    toggle(p);
  });

  /* ---------- 알림 줄 ---------- */
  let toastT = 0;
  function toast(html) {
    let el = document.getElementById('jwToast');
    if (!el) { el = document.createElement('div'); el.id = 'jwToast'; el.className = 'jw-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.innerHTML = html; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4000);
  }

  /* ---------- 어제·오늘 새 거래(today/g) ---------- */
  const G = {};
  const gfile = code => G[code] || (G[code] = fetch(DATA + 'today/g/' + code + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null));
  function gfiles(l) {
    const codes = [...new Set((l || list()).map(p => p.code))];
    return Promise.all(codes.map(gfile)).then(a => { const o = {}; codes.forEach((c, i) => { o[c] = a[i]; }); return o; });
  }
  function seen() { try { const o = JSON.parse(ls.get(C.SEEN) || 'null'); return o && Array.isArray(o.s) ? o.s : []; } catch (e) { return []; } }
  function markSeen(gf) { ls.set(C.SEEN, JSON.stringify({ at: Date.now(), s: C.seenSigs(list(), gf) })); badge(); }
  /** {n 관심 단지 수, news 안 본 새 거래 수} */
  function summary() { const l = list(); if (!l.length) return Promise.resolve({ n: 0, news: 0 }); return gfiles(l).then(gf => ({ n: l.length, news: C.badge(l, gf, seen()), gf })); }
  function badge() {
    const top = document.querySelector('header.top'); if (!top || location.pathname.indexOf(BASE + 'my/watch/') === 0) return;
    summary().then(s => {
      let a = top.querySelector('.jw-chip');
      if (!s.news) { if (a) a.remove(); return; }
      if (!a) {
        a = document.createElement('a'); a.className = 'jw-chip'; a.href = BASE + 'my/watch/'; a.setAttribute('data-track', 'watch_chip');
        const brand = top.querySelector('.brand');
        if (brand && brand.nextSibling) top.insertBefore(a, brand.nextSibling); else top.appendChild(a);
      }
      a.innerHTML = `★ <span class="t">새 소식 </span><b>${s.news}</b>`;
      a.setAttribute('aria-label', `관심 단지 새 소식 ${s.news}건 — 관심 목록 보기`);
    });
  }

  const CSS = `.jw-star{display:inline-flex;align-items:center;justify-content:center;gap:3px;flex:none;font:inherit;font-size:14px;font-weight:800;min-height:44px;min-width:44px;padding:0 12px;border-radius:999px;border:1.5px solid #E5E8EB;background:#fff;color:#4E5968;cursor:pointer;line-height:1;white-space:nowrap}
.jw-star span{font-size:13.5px}.jw-star.on{border-color:#B8942A;color:#8A6A12;background:#FBF8EF}.jw-star:hover{border-color:#B8942A}
.jw-star.lb{margin-top:10px;font-size:15px;padding:0 16px}.jw-star.lb span{font-size:15px}
.jw-star.sm{min-height:40px;min-width:40px;padding:0 8px;font-size:17px}.jw-star.sm span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.jw-chip{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 11px;border-radius:999px;background:#FBF8EF;border:1px solid #EFE6CC;color:#8A6A12;font-size:13.5px;font-weight:800;text-decoration:none;white-space:nowrap;margin-left:auto}
.jw-chip b{color:#C2410C}
.jw-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(78px + env(safe-area-inset-bottom));z-index:80;max-width:min(92vw,440px);background:#191F28;color:#fff;border-radius:12px;padding:12px 16px;font-size:14.5px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.2)}
.jw-toast a{color:#9CC0FF;font-weight:700;margin-left:6px;white-space:nowrap}
@media(max-width:400px){.jw-chip{padding:0 9px;font-size:13px}.jw-chip .t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}`;
  function style() { if (document.getElementById('jwCss')) return; const s = document.createElement('style'); s.id = 'jwCss'; s.textContent = CSS; document.head.appendChild(s); }

  function ready() {
    style(); paintStars(); badge();
    if (AU()) sync();
    if (root.JDJ_AUTH && root.JDJ_AUTH.onChange) root.JDJ_AUTH.onChange(u => { syncP = null; briefP = null; if (u) sync(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  addEventListener('storage', e => { if (e.key === C.KEY) { paintStars(); badge(); } });

  root.JDJ_WATCH = { list, has, toggle, star, paintStars, onChange, sync, briefState, briefSync, gfile, gfiles, seen, markSeen, summary, badge, toast, today };
})(typeof window !== 'undefined' ? window : this);
