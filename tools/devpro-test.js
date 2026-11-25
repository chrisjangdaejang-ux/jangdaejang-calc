/* 시행사·분양대행사 리포트 안내 페이지(pro/developer/) 자동 확인 — 실행: node tools/devpro-test.js
   ① 가격 구간(DEV-PRICE)이 말이 되는지(런칭가 < 정가, 기한 날짜)
   ② 신청 폼이 기존 광고 문의 흐름(agent-backend.gs adInquiry)을 그대로 쓰는지 — 새 서버·옛 서버(새 상품 키를 모르는 서버) 모두 접수되는지
   ③ 화면 문구 원칙(회사명 대신 '집예보', 금지 단어, 점수와 광고 분리 문구, 샘플 파일·광고 페이지 연결)
   (실제 구글 서버에는 접속하지 않습니다.) */
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function check(name, ok, info) { if (ok) pass++; else { fail++; console.log('XX ' + name, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } }

const html = fs.readFileSync(path.join(ROOT, 'pro/developer/index.html'), 'utf8');
const m = html.match(/\/\* DEV-PRICE:START[\s\S]*?\/\* DEV-PRICE:END \*\//);
check('DEV-PRICE 구간 있음', !!m);
const pc = {}; vm.createContext(pc);
vm.runInContext(m[0] + '\n;globalThis.__P = { DEV_PRICES, DEV_PROD, won, serverProducts, devMemo, DP_TERMS_VER, COLOR_PROD };', pc);
const P = pc.__P;

// ① 가격
for (const k of ['dev_report', 'dev_extra', 'dev_update', 'unsold_pack', 'brochure', 'datapack', 'brochure_update']) {
  const p = P.DEV_PRICES[k];
  check(`가격 ${k}: 정가·런칭가 숫자`, p && p.list > 0 && p.launch > 0 && p.list % 1000 === 0 && p.launch % 1000 === 0, p);
  check(`가격 ${k}: 런칭가 < 정가`, p.launch < p.list, p);
  check(`화면에 ${k} 금액 칸`, html.includes(`data-pp="${k}"`));
}
check('자료 팩: 정가 19만 원·런칭가 9만 원, 잠금형 브로슈어 런칭가 19만 원', P.DEV_PRICES.datapack.list === 190000 && P.DEV_PRICES.datapack.launch === 90000 && P.DEV_PRICES.brochure.launch === 190000, P.DEV_PRICES.datapack);
check('잠금형 브로슈어: 정가 39만 원·런칭가 19만 원', P.DEV_PRICES.brochure.list === 390000 && P.DEV_PRICES.brochure.launch === 190000, P.DEV_PRICES.brochure);
check('브로슈어 다시 만들기: 정가 10만 원·런칭가 5만 원', P.DEV_PRICES.brochure_update.list === 100000 && P.DEV_PRICES.brochure_update.launch === 50000, P.DEV_PRICES.brochure_update);
check('비교표에 두 상품 가격 칸(정가 줄 긋기 표시)', /<table class="cmp"[\s\S]*?data-pp="brochure"[\s\S]*?data-pp="datapack"[\s\S]*?<\/table>/.test(html) && html.includes('<s>${per}${won(p.list)}</s>'));
// 판매 중 상품(주간 현장 보고서 기본·잠금형·광고 지역 추천) — 대표 승인가 2026-11-21
const WANT = { weekly_report: [190000, 390000, '월'], weekly_locked: [290000, 590000, '월'], ad_target: [150000, 290000, undefined] };
for (const k of Object.keys(WANT)) {
  const p = P.DEV_PRICES[k];
  check(`확정가 ${k}: 런칭가·정가·단위`, p && p.launch === WANT[k][0] && p.list === WANT[k][1] && p.per === WANT[k][2] && !p.soon, p);
  check(`화면에 ${k} 금액 칸`, html.includes(`data-pp="${k}"`));
  check(`신청 칸 ${k}·서버 이름`, html.includes(`value="${k}"`) && !!P.DEV_PROD[k]);
}
check('주간 보고서 비교표(기본 vs 잠금형) 가격 칸', /aria-label="주간 현장 보고서 기본과 잠금형 비교"[\s\S]*?data-pp="weekly_report"[\s\S]*?data-pp="weekly_locked"[\s\S]*?<\/table>/.test(html));
check('판매 중 배지·신청 버튼·샘플 PDF', ['p-weekly', 'p-target'].every(id => new RegExp(`<section id="${id}">[\\s\\S]*?판매 중 · 신청 받기[\\s\\S]*?data-pick=`).test(html)) && html.includes('sample-weekly.pdf') && html.includes('sample-target.pdf'));
check('출시 예정·출시 때 확정 문구가 남지 않음', !/출시 예정|출시 때 확정|soon:/.test(html));
for (const f of ['sample-weekly.pdf', 'sample-target.pdf', 'w1.jpg', 'w4.jpg', 't1.jpg', 't4.jpg']) check(`샘플 파일 ${f}`, fs.existsSync(path.join(ROOT, 'pro/developer', f)));
check('서버로 보내는 상품 이름', JSON.stringify(P.serverProducts(['weekly_report', 'weekly_locked', 'ad_target'])) === '["weekly_report","weekly_locked","ad_target","etc"]');
const cm = P.devMemo({ sel: ['weekly_report'], site: '중화역', memo: '', color: '#0f766e' });
check('회사 색: 색을 받는 상품만, 대문자로 문의 내용에', cm.includes('회사 색: #0F766E') && !P.devMemo({ sel: ['dev_report'], site: 'x', memo: '', color: '#0f766e' }).includes('회사 색') && !P.devMemo({ sel: ['weekly_report'], site: 'x', memo: '', color: 'red' }).includes('회사 색'), cm);
check('런칭가 기한은 날짜', /^\d{4}-\d{2}-\d{2}$/.test(P.DEV_PRICES.until) && !isNaN(new Date(P.DEV_PRICES.until)));
check('금액 표기', P.won(990000) === '99만 원' && P.won(1500000) === '150만 원' && P.won(12345) === '12,345원');

// ② 서버 상품 키
check('서버로 보내는 상품: 고른 것 + etc', JSON.stringify(P.serverProducts(['dev_report', 'unsold_pack'])) === '["dev_report","unsold_pack","etc"]');
check('모르는 값은 버림', JSON.stringify(P.serverProducts(['admin'])) === '["etc"]');
const memo = P.devMemo({ sel: ['dev_report'], site: '서울 성북구 장위동', types: '84㎡ 12억', due: '2주 안', role: '시행사', memo: '가'.repeat(2000) });
check('문의 내용 1,000자 이하·수식 시작 아님·상품 이름 포함', memo.length <= 1000 && !/^[=+\-@]/.test(memo) && memo.includes('분양가 적정성·입지 분석 리포트') && memo.includes('서울 성북구 장위동'), memo.slice(0, 80));

/* 가짜 구글 서비스 위에서 adInquiry 실행 */
function runBackend(srcPatch) {
  const sheets = {};
  const mk = () => { const rows = []; const sh = { rows, getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }), getLastRow: () => rows.length, appendRow: r => rows.push(r.slice()), setFrozenRows() {},
    getRange: (r, c) => { const rg = { setValues(v) { v.forEach((line, i) => line.forEach((x, j) => { (rows[r - 1 + i] = rows[r - 1 + i] || [])[c - 1 + j] = x; })); return rg; }, setValue() { return rg; }, getValue: () => '', getValues: () => [[]],
      setFontWeight: () => rg, setBackground: () => rg, setFontColor: () => rg, setNumberFormat: () => rg, insertCheckboxes: () => rg }; return rg; } }; return sh; };
  const book = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = mk()), getUrl: () => 'x', getSheets: () => Object.values(sheets), deleteSheet() {} };
  const cache = new Map(), mails = [];
  const ctx = { console, SpreadsheetApp: { getActive: () => book, openById: () => book },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k, v) => cache.set(k, v), remove: k => cache.delete(k), removeAll() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) }, MailApp: { sendEmail: (...a) => mails.push(a) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    Utilities: { getUuid: () => crypto.randomUUID(), formatDate: d => d.toISOString().slice(0, 10), computeDigest: () => [], base64Encode: s => s, DigestAlgorithm: {}, Charset: {} },
    UrlFetchApp: { fetch() { throw new Error('no network'); } } };
  vm.createContext(ctx);
  let src = fs.readFileSync(path.join(ROOT, 'tools/agent-backend.gs'), 'utf8');
  if (srcPatch) src = srcPatch(src);
  vm.runInContext(src + '\n;globalThis.__T = { AQC, SH_AQ, AQ_PROD, AQH };', ctx);
  const post = b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).s);
  return { post, sheets, T: ctx.__T, mails };
}
const body = sel => ({ action: 'adInquiry', type: 'inquiry', company: '(주)테스트개발', manager: '김담당', contact: 'dev@example.com',
  products: P.serverProducts(sel), region: '서울 성북구 장위동', period: '미정·협의', agree: { privacy: true }, hp: '',
  memo: P.devMemo({ sel, site: '서울 성북구 장위동', types: '84㎡ 12억', due: '', role: '시행사', memo: '' }) });

const S = runBackend();
check('서버 상품 목록에 일곱 상품(화면 이름과 같음)', ['dev_report', 'unsold_pack', 'brochure', 'datapack', 'weekly_report', 'weekly_locked', 'ad_target'].every(k => S.T.AQ_PROD[k] === P.DEV_PROD[k]) && !!S.T.AQ_PROD.etc, S.T.AQ_PROD);
const dm = P.devMemo({ sel: ['datapack'], site: '중화역 라온프라이빗 센트로', types: '', due: '', role: '분양대행사', memo: '', dpAgree: true });
check('자료 팩 신청: 문의 내용에 이용 조건 동의·판 날짜', dm.includes('자료 팩 이용 조건 동의: 예') && dm.includes(P.DP_TERMS_VER) && !P.devMemo({ sel: ['dev_report'], site: 'x', memo: '' }).includes('이용 조건'), dm);
let r = S.post(body(['dev_report', 'unsold_pack']));
check('새 서버: 신청 접수', r.ok && /^AQ[0-9A-F]{8}$/.test(r.id), r);
const row = S.sheets[S.T.SH_AQ].rows[1], C = S.T.AQC;
check('새 서버: 관심 상품에 두 상품 이름', row[C['관심상품']] === '분양가 적정성·입지 분석 리포트,미분양 해소 패키지,기타·제휴', row[C['관심상품']]);
check('새 서버: 사업지·평형이 문의 내용에', /장위동/.test(row[C['문의내용']]) && /84㎡ 12억/.test(row[C['문의내용']]));
check('알림 메일에 연락처 없음', !JSON.stringify(S.mails).includes('dev@example.com'));
const rd = S.post(body(['datapack']));
check('새 서버: 자료 팩 접수·관심 상품 이름', rd.ok && S.sheets[S.T.SH_AQ].rows.slice(-1)[0][S.T.AQC['관심상품']] === '현장 자료 팩(편집형),기타·제휴', r);
const mw = S.mails.length; const rw = S.post(Object.assign(body(['weekly_report', 'ad_target']), { reportEmail: 'report@example.com' }));
check('새 서버: 주간 보고서·광고 지역 추천 신청 접수 + 운영자 알림 메일(상품 이름, 연락처 없음)', rw.ok && S.mails.length === mw + 1 && /주간 현장 보고서\(기본\),광고 지역 추천 리포트/.test(S.mails[mw][2]) && !S.mails[mw][2].includes('dev@example.com'), S.mails.slice(-1));
const aqRows = () => S.sheets[S.T.SH_AQ].rows, AC = S.T.AQC;
check('보고서 이메일: [연락처]와 따로 [보고서 이메일] 칸에 저장, 시트 머리에 칸 이름', rw.ok && aqRows().slice(-1)[0][AC['보고서 이메일']] === 'report@example.com' && aqRows().slice(-1)[0][AC['연락처']] === 'dev@example.com' && aqRows()[0].includes('보고서 이메일'), aqRows()[0]);
for (const k of ['weekly_report', 'weekly_locked', 'ad_target']) {
  const e1 = S.post(Object.assign(body([k]), { contact: '010-1234-5678' }));
  const e2 = S.post(Object.assign(body([k]), { contact: '010-1234-5678', reportEmail: 'not-an-email' }));
  check(`${k}: 보고서 이메일 없거나 형식이 틀리면 서버가 거절(전화번호만으로 신청 못 함)`, !e1.ok && /보고서를 받을 이메일/.test(e1.err || e1.error || JSON.stringify(e1)) && !e2.ok && /형식/.test(JSON.stringify(e2)), [e1, e2]);
}
const e3 = S.post(Object.assign(body(['weekly_locked']), { contact: '010-1234-5678', reportEmail: 'boss@company.co.kr' }));
check('전화번호 연락처 + 보고서 이메일이면 접수', e3.ok && aqRows().slice(-1)[0][AC['보고서 이메일']] === 'boss@company.co.kr', e3);
const e4 = S.post(body(['dev_report']));
check('다른 상품은 보고서 이메일 없이도 접수(빈칸)', e4.ok && aqRows().slice(-1)[0][AC['보고서 이메일']] === '', e4);
check('화면: 보고서 이메일 칸(필수 표시)·상품 목록이 서버와 같음·신청 때 함께 보냄',
  html.includes('id="remail"') && /보고서 받을 이메일 <i>\*<\/i>/.test(html) && html.includes("const REPORT_PROD = ['weekly_report', 'weekly_locked', 'ad_target']") && html.includes("reportEmail: needMail() ? $('remail').value.trim() : ''")
  && /const AQ_REPORT_PROD = \['weekly_report', 'weekly_locked', 'ad_target'\]/.test(fs.readFileSync(path.join(ROOT, 'tools/agent-backend.gs'), 'utf8')));
const OLD = runBackend(src => src.replace(/,\s*dev_report: '[^']*', unsold_pack: '[^']*',\s*brochure: '[^']*', datapack: '[^']*',\s*weekly_report: '[^']*', weekly_locked: '[^']*', ad_target: '[^']*' \};/, ' };'));
check('옛 서버 흉내: 새 상품 키 없음', !OLD.T.AQ_PROD.dev_report && !OLD.T.AQ_PROD.datapack);
r = OLD.post(body(['dev_report']));
check('옛 서버(재배포 전)도 기타·제휴로 접수', r.ok && OLD.sheets[OLD.T.SH_AQ].rows[1][OLD.T.AQC['관심상품']] === '기타·제휴', r);

// ③ 화면 문구
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
check('화면에 회사명 대신 집예보', !text.includes('장대장부동산그룹') && text.includes('집예보'));
check('금지 단어 없음(시험·통과)', !/시험|통과/.test(text));
check('점수·순위는 의뢰·광고와 무관 문구', /미래가치 점수·순위는 의뢰·광고·요금과 무관/.test(text));
check('단정 금지 문구(가까움)', /구간에 가까움/.test(text) && /단정하지 않/.test(text));
check('세금계산서·계좌이체', /세금계산서/.test(text) && /계좌이체/.test(text));
for (const f of ['sample-price.pdf', 'sample-unsold.pdf', 's1.jpg', 's2.jpg', 's3.jpg', 's4.jpg', 'u1.jpg', 'u2.jpg', 'u3.jpg', 'sample-datapack.zip', 'd1.jpg', 'd2.jpg', 'd3.jpg', 'd4.jpg']) {
  check(`샘플 파일 ${f} 있음·연결`, fs.existsSync(path.join(ROOT, 'pro/developer', f)) && html.includes(f));
}
check('이미지 대체 글', (html.match(/<img /g) || []).length === (html.match(/<img [^>]*alt="[^"]{8,}"/g) || []).length);
// 자료 팩(편집형)
check('자료 팩 상품 칸·가격 칸·신청 선택지', html.includes('id="p-datapack"') && html.includes('data-pp="datapack"') && html.includes('value="datapack"') && html.includes('href="#p-datapack"'));
check('두 상품 비교표: 미래가치·과거 성적은 잠금형만, 미래가치까지 쓰려면 ①', /미래가치 점수·과거 성적<\/th><td class="y">들어감<\/td><td class="n">빠짐/.test(html) && /미래가치 점수·과거 성적까지[^<]*<\/b>|미래가치 점수·과거 성적까지 고객에게 보여 주려면 ①/.test(html));
check('이용 조건 네 가지가 화면에', ['숫자 변경 금지', '출처 표기 유지', '집예보 이름·로고 사용 금지', '광고 책임은 사용 업체에'].every(k => text.includes(k)));
check('자료 팩 동의 칸(필수) · 자료 팩 고르면 동의 없이는 못 보냄', html.includes('id="agreeDp"') && /sel\(\)\.includes\('datapack'\) && !\$\('agreeDp'\)\.checked/.test(html));
check('지도: OpenStreetMap 표기, 카카오맵 이미지 안 씀', text.includes('OpenStreetMap') && !/카카오맵|kakao map/i.test(text));
{
  const zbuf = fs.readFileSync(path.join(ROOT, 'pro/developer/sample-datapack.zip'));
  const names = []; for (let i = 0; i + 30 < zbuf.length; i++) if (zbuf.readUInt32LE(i) === 0x02014b50) { const n = zbuf.readUInt16LE(i + 28); names.push(zbuf.slice(i + 46, i + 46 + n).toString('utf8')); }
  check('샘플 zip: 그림·엑셀·이용 조건', names.some(n => n.endsWith('이용 조건.txt')) && names.some(n => n.endsWith('.xlsx')) && names.filter(n => n.endsWith('.png')).length >= 8, names.slice(0, 5));
  check('샘플 zip 3MB 이하', zbuf.length < 3e6, zbuf.length);
}
const ad = fs.readFileSync(path.join(ROOT, 'ad/index.html'), 'utf8');
check('광고 안내 페이지에서 연결', ad.includes('../pro/developer/') && ad.includes('href="#developer"'));
check('광고 상품 페이지로 연결', html.includes('../../ad/#p-bunyang') && html.includes('../../ad/#prices'));

console.log(`\n시행사 리포트 페이지: ${pass}개 맞음, ${fail}개 틀림`);
process.exit(fail ? 1 : 0);
