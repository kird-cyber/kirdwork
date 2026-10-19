#!/usr/bin/env python3
"""Join src modules into one publishable HTML file.
dist/pogyeokjeon.html  body-only page (the artifact host adds the document skeleton)
dist/index.html        full document for GitHub Pages"""
import json, pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
ORDER = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js', 'audio.js', 'shells.js', 'thememaps.js', 'render.js', 'bot.js', 'mqtt.js', 'net.js', 'online.js', 'main.js']
js = '\n'.join(f'// ---- {f}\n' + (src / f).read_text() for f in ORDER)
tpl = (src / 'template.html').read_text()
sprites = (root / 'assets' / 'sprites.json').read_text()
out = tpl.replace('/*__JS__*/', js).replace('__SPRITES__', sprites)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'pogyeokjeon.html').write_text(out)
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="친구와 링크 하나로 붙는 턴제 포격 대전 · 최대 4 대 4">\n'
        '<meta property="og:type" content="website">\n<meta property="og:title" content="포격리스">\n'
        '<meta property="og:description" content="그 시절 그 포격전, 링크 하나로 친구들과 다시. 설치·가입 없이 최대 4 대 4.">\n'
        '<meta property="og:image" content="https://kird-cyber.github.io/kirdwork/og.png">\n'
        '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        '<link rel="icon" href="favicon.png">\n'
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
