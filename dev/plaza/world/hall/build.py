import os,sys
root='/home/claude/world'
css=open(root+'/v1.css').read()
head=open(root+'/head.html').read().replace('/*__V1CSS__*/',css)
head=head.replace('<title>케이요새 월드</title>','<title>KIRD 홍보관</title>')
head=head.replace('<div class="hb brand">케이요새 <em>월드</em></div>','<div class="hb brand">KIRD <em>홍보관</em></div>')
extra='''
.vcap{position:absolute;left:10px;right:10px;bottom:10px;background:rgba(14,20,38,.82);color:#fff;font-weight:800;font-size:15px;border-radius:10px;padding:8px 12px;text-align:center;pointer-events:none}
.vbar{height:6px;background:#DCE3EC;border-radius:6px;margin-top:8px;overflow:hidden}.vbar i{display:block;height:100%;background:#2E86D6;width:0}
.gb{border-bottom:1px solid #DCE3EC;padding:6px 0;display:flex;gap:8px;align-items:baseline;font-size:14px}.gb b{color:#1F6FB2;white-space:nowrap}.gb span{flex:1}.gb small{color:#7A889C}
.chg{height:14px;border-radius:8px;background:#E6ECF4;border:2px solid var(--ink);overflow:hidden;margin:4px 0 8px}.chg i{display:block;height:100%;background:linear-gradient(90deg,#8CC63F,#FFD24A);transition:width 1.2s ease}
.flash{position:absolute;inset:0;background:#fff;border-radius:12px;animation:fl .5s ease forwards;pointer-events:none}@keyframes fl{to{opacity:0}}
.homelink{display:block;margin-top:12px;text-align:center;font-weight:800;color:#1F6FB2}
'''
head=head.replace('</style>',extra+'</style>')
home=sys.argv[1] if len(sys.argv)>1 else ''
files=['hall/00h_img.js','hall/01h_map.js','src/02_art.js','hall/03h_decor.js','src/04_draw.js','src/05_core.js','src/08_bots.js','hall/11_art.js','hall/12_content.js','hall/13_hall.js']
js=f"const HOME_LINK = {repr(home)};\n"+'\n'.join(open(root+'/'+f).read() for f in files)
js=js.replace('const MODES = {};\n','',1) if js.count('const MODES = {};')>1 else js
out=head+js+'\n</script>\n'
open(root+'/hall/index.html','w').write(out)
open(root+'/hall/test.html','w').write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="../favicon.png">'+out.split('<canvas id="cv">')[0]+'</head><body><canvas id="cv">'+out.split('<canvas id="cv">',1)[1]+'</body></html>')
print(len(out))
