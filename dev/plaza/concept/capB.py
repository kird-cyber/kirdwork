import sys, json, traceback
sys.path.insert(0, '/home/claude/stills')
from h import *
OUT = '/home/claude/concept/rawB/'
ONLY = sys.argv[1].split(',') if len(sys.argv) > 1 else None
HIDE = "#app > *:not(#cv){display:none!important} #banner,#tipToast,#mguide{display:none!important}"
ANCH = open('/home/claude/concept/cap.py').read().split('ANCH = r"""')[1].split('"""')[0]
# id, map, red, blue, items override, meteor word, setup js, cam
SC = [
 ('b01_global','valley',[('김연구','kird'),('Maria','prism')],[('비자 만료','trapper'),('서류 폭풍','viper')],
  {'shield':'생활버디','heal':'심리상담','double':'AI 챗봇 24h','fuel':'비자 컨설팅','calm':'세무·법률 상담','tele':'경력개발','amplify':'네트워킹'},'반려',
  "const W=M.W,X=W*0.30; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.7); ST.place(3,W*0.75); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'shield'); ST.crate(X+300,'fuel');",
  [0,120,-120,1.7]),
 ('b02_salon','valley',[('Nguyen','swarm'),('박연구','rookie')],[('Ahmed','hammer'),('최연구','boulder')],
  {'double':'Career Salon','amplify':'네트워킹','calm':'통역 지원','shield':'글로벌 라운지'},'',
  "const W=M.W,X=W*0.62; ST.place(0,X-150); ST.place(1,X-40); ST.place(2,X+90); ST.place(3,X+200); [0,1].forEach(i=>ST.face(i,1)); [2,3].forEach(i=>ST.face(i,-1)); ST.clearCrates(); ST.crate(X+25,'double');",
  [0,170,-130,1.6]),
 ('b03_intern','snow',[('Kumar','prism'),('김멘토','kird')],[('취업 장벽','hammer'),('경력 공백','viper')],
  {'fuel':'K-STAR 인턴십','shield':'멘토비','double':'기업연구소','amplify':'경력 증명'},'',
  "const W=M.W,X=W*0.42; ST.place(0,X); ST.place(1,X-120); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+160,'fuel'); ST.crate(X+320,'amplify');",
  [0,140,-140,1.7]),
 ('b04_challenge','lava',[('A팀 기획','kird'),('A팀 실험','rookie'),('A팀 분석','hammer'),('A팀 발표','boulder')],[('B팀 기획','swarm'),('B팀 실험','prism'),('B팀 분석','viper'),('B팀 발표','rage')],
  {'double':'팀 협업','amplify':'전문가 멘토링','shield':'연구비 2,100만','fuel':'아이디어'},'마감',
  "const W=M.W; [0.38,0.41,0.44,0.47].forEach((f,i)=>{ST.place(i,W*f); ST.face(i,1)}); [0.55,0.58,0.61,0.64].forEach((f,i)=>{ST.place(4+i,W*f); ST.face(4+i,-1)}); ST.clearCrates(); ST.crate(W*0.51,'shield');",
  [4,-230,-150,0.98]),
 ('b05_postdoc','snow',[('포닥 김','kird'),('포닥 이','rookie')],[('계약 만료','trapper'),('논문 압박','viper')],
  {'shield':'연구개발계획서','heal':'학습공동체','double':'경력개발 과정','amplify':'AI 활용','fuel':'Python 시각화'},'',
  "const W=M.W,X=W*0.55; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.9); ST.place(3,W*0.95); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'heal'); ST.crate(X+300,'amplify');",
  [0,140,-150,1.6]),
 ('b06_concert','campus',[('학부생 한','rookie'),('석사 정','kird')],[('진로 고민','trapper'),('막막함','viper')],
  {'amplify':'커리어 콘서트','fuel':'선배 연구자','shield':'역량진단','double':'멘토링'},'',
  "const W=M.W,X=W*0.47; ST.place(0,X,0); ST.place(1,X+110,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+260,'amplify',0);",
  [0,180,-160,1.5]),
 ('b07_physci','temple',[('의대생 오','kird'),('치대생 문','prism')],[('실험 실패','hammer'),('시간 부족','viper')],
  {'double':'팀 프로젝트','amplify':'연구 멘토','shield':'연구계획','fuel':'실험실 체험'},'',
  "const W=M.W,X=W*0.47; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.9); ST.place(3,W*0.93); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+170,'double');",
  [0,150,-140,1.7]),
 ('b08_iris','campus',[('김행정','kird'),('이책임','rookie')],[('서식 미로','trapper'),('로그인 오류','viper')],
  {'calm':'IRIS 맞춤형 교육','shield':'국가연구자번호','fuel':'통합 콜센터','double':'과제지원','amplify':'연구비관리'},'반려',
  "const W=M.W,X=W*0.18; ST.place(0,X,0); ST.place(1,X-110,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'calm',0); ST.crate(X+290,'shield',0);",
  [0,170,-200,1.4]),
 ('b09_ai','valley',[('김연구','kird'),('AI 조수','prism')],[('환각','trapper'),('데이터 유출','viper')],
  {'amplify':'실전형 AI 교육','shield':'출처 검증','calm':'AI 튜터','double':'머신러닝 실습','fuel':'연구윤리 가이드'},'환각',
  "const W=M.W,X=W*0.47; ST.place(0,X); ST.place(1,X+110); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,-1); ST.clearCrates(); ST.crate(X-160,'amplify'); ST.column('tornado', X+380, 3);",
  [0,180,-160,1.5]),
 ('b10_space','moon',[('김우주','kird'),('이위성','prism')],[('궤도 이탈','swarm'),('통신 두절','viper')],
  {'amplify':'우주 분야 교육','shield':'궤도 계산','fuel':'발사체','calm':'관제'},'',
  "const W=M.W,X=W*0.31; ST.place(0,X); ST.place(1,X+110); ST.place(2,W*0.67); ST.place(3,W*0.72); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+260,'amplify');",
  [0,200,-150,1.5]),
 ('b11_quantum','moon',[('김양자','kird'),('이큐비트','rookie')],[('결맞음 붕괴','trapper'),('노이즈','viper')],
  {'amplify':'양자 분야 교육','shield':'오류 정정','fuel':'얽힘','calm':'극저온'},'',
  "const W=M.W,X=W*0.66; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.3); ST.place(3,W*0.25); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+160,'shield'); ST.column('pillar', X+420, 3);",
  [0,240,-170,1.45]),
 ('b12_ocean','songdae',[('김해양','kird'),('박원자력','hammer')],[('해류 변화','swarm'),('안전 점검','boulder')],
  {'amplify':'첨단해양','shield':'차세대 원자력','fuel':'해양 탐사','calm':'안전 교육'},'',
  "const W=M.W,X=W*0.55; ST.place(0,X,0); ST.place(1,X+100,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,-1); ST.clearCrates(); ST.crate(X-150,'amplify',0);",
  [0,40,-170,1.4]),
 ('b13_agency','valley',[('전문기관 김','kird'),('평가위원 이','boulder')],[('평가 지연','hammer'),('민원 폭주','viper')],
  {'shield':'R&D 기획','double':'과제관리·평가','amplify':'성과관리','fuel':'IRIS 활용','calm':'신임자 과정'},'민원',
  "const W=M.W,X=W*0.2; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.7); ST.place(3,W*0.75); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'shield'); ST.crate(X+300,'double'); ST.crate(X+450,'amplify');",
  [0,230,-150,1.45]),
 ('b14_rookie','campus',[('신입 김','kird'),('신입 이','rookie'),('신입 박','swarm')],[('업무 폭탄','hammer'),('낯선 용어','viper')],
  {'shield':'신임자 과정','double':'신진 연구원','amplify':'신진 행정원','fuel':'R&D 전주기'},'',
  "const W=M.W,X=W*0.62; ST.place(0,X,0); ST.place(1,X-95,0); ST.place(2,X-190,0); ST.place(3,W*0.9); ST.place(4,W*0.95); [0,1,2].forEach(i=>ST.face(i,1)); ST.clearCrates(); ST.crate(X+150,'shield',0); ST.crate(X+290,'double',0);",
  [0,60,-180,1.55]),
 ('b15_policy','temple',[('정책 김','kird'),('기획 이','boulder')],[('지역 격차','hammer'),('예산 부족','viper')],
  {'amplify':'정책기획 역량','shield':'지역 과학기술','double':'데이터 분석','fuel':'현장 의견'},'',
  "const W=M.W,X=W*0.1; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.9); ST.place(3,W*0.93); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+170,'amplify');",
  [0,200,-180,1.4]),
 ('b16_pds','temple',[('김연구','kird'),('이연구','rookie')],[('계획 부실','hammer'),('성과 미흡','viper')],
  {'fuel':'Plan','double':'Do','amplify':'See','shield':'All about R&D'},'',
  "const W=M.W; ST.place(0,W*0.135); ST.place(1,W*0.115); ST.place(2,W*0.9); ST.place(3,W*0.93); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(W*0.17,'fuel'); ST.crate(W*0.22,'double'); ST.crate(W*0.3,'amplify');",
  [0,430,-80,1.15]),
 ('b17_abroad','snow',[('김연구','kird'),('이연구','prism')],[('언어 장벽','hammer'),('시차','viper')],
  {'amplify':'Hannover Messe','tele':'ARMA 2026','double':'EIC Summit','shield':'ARMS','fuel':'제네바 포럼'},'',
  "const W=M.W,X=W*0.3; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+160,'tele'); ST.crate(X+330,'amplify');",
  [0,200,-170,1.5]),
 ('b18_security','snow',[('보안 김','kird'),('보안 이','boulder')],[('기술 유출','trapper'),('해킹 시도','viper')],
  {'shield':'보안서약서','calm':'보안교육','fuel':'즉시 보고','double':'민감과제 분류','amplify':'연구보안'},'유출',
  "const W=M.W,X=W*0.205; ST.place(0,X-90); ST.place(1,X-200); ST.place(2,X+260); ST.place(3,X+380); ST.face(0,1); ST.face(1,1); ST.face(2,-1); ST.face(3,-1); ST.clearCrates(); ST.crate(X-300,'shield');",
  [0,190,-170,1.45]),
 ('b19_leader','temple',[('팀장 김','kird'),('팀원 이','rookie'),('팀원 박','swarm')],[('갈등','hammer'),('번아웃','viper')],
  {'amplify':'비전 공유','shield':'코칭','double':'권한위임','fuel':'의사결정'},'',
  "const W=M.W,X=W*0.07; ST.place(0,X); ST.place(1,X-100); ST.place(2,X-200); ST.place(3,W*0.9); ST.place(4,W*0.93); [0,1,2].forEach(i=>ST.face(i,1)); ST.clearCrates(); ST.crate(X+140,'shield');",
  [0,120,-200,1.5]),
 ('b20_consult','temple',[('컨설턴트 김','kird'),('중소기업 이','hammer')],[('인력 이탈','trapper'),('교육 공백','viper')],
  {'amplify':'인재개발 컨설팅','shield':'경력개발 체계','double':'교육훈련 체계','fuel':'진단'},'',
  "const W=M.W,X=W*0.5; ST.place(0,X); ST.place(1,X+110); ST.place(2,W*0.9); ST.place(3,W*0.93); ST.face(0,1); ST.face(1,-1); ST.clearCrates(); ST.crate(X-170,'amplify'); ST.crate(X+260,'double');",
  [0,40,-170,1.6]),
 ('b21_strategy','campus',[('김연구','kird'),('이관리','rookie')],[('흩어진 지원','trapper'),('제도 혼선','viper')],
  {'calm':'제도 설명회','double':'연구자 교류회','shield':'연구관리자 교류회','amplify':'연구계획서 워크숍','fuel':'홍보 콘텐츠'},'',
  "const W=M.W,X=W*0.47; ST.place(0,X,0); ST.place(1,X-110,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'calm',0); ST.crate(X+340,'double',0); ST.crate(X+540,'amplify',0);",
  [0,220,-170,1.45]),
 ('b22_recruit','campus',[('지원자 A','kird'),('지원자 B','rookie')],[('면접 긴장','trapper'),('정보 부족','viper')],
  {'calm':'직무 소개','double':'선배 직원 Q&A','shield':'채용 안내','amplify':'캠퍼스 투어'},'',
  "const W=M.W,X=W*0.18; ST.place(0,X,0); ST.place(1,X-110,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'calm',0); ST.crate(X+290,'double',0);",
  [0,170,-200,1.4]),
 ('b23_culture','songdae',[('경영지원팀','kird'),('교육운영팀','hammer')],[('사업기획팀','swarm'),('대외협력팀','prism')],
  {'double':'협업','amplify':'칭찬 릴레이','shield':'소통','heal':'워라밸','fuel':'아이디어'},'',
  "const W=M.W,X=W*0.42; ST.place(0,X); ST.place(1,X-110); ST.place(2,X+260); ST.place(3,X+370); ST.face(0,1); ST.face(1,1); ST.face(2,-1); ST.face(3,-1); ST.clearCrates(); ST.crate(X+130,'double');",
  [0,260,-170,1.2]),
 ('b24_vision','temple',[('PACEMAKER','kird'),('NAVIGATOR','prism')],[('저출생·고령화','hammer'),('디지털 격차','viper')],
  {'amplify':'PACEMAKER','fuel':'NAVIGATOR','double':'PLATFORM','tele':'GLOBAL','heal':'PARTNER'},'',
  "const W=M.W,X=W*0.3; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'amplify'); ST.crate(X+300,'double');",
  [0,200,-180,1.45]),
 ('b25_badge','campus',[('김연구','kird'),('이행정','rookie')],[('흩어진 이력','trapper'),('동기 저하','viper')],
  {'calm':'역량진단','fuel':'학습로드맵','amplify':'디지털 배지','shield':'배지 지갑','double':'교육탐색'},'',
  "const W=M.W,X=W*0.3; ST.place(0,X,0); ST.place(1,X-110,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'calm',0); ST.crate(X+300,'fuel',0); ST.crate(X+450,'amplify',0);",
  [0,220,-190,1.4]),
 ('b26_tutor','valley',[('수강생 김','kird'),('AI 튜터','prism')],[('막히는 실습','hammer'),('잊히는 복습','viper')],
  {'calm':'AI 튜터','shield':'24시간 Q&A','double':'실습 코치','fuel':'복습 퀴즈','amplify':'자료 요약'},'',
  "const W=M.W,X=W*0.55; ST.place(0,X); ST.place(1,X+110); ST.place(2,W*0.88); ST.place(3,W*0.93); ST.face(0,1); ST.face(1,-1); ST.clearCrates(); ST.crate(X-160,'calm'); ST.crate(X-320,'fuel');",
  [0,120,-170,1.5]),
 ('b27_officer','campus',[('신임관리자 A','kird'),('신임관리자 B','rookie'),('신임관리자 C','swarm')],[('낯선 R&D','hammer'),('정책 미로','viper')],
  {'shield':'R&D 정책','double':'선배 멘토','amplify':'현장 시찰','fuel':'팀 과제'},'',
  "const W=M.W,X=W*0.6; ST.place(0,X,0); ST.place(1,X-95,0); ST.place(2,X-190,0); ST.place(3,W*0.9); ST.place(4,W*0.95); [0,1,2].forEach(i=>ST.face(i,1)); ST.clearCrates(); ST.crate(X+150,'shield',0); ST.crate(X+290,'amplify',0);",
  [0,60,-180,1.5]),
 ('b28_rise','temple',[('학부생 A','rookie'),('멘토 연구원','kird')],[('진로 안개','trapper'),('지역 이탈','viper')],
  {'amplify':'연구경력 탐색','double':'그룹 멘토링','fuel':'연구실 탐방','shield':'RISE 연계'},'',
  "const W=M.W,X=W*0.47; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.9); ST.place(3,W*0.93); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+170,'double'); ST.crate(X+330,'amplify');",
  [0,150,-150,1.6]),
 ('b29_inclusive','songdae',[('연구자 A','kird'),('연구자 B','prism')],[('높은 문턱','boulder'),('정보 장벽','viper')],
  {'amplify':'현장연구','double':'팀 프로젝트','fuel':'탐방 캠프','shield':'시·청각 콘텐츠','heal':'멘토링'},'',
  "const W=M.W,X=W*0.42; ST.place(0,X); ST.place(1,X-110); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+130,'double'); ST.crate(X+280,'shield');",
  [0,200,-170,1.3]),
 ('b30_social','valley',[('살롱 A','kird'),('러닝랩 B','rookie'),('포닥 C','swarm')],[('고립감','trapper'),('정체','viper')],
  {'double':'커리어 살롱','amplify':'러닝랩','heal':'학습공동체','calm':'네트워킹'},'',
  "const W=M.W,X=W*0.5; ST.place(0,X); ST.place(1,X-100); ST.place(2,X-200); ST.place(3,W*0.9); ST.place(4,W*0.94); [0,1,2].forEach(i=>ST.face(i,1)); ST.clearCrates(); ST.crate(X+150,'double'); ST.crate(X+300,'amplify');",
  [0,120,-170,1.5]),
 ('b31_hybrid','campus',[('재택 김','kird'),('거점 이','rookie')],[('출근 정체','hammer'),('소통 단절','viper')],
  {'calm':'하이브리드 근무','fuel':'자율 출퇴근','amplify':'아이디어 박스','double':'오픈 토크'},'',
  "const W=M.W,X=W*0.45; ST.place(0,X,0); ST.place(1,X-110,0); ST.place(2,W*0.85); ST.place(3,W*0.9); ST.face(0,1); ST.face(1,1); ST.clearCrates(); ST.crate(X+150,'calm',0); ST.crate(X+300,'amplify',0);",
  [0,200,-190,1.4]),
]
with sync_playwright() as pw:
  g = G(pw); meta = {}
  for sid, mid, red, blue, items, word, code, cam in SC:
    if ONLY and sid not in ONLY: continue
    try:
      g.start(mid, red, blue); stage(g)
      g.js("([mid,items,word])=>{const mm=__pg.CONFIG.maps[mid]; mm.items=items; if(word){mm.meteorLook={kind:'stamp',word}}}", [mid, items, word])
      g.js("()=>{const M=__pg.match; M.tanks.forEach(t=>{t.hp=t.maxhp}); " + code + "}")
      if word: g.js("()=>{const M=__pg.match,t=M.tanks[0]; ST.meteor(t.x+420, 0.9)}")
      g.p.add_style_tag(content=HIDE)
      if cam[0] is None: g.js("([fx,fy,z])=>{const m=__pg.match; ST.cam(m.W*fx, m.H*fy, z)}", cam[1:])
      else: g.js("([i,dx,dy,z])=>{const t=__pg.match.tanks[i]; ST.cam(t.x+dx,t.y+dy,z)}", cam)
      g.p.wait_for_timeout(1300); g.js("()=>{__pg.R.shake=0}")
      meta[sid] = g.js(ANCH); g.p.screenshot(path=OUT + sid + '.png'); print('cap', sid)
    except Exception: traceback.print_exc()
  old = {}
  try: old = json.load(open(OUT + 'meta.json'))
  except Exception: pass
  old.update(meta); json.dump(old, open(OUT + 'meta.json', 'w'), ensure_ascii=False, indent=1)
  print('ERR', g.errs[:3])
