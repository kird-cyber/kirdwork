// ================================================================ 메뉴 · 모드 전환
MODES.escape = ESC;
const MODEINFO = [
  { id: 'escape', n: '방탈출', tg: '1인 · 25~40분 · 퍼즐', map: '케이요새 연구단지 — 네모난 기관 방 15개가 복도로 이어진 격자', p: '정전된 연구단지. 기관 방이 잠금 사슬로 이어져 있다. 카드키·전력·레이저·배수를 풀어 통합 관제실 탈출 코드를 찾아라.', li: ['목표: 임무 목록을 하나씩 → 마지막에 탈출 코드 입력', '회로·소코반·레이저 거울·망원경·포격·열차 분기', '막히면 힌트 H · 지도 M'], cam: [89, 31] },
  { id: 'hide', n: '숨바꼭질', tg: '1 vs 술래 봇 3 · 3분', map: '과학 정원 & 원형극장 — 원형 무대·미로 정원·연못·대나무 숲', p: '술래 3대가 원형극장 한가운데 무대 대기실에서 35초 뒤 출발한다. 정원 곳곳으로 흩어져 소품으로 변신하거나 바닥색으로 몸을 칠해 숨어라.', li: ['목표: 150초 동안 들키지 않기', 'Q 변신 · 가만히 있으면 위장 칠', '술래(찾는 쪽) 역할도 선택 가능'], cam: [61.5, 40] },
  { id: 'chase', n: '탈출전', tg: '나 + 동료 봇 3 vs 위조탱 1', map: '야간 도심 — 바둑판 도로·대각 대로·분수 로터리', p: '밤의 도심. 건물 속 단말기 5곳을 복구하면 지하철역·헬기장 탈출구가 열린다. 위조탱에게 잡히면 검증 센터 격리실로 — 동료를 구출하라.', li: ['목표: 단말기 5/7 복구 → 탈출구로', '변신으로 위조탱 따돌리기 · 동료 구출', '위조탱(쫓는 쪽) 역할도 선택 가능'], cam: [60.5, 40.5] },
];
// KIRD 2025 성과 · 2026 교육 한 줄 소식 (결과 화면·메뉴용, 게임 진행과 무관)
const KIRD_FACTS = ['2025년 KIRD 교육 수료생 355,911명 — 집합 33,310명 · 온라인 322,601명', '과학기술인 학습플랫폼 알파캠퍼스 누적 회원 888,424명 (2025)', '2025년 9월 KIRD 미래비전 2050 선포 — 과학기술로 여는 내일, 인재가 만드는 미래', '미래비전 2050의 5대 미래역할: PACEMAKER · NAVIGATOR · PLATFORM · GLOBAL · PARTNER', '2025년 생성형 AI 튜터 시범 운영 만족도 4.54점 — 2027년까지 전 과정 적용 목표', '배움이 역량으로 쌓이는 KIRD 디지털 배지 — 알파캠퍼스 배지 지갑에서 확인', '2026 KIRD 교육 여정: 교육탐색 → 역량진단 → 학습로드맵 → 학습 → 디지털 배지', '2026 KIRD 해외연수 8곳 — 독일 · 영국 · 벨기에 · 오스트리아 · 호주 · 스위스 · 유럽 · 미국', 'K-클럽 누적 회원 45,353명 — 과학기술인 경력개발 플랫폼 (2025)', '2025년 집합교육 만족도 4.69점, 이러닝 만족도 4.50점', '해외 우수인재 생활·경력 통합지원 (2025~2030) — 24시간 AI 챗봇과 생활 버디', '이공계 대학생 연구경력 탐색 과정 190여 명 참여, 만족도 4.71점 (2025)'];
function kirdFact() { const f = KIRD_FACTS[Math.floor(Math.random() * KIRD_FACTS.length)]; return `<p class="note kfact" style="margin:10px 0 0;padding:8px 10px;border-radius:10px;background:rgba(46,134,214,.1);text-align:left">💡 <b>KIRD 소식</b> ${f}</p>`; }
function showMenu() {
  STATE.mode = 'menu'; MODE = null; closeModal();
  const m = $('#menu'); m.hidden = false;
  let best = null; try { best = +localStorage.getItem('kw_best_escape') || null; } catch (e) { }
  m.innerHTML = `<div class="mwrap"><div class="mt"><h1>케이요새 <em>월드</em></h1><p>게임마다 다른 맵 — 네모난 연구단지, 둥근 과학 정원, 대각선이 가로지르는 야간 도심. 처음 하면 ‘따라하기’가 단계별로 안내해 줘요.</p></div>
  <div class="modes">${MODEINFO.map(o => `<button class="mc" data-m="${o.id}"><canvas width="480" height="300" data-cam="${o.cam}"></canvas><div class="tg">${o.tg}</div><h2>${o.n}</h2><div class="mapn">🗺 ${o.map}</div><p>${o.p}</p><ul>${o.li.map(x => `<li>${x}</li>`).join('')}</ul><div class="go">${MODES[o.id] ? '시작' : '준비 중'}</div></button>`).join('')}</div>
  <div class="kpromo" style="margin:14px auto 0;max-width:980px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font-size:14px;line-height:1.6"><b style="color:#FFE07A">KIRD 2025 · 2026</b> <span id="kfactRot">${KIRD_FACTS[0]}</span></div><div class="mfoot">${best ? `방탈출 최고 기록 ${fmtT(best)} · ` : ''}PC: WASD·방향키 이동, E 사용 / 모바일: 왼쪽 조이스틱, 오른쪽 버튼<br>이 미리보기는 봇과 함께하는 1인용입니다. 온라인 다인전은 본 서비스에서 같은 맵으로 연결됩니다.${HOME_LINK ? HOME_LINK.replace('homelink', 'homelink menuhome') : ''}<br><button class="tutopt" id="tutReset">따라하기 처음부터 다시 켜기</button> <button id="muteBtn">${MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button></div></div>`;
  m.querySelectorAll('.mc').forEach(b => b.onclick = () => { ac(); const id = b.dataset.m; if (id === 'hide') { openModal(mhead('숨바꼭질', '어느 쪽을 할까?') + `<div class="opts two"><button class="opt" id="pH"><b>🫥 숨는 쪽</b><br><small>술래 봇 3대를 피해 150초 버티기</small></button><button class="opt" id="pS"><b>🔎 찾는 쪽</b><br><small>소품으로 숨은 탱크 5대를 180초 안에 찾기</small></button></div>`); $('#pH').onclick = () => { closeModal(); startMode('hide'); }; $('#pS').onclick = () => { closeModal(); startMode('seek'); }; return; } if (id === 'chase') { openModal(mhead('탈출전', '어느 쪽을 할까?') + `<div class="opts two"><button class="opt" id="pC"><b>🏃 생존자</b><br><small>동료 봇 3대와 단말기 복구 후 탈출</small></button><button class="opt" id="pF"><b>👹 위조탱</b><br><small>탱크 4대를 잡아 격리실로</small></button></div>`); $('#pC').onclick = () => { closeModal(); startMode('chase'); }; $('#pF').onclick = () => { closeModal(); startMode('chaseS'); }; return; } if (MODES[id]) startMode(id); else toast('준비 중인 모드입니다.'); });
  $('#tutReset').onclick = () => { TUT.reset(); toast('모든 게임에서 따라하기가 다시 나와요', 1800); };
  $('#muteBtn').onclick = () => { MUTE = !MUTE; try { localStorage.setItem('kw_mute', MUTE ? '1' : '0'); } catch (e) { } showMenu(); };
  { let i = 0; clearInterval(showMenu._t); showMenu._t = setInterval(() => { const e = $('#kfactRot'); if (!e || $('#menu').hidden) return; i = (i + 1) % KIRD_FACTS.length; e.textContent = KIRD_FACTS[i]; }, 4500); }
  // 미리보기
  m.querySelectorAll('.mc').forEach(b => { const c = b.querySelector('canvas[data-cam]'); const [x, y] = c.dataset.cam.split(',').map(Number); loadMap(MODEMAP[b.dataset.m]); snapshot(c, x, y, 0.42); });
}
function snapshot(c, x, y, s) {
  const save = ctx, sv = { x: CAM.x, y: CAM.y }; const c2 = c.getContext('2d'); ctx = c2;
  ctx.setTransform(s, 0, 0, s, c.width / 2 - x * T * s, c.height / 2 - y * T * s);
  const hw = c.width / 2 / s / T + 2, hh = c.height / 2 / s / T + 2; const i0 = Math.max(0, Math.floor(x - hw)), i1 = Math.min(MW - 1, Math.ceil(x + hw)), j0 = Math.max(0, Math.floor(y - hh)), j1 = Math.min(MH - 1, Math.ceil(y + hh));
  drawFloor(i0, j0, i1, j1); drawTracks(); drawRoomLabels(); const vis = DEC.filter(d => d.x + d.w >= i0 - 3 && d.x <= i1 + 3 && d.y + d.h >= j0 - 3 && d.y <= j1 + 3); drawDecor(vis.filter(d => !d.solid)); drawDecor(vis.filter(d => d.solid)); drawWalls(i0, j0, i1, j1); drawDoors();
  ctx = save; CAM.x = sv.x; CAM.y = sv.y;
}
function startMode(id) {
  $('#menu').hidden = true; MODE = MODES[id]; PUSH = []; ENTS = []; FX.length = 0; INTER = []; STATE.over = false;
  STATE.run = (STATE.run || 0) + 1; STATE.visited = {}; STATE.curRoom = 'x'; STATE.tutHold = false; TUT.stop(); loadMap(MODEMAP[id] || 'lab'); CHC.clear(); MODE.init(); $('#hmode').textContent = MODE.name; $('#keyhint').textContent = MODE.keys || ''; $('#toast').hidden = true; toastT = 0; $('#centerMsg').hidden = true; $('#danger').hidden = true; $('#banner').hidden = true; bannerT = 0;
  $('#tasks').hidden = !MODE.tasksUI && id !== 'escape'; $('#inv').hidden = id !== 'escape'; $('#hintBtn').hidden = !MODE.hint;
  $('#altBtn').classList.toggle('on', !!MODE.alt); $('#altBtn').textContent = MODE.altLabel || '변신';
  $('#tasks').classList.toggle('min', innerWidth < 600 && id === 'escape'); MODE._hk = null; MODE._h = null; MODE.hud && MODE.hud(0);
  MODE.intro && MODE.intro();
  TUT.begin(id);
}
$('#hintBtn').onclick = () => MODE && MODE.hint && MODE.hint();
$('#mapBtn').onclick = () => toggleMap();
$('#menuBtn').onclick = () => { if (STATE.mode === 'menu') return; openModal(mhead('일시 정지', '메뉴') + `<div class="row"><button class="btn" data-close>계속하기</button><button class="btn ghost" id="mRe">처음부터</button><button class="btn ghost" id="mMenu">모드 선택</button><button class="btn ghost" id="mHelp">조작법</button><button class="btn ghost" id="mTut">따라하기 다시</button><button class="btn ghost" id="mMute">${MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button></div>`); $('#mMute').onclick = () => { MUTE = !MUTE; try { localStorage.setItem('kw_mute', MUTE ? '1' : '0'); } catch (e) { } $('#mMute').textContent = MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'; }; $('#mRe').onclick = () => { const id = Object.keys(MODES).find(k => MODES[k] === MODE); closeModal(); if (id === 'escape') { try { localStorage.removeItem('kw_save_escape'); } catch (e) { } } startMode(id); }; $('#mMenu').onclick = () => showMenu(); $('#mHelp').onclick = () => helpModal(); $('#mTut').onclick = () => { const id = Object.keys(MODES).find(k => MODES[k] === MODE); closeModal(); TUT.begin(id, true); };
  if (HOME_LINK) $('#modal .box').insertAdjacentHTML('beforeend', HOME_LINK); };
$('#tasks').addEventListener('click', e => { if (e.target.closest('.tk-h')) $('#tasks').classList.toggle('min'); });
function helpModal() { openModal(mhead('도움말', '조작법') + `<div class="help"><ul><li><b>이동</b> WASD · 방향키 / 모바일 왼쪽 조이스틱</li><li><b>사용·조사</b> E · Space / 모바일 오른쪽 큰 버튼 (노란 말풍선이 뜬 물체)</li><li><b>밀기</b> 바위·화분 쪽으로 계속 걸어가면 한 칸씩 밀린다</li><li><b>지도</b> M — 잠긴 문 색과 지금 목표 위치</li><li><b>힌트</b> H — 지금 할 일과 방향 화살표 (+60초)</li><li><b>보조 행동</b> Q — 숨바꼭질·탈출전에서 변신</li></ul><p class="note">문은 다가가면 자동으로 열린다. 색 테두리 문은 같은 색 카드나 조건(전력·레이저·핵융합)이 필요하다.</p></div><button class="btn" data-close>닫기</button>`); }
ESC.intro = function () {
  let has = false; try { has = !!localStorage.getItem('kw_save_escape'); } catch (e) { }
  if (has && !this._resumeAsked) { this._resumeAsked = true; openModal(mhead('방탈출', '이어서 할까?') + `<p class="q">지난번 진행 상황이 저장돼 있다.</p><div class="row"><button class="btn" id="rsY">이어하기</button><button class="btn ghost" id="rsN">처음부터</button></div>`, { sticky: true }); $('#rsY').onclick = () => { ESC._resumeAsked = false; closeModal(); ESC.load(); toast('저장된 지점에서 이어 한다'); }; $('#rsN').onclick = () => { try { localStorage.removeItem('kw_save_escape'); } catch (e) { } closeModal(); ESC.intro(); }; return; }
  this._resumeAsked = false;
  openModal(`<div class="win"><div class="key">🔌</div><h3>정전된 연구단지</h3><p>케이요새 연구단지의 전력이 끊겼다. 통합 관제실 문은 핵융합로가 켜져야 열리고, 탈출 코드는 4개 기관에 흩어진 <b>조각 숫자</b>와 보안 금고의 <b>순서표</b>로 맞춰야 한다.</p><p>왼쪽 <b>임무</b> 목록이 할 수 있는 일을 알려 준다. 막히면 <b>${COARSE ? '힌트' : '힌트(H)'}</b>.</p><div class="row"><button class="btn" data-close>탐사 시작</button><button class="btn ghost" id="ih">조작법</button></div></div>`);
  $('#ih').onclick = helpModal;
};
showMenu();
requestAnimationFrame(frame);
// 주소로 바로 들어오기: ?m=escape | hide | chase | seek | chaseS
(function () { let q = null; try { q = new URLSearchParams(location.search).get('m'); } catch (e) { } if (!q) return; if (MODES[q] && q !== 'hide' && q !== 'chase') { startMode(q); return; } const b = document.querySelector(`.mc[data-m="${q}"]`); b && b.click(); })();
