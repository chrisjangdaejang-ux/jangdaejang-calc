/* 집예보 전문가 이름 리포트 (premium/pro/ 편집 · premium/r/ 고객 보기) — 공용 모듈
   - 유료 리포트(assets/premium-report.js)가 그린 화면 위에 전문가 표시 정보·의견을 '덧붙이기'만 합니다.
     집예보가 계산한 숫자·점수·순위·과거 성적·출처 문장은 이 파일이 건드리지 않습니다(고칠 칸 자체가 없음).
   - 섹션(.pr-sec[data-sec])은 넣기/빼기와 순서만 바꿉니다. 각 섹션 위에 '집예보 분석' 표시.
   - 전문가 의견은 '○○ 공인중개사 의견' 상자로 따로 그리고, 글은 텍스트로만(HTML 불가) 넣습니다.
   - 고객 링크: premium/r/#<id>.<토큰> — # 뒤는 서버·통계로 가지 않습니다. 서버에는 토큰 해시만 저장(tools/agent-backend.gs v17).
   node 에서도 불러 검사할 수 있게 순수 함수는 DOM 없이 동작합니다(tools/pro-test.js). */
(function (root) {
  'use strict';
  const SITE = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/';
  const ROLE = {
    agent: { t: '개업공인중개사(대표)', who: '공인중개사' },
    member: { t: '소속공인중개사', who: '공인중개사' },
    pro: { t: '다른 전문가(세무사·대출상담사 등)', who: '전문가' }
  };
  const SECS = [
    { k: 'cmp', t: '한눈에 비교', multi: true },
    { k: 'sum', t: '단지 요약(시세·거래)' },
    { k: 'fv', t: '미래가치 점수 · 오를 이유 · 조심할 점 · 지켜볼 것' },
    { k: 'trend', t: '최근 3년 시세 흐름' },
    { k: 'hz', t: '보유 기간별 미래가치' },
    { k: 'money', t: '대출 · 취득세 · 필요 현금', warn: '고객의 소득·보유 현금 숫자가 함께 보여요' }
  ];
  const SEC_KEYS = SECS.map(s => s.k);
  const DEFAULT_SECS = ['cmp', 'sum', 'fv', 'trend', 'hz'];
  const NOTE_MAX = 800, NOTES_TOTAL = 9000, LOGO_MAX = 45000;
  /* 서버(agent-backend.gs PRO_FAKE)와 같은 규칙: 전문가 글이 집예보가 쓴 것처럼 보이지 않게 */
  const FAKE = /집\s*예\s*보\s*(의\s*)?(분석|의견|공식|인증|보증|추천)|장대장\s*(분석|인증|보증)/;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F<>]/g, ' ').trim().slice(0, n);
  const digits = v => String(v || '').replace(/[^0-9]/g, '');

  /* ---------- 표시 정보 ---------- */
  function cleanProfile(p) {
    p = p && typeof p === 'object' ? p : {};
    return { role: ROLE[p.role] ? p.role : 'agent', office: txt(p.office, 40), ceo: txt(p.ceo, 20), name: txt(p.name, 20), title: txt(p.title, 20),
      reg: txt(p.reg, 30).replace(/[^0-9A-Za-z가-힣-]/g, ''), addr: txt(p.addr, 80), phone: txt(p.phone, 20).replace(/[^0-9-]/g, ''),
      kakao: /^https:\/\/(open|pf)\.kakao\.com\/[^\s"'<>\\`]+$/.test(String(p.kakao || '').trim()) ? String(p.kakao).trim().slice(0, 200) : '',
      logo: /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(String(p.logo || '')) && String(p.logo).length <= LOGO_MAX ? String(p.logo) : '' };
  }
  /* 빠진 칸 안내(서버와 같은 기준). 빈 문자열이면 통과 */
  function profileError(p) {
    const d = digits(p.phone);
    if (!p.office) return p.role === 'pro' ? '소속(사무소·회사) 이름을 적어 주세요.' : '중개사무소 이름을 적어 주세요.';
    if (!(/^0\d{8,10}$/.test(d) || /^1[5-9]\d{6}$/.test(d))) return '연락처(전화번호)를 정확히 적어 주세요.';
    if (p.role !== 'pro') {
      if (digits(p.reg).length < 5) return '중개사무소 등록번호를 적어 주세요. 공인중개사는 등록번호를 꼭 표시해야 해요.';
      if (!p.ceo) return '개업공인중개사(대표) 이름을 적어 주세요.';
      if (!p.addr) return '중개사무소 소재지(주소)를 적어 주세요.';
      if (p.role === 'member' && !p.name) return '소속공인중개사 본인 이름을 적어 주세요.';
    } else if (!p.name) return '이름을 적어 주세요.';
    if ([p.office, p.ceo, p.name, p.title].some(x => FAKE.test(x || ''))) return '이름·소속에는 집예보가 쓴 것처럼 보이는 말을 넣을 수 없어요.';
    return '';
  }
  /* 의견 상자 이름: '홍길동 공인중개사 의견' · '김세무 세무사 의견' */
  function who(p) {
    if (p.role === 'pro') return `${p.name || ''} ${p.title || '전문가'}`.trim();
    return `${(p.role === 'member' ? p.name : p.ceo) || ''} 공인중개사`.trim();
  }
  const opinionLabel = p => who(p) + ' 의견';

  /* ---------- 의견 글 ---------- */
  const NOTE_KEY = /^(summary|closing|cmp|[0-2]\.(sum|trend|fv|hz|money))$/;
  function cleanNotes(n) {
    const out = {}; let total = 0;
    Object.keys(n && typeof n === 'object' ? n : {}).slice(0, 40).forEach(k => {
      if (!NOTE_KEY.test(k)) return;
      const t = String(n[k] == null ? '' : n[k]).replace(/[\u0000-\u0009\u000B-\u001F\u007F<>]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, NOTE_MAX);
      if (t) { out[k] = t; total += t.length; }
    });
    return { notes: out, total };
  }
  function notesError(n) {
    const { notes, total } = cleanNotes(n);
    if (Object.keys(notes).some(k => FAKE.test(notes[k]))) return '의견에는 집예보가 쓴 것처럼 보이는 말(예: 집예보 분석·집예보 의견)을 넣을 수 없어요. 전문가 의견은 전문가 이름으로 따로 표시돼요.';
    if (total > NOTES_TOTAL) return '의견 글이 너무 길어요. 조금 줄여 주세요.';
    return '';
  }
  function cleanSecs(a) {
    const seen = {};
    return (Array.isArray(a) ? a : []).map(String).filter(k => SEC_KEYS.indexOf(k) >= 0 && !seen[k] && (seen[k] = 1));
  }

  /* ---------- 링크 ---------- */
  const linkOf = (id, tk) => SITE + 'premium/r/#' + id + '.' + tk;
  function parseHash(h) {
    const m = /^#?(P[0-9A-F]{11})\.([0-9a-fA-F]{64})$/.exec(String(h || ''));
    return m ? { id: m[1], tk: m[2] } : null;
  }

  /* ---------- 화면 조각 ---------- */
  const nl = t => esc(t).replace(/\n/g, '<br>');
  function noteHtml(p, t, key) {
    return `<aside class="pro-note" data-note="${esc(key)}"><div class="pro-note-h"><span class="pro-pen" aria-hidden="true">✎</span>${esc(opinionLabel(p))}</div>
      <p>${nl(t)}</p><div class="pro-note-f">전문가가 직접 쓴 의견이에요. 위 집예보 분석과 다를 수 있어요.</div></aside>`;
  }
  function telOf(p) { const d = digits(p.phone); return d ? 'tel:' + d : ''; }
  /* 표지 위 전문가 머리말: 로고 · 사무소 · 이름 · 등록번호 · 소재지 · 연락처 · [이 전문가에게 문의하기] */
  function headHtml(p, o) {
    o = o || {};
    const nm = p.role === 'pro' ? `${p.name} ${p.title || ''}`.trim()
      : p.role === 'member' ? `소속공인중개사 ${p.name} · 대표 ${p.ceo}` : `대표 공인중개사 ${p.ceo}`;
    const lines = [
      p.reg ? `${p.role === 'pro' ? '자격·등록번호' : '중개사무소 등록번호'} ${esc(p.reg)}` : '',
      p.addr ? esc(p.addr) : '',
      p.phone ? `전화 ${esc(p.phone)}` : ''
    ].filter(Boolean);
    return `<header class="pro-head">
      <div class="pro-id">${p.logo ? `<img class="pro-logo" src="${p.logo}" alt="${esc(p.office)} 로고">` : `<div class="pro-logo pro-logo0" aria-hidden="true">${esc((p.office || '?').slice(0, 1))}</div>`}
        <div><div class="pro-office">${esc(p.office)}</div><div class="pro-nm">${esc(nm)}</div><div class="pro-sub">${lines.join(' · ')}</div></div></div>
      ${o.noBtn ? '' : `<button type="button" class="pro-ask noprint" data-pro-ask>이 전문가에게 문의하기</button>`}
    </header>`;
  }
  function askSheet(p) {
    const tel = telOf(p), sms = tel ? 'sms:' + digits(p.phone) : '';
    return `<div class="pro-sheet" role="dialog" aria-label="문의하기"><div class="pro-sheet-in">
      <b>${esc(p.office)} · ${esc(who(p))}</b>
      ${tel ? `<a class="btn2 blue" href="${tel}" data-pro-click="call">전화 걸기 (${esc(p.phone)})</a><a class="btn2" href="${sms}" data-pro-click="sms">문자 보내기</a>` : ''}
      ${p.kakao ? `<a class="btn2" href="${esc(p.kakao)}" target="_blank" rel="noopener" data-pro-click="kakao">카카오톡으로 문의하기</a>` : ''}
      <button type="button" class="btn2" data-pro-close>닫기</button>
      <small>문의는 전문가에게 바로 연결돼요. 집예보는 상담·중개 내용을 보지 않아요.</small></div></div>`;
  }
  function coverHtml(p, o) {
    const names = (o.items || []).map(x => x.apt + ' ' + x.band);
    return `<div class="pr-cover pro-cover">
      <span class="tag">${esc(o.client ? o.client + '님께 드리는 단지 분석 리포트' : '고객님께 드리는 단지 분석 리포트')}</span>
      <h1>${names.length > 1 ? '후보 단지 비교 리포트' : esc((o.items && o.items[0] ? o.items[0].apt : '단지') + ' 분석 리포트')}</h1>
      <div class="pr-meta">보낸 분 ${esc(p.office)} ${esc(who(p))}${o.created ? ` · 보낸 날 ${esc(o.created)}` : ''}${o.expires ? ` · ${esc(o.expires)}까지 볼 수 있어요` : ''}${o.dataTo ? ` · 실거래 자료 ${esc(o.dataTo)}까지 반영` : ''}</div>
      ${names.length > 1 ? `<div class="pr-meta">${esc(names.join(' · '))}</div>` : ''}
    </div>`;
  }
  function footHtml(o) {
    o = o || {};
    return `<footer class="pro-src">
      ${o.refresh ? `<p>숫자(시세·점수·순위·대출)는 링크를 열 때마다 최신 공개 자료로 다시 계산해요. 전문가 의견은 보낸 날 기준이에요.</p>` : ''}
      <p><b>데이터·분석: 집예보</b> · 국토교통부 실거래가 등 공공 자료 기반 · 집예보가 계산한 숫자·점수·순위는 전문가가 고칠 수 없어요. 전문가 의견 상자만 전문가가 쓴 글이에요.</p>
      <p>집예보는 이 전문가의 중개·상담에 관여하지 않아요. <a href="${SITE}?utm_source=pro">집예보 둘러보기</a></p>
    </footer>`;
  }
  const ym6 = v => /^\d{6}$/.test(String(v || '')) ? String(v).slice(0, 4) + '년 ' + parseInt(String(v).slice(4), 10) + '월' : '';

  /* ---------- 그린 리포트에 덧붙이기(여러 번 불러도 같은 결과) ---------- */
  function apply(box, cfg) {
    const p = cfg.profile, secs = cleanSecs(cfg.secs), notes = cleanNotes(cfg.notes).notes, edit = !!cfg.edit;
    box.querySelectorAll('.pro-note,.pro-lock,.pro-gap').forEach(e => e.remove());
    box.classList.add('pro-on');
    const lock = () => `<div class="pro-lock">집예보 분석${edit ? ' · 숫자는 고칠 수 없어요' : ''}</div>`;
    const ins = (el, key) => { if (notes[key]) el.insertAdjacentHTML('afterend', noteHtml(p, notes[key], key)); };
    const cmp = box.querySelector('.pr-sec[data-sec="cmp"]');
    if (cmp) { cmp.hidden = secs.indexOf('cmp') < 0; if (!cmp.hidden) { cmp.insertAdjacentHTML('afterbegin', lock()); ins(cmp, 'cmp'); } }
    box.querySelectorAll('.pr-unit[id^="u"]').forEach(u => {
      const i = +u.id.slice(1), all = {};
      u.querySelectorAll(':scope > .pr-sec').forEach(s => { all[s.dataset.sec] = s; });
      /* 순서: 고른 것 차례대로, 안 고른 것은 뒤로 숨김 */
      const order = secs.filter(k => all[k]).concat(Object.keys(all).filter(k => secs.indexOf(k) < 0));
      order.forEach(k => { const s = all[k]; u.appendChild(s); s.hidden = secs.indexOf(k) < 0; });
      order.forEach(k => { const s = all[k]; if (s.hidden) return; s.insertAdjacentHTML('afterbegin', lock()); ins(s, i + '.' + k); });
      const vis = order.filter(k => !all[k].hidden);
      u.hidden = !vis.length;
    });
    box.querySelectorAll('.pr-soon').forEach(e => { e.hidden = true; });
    box.querySelectorAll('.pr-cond,.pr-condp').forEach(e => { e.hidden = secs.indexOf('money') < 0; });
    const cov = box.querySelector('.pr-cover');
    if (cov && notes.summary) cov.insertAdjacentHTML('afterend', noteHtml(p, notes.summary, 'summary'));
    const disc = box.querySelector('.pr-disc');
    if (disc && notes.closing) disc.insertAdjacentHTML('beforebegin', noteHtml(p, notes.closing, 'closing'));
  }

  /* ---------- 로고: 브라우저에서 줄여 작은 이미지로(서버엔 작은 크기만) ---------- */
  function shrinkLogo(file) {
    return new Promise((ok, no) => {
      if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return no(new Error('PNG·JPG 이미지 파일을 골라 주세요.'));
      if (file.size > 8 * 1024 * 1024) return no(new Error('8MB보다 작은 이미지를 골라 주세요.'));
      const fr = new FileReader();
      fr.onerror = () => no(new Error('이미지를 읽지 못했어요.'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => no(new Error('이미지를 읽지 못했어요.'));
        im.onload = () => {
          let W = 360, Hh = 144;
          for (let n = 0; n < 6; n++) {
            const k = Math.min(1, W / im.width, Hh / im.height), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d');
            let url = '';
            if (file.type === 'image/png' || file.type === 'image/gif') { g.drawImage(im, 0, 0, w, h); url = c.toDataURL('image/png'); }
            if (!url || url.length > LOGO_MAX - 1000) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h); url = c.toDataURL('image/jpeg', n < 3 ? 0.86 : 0.72); }
            if (url.length <= LOGO_MAX - 1000) return ok(url);
            W = Math.round(W * 0.8); Hh = Math.round(Hh * 0.8);
          }
          no(new Error('로고 이미지를 충분히 줄이지 못했어요. 더 단순한 이미지를 올려 주세요.'));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- 카카오톡 보내기: 카카오 공유(미리보기 카드) → 휴대폰 공유창 → 링크 복사 ---------- */
  const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.5/kakao.min.js', SRI = 'sha384-v6JKY3z4FUkWq21oZDHZe74YvuPk/WUrVLrDHTBojHXClOSa3iXy7sCXPY1jkFbj';
  let sdkP = null;
  function kakaoSdk() {
    const key = String((root.JDJ_SITE || {}).KAKAO_JS_KEY || '').trim();   // assets/config.js
    if (!key) return Promise.reject(new Error('nokey'));
    if (root.Kakao) { if (!root.Kakao.isInitialized()) root.Kakao.init(key); return Promise.resolve(root.Kakao); }
    if (!sdkP) sdkP = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = SDK; s.integrity = SRI; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = () => { if (!root.Kakao) return no(new Error('sdk')); if (!root.Kakao.isInitialized()) root.Kakao.init(key); ok(root.Kakao); };
      s.onerror = () => { sdkP = null; no(new Error('sdk')); };
      document.head.appendChild(s);
    });
    return sdkP;
  }
  async function copy(url) {
    try { await navigator.clipboard.writeText(url); return true; } catch (e) {
      try { const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); const r = document.execCommand('copy'); t.remove(); return r; } catch (x) { return false; }
    }
  }
  async function share(o) {
    try {
      const K = await kakaoSdk();
      K.Share.sendDefault({ objectType: 'feed',
        content: { title: o.title, description: o.desc, imageUrl: SITE + 'assets/og/premium.png', imageWidth: 1200, imageHeight: 630, link: { mobileWebUrl: o.url, webUrl: o.url } },
        buttons: [{ title: '리포트 보기', link: { mobileWebUrl: o.url, webUrl: o.url } }] });
      return 'kakao';
    } catch (e) {}
    if (navigator.share) { try { await navigator.share({ title: o.title, text: o.desc, url: o.url }); return 'share'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; } }
    return (await copy(o.url)) ? 'copy' : 'fail';
  }

  const API = { ROLE, SECS, SEC_KEYS, DEFAULT_SECS, NOTE_MAX, LOGO_MAX, FAKE, esc, cleanProfile, profileError, cleanNotes, notesError, cleanSecs,
    who, opinionLabel, linkOf, parseHash, noteHtml, headHtml, askSheet, coverHtml, footHtml, apply, shrinkLogo, share, copy, kakaoSdk, ym6, telOf };
  root.JDJ_PRO = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
