"""예측 적중 기록 공유 카드(1080×1080 PNG) — Playwright 로 HTML 을 그려 저장.

python3 tools/trackrecord_card.py <trackrecord.json> <저장할 png> [--h 12] [--scope 전국]
서비스 이름은 assets/config.js 의 SITE_NAME 에서 읽는다(이 파일에 이름을 쓰지 않음). 숫자는 trackrecord.json 그대로.
약한 곳(반대로 나온 범위)이 있으면 카드에도 한 줄로 그대로 적는다.
"""
import sys, os, re, json, html, argparse, asyncio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HL = {6: '6개월', 12: '1년', 24: '2년'}


def site_name():
    s = open(os.path.join(ROOT, 'assets', 'config.js'), encoding='utf-8').read()
    m = re.search(r"SITE_NAME:\s*'([^']*)'", s)
    return m.group(1) if m else ''


def f1(v): return f'{v:.1f}'


def weak_line(T):
    """모든 범위 중 반대로 나온 곳(상위−하위 ≤ 0) → 한 줄. 없으면 차이가 가장 작은 곳."""
    rev, small = [], []
    for a in T['assets'].values():
        for sc, hh in (a.get('scopes') or {}).items():
            for h, x in hh.items():
                if not x.get('months'): continue
                (rev if x['gap'] <= 0 else small).append((x['gap'], f"{a['name']} {sc} {HL[int(h)]}"))
    if rev:
        rev.sort(); return f'잘 안 맞은 곳: {rev[0][1]}은 반대로 나왔어요'
    if small:
        small.sort(); return f'차이가 가장 작은 곳: {small[0][1]}'
    return ''


def card_html(T, h, scope, name):
    a = T['assets']['apt']; x = a['scopes'][scope][str(h)]; b = x['b']
    rows = [('점수 상위 20%', b['top']['hit'], '#2560E8'), ('가운데 60%', b['mid']['hit'], '#8AA6E8'), ('점수 하위 20%', b['bot']['hit'], '#C3D1F0')]
    bars = ''.join(f'''<div class="r"><div class="l">{html.escape(t)}</div><div class="t"><div class="f" style="width:{v}%;background:{c}"></div><i></i>
      <span style="left:calc({min(max(v, 50), 80)}% + 14px)">{f1(v)}%</span></div></div>''' for t, v, c in rows)
    ym = lambda s: f'{s[:4]}.{s[4:]}'
    return f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box}}body{{margin:0;width:1080px;height:1080px;font-family:'Noto Sans KR',sans-serif;background:#fff;color:#191F28}}
.w{{position:relative;width:1080px;height:1080px;padding:72px 76px;background:linear-gradient(180deg,#EAF0FF 0%,#F6F8FF 38%,#FFFFFF 70%)}}
.top{{display:flex;justify-content:space-between;align-items:center}}
.bn{{display:flex;align-items:center;gap:14px;font-size:38px;font-weight:900;letter-spacing:-1px}}
.bn svg{{width:52px;height:52px}}
.pill{{font-size:26px;font-weight:800;color:#2560E8;background:#fff;border:2px solid #C9D8FF;border-radius:999px;padding:10px 24px}}
h1{{margin:58px 0 0;font-size:62px;line-height:1.28;letter-spacing:-2.4px;font-weight:900;word-break:keep-all}}
h1 em{{font-style:normal;color:#2560E8}}
.sub{{margin:18px 0 0;font-size:29px;color:#3E4754;font-weight:500;line-height:1.5}}
.bars{{margin:46px 0 0;display:grid;gap:22px}}
.r{{display:grid;grid-template-columns:250px 1fr;align-items:center;gap:20px}}
.l{{font-size:30px;font-weight:800}}
.t{{position:relative;height:66px;background:#F2F4F6;border-radius:8px}}
.f{{position:absolute;left:0;top:0;bottom:0;border-radius:0 8px 8px 0}}
.t i{{position:absolute;left:50%;top:-8px;bottom:-8px;border-left:3px dashed #5F6B7A}}
.t span{{position:absolute;top:50%;transform:translateY(-50%);font-size:34px;font-weight:900}}
.ref{{display:grid;grid-template-columns:250px 1fr;gap:20px;margin-top:10px;font-size:22px;color:#5F6B7A;font-weight:700}}
.ref b{{display:block;padding-left:calc(50% - 64px)}}
.weak{{margin:34px 0 0;font-size:27px;font-weight:700;color:#7C2D12;background:#FDF1EA;border:2px solid #F5CDB8;border-radius:16px;padding:16px 22px}}
.foot{{position:absolute;left:76px;right:76px;bottom:62px;display:flex;justify-content:space-between;align-items:flex-end;font-size:24px;color:#4E5968;font-weight:700}}
.foot .n{{color:#6B4300;background:#FFF6E8;border:2px solid #F3D9A8;border-radius:12px;padding:10px 18px}}
</style></head><body><div class="w">
<div class="top"><div class="bn"><svg viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#4338CA"/><path d="M29 47 V78 H71 V47 Z" fill="#FFFFFF"/><path d="M20 51 L50 26 L80 51" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="59" r="6" fill="#4338CA"/><path d="M46.5 62 L44 74 H56 L53.5 62 Z" fill="#4338CA"/><circle cx="76" cy="24" r="5" fill="#5EEAD4"/></svg>{html.escape(name)}</div><div class="pill">예측 적중 기록</div></div>
<h1>점수 상위 20% {html.escape(a['name'])},<br>{HL[h]} 뒤 같은 구 평균보다<br>더 오른 비율 <em>{f1(b['top']['hit'])}%</em></h1>
<p class="sub">{html.escape(scope)} · {ym(x['from'])}~{ym(x['to'])} 매달, 그때 점수만 보고 나눈 {x['months']}개월치 결과</p>
<div class="bars">{bars}</div>
<div class="ref"><i></i><b>50% · 반반</b></div>
{f'<div class="weak">{html.escape(weak_line(T))}</div>' if weak_line(T) else ''}
<div class="foot"><span class="n">과거 결과이며 미래를 보장하지 않아요</span><span>국토교통부 실거래가 기준</span></div>
</div></body></html>'''


async def render(doc, out):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page(viewport={'width': 1080, 'height': 1080})
        await pg.set_content(doc, wait_until='networkidle')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=out, clip={'x': 0, 'y': 0, 'width': 1080, 'height': 1080})
        await br.close()


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--h', type=int, default=12); ap.add_argument('--scope', default='전국')
    a = ap.parse_args()
    T = json.load(open(a.src, encoding='utf-8'))
    asyncio.run(render(card_html(T, a.h, a.scope, site_name()), a.out))
    print('저장', a.out)


if __name__ == '__main__':
    main()
