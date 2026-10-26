#!/usr/bin/env python3
"""알파 마블 — src 조각을 이어 marble/index.html(GitHub Pages용 전체 문서)을 만든다.
순서: head.html(스타일·뼈대) → chars(캐릭터) → facts(KIRD 소식) → engine(규칙) → icons(상징 그림) → ui(화면) → avatar(캐릭터 그림)
밸런스 점검: node dev/plaza/marble/src/sim.js 1500 4"""
import pathlib, subprocess, tempfile
root = pathlib.Path(__file__).parent
src = root / 'src'
body = (src / 'head.html').read_text()
# 광장으로 돌아가는 링크(사이트에서만)
body = body.replace('<button class="btn ghost" id="bNew" type="button">새 게임</button>',
                    '<button class="btn ghost" id="bNew" type="button">새 게임</button>\n  <a class="btn ghost" href="../" style="text-decoration:none">케이요새 광장</a>', 1)
js = '\n'.join((src / f).read_text() for f in ['chars.js', 'facts.js', 'engine.js', 'icons.js', 'ui.js', 'avatar.js'])
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(js); tmp = f.name
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode: raise SystemExit('SYNTAX ERROR:\n' + r.stderr[:800])
cut = body.index('</style>') + len('</style>')
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="KIRD 알파 마블 — 세계 과학기술 도시 24곳에 연구 거점을 세우는 부루마불형 보드게임">\n'
        '<link rel="icon" href="../favicon.png?v=2">\n<meta name="theme-color" content="#0A1222">\n')
page = head + body[:cut] + '\n</head>\n<body>\n' + body[cut:] + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n'
out = root.parent.parent.parent / 'marble' / 'index.html'
out.write_text(page)
print('built', out, len(page), 'bytes')
