/* 모닝 브리핑 — 화면 공용 계산 (JDJ_BRIEF)
   - 이름: B.NAME = `${SITE_NAME} 모닝 브리핑` — 서비스 이름은 assets/config.js 의 JDJ_SITE.SITE_NAME 한 곳에서 읽어요.
     화면의 [data-brief-name] 칸은 B.fillNames() 가 이 이름으로 채워요(서비스 이름이 바뀌면 함께 바뀜).
   - 자료: 공개 데이터 data/brief/market.json (① 오늘의 부동산 시장 — 전국 공통 하루 1개)
           data/brief/{시군구}.json (② 내 관심 지역 · ③ 내 관심 단지 — 엔진 brief.py 가 매일 새벽 동네별로 만듦)
   - 이 파일은 숫자를 새로 만들지 않고, 받은 자료를 동(洞)으로 거르고 읽기 쉬운 글로 바꾸기만 한다.
   - 주소: /brief/?d=11710 (구 전체) · ?d=11710-잠실동 (동) · &v=pro (중개사용) · &card=1 (카드 이미지 화면 1080×1080) */
(function (root) {
  'use strict';
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const SITE = ((root.JDJ_SITE || {}).SITE_NAME || '').trim() || '집코드';
  const NAME = `${SITE} 모닝 브리핑`;
  /* ★ 요금제 표 — 화면(판매·신청·관리)은 이 표 한 곳만 봐요.
     서버 tools/agent-backend.gs 의 BRIEF_TIERS 와 숫자가 같아야 해요(tools/brief-web-test.js 가 두 표를 대조해요).
     id: 상품 id · label: 화면 이름 · amount: 한 달 금액(원, 부가세 포함) · areas: 관심 지역 수 · apts: 관심 단지 수
     customers: 내 손님 브리핑 손님 수(0 = 없음) · urgPick: 급매 기준(5~20%)을 직접 고름(아니면 10%) · weekly: 주간 시장 리포트(내 이름 PDF)
     pro: 중개사 내용(손님께 할 이야기 3줄·공유 카드) · broker: 가입할 때 중개사무소 등록번호 필요 · launch: '런칭가' 표시
     listing: 매물 설명서 한 달 장수 · kitAreas: 주간 블로그·인스타 글 한 주 지역 수(서버 BRIEF_TIERS 와 같음)
     show: 화면에 보임(false 면 화면에 안 보이고 서버도 주문을 받지 않아요) · inc: 판매 화면에 보이는 '들어 있는 것'
     새 요금제(예: 중개사 플러스)는 이 표와 서버 표에 줄 하나씩 더하고 show:false 로 두었다가, 내용이 정해지면 true 로 바꾸면 돼요. */
  const TIERS = [
    { id: 'brief', label: '기본', name: NAME, amount: 3900, areas: 3, apts: 3, customers: 0, urgPick: false, weekly: false, pro: false, broker: false, launch: false, listing: 0, kitAreas: 0, show: true,
      who: '내 동네만 챙겨 보는 분', inc: ['관심 지역 3곳', '관심 단지 3개', '오늘의 부동산 시장과 코너 7개'] },
    { id: 'brief_plus', label: '플러스', name: `${NAME} 플러스`, amount: 5900, areas: 10, apts: 10, customers: 0, urgPick: false, weekly: false, pro: false, broker: false, launch: false, listing: 10, kitAreas: 1, show: true,
      who: '여러 동네·단지를 비교하는 분', inc: ['관심 지역 10곳', '관심 단지 10개', '기본에 있는 것 모두', '매물 설명서 한 달 10장', '주간 블로그·인스타 글(지역 1곳)'] },
    { id: 'brief_pro', label: '중개사용', name: `${NAME} 중개사용`, amount: 4900, areas: 10, apts: 10, customers: 0, urgPick: false, weekly: false, pro: true, broker: true, launch: true, listing: 30, kitAreas: 1, show: true,
      who: '공인중개사', inc: ['관심 지역 10곳', '관심 단지 10개', '손님께 할 이야기 3줄(복사 버튼)', '손님에게 보낼 카드 이미지', '매물 설명서 한 달 30장', '주간 블로그·인스타 글(지역 1곳)'] },
    { id: 'brief_pro_plus', label: '중개사 플러스', name: `${NAME} 중개사 플러스`, amount: 9900, areas: 20, apts: 30, customers: 10, urgPick: true, weekly: true, pro: true, broker: true, launch: true, listing: 150, kitAreas: 5, show: true,
      who: '손님이 많은 공인중개사', inc: ['관심 지역 20곳', '관심 단지 30개', '중개사용에 있는 것 모두', '내 손님 브리핑: 손님 10명까지 손님별 브리핑', '급매 알림 기준 직접 정하기(5~20%, 기본 10%)', '주간 시장 리포트: 내 이름이 들어간 PDF', '매물 설명서 한 달 150장', '주간 블로그·인스타 글(지역 5곳)'] }
  ];
  const PRICE = Object.fromEntries(TIERS.map(t => [t.id, t]));
  const URG = { def: 10, lo: 5, hi: 20 };   // 급매 기준(%) — 서버 BRIEF_URG 와 같음
  const MAX = { areas: Math.max(...TIERS.map(t => t.areas)), apts: Math.max(...TIERS.map(t => t.apts)) };
  /* 운영자(대표) 모드: 받는 지역·관심 단지 수만 늘림(요금제·결제와 무관). 서버 BRIEF_ADMIN_LIM 과 같아야 해요(tools/brief-admin-test.js 가 대조) */
  const ADMIN = { areas: 300, apts: 100 };
  /* 운영자 [시·도마다 대표 지역 1곳씩 한 번에 넣기] — 시·도 이름이 바뀌어도(통합·특별자치도) 찾게 시·도는 낱말 여럿으로, 시·군·구는 이름 그대로 찾아요.
     광주·전남은 '전남광주통합특별시' 하나로 합쳐져서 두 곳(광주 서구·여수시)을 넣어 17곳이에요. */
  const REP = [
    [['서울'], '강남구'], [['부산'], '해운대구'], [['대구'], '수성구'], [['인천'], '연수구'], [['광주'], '서구'],
    [['대전'], '유성구'], [['울산'], '남구'], [['세종'], '세종시'], [['경기'], '성남시 분당구'], [['강원'], '춘천시'],
    [['충청북', '충북'], '청주시 흥덕구'], [['충청남', '충남'], '천안시 서북구'], [['전북', '전라북'], '전주시 완산구'],
    [['전남', '전라남'], '여수시'], [['경상북', '경북'], '포항시 남구'], [['경상남', '경남'], '창원시 성산구'], [['제주'], '제주시']
  ];
  const B = {
    SITE, NAME,
    DATA: JB.DATA + 'data/brief/',
    DROP: -10,                                      // '최근 2년 최고가보다 많이 내린 거래' 기준(%)
    TIERS, PRICE, URG, MAX, ADMIN,
    REP,
    /** 대표 지역 넣기: SG(data/index.json 의 sgg) 에서 REP 를 찾아 cur(지금 목록) 뒤에 겹치지 않게 더함. 지금 목록은 그대로 둠.
        돌려줌 { areas 새 목록, added 더한 수, missing 못 찾은 이름[] } — lim 을 넘으면 거기까지만 */
    repAreas(SG, cur, lim) {
      const out = (cur || []).slice(), missing = [], E = Object.entries(SG || {}); let added = 0;
      REP.forEach(([keys, name]) => {
        const hit = E.find(([, x]) => x && x.name === name && keys.some(k => String(x.sido || '').indexOf(k) >= 0));
        if (!hit) { missing.push(keys[0] + ' ' + name); return; }
        const [g, x] = hit;
        if (out.some(a => a.g === g && !a.dn)) return;
        if (lim && out.length >= lim) { missing.push(keys[0] + ' ' + name); return; }
        out.push({ g, gn: x.name, sd: x.sido, dn: '' }); added++;
      });
      return { areas: out, added, missing };
    },
    TRIAL_DAYS: 7,
    REF: { months: 1, yearMax: 12 },        // 친구 초대 보상(서버 BRIEF_REF 와 같음)
    /** 급매 목록: 기준(%)이 10이면 자료의 urgent 그대로, 다르면 urgent + urgent_lo(5~10% 후보)에서 기준 이상만 — 서버 bUrgent 와 같음 */
    urgentFor(S, thr) {
      thr = Number(thr) || URG.def;
      const all = thr === URG.def ? (S.urgent || []) : (S.urgent || []).concat(thr < URG.def ? (S.urgent_lo || []) : []);
      return all.filter(u => Math.abs(Number(u.disc)) >= thr).sort((x, y) => x.disc - y.disc);
    },
    /** 이 기기에 저장된 내 급매 기준(중개사 플러스가 구독 관리에서 정함). 없거나 범위 밖이면 10 */
    myUrg() { try { const v = Number(localStorage.getItem('jdj_brief_urg')); return v >= URG.lo && v <= URG.hi ? v : URG.def; } catch (e) { return URG.def; } },
    /** 금액 '9,900원' */
    krw: n => `${Number(n).toLocaleString('ko-KR')}원`,
    /** 화면에 보이는 요금제(표 순서대로) */
    shownTiers: () => TIERS.filter(t => t.show),
    tier: id => PRICE[id] || null,
    /** 중개사무소 등록번호 형식 확인(서버 bBrokerNo 와 같은 규칙). 진짜 등록 여부는 운영자가 따로 확인해요.
        요즘 형식 '시군구 코드 5자리-등록 연도 4자리-일련번호 4~5자리'(예: 11680-2020-00123)는 kind 'new',
        예전 형식(한글·숫자·붙임표, 예: 서울강남-1234)은 kind 'old' 로 받아 두고 확인해요. */
    brokerNo(s, year) {
      const t = String(s == null ? '' : s).replace(/\s+/g, '').replace(/[‐‑–—−]/g, '-').replace(/^제/, '').replace(/호$/, '');
      const Y = year || new Date().getFullYear(), bad = m => ({ ok: false, err: m });
      if (!t) return bad('중개사무소 등록번호를 적어 주세요.');
      if (t.length > 30) return bad('등록번호가 너무 길어요. 다시 확인해 주세요.');
      if (/^01[016789]-?\d{3,4}-?\d{4}$/.test(t)) return bad('전화번호가 아니라 중개사무소 등록번호를 적어 주세요.');
      if (/^\d{3}-?\d{2}-?\d{5}$/.test(t)) return bad('사업자등록번호가 아니라 중개사무소 등록번호를 적어 주세요.');
      const m = t.match(/^([1-5]\d{4})-?(\d{4})-?(\d{4,5})$/);
      if (m) return +m[2] >= 1984 && +m[2] <= Y ? { ok: true, norm: `${m[1]}-${m[2]}-${m[3]}`, kind: 'new' } : bad('등록 연도(가운데 4자리)를 다시 확인해 주세요.');
      if (/^\d{5}-?\d{4}-?\d{4,5}$/.test(t)) return bad('앞 5자리(시·군·구 코드)를 다시 확인해 주세요.');
      if (/^[가-힣0-9]+(-[가-힣0-9]+){0,4}$/.test(t) && /[가-힣-]/.test(t) && (t.match(/\d/g) || []).length >= 4) return { ok: true, norm: t, kind: 'old' };
      return bad('중개사무소 등록번호 형식이 맞지 않아요. 예: 11680-2020-00123');
    },
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    /** '11710-잠실동' → {g:'11710', dn:'잠실동'} (잘못된 값이면 null) */
    parseD(d) {
      const m = String(d || '').match(/^(\d{5})(?:-([가-힣0-9·.]{1,20}))?$/);
      return m ? { g: m[1], dn: m[2] || '' } : null;
    },
    dKey: (g, dn) => g + (dn ? '-' + dn : ''),
    /** 만원 → '31억 2,000만 원' */
    won(m) {
      if (m == null || m === '') return '';
      m = Math.round(Number(m)); const e = Math.floor(m / 10000), r = m % 10000;
      if (e && r) return `${e}억 ${r.toLocaleString('ko-KR')}만 원`;
      if (e) return `${e}억 원`;
      return `${r.toLocaleString('ko-KR')}만 원`;
    },
    /** 짧은 금액: '31.2억' · '9,500만' */
    wonS(m) { m = Number(m); return m >= 10000 ? (Math.round(m / 1000) / 10).toString().replace(/\.0$/, '') + '억' : m.toLocaleString('ko-KR') + '만'; },
    md: i => `${Math.floor(i / 100) % 100}/${i % 100}`,
    ymI: i => `${Math.floor(i / 10000)}.${Math.floor(i / 100) % 100}`,
    ds: s => s ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : '',
    pct: x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1) + '%',
    /** '2026-11-21' → '11월 21일(토)' */
    dateLabel(iso) {
      const d = new Date(String(iso) + 'T00:00:00+09:00'); if (isNaN(d)) return '';
      const k = new Date(d.getTime() + 9 * 3600000);
      return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일(${DAYS[k.getUTCDay()]})`;
    },
    /** 확인 기간 문구 — 엔진 brief.window_text 와 같은 규칙 */
    windowText(w) {
      if (!w || !w.to) return '';
      if (!w.from) return '처음 확인';
      const a = new Date(w.from + 'T00:00:00Z'), b = new Date(w.to + 'T00:00:00Z');
      if ((b - a) / 86400000 <= 1) return '어제 새로 올라온';
      return `${a.getUTCMonth() + 1}/${a.getUTCDate()} 이후 새로 올라온`;
    },
    /** 확인 기간 자세히: '국토부 공개 자료 11/13 → 11/19 확인분' */
    windowDetail(w) {
      if (!w) return '';
      const f = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : '';
      if (w.none) return `새 확인 없음(마지막 확인 ${f(w.to)})`;
      if (w.first || !w.from) return `${f(w.to)} 확인부터 모으는 중`;
      return `${f(w.from)} 확인 뒤 ~ ${f(w.to)} 확인 사이에 처음 보인 거래`;
    },
    /** 거래 꼬리표 */
    tags(t) {
      const out = [];
      if (t.hi) out.push({ c: 'hi', t: '신고가' });
      else if (t.dr != null && t.dr <= B.DROP) out.push({ c: 'dn', t: `최근 2년 최고가보다 ${Math.abs(t.dr).toFixed(0)}% 낮음` });
      if (t.x) out.push({ c: 'x', t: '직거래' });
      return out;
    },
    /** 동으로 거른 보기 */
    scope(S, dn) {
      const f = a => (a || []).filter(t => !dn || t.d === dn);
      const trades = f(S.trades), rents = f(S.rents);
      const lines = (S.lines || {})[dn] || (dn ? null : (S.lines || {})['']) || {};
      const pro = (S.pro || {})[dn] || (dn ? [] : (S.pro || {})['']) || [];
      const m30 = dn ? ((S.m30_dong || {})[dn] || null) : S.m30;
      const dong = (S.dongs || []).find(x => x[0] === dn);
      return {
        trades, rents, lines, pro, m30,
        his: trades.filter(t => t.hi), drops: trades.filter(t => !t.hi && t.dr != null && t.dr <= B.DROP).sort((a, b) => a.dr - b.dr),
        jeonse: rents.filter(r => !r.mo),
        n: trades.length, nhi: trades.filter(t => t.hi).length,
        monthly: dn ? null : S.monthly,                    // 월세 건수는 구 전체만(동별 목록에는 전세만 싣음)
        more: dn ? 0 : (S.more || 0),
        rentN: dn ? (dong ? dong[3] : 0) : S.nrent,
        notices: (S.notices || []).filter(n => !dn || !n.d || n.d === dn).concat(dn ? (S.notices || []).filter(n => n.d && n.d !== dn).map(n => Object.assign({ near: true }, n)) : []),
        interest: S.interest ? Object.assign({}, S.interest, { rows: (S.interest.rows || []).filter(r => !dn || r.d === dn) }) : null
      };
    },
    noticeText(n) {
      const rc = n.rc || [];
      const when = rc[0] ? `접수 ${B.ds(rc[0])}${rc[1] && rc[1] !== rc[0] ? '~' + B.ds(rc[1]) : ''}` : `공고 ${B.ds(n.pb)}`;
      return { name: n.n, kind: n.k, when, pw: n.pw ? `발표 ${B.ds(n.pw)}` : '', hh: n.hh ? `${Number(n.hh).toLocaleString('ko-KR')}세대` : '', isNew: !!n.new };
    },
    /** 관심 단지 먼저 */
    sortMine(list, apts) {
      if (!apts || !apts.length) return list;
      return list.slice().sort((a, b) => (apts.includes(b.a) ? 1 : 0) - (apts.includes(a.a) ? 1 : 0));
    },
    /** [data-brief-name] 칸을 브리핑 이름으로, [data-site-name] 칸을 서비스 이름으로 채움 */
    fillNames(doc) {
      doc = doc || (typeof document !== 'undefined' ? document : null); if (!doc) return;
      doc.querySelectorAll('[data-brief-name]').forEach(el => { el.textContent = el.dataset.briefName ? `${NAME} ${el.dataset.briefName}` : NAME; });
      doc.querySelectorAll('[data-site-name]').forEach(el => { el.textContent = SITE; });
    },
    /** ① 오늘의 부동산 시장 — 거래 한 줄 */
    topText(x) {
      const where = [x.sd, x.gn, x.d].filter(Boolean).join(' ');
      const sub = x.up != null ? `이전 최고 ${B.won(x.pm)}(${B.ymI(x.pmd)})보다 ${B.pct(x.up)}`
        : x.dr != null ? `최근 2년 최고 ${B.won(x.m2)}(${B.ymI(x.m2d)})보다 ${B.pct(x.dr)}` : '';
      return { name: `${x.a} ${x.b}`, where, price: B.won(x.p), when: `${B.md(x.dt)} 계약`, sub };
    },
    /** 금리(한국은행 기준금리·주담대 신규 금리) 문구 — 자료가 있을 때만 */
    rateText(r) {
      if (!r) return [];
      const ym = s => `${s.slice(0, 4)}.${+s.slice(4, 6)}`, out = [];
      const one = (lab, o) => o && out.push(`${lab} ${o.v.toFixed(2)}%(${ym(o.ym)})` + (o.chg == null ? '' : o.chg === 0 ? ' · 지난달과 같아요' : ` · 지난달보다 ${o.chg > 0 ? '+' : '−'}${Math.abs(o.chg).toFixed(2)}%p`));
      one('한국은행 기준금리', r.base); one('은행 주택담보대출 신규 금리', r.mort);
      return out;
    },
    /** 새로 발표된 정책·교통·공급 소식(공식 보도자료 제목 그대로) → 종류별 묶음.
        P = market.json 의 pnews 또는 동네 파일의 pnews. 없거나 비면 [] (화면·메일에서 칸을 숨김) */
    PN_CATS: ['정책', '교통', '공급'],
    pnewsGroups(P) {
      const items = (P && P.items) || [];
      return B.PN_CATS.map(c => ({ c, note: ((P && P.note) || {})[c] || '', items: items.filter(x => x.c === c).map(B.pnewsItem) })).filter(g => g.items.length);
    },
    /** 발표 한 건: 제목·공식 링크(https 만)·작은 줄(부처 · 날짜 · 작은 종류 · 지역)·용어 풀이 */
    pnewsItem(x) {
      const d = x.d ? `${+x.d.slice(5, 7)}/${+x.d.slice(8, 10)}` : '';
      const u = /^https:\/\//.test(x.u || '') ? x.u : '';
      return { title: x.t || '', u, org: x.org || '', meta: [x.org, d ? d + ' 발표' : '', x.sub, x.rg].filter(Boolean).join(' · '), terms: (x.terms || []).filter(t => t && t[0] && t[1]) };
    },
    /** 발표 기간 문구: '11/20~11/21' */
    pnewsWin(P) { const w = (P && P.win) || []; const f = s => s ? `${+s.slice(5, 7)}/${+s.slice(8, 10)}` : ''; return w[0] && w[1] ? `${f(w[0])}~${f(w[1])}` : ''; },
    /** 이번 주 청약 접수 일정 한 줄 */
    cyText(n) {
      const r = (n.sp && n.sp[0]) ? n.sp : n.rc || [];
      const rc = n.rc || [];
      const a = (n.sp && n.sp[0]) ? `특별공급 ${B.ds(n.sp[0])}` : '';
      const b = rc[0] ? `접수 ${B.ds(rc[0])}${rc[1] && rc[1] !== rc[0] ? '~' + B.ds(rc[1]) : ''}` : '';
      return { name: n.n, where: [n.sd, n.gn].filter(Boolean).join(' '), kind: n.k, when: [a, b].filter(Boolean).join(' · ') || B.ds(r[0]), hh: n.hh ? `${Number(n.hh).toLocaleString('ko-KR')}세대` : '' };
    },
    /** ③ 내 관심 단지: 이 동네 자료에서 관심 단지의 새 매매·전세만 */
    mine(S, apts, thr) {
      apts = (apts || []).map(String); if (!apts.length || !S) return { apts: [], trades: [], rents: [], urgent: [], gap: [], rise: [], rank: [] };
      const has = a => apts.includes(a);
      return { apts: apts, trades: (S.trades || []).filter(t => has(t.a)), rents: (S.rents || []).filter(r => has(r.a) && !r.mo),
        urgent: B.urgentFor(S, thr).filter(u => has(u.a)), gap: (S.gap || []).filter(g => has(g.a)), rise: (S.rise || []).filter(r => has(r.a)),
        rank: S.rank ? [].concat(S.rank.up || [], S.rank.down || []).filter(r => has(r.a)) : [] };
    },
    /** 급매 레이더 한 줄 */
    urgentText(u) {
      const tags = []; if (u.x) tags.push('직거래'); if (u.sus) tags.push('특수 거래 의심');
      return { name: `${u.a} ${u.b}`, price: B.won(u.p), when: `${B.md(u.dt)} 계약`, sub: `최근 3개월 같은 평형 중간값 ${B.won(u.med)}(${u.n3}건)보다 ${Math.abs(u.disc).toFixed(0)}% 낮아요`, tags };
    },
    /** 전세가율 급변 한 줄 + 양쪽 설명 */
    gapText(g) {
      const up = g.dlt > 0;
      return { name: `${g.a} ${g.b}`, val: `${g.jr0.toFixed(0)}% → ${g.jr.toFixed(0)}%`, dlt: `${up ? '+' : '−'}${Math.abs(g.dlt).toFixed(1)}%p`, up,
        why: up ? '전세가 매매가에 가까워졌어요. 적은 돈으로 살 수 있는 대신(갭 기회), 매매가가 내리면 세입자 보증금이 위험해질 수 있어요(전세 위험).'
                : '전세가 매매가보다 많이 낮아졌어요. 세입자 보증금은 더 안전한 쪽이고, 전세를 끼고 사려면 돈이 더 들어요(갭 부담).' };
    },
    /** 순위 변화 한 줄 */
    rankText(r) { return { name: `${r.a} ${r.b}`, where: [r.sd, r.d].filter(Boolean).join(' '), val: `${r.r0.toLocaleString('ko-KR')}위 → ${r.r1.toLocaleString('ko-KR')}위`, up: r.mv > 0, mv: `${r.mv > 0 ? '▲' : '▼'}${Math.abs(r.mv)}` }; },
    /** 상승 전환 근거 문장(과거 사례가 있을 때만) */
    evText(ev, sd) {
      if (!ev) return '';
      return `근거: ${sd ? sd + '에서 ' : ''}과거 ${ev.np}개 시기(${ev.from.slice(0, 4)}~${ev.to.slice(0, 4)}년) 최근 6개월 거래량이 크게 는 상위 20% 단지 ${Number(ev.n).toLocaleString('ko-KR')}곳 중 ${ev.hit}%가 ${Math.round(ev.h / 12)}년 뒤 같은 구 평균보다 더 올랐어요(평균 ${ev.ex > 0 ? '+' : ''}${ev.ex}%p). 앞으로도 그렇다는 보장은 없어요.`;
    },
    /** 청약 기회: 저장한 가점(0~84)이 있으면 면적대별 예상 최저 당첨 가점 범위와 비교 — 범위 위쪽 이상 '가능성 높음', 범위 안 '경합' */
    cyMatch(list, score) {
      if (score === '' || score == null) return [];
      score = Number(score);
      if (!(score >= 0 && score <= 84)) return [];
      const BAND = ['60㎡ 이하', '60~85㎡', '85㎡ 초과'], out = [];
      (list || []).forEach(n => (n.cut || []).forEach(c => {
        const g = score >= c.hi ? 'hi' : score >= c.lo ? 'mid' : '';
        if (g) out.push({ n, band: BAND[c.b] || '', lo: c.lo, hi: c.hi, g, label: g === 'hi' ? '가능성 높음' : '경합' });
      }));
      return out.sort((a, b) => (a.g === 'hi' ? 0 : 1) - (b.g === 'hi' ? 0 : 1));
    },
    /** 내 집 세금 캘린더: 저장한 내 집(매수 연월)으로 날짜만 계산(세액 계산 아님). today: 'YYYY-MM-DD' */
    taxCal(homes, today) {
      const t = String(today || '').slice(0, 10), y = +t.slice(0, 4), out = [];
      const d = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
      let jun = `${y}-06-01`; if (t > jun) jun = `${y + 1}-06-01`;
      out.push({ k: 'base', date: jun, dday: d(t, jun), title: '재산세·종합부동산세 기준일', note: '이날 집을 가진 사람에게 그해 재산세(7·9월)·종부세(12월)가 나와요. 사고팔 계획이 있으면 날짜를 꼭 확인하세요.' });
      (homes || []).forEach(h => {
        if (!/^\d{4}-\d{2}$/.test(h.bd || '')) return;
        const by = +h.bd.slice(0, 4), bm = +h.bd.slice(5, 7), ym = n => `${by + Math.floor((bm - 1 + n) / 12)}-${String((bm - 1 + n) % 12 + 1).padStart(2, '0')}`;
        const held = (y * 12 + +t.slice(5, 7)) - (by * 12 + bm);
        if (held < 24) out.push({ k: 'nontax', apt: h.apt, date: ym(24) + '-01', dday: d(t, ym(24) + '-01'), title: `${h.apt} 보유 2년(1세대 1주택 비과세 보유 요건)`,
          note: '매수한 달 기준이라 정확한 날은 잔금일(또는 등기 접수일)로 확인하세요. 조정대상지역에서 샀다면 2년 거주도 필요해요.' });
        const nx = Math.max(3, Math.floor(held / 12) + 1);
        if (nx <= 15) out.push({ k: 'ltd', apt: h.apt, date: ym(nx * 12) + '-01', dday: d(t, ym(nx * 12) + '-01'), title: `${h.apt} 보유 ${nx}년(장기보유특별공제 구간 바뀜)`,
          note: '보유 3년부터 1년마다 공제율이 올라가요. 1세대 1주택이고 2년 이상 살았으면 보유 몫 연 4%(최대 40%)+거주 몫, 아니면 연 2%(최대 30%)예요.' });
      });
      return out.filter(x => x.dday >= 0).sort((a, b) => a.dday - b.dday);
    },
    /** 카드 이미지에 넣을 값 (숫자는 모두 자료 그대로) */
    card(S, dn, pro) {
      const v = B.scope(S, dn);
      const top = v.his.slice().sort((a, b) => b.p - a.p)[0] || v.drops[0] || v.trades.slice().sort((a, b) => b.p - a.p)[0] || null;
      const stats = [{ k: '새 매매', v: `${v.n}건` }, { k: '신고가', v: `${v.nhi}건` }];
      if (v.m30) stats.push({ k: '같은 단지 최근 30일', v: B.pct(v.m30.chg) });
      else stats.push({ k: '새 전세', v: `${v.jeonse.length}건` });
      return {
        area: S.name + (dn ? ' ' + dn : ''), sd: S.sd || '', date: B.dateLabel(S.date), win: B.windowText((S.win || {}).t),
        stats, top: top ? { name: `${top.a} ${top.b}`, price: B.won(top.p), tag: (B.tags(top)[0] || {}).t || '', when: `${B.md(top.dt)} 계약` } : null,
        line: (pro ? v.pro[0] : v.lines.fact) || v.lines.fact || '', cmp: pro ? '' : (v.lines.cmp || ''), pro: !!pro
      };
    }
  };
  /* 친구 초대 링크(?ref=R…)로 들어오면 이 기기에 30일 기억 → 신청할 때 함께 보냄 */
  try {
    if (root.location && root.localStorage) {
      const ref = new URLSearchParams(root.location.search).get('ref');
      if (ref && /^R[0-9A-Fa-f]{8}$/.test(ref)) root.localStorage.setItem('jdj_brief_ref', JSON.stringify({ c: ref.toUpperCase(), t: Date.now() }));
    }
  } catch (e) {}
  B.myRef = () => { try { const o = JSON.parse(root.localStorage.getItem('jdj_brief_ref') || 'null'); return o && Date.now() - o.t < 30 * 86400000 ? o.c : ''; } catch (e) { return ''; } };
  root.JDJ_BRIEF = B;
  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
