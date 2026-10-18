#!/usr/bin/env python3
"""Join src modules into one HTML file. dist/index.html = full document for GitHub Pages (/marine/)."""
import json, pathlib, re, subprocess, tempfile
root = pathlib.Path(__file__).parent
src = root / 'src'
ORDER = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js', 'audio.js', 'subs.js', 'render.js', 'bot.js', 'mqtt.js', 'net.js', 'online.js', 'main.js']
js = '\n'.join(f'// ---- {f}\n' + (src / f).read_text() for f in ORDER)
cfg = (src / 'config.js').read_text()
gn = re.search(r"GAME_NAME\s*=\s*\{\s*full:\s*'([^']*)',\s*a:\s*'([^']*)',\s*b:\s*'([^']*)'", cfg)
full, ga, gb = gn.groups()
tpl = (src / 'template.html').read_text()
out = tpl.replace('/*__JS__*/', js).replace('const SPR = __SPRITES__;', '').replace('__GAME__', full).replace('__GA__', ga).replace('__GB__', gb)
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f'<meta name="description" content="곡선을 그려 쏘는 턴제 잠수함 어뢰 대전 · 최대 4 대 4">\n'
        f'<meta property="og:type" content="website">\n<meta property="og:title" content="{full}">\n'
        '<meta property="og:description" content="곡선을 그려 바위 뒤의 적을 노리는 잠수함 대전. 설치·가입 없이 링크 하나로.">\n'
        '<meta property="og:url" content="https://kird-cyber.github.io/kirdwork/marine/">\n'
        '<meta property="og:image" content="https://kird-cyber.github.io/kirdwork/marine/og.png">\n'
        '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        '<link rel="icon" href="favicon.png">\n<link rel="apple-touch-icon" href="favicon.png">\n<meta name="theme-color" content="#06223A">\n')
style_end = out.index('</style>') + len('</style>')
page = head + out[:style_end] + '\n</head>\n<body>\n' + out[style_end:] + '\n</body>\n</html>\n'
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'index.html').write_text(page)
script = out[out.index('<script>') + 8: out.rindex('</script>')]
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(script); tmp = f.name
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode: raise SystemExit('SYNTAX ERROR in built script:\n' + r.stderr[:800])
left = [k for k in ('__GAME__', '__GA__', '__GB__', '__SPRITES__', '__JS__') if k in page]
if left: raise SystemExit('unfilled placeholders: ' + ', '.join(left))
print('built', len(page), 'bytes')
