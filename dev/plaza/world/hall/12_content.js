// ================================================================ 홍보관 전시 내용 (KIRD 공개 자료 기반 · 그림은 모두 직접 그린 레고·캐릭터풍)
function mhead(kind, title) { return `<div class="mh"><div><div class="mk">${kind}</div><h3>${title}</h3></div><button class="x" data-close aria-label="닫기">✕</button></div>`; }
const TOWERS = {
  t_course: { h: 7, c: '#2E86D6', big: '676개', label: '교육 과정', title: '2024년 교육 과정 676개', parts: [['집합', 359, '#2E86D6'], ['온라인', 317, '#8CC63F']], note: '집합(대면) 과정과 온라인 과정이 거의 반반. 운영 457회.' },
  t_grad: { h: 9, c: '#8CC63F', big: '34.7만', label: '수료생', title: '2024년 수료 347,680명', parts: [['집합', 32713, '#2E86D6'], ['온라인', 314967, '#8CC63F']], note: '수료생 10명 중 9명은 온라인으로 배웠다.' },
  t_member: { h: 8, c: '#F2A23A', big: '82만', label: '알파캠퍼스 회원', title: '알파캠퍼스 회원 약 82만 명', parts: [['회원', 820000, '#F2A23A'], ['연간 이용자', 300000, '#E0533F']], note: '2022년 문을 연 온·오프라인 통합 교육 플랫폼. 연간 이용자 30만 명 이상.' },
  t_field: { h: 5, c: '#7C5CE0', big: '10개', label: '교육 분야', title: '교육 분야 10개', list: ['출연(연)·공공연구기관 기본교육', '중소기업 R&D 실무역량', '대학(원)생 R&D 경력개발', '정책입안·연구관리직 사업기획·관리', 'R&D 전문교육', '국가전략기술', 'R&D 법령·규정', '과학기술인 소양', '과학기술 트렌드', '법정 필수 교육'] },
  t_comp: { h: 6, c: '#E0533F', big: '7·17·12', label: '역량 체계', title: '역량 체계 7 · 17 · 12', parts: [['핵심역량', 7, '#E0533F'], ['직무역량', 17, '#2E86D6'], ['리더십역량', 12, '#7C5CE0']], note: '핵심역량 7개(하위요소 63) · 직무역량 17개(142) · 리더십역량 12개(37). 신진·중견·리더 단계별로 설계.' },
};
const PODS = {
  ai: { n: 'AI', i: '🤖', c: '#4FC3F7', d: '연구 현장에서 인공지능을 쓰는 법. 생성형 AI로 업무보고서 쓰기, 비전공자를 위한 딥러닝처럼 바로 써먹는 과정이 있다.' },
  semi: { n: '반도체', i: '🔲', c: '#8CC63F', d: '칩 하나에 수십억 개의 트랜지스터. 설계부터 공정까지 산업의 심장을 이해한다.' },
  cyber: { n: '사이버 보안', i: '🛡️', c: '#2FA84F', d: '연구 데이터와 기술을 지키는 힘. 연구보안관리 실무과정도 함께 운영한다.' },
  space: { n: '우주', i: '🚀', c: '#E0533F', d: '발사체와 위성, 우주 탐사. 우주 시대 연구자를 위한 기초 체력.' },
  quantum: { n: '양자', i: '⚛️', c: '#C084FC', d: '0과 1을 동시에 다루는 양자 컴퓨팅·통신·센서의 세계.' },
  ocean: { n: '첨단해양', i: '🌊', c: '#2E86D6', d: '바다 자원과 해양 기술. 지구 표면 70%의 새 연구 무대.' },
  nuclear: { n: '차세대 원자력', i: '☢️', c: '#F2A23A', d: '더 안전하고 작은 원자로, 미래 에너지 기술.' },
};
const AWARDS = [
  { icon: '👵', c: '#E0533F', prize: '대상', t: '독거노인 낙상 탐지 119 신고·보호자 알림 시스템' },
  { icon: '🛴', c: '#2E86D6', prize: '최우수상', t: '전동킥보드 공유형 주차관리 플랫폼' },
  { icon: '💧', c: '#0EA5A4', prize: '우수상', t: '산업단지 폐수 염료 제거용 광촉매 복합필터' },
  { icon: '🩺', c: '#8CC63F', prize: '장애-비장애 학생팀 대상', t: '의료 취약지역 우울증 환자 원격진료 앱' },
  { icon: '🔥', c: '#F2A23A', prize: '포스터상(현장 투표)', t: '산불 조기 감시용 양자점 단적외선 센서' },
];
const MILESTONES = [
  { yr: '2007', t: '연구개발인력교육원으로 출발', d: '11월, 과학기술인 재교육 전문기관으로 문을 열었다.', ill: 'seed' },
  { yr: '2013', t: '출연(연) 재교육 전담기관 지정', d: '정부출연연구기관 연구자·행정인의 재교육을 전담하게 됐다.', ill: 'school' },
  { yr: '2014', t: '국가과학기술인력개발원(KIRD)', d: '1월, 지금의 이름으로 바뀌었다.', ill: 'sign' },
  { yr: '2015', t: '오창 청사 건립', d: '충북 청주 오창에 새 보금자리. 기술교육·재교육, 재난안전 전문교육 실시기관으로도 지정.', ill: 'building' },
  { yr: '2019', t: '과학기술인 경력개발 지원체계', d: '교육을 넘어 경력 전체를 돕는 체계를 만들었다.', ill: 'stairs' },
  { yr: '2022', t: '알파캠퍼스 오픈', d: '온·오프라인 통합 교육시스템. 어디서든 배우는 캠퍼스.', ill: 'screen' },
];
const QUIZ = {
  h1: { q: 'KIRD의 온·오프라인 통합 교육 플랫폼 이름은?', o: ['알파캠퍼스', 'K-러닝', '베타스쿨', 'R&D 아카데미'], a: 0 },
  h2: { q: '2024년 KIRD 교육을 수료한 사람은 약 몇 명?', o: ['약 3만 5천 명', '약 35만 명', '약 350만 명', '약 3,500명'], a: 1 },
  h3: { q: 'KIRD 2050 비전 — 과학기술인을 위한 커리어 ○○○ K-클럽. ○○○은?', o: ['도서관', '충전소', '놀이터', '정거장'], a: 1 },
  h4: { q: '다음 중 KIRD 국가전략기술 교육 분야가 아닌 것은?', o: ['우주', '양자', '첨단해양', '패션디자인'], a: 3 },
  h5: { q: '외국인 연구자를 위한 KIRD 인턴십은 어떤 비자를 가진 사람이 대상일까?', o: ['K-STAR 거주 비자', '관광 비자', '워킹홀리데이 비자', '비자 필요 없음'], a: 0 },
};
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
  { d: 5, cap: '2007년 연구개발인력교육원으로 출발해 2014년 지금의 이름이 됐어요', draw(g, W, H, t, k) { sceneBg(g, W, H, '#EAF4FF', '#fff'); const n = Math.floor(k * 30); for (let i = 0; i < n; i++) brick(g, 170 + (i % 6) * 50, 300 - Math.floor(i / 6) * 26, 50, 26, ['#2E86D6', '#8CC63F', '#F4F6FA'][(i + Math.floor(i / 6)) % 3], i >= n - 6); bigText(g, '2007 → 2014', W / 2, 60, 40, '#13294B', k); g.fillStyle = '#13294B'; g.font = `800 18px ${FONT}`; g.textAlign = 'center'; g.fillText('연구개발인력교육원 → 국가과학기술인력개발원', W / 2, 100); chibi(g, 80, 290, 'blue', { s: 1.4, bob: Math.sin(t * 6) * 4 }); } },
  { d: 5, cap: '2024년 한 해 676개 과정, 347,680명이 배웠어요', draw(g, W, H, t, k) { sceneBg(g, W, H, '#FFF4E0', '#FFE7C2'); bigText(g, countUp(676, k) + '개 과정', W / 2, 110, 54, '#B5701A', k); bigText(g, countUp(347680, k) + '명 수료', W / 2, 200, 54, '#2E86D6', k - .1); for (let i = 0; i < 12; i++) chibi(g, 40 + i * 52, 310, Object.keys(CHAR)[i % 6], { s: .8, bob: Math.sin(t * 8 + i) * 4 }); } },
  { d: 5, cap: '알파캠퍼스 — 회원 약 82만 명, 언제 어디서나 배우는 온라인 캠퍼스', draw(g, W, H, t, k) { illus(g, 'screen', W, H, t); bigText(g, '회원 82만 명', W / 2, 40, 30, '#13294B', k); } },
  { d: 5, cap: '신진에서 중견, 리더까지 — 과학기술인의 생애 전주기 경력개발', draw(g, W, H, t, k) { illus(g, 'stairs', W, H, t); bigText(g, '평생 현역 과학기술인', W / 2, 40, 30, '#13294B', k); } },
  { d: 5, cap: '2050 비전: 과학기술인을 위한 커리어 충전소, K-클럽', draw(g, W, H, t, k) { illus(g, 'battery', W, H, t); } },
];
// ---------------------------------------------------------------- 방문 기록 · 스탬프
function visit(id) { if (!id) return; const S = STATE; S.seen = S.seen || {}; if (!S.seen[id]) { S.seen[id] = 1; saveHall(); } }
function saveHall() { try { localStorage.setItem('kh_state', JSON.stringify({ seen: STATE.seen, stamps: STATE.stamps, char: PL.col, best: STATE.brickBest, name: STATE.vname })); } catch (e) { } }
function loadHall() { try { const o = JSON.parse(localStorage.getItem('kh_state') || 'null'); if (o) { STATE.seen = o.seen || {}; STATE.stamps = o.stamps || {}; if (o.char) PL.col = o.char; STATE.brickBest = o.best || 0; STATE.vname = o.name || ''; } } catch (e) { } }
const HALLS = ['h1', 'h2', 'h3', 'h4', 'h5'];
function stampQuiz(hall) {
  const S = STATE, Q = QUIZ[hall], R = ROOMS[RID[hall]];
  if (S.stamps[hall]) { toast(`${R.inst} 스탬프는 이미 받았어요 ✓`); return; }
  const b = openModal(mhead(`${R.inst} · ${R.n}`, '스탬프 퀴즈') + `<p class="q">${Q.q}</p><div class="opts two">${Q.o.map((o, i) => `<button class="opt" data-i="${i}">${o}</button>`).join('')}</div><div class="feed" id="qf">이 전시실을 둘러보면 답이 보여요.</div>`);
  b.querySelectorAll('.opt').forEach(x => x.onclick = () => { const i = +x.dataset.i, f = b.querySelector('#qf');
    if (i === Q.a) { x.classList.add('right'); sfx('item'); S.stamps[hall] = 1; saveHall(); f.className = 'feed'; f.innerHTML = '정답! 쾅 — 스탬프 획득 🟥'; modalLater(() => { closeModal(); fxBurst(PL.x, PL.y, '#E0533F', 24); const n = HALLS.filter(h => S.stamps[h]).length; banner(`스탬프 ${n} / 5`, n >= 5 ? '모두 모았어요! 로비 안내 데스크에서 수료증을 받으세요' : `${R.inst} 완료`); }, 700); }
    else { x.classList.add('wrong'); x.disabled = true; sfx('bad'); f.className = 'feed bad'; f.textContent = '아쉬워요! 전시를 다시 보고 골라 보세요.'; } });
}
