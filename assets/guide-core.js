/* 집예보 '고민 해결 길잡이' 공통 로직 — 화면 없음. 화면(assets/guide.js·solve/)·테스트(tools/guide-test.js)가 함께 써요. 브라우저 window.JDJ_GUIDE_CORE, node require 둘 다.
   - 대화형 답변(AI)을 쓰지 않아요. 고민 문장 → 규칙(낱말 사전 assets/guide/lexicon.json + 시나리오 assets/guide/scenarios.json)으로 고민 종류를 고르고,
     2~4개 짧은 질문 → 집예보에 이미 있는 계산 엔진(대출 assets/loan-core.js · 세금 tax/tax-engine.js · 전세보증 assets/hug-core.js · 청약 chungyak/cy-engine.js ·
     조정대상지역 tax/adjusted-areas.js)으로 그 사람 조건의 숫자를 계산해 해법 카드를 만들어요.
   - 숫자는 계산 결과·공개 자료 값·법령에 적힌 값만 써요(지어낸 숫자 없음). 법령 숫자는 출처(src)를 붙이고, 확실하지 않은 내용은 '확인 필요'로 표시해요.
   - 매수·매도 권유를 하지 않아요: 점수·과거 성적은 '참고'로만, '사세요·파세요' 같은 결론을 쓰지 않아요(tools/guide-test.js 가 검사).
   - 세금·법률·대출 구체 판단은 일반 정보 + 자격 있는 전문가 연결(세금 = 세무사, 등기·법률 = 법무사, 대출 = 대출상담사)로 마무리해요.
   - 금액은 이 기기 안에서만 계산해요. 서버로 보내는 것은 '못 알아들은 문장'(개인정보 가림 mask 를 거친 뒤)뿐이에요.
   window.JDJ_GUIDE_CORE = { norm, extract, classify, pending, solve, mask, won, pct, fill, nextFor, BAD } */
(function (root) {
  'use strict';
  const RX_PUNCT = /[?!？！.,，、·・/|&+~"'“”‘’()\[\]{}<>:;…\-_=*#@^]/g;

  /* ---------- 금액·숫자 글자 ---------- */
  /** 만원 → '3억 2,500만 원' */
  function won(man) {
    if (man == null || !isFinite(man)) return '';
    const neg = man < 0; let v = Math.round(Math.abs(man));
    const e = Math.floor(v / 10000), m = v % 10000;
    const s = (e ? e.toLocaleString('ko-KR') + '억' : '') + (m ? (e ? ' ' : '') + m.toLocaleString('ko-KR') + '만' : (e ? '' : '0')) + ' 원';
    return (neg ? '−' : '') + s;
  }
  /** 원 → 만원 반올림 글자 */
  const wonW = w => won(Math.round((+w || 0) / 10000));
  const pct = (r, d) => (Math.round(r * Math.pow(10, 2 + (d || 0))) / Math.pow(10, d || 0)).toLocaleString('ko-KR') + '%';
  const ko = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${+m[1]}년 ${+m[2]}월 ${+m[3]}일` : ''; };
  const dayT = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const isoOf = t => { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };
  const addD = (iso, n) => isoOf(dayT(iso) + n * 864e5);
  /** 말일 보정 없이 달 더하기(응당일 없는 달은 그 달 말일) — 법령 기간 계산(민법 제160조)과 같은 방식 */
  function addM(iso, n) {
    const y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n, d = +iso.slice(8, 10);
    const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12, last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
    return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
  }
  const addY = (iso, n) => addM(iso, n * 12);
  const diffD = (a, b) => Math.round((dayT(b) - dayT(a)) / 864e5);
  const okDate = v => /^(19|20)\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(v || ''));
  const todayKst = () => { const d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 10); };

  /* ---------- 문장 다듬기 ---------- */
  /** 소문자·문장부호 빼기·띄어쓰기 없앤 글(hay) + 사전으로 더한 바른 말 */
  function norm(text, lex) {
    const raw = String(text || '').toLowerCase().replace(RX_PUNCT, ' ').replace(/\s+/g, ' ').trim();
    let flat = raw.replace(/\s/g, '');
    const add = [];
    for (const [from, to] of ((lex && lex.syn) || [])) if (flat.indexOf(from) >= 0 && add.indexOf(to) < 0) add.push(to);
    return { raw, flat, hay: flat + '|' + add.join('|') };
  }

  /* ---------- 문장에서 값 뽑기 ---------- */
  /** '3억 5천', '3억5000만', '7천만', '2500만 원', '12억' → 만원. 위치(idx)도 돌려줌 */
  function moneys(raw) {
    const out = [], re = /(\d+(?:\.\d+)?)\s*억(?:\s*(\d+(?:,\d{3})*)\s*(천만|천|만)?)?|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(천만|천|백만|만)\s*원?/g;
    let m;
    while ((m = re.exec(raw))) {
      let v;
      if (m[1] != null) {
        v = parseFloat(m[1]) * 10000;
        if (m[2]) { const n = parseFloat(m[2].replace(/,/g, '')); v += m[3] === '천' || m[3] === '천만' ? n * 1000 : (n < 10 && !m[3] ? n * 1000 : n); }
      } else {
        const n = parseFloat(m[4].replace(/,/g, '')), u = m[5];
        v = u === '천만' || u === '천' ? n * 1000 : u === '백만' ? n * 100 : n;
      }
      if (v > 0 && v < 10000000) out.push({ v: Math.round(v), i: m.index, s: m[0] });
    }
    return out;
  }
  /** 금액 앞뒤 말로 어떤 금액인지: 연소득·보증금·월세·현금·집값 */
  function moneyRole(raw, m) {
    const before = raw.slice(Math.max(0, m.i - 14), m.i).replace(/\s/g, ''), after = raw.slice(m.i + m.s.length, m.i + m.s.length + 8).replace(/\s/g, '');
    if (/(연봉|연소득|소득|월급|버는|벌어|수입)/.test(before) || /^(연봉|소득|벌)/.test(after)) return 'income';
    if (/월세/.test(before) && /월세\S{0,3}$/.test(before)) return 'wrent';
    if (/(보증금|전세금|전세|보증)/.test(before)) return 'dep';
    if (/(현금|모은|가진|예산|자금|모아|저축|예금)/.test(before) || /^(있|모았|가지|정도있|모아)/.test(after)) return 'cash';
    if (/(공시)/.test(before)) return 'pub';
    if (/(취득|샀|매수가|분양가)/.test(before) || /^(에샀|에산|주고샀)/.test(after)) return 'acqp';
    return 'price';
  }
  /** 문장 → {money:{role:만원}, date, houses, kids, region:{code,name}, sido} — ctx.sgg: [{code, name, sido, short}] */
  function extract(text, ctx) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim(), flat = raw.replace(/\s/g, ''), out = { money: {} };
    for (const m of moneys(raw)) { const r = moneyRole(raw, m); if (out.money[r] == null) out.money[r] = m.v; }
    let d = /(20\d\d)\s*[.년\-/]\s*(\d{1,2})\s*[.월\-/]\s*(\d{1,2})\s*일?/.exec(raw);
    if (d) out.date = `${d[1]}-${String(d[2]).padStart(2, '0')}-${String(d[3]).padStart(2, '0')}`;
    const h = /(\d)\s*(채|주택)/.exec(raw) || (/(두|세|네)\s*채/.exec(raw) ? { 1: { 두: 2, 세: 3, 네: 4 }[/(두|세|네)\s*채/.exec(raw)[1]] } : null);
    if (h) out.houses = Math.min(4, +h[1]);
    const k = /(아이|자녀|애)\s*(\d)/.exec(raw); if (k) out.kids = +k[2];
    if (/신혼/.test(flat)) out.newly = 'y';
    const sgg = (ctx && ctx.sgg) || [];
    let best = null;
    for (const g of sgg) {
      const nm = String(g.name || ''), cand = [nm.replace(/\s/g, '')];
      const last = nm.split(' ').pop(); if (last !== nm) cand.push(last);
      const bare = last.replace(/(구|시|군)$/, ''); if (bare.length >= 2) cand.push(bare);
      for (const c of cand) {
        if (c.length < 2 || flat.indexOf(c) < 0) continue;
        /* 시·도 이름을 함께 썼으면 그 시·도를 먼저(예: '부산 중구') */
        const sdHit = g.short && flat.indexOf(g.short) >= 0 ? 1 : 0, sc = c.length * 2 + sdHit * 3 + (c === nm.replace(/\s/g, '') ? 1 : 0);
        if (!best || sc > best.sc) best = { sc, code: g.code, name: nm, sido: g.sido, short: g.short };
      }
    }
    if (best) out.region = { code: best.code, name: best.name, sido: best.sido, short: best.short };
    const sd = ((ctx && ctx.sido) || []).find(s => flat.indexOf(s.short) >= 0 || flat.indexOf(String(s.name).replace(/\s/g, '')) >= 0);
    if (sd) out.sido = sd.name;
    return out;
  }

  /* ---------- 고민 종류 고르기 ---------- */
  const MIN = 3;          // 이보다 낮으면 '못 알아들음'
  /** 문장 → {top, alts, slots, scores}. top = {id, score} | null, alts = 비슷한 점수의 다른 고민(최대 2) */
  function classify(text, data, ctx) {
    const N = norm(text, data.lex), list = [];
    for (const sc of data.sc) {
      let s = 0; const hit = [];
      for (const [w, wt] of sc.kw) { const k = String(w).toLowerCase().replace(/\s/g, ''); if (k && N.hay.indexOf(k) >= 0) { s += wt; hit.push(k); } }
      /* 겹치는 짧은 낱말(예: '갈아타' ⊂ '갈아타기순서')은 긴 말만 셈 */
      for (const a of hit) for (const b of hit) if (a !== b && b.indexOf(a) >= 0) { const w = sc.kw.find(x => String(x[0]).toLowerCase() === a); if (w) { s -= w[1]; break; } }
      if (s > 0) list.push({ id: sc.id, score: s, pri: sc.pri ? 1 : 0 });
    }
    list.sort((a, b) => b.score - a.score || b.pri - a.pri);
    const top = list[0] && list[0].score >= MIN ? list[0] : null;
    const alts = top ? list.slice(1).filter(x => x.score >= MIN && x.score >= top.score - 1).slice(0, 2) : list.filter(x => x.score >= 2).slice(0, 3);
    return { top, alts, scores: list.slice(0, 6), slots: extract(text, ctx), norm: N };
  }

  /* ---------- 질문 순서 ---------- */
  /** 시나리오 sc, 지금 아는 값 known → 아직 물어야 할 칸 id 목록(선택 칸·기본값이 있는 칸도 한 번은 보여 주되, 이미 아는 값은 건너뜀) */
  function pending(sc, known, data) {
    return (sc.ask || []).filter(id => known[id] === undefined || known[id] === null || known[id] === '');
  }

  /* ---------- 주소 채우기 ---------- */
  function fill(href, a) {
    return String(href || '').replace(/\{(\w+)\}/g, (m, k) => {
      const v = k === 'region' ? (a.region && a.region.code) || '' : a[k];
      return v == null ? '' : encodeURIComponent(String(v));
    }).replace(/[?&][a-z]=(?=&|$)/g, '').replace(/\?&/, '?').replace(/\?$/, '');
  }
  /** 결과 화면 '이어서 하면 좋은 것' 3개: data.after[key] 의 시나리오 → {id, t, sub} */
  function nextFor(key, data) {
    const ids = (data.after && data.after[key]) || [];
    return ids.map(id => data.sc.find(s => s.id === id)).filter(Boolean).slice(0, 3).map(s => ({ id: s.id, t: s.t, sub: s.sub || '' }));
  }

  /* ---------- 못 알아들은 문장 개인정보 가리기 ---------- */
  /** 전화번호·이메일·주민번호·주소 번지·호수·이름처럼 보이는 말을 ○ 로. 40자까지. 가린 뒤 글자가 너무 적으면 '' */
  function mask(text) {
    let t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    t = t.replace(/https?:\/\/\S+/gi, '[주소]')
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[메일]')
      .replace(/\d{6}\s*-\s*\d{7}/g, '[번호]')
      .replace(/(01[016789]|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[전화]')
      .replace(/\d{7,}/g, '[번호]')
      .replace(/(\S+(로|길))\s*\d+(-\d+)?(번길\s*\d+)?/g, '$2 ○')
      .replace(/\d+\s*-\s*\d+\s*(번지)?/g, '○번지')
      .replace(/\d+\s*번지/g, '○번지')
      .replace(/\d+\s*동\s*\d+\s*호/g, '○동 ○호')
      .replace(/\d{3,4}\s*호/g, '○호')
      .replace(/(제\s*이름은|이름은|저는|전|성함은)\s*[가-힣]{2,4}(입니다|이에요|예요|이고|인데|라고|고)?/g, '$1 ○○')
      .replace(/[가-힣]{2,4}\s*(씨|님)(?=[이가은는을를께에도의\s]|$)/g, '○○$1')
      .replace(/[<>=+]/g, '');
    t = t.trim().slice(0, 60);
    return t.replace(/\[(주소|메일|번호|전화)\]|[\s○]/g, '').length < 2 ? '' : t;
  }

  /* ---------- 권유 금지 문구(화면·테스트 공통) ---------- */
  const BAD = /(지금\s*사세요|꼭\s*사세요|사셔야|파세요|매수하세요|매도하세요|추천\s*단지|무조건|오를\s*거예요|떨어질\s*거예요|확실히\s*올|반드시\s*올)/;

  /* ---------- 해법 계산 ---------- */
  /* 카드 모양: { head(한 줄 결론), nums:[{k, v, s(짧은 풀이)}], warn:[손해 피하는 주의점], info:[{t, ok(true 확인 · false 확인 필요), src}], note(가정),
     table:{head:[], rows:[[]]}, ref(점수·과거 성적 '참고' 줄 [{k,v,s}]), src:[출처 id], need:[아직 필요한 칸] } */
  const groupOf = (E, code) => (code && E.L) ? E.L.R.groupOf(code) : (E.L ? E.L.ANY_GROUP : 'capfree');
  const GNAME = { reg: '규제지역(서울 전역·경기 일부)', capfree: '수도권 비규제지역', local: '지방' };
  const ownName = { none: '무주택', first: '생애 첫 집', one: '1주택(팔 예정)', multi: '2주택 이상' };
  const regTxt = a => a.region && a.region.name ? `${a.region.short ? a.region.short + ' ' : ''}${a.region.name}` : '지역 상관없이(수도권 비규제 기준)';
  /** 지역 + 날짜 → 그날 조정대상지역인지(true/false/'ask'·모름) — tax/adjusted-areas.js 국토교통부 공고 이력 */
  function adjAt(E, region, date) {
    if (!E.ADJ || !region || !region.code || !date) return 'ask';
    const sd = region.short === '서울' || region.short === '경기' ? region.short : (/^11/.test(region.code) ? '서울' : /^41/.test(region.code) ? '경기' : '그 밖의 지역');
    return E.ADJ.isAdjusted(sd, region.name, date);
  }
  const yn = v => v === 'y' ? true : v === 'n' ? false : null;
  const need = (a, ids) => ids.filter(k => a[k] == null || a[k] === '');

  /* 법정 중개보수 상한(공인중개사법 시행규칙 제20조 · 서울특별시 주택 중개보수 등에 관한 조례, 2021.10.19 시행 요율표)
     [미만 상한(만원), 요율, 한도(만원)] — 마지막 줄은 그 이상 */
  const FEE = {
    sale: [[5000, 0.006, 25], [20000, 0.005, 80], [90000, 0.004, null], [120000, 0.005, null], [150000, 0.006, null], [Infinity, 0.007, null]],
    lease: [[5000, 0.005, 20], [10000, 0.004, 30], [60000, 0.003, null], [120000, 0.004, null], [150000, 0.005, null], [Infinity, 0.006, null]]
  };
  /** kind 'sale'|'lease', 거래금액(만원) → {base, rate, cap, fee(만원, 부가세 별도)} */
  function brokerFee(kind, amt) {
    const row = FEE[kind].find(r => amt < r[0]);
    const raw = amt * row[1], fee = row[2] != null ? Math.min(raw, row[2]) : raw;
    return { amt, rate: row[1], cap: row[2], fee: Math.round(fee * 10) / 10 };
  }
  /** 월세 거래금액: 보증금 + 월세 × 100, 그 값이 5천만 원 미만이면 보증금 + 월세 × 70 (공인중개사법 시행규칙 제20조 제5항) */
  const wolseAmt = (dep, w) => { const a = dep + w * 100; return a < 5000 ? dep + w * 70 : a; };
  /* 소액임차인 최우선변제(주택임대차보호법 시행령 제10조·제11조, 2023.2.21 시행): [보증금 기준(이하), 우선변제 금액] */
  const SMALL = { seoul: [16500, 5500, '서울'], over: [14500, 4800, '수도권 과밀억제권역(서울 밖)·세종·용인·화성·김포'], metro: [8500, 2800, '광역시·안산·광주·파주·이천·평택'], etc: [7500, 2500, '그 밖의 지역'] };

  /** 세금 엔진 설명 문장(~습니다)을 화면 말투(~요)로 */
  const YO = [['받습니다', '받아요'], ['없습니다', '없어요'], ['있습니다', '있어요'], ['않습니다', '않아요'], ['했습니다', '했어요'], ['였습니다', '였어요'], ['적습니다', '적어요'], ['뺐습니다', '뺐어요'], ['됐습니다', '됐어요'], ['같습니다', '같아요'], ['입니다', '이에요']];
  const yo = t => YO.reduce((x, [a, b]) => x.split(a).join(b), String(t || ''));
  const S = {};
  /* ① 언제 팔고 무엇을 살까 */
  S.sellWhen = (a, E) => {
    const miss = need(a, ['acq', 'acqp', 'salep']); if (miss.length) return { need: miss };
    const T = E.T, today = E.today, adj = a.adj === 'y' ? true : a.adj === 'n' ? false : adjAt(E, a.region, a.acq) === true;
    const rsM = a.rs && okDate(a.rs) ? Math.max(0, Math.floor(diffD(a.rs < a.acq ? a.acq : a.rs, today) / 30.4375)) : 0;
    const h = { acqDate: a.acq, acqPrice: a.acqp * 1e4, price: a.salep * 1e4, expenses: 0, residMonths: rsM, living: !!a.rs, houses: 1, acqAdj: adj,
      adjAt: d => adjAt(E, a.region, d) === true };
    const tl = T.timeline(h, { today, months: 60 }), now = tl.now, best = tl.best;
    const hold2 = addY(a.acq, 2), live2 = adj && a.rs ? addY(a.rs < a.acq ? a.acq : a.rs, 2) : null;
    const nums = [
      { k: '오늘 팔 때 세금', v: wonW(now.total), s: `양도세 + 지방소득세 · 차익 ${wonW(now.r.gain)}${now.r.exempt === 'full' ? ' · 비과세' : now.r.exempt === 'partial' ? ' · 12억 원 넘는 부분만 과세' : ''}` },
      { k: '세금이 가장 적은 날(5년 안)', v: best.date === today ? '오늘' : ko(best.date), s: `${wonW(best.total)}${best.total < now.total ? ` · 오늘보다 ${wonW(now.total - best.total)} 적어요` : ''}` },
      { k: '보유 2년 차는 날', v: ko(hold2), s: today >= hold2 ? '이미 채웠어요' : `${diffD(today, hold2)}일 남았어요` }
    ];
    if (adj) nums.push({ k: '거주 2년 차는 날', v: live2 ? ko(live2) : '전입일 필요', s: live2 ? (today >= live2 ? '이미 채웠어요' : `${diffD(today, live2)}일 남았어요`) : '살 때 조정대상지역이면 2년 이상 살아야 비과세예요' });
    const ev = (tl.events || []).filter(e => e.date > today).slice(0, 4);
    const table = ev.length ? { head: ['날짜', '바뀌는 것', '그날부터 세금'], rows: ev.map(e => [ko(e.date), e.label, wonW(e.after)]) } : null;
    const ref = [];
    if (a.facts && a.facts.fv != null) ref.push({ k: '미래가치 점수(2년 보유 기준)', v: `${a.facts.fv}점`, s: `${a.facts.fvBase || '같은 시·도 아파트'} 중 순위 점수예요. 가격 예측이 아니라 평균보다 더 오를 가능성 순위예요` });
    if (a.facts && a.facts.track) ref.push({ k: '이 점수의 과거 성적', v: `${a.facts.track.n}번 중 ${a.facts.track.hit}번 맞음`, s: '같은 방법을 과거에 그대로 써 봤을 때 점수 상위 단지가 같은 구 평균보다 더 오른 경우예요' });
    if (a.facts && a.facts.price) ref.push({ k: '최근 실거래 시세', v: won(a.facts.price), s: `${a.facts.at ? a.facts.at.slice(0, 4) + '년 ' + (+a.facts.at.slice(4, 6)) + '월' : ''} 국토교통부 실거래 기준` });
    return {
      head: best.total < now.total ? `${ko(best.date)}부터 팔면 오늘보다 세금이 ${wonW(now.total - best.total)} 줄어요` : `지금 조건이면 오늘 팔아도 5년 안 다른 날보다 세금이 늘지 않아요`,
      nums, table, ref,
      warn: [
        '비과세·장기보유특별공제는 하루 차이로 갈려요. 잔금일을 기준일보다 여유 있게 잡아 주세요.',
        '팔기 전에 새 집을 먼저 사면 일시적 2주택 처분 기한이 생겨요. 순서를 먼저 정해 두세요.',
        '집값은 지금 가격 그대로라고 보고 세금만 비교했어요. 언제 팔지는 세금과 함께 시세 흐름·자금 계획을 같이 보고 정해 주세요.'
      ],
      note: `취득 ${ko(a.acq)} · 취득가 ${won(a.acqp)} · 팔 가격 ${won(a.salep)} · 1세대 1주택 · 살 때 조정대상지역 ${adj ? '맞음' : '아님'}${a.rs ? ` · 전입 ${ko(a.rs)}` : ''}`,
      src: ['own1', 'cgt_law', 'cgt_easy']
    };
  };

  /* ② 여러 채 — 매도 순서 */
  S.multiOrder = (a, E) => {
    const L = (a.mlist || []).filter(h => h && okDate(h.acq) && h.acqp > 0 && h.price > 0);
    if (L.length < 2) return { need: ['mlist'] };
    const T = E.T, today = E.today, start = addM(today, 1), NAMES = ['A', 'B', 'C'];
    const houses = L.slice(0, 3).map((h, i) => {
      const rg = h.region || null, a0 = h.adj === 'y' ? true : h.adj === 'n' ? false : adjAt(E, rg, h.acq) === true;
      return { name: (h.name || NAMES[i]).slice(0, 12), acqDate: h.acq, acqPrice: h.acqp * 1e4, price: h.price * 1e4, expenses: 0, residMonths: +h.rm || 0, living: !!h.live, acqAdj: a0,
        adjAt: d => (h.adjNow === 'y' ? true : h.adjNow === 'n' ? false : adjAt(E, rg, d) === true) };
    });
    const C = T.compareOrders(houses, { today, start, interval: 12, growth: 0 });
    const rows = C.results.slice(0, 6).map((r, i) => [`${i + 1}. ${r.sales.map(s => s.name).join(' → ')}`, wonW(r.total), r.sales.map(s => `${s.name} ${s.r.exempt === 'full' ? '비과세' : s.r.heavy ? '중과 +' + Math.round(s.r.heavy * 100) + '%p' : '기본세율'}`).join(' · ')]);
    const pubs = L.slice(0, 3).map(h => +h.pub || 0);
    const nums = [
      { k: '세금이 가장 적은 순서', v: C.best.sales.map(s => s.name).join(' → '), s: `양도세 합계 ${wonW(C.best.total)}` },
      { k: '가장 많은 순서와 차이', v: wonW(C.worst.total - C.best.total), s: `가장 많은 순서 ${C.worst.sales.map(s => s.name).join(' → ')} ${wonW(C.worst.total)}` }
    ];
    if (pubs.every(p => p > 0) && T.compTax) {
      const cp = T.compTax({ prices: pubs.map(p => p * 1e4), one: false });
      nums.push({ k: '올해 종부세(지금 모두 가진 경우)', v: wonW(cp.total), s: `공시가격 합계 ${won(pubs.reduce((s, x) => s + x, 0))} · 공제 9억 원 · 농어촌특별세 포함` });
    }
    return {
      head: `${C.best.sales.map(s => s.name).join(' → ')} 순서로 팔 때 양도세 합계가 가장 적어요(${wonW(C.best.total)})`,
      nums, table: { head: ['순서', '양도세 합계', '집별'], rows },
      warn: (C.reason || []).slice(1, 3).map(yo).concat(['첫 매도를 다음 달로, 그 뒤 1년 간격으로 판다고 보고 지금 시세 그대로 계산했어요. 같은 해에 두 채를 팔면 합산돼 세금이 늘 수 있어요.']),
      note: `넣은 집 ${houses.length}채 · 첫 매도 ${ko(start)} · 1년 간격`,
      src: ['cgt_law', 'cgt104', 'comp']
    };
  };

  /* ③ 청약 — 내 가점으로 어디에 */
  S.cyWhere = (a, E) => {
    const miss = need(a, ['birth', 'married', 'homeown', 'deps', 'accd', 'csido']); if (miss.length) return { need: miss };
    const CY = E.CY.CY, A = { own: a.homeown === 'y', birth: a.birth, married: a.married === 'y', marDate: a.marDate || '', deps: +a.deps || 0, accDate: a.accd, noAcc: false };
    const t = CY.total(A, E.today), my = t.sum;
    const rows = (E.cyRows || []).filter(r => r[5] === 'h' && String(r[2]) >= addM(E.today, -12).replace(/-/g, '').slice(0, 6) && +r[6] > 0);
    const reach = rows.filter(r => my >= +r[6]).length, avgOk = rows.filter(r => my >= +r[7]).length;
    const by = [0, 1, 2].map(b => { const rs = rows.filter(r => +r[4] === b); return [['60㎡ 이하', '60~85㎡', '85㎡ 초과'][b], rs.length, rs.filter(r => my >= +r[6]).length]; }).filter(x => x[1] > 0);
    const dg = E.CY.DEPOSIT[E.CY.depGroup(a.csido)];
    const nums = [
      { k: '내 청약 가점', v: `${my}점 / 84점`, s: `무주택 ${t.h.pts}점 · 부양가족 ${t.d.pts}점 · 통장 가입 ${t.c.pts}점` },
      { k: `최근 1년 ${a.csido} 당첨 가점과 비교`, v: rows.length ? `${rows.length.toLocaleString()}개 주택형 중 ${reach.toLocaleString()}개` : '자료 없음', s: rows.length ? `내 가점이 그 주택형의 최저 당첨 가점 이상이었던 곳(평균 가점 이상은 ${avgOk.toLocaleString()}개) · 해당지역 1순위 기준` : '그 지역 최근 1년 당첨 가점 자료가 아직 없어요' },
      { k: '민영주택 1순위 예치금(85㎡ 이하)', v: won(dg[0]), s: `102㎡ 이하 ${won(dg[1])} · 135㎡ 이하 ${won(dg[2])} · 모든 면적 ${won(dg[3])}` }
    ];
    return {
      head: rows.length ? `내 가점 ${my}점이면 최근 1년 ${a.csido} 주택형 ${rows.length.toLocaleString()}개 중 ${reach.toLocaleString()}개에서 최저 당첨 가점을 넘었어요` : `내 청약 가점은 ${my}점이에요`,
      nums, table: by.length ? { head: ['면적', '주택형 수', '내 가점이 최저 이상'], rows: by.map(x => [x[0], x[1].toLocaleString(), x[2].toLocaleString()]) } : null,
      warn: ['가점이 모자라도 85㎡ 초과·추첨제 물량과 특별공급(신혼·생애최초·신생아 등)은 가점이 아니라 자격·추첨으로 뽑아요. 자격을 먼저 확인해 보세요.',
        '과거 당첨 가점은 그때의 경쟁 결과예요. 앞으로의 당첨을 약속하지 않아요.', t.h.why],
      note: `기준일 ${ko(E.today)} · 청약홈 당첨 가점 공개 자료`,
      src: ['cy_rule', 'cy']
    };
  };

  /* ④ 등록 임대사업자 */
  const RT = { s4: { t: '단기민간임대', y: 4, ok: true }, l8: { t: '장기일반민간임대', y: 8, ok: true }, l10: { t: '장기일반민간임대', y: 10, ok: true }, s6: { t: '단기민간임대(6년)', y: 6, ok: false } };
  S.rentalBiz = (a, E) => {
    const miss = need(a, ['rtype', 'regd', 'rkind', 'rstate']); if (miss.length) return { need: miss };
    const r = RT[a.rtype], end = addY(a.regd, r.y), left = diffD(E.today, end), half = addD(a.regd, Math.ceil(diffD(a.regd, end) / 2));
    const nums = [
      { k: '임대의무기간', v: `${r.y}년`, s: `${r.t}${r.ok ? '' : ' — 의무기간은 렌트홈 등록 정보로 꼭 확인해 주세요(확인 필요)'}` },
      { k: '의무기간이 끝나는 날(자동말소 예정)', v: ko(end), s: left > 0 ? `${left.toLocaleString()}일 남았어요` : `${(-left).toLocaleString()}일 지났어요` },
      { k: '의무기간 절반이 지나는 날', v: ko(half), s: E.today >= half ? '지났어요 — 자진말소를 고민할 수 있는 시점이에요' : `${diffD(E.today, half)}일 남았어요` }
    ];
    const info = [
      { t: '의무기간이 끝나면 등록이 저절로 말소돼요(자동말소). 단기민간임대와 아파트 장기일반 매입임대가 해당돼요.', ok: true, src: 'rent_act6' },
      { t: '의무기간의 절반 이상 임대했고 세입자가 동의하면, 의무기간 중이라도 과태료 없이 스스로 말소(자진말소)할 수 있어요.', ok: true, src: 'rent_act6' },
      { t: '말소된 장기임대주택을 팔 때 다주택 양도세 중과를 빼 주는 규정이 있어요. 자동말소는 기한 없이, 자진말소는 말소한 날부터 1년 안에 팔아야 해요.', ok: false, src: 'cgt167_3' },
      { t: '임대주택을 가진 채 사는 집(거주주택)을 팔 때의 비과세 특례는, 말소 뒤 5년 안에 거주주택을 팔아야 이어진다는 규정이 있어요.', ok: false, src: 'cgt155' },
      { t: '말소된 뒤 돌아오는 과세기준일(6월 1일)부터는 종부세 합산배제가 끝나 다른 집과 합쳐 계산돼요. 2018년 9월 14일 이후 조정대상지역에서 산 집은 처음부터 합산배제가 안 될 수 있어요.', ok: false, src: 'comp3' }
    ];
    if (a.rkind === 'y') info.push({ t: '아파트는 2020년 8월 18일부터 새로 매입임대로 등록할 수 없어요(장기일반·단기 모두). 말소 뒤 다시 등록해 혜택을 이어 가기 어려워요.', ok: false, src: 'rent_act6' });
    const st = { keep: '의무기간을 채우는 동안 임대료 증액 5% 제한·임대차계약 신고 같은 의무를 지켜야 혜택이 유지돼요.', auto: '자동말소 뒤에는 다주택 중과 배제·거주주택 비과세 특례가 언제까지 이어지는지가 세금을 크게 바꿔요.', self: '자진말소는 말소일부터 1년 안에 팔아야 중과 배제를 받는다는 기한이 생겨요. 말소 전에 매도 계획부터 세워 보세요.' }[a.rstate];
    return {
      head: `${r.t} ${r.y}년 — 의무기간은 ${ko(end)}에 끝나요${left > 0 ? `(${left.toLocaleString()}일 남음)` : ''}`,
      nums, info,
      warn: [st, '정책이 자주 바뀌었고 등록 시기·유형·면적·가격마다 적용이 달라요. 아래 법령 내용은 일반 정보이고, 내 집에 맞는지는 꼭 세무사에게 확인받아 주세요.'],
      note: `등록(임대 개시) ${ko(a.regd)} · ${r.t} · ${a.rkind === 'y' ? '아파트' : '아파트 아님'}`,
      src: ['rent_act6', 'rent_act43', 'cgt167_3', 'cgt155', 'comp3', 'renthome'], expertMain: true
    };
  };

  /* ⑤ 증여 */
  S.giftWhen = (a, E) => {
    const miss = need(a, ['rel', 'value']); if (miss.length) return { need: miss };
    const T = E.T, v = a.value * 1e4, debt = (+a.gdebt || 0) * 1e4;
    const g = T.giftTax({ value: v, debt, rel: a.rel, prior: (+a.prior || 0) * 1e4, filed: true });
    const adjNow = adjAt(E, a.region, E.today) === true;
    const ga = a.pub > 0 ? T.giftAcqTax({ value: v, stdPrice: a.pub * 1e4, debt, adj: adjNow, donorOne: a.donorone === 'y', close: a.rel !== 'relative', over85: false }) : null;
    const nums = [
      { k: '예상 증여세', v: wonW(g.tax), s: `과세표준 ${wonW(g.base)} · 공제 ${wonW(g.ded)} · 기한 안 신고 3% 공제 반영` },
      { k: '증여 취득세(받는 분)', v: ga ? wonW(ga.total) : '공시가격 필요', s: ga ? `${ga.heavy ? '조정대상지역·공시가격 3억 원 이상 증여 중과 12%' : '무상취득 3.5%'} + 지방교육세${debt ? ' · 빚 부분은 유상취득 세율로 따로' : ''}` : '조정대상지역 중과(12%) 여부를 보려면 공시가격이 필요해요' },
      { k: '10년 합산 공제', v: wonW(g.ded), s: `${g.relText} — 10년 동안 받은 금액을 합쳐서 한 번 공제해요` }
    ];
    if (debt > 0) nums.push({ k: '부담부증여 — 넘겨받는 빚', v: wonW(debt), s: '빚 부분은 증여하는 분이 판 것으로 보아 양도세가 따로 나와요' });
    const info = [
      { t: '아파트는 보통 공시가격이 아니라 시가(비슷한 집의 매매 사례가)로 평가해요. 증여 시점의 시세가 낮을수록 세금이 줄어요.', ok: true, src: 'gift60' },
      { t: '같은 분(부모는 두 분 합산)에게 10년 안에 받은 증여는 합쳐서 세금을 다시 계산해요.', ok: true, src: 'gift47' },
      { t: '배우자·직계존비속에게 받은 집을 10년 안에 팔면, 양도세를 증여한 분의 취득가로 계산해요(이월과세 — 2023년 이후 증여분 10년).', ok: true, src: 'cgt97_2' },
      { t: '신고는 증여일이 속한 달 말일부터 3개월 안에 해야 3% 신고세액공제를 받아요.', ok: true, src: 'gift53' }
    ];
    return {
      head: `지금 시가 ${won(a.value)}로 증여하면 증여세 ${wonW(g.tax)}${ga ? ` + 취득세 ${wonW(ga.total)}` : ''}예요`,
      nums, info,
      warn: ['언제 증여할지는 세금만이 아니라 받는 분의 주택 수(청약·대출·양도세)에도 영향을 줘요.', '증여 시기·평가 방법·부담부증여 여부에 따라 세금이 크게 달라져요. 결정 전에 세무사에게 꼭 확인받아 주세요.'],
      note: `${g.relText} · 시가 ${won(a.value)}${a.pub ? ` · 공시가격 ${won(a.pub)}` : ''}${debt ? ` · 넘겨받는 빚 ${wonW(debt)}` : ''}${a.prior ? ` · 10년 안 받은 증여 ${won(a.prior)}` : ''} — 이 기기에서만 계산했어요`,
      src: ['gift53', 'gift47', 'gift60', 'cgt97_2', 'acq13_2'], expertMain: true
    };
  };

  /* 예산(공통) */
  function budgetCalc(a, E, cash) {
    const L = E.L, g = groupOf(E, a.region && a.region.code), own = a.own === 'first' ? 'first' : a.own === 'one' ? 'one' : a.own === 'multi' ? 'multi' : 'none';
    const c = L.ctx({ g, own, income: +a.income || 0, cash, debt: +a.debt || 0, rate: a.lrate > 0 ? +a.lrate : 4 });
    const P = L.maxPrice(c), n = P ? L.need(P, c) : null;
    return { g, own, c, P, n };
  }
  /* ⑥ 매수 시기 */
  S.buyWhen = (a, E) => {
    const miss = need(a, ['region', 'cash', 'income', 'own']); if (miss.length) return { need: miss };
    const B = budgetCalc(a, E, +a.cash), g = E.IX && E.IX.sgg && E.IX.sgg[a.region.code];
    const nums = [{ k: '내 예산으로 살 수 있는 최대 집값', v: B.P ? won(B.P) : '대출이 막혀 계산 불가', s: B.P ? '가진 돈 + 대출 − 취득세·중개보수·기타 비용' : '' }];
    if (B.P) {
      nums.push({ k: '그때 대출', v: won(Math.floor(B.n.loan.L)), s: `${{ LTV: '담보 비율(LTV)', DSR: '소득 기준(DSR)', CAP: '가격대별 최대 금액', DTI: '소득 기준(DTI)' }[B.n.loan.by] || ''}이 한도를 정해요` });
      nums.push({ k: '매달 갚을 돈', v: won(Math.round(E.L.monthly(B.n.loan.L, B.c.rate, B.c.term))), s: `${B.c.term}년 · 금리 연 ${B.c.rate}%${a.lrate > 0 ? '' : '(가정)'}` });
    }
    const ref = [];
    if (g && Array.isArray(g.s) && g.s.length >= 13) {
      const s = g.s, last = s[s.length - 1], y1 = s[s.length - 13], ch = y1 > 0 ? last / y1 - 1 : null;
      const c = g.c || [], c12 = c.slice(-12).reduce((x, y) => x + y, 0), c0 = c.slice(-24, -12).reduce((x, y) => x + y, 0);
      if (ch != null) ref.push({ k: `${a.region.name} 아파트 평당가 1년 변화`, v: (ch >= 0 ? '+' : '') + pct(ch, 1), s: `3.3㎡당 ${won(y1)} → ${won(last)}(실거래 중간값, ${E.IX.months ? E.IX.months[E.IX.months.length - 1].slice(0, 4) + '년 ' + (+E.IX.months[E.IX.months.length - 1].slice(4)) + '월까지' : ''})` });
      if (c0 > 0) ref.push({ k: '최근 1년 매매 거래', v: `${c12.toLocaleString()}건`, s: `그 전 1년 ${c0.toLocaleString()}건보다 ${c12 >= c0 ? '+' : ''}${pct(c12 / c0 - 1)}` });
      if (g.r && g.r.jr) ref.push({ k: '전세가율', v: `${g.r.jr}%`, s: '매매 시세 대비 전세 시세(구 전체)' });
    }
    if (E.sup && E.sup[a.region.code]) { const sp = E.sup[a.region.code]; ref.push({ k: '앞으로 1년 안 입주 예정', v: `${(+sp[0] || 0).toLocaleString()}세대`, s: `1~2년 ${(+sp[1] || 0).toLocaleString()}세대 · 2~3년 ${(+sp[2] || 0).toLocaleString()}세대(공공 입주 예정 자료)` }); }
    if (a.facts && a.facts.fv != null) ref.push({ k: `${a.facts.apt || '고른 단지'} 미래가치 점수`, v: `${a.facts.fv}점`, s: `${a.facts.fvBase || ''} 중 순위 점수${a.facts.track ? ` · 과거 성적 ${a.facts.track.n}번 중 ${a.facts.track.hit}번 맞음` : ''}` });
    return {
      head: B.P ? `지금 조건이면 ${regTxt(a)}에서 ${won(B.P)}까지 살 수 있어요` : '지금 조건으로는 대출 한도가 나오지 않아요',
      nums, ref,
      warn: ['언제가 바닥인지는 아무도 확정할 수 없어요. 아래 숫자는 지금까지의 실거래 흐름이고, 앞으로의 가격을 약속하지 않아요.',
        '사기 전에 청약(무주택 가점)도 함께 비교해 보세요. 집을 사면 무주택 기간이 끊겨요.', '대출 규칙은 정부 발표로 자주 바뀌어요. 계약 전에 은행에서 한 번 더 확인해 주세요.'],
      note: `${ownName[B.own]} · 가진 돈 ${won(+a.cash)} · 연 소득 ${won(+a.income)} · 금리 연 ${a.lrate > 0 ? a.lrate : 4}%${a.lrate > 0 ? '' : '(가정)'} · ${GNAME[B.g]}`,
      src: ['molit_rt', 'fsc_dsr', 'loan']
    };
  };

  S.budget = (a, E) => {
    const miss = need(a, ['cash', 'income', 'own']); if (miss.length) return { need: miss };
    const B = budgetCalc(a, E, +a.cash);
    if (!B.P) return { head: '지금 조건으로는 대출 한도가 나오지 않아요', nums: [], warn: ['보유 주택 수·지역 규제 때문에 주택담보대출이 막힌 경우예요. 대출 한도 계산기에서 조건을 바꿔 보세요.'], src: ['loan'] };
    const n = B.n, pay = E.L.monthly(n.loan.L, B.c.rate, B.c.term);
    return {
      head: `${regTxt(a)} 기준으로 최대 ${won(B.P)}짜리 집까지 살 수 있어요`,
      nums: [
        { k: '최대 집값', v: won(B.P), s: '가진 돈 + 대출 − 취득세·중개보수·기타 비용' },
        { k: '그때 대출', v: won(n.loan.L), s: `${{ LTV: '담보 비율(LTV)', DSR: '소득 기준(DSR)', CAP: '가격대별 최대 금액', DTI: '소득 기준(DTI)' }[n.loan.by] || ''}이 한도를 정해요` },
        { k: '매달 갚을 돈', v: won(Math.round(pay)), s: `${B.c.term}년 원리금 균등 · 금리 연 ${B.c.rate}%${a.lrate > 0 ? '' : '(가정)'}` },
        { k: '취득세·중개보수', v: won(Math.round(n.cost.acq - n.cost.relief + n.cost.edu + n.cost.farm + n.cost.broker)), s: `기타 비용(이사·등기·수리) ${won(B.c.etc)}은 따로 넣었어요` }
      ],
      warn: ['계약 전 은행 심사에서 신용·다른 대출에 따라 한도가 줄 수 있어요.', '집값을 꽉 채우면 금리가 오를 때 매달 부담이 커져요. 매달 갚을 돈을 먼저 정해 보세요.'],
      note: `${ownName[B.own]} · 가진 돈 ${won(+a.cash)} · 연 소득 ${won(+a.income)}${a.debt ? ` · 다른 대출 원리금 ${won(+a.debt)}/년` : ''} · ${GNAME[B.g]}`,
      src: ['fsc_dsr', 'loan', 'acq11']
    };
  };

  S.loanLimit = (a, E) => {
    const miss = need(a, ['price', 'income', 'own']); if (miss.length) return { need: miss };
    const own = a.own === 'first' ? 'first' : a.own || 'none';
    const r = E.L.limit({ price: +a.price, code: a.region && a.region.code, g: a.region && a.region.code ? undefined : E.L.ANY_GROUP, own, income: +a.income, debt: +a.debt || 0, rate: a.lrate > 0 ? +a.lrate : 4 });
    const BY = { LTV: '담보 비율(LTV)', DSR: '소득 기준(DSR)', CAP: '가격대별 최대 금액', DTI: '소득 기준(DTI)', BAN: '대출 금지 규칙' };
    const nums = [
      { k: '최대 대출', v: won(Math.floor(r.L)), s: `${BY[r.by]}이 한도를 정해요` },
      { k: '매달 갚을 돈', v: won(Math.round(r.pay)), s: `${r.term}년 · 금리 연 ${r.c.rate}%${a.lrate > 0 ? '' : '(가정)'} · DSR 계산 금리 ${r.dsrRate}%(스트레스 금리 포함)` },
      { k: '필요한 내 돈(집값 − 대출)', v: won(Math.ceil(r.cashNeed)), s: '취득세·중개보수는 따로예요' },
      { k: '세 한도 비교', v: `LTV ${won(Math.floor(r.a))} · 가격대 ${isFinite(r.b) ? won(Math.floor(r.b)) : '제한 없음'} · 소득 ${r.dsrOff ? '1억 이하라 안 따짐' : won(Math.floor(r.d))}`, s: '가장 작은 금액까지만 빌릴 수 있어요' }
    ];
    if (r.incomeMore > 0) nums.push({ k: '담보 한도까지 받으려면', v: `연 소득 ${won(r.incomeMore)} 더`, s: `연 소득 ${won(r.incomeNeed)}이 필요해요` });
    return { head: `${won(+a.price)} 집이면 최대 ${won(Math.floor(r.L))}까지 빌릴 수 있어요`, nums,
      warn: ['은행 자체 심사(신용·소득 증빙)에서 더 줄 수 있어요.', r.under1 ? '모든 대출이 1억 원 이하면 DSR을 따지지 않아 1억 원까지는 받을 수도 있어요(은행 심사).' : '변동금리는 금리가 오르면 매달 갚을 돈이 늘어요.'].filter(Boolean),
      note: `${ownName[own]} · ${GNAME[r.g]} · 연 소득 ${won(+a.income)}`, src: ['fsc_dsr', 'loan'] };
  };

  S.specialLoan = (a, E) => {
    const miss = need(a, ['price', 'income', 'own']); if (miss.length) return { need: miss };
    const g = groupOf(E, a.region && a.region.code);
    const list = E.L.policyLoans({ price: +a.price, g, own: a.own === 'first' ? 'first' : a.own, income: +a.income, kids: +a.kids || 0, newly: a.newly === 'y', baby: a.baby === 'y', dual: a.dual === 'y', small: a.over85 === 'y' ? false : true });
    const ok = list.filter(x => x.ok);
    return {
      head: ok.length ? `${ok.map(x => x.name).join(' · ')} 조건에 맞아요 — 예상 한도 최대 ${won(Math.max(...ok.map(x => x.est)))}` : '넣은 조건으로는 맞는 정책 대출이 없어요',
      nums: list.map(x => ({ k: x.name, v: x.ok ? `가능 · 최대 ${won(x.est)}` : '조건 안 맞음', s: x.conds.map(c => (c.ok ? '✓ ' : '✗ ') + c.t).join(' · ') + (x.extra ? ' · ' + x.extra : '') })),
      warn: ['순자산·소득 증빙·주택 가격 기준일은 상품마다 달라요. 신청 전에 상품 안내에서 한 번 더 확인해 주세요.', '정책 대출도 소득 기준 심사(DTI)를 따로 해요.'],
      note: `집값 ${won(+a.price)} · 연 소득 ${won(+a.income)} · 자녀 ${a.kids || 0}명${a.newly === 'y' ? ' · 신혼' : ''}${a.baby === 'y' ? ' · 2년 안 출산' : ''}`,
      src: ['nhuf', 'hf', 'loan'] };
  };

  S.firstHome = (a, E) => {
    const miss = need(a, ['price']); if (miss.length) return { need: miss };
    const P = +a.price * 1e4, big = a.over85 === 'y';
    const f = E.T.buyerAcqTax(P, { own: 'first', large: big }), n = E.T.buyerAcqTax(P, { own: 'none', large: big });
    const g = groupOf(E, a.region && a.region.code), lf = E.L.LTV[g].first, ln = E.L.LTV[g].none;
    const save = (n.acq + n.edu + n.farm) - (f.acq - f.relief + f.edu + f.farm);
    return {
      head: save > 0 ? `생애 첫 집이면 취득세가 ${wonW(save)} 줄어요` : '이 집값은 생애최초 취득세 감면 대상이 아니에요(12억 원 초과)',
      nums: [
        { k: '생애최초 취득세(지방교육세 포함)', v: wonW(f.acq - f.relief + f.edu + f.farm), s: `감면 ${wonW(f.relief)}(한도 ${wonW(f.reliefCap)})` },
        { k: '감면 없을 때', v: wonW(n.acq + n.edu + n.farm), s: `세율 ${pct(n.rate, 2)}` },
        { k: '대출 담보 비율(LTV)', v: `생애최초 ${pct(lf)} · 일반 무주택 ${pct(ln)}`, s: GNAME[g] }
      ],
      warn: ['산 날부터 3년 안에 팔거나 임대하면 감면받은 세금을 다시 내요.', '본인·배우자 모두 집을 가진 적이 없어야 해요(분양권·입주권 포함 여부는 구청에 확인).'],
      note: `집값 ${won(+a.price)} · 전용 85㎡ ${big ? '초과' : '이하'} · ${GNAME[g]}`, src: ['first36_3', 'acq11', 'loan'] };
  };

  S.buyCost = (a, E) => {
    const miss = need(a, ['price', 'own']); if (miss.length) return { need: miss };
    const g = groupOf(E, a.region && a.region.code), own = a.own === 'first' ? 'first' : a.own || 'none';
    const c = E.L.ctx({ g, own }), d = E.L.costDetail(+a.price, c, a.over85 === 'y');
    const tax = d.acq - d.relief + d.edu + d.farm;
    return {
      head: `${won(+a.price)} 집이면 집값 말고 ${won(Math.round(tax + d.broker))}가 더 들어요`,
      nums: [
        { k: '취득세', v: won(Math.round(d.acq - d.relief)), s: `세율 ${d.rate}%${d.relief ? ` · 생애최초 감면 ${won(Math.round(d.relief))}` : ''}` },
        { k: '지방교육세·농어촌특별세', v: won(Math.round(d.edu + d.farm)), s: '취득세와 함께 내요' },
        { k: '중개보수(상한, 부가세 포함)', v: won(Math.round(d.broker)), s: `상한 요율 ${d.br}% — 중개사와 협의해 낮출 수 있어요` }
      ],
      warn: ['취득세는 잔금일부터 60일 안에 내야 가산세가 없어요.', '등기 비용(법무사 보수·채권 할인)과 이사·수리 비용은 따로 챙겨 두세요.'],
      note: `${ownName[own]} · ${GNAME[g]} · 전용 85㎡ ${a.over85 === 'y' ? '초과' : '이하'}`, src: ['acq11', 'broker20', 'brokerSeoul'] };
  };

  S.acqTax = (a, E) => {
    const miss = need(a, ['price', 'houses']); if (miss.length) return { need: miss };
    const adj = adjAt(E, a.region, E.today) === true, h = a.houses;
    const r = E.T.acqTax({ price: +a.price * 1e4, houses: h === '2t' ? 2 : Math.min(3, +h || 1), adj, temp: h === '2t', over85: a.over85 === 'y' });
    return { head: `취득세(지방교육세 포함)는 ${wonW(r.total)}예요 — 세율 ${pct(r.rate, 2)}`,
      nums: [{ k: '취득세', v: wonW(r.acq - r.relief), s: r.why }, { k: '지방교육세', v: wonW(r.edu), s: '' }, { k: '농어촌특별세', v: wonW(r.farm), s: a.over85 === 'y' ? '전용 85㎡ 초과' : '전용 85㎡ 이하는 없어요' }],
      warn: (r.notes || []).slice(0, 2).map(yo).concat(['잔금일부터 60일 안에 신고·납부해야 해요.']),
      note: `집값 ${won(+a.price)} · ${a.region ? regTxt(a) + (adj ? '(조정대상지역)' : '(조정대상지역 아님)') : '지역 미선택(비조정으로 계산)'}`, src: ['acq11', 'acq13_2', 'acq'] };
  };

  S.exempt = (a, E) => {
    const miss = need(a, ['acq']); if (miss.length) return { need: miss };
    const adj = a.adj === 'y' ? true : a.adj === 'n' ? false : adjAt(E, a.region, a.acq);
    const hold2 = addY(a.acq, 2), rs0 = a.rs ? (a.rs < a.acq ? a.acq : a.rs) : '', live2 = adj === true ? (rs0 ? addY(rs0, 2) : null) : null;
    const reach = adj === true ? (live2 && live2 > hold2 ? live2 : hold2) : hold2;
    const nums = [{ k: '보유 2년', v: ko(hold2), s: E.today >= hold2 ? '채웠어요' : `${diffD(E.today, hold2)}일 남았어요` }];
    if (adj === true) nums.push({ k: '거주 2년', v: live2 ? ko(live2) : '전입일 필요', s: live2 ? (E.today >= live2 ? '채웠어요' : `${diffD(E.today, live2)}일 남았어요`) : '살 때 조정대상지역이라 2년 이상 살아야 해요' });
    if (a.salep > 120000) nums.push({ k: '12억 원 넘는 집', v: '일부 과세', s: `팔 가격 ${won(a.salep)} 중 12억 원을 넘는 비율만큼 양도세가 나와요` });
    return { head: adj === true && !live2 ? '살 때 조정대상지역이라 거주 2년까지 채워야 비과세예요' : (E.today >= reach ? '보유·거주 요건을 이미 채웠어요' : `${ko(reach)}부터 1세대 1주택 비과세 요건을 채워요`),
      nums, warn: ['기준일 당일·전날 잔금은 하루 차이로 비과세가 갈릴 수 있어요. 여유 있게 잡아 주세요.', adj === 'ask' ? '살 때 조정대상지역이었는지 자동으로 판단하지 못했어요(일부만 지정된 곳). 구청이나 세무사에게 확인해 주세요.' : '세대원 중 다른 집이 있으면 비과세가 안 될 수 있어요.'],
      note: `취득 ${ko(a.acq)}${a.rs ? ` · 전입 ${ko(a.rs)}` : ''} · 살 때 조정대상지역 ${adj === true ? '맞음' : adj === false ? '아님' : '확인 필요'}`, src: ['own1', 'cgt_law'] };
  };

  S.temp2 = (a, E) => {
    const miss = need(a, ['acq', 'newd']); if (miss.length) return { need: miss };
    const oa = yn(a.oa), na = yn(a.na), unknown = oa == null || na == null;
    const r = E.T.tempTwoDeadline(a.acq, unknown ? true : oa, a.newd, unknown ? true : na);
    const years = a.pre === 'y' ? 3 : r.years, end = addY(a.newd, years), left = diffD(E.today, end);
    return { head: `지금 집은 ${ko(end)}까지 팔아야 일시적 2주택 비과세를 받아요${left > 0 ? `(${left.toLocaleString()}일 남음)` : ''}`,
      nums: [{ k: '처분 기한', v: ko(end), s: `새 집 잔금일부터 ${years}년${years === 2 ? '(두 집 모두 조정대상지역 · 2026.8.4 이후 새 집 취득)' : ''}` },
        { k: '남은 날', v: left > 0 ? `${left.toLocaleString()}일` : '기한 지남', s: '' },
        { k: '종전 집 보유 1년 조건', v: r.before1y ? '못 채움' : '채움', s: '지금 집을 산 지 1년이 지난 뒤 새 집을 사야 특례가 돼요' }],
      warn: [unknown ? '조정대상지역 여부를 모르셔서 더 이른 2년 기준으로 계산했어요.' : '', '지금 집도 보유 2년(살 때 조정대상지역이면 거주 2년)을 채워야 비과세예요.', '기한 마지막 주에는 잔금이 밀릴 수 있어요. 한두 달 여유를 두세요.'].filter(Boolean),
      note: `지금 집 취득 ${ko(a.acq)} · 새 집 잔금 ${ko(a.newd)}${a.pre === 'y' ? ' · 2026.8.3 전 계약금' : ''}`, src: ['own1', 'tmp26', 'cgt155'] };
  };

  S.propTax = (a, E) => {
    const miss = need(a, ['pub', 'one']); if (miss.length) return { need: miss };
    const one = a.one === 'y', p = E.T.propertyTax({ price: a.pub * 1e4, one }), c = E.T.compTax({ prices: [a.pub * 1e4], one });
    return { head: `올해 보유세는 재산세 ${wonW(p.total)}${c.total > 0 ? ` + 종부세 ${wonW(c.total)}` : ', 종부세는 없어요'}`,
      nums: [{ k: '재산세(도시지역분·지방교육세 포함)', v: wonW(p.total), s: `7월 ${wonW(p.july)} · 9월 ${wonW(p.sept)}${p.special ? ' · 1세대1주택 특례세율' : ''}` },
        { k: '종합부동산세(농어촌특별세 포함)', v: wonW(c.total), s: `공제 ${wonW(c.ded)} — 공시가격이 공제보다 낮으면 없어요` }],
      warn: ['6월 1일에 집을 가진 사람이 그해 보유세를 내요. 사고팔 때 잔금일을 6월 1일 앞뒤로 살펴보세요.', '종부세 고령자·장기보유 세액공제는 나이·보유 기간을 넣어 세금 계산기에서 확인해 주세요.'],
      note: `공시가격 ${won(a.pub)} · ${one ? '1세대 1주택' : '다른 집도 있음(이 집만 계산)'}`, src: ['prop111', 'comp'] };
  };

  S.transferTax = (a, E) => {
    const miss = need(a, ['acq', 'acqp', 'salep']); if (miss.length) return { need: miss };
    return Object.assign(S.sellWhen(a, E), { src: ['cgt_law', 'cgt104', 'cgt_easy'] });
  };

  S.jeonseRenew = (a, E) => {
    const miss = need(a, ['end']); if (miss.length) return { need: miss };
    const from = addM(a.end, -6), to = addM(a.end, -2), t = E.today;
    const st = t < from ? `${diffD(t, from)}일 뒤부터 요구할 수 있어요` : t <= to ? `지금 요구할 수 있어요(마감까지 ${diffD(t, to)}일)` : '요구 기간이 지났어요';
    const nums = [{ k: '계약갱신요구 기간', v: `${ko(from)} ~ ${ko(to)}`, s: st }];
    if (a.dep > 0) nums.push({ k: '갱신 때 올릴 수 있는 최대', v: won(Math.floor(a.dep * 0.05)), s: `보증금 ${won(a.dep)} → 최대 ${won(Math.floor(a.dep * 1.05))}(5% 상한)` });
    return { head: t <= to ? `${ko(to)}까지 계약갱신을 요구하면 2년 더, 최대 5%까지만 올려요` : '갱신 요구 기간이 지났어요 — 집주인과 새로 합의하거나 이사를 준비해요',
      nums, warn: ['갱신요구권은 한 번만 쓸 수 있어요. 문자·내용증명처럼 남는 방법으로 요구해 두세요.', '집주인(직계가족 포함)이 직접 살겠다고 하면 거절될 수 있어요. 그 뒤 2년 안에 다른 사람에게 세를 주면 손해배상을 청구할 수 있어요.', '이사를 고민한다면 지금 동네 전세 시세가 어떻게 바뀌었는지 먼저 비교해 보세요.'],
      note: `만기 ${ko(a.end)}${a.dep ? ` · 보증금 ${won(a.dep)}` : ''}`, src: ['renew', 'renew2', 'lh7'] };
  };

  S.rentRaise = (a, E) => {
    const miss = need(a, ['dep']); if (miss.length) return { need: miss };
    const nums = [{ k: '한 번에 올릴 수 있는 최대(보증금)', v: won(Math.floor(a.dep * 0.05)), s: `${won(a.dep)} × 5% — 갱신 때와 계약 중 증액 모두` }];
    if (a.wrent > 0) nums.push({ k: '월세를 올린다면 최대', v: won(Math.floor(a.wrent * 0.05 * 10) / 10), s: `월 ${won(a.wrent)} × 5%` });
    let warn = ['계약 중 증액은 약정한 날(또는 직전 증액)부터 1년이 지나야 다시 요구할 수 있어요.', '5% 상한은 갱신·계약 중 증액에 적용돼요. 새 세입자와의 새 계약에는 적용되지 않아요.'];
    if (E.base && E.base.v > 0) {
      const cap = Math.min(10, E.base.v + 2) / 100;
      nums.push({ k: '보증금 일부를 월세로 바꿀 때 상한 전환율', v: pct(cap, 1), s: `연 10%와 한국은행 기준금리(${E.base.v}%, ${E.base.at.slice(0, 4)}년 ${+E.base.at.slice(4, 6)}월) + 2%p 중 낮은 쪽 — 보증금 1,000만 원을 바꾸면 월세 최대 ${won(Math.floor(1000 * cap / 12 * 10) / 10)}` });
    } else warn.push('보증금을 월세로 바꿀 때 상한 전환율은 연 10%와 기준금리 + 2%p 중 낮은 쪽이에요.');
    return { head: `보증금은 최대 ${won(Math.floor(a.dep * 0.05))}까지만 올릴 수 있어요(5% 상한)`, nums, warn, note: `보증금 ${won(a.dep)}${a.wrent ? ` · 월세 ${won(a.wrent)}` : ''}`, src: ['lh7', 'lhd8', 'lhd9', 'bok'] };
  };

  S.depositSafe = (a, E) => {
    const miss = need(a, ['htype', 'dep']); if (miss.length) return { need: miss };
    if (!(a.pub > 0) && !(a.kb > 0)) return { need: ['pub'] };
    const metro = a.region ? /^(11|28|41)/.test(a.region.code) : true;
    const r = E.H.check({ dep: +a.dep, senior: +a.senior || 0, pub: +a.pub || 0, kb: +a.kb || 0, type: a.htype, metro, months: 24 });
    const pr = r.price, ratio = pr ? (+a.dep + (+a.senior || 0)) / pr : null;
    const nums = [
      { k: '전세보증보험(HUG) 가입', v: r.ok ? '가능해 보여요' : r.ok === false ? '어려워요' : '정보 부족', s: r.ok ? `예상 보증료 2년 ${r.fee != null ? wonW(r.fee) : '-'}` : r.checks.filter(c => !c.ok).map(c => ({ cap: `보증금 한도 ${won(c.lim)} 초과`, limit: `보증금 + 선순위 채권이 ${won(Math.floor(c.lim))}를 넘어요`, senior: '선순위 채권이 집값의 60%를 넘어요' })[c.k]).join(' · ') },
      { k: '이 조건에서 보험 되는 최대 보증금', v: won(r.maxDep), s: `주택가격 ${won(pr)}(${r.by === 'kb' ? '시세' : '공시가격 × 140%'}) × 90% − 선순위 채권` }
    ];
    if (ratio != null) nums.push({ k: '집값 대비 보증금 + 빚', v: pct(ratio), s: ratio >= 0.9 ? '90% 이상 — 깡통전세 위험 신호예요' : ratio >= 0.8 ? '80% 이상 — 조심해야 하는 수준이에요' : '80% 아래예요' });
    return { head: r.ok ? `보증보험 가입이 가능해 보여요 — 예상 보증료 2년 ${r.fee != null ? wonW(r.fee) : ''}` : `지금 조건으로는 보증보험 가입이 어려워요 — 최대 보증금 ${won(r.maxDep)}`,
      nums, warn: ['계약 전 등기부등본(근저당·압류)과 집주인 세금 체납 여부를 꼭 확인하세요.', '잔금 날 전입신고·확정일자를 함께 하고, 그날 집주인이 대출을 더 받지 않는다는 특약을 넣어 두세요.', '가입 심사는 HUG가 해요. 이 결과는 공식 기준으로 미리 본 값이에요.'],
      note: `${({ apt: '아파트', offi: '오피스텔', villa: '빌라', house: '단독·다가구' })[a.htype]} · 보증금 ${won(a.dep)}${a.senior ? ` · 선순위 ${won(a.senior)}` : ''}`, src: ['hug', 'lh3'] };
  };

  S.contractCheck = (a, E) => {
    const miss = need(a, ['dep', 'szone']); if (miss.length) return { need: miss };
    const z = SMALL[a.szone], ok = a.dep <= z[0];
    return { head: ok ? `보증금 ${won(a.dep)}은 최우선변제 대상이에요 — 경매가 돼도 ${won(z[1])}까지 먼저 받아요` : `보증금 ${won(a.dep)}은 최우선변제 기준(${won(z[0])} 이하)을 넘어요 — 확정일자 순서가 중요해요`,
      nums: [{ k: '최우선변제 기준(보증금)', v: `${won(z[0])} 이하`, s: z[2] }, { k: '먼저 받는 금액', v: won(z[1]), s: '집값(경매가)의 절반까지만이에요' }, { k: '전입신고 기한', v: '이사한 날부터 14일 안', s: '대항력은 전입신고 다음 날 0시부터 생겨요' }],
      warn: ['최우선변제 기준은 근저당이 처음 잡힌 날의 기준을 따라요. 오래된 근저당이 있으면 더 낮은 기준이 적용될 수 있어요.', '잔금 날 전입신고와 확정일자를 같은 날 하세요.', '계약 직전에 등기부등본을 다시 떼어 근저당·가압류가 새로 생기지 않았는지 보세요.'],
      note: `보증금 ${won(a.dep)} · ${z[2]}`, src: ['lhd11', 'lh3', 'jumin16'] };
  };

  S.wolseConv = (a, E) => {
    const miss = need(a, ['dep', 'wdep', 'wrent']); if (miss.length) return { need: miss };
    const J = +a.dep, D = +a.wdep, W = +a.wrent; if (!(J > D)) return { need: ['wdep'] };
    const gap = J - D, be = W * 12 / gap * 100, rate = a.jrate > 0 ? +a.jrate : null;
    const nums = [{ k: '손익이 같아지는 금리(전환율)', v: `연 ${Math.round(be * 100) / 100}%`, s: `월세 ${won(W)} × 12 ÷ (전세 ${won(J)} − 월세 보증금 ${won(D)})` }];
    let head = `전세대출 금리가 연 ${Math.round(be * 100) / 100}%보다 낮으면 전세가 덜 들어요`;
    if (rate != null) {
      const jc = gap * rate / 100 / 12, diff = W - jc;
      nums.push({ k: '전세로 갈 때 매달 이자', v: won(Math.round(jc * 10) / 10), s: `더 내는 보증금 ${won(gap)} × 연 ${rate}% ÷ 12` });
      nums.push({ k: '매달 차이', v: won(Math.round(Math.abs(diff) * 10) / 10), s: diff > 0 ? '전세가 덜 들어요' : diff < 0 ? '월세가 덜 들어요' : '같아요' });
      head = Math.abs(diff) < 0.5 ? '두 방법의 매달 비용이 거의 같아요' : `${diff > 0 ? '전세' : '월세'}가 한 달에 ${won(Math.round(Math.abs(diff) * 10) / 10)} 덜 들어요`;
    }
    return { head, nums, warn: ['전세는 보증금을 돌려받지 못할 위험이 있어요. 보증보험 가입 가능 여부도 함께 보세요.', '월세는 연말정산 월세 세액공제를 받을 수 있는지(소득·주택 기준) 확인해 보세요.'],
      note: `전세 ${won(J)} · 월세 보증금 ${won(D)} · 월세 ${won(W)}${rate != null ? ` · 금리 연 ${rate}%` : ''}`, src: ['lhd9'] };
  };

  S.rentToBuy = (a, E) => {
    const miss = need(a, ['dep', 'income']); if (miss.length) return { need: miss };
    const B = budgetCalc(Object.assign({}, a, { own: 'none' }), E, (+a.dep || 0) + (+a.cash || 0));
    return { head: B.P ? `보증금과 모은 돈을 합치면 ${regTxt(a)}에서 ${won(B.P)}까지 살 수 있어요` : '지금 조건으로는 대출 한도가 나오지 않아요',
      nums: B.P ? [{ k: '쓸 수 있는 돈', v: won((+a.dep || 0) + (+a.cash || 0)), s: `보증금 ${won(+a.dep)} + 모은 돈 ${won(+a.cash || 0)}` }, { k: '최대 집값', v: won(B.P), s: `대출 ${won(B.n.loan.L)} 포함, 취득세·중개보수 뺀 값` }] : [],
      warn: ['보증금을 돌려받는 날과 새 집 잔금일을 맞춰야 해요. 집주인과 만기일·반환일을 먼저 확인하세요.', '집을 사면 청약 무주택 기간이 끊겨요. 가점이 높다면 청약과 먼저 비교해 보세요.'],
      note: `무주택 · 연 소득 ${won(+a.income)} · ${GNAME[B.g]}`, src: ['fsc_dsr', 'loan'] };
  };

  S.moveTime = (a, E) => {
    const miss = need(a, ['deal', 'amt', 'mdate']); if (miss.length) return { need: miss };
    const f = brokerFee(a.deal === 'sale' ? 'sale' : 'lease', +a.amt);
    const nums = [{ k: '중개보수 상한(부가세 별도)', v: won(f.fee), s: `${pct(f.rate, 1)}${f.cap ? ` · 한도 ${won(f.cap)}` : ''}` }, { k: '전입신고', v: `${ko(addD(a.mdate, 14))}까지`, s: '이사한 날부터 14일 안' }];
    if (a.deal === 'sale') nums.push({ k: '취득세 납부', v: `${ko(addD(a.mdate, 60))}까지`, s: '잔금일부터 60일 안' });
    else nums.push({ k: '확정일자·전월세 신고', v: `${ko(addD(a.mdate, 30))}까지`, s: '계약한 날부터 30일 안 신고(보증금 6천만 원 초과 또는 월세 30만 원 초과)' });
    return { head: `${ko(a.mdate)} 이사면 전입신고는 ${ko(addD(a.mdate, 14))}까지예요`, nums,
      warn: ['이사 날짜가 정해지면 이사 업체 견적을 2~3곳 비교해 보세요. 손 없는 날·월말은 비싸요.', '잔금 전 마지막으로 등기부등본을 다시 확인하세요.'],
      note: `${({ sale: '매매', jeonse: '전세', wolse: '월세' })[a.deal]} ${won(+a.amt)} · ${ko(a.mdate)}`, src: ['broker20', 'jumin16', 'acq'] };
  };

  S.brokerFee = (a, E) => {
    const miss = need(a, ['deal', 'amt']); if (miss.length) return { need: miss };
    const amt = a.deal === 'wolse' ? wolseAmt(+a.amt, +a.wrent || 0) : +a.amt, f = brokerFee(a.deal === 'sale' ? 'sale' : 'lease', amt);
    return { head: `중개보수 상한은 ${won(f.fee)}이에요(부가세 별도)`,
      nums: [{ k: '거래 금액', v: won(amt), s: a.deal === 'wolse' ? `보증금 + 월세 × ${amt === +a.amt + (+a.wrent || 0) * 70 ? 70 : 100}` : '' }, { k: '상한 요율', v: pct(f.rate, 1), s: f.cap ? `한도 ${won(f.cap)}` : '' },
        { k: '부가세 포함(일반과세자)', v: won(Math.round(f.fee * 1.1 * 10) / 10), s: '간이과세자는 더 적어요' }],
      warn: ['상한 요율 안에서 중개사와 협의해 정해요. 계약 전에 금액을 미리 정해 두세요.', '시·도 조례마다 요율이 조금 다를 수 있어요. 서울 기준이에요.'],
      note: `${({ sale: '매매', jeonse: '전세', wolse: '월세' })[a.deal]} ${won(+a.amt)}${a.deal === 'wolse' ? ` · 월세 ${won(+a.wrent || 0)}` : ''}`, src: ['broker20', 'brokerSeoul'] };
  };

  S.highBargain = (a, E) => {
    if (!a.facts || !a.facts.price) return { need: ['danji'] };
    const F = a.facts, nums = [{ k: '최근 실거래 시세', v: won(F.price), s: `${F.apt} ${F.band} · 3개월 실거래 중간값` }];
    if (F.range && F.range.hi) nums.push({ k: '최근 1년 범위', v: `${won(F.range.lo)} ~ ${won(F.range.hi)}`, s: `${F.range.months}개월 거래 기준` });
    let head = `${F.apt} ${F.band} 최근 시세는 ${won(F.price)}예요`;
    if (a.price > 0) {
      const d = Math.round((a.price / F.price - 1) * 10000) / 10000;
      nums.push({ k: '넣은 가격과 시세 차이', v: (d >= 0 ? '+' : '') + pct(d, 1), s: d <= -0.1 ? '집예보 급매 기준(최근 3개월 같은 평형 중간값보다 10% 이상 낮음)에 들어가요' : F.range && a.price > F.range.hi ? '최근 1년 최고가보다 높아요 — 신고가 수준이에요' : '최근 거래 범위 안이에요' });
      head = d <= -0.1 ? `이 가격은 최근 시세보다 ${pct(-d, 1)} 낮아요 — 급매 기준에 들어가요` : F.range && a.price > F.range.hi ? '이 가격은 최근 1년 최고가보다 높아요' : `이 가격은 최근 시세와 ${pct(Math.abs(d), 1)} 차이예요`;
    }
    const ref = F.fv != null ? [{ k: '미래가치 점수(참고)', v: `${F.fv}점`, s: `${F.fvBase || ''} 중 순위${F.track ? ` · 과거 성적 ${F.track.n}번 중 ${F.track.hit}번 맞음` : ''}` }] : [];
    return { head, nums, ref, warn: ['층·향·수리 상태에 따라 같은 평형도 값이 달라요.', '급매는 이유(세입자·하자·급한 사정)가 있는지 꼭 물어보세요.'], note: '국토교통부 실거래 신고 기준 · 신고 기한(30일) 때문에 최근 거래는 늘어날 수 있어요', src: ['molit_rt'] };
  };

  S.areaMove = (a, E) => {
    const rg = a.work || a.region; if (!rg) return { need: [a.work === undefined && a.region === undefined ? 'region' : 'work'] };
    const g = E.IX && E.IX.sgg && E.IX.sgg[rg.code], nums = [];
    if (g && Array.isArray(g.s) && g.s.length) { const s = g.s, last = s[s.length - 1]; nums.push({ k: `${rg.name} 아파트 평당가(3.3㎡)`, v: won(last), s: '최근 실거래 중간값' }); if (g.r && g.r.jr) nums.push({ k: '전세가율', v: `${g.r.jr}%`, s: `전세 평당가 약 ${won(Math.round(last * g.r.jr / 100))}` }); }
    if (a.btype === 'buy' && a.cash > 0 && a.income > 0) { const B = budgetCalc(Object.assign({ own: 'none' }, a, { region: rg }), E, +a.cash); if (B.P) nums.push({ k: '내 예산 최대 집값', v: won(B.P), s: g && g.s ? `평당가 기준 약 ${Math.floor(B.P / g.s[g.s.length - 1])}평` : '' }); }
    if (a.btype === 'jeonse' && a.cash > 0 && g && g.s && g.r && g.r.jr) { const jp = g.s[g.s.length - 1] * g.r.jr / 100; nums.push({ k: '내 돈으로 구할 수 있는 전세 넓이', v: `약 ${Math.floor(a.cash / jp)}평`, s: `전세 평당가 약 ${won(Math.round(jp))} 기준(대출 제외)` }); }
    return { head: `${rg.name} 기준으로 시세와 내 예산을 맞춰 봤어요`, nums, warn: ['학교 배정은 주소(학구)마다 달라요. 계약 전에 교육지원청 학구도를 확인해 주세요.', '구 평균이라 단지마다 차이가 커요. 지도에서 단지별 시세를 함께 보세요.'], note: '국토교통부 실거래 기준 구 전체 값', src: ['molit_rt', 'loan'] };
  };

  S.redevStage = (a, E) => {
    const miss = need(a, ['stage']); if (miss.length) return { need: miss };
    const ST = (E.RD && E.RD.STAGES) || {}, cur = +a.stage, keys = Object.keys(ST).map(Number).filter(k => k >= 3).sort((x, y) => x - y);
    const left = keys.filter(k => k > cur);
    return { head: `${ST[cur] || ''} 단계예요 — 착공까지 ${left.length}단계 남았어요`,
      nums: [{ k: '남은 단계', v: left.length ? left.map(k => ST[k]).join(' → ') : '착공', s: '' }, { k: '조합원 입주권이 생기는 때', v: '관리처분인가', s: cur >= 8 ? '이미 지났어요 — 지금은 입주권으로 거래돼요' : '그 전까지는 주택(또는 토지)으로 거래돼요' }],
      info: [{ t: '관리처분인가 뒤의 조합원입주권도 양도세 비과세 판정 때 주택 수에 들어가요.', ok: true, src: 'cgt89_2' }, { t: '2021년 1월 1일 이후 취득한 분양권도 주택 수에 들어가요.', ok: true, src: 'cgt89_2' }],
      warn: ['조합원 지위 양도 제한(투기과열지구 재건축 조합설립 뒤 등)이 있는지 구역마다 꼭 확인하세요.', '단계마다 걸리는 시간은 구역마다 크게 달라요. 구역 지도에서 비슷한 구역의 과거 기간을 보세요.'], note: '서울시 정비사업 단계 기준', src: ['redev_law', 'cgt89_2', 'cleanup'] };
  };

  S.switchOrder = (a, E) => {
    const miss = need(a, ['newprice', 'income']); if (miss.length) return { need: miss };
    const code = (a.newreg && a.newreg.code) || (a.region && a.region.code);
    const sell = E.L.limit({ price: +a.newprice, code, own: 'none', income: +a.income, debt: +a.debt || 0, rate: a.lrate > 0 ? +a.lrate : 4 });
    const keep = E.L.limit({ price: +a.newprice, code, own: 'one', income: +a.income, debt: +a.debt || 0, rate: a.lrate > 0 ? +a.lrate : 4 });
    const oa = adjAt(E, a.region, E.today) === true, na = adjAt(E, a.newreg || a.region, E.today) === true;
    const t = E.T.tempTwoDeadline('2000-01-01', oa, E.today, na);
    return { head: `먼저 팔면 대출 ${won(Math.floor(sell.L))}, 먼저 사면 ${won(Math.floor(keep.L))}까지예요`,
      nums: [{ k: '먼저 팔고 살 때(무주택)', v: won(Math.floor(sell.L)), s: `담보 비율 ${pct(sell.ltv)}` }, { k: '먼저 사고 팔 때(1주택·처분 조건)', v: won(Math.floor(keep.L)), s: `담보 비율 ${pct(keep.ltv)} · 기존 집을 기한 안에 판다는 약정` },
        { k: '먼저 사면 지금 집 처분 기한', v: `새 집 잔금일부터 ${t.years}년`, s: `오늘 잔금이면 ${ko(addY(E.today, t.years))}까지(지금 집 ${oa ? '조정' : '비조정'} → 새 집 ${na ? '조정' : '비조정'})` }],
      warn: ['먼저 팔면 이사 사이에 잠깐 살 곳(전세·단기 임대)과 비용이 필요해요.', '먼저 사면 기한 안에 못 팔 때 비과세가 사라지고 대출 약정 위반이 될 수 있어요.', '두 거래의 잔금일을 같은 날로 맞추는 방법도 있어요.'],
      note: `새 집 ${won(+a.newprice)} · 연 소득 ${won(+a.income)}`, src: ['loan', 'own1', 'tmp26'] };
  };

  /** 해법 카드 계산: id → 카드 또는 {need:[칸]} · E 에 엔진·자료가 없으면 {err} */
  function solve(sc, a, E) {
    const f = S[sc.solve]; if (!f) return { err: 'nosolver' };
    E = Object.assign({ today: todayKst() }, E || {});
    try { const r = f(a || {}, E); if (r && !r.need) { r.id = sc.id; r.src = r.src || sc.src || []; } return r; }
    catch (e) { return { err: String(e && e.message || e) }; }
  }

  const API = { norm, extract, moneys, classify, pending, solve, mask, won, wonW, pct, ko, addM, addY, addD, diffD, fill, nextFor, brokerFee, wolseAmt, SMALL, FEE, BAD, MIN, SOLVERS: Object.keys(S) };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_GUIDE_CORE = API;
})(typeof window !== 'undefined' ? window : globalThis);
