// ==ENGINE== 알파 마블 규칙 엔진 v2 (44칸, DOM 없음, HOOK으로 화면과 연결)
const N=44,SAFETY=14,FUND=22,NURI=36;
const START_CASH=2000000,SALARY=200000,MAX_ROUND=15,VISION_GOAL=250000,VISION_BONUS=150000,FUND_RATE=0.05;
const TRIPLE_WIN=2;                         // 색 그룹 3개 완성 시 승리
const RATE=[0.2,1.0,2.5,4.0,6.0];          // 통행료 = 땅값 × RATE[건물 단계]
const BUILD=[0,0.4,0.6,0.8,1.0];          // 다음 단계 건설비 = 땅값 × BUILD[단계]
const LV=['대지','랩','연구소','혁신캠퍼스','KIRD 인재센터'];
const LV_SHORT=['대지','랩','연구소','캠퍼스','센터'];
const FAC_PRICE=200000,FAC_TOLL=[0,60000,140000,280000,280000];
const REWARD=150000,DONATE=150000,BOOST=3,BACK=2,KIRD_AID=100000;
const LINES={1:{n:'신흥 아시아',c:'#F28C6B'},2:{n:'중화권 테크',c:'#F2B84B'},3:{n:'중동·오세아니아',c:'#B9D45A'},4:{n:'일본 연구도시',c:'#35BFA4'},5:{n:'유럽 혁신',c:'#4FA3EA'},6:{n:'유럽 과학',c:'#9AA6D6'},7:{n:'북미 테크',c:'#B07CF2'},8:{n:'K-혁신 클러스터',c:'#E86FA3'}};
const SIDES={bottom:[1,13],left:[15,21],top:[23,35],right:[37,43]};
const SIDE_NAME={bottom:'아래 변',left:'왼쪽 변',top:'위 변',right:'오른쪽 변'};
const C=(n,line,p,biz,kw,kr)=>({t:'city',n,line,p,biz,kw,kr:!!kr});
const CELLS=[
 {t:'start',n:'출발점',d:`지날 때마다 연구지원금 ${SALARY/10000}만α`},
 C('하노이',1,50000,'삼성전자 베트남 R&D센터·비엣텔','동남아 최대 규모 기업 연구소가 들어선 신흥 기술 도시'),
 {t:'key',n:'알파 키'},
 C('벵갈루루',1,60000,'인도우주연구기구(ISRO)·인포시스·인도과학원','인도의 실리콘밸리, 우주·소프트웨어'),
 C('싱가포르',1,70000,'A*STAR 바이오폴리스·퓨전폴리스','국가 주도 바이오·IT 연구 단지'),
 {t:'boost',n:'부스터',d:`실험 성공! ${BOOST}칸 더 전진`},
 {t:'fac',n:'KSTAR',full:'KSTAR 핵융합 연구장치',kw:'대전, 한국형 초전도 핵융합장치'},
 C('선전',2,90000,'화웨이·텐센트·BYD·DJI','하드웨어·전기차·드론 생태계'),
 {t:'reward',n:'기술료 수입',d:`특허 기술이전 성공! ${REWARD/10000}만α를 받음`},
 C('항저우',2,100000,'알리바바·딥시크·유니트리 로보틱스','AI·로봇 스타트업이 급성장하는 도시'),
 C('신주',2,110000,'TSMC·대만 공업기술연구원(ITRI)','세계 반도체 파운드리의 심장'),
 {t:'key',n:'알파 키'},
 {t:'back',n:'재실험',d:`데이터 재확인! ${BACK}칸 뒤로`},
 C('시드니',3,120000,'아틀라시안·UNSW 양자컴퓨팅','남반구 소프트웨어·양자 연구 거점'),
 {t:'safety',n:'안전점검',d:'멈추면 2턴 쉼. 매 턴 안전 퀴즈로 탈출 도전'},
 C('두바이',3,130000,'미래박물관·무함마드 빈 라시드 우주센터','스마트시티와 중동 우주 프로그램'),
 C('텔아비브',3,140000,'스타트업 밀집·인근 와이즈만 과학연구소','인구 대비 스타트업 수 세계 최상위'),
 {t:'donate',n:'기금 기부',d:`인재기금에 ${DONATE/10000}만α 기부`},
 C('도쿄',4,160000,'소니·소프트뱅크·도쿄대','로봇·소재·전자 산업의 중심'),
 {t:'fac',n:'나로',full:'나로우주센터',kw:'전남 고흥, 누리호 발사장'},
 C('쓰쿠바',4,170000,'JAXA 쓰쿠바우주센터·산업기술종합연구소','국가 연구기관이 모인 연구학원도시'),
 C('교토',4,180000,'닌텐도·교토대 iPS세포연구소','노벨상 배출 대학과 게임 기업의 도시'),
 {t:'fund',n:'인재기금',d:'쌓인 인재기금을 모두 받음'},
 C('파리',5,200000,'파스퇴르연구소·미스트랄 AI·스테이션 F','기초과학과 유럽 AI 스타트업'),
 {t:'key',n:'알파 키'},
 C('베를린',5,210000,'막스플랑크 연구소·테슬라 기가팩토리','유럽 스타트업 수도'),
 C('아인트호번',5,220000,'ASML(인근 펠트호번)·필립스·브레인포트','반도체 노광장비의 세계 독점 기지'),
 {t:'boost',n:'부스터',d:`실험 성공! ${BOOST}칸 더 전진`},
 {t:'fac',n:'포항',full:'포항 방사광가속기',kw:'경북 포항, 4세대 방사광가속기'},
 C('케임브리지',6,240000,'Arm·웰컴 생어연구소·케임브리지대','실리콘펜, 반도체 설계·유전체 연구'),
 {t:'festa',n:'사이언스 페스타',d:'내 도시 하나를 골라 통행료 2배 (다음 페스타까지)'},
 C('제네바',6,250000,'유럽입자물리연구소(CERN)','월드와이드웹이 태어난 입자물리 연구소'),
 C('런던',6,260000,'구글 딥마인드·프랜시스 크릭 연구소','AI·의생명 연구의 유럽 중심'),
 {t:'key',n:'알파 키'},
 {t:'kird',n:'KIRD 본원',full:'KIRD 오창 본원',d:`교육 이수! 내 도시 1단계 무료 건설 (없으면 교육지원금 ${KIRD_AID/10000}만α)`},
 C('시애틀',7,280000,'마이크로소프트·아마존','클라우드와 전자상거래의 본거지'),
 {t:'nuri',n:'누리호',d:'원하는 칸으로 날아감'},
 C('오스틴',7,290000,'테슬라 본사·삼성 오스틴 반도체','실리콘힐스, 전기차와 반도체'),
 C('보스턴',7,300000,'MIT·하버드·모더나','세계 최대 바이오 클러스터'),
 {t:'key',n:'알파 키'},
 {t:'fac',n:'세종기지',full:'남극 세종과학기지',kw:'남극 킹조지섬, 극지 연구'},
 C('실리콘밸리',8,340000,'엔비디아·애플·구글·스탠퍼드','AI·반도체 빅테크의 본거지'),
 C('판교',8,360000,'카카오·넥슨·엔씨소프트','판교테크노밸리, 한국 ICT·게임 허브',1),
 C('대덕',8,400000,'KAIST·한국전자통신연구원 등 출연연','대덕연구개발특구, 한국 과학기술의 심장',1),
];
const ABIL={alpha:'알파 키 퀴즈 정답 보상 2배',kclub:'출발점 통과 시 +5만α 추가',notri:'내 땅은 기술이전(인수) 불가',safe:'안전점검 1턴만 휴식',leader:'기술이전 비용 1.2배(기본 1.5배)',globi:'해외 도시 통행료 10% 할인',sprout:'신흥 아시아 땅값 20% 할인',strat:'누리호 이동 뒤 주사위 한 번 더',davin:'알파 키 카드 2장 중 골라 쓰기',budget:'건설비 10% 할인'};
const AI_RESERVE={alpha:.12,kclub:.16,notri:.14,safe:.2,leader:.06,globi:.1,sprout:.08,strat:.1,davin:.12,budget:.18};
const CARDS=[
 {k:'news',t:'알파캠퍼스 회원 82만 명',d:'학습 열풍! 보너스를 받습니다.',fx:'money',v:100000},
 {k:'news',t:'미래비전 2050 선포',d:'AI 시대 대전환을 축하하며 비전 보너스를 받습니다.',fx:'money',v:150000},
 {k:'news',t:'청년과학자 15팀 확대',d:'국가R&D 연구기획 프로그램 확대! 모든 플레이어가 5만α를 받습니다.',fx:'allbank',v:50000},
 {k:'news',t:'해외연구인력 정착지원',d:'외국인 연구자와 함께 누리호 발사장으로 이동합니다.',fx:'move',v:NURI},
 {k:'news',t:'코트라와 해외인재 유치 협약',d:'출발점으로 이동해 연구지원금을 받습니다.',fx:'move',v:0},
 {k:'news',t:'공정채용 인사혁신처장상',d:'수상 축하금을 받습니다.',fx:'money',v:100000},
 {k:'news',t:'KIRD 연수 입교',d:'KIRD 오창 본원으로 이동해 교육을 받습니다.',fx:'move',v:34},
 {k:'news',t:'대덕특구 견학',d:'대덕으로 이동합니다.',fx:'move',v:43},
 {k:'ox',t:'연구윤리 OX',q:'존재하지 않는 데이터를 만들어내는 것은 \'위조\'다.',a:true,e:'맞습니다. 있는 데이터를 바꾸거나 지우면 \'변조\'입니다.'},
 {k:'ox',t:'연구윤리 OX',q:'연구노트의 잘못 쓴 부분은 수정테이프로 깨끗이 지운다.',a:false,e:'줄을 그어 원래 기록이 보이게 두고 날짜·서명을 남깁니다.'},
 {k:'ox',t:'연구윤리 OX',q:'다른 사람의 아이디어를 출처 없이 쓰면 표절이다.',a:true,e:'맞습니다. 아이디어도 출처를 밝혀야 합니다.'},
 {k:'ox',t:'연구윤리 OX',q:'연구에 기여하지 않은 사람도 관행이면 저자로 넣어도 된다.',a:false,e:'부당한 저자 표시는 연구부정행위입니다.'},
 {k:'ox',t:'연구윤리 OX',q:'결과를 맞추려고 실험 데이터 일부를 임의로 지우면 \'변조\'다.',a:true,e:'맞습니다. 데이터의 임의 삭제·변경은 변조입니다.'},
 {k:'ox',t:'연구윤리 OX',q:'연구노트는 연구가 끝난 뒤 한꺼번에 정리해도 된다.',a:false,e:'연구노트는 수행하면서 바로 기록해야 증거 능력이 있습니다.'},
 {k:'safe',t:'연구실 안전',q:'화학물질의 유해성과 응급조치를 확인하는 문서는?',o:['MSDS(물질안전보건자료)','연구계획서','장비 대장'],a:0,e:'MSDS로 유해성과 응급조치를 확인합니다.'},
 {k:'safe',t:'연구실 안전',q:'연구실에서 불이 나면 가장 먼저 할 일은?',o:['주변에 알리고 대피·신고','실험 데이터 백업','원인 기록'],a:0,e:'인명 안전이 먼저입니다.'},
 {k:'safe',t:'연구실 안전',q:'시약이 눈에 튀었을 때 먼저 할 일은?',o:['비상 세안기로 충분히 씻기','마른 수건으로 닦기','눈을 비비기'],a:0,e:'곧바로 흐르는 물이나 세안기로 충분히 씻어 냅니다.'},
 {k:'safe',t:'연구실 안전',q:'유해 가스가 나오는 실험은 어디서 해야 할까?',o:['흄후드 안에서','창문 옆 책상','복도'],a:0,e:'흄후드로 가스를 배기합니다.'},
 {k:'career',t:'K-클럽 멘토링 성공',d:'내 도시 하나에 건물 1단계를 무료로 짓습니다.',fx:'freebuild'},
 {k:'career',t:'리더 과정 수료',d:'다음 통행료 1회가 면제됩니다.',fx:'shield'},
 {k:'career',t:'해외 학회 발표',d:'원하는 칸으로 이동합니다.',fx:'choose'},
 {k:'career',t:'연구비 정산 실수',d:'증빙 누락! 10만α를 냅니다.',fx:'money',v:-100000},
 {k:'career',t:'연구실 안전점검 대상',d:'안전점검 칸으로 이동합니다. (면제권이 있으면 사용)',fx:'jail'},
 {k:'career',t:'연구장비 교체',d:'건물 1단계당 2만α를 냅니다.',fx:'tax',v:20000},
 {k:'career',t:'공동연구 성사',d:'모든 플레이어에게서 3만α씩 받습니다.',fx:'collect',v:30000},
 {k:'career',t:'팀 워크숍 비용',d:'모든 플레이어에게 2만α씩 냅니다.',fx:'payall',v:20000},
];
let G=null;
const HOOK={render(){},log(){},show:async()=>{},dice:async()=>{},step:async()=>{},beforeRoll:async()=>{},landed:async()=>{},over(){},ask:null};
function shuffleArr(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function newGame(chars,humanIdx){
  G={players:chars.map((ch,i)=>({id:i,ch,human:i===humanIdx,cash:START_CASH,pos:0,jail:0,laps:0,out:false,contrib:0,shield:0,exempt:0,quizOK:0})),
     cells:CELLS.map(c=>Object.assign({},c,{owner:-1,level:0,buyLap:0,invested:0})),
     turn:0,round:1,fund:0,visionTotal:0,visionDone:false,festa:-1,deck:shuffleArr(CARDS.slice()),over:null,lastDice:[1,1],msg:''};
  return G;
}
const alivePlayers=()=>G.players.filter(p=>!p.out);
const owned=p=>G.cells.filter(c=>c.owner===p.id);
const assets=p=>p.out?0:p.cash+owned(p).reduce((s,c)=>s+c.invested,0);
const fmtA=n=>{n=Math.round(n);const a=Math.abs(n);let s;if(a>=1e8)s=(a/1e8).toFixed(1).replace(/\.0$/,'')+'억';else if(a>=1e4)s=(a/1e4).toFixed(a%1e4?1:0).replace(/\.0$/,'')+'만';else s=a.toLocaleString('ko-KR');return(n<0?'-':'')+s+'α'};
const lineCells=L=>G.cells.filter(c=>c.t==='city'&&c.line===L);
const lineDone=(L,pid)=>lineCells(L).every(c=>c.owner===pid);
const priceOf=(p,c)=>Math.round(c.p*(p.ch.id==='sprout'&&c.line===1?.8:1));
const buildCost=(p,c)=>Math.round(c.p*BUILD[c.level+1]*(p.ch.id==='budget'?.9:1));
function tollOf(c,payer){
  if(c.owner<0)return 0;
  if(c.t==='fac'){const n=G.cells.filter(x=>x.t==='fac'&&x.owner===c.owner).length;return FAC_TOLL[n]}
  let t=c.p*RATE[c.level];
  if(lineDone(c.line,c.owner))t*=2;
  if(G.cells.indexOf(c)===G.festa)t*=2;
  if(payer&&payer.ch.id==='globi'&&!c.kr)t*=.9;
  return Math.round(t);
}
const canLandmark=(p,c)=>c.level===3&&p.laps>c.buyLap;
const canBuild=(p,c)=>c.t==='city'&&c.owner===p.id&&(c.level<3||canLandmark(p,c));
const takeoverCost=(p,c)=>Math.round(c.invested*(p.ch.id==='leader'?1.2:1.5));
function say(msg){G.msg=msg;HOOK.log(msg)}

/* 주사위 예보: 지금 위치에서 2~12가 나오면 어디에 멈추는지, 영향이 큰 순서 */
const WAYS=[0,0,1,2,3,4,5,6,5,4,3,2,1];
function forecast(p){
  const out=[];
  for(let s=2;s<=12;s++){
    const i=(p.pos+s)%N,c=G.cells[i];let kind='',amt=0,label='',score=0;
    if(c.t==='city'||c.t==='fac'){
      if(c.owner>=0&&c.owner!==p.id){amt=-tollOf(c,p);kind='toll';label=`통행료 ${fmtA(-amt)}`;score=-amt}
      else if(c.owner===p.id){kind='own';label=canBuild(p,c)?'내 땅 · 건설 가능':'내 땅';score=c.t==='city'&&canBuild(p,c)?15000:5000}
      else{kind='free';label=`빈 땅 ${fmtA(c.t==='fac'?FAC_PRICE:priceOf(p,c))}`;score=c.t==='fac'?40000:20000}
    }else{
      const M={key:['key','알파 키 카드',30000],safety:['bad','안전점검 2턴',160000],donate:['bad',`기부 ${fmtA(DONATE)}`,DONATE],reward:['good',`+${fmtA(REWARD)}`,REWARD],
        boost:['good',`${BOOST}칸 더 → ${G.cells[(i+BOOST)%N].n}`,90000],back:['bad',`${BACK}칸 뒤로 → ${G.cells[(i-BACK+N)%N].n}`,60000],
        fund:['good',`인재기금 ${fmtA(G.fund)}`,Math.max(30000,G.fund)],nuri:['good','원하는 칸으로',100000],kird:['good','무료 건설',120000],
        festa:['good',owned(p).some(x=>x.t==='city')?'통행료 2배 지정':'페스타',owned(p).some(x=>x.t==='city')?80000:10000],start:['good','출발점',SALARY]};
      [kind,label,score]=M[c.t]||['',c.n,0];
    }
    out.push({s,i,cell:c,kind,amt,label,score,prob:WAYS[s]/36});
  }
  const risk=out.filter(o=>o.kind==='toll').reduce((a,o)=>a+o.prob,0);
  const top=out.slice().sort((a,b)=>b.score-a.score||b.prob-a.prob).slice(0,3);
  return{all:out,top,risk};
}

async function decide(p,kind,ctx){
  if(p.human&&HOOK.ask)return HOOK.ask(p,kind,ctx);
  const res=AI_RESERVE[p.ch.id]*START_CASH*(G.round>12?.5:1);
  const groupGain=c=>c.t==='city'?lineCells(c.line).filter(x=>x.owner===p.id).length:0;
  switch(kind){
    case'buy':return p.cash-ctx.cost>=res*(groupGain(ctx.cell)?.5:1);
    case'build':{let best=0;for(const o of ctx.opts){if(p.cash-o.cost>=res*.8)best=o.lv}return best}
    case'takeover':{const c=ctx.cell;const completes=lineCells(c.line).every(x=>x.owner===p.id||x===c);const g=groupGain(c);return p.cash-ctx.cost>=res*(completes?.05:g?.4:.8)&&(completes||Math.random()<(g?.75:.25))}
    case'quiz':{const right=Math.random()<.7;if(ctx.k==='ox')return right?ctx.a:!ctx.a;return right?ctx.a:(ctx.a+1)%ctx.o.length}
    case'jail':return'quiz';
    case'choose':return aiChooseCell(p);
    case'pickOwn':return ctx.cells.slice().sort((a,b)=>(kind==='pickOwn'&&ctx.mode==='festa'?tollOf(G.cells[b])-tollOf(G.cells[a]):G.cells[b].p-G.cells[a].p))[0];
    case'card2':return cardValue(p,ctx[0])>=cardValue(p,ctx[1])?0:1;
    case'roll':return true;
  }
}
function cardValue(p,c){if(c.k==='ox'||c.k==='safe')return 6;const m={money:c.v/20000,allbank:2.5,move:3,freebuild:7,shield:5,choose:8,jail:-6,tax:-3,collect:3,payall:-2};return m[c.fx]??0}
function aiChooseCell(p){
  let best=0,bv=-1;
  G.cells.forEach((c,i)=>{if(i===NURI)return;let v=0;
    if((c.t==='city'||c.t==='fac')&&c.owner===-1&&p.cash>(c.p||FAC_PRICE)*1.3)v=(c.p||FAC_PRICE)/10000+10+(c.t==='city'?lineCells(c.line).filter(x=>x.owner===p.id).length*15:0);
    else if(canBuild(p,c)&&p.cash>buildCost(p,c)*1.5)v=c.p/10000+5;
    else if(c.t==='fund')v=G.fund/10000;
    else if(c.t==='kird'&&owned(p).some(x=>canBuild(p,x)))v=14;
    else if(i===0)v=8;
    if(v>bv){bv=v;best=i}});
  return best;
}
function buildOptions(p,c){
  const opts=[];let lv=c.level,sum=0;
  while(lv<4){if(lv===3&&!canLandmark(p,c))break;const t=Object.assign({},c,{level:lv});sum+=Math.round(c.p*BUILD[lv+1]*(p.ch.id==='budget'?.9:1));lv++;if(sum>p.cash)break;opts.push({lv,cost:sum,toll:Math.round(c.p*RATE[lv])})}
  return opts;
}
async function buildFlow(p,c){
  const opts=buildOptions(p,c);if(!opts.length)return;
  const pick=await decide(p,'build',{cell:c,opts});
  const o=opts.find(x=>x.lv===pick);if(!o)return;
  p.cash-=o.cost;c.invested+=o.cost;const from=c.level;c.level=o.lv;
  say(`${p.ch.name}, ${c.n}에 ${LV[o.lv]}${o.lv-from>1?`까지 ${o.lv-from}단계`:''} 건설 ${fmtA(o.cost)}`);
}
async function payTo(p,amt,to,why){
  amt=Math.round(amt);if(amt<=0)return true;
  if(p.cash<amt)await liquidate(p,amt);
  if(p.cash<amt){if(to)to.cash+=p.cash;p.cash=0;bankrupt(p,why);return false}
  p.cash-=amt;if(to)to.cash+=amt;return true;
}
async function liquidate(p,need){
  const list=owned(p).sort((a,b)=>a.invested-b.invested);
  for(const c of list){if(p.cash>=need)break;const v=Math.round(c.invested*.5);p.cash+=v;say(`${p.ch.name}, 자금이 모자라 ${c.n}을(를) ${fmtA(v)}에 매각`);c.owner=-1;c.level=0;c.invested=0;if(G.cells.indexOf(c)===G.festa)G.festa=-1;HOOK.render()}
}
function bankrupt(p,why){
  p.out=true;owned(p).forEach(c=>{c.owner=-1;c.level=0;c.invested=0});
  say(`${p.ch.name} 파산${why?` (${why})`:''}`);
  if(alivePlayers().length===1)endGame(alivePlayers()[0],'상대 전원 파산');
}
function addFund(p,f){G.fund+=f;G.visionTotal+=f;p.contrib+=f;checkVision()}
async function payToll(p,c){
  const o=G.players[c.owner];const t=tollOf(c,p);
  if(p.shield>0){p.shield--;say(`${p.ch.name}, 리더 과정 방패로 통행료 ${fmtA(t)} 면제`);return}
  const f=Math.round(t*FUND_RATE);
  if(p.cash<t)await liquidate(p,t);
  if(p.cash<t){o.cash+=p.cash;p.cash=0;bankrupt(p,`${c.n} 통행료 ${fmtA(t)}`);return}
  p.cash-=t;o.cash+=t-f;
  say(`${p.ch.name} → ${o.ch.name} 통행료 ${fmtA(t)} (인재기금 ${fmtA(f)})`);
  addFund(p,f);
}
function checkVision(){
  if(!G.visionDone&&G.visionTotal>=VISION_GOAL){G.visionDone=true;alivePlayers().forEach(q=>q.cash+=VISION_BONUS);say(`미래비전 게이지 달성! 모두에게 비전 보너스 ${fmtA(VISION_BONUS)}`)}
}
function checkWin(p){
  if(G.over||p.out)return;
  const done=Object.keys(LINES).filter(L=>lineDone(+L,p.id));
  if(done.length>=TRIPLE_WIN){endGame(p,`트리플 독점 · ${done.map(L=>LINES[L].n).join(', ')}`);return}
  for(const [k,[a,b]] of Object.entries(SIDES)){const cs=G.cells.slice(a,b+1).filter(c=>c.t==='city');if(cs.every(c=>c.owner===p.id)){endGame(p,`변 독점 · ${SIDE_NAME[k]}`);return}}
  if(G.cells.filter(c=>c.t==='fac').every(c=>c.owner===p.id))endGame(p,'국가 연구시설 4곳 독점');
}
function standings(){
  const top=Math.max(...G.players.map(p=>p.contrib));
  return G.players.map(p=>{const a=assets(p);const award=!p.out&&p.contrib===top&&top>0;return{p,a,award,score:p.out?-1:Math.round(a*(award?1.05:1))}}).sort((x,y)=>y.score-x.score);
}
function endGame(w,reason){if(G.over)return;G.over={winner:w,reason,table:standings()};say(`${w.ch.name} 승리 · ${reason}`);HOOK.over(G.over)}

async function moveSteps(p,n,dir=1){
  for(let k=0;k<n;k++){p.pos=(p.pos+dir+N)%N;if(dir>0&&p.pos===0)await passStart(p);await HOOK.step(p,n-k-1)}
}
async function moveTo(p,target){await moveSteps(p,(target-p.pos+N)%N)}
async function passStart(p){
  p.laps++;let s=SALARY;if(p.ch.id==='kclub')s+=50000;
  const al=alivePlayers();if(al.length>1){const min=Math.min(...al.map(assets));if(assets(p)===min)s+=SALARY}
  p.cash+=s;say(`${p.ch.name}, 출발점 통과 연구지원금 ${fmtA(s)}`);
}
function goSafety(p){
  if(p.exempt>0){p.exempt--;say(`${p.ch.name}, 안전 면제권 사용`);return false}
  p.pos=SAFETY;p.jail=p.ch.id==='safe'?1:2;say(`${p.ch.name}, 연구실 안전점검 (${p.jail}턴)`);return true;
}
async function drawCard(){if(!G.deck.length)G.deck=shuffleArr(CARDS.slice());return G.deck.pop()}
async function freeBuild(p,why){
  const cands=G.cells.map((c,i)=>i).filter(i=>canBuild(p,G.cells[i]));
  if(!cands.length)return false;
  const i=await decide(p,'pickOwn',{cells:cands,mode:'build',title:`${why}: 무료로 지을 도시를 고르세요`});
  const c=G.cells[i];c.invested+=buildCost(p,c);c.level++;say(`${p.ch.name}, ${why}로 ${c.n}에 ${LV[c.level]} 무료 건설`);checkWin(p);return true;
}
async function useCard(p,card){
  if(card.k==='ox'||card.k==='safe'){
    const ans=await decide(p,'quiz',card);const right=ans===card.a;
    await HOOK.show(p,card,{answered:true,right,ans});
    if(right){const r=(card.k==='ox'?100000:50000)*(p.ch.id==='alpha'?2:1);p.cash+=r;p.quizOK++;if(card.k==='safe')p.exempt++;say(`${p.ch.name}, ${card.t} 정답! +${fmtA(r)}${card.k==='safe'?' · 안전 면제권':''}`)}
    else say(`${p.ch.name}, ${card.t} 오답 (벌칙 없음)`);
    return null;
  }
  await HOOK.show(p,card,{});
  switch(card.fx){
    case'money':if(card.v>0){p.cash+=card.v;say(`${p.ch.name}, ${card.t} +${fmtA(card.v)}`)}else{say(`${p.ch.name}, ${card.t} ${fmtA(card.v)}`);await payTo(p,-card.v,null,card.t)}break;
    case'allbank':alivePlayers().forEach(q=>q.cash+=card.v);say(`${card.t}: 모두 +${fmtA(card.v)}`);break;
    case'move':say(`${p.ch.name}, ${card.t}: ${G.cells[card.v].n}(으)로 이동`);await moveTo(p,card.v);return await landOn(p);
    case'choose':{const t=await decide(p,'choose',{});say(`${p.ch.name}, ${G.cells[t].n}(으)로 이동`);await moveTo(p,t);return await landOn(p)}
    case'jail':goSafety(p);break;
    case'shield':p.shield++;say(`${p.ch.name}, 통행료 면제 방패 획득`);break;
    case'freebuild':if(!await freeBuild(p,'멘토링'))say(`${p.ch.name}, 지을 도시가 없어 효과 없음`);break;
    case'tax':{const n=owned(p).reduce((s,c)=>s+c.level,0);const t=n*card.v;say(`${p.ch.name}, 연구장비 교체 ${fmtA(t)}`);await payTo(p,t,null,card.t);break}
    case'collect':for(const q of alivePlayers()){if(q!==p)await payTo(q,card.v,p,card.t)}say(`${p.ch.name}, 공동연구 성사! 모두에게서 ${fmtA(card.v)}씩`);break;
    case'payall':for(const q of alivePlayers()){if(q!==p&&!p.out)await payTo(p,card.v,q,card.t)}say(`${p.ch.name}, 워크숍 비용 ${fmtA(card.v)}씩 지불`);break;
  }
  return null;
}
async function landOn(p,depth=0){
  const c=G.cells[p.pos];HOOK.render();
  if(depth>3)return null;
  await HOOK.landed(p,c);
  if(c.t==='city'||c.t==='fac'){
    if(c.owner===-1){
      const cost=c.t==='fac'?FAC_PRICE:priceOf(p,c);
      if(p.cash>=cost&&await decide(p,'buy',{cell:c,cost})){p.cash-=cost;c.owner=p.id;c.invested=cost;c.buyLap=p.laps;c.level=0;say(`${p.ch.name}, ${c.full||c.n} 구입 ${fmtA(cost)}`);
        if(c.t==='city'){checkWin(p);if(G.over)return null;await buildFlow(p,c)}}
    }else if(c.owner===p.id){
      if(canBuild(p,c))await buildFlow(p,c);
    }else{
      await payToll(p,c);
      const o=G.players[c.owner];
      if(!p.out&&c.t==='city'&&c.level<4&&o.ch.id!=='notri'){
        const cost=takeoverCost(p,c);
        if(p.cash>=cost&&await decide(p,'takeover',{cell:c,cost,owner:o})){p.cash-=cost;o.cash+=cost;c.owner=p.id;c.buyLap=p.laps;say(`${p.ch.name}, ${o.ch.name}의 ${c.n} 기술이전 ${fmtA(cost)}`)}
      }
    }
  }else if(c.t==='key'){
    let card=await drawCard();
    if(p.ch.id==='davin'){const c2=await drawCard();const pick=await decide(p,'card2',[card,c2]);const other=pick?card:c2;card=pick?c2:card;G.deck.unshift(other)}
    const r=await useCard(p,card);HOOK.render();checkWin(p);return r;
  }else if(c.t==='safety'){goSafety(p)}
  else if(c.t==='fund'){if(G.fund>0){p.cash+=G.fund;say(`${p.ch.name}, 인재기금 ${fmtA(G.fund)} 수령`);G.fund=0}else say(`${p.ch.name}, 인재기금이 비어 있음`)}
  else if(c.t==='reward'){p.cash+=REWARD;say(`${p.ch.name}, 기술료 수입 +${fmtA(REWARD)}`)}
  else if(c.t==='donate'){const ok=await payTo(p,DONATE,null,'기금 기부');if(ok){say(`${p.ch.name}, 인재기금에 ${fmtA(DONATE)} 기부`);addFund(p,DONATE)}}
  else if(c.t==='boost'){say(`${p.ch.name}, 부스터! ${BOOST}칸 더 전진`);await moveSteps(p,BOOST);return await landOn(p,depth+1)}
  else if(c.t==='back'){say(`${p.ch.name}, 재실험! ${BACK}칸 뒤로`);await moveSteps(p,BACK,-1);return await landOn(p,depth+1)}
  else if(c.t==='festa'){const cands=G.cells.map((x,i)=>i).filter(i=>G.cells[i].t==='city'&&G.cells[i].owner===p.id);
    if(cands.length){const i=await decide(p,'pickOwn',{cells:cands,mode:'festa',title:'사이언스 페스타: 통행료 2배로 만들 내 도시를 고르세요'});G.festa=i;say(`${p.ch.name}, 사이언스 페스타 개최! ${G.cells[i].n} 통행료 2배`)}
    else say(`${p.ch.name}, 페스타를 열 도시가 없음`)}
  else if(c.t==='kird'){if(!await freeBuild(p,'KIRD 교육 이수')){p.cash+=KIRD_AID;say(`${p.ch.name}, KIRD 교육지원금 +${fmtA(KIRD_AID)}`)}}
  else if(c.t==='nuri'){const t=await decide(p,'choose',{});say(`${p.ch.name}, 누리호 발사! ${G.cells[t].n}(으)로`);await moveTo(p,t);const ex=await landOn(p,depth+1);return p.ch.id==='strat'?'again':ex}
  HOOK.render();checkWin(p);return null;
}
async function rollDice(){const a=1+(Math.random()*6|0),b=1+(Math.random()*6|0);G.lastDice=[a,b];await HOOK.dice(a,b);return[a,b]}
async function takeTurn(p){
  if(p.jail>0){
    const how=await decide(p,'jail',{});
    if(how==='quiz'){const card=CARDS.filter(c=>c.k==='safe')[Math.random()*4|0];const ans=await decide(p,'quiz',card);const right=ans===card.a;await HOOK.show(p,card,{answered:true,right,ans,jail:true});
      if(right){p.jail=0;say(`${p.ch.name}, 안전 퀴즈 정답으로 점검 통과`)}else{p.jail--;say(`${p.ch.name}, 안전점검 계속 (남은 ${p.jail}턴)`);HOOK.render();return}}
    else{p.jail--;say(`${p.ch.name}, 안전점검 중 (남은 ${p.jail}턴)`);HOOK.render();return}
  }
  let doubles=0,bonus=false;
  while(!G.over&&!p.out){
    await HOOK.beforeRoll(p);
    await decide(p,'roll',{});
    const [a,b]=await rollDice();const dbl=a===b;
    if(dbl)doubles++;
    if(doubles===3){say(`${p.ch.name}, 더블 3번! 과로 경고`);goSafety(p);HOOK.render();break}
    say(`${p.ch.name} 주사위 ${a}+${b}=${a+b}${dbl?' 더블!':''}`);
    await moveSteps(p,a+b);
    const r=await landOn(p);
    if(G.over||p.out||p.jail>0)break;
    if(r==='again'&&!bonus){bonus=true;say(`${p.ch.name}, 전략이 능력으로 한 번 더`);continue}
    if(!dbl)break;
  }
  HOOK.render();
}
async function runGame(){
  while(!G.over){
    const p=G.players[G.turn];
    if(!p.out)await takeTurn(p);
    if(G.over)break;
    let n=G.turn;do{n=(n+1)%G.players.length}while(G.players[n].out);
    if(n<=G.turn)G.round++;
    G.turn=n;
    if(G.round>MAX_ROUND){const t=standings();endGame(t[0].p,`${MAX_ROUND}라운드 종료 · 총자산 1위`);break}
    HOOK.render();
  }
}
// ==/ENGINE==
