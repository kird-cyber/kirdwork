// ================================================================ 홍보관 모드: 둘러보기 · 상호작용 · 미니게임 · 수료증
const MODES = {};
const HALL = {
  name: 'KIRD 홍보관', mapTitle: 'KIRD 홍보관 안내도', tasksUI: true, altLabel: '인사', keys: '이동 WASD·방향키 · 보기 E · 지도 M',
  doorOK() { return true; }, doorForce() { return true; }, lockColor() { return '#8A97AA'; },
  visR() { return 13; }, fogColor() { return 'rgba(8,12,26,.6)'; },
  init() {
    Object.assign(STATE, { mode: 'hall', t: 0, clock: 0, pen: 0, over: false, stamps: {}, seen: {}, brickBest: 0, vname: '' });
    Object.assign(PL, { x: 35.5, y: 43.6, a: -Math.PI / 2, col: 'blue', name: '나', speed: 4.6, gone: false, disguise: null, paint: null, frozen: false, step: 0, flip: false });
    loadHall(); HOLES.clear(); PUSH = []; DOORLIST.forEach(d => d.amt = 1);
    ENTS = ['green', 'orange', 'purple', 'pink', 'teal', 'blue', 'green'].map((c, k) => { const r = ROOMS[k % ROOMS.length]; const [x, y] = randFloor(r.id); return mkBot({ x, y, col: c, name: '', r: .3, npc: true, wait: rnd(0, 3), say: null, sayT: 0 }); });
    this.buildInter(); CAM.x = PL.x * T; CAM.y = PL.y * T;
  },
  intro() {
    const b = openModal(`<div class="win"><img src="${IMG_MASCOT}" alt="KIRD 캐릭터" style="width:min(320px,80%);border-radius:18px;border:3px solid var(--ink)"><h3>KIRD 홍보관에 오신 걸 환영해요!</h3><p>2026년 새 단장! 전시실 여덟 곳을 둘러보고 <b>스탬프 8개</b>를 모으면 로비 안내 데스크에서 <b>탐방 수료증</b>을 드려요. 그림·영상·체험이 곳곳에 숨어 있어요.</p><p style="margin-bottom:4px"><b>어떤 친구로 둘러볼까요?</b></p><div class="row" id="pick"><button class="btn" data-c="blue">파랑 친구</button><button class="btn ghost" data-c="green">초록 친구</button></div><p class="note">${COARSE ? '왼쪽 조이스틱으로 걷고, 노란 말풍선이 뜨면 오른쪽 버튼으로 봐요.' : 'WASD·방향키로 걷고, 노란 말풍선이 뜨면 E로 봐요. M은 지도.'}</p>${HOME_LINK}</div>`, { sticky: true });
    b.querySelectorAll('[data-c]').forEach(x => x.onclick = () => { PL.col = x.dataset.c; saveHall(); closeModal(); ac(); toast('로비 정면의 소개 영상부터 볼까요? 👀', 2600); });
  },
  buildInter() {
    INTER = []; const S = STATE;
    const add = (id, label, act, o) => { const d = decorById(id); INTER.push(Object.assign({ x: d.x + d.w / 2, y: d.y + d.h + 0.6, r: 1.8, label, act }, o || {})); };
    add('v_intro', '소개 영상 보기', () => video('KIRD 소개 영상', INTRO_SCENES, 'v_intro'), { y: 31.6, r: 2.6 });
    add('mascot', 'KIRD 캐릭터와 인사', () => mascotTalk());
    add('info', '안내 데스크', () => infoDesk(), { y: 42.4 });
    add('photo', '포토존 촬영', () => photoZone(), { y: 42.6, r: 2 });
    add('board', '스탬프 현황', () => infoDesk(), { x: 28.6, y: 34.5 });
    add('guest', '방명록 쓰기', () => guestbook(), { x: 43.4, y: 35 });
    const K1 = '1관 · KIRD 이야기';
    MILESTONES.forEach((m, i) => add('ms' + i, `${m.yr} 연혁 보기`, () => panel(m.ill, `${m.yr} · ${m.t}`, m.d, { kicker: K1, id: 'ms' + i }), { r: 1.3 }));
    add('ci', 'CI 이야기', () => panel('ci', '심벌마크에 담긴 뜻', '한글 자음 ‘人’, 한자 ‘사람 인(人)’의 모양에 새로 돋아나는 <b>새순</b>을 더했어요. 교육으로 자라고 변화하는 과학기술 인재를 뜻해요.', { kicker: K1, id: 'ci' }), { y: 31.8 });
    add('mission', '미션 · 비전', () => panel('school', 'KIRD는 왜 있을까?', '<b>미션</b> 변화를 선도하고 혁신을 창조하는 국가 과학기술 인재 양성<br><b>비전</b> 과학기술로 여는 내일, 인재가 만드는 미래<div style="margin-top:8px"><b>4대 역할(R&R)</b><br><span class="pill">과학기술인 역량강화 교육</span><span class="pill">경력성장 기회 제공</span><span class="pill">조사연구·정책지원</span><span class="pill">소통·협력·교류</span></div><small class="note">과학기술정보통신부 소관 공공기관 · 충북 청주 오창 본원과 대전교육센터</small>', { kicker: K1, id: 'mission' }), { y: 31.8 });
    add('org', '조직 · 예산', () => panel('building', '숫자로 보는 KIRD 살림', '<b>3본부 1센터 10실</b> — 경영전략본부 · 인재개발본부 · 인재교육본부 · 인재혁신센터<br>정규직 현원 <b>117명</b>(정원 121명, 2025년 12월)<br>2025년 예산 <b>304억 원</b> — 정부출연금 217억 · 수탁사업 66억 · 기타 22억<br>국내 협약(MOU) 기관 <b>64곳</b>과 해외 연구·교육기관이 함께해요.', { kicker: K1, id: 'org' }), { y: 31.8 });
    add('talent', '인재상', () => panel('team', 'KIRD가 그리는 미래 인재', '<span class="pill">미래 변화주도 혁신가</span><span class="pill">융합과 협력의 선도자</span><span class="pill">사회적 책임과 공익의 수호자</span><br><small class="note">미래비전 2050이 지향하는 미래 인재상</small>', { kicker: K1, id: 'talent' }), { x: 5.6, y: 33.5 });
    for (const id in TOWERS) add(id, '레고 탑 살펴보기', () => towerModal(id), { r: 1.9 });
    add('bricks', '블록 쌓기 게임', () => brickGame());
    ['stg0', 'stg1', 'stg2'].forEach((id, k) => { const d = decorById(id); INTER.push({ x: d.x + 2, y: d.y + 2, r: 2.2, label: `${STAGES[k].n} 단계 보기`, act: () => stageModal(k) }); });
    add('charger', '커리어 충전기', () => charger(), { r: 1.9 });
    add('kclub', 'K-클럽 플랫폼', () => panel('battery', 'K-클럽 · 과학기술인 경력개발 플랫폼', '누적 회원 <b>45,353명</b>(2025). 언제든 들러 경력을 충전하는 곳이에요.<div style="margin-top:8px"><span class="pill">경력진단</span><span class="pill">1:1 · 그룹 멘토링</span><span class="pill">경력 콘텐츠</span><span class="pill">커뮤니티</span><span class="pill">과학기술인 라운지 — 박사후 · 고경력 · 해외인력</span><span class="pill">채용정보</span><span class="pill">카카오톡 채널</span></div><small class="note">미래비전 2050은 이 연결을 ‘LinKIRD’ 소통 플랫폼과 일자리·기술 매칭 ‘Career Hub’로 넓혀 가요.</small>', { kicker: '3관 · 커리어 충전소', id: 'kclub' }), { y: 7.8 });
    add('journey', '학습 여정 체험', () => journeyGame(), { y: 23.6 });
    add('social', '소셜러닝', () => panel('team', '함께 배우는 소셜러닝', '<b>커리어 살롱</b> — 102개 기관 181명이 14개 모임에서 경력 고민을 나눴어요.<br><b>러닝랩</b> — 77개 기관 136명이 20개 랩에서 함께 연구 주제를 파고들었어요.<br><b>박사후연구원 학습공동체</b> — 관심 연구주제로 자발적 학습·교류.', { kicker: '3관 · 커리어 충전소', id: 'social' }), { x: 5.6, y: 13 });
    for (const k in PODS) add('pod_' + k, `${PODS[k].n} 전시 보기`, () => panel(k, `전략기술 · ${PODS[k].n}`, PODS[k].d + '<br><small class="note">2026 교육안내책자 ‘기타 KIRD 교육·사업’과 ‘과학기술인 소양 및 트렌드’ 과정 중에서.</small>', { kicker: '4관 · AI·전략기술 교육', id: 'pod_' + k }), { r: 2.2 });
    add('strategy', '전략연구사업 지원', () => panel('strategy', '전략연구사업, KIRD가 돕는다', '연구과제중심제도(PBS)를 단계적으로 없애며 출연연에 <b>임무 중심의 대형·중장기 ‘전략연구사업’</b>이 시작됐어요. KIRD는 현장이 새 제도에 적응하도록 돕습니다.<div style="margin-top:8px"><span class="pill">제도 설명회</span><span class="pill">연구자 · 연구관리자 교류회</span><span class="pill">연구계획서 작성 워크숍</span></div>', { kicker: '4관 · AI·전략기술 교육', id: 'strategy' }), { x: 29.5, y: 23.6 });
    add('aitutor', 'AI 튜터와 대화', () => tutorDemo(), { y: 23.6 });
    add('badge', '디지털 배지 지갑', () => badgeWallet(), { y: 23.6 });
    AWARDS.forEach((A, i) => add('aw' + i, '리얼챌린지 포스터', () => panel('team', `국가 R&D 리얼챌린지 · ${A.prize}`, `<b>${A.t}</b><br>이공계 대학(원)생 팀이 실제 국가 R&D처럼 연구를 기획하는 <b>국가 R&D 리얼챌린지</b>. R&D 교육·전문가 멘토링·기획비를 지원받아 사회문제 해결형 연구제안서를 써요. 2026년에도 ‘청년 과학기술인 R&D 경력개발 교육’으로 이어져요.`, { kicker: '5관 · 청년·글로벌 인재', id: 'aw' + i }), { y: 7.9, r: 1.6 }));
    add('globe', '해외 우수인재 정착', () => panel('globe', '세계의 연구자가 한국에서 자리 잡도록', '<b>해외 우수인재 생활·경력 통합지원</b> (2025~2030, KIRD 주관)<div style="margin-top:8px"><span class="pill">24시간 AI 챗봇(카카오톡)</span><span class="pill">생활 버디</span><span class="pill">비자 · 세무 · 법률 · 심리 컨설팅</span><span class="pill">경력개발 · 네트워킹</span><span class="pill">4대 과기원 · UST 시범</span></div><small class="note">K-클럽 ‘과학기술인 라운지’에도 해외인력 공간이 있어요.</small>', { kicker: '5관 · 청년·글로벌 인재', id: 'globe' }), { r: 2.6 });
    add('abroad', '2026 해외연수 지도', () => abroadModal(), { y: 14.6 });
    add('inclusive', '포용성장', () => panel('team', '장애가 장벽이 되지 않는 성장', '<b>포용성장 전문연구인력 양성사업</b><div style="margin-top:8px"><span class="pill">장애 대학원생 출연(연) 현장연구 (최대 6개월)</span><span class="pill">장애 대학생 현장 연구지원 · 인턴십</span><span class="pill">장애-비장애 학생 팀 프로젝트</span><span class="pill">연구기관 탐방 캠프</span><span class="pill">경력개발 멘토링</span><span class="pill">시각 · 청각 장애지원 온라인 콘텐츠</span></div>', { kicker: '5관 · 청년·글로벌 인재', id: 'inclusive' }), { x: 50.6, y: 9.5 });
    add('youth', '청년 경력 여정', () => panel('stairs', '청년 과학기술인 R&D 경력개발', '<b>대학생 · 연구경력의 첫걸음</b> — 연구경력 탐색 과정<br><b>대학원생 · 전문 연구자로의 성장</b> — 경력설계 과정, 국가 R&D 리얼챌린지, 커리어 콘서트<br><b>박사후연구원 · 차세대 리더로 도약</b> — 경력개발 과정, R&D 역량개발(연구계획서·데이터 분석·AI 시각화), 학습공동체<br><small class="note">온라인 R&D 수행역량 멘토링: Python · Matplotlib · Mendeley · LaTeX · ImageJ · Jamovi</small>', { kicker: '5관 · 청년·글로벌 인재', id: 'youth' }), { y: 20.8 });
    add('chair', '석좌교수', () => panel('chair', 'KIRD 석좌교수', '탁월한 연구 성과와 정책 경험을 가진 전문가가 후배 과학기술인에게 <b>자문·특강·콘텐츠 개발</b>로 경험을 나눠요.', { kicker: '5관 · 청년·글로벌 인재', id: 'chair' }), { y: 21.6 });
    const K6 = '6관 · 미래비전 2050';
    add('vision', '미래비전 2050', () => panel('vision', 'KIRD 미래비전 2050', '<b>과학기술로 여는 내일, 인재가 만드는 미래</b><br>2025년 9월 선포. 5대 미래역할 · 15대 중점과제 · 32개 세부과제로 2050년을 준비해요.<br><small class="note">비전 수립 과정은 외부 평가에서 ‘우수’를 받았어요.</small>', { kicker: K6, id: 'vision' }), { y: 61.2, r: 2.6 });
    ROLES.forEach((R, i) => add('role' + i, `${R.k} 보기`, () => panel('vision', `0${i + 1} · ${R.t}`, `<span class="pill" style="border-left:6px solid ${R.c}">${R.w}</span><ol style="margin:8px 0 0;padding-left:20px;line-height:1.8">${R.li.map(x => `<li>${x}</li>`).join('')}</ol>`, { kicker: K6 + ' · 5대 미래역할', id: 'role' + i }), { r: 1.7 }));
    add('values', '핵심가치', () => panel('team', 'KIRD 핵심가치', '<span class="pill">전문성</span><span class="pill">공감과 협력</span><span class="pill">도전과 혁신</span><span class="pill">고객성장</span><br>미래 인재상: 미래 변화주도 혁신가 · 융합과 협력의 선도자 · 사회적 책임과 공익의 수호자', { kicker: K6, id: 'values' }), { y: 59.6 });
    add('rr', '4대 역할(R&R)', () => panel('school', 'KIRD의 역할과 책임(R&R)', '<ol style="margin:0;padding-left:20px;line-height:1.9"><li><b>역량강화 교육</b> — 직책·직무별 맞춤 교육</li><li><b>경력성장 기회</b> — 대학생부터 고경력까지</li><li><b>조사연구·정책지원</b> — 실태조사와 인재 정책 근거</li><li><b>소통·협력·교류</b> — 기관·사람·세계를 잇기</li></ol><small class="note">고객 264명이 R&R을 5점 만점에 4.35점으로 평가했어요.</small>', { kicker: K6, id: 'rr' }), { y: 59.6 });
    add('v_vision', '미래비전 영상', () => video('미래비전 2050', VISION_SCENES, 'v_vision'), { y: 59.6 });
    FEATS.forEach((F, i) => add('feat' + i, `도전성과 ${F.no}`, () => panel(F.ill, `도전성과 ${F.no} · ${F.t}`, `${F.d}<div style="margin-top:8px">${F.pills.map(x => `<span class="pill">${x}</span>`).join('')}</div>`, { kicker: '7관 · 2025 도전성과 7선', id: 'feat' + i }), { r: 1.6 }));
    add('results', '주요성과 모아보기', () => resultsModal(), { y: 61.4 });
    add('cards', '카드뉴스 넘겨보기', () => cardNews(), { y: 50.6, r: 2.4 });
    add('v_talk', '토크 영상 보기', () => talkPick(), { y: 51.6 });
    add('news', '사내 소식 보기', () => panel('hybrid', '월간 내일 · 일하는 방식 혁신', 'KIRD 사람들의 소식을 전하는 <b>월간 내일</b>과 사내 방송, 누구나 아이디어를 내는 <b>디지털 아이디어 박스</b>(2025년 15건 제안), 경영진과 직원이 마주 앉는 <b>오픈 토크 데이</b>.<br>하이브리드 근무 5유형 · 자율 출퇴근 100% · 유연근무 만족도 4.94점.', { kicker: '8관 · 홍보 스튜디오', id: 'news' }), { y: 58.6 });
    add('wbl', '일하는 방식', () => panel('hybrid', '일과 삶이 함께 자라는 곳', '일하기 좋은 100대 기업 대상(2021), 가족친화인증 우수기관, 인권경영시스템 인증(2022). 2025년에는 하이브리드 근무와 업무 챗봇(청렴 상담·규정 안내·지급 신청)으로 일하는 방식을 바꿨어요.', { kicker: '8관 · 홍보 스튜디오', id: 'wbl' }), { x: 21.4, y: 51.5 });
    add('apply', '교육 신청 안내', () => applyDesk(), { y: 60.4 });
    for (const h of HALLS) { const d = decorById('st_' + h); INTER.push({ x: d.x + .5, y: d.y + .5, r: 1.5, label: '스탬프 퀴즈', act: () => stampQuiz(h) }); }
  },
  update(dt) {
    PL.step = PL.moving ? Math.sin(STATE.t * 14) : 0; const [ix] = inputVec(); if (ix) PL.flip = ix < 0;
    for (const e of ENTS) { if (e.say && (e.sayT -= dt) <= 0) e.say = null;
      if (e.wait > 0) { e.wait -= dt; e.step = 0; continue; }
      if (!e.path || !e.path.length) { if (e.goal) { e.goal = null; e.wait = rnd(2, 6); if (Math.random() < .5) { e.say = pick(NPCSAY); e.sayT = 3; } continue; } const it = pick(INTER); botGo(e, it.x + rnd(-1, 1), it.y + rnd(.2, 1)); continue; }
      const ox = e.x; botStep(e, dt, 2.4); e.flip = e.x < ox; e.step = Math.sin(STATE.t * 12 + e.x); }
  },
  drawEnt(e) { chibi(ctx, e.x * T, e.y * T - 6, e.col, { s: e === PL ? 1 : .9, flip: e.flip, step: e.step, bob: e.step ? Math.abs(Math.sin(STATE.t * 14)) * -3 : 0 }); if (e === PL) tag(STATE.vname || '나', e.x * T, e.y * T - 66, '#FFD24A', OL, 11); if (e.say) tag(e.say, e.x * T, e.y * T - 62, '#fff', OL, 12); },
  showEnt(e) { return canSee(e.x, e.y); },
  alt() { sfx('whistle'); PL.say = pick(['안녕하세요!', '반가워요 👋', 'KIRD 최고!']); fxText(PL.x, PL.y - .6, PL.say, '#fff'); },
  drawTop() {
    // 아직 안 본 전시 위 반짝이
    const t = STATE.t; for (const it of INTER) { const key = it.label; if (Math.hypot(it.x - PL.x, it.y - PL.y) > 13) continue; }
  },
  mapMarks(c, ox, oy, s) { for (const h of HALLS) { const d = decorById('st_' + h); c.fillStyle = STATE.stamps[h] ? '#2FA84F' : '#E0533F'; c.beginPath(); c.arc(ox + (d.x + .5) * s, oy + (d.y + .5) * s, 4, 0, 7); c.fill(); } },
  mapLegend() { return '<span class="pill">● 빨강 = 아직 안 받은 스탬프</span><span class="pill">● 초록 = 받은 스탬프</span>'; },
  hud() {
    const S = STATE, n = HALLS.filter(h => S.stamps[h]).length, seen = Object.keys(S.seen || {}).length, tot = INTER.length;
    $('#hlab').textContent = '관람'; $('#ht').textContent = `${seen}곳`;
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.inst === 'KIRD 홍보관' ? '' : r.inst + ' · '}${r.n}` : '통로';
    const html = `<div class="tk-h"><b>스탬프 랠리</b><span>${n}/${HALLS.length}</span></div><div class="tk-bar"><i style="width:${n / HALLS.length * 100}%;background:#E0533F"></i></div>${HALLS.map(h => `<div class="tk${S.stamps[h] ? ' ok' : ''}"><em>${ROOMS[RID[h]].inst}</em>${ROOMS[RID[h]].n}</div>`).join('')}<div class="tk lock">${n >= HALLS.length ? '🎓 로비 안내 데스크에서 수료증!' : '각 전시실 빨간 도장대에서 퀴즈'}</div>`;
    if (html !== this._h) { this._h = html; $('#tasks').innerHTML = html; }
  },
};
MODES.hall = HALL;
const NPCSAY = ['와, 88만 명!', '레고로 만들었네', '나도 리더 단계 갈래', '로켓 멋지다 🚀', '스탬프 몇 개 모았어?', '알파캠퍼스 들어가 봐야지', '포토존 가자!', '양자 어렵다…', 'AI 튜터 써 봤어?', '배지 모으는 재미!', '2050이면 나도…', '카드뉴스 귀엽다', '해외연수 가고 싶다 ✈️'];
// ---------------------------------------------------------------- 개별 체험
function mascotTalk() {
  const lines = ['안녕! 우리는 KIRD 캐릭터야. 과학기술인이 평생 성장하도록 돕는 곳을 소개할게.', '올해 홍보관은 2025년 성과와 2026년 교육으로 새 단장했어.', '왼쪽 1관은 KIRD의 역사, 오른쪽 2관은 숫자로 본 2025년이야.', '위쪽 3·4·5관에는 커리어 충전소 K-클럽, AI·전략기술 교육, 청년·글로벌 인재가 있어.', '아래쪽으로 내려가면 6관 미래비전 2050, 7관 2025 도전성과, 8관 홍보 스튜디오!', '전시실마다 빨간 도장대의 퀴즈를 맞히면 스탬프! 8개 모으면 수료증이야.'];
  let k = 0; const b = openModal(`<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><img src="${IMG_MASCOT}" alt="KIRD 캐릭터" style="width:160px;border-radius:14px;border:2px solid var(--ink)"><div style="flex:1;min-width:200px"><div class="mk">KIRD 캐릭터</div><p class="q" id="mt"></p></div></div><div class="row"><button class="btn" id="mn">다음</button><button class="btn ghost" data-close>닫기</button></div>`);
  const show = () => { b.querySelector('#mt').textContent = lines[k]; b.querySelector('#mn').textContent = k < lines.length - 1 ? '다음' : '둘러보러 가기'; };
  b.querySelector('#mn').onclick = () => { k++; if (k >= lines.length) closeModal(); else show(); }; show(); visit('mascot');
}
function towerModal(id) {
  const I = TOWERS[id];
  const b = openModal(mhead('2관 · 숫자로 보는 KIRD', I.title) + `<canvas id="twc" width="640" height="320" style="width:100%;border-radius:14px;border:2px solid var(--ink);background:#FFF8EC"></canvas><div class="q">${I.note || ''}${I.list ? '<ol style="columns:2;margin:4px 0 0;padding-left:20px;line-height:1.8">' + I.list.map(x => `<li>${x}</li>`).join('') + '</ol>' : ''}</div><p class="note">출처: ${I.src}</p><div class="row"><button class="btn" data-close>확인</button></div>`, { wide: true });
  const c = b.querySelector('#twc'), g = c.getContext('2d'), o = MODAL, t0 = performance.now();
  (function loop() { if (MODAL !== o) return; const t = (performance.now() - t0) / 1000; g.clearRect(0, 0, 640, 320); g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, 640, 320);
    if (I.parts) { const mx = Math.max(...I.parts.map(p => p[1])), base = mx < 10 ? 3.5 : 0; I.parts.forEach(([n, v, col], k) => { const x = 70 + k * (500 / I.parts.length) + 10, full = Math.max(1, Math.round((v - base) / (mx - base) * 9)), shown = Math.min(full, Math.floor(t * 6) - k * 2); for (let r = 0; r < shown; r++) brick(g, x, 270 - r * 24, 90, 24, col, r === shown - 1); g.fillStyle = OL; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText(n, x + 45, 300); if (shown >= full) { g.font = `900 22px ${FONT}`; g.fillText(v < 10 ? v.toFixed(2) : v.toLocaleString('ko-KR'), x + 45, 254 - full * 24); } }); }
    else { I.list.forEach((s, k) => { if (t * 4 > k) brick(g, 40 + (k % 5) * 116, 120 + Math.floor(k / 5) * 110, 100, 40, ['#E0533F', '#2E86D6', '#FFD24A', '#8CC63F', '#7C5CE0'][k % 5], true); g.fillStyle = OL; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; if (t * 4 > k) g.fillText(k + 1, 90 + (k % 5) * 116, 150 + Math.floor(k / 5) * 110); }); }
    chibi(g, 40, 280, 'green', { s: 1, bob: Math.sin(t * 5) * 3 }); requestAnimationFrame(loop); })();
  visit(id);
}
const STAGES = [
  { n: '신진', c: '#8CC63F', d: '연구·행정의 첫걸음. 국가 R&D 전주기 기초와 기관 적응을 다져요.', courses: ['신임자 과정 (임용 1년 내)', '신진 연구원 과정 (8년 미만)', '신진 행정원 과정 (10년 미만)', '박사후연구원 경력개발 과정'] },
  { n: '중견', c: '#2E86D6', d: '전문성을 넓히고 협업을 설계하는 단계. 승급을 앞두면 예비자 과정도 있어요.', courses: ['중견 연구원 과정 (8~20년)', '중견 행정원 과정 (10~25년)', '선임승급 예비자 과정', '책임승급 예비자 과정', '예비보직자 리더십 과정'] },
  { n: '리더', c: '#7C5CE0', d: '조직과 연구를 이끄는 리더십, 그리고 퇴직 전후의 새 출발까지 — 평생 현역.', courses: ['리더 연구원 과정 (20년 이상)', '리더 행정원 과정 (25년 이상)', '실·팀장급 · 본부장급 리더십 과정', '국가 과학기술 경영진 · 기관장 리더십 과정', '고경력 리빌드업 과정 (퇴직 전후)'] },
];
function stageModal(k) { const S = STAGES[k]; panel('stairs', `STEP ${k + 1} · ${S.n}`, `${S.d}<br><small class="note">2026 KIRD 교육프로그램 · 출연(연) 및 공공연구기관 기본교육</small><div style="margin-top:8px">${S.courses.map(c => `<span class="pill" style="border-left:6px solid ${S.c}">${c}</span>`).join('')}</div>`, { kicker: '3관 · 커리어 충전소', id: 'stg' + k }); }
function charger() {
  const ROLE = { r: '연구직', a: '행정직', m: '연구관리직·전문기관', s: '대학(원)생' };
  const REC = { s: ['이공계 대학생 연구경력 탐색 과정', '대학원생 경력설계 과정', '국가 R&D 리얼챌린지 프로그램', '커리어 콘서트', '온라인 R&D 수행역량 멘토링 (Python·LaTeX 등)'], r: ['연구동향 분석 · 연구계획서 작성 (Plan)', 'AI 파이썬 · 머신러닝 (Do)', '영어논문 작성 · 기술이전·창업 (See)', '연구윤리 집합교육 (연구자)', '해외연수 · 국제공동연구 (EIC Summit)'], a: ['연구행정 마스터 과정', '생성형 AI 보고서 · 업무자동화', '국가연구개발혁신법 (연구개발비·학생인건비·기술료)', '연구보안 — AI 기술과 연구보안', '보도자료 · 언론대응'], m: ['연구관리 전문기관 신임자 과정 (R&D 전주기·IRIS)', 'R&D 기획 · 과제관리·평가 · 성과관리 심화', '지역 R&D 정책 및 사업기획 과정', '연구관리 스킬업 해외연수 (호주 ARMS)'] };
  let role = null, st = null;
  const b = openModal(mhead('3관 · 커리어 충전소', '⚡ 나만의 커리어 충전') + `<p class="q">나는…</p><div class="row" id="cr">${Object.entries(ROLE).map(([k, v]) => `<button class="btn ghost sm" data-r="${k}">${v}</button>`).join('')}</div><p class="q" style="margin-top:10px">지금 단계는…</p><div class="row" id="cs">${STAGES.map((s, i) => `<button class="btn ghost sm" data-s="${i}">${s.n}</button>`).join('')}</div><div id="cout" style="margin-top:12px"></div>`);
  const out = () => { if (!role || st === null) return; const list = (role === 's' ? [] : STAGES[st].courses.slice(0, 2)).concat(REC[role]); b.querySelector('#cout').innerHTML = `<div class="chg"><i style="width:0%"></i></div><p class="q"><b>${ROLE[role]} · ${STAGES[st].n}</b>에게 추천하는 충전 코스</p>${list.map(c => `<span class="pill ok">🔋 ${c}</span>`).join('')}<p class="note">과정 이름은 2026 KIRD 교육프로그램 안내책자의 대표 과정 예시예요. 실제 신청은 알파캠퍼스 → 교육탐색에서.</p>`; sfx('item'); requestAnimationFrame(() => { const i = b.querySelector('.chg i'); if (i) i.style.width = '100%'; }); };
  b.querySelectorAll('[data-r]').forEach(x => x.onclick = () => { role = x.dataset.r; b.querySelectorAll('[data-r]').forEach(y => y.classList.toggle('ghost', y !== x)); out(); });
  b.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { st = +x.dataset.s; b.querySelectorAll('[data-s]').forEach(y => y.classList.toggle('ghost', y !== x)); out(); });
  visit('charger');
}
function infoDesk() {
  const S = STATE, n = HALLS.filter(h => S.stamps[h]).length;
  const b = openModal(mhead('로비 · 안내 데스크', n >= HALLS.length ? '🎓 수료증 발급' : '스탬프 랠리 안내') + (n >= HALLS.length ? `<p class="q">스탬프 ${HALLS.length}개를 모두 모았어요! 수료증에 넣을 이름을 적어 주세요.</p><input id="vn" maxlength="12" value="${(S.vname || '').replace(/"/g, '')}" placeholder="이름 또는 별명" style="font:800 18px var(--body);padding:10px;border:2px solid var(--ink);border-radius:10px;width:100%;box-sizing:border-box"><div class="row"><button class="btn" id="cert">수료증 만들기</button></div>` : `<p class="q">전시실마다 <b>빨간 도장대</b>에서 퀴즈를 맞히면 스탬프를 받아요. 지금 <b>${n} / ${HALLS.length}</b>개.</p><div>${HALLS.map(h => `<span class="pill${S.stamps[h] ? ' ok' : ''}">${S.stamps[h] ? '✓' : '○'} ${ROOMS[RID[h]].inst} ${ROOMS[RID[h]].n}</span>`).join('')}</div><p class="note">지도(M)에 도장대 위치가 빨간 점으로 표시돼요.</p><div class="row"><button class="btn" data-close>둘러보러 가기</button></div>`));
  const c = b.querySelector('#cert'); if (c) c.onclick = () => { S.vname = b.querySelector('#vn').value.trim() || '방문객'; saveHall(); certificate(); };
}
function certificate() {
  const S = STATE; const cv2 = document.createElement('canvas'); cv2.width = 1200; cv2.height = 840; const g = cv2.getContext('2d');
  g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, 1200, 840); g.strokeStyle = '#2E86D6'; g.lineWidth = 14; g.strokeRect(30, 30, 1140, 780); g.strokeStyle = '#8CC63F'; g.lineWidth = 4; g.strokeRect(54, 54, 1092, 732);
  g.drawImage(HIMG.logo, 90, 80, 260, 77); g.fillStyle = '#13294B'; g.textAlign = 'center'; g.font = `400 72px "Black Han Sans", ${FONT}`; g.fillText('탐방 수료증', 600, 270);
  g.font = `900 46px ${FONT}`; g.fillText(S.vname, 600, 380); g.fillStyle = '#334'; g.font = `700 26px ${FONT}`; g.fillText('위 사람은 KIRD 홍보관 여덟 전시실을 모두 둘러보고', 600, 460); g.fillText('스탬프 랠리를 완주하였기에 이 증서를 드립니다.', 600, 500);
  HALLS.forEach((h, k) => { const x = 600 + (k - 3.5) * 118; g.fillStyle = '#E0533F'; g.beginPath(); g.arc(x, 600, 46, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.fillText(ROOMS[RID[h]].inst, x, 608); });
  const d = new Date(); g.fillStyle = '#13294B'; g.font = `800 24px ${FONT}`; g.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · KIRD 홍보관`, 600, 720);
  chibi(g, 1080, 740, PL.col, { s: 1.8 }); if (HIMG.mascot.complete) { g.save(); g.beginPath(); g.roundRect(900, 80, 220, 200, 20); g.clip(); g.drawImage(HIMG.mascot, 900, 80, 220, 200); g.restore(); }
  const url = cv2.toDataURL('image/png'); sfx('win');
  openModal(mhead('축하해요!', '🎓 KIRD 홍보관 탐방 수료증') + `<img src="${url}" alt="수료증" style="width:100%;border-radius:12px;border:2px solid var(--ink)"><p class="note">${COARSE ? '이미지를 길게 눌러 저장할 수 있어요.' : '아래 버튼으로 저장하거나 이미지를 오른쪽 클릭해 저장하세요.'}</p><div class="row"><a class="btn" download="KIRD_홍보관_수료증.png" href="${url}" style="text-decoration:none">이미지 저장</a><button class="btn ghost" data-close>닫기</button></div>`, { wide: true });
}
function photoZone() {
  const S = STATE; const W = 960, H = 640; const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g = c2.getContext('2d');
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#1D3A6E'); gr.addColorStop(1, '#2E86D6'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${.3 + (i % 3) * .2})`; g.fillRect((i * 151) % W, (i * 89) % H, 3, 3); }
  if (HIMG.mascot.complete) { g.save(); g.beginPath(); g.roundRect(80, 120, 440, 400, 30); g.clip(); g.drawImage(HIMG.mascot, 80, 120, 440, 400); g.restore(); }
  chibi(g, 700, 470, PL.col, { s: 4.4 }); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(30, 30, 300, 90, 16); g.fill(); g.drawImage(HIMG.logo, 45, 40, 240, 71);
  g.fillStyle = '#FFE07A'; g.textAlign = 'center'; g.font = `400 54px "Black Han Sans", ${FONT}`; g.fillText('KIRD 홍보관 왔다 감!', W / 2, 590);
  for (let k = 0; k < 8; k++) brick(g, 20 + k * 120, H - 8, 110, 12, ['#E0533F', '#2E86D6', '#FFD24A', '#8CC63F'][k % 4], true);
  const url = c2.toDataURL('image/png'); sfx('click'); visit('photo');
  const b = openModal(mhead('로비 · 포토존', '📸 찰칵!') + `<div style="position:relative"><img src="${url}" alt="KIRD 홍보관 기념사진" style="width:100%;border-radius:12px;border:2px solid var(--ink)"><div class="flash"></div></div><div class="row"><a class="btn" download="KIRD_홍보관_기념사진.png" href="${url}" style="text-decoration:none">사진 저장</a><button class="btn ghost" id="pswap">${PL.col === 'blue' ? '초록' : '파랑'} 친구로 다시 찍기</button><button class="btn ghost" data-close>닫기</button></div>`, { wide: true });
  b.querySelector('#pswap').onclick = () => { PL.col = PL.col === 'blue' ? 'green' : 'blue'; saveHall(); photoZone(); };
}
function guestbook() {
  let list = []; try { list = JSON.parse(localStorage.getItem('kh_guest') || '[]'); } catch (e) { }
  const render = () => list.slice(-8).reverse().map(x => `<div class="gb"><b>${esc(x.n)}</b><span>${esc(x.m)}</span><small>${x.d}</small></div>`).join('') || '<p class="note">첫 글을 남겨 주세요!</p>';
  const b = openModal(mhead('로비 · 방명록', '한마디 남기기') + `<div class="row" style="justify-content:stretch"><input id="gn" maxlength="10" placeholder="이름" style="flex:1;min-width:90px;font:800 15px var(--body);padding:9px;border:2px solid var(--ink);border-radius:10px"><input id="gm" maxlength="60" placeholder="홍보관 어땠나요?" style="flex:3;min-width:160px;font:700 15px var(--body);padding:9px;border:2px solid var(--ink);border-radius:10px"><button class="btn sm" id="gs" style="margin:0">남기기</button></div><div id="gl" style="margin-top:10px">${render()}</div><p class="note">방명록은 이 기기에만 저장돼요.</p>`);
  b.querySelector('#gs').onclick = () => { const n = b.querySelector('#gn').value.trim() || '방문객', m = b.querySelector('#gm').value.trim(); if (!m) return; const d = new Date(); list.push({ n, m, d: `${d.getMonth() + 1}/${d.getDate()}` }); try { localStorage.setItem('kh_guest', JSON.stringify(list.slice(-50))); } catch (e) { } b.querySelector('#gl').innerHTML = render(); b.querySelector('#gm').value = ''; sfx('ok'); };
  visit('guest');
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
// ---------------------------------------------------------------- 블록 쌓기 (타이밍 게임)
function brickGame() {
  const W = 360, H = 520; const b = openModal(mhead('2관 · 숫자로 보는 KIRD', '🧱 블록 쌓기') + `<p class="q" style="margin:0 0 8px">움직이는 블록을 눌러 떨어뜨려 높이 쌓아요. 삐져나온 부분은 잘려요!</p><div class="mini" style="max-width:360px;margin:0 auto"><canvas id="bg" width="${W}" height="${H}" style="width:100%;border-radius:14px;border:2px solid var(--ink);background:#FFF8EC;touch-action:none"></canvas><div class="mhud"><span id="bsc">0층</span><span id="bbest">최고 ${STATE.brickBest || 0}층</span></div></div><div class="row"><button class="btn" id="bdrop">${COARSE ? '떨어뜨리기' : '떨어뜨리기 (Space)'}</button><button class="btn ghost" data-close>닫기</button></div>`);
  const c = b.querySelector('#bg'), g = c.getContext('2d'), o = MODAL; const cols = ['#E0533F', '#2E86D6', '#FFD24A', '#8CC63F', '#7C5CE0', '#F2A23A'];
  let stack = [{ x: 80, w: 200 }], cur = { x: 0, w: 200, dir: 1 }, sp = 140, over = false, cam = 0;
  const drop = () => { if (over) { stack = [{ x: 80, w: 200 }]; cur = { x: 0, w: 200, dir: 1 }; sp = 140; over = false; cam = 0; return; } const top = stack[stack.length - 1]; const l = Math.max(top.x, cur.x), r = Math.min(top.x + top.w, cur.x + cur.w); if (r - l <= 2) { over = true; sfx('bad'); const sc = stack.length - 1; if (sc > (STATE.brickBest || 0)) { STATE.brickBest = sc; saveHall(); b.querySelector('#bbest').textContent = `최고 ${sc}층`; } return; } const perfect = Math.abs(cur.x - top.x) < 4; stack.push({ x: perfect ? top.x : l, w: perfect ? top.w : r - l }); if (perfect) sfx('ok'); else sfx('push'); cur = { x: Math.random() < .5 ? -stack[stack.length - 1].w : W, w: stack[stack.length - 1].w, dir: 1 }; cur.dir = cur.x < 0 ? 1 : -1; sp = Math.min(380, sp + 12); b.querySelector('#bsc').textContent = `${stack.length - 1}층`; };
  b.querySelector('#bdrop').addEventListener('pointerdown', e => { e.preventDefault(); drop(); }); c.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
  modalKey(e => { if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); drop(); } });
  let last = performance.now();
  (function loop(now) { if (MODAL !== o) return; const dt = Math.min(.05, ((now || performance.now()) - last) / 1000); last = now || performance.now(); if (!over) { cur.x += cur.dir * sp * dt; if (cur.x > W - cur.w + 40) cur.dir = -1; if (cur.x < -40) cur.dir = 1; }
    const want = Math.max(0, stack.length * 24 - 300); cam += (want - cam) * .1; g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, W, H);
    stack.forEach((s, k) => brick(g, s.x, H - 30 - k * 24 + cam, s.w, 24, cols[k % cols.length], k === stack.length - 1));
    if (!over) brick(g, cur.x, H - 30 - stack.length * 24 + cam - 30, cur.w, 24, cols[stack.length % cols.length], true);
    if (over) { g.fillStyle = 'rgba(14,34,56,.75)'; g.fillRect(0, H / 2 - 60, W, 120); g.fillStyle = '#FFE07A'; g.font = `400 34px "Black Han Sans", ${FONT}`; g.textAlign = 'center'; g.fillText(`${stack.length - 1}층!`, W / 2, H / 2); g.fillStyle = '#fff'; g.font = `800 15px ${FONT}`; g.fillText('한 번 더 누르면 다시 시작', W / 2, H / 2 + 34); }
    requestAnimationFrame(loop); })();
  visit('bricks');
}
// ---------------------------------------------------------------- 2026 개편 체험
function journeyGame() {
  const S = ['교육탐색', '역량진단', '학습로드맵 설정', '학습', 'KIRD 디지털 배지'], D2 = ['고민을 키워드로 찾아요', '나의 역량 수준을 점검해요', '경력단계·직무에 맞는 길을 짜요', '집합·온라인·하이플렉스로 배워요', '쌓인 역량을 배지로 인증해요'];
  let order = S.map((x, i) => i).sort(() => Math.random() - .5); if (order.every((v, i) => v === i)) order.reverse(); let pick = [];
  const b = openModal(mhead('3관 · 커리어 충전소', '🧭 학습 여정 순서 맞추기') + `<p class="q">‘배움에서 성취까지’ — KIRD 학습 여정 5단계를 순서대로 눌러 보세요.</p><div class="opts" id="jo"></div><div class="feed" id="jf">첫 단계는 무엇일까요?</div><div id="jp" style="margin-top:8px"></div>`);
  const draw = () => { b.querySelector('#jo').innerHTML = order.map(i => `<button class="opt" data-i="${i}" ${pick.includes(i) ? 'disabled' : ''}>${S[i]}</button>`).join(''); b.querySelector('#jp').innerHTML = pick.map((i, k) => `<span class="pill ok">${k + 1}. ${S[i]} — ${D2[i]}</span>`).join('');
    b.querySelectorAll('#jo .opt').forEach(x => x.onclick = () => { const i = +x.dataset.i, f = b.querySelector('#jf'); if (i === pick.length) { pick.push(i); sfx('ok'); if (pick.length === 5) { f.className = 'feed'; f.innerHTML = '완성! 🏅 <b>여정 탐험가</b> 배지를 얻었어요. 실제 배지는 알파캠퍼스 배지 지갑에 쌓여요.'; STATE.seen.badge_journey = 1; saveHall(); sfx('item'); } else f.textContent = `좋아요! 다음은 ${pick.length + 1}단계.`; draw(); } else { sfx('bad'); f.className = 'feed bad'; f.textContent = '순서가 달라요. 다시 골라 보세요!'; } }); };
  draw(); visit('journey');
}
function tutorDemo() {
  const QA = [['연구계획서 요약해 줘', '교육 전에 자료를 요약해 핵심만 먼저 보여 줘요. 수업 시간엔 실습에 집중!'], ['학생인건비 기준이 헷갈려', '국가연구개발혁신법과 공공R&D 가이드라인을 학습한 데이터로 근거와 함께 답해요.'], ['이 데이터엔 어떤 알고리즘?', '데이터 유형에 맞는 알고리즘을 예제로 같이 구현해 봐요. 실습 코치 역할이에요.'], ['수업 끝났는데 복습은?', '수강 후 복습 질문과 퀴즈로 24시간 학습을 이어 줘요.']];
  const b = openModal(mhead('4관 · AI·전략기술 교육', '🤖 생성형 AI 튜터 체험') + `<canvas id="ilc" width="640" height="300" style="width:100%;border-radius:14px;border:2px solid var(--ink);display:block;background:#EAF4FF"></canvas><p class="q" style="margin-top:10px">궁금한 걸 골라 보세요</p><div class="opts two">${QA.map((q, i) => `<button class="opt" data-i="${i}">${q[0]}</button>`).join('')}</div><div class="feed" id="tf">KIRD AI 튜터: 무엇이든 물어보세요!</div><p class="note">2025년 시범 운영 만족도 4.54점 · 실습 4.74점. 2027년까지 전 과정 적용을 목표로 해요. 이 체험은 설명용 예시예요.</p>`, { wide: true });
  const c = b.querySelector('#ilc'), g = c.getContext('2d'), o = MODAL, t0 = performance.now(); (function loop() { if (MODAL !== o) return; illus(g, 'tutor', 640, 300, (performance.now() - t0) / 1000); requestAnimationFrame(loop); })();
  b.querySelectorAll('.opt').forEach(x => x.onclick = () => { const f = b.querySelector('#tf'); f.className = 'feed'; f.textContent = '…'; sfx('click'); modalLater(() => { f.innerHTML = '<b>AI 튜터</b> ' + QA[+x.dataset.i][1]; }, 450); });
  visit('aitutor');
}
function hallBadges() {
  const S = STATE, sn = S.seen || {}, has = (pre, n) => Object.keys(sn).filter(k => k.startsWith(pre)).length >= n, st = HALLS.filter(h => S.stamps[h]).length;
  return [
    ['👣', '첫 발걸음', '전시 1곳 관람', Object.keys(sn).length >= 1], ['📜', '연혁 탐험가', '1관 연혁 10개', has('ms', MILESTONES.length)], ['🧮', '숫자 박사', '2관 레고 탑 8개', has('t_', Object.keys(TOWERS).length)],
    ['🧭', '여정 탐험가', '학습 여정 맞추기', !!sn.badge_journey], ['🛰️', '전략기술 탐색가', '4관 전시 7개', has('pod_', 7)], ['🌏', '글로벌 러너', '해외연수 지도', !!sn.abroad],
    ['🔭', '2050 비저너리', '5대 미래역할', has('role', 5)], ['🏆', '도전성과 7선', '7관 전시 7개', has('feat', 7)], ['🗞️', '홍보 리포터', '카드뉴스 끝까지', !!sn.cards_all],
    ['🧱', '블록 마스터', '블록 10층', (S.brickBest || 0) >= 10], ['📮', '스탬프 수집가', `스탬프 ${HALLS.length}개`, st >= HALLS.length], ['🎓', '홍보관 마스터', '배지 10개 이상', false],
  ];
}
function badgeWallet() {
  const B = hallBadges(); B[11][3] = B.slice(0, 11).filter(x => x[3]).length >= 10; const n = B.filter(x => x[3]).length;
  openModal(mhead('4관 · KIRD 디지털 배지', `🏅 나의 배지 지갑 ${n} / ${B.length}`) + `<p class="q">‘과정 이수’가 아니라 ‘역량의 축적’. 홍보관에서 쌓은 경험이 배지로 모여요.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">${B.map(([i, n2, d, ok]) => `<div style="border:2px solid var(--ink);border-radius:12px;padding:8px;text-align:center;background:${ok ? '#FFF4D6' : '#EEF1F5'};opacity:${ok ? 1 : .55}"><div style="font-size:28px">${ok ? i : '🔒'}</div><b style="font-size:13px">${n2}</b><div class="note" style="margin:2px 0 0">${d}</div></div>`).join('')}</div><p class="note">실제 KIRD 디지털 배지는 알파캠퍼스 마이페이지 ‘배지 지갑’에서 확인해요(2025 도입). 홍보관 배지는 이 기기에만 저장돼요.</p><div class="row"><button class="btn" data-close>닫기</button></div>`, { wide: true });
  visit('badge');
}
function abroadModal() {
  const b = openModal(mhead('5관 · 청년·글로벌 인재', '✈️ 2026 KIRD 해외연수 8곳') + `<canvas id="ilc" width="640" height="300" style="width:100%;border-radius:14px;border:2px solid var(--ink);display:block"></canvas><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px;margin-top:10px">${ABROAD.map(([f, n, w, e]) => `<div class="pill" style="display:block;margin:0"><b>${f} ${n}</b><br><small>${w} · ${e}</small></div>`).join('')}</div><p class="note">출처: ${SRC26}. 일정과 장소는 사정에 따라 바뀔 수 있어요.</p><div class="row"><button class="btn" data-close>닫기</button></div>`, { wide: true });
  const c = b.querySelector('#ilc'), g = c.getContext('2d'), o = MODAL, t0 = performance.now(); (function loop() { if (MODAL !== o) return; illus(g, 'map', 640, 300, (performance.now() - t0) / 1000); requestAnimationFrame(loop); })();
  visit('abroad');
}
function resultsModal() {
  openModal(mhead('7관 · 2025 도전성과 7선', '📌 2025 주요성과 한눈에') + `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">${RESULTS.map(([i, t, d]) => `<div style="border:2px solid var(--ink);border-radius:12px;padding:10px;background:#FFFBEF"><div style="font-size:24px">${i}</div><b>${t}</b><div class="note" style="margin:2px 0 0">${d}</div></div>`).join('')}</div><p class="note">출처: ${SRC25}</p><div class="row"><button class="btn" data-close>닫기</button></div>`, { wide: true });
  visit('results');
}
function cardNews() {
  let k = 0; const b = openModal(mhead('8관 · 홍보 스튜디오', '🗂️ 카드뉴스 ‘키알디 새로고침’') + `<canvas id="cnc" width="480" height="600" style="width:min(100%,360px);display:block;margin:0 auto;border-radius:14px;border:2px solid var(--ink)"></canvas><div class="row"><button class="btn ghost" id="cp">◀ 이전</button><span id="cn" style="align-self:center;font-weight:900"></span><button class="btn" id="cx">다음 ▶</button></div><p class="note">2025년 미래비전(30편)과 R&R(22편)을 쉽게 풀어 쓴 카드뉴스 52편 중 일부를 홍보관이 다시 그렸어요.</p>`, { wide: true });
  const c = b.querySelector('#cnc'), g = c.getContext('2d'), o = MODAL, t0 = performance.now();
  const go = d => { k = Math.max(0, Math.min(CARDS.length - 1, k + d)); b.querySelector('#cn').textContent = `${k + 1} / ${CARDS.length}`; if (k === CARDS.length - 1) { STATE.seen.cards_all = 1; saveHall(); } sfx('click'); };
  b.querySelector('#cp').onclick = () => go(-1); b.querySelector('#cx').onclick = () => go(1); modalKey(e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }); go(0);
  (function loop() { if (MODAL !== o) return; const t = (performance.now() - t0) / 1000, C2 = CARDS[k]; g.fillStyle = C2.c; g.fillRect(0, 0, 480, 600); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 12; i++) g.fillRect((i * 97) % 480, (i * 61) % 600, 40, 40);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(24, 24, 200, 40, 20); g.fill(); g.fillStyle = C2.c; g.font = `900 18px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(C2.h, 124, 44);
    g.fillStyle = '#FFE07A'; let fs = 40; do { g.font = `400 ${fs}px "Black Han Sans", ${FONT}`; fs -= 2; } while (g.measureText(C2.b).width > 430 && fs > 20); g.fillText(C2.b, 240, 140); g.fillStyle = '#fff'; g.font = `800 22px ${FONT}`; C2.s.split('\n').forEach((l, i) => g.fillText(l, 240, 210 + i * 34));
    chibi(g, 160, 470, 'blue', { s: 2.6, bob: Math.sin(t * 4) * 4 }); chibi(g, 320, 470, 'green', { s: 2.6, flip: true, bob: Math.cos(t * 4) * 4 }); if (HIMG.logo.complete) { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(330, 548, 130, 38, 8); g.fill(); g.drawImage(HIMG.logo, 336, 551, 110, 32); }
    requestAnimationFrame(loop); })();
  visit('cards');
}
function talkScenes(ep) {
  const lines = ep === 0 ? [['blue', 'KIRD가 2050년을 그렸대요. 왜 하필 2050년이죠?'], ['green', '저출생·고령화, AI·로봇… 과학기술 인재 환경이 크게 바뀌니까요.'], ['blue', '그래서 역할이 다섯 가지라고요?'], ['green', 'PACEMAKER, NAVIGATOR, PLATFORM, GLOBAL, PARTNER!'], ['blue', '과학기술로 여는 내일, 인재가 만드는 미래 — 기억할게요.']]
    : [['orange', 'KIRD는 정확히 무슨 일을 하나요?'], ['purple', '첫째, 직책·직무별 역량강화 교육이요.'], ['orange', '대학생부터 고경력까지 경력도 돕는다면서요?'], ['purple', '맞아요. 그리고 조사연구로 정책 근거를 만들고,'], ['orange', '기관과 사람, 세계를 잇는 소통·협력까지! 4대 역할 끝.']];
  return lines.map(([col, l], i) => ({ d: 4, cap: l, draw(g, W, H, t, k) { sceneBg(g, W, H, ep ? '#2B2D3A' : '#13294B', ep ? '#5B2A3A' : '#2E86D6'); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, H - 90, W, 90); g.fillStyle = '#C08A52'; g.beginPath(); g.roundRect(W / 2 - 60, H - 150, 120, 60, 10); g.fill(); const L = ep ? 'orange' : 'blue', R = ep ? 'purple' : 'green'; chibi(g, W / 2 - 170, H - 120, L, { s: 2.4, bob: col === L ? Math.sin(t * 9) * 3 : 0 }); chibi(g, W / 2 + 170, H - 120, R, { s: 2.4, flip: true, bob: col === R ? Math.sin(t * 9) * 3 : 0 }); bigText(g, ep ? 'KIRD 토크 · 4대 역할 편' : 'KIRD 토크 · 미래비전 편', W / 2, 46, 26, '#FFE07A', 1); g.fillStyle = '#E0533F'; g.beginPath(); g.arc(30, 30, 8 + Math.sin(t * 6) * 2, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `900 12px ${FONT}`; g.textAlign = 'left'; g.fillText('ON AIR', 44, 34); } }));
}
function talkPick() {
  const b = openModal(mhead('8관 · 홍보 스튜디오', '🎙️ KIRD 토크 영상') + `<p class="q">2025년 미래비전과 R&R을 알린 토크 영상 2편을, 홍보관 캐릭터들이 다시 연기했어요.</p><div class="opts two"><button class="opt" id="e0"><b>1편 · 미래비전 2050</b><br><small>5대 미래역할 이야기</small></button><button class="opt" id="e1"><b>2편 · 4대 역할(R&R)</b><br><small>KIRD는 무슨 일을 할까?</small></button></div>`);
  b.querySelector('#e0').onclick = () => video('KIRD 토크 · 미래비전 편', talkScenes(0), 'v_talk'); b.querySelector('#e1').onclick = () => video('KIRD 토크 · 4대 역할 편', talkScenes(1), 'v_talk2');
}
const VISION_SCENES = [
  { d: 4, cap: 'KIRD 미래비전 2050 — 과학기술로 여는 내일, 인재가 만드는 미래', draw(g, W, H, t, k) { illus(g, 'vision', W, H, t); } },
].concat(ROLES.map((R, i) => ({ d: 4, cap: `0${i + 1} ${R.t}`, draw(g, W, H, t, k) { sceneBg(g, W, H, shade(R.c, .6), R.c); bigText(g, R.i, W / 2, 90, 64, '#fff', k); bigText(g, R.k, W / 2, 160, 40, '#FFE07A', k - .05); g.fillStyle = '#fff'; g.font = `800 16px ${FONT}`; g.textAlign = 'center'; R.li.forEach((l, j) => { if (k * 3 > j * .6 + .3) g.fillText('· ' + l, W / 2, 210 + j * 28); }); chibi(g, 70, 320, ['blue', 'purple', 'green', 'orange', 'pink'][i], { s: 1.3, bob: Math.sin(t * 6) * 3 }); } }))).concat([
  { d: 4, cap: '핵심가치 — 전문성 · 공감과 협력 · 도전과 혁신 · 고객성장', draw(g, W, H, t, k) { sceneBg(g, W, H, '#FFF8EC', '#FFE7C2'); ['전문성', '공감과 협력', '도전과 혁신', '고객성장'].forEach((v, j) => { if (k * 4 > j) { brick(g, 70 + j * 130, 200, 120, 60, ['#2E86D6', '#8CC63F', '#E0533F', '#F2A23A'][j], true); g.fillStyle = '#fff'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText(v, 130 + j * 130, 236); } }); bigText(g, '함께 2050으로', W / 2, 100, 40, '#13294B', k); } },
]);
function applyDesk() {
  panel('screen', '교육, 이렇게 찾고 신청해요', '<ol style="margin:0;padding-left:20px;line-height:1.9"><li><b>알파캠퍼스</b> 접속 → <b>교육탐색</b>에서 과정 찾기</li><li>역량진단 · 역량개발 로드맵으로 나에게 맞는 과정 고르기</li><li>신청하고 집합 · 온라인 · 하이플렉스로 배우기</li><li>배움이 쌓이면 <b>디지털 배지</b>로 인증</li></ol><div style="margin-top:8px"><span class="pill">오창 본원 — 충북 청주시 청원구 양청4길 45</span><span class="pill">대전교육센터 — 대전 대덕대로 593 대덕테크비즈센터 11층</span><span class="pill">대표 전화 1588-5834</span></div><small class="note">지식콘텐츠 7개 분야 채널 · 전자책 5,800여 권도 알파캠퍼스에서.</small>', { kicker: '8관 · 홍보 스튜디오', id: 'apply' });
}
// ---------------------------------------------------------------- 시작
$('#menuBtn').onclick = () => { openModal(mhead('KIRD 홍보관', '메뉴') + `<div class="row"><button class="btn" data-close>계속 둘러보기</button><button class="btn ghost" id="mI">처음 안내 다시 보기</button><button class="btn ghost" id="mR">스탬프 초기화</button><button class="btn ghost" id="mMute">${MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button></div>${HOME_LINK}`); $('#mI').onclick = () => { closeModal(); HALL.intro(); }; $('#mR').onclick = () => { STATE.stamps = {}; STATE.seen = {}; saveHall(); closeModal(); toast('스탬프를 초기화했어요'); }; $('#mMute').onclick = () => { MUTE = !MUTE; try { localStorage.setItem('kw_mute', MUTE ? '1' : '0'); } catch (e) { } $('#mMute').textContent = MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'; }; };
$('#mapBtn').onclick = () => toggleMap(); $('#hintBtn').hidden = true;
$('#tasks').addEventListener('click', e => { if (e.target.closest('.tk-h')) $('#tasks').classList.toggle('min'); });
$('#altBtn').addEventListener('pointerdown', () => { });
(function boot() { $('#menu').hidden = true; MODE = HALL; STATE.run = 1; STATE.visited = {}; STATE.curRoom = 'x'; HALL.init(); $('#hmode').textContent = '홍보관'; $('#keyhint').textContent = HALL.keys; $('#altBtn').classList.toggle('on', true); $('#altBtn').textContent = '인사'; $('#inv').hidden = true; $('#tasks').classList.toggle('min', innerWidth < 600); HALL.hud(); HALL.intro(); requestAnimationFrame(frame); })();
