#!/usr/bin/env python3
"""Join src modules into one HTML file. dist/index.html = full document for GitHub Pages (/rope/)."""
import pathlib, subprocess, tempfile
root = pathlib.Path(__file__).parent
src = root / 'src'
ORDER = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'main.js']
js = '\n'.join(f'// ---- {f}\n' + (src / f).read_text() for f in ORDER)
demo_file = root / 'tests' / 'out' / 'solution.json'
demo = demo_file.read_text() if demo_file.exists() else 'null'
js = js.replace('/*__DEMO__*/null', demo)
out = (src / 'template.html').read_text().replace('/*__JS__*/', js)
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="닌자 로프로 섬과 천장을 타고 달리는 로프 연습장 · 손맛 조절 · 기록 유령">\n'
        '<meta property="og:type" content="website">\n<meta property="og:title" content="로프 연습장">\n'
        '<meta property="og:description" content="그 시절 로프전 손맛, 브라우저에서 바로. 설치 없이 기록 도전.">\n'
        '<meta property="og:url" content="https://kird-cyber.github.io/kirdwork/rope/">\n'
        '<link rel="icon" href="favicon.png">\n<meta name="theme-color" content="#0E1220">\n')
style_end = out.index('</style>') + len('</style>')
page = head + out[:style_end] + '\n</head>\n<body>\n' + out[style_end:] + '\n</body>\n</html>\n'
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'index.html').write_text(page)
script = out[out.index('<script>') + 8: out.rindex('</script>')]
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(script); tmp = f.name
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode: raise SystemExit('SYNTAX ERROR in built script:\n' + r.stderr[:800])
print('built', len(page), 'bytes')
