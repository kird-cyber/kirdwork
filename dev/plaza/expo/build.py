import json,sys
items=json.load(open('items.json'))
home=sys.argv[1] if len(sys.argv)>1 else '../'
SEC=[('map','확장 맵','과정·사업마다 새 맵 하나 — 맵·탱크만 더하면 새 교육 과정이 된다',23),('scene','활용 시나리오','연구윤리·안전·성과를 포격전 한 장면으로',20),('tank','과정 전용 탱크','과정 이름을 단 탱크와 무기 — 탱크 한 대가 교재 한 장',7),('escape','확장 게임 · 방탈출','캠퍼스 지도와 실내를 오가는 방탈출 구상',20),('hide','확장 게임 · 숨바꼭질','변신·위장으로 숨고 찾는 숨바꼭질 구상',20),('chase','확장 게임 · 탈출전','4 대 1 비대칭 탈출전 구상',20)]
html=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>케이요새 확장 전시관</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@500;700;800;900&display=swap">
<style>
:root{{--ink:#0E2238;--bg:#0B1020;--card:#141B33;--line:rgba(255,255,255,.12);--gold:#FFD24A;--mute:#9FB3CC;--disp:"Black Han Sans","Noto Sans KR",system-ui,sans-serif;--body:"Noto Sans KR",system-ui,sans-serif;color-scheme:dark}}
*{{box-sizing:border-box}}html,body{{margin:0;background:var(--bg);color:#fff;font-family:var(--body)}}
[hidden]{{display:none!important}}
header{{padding:max(18px,env(safe-area-inset-top)) 16px 8px;max-width:1240px;margin:0 auto}}
.top{{display:flex;align-items:center;gap:12px;flex-wrap:wrap}}.back{{color:var(--gold);font-weight:800;text-decoration:none;border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:14px}}
h1{{font-family:var(--disp);font-weight:400;font-size:clamp(32px,6vw,58px);margin:18px 0 4px;line-height:1.05}}h1 em{{font-style:normal;color:var(--gold)}}
.lead{{color:#C9D6E8;font-weight:700;line-height:1.6;max-width:62ch;margin:6px 0 0}}
nav{{position:sticky;top:0;z-index:5;background:rgba(11,16,32,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}}
.tabs{{max-width:1240px;margin:0 auto;display:flex;gap:6px;overflow-x:auto;padding:10px 16px;scrollbar-width:none}}
.tabs button{{flex:none;background:var(--card);color:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 14px;font:800 14px var(--body);cursor:pointer;white-space:nowrap}}.tabs button.on{{background:var(--gold);color:var(--ink);border-color:var(--gold)}}.tabs b{{font-weight:900;opacity:.6;margin-left:4px}}
main{{max-width:1240px;margin:0 auto;padding:12px 16px 60px}}
section h2{{font-family:var(--disp);font-weight:400;font-size:26px;margin:26px 0 2px}}section>p{{color:var(--mute);font-weight:700;margin:0 0 12px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}}
figure{{margin:0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;cursor:zoom-in;transition:transform .15s,border-color .15s}}figure:hover,figure:focus-visible{{transform:translateY(-3px);border-color:var(--gold);outline:none}}
figure img{{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#0E1428}}
figcaption{{padding:10px 12px 12px;font-weight:800;font-size:14.5px;line-height:1.4}}figcaption small{{display:block;color:var(--mute);font-weight:700;font-size:12px;margin-top:3px}}
.lb{{position:fixed;inset:0;background:rgba(4,6,14,.94);z-index:20;display:grid;grid-template-rows:1fr auto;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))}}
.lb img{{max-width:100%;max-height:100%;margin:auto;display:block;border-radius:10px;align-self:center;justify-self:center;min-height:0}}
.lbbar{{display:flex;align-items:center;gap:10px;max-width:1240px;width:100%;margin:10px auto 0}}.lbbar .t{{flex:1;font-weight:800;line-height:1.4}}.lbbar .t small{{display:block;color:var(--mute);font-weight:700}}
.lbbar button{{background:var(--card);color:#fff;border:1px solid var(--line);border-radius:10px;font:900 18px var(--body);width:46px;height:46px;cursor:pointer}}
footer{{text-align:center;color:var(--mute);font-size:13px;font-weight:700;padding:20px}}
</style></head><body>
<header><div class="top"><a class="back" href="{home}">← 케이요새 광장</a></div>
<h1>케이요새 <em>확장 전시관</em></h1><p class="lead">지금은 없지만 이렇게 넓어질 수 있다 — 과정·사업별 확장 맵, 활용 시나리오, 전용 탱크, 그리고 방탈출·숨바꼭질·탈출전 확장 게임 구상까지 {len(items)}점을 걸었습니다. 그림을 누르면 크게 볼 수 있어요.</p></header>
<nav><div class="tabs" role="tablist"><button class="on" data-f="all">전체<b>{len(items)}</b></button>'''
for k,n,_,c in SEC: html+=f'<button data-f="{k}">{n}<b>{c}</b></button>'
html+='</div></nav><main>'
for k,n,d,c in SEC:
    html+=f'<section data-s="{k}"><h2>{n}</h2><p>{d}</p><div class="grid">'
    for it in [i for i in items if i['sec']==k]:
        cap=it['c'].replace('"','&quot;')
        html+=f'<figure tabindex="0" data-id="{it["id"]}"><img loading="lazy" src="img/{it["id"]}.webp" alt="{it["t"]}"><figcaption>{it["t"]}{f"<small>{cap}</small>" if cap else ""}</figcaption></figure>'
    html+='</div></section>'
html+='''</main><footer>© 2026 KIRD · 케이요새 확장 구상 이미지 (실제 서비스 화면이 아닌 구상안입니다)</footer>
<div class="lb" id="lb" hidden><img id="lbi" alt=""><div class="lbbar"><button id="lp" aria-label="이전">‹</button><div class="t" id="lbt"></div><button id="ln" aria-label="다음">›</button><button id="lx" aria-label="닫기">✕</button></div></div>
<script>
const figs=[...document.querySelectorAll('figure')];let cur=-1;const lb=document.getElementById('lb');
function vis(){return figs.filter(f=>f.closest('section').style.display!=='none')}
function show(f){const v=vis();cur=v.indexOf(f);const im=f.querySelector('img');document.getElementById('lbi').src=im.src;document.getElementById('lbi').alt=im.alt;document.getElementById('lbt').innerHTML=f.querySelector('figcaption').innerHTML;lb.hidden=false}
figs.forEach(f=>{f.onclick=()=>show(f);f.onkeydown=e=>{if(e.key==='Enter')show(f)}});
const step=d=>{const v=vis();show(v[(cur+d+v.length)%v.length])};
document.getElementById('lp').onclick=()=>step(-1);document.getElementById('ln').onclick=()=>step(1);document.getElementById('lx').onclick=()=>lb.hidden=true;
lb.onclick=e=>{if(e.target===lb)lb.hidden=true};
addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)});
let sx=null;lb.addEventListener('touchstart',e=>sx=e.touches[0].clientX);lb.addEventListener('touchend',e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)step(dx<0?1:-1);sx=null});
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));const f=b.dataset.f;document.querySelectorAll('section').forEach(s=>s.style.display=(f==='all'||s.dataset.s===f)?'':'none');scrollTo({top:document.querySelector('nav').offsetTop,behavior:'smooth'})});
</script></body></html>'''
open('index.html','w').write(html); print(len(html))
