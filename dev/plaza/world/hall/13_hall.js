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
    const b = openModal(`<div class="win"><img src="${IMG_MASCOT}" alt="KIRD 캐릭터" style="width:min(320px,80%);border-radius:18px;border:3px solid var(--ink)"><h3>KIRD 홍보관에 오신 걸 환영해요!</h3><p>전시실 다섯 곳을 둘러보고 <b>스탬프 5개</b>를 모으면 로비 안내 데스크에서 <b>탐방 수료증</b>을 드려요. 그림·영상·체험이 곳곳에 숨어 있어요.</p><p style="margin-bottom:4px"><b>어떤 친구로 둘러볼까요?</b></p><div class="row" id="pick"><button class="btn" data-c="blue">파랑 친구</button><button class="btn ghost" data-c="green">초록 친구</button></div><p class="note">${COARSE ? '왼쪽 조이스틱으로 걷고, 노란 말풍선이 뜨면 오른쪽 버튼으로 봐요.' : 'WASD·방향키로 걷고, 노란 말풍선이 뜨면 E로 봐요. M은 지도.'}</p>${HOME_LINK}</div>`, { sticky: true });
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
    MILESTONES.forEach((m, i) => add('ms' + i, `${m.yr} 연혁 보기`, () => panel(m.ill, `${m.yr} · ${m.t}`, m.d, { kicker: '1관 · KIRD 이야기', id: 'ms' + i }), { r: 1.4 }));
    add('ci', 'CI 이야기', () => panel('ci', '심벌마크에 담긴 뜻', '한글 자음 ‘人’, 한자 ‘사람 인(人)’의 모양에 새로 돋아나는 <b>새순</b>을 더했어요. 교육으로 자라고 변화하는 과학기술 인재를 뜻해요.', { kicker: '1관 · KIRD 이야기', id: 'ci' }), { y: 31.8 });
    add('mission', '설립 목적', () => panel('school', 'KIRD는 왜 있을까?', '과학기술인력의 <b>자기계발과 변화·혁신</b>에 필요한 교육을 제공하고 조사·연구를 통해 <b>국가 연구개발 투자의 효율성과 생산성</b>을 높이는 곳이에요. 과학기술정보통신부 소관 공공기관으로, 충북 청주 오창에 있어요.', { kicker: '1관 · KIRD 이야기', id: 'mission' }), { y: 31.8 });
    add('talent', '인재상', () => panel('team', 'KIRD가 그리는 인재', '<span class="pill">미래 변화 주도 혁신가</span><span class="pill">융합과 협력의 선도자</span><span class="pill">사회적 책임과 공익의 수호자</span>', { kicker: '1관 · KIRD 이야기', id: 'talent' }), { x: 5.6, y: 34.5 });
    for (const id in TOWERS) add(id, '레고 탑 살펴보기', () => towerModal(id), { r: 1.9 });
    add('bricks', '블록 쌓기 게임', () => brickGame(), { y: 43.6 });
    ['stg0', 'stg1', 'stg2'].forEach((id, k) => { const d = decorById(id); INTER.push({ x: d.x + 2, y: d.y + 2, r: 2.2, label: `${['신진', '중견', '리더'][k]} 단계 보기`, act: () => stageModal(k) }); });
    add('charger', '커리어 충전기', () => charger(), { r: 1.9 });
    add('kclub', '2050 비전', () => panel('battery', '2050 비전 · 커리어 충전소 K-클럽', '과학기술인이 언제든 들러 경력을 충전하는 곳.<br><b>중점 추진과제</b><ol style="margin:6px 0 0;padding-left:20px;line-height:1.8"><li>미래 과학기술인재 유입·확보</li><li>생애 전주기 평생 현역 과학기술인 경력개발</li><li>지역 산업-인재 상생 생태계 조성</li></ol>', { kicker: '3관 · 커리어 충전소', id: 'kclub' }), { y: 7.8 });
    for (const k in PODS) add('pod_' + k, `${PODS[k].n} 전시 보기`, () => panel(k, `국가전략기술 · ${PODS[k].n}`, PODS[k].d + '<br><small class="note">KIRD 교육 분야 ‘국가전략기술 교육’: AI, 반도체, 사이버 보안, 우주, 양자, 첨단해양, 차세대 원자력.</small>', { kicker: '4관 · 국가전략기술 교육', id: 'pod_' + k }), { r: 2.2 });
    add('strategy', '전략연구사업 지원', () => panel('strategy', '전략연구사업, KIRD가 돕는다', '연구과제중심제도(PBS)를 단계적으로 없애며 출연연에 <b>임무 중심의 대형·중장기 ‘전략연구사업’</b>이 시작됐어요(국가과학기술연구회 주도, 올해 5,000억 원 · 출연연 77개·직할연 23개 사업). KIRD는 현장이 새 제도에 적응하도록 돕습니다.<div style="margin-top:8px"><span class="pill">제도 설명회</span><span class="pill">연구자 교류회 — 기획·운영·비용 지원</span><span class="pill">연구관리자 교류회</span><span class="pill">홍보 콘텐츠</span><span class="pill">연구계획서 작성 워크숍</span></div>', { kicker: '4관 · 국가전략기술 교육', id: 'strategy' }), { y: 23.6 });
    AWARDS.forEach((A, i) => add('aw' + i, '리얼챌린지 포스터', () => panel('team', `청년 R&D 모의기획 · ${A.prize}`, `<b>${A.t}</b><br>전국 대학 이공계 학생 연구팀이 실제 국가 R&D처럼 연구를 기획하는 <b>리얼챌린지</b>(햇수로 8년째). 2025년 15개 팀이 R&D 교육·전문가 멘토링·기획비를 지원받아 사회문제 해결형 연구제안서를 썼어요.`, { kicker: '5관 · 청년·글로벌 인재', id: 'aw' + i }), { y: 7.9, r: 1.6 }));
    add('globe', '외국인 연구자 지원', () => panel('globe', '세계의 연구자가 한국에서 자라도록', '‘해외연구인력 전주기 정착지원’ 연구·경력개발 프로그램<div style="margin-top:8px"><span class="pill">K-STAR 인턴십 — 기업 R&D 현장 3개월, 인턴 월급·멘토비 KIRD 지원</span><span class="pill">국가 R&D 모의기획 — 외국인 연구자가 연구책임자 역할</span><span class="pill">네트워킹 모임 — 모임당 약 500만 원 활동비</span></div>', { kicker: '5관 · 청년·글로벌 인재', id: 'globe' }), { r: 2.6 });
    add('chair', '석좌교수', () => panel('chair', 'KIRD 석좌교수', '2019년 시작. 탁월한 연구 성과와 정책 경험을 가진 전문가가 후배 과학기술인에게 <b>자문·특강·콘텐츠 개발</b>로 경험을 나눠요. 2026년 4월 제6기 5명 위촉 — AI·바이오·나노·청년 인재양성 분야.', { kicker: '5관 · 청년·글로벌 인재', id: 'chair' }), { y: 21.6 });
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
    const S = STATE, n = HALLS.filter(h => S.stamps[h]).length, seen = Object.keys(S.seen || {}).length, tot = 6 + MILESTONES.length + 3 + 5 + 3 + 2 + 7 + 1 + 5 + 2;
    $('#hlab').textContent = '관람'; $('#ht').textContent = `${seen}곳`;
    const r = roomAt(PL.x, PL.y); $('#hloc').textContent = r ? `${r.inst === 'KIRD 홍보관' ? '' : r.inst + ' · '}${r.n}` : '통로';
    const html = `<div class="tk-h"><b>스탬프 랠리</b><span>${n}/5</span></div><div class="tk-bar"><i style="width:${n / 5 * 100}%;background:#E0533F"></i></div>${HALLS.map(h => `<div class="tk${S.stamps[h] ? ' ok' : ''}"><em>${ROOMS[RID[h]].inst}</em>${ROOMS[RID[h]].n}</div>`).join('')}<div class="tk lock">${n >= 5 ? '🎓 로비 안내 데스크에서 수료증!' : '각 전시실 빨간 도장대에서 퀴즈'}</div>`;
    if (html !== this._h) { this._h = html; $('#tasks').innerHTML = html; }
  },
};
MODES.hall = HALL;
const NPCSAY = ['와, 82만 명!', '레고로 만들었네', '나도 리더 단계 갈래', '로켓 멋지다 🚀', '스탬프 몇 개 모았어?', '알파캠퍼스 들어가 봐야지', '포토존 가자!', '양자 어렵다…'];
// ---------------------------------------------------------------- 개별 체험
function mascotTalk() {
  const lines = ['안녕! 우리는 KIRD 캐릭터야. 과학기술인이 평생 성장하도록 돕는 곳을 소개할게.', '왼쪽 1관에서는 KIRD의 역사를, 오른쪽 2관에서는 숫자로 본 KIRD를 볼 수 있어.', '위층 3·4·5관에는 커리어 충전소, 국가전략기술, 청년·글로벌 인재 이야기가 있어.', '전시실마다 빨간 도장대의 퀴즈를 맞히면 스탬프! 5개 모으면 수료증이야.'];
  let k = 0; const b = openModal(`<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><img src="${IMG_MASCOT}" alt="KIRD 캐릭터" style="width:160px;border-radius:14px;border:2px solid var(--ink)"><div style="flex:1;min-width:200px"><div class="mk">KIRD 캐릭터</div><p class="q" id="mt"></p></div></div><div class="row"><button class="btn" id="mn">다음</button><button class="btn ghost" data-close>닫기</button></div>`);
  const show = () => { b.querySelector('#mt').textContent = lines[k]; b.querySelector('#mn').textContent = k < lines.length - 1 ? '다음' : '둘러보러 가기'; };
  b.querySelector('#mn').onclick = () => { k++; if (k >= lines.length) closeModal(); else show(); }; show(); visit('mascot');
}
function towerModal(id) {
  const I = TOWERS[id];
  const b = openModal(mhead('2관 · 숫자로 보는 KIRD', I.title) + `<canvas id="twc" width="640" height="320" style="width:100%;border-radius:14px;border:2px solid var(--ink);background:#FFF8EC"></canvas><div class="q">${I.note || ''}${I.list ? '<ol style="columns:2;margin:4px 0 0;padding-left:20px;line-height:1.8">' + I.list.map(x => `<li>${x}</li>`).join('') + '</ol>' : ''}</div><p class="note">출처: KIRD 2025 교육안내책자(2024년 실적)</p><div class="row"><button class="btn" data-close>확인</button></div>`, { wide: true });
  const c = b.querySelector('#twc'), g = c.getContext('2d'), o = MODAL, t0 = performance.now();
  (function loop() { if (MODAL !== o) return; const t = (performance.now() - t0) / 1000; g.clearRect(0, 0, 640, 320); g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, 640, 320);
    if (I.parts) { const mx = Math.max(...I.parts.map(p => p[1])); I.parts.forEach(([n, v, col], k) => { const x = 90 + k * (460 / I.parts.length) + 20, full = Math.max(1, Math.round(v / mx * 9)), shown = Math.min(full, Math.floor(t * 6) - k * 2); for (let r = 0; r < shown; r++) brick(g, x, 270 - r * 24, 90, 24, col, r === shown - 1); g.fillStyle = OL; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.fillText(n, x + 45, 300); if (shown >= full) { g.font = `900 22px ${FONT}`; g.fillText(v.toLocaleString('ko-KR'), x + 45, 254 - full * 24); } }); }
    else { I.list.forEach((s, k) => { if (t * 4 > k) brick(g, 40 + (k % 5) * 116, 120 + Math.floor(k / 5) * 110, 100, 40, ['#E0533F', '#2E86D6', '#FFD24A', '#8CC63F', '#7C5CE0'][k % 5], true); g.fillStyle = OL; g.font = `900 30px ${FONT}`; g.textAlign = 'center'; if (t * 4 > k) g.fillText(k + 1, 90 + (k % 5) * 116, 150 + Math.floor(k / 5) * 110); }); }
    chibi(g, 40, 280, 'green', { s: 1, bob: Math.sin(t * 5) * 3 }); requestAnimationFrame(loop); })();
  visit(id);
}
const STAGES = [
  { n: '신진', c: '#8CC63F', d: '연구·행정의 첫걸음. 기관 적응과 기본 역량을 다져요.', courses: ['신진연구원 과정', '신진행정원 과정', '신임자 과정', '박사후연구원 과정'] },
  { n: '중견', c: '#2E86D6', d: '전문성을 넓히고 협업을 이끄는 단계.', courses: ['중견연구원 과정', '중견행정원 과정', '선임승급예비자 과정'] },
  { n: '리더', c: '#7C5CE0', d: '조직과 연구를 이끄는 리더십. 권한위임·코칭·동기부여 등 리더십역량 12개.', courses: ['리더연구원 과정', '보직자 과정', '과기정통부 승진사무관 과정'] },
];
function stageModal(k) { const S = STAGES[k]; panel('stairs', `STEP ${k + 1} · ${S.n}`, `${S.d}<div style="margin-top:8px">${S.courses.map(c => `<span class="pill" style="border-left:6px solid ${S.c}">${c}</span>`).join('')}</div>`, { kicker: '3관 · 커리어 충전소', id: 'stg' + k }); }
function charger() {
  const ROLE = { r: '연구직', a: '행정직', m: '연구관리직', s: '대학(원)생·외국인 유학생' };
  const REC = { s: ['대학원생 경력설계 과정', '외국인 유학생 경력개발 과정', '과학기술인 취업역량 과정', '청년 R&D 모의기획(리얼챌린지)'], r: ['R&D 프로젝트 관리', '국제공동 연구기획', '연구데이터 분석 R 실습', '연구윤리 프로그램'], a: ['국가연구개발혁신법 교육', 'R&D 법령·규정 교육', '생성형 AI 활용 업무보고서 작성', '연구보안관리 실무과정'], m: ['R&D 사업기획·관리 교육', '연구관리전문기관 신규자·기획 과정', '국가연구개발혁신법 교육', '연구보안관리 실무과정'] };
  let role = null, st = null;
  const b = openModal(mhead('3관 · 커리어 충전소', '⚡ 나만의 커리어 충전') + `<p class="q">나는…</p><div class="row" id="cr">${Object.entries(ROLE).map(([k, v]) => `<button class="btn ghost sm" data-r="${k}">${v}</button>`).join('')}</div><p class="q" style="margin-top:10px">지금 단계는…</p><div class="row" id="cs">${STAGES.map((s, i) => `<button class="btn ghost sm" data-s="${i}">${s.n}</button>`).join('')}</div><div id="cout" style="margin-top:12px"></div>`);
  const out = () => { if (!role || st === null) return; const list = (role === 's' ? [] : STAGES[st].courses.slice(0, 2)).concat(REC[role]); b.querySelector('#cout').innerHTML = `<div class="chg"><i style="width:0%"></i></div><p class="q"><b>${ROLE[role]} · ${STAGES[st].n}</b>에게 추천하는 충전 코스</p>${list.map(c => `<span class="pill ok">🔋 ${c}</span>`).join('')}<p class="note">과정 이름은 KIRD 2025 교육안내책자의 대표 과정 예시입니다. 실제 신청은 알파캠퍼스에서.</p>`; sfx('item'); requestAnimationFrame(() => { const i = b.querySelector('.chg i'); if (i) i.style.width = '100%'; }); };
  b.querySelectorAll('[data-r]').forEach(x => x.onclick = () => { role = x.dataset.r; b.querySelectorAll('[data-r]').forEach(y => y.classList.toggle('ghost', y !== x)); out(); });
  b.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { st = +x.dataset.s; b.querySelectorAll('[data-s]').forEach(y => y.classList.toggle('ghost', y !== x)); out(); });
  visit('charger');
}
function infoDesk() {
  const S = STATE, n = HALLS.filter(h => S.stamps[h]).length;
  const b = openModal(mhead('로비 · 안내 데스크', n >= 5 ? '🎓 수료증 발급' : '스탬프 랠리 안내') + (n >= 5 ? `<p class="q">스탬프 5개를 모두 모았어요! 수료증에 넣을 이름을 적어 주세요.</p><input id="vn" maxlength="12" value="${(S.vname || '').replace(/"/g, '')}" placeholder="이름 또는 별명" style="font:800 18px var(--body);padding:10px;border:2px solid var(--ink);border-radius:10px;width:100%;box-sizing:border-box"><div class="row"><button class="btn" id="cert">수료증 만들기</button></div>` : `<p class="q">전시실마다 <b>빨간 도장대</b>에서 퀴즈를 맞히면 스탬프를 받아요. 지금 <b>${n} / 5</b>개.</p><div>${HALLS.map(h => `<span class="pill${S.stamps[h] ? ' ok' : ''}">${S.stamps[h] ? '✓' : '○'} ${ROOMS[RID[h]].inst} ${ROOMS[RID[h]].n}</span>`).join('')}</div><p class="note">지도(M)에 도장대 위치가 빨간 점으로 표시돼요.</p><div class="row"><button class="btn" data-close>둘러보러 가기</button></div>`));
  const c = b.querySelector('#cert'); if (c) c.onclick = () => { S.vname = b.querySelector('#vn').value.trim() || '방문객'; saveHall(); certificate(); };
}
function certificate() {
  const S = STATE; const cv2 = document.createElement('canvas'); cv2.width = 1200; cv2.height = 840; const g = cv2.getContext('2d');
  g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, 1200, 840); g.strokeStyle = '#2E86D6'; g.lineWidth = 14; g.strokeRect(30, 30, 1140, 780); g.strokeStyle = '#8CC63F'; g.lineWidth = 4; g.strokeRect(54, 54, 1092, 732);
  g.drawImage(HIMG.logo, 90, 80, 260, 77); g.fillStyle = '#13294B'; g.textAlign = 'center'; g.font = `400 72px "Black Han Sans", ${FONT}`; g.fillText('탐방 수료증', 600, 270);
  g.font = `900 46px ${FONT}`; g.fillText(S.vname, 600, 380); g.fillStyle = '#334'; g.font = `700 26px ${FONT}`; g.fillText('위 사람은 KIRD 홍보관 다섯 전시실을 모두 둘러보고', 600, 460); g.fillText('스탬프 랠리를 완주하였기에 이 증서를 드립니다.', 600, 500);
  HALLS.forEach((h, k) => { const x = 330 + k * 135; g.fillStyle = '#E0533F'; g.beginPath(); g.arc(x, 600, 46, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `900 22px ${FONT}`; g.fillText(ROOMS[RID[h]].inst, x, 608); });
  const d = new Date(); g.fillStyle = '#13294B'; g.font = `800 24px ${FONT}`; g.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · KIRD 홍보관`, 600, 720);
  chibi(g, 1030, 700, PL.col, { s: 2.4 }); if (HIMG.mascot.complete) { g.save(); g.beginPath(); g.roundRect(900, 80, 220, 200, 20); g.clip(); g.drawImage(HIMG.mascot, 900, 80, 220, 200); g.restore(); }
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
// ---------------------------------------------------------------- 시작
$('#menuBtn').onclick = () => { openModal(mhead('KIRD 홍보관', '메뉴') + `<div class="row"><button class="btn" data-close>계속 둘러보기</button><button class="btn ghost" id="mI">처음 안내 다시 보기</button><button class="btn ghost" id="mR">스탬프 초기화</button><button class="btn ghost" id="mMute">${MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button></div>${HOME_LINK}`); $('#mI').onclick = () => { closeModal(); HALL.intro(); }; $('#mR').onclick = () => { STATE.stamps = {}; STATE.seen = {}; saveHall(); closeModal(); toast('스탬프를 초기화했어요'); }; $('#mMute').onclick = () => { MUTE = !MUTE; try { localStorage.setItem('kw_mute', MUTE ? '1' : '0'); } catch (e) { } $('#mMute').textContent = MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'; }; };
$('#mapBtn').onclick = () => toggleMap(); $('#hintBtn').hidden = true;
$('#tasks').addEventListener('click', e => { if (e.target.closest('.tk-h')) $('#tasks').classList.toggle('min'); });
$('#altBtn').addEventListener('pointerdown', () => { });
(function boot() { $('#menu').hidden = true; MODE = HALL; STATE.run = 1; STATE.visited = {}; STATE.curRoom = 'x'; HALL.init(); $('#hmode').textContent = '홍보관'; $('#keyhint').textContent = HALL.keys; $('#altBtn').classList.toggle('on', true); $('#altBtn').textContent = '인사'; $('#inv').hidden = true; $('#tasks').classList.toggle('min', innerWidth < 600); HALL.hud(); HALL.intro(); requestAnimationFrame(frame); })();
