import glob,re
css=open('v1.css').read()
head=open('head.html').read().replace('/*__V1CSS__*/',css)
import sys
home=sys.argv[1] if len(sys.argv)>1 else ''
js=f"const HOME_LINK = {home!r};\n"+'\n'.join(open(f).read() for f in sorted(glob.glob('src/*.js')))
out=head+js+'\n</script>\n'
open(__import__('os').environ.get('OUT','index.html'),'w').write(out)
open(__import__('os').environ.get('TESTOUT','test.html'),'w').write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="../favicon.png">'+out.split('<canvas id="cv">')[0]+'</head><body><canvas id="cv">'+out.split('<canvas id="cv">',1)[1]+'</body></html>')
print(len(out))
