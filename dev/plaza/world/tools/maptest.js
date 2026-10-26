const fs=require('fs'),vm=require('vm');
const src=['01_map.js','03_decor.js','03b_garden.js','03c_city.js'].map(f=>fs.readFileSync('/home/claude/world/src/'+f,'utf8')).join('\n');
const ctx={console,Math,Object,Array,JSON};vm.createContext(ctx);
vm.runInContext(src+`\nthis.api={loadMap,G,GR,SOLID,TL,MW,MH,gi,ROOMS,RID,MAPS,DOORLIST,DEC};`,ctx);
const A=ctx.api;
for(const id of process.argv.slice(2)){
  A.loadMap(id); const M=A.MAPS[id];
  const pass=(x,y)=>{if(x<0||y<0||x>=A.MW||y>=A.MH)return false;const i=A.gi(x,y),t=A.G[i];return (t===A.TL.FLOOR||t===A.TL.DOOR)&&!A.SOLID[i];};
  let start=M.hide?M.hide.pl:M.chase?M.chase.pl:[64.5,38.5];
  const seen=new Uint8Array(A.MW*A.MH);const q=[[Math.floor(start[0]),Math.floor(start[1])]];seen[A.gi(...q[0])]=1;
  while(q.length){const[x,y]=q.pop();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(pass(nx,ny)&&!seen[A.gi(nx,ny)]){seen[A.gi(nx,ny)]=1;q.push([nx,ny]);}}}
  let unreach=0,floor=0;const byRoom={};
  for(let y=0;y<A.MH;y++)for(let x=0;x<A.MW;x++){if(pass(x,y)){floor++;if(!seen[A.gi(x,y)]){unreach++;const r=A.GR[A.gi(x,y)];byRoom[r]=(byRoom[r]||0)+1;}}}
  console.log(id,'floor',floor,'unreach',unreach,JSON.stringify(byRoom));
  const chk=(n,p)=>{const x=Math.floor(p[0]),y=Math.floor(p[1]);const ok=seen[A.gi(x,y)];const below=seen[A.gi(x,Math.floor(p[1]+0.9))];if(!ok||!below)console.log('  BAD',n,p,'tile',A.G[A.gi(x,y)],'solid',A.SOLID[A.gi(x,y)],'below',below);};
  if(M.chase){const c=M.chase;c.terms.forEach(t=>chk(t.n,[t.x,t.y]));c.exits.forEach(e=>chk(e.n,[e.x,e.y]));chk('cage',[c.cage.x,c.cage.y]);chk('cageRescue',[c.cage.x,c.cage.y-1.6]);chk('seeker',c.seeker);c.allies.forEach((a,k)=>chk('ally'+k,a));for(let k=0;k<4;k++)chk('caged'+k,[c.cage.x-1.5+k,c.cage.y+0.1]);}
  if(M.hide){chk('pl',M.hide.pl);M.hide.seekers.forEach((s,k)=>chk('seeker'+k,s));chk('seekpl',M.seek.pl);}
  // decor on walls
  for(const d of A.DEC){if(!d.solid)continue;let bad=0;for(let y=Math.floor(d.y);y<Math.ceil(d.y+d.h);y++)for(let x=Math.floor(d.x);x<Math.ceil(d.x+d.w);x++){const t=A.G[A.gi(x,y)];if(t!==A.TL.FLOOR)bad++;}if(bad)console.log('  decor on wall',d.t,d.x,d.y,bad);}
  if(process.env.ASCII){let s='';for(let y=0;y<A.MH;y++){for(let x=0;x<A.MW;x++){const i=A.gi(x,y),t=A.G[i];s+=t===A.TL.WALL?'#':t===A.TL.DOOR?'D':t===A.TL.WATER?'~':A.SOLID[i]?'o':!seen[i]?'!':A.GR[i]===-2?'.':String.fromCharCode(97+(A.GR[i]%26));}s+='\n';}console.log(s);}
}
