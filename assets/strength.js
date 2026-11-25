/* 집예보 강점 문구(대표 지시 11/20): 이유를 그럴듯하게 쓰는 게 아니라, 공공 통계를 과거 실거래에 그대로 대입해 보고
   맞지 않은 지표는 빼고 남은 것만 미래가치에 넣는다는 점을 숫자로 보여 준다.
   숫자는 공개 자료에서만 읽는다(하드코딩 없음):
     meta.json n_tested(살펴본 공공 통계 수)·n_used(지금 점수에 쓰는 항목 수) — 개수는 모든 화면이 이 한 파일만 읽음(엔진 build_site.meta_pub)
     model_h.json['2'].data_from(학습 자료 시작월)·oos_all/oos_hit(과거 성적)
     index.json stats.trades(학습 자료 기간 실거래 건수)·stats.from(시작월, data_from 이 없을 때)
   개수 문장은 어디서나 같은 꼴: '공공 통계 52가지를 살펴보고, 과거 자료로 효과가 확인된 22가지만 지금 점수에 써요'
   없는 값은 그 부분만 문장에서 빠진다. 지표 이름·가중치는 엔진이 내보내지 않는다(개수만).
   쓰는 법: 페이지에 <p data-jdj-str="hero|card|report|about" hidden></p> 를 두고 이 파일을 넣으면 공개 자료를 읽어 채우고 보이게 한다.
   개수 문장만 필요한 화면은 JDJ_STRENGTH.count(JDJ_STRENGTH.facts(null, null, meta.json)) (<script data-lazy> 로 넣으면 미리 읽지 않음).
   나중에 그린 칸(단지 분석 카드 등)도 MutationObserver 로 채운다. 이 파일이 없는 화면에서는 칸이 숨은 채로 남는다. */
(function (root) {
  var JB = (typeof window !== 'undefined' && window.JDJ_BASE) || (function (p) { var g = p.indexOf('/jangdaejang-calc/') === 0, b = { SITE: g ? '/jangdaejang-calc/' : '/', DATA: g ? '/jangdaejang-data/' : 'https://chrisjangdaejang-ux.github.io/jangdaejang-data/' }; if (typeof window !== 'undefined') window.JDJ_BASE = b; return b; })((typeof location !== 'undefined' && location.pathname) || '/jangdaejang-calc/');
  const DATA = JB.DATA + 'data/';
  const ym = v => { const t = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return /^(19|20)\d{2}(0[1-9]|1[0-2])/.test(t) ? t.slice(0, 6) : ''; };
  const num = v => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.round(v) : 0);
  /* 838만 · 1,234만 · 9,800 */
  const man = n => n >= 1e4 ? `${Math.round(n / 1e4).toLocaleString('ko-KR')}만` : n.toLocaleString('ko-KR');
  const VOK = m => !!(m && (m.oos_all || []).length >= 2 && m.oos_avg > 0 && 2 * (m.oos_hit != null ? m.oos_hit : (m.oos_all || []).filter(o => (o.top20 || 0) > 0).length) >= (m.oos_all || []).length);

  /* 공개 자료 → 문장에 쓸 사실값. MH = model_h.json(또는 model.json 한 개), IX = index.json, MT = meta.json(개수) */
  function facts(MH, IX, MT) {
    const m = MH && (MH['2'] || (MH.oos_all ? MH : null)) || {};
    const S = (IX && IX.stats) || {};
    const from = ym(m.data_from) || ym(S.from);
    const nt = num(MT && MT.n_tested), nu = num(MT && MT.n_used);
    const O = m.oos_all || [];
    return {
      nt, nu: nt && nu > nt ? 0 : nu,
      y0: from ? +from.slice(0, 4) : 0,
      trades: num(S.trades),
      n: O.length, hit: m.oos_hit != null ? m.oos_hit : O.filter(o => (o.top20 || 0) > 0).length, ok: VOK(m)
    };
  }

  /* 핵심 문장: 개수 문장은 모든 화면이 같은 꼴(count) */
  const count = F => {
    const seen = F.nt ? `공공 통계 ${F.nt}가지를 살펴보고` : '공공 통계를 살펴보고';
    if (!F.nu) return `${seen}, 과거 자료로 효과가 확인된 것만 지금 점수에 써요`;
    if (F.nt && F.nu >= F.nt) return `${seen}, 과거 자료로 효과가 확인된 ${F.nu}가지를 모두 지금 점수에 써요`;
    return `${seen}, 과거 자료로 효과가 확인된 ${F.nu}가지만 지금 점수에 써요`;
  };
  /* '과거 자료는 2010년부터의 실거래 838만 건이에요.' — 값이 없으면 '' */
  const basis = (F, withN) => F.y0 ? ` 과거 자료는 ${F.y0}년부터의 실거래${withN && F.trades ? ` ${man(F.trades)} 건이에요` : '예요'}.` : '';
  const core = (F, withN) => `집예보는 ${count(F)}.${basis(F, withN)}`;
  const track = F => F.ok && F.n ? `2년 전망은 과거에 그대로 써 봤더니 ${F.n}번 중 ${F.hit}번 맞았어요.` : '';

  /* kind: hero(홈 히어로 아래 한 줄) · card(단지 분석 결론 아래) · report(유료 리포트 첫머리) · about(서비스 소개, 문단 배열) · share(공유 카드 근거 한 줄, 개수 없으면 '') */
  function text(kind, F) {
    F = F || {};
    if (kind === 'hero') return core(F, true);
    if (kind === 'card') return core(F, false);
    if (kind === 'report') return `이 리포트의 미래가치도 같은 방법으로 계산했어요. ${core(F, true)} 그럴듯한 이유가 아니라 과거에 맞았는지 확인한 근거만 담았어요.`;
    if (kind === 'share') return F.nt && F.nu ? `공공 통계 ${F.nt}가지 중 과거 자료로 효과가 확인된 ${F.nu}가지만 쓴 점수` : '';
    if (kind === 'about') return [
      '집값이 오를 이유는 누구나 그럴듯하게 쓸 수 있어요. 집예보는 이유를 그럴듯하게 쓰는 것보다, 그 이유가 과거에 정말 맞았는지를 먼저 확인해요.',
      `${core(F, true)}${track(F) ? ' ' + track(F) : ''}`,
      '그래서 화면의 전망마다 과거에 그대로 써 봤을 때 몇 번 중 몇 번 맞았는지를 함께 적어요. 잘 안 맞은 기간도 숨기지 않고 그대로 보여 드려요.'
    ];
    return '';
  }

  /* ── 화면 채우기 ── */
  let F = null, P = null;
  const J = u => fetch(DATA + u).then(r => (r.ok ? r.json() : null)).catch(() => null);
  function load() {
    if (!P) P = Promise.all([J('model_h.json'), J('index.json'), J('meta.json')]).then(([mh, ix, mt]) => (F = facts(mh, ix, mt)));
    return P;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function put(el) {
    if (!F || el.dataset.jdjStrDone) return;
    const k = el.getAttribute('data-jdj-str'), t = text(k, F);
    if (!t || !t.length) return;
    el.innerHTML = Array.isArray(t) ? t.map(p => `<p>${esc(p)}</p>`).join('') : esc(t);
    el.dataset.jdjStrDone = '1'; el.hidden = false;
  }
  function fill(scope) {
    const els = (scope || document).querySelectorAll('[data-jdj-str]:not([data-jdj-str-done])');
    if (!els.length) return Promise.resolve(F);
    return load().then(() => { els.forEach(put); return F; });
  }

  /* 이미 읽어 둔 값으로 바로(공유 카드처럼 기다릴 수 없는 곳) — 아직 못 읽었으면 '' */
  const now = kind => (F ? text(kind, F) : '');

  root.JDJ_STRENGTH = { facts, text, count, fill, man, now, load };
  if (typeof module !== 'undefined' && module.exports) { module.exports = root.JDJ_STRENGTH; return; }
  if (typeof document === 'undefined') return;
  /* <script data-lazy>: 문장 칸이 없는 화면(개수 문장만 쓰는 곳)은 미리 읽지 않음 */
  const LAZY = !!(document.currentScript && document.currentScript.hasAttribute('data-lazy'));
  const start = () => {
    if (!LAZY) load(); fill();
    if (root.MutationObserver) {
      let q = 0;
      new MutationObserver(() => { if (q) return; q = 1; setTimeout(() => { q = 0; fill(); }, 50); })
        .observe(document.body, { childList: true, subtree: true });
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
