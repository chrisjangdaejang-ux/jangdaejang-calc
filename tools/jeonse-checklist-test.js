/* '전세사기 예방 체크리스트'(jeonse/checklist/) 화면 규칙 자동 검증 — 실행: node tools/jeonse-checklist-test.js */
const fs = require('fs'), path = require('path');
const R = require('../assets/rent-core.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'jeonse', 'checklist', 'index.html'), 'utf8');
const body = html.replace(/<style[\s\S]*?<\/style>/, '');
const rows = [];
const check = (name, got, want) => rows.push({ ok: JSON.stringify(got) === JSON.stringify(want), name, got, want });

check('h1', (html.match(/<h1>([^<]*)<\/h1>/) || [])[1], '전세사기 예방 체크리스트');
check('canonical', html.includes('<link rel="canonical" href="https://chrisjangdaejang-ux.github.io/jangdaejang-calc/jeonse/checklist/">'), true);
check('og:title', html.includes('content="전세 계약 전, 이것부터 확인하세요 — 전세사기 예방 체크리스트"'), true);
check('og:image 파일 있음', fs.existsSync(path.join(root, 'assets', 'og', 'jeonse-checklist.png')), true);
const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const stages = (html.match(/<section class="stage panel"/g) || []).length, items = (html.match(/<li class="it"/g) || []).length;
check('JSON-LD HowTo 5단계', [ld['@type'], ld.step.length], ['HowTo', 5]);
check('JSON-LD 항목 수 = 화면 항목 수', ld.step.reduce((s, x) => s + x.itemListElement.length, 0), items);
check('화면 단계 5개', stages, 5);
check('JSON-LD 항목 이름이 화면에 있음', ld.step.every(s => s.itemListElement.every(i => html.includes(i.name.replace(/'/g, '&#x27;')) || html.includes(i.name))), true);
check('단계마다 출처 줄', (html.match(/<p class="srcl">/g) || []).length >= stages, true);
check('공식 출처만(정부·공공기관 주소)', [...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => new URL(m[1]).hostname)
  .filter(h => !/(\.go\.kr|gov\.kr|fonts\.googleapis\.com|khug\.or\.kr|korea\.kr|chrisjangdaejang-ux\.github\.io|realtyprice\.kr)$/.test(h)), []);
check('보장 표현 없음', /100%|완벽|보장|무조건|절대 안전|안전합니다/.test(body), false);
check('면책 문구 한 번만', body.split('체크리스트는 공공기관 안내를 정리한 것이며').length - 1, 1);
check('HUG 기준 재사용(90%·140%)', [R.HUG.ratio, R.HUG.pub, /R\.hugCap\(/.test(html), /H\.ratio/.test(html)], [0.9, 1.4, true, true]);
check('확인 안 된 기준 안 씀(80%·126%·70%)', /80%|126%|70%/.test(body), false);
check('공유·인쇄 단추 위아래', [(html.match(/data-jshare="(top|bottom)">/g) || []).length, (html.match(/data-print>/g) || []).length], [2, 2]);
check('인쇄용 CSS', /@media print\{/.test(html), true);
check('개인정보 저장 안 함(체크 상태·종류만)', /localStorage\.setItem\(KEY, JSON\.stringify\(st\)\)/.test(html) && !/hP'\)\.value[^;]*setItem/.test(html), true);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
check('서비스 워커 캐시 목록', sw.includes("'./jeonse/checklist/'"), true);
check('통계 기능 이름 등록', /'jeonse_checklist'/.test(fs.readFileSync(path.join(root, 'assets', 'stat.js'), 'utf8')), true);
check('전월세 화면에서 연결', fs.readFileSync(path.join(root, 'jeonse', 'index.html'), 'utf8').includes('전체 체크리스트 보기 →'), true);

let bad = 0;
for (const r of rows) { if (!r.ok) bad++; console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.name + (r.ok ? '' : `  got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`)); }
console.log(`\n${rows.length - bad}/${rows.length} 통과`);
process.exit(bad ? 1 : 0);
