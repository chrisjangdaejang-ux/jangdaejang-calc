/* 내 집 성적표(주간) 계산 — 화면 없음. 성적표 화면(my/report/)과 서버 주간 메일(tools/agent-backend.gs reportWeekly)이 함께 쓴다.
   - 아래 'REPORT-CORE' 블록은 tools/agent-backend.gs 에 글자 그대로 복사돼 있다(서버는 다른 파일을 불러올 수 없어서). tools/report-test.js 가 두 곳이 같은지 확인한다.
   - 자료: jangdaejang-data data/report/g/{구}.json (엔진 scripts/home_report.py, 매주 월요일 주간 실거래 동향 발표 뒤). 숫자는 그 파일 값 그대로 쓰고,
     여기서는 '지난 성적표와의 차이'(두 값의 뺄셈)와 '집값 − 대출'(사용자가 적은 대출 잔액)만 계산한다.
   - 내 집 정보 보정(층·확장·리모델링)과 대출 잔액은 사용자가 적은 값이라 공식 숫자와 섞지 않는다: 카드의 공식 칸은 보정과 상관없이 같고,
     보정은 따로 '내가 적은 정보' 칸에만 보인다. 층 참고값은 같은 단지·같은 평형의 비슷한 층 실거래 중간값(공개 자료)만 쓴다.
   window.JDJ_REPORT_CORE */
(function (root) {
'use strict';
/* REPORT-CORE BEGIN — 이 블록은 tools/agent-backend.gs 에 그대로 복사돼 있어요. 고칠 때는 두 곳을 똑같이 고쳐 주세요(node tools/report-test.js 가 비교). */
const RP_MAX = 6;                       // 메일 한 통에 싣는 집 수(내 집 먼저, 그다음 관심 단지)
const RP_JR_LINES = [90, 80];
const RP_FLOOR_NEAR = 3, RP_FLOOR_MIN = 3, RP_FLOOR_DAYS = 365;   // 층 참고값: 내 층 ±3층 · 3건 이상 · 최근 1년
function rpEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rpWon(m) { m = Math.round(Number(m) || 0); const neg = m < 0; m = Math.abs(m); const e = Math.floor(m / 10000), r = m % 10000; const t = e && r ? `${e}억 ${r.toLocaleString('en-US')}만 원` : e ? `${e}억 원` : `${r.toLocaleString('en-US')}만 원`; return (neg ? '−' : '') + t; }
function rpKey(p) { return [p.dong, p.jibun || '', p.apt, p.band].join('|'); }
function rpPid(p) { return [p.code, p.dong, p.jibun || '', p.apt, p.band].join('|'); }
function rpMd(x) { const s = String(x || '').replace(/-/g, ''); return s.length >= 8 ? `${+s.slice(4, 6)}/${+s.slice(6, 8)}` : ''; }
function rpYm(ym) { ym = String(ym || ''); return /^\d{6}$/.test(ym) ? `${ym.slice(0, 4)}년 ${+ym.slice(4, 6)}월` : ''; }
function rpPct(v) { v = Math.round(Number(v) * 100) / 100; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; }
function rpTrade(t) { return { dt: t[0], f: t[1], p: t[2], x: t[3] === 1, hi: t[4] === 1 }; }
function rpRow(t) { return { apt: t[0], band: t[1], dt: t[2], f: t[3], p: t[4], x: t[5] === 1, hi: t[6] === 1 }; }

/** 한 집의 성적표 카드(공식 숫자만). R = report/g/{구}.json, 없거나 그 집이 없으면 null */
function rpCard(p, R) {
  if (!p || !R || !R.u) return null;
  const u = R.u[rpKey(p)]; if (!u) return null;
  const q = (R.p || {})[rpKey(p)] || null, d = (R.d || {})[p.dong] || null, cap = v => v == null ? null : Math.min(99, v);
  const wk = R.wk && R.wk.w ? { w: R.wk.w, from: R.wk.from, to: R.wk.to, st: R.wk.st, g: R.wk.g || null, sd: R.wk.sd || null, kr: R.wk.kr || null } : null;
  let near = null;
  if (d && Array.isArray(d.nw)) near = { mode: 'new', n: d.nn || 0, list: d.nw.map(rpRow) };
  else if (d && Array.isArray(d.rc)) near = { mode: 'recent', n: d.nr || 0, list: d.rc.map(rpRow) };
  return {
    p: p, pid: rpPid(p), date: R.date || '', pd: R.pd || '',
    price: u[0] ? { v: u[0], at: u[6] || '', v0: q && q[0] ? q[0] : null } : null,
    rank: u[1] ? { r: u[1], n: u[4], same: u[5] === 1, r0: q && q[1] ? q[1] : null } : null,
    fv: u[2] != null ? { v: cap(u[2]), v0: q && q[2] != null ? cap(q[2]) : null, sr: u[7] || null } : null,
    jr: u[3] != null ? { v: u[3], v0: q && q[3] != null ? q[3] : null, line: RP_JR_LINES.find(L => u[3] >= L) || 0 } : null,
    trades: (u[8] || []).map(rpTrade), wk: wk, near: near
  };
}
/** 차이 글자: 지난 성적표 값이 있을 때만 */
function rpDiff(v, v0, unit) {
  if (v == null || v0 == null) return '';
  const d = Math.round((v - v0) * 10) / 10;
  if (!d) return '지난번과 같아요';
  return unit === '위' ? `지난번 ${v0}위 → ${Math.abs(d)}계단 ${d < 0 ? '올랐어요' : '내려갔어요'}`
    : unit === '원' ? `지난번보다 ${rpWon(Math.abs(d))} ${d > 0 ? '올랐어요' : '내렸어요'}`
    : `지난번 ${v0}${unit} → ${d > 0 ? '+' : '−'}${Math.abs(d)}${unit === '%' ? '%p' : unit}`;
}
/** 카드 → 쉬운 말 줄 [{k, h(제목), t(큰 글), s(설명)}] — 메일과 화면이 같은 문장을 쓴다. gname = 구 이름 */
function rpLines(c, gname) {
  const out = [], g = gname || '우리 구';
  const W = c.wk;
  if (W && W.g) {
    const x = W.g, per = `지난주(${rpMd(W.from)}~${rpMd(W.to)})`;
    let t, s;
    if (x.chg != null && !x.old) {
      t = `${per} ${g} 아파트값은 같은 집끼리 비교해 ${rpPct(x.chg)} ${x.chg > 0 ? '올랐어요' : x.chg < 0 ? '내렸어요' : '그대로였어요'}`;
      s = `석 달 안에 다시 팔린 같은 집 ${Number(x.np).toLocaleString('en-US')}쌍의 값 차이에서, 가장 많이 오르고 내린 4분의 1씩을 빼고 평균 낸 값이에요(${W.st === 'final' ? '확정' : '신고가 더 들어오면 바뀔 수 있는 잠정'} 숫자).`;
    } else {
      t = `${per} ${g}는 같은 집 다시 거래가 ${Number(x.np || 0).toLocaleString('en-US')}쌍이라 변동률을 내지 않았어요`;
      s = `30쌍 이상일 때만 내요.${x.mchg != null ? ` 최근 4주를 합쳐 보면 ${rpPct(x.mchg)}예요.` : ''}`;
    }
    const sd = W.sd && W.sd.chg != null ? `${W.sd.nm} 전체 ${rpPct(W.sd.chg)}` : '', kr = W.kr && W.kr.chg != null ? `전국 ${rpPct(W.kr.chg)}` : '';
    if (sd || kr) s += ` 같은 주 ${[sd, kr].filter(Boolean).join(' · ')}.`;
    out.push({ k: 'wk', h: '이번 주 가격 흐름', t: t, s: s });
  } else out.push({ k: 'wk', h: '이번 주 가격 흐름', t: '이번 주 가격 흐름 자료가 아직 없어요', s: '주간 실거래 동향이 나오면 함께 보여 드려요.' });
  if (c.price) out.push({ k: 'price', h: '최근 시세', t: rpWon(c.price.v) + (c.price.v0 ? ` · ${rpDiff(c.price.v, c.price.v0, '원')}` : ''),
    s: `${rpYm(c.price.at)}까지 3개월 동안 이 단지·이 평형의 같은 전용면적 실거래 3.3㎡당 값 중간값으로 계산했어요(같은 면적 거래가 모자라면 다른 면적 거래를 이 면적 값으로 맞춰 함께 써요).` });
  const tr = c.trades.slice(0, 3).map(t => `${rpMd(t.dt)} ${t.f != null ? t.f + '층 ' : ''}${rpWon(t.p)}${t.hi ? '(신고가)' : ''}${t.x ? '(직거래)' : ''}`);
  out.push({ k: 'trade', h: '최근 실거래', t: tr.length ? tr.join(' · ') : '최근 3년 거래가 없어요', s: '계약일 · 층 · 금액이에요. 국토교통부 실거래 신고 자료 그대로예요.' });
  if (c.rank) out.push({ k: 'rank', h: '동네 순위', t: `${c.p.dong} ${c.rank.same ? '같은 평형대 ' : ''}아파트 ${c.rank.n}곳 중 ${c.rank.r}위` + (c.rank.r0 ? ` · ${rpDiff(c.rank.r, c.rank.r0, '위')}` : ''),
    s: '최근 3.3㎡당 실거래 값이 높은 순서예요.' });
  if (c.fv) out.push({ k: 'fv', h: '미래가치 점수', t: `${c.fv.v}점` + (c.fv.v0 != null ? ` · ${rpDiff(c.fv.v, c.fv.v0, '점')}` : '') + (c.fv.sr ? ` · 시·도 안 ${Number(c.fv.sr).toLocaleString('en-US')}위` : ''),
    s: '공개 자료로 따져 본 참고 점수예요. 앞으로의 집값을 정해 주는 숫자는 아니에요.' });
  if (c.jr) out.push({ k: 'jr', h: '전세가율', t: `${Number(c.jr.v).toFixed(1)}%` + (c.jr.v0 != null ? ` · ${rpDiff(Math.round(c.jr.v * 10) / 10, Math.round(c.jr.v0 * 10) / 10, '%')}` : ''),
    s: c.jr.line ? `매매가 대비 전세 보증금 비율이 ${c.jr.line}%를 넘었어요. 이 정도면 집값이 조금만 내려도 보증금을 다 돌려받기 어려워질 수 있어요.` : '매매가 대비 전세 보증금 비율이에요. 높을수록 갭(매매가 − 전세가)이 작아요.' });
  if (c.near) {
    const L = c.near.list.slice(0, 3).map(r => `${r.apt} ${r.band} ${rpMd(r.dt)} ${r.f != null ? r.f + '층 ' : ''}${rpWon(r.p)}${r.hi ? '(신고가)' : ''}`);
    out.push({ k: 'near', h: '우리 동네 새 거래',
      t: c.near.mode === 'new' ? (c.near.n ? `지난 성적표(${rpMd(c.pd)}) 뒤 ${c.p.dong}에 새로 올라온 아파트 거래 ${c.near.n}건` : `지난 성적표(${rpMd(c.pd)}) 뒤 ${c.p.dong}에 새로 올라온 아파트 거래는 없어요`)
        : (c.near.n ? `최근 2주 ${c.p.dong}에서 계약된 아파트 거래 ${c.near.n}건` : `최근 2주 ${c.p.dong}에서 신고된 아파트 거래는 아직 없어요`),
      s: (L.length ? L.join(' · ') + '. ' : '') + (c.near.mode === 'new' ? '공개 자료에 처음 보인 거래예요.' : '지금까지 신고된 것만 세었어요(신고는 계약 뒤 30일 안에 해요).') });
  }
  return out;
}
/** 순자산 = 집값 − 대출 잔액(사용자가 적은 값). 둘 다 있어야 계산 */
function rpNet(price, loan) {
  price = Number(price); loan = Number(loan);
  if (!(price > 0) || !(loan >= 0) || !isFinite(loan)) return null;
  return { net: price - loan, ratio: Math.round(loan / price * 1000) / 10 };
}
/** 층 참고값: 같은 단지·같은 평형 실거래(price/{구}.json units[11]) 가운데 내 층 ±3층 · 최근 1년 · 직거래 뺀 거래의 중간값. 3건 미만이면 null */
function rpFloorRef(trades, fl, today) {
  fl = Math.round(Number(fl)); if (!isFinite(fl) || fl < -5 || fl > 120 || !Array.isArray(trades)) return null;
  const t = String(today || '').replace(/-/g, ''), lo = (+t.slice(0, 4) - 1) * 10000 + +t.slice(4, 8);
  const v = trades.filter(x => Array.isArray(x) && x[0] >= lo && x[4] !== 1 && x[2] != null && Math.abs(x[2] - fl) <= RP_FLOOR_NEAR && x[3] > 0).map(x => x[3]).sort((a, b) => a - b);
  if (v.length < RP_FLOOR_MIN) return { n: v.length, med: null };
  const n = v.length, med = n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2);
  return { n: n, med: med, lo: v[0], hi: v[n - 1] };
}
/** 메일에 실을 집: 내 집(homes) 먼저, 관심 단지(favs) 다음, 같은 집은 한 번, RP_MAX 곳까지 */
function rpPlaces(homes, favs) {
  const seen = {}, out = [];
  (homes || []).concat(favs || []).forEach(p => { if (!p || !p.code) return; const id = rpPid(p); if (seen[id] || out.length >= RP_MAX) return; seen[id] = 1; out.push(p); });
  return out;
}
/* 메일: cards = [{c(카드), g(구 이름), mine(내 집이면 true)}], o = { site, web(끝 /), links: { rp(성적표만 끄기), all(모든 알림 끄기) }, sender, date }
   → { subject, html, text }. 광고 없음. 순자산·보정 값은 싣지 않는다(메일은 전달될 수 있어서) */
function rpMailHtml(cards, o) {
  o = o || {};
  const site = o.site || '집코드', web = o.web || '', L = o.links || {}, text = [];
  const blocks = cards.map(x => {
    const c = x.c, lines = rpLines(c, x.g);
    text.push(`■ ${c.p.apt} ${c.p.band}`); lines.forEach(l => text.push(`${l.h}: ${l.t}`));
    const rows = lines.map(l => `<tr><td style="padding:7px 0;border-top:1px solid #F2F4F6;vertical-align:top;width:92px;font-size:13px;color:#4E5968;font-weight:700">${rpEsc(l.h)}</td>
      <td style="padding:7px 0 7px 8px;border-top:1px solid #F2F4F6"><b style="font-size:14.5px;color:#191F28;line-height:1.5">${rpEsc(l.t)}</b><br><span style="font-size:12.5px;color:#4E5968;line-height:1.55">${rpEsc(l.s)}</span></td></tr>`).join('');
    const url = web ? `${web}my/report/?sd=${encodeURIComponent(c.p.sd)}&d=${encodeURIComponent([c.p.code, c.p.dong, c.p.jibun || '', c.p.apt].join('|'))}&b=${encodeURIComponent(c.p.band)}` : '';
    return `<div style="border:1px solid #E5E8EB;border-radius:14px;padding:14px 16px;margin:0 0 12px">
      <div style="font-size:12px;font-weight:800;color:${x.mine ? '#8A6A12' : '#4E5968'}">${x.mine ? '내 집' : '관심 단지'}</div>
      <div style="font-size:17px;font-weight:900;margin:2px 0 6px">${rpEsc(c.p.apt)} <span style="font-size:13px;font-weight:500;color:#4E5968">${rpEsc([x.g, c.p.dong, c.p.band].filter(Boolean).join(' · '))}</span></div>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      ${url ? `<a href="${rpEsc(url)}" style="display:inline-block;margin-top:8px;font-size:13.5px;color:#2F6BFF">성적표 크게 보기·공유하기</a>` : ''}</div>`;
  }).join('');
  const off = [L.rp ? `<a href="${rpEsc(L.rp)}" style="color:#4E5968">성적표 메일만 끄기(한 번 누르면 끝)</a>` : '', L.all ? `<a href="${rpEsc(L.all)}" style="color:#4E5968">모든 알림 끄기</a>` : '',
    web ? `<a href="${rpEsc(web)}my/alerts/" style="color:#4E5968">알림 설정 바꾸기</a>` : ''].filter(Boolean).join(' · ');
  const html = `<div style="font-family:'Noto Sans KR',sans-serif;max-width:600px;margin:auto;color:#191F28">
    <div style="font-weight:900;font-size:19px;margin:6px 0 2px">${rpEsc(site)} <span style="color:#B8942A">내 집 성적표</span> <span style="font-size:13px;font-weight:700;color:#4E5968">${rpMd(o.date)}</span></div>
    <p style="margin:0 0 12px;font-size:13.5px;color:#4E5968;line-height:1.55">등록하신 내 집과 관심 단지의 한 주를 공개 자료로만 정리했어요. 지난 성적표와 달라진 점을 함께 적었어요.</p>
    ${blocks}
    <p style="font-size:12px;color:#4E5968;line-height:1.65;margin:12px 0 0;border-top:1px solid #E5E8EB;padding-top:10px">
    자료: 국토교통부 아파트 매매 실거래가 공개 자료, ${rpEsc(site)} 주간 실거래 동향. 과거 자료로 만든 참고 정보예요.<br>
    이 메일은 ${rpEsc(site)} 알림 센터에서 '내 집 성적표 메일'을 켜신 분께만 매주 월요일 오전에 보내는 정보 메일이에요. 광고가 아니에요.<br>
    ${off}<br>보낸 사람: ${rpEsc(site)}${o.sender ? `(${rpEsc(o.sender.name)}) · 전화 ${rpEsc(o.sender.tel)} · 답장은 ${rpEsc(o.sender.email)}로 가요` : ''}</p></div>`;
  const first = cards[0] ? cards[0].c.p.apt : '';
  const subject = `[${site}] ${rpMd(o.date)} 내 집 성적표 — ${first}${cards.length > 1 ? ` 외 ${cards.length - 1}곳` : ''}`.slice(0, 120);
  return { subject: subject, html: html, text: text.join('\n') };
}
/* REPORT-CORE END */

const API = { MAX: RP_MAX, key: rpKey, pid: rpPid, card: rpCard, lines: rpLines, diff: rpDiff, net: rpNet, floorRef: rpFloorRef, places: rpPlaces, mailHtml: rpMailHtml,
  won: rpWon, md: rpMd, ym: rpYm, pct: rpPct, esc: rpEsc };
root.JDJ_REPORT_CORE = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
