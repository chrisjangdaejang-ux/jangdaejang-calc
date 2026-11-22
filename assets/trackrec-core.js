/* 예측 적중 기록(/track/) 계산 — 화면 숫자는 모두 공개 파일 data/trackrecord.json 에서만(새 숫자를 지어내지 않음).
   trackrecord.json: { end, h:[6,12,24], asof:[from,to], assets:{ apt|offi: { name, score, scopes:{ 전국|서울|경기|인천: { '6'|'12'|'24': {
     from, to, months, b:{ top|mid|bot: { n(사례), cx(단지 수), avg(평균 가격 변화 %), med, ex(같은 구 평균 대비 %p), hit(같은 구 평균보다 더 오른 비율 %), down(내린 비율 %) } },
     gap(상위−하위 %p), win(상위가 하위보다 나았던 달 수), top_win, worst:[[기준 월, 차이]] } } } } }, holding:{ '1'|'2'|…: { checks, avg, hit, from, to, overlap } } }
   약한 곳 판정 규칙(화면에 보이기 전에 정해 둔 것 — 숫자를 보고 바꾸지 않음):
     반대: 상위−하위 차이 ≤ 0  /  약함: 차이 < 1%p 또는 상위가 앞선 달 < 60%  /  짧음: 기준 월 < 12개월
     가격 자체: 상위 묶음 평균 가격 변화가 하위보다 작으면 따로 알림(같은 구 평균과 견주면 앞서도 실제 가격은 덜 변한 경우) */
(function (root) {
  const HL = { 6: '6개월', 12: '1년', 24: '2년' };
  const BL = { top: '점수 상위 20%', mid: '가운데 60%', bot: '점수 하위 20%' };
  const ym = s => s ? `${String(s).slice(0, 4)}년 ${+String(s).slice(4, 6)}월` : '';
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + f1(Math.abs(v));

  function pick(T, asset, scope, h) {
    const a = T && T.assets && T.assets[asset];
    const s = a && a.scopes && a.scopes[scope];
    return (s && s[String(h)]) || null;
  }

  /* 제목·부제: 고른 범위 숫자 그대로 */
  function head(T, asset, scope, h) {
    const x = pick(T, asset, scope, h), a = T.assets[asset];
    if (!x) return { title: `${scope} ${a ? a.name : ''} ${HL[h]} 결과는 아직 없어요`, sub: '과거 자료가 더 쌓이면 이곳에 그대로 보여 드려요.' };
    const t = x.b.top, b = x.b.bot;
    return {
      title: `점수 상위 20% ${a.name}, ${HL[h]} 뒤 같은 구 평균보다 더 오른 비율 ${f1(t.hit)}%`,
      sub: `점수 하위 20%는 ${f1(b.hit)}%였어요. ${ym(x.from)}부터 ${ym(x.to)}까지 매달, 그달 점수만 보고 나눈 ${a.name} ${x.months}개월치 결과예요.`
    };
  }

  /* 막대 그래프 자료: 묶음별 같은 구 평균보다 더 오른 비율(50% = 반반) */
  function bars(x) {
    return ['top', 'mid', 'bot'].filter(k => x && x.b[k]).map(k => ({ k, label: BL[k], v: x.b[k].hit, n: x.b[k].n }));
  }

  /* 묶음 카드 */
  function cards(x) {
    return ['top', 'mid', 'bot'].filter(k => x && x.b[k]).map(k => {
      const b = x.b[k];
      return { k, label: BL[k], rows: [
        ['평균 가격 변화', `${sg(b.avg)}%`],
        ['같은 구 평균과 차이', `${sg(b.ex)}%p`],
        ['같은 구 평균보다 더 오른 비율', `${f1(b.hit)}%`],
        ['가격이 내린 비율', `${f1(b.down)}%`],
        ['단지 수', `${b.cx.toLocaleString('ko-KR')}곳`]
      ] };
    });
  }

  function judge(x) {
    if (!x || !x.months) return null;
    const r = x.win / x.months, out = [];
    if (x.gap <= 0) out.push('rev');
    else if (x.gap < 1 || r < 0.6) out.push('weak');
    if (x.months < 12) out.push('short');
    if (x.b.top.avg < x.b.bot.avg) out.push('price');
    return out;
  }

  /* 잘 안 맞은 곳 목록(모든 자산·지역·기간을 같은 규칙으로) */
  function weak(T) {
    const L = [];
    for (const [ak, a] of Object.entries((T && T.assets) || {})) {
      if (!a.scopes) { L.push({ lv: 'none', asset: a.name, t: `${a.name}: 아직 과거 자료가 짧아 결과를 낼 수 없어요.` }); continue; }
      for (const [sc, hh] of Object.entries(a.scopes)) {
        for (const h of T.h || [6, 12, 24]) {
          const x = hh[String(h)], where = `${a.name} · ${sc} · ${HL[h]}`;
          if (!x) { if (sc === '전국') L.push({ lv: 'none', asset: a.name, t: `${where}: 아직 결과가 없어요(그만큼 시간이 지나지 않았어요).` }); continue; }
          const j = judge(x), w = `상위 20%가 하위 20%보다 나았던 달 ${x.months}개월 중 ${x.win}개월`;
          if (j.includes('rev')) L.push({ lv: 'rev', asset: a.name, sc, h, t: `${where}: 반대로 나왔어요. 같은 구 평균과 견줘 상위 20%가 하위 20%보다 ${f1(Math.abs(x.gap))}%p 뒤졌어요(${w}).` });
          else if (j.includes('weak')) L.push({ lv: 'weak', asset: a.name, sc, h, t: `${where}: 차이가 작아요. 상위 20%와 하위 20%의 차이 ${sg(x.gap)}%p(${w}).` });
          if (j.includes('price') && !j.includes('rev')) L.push({ lv: 'price', asset: a.name, sc, h, t: `${where}: 같은 구 평균과 견주면 상위 20%가 앞섰지만, 실제 가격 변화는 하위 20%가 더 컸어요(${sg(x.b.top.avg)}% vs ${sg(x.b.bot.avg)}%). 오른 동네에 하위 단지가 더 많았기 때문이에요.` });
          if (j.includes('short') && sc === '전국') L.push({ lv: 'short', asset: a.name, sc, h, t: `${where}: 아직 ${x.months}개월치뿐이라 우연의 영향이 커요.` });
        }
      }
    }
    const ord = { rev: 0, weak: 1, price: 2, short: 3, none: 4 };
    return L.sort((p, q) => ord[p.lv] - ord[q.lv]);
  }

  /* 보유 기간별(1·2·3·5·7년 점수) 과거 결과 줄 */
  function hold(T) {
    return Object.entries((T && T.holding) || {}).map(([h, v]) => ({
      h: +h, label: `${h}년 점수`, line: `상위 20%가 같은 구 평균보다 더 오른 때 ${v.checks}번 중 ${v.hit}번 · 평균 차이 ${sg(v.avg)}%p`,
      ok: v.avg > 0 && v.hit * 2 >= v.checks, overlap: !!v.overlap,
      when: `${ym(v.from)}~${ym(v.to)} 기준`
    }));
  }

  const API = { HL, BL, pick, head, bars, cards, judge, weak, hold, ym, f1, sg };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.JDJ_TREC = API;
})(typeof window !== 'undefined' ? window : this);
