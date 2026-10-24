// ================================================================ 메뉴 · 모드 전환
MODES.escape = ESC;
const MODEINFO = [
  { id: 'escape', n: '방탈출', tg: '1인 · 25~40분 · 퍼즐', p: '정전된 연구단지. 15개 기관 방이 잠금 사슬로 이어져 있다. 카드키·전력·레이저·배수를 풀어 통합 관제실 탈출 코드를 찾아라.', li: ['회로·소코반·레이저 거울·망원경·포격·열차 분기', '드라이버로 환풍구 지름길', '조각 4개 × 순서표 = 최종 코드'], cam: [89, 31] },
  { id: 'hide', n: '숨바꼭질', tg: '1 vs 술래 봇 3 · 3분', p: '근처 조형물로 변신하거나 바닥색으로 몸을 칠해 숨어라. 술래 봇은 시야 원뿔로 살핀다. 30초마다 휘파람이 울린다.', li: ['변신 Q · 위장 페인트', '움직이면 의심도 상승', '술래 역할 모드도 선택 가능'], cam: [44, 54] },
  { id: 'chase', n: '탈출전', tg: '나 + 동료 봇 3 vs 위조탱 1', p: '단말기 5개를 복구하면 출구가 열린다. 위조탱에게 잡히면 격리실로. 동료를 구출하고 탈출하라.', li: ['단말기 미니게임 7곳 중 5곳', '변신으로 위조탱 따돌리기', '위조탱 역할 모드도 선택 가능'], cam: [60, 74] },
];
function showMenu() {
  STATE.mode = 'menu'; MODE = null; closeModal();
  const m = $('#menu'); m.hidden = false;
  let best = null; try { best = +localStorage.getItem('kw_best_escape') || null; } catch (e) { }
  m.innerHTML = `<div class="mwrap"><div class="mt"><h1>케이요새 <em>월드</em></h1><p>방과 복도로 이어진 거대한 연구단지. 기관마다 다른 장치와 지형이 숨어 있다. 같은 맵, 세 가지 게임.</p></div>
  <div class="modes">${MODEINFO.map(o => `<button class="mc" data-m="${o.id}"><canvas width="480" height="300" data-cam="${o.cam}"></canvas><div class="tg">${o.tg}</div><h2>${o.n}</h2><p>${o.p}</p><ul>${o.li.map(x => `<li>${x}</li>`).join('')}</ul><div class="go">${MODES[o.id] ? '시작' : '준비 중'}</div></button>`).join('')}</div>
  <div class="mfoot">${best ? `방탈출 최고 기록 ${fmtT(best)} · ` : ''}PC: WASD·방향키 이동, E 사용 / 모바일: 왼쪽 조이스틱, 오른쪽 버튼<br>이 미리보기는 봇과 함께하는 1인용입니다. 온라인 다인전은 본 서비스에서 같은 맵으로 연결됩니다.${HOME_LINK ? HOME_LINK.replace('homelink', 'homelink menuhome') : ''}<br><button id="muteBtn">${MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button></div></div>`;
  m.querySelectorAll('.mc').forEach(b => b.onclick = () => { ac(); const id = b.dataset.m; if (id === 'hide') { openModal(mhead('숨바꼭질', '어느 쪽을 할까?') + `<div class="opts two"><button class="opt" id="pH"><b>🫥 숨는 쪽</b><br><small>술래 봇 3대를 피해 150초 버티기</small></button><button class="opt" id="pS"><b>🔎 찾는 쪽</b><br><small>소품으로 숨은 탱크 5대를 180초 안에 찾기</small></button></div>`); $('#pH').onclick = () => { closeModal(); startMode('hide'); }; $('#pS').onclick = () => { closeModal(); startMode('seek'); }; return; } if (id === 'chase') { openModal(mhead('탈출전', '어느 쪽을 할까?') + `<div class="opts two"><button class="opt" id="pC"><b>🏃 생존자</b><br><small>동료 봇 3대와 단말기 복구 후 탈출</small></button><button class="opt" id="pF"><b>👹 위조탱</b><br><small>탱크 4대를 잡아 격리실로</small></button></div>`); $('#pC').onclick = () => { closeModal(); startMode('chase'); }; $('#pF').onclick = () => { closeModal(); startMode('chaseS'); }; return; } if (MODES[id]) startMode(id); else toast('준비 중인 모드입니다.'); });
  $('#muteBtn').onclick = () => { MUTE = !MUTE; try { localStorage.setItem('kw_mute', MUTE ? '1' : '0'); } catch (e) { } showMenu(); };
  // 미리보기
  m.querySelectorAll('canvas[data-cam]').forEach(c => { const [x, y] = c.dataset.cam.split(',').map(Number); snapshot(c, x, y, 0.42); });
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
  STATE.run = (STATE.run || 0) + 1; STATE.visited = {}; STATE.curRoom = 'x'; MODE.init(); $('#hmode').textContent = MODE.name; $('#keyhint').textContent = MODE.keys || ''; $('#toast').hidden = true; toastT = 0; $('#centerMsg').hidden = true; $('#danger').hidden = true; $('#banner').hidden = true; bannerT = 0;
  $('#tasks').hidden = !MODE.tasksUI && id !== 'escape'; $('#inv').hidden = id !== 'escape'; $('#hintBtn').hidden = !MODE.hint;
  $('#altBtn').classList.toggle('on', !!MODE.alt); $('#altBtn').textContent = MODE.altLabel || '변신';
  $('#tasks').classList.toggle('min', innerWidth < 600 && id === 'escape'); MODE._hk = null; MODE._h = null; MODE.hud && MODE.hud(0);
  MODE.intro && MODE.intro();
}
$('#hintBtn').onclick = () => MODE && MODE.hint && MODE.hint();
$('#mapBtn').onclick = () => toggleMap();
$('#menuBtn').onclick = () => { if (STATE.mode === 'menu') return; openModal(mhead('일시 정지', '메뉴') + `<div class="row"><button class="btn" data-close>계속하기</button><button class="btn ghost" id="mRe">처음부터</button><button class="btn ghost" id="mMenu">모드 선택</button><button class="btn ghost" id="mHelp">조작법</button><button class="btn ghost" id="mMute">${MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'}</button></div>`); $('#mMute').onclick = () => { MUTE = !MUTE; try { localStorage.setItem('kw_mute', MUTE ? '1' : '0'); } catch (e) { } $('#mMute').textContent = MUTE ? '🔇 소리 켜기' : '🔊 소리 끄기'; }; $('#mRe').onclick = () => { const id = Object.keys(MODES).find(k => MODES[k] === MODE); closeModal(); if (id === 'escape') { try { localStorage.removeItem('kw_save_escape'); } catch (e) { } } startMode(id); }; $('#mMenu').onclick = () => showMenu(); $('#mHelp').onclick = () => helpModal();
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
