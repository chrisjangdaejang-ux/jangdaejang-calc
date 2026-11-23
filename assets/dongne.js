/* 동네 중개사 파트너 — 공용 화면 도구(window.JDJ_DP)
   - 지금은 숨김: assets/config.js PARTNER_ENABLED 가 false 면 어떤 화면에도 칸·링크가 나오지 않아요.
     운영자 미리 보기 = dongne/admin/ 에서 [이 기기에서 미리 보기 켜기]를 누른 기기(모닝 브리핑 운영자 모드 계정으로 카카오 간편 로그인) + 주소에 ?preview=dongne.
     서버(tools/agent-backend.gs 'v50')도 운영자 계정만 받아 줘요.
   - 칸: 웹 브리핑 맨 아래 [data-dp-brief](광고성 정보 받기에 동의한 구독자만 — 서버가 확인) · 첫 화면 [data-dp-best](이번 주 우수 동네 소식)
         · 구독 신청 화면 [data-dp-invite](초대 링크 ?dp=코드로 오면 '○○공인중개사가 보내 드리는 동네 브리핑')
   - 계산 규칙은 assets/dongne-core.js(서버와 같은 글자). 거르는 낱말은 서버에만 있어요. */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const LS_PV = 'jdj_dp_preview', SS_PV = 'jdj_dp_pv', LS_AUTH = 'jdj_auth', LS_REF = 'jdj_dp_ref', LS_VID = 'jdj_vid';
  const C = root.JDJ_DPCORE || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const site = () => String((root.JDJ_SITE || {}).SITE_NAME || '').trim();
  const api = () => (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || '';

  /* ---------- 켜짐 확인 ---------- */
  function sess() { try { const j = JSON.parse(ls.get(LS_AUTH) || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function preview() {
    if (typeof location === 'undefined') return false;
    if (ls.get(LS_PV) !== '1' || !sess()) { ss.del(SS_PV); return false; }
    if (/[?&]preview=dongne(&|$)/.test(location.search)) { ss.set(SS_PV, '1'); return true; }
    return ss.get(SS_PV) === '1';
  }
  function enabled() { return (root.JDJ_SITE || {}).PARTNER_ENABLED === true || preview(); }
  /** 미리 보기 중이면 안쪽 링크에 ?preview=dongne 를 붙여 다음 화면에서도 이어지게 */
  function link(path) { const pv = preview() && (root.JDJ_SITE || {}).PARTNER_ENABLED !== true; return JB.SITE + path + (pv ? (path.indexOf('?') < 0 ? '?' : '&') + 'preview=dongne' : ''); }
  function vid() { let v = ls.get(LS_VID); if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) { v = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); ls.set(LS_VID, v); } return v; }

  /* ---------- 서버 ---------- */
  function post(body) {
    if (!api()) return Promise.reject(new Error('서버가 아직 연결되지 않았어요.'));
    const b = Object.assign({}, body), s = sess();
    if (s && !b.s) b.s = s;
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(r => r.json()).then(j => {
        if (j && j.err === 'unknown') { const e = new Error('준비 중이에요. 조금만 기다려 주세요.'); e.code = 'unknown'; throw e; }
        if (!j || !j.ok) { const t = (j && j.err) || ''; const e = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.'); e.raw = t; e.code = (j && j.code) || ''; throw e; }
        return j;
      }, e => { if (e && e.code) throw e; throw new Error('인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요.'); });
  }

  /* ---------- 법정동 가운데 점 ---------- */
  const ptsP = {};
  function sidoSet(sd) { return ['11', '28', '41'].indexOf(sd) >= 0 ? ['11', '28', '41'] : [sd]; }
  function points(sd) {
    const key = sidoSet(sd).join(',');
    if (!ptsP[key]) ptsP[key] = Promise.all(sidoSet(sd).map(s => fetch(JB.SITE + 'assets/dong/' + s + '.json').then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(list => { const rows = {}; list.forEach(j => { if (j && j.rows) Object.assign(rows, j.rows); }); return rows; });
    return ptsP[key];
  }
  function dongsOf(g) { return points(String(g).slice(0, 2)).then(rows => Object.keys(rows).filter(k => k.slice(0, 6) === g + '|').map(k => k.slice(6)).sort((a, b) => a.localeCompare(b, 'ko'))); }
  function near(key) { return points(String(key).slice(0, 2)).then(rows => ({ rows: rows, list: C.dpNear ? C.dpNear(key, rows, C.DP_RULE.nearK) : [] })); }
  /** 작은 지도(SVG): 사무소 동(가운데)과 이웃 동 점, 고른 동은 진하게 */
  function miniMap(key, rows, list, picked, used) {
    const all = [key].concat(list.map(x => x.key)).filter(k => rows[k]);
    if (all.length < 2) return '';
    const xs = all.map(k => rows[k][0]), ys = all.map(k => rows[k][1]);
    const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    const W = 340, H = 220, pad = 34, sx = (x1 - x0) || 0.01, sy = (y1 - y0) || 0.01, sc = Math.min((W - pad * 2) / sx, (H - pad * 2) / sy);
    const px = v => pad + (v - x0) * sc + ((W - pad * 2) - sx * sc) / 2, py = v => H - pad - (v - y0) * sc - ((H - pad * 2) - sy * sc) / 2;
    const dot = k => {
      const p = rows[k], me = k === key, on = me || picked.indexOf(k) >= 0, full = !me && used && used[k] >= C.DP_RULE.slots && picked.indexOf(k) < 0;
      const lab = k.slice(6);
      return `<g><circle cx="${px(p[0]).toFixed(1)}" cy="${py(p[1]).toFixed(1)}" r="${me ? 8 : 6}" fill="${me ? '#8A6A12' : on ? '#2F6BFF' : full ? '#C9CED6' : '#FFFFFF'}" stroke="${me ? '#8A6A12' : full ? '#AEB5BF' : '#2F6BFF'}" stroke-width="2"/>`
        + `<text x="${px(p[0]).toFixed(1)}" y="${(py(p[1]) - 11).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="${on ? 800 : 500}" fill="${full ? '#8B95A1' : '#191F28'}">${esc(lab)}</text></g>`;
    };
    return `<svg class="dp-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="사무소 동과 가까운 동 위치(점 사이 거리는 동 가운데끼리)">${all.map(dot).join('')}</svg>`
      + `<p class="dp-legend"><span class="dp-k me"></span>사무소 동 <span class="dp-k on"></span>고른 동 <span class="dp-k"></span>고를 수 있는 동 <span class="dp-k full"></span>자리 마감</p>`;
  }

  /* ---------- 사진 줄이기(긴 변 640px JPEG) ---------- */
  function shrink(file) {
    return new Promise((ok, no) => {
      if (!file) return ok('');
      if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || '') && !/\.(jpe?g|png|webp|heic)$/i.test(file.name || '')) return no(new Error('사진 파일만 올릴 수 있어요.'));
      const fr = new FileReader();
      fr.onerror = () => no(new Error('사진을 읽지 못했어요. 다른 사진을 골라 주세요.'));
      fr.onload = () => { const im = new Image(); im.onerror = () => no(new Error('이 사진 형식은 읽지 못했어요. JPG·PNG로 골라 주세요.'));
        im.onload = () => { const M = 640, s = Math.min(1, M / Math.max(im.width, im.height)), cv = document.createElement('canvas');
          cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', 0.82)); };
        im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- 카드(공인중개사법 표시 의무 5가지) ---------- */
  function legalHtml(c) { const L = C.dpLegal ? C.dpLegal(c) : []; return `<p class="dp-legal">${L.map(esc).join(' · ')}</p>`; }
  function cardHtml(c, opt) {
    opt = opt || {};
    const tel = String(c.tel || '').replace(/[^0-9]/g, '');
    return `<div class="dp-card${opt.small ? ' sm' : ''}">${c.img ? `<img class="dp-face" src="${esc(c.img)}" alt="" loading="lazy">` : `<span class="dp-face none" aria-hidden="true">${esc(String(c.office || '').slice(0, 1))}</span>`}
      <div class="dp-cb"><b class="dp-on">${esc(c.office)}</b> <span class="dp-badge">${c.found ? '창립 파트너' : '동네 파트너'}</span>${c.intro ? `<p class="dp-intro">${esc(c.intro)}</p>` : ''}${legalHtml(c)}
      ${!opt.nocall ? `<div class="dp-acts" style="margin-top:4px">${tel ? `<a class="dp-call" href="tel:${esc(tel)}" data-dp-call="${esc(c.id)}">전화하기</a>` : ''}${opt.noreport ? '' : `<button type="button" data-dp-prep="${esc(c.id)}">이 사무소 신고</button>`}</div>` : ''}</div></div>`;
  }
  const CSS = `.dp-sec{border:1px solid #EFE6CC;background:#FBF8EF;border-radius:18px;padding:16px;margin:18px 0}
.dp-sec h2{font-size:19px;margin:0 0 2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dp-tag{font-size:12px;font-weight:800;color:#4E5968;background:#F2F4F6;border-radius:6px;padding:2px 8px}
.dp-sub{font-size:13.5px;color:var(--sub2,#4E5968);margin:0 0 8px;line-height:1.55}
.dp-dong{border-top:1px solid #EFE6CC;padding:12px 0 4px}
.dp-dong h3{font-size:16px;margin:0 0 6px}
.dp-post{background:#fff;border:1px solid #EFE6CC;border-radius:14px;padding:12px;margin:0 0 10px}
.dp-post .dp-by{font-size:12.5px;color:var(--sub2,#4E5968)}
.dp-post .dp-tp{font-size:12.5px;font-weight:800;color:#8A6A12}
.dp-post p{margin:4px 0 6px;line-height:1.65;font-size:15.5px;word-break:keep-all}
.dp-post img{max-width:100%;border-radius:10px;display:block;margin:4px 0}
.dp-acts{display:flex;gap:8px;flex-wrap:wrap}
.dp-acts button{font:inherit;font-size:14px;font-weight:700;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--line,#E5E8EB);background:#fff;color:var(--text,#191F28);cursor:pointer}
.dp-card{display:flex;gap:10px;align-items:flex-start;margin:8px 0}
.dp-face{width:48px;height:48px;border-radius:50%;object-fit:cover;flex:none;background:#F6EDD3}
.dp-face.none{display:inline-flex;align-items:center;justify-content:center;font-weight:900;color:#8A6A12}
.dp-cb{min-width:0;flex:1}
.dp-on{font-size:15.5px}
.dp-badge{display:inline-block;font-size:11.5px;font-weight:800;color:#8A6A12;background:#F6EDD3;border-radius:6px;padding:1px 6px;vertical-align:1px}
.dp-intro{margin:2px 0;font-size:14px;color:var(--sub,#3E4754)}
.dp-legal{margin:2px 0 0;font-size:12.5px;color:var(--sub2,#4E5968);line-height:1.55;word-break:keep-all}
.dp-call{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:12px;background:#191F28;color:#fff;font-weight:800;font-size:14px;text-decoration:none}
.dp-best{background:#fff;border:1px solid #EFE6CC;border-radius:14px;padding:12px;margin:6px 0 10px}
.dp-best b{color:#8A6A12}
.dp-note{font-size:12.5px;color:var(--sub2,#4E5968);margin:10px 0 0;line-height:1.6}
.dp-msg{font-size:14px;margin:6px 0 0;color:#0B5A3B}
.dp-map{width:100%;max-width:420px;height:auto;display:block;background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:14px;margin:6px 0}
.dp-legend{font-size:12.5px;color:var(--sub2,#4E5968);margin:2px 0 8px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.dp-k{display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid #2F6BFF;background:#fff;margin-right:3px;vertical-align:-1px}
.dp-k.me{background:#8A6A12;border-color:#8A6A12}.dp-k.on{background:#2F6BFF}.dp-k.full{background:#C9CED6;border-color:#AEB5BF}
.dp-inv{border:1px solid #EFE6CC;background:#FBF8EF;border-radius:16px;padding:14px;margin:0 0 14px}
.dp-inv b{font-size:16.5px}`;
  function style() { if (typeof document === 'undefined' || document.getElementById('dpCss')) return; const s = document.createElement('style'); s.id = 'dpCss'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- 웹 브리핑 칸 ---------- */
  const WHY = [['price', '가격 예측'], ['dam', '집값 담합'], ['ad', '매물 홍보'], ['prof', '욕설'], ['defame', '비방'], ['false', '사실이 아닌 내용'], ['etc', '기타']];
  const PWHY = [['false', '사실이 아닌 정보'], ['ad', '무리한 영업'], ['defame', '불친절·비방'], ['etc', '기타(사기·금전 사고 의심 등)']];
  function secHtml(sec) {
    const dongs = (sec.list || []).map(x => {
      const top = x.partners[0], p = x.post && top && x.post.pid === top.id ? x.post : null;
      return `<div class="dp-dong"><h3>${esc(x.dn)}</h3>${p ? `<div class="dp-post"><span class="dp-tp">${esc(p.tn)}</span> <span class="dp-by">· ${esc(top.office)}</span><p>${esc(p.text)}</p>${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ''}
        <div class="dp-acts"><button type="button" data-dp-help="${esc(p.id)}">도움돼요${p.help ? ' ' + Number(p.help) : ''}</button><button type="button" data-dp-rep="${esc(p.id)}">이 글 신고</button></div></div>` : ''}
        ${x.partners.map(c => cardHtml(c)).join('')}</div>`;
    }).join('');
    const best = sec.best ? `<div class="dp-best"><b>이번 주 우수 동네 소식</b> · ${esc(sec.best.dn)} · ${esc(sec.best.office)}<p style="margin:4px 0 0;line-height:1.6">${esc(sec.best.text)}</p></div>` : '';
    if (!dongs && !best) return '';
    return `<h2>우리 동네 중개사 한마디 <span class="dp-tag">제휴</span></h2><p class="dp-sub">제휴 중개사가 직접 쓴 동네 소식이에요. 브리핑의 숫자·순위는 제휴와 관계없이 똑같이 계산해요.</p>${best}${dongs}
      <p class="dp-note">광고성 정보 받기에 동의하신 분께만 보여요. <a href="${JB.SITE}brief/manage/">내 구독 관리</a>에서 끌 수 있어요. 동네 중개사라면 <a href="${link('dongne/')}">동네 파트너 알아보기</a></p>`;
  }
  function bind(el) {
    el.addEventListener('click', ev => {
      const h = ev.target.closest('[data-dp-help]'), r0 = ev.target.closest('[data-dp-rep]'), pr = ev.target.closest('[data-dp-prep]'), c = ev.target.closest('[data-dp-call]');
      const r = r0 || pr;
      if (c) post({ action: 'dpLog', t: 'call', id: c.getAttribute('data-dp-call'), v: vid() }).catch(() => {});
      if (h) { h.disabled = true; post({ action: 'dpHelp', id: h.getAttribute('data-dp-help'), v: vid() }).then(j => { h.textContent = j.again ? '이미 눌렀어요' : '도움돼요 ' + j.n; }).catch(e => { h.disabled = false; h.textContent = e.message.slice(0, 30); }); }
      if (r) {
        const box = r.closest('.dp-post') || r.closest('.dp-card'); if (box.querySelector('.dp-rw')) return;
        const d = document.createElement('div'); d.className = 'dp-rw';
        d.innerHTML = `<p class="dp-sub" style="margin:8px 0 4px">${pr ? '이 중개사무소를 신고하는 이유를 골라 주세요(운영자가 확인해요)' : '신고 이유를 골라 주세요'}</p><div class="dp-acts">${(pr ? PWHY : WHY).map(w => `<button type="button" data-w="${w[0]}">${esc(w[1])}</button>`).join('')}</div>`;
        box.appendChild(d);
        d.addEventListener('click', e2 => { const w = e2.target.closest('[data-w]'); if (!w) return;
          post(Object.assign({ action: 'dpReport', why: w.getAttribute('data-w'), v: vid() }, pr ? { pid: pr.getAttribute('data-dp-prep') } : { id: r.getAttribute('data-dp-rep') }))
            .then(j => { d.innerHTML = `<p class="dp-msg">${j.again ? '이미 신고했어요.' : '신고를 받았어요. 운영자가 확인해요.'}</p>`; })
            .catch(e => { d.innerHTML = `<p class="dp-msg" style="color:#B42318">${esc(e.message)}</p>`; }); });
      }
    });
  }
  /** 웹 브리핑 맨 아래 칸 채우기: { g, dn, day } */
  function fillBrief(o) {
    if (typeof document === 'undefined' || !enabled()) return Promise.resolve(null);
    const el = document.querySelector('[data-dp-brief]'); if (!el) return Promise.resolve(null);
    const q = new URLSearchParams(location.search), k = /^[0-9a-f]{10}$/.test(q.get('k') || '') ? q.get('k') : '';
    if (!k && !sess()) return Promise.resolve(null);              // 누가 보는지 모르면(구독자 확인 안 됨) 칸 없음
    return post({ action: 'dpBrief', g: o.g, dn: o.dn || '', day: o.day || '', k: k }).then(j => {
      if (!j.show || !j.sec) return null;
      const h = secHtml(j.sec); if (!h) return null;
      style(); el.innerHTML = h; el.hidden = false; bind(el);
      const ids = []; (j.sec.list || []).forEach(x => x.partners.forEach(c => ids.push(c.id)));
      if (ids.length) post({ action: 'dpLog', t: 'imp', ids: ids, v: vid() }).catch(() => {});
      return j.sec;
    }).catch(() => null);
  }
  /** 첫 화면: 이번 주 우수 동네 소식 */
  function fillBest() {
    if (typeof document === 'undefined' || !enabled()) return Promise.resolve(null);
    const el = document.querySelector('[data-dp-best]'); if (!el) return Promise.resolve(null);
    return post({ action: 'dpBestGet' }).then(j => {
      const b = j.best; if (!b) return null;
      style();
      el.innerHTML = `<div class="dp-sec" style="margin:0"><h2>이번 주 우수 동네 소식 <span class="dp-tag">제휴</span></h2><p class="dp-sub">${esc(b.dn)} · 동네 파트너가 쓴 글 중 도움돼요를 가장 많이 받은 글이에요.</p>
        <div class="dp-post"><span class="dp-tp">${esc(b.tn)}</span><p>${esc(b.text)}</p></div>${b.card ? cardHtml(b.card) : ''}</div>`;
      el.hidden = false; bind(el);
      return b;
    }).catch(() => null);
  }
  /** 구독 신청 화면: 초대 링크(?dp=코드) */
  function inviteCode() {
    if (typeof location === 'undefined') return '';
    const q = new URLSearchParams(location.search).get('dp');
    if (q && /^P[0-9A-F]{7}$/i.test(q)) ls.set(LS_REF, JSON.stringify({ c: q.toUpperCase(), at: Date.now() }));
    try { const j = JSON.parse(ls.get(LS_REF) || 'null'); return j && Date.now() - j.at < 30 * 864e5 ? j.c : ''; } catch (e) { return ''; }
  }
  function fillInvite() {
    if (typeof document === 'undefined' || !enabled()) return Promise.resolve(null);
    const el = document.querySelector('[data-dp-invite]'), c = inviteCode(); if (!el || !c) return Promise.resolve(null);
    return post({ action: 'dpInvite', c: c }).then(j => {
      if (!j.p) return null;
      style();
      el.innerHTML = `<div class="dp-inv"><b>${esc(j.p.office)}가 보내 드리는 동네 브리핑</b><p class="dp-sub" style="margin:4px 0 6px">${esc(j.p.dn)} 동네 소식과 실거래를 매일 아침 받아 보세요. 무료 체험으로 시작해요.</p>${cardHtml(j.p.card, { nocall: true, small: true })}</div>`;
      el.hidden = false;
      return j.p;
    }).catch(() => null);
  }
  function inviteUrl(code, g, dn) { return location.origin + JB.SITE + 'brief/subscribe/?dp=' + encodeURIComponent(code) + (g ? '&d=' + encodeURIComponent(g + (dn ? '-' + dn : '')) : ''); }
  function qrSvg(text) {
    if (typeof root.qrcode !== 'function') return '';
    const q = root.qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }

  function cardAuth(ck, clientKey, back) { return root.JDJ_BILL ? root.JDJ_BILL.cardAuth(ck, clientKey, back) : Promise.reject(new Error('정식 자동 결제는 아직 열리지 않았어요.')); }
  const apiObj = { cardAuth, enabled, preview, link, post, sess, site, vid, esc, points, dongsOf, near, miniMap, shrink, cardHtml, legalHtml, secHtml, fillBrief, fillBest, fillInvite, inviteCode, inviteUrl, qrSvg, style, bind, CSS, LS_PV, WHY };
  root.JDJ_DP = apiObj;
  if (typeof module !== 'undefined' && module.exports) module.exports = apiObj;
  if (typeof document !== 'undefined') {
    const go = () => { if (!enabled()) return; style(); fillBest(); fillInvite(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }
})(typeof window !== 'undefined' ? window : globalThis);
