/* AI 답변에서 들어온 방문 측정(assets/track.js) 검사 — 실행: node tools/ai-ref-test.js </dev/null
   ① utm_source·이전 화면 주소(referrer)로 ChatGPT·Perplexity·Claude·Gemini·Copilot·네이버 CLOVA X·MCP 도구 유입을 구분
   ② AI 유입이면 GA4 에 ai_referral 이벤트(ai_source)를 이 탭에서 한 번만 보내고, 다른 이벤트에도 ai_source 를 붙임
   ③ 일반 유입(유튜브·네이버 검색·직접)과 예전 'claude' 공유 꼬리표는 AI 로 세지 않음
   ④ GA 로 가는 주소에는 계산 입력값이 붙지 않음(기존 규칙 유지) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let ok = 0, bad = 0;
const check = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) ok++; else { bad++; console.log('FAIL ' + name + '\n   결과 ' + g + '\n   기대 ' + w); }
};
const TRACK = fs.readFileSync(path.join(ROOT, 'assets/track.js'), 'utf8');
function store(init) {
  const m = new Map(Object.entries(init || {}));
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
function run(href, referrer, ss) {
  const u = new URL(href);
  const ctx = { location: u, localStorage: store(), sessionStorage: ss || store(), URL, URLSearchParams, Date, Math, console,
    history: { state: null, replaceState() {} },
    document: { referrer: referrer || '', head: { appendChild() {} }, createElement: () => ({}), addEventListener() {}, querySelector: () => null } };
  ctx.window = ctx;
  ctx.window.JDJ_CONFIG = { tool: 'seo-apt', GA4_ID: 'G-TEST' };
  vm.runInNewContext(TRACK, ctx);
  const ev = ctx.dataLayer.filter(a => a[0] === 'event').map(a => [a[1], a[2]]);
  const cfg = ctx.dataLayer.find(a => a[0] === 'config');
  return { ctx, ev, cfg, J: ctx.JDJ };
}
const A = 'https://chrisjangdaejang-ux.github.io/jangdaejang-calc/apt/11680/abcd1234-래미안/';
const S = (u, r) => run(u, r).ctx.JDJ_AI_SRC;
const f = run(A, '').ctx.JDJ_AI_SRC;

/* ① 구분 */
check('ChatGPT 링크 꼬리표(utm_source=chatgpt.com)', f('chatgpt.com', ''), 'ai_chatgpt');
check('ChatGPT 이전 화면 주소', f('', 'https://chatgpt.com/'), 'ai_chatgpt');
check('Perplexity', [f('', 'https://www.perplexity.ai/search?q=x'), f('perplexity', '')], ['ai_perplexity', 'ai_perplexity']);
check('Claude 이전 화면 주소', f('', 'https://claude.ai/'), 'ai_claude');
check('Gemini', f('', 'https://gemini.google.com/'), 'ai_gemini');
check('Copilot', f('', 'https://copilot.microsoft.com/'), 'ai_copilot');
check('네이버 CLOVA X·naver_ai 꼬리표', [f('', 'https://clova-x.naver.com/'), f('naver_ai', '')], ['ai_naver', 'ai_naver']);
check('카카오(PlayMCP·카나나) 꼬리표', [f('playmcp', ''), f('kanana', '')], ['ai_kakao', 'ai_kakao']);
check('집예보 MCP 도구 링크 꼬리표', f('mcp', ''), 'ai_mcp');
check('이름 모르는 AI 꼬리표(ai_xxx)', f('ai_test', ''), 'ai_other');
/* ③ AI 아님 */
check('유튜브·네이버 검색·구글 검색·직접 방문은 AI 아님', [f('', 'https://www.youtube.com/'), f('', 'https://search.naver.com/search.naver?q=x'),
  f('', 'https://www.google.com/'), f('', ''), f('yt', '')], ['', '', '', '', '']);
check('비슷한 이름 다른 사이트는 AI 아님', [f('', 'https://notchatgpt.com.evil.kr/'), f('', 'https://claude.ai.example.com/'), f('', 'https://mail.google.com/')], ['', '', '']);
check("예전 'claude' 공유 꼬리표는 AI 로 세지 않음", f('claude', ''), '');
check('깨진 referrer 는 무시', f('', 'not a url'), '');

/* ② GA4 이벤트 */
const r1 = run(A + '?utm_source=chatgpt.com', '');
check('채널 = AI·ChatGPT', r1.J.channel, 'AI·ChatGPT');
check('ai_referral 이벤트 1번(ai_source)', r1.ev.filter(e => e[0] === 'ai_referral').map(e => e[1].ai_source), ['ai_chatgpt']);
check('calc_open 에도 ai_source', r1.ev.find(e => e[0] === 'calc_open')[1].ai_source, 'ai_chatgpt');
check('GA 주소에는 utm 만(입력값 없음)', r1.cfg[2].page_location, A.replace('래미안', encodeURIComponent('래미안')) + '?utm_source=chatgpt.com');
const ss = store();
run(A, 'https://www.perplexity.ai/', ss);
const r2 = run(A + '../', 'https://www.perplexity.ai/', ss);
check('같은 탭에서 다시 열면 ai_referral 다시 안 보냄', r2.ev.filter(e => e[0] === 'ai_referral').length, 0);
check('다시 열어도 다른 이벤트에는 ai_source', r2.ev.find(e => e[0] === 'calc_open')[1].ai_source, 'ai_perplexity');
const r3 = run(A + '?utm_source=yt', 'https://www.youtube.com/');
check('일반 유입: ai_referral 없음·ai_source 없음', [r3.ev.filter(e => e[0] === 'ai_referral').length, 'ai_source' in r3.ev[0][1], r3.J.channel], [0, false, '유튜브']);
check('AI 꼬리표가 다른 꼬리표(src=seo)보다 먼저', run(A + '?src=seo', 'https://chatgpt.com/').J.channel, 'AI·ChatGPT');

console.log(`ai-ref-test: ${ok} ok, ${bad} fail`);
process.exit(bad ? 1 : 0);
