/* 관심 지역 (JDJ_AREA) — 분양(bunyang/) · 청약(chungyak/) · 첫 화면 공용
   - 관심 지역: 시·도 또는 시·군·구 여러 개(최대 10곳) + 알림 종류(새 분양 공고 · 무순위/잔여세대 일정).
   - 로그인 전에는 이 기기(localStorage 'jdj_areas')에만, 카카오 로그인 중이면 계정 저장 자료(areas)에도 저장 = 알림 신청.
   - 청약 알림 메일은 알림 센터(my/alerts/). 카카오톡 발송은 카카오 비즈 인증 뒤(날짜 미정). 화면에서는 다시 들어왔을 때 '관심 지역 새 공고 N건' 배지와 분양·청약 화면 위쪽 표시로 알려 줌.
   - '새 공고' = 관심 지역·종류에 맞고 지금 분양예정·청약중인 공고 중 이 기기에서 아직 분양 화면에 보여 주지 않은 것(본 공고 id 는 'jdj_areas_seen'). */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const KEY = 'jdj_areas', SEEN = 'jdj_areas_seen', MAX = 10, MAX_SEEN = 600;
  const NOTICES = JB.DATA + 'data/bunyang/notices.json', INDEX = JB.DATA + 'data/index.json';
  const BUNYANG = JB.SITE + 'bunyang/';
  const MU = '무순위·잔여세대';
  const KINDS = { notice: '새 분양 공고', mu: '무순위·잔여세대 일정' };
  const EMPTY_TXT = '관심 지역을 설정하면 새로운 분양 공고, 무순위 청약 일정을 가장 먼저 받아볼 수 있어요';
  const SIDO_OLD = { '광주광역시': '전남광주통합특별시', '전라남도': '전남광주통합특별시', '강원도': '강원특별자치도', '전라북도': '전북특별자치도', '제주도': '제주특별자치도' };
  const sidoNorm = s => SIDO_OLD[s] || s;
  const sidoShort = s => String(s || '').replace(/(특별자치시|특별자치도|통합특별시|특별시|광역시)$/, '').replace(/^경상/, '경').replace(/^충청/, '충').replace(/^전라/, '전');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } } };
  const auth = () => root.JDJ_AUTH && root.JDJ_AUTH.on() ? root.JDJ_AUTH : null;
  const authed = () => { const a = auth(); return !!(a && a.user()); };
  const track = (n, p) => { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(n, p || {}); } catch (e) {} };

  /* ---------- 저장 ---------- */
  function clean(p) {
    p = p && typeof p === 'object' ? p : {};
    const seen = {};
    const list = (Array.isArray(p.list) ? p.list : []).map(a => a && ({ sd: String(a.sd || '').slice(0, 20), g: /^\d{5}$/.test(String(a.g || '')) ? String(a.g) : '', gn: String(a.gn || '').slice(0, 30) }))
      .filter(a => a && a.sd && (!a.g || a.gn)).filter(a => { const k = a.sd + '|' + a.g; if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, MAX);
    const k = p.kinds && typeof p.kinds === 'object' ? p.kinds : { notice: true, mu: true };
    const o = { list, kinds: { notice: k.notice !== false, mu: k.mu !== false }, t: String(p.t || '').slice(0, 10) };
    if (p.mkt && /^\d{4}-\d{2}-\d{2}$/.test(String(p.mkt.at || ''))) o.mkt = { at: String(p.mkt.at) };   // 광고성 정보 수신 동의(동의한 날) — 없으면 미동의
    return o;
  }
  /* 광고성 정보 수신 동의: 정보통신망법 제50조 — 동의한 사람에게만, 2년(730일)이 지나면 다시 여쭤봄(그 전까지는 유효) */
  const MKT_DAYS = 730;
  const mktOn = p => !!(p && p.mkt && p.mkt.at && (Date.now() - new Date(p.mkt.at + 'T00:00:00').getTime()) / 86400000 < MKT_DAYS);
  const mktOld = p => !!(p && p.mkt && p.mkt.at && !mktOn(p));
  function get() { try { return clean(JSON.parse(ls.get(KEY) || 'null')); } catch (e) { return clean(null); } }
  function setLocal(p) { ls.set(KEY, JSON.stringify(clean(p))); }
  /** 저장: 이 기기 + (로그인 중이면) 계정. 계정 저장 실패해도 이 기기 저장은 남음 */
  function set(p) {
    const c = clean(Object.assign({}, p, { t: new Date().toISOString().slice(0, 10) }));
    setLocal(c);
    track('area_save', { n: c.list.length, notice: c.kinds.notice ? 1 : 0, mu: c.kinds.mu ? 1 : 0, ad: c.mkt ? 1 : 0, login: authed() ? 1 : 0 });
    if (!authed()) return Promise.resolve({ local: true, p: c });
    return auth().update(d => { d.areas = c; }).then(() => ({ local: false, p: c })).catch(() => ({ local: true, p: c, err: true }));
  }
  /** 로그인 중이면 계정과 맞추기: 계정에 있으면 계정 것, 없고 이 기기에 있으면 계정으로 올림 */
  function sync() {
    if (!authed()) return Promise.resolve(get());
    return auth().load().then(st => {
      const sv = st && st.data && st.data.areas ? clean(st.data.areas) : null, lc = get();
      if (sv && sv.list.length) { setLocal(sv); return sv; }
      if (lc.list.length) return auth().update(d => { d.areas = lc; }).then(() => lc).catch(() => lc);
      return lc;
    }).catch(() => get());
  }

  /* ---------- 공고 고르기 ---------- */
  const ymd = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
  /** 지금 분양예정·청약중 (공용 상태 함수가 있으면 오늘 날짜로 다시 계산) */
  function stOf(x, t0) {
    if (x.st === 'plan') return 'plan';
    if (root.JDJ_SALE && root.JDJ_SALE.status) { try { const s = root.JDJ_SALE.status(x, t0); if (s) return s; } catch (e) {} }
    return x.st;
  }
  const inArea = (x, a) => sidoNorm(x.sd) === a.sd && (!a.g || x.g === a.g || (!x.g && x.gn && x.gn === a.gn));
  /** 관심 지역·종류에 맞고 지금 분양예정·청약중인 공고(가까운 일정 순) */
  function match(rows, p) {
    p = p || get(); if (!p.list.length) return [];
    const t0 = ymd();
    const okKind = x => x.k === MU ? p.kinds.mu : p.kinds.notice;
    const first = x => [x.sp && x.sp[0], x.rc && x.rc[0], x.pb].filter(Boolean).sort()[0] || '9';
    return (rows || []).filter(x => x && x.id && x.st !== 'plan' && okKind(x) && p.list.some(a => inArea(x, a)))
      .filter(x => { const s = stOf(x, t0); return s === 'pre' || s === 'on'; })
      .sort((a, b) => first(a).localeCompare(first(b)));
  }
  const seenSet = () => { try { const j = JSON.parse(ls.get(SEEN) || 'null'); return new Set(j && Array.isArray(j.ids) ? j.ids : []); } catch (e) { return new Set(); } };
  function markSeen(ids) {
    const s = seenSet(); ids.forEach(i => s.add(i));
    ls.set(SEEN, JSON.stringify({ ids: [...s].slice(-MAX_SEEN) }));
  }
  const unseen = list => { const s = seenSet(); return list.filter(x => !s.has(x.id)); };
  let notP = null;
  const notices = () => notP || (notP = fetch(NOTICES).then(r => r.ok ? r.json() : { rows: [] }).then(j => j.rows || []).catch(() => { notP = null; return []; }));
  let ixP = null;
  const sggIndex = () => ixP || (ixP = fetch(INDEX).then(r => r.json()).then(j => j.sgg || {}).catch(() => { ixP = null; return {}; }));
  /** 관심 지역 새 공고 수 (관심 지역이 없으면 자료를 받지 않고 0) */
  function countNew() { const p = get(); if (!p.list.length) return Promise.resolve({ n: 0, live: 0, set: false }); return notices().then(rows => { const m = match(rows, p); return { n: unseen(m).length, live: m.length, set: true }; }); }
  const label = a => sidoShort(a.sd) + ' ' + (a.g ? a.gn : '전체');

  /* ---------- 화면 ---------- */
  const CSS = `.ja{border:1px solid #C9D8FF;background:#F5F8FF;border-radius:18px;padding:16px;margin:16px 0}
.ja h2{font-size:18px;font-weight:900;margin:0 0 6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ja .nb{display:inline-block;font-size:13px;font-weight:800;color:#fff;background:#E5484D;border-radius:999px;padding:2px 9px}
.ja p{margin:0 0 10px;font-size:15px;color:#3E4754;line-height:1.55;word-break:keep-all}
.ja .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ja .btn2{font:inherit;font-size:15px;font-weight:700;min-height:46px;padding:0 16px;border-radius:12px;border:1px solid #E5E8EB;background:#fff;color:#191F28;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.ja .btn2.p{background:#2560E8;border-color:#2560E8;color:#fff}
.ja .chipz{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
.ja .chipz span{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:700;background:#fff;border:1px solid #C9D8FF;color:#1F56E0;border-radius:999px;padding:4px 6px 4px 12px;min-height:36px}
.ja .chipz span.ro{padding-right:12px}
.ja .chipz button{font:inherit;border:0;background:none;color:#4E5968;min-width:30px;min-height:30px;cursor:pointer;font-size:16px;line-height:1}
.ja .ed{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin:6px 0 8px}
@media(max-width:520px){.ja .ed{grid-template-columns:1fr 1fr}.ja .ed .add{grid-column:1/-1}}
.ja label.l{display:block;font-size:13.5px;font-weight:700;color:#4E5968;margin-bottom:4px}
.ja select{width:100%;min-height:46px;padding:0 10px;border:1px solid #E5E8EB;border-radius:12px;font:inherit;font-size:15.5px;background:#fff;color:#191F28}
.ja .kd{display:flex;flex-wrap:wrap;gap:6px 16px;margin:4px 0 10px}
.ja .kd label{display:flex;align-items:center;gap:8px;font-size:15px;min-height:40px;cursor:pointer}
.ja .kd input{width:20px;height:20px;accent-color:#2560E8}
.ja .lst{display:grid;gap:6px;margin:8px 0 4px}
.ja .lst button{display:block;width:100%;text-align:left;font:inherit;background:#fff;border:1px solid #E5E8EB;border-radius:12px;padding:10px 12px;cursor:pointer;color:#191F28}
.ja .lst button:hover{border-color:#2560E8}
.ja .lst b{font-size:15.5px}.ja .lst small{display:block;font-size:13.5px;color:#4E5968}
.ja .new{display:inline-block;font-size:11.5px;font-weight:800;color:#C81E1E;background:#FDECEC;border-radius:5px;padding:0 5px;margin-right:5px;vertical-align:1px}
.ja .note{font-size:13.5px;color:#4E5968;margin:8px 0 0;line-height:1.6}
.ja .msg{font-size:14px;font-weight:700;color:#0E7A4F}
.ja-badge{display:inline-block;margin-left:6px;font-size:12px;font-weight:800;color:#fff;background:#E5484D;border-radius:999px;padding:1px 7px;vertical-align:2px;white-space:nowrap}`;
  function style() { if (typeof document === 'undefined' || document.getElementById('jaCss')) return; const s = document.createElement('style'); s.id = 'jaCss'; s.textContent = CSS; document.head.appendChild(s); }
  const SIDOS = ['서울특별시', '경기도', '인천광역시', '부산광역시', '대구광역시', '전남광주통합특별시', '대전광역시', '울산광역시', '세종특별자치시', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '경상북도', '경상남도', '제주특별자치도'];
  function saveNote() {
    if (authed()) return `카카오 계정(${esc(auth().user().nick)} 님)에 저장돼서 다른 기기에서도 같은 관심 지역이 보여요. 새 청약 공고·접수 하루 전·발표일 알림은 <a href="${JB.SITE}my/alerts/#cyT">알림 센터</a>에서 메일로 받을 수 있어요. 카카오톡 알림은 준비하고 있어요.`;
    if (auth()) return `지금은 이 기기에만 저장돼요. 카카오 간편 로그인하면 다른 기기에서도 같은 관심 지역을 쓰고, <a href="${JB.SITE}my/alerts/#cyT">알림 센터</a>에서 청약 알림을 메일로 받을 수 있어요. 카카오톡 알림은 준비하고 있어요.`;
    return '이 기기 브라우저에만 저장돼요.';
  }
  const fmtD = s => s && s.length === 8 ? `${+s.slice(4, 6)}.${+s.slice(6, 8)}` : '';
  function lineOf(x) {
    const sp = x.sp && x.sp[0], rc = x.rc && x.rc[0];
    const st = stOf(x, ymd()), when = st === 'on' ? `청약 접수 중${x.rc && x.rc[1] ? ' (~' + fmtD(x.rc[1]) + ')' : ''}` : `${sp && (!rc || sp < rc) ? '특별공급' : '청약 접수'} ${fmtD(sp && (!rc || sp < rc) ? sp : rc) || '일정 공고 확인'} 시작`;
    return `${esc(x.k)} · ${esc(sidoShort(sidoNorm(x.sd)))} ${esc(x.gn || '')} · ${when}`;
  }
  /** 분양 화면 관심 지역 상자. o = {rows(분양 공고 행), onOpen(id)} */
  function mountPanel(el, o) {
    if (!el) return;
    style(); o = o || {};
    let p = get(), editing = false, draft = null, msg = '';
    const rows = () => o.rows || [];
    async function draw() {
      if (editing) return drawEdit();
      if (!p.list.length) {
        el.innerHTML = `<div class="ja" id="area"><h2>관심 지역</h2><p>${EMPTY_TXT}</p><div class="row"><button type="button" class="btn2 p" data-a="edit">관심 지역 설정</button></div></div>`;
        return;
      }
      const m = match(rows(), p), nw = new Set(unseen(m).map(x => x.id));
      const kinds = Object.keys(KINDS).filter(k => p.kinds[k]).map(k => KINDS[k]).join(' · ') || '알림 없음';
      el.innerHTML = `<div class="ja" id="area"><h2>관심 지역 공고${nw.size ? `<span class="nb">새 공고 ${nw.size}건</span>` : ''}</h2>
        <div class="chipz">${p.list.map(a => `<span class="ro">${esc(label(a))}</span>`).join('')}</div>
        ${m.length ? `<div class="lst">${m.slice(0, 6).map(x => `<button type="button" data-id="${esc(x.id)}"><b>${nw.has(x.id) ? '<span class="new">NEW</span>' : ''}${esc(x.n)}</b><small>${lineOf(x)}</small></button>`).join('')}</div>${m.length > 6 ? `<p class="note">관심 지역 공고 ${m.length}건 중 일정이 가까운 6건이에요. 아래 목록에서 지역을 골라 모두 볼 수 있어요.</p>` : ''}`
          : `<p>관심 지역에 지금 분양예정·청약 중인 공고는 없어요. 새 공고가 올라오면 이 화면과 첫 화면에 표시해 드려요.</p>`}
        <div id="jaAd"></div>
        <p class="note">알림 신청: <b>${esc(kinds)}</b>${mktOn(p) ? ' · 새 분양 광고 소식(광고성 정보 수신 동의 ' + esc(p.mkt.at) + ')' : ''}. ${saveNote()}</p>
        ${mktOld(p) ? `<p class="note"><b>광고 소식 수신 동의가 2년이 지나 멈췄어요.</b> 계속 받으시려면 [관심 지역 바꾸기]에서 다시 체크해 주세요.</p>` : ''}
        <div class="row" style="margin-top:10px"><button type="button" class="btn2" data-a="edit">관심 지역 바꾸기</button>${!authed() && auth() ? auth().btn('카카오 간편 로그인하고 알림 받기', 'area') : ''}${msg ? `<span class="msg">${esc(msg)}</span>` : ''}</div></div>`;
      if (m.length) setTimeout(() => markSeen(m.map(x => x.id)), 1500);   // 이 화면에서 보여 준 공고는 '본 공고'로
      drawAds();
    }
    /* 관심 지역 알림 상품(광고): 광고성 정보 수신에 동의한 경우에만, 관심 지역에 맞는 광고 최대 2개를 '광고'로 */
    async function drawAds() {
      const box = el.querySelector('#jaAd'), AD = root.JDJ_ADS;
      if (!box || !AD || !mktOn(p)) return;
      const l = (await AD.forAreas(p.list)).slice(0, 2); if (!l.length || !el.contains(box)) return;
      AD.css();
      box.innerHTML = `<p class="note" style="margin:10px 0 6px"><b>관심 지역 새 분양 소식</b> · 광고 (광고성 정보 수신에 동의하셔서 보여 드려요)</p><div class="jad-l">${l.map(a => AD.cardHtml(a, AD.rowOf(a, rows()), { open: !!o.onOpen })).join('')}</div>`;
      l.forEach(a => AD.log('adv', a.id, ''));
    }
    async function drawEdit() {
      const S = await sggIndex();
      const sd = draft.sd || SIDOS[0];
      const sggs = Object.keys(S).filter(k => S[k].sido === sd).sort((a, b) => S[a].name.localeCompare(S[b].name, 'ko'));
      el.innerHTML = `<div class="ja" id="area"><h2>관심 지역 설정</h2><p>시·도를 고르고, 시·군·구를 고르거나 '시·도 전체'로 두고 [추가]를 눌러 주세요. ${MAX}곳까지 고를 수 있어요.</p>
        <div class="ed"><div><label class="l" for="jaSd">시·도</label><select id="jaSd">${SIDOS.map(s => `<option value="${esc(s)}"${s === sd ? ' selected' : ''}>${esc(sidoShort(s))}</option>`).join('')}</select></div>
          <div><label class="l" for="jaSg">시·군·구</label><select id="jaSg"><option value="">시·도 전체</option>${sggs.map(k => `<option value="${k}">${esc(S[k].name)}</option>`).join('')}</select></div>
          <button type="button" class="btn2 add" data-a="add">추가</button></div>
        <div class="chipz">${draft.list.length ? draft.list.map((a, i) => `<span>${esc(label(a))}<button type="button" data-del="${i}" aria-label="${esc(label(a))} 빼기">×</button></span>`).join('') : '<span class="ro" style="color:#4E5968;border-color:#E5E8EB">아직 고른 지역이 없어요</span>'}</div>
        <div class="kd"><label><input type="checkbox" id="jaK1"${draft.kinds.notice ? ' checked' : ''}>새 분양 공고 알림</label><label><input type="checkbox" id="jaK2"${draft.kinds.mu ? ' checked' : ''}>무순위·잔여세대 일정 알림</label></div>
        <label class="kd" style="display:flex;align-items:flex-start;gap:8px;font-size:15px;cursor:pointer;margin:0 0 10px"><input type="checkbox" id="jaK3"${mktOn(draft) ? ' checked' : ''} style="margin-top:2px"><span><b>(선택) 광고성 정보 수신 동의</b> — 관심 지역에 새로 나온 분양 현장의 <b>광고</b> 소식(시행사·분양대행사가 비용을 낸 소식)도 받기
          <small style="display:block;font-size:13.5px;color:#4E5968;line-height:1.55;margin-top:2px">이 화면에 먼저 보여 드리고, 카카오톡 알림은 준비 중이에요(시작하면 오후 9시~오전 8시에는 보내지 않아요). 동의하지 않아도 공고 알림은 그대로 받아요. 언제든 체크를 풀면 바로 멈추고, 2년마다 다시 여쭤봐요.</small></span></label>
        <p class="note" style="margin:0 0 10px">${saveNote()}</p>
        <div class="row"><button type="button" class="btn2 p" data-a="save">저장</button><button type="button" class="btn2" data-a="cancel">닫기</button>${!authed() && auth() ? auth().btn('카카오 간편 로그인', 'area_edit') : ''}<span class="msg" id="jaMsg" role="status"></span></div></div>`;
      el.querySelector('#jaSd').onchange = e => { draft.sd = e.target.value; drawEdit(); };
    }
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.dataset.adOpen) { if (root.JDJ_ADS) root.JDJ_ADS.log('adc', b.dataset.ad, ''); if (o.onOpen) o.onOpen(b.dataset.adOpen); return; }
      if (b.dataset.id) { if (o.onOpen) o.onOpen(b.dataset.id); return; }
      if (b.dataset.del != null) { draft.list.splice(+b.dataset.del, 1); drawEdit(); return; }
      const a = b.dataset.a; if (!a) return;
      if (a === 'edit') { editing = true; draft = JSON.parse(JSON.stringify(p)); draft.sd = (p.list[0] && p.list[0].sd) || SIDOS[0]; msg = ''; draw(); track('area_edit_open'); return; }
      if (a === 'cancel') { editing = false; draw(); return; }
      if (a === 'add') {
        const S = await sggIndex(), sd = el.querySelector('#jaSd').value, g = el.querySelector('#jaSg').value;
        const m = el.querySelector('#jaMsg');
        if (draft.list.length >= MAX) { m.style.color = '#C2410C'; m.textContent = `관심 지역은 ${MAX}곳까지예요.`; return; }
        if (draft.list.some(x => x.sd === sd && x.g === g)) { m.style.color = '#C2410C'; m.textContent = '이미 고른 지역이에요.'; return; }
        draft.list = draft.list.filter(x => !(g === '' && x.sd === sd));        // 시·도 전체를 고르면 그 안 시·군·구는 합침
        if (g && draft.list.some(x => x.sd === sd && !x.g)) { m.style.color = '#C2410C'; m.textContent = `${sidoShort(sd)} 전체가 이미 들어 있어요.`; return; }
        draft.list.push({ sd, g, gn: g ? (S[g] || {}).name || '' : '' });
        drawEdit(); return;
      }
      if (a === 'save') {
        draft.kinds = { notice: el.querySelector('#jaK1').checked, mu: el.querySelector('#jaK2').checked };
        const k3 = el.querySelector('#jaK3').checked, wasOn = mktOn(p);
        if (k3) draft.mkt = { at: wasOn ? p.mkt.at : new Date().toISOString().slice(0, 10) }; else delete draft.mkt;
        if (k3 !== wasOn) track(k3 ? 'area_ad_optin' : 'area_ad_optout');
        b.disabled = true;
        const r = await set(draft);
        p = r.p; editing = false;
        msg = !p.list.length ? '' : r.err ? '이 기기에 저장했어요. 계정 저장은 다음에 다시 시도할게요.' : r.local ? '이 기기에 저장했어요.' : '계정에 저장했어요.';
        draw(); if (o.onChange) o.onChange(p);
      }
    });
    if (authed()) sync().then(v => { p = v; if (!editing) draw(); });
    if (auth()) auth().onChange(() => { if (authed()) sync().then(v => { p = v; if (!editing) draw(); }); else if (!editing) draw(); });
    draw();
  }
  /** 청약 화면 위쪽 한 줄: 관심 지역이 있으면 새 공고·모집 중 수, 없으면 혜택 안내 */
  function mountStrip(el) {
    if (!el) return; style();
    const p = get();
    if (!p.list.length) {
      el.innerHTML = `<div class="ja" style="padding:14px 16px"><p style="margin:0 0 8px">${EMPTY_TXT}</p><a class="btn2 p" href="${BUNYANG}#area" data-track="cy_area_setup">관심 지역 설정</a></div>`;
      return;
    }
    countNew().then(c => {
      el.innerHTML = `<div class="ja" style="padding:14px 16px"><h2 style="font-size:16.5px;margin:0 0 4px">관심 지역 공고${c.n ? `<span class="nb">새 공고 ${c.n}건</span>` : ''}</h2>
        <p style="margin:0 0 8px">${esc(p.list.map(label).join(' · '))} — 지금 분양예정·청약 중 <b>${c.live}건</b></p>
        <a class="btn2 p" href="${BUNYANG}#area" data-track="cy_area_open">분양 화면에서 보기</a></div>`;
    });
  }
  /** 링크 옆 배지 '관심 지역 새 공고 N건' (새 공고가 있을 때만) */
  function badge(a) {
    if (!a) return; style();
    countNew().then(c => { if (!c.n) return; const s = document.createElement('span'); s.className = 'ja-badge'; s.textContent = `관심 지역 새 공고 ${c.n}건`; (a.querySelector('b') || a).appendChild(s); });
  }

  const API = { get, set, sync, match, unseen, markSeen, countNew, mountPanel, mountStrip, badge, clean, label, mktOn, EMPTY_TXT, KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_AREA = API;
})(typeof window !== 'undefined' ? window : this);
