/* 관심 목록 화면 부품 (JDJ_WATCH) — 계산은 assets/watch-core.js
   - 로그인 없이: 이 기기 localStorage 'jdj_watch' 에 저장(읽기·쓰기 모두 try/catch, 막혀 있으면 이번 화면에서만 기억).
   - 카카오 간편 로그인 중이면: 누를 때마다 계정 저장 자료의 '관심 단지(favs)'에 바로 저장(계정 목록 + 이 기기에서 한 넣기·빼기만 적용 — 다른 기기에서 뺀 단지는 되살리지 않음).
     모닝 브리핑을 구독 중이면 관심 목록 단지 이름을 브리핑 ③ 내 관심 단지(brief.apts)에 더함(원래 있던 이름은 그대로, 우리가 넣은 이름만 뺄 때 함께 뺌).
     새 발송 채널은 없음 — 브리핑이 원래 보내는 ③ 칸을 쓴다.
   - [관심] 별 단추: JDJ_WATCH.star(p) HTML 을 아무 곳에 넣으면 눌렀을 때 넣기·빼기(문서 전체 클릭 위임). p = {sd, code, dong, jibun, apt, band}
   - 머리줄 배지: 관심 단지의 어제·오늘 새 거래 중 관심 목록 화면에서 아직 안 본 것 → '★ 새 소식 N' (없으면 안 보임). 자료 today/g/{구}.json
   - 알림 종(assets/alerts-core.js 가 함께 실린 화면): 관심 단지 새 실거래·신고가·급매·큰 하락·전세가율 변화 + 청약 맞춤 알림 중 알림 센터(my/alerts/)에서
     아직 안 본 수. 알림 설정·본 기록·최근 알림 기록은 이 기기 localStorage(jdj_alert_prefs·jdj_alert_seen·jdj_alert_log). 메일은 로그인 뒤 알림 센터에서 신청. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const C = root.JDJ_WATCH_CORE; if (!C || typeof document === 'undefined') return;
  const BASE = JB.SITE, DATA = JB.DATA + 'data/';
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

  /* ---------- 계정 맞추기 ----------
     이 기기에서 한 일(넣기·빼기)을 할 일 목록(jdj_watch_ops)에 남기고, 로그인 중이면 바로 계정에 저장한다.
     저장할 때는 '지금 계정 목록 + 이 기기의 할 일'만 적용 → 다른 기기에서 뺀 단지가 되살아나지 않음.
     로그인 부품(auth.js)이 없는 화면(순위 등)도 이 기기에 남은 로그인 토큰으로 바로 저장한다. */
  const ops = () => C.parseOps(ls.get(C.OPS));
  const setOps = o => ls.set(C.OPS, JSON.stringify(o));
  const tok = () => { try { const j = JSON.parse(ls.get('jdj_auth') || 'null'); if (!j || !/^[0-9a-f]{64}$/.test(String(j.s || ''))) return ''; if (j.exp && j.exp < today()) return ''; return j.s; } catch (e) { return ''; } };
  const apiUrl = () => (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || ((root.JDJ_SITE || {}).API) || '';
  function post(body) {
    return fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(r => r.json()).then(j => { if (!j || !j.ok) throw new Error((j && j.err) || 'save'); return j; });
  }
  /** 계정 창구: {load() → 저장 자료, update(fn)} — 로그인 부품이 있으면 그것, 없으면 토큰으로 직접. 로그인 안 했으면 null */
  function acct() {
    if (root.JDJ_AUTH) { const A = AU(); return A ? { load: () => A.load(true).then(st => (st && st.data) || {}), update: fn => A.update(fn) } : null; }
    const s = tok(); if (!s || !apiUrl()) return null;
    const load = () => post({ action: 'userLoad', s }).then(j => j.data || {});
    return { load, update: fn => load().then(d => { d = JSON.parse(JSON.stringify(d)); fn(d); return post({ action: 'userSave', s, data: d }); }) };
  }
  /** 할 일을 계정에 적용·저장하고 이 기기 목록을 계정 목록으로 맞춤 */
  function flush() {
    const K = acct(); if (!K) return Promise.resolve(null);
    return K.load().then(d => {
      const server = (d.favs || []).map(C.clean).filter(Boolean), mine = ops();
      const todo = ls.get('jdj_watch_synced') === '1' ? mine : C.legacyOps(list(), server).concat(mine);
      const next = C.applyOps(server, todo), sent = new Set(mine.map(o => C.idOf(o.p) + '#' + o.at));
      const done = () => { setOps(ops().filter(o => !sent.has(C.idOf(o.p) + '#' + o.at)));   // 저장하는 동안 새로 누른 것은 남김
        ls.set('jdj_watch_synced', '1'); save(C.applyOps(next, ops())); return briefSync().then(() => next, () => next); };
      if (JSON.stringify(next.map(C.idOf)) === JSON.stringify(server.map(C.idOf))) return done();
      return K.update(x => { x.favs = C.applyOps(x.favs || [], todo); }).then(done);
    }).catch(() => null);
  }
  let syncP = null;
  function sync() { if (!acct()) return Promise.resolve(list()); if (!syncP) syncP = flush().then(() => list()); return syncP; }
  const push = () => flush();
  /* 모닝 브리핑 구독 상태(한 화면에 한 번) → {sub, lim, brief} */
  let briefP = null;
  function briefState(force) {
    const api = apiUrl(), s = acct() ? tok() : '';
    if (!s || !api) return Promise.resolve(null);
    if (briefP && !force) return briefP;
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
      const K = acct(); if (!K) return st;
      let added = []; try { added = JSON.parse(ls.get('jdj_watch_bnames') || '[]'); } catch (e) {}
      const names = [...new Set(list().map(p => p.apt))];
      const removed = added.filter(a => !names.includes(a));
      const cur = st.brief.apts || [], next = C.briefApts(cur, names, added, removed);
      ls.set('jdj_watch_bnames', JSON.stringify(names.filter(a => !cur.includes(a) || added.includes(a))));
      if (JSON.stringify(next) === JSON.stringify(cur)) return st;
      return K.update(d => { d.brief = Object.assign({}, d.brief || {}, { apts: next }); }).then(() => { st.brief.apts = next; ls.set('jdj_brief_apts', JSON.stringify(next)); return st; }, () => st);
    });
  }

  /* ---------- 넣기·빼기 ---------- */
  function toggle(p) {
    const r = C.toggle(list(), p, today());
    if (r.full) { toast(`관심 목록은 ${C.MAX}곳까지예요. 하나를 빼고 다시 눌러 주세요.`); return Promise.resolve(r); }
    save(r.list);
    setOps(C.addOp(ops(), r.added ? 'add' : 'del', p, Date.now()));
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
    const top = document.querySelector('header.top'); if (!top) return;
    if (AC) { const old = top.querySelector('.jw-chip'); if (old) old.remove(); bell(top); return; }   // 알림 종이 '새 소식' 칸을 대신함
    if (location.pathname.indexOf(BASE + 'my/watch/') === 0) return;
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

  /* ---------- 알림(종 배지·알림 센터 공용) ---------- */
  const AC = root.JDJ_ALERTS_CORE || null, AP = 'jdj_alert_prefs', AS = 'jdj_alert_seen', AL = 'jdj_alert_log', LOG_MAX = 150, LOG_DAYS = 30;
  function aprefs() { let x = null; try { x = JSON.parse(ls.get(AP) || 'null'); } catch (e) {} return AC ? AC.cleanPrefs(x) : null; }
  function setAprefs(p) { if (!AC) return null; const c = AC.cleanPrefs(p); ls.set(AP, JSON.stringify(c)); badge(); return c; }
  function aseen() { const o = {}; try { (JSON.parse(ls.get(AS) || '[]') || []).forEach(id => { o[id] = 1; }); } catch (e) {} return o; }
  /** 본 알림으로 남김(ids = 알림 id 목록 또는 묶음 D) */
  function markAlertsSeen(ids) { ids = Array.isArray(ids) ? ids : ((ids && ids.ids) || []); const cur = Object.keys(aseen()), add = ids.filter(id => cur.indexOf(id) < 0); ls.set(AS, JSON.stringify(cur.concat(add).slice(-1000))); }
  function alog() { try { const a = JSON.parse(ls.get(AL) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  /** 지금 알림을 이 기기 기록에 더함(처음 본 시각) — 알림 센터의 '최근 알림' */
  function logAdd(D) {
    const cur = alog(), have = {}, now = Date.now(), lo = now - LOG_DAYS * 864e5;
    cur.forEach(x => { have[x.id] = 1; });
    const add = [];
    D.groups.forEach(g => g.ev.forEach(e => { if (!have[e.id]) add.push({ id: e.id, k: e.k, t: e.t, s: e.s, tags: e.tags || [], pid: g.pid, p: g.p, at: now }); }));
    D.cy.forEach(e => { if (!have[e.id]) add.push({ id: e.id, k: e.k, t: e.t, s: e.s, u: e.u || '', no: e.no, at: now }); });
    if (!add.length && cur.every(x => x.at >= lo)) return cur;
    const next = add.concat(cur).filter(x => x && x.at >= lo).slice(0, LOG_MAX);
    ls.set(AL, JSON.stringify(next));
    return next;
  }
  /** 기록 속 알림을 지금 설정으로 보여 줄지: 관심 목록에서 뺀 단지·끈 단지·끈 종류·끈 청약은 숨김 */
  function shown(x, P, l) {
    if (!x) return false;
    if (AC.CY_KINDS[x.k]) return P.cy.on && P.cy.kinds[x.k] !== false;
    return !!AC.KINDS[x.k] && P.kinds[x.k] !== false && P.mute.indexOf(x.pid) < 0 && (l || list()).some(p => C.idOf(p) === x.pid);
  }
  const BF = {};
  const bfile = code => BF[code] || (BF[code] = fetch(DATA + 'brief/' + code + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null));
  let NP = null;
  const notices = () => NP || (NP = fetch(DATA + 'chungyak/notices.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => (j && j.rows) || []).catch(() => []));
  /** 지금 알림: {D 묶음(끈 단지·끈 종류 뺌), unread 안 본 수, P 설정, any 알림 받을 것이 있는지, log 최근 알림 기록} */
  function alertsNow() {
    if (!AC) return Promise.resolve(null);
    const l = list(), P = aprefs();
    if (!l.length && !P.cy.on) return Promise.resolve({ D: { groups: [], cy: [], n: 0, ids: [] }, unread: 0, P, any: false, log: alog() });
    const codes = [...new Set(l.map(p => p.code))];
    return Promise.all([gfiles(l), Promise.all(codes.map(bfile)), P.cy.on ? notices() : Promise.resolve([])]).then(([gf, bs, N]) => {
      const sx = {}; codes.forEach((c, i) => { sx[c] = bs[i]; });
      const D = AC.digest({ places: l, g: gf, s: sx, notices: N, prefs: P, today: today() });
      const log = logAdd(D).filter(x => shown(x, P, l)), seen = aseen();
      return { D, unread: log.filter(x => !seen[x.id]).length, P, any: true, log, gf };
    });
  }
  const BELL = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22zm7.2-6V11a7.2 7.2 0 0 0-5.4-7V3.3a1.8 1.8 0 1 0-3.6 0V4A7.2 7.2 0 0 0 4.8 11v5L3 17.8v.9h18v-.9z"/></svg>';
  function bell(top) {
    if (location.pathname.indexOf(BASE + 'my/alerts/') === 0) return;
    alertsNow().then(r => {
      let a = top.querySelector('.jw-bell');
      if (!r || !r.any) { if (a) a.remove(); return; }
      if (!a) {
        a = document.createElement('a'); a.className = 'jw-bell'; a.href = BASE + 'my/alerts/'; a.setAttribute('data-track', 'alert_bell');
        const brand = top.querySelector('.brand');
        if (brand && brand.nextSibling) top.insertBefore(a, brand.nextSibling); else top.appendChild(a);
      }
      a.innerHTML = BELL + (r.unread ? `<b>${r.unread > 99 ? '99+' : r.unread}</b>` : '');
      a.setAttribute('aria-label', r.unread ? `새 알림 ${r.unread}건 — 알림 센터 열기` : '알림 센터 열기');
    });
  }

  const CSS = `.jw-star{display:inline-flex;align-items:center;justify-content:center;gap:3px;flex:none;font:inherit;font-size:14px;font-weight:800;min-height:44px;min-width:44px;padding:0 12px;border-radius:999px;border:1.5px solid #E5E8EB;background:#fff;color:#4E5968;cursor:pointer;line-height:1;white-space:nowrap}
.jw-star span{font-size:13.5px}.jw-star.on{border-color:#B8942A;color:#8A6A12;background:#FBF8EF}.jw-star:hover{border-color:#B8942A}
.jw-star.lb{margin-top:10px;font-size:15px;padding:0 16px}.jw-star.lb span{font-size:15px}
.jw-star.sm{min-height:40px;min-width:40px;padding:0 8px;font-size:17px}.jw-star.sm span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.jw-chip{display:inline-flex;align-items:center;gap:4px;min-height:36px;padding:0 11px;border-radius:999px;background:#FBF8EF;border:1px solid #EFE6CC;color:#8A6A12;font-size:13.5px;font-weight:800;text-decoration:none;white-space:nowrap;margin-left:auto}
.jw-chip b{color:#C2410C}
.jw-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border-radius:999px;color:#4E5968;text-decoration:none;margin-left:auto}
.jw-bell:hover{background:#F2F4F6}.jw-bell b{position:absolute;top:3px;right:1px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#C2410C;color:#fff;font-size:11.5px;font-weight:800;line-height:19px;text-align:center;box-shadow:0 0 0 2px #fff}
.jw-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(78px + env(safe-area-inset-bottom));z-index:80;max-width:min(92vw,440px);background:#191F28;color:#fff;border-radius:12px;padding:12px 16px;font-size:14.5px;line-height:1.5;box-shadow:0 6px 20px rgba(0,0,0,.2)}
body.has-sheet .jw-toast{bottom:auto;top:72px}   /* 지도 카드가 열려 있으면 카드 단추를 가리지 않게 위로 */
.jw-toast a{color:#9CC0FF;font-weight:700;margin-left:6px;white-space:nowrap}
@media(max-width:400px){.jw-chip{padding:0 9px;font-size:13px}.jw-chip .t{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}`;
  function style() { if (document.getElementById('jwCss')) return; const s = document.createElement('style'); s.id = 'jwCss'; s.textContent = CSS; document.head.appendChild(s); }

  function ready() {
    style(); paintStars(); badge();
    if (acct()) sync();
    if (root.JDJ_AUTH && root.JDJ_AUTH.onChange) root.JDJ_AUTH.onChange(u => { syncP = null; briefP = null; if (u) sync(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  addEventListener('storage', e => { if (e.key === C.KEY) { paintStars(); badge(); } });

  root.JDJ_WATCH = { list, has, toggle, star, paintStars, onChange, sync, briefState, briefSync, gfile, gfiles, seen, markSeen, summary, badge, toast, today,
    aprefs, setAprefs, aseen, markAlertsSeen, alog, alertsNow, shown, notices, apiUrl, tok };
})(typeof window !== 'undefined' ? window : this);
