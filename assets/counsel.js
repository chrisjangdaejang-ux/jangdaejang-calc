/* 고민 상담 · 하트 — 공용 화면 도구(window.JDJ_CS)
   - 지금은 숨김: assets/config.js COUNSEL_ENABLED · HEART_ENABLED 가 false 면 어떤 화면에도 칸·링크가 나오지 않고 counsel/ 은 '준비 중'만 보여요.
     운영자 미리 보기 = counsel/admin/ 에서 [이 기기에서 미리 보기 켜기]를 누른 기기(모닝 브리핑 운영자 모드 계정으로 카카오 간편 로그인) + 주소에 ?preview=counsel.
     서버(tools/agent-backend.gs '고민 상담·하트' 칸)도 운영자 계정만 받아 줘요.
   - 규칙(분류·전문가 종류·하트 값·환불 계산)은 assets/counsel-core.js(서버와 같은 글자).
   - 결제 버튼은 HEART_ENABLED 와 PAID_OPEN 이 모두 켜졌을 때만 나와요(서버도 같은 잠금). */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const LS_PV = 'jdj_cs_preview', SS_PV = 'jdj_cs_pv', LS_AUTH = 'jdj_auth';
  const CFG = () => root.JDJ_SITE || {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const site = () => String(CFG().SITE_NAME || '').trim();
  const api = () => (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || '';
  const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';

  /* ---------- 켜짐 확인 ---------- */
  function sess() { try { const j = JSON.parse(ls.get(LS_AUTH) || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function preview() {
    if (typeof location === 'undefined') return false;
    if (ls.get(LS_PV) !== '1' || !sess()) { ss.del(SS_PV); return false; }
    if (/[?&]preview=counsel(&|$)/.test(location.search)) { ss.set(SS_PV, '1'); return true; }
    return ss.get(SS_PV) === '1';
  }
  function enabled() { return CFG().COUNSEL_ENABLED === true || preview(); }
  function heartOn() { return enabled() && (CFG().HEART_ENABLED === true || preview()); }
  function payOn() { return heartOn() && CFG().PAID_OPEN === true; }
  /** 미리 보기 중이면 안쪽 링크에 ?preview=counsel 을 붙여 다음 화면에서도 이어지게 */
  function link(path) { const pv = preview() && CFG().COUNSEL_ENABLED !== true; return JB.SITE + path + (pv ? (path.indexOf('?') < 0 ? '?' : '&') + 'preview=counsel' : ''); }

  /* ---------- 서버 ---------- */
  function post(body) {
    if (!api()) return Promise.reject(new Error('서버가 아직 연결되지 않았어요.'));
    const b = Object.assign({}, body), s = sess();
    if (s && !b.s) b.s = s;
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) })
      .then(r => r.json()).then(j => {
        if (j && j.err === 'unknown') { const e = new Error('준비 중이에요. 조금만 기다려 주세요.'); e.code = 'unknown'; throw e; }
        if (j && j.code === 'auth') { try { localStorage.removeItem(LS_AUTH); } catch (e) {} }
        if (!j || !j.ok) { const t = (j && j.err) || ''; const e = new Error(/[가-힣]/.test(t) ? t : '잠시 뒤 다시 시도해 주세요. 계속되면 카카오톡 상담으로 알려 주세요.'); e.raw = t; e.code = (j && j.code) || ''; throw e; }
        return j;
      }, e => { if (e && e.code) throw e; throw new Error('인터넷 연결을 확인하고 잠시 뒤 다시 시도해 주세요.'); });
  }
  const loggedIn = () => !!(root.JDJ_AUTH && root.JDJ_AUTH.user && root.JDJ_AUTH.user());
  const loginOn = () => !!(root.JDJ_AUTH && root.JDJ_AUTH.on && root.JDJ_AUTH.on());
  /** 로그인 안내 상자(로그인 기능이 꺼져 있으면 안내 글만) */
  function loginBox(what) {
    return loginOn() && root.JDJ_AUTH.gate
      ? root.JDJ_AUTH.gate(`${esc(what)}는 카카오 간편 로그인 뒤에 할 수 있어요. 화면에는 닉네임 대신 '익명' 별명으로 보여요.`, '카카오 간편 로그인', 'counsel')
      : '<p class="cs-note">로그인 기능을 준비하고 있어요.</p>';
  }
  function soonHtml() {
    return `<div class="cs-soon"><h1>준비 중이에요</h1><p>이 화면은 아직 열지 않았어요. 조금만 기다려 주세요.</p><a href="${esc(JB.SITE)}">홈으로 가기</a></div>`;
  }
  function pvTag() { return preview() && CFG().COUNSEL_ENABLED !== true ? '<span class="cs-tag pv">운영자 미리 보기</span>' : ''; }

  /* ---------- 모양(기존 화면 색·둥근 모서리와 같게) ---------- */
  const CSS = `.cs-wrap{max-width:1040px;margin:0 auto;padding:22px 16px 64px}
.cs-wrap h1{font-size:clamp(26px,6.4vw,34px);margin:4px 0 6px;letter-spacing:-.6px;word-break:keep-all;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cs-lead{margin:0 0 16px;font-size:16px;color:var(--sub2,#4E5968);line-height:1.6;word-break:keep-all}
.cs-grid{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
.cs-grid>*{min-width:0}
@media(min-width:920px){.cs-grid{grid-template-columns:minmax(0,1fr) 300px;align-items:start}.cs-side{position:sticky;top:76px}}
.cs-tag{display:inline-flex;align-items:center;font-size:12.5px;font-weight:800;border-radius:999px;padding:2px 9px;background:var(--blue-l,#E8F0FF);color:var(--blue,#2560E8);white-space:nowrap;letter-spacing:0}
.cs-tag.pv{background:#FFF4E0;color:#9A5B00}
.cs-tag.ok{background:#E6F5EE;color:#0E7A4F}
.cs-tag.team{background:#EEF0FF;color:#4338CA}
.cs-tag.up{background:#FFF4E0;color:#9A5B00}
.cs-tag.gray{background:var(--gray,#F2F4F6);color:var(--sub,#3E4754)}
.cs-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;margin:0 0 6px;scrollbar-width:none}
.cs-chips::-webkit-scrollbar{display:none}
@media(min-width:700px){.cs-chips{flex-wrap:wrap;overflow:visible}}
.cs-chip{flex:none;font:inherit;font-size:14.5px;font-weight:700;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#E5E8EB);background:#fff;color:var(--sub,#3E4754);cursor:pointer;white-space:nowrap}
.cs-chip[aria-pressed="true"]{background:var(--text,#191F28);border-color:var(--text,#191F28);color:#fff}
.cs-list{display:grid;gap:10px}
.cs-item{display:block;border:1px solid var(--line,#E5E8EB);border-radius:16px;padding:14px 16px;background:#fff;text-decoration:none;color:inherit;min-width:0;transition:border-color .15s}
.cs-item:hover{border-color:var(--blue,#2560E8)}
.cs-item .cs-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;color:var(--sub2,#4E5968)}
.cs-item h3{margin:6px 0 4px;font-size:17px;font-weight:800;line-height:1.45;word-break:keep-all;overflow-wrap:anywhere}
.cs-item p{margin:0;font-size:14.5px;color:var(--sub2,#4E5968);line-height:1.55;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.cs-item .cs-n{margin-left:auto;font-weight:800;color:var(--blue,#2560E8);white-space:nowrap}
.cs-panel{border:1px solid var(--line,#E5E8EB);border-radius:18px;padding:16px;background:#fff;min-width:0}
.cs-panel+.cs-panel{margin-top:12px}
.cs-panel h2{font-size:17px;font-weight:900;margin:0 0 6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cs-panel p,.cs-panel li{font-size:14.5px;color:var(--sub,#3E4754);line-height:1.6;word-break:keep-all}
.cs-panel ul{margin:6px 0 0;padding-left:18px}
.cs-cream{background:var(--creamc,#FBF8EF);border-color:var(--creamb,#EFE6CC)}
.cs-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-size:15.5px;font-weight:800;min-height:48px;padding:0 18px;border-radius:14px;border:1px solid var(--blue,#2560E8);background:var(--blue,#2560E8);color:#fff;cursor:pointer;text-decoration:none;white-space:nowrap}
.cs-btn.sub{background:#fff;color:var(--blue,#2560E8)}
.cs-btn.ghost{background:#fff;border-color:var(--line,#E5E8EB);color:var(--sub,#3E4754)}
.cs-btn.full{width:100%}
.cs-btn[disabled]{opacity:.55;cursor:default}
.cs-acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.cs-lnk{font:inherit;font-size:13px;font-weight:700;color:var(--sub2,#4E5968);background:#fff;border:1px solid var(--line,#E5E8EB);border-radius:999px;min-height:34px;padding:0 12px;cursor:pointer}
.cs-lnk:hover{border-color:var(--sub2,#4E5968)}
.cs-q{border-radius:20px;background:var(--creamc,#FBF8EF);border:1px solid var(--creamb,#EFE6CC);padding:18px}
.cs-q h1{font-size:clamp(22px,5.6vw,28px);margin:6px 0 10px}
.cs-body{font-size:16px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;word-break:keep-all;margin:0}
.cs-ans{border:1px solid var(--line,#E5E8EB);border-radius:18px;padding:16px;background:#fff;min-width:0}
.cs-ans.team{border-color:#C7CBF5;background:#FAFAFF}
.cs-ans .cs-who{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px}
.cs-ans .cs-who b{font-size:16px;font-weight:900}
.cs-ans .cs-who small{font-size:13.5px;color:var(--sub2,#4E5968)}
.cs-ans .cs-who .cs-dt{margin-left:auto;font-size:13px;color:var(--sub2,#4E5968);white-space:nowrap}
.cs-form{display:grid;gap:12px;min-width:0}
.cs-form>*{min-width:0}
.cs-form label,.cs-lab{font-size:14.5px;font-weight:800;color:var(--text,#191F28)}
.cs-inp{width:100%;font:inherit;font-size:16px;border:1px solid var(--line,#E5E8EB);border-radius:12px;padding:12px;background:#fff;color:var(--text,#191F28);box-sizing:border-box}
textarea.cs-inp{min-height:150px;resize:vertical;line-height:1.6}
.cs-inp:focus{outline:0;border-color:var(--blue,#2560E8);box-shadow:0 0 0 3px rgba(47,107,255,.15)}
.cs-cnt{font-size:12.5px;color:var(--sub2,#4E5968);text-align:right;margin-top:3px;font-variant-numeric:tabular-nums}
.cs-help{font-size:13.5px;color:var(--sub2,#4E5968);line-height:1.55;margin:4px 0 0}
.cs-opt{display:grid;gap:8px}
@media(min-width:700px){.cs-opt{grid-template-columns:repeat(3,minmax(0,1fr))}}
.cs-opt label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line,#E5E8EB);border-radius:14px;padding:12px;cursor:pointer;font-weight:700;background:#fff}
.cs-opt label:has(input:checked){border-color:var(--blue,#2560E8);background:var(--blue-l,#E8F0FF)}
.cs-opt input{margin-top:3px;width:18px;height:18px;flex:none}
.cs-opt small{display:block;font-weight:500;color:var(--sub2,#4E5968);font-size:13px;margin-top:2px;line-height:1.45}
.cs-check{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.55;color:var(--sub,#3E4754);font-weight:500}
.cs-check input{width:20px;height:20px;flex:none;margin-top:1px}
.cs-msg{margin:8px 0 0;font-size:14.5px;line-height:1.55}.cs-msg.err{color:#C2410C}.cs-msg.ok{color:#0E7A4F}
.cs-note{margin:10px 0 0;padding:12px 14px;border-radius:14px;background:var(--gray2,#F9FAFB);border:1px solid var(--line,#E5E8EB);font-size:14px;line-height:1.6;color:var(--sub,#3E4754)}
.cs-note.warn{background:#FFF8EC;border-color:#F5DEB3;color:#7A4B00}
.cs-empty{padding:22px 16px;border-radius:16px;border:1px dashed var(--line,#E5E8EB);text-align:center;color:var(--sub,#3E4754);font-size:15px;line-height:1.6}
.cs-soon{margin:18px 0;padding:28px 18px;border-radius:18px;border:1px dashed var(--line,#E5E8EB);text-align:center;line-height:1.7}
.cs-soon h1{font-size:24px;margin:0 0 6px;display:block}
.cs-soon p{margin:0 0 14px;color:var(--sub,#3E4754);font-size:15.5px}
.cs-soon a{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 16px;border-radius:12px;background:var(--blue-l,#E8F0FF);color:var(--blue,#2560E8);font-weight:800;text-decoration:none}
.cs-heart{display:inline-flex;align-items:center;gap:4px;font-weight:900;color:#D6336C;white-space:nowrap}
.cs-heart::before{content:'♥'}
.cs-pros{display:grid;gap:8px;margin-top:6px}
.cs-pro{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line,#E5E8EB);border-radius:14px;padding:10px 12px;cursor:pointer;background:#fff}
.cs-pro:has(input:checked){border-color:var(--blue,#2560E8);background:var(--blue-l,#E8F0FF)}
.cs-pro b{font-size:15px}.cs-pro small{display:block;color:var(--sub2,#4E5968);font-size:13px;line-height:1.45}
.cs-rep{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line,#E5E8EB)}
.cs-video{display:flex;align-items:center;gap:8px;margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid var(--creamb,#EFE6CC);font-size:14.5px;font-weight:700;text-decoration:none;color:var(--text,#191F28)}
.cs-video::before{content:'▶';color:#E03131}
.cs-table{width:100%;border-collapse:collapse;font-size:14.5px}
.cs-table th,.cs-table td{padding:10px 6px;border-bottom:1px solid var(--line2,#F0F1F3);text-align:left;vertical-align:top}
.cs-table th{font-size:13px;color:var(--sub2,#4E5968);font-weight:700}
.cs-table td.r,.cs-table th.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}`;
  function style() {
    if (typeof document === 'undefined' || document.getElementById('csCss')) return;
    const s = document.createElement('style'); s.id = 'csCss'; s.textContent = CSS; document.head.appendChild(s);
  }
  /** 안내 글(실패는 role=alert, 화면 밖이면 그 자리로만 스크롤 — assets/savefb.js 가 있을 때) */
  function msg(el, t, ok) {
    if (!el) return;
    el.className = 'cs-msg ' + (ok ? 'ok' : 'err'); el.textContent = t; el.setAttribute('role', ok ? 'status' : 'alert');
    if (root.JDJ_SAVEFB) root.JDJ_SAVEFB.reveal(el);
  }
  /** 전문가 이름표(확인된 전문가 배지 · 종류 · 이름 · 소속) */
  function whoHtml(w) {
    if (!w) return '';
    if (w.kind === 'team') return `<span class="cs-tag team">공식 답변</span><b>${esc(w.name || (site() + ' 상담팀'))}</b>`;
    return `<span class="cs-tag ok">✓ 확인된 전문가</span><b>${esc(w.name || '')}</b><small>${esc([w.kn, w.org].filter(Boolean).join(' · '))}</small>`;
  }
  const LOAN_NOTE = '대출 질문에는 금융위원회에 등록된 대출모집인(대출상담사)만 답할 수 있어요. 대출을 권유하며 수수료를 요구하면 불법이니 응하지 마세요.';
  const PI_NOTE = '전화번호·주민등록번호처럼 보이는 숫자는 올릴 때 저절로 가려져요. 이름·주소·동·호수도 적지 말아 주세요.';
  const WHY = [['abuse', '욕설·비방'], ['pi', '개인 정보'], ['ad', '광고·홍보'], ['false', '사실이 아닌 내용'], ['illegal', '불법·무자격 영업'], ['etc', '기타']];

  root.JDJ_CS = { LS_PV, SS_PV, enabled, heartOn, payOn, preview, link, post, esc, won, site, loggedIn, loginOn, loginBox, soonHtml, pvTag, style, msg, whoHtml, sess, LOAN_NOTE, PI_NOTE, WHY, JB };
})(typeof window !== 'undefined' ? window : this);
