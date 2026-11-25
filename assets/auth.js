/* 집예보 카카오 로그인 — 공용 (JDJ_AUTH)
   - assets/config.js 의 KAKAO_JS_KEY 가 비어 있으면 on() = false: 로그인 버튼·잠금이 하나도 나오지 않고 모든 기능이 로그인 없이 그대로.
   - 로그인: Kakao.Auth.authorize → login/ 에 인가 코드 도착 → 서버(agent-backend.gs kakaoLogin)가 카카오 /v2/user/me 로 확인
     → 서버가 만든 세션 토큰만 이 기기 localStorage 'jdj_auth' 에 보관(카카오 토큰은 화면·서버 어디에도 남기지 않음).
   - 서버에 저장하는 것: 내 집·관심 단지·저장한 리포트(소득·현금 같은 금액 조건은 빼고)·알림 신청. 카카오에서 받는 정보는 회원번호·닉네임뿐.
   - 서버 주소는 assets/agents.js 의 Apps Script 웹 앱 주소(JDJ_AGENTS.api)를 그대로 쓴다. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const CFG = root.JDJ_SITE || {};
  const KEY = String(CFG.KAKAO_JS_KEY || '').trim();
  const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.5/kakao.min.js';
  const SRI = 'sha384-v6JKY3z4FUkWq21oZDHZe74YvuPk/WUrVLrDHTBojHXClOSa3iXy7sCXPY1jkFbj';
  /* 카카오 로그인 돌아올 주소: 지금 열린 사이트 주소 기준(예전 주소·새 도메인 모두). 카카오 개발자 콘솔 [Redirect URI]와 서버 KAKAO_REDIRECTS 에 둘 다 등록 */
  const REDIRECT = (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) ? location.origin : 'https://chrisjangdaejang-ux.github.io') + JB.SITE + 'login/';
  const LOGIN_PAGE = JB.SITE + 'login/';
  const LS = 'jdj_auth', DIRTY = 'jdj_auth_dirty', BACK = 'jdj_auth_back', STATE = 'jdj_auth_state', FIRST = 'jdj_auth_first';
  const HOME_KEY = 'jdj_myhome';
  const AR_SENT = 'jdj_myhome_ar';             // 고른 전용면적을 계정에 올린 기록 {sig, ok(서버가 받아 둠), d(날짜)}
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const api = () => (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || CFG.API || '';
  const track = (n, p) => { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(n, p || {}); } catch (e) {} };
  const subs = [];
  let dataP = null, chain = Promise.resolve();

  function on() { return !!KEY && !!api(); }
  function sess() {
    let j = null; try { j = JSON.parse(ls.get(LS) || 'null'); } catch (e) {}
    if (!j || !/^[0-9a-f]{64}$/.test(String(j.s || ''))) return null;
    if (j.exp && j.exp < new Date().toISOString().slice(0, 10)) { ls.del(LS); return null; }
    return j;
  }
  function user() { if (!on()) return null; const j = sess(); return j ? { nick: j.nick || '카카오 회원' } : null; }
  function emit() { dataP = null; subs.forEach(f => { try { f(user()); } catch (e) {} }); paintChip(); }
  function onChange(f) { subs.push(f); }

  function post(body) {
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(r => r.json()).then(j => {
        if (j && j.code === 'auth') { ls.del(LS); emit(); }
        if (!j || !j.ok) { const t = (j && j.err) || ''; const er = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.'); er.raw = t; er.code = (j && j.code) || ''; throw er; }
        return j;
      });
  }
  const call = (action, body) => { const j = sess(); if (!j) return Promise.reject(new Error('로그인이 필요해요.')); return post(Object.assign({ action, s: j.s }, body || {})); };

  /* ---------- 로그인·로그아웃 ---------- */
  let sdkP = null;
  function loadSdk() {
    if (root.Kakao) return Promise.resolve(root.Kakao);
    if (sdkP) return sdkP;
    sdkP = new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = SDK; s.integrity = SRI; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = () => root.Kakao ? ok(root.Kakao) : no(new Error('sdk'));
      s.onerror = () => { sdkP = null; no(new Error('sdk')); };
      document.head.appendChild(s);
    });
    return sdkP;
  }
  function redirectUri() {
    const h = location.hostname;
    return (h === 'localhost' || h === '127.0.0.1') ? location.origin + LOGIN_PAGE : REDIRECT;   // 로컬 확인용(콘솔에 등록했을 때만 동작)
  }
  function login(from) {
    if (!on()) return Promise.resolve(false);
    const back = location.pathname.indexOf(LOGIN_PAGE) === 0 ? (ss.get(BACK) || JB.SITE) : location.pathname + location.search + location.hash;
    ss.set(BACK, back);
    const st = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => ('0' + b.toString(16)).slice(-2)).join('');
    ss.set(STATE, st);
    track('login_start', { from: from || '' });
    return loadSdk().then(K => {
      if (!K.isInitialized()) K.init(KEY);
      K.Auth.authorize({ redirectUri: redirectUri(), state: st, scope: 'profile_nickname' });
      return true;
    }).catch(() => { alert('카카오 간편 로그인 창을 열지 못했어요. 잠시 뒤 다시 눌러 주세요.'); return false; });
  }
  /** login/ 화면: 인가 코드로 로그인 마치기 → 돌아갈 주소 */
  function finish(code, state) {
    const want = ss.get(STATE); ss.del(STATE);
    if (!want || want !== state) return Promise.reject(new Error('로그인 요청이 이 화면에서 시작되지 않았어요. 다시 로그인해 주세요.'));
    return post({ action: 'kakaoLogin', code, redirectUri: redirectUri() }).then(j => {
      ls.set(LS, JSON.stringify({ s: j.s, nick: j.nick, exp: j.exp || '' }));
      ss.set(FIRST, '1');
      track(j.isNew ? 'sign_up' : 'login', { method: 'kakao' });
      emit();
      const back = ss.get(BACK) || JB.SITE; ss.del(BACK);
      return { nick: j.nick, isNew: j.isNew, back: back.indexOf(JB.SITE) === 0 && back.indexOf('//') !== 0 ? back : JB.SITE };
    });
  }
  function logout() {
    const j = sess();
    const p = j ? post({ action: 'userLogout', s: j.s }).catch(() => {}) : Promise.resolve();
    return p.then(() => { ls.del(LS); ls.del(DIRTY); emit(); track('logout'); });
  }
  function withdraw() {
    return call('userDelete').then(r => { ls.del(LS); ls.del(DIRTY); emit(); track('withdraw'); return r; });
  }

  /* ---------- 저장 자료 ---------- */
  function load(force) {
    if (!user()) return Promise.resolve(null);
    if (!dataP || force) dataP = call('userLoad').then(j => {
      const s0 = sess(); if (s0 && j.nick && j.nick !== s0.nick) { s0.nick = j.nick; ls.set(LS, JSON.stringify(s0)); paintChip(); }
      return { nick: j.nick, data: j.data || { homes: [], favs: [], reports: [] }, alerts: j.alerts || [] };
    }).catch(e => { dataP = null; throw e; });
    return dataP;
  }
  /** fn(data) 로 고친 뒤 서버에 저장 (요청은 차례대로) */
  function update(fn) {
    const run = () => load().then(st => {
      if (!st) throw new Error('로그인이 필요해요.');
      const d = JSON.parse(JSON.stringify(st.data)); fn(d);
      return call('userSave', { data: d }).then(r => { st.data = r.data; return st; });
    });
    const p = chain.then(run, run); chain = p.catch(() => {}); return p;
  }
  const M = () => root.JDJ_MINE;
  const localHomes = () => { const m = M(); return m ? m.parseStore(ls.get(HOME_KEY)) : []; };
  const placeId = h => [h.code, h.dong, h.jibun, h.apt, h.band].join('|');
  /** 로그인 중이면 내 집 목록 맞추기: 처음 로그인한 기기·저장 못 한 변경이 있으면 합치고, 아니면 계정에 저장된 목록을 따름. 맞춘 목록을 돌려줌 */
  /* 공유받은 조건으로 보는 중(assets/share.js)이면 내 계정의 내 집 목록과 섞지 않음 */
  const sharedView = () => !!(root.JDJ_SHARE && root.JDJ_SHARE.viewing && root.JDJ_SHARE.viewing());
  function syncHomes() {
    if (!user() || !M() || sharedView()) return Promise.resolve(null);
    return load().then(st => {
      const m = M(), local = localHomes(), server = m.parseStore(m.dumpStore(st.data.homes || []));
      const merge = ss.get(FIRST) === '1' || ls.get(DIRTY) === '1';
      let list = server;
      if (merge) { list = local.slice(); server.forEach(h => { if (list.length < m.MAX_HOMES && !list.some(x => m.homeId(x) === m.homeId(h))) list.push(h); }); }
      /* 고른 전용면적(ar): 서버가 아직 이 칸을 저장하지 않으면(재배포 전) 계정 목록에 없음 → 이 기기 값을 지키고, 그것만으로는 다시 올리지 않음 */
      const srvAr = server.some(h => h.ar != null);
      list = list.map(h => { if (h.ar != null) return h; const l = local.find(x => m.homeId(x) === m.homeId(h)); return l && l.ar != null ? Object.assign({}, h, { ar: l.ar }) : h; });
      const cmp = a => JSON.stringify(srvAr ? a : a.map(h => { const o = Object.assign({}, h); delete o.ar; return o; }));
      ss.del(FIRST);
      ls.set(HOME_KEY, m.dumpStore(list));
      /* 고른 전용면적이 계정에 아직 없으면 올림 — 서버가 그 칸을 버리면(재배포 전) 하루 한 번만 다시 시도 */
      const sig = JSON.stringify(list.filter(h => h.ar != null).map(h => [m.homeId(h), h.ar])), day = new Date().toISOString().slice(0, 10);
      let rec = {}; try { rec = JSON.parse(ls.get(AR_SENT) || '{}') || {}; } catch (e) { rec = {}; }
      const srvSig = JSON.stringify(server.filter(h => h.ar != null).map(h => [m.homeId(h), h.ar]));
      const arPush = sig !== '[]' && sig !== srvSig && (rec.sig !== sig || (!rec.ok && rec.d !== day));
      if (cmp(list) !== cmp(server) || arPush) return update(d => { d.homes = list; }).then(st2 => {
        ls.del(DIRTY);
        const back = st2 && st2.data && Array.isArray(st2.data.homes) ? st2.data.homes : [];
        if (sig !== '[]') ls.set(AR_SENT, JSON.stringify({ sig, ok: back.some(h => h && h.ar != null), d: day }));
        return list;
      }).catch(() => { ls.set(DIRTY, '1'); return list; });
      ls.del(DIRTY);
      return list;
    }).catch(() => null);
  }
  /** 이 기기 내 집 목록이 바뀐 뒤 부르기: 로그인 중이면 계정에도 저장 */
  function pushHomes() {
    if (!user() || !M() || sharedView()) return Promise.resolve(false);
    ls.set(DIRTY, '1');
    const list = localHomes();
    return update(d => { d.homes = list; }).then(() => { ls.del(DIRTY); return true; }).catch(() => false);
  }
  function favs() { return load().then(st => st ? (st.data.favs || []) : []).catch(() => []); }
  function isFav(list, p) { return (list || []).some(x => placeId(x) === placeId(p)); }
  function toggleFav(p) {
    let added = false;
    return update(d => {
      d.favs = d.favs || [];
      if (isFav(d.favs, p)) d.favs = d.favs.filter(x => placeId(x) !== placeId(p));
      else { d.favs.unshift({ sd: p.sd, code: p.code, dong: p.dong, jibun: p.jibun || '', apt: p.apt, band: p.band, t: new Date().toISOString().slice(0, 10) }); d.favs = d.favs.slice(0, 30); added = true; }
    }).then(st => { track(added ? 'fav_add' : 'fav_remove'); return { added, favs: st.data.favs }; });
  }
  function saveReport(rep) {
    return update(d => {
      d.reports = (d.reports || []).filter(r => r.id !== rep.id);
      d.reports.unshift(rep); d.reports = d.reports.slice(0, 10);
    }).then(st => { track('report_save_account'); return st.data.reports; });
  }
  function removeReport(id) { return update(d => { d.reports = (d.reports || []).filter(r => r.id !== id); }).then(st => st.data.reports); }
  function removeFav(p) { return update(d => { d.favs = (d.favs || []).filter(x => placeId(x) !== placeId(p)); }).then(st => st.data.favs); }
  function alerts() { return load().then(st => st ? st.alerts : []).catch(() => []); }
  function subscribe(items) {
    return call('alertSubscribe', { op: 'add', items }).then(j => { if (dataP) dataP.then(st => { if (st) st.alerts = j.alerts; }); track('alert_subscribe', { n: j.added }); return j; });
  }
  function unsubscribe(ids) {
    return call('alertSubscribe', { op: 'remove', ids }).then(j => { if (dataP) dataP.then(st => { if (st) st.alerts = j.alerts; }); return j.alerts; });
  }

  /* ---------- 화면 조각 ---------- */
  const KICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#000" d="M12 3.6c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-1 3.7c-.1.3.3.6.6.4l4.4-2.9h.8c5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  /** 카카오 로그인 단추 HTML (on() 이 아니면 빈 문자열) */
  function btn(label, from, cls) {
    if (!on()) return '';
    return `<button type="button" class="jdj-kbtn${cls ? ' ' + cls : ''}" data-jdj-login="${esc(from || '')}">${KICON}<span>${esc(label || '카카오 간편 로그인')}</span></button>`;
  }
  /** 잠금 안내 상자: 설명 한 줄 + 카카오 단추 */
  function gate(text, label, from) {
    if (!on()) return '';
    return `<div class="jdj-gate"><p>${text}</p>${btn(label, from)}</div>`;
  }
  const CSS = `.jdj-kbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:15px;font-weight:700;min-height:48px;padding:0 18px;border:0;border-radius:12px;background:#FEE500;color:rgba(0,0,0,.85);cursor:pointer;text-decoration:none}
.jdj-kbtn:hover{filter:brightness(.97)}.jdj-kbtn:focus-visible{outline:3px solid #2560E8;outline-offset:2px}
.jdj-kbtn.full{width:100%}
.jdj-gate{margin-top:10px;border:1px solid #E5E8EB;border-radius:14px;padding:14px;background:#FAFBFC;text-align:center}
.jdj-gate p{margin:0 0 10px;font-size:14.5px;color:#3E4754;line-height:1.55;word-break:keep-all}
.jdj-gate .jdj-kbtn{width:100%;max-width:360px}
.jdj-right{display:flex;align-items:center;gap:8px}
.jdj-acct{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 12px;border-radius:999px;font-size:13.5px;font-weight:700;text-decoration:none;white-space:nowrap;border:1px solid #E5E8EB;color:#3E4754;background:#fff;max-width:132px;overflow:hidden;text-overflow:ellipsis}
.jdj-acct.out{background:#FEE500;border-color:#FEE500;color:rgba(0,0,0,.85);max-width:none;padding:0 10px;font-size:13px}
@media(max-width:400px){.jdj-right .badge{display:none}}`;
  function style() {
    if (document.getElementById('jdjAuthCss')) return;
    const s = document.createElement('style'); s.id = 'jdjAuthCss'; s.textContent = CSS; document.head.appendChild(s);
  }
  /* 머리줄 이름: 닉네임에 글자·숫자가 하나도 없으면(빈 값·'.' 같은 기호뿐) '내 정보' */
  function chipName(nick) { const n = String(nick || '').trim(); return /[0-9A-Za-z\u3131-\u318E\uAC00-\uD7A3]/.test(n) ? `${n.slice(0, 12)} 님` : '내 정보'; }
  /* 머리줄 오른쪽: 로그인 전 '카카오 간편 로그인', 로그인 뒤 '닉네임 님' → 내 계정(login/) */
  function paintChip() {
    if (!on() || typeof document === 'undefined') return;
    const top = document.querySelector('header.top'); if (!top || top.hasAttribute('data-noacct')) return;
    style();
    let a = top.querySelector('.jdj-acct');
    if (!a) {
      const rest = [...top.children].filter(c => !c.classList.contains('brand')), wrap = document.createElement('div');
      wrap.className = 'jdj-right';
      top.appendChild(wrap); rest.forEach(c => wrap.appendChild(c));
      a = document.createElement('a'); a.href = LOGIN_PAGE; wrap.prepend(a);
    }
    const u = user(), nm = u ? chipName(u.nick) : '';
    a.className = 'jdj-acct' + (u ? '' : ' out');
    a.textContent = u ? nm : '카카오 간편 로그인';
    a.setAttribute('aria-label', u ? `내 계정 (${nm})` : '카카오 간편 로그인');
    if (!u) a.onclick = e => { if (location.pathname.indexOf(LOGIN_PAGE) === 0) return; e.preventDefault(); login('header'); };
    else a.onclick = null;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-jdj-login]'); if (!b) return;
      e.preventDefault(); login(b.getAttribute('data-jdj-login'));
    });
    const ready = () => { if (on()) { style(); paintChip(); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
    addEventListener('storage', e => { if (e.key === LS) emit(); });
  }

  root.JDJ_AUTH = { chipName, on, user, onChange, login, finish, logout, withdraw, load, update, syncHomes, pushHomes, favs, isFav, toggleFav, saveReport, removeReport, removeFav, alerts, subscribe, unsubscribe, btn, gate, style, placeId, LOGIN_PAGE };
})(typeof window !== 'undefined' ? window : this);
