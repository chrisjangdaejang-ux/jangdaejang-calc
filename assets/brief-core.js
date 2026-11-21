/* 집예보 우리 동네 아침 브리핑 — 화면 공용 계산 (JDJ_BRIEF)
   - 자료: 공개 데이터 data/brief/{시군구}.json (엔진 brief.py 가 매일 새벽 동네별로 만듦: 새로 올라온 실거래·신고가·전세·분양·정책·한 줄 해설)
   - 이 파일은 숫자를 새로 만들지 않고, 받은 자료를 동(洞)으로 거르고 읽기 쉬운 글로 바꾸기만 한다.
   - 주소: /brief/?d=11710 (구 전체) · ?d=11710-잠실동 (동) · &v=pro (중개사용) · &card=1 (카드 이미지 화면 1080×1080) */
(function (root) {
  'use strict';
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const B = {
    DATA: '/jangdaejang-data/data/brief/',
    DROP: -10,                                      // '최근 2년 최고가보다 많이 내린 거래' 기준(%)
    PRICE: { brief: { name: '아침 브리핑', amount: 3900, areas: 3 }, brief_pro: { name: '아침 브리핑 중개사용', amount: 4900, areas: 10 } },
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
