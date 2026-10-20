#!/usr/bin/env python3
"""Join src modules into one publishable HTML file.
dist/pogyeokjeon.html  body-only page (the artifact host adds the document skeleton)
dist/index.html        full document for GitHub Pages"""
import json, pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
ORDER = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js', 'audio.js', 'shells.js', 'thememaps.js', 'render.js', 'bot.js', 'solo.js', 'mqtt.js', 'net.js', 'online.js', 'tips.js', 'main.js', 'soloui.js']
js = '\n'.join(f'// ---- {f}\n' + (src / f).read_text() for f in ORDER)
tpl = (src / 'template.html').read_text()
sprites = (root / 'assets' / 'sprites.json').read_text()
out = tpl.replace('/*__JS__*/', js).replace('__SPRITES__', sprites)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'pogyeokjeon.html').write_text(out)
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="과학기술인의 요새를 지켜라 — R&amp;D 턴제 포격전 · 링크 하나로 최대 4 대 4">\n'
        '<meta property="og:type" content="website">\n<meta property="og:title" content="케이요새">\n'
        '<meta property="og:description" content="과학기술인의 요새를 지켜라 — R&amp;D 턴제 포격전. 설치·가입 없이 링크 하나로 최대 4 대 4.">\n'
        '<meta property="og:image" content="https://kird-cyber.github.io/kirdwork/og.png?v=3">\n'
        '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        '<link rel="icon" href="favicon.png?v=2">\n<link rel="apple-touch-icon" href="favicon.png?v=2">\n'
        '<meta name="theme-color" content="#0E1220">\n')
title_end = out.index('</title>') + len('</title>')
style_end = out.index('</style>') + len('</style>')
page = head + out[:style_end] + '\n</head>\n<body>\n' + out[style_end:] + '\n</body>\n</html>\n'
(root / 'dist' / 'index.html').write_text(page)
# refuse to ship a page whose script does not parse
import subprocess, tempfile
script = out[out.index('<script>') + 8: out.rindex('</script>')]
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(script); tmp = f.name
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode: raise SystemExit('SYNTAX ERROR in built script:\n' + r.stderr[:800])
print('built', len(out), 'bytes')
