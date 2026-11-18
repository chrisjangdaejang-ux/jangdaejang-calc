/* 장대장 프리미엄 리포트 결제 — 공용 설정·도우미 (premium/ 아래 모든 페이지에서 사용)
   ─────────────────────────────────────────────────────────────
   ★ 심사 후 실제 결제로 바꿀 때 고칠 곳은 이 파일 맨 위 두 줄뿐입니다.
     - TEST_MODE  : true 이면 화면 위에 '테스트 결제 · 실제 청구 없음' 배지를 보여 줍니다. 실제 결제 시작 때 false.
     - CLIENT_KEY : 토스페이먼츠 결제위젯 클라이언트 키(공개되어도 되는 값). 실제 키는 live_gck_ 로 시작합니다.
       (시크릿 키는 절대 여기에 넣지 마세요. 시크릿 키는 Apps Script 스크립트 속성 TOSS_SECRET_KEY 에만 넣습니다.)
   서버 주소는 assets/agents.js 의 Apps Script 웹 앱 주소(API)를 그대로 씁니다.
   가격은 화면 표시용이고, 실제 결제 금액은 서버(tools/agent-backend.gs 의 PRICE)가 정하고 대조합니다.
   ───────────────────────────────────────────────────────────── */
(function () {
  const TEST_MODE = true;
  const CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

  const ROOT = '/jangdaejang-calc/premium/';
  const P = window.JDJ_PAY = {
    TEST_MODE, CLIENT_KEY, ROOT,
    SDK: 'https://js.tosspayments.com/v2/standard',
    DATA: '/jangdaejang-data/data/',
    PRODUCTS: {
      single: { name: '단지 리포트', amount: 9900, min: 1, max: 1, desc: '관심 단지 1곳' },
      pack: { name: '비교 패키지', amount: 29000, min: 2, max: 3, desc: '후보 단지 2~3곳' }
    },
    api() { return (window.JDJ_AGENTS && window.JDJ_AGENTS.api) || ''; },
    async post(action, body) {
      const api = P.api();
      if (!api) throw new Error('결제 서버가 아직 연결되지 않았습니다.');
      let j;
      try {
        const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(Object.assign({ action }, body || {})) });
        j = await r.json();
      } catch (e) {
        const er = new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'); er.net = true; throw er;
      }
      if (!j || !j.ok) { const er = new Error((j && j.err) || '처리하지 못했습니다.'); er.code = j && j.code; throw er; }
      return j;
    },
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    won: n => Number(n || 0).toLocaleString('ko-KR') + '원',
    /* 단지 키: 리포트 단지 비교와 같은 형식 (시도id~구코드~동~단지~평형) */
    keyOf: p => [p.sd, p.code, p.dong, p.apt, p.band].map(v => encodeURIComponent(v).replace(/~/g, '%7E').replace(/!/g, '%21')).join('~'),
    keyParse(k) {
      const a = String(k || '').split('~'); if (a.length !== 5) return null;
      try { const [sd, code, dong, apt, band] = a.map(decodeURIComponent);
        if (!/^s\d{2}$/.test(sd) || !/^\d{5}$/.test(code) || !apt || !band) return null;
        return { sd, code, dong, apt, band }; } catch (e) { return null; }
    },
    keysFromUrl(q) { return String(q.get('k') || '').split('!').filter(Boolean).filter(k => P.keyParse(k)).slice(0, 3); },
    /* 이 기기에서 산 주문(주문번호·열람 토큰) — 다른 사람에게 보내지 않는 기기 안 저장 */
    orders() { try { const a = JSON.parse(localStorage.getItem('jdj_orders') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } },
    saveOrder(o) {
      try { const a = P.orders().filter(x => x.o !== o.o); a.unshift(o); localStorage.setItem('jdj_orders', JSON.stringify(a.slice(0, 10))); } catch (e) {}
    },
    viewUrl: (o, t) => ROOT + 'view/?o=' + encodeURIComponent(o) + '&t=' + encodeURIComponent(t),
    /* 단지 데이터(공개 실거래 자료) */
    _ix: null, _sd: {},
    async index() { if (!P._ix) P._ix = fetch(P.DATA + 'index.json').then(r => { if (!r.ok) throw new Error('index'); return r.json(); }); return P._ix; },
    async sido(id) { if (!P._sd[id]) P._sd[id] = fetch(P.DATA + id + '.json').then(r => { if (!r.ok) throw new Error(id); return r.json(); }).then(j => j.units); return P._sd[id]; },
    stat() { try { if (window.jdjStat) window.jdjStat('feature_use', { feature: 'premium' }); } catch (e) {} }
  };

  /* 테스트 모드 배지 */
  function badge() {
    if (!TEST_MODE || document.getElementById('payTest')) return;
    const b = document.createElement('div');
    b.id = 'payTest'; b.className = 'paytest'; b.setAttribute('role', 'note');
    b.textContent = '테스트 결제 · 실제 청구 없음';
    const top = document.querySelector('.top');
    if (top && top.parentNode) top.parentNode.insertBefore(b, top.nextSibling); else document.body.prepend(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', badge); else badge();
})();
