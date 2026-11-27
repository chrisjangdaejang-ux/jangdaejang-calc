/* 집예보 분양 상담 연결 — 손님 화면(window.JDJ_LEADS)
   - 광고 카드의 [상담 받기] → ① 동의 화면(어느 현장·누구에게·무엇이 가는지·보관 기간·거두는 법) → ② 카카오 간편 로그인 + 휴대폰 인증번호 → ③ 희망 시간(선택) → 보냄.
     [현장에 먼저 물어보기]는 ① 대화 열기(고민 상담 1:1 채팅, 연락처는 가지 않음).
   - 상담 준비 정도 등급(A·B·C)은 이 기기에서 계산해요(assets/leads-core.js ldGrade). 서버에는 '맞음/아님' 꼬리표와 손님이 고른 항목만 가고,
     예산·가점 같은 값 자체는 손님이 그 항목을 고른 때만 구간 이름으로, 금액은 '매수 가능 금액'을 따로 고른 때만 가요.
   - 켜짐: assets/config.js LEADS_ENABLED === true, 또는 대표 미리 보기(?preview=leads — 서버로 보내지 않는 '예시 흐름', ?preview=leads-live 는 운영자 계정으로 실제 서버).
     꺼져 있으면 아무것도 그리지 않아요. 시험: node tools/leads-test.js </dev/null */
(function (root) {
  'use strict';
  if (typeof document === 'undefined') return;
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  var C = root.JDJ_LDCORE; if (!C) return;
  var PV = 'jdj_leads_pv';
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } } };
  if (/[?&]preview=leads(&|$)/.test(location.search)) ls.set(PV, 'demo');
  if (/[?&]preview=leads-live(&|$)/.test(location.search)) ls.set(PV, 'live');
  if (/[?&]preview=off(&|$)/.test(location.search)) ls.del(PV);
  var CFG = function () { return root.JDJ_SITE || {}; };
  function on() { return CFG().LEADS_ENABLED === true || !!ls.get(PV); }
  function demo() { return CFG().LEADS_ENABLED !== true && ls.get(PV) === 'demo'; }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var api = function () { return (root.JDJ_AGENTS && root.JDJ_AGENTS.api) || ''; };
  function sess() { try { var j = JSON.parse(ls.get('jdj_auth') || 'null'); return j && /^[0-9a-f]{64}$/.test(String(j.s || '')) ? j.s : ''; } catch (e) { return ''; } }
  function post(body) {
    if (demo()) return new Promise(function (r) { setTimeout(function () { r(fake(body)); }, 250); });
    if (!api()) return Promise.reject(new Error('서버가 아직 연결되지 않았어요.'));
    var b = Object.assign({ s: sess() }, body);
    return fetch(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { var e = new Error(j && /[가-힣]/.test(j.err || '') ? j.err : '잠시 뒤 다시 해 주세요.'); e.code = (j && j.code) || ''; throw e; }
      return j;
    });
  }
  /* 미리 보기: 서버 없이 같은 모양으로 답함(아무것도 저장·발송하지 않음) */
  function fake(b) {
    if (b.action === 'leadOtp') return { ok: true, sent: true, min: C.RULES.otpMin, demo: true };
    if (b.action === 'leadVerify') return { ok: true, vt: 'demo' };
    if (b.action === 'leadSubmit') return { ok: true, id: 'L-EXAMPLE', grade: b._grade || 'B', dup: false };
    if (b.action === 'leadChat') return { ok: true, room: '', hearts: C.PRICE.chat.hearts };
    return { ok: true };
  }
  var track = function (n, p) { try { if (root.JDJ && root.JDJ.track) root.JDJ.track(n, p || {}); } catch (e) {} };

  /* ---------- 이 기기의 신호(서버로 보내지 않음) ---------- */
  var BANDS = { '~3억': [0, 30000], '3~6억': [30000, 60000], '6~9억': [60000, 90000], '9~12억': [90000, 120000], '12~15억': [120000, 150000], '15억~': [150000, 1e7] };
  function views(id, add) {
    var m = {}; try { m = JSON.parse(ls.get('jdj_ld_views') || '{}') || {}; } catch (e) {}
    if (add) { m[id] = (m[id] || 0) + 1; ls.set('jdj_ld_views', JSON.stringify(m)); }
    return m[id] || 0;
  }
  /** ad = { id, name, co, sido, sgg, code, pmin, pmax(만원), cy:[가점 구간] } → 이 기기 신호와 보여 줄 값 */
  function signals(ad) {
    var ctx = {}; try { ctx = JSON.parse(ss.get('jdj_adp_ctx') || 'null') || {}; } catch (e) {}
    var home = null; try { home = JSON.parse(ls.get('jdj_home_region') || 'null'); } catch (e) {}
    var amt = 0; try { amt = +(JSON.parse(ss.get('jdj_ld_amt') || 'null') || 0); } catch (e) {}
    var cyA = null; try { cyA = JSON.parse(ls.get('jdj_cy') || 'null'); } catch (e) {}
    var b = BANDS[ctx.budget], code = ad.code || '', hg = home && /^\d{5}$/.test(home.g || '') ? home.g : '';
    return {
      budgetBand: ctx.budget || '', budget: b ? C.budgetFit(b[0], b[1], ad.pmin, ad.pmax) : '',
      noHome: typeof ctx.noHome === 'boolean' ? ctx.noHome : null,
      cyBand: ctx.cy || '', cy: ctx.cy && (ad.cy || []).length ? ((ad.cy || []).indexOf(ctx.cy) >= 0 ? 'fit' : 'no') : '',
      live: hg && code ? (hg === code ? 'sgg' : hg.slice(0, 2) === code.slice(0, 2) ? 'sido' : '') : '', liveName: (home && home.n) || '',
      views: views(ad.id), plan: !!(ctx.budget || (cyA && typeof cyA === 'object')), amount: amt > 0 ? Math.round(amt) : 0
    };
  }

  /* ---------- 모양 ---------- */
  var CSS = '.jlx-bg{position:fixed;inset:0;z-index:3000;background:rgba(17,24,39,.45);display:flex;align-items:flex-end;justify-content:center}'
    + '.jlx{box-sizing:border-box;width:100%;max-width:560px;max-height:92vh;overflow:auto;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font-size:15px;color:#111827;line-height:1.55;-webkit-overflow-scrolling:touch}'
    + '.jlx *{box-sizing:border-box}.jlx h2{font-size:19px;letter-spacing:-.4px;margin:4px 0 2px;line-height:1.35;word-break:keep-all}.jlx .sub{font-size:13.5px;color:#6B7280;margin:0 0 10px;word-break:keep-all}'
    + '.jlx-top{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#6B7280}.jlx-tag{font-size:12px;font-weight:800;padding:3px 6px;border-radius:5px;background:#374151;color:#fff}.jlx-ex{background:#FFF1D6;color:#8A5A00;border:1px solid #F1C982}'
    + '.jlx-x{margin-left:auto;width:40px;height:40px;border:0;background:none;font-size:22px;color:#6B7280;cursor:pointer}'
    + '.jlx-steps{display:flex;gap:4px;margin:6px 0 10px}.jlx-steps i{flex:1;height:4px;border-radius:2px;background:#E5E7EB}.jlx-steps i.on{background:#1D4ED8}'
    + '.jlx-box{border:1px solid #E5E7EB;border-radius:14px;padding:12px 14px;margin:10px 0}.jlx-box h3{font-size:14.5px;margin:0 0 6px}.jlx-k{font-size:13px;color:#6B7280}'
    + '.jlx-to{font-size:16px;font-weight:800}.jlx-ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}'
    + '.jlx-ul li label{display:flex;gap:10px;align-items:flex-start;min-height:40px;padding:6px 0;cursor:pointer;word-break:keep-all}.jlx-ul input{width:20px;height:20px;flex:none;margin-top:1px;accent-color:#1D4ED8}'
    + '.jlx-ul .v{display:block;font-size:13px;color:#1D4ED8;font-weight:700}.jlx-ul .lk{color:#6B7280;font-size:12.5px}'
    + '.jlx-gr{display:flex;align-items:center;gap:12px}.jlx-gr b{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;font-size:24px;font-weight:900;background:#EAF1FF;color:#1D4ED8;flex:none}'
    + '.jlx-gr b.C{background:#F3F4F6;color:#4B5563}.jlx-gr b.A{background:#1D4ED8;color:#fff}.jlx-why{margin:8px 0 0;padding-left:18px;font-size:13px;color:#4B5563}'
    + '.jlx-txt{font-size:12.5px;color:#4B5563;background:#F9FAFB;border-radius:10px;padding:10px 12px;margin:8px 0;word-break:keep-all}'
    + '.jlx-ag{display:flex;gap:10px;align-items:flex-start;font-weight:800;min-height:44px;padding:6px 0;cursor:pointer;word-break:keep-all}.jlx-ag input{width:22px;height:22px;flex:none;accent-color:#1D4ED8}'
    + '.jlx-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:52px;border-radius:14px;border:0;background:#1D4ED8;color:#fff;font:inherit;font-size:16px;font-weight:800;cursor:pointer;margin-top:10px}'
    + '.jlx-btn[disabled]{background:#9CA3AF;cursor:not-allowed}.jlx-btn.s{background:#fff;color:#111827;border:1px solid #D1D5DB}'
    + '.jlx-in{width:100%;min-height:48px;border:1px solid #D1D5DB;border-radius:12px;padding:0 12px;font:inherit;font-size:16px;margin-top:4px}.jlx-ta{min-height:84px;padding:10px 12px;resize:vertical}'
    + '.jlx-lab{display:block;font-size:13.5px;font-weight:700;margin-top:12px}.jlx-row{display:flex;gap:8px}.jlx-row .jlx-in{flex:1}.jlx-row .jlx-btn{width:auto;flex:none;padding:0 14px;margin-top:4px;min-height:48px;font-size:14.5px}'
    + '.jlx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.jlx-chips button{min-height:40px;padding:0 12px;border:1px solid #D1D5DB;border-radius:999px;background:#fff;font:inherit;font-size:14px;cursor:pointer}'
    + '.jlx-chips button[aria-pressed="true"]{border-color:#1D4ED8;background:#EAF1FF;color:#1D4ED8;font-weight:800}'
    + '.jlx-msg{font-size:13.5px;margin:8px 0 0;color:#B42318}.jlx-msg.ok{color:#0E7A4F}.jlx-note{font-size:12.5px;color:#6B7280;margin:8px 0 0;word-break:keep-all}'
    + '.jlx-lnk{background:none;border:0;padding:0;color:#1D4ED8;font:inherit;font-size:14px;font-weight:700;cursor:pointer;text-decoration:underline;min-height:40px}'
    + '.jlx-done{text-align:center;padding:10px 0}.jlx-done .big{font-size:42px;line-height:1;color:#0E7A4F;font-weight:900}'
    + '@media(min-width:720px){.jlx-bg{align-items:center}.jlx{border-radius:20px;padding:22px 24px}}';
  function style() { if (document.getElementById('jlxCss')) return; var st = document.createElement('style'); st.id = 'jlxCss'; st.textContent = CSS; document.head.appendChild(st); }

  var GRADE_TXT = { A: '상담 준비가 많이 된 신청이에요', B: '상담 준비가 된 신청이에요', C: '알아보는 단계의 신청이에요' };
  function gradeWhy(s, use) {
    if (!use) return ['등급 계산에 이 기기 정보를 쓰지 않기로 하셨어요(휴대폰 확인·희망 시간만 봐요).'];
    var w = [];
    if (s.budget === 'fit') w.push('이 기기에서 계산한 예산 구간이 분양가 범위에 맞아요'); else if (s.budget === 'near') w.push('예산 구간이 분양가에 조금 모자라요'); else if (s.budget === 'no') w.push('예산 구간이 분양가 범위와 달라요');
    if (s.noHome === true) w.push('무주택으로 고르셨어요');
    if (s.cy === 'fit') w.push('청약 가점 구간이 광고 조건에 맞아요');
    if (s.live === 'sgg') w.push('사는 곳이 현장과 같은 시·군·구예요'); else if (s.live === 'sido') w.push('사는 곳이 현장과 같은 시·도예요');
    if (s.views >= 3) w.push('이 현장 정보를 여러 번 보셨어요');
    if (s.plan) w.push('이 기기에 자금 계산 기록이 있어요');
    return w.length ? w : ['이 기기에 계산 기록이 없어 기본 등급으로 봐요'];
  }
  function sigFor(s, use, time) {
    return use ? { verified: true, budget: s.budget, noHome: s.noHome === true, cy: s.cy, live: s.live, views: s.views, plan: s.plan, time: !!time } : { verified: true, time: !!time };
  }

  /* ---------- 흐름 ---------- */
  var st = null;
  function close() { var bg = document.getElementById('jlxBg'); if (bg) bg.remove(); document.removeEventListener('keydown', onKey); st = null; }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open(ad) {
    if (!on() || !ad || !ad.id) return false;
    style(); views(ad.id, true);
    st = { ad: ad, step: 1, s: signals(ad), use: true, f: {}, time: '', memo: '', name: '', phone: '', vt: '', sent: false };
    C.FIELDS.forEach(function (f) { if (!f.need) st.f[f.k] = !!f.def; });
    if (!st.s.amount) st.f.amount = false;
    var bg = document.createElement('div'); bg.className = 'jlx-bg'; bg.id = 'jlxBg';
    bg.innerHTML = '<div class="jlx" role="dialog" aria-modal="true" aria-labelledby="jlxH"></div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    document.body.appendChild(bg); document.addEventListener('keydown', onKey);
    paint(); track('lead_open', { step: 'consent' });
    return true;
  }
  function head(n) {
    var a = st.ad;
    return '<div class="jlx-top"><span class="jlx-tag">광고</span>' + (a.example || demo() ? '<span class="jlx-tag jlx-ex">예시</span>' : '') + '<span>' + esc(a.co) + '</span><button type="button" class="jlx-x" data-x aria-label="닫기">×</button></div>'
      + (n ? '<div class="jlx-steps" aria-label="' + n + '/3 단계">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= n ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '');
  }
  function val(k) {
    var s = st.s;
    if (k === 'budget') return s.budgetBand ? '예산 구간 ' + s.budgetBand : '';
    if (k === 'noHome') return s.noHome == null ? '' : s.noHome ? '무주택' : '집이 있어요';
    if (k === 'cy') return s.cyBand ? '가점 ' + s.cyBand : '';
    if (k === 'live') return s.liveName || '';
    if (k === 'amount') return s.amount ? (s.amount >= 10000 ? (s.amount / 10000).toFixed(1).replace(/\.0$/, '') + '억 원' : s.amount.toLocaleString('ko-KR') + '만 원') : '';
    return '';
  }
  function grade() { return C.grade(sigFor(st.s, st.use, st.time)).grade; }
  function fieldsOn() { return Object.keys(st.f).filter(function (k) { return st.f[k] && (['time', 'memo'].indexOf(k) >= 0 || val(k)); }); }
  function paint() {
    var box = document.querySelector('#jlxBg .jlx'); if (!box) return;
    var a = st.ad, keepM = Math.round(C.RULES.keepDays / 30), g = grade(), html = '';
    if (st.step === 1) {
      html = head(1) + '<h2 id="jlxH">' + esc(a.name) + ' 상담 받기</h2><p class="sub">' + esc([a.sido, a.sgg].filter(Boolean).join(' ')) + ' · 이 현장 분양 담당자가 전화나 문자로 연락해요.</p>'
        + '<div class="jlx-box"><span class="jlx-k">연락처를 받는 곳(이 한 곳만)</span><div class="jlx-to">' + esc(a.co) + '</div><span class="jlx-k">' + esc(a.name) + ' 분양 상담 연락에만 써요. 다른 현장·다른 회사에는 가지 않아요.</span></div>'
        + '<div class="jlx-box"><h3>광고주에게 가는 것</h3><ul class="jlx-ul">'
        + C.FIELDS.map(function (f) {
          if (f.need) return '<li><label><input type="checkbox" checked disabled><span>' + esc(f.t) + ' <span class="lk">· 꼭 필요해요</span></span></label></li>';
          if (['time', 'memo'].indexOf(f.k) < 0 && !val(f.k)) return '';
          return '<li><label><input type="checkbox" data-f="' + f.k + '"' + (st.f[f.k] ? ' checked' : '') + '><span>' + esc(f.t) + (val(f.k) ? '<span class="v">' + esc(val(f.k)) + '</span>' : '') + '</span></label></li>';
        }).join('') + '</ul><p class="jlx-note">체크한 것만 가요. 체크하지 않은 값은 이 기기 밖으로 나가지 않아요.</p></div>'
        + '<div class="jlx-box"><h3>상담 준비 정도</h3><div class="jlx-gr"><b class="' + g + '">' + g + '</b><div><div style="font-weight:800">' + GRADE_TXT[g] + '</div><div class="jlx-k">광고주에게는 A·B·C 등급만 가요. 등급을 만든 값은 보내지 않아요.</div></div></div>'
        + '<ul class="jlx-why">' + gradeWhy(st.s, st.use).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'
        + '<label class="jlx-ag" style="font-weight:600"><input type="checkbox" data-use' + (st.use ? ' checked' : '') + '>등급을 이 기기의 계산 기록으로 매겨요(끄면 휴대폰 확인만으로 매겨요)</label></div>'
        + '<div class="jlx-box"><h3>얼마나 보관하나요 · 거두는 법</h3><p style="margin:0;font-size:14px;word-break:keep-all">받는 곳은 받은 날부터 ' + keepM + '개월 보관한 뒤 지워요. 상담이 끝나거나 동의를 거두면 바로 지워요. '
        + '동의는 <a href="' + JB.SITE + 'my/leads/' + (demo() ? '?preview=leads' : '') + '">내 상담 신청</a>에서 언제든 거둘 수 있어요. 동의하지 않아도 다른 기능은 그대로 쓸 수 있어요.</p></div>'
        + '<details><summary class="jlx-k" style="cursor:pointer;min-height:36px;display:flex;align-items:center">동의 문구 전체 보기</summary><div class="jlx-txt">' + esc(C.consentText({ co: a.co, site: a.name, fields: fieldsOn() })) + '</div></details>'
        + '<label class="jlx-ag"><input type="checkbox" data-agree' + (st.agree ? ' checked' : '') + '>위 내용을 읽었고, ' + esc(a.co) + '에 제 연락처를 주는 데 동의해요</label>'
        + '<button type="button" class="jlx-btn" data-next' + (st.agree ? '' : ' disabled') + '>다음: 휴대폰 확인</button>'
        + '<p class="jlx-note" style="text-align:center">연락처 없이 먼저 물어보고 싶으면 <button type="button" class="jlx-lnk" data-chat>현장에 먼저 물어보기</button></p>';
    } else if (st.step === 'chat') {
      html = head(0) + '<h2 id="jlxH">' + esc(a.name) + '에 먼저 물어보기</h2><p class="sub">집예보 안의 1:1 채팅으로 물어봐요. 이름·연락처는 가지 않고, 원할 때만 채팅 안에서 직접 보낼 수 있어요.</p>'
        + '<label class="jlx-lab" for="jlxQ">궁금한 것</label><textarea class="jlx-in jlx-ta" id="jlxQ" maxlength="1000" placeholder="예: 84㎡ 남향 잔여 세대가 있나요? 중도금 대출은 어떻게 되나요?">' + esc(st.q || '') + '</textarea>'
        + '<button type="button" class="jlx-btn" data-chatgo>질문 보내기</button><button type="button" class="jlx-btn s" data-back>돌아가기</button><p class="jlx-msg" id="jlxM" role="status"></p>';
    } else if (st.step === 2) {
      var logged = !!sess() || demo();
      html = head(2) + '<h2 id="jlxH">휴대폰 확인</h2><p class="sub">본인 번호인지 확인한 신청만 광고주에게 가요. 장난 신청을 막아 광고주가 믿고 연락할 수 있어요.</p>'
        + (logged ? '' : '<div class="jlx-box"><p style="margin:0 0 6px">먼저 카카오 간편 로그인해 주세요. 내 상담 신청을 보고 거두는 데 필요해요.</p><div data-login></div></div>')
        + '<label class="jlx-lab" for="jlxN">이름</label><input class="jlx-in" id="jlxN" autocomplete="name" maxlength="20" value="' + esc(st.name) + '">'
        + '<label class="jlx-lab" for="jlxP">휴대폰 번호</label><div class="jlx-row"><input class="jlx-in" id="jlxP" inputmode="numeric" autocomplete="tel" maxlength="13" placeholder="010-0000-0000" value="' + esc(st.phone) + '"><button type="button" class="jlx-btn" data-otp' + (logged ? '' : ' disabled') + '>' + (st.sent ? '다시 받기' : '인증번호 받기') + '</button></div>'
        + (st.sent ? '<label class="jlx-lab" for="jlxC">인증번호 6자리</label><input class="jlx-in" id="jlxC" inputmode="numeric" autocomplete="one-time-code" maxlength="6">'
          + (demo() ? '<p class="jlx-note">미리 보기예요. 문자는 가지 않아요. 아무 숫자 6자리나 넣어 보세요.</p>' : '<p class="jlx-note">문자로 받은 번호를 ' + C.RULES.otpMin + '분 안에 넣어 주세요.</p>')
          + '<button type="button" class="jlx-btn" data-verify>확인</button>' : '')
        + '<p class="jlx-msg" id="jlxM" role="status"></p><button type="button" class="jlx-lnk" data-back>이전 단계로</button>';
    } else if (st.step === 3) {
      html = head(3) + '<h2 id="jlxH">언제 연락받으면 좋을까요?</h2><p class="sub">고르지 않아도 돼요. 연락은 오전 8시~오후 9시에만 와요.</p>'
        + '<div class="jlx-chips" role="group" aria-label="희망 상담 시간">' + C.TIMES.map(function (t) { return '<button type="button" data-time="' + esc(t) + '" aria-pressed="' + (st.time === t) + '">' + esc(t) + '</button>'; }).join('') + '</div>'
        + (st.f.memo ? '<label class="jlx-lab" for="jlxMm">남기는 말(선택)</label><textarea class="jlx-in jlx-ta" id="jlxMm" maxlength="200" placeholder="예: 84㎡ 저층 위주로 알고 싶어요">' + esc(st.memo) + '</textarea>' : '')
        + '<label class="jlx-lab" for="jlxE">확인 메일(선택 — 광고주에게는 가지 않아요)</label><input class="jlx-in" id="jlxE" type="email" autocomplete="email" placeholder="연락이 닿지 않을 때 집예보가 확인을 여쭤볼 때만 써요">'
        + '<div class="jlx-box" style="margin-top:14px"><div class="jlx-gr"><b class="' + g + '">' + g + '</b><div><div style="font-weight:800">' + esc(a.co) + '에 보낼게요</div><div class="jlx-k">' + esc(fieldsOn().length ? '이름 · 휴대폰 · 등급 · ' + C.FIELDS.filter(function (f) { return fieldsOn().indexOf(f.k) >= 0; }).map(function (f) { return f.t.replace(/\(.*\)$/, ''); }).join(' · ') : '이름 · 휴대폰 · 등급') + '</div></div></div></div>'
        + '<button type="button" class="jlx-btn" data-send>상담 신청 보내기</button><p class="jlx-msg" id="jlxM" role="status"></p>';
    } else if (st.step === 4) {
      html = head(0) + '<div class="jlx-done"><div class="big" aria-hidden="true">✓</div><h2 id="jlxH">' + (st.dup ? '이미 신청하신 현장이에요' : '상담 신청을 보냈어요') + '</h2>'
        + '<p class="sub">' + (st.dup ? C.RULES.dupDays + '일 안에 같은 현장에 다시 신청하셔서 하나로 합쳤어요. 담당자가 곧 연락할 거예요.' : esc(a.co) + ' 담당자가 곧 연락할 거예요. 연락이 오지 않거나 신청한 적이 없는데 연락이 오면 내 상담 신청에서 알려 주세요.') + '</p>'
        + (demo() ? '<p class="jlx-note">미리 보기예요. 실제로는 아무것도 보내지 않았어요.</p>' : '')
        + '<a class="jlx-btn" style="text-decoration:none" href="' + JB.SITE + 'my/leads/' + (demo() ? '?preview=leads' : '') + '">내 상담 신청 보기</a><button type="button" class="jlx-btn s" data-x>닫기</button></div>';
    } else if (st.step === 'chatdone') {
      html = head(0) + '<div class="jlx-done"><div class="big" aria-hidden="true">✓</div><h2 id="jlxH">질문을 보냈어요</h2><p class="sub">현장 담당자가 채팅을 수락하면 답이 와요. 연락처는 보내지 않았어요.</p>'
        + (st.room ? '<a class="jlx-btn" style="text-decoration:none" href="' + JB.SITE + 'counsel/chat/?id=' + encodeURIComponent(st.room) + '">채팅 보기</a>' : '<p class="jlx-note">미리 보기예요. 실제로는 보내지 않았어요.</p>')
        + '<button type="button" class="jlx-btn s" data-x>닫기</button></div>';
    }
    box.innerHTML = html; bind(box);
    var lg = box.querySelector('[data-login]'); if (lg && root.JDJ_AUTH && root.JDJ_AUTH.btn) lg.innerHTML = root.JDJ_AUTH.btn('카카오 간편 로그인', location.pathname + location.search);
  }
  function msg(t, ok) { var m = document.getElementById('jlxM'); if (m) { m.textContent = t; m.className = 'jlx-msg' + (ok ? ' ok' : ''); } }
  function bind(box) {
    box.onclick = function (e) {
      var t = e.target.closest ? e.target.closest('button,[data-x]') : null; if (!t) return;
      if (t.hasAttribute('data-x')) return close();
      if (t.hasAttribute('data-next')) { st.step = 2; paint(); track('lead_open', { step: 'verify' }); return; }
      if (t.hasAttribute('data-back')) { st.step = st.step === 'chat' ? 1 : st.step === 2 ? 1 : st.step; paint(); return; }
      if (t.hasAttribute('data-chat')) { st.step = 'chat'; paint(); return; }
      if (t.hasAttribute('data-chatgo')) {
        var q = (document.getElementById('jlxQ').value || '').trim(); st.q = q;
        if (q.length < 20) return msg('20자 넘게 적어 주세요.');
        t.disabled = true;
        return post({ action: 'leadChat', ad: st.ad.id, title: q.slice(0, 30), body: q }).then(function (j) { st.room = j.room; st.step = 'chatdone'; paint(); track('lead_chat', {}); })
          .catch(function (er) { t.disabled = false; msg(er.message); });
      }
      if (t.hasAttribute('data-otp')) {
        st.name = document.getElementById('jlxN').value.trim(); st.phone = document.getElementById('jlxP').value.trim();
        if (!/^[가-힣A-Za-z ]{2,20}$/.test(st.name)) return msg('이름을 한글 또는 영문으로 넣어 주세요.');
        if (!/^01[016789]\d{7,8}$/.test(st.phone.replace(/\D/g, ''))) return msg('휴대폰 번호를 확인해 주세요.');
        t.disabled = true;
        return post({ action: 'leadOtp', phone: st.phone }).then(function () { st.sent = true; paint(); msg('인증번호를 보냈어요.', true); var c = document.getElementById('jlxC'); if (c) c.focus(); })
          .catch(function (er) { t.disabled = false; msg(er.message); });
      }
      if (t.hasAttribute('data-verify')) {
        var code = (document.getElementById('jlxC').value || '').replace(/\D/g, '');
        if (code.length !== 6) return msg('인증번호 6자리를 넣어 주세요.');
        t.disabled = true;
        return post({ action: 'leadVerify', phone: st.phone, code: code }).then(function (j) { st.vt = j.vt; st.step = 3; paint(); track('lead_open', { step: 'time' }); })
          .catch(function (er) { t.disabled = false; msg(er.message); });
      }
      if (t.hasAttribute('data-time')) { st.time = st.time === t.getAttribute('data-time') ? '' : t.getAttribute('data-time'); var mm = document.getElementById('jlxMm'); if (mm) st.memo = mm.value; paint(); return; }
      if (t.hasAttribute('data-send')) {
        var mm2 = document.getElementById('jlxMm'); if (mm2) st.memo = mm2.value.trim();
        var fs = fieldsOn().filter(function (k) { return k !== 'time' || st.time; }), s = st.s, share = {};
        if (fs.indexOf('budget') >= 0) share.budget = s.budgetBand;
        if (fs.indexOf('noHome') >= 0) share.noHome = s.noHome;
        if (fs.indexOf('cy') >= 0) share.cy = s.cyBand;
        if (fs.indexOf('live') >= 0) share.live = s.liveName;
        if (fs.indexOf('amount') >= 0) share.amount = s.amount;
        var sg = sigFor(s, st.use, st.time);
        t.disabled = true;
        return post({ action: 'leadSubmit', vt: st.vt, ad: st.ad.id, name: st.name, time: st.time, memo: st.memo, mail: (document.getElementById('jlxE').value || '').trim(),
          fields: fs, share: share, sig: sg, agree: true, cv: C.CONSENT_V, _grade: C.grade(sg).grade })
          .then(function (j) { st.dup = !!j.dup; st.step = 4; paint(); track('lead_sent', { grade: j.grade || '' }); })
          .catch(function (er) { t.disabled = false; msg(er.message); });
      }
    };
    box.onchange = function (e) {
      var t = e.target;
      if (t.hasAttribute('data-f')) { st.f[t.getAttribute('data-f')] = t.checked; paint(); }
      else if (t.hasAttribute('data-use')) { st.use = t.checked; paint(); }
      else if (t.hasAttribute('data-agree')) { st.agree = t.checked; var n = box.querySelector('[data-next]'); if (n) n.disabled = !t.checked; }
    };
  }

  root.JDJ_LEADS = { on: on, demo: demo, open: open, close: close, signals: signals, views: views, post: post, style: style, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);
