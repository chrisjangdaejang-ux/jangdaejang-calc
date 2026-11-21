/* 단지별 '믿을 만한 정도'(높음·보통·낮음) — Zillow 가 추정 오차를 공개하듯, 이 단지 점수를 얼마나 믿어도 되는지 쉬운 말로.
   단계와 한 줄 이유는 엔진이 정해 공개 자료(sNN.json·price 의 단지 점수 묶음 f.cf = [단계 'h'|'m'|'l', 이유 코드, 거래 기록 시작 연도])에 실어 둔다.
   판정 기준(거래 수·연수·가중치)은 비공개 엔진에만 있고, 이 파일은 받은 단계·이유를 말로 바꾸고 이미 공개된 사실 세 가지만 곁들인다:
     ① 이 지역(시·도) 2년 점수의 과거 성적 — '과거에 그대로 써 봤더니 N번 중 M번 맞았어요'(기간은 data_from 부터)
     ② 점수가 비슷한 단지(같은 구 안 점수 5분위)가 같은 구 평균보다 실제로 얼마나 더/덜 올랐는지
     ③ 이 평형 최근 12개월 거래 수와 거래 기록 연수
   화면 말투: '시험·검증·채점'을 쓰지 않는다. 기준값(몇 건 미만 등)은 쓰지 않는다.
   window.JDJ_CONF = { LV, REASON, build, html, line } */
(function (root) {
  'use strict';
  const LV = { h: '높음', m: '보통', l: '낮음' };
  const REASON = {
    few: '거래가 적어 덜 확실해요',
    few_rec: '거래가 적고, 이 지역에서 과거에 맞은 정도도 고르지 않았어요',
    short: '거래 기록이 짧아 덜 확실해요',
    rec: '이 지역에서는 과거에 맞은 정도가 고르지 않았어요',
    band: '점수가 비슷한 단지들의 과거 결과가 고르지 않았어요',
    good: '거래가 꾸준하고, 이 지역·점수대의 과거 성적도 좋았어요'
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p1 = v => (Math.round(Math.abs(v) * 10) / 10).toFixed(1);
  const ymNorm = v => { const t = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return /^(19|20)\d{2}(0[1-9]|1[0-2])/.test(t) ? t.slice(0, 6) : ''; };
  const fromKo = v => v ? `${v.slice(0, 4)}년 ${+v.slice(4, 6)}월` : '';
  /* 이 지역 2년 점수 성적: 시·도(묶음) 성적이 있으면 그것, 단지가 적어 전국으로 대체한 곳은 전국 */
  function record(MH, sido) {
    const m = MH && MH['2']; if (!m) return null;
    const r = m.reg && sido ? m.reg[sido] : null;
    const use = r && r.fb !== 'all' && (r.oos_all || []).length ? r : null;
    const O = use ? r.oos_all : (m.oos_all || []); if (!O.length) return null;
    const hit = use ? (r.hit || 0) : (m.oos_hit != null ? m.oos_hit : O.filter(o => (o.top20 || 0) > 0).length);
    const ys = O.map(o => ymNorm(o.t0)).filter(Boolean).map(t => +t.slice(0, 4)).sort((a, b) => a - b);
    return { n: O.length, hit, where: use ? (r.name || sido) : '전국', y1: ys[0], y2: ys[ys.length - 1], from: ymNorm(m.data_from) };
  }
  /* 점수가 비슷한 단지(같은 구 안 점수 5분위) — q5 = [평균 초과 %p, 시기 수, 더 오른 시기 수, 사례 수] */
  function band(MH, fvg) {
    const q = MH && MH['2'] && MH['2'].q5; if (!q || fvg == null) return null;
    const j = Math.min(4, Math.max(0, Math.floor(fvg / 20))), r = q[j]; if (!r) return null;
    return { j, avg: r[0], n: r[1], up: r[2], cases: r[3] };
  }
  /* f: 단지 점수 묶음(f.cf·f.fvg), c = { MH(model_h.json), sido(시·도 이름), cnt(월별 거래 수 배열, 오래된 달 → 최근 달) }
     → { lv, lvKo, reason, facts: [문장…] } | null(공개 자료에 단계가 없으면 아무것도 안 보여 줌) */
  function build(f, c) {
    const cf = f && f.cf; if (!Array.isArray(cf) || !LV[cf[0]]) return null;
    c = c || {};
    const facts = [];
    const r = record(c.MH, c.sido);
    if (r) {
      const per = r.from && r.y1 ? `${fromKo(r.from)}부터 그때까지의 자료만 써서 ${r.y1 === r.y2 ? r.y1 + '년' : `${r.y1}~${r.y2}년`}마다 2년 뒤를 맞춰 본 결과` : '';
      facts.push(`${r.where === '전국' ? '전국' : r.where} 단지에 이 점수를 과거에 그대로 써 봤더니 ${r.n}번 중 ${r.hit}번 맞았어요${per ? `(${per})` : ''}.`);
    }
    const b = band(c.MH, f.fvg);
    if (b && b.n) {
      const base = '같은 구 평균';
      if (b.j >= 3) facts.push(b.avg > 0 ? `이 단지처럼 같은 구에서 점수가 높은 편이던 단지들은 2년 뒤 ${base}보다 평균 ${p1(b.avg)}%p 더 올랐어요(${b.n}번 중 ${b.up}번 더 오름).`
        : `이 단지처럼 같은 구에서 점수가 높은 편이던 단지들은 2년 뒤 오히려 ${base}보다 평균 ${p1(b.avg)}%p 덜 올랐어요(${b.n}번 중 ${b.up}번만 더 오름).`);
      else if (b.j <= 1) facts.push(b.avg < 0 ? `이 단지처럼 같은 구에서 점수가 낮은 편이던 단지들은 2년 뒤 ${base}보다 평균 ${p1(b.avg)}%p 덜 올랐어요(${b.n}번 중 ${b.n - b.up}번 덜 오름).`
        : `이 단지처럼 같은 구에서 점수가 낮은 편이던 단지들은 2년 뒤 오히려 ${base}보다 평균 ${p1(b.avg)}%p 더 올랐어요(${b.n}번 중 ${b.up}번 더 오름).`);
      else facts.push(`이 단지처럼 같은 구에서 점수가 중간이던 단지들은 2년 뒤 ${base}과 차이가 크지 않았어요(평균 ${b.avg >= 0 ? '+' : '−'}${p1(b.avg)}%p).`);
    }
    const cnt = Array.isArray(c.cnt) ? c.cnt : null;
    if (cnt && cnt.length) {
      const n12 = cnt.slice(-12).reduce((a, v) => a + (+v || 0), 0);
      const fy = r && r.from ? +r.from.slice(0, 4) : null, y0 = cf[2], now = c.year || new Date().getFullYear();
      const hist = y0 ? (fy && y0 <= fy ? `${fy}년 이전부터 거래가 이어져 왔어요` : `${y0}년부터 거래 기록이 있어요(약 ${Math.max(1, now - y0)}년)`) : '';
      facts.push(`이 평형은 최근 12개월 거래가 ${n12}건이에요${hist ? `. ${hist}` : ''}.`);
    }
    return { lv: cf[0], lvKo: LV[cf[0]], reason: REASON[cf[1]] || '', facts };
  }
  /* 한 줄(지도 카드·매물 설명서): '믿을 만한 정도 보통 · 거래가 적어 덜 확실해요' */
  function line(o) { return o ? `믿을 만한 정도 ${o.lvKo}${o.reason ? ' · ' + o.reason : ''}` : ''; }
  /* 단지 화면 미래가치 칸: 한 줄 + 사실 세 가지(작은 글씨) */
  function html(o, opt) {
    if (!o) return '';
    opt = opt || {};
    const facts = opt.compact ? '' : (o.facts.length ? `<ul class="jcf-f">${o.facts.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
    const more = opt.more ? ` <a class="jcf-more" href="${esc(opt.more)}">어떻게 정하나요?</a>` : '';
    return `<div class="jcf jcf--${o.lv}"><p class="jcf-l"><b>믿을 만한 정도</b><span class="jcf-lv">${esc(o.lvKo)}</span><span class="jcf-r">${esc(o.reason)}</span>${more}</p>${facts}</div>`;
  }
  /* 화면에 넣는 스타일(한 번만) — A+ 테마 색 */
  function css(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || doc.getElementById('jcf-css')) return;
    const st = doc.createElement('style'); st.id = 'jcf-css';
    st.textContent = '.jcf{border:1px solid #E5E8EB;border-radius:12px;padding:10px 12px;margin:10px 0;background:#FAFBFC}'
      + '.jcf-l{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:15px;line-height:1.5;color:#191F28}'
      + '.jcf-lv{display:inline-block;min-width:44px;text-align:center;border-radius:999px;padding:2px 10px;font-weight:800;font-size:14px;color:#fff}'
      + '.jcf--h .jcf-lv{background:#2F6BFF}.jcf--m .jcf-lv{background:#6B7684}.jcf--l .jcf-lv{background:#C2410C}'
      + '.jcf-r{color:#333D4B;font-weight:600}.jcf-more{font-size:13px;font-weight:700;color:#2F6BFF}'
      + '.jcf-f{margin:6px 0 0;padding:0 0 0 18px;font-size:13.5px;line-height:1.6;color:#4E5968}.jcf-f li{margin:2px 0}';
    doc.head.appendChild(st);
  }
  const API = { LV, REASON, record, band, build, html, line, css };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.JDJ_CONF = API;
})(typeof window !== 'undefined' ? window : globalThis);
