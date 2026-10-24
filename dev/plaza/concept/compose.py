"""실제 게임 캡처 위에 규정 간판·포스터·말풍선을 얹어 상상도를 만든다"""
import json, sys, os, html
from playwright.sync_api import sync_playwright
RAW = '/home/claude/concept/raw/'
import os as _o
if _o.environ.get('RAWDIR'): RAW=_o.environ['RAWDIR']
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/concept/A/'
os.makedirs(OUT, exist_ok=True)
META = json.load(open(RAW + 'meta.json'))
e = html.escape

CSS = r"""
@font-face{font-family:Pen;src:local('Nanum Pen Script'),local('나눔손글씨 펜')}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1600px;height:900px;overflow:hidden;font-family:'Pretendard Variable',Pretendard,sans-serif;letter-spacing:-.02em;position:relative;color:#15202B}
.bg{position:absolute;inset:-14px;background-size:cover;background-position:center}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(10,20,35,.38) 100%)}
svg.lines{position:absolute;inset:0;pointer-events:none}
.el{position:absolute}
/* 상단 제목 칩 */
.chip{position:absolute;left:28px;top:24px;display:flex;align-items:stretch;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px -10px rgba(0,0,0,.55);max-width:760px}
.chip .no{background:#2E86D6;color:#fff;font-weight:900;font-size:26px;padding:10px 16px;display:flex;align-items:center}
.chip .tx{background:rgba(14,24,38,.92);color:#fff;padding:10px 18px}
.chip .tx b{display:block;font-size:24px;font-weight:850;line-height:1.2}
.chip .tx span{display:block;font-size:15px;color:#BFD3E6;margin-top:3px;font-weight:600}
.foot{position:absolute;right:20px;bottom:16px;font-size:13px;font-weight:700;color:#fff;background:rgba(14,24,38,.72);padding:6px 12px;border-radius:99px}
.foot i{font-style:normal;color:#8CC63F}
/* 간판 (채널 간판) */
.sign{background:#13294B;color:#fff;border:6px solid #F5C542;border-radius:10px;padding:14px 20px 12px;box-shadow:0 14px 28px -10px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.15);position:absolute}
.sign::before,.sign::after{content:'';position:absolute;top:-46px;width:4px;height:42px;background:linear-gradient(#777,#bbb)}
.sign::before{left:18%}.sign::after{right:18%}
.sign.post::before,.sign.post::after{top:auto;bottom:-60px;height:56px;width:8px;background:linear-gradient(90deg,#5b6470,#9aa3ad,#5b6470)}
.sign .t{font-size:34px;font-weight:900;line-height:1.1;text-shadow:0 0 12px rgba(255,214,90,.55);color:#FFE07A}
.sign .s{font-size:17px;font-weight:700;color:#DCE7F3;margin-top:6px;line-height:1.45}
.sign .s b{color:#fff}
.sign.red{background:#B3261E;border-color:#fff}.sign.red .t{color:#fff;text-shadow:0 0 14px rgba(255,255,255,.5)}
.sign.green{background:#1F5A3C;border-color:#F4F1E6}.sign.green .t{color:#F4F1E6;text-shadow:none}
.sign.white{background:#fff;color:#15202B;border-color:#2E86D6}.sign.white .t{color:#2E86D6;text-shadow:none}.sign.white .s{color:#334}.sign.white .s b{color:#111}
.cite{display:inline-block;margin-top:8px;font-size:13px;font-weight:800;color:#13294B;background:#FFE07A;border-radius:99px;padding:3px 10px}
.sign.white .cite{background:#E8F1FB;color:#1F6AA6}.sign.green .cite{background:#F4F1E6;color:#1F5A3C}.sign.red .cite{background:#fff;color:#B3261E}
/* 네온 */
.neon{position:absolute;font-weight:900;color:#fff;padding:10px 22px;border:4px solid #7CF3FF;border-radius:16px;background:rgba(8,18,35,.82);box-shadow:0 0 12px #7CF3FF,0 0 34px rgba(124,243,255,.55),inset 0 0 12px rgba(124,243,255,.4);text-shadow:0 0 6px #7CF3FF,0 0 18px #7CF3FF}
.neon .t{font-size:40px}.neon .s{font-size:16px;font-weight:700;text-shadow:none;color:#CFF8FF;margin-top:4px}
.neon.pink{border-color:#FF7AC8;box-shadow:0 0 12px #FF7AC8,0 0 34px rgba(255,122,200,.55),inset 0 0 12px rgba(255,122,200,.4);text-shadow:0 0 6px #FF7AC8,0 0 18px #FF7AC8}
/* 입간판 (칠판) */
.aboard{position:absolute;background:#22352B;border:12px solid #8A5A34;border-radius:6px;color:#F3F1E4;padding:16px 22px;box-shadow:0 16px 30px -12px rgba(0,0,0,.6);font-family:'Nanum Pen Script','Nanum Pen',cursive}
.aboard .t{font-size:44px;line-height:1;color:#FFE38A}
.aboard ol{list-style:none;margin-top:8px}.aboard li{font-size:31px;line-height:1.18}
.aboard li::before{content:'✔ ';color:#9FE07A}
.aboard .cite{font-family:'Pretendard Variable',sans-serif;background:#F3F1E4;color:#22352B}
/* 현수막 */
.banner{position:absolute;background:#fff;border:3px solid #D62828;padding:10px 28px;text-align:center;box-shadow:0 10px 22px -10px rgba(0,0,0,.5)}
.banner::before,.banner::after{content:'';position:absolute;top:50%;width:26px;height:3px;background:#777}
.banner::before{left:-26px}.banner::after{right:-26px}
.banner .t{font-size:38px;font-weight:900;color:#D62828;line-height:1.15}
.banner .s{font-size:17px;font-weight:800;color:#13294B;margin-top:4px}
.banner.blue{border-color:#2E86D6}.banner.blue .t{color:#1F6AA6}
/* 지명수배 */
.wanted{position:absolute;width:260px;background:#F4E2B0;border:3px solid #6B4A1F;padding:12px 14px 12px;text-align:center;box-shadow:0 14px 24px -12px rgba(0,0,0,.6);transform:rotate(var(--r,0deg))}
.wanted::before{content:'';position:absolute;top:-10px;left:50%;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#C0392B;box-shadow:0 2px 3px rgba(0,0,0,.4)}
.wanted .h{font-size:20px;font-weight:900;letter-spacing:.3em;color:#6B4A1F}
.wanted .t{font-size:52px;font-weight:900;color:#B3261E;line-height:1.05;margin:4px 0}
.wanted .s{font-size:16px;font-weight:700;color:#3B2A12;line-height:1.4}
.wanted .cite{background:#6B4A1F;color:#F4E2B0}
/* 안전 표지판 */
.safety{position:absolute;background:#FFD400;border:6px solid #111;padding:14px 18px;box-shadow:0 14px 26px -12px rgba(0,0,0,.6)}
.safety .t{font-size:32px;font-weight:900;color:#111;display:flex;align-items:center;gap:10px}
.safety .t i{font-style:normal;display:inline-grid;place-items:center;width:42px;height:42px;background:#111;color:#FFD400;border-radius:50%;font-size:26px}
.safety ol{margin-top:6px;padding-left:4px;list-style:none}
.safety li{font-size:19px;font-weight:800;color:#111;line-height:1.45}
.safety .cite{background:#111;color:#FFD400}
/* 말풍선 */
.bub{position:absolute;background:#fff;border:3px solid #13294B;border-radius:18px;padding:10px 16px;font-size:22px;font-weight:850;line-height:1.3;box-shadow:0 10px 18px -10px rgba(0,0,0,.6);white-space:nowrap}
.bub::after{content:'';position:absolute;bottom:-16px;left:var(--tx,30px);border:14px solid transparent;border-top-color:#13294B;border-bottom:0}
.bub::before{content:'';position:absolute;bottom:-11px;left:calc(var(--tx,30px) + 3px);border:11px solid transparent;border-top-color:#fff;border-bottom:0;z-index:1}
.bub.k{border-color:#2E86D6}.bub.k::after{border-top-color:#2E86D6}
.bub small{display:block;font-size:14px;font-weight:700;color:#5B6B82}
/* 라벨 */
.lab{position:absolute;background:#13294B;color:#fff;border-radius:10px;padding:7px 12px;font-size:17px;font-weight:800;box-shadow:0 8px 16px -8px rgba(0,0,0,.6);white-space:nowrap}
.lab em{font-style:normal;color:#FFE07A}
.lab.g{background:#5E8F22}.lab.r{background:#B3261E}.lab.p{background:#6E56CF}
.dot{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#FFE07A;border:3px solid #13294B;box-shadow:0 0 0 6px rgba(255,224,122,.35)}
/* 가상 맵 카드 */
.mapcard{position:absolute;left:28px;top:24px;width:430px;background:rgba(255,255,255,.96);border-radius:18px;padding:16px 20px 16px;box-shadow:0 16px 36px -14px rgba(0,0,0,.6);border-top:8px solid #2E86D6}
.mapcard .mt{font-size:14px;font-weight:800;color:#fff;background:#13294B;display:inline-block;padding:3px 10px;border-radius:99px;letter-spacing:.02em}
.mapcard .mn{font-size:36px;font-weight:900;color:#13294B;margin-top:8px;line-height:1.1}
.mapcard .ml{font-size:17px;font-weight:700;color:#2E86D6;margin-top:6px}
.mapcard .mi{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.mapcard .mi span{font-size:14px;font-weight:800;background:#FFF4CC;color:#7A5A00;border:2px solid #F5C542;border-radius:8px;padding:3px 8px}
.mapcard .mh{margin-top:10px;font-size:14px;font-weight:700;color:#B3261E}.mapcard .mh b{background:#B3261E;color:#fff;border-radius:6px;padding:1px 6px;margin-right:4px}
.src{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#5B6B82}
.big{position:absolute;font-weight:900;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.45);line-height:1}
"""

def A(sid, ref):
  m = META[sid]
  if ref.startswith('t'): t = m['tanks'][int(ref[1:])]; return t['x'], t['y']
  if ref.startswith('c'): c = m['crates'][int(ref[1:])]; return c['x'], c['y']
  if ref == 'col': return m['col']['x'], m['col']['y']
  if ref == 'met': return m['meteors'][0]['x'], 120
  raise ValueError(ref)

FOOT = '케이요새 · <i>실제 게임 화면</i> + 간판·말풍선 연출(상상도)'
def render(sid, n, title, sub, els, lines=(), chip=True, foot=None):
  parts, svg = [], []
  for el in els:
    k = el[0]
    if k == 'sign':
      _, x, y, w, t, s, cite, cls = el
      parts.append(f'<div class="sign {cls}" style="left:{x}px;top:{y}px;width:{w}px"><div class="t">{t}</div><div class="s">{s}</div>' + (f'<span class="cite">{e(cite)}</span>' if cite else '') + '</div>')
    elif k == 'neon':
      _, x, y, t, s, cls = el
      parts.append(f'<div class="neon {cls}" style="left:{x}px;top:{y}px"><div class="t">{t}</div>' + (f'<div class="s">{s}</div>' if s else '') + '</div>')
    elif k == 'aboard':
      _, x, y, w, t, items, cite = el
      parts.append(f'<div class="aboard" style="left:{x}px;top:{y}px;width:{w}px"><div class="t">{t}</div><ol>' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>' + (f'<span class="cite">{e(cite)}</span>' if cite else '') + '</div>')
    elif k == 'banner':
      _, x, y, t, s, cls = el
      parts.append(f'<div class="banner {cls}" style="left:{x}px;top:{y}px"><div class="t">{t}</div>' + (f'<div class="s">{s}</div>' if s else '') + '</div>')
    elif k == 'wanted':
      _, x, y, r, t, s, cite = el
      parts.append(f'<div class="wanted" style="left:{x}px;top:{y}px;--r:{r}deg"><div class="h">지명수배</div><div class="t">{t}</div><div class="s">{s}</div><span class="cite">{e(cite)}</span></div>')
    elif k == 'safety':
      _, x, y, w, t, items, cite = el
      parts.append(f'<div class="safety" style="left:{x}px;top:{y}px;width:{w}px"><div class="t"><i>!</i>{t}</div><ol>' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>' + (f'<span class="cite">{e(cite)}</span>' if cite else '') + '</div>')
    elif k == 'mapcard':
      _, tag, name, line, items, happen = el
      parts.append(f'<div class="mapcard"><div class="mt">{tag}</div><div class="mn">{name}</div><div class="ml">{line}</div><div class="mi">' + ''.join(f'<span>{i}</span>' for i in items) + '</div>' + (f'<div class="mh"><b>해프닝</b> {happen}</div>' if happen else '') + '</div>')
    elif k == 'html':
      parts.append(el[1])
    elif k == 'bub':  # 말풍선: 탱크 위에 꼬리가 오도록
      _, ref, text, dx, dy, cls = el
      ax, ay = A(sid, ref)
      parts.append(f'<div class="bub {cls}" style="left:{ax + dx}px;top:{ay + dy}px;--tx:{-dx - 14}px">{text}</div>')
    elif k == 'lab':  # 라벨 + 연결선
      _, ref, text, lx, ly, cls = el
      ax, ay = A(sid, ref) if isinstance(ref, str) else ref
      parts.append(f'<div class="lab {cls}" style="left:{lx}px;top:{ly}px">{text}</div><div class="dot" style="left:{ax}px;top:{ay}px"></div>')
      svg.append(f'<path d="M{lx + 20} {ly + 18} L{ax} {ay}" stroke="#13294B" stroke-width="3.5" fill="none"/><path d="M{lx + 20} {ly + 18} L{ax} {ay}" stroke="#FFE07A" stroke-width="1.6" fill="none" stroke-dasharray="6 5"/>')
  for (x1, y1, ref) in lines:
    ax, ay = A(sid, ref)
    svg.append(f'<path d="M{x1} {y1} L{ax} {ay}" stroke="#FFE07A" stroke-width="3" fill="none" stroke-dasharray="8 6"/>')
    parts.append(f'<div class="dot" style="left:{ax}px;top:{ay}px"></div>')
  doc = f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="bg" style="background-image:url('file://{RAW}{sid}.png')"></div><div class="vig"></div>
<svg class="lines" viewBox="0 0 1600 900">{''.join(svg)}</svg>{''.join(parts)}
{chip and f'<div class="chip"><div class="no">{n:02d}</div><div class="tx"><b>{title}</b><span>{sub}</span></div></div>' or ''}
<div class="foot">{foot or FOOT}</div></body></html>'''
  return doc

def run(scenes, out, prefix=''):
  with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page(viewport={'width': 1600, 'height': 900}, device_scale_factor=1.25)
    for i, sc in enumerate(scenes, 1):
      sid = sc['sid']; d = render(sid, sc.get('n', i), sc['title'], sc['sub'], sc['els'], sc.get('lines', ()), sc.get('chip', True), sc.get('foot'))
      fn = '/home/claude/concept/tmp.html'; open(fn, 'w').write(d)
      p.goto('file://' + fn); p.wait_for_timeout(250)
      name = out + '%s%02d_%s.png' % (prefix, sc.get('n', i), sc['title'].replace(' ', '_').replace('/', '·').replace('?', ''))
      p.screenshot(path=name); print('ok', name)
    b.close()
