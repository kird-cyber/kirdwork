/* ---------- 화면 ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SEAT_COL=['#FFD24A','#4FA3EA','#E0533F','#8CC63F'];
const CH=Object.fromEntries(CHARS.map(c=>[c.id,c]));
const KIND={ox:['연구윤리 OX','#7E57C2'],safe:['연구실 안전','#F08A24'],news:['KIRD 소식','#2E86D6'],career:['커리어 이벤트','#2FA84F']};
const MCOL={toll:'#E0533F',bad:'#F08A24',good:'#2FA84F',key:'#2E86D6',free:'#5B6B88',own:'#5B6B88',mine:'#C99A00'};
const SPEED={slow:{step:560,dice:[14,75],look:1500,ban:1500},normal:{step:360,dice:[10,65],look:1050,ban:1100},fast:{step:110,dice:[4,45],look:250,ban:450}};
const SAVE='kird-alpha-marble-v2';
let REC={games:0,wins:0,avatar:'alpha',opp:3,speed:'normal'};
try{const r=localStorage.getItem(SAVE);if(r)REC=Object.assign(REC,JSON.parse(r))}catch(e){}
function saveRec(){try{localStorage.setItem(SAVE,JSON.stringify(REC))}catch(e){}}
const SP=()=>SPEED[REC.speed]||SPEED.normal;
const mq=window.matchMedia('(max-width: 760px)');
let factI=Math.random()*FACTS.length|0;
let choosing=null,marks=new Map(),trail=new Set(),notice=null,hitSum=0,activeTok=-1;
let ctrl={dice:[1,1],spin:false,tot:'',msg:'',prompt:'',bind:null};
let toastT;function toast(m,ms=2600){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,ms)}
document.querySelectorAll('[data-sp]').forEach(b=>{b.classList.toggle('on',b.dataset.sp===REC.speed);b.onclick=()=>{REC.speed=b.dataset.sp;saveRec();document.querySelectorAll('[data-sp]').forEach(x=>x.classList.toggle('on',x===b))}});

function gridPos(i){if(i===0)return[9,15];if(i<14)return[9,15-i];if(i===14)return[9,1];if(i<22)return[9-(i-14),1];if(i===22)return[1,1];if(i<36)return[1,i-21];if(i===36)return[1,15];return[i-35,15]}
function sideOf(i){if(i===0||i===14||i===22||i===36)return'corner';if(i<14)return'bottom';if(i<22)return'left';if(i<36)return'top';return'right'}
function dieSVG(n,spin){const P={1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,26],[72,26],[28,50],[72,50],[28,74],[72,74]]}[n];
  return`<svg class="die${spin?' spin':''}" viewBox="0 0 100 100" role="img" aria-label="주사위 ${n}"><rect x="4" y="4" width="92" height="92" rx="18" fill="#fff" stroke="#0E2238" stroke-width="4"/>${P.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="${n===1?'#E0533F':'#0E2238'}"/>`).join('')}</svg>`}
const human=()=>G&&G.players.find(p=>p.human);

/* ---------- 보드 ---------- */
function cellSub(c,i){
  if(c.t==='city')return c.owner>=0?`${LV_SHORT[c.level]} ${fmtA(tollOf(c))}`:fmtA(c.p);
  if(c.t==='fac')return c.owner>=0?`통행 ${fmtA(tollOf(c))}`:'연구시설';
  return {start:`+${fmtA(SALARY)}`,fund:fmtA(G.fund),safety:'2턴 휴식',nuri:'원하는 칸',key:'카드',boost:`+${BOOST}칸`,back:`-${BACK}칸`,reward:`+${fmtA(REWARD)}`,donate:`-${fmtA(DONATE)}`,festa:'통행료 2배',kird:'무료 건설'}[c.t]||'';
}
function renderBoard(){
  if(!G)return;
  let h='';
  G.cells.forEach((c,i)=>{
    const [r,col]=gridPos(i);const side=sideOf(i);
    const sp=['boost','back','reward','donate','festa'].includes(c.t);
    const mk=marks.get(i);
    const cls=['cell',side,c.t==='city'?'city':'',c.t==='key'?'key':'',c.t==='fac'?'fac':'',sp?'sp':'',c.t==='kird'?'kird':'',side==='corner'?'corner':'',c.owner>=0?'own':'',trail.has(i)?'trail':'',mk?'marked':'',choosing?(choosing.ok(i)?'choose':'nochoose'):''].join(' ');
    const lc=c.t==='city'?`var(--l${c.line})`:c.t==='fac'?'var(--fac)':'transparent';
    const oc=c.owner>=0?SEAT_COL[c.owner]:'transparent';
    const lv=c.owner>=0&&c.t==='city'?`<span class="lv">${c.level===4?'<i class="lm"></i>':''}${'<i></i>'.repeat(Math.min(c.level,3))}</span>`:'';
    const tag=G.festa===i?'<span class="tag">2×</span>':(c.t==='city'&&c.owner>=0&&lineDone(c.line,c.owner)?'<span class="tag">독점</span>':'');
    const m=mk?`<span class="mk" style="--mc:${mk.col}">${mk.s}</span>`:'';
    h+=`<button type="button" class="${cls}" data-i="${i}" style="grid-row:${r};grid-column:${col};--lc:${lc};--oc:${oc};${mk?`--mc:${mk.col}`:''}" aria-label="${esc(c.full||c.n)}${c.owner>=0?`, ${esc(G.players[c.owner].ch.name)} 소유`:''}"><span class="band"></span>${iconSVG(c)}<span class="nm">${esc(c.n)}</span><span class="sub num">${cellSub(c,i)}</span>${lv}${tag}${m}</button>`;
  });
  const pct=Math.min(100,G.visionTotal/VISION_GOAL*100);const f=FACTS[factI];
  h+=`<div class="center"><div class="cl"><div class="ctitle">알파 <em>마블</em></div>
   <div class="gauge"><div class="lab"><span>미래비전 게이지${G.visionDone?' · 달성!':''}</span><span class="num">${fmtA(G.visionTotal)} / ${fmtA(VISION_GOAL)}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
   <div class="score" id="score"></div>
   <div class="fact"><b>KIRD 한 장 · ${esc(f[0])}</b> ${esc(f[1])}${G.festa>=0?`<br><b>사이언스 페스타</b> ${esc(G.cells[G.festa].n)} 통행료 2배`:''}</div></div>
   <div class="cr" id="crHost"></div></div>`;
  $('board').innerHTML=h;
  renderScore();renderCtrl();
  $('roundPill').innerHTML=`라운드 <b>${Math.min(G.round,MAX_ROUND)}</b>/${MAX_ROUND}`;
  $('fundPill').innerHTML=`인재기금 <b>${fmtA(G.fund)}</b>`;
}
function renderScore(){
  const el=$('score');if(!el||!G)return;
  el.innerHTML=G.players.map(p=>`<div class="sc ${G.players[G.turn]===p&&!G.over?'turn':''} ${p.out?'out':''}" style="--pc:${SEAT_COL[p.id]}"><span class="av">${avatar(p.ch)}</span><b>${esc(p.ch.name)}${p.human?' (나)':''}</b>${p.jail?`<span class="st">점검 ${p.jail}</span>`:''}<span class="m num">${p.out?'파산':fmtA(p.cash)}</span></div>`).join('');
}
function renderPlayers(){
  if(!G)return;
  $('players').innerHTML=G.players.map(p=>{
    const groups=Object.keys(LINES).filter(L=>lineDone(+L,p.id)).length;
    const bd=[p.jail>0?`<span class="bd w">안전점검 ${p.jail}턴</span>`:'',p.shield?`<span class="bd g">방패 ${p.shield}</span>`:'',p.exempt?`<span class="bd g">안전 면제권 ${p.exempt}</span>`:'',groups?`<span class="bd g">색 독점 ${groups}</span>`:'',p.out?'<span class="bd w">파산</span>':''].join('');
    return`<div class="pcard ${G.players[G.turn]===p&&!G.over?'turn':''} ${p.out?'out':''}" style="--pc:${SEAT_COL[p.id]}"><div class="av">${avatar(p.ch)}</div><div style="min-width:0"><b>${esc(p.ch.name)}${p.human?' (나)':''}</b><div class="meta">${esc(ABIL[p.ch.id])}</div><div class="meta">땅 ${owned(p).length}곳 · 기금 기여 ${fmtA(p.contrib)}</div><div class="badges">${bd}</div></div><div class="cash num">${fmtA(p.cash)}<small>총자산 ${fmtA(assets(p))}</small></div></div>`}).join('');
}
function render(){renderBoard();renderPlayers();placeTokens(false)}

/* ---------- 말 ---------- */
function buildTokens(){
  $('tokens').innerHTML=G.players.map(p=>`<div class="tk" id="tk${p.id}" style="--pc:${SEAT_COL[p.id]}"><div class="body">${avatar(p.ch)}</div><span class="left num"></span></div>`).join('');
}
function cellCenter(i){const el=$('board').querySelector(`[data-i="${i}"]`);if(!el)return[0,0,40];return[el.offsetLeft+el.offsetWidth/2,el.offsetTop+el.offsetHeight/2,Math.min(el.offsetWidth,el.offsetHeight)]}
function placeTokens(anim,hopId){
  if(!G)return;
  const tl=$('tokens');const [, ,cw]=cellCenter(1);const ts=Math.max(16,Math.min(32,cw*.4));
  tl.style.setProperty('--ts',ts+'px');tl.style.setProperty('--tt',anim?Math.min(.32,SP().step/1000*.85)+'s':'0s');
  G.players.forEach(p=>{
    const t=$('tk'+p.id);if(!t)return;t.hidden=p.out;if(p.out)return;
    const same=G.players.filter(q=>!q.out&&q.pos===p.pos);const k=same.indexOf(p);
    const [x,y]=cellCenter(p.pos);const dx=(k-(same.length-1)/2)*ts*.55,dy=(k-(same.length-1)/2)*ts*.18;
    t.style.transform=`translate(${x+dx}px,${y+dy+cw*.2}px)`;
    t.classList.toggle('active',p.id===activeTok);
    if(hopId===p.id){t.classList.remove('hop');void t.offsetWidth;t.classList.add('hop')}
  });
}
window.addEventListener('resize',()=>placeTokens(false));
function follow(i){
  if(!mq.matches)return;const sc=$('scroller');const [x]=cellCenter(i);const beh=REC.speed==='fast'?'auto':'smooth';
  sc.scrollTo({left:Math.max(0,x-sc.clientWidth/2+16),behavior:beh});
  const el=$('board').querySelector(`[data-i="${i}"]`);if(!el)return;const r=el.getBoundingClientRect();const lim=innerHeight-$('dock').offsetHeight-8;
  if(r.bottom>lim)window.scrollBy({top:r.bottom-lim,behavior:beh});else if(r.top<8)window.scrollBy({top:r.top-8,behavior:beh});
}
function setLeft(p,n){const t=$('tk'+p.id);if(t)t.querySelector('.left').textContent=n>0?n:''}
async function banner(big,small,col){
  const host=$('bannerHost');host.innerHTML=`<div class="banner" style="--bc:${col}"><b>${esc(big)}</b>${small?`<small>${esc(small)}</small>`:''}</div>`;
  await sleep(SP().ban);if(host)host.innerHTML='';
}

/* ---------- 조작판(주사위·예보·선택) ---------- */
function noticeHTML(){
  if(!notice)return'';const {p,fc}=notice;const me=human();
  const rows=fc.top.map(o=>{
    const mine=me&&o.cell.owner===me.id&&!p.human&&o.kind==='toll';
    const col=mine?MCOL.mine:(MCOL[o.kind]||MCOL.key);
    const lab=mine?`내 땅! 통행료 수입 ${fmtA(-o.amt)}`:o.label;
    return`<div class="nr ${hitSum===o.s?'hit':''}"><span class="s" style="--mc:${col}">${o.s}</span><span class="w">${esc(o.cell.n)}<small>${esc(lab)}</small></span><span class="p num">${Math.round(o.prob*100)}%</span></div>`}).join('');
  const r=Math.round(fc.risk*100);
  return`<h5>${p.human?'주사위 예보':`${esc(p.ch.name)}의 예보`} · 12칸 안 주요 지점</h5>${rows}<div class="risk ${r?'':'ok'}">${p.human?'남의 땅에 걸릴 확률':'통행료 낼 확률'} ${r}%${r?'':' · 안전 구간'}</div>`;
}
function renderCtrl(){
  const host=mq.matches?$('dock'):$('crHost');if(!host)return;
  if(mq.matches&&$('crHost'))$('crHost').innerHTML='';else $('dock').innerHTML='';
  host.innerHTML=`<div class="ctrl"><div class="dicerow">${dieSVG(ctrl.dice[0],ctrl.spin)}${dieSVG(ctrl.dice[1],ctrl.spin)}<div class="tot num">${ctrl.tot}</div></div><div class="cmsg">${esc(ctrl.msg||G.msg||'')}</div><div class="crow"><div class="notice">${noticeHTML()}</div><div class="prompt" id="prompt">${ctrl.prompt}</div></div></div>`;
  if(ctrl.bind)ctrl.bind(host.querySelector('#prompt'));
}
mq.addEventListener('change',()=>{if(G)render()});
function setPrompt(html,bind){ctrl.prompt=html;ctrl.bind=bind;renderCtrl()}
function clearPrompt(){ctrl.prompt='';ctrl.bind=null}
function askButtons(title,text,buttons){
  return new Promise(res=>{
    setPrompt(`<h4>${title}</h4>${text?`<p>${text}</p>`:''}<div class="row">${buttons.map((b,i)=>`<button type="button" class="btn ${b.cls||''}" data-i="${i}">${b.label}</button>`).join('')}</div>`,
      el=>{el.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{clearPrompt();renderCtrl();res(buttons[+btn.dataset.i].v)})});
  });
}
function chooseCell(title,text,ok){
  return new Promise(res=>{choosing={ok,res};setPrompt(`<h4>${title}</h4><p>${text}</p>`,null);renderBoard();if(mq.matches)toast('보드를 좌우로 밀어 칸을 고르세요')});
}
const HUMAN_ASK=async(p,kind,ctx)=>{
  if(kind==='roll')return askButtons('내 차례','예보를 확인하고 굴리세요.',[{label:'주사위 굴리기',v:true,cls:'lime big'}]);
  if(kind==='buy'){const c=ctx.cell;return askButtons(`${esc(c.full||c.n)} 구입?`,`가격 ${fmtA(ctx.cost)} · 보유 ${fmtA(p.cash)}${c.biz?`<br>${esc(c.biz)}`:''}`,[{label:'구입',v:true},{label:'패스',v:false,cls:'dark'}])}
  if(kind==='build'){const c=ctx.cell;return askButtons(`${esc(c.n)}에 건설`,`지금 통행료 ${fmtA(tollOf(c))}. 여러 단계를 한 번에 지을 수 있어요.`,[...ctx.opts.map(o=>({label:`${LV[o.lv]}까지<small>${fmtA(o.cost)} · 통행 ${fmtA(o.toll)}</small>`,v:o.lv})),{label:'안 짓기',v:0,cls:'dark'}])}
  if(kind==='takeover'){const c=ctx.cell;return askButtons(`${esc(c.n)} 기술이전(인수)?`,`${esc(ctx.owner.ch.name)}에게 ${fmtA(ctx.cost)}를 주고 땅과 건물을 가져옵니다. 보유 ${fmtA(p.cash)}`,[{label:'기술이전',v:true,cls:'blue'},{label:'패스',v:false,cls:'dark'}])}
  if(kind==='jail')return askButtons('연구실 안전점검 중',`남은 ${p.jail}턴. 안전 퀴즈를 맞히면 바로 출발합니다.`,[{label:'안전 퀴즈 도전',v:'quiz',cls:'lime'},{label:'쉬기',v:'wait',cls:'dark'}]);
  if(kind==='choose')return chooseCell('이동할 칸을 누르세요','누리호 발사장을 뺀 아무 칸이나 고를 수 있어요.',i=>i!==NURI);
  if(kind==='pickOwn'){const s=new Set(ctx.cells);return chooseCell(ctx.title,'반짝이는 내 도시 중 하나를 누르세요.',i=>s.has(i))}
  if(kind==='quiz')return quizModal(p,ctx);
  if(kind==='card2')return card2Modal(ctx);
};
$('board').addEventListener('click',e=>{
  const b=e.target.closest('.cell');if(!b)return;const i=+b.dataset.i;
  if(choosing){if(!choosing.ok(i)){toast('그 칸은 고를 수 없어요.');return}const r=choosing.res;choosing=null;clearPrompt();renderBoard();r(i);return}
  deedModal(i);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').hidden&&!$('modal').dataset.lock)closeModal()});

/* ---------- 모달 ---------- */
function openModal(html,{wide,lock}={}){$('mbox').className='box'+(wide?' wide':'');$('mbox').innerHTML=html;$('modal').hidden=false;$('modal').dataset.lock=lock?'1':'';const x=$('mbox').querySelector('.x');if(x)x.onclick=closeModal}
function closeModal(){$('modal').hidden=true;$('mbox').innerHTML='';$('modal').dataset.lock=''}
$('modal').addEventListener('click',e=>{if(e.target.id==='modal'&&!$('modal').dataset.lock)closeModal()});
function cardHead(card){const [kn,kc]=KIND[card.k];return`<span class="kind" style="--kc:${kc}">${kn}</span><h4>${esc(card.t)}</h4>`}
function quizModal(p,card){
  return new Promise(res=>{
    const body=card.k==='ox'?`<div class="ox"><button type="button" class="opt" data-v="1">O</button><button type="button" class="opt" data-v="0">X</button></div>`:`<div class="opts">${card.o.map((o,i)=>`<button type="button" class="opt" data-v="${i}">${esc(o)}</button>`).join('')}</div>`;
    openModal(`<div class="card">${cardHead(card)}<div class="q">${esc(card.q)}</div>${body}<div class="res" id="qres"></div><div style="margin-top:12px" id="qnext"></div></div>`,{lock:true});
    $('mbox').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
      const v=card.k==='ox'?b.dataset.v==='1':+b.dataset.v;const right=v===card.a;
      $('mbox').querySelectorAll('.opt').forEach(x=>{x.disabled=true;const xv=card.k==='ox'?x.dataset.v==='1':+x.dataset.v;if(xv===card.a)x.classList.add('right')});
      if(!right)b.classList.add('wrong');
      const r=(card.k==='ox'?100000:50000)*(p.ch.id==='alpha'?2:1);
      $('qres').className='res '+(right?'ok':'no');$('qres').textContent=(right?`정답! +${fmtA(r)}${card.k==='safe'?' · 안전 면제권':''}  `:'아쉬워요. 벌칙은 없어요.  ')+card.e;
      $('qnext').innerHTML='<button type="button" class="btn">확인</button>';$('qnext').querySelector('button').onclick=()=>{closeModal();res(v)};$('qnext').querySelector('button').focus();
    });
  });
}
function card2Modal(cards){
  return new Promise(res=>{
    openModal(`<div class="mh"><h3>다빈의 분석: 카드 고르기</h3></div><p>두 장 중 하나를 고르세요.</p><div class="two">${cards.map((c,i)=>`<div class="card" role="button" tabindex="0" data-i="${i}">${cardHead(c)}<p style="margin:0;font-weight:700">${esc(c.d||c.q)}</p></div>`).join('')}</div>`,{lock:true});
    $('mbox').querySelectorAll('[data-i]').forEach(el=>{const f=()=>{closeModal();res(+el.dataset.i)};el.onclick=f;el.onkeydown=e=>{if(e.key==='Enter')f()}});
  });
}
function deedModal(i){
  const c=G.cells[i];const o=c.owner>=0?G.players[c.owner]:null;
  if(c.t==='city'){
    const mates=lineCells(c.line).map(x=>x.n).join(' · ');
    const rows=LV.map((l,k)=>`<tr${k===c.level&&o?' style="background:#FFF5CC"':''}><td>${l}</td><td class="r num">${k?fmtA(Math.round(c.p*BUILD[k])):fmtA(c.p)}</td><td class="r num">${fmtA(Math.round(c.p*RATE[k]))}</td></tr>`).join('');
    openModal(`<div class="mh"><h3>도시 증서</h3><button class="x" type="button" aria-label="닫기">✕</button></div><div class="deed" style="--lc:var(--l${c.line})"><div class="hd">${iconSVG(c,'dic')}<div><small>${LINES[c.line].n} · ${esc(mates)}</small><b>${esc(c.n)}</b></div></div><div class="bd2"><p><b>상징</b> ${esc(SYMBOL[c.n]||'')}</p><p><b>대표 기업·연구소</b> ${esc(c.biz)}</p><p>${esc(c.kw)}</p><p>${o?`소유 <b>${esc(o.ch.name)}</b> · ${LV[c.level]} · 지금 통행료 <b>${fmtA(tollOf(c))}</b>`:'아직 주인이 없어요'}</p><div class="tw"><table class="tb"><tr><th>건물</th><th class="r">건설비(대지는 땅값)</th><th class="r">통행료</th></tr>${rows}</table></div><p style="font-size:13px;color:#3E5878">같은 색 3곳을 모두 가지면 통행료 2배, 색 그룹 ${TRIPLE_WIN}개를 완성하면 즉시 승리. KIRD 인재센터는 혁신캠퍼스 뒤 출발점을 한 번 더 지나야 지을 수 있고 기술이전되지 않습니다.</p></div></div>`);
  }else if(c.t==='fac'){
    openModal(`<div class="mh"><h3>국가 연구시설</h3><button class="x" type="button" aria-label="닫기">✕</button></div><div class="deed" style="--lc:var(--fac)"><div class="hd">${iconSVG(c,'dic')}<div><small>연구시설</small><b>${esc(c.full)}</b></div></div><div class="bd2"><p><b>상징</b> ${esc(SYMBOL[c.n]||'')}</p><p>${esc(c.kw)}</p><p>${o?`소유 <b>${esc(o.ch.name)}</b>`:'아직 주인이 없어요'} · 가격 ${fmtA(FAC_PRICE)}</p><table class="tb"><tr><th>보유 수</th><th class="r">통행료</th></tr>${[1,2,3].map(n=>`<tr><td>${n}곳</td><td class="r">${fmtA(FAC_TOLL[n])}</td></tr>`).join('')}<tr><td>4곳</td><td class="r">즉시 승리</td></tr></table></div></div>`);
  }else{
    const d={key:'알파 키 카드를 뽑습니다. KIRD 소식, 연구윤리 OX, 연구실 안전, 커리어 이벤트 네 종류이며 퀴즈는 틀려도 벌칙이 없어요.'}[c.t]||c.d;
    openModal(`<div class="mh"><h3>${esc(c.full||c.n)}</h3><button class="x" type="button" aria-label="닫기">✕</button></div><div style="width:96px;background:#13213D;border-radius:14px;padding:8px">${iconSVG(c,'dic')}</div><p>${esc(d)}</p>${c.t==='fund'?`<p>지금 쌓인 기금 <b>${fmtA(G.fund)}</b>. 판 전체 누적이 ${fmtA(VISION_GOAL)}이 되면 모두에게 비전 보너스 ${fmtA(VISION_BONUS)}.</p>`:''}`);
  }
}
function openDex(){
  const rows=Object.keys(LINES).map(L=>CELLS.filter(c=>c.t==='city'&&c.line===+L).map((c,k)=>`<tr>${k===0?`<td rowspan="3" style="vertical-align:middle"><span class="chipl" style="--lc:${LINES[L].c}"></span><b>${LINES[L].n}</b></td>`:''}<td><span class="dxi">${iconSVG(c,'dic')}</span><b>${esc(c.n)}</b><br><small>${esc(SYMBOL[c.n])}</small></td><td class="r num">${fmtA(c.p)}</td><td>${esc(c.biz)}</td></tr>`).join('')).join('');
  const fac=CELLS.filter(c=>c.t==='fac').map(c=>`<tr><td><span class="dxi">${iconSVG(c,'dic')}</span><b>${esc(c.full)}</b></td><td>${esc(c.kw)}</td></tr>`).join('');
  const sp=CELLS.filter(c=>['boost','back','reward','donate','festa','kird','fund','nuri','safety'].includes(c.t)).map(c=>`<tr><td><b>${esc(c.full||c.n)}</b></td><td>${esc(c.d)}</td></tr>`).join('');
  openModal(`<div class="mh"><h3>도시 도감</h3><button class="x" type="button" aria-label="닫기">✕</button></div><p>세계 과학기술·빅테크 거점 24곳을 8개 색 그룹으로 묶었습니다. 출발점에서 멀수록 비쌉니다.</p><div class="tw"><table class="tb"><tr><th>색 그룹</th><th>도시</th><th class="r">땅값</th><th>대표 기업·연구소</th></tr>${rows}</table></div><h4 style="margin:16px 0 4px">국가 연구시설 (4곳 독점 시 승리)</h4><div class="tw"><table class="tb">${fac}</table></div><h4 style="margin:16px 0 4px">특수 칸</h4><div class="tw"><table class="tb">${sp}</table></div>`,{wide:true});
}
$('bDex').onclick=openDex;
function openRules(){
  openModal(`<div class="mh"><h3>알파 마블 규칙</h3><button class="x" type="button" aria-label="닫기">✕</button></div><div class="rules">
  <h4>기본</h4><ul><li>2~4인, 시작 자금 ${fmtA(START_CASH)}. 주사위 2개 합만큼 이동, 더블이면 한 번 더(3번 연속이면 안전점검).</li><li>굴리기 전에 <b>주사위 예보</b>가 2~12 중 영향이 큰 3곳과 남의 땅에 걸릴 확률을 알려 줍니다.</li><li>출발점을 지날 때 연구지원금 ${fmtA(SALARY)}. 총자산 꼴찌는 2배.</li><li>빈 도시를 사면 그 자리에서 건물을 여러 단계 한 번에 지을 수 있어요: 랩 → 연구소 → 혁신캠퍼스 → KIRD 인재센터.</li><li>남의 도시에선 통행료를 내고, 원하면 투자액의 1.5배로 <b>기술이전(인수)</b>. 인재센터는 인수 불가.</li><li>같은 색 3곳을 모두 가지면 그 도시들 통행료 2배.</li></ul>
  <h4>승리 (먼저 달성하면 즉시)</h4><ul><li><b>색 독점</b>: 색 그룹 ${TRIPLE_WIN}개 완성</li><li><b>변 독점</b>: 보드 한 변의 도시 모두 보유</li><li><b>연구시설 독점</b>: KSTAR·나로·포항·세종기지 4곳</li><li>상대 전원 파산</li><li>${MAX_ROUND}라운드 종료 시 총자산 1위 (인재기금 기여 1위는 +5% 공로상)</li></ul>
  <h4>특수 칸</h4><ul><li><b>부스터</b> ${BOOST}칸 더 전진 · <b>재실험</b> ${BACK}칸 뒤로 · <b>기술료 수입</b> +${fmtA(REWARD)} · <b>기금 기부</b> ${fmtA(DONATE)}를 인재기금에</li><li><b>사이언스 페스타</b>: 내 도시 하나 통행료 2배(다음 페스타까지) · <b>KIRD 본원</b>: 내 도시 1단계 무료 건설</li><li><b>알파 키</b>: KIRD 소식·연구윤리 OX·연구실 안전·커리어 카드 · <b>안전점검</b>: 2턴 쉬거나 안전 퀴즈로 탈출 · <b>누리호</b>: 원하는 칸으로 · <b>인재기금</b>: 쌓인 기금 수령</li></ul>
  <h4>함께 성장</h4><ul><li>모든 통행료의 5%와 기부금은 인재기금으로. 판 전체 누적이 ${fmtA(VISION_GOAL)}에 닿으면 모두에게 ${fmtA(VISION_BONUS)}.</li></ul>
  <p style="font-size:13px;color:#3E5878">알파(α)는 현금·경품으로 교환되지 않는 학습용 가상 포인트입니다.</p></div>`,{wide:true});
}
$('bRules').onclick=openRules;

/* ---------- HOOK 연결 ---------- */
const ABORT=new Error('aborted');const guard=g=>{if(G!==g)throw ABORT};
HOOK.render=()=>{renderBoard();renderPlayers();placeTokens(false)};
HOOK.log=msg=>{const ol=$('log');const li=document.createElement('li');li.textContent=msg;ol.prepend(li);while(ol.children.length>80)ol.lastChild.remove();if(G){G.msg=msg;ctrl.msg=msg;const m=document.querySelector('.cmsg');if(m)m.textContent=msg;renderScore()}};
HOOK.beforeRoll=async p=>{
  const g=G;trail=new Set();hitSum=0;activeTok=p.id;ctrl.tot='';
  notice={p,fc:forecast(p)};
  marks=new Map(notice.fc.top.map(o=>{const me=human();const mine=me&&o.cell.owner===me.id&&!p.human&&o.kind==='toll';return[o.i,{s:o.s,col:mine?MCOL.mine:(MCOL[o.kind]||MCOL.key),kind:o.kind}]}));
  ctrl.msg=p.human?'내 차례입니다.':`${p.ch.name}의 차례`;
  renderBoard();renderPlayers();placeTokens(false);follow(p.pos);
  if(!p.human){await sleep(SP().look);guard(g)}
};
HOOK.dice=async(a,b)=>{
  const g=G;const [n,ms]=SP().dice;ctrl.spin=true;ctrl.tot='';
  for(let k=0;k<n;k++){ctrl.dice=[1+(Math.random()*6|0),1+(Math.random()*6|0)];renderCtrl();await sleep(ms);guard(g)}
  ctrl.spin=false;ctrl.dice=[a,b];hitSum=a+b;ctrl.tot=`${a+b}${a===b?'<small>더블!</small>':''}`;renderCtrl();
  factI=(factI+1)%FACTS.length;await sleep(SP().step*1.6);guard(g);
};
HOOK.step=async(p,left)=>{
  const g=G;trail.add(p.pos);
  const el=$('board').querySelector(`[data-i="${p.pos}"]`);if(el)el.classList.add('trail');
  setLeft(p,left);placeTokens(true,p.id);follow(p.pos);
  await sleep(SP().step);guard(g);
  if(left===0)setLeft(p,0);
};
HOOK.landed=async(p,c)=>{
  const g=G;const me=human();const i=G.cells.indexOf(c);const mk=marks.get(i);
  let big='',small='',col='';
  if((c.t==='city'||c.t==='fac')&&c.owner>=0&&c.owner!==p.id){
    const t=tollOf(c,p);
    if(me&&c.owner===me.id){big='내 땅에 걸렸다!';small=`${p.ch.name} → 통행료 ${fmtA(t)}`;col='#FFD24A'}
    else if(p.human){big='걸렸다!';small=`${c.n} 통행료 ${fmtA(t)}`;col='#E0533F'}
    else{big=`${c.n}`;small=`${p.ch.name} → ${G.players[c.owner].ch.name} 통행료 ${fmtA(t)}`;col='#F08A24'}
  }else if(['boost','back','reward','donate','festa','kird','nuri','fund','safety','key'].includes(c.t)){
    const T={boost:['부스터!','#8CC63F'],back:['재실험','#F08A24'],reward:['기술료 수입!','#8CC63F'],donate:['기금 기부','#F08A24'],festa:['사이언스 페스타','#B07CF2'],kird:['KIRD 교육 이수','#8CC63F'],nuri:['누리호 발사!','#4FA3EA'],fund:['인재기금','#FFD24A'],safety:['안전점검','#E0533F'],key:['알파 키','#4FA3EA']}[c.t];
    big=T[0];small=c.d||'';col=T[1];
  }else if(p.human&&[...trail].some(j=>marks.get(j)&&marks.get(j).kind==='toll'&&j!==i)){big='휴, 피했다!';small='아슬아슬하게 지나갔어요';col='#8CC63F'}
  if(mk&&p.human&&!big){big=c.n;col=mk.col}
  renderPlayers();
  if(big){await banner(big,small,col);guard(g)}
};
HOOK.show=async(p,card,info)=>{
  if(p.human&&!(card.k==='ox'||card.k==='safe')){
    await new Promise(res=>{openModal(`<div class="card">${cardHead(card)}<p style="font-size:16px">${esc(card.d)}</p><button type="button" class="btn" id="cOk">확인</button></div>`,{lock:true});$('cOk').onclick=()=>{closeModal();res()};$('cOk').focus()});
    return;
  }
  if(p.human)return;
  const g=G;const txt=(card.k==='ox'||card.k==='safe')?`${card.t} · ${info.right?'정답':'오답'}`:`${card.t}`;
  await banner(`알파 키 · ${KIND[card.k][0]}`,`${p.ch.name}: ${txt}`,KIND[card.k][1]);guard(g);
};
HOOK.over=o=>{marks=new Map();notice=null;render();setTimeout(()=>showResult(o),500)};
HOOK.ask=async(p,kind,ctx)=>{const g=G;renderPlayers();const v=await HUMAN_ASK(p,kind,ctx);guard(g);return v};

function showResult(o){
  const me=human();
  REC.games++;if(o.winner===me)REC.wins++;saveRec();
  openModal(`<div class="mh"><h3>${o.winner===me?'승리!':`${esc(o.winner.ch.name)} 승리`}</h3></div><p><b>${esc(o.reason)}</b></p><div class="rank">${o.table.map((r,i)=>`<div class="rk ${i===0?'w':''}"><span class="n">${i+1}</span>${avatar(r.p.ch)}<div><b>${esc(r.p.ch.name)}${r.p.human?' (나)':''}</b>${r.award?' · 인재양성 공로상':''}${r.p.out?' · 파산':''}</div><div class="a num">${fmtA(r.a)}<small>기금 기여 ${fmtA(r.p.contrib)}</small></div></div>`).join('')}</div><p style="font-size:13px;color:#3E5878">미래비전 게이지 ${G.visionDone?'달성':'미달성'} · 판 전체 인재기금 ${fmtA(G.visionTotal)} · 내 전적 ${REC.games}판 ${REC.wins}승</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="again">다시 하기</button><button type="button" class="btn dark" id="setup">캐릭터 바꾸기</button></div>`,{lock:true});
  $('again').onclick=()=>{closeModal();startGame(REC.avatar,REC.opp)};$('setup').onclick=()=>{closeModal();openSetup()};
}

/* ---------- 시작 ---------- */
function openSetup(){
  let pick=REC.avatar,opp=REC.opp;
  const draw=()=>{
    openModal(`<div class="mh"><h3>알파 마블</h3>${G?'<button class="x" type="button" aria-label="닫기">✕</button>':''}</div><p>세계 과학기술 도시 24곳에 연구 거점을 세우고 KIRD 캐릭터와 겨루는 보드게임입니다. 굴리기 전에 뜨는 주사위 예보를 보고 운을 걸어 보세요. 색 그룹 ${TRIPLE_WIN}개 독점, 한 변 독점, 연구시설 4곳 독점 중 하나를 먼저 이루거나 ${MAX_ROUND}라운드 뒤 총자산 1위가 이깁니다.</p>
    <h4 style="margin:12px 0 6px">내 캐릭터</h4><div class="picks">${CHARS.map(c=>`<button type="button" class="pk ${c.id===pick?'on':''}" data-c="${c.id}">${avatar(c)}<b>${c.name}</b><small>${ABIL[c.id]}</small></button>`).join('')}</div>
    <h4 style="margin:14px 0 6px">상대 수</h4><div class="seg">${[1,2,3].map(n=>`<button type="button" class="${n===opp?'on':''}" data-o="${n}">${n}명</button>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button type="button" class="btn" id="go">게임 시작</button><button type="button" class="btn dark" id="rl">규칙 보기</button><button type="button" class="btn dark" id="dx">도시 도감</button></div>`,{wide:true,lock:!G});
    $('mbox').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{pick=b.dataset.c;draw()});
    $('mbox').querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{opp=+b.dataset.o;draw()});
    $('go').onclick=()=>{REC.avatar=pick;REC.opp=opp;saveRec();closeModal();startGame(pick,opp)};
    $('rl').onclick=openRules;$('dx').onclick=openDex;
  };
  draw();
}
$('bNew').onclick=openSetup;
function startGame(av,opp){
  const others=shuffleArr(CHARS.filter(c=>c.id!==av)).slice(0,opp);
  const chars=[CH[av],...others];
  choosing=null;clearPrompt();marks=new Map();trail=new Set();notice=null;hitSum=0;ctrl={dice:[1,1],spin:false,tot:'',msg:'',prompt:'',bind:null};$('log').innerHTML='';
  newGame(chars,0);buildTokens();
  say(`게임 시작! ${chars.map(c=>c.name).join(', ')} · 출발점에서 시계 방향으로`);
  render();
  runGame().catch(e=>{if(e!==ABORT)console.error(e)});
}
openSetup();
