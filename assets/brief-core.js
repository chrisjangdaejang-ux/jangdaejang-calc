/* 모닝 브리핑 — 화면 공용 계산 (JDJ_BRIEF)
   - 이름: B.NAME = `${SITE_NAME} 모닝 브리핑` — 서비스 이름은 assets/config.js 의 JDJ_SITE.SITE_NAME 한 곳에서 읽어요.
     화면의 [data-brief-name] 칸은 B.fillNames() 가 이 이름으로 채워요(서비스 이름이 바뀌면 함께 바뀜).
   - 자료: 공개 데이터 data/brief/market.json (① 오늘의 부동산 시장 — 전국 공통 하루 1개)
           data/brief/{시군구}.json (② 내 관심 지역 · ③ 내 관심 단지 — 엔진 brief.py 가 매일 새벽 동네별로 만듦)
   - 이 파일은 숫자를 새로 만들지 않고, 받은 자료를 동(洞)으로 거르고 읽기 쉬운 글로 바꾸기만 한다.
   - 주소: /brief/?d=11710 (구 전체) · ?d=11710-잠실동 (동) · &v=pro (중개사용) · &card=1 (카드 이미지 화면 1080×1080) */
(function (root) {
  'use strict';
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const SITE = ((root.JDJ_SITE || {}).SITE_NAME || '').trim() || '집예보';
  const NAME = `${SITE} 모닝 브리핑`;
  const B = {
    SITE, NAME,
    DATA: '/jangdaejang-data/data/brief/',
    DROP: -10,                                      // '최근 2년 최고가보다 많이 내린 거래' 기준(%)
    PRICE: { brief: { name: NAME, amount: 3900, areas: 3 }, brief_pro: { name: `${NAME} 중개사용`, amount: 4900, areas: 10 } },
    TRIAL_DAYS: 7,
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
    /** 이번 주 청약 접수 일정 한 줄 */
    cyText(n) {
      const r = (n.sp && n.sp[0]) ? n.sp : n.rc || [];
      const rc = n.rc || [];
      const a = (n.sp && n.sp[0]) ? `특별공급 ${B.ds(n.sp[0])}` : '';
      const b = rc[0] ? `접수 ${B.ds(rc[0])}${rc[1] && rc[1] !== rc[0] ? '~' + B.ds(rc[1]) : ''}` : '';
      return { name: n.n, where: [n.sd, n.gn].filter(Boolean).join(' '), kind: n.k, when: [a, b].filter(Boolean).join(' · ') || B.ds(r[0]), hh: n.hh ? `${Number(n.hh).toLocaleString('ko-KR')}세대` : '' };
    },
    /** ③ 내 관심 단지: 이 동네 자료에서 관심 단지의 새 매매·전세만 */
    mine(S, apts) {
      apts = (apts || []).map(String); if (!apts.length || !S) return { apts: [], trades: [], rents: [], urgent: [], gap: [], rise: [], rank: [] };
      const has = a => apts.includes(a);
      return { apts: apts, trades: (S.trades || []).filter(t => has(t.a)), rents: (S.rents || []).filter(r => has(r.a) && !r.mo),
        urgent: (S.urgent || []).filter(u => has(u.a)), gap: (S.gap || []).filter(g => has(g.a)), rise: (S.rise || []).filter(r => has(r.a)),
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
  root.JDJ_BRIEF = B;
  if (typeof module !== 'undefined') module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
