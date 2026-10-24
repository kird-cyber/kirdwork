// ================================================================ 홍보관 전시 내용 (KIRD 공개 자료 기반 · 그림은 모두 직접 그린 레고·캐릭터풍)
function mhead(kind, title) { return `<div class="mh"><div><div class="mk">${kind}</div><h3>${title}</h3></div><button class="x" data-close aria-label="닫기">✕</button></div>`; }
const SRC25 = 'KIRD 2025 연차보고서(2025년 실적)', SRC26 = '2026 KIRD 교육프로그램 안내책자';
const TOWERS = {
  t_grad: { h: 9, c: '#8CC63F', big: '35.6만', label: '2025 수료생', title: '2025년 수료 355,911명', parts: [['2023', 333282, '#C5E1AC'], ['2024', 347680, '#A8D46F'], ['2025', 355911, '#6FAE2A']], note: '집합 33,310명 + 온라인 322,601명. 3년 연속 늘었어요. 집합교육 연인원은 44,136명.', src: SRC25 },
  t_course: { h: 7, c: '#2E86D6', big: '658개', label: '교육 과정', title: '2025년 교육 과정 658개', parts: [['집합', 365, '#2E86D6'], ['온라인', 293, '#8CC63F']], note: '집합교육 365개 과정을 736일 동안 운영했어요. 온라인은 293개 과정.', src: SRC25 },
  t_member: { h: 9, c: '#F2A23A', big: '88.8만', label: '알파캠퍼스 회원', title: '알파캠퍼스 누적 회원 888,424명', parts: [['2023', 765101, '#F7C98A'], ['2024', 825475, '#F2A23A'], ['2025', 888424, '#C77A12']], note: '2022년 문을 연 과학기술인 평생 학습플랫폼. 2025년 ‘역량개발 로드맵’과 네이버·카카오 간편 로그인, 전자책 연동을 더했어요.', src: SRC25 },
  t_kclub: { h: 6, c: '#2FA84F', big: '4.5만', label: 'K-클럽 회원', title: 'K-클럽 누적 회원 45,353명', parts: [['2023', 25066, '#A7DDB5'], ['2024', 31441, '#5CC27A'], ['2025', 45353, '#2FA84F']], note: '과학기술인 경력개발 플랫폼 K-클럽. 2년 만에 회원이 1.8배가 됐어요.', src: SRC25 },
  t_sat: { h: 8, c: '#E0533F', big: '4.69', label: '집합 만족도', title: '교육 만족도 (5점 만점)', parts: [['집합 2024', 4.71, '#F29A8C'], ['집합 2025', 4.69, '#E0533F'], ['이러닝 2024', 4.42, '#9CC8F0'], ['이러닝 2025', 4.50, '#2E86D6']], note: '집합교육은 3년째 4.7점 안팎, 이러닝은 4.35 → 4.42 → 4.50으로 해마다 올랐어요.', src: SRC25 },
  t_comp: { h: 6, c: '#7C5CE0', big: '36개', label: '역량 로드맵', title: '역량개발 로드맵 36개 역량', parts: [['핵심역량', 7, '#E0533F'], ['직무역량', 17, '#2E86D6'], ['리더십역량', 12, '#7C5CE0']], note: '2025년 알파캠퍼스에 문을 연 ‘역량개발 로드맵’. 경력단계(신진·중견·리더)와 직무(연구·연구관리·행정)를 고르면 역량별 교육과 지식콘텐츠·전자책이 한눈에 보여요.', src: SRC25 },
  t_field: { h: 5, c: '#13294B', big: '9개', label: '2026 교육 분야', title: '2026년 교육 분야 9개', list: ['청년 과학기술인 R&D 경력개발', '출연(연)·공공연구기관 기본교육', '정책입안·연구관리직 사업기획·관리', 'R&D 전문교육 (All about R&D)', 'R&D 법령·규정', '법정 필수 교육', '기타 KIRD 교육·사업 (AI·우주·양자)', '과학기술인 소양 및 트렌드', '중소기업 R&D 실무역량'], src: SRC26 },
  t_who: { h: 7, c: '#0EA5A4', big: '4개 무대', label: '누가 배웠나', title: '2025년 누가 배웠을까? (수료생 소속)', parts: [['출연(연)·공공', 187387, '#0EA5A4'], ['대학', 142536, '#2E86D6'], ['산업계', 17986, '#F2A23A'], ['기타', 8002, '#9AA6B8']], note: '직무로 보면 연구자 230,839명 · 연구관리자 28,754명 · 행정직 18,846명 · 기타 77,472명.', src: SRC25 },
};
const PODS = {
  ai: { n: 'AI', i: '🤖', c: '#4FC3F7', d: '2025년 ‘현업에 착 붙는’ AI 교육으로 새 단장. 파이썬 → 머신러닝·딥러닝 → 바이오·기계·화학 분야별 AI 적용까지 실습 중심으로 이어져요. 수료 후 <b>업무적용도 4.16점</b>, AI 활용 역량 <b>53.2% 향상</b>.' },
  semi: { n: '반도체', i: '🔲', c: '#8CC63F', d: '‘세계 최고 K-반도체를 꿈꾸다, 반도체·디스플레이’, ‘칩렛 AI 반도체’ 같은 온라인 과정으로 산업의 심장을 이해해요.' },
  cyber: { n: '사이버 보안', i: '🛡️', c: '#2FA84F', d: '연구 데이터와 기술을 지키는 힘. 2026년 연구보안 교육에는 ‘AI 기술과 연구보안’이 더해지고, 하반기 미국 연구보안 해외연수도 예정돼 있어요.' },
  space: { n: '우주', i: '🚀', c: '#E0533F', d: '우주산업 종사자를 위한 위성항법·발사체·위성통신·원격탐사·큐브위성·우주법 과정. ‘K-스페이스, 우주 시대가 온다’로 입문해요.' },
  quantum: { n: '양자', i: '⚛️', c: '#C084FC', d: '‘현대과학의 언어, 양자를 읽다’ — 양자컴퓨터·양자센싱·양자통신의 핵심 원리를 배워요.' },
  bio: { n: '첨단바이오', i: '🧬', c: '#F08BB4', d: '‘바이오 혁신의 길을 걷다, 첨단바이오’와 국가전략기술 지식 웨비나. 웨비나는 인공지능·첨단바이오·첨단로봇·첨단모빌리티·차세대 통신으로 이어져요.' },
  ocean: { n: '첨단해양', i: '🌊', c: '#2E86D6', d: '2025년 노르웨이·독일의 연구기관과 함께한 <b>한-유럽 첨단 해양모빌리티 글로벌 중·장기 연수</b>. 현지 공동연구가 국제학술지(SCI) 논문으로 이어졌어요.' },
};
const AWARDS = [
  { icon: '👵', c: '#E0533F', prize: '대상', t: '독거노인 낙상 탐지 119 신고·보호자 알림 시스템' },
  { icon: '🛴', c: '#2E86D6', prize: '최우수상', t: '전동킥보드 공유형 주차관리 플랫폼' },
  { icon: '💧', c: '#0EA5A4', prize: '우수상', t: '산업단지 폐수 염료 제거용 광촉매 복합필터' },
  { icon: '🩺', c: '#8CC63F', prize: '장애-비장애 학생팀 대상', t: '의료 취약지역 우울증 환자 원격진료 앱' },
  { icon: '🔥', c: '#F2A23A', prize: '포스터상(현장 투표)', t: '산불 조기 감시용 양자점 단적외선 센서' },
];
const MILESTONES = [
  { yr: '2007', t: '연구개발인력교육원으로 출발', d: '11월, 과학기술인 재교육 전문기관으로 문을 열었어요.', ill: 'seed' },
  { yr: '2010', t: '연구개발 전문교육기관 지정', d: '8월, 교육과학기술부가 연구개발 전문교육기관으로 지정했어요.', ill: 'school' },
  { yr: '2013', t: '출연(연) 재교육 전담기관 지정', d: '8월, 정부출연연구기관 연구자·행정인의 재교육을 전담하게 됐어요.', ill: 'school' },
  { yr: '2014', t: '국가과학기술인력개발원(KIRD)', d: '1월, 지금의 이름으로 바뀌었어요.', ill: 'sign' },
  { yr: '2015', t: '오창 청사 건립', d: '8월 충북 청주 오창에 새 보금자리. 같은 해 기술교육·재교육 실시기관, 재난안전 전문교육 실시기관으로도 지정됐어요.', ill: 'building' },
  { yr: '2019', t: '경력개발 지원체계 · ISO 21001', d: '10월 과학기술인 경력개발 지원체계를 만들고, 12월 교육기관경영시스템(ISO 21001) 인증을 받았어요.', ill: 'stairs' },
  { yr: '2021', t: '일하기 좋은 기관 · 대통령 표창', d: '대한민국 일하기 좋은 100대 기업 대상, Best HRD 최우수기관, 국가품질혁신상(인재개발 부문) 대통령 표창.', ill: 'medal' },
  { yr: '2022', t: '알파캠퍼스 오픈', d: '3월 온·오프라인 통합 교육시스템 알파캠퍼스를 열었어요. 11월 Best HRD 콘테스트 인사혁신처장상, 인권경영시스템 인증.', ill: 'screen' },
  { yr: '2023', t: '기관평가 전 분야 ‘우수’', d: '1월, 기관운영·연구사업 전 분야에서 ‘우수’ 등급을 받았어요.', ill: 'medal' },
  { yr: '2025', t: 'KIRD 미래비전 2050 선포', d: '9월, 2050년을 내다본 5대 미래역할과 핵심가치를 선포했어요. 6관에서 자세히 볼 수 있어요.', ill: 'vision' },
];
const ROLES = [
  { k: 'PACEMAKER', i: '⏱️', c: '#2E86D6', w: '저출생·고령화', t: '저출생·고령화 시대, 과학기술인의 PACEMAKER', li: ['미래를 여는 과학기술인재 유입·확보', '생애 전 주기 평생 현역 과학기술인 경력개발', '균형 발전을 위한 지역 산업-인재 상생 생태계 조성'] },
  { k: 'NAVIGATOR', i: '🧭', c: '#7C5CE0', w: 'AI·로봇', t: 'AI·로봇 시대 과학기술인 학습 NAVIGATOR', li: ['연구현장 AI·로봇과 공존하는 성장지원 체계', 'AI·로봇 활용 업무혁신 기반', 'Data-driven 혁신 체계'] },
  { k: 'PLATFORM', i: '🔗', c: '#2FA84F', w: '소통·연결', t: '사람과 경험을 이어주는 PLATFORM', li: ['과학기술 소통 플랫폼 “LinKIRD” 구축', '과학기술 분야 일자리·기술 매칭 Career Hub', '연구자 간 연결을 촉진하는 교류의 장'] },
  { k: 'GLOBAL', i: '🌏', c: '#E0533F', w: '글로벌 협력', t: '세계를 품은 인재를 잇는 GLOBAL KIRD', li: ['세계와 과학기술인을 잇는 글로벌 노드', '글로벌 역량 강화 체계', '글로벌 인재 유입 및 정착 지원'] },
  { k: 'PARTNER', i: '🤝', c: '#F2A23A', w: '디지털 격차·다양성', t: '다가치(多+Value) 함께하는 성장 PARTNER', li: ['디지털 격차 해소를 위한 학습지원 체계', '다문화 이음 체계', '장애가 장벽이 되지 않는 성장 지원'] },
];
const FEATS = [
  { no: '01', i: '🔭', t: '미래비전 2050 · 역할과 책임(R&R) 재정립', ill: 'vision', d: '창립 20년을 앞두고 2050년의 과학기술 인재 환경을 내다봤어요. 5대 미래역할, 15대 중점과제, 32개 세부과제를 정했고, 고객 264명이 R&R을 5점 만점에 <b>4.35점</b>으로 평가했어요.', pills: ['인플루언서 토크 영상 2편', '카드뉴스 ‘키알디 새로고침’ 52편'] },
  { no: '02', i: '📊', t: '이공계 대학원생 실태조사 · 박사후연구원 표준지침', ill: 'chart', d: '대학원생의 연구·생활 여건을 살피는 실태조사를 시범 실시(527명)하고 2027년 본조사를 준비해요. 박사후연구원이 안정적으로 연구할 수 있도록 <b>표준지침</b>도 만들고 있어요.', pills: ['시범조사 527명', '본조사 2027', '표준지침 2026 배포 목표'] },
  { no: '03', i: '🌐', t: '해외 우수인재 생활·경력 통합지원', ill: 'globe', d: '2025~2030년 6년 사업을 KIRD가 주관해요. 한국에 온 해외 연구자가 비자·세무·법률·심리 상담부터 경력개발까지 한 곳에서 도움을 받아요.', pills: ['24시간 AI 챗봇(카카오톡)', '생활 버디', '4대 과기원·UST 시범', '성과지표 42개'] },
  { no: '04', i: '🏅', t: 'KIRD 디지털 배지', ill: 'badge', d: '‘과정을 이수했다’가 아니라 ‘역량이 쌓였다’를 보여 주는 배지. 알파캠퍼스 마이페이지의 <b>배지 지갑</b>에서 모은 배지와 남은 배지를 한눈에 봐요.', pills: ['보상 · 인증 · 재미', '적층형 배지 체계', '배지 지갑(Wallet)'] },
  { no: '05', i: '🏛️', t: '제70기 신임관리자 과정', ill: 'team', d: '인사혁신처 신임관리자 <b>182명</b>이 과학기술 정책 현장을 배웠어요. 14개 부처 선배 23명이 멘토로 나섰고, 원자력·핵융합·항공우주 연구기관을 직접 둘러봤어요.', pills: ['2025.7.21~25', '182명', '선배 멘토 23명'] },
  { no: '06', i: '🎓', t: '이공계 대학생 연구경력 탐색 · 지역 혁신 인재', ill: 'stairs', d: '국가거점국립대 대학생 <b>190여 명</b>이 연구자의 길을 미리 탐색했어요(만족도 4.71점). 지역혁신중심 대학지원체계(RISE)와 이어지는 <b>지역 혁신 미래 인재 육성 지원 체계</b>도 24주 4단계로 설계했어요.', pills: ['그룹 멘토링', '연구실 탐방', '지·산·학·연 연계'] },
  { no: '07', i: '🏠', t: '일하는 방식 혁신 · 하이브리드 근무', ill: 'hybrid', d: '근무 유형 5가지를 고르는 하이브리드 근무, 자율 출퇴근 100%. 유연근무 만족도가 <b>4.64 → 4.94점</b>으로 올랐어요.', pills: ['디지털 아이디어 박스', '오픈 토크 데이', '사내 소식지 월간 내일'] },
];
const RESULTS = [
  ['🤖', '실전형 AI 교육', '업무적용도 4.16 · 역량 53.2%↑'], ['🧑‍🏫', '생성형 AI 튜터 시범', '만족도 4.54 · 실습 4.74 · 2027 전 과정'],
  ['🚢', '한-유럽 해양모빌리티 연수', '현지 공동연구 → SCI 논문'], ['🏢', '연구관리 전문기관 교육체계', '72개 기관 · 34개 역량요소'],
  ['🎥', '미래형 교수학습 · 바이플렉스', '아카이브 이용 6,751명(+478%)'], ['🗺️', '알파캠퍼스 역량개발 로드맵', '3대 역량군 36개 역량'],
  ['☕', '커리어 살롱 · 러닝랩', '살롱 102개 기관 181명 · 랩 77개 기관 136명'], ['♿', '포용성장(Barrier-free)', '출연(연) 현장연구 최대 6개월 · 시/청각 콘텐츠'],
  ['📐', '교육 성과평가 모델', '변화이론 기반 37개 지표'], ['💬', '업무 챗봇', '청렴 상담 · 규정 안내 · 지급 신청'],
];
const CARDS = [
  { c: '#13294B', h: '키알디 새로고침 #1', b: 'KIRD가 2050년을 그렸어요', s: '과학기술로 여는 내일,\n인재가 만드는 미래' },
  { c: '#2E86D6', h: '#2 PACEMAKER', b: '저출생·고령화 시대', s: '청년 유입부터 평생 현역까지\n과학기술인의 페이스메이커' },
  { c: '#7C5CE0', h: '#3 NAVIGATOR', b: 'AI·로봇 시대', s: 'AI와 함께 일하는 법,\nKIRD가 길을 안내해요' },
  { c: '#2FA84F', h: '#4 PLATFORM', b: '사람과 경험을 잇다', s: 'LinKIRD · Career Hub로\n연구자와 기회를 연결' },
  { c: '#E0533F', h: '#5 GLOBAL', b: '세계를 품은 인재', s: '해외 우수인재가 한국에서\n자리 잡도록 함께해요' },
  { c: '#F2A23A', h: '#6 PARTNER', b: '다가치(多+Value)', s: '디지털 격차·다문화·장애,\n누구도 뒤처지지 않게' },
  { c: '#0EA5A4', h: 'R&R #1', b: '역량강화 교육', s: '연구·행정·관리, 직책·직무별로\n필요한 역량을 키워요' },
  { c: '#1F6FB2', h: 'R&R #2', b: '경력성장 기회', s: '대학생부터 고경력까지\n경력 전 주기를 지원해요' },
  { c: '#5B6B82', h: 'R&R #3', b: '조사연구·정책지원', s: '실태조사와 연구로\n인재 정책의 근거를 만들어요' },
  { c: '#C99A1E', h: 'R&R #4', b: '소통·협력·교류', s: '기관과 사람, 국내와 해외를\n잇는 연결고리가 돼요' },
];
const QUIZ = {
  h1: { q: '2025년 9월 KIRD가 선포한 것은?', o: ['미래비전 2050', '비전 2030', '알파캠퍼스 2.0', 'KIRD 헌장'], a: 0 },
  h2: { q: '2025년 KIRD 교육을 수료한 사람은 약 몇 명?', o: ['약 3만 6천 명', '약 35만 6천 명', '약 356만 명', '약 3,560명'], a: 1 },
  h3: { q: 'KIRD가 그리는 학습 여정의 마지막 단계는?', o: ['교육탐색', '역량진단', '학습로드맵 설정', 'KIRD 디지털 배지'], a: 3 },
  h4: { q: 'KIRD가 2027년까지 전 과정에 적용하려는 것은?', o: ['종이 교재', '생성형 AI 튜터', '출석 도장', 'VR 헬멧'], a: 1 },
  h5: { q: '2026 KIRD 해외연수 중 ‘연구행정 선진화’ 연수가 열리는 나라는?', o: ['영국', '브라질', '이집트', '캐나다'], a: 0 },
  h6: { q: 'KIRD 미래비전 2050의 5대 미래역할이 아닌 것은?', o: ['PACEMAKER', 'NAVIGATOR', 'PLATFORM', 'TERMINATOR'], a: 3 },
  h7: { q: '2025년 제70기 신임관리자 과정에 참여한 인원은?', o: ['18명', '82명', '182명', '1,820명'], a: 2 },
  h8: { q: 'KIRD 교육은 어디에서 찾고 신청할까?', o: ['알파캠퍼스', '오픈마켓', '중고거래 앱', '우체국'], a: 0 },
};
const ABROAD = [
  ['🇩🇪', '기술사업화', '4월 · 독일', 'Hannover Messe 2026'], ['🇬🇧', '연구행정 선진화', '6월 · 영국', 'ARMA 2026'],
  ['🇧🇪', '국제공동연구', '6월 · 벨기에·독일', 'EIC Summit 2026'], ['🇦🇹', '지역 R&D', '9월 · 오스트리아 등', '지역 혁신 현장'],
  ['🇦🇺', '연구관리 스킬업', '9월 · 호주', 'ARMS Conference'], ['🇨🇭', '글로벌 R&D 협력', '10월 · 스위스·프랑스', 'Geneva Science & Diplomacy Forum'],
  ['🇪🇺', '연구관리 전문기관', '하반기 · 유럽', '연구관리 선진사례'], ['🇺🇸', '연구보안', '하반기 · 미국', '연구보안 체계'],
];
// ---------------------------------------------------------------- 그림판 (모달 안 캔버스 일러스트)
function illus(g, kind, W, H, t) {
  t = t || 0; g.save(); g.clearRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#DFF0FF'); bg.addColorStop(1, '#F6FBFF'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#B7E07A'; g.fillRect(0, H - 50, W, 50); for (let x = 0; x < W; x += 40) brick(g, x, H - 50, 40, 12, '#8CC63F', true);
  const cx = W / 2, gy = H - 62, bob = Math.sin(t * 4) * 3;
  const C = ['#E0533F', '#2E86D6', '#FFD24A', '#8CC63F', '#7C5CE0', '#F2A23A'];
  switch (kind) {
    case 'seed': { const h = Math.min(1, t / 2); g.fillStyle = '#6E5236'; g.fillRect(cx - 50, gy - 6, 100, 18); g.strokeStyle = '#2FA84F'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx, gy); g.lineTo(cx, gy - 120 * h); g.stroke(); g.fillStyle = '#8CC63F'; g.beginPath(); g.ellipse(cx - 26, gy - 110 * h, 26 * h, 12 * h, -0.5, 0, 7); g.ellipse(cx + 26, gy - 120 * h, 26 * h, 12 * h, 0.5, 0, 7); g.fill(); chibi(g, cx - 140, gy - 10 + bob, 'blue', { s: 1.4 }); chibi(g, cx + 140, gy - 10 - bob, 'green', { s: 1.4, flip: true }); break; }
    case 'school': case 'building': { const n = kind === 'school' ? 4 : 7; for (let r = 0; r < n; r++) for (let c = 0; c < 5; c++) brick(g, cx - 130 + c * 52, gy - 24 - r * 24, 52, 24, r === n - 1 ? '#2E86D6' : (c + r) % 2 ? '#F4F6FA' : '#DCE3EC', r === n - 1); for (let r = 0; r < n - 1; r++) for (let c = 0; c < 5; c++) { g.fillStyle = '#7FD3FF'; g.fillRect(cx - 120 + c * 52, gy - 40 - r * 24, 18, 10); } g.drawImage(HIMG.logo, cx - 70, gy - 24 * n - 60, 140, 41); legoFig(g, cx - 190, gy + 4, '#E0533F', 1.6); legoFig(g, cx + 200, gy + 4, '#2E86D6', 1.6); break; }
    case 'sign': { brick(g, cx - 150, gy - 120, 300, 90, '#fff', true); g.drawImage(HIMG.logo, cx - 130, gy - 112, 260, 77); g.fillStyle = '#5B6B82'; g.fillRect(cx - 120, gy - 30, 14, 30); g.fillRect(cx + 106, gy - 30, 14, 30); chibi(g, cx - 200, gy - 10 + bob, 'blue', { s: 1.3 }); chibi(g, cx + 200, gy - 10 - bob, 'green', { s: 1.3, flip: true }); break; }
    case 'stairs': { for (let k = 0; k < 3; k++) { for (let r = 0; r <= k; r++) brick(g, cx - 160 + k * 110, gy - 24 - r * 28, 100, 28, ['#8CC63F', '#2E86D6', '#7C5CE0'][k], r === k); g.fillStyle = OL; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText(['신진', '중견', '리더'][k], cx - 110 + k * 110, gy + 30); } const p = (t * .35) % 1, k = Math.min(2, Math.floor(p * 3)); chibi(g, cx - 110 + k * 110, gy - 50 - k * 28 + bob, 'blue', { s: 1.1 }); break; }
    case 'screen': { brick(g, cx - 170, gy - 190, 340, 170, '#13294B', false); g.fillStyle = '#0B1220'; g.fillRect(cx - 156, gy - 178, 312, 146); const p = (t * .3) % 1; g.fillStyle = '#2E86D6'; g.fillRect(cx - 150, gy - 60, 300 * p, 10); g.fillStyle = '#fff'; g.font = `900 26px ${FONT}`; g.textAlign = 'center'; g.fillText('ALPHA CAMPUS', cx, gy - 120); g.font = `800 14px ${FONT}`; g.fillText('언제 어디서나 · 온라인 + 집합', cx, gy - 92); brick(g, cx - 30, gy - 20, 60, 20, '#5B6B82'); chibi(g, cx - 230, gy - 6 + bob, 'green', { s: 1.2 }); chibi(g, cx + 230, gy - 6 - bob, 'blue', { s: 1.2, flip: true }); break; }
    case 'ci': { g.drawImage(HIMG.logo, cx - 200, 40, 400, 118); g.fillStyle = OL; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText('사람 인(人) + 새로 돋는 새순 = 교육으로 자라는 인재', cx, 200); break; }
    case 'battery': { const lv = (t * .4) % 1; g.fillStyle = '#13294B'; g.beginPath(); g.roundRect(cx - 110, gy - 170, 220, 150, 18); g.fill(); g.fillStyle = '#5B6B82'; g.fillRect(cx + 110, gy - 115, 18, 40); for (let k = 0; k < 4; k++) if (lv > k / 4) brick(g, cx - 92 + k * 48, gy - 150, 40, 110, '#8CC63F', false); g.fillStyle = '#FFD24A'; g.font = `900 40px ${FONT}`; g.textAlign = 'center'; g.fillText('⚡', cx, gy - 80); chibi(g, cx - 210, gy - 10 + bob, 'blue', { s: 1.3 }); g.fillStyle = OL; g.font = `900 20px ${FONT}`; g.fillText('K-클럽 커리어 충전소', cx, 40); break; }
    case 'globe': { const R = 90; g.fillStyle = '#2E86D6'; g.beginPath(); g.arc(cx, gy - 110, R, 0, 7); g.fill(); g.save(); g.beginPath(); g.arc(cx, gy - 110, R, 0, 7); g.clip(); g.fillStyle = '#8CC63F'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(cx - R + ((k * 60 + t * 40) % (R * 3)), gy - 150 + k * 18, 30, 16, k, 0, 7); g.fill(); } g.restore(); for (let k = 0; k < 5; k++) { const a = t + k * 1.26; chibi(g, cx + Math.cos(a) * 190, gy - 30 + Math.sin(a) * 18, ['blue', 'green', 'orange', 'purple', 'teal'][k], { s: .9 }); } break; }
    case 'team': { brick(g, cx - 120, gy - 40, 240, 40, '#C08A52', true); for (let k = 0; k < 4; k++) chibi(g, cx - 150 + k * 100, gy - 70 + (k % 2 ? bob : -bob), ['blue', 'green', 'orange', 'purple'][k], { s: 1 }); brick(g, cx - 60, gy - 160, 120, 70, '#fff', false); g.fillStyle = OL; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText('연구제안서', cx, gy - 120); break; }
    case 'strategy': { const bx = [cx - 220, cx - 40, cx + 140]; ['과제 중심(PBS)', '단계적 폐지', '전략연구사업'].forEach((s, k) => { brick(g, bx[k], gy - 140, 120, 70, ['#9AA6B8', '#F2A23A', '#7C5CE0'][k], true); g.fillStyle = '#fff'; g.font = `900 15px ${FONT}`; g.textAlign = 'center'; g.fillText(s, bx[k] + 60, gy - 100); }); g.fillStyle = OL; g.font = `900 30px ${FONT}`; g.fillText('➜', cx - 68, gy - 98); g.fillText('➜', cx + 112, gy - 98); legoFig(g, cx + 200, gy + 4, '#7C5CE0', 1.6); break; }
    case 'chair': { for (let k = 0; k < 5; k++) { brick(g, cx - 230 + k * 92, gy - 30, 80, 30, '#C08A52', true); legoFig(g, cx - 190 + k * 92, gy - 38, C[k], 1.8); } g.fillStyle = OL; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText('자문 · 특강 · 콘텐츠 개발', cx, 50); break; }
    case 'medal': { for (let k = 0; k < 3; k++) { const x = cx - 150 + k * 150, y = gy - 120 + (k === 1 ? -20 : 0); g.fillStyle = ['#E0533F', '#2E86D6', '#8CC63F'][k]; g.fillRect(x - 14, y - 70, 28, 50); g.fillStyle = '#FFD24A'; g.beginPath(); g.arc(x, y, 40 + (k === 1 ? 8 : 0), 0, 7); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke(); g.fillStyle = OL; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', x, y + Math.sin(t * 3 + k) * 3); } chibi(g, cx - 250, gy - 6 + bob, 'blue', { s: 1.2 }); chibi(g, cx + 250, gy - 6 - bob, 'green', { s: 1.2, flip: true }); break; }
    case 'vision': { g.fillStyle = '#13294B'; g.fillRect(0, 0, W, H - 50); g.fillStyle = 'rgba(255,224,122,.8)'; for (let k = 0; k < 50; k++) g.fillRect((k * 131) % W, (k * 71) % (H - 60), 2, 2); ROLES.forEach((R, k) => { const a = -Math.PI / 2 + k * Math.PI * 2 / 5 + t * .25, x = cx + Math.cos(a) * 120, y = 140 + Math.sin(a) * 90; g.fillStyle = R.c; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff'; g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(R.i, x, y); g.font = `900 11px ${FONT}`; g.fillText(R.k, x, y + 44); }); g.fillStyle = '#FFE07A'; g.font = `900 34px "Black Han Sans", ${FONT}`; g.fillText('2050', cx, 140); chibi(g, cx - 250, gy - 6 + bob, 'blue', { s: 1.2 }); chibi(g, cx + 250, gy - 6 - bob, 'green', { s: 1.2, flip: true }); break; }
    case 'chart': { const v = [3.2, 3.6, 3.9, 4.3]; v.forEach((n, k) => { const h = Math.min(1, t / 1.5) * n * 34; for (let r = 0; r < h / 24; r++) brick(g, cx - 160 + k * 90, gy - 24 - r * 24, 64, 24, ['#2E86D6', '#8CC63F', '#F2A23A', '#7C5CE0'][k], r >= h / 24 - 1); }); g.fillStyle = OL; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.fillText('실태조사 · 표준지침', cx, 40); legoFig(g, cx + 230, gy + 4, '#2E86D6', 1.7); break; }
    case 'badge': { const n = Math.min(6, Math.floor(t * 2) + 1); for (let k = 0; k < 6; k++) { const x = cx - 200 + (k % 3) * 200 * .66 + 70, y = 100 + Math.floor(k / 3) * 110; g.fillStyle = k < n ? C[k] : '#DCE3EC'; g.beginPath(); for (let q = 0; q < 6; q++) { const a = q * Math.PI / 3 + Math.PI / 6; g.lineTo(x + Math.cos(a) * 42, y + Math.sin(a) * 42); } g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke(); g.fillStyle = '#fff'; g.font = `900 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k < n ? '★' : '?', x, y); } chibi(g, cx + 240, gy - 6 + bob, 'blue', { s: 1.3, flip: true }); break; }
    case 'hybrid': { brick(g, cx - 250, gy - 120, 180, 110, '#F4F6FA', true); g.fillStyle = '#7FD3FF'; g.fillRect(cx - 230, gy - 100, 50, 30); g.fillRect(cx - 160, gy - 100, 50, 30); g.fillStyle = OL; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText('사무실', cx - 160, gy + 20); g.fillStyle = '#C08A52'; g.beginPath(); g.moveTo(cx + 70, gy - 70); g.lineTo(cx + 160, gy - 140); g.lineTo(cx + 250, gy - 70); g.fill(); brick(g, cx + 90, gy - 70, 140, 60, '#FFF7EE', false); g.fillStyle = OL; g.fillText('집 · 거점', cx + 160, gy + 20); const p = (Math.sin(t * 1.2) + 1) / 2; chibi(g, cx - 120 + p * 240, gy - 10 + bob, 'green', { s: 1.2, flip: Math.cos(t * 1.2) < 0 }); break; }
    case 'tutor': { brick(g, cx - 170, gy - 200, 340, 180, '#13294B', false); g.fillStyle = '#0B1220'; g.fillRect(cx - 156, gy - 188, 312, 156); const L = ['Q. 학생인건비 기준이 궁금해요', 'A. 혁신법 기준으로 정리해 줄게요 ✓', 'Q. 이 데이터에 맞는 알고리즘은?', 'A. 예제로 같이 실습해 봐요 ✓']; const n = Math.min(4, Math.floor(t * 1.2) + 1); for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? '#2E86D6' : '#5B6B82'; g.beginPath(); g.roundRect(k % 2 ? cx - 60 : cx - 146, gy - 178 + k * 36, 200, 28, 8); g.fill(); g.fillStyle = '#fff'; g.font = `800 12px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(L[k], (k % 2 ? cx - 52 : cx - 138), gy - 164 + k * 36); } chibi(g, cx - 240, gy - 6 + bob, 'blue', { s: 1.2 }); g.fillStyle = '#4FC3F7'; g.beginPath(); g.arc(cx + 240, gy - 60 + bob, 34, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; g.fillText('🤖', cx + 240, gy - 58 + bob); break; }
    case 'journey': { const S = ['교육탐색', '역량진단', '학습로드맵', '학습', '디지털 배지']; S.forEach((s, k) => { const x = cx - 240 + k * 120, y = gy - 40 - k * 26; brick(g, x - 46, y, 92, 26, ['#2E86D6', '#0EA5A4', '#8CC63F', '#F2A23A', '#E0533F'][k], true); g.fillStyle = OL; g.font = `900 13px ${FONT}`; g.textAlign = 'center'; g.fillText(s, x, y + 46); }); const p = (t * .3) % 1, k = Math.min(4, Math.floor(p * 5)); chibi(g, cx - 240 + k * 120, gy - 66 - k * 26 + bob, 'green', { s: 1 }); g.fillStyle = OL; g.font = `900 18px ${FONT}`; g.fillText('배움에서 성취까지, R&D 인재의 성장 여정', cx, 36); break; }
    case 'map': { g.fillStyle = '#BFE3FF'; g.fillRect(0, 0, W, H - 50); g.fillStyle = '#8CC63F'; [[.2, .35, .13, .2], [.5, .3, .12, .2], [.65, .5, .2, .22], [.28, .72, .07, .14], [.85, .76, .08, .1]].forEach(([a, b, c, e]) => { g.beginPath(); g.ellipse(W * a, (H - 50) * b, W * c, (H - 50) * e, 0, 0, 7); g.fill(); }); [[.46, .24], [.49, .28], [.52, .32], [.47, .36], [.53, .26], [.22, .3], [.86, .74], [.5, .4]].forEach(([a, b], k) => { if (t * 3 > k) { g.fillStyle = '#E0533F'; g.beginPath(); g.arc(W * a, (H - 50) * b, 7, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } }); const a = t * .6; g.fillStyle = '#fff'; g.font = `900 26px ${FONT}`; g.textAlign = 'center'; g.fillText('✈️', W * .78 - Math.cos(a) * 160, (H - 50) * .2 + Math.sin(a) * 30); break; }
    case 'cards': { CARDS.slice(0, 5).forEach((C2, k) => { const x = cx - 220 + k * 90, y = 60 + Math.sin(t * 2 + k) * 6; g.save(); g.translate(x + 60, y + 90); g.rotate((k - 2) * .08); g.fillStyle = C2.c; g.beginPath(); g.roundRect(-60, -90, 120, 170, 10); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.5; g.stroke(); g.fillStyle = '#fff'; g.font = `900 12px ${FONT}`; g.textAlign = 'center'; g.fillText(C2.h, 0, -60); g.font = `900 14px ${FONT}`; g.fillText(C2.b, 0, -20); g.restore(); }); break; }
    default: { const P = PODS[kind]; if (P) { g.fillStyle = '#1B1640'; g.fillRect(0, 0, W, H - 50); g.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 40; k++) g.fillRect((k * 97) % W, (k * 53) % (H - 60), 2, 2); g.fillStyle = '#fff'; g.font = `900 110px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.i, cx, H / 2 - 30 + bob); chibi(g, cx - 200, gy - 6, 'blue', { s: 1.2 }); legoFig(g, cx + 200, gy + 4, P.c, 1.8); } }
  }
  g.restore();
}
// ---------------------------------------------------------------- 전시 패널 (그림 + 설명)
function panel(kind, title, body, opt) {
  opt = opt || {};
  const b = openModal(mhead(opt.kicker || 'KIRD 홍보관', title) + `<canvas id="ilc" width="640" height="340" style="width:100%;border-radius:14px;border:2px solid var(--ink);display:block;background:#EAF4FF"></canvas><div class="q" style="margin-top:12px">${body}</div>${opt.extra || ''}<div class="row"><button class="btn" data-close>다음 전시 보러 가기</button></div>`, { wide: true });
  const c = b.querySelector('#ilc'), g = c.getContext('2d'); const t0 = performance.now(); const o = MODAL;
  (function loop() { if (MODAL !== o) return; illus(g, kind, 640, 340, (performance.now() - t0) / 1000); requestAnimationFrame(loop); })();
  visit(opt.id);
}
// ---------------------------------------------------------------- 영상 (움직이는 장면 + 자막)
function video(title, scenes, id) {
  const b = openModal(mhead('KIRD 홍보관 · 영상', title) + `<div class="mini"><canvas id="vc" width="640" height="360" style="width:100%;border-radius:14px;border:2px solid var(--ink);display:block"></canvas><div class="vcap" id="vcap"></div></div><div class="vbar"><i id="vprog"></i></div><div class="row"><button class="btn ghost" id="vplay">⏸ 일시정지</button><button class="btn ghost" id="vre">↺ 처음부터</button><button class="btn" data-close>닫기</button></div>`, { wide: true });
  const c = b.querySelector('#vc'), g = c.getContext('2d'), o = MODAL; const total = scenes.reduce((a, s) => a + s.d, 0); let t = 0, last = performance.now(), play = true;
  b.querySelector('#vplay').onclick = () => { play = !play; b.querySelector('#vplay').textContent = play ? '⏸ 일시정지' : '▶ 재생'; };
  b.querySelector('#vre').onclick = () => { t = 0; play = true; b.querySelector('#vplay').textContent = '⏸ 일시정지'; };
  (function loop(now) { if (MODAL !== o) return; const dt = Math.min(.05, ((now || performance.now()) - last) / 1000); last = now || performance.now(); if (play) t = Math.min(total, t + dt); let acc = 0; for (const s of scenes) { if (t <= acc + s.d || s === scenes[scenes.length - 1]) { const k = Math.min(1, (t - acc) / s.d); s.draw(g, 640, 360, t - acc, k); b.querySelector('#vcap').textContent = s.cap; break; } acc += s.d; } b.querySelector('#vprog').style.width = (t / total * 100) + '%'; if (t >= total && play) { play = false; b.querySelector('#vplay').textContent = '▶ 다시 보기'; t = total; } requestAnimationFrame(loop); })();
  visit(id);
}
function sceneBg(g, W, H, a, b) { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function bigText(g, s, x, y, size, col, k) { g.save(); g.globalAlpha = Math.min(1, k * 3); g.fillStyle = col || '#fff'; g.font = `900 ${size}px "Black Han Sans", ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y + (1 - Math.min(1, k * 3)) * 20); g.restore(); }
function countUp(n, k) { return Math.round(n * Math.min(1, k * 1.6)).toLocaleString('ko-KR'); }
const INTRO_SCENES = [
  { d: 4, cap: '과학기술로 여는 내일, 인재가 만드는 미래 — KIRD', draw(g, W, H, t, k) { sceneBg(g, W, H, '#1D3A6E', '#2E86D6'); for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect((i * 83 + t * 20) % W, (i * 47) % H, 2, 2); } if (HIMG.mascot.complete) { g.save(); g.globalAlpha = Math.min(1, k * 2); g.beginPath(); g.roundRect(W / 2 - 150, 40 + Math.sin(t * 3) * 6, 300, 200, 20); g.clip(); g.drawImage(HIMG.mascot, W / 2 - 150, 40 + Math.sin(t * 3) * 6, 300, 270); g.restore(); } bigText(g, '과학기술로 여는 내일', W / 2, 280, 34, '#fff', k); bigText(g, '인재가 만드는 미래', W / 2, 322, 26, '#FFE07A', k - .15); } },
  { d: 5, cap: '2007년 연구개발인력교육원으로 출발해 2014년 지금의 이름이 됐어요', draw(g, W, H, t, k) { sceneBg(g, W, H, '#EAF4FF', '#fff'); const n = Math.floor(k * 30); for (let i = 0; i < n; i++) brick(g, 170 + (i % 6) * 50, 300 - Math.floor(i / 6) * 26, 50, 26, ['#2E86D6', '#8CC63F', '#F4F6FA'][(i + Math.floor(i / 6)) % 3], i >= n - 6); bigText(g, '2007 → 2014 → 2025', W / 2, 60, 38, '#13294B', k); g.fillStyle = '#13294B'; g.font = `800 17px ${FONT}`; g.textAlign = 'center'; g.fillText('연구개발인력교육원 → 국가과학기술인력개발원 → 미래비전 2050', W / 2, 100); chibi(g, 80, 290, 'blue', { s: 1.4, bob: Math.sin(t * 6) * 4 }); } },
  { d: 5, cap: '2025년 한 해 658개 과정에서 355,911명이 배웠어요', draw(g, W, H, t, k) { sceneBg(g, W, H, '#FFF4E0', '#FFE7C2'); bigText(g, countUp(658, k) + '개 과정', W / 2, 110, 54, '#B5701A', k); bigText(g, countUp(355911, k) + '명 수료', W / 2, 200, 54, '#2E86D6', k - .1); for (let i = 0; i < 12; i++) chibi(g, 40 + i * 52, 310, Object.keys(CHAR)[i % 6], { s: .8, bob: Math.sin(t * 8 + i) * 4 }); } },
  { d: 5, cap: '알파캠퍼스 누적 회원 888,424명 · 집합교육 만족도 4.69점', draw(g, W, H, t, k) { illus(g, 'screen', W, H, t); bigText(g, '누적 회원 ' + countUp(888424, k) + '명', W / 2, 40, 28, '#13294B', k); } },
  { d: 5, cap: '교육탐색 → 역량진단 → 학습로드맵 → 학습 → 디지털 배지, 배움에서 성취까지', draw(g, W, H, t, k) { illus(g, 'journey', W, H, t); } },
  { d: 5, cap: '현업에 붙는 AI 교육과 24시간 곁을 지키는 생성형 AI 튜터', draw(g, W, H, t, k) { illus(g, 'tutor', W, H, t); } },
  { d: 6, cap: '미래비전 2050 — PACEMAKER · NAVIGATOR · PLATFORM · GLOBAL · PARTNER', draw(g, W, H, t, k) { illus(g, 'vision', W, H, t); } },
];
// ---------------------------------------------------------------- 방문 기록 · 스탬프
function visit(id) { if (!id) return; const S = STATE; S.seen = S.seen || {}; if (!S.seen[id]) { S.seen[id] = 1; saveHall(); } }
function saveHall() { try { localStorage.setItem('kh_state', JSON.stringify({ seen: STATE.seen, stamps: STATE.stamps, char: PL.col, best: STATE.brickBest, name: STATE.vname })); } catch (e) { } }
function loadHall() { try { const o = JSON.parse(localStorage.getItem('kh_state') || 'null'); if (o) { STATE.seen = o.seen || {}; STATE.stamps = o.stamps || {}; if (o.char) PL.col = o.char; STATE.brickBest = o.best || 0; STATE.vname = o.name || ''; } } catch (e) { } }
const HALLS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'];
function stampQuiz(hall) {
  const S = STATE, Q = QUIZ[hall], R = ROOMS[RID[hall]];
  if (S.stamps[hall]) { toast(`${R.inst} 스탬프는 이미 받았어요 ✓`); return; }
  const b = openModal(mhead(`${R.inst} · ${R.n}`, '스탬프 퀴즈') + `<p class="q">${Q.q}</p><div class="opts two">${Q.o.map((o, i) => `<button class="opt" data-i="${i}">${o}</button>`).join('')}</div><div class="feed" id="qf">이 전시실을 둘러보면 답이 보여요.</div>`);
  b.querySelectorAll('.opt').forEach(x => x.onclick = () => { const i = +x.dataset.i, f = b.querySelector('#qf');
    if (i === Q.a) { x.classList.add('right'); sfx('item'); S.stamps[hall] = 1; saveHall(); f.className = 'feed'; f.innerHTML = '정답! 쾅 — 스탬프 획득 🟥'; modalLater(() => { closeModal(); fxBurst(PL.x, PL.y, '#E0533F', 24); const n = HALLS.filter(h => S.stamps[h]).length; banner(`스탬프 ${n} / ${HALLS.length}`, n >= HALLS.length ? '모두 모았어요! 로비 안내 데스크에서 수료증을 받으세요' : `${R.inst} 완료`); }, 700); }
    else { x.classList.add('wrong'); x.disabled = true; sfx('bad'); f.className = 'feed bad'; f.textContent = '아쉬워요! 전시를 다시 보고 골라 보세요.'; } });
}
