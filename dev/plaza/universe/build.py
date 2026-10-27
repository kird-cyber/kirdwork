#!/usr/bin/env python3
"""알파 유니버스 — src 조각을 이어 universe/index.html(GitHub Pages용 전체 문서)을 만든다.
src/game.html(화면·규칙) + src/tips.js(그릇 테마별 소식) + src/img/*.webp(천체 그림, 데이터 URI) + 알파 마블의 avatar.js(캐릭터 그림)
천체 그림 다시 만들기: src/render.py (원본 텍스처는 저장소에 없음)"""
import base64, json, pathlib, subprocess, tempfile
root = pathlib.Path(__file__).parent
src = root / 'src'
names = ['01-pluto','02-moon','03-mercury','04-mars','05-venus','06-earth','07-neptune','08-uranus','09-saturn','10-jupiter','11-sun']
uris = ['data:image/webp;base64,' + base64.b64encode((src/'img'/f'{n}.webp').read_bytes()).decode() for n in names]
body = (src/'game.html').read_text().replace('__IMAGES__', json.dumps(uris))
# 광장으로 돌아가는 링크(사이트에서만)
body = body.replace('<button class="btn ghost full" id="bHow" type="button">하는 법</button>',
                    '<button class="btn ghost full" id="bHow" type="button">하는 법</button><a class="btn ghost full" href="../" style="text-decoration:none;text-align:center">케이요새 광장</a>', 1)
body = body.replace('<script>', '<script>\n' + (src/'tips.js').read_text(), 1)
avatar = (root.parent/'marble'/'src'/'avatar.js').read_text()
i = body.rindex('</script>'); body = body[:i] + '\n' + avatar + '\n' + body[i:]
js = body[body.index('<script>')+8:body.rindex('</script>')]
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(js); tmp = f.name
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode: raise SystemExit('SYNTAX ERROR:\n' + r.stderr[:800])
cut = body.index('</style>') + len('</style>')
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="KIRD 알파 유니버스 — 명왕성부터 태양까지, 같은 천체를 합쳐 키우는 태양계 합치기 게임">\n'
        '<link rel="icon" href="../favicon.png?v=2">\n<meta name="theme-color" content="#060B18">\n')
page = head + body[:cut] + '\n</head>\n<body>\n' + body[cut:] + '\n</body>\n</html>\n'
out = root.parent.parent.parent / 'universe' / 'index.html'
out.parent.mkdir(exist_ok=True); out.write_text(page)
print('built', out, len(page), 'bytes')
