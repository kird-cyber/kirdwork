const fs=require('fs');const E=new Function(fs.readFileSync(__dirname+'/engine.js','utf8')+';return {HOOK,newGame,runGame,getG:()=>G,assets,shuffleArr};')();const {HOOK,newGame,runGame,assets,shuffleArr}=E;
const CH=['alpha','kclub','notri','safe','leader','globi','sprout','strat','davin','budget'].map(id=>({id,name:id}));
(async()=>{
  const N=+process.argv[2]||2000,np=+process.argv[3]||4;const res={},rounds=[],winBy={};let comeback=0,vis=0,turnsTot=0,vt=0,bk=0,levels=0;
  for(let i=0;i<N;i++){
    const chars=shuffleArr(CH.slice()).slice(0,np);
    let turns=0;HOOK.step=async()=>{};HOOK.dice=async()=>{turns++};
    newGame(chars,-1);
    // 10라운드 시점 꼴찌 기록
    let lastAt10=null;const orig=HOOK.render;HOOK.render=()=>{if(E.getG().round===10&&!lastAt10){const G=E.getG();const al=G.players.filter(p=>!p.out);lastAt10=al.reduce((a,b)=>assets(a)<=assets(b)?a:b)}};
    await runGame();const G=E.getG();
    const r=G.over.reason.split(' · ')[0];res[r]=(res[r]||0)+1;rounds.push(G.round);winBy[G.over.winner.ch.id]=(winBy[G.over.winner.ch.id]||0)+1;
    if(lastAt10&&G.over.winner===lastAt10)comeback++;if(G.visionDone)vis++;vt+=G.visionTotal;bk+=G.players.filter(p=>p.out).length;levels+=G.cells.reduce((a,c)=>a+c.level,0);turnsTot+=turns;
  }
  rounds.sort((a,b)=>a-b);
  console.log('players',np,'games',N);
  console.log('end reasons',Object.fromEntries(Object.entries(res).map(([k,v])=>[k,(v/N*100).toFixed(1)+'%'])));
  console.log('round median',rounds[N>>1],'p90',rounds[Math.floor(N*.9)],'avg dice rolls',(turnsTot/N).toFixed(0));
  console.log('comeback (last at R10 wins)',(comeback/N*100).toFixed(1)+'%','vision reached',(vis/N*100).toFixed(1)+'%');
  console.log('avg vision',Math.round(vt/N),'bankrupts/game',(bk/N).toFixed(2),'avg building levels at end',(levels/N).toFixed(1));console.log('win by char',Object.fromEntries(Object.entries(winBy).map(([k,v])=>[k,(v/N*100*CH.length/np).toFixed(0)])));
})();
