// ============================================================== ONLINE: home screen, waiting room, network game (DOM)
// Lockstep: every device runs the same simulation. Only TurnInputs travel (plus a cosmetic live feed of the active turn).
const ON = {
  link: null, myId: null, nick: '', code: null, brokerIdx: 0, game: null, spectator: false, syncing: false,
  inputs: {}, applied: {}, live: null, liveN: 0, liveSeen: -1, autoSent: {}, aimTurn: 0, aimSince: 0,
  lastLive: '', lastLiveAt: 0, hashTurn: 0, rebuildAt: 0, active: false,
};
const DQ = s => document.querySelector(s);

function onlineId() {
  try { let id = sessionStorage.getItem('bm.id'); if (!id) { id = genId(); sessionStorage.setItem('bm.id', id); } return id; } catch (e) { return genId(); }
}
function savedNick() { try { return localStorage.getItem('bm.nick') || localStorage.getItem('pg.nick') || ''; } catch (e) { return ''; } }
function saveNick(n) { try { localStorage.setItem('bm.nick', n); } catch (e) {} }
function savedTank() { try { const t = localStorage.getItem('bm.sub'); return t === 'random' || (CONFIG.subs[t] && !CONFIG.subs[t].hidden) ? t : 'uboat'; } catch (e) { return 'uboat'; } }
function saveTank(t) { try { localStorage.setItem('bm.sub', t); } catch (e) {} }
function brokerOverride() { try { return new URLSearchParams(location.search).get('broker'); } catch (e) { return null; } }
function brokerUrl(i) { return brokerOverride() || BROKERS[i] || BROKERS[0]; }
function parseInvite() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const code = (h.get('r') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  return code.length === 5 ? { code, b: Math.max(0, Math.min(BROKERS.length - 1, +h.get('b') || 0)) } : null;
}
function inviteUrl() { return location.origin + location.pathname + location.search + `#r=${ON.code}&b=${ON.brokerIdx}`; }

// ---------------------------------------------------------------- screens
let screen = 'home';
function showScreen(name) {
  screen = name;
  $('home').hidden = name !== 'home';
  $('lobby').hidden = name !== 'lobby';
  $('setup').hidden = name !== 'setup';
  const g = name === 'game';
  $('gchat').hidden = !(g && ON.active); if (!g) { closeGameChat(); $('gameMsgs').innerHTML = ''; }
  $('diag').hidden = !g; if (!g) $('diag').textContent = '';
  $('hudTop').hidden = !g; $('hud').hidden = !g; $('hint').hidden = !g; $('touch').hidden = !g;
  if (!g) { $('over').hidden = true; AU.setCharge(false, 0); AU.setEngine(false); TUT.on = false; showCoach(); }
  AU.music(g ? 'game' : 'lobby');
  if (name === 'setup') renderSetup();
  if (name === 'home') { renderHome(); probeBrokers(); }
}

// ---------------------------------------------------------------- home
function homeMsg(s, bad) { const e = $('homeMsg'); e.textContent = s || ''; e.classList.toggle('bad', !!bad); }
// per-device record of online games (no login, so it lives in this browser)
function loadRecord() { try { return JSON.parse(localStorage.getItem('bm.record') || 'null') || { w: 0, l: 0, d: 0, last: '' }; } catch (e) { return { w: 0, l: 0, d: 0, last: '' }; } }
function noteResult(gid, res) {
  const r = loadRecord(); if (r.last === gid) return; r.last = gid;
  r[res]++; try { localStorage.setItem('bm.record', JSON.stringify(r)); } catch (e) {}
}
function renderHome() {
  const inv = parseInvite();
  const rec = loadRecord(), n = rec.w + rec.l + rec.d, el = $('record');
  el.hidden = n === 0;
  if (n) el.innerHTML = `내 전적 <b>${rec.w}</b>승 <b>${rec.l}</b>패` + (rec.d ? ` <b>${rec.d}</b>무` : '') + ` · 승률 ${Math.round(100 * rec.w / Math.max(1, rec.w + rec.l))}%`;
  const pr = $('parade'); if (!pr.children.length && thumbs.uboat) for (const k of SUB_KEYS) pr.append(cloneCanvas(thumbs[k]));
  $('nickIn').value = ON.nick || savedNick();
  $('inviteBox').hidden = !inv; $('joinBtn').hidden = !inv;
  if (inv) $('inviteCode').textContent = inv.code;
  $('createBtn').className = inv ? 'ghost big' : 'start';
}
function readNick() {
  const n = $('nickIn').value.trim().slice(0, 8);
  if (!n) { homeMsg('닉네임을 먼저 입력하세요', true); $('nickIn').focus(); return null; }
  ON.nick = n; saveNick(n); return n;
}
function setHomeBusy(b) { for (const id of ['createBtn', 'joinBtn', 'codeBtn', 'practiceBtn']) $(id).disabled = b; }

// home screen: find a relay server that answers before anyone presses a button
const PROBE = { state: 'idle', idx: -1 };
async function probeBrokers() {
  if (PROBE.state === 'busy' || PROBE.state === 'ok') return showProbe();
  PROBE.state = 'busy'; showProbe();
  const order = brokerOverride() ? [0] : BROKERS.map((_, i) => i);
  for (const i of order) {
    const c = createMqtt(brokerUrl(i), { clientId: 'bmp' + genCode(8).toLowerCase(), keepalive: 30, timeoutMs: 5000 });
    try { await c.ready; c.close(); PROBE.state = 'ok'; PROBE.idx = i; showProbe(); return; } catch (e) {}
  }
  PROBE.state = 'fail'; showProbe();
}
function showProbe() {
  const e = $('probe'); if (!e) return;
  e.dataset.s = PROBE.state;
  e.textContent = PROBE.state === 'ok' ? `온라인 준비됨 · 중계 서버 ${PROBE.idx + 1}` : PROBE.state === 'fail' ? '중계 서버에 연결할 수 없습니다 — 인터넷 연결이나 회사·학교 방화벽을 확인하세요' : '온라인 연결 확인 중…';
}
async function createRoom() {
  const nick = readNick(); if (!nick) return;
  setHomeBusy(true); homeMsg('중계 서버에 연결하는 중…');
  const code = genCode(5), all = brokerOverride() ? [0] : BROKERS.map((_, i) => i);
  const order = PROBE.idx >= 0 ? [PROBE.idx, ...all.filter(i => i !== PROBE.idx)] : all;
  for (const idx of order) {
    homeMsg(`중계 서버 ${idx + 1}에 연결하는 중…`);
    const ok = await openLink(code, idx, true);
    if (ok) { setHomeBusy(false); return; }
  }
  setHomeBusy(false);
  homeMsg('중계 서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도하세요.', true);
}
async function joinRoom(code, idx) {
  const nick = readNick(); if (!nick) return;
  setHomeBusy(true); homeMsg(`방 ${code}에 들어가는 중…`);
  const ok = await openLink(code, idx, false);
  setHomeBusy(false);
  if (!ok) homeMsg('중계 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도하세요.', true);
}
// resolves true once connected (then the room callbacks drive the screens)
function openLink(code, idx, create) {
  return new Promise(resolve => {
    if (ON.link) { ON.link.leave(); ON.link = null; }
    let done = false;
    ON.code = code; ON.brokerIdx = idx; ON.myId = ON.myId || onlineId();
    const link = createRoomLink({
      code, url: brokerUrl(idx), myId: ON.myId, nick: ON.nick, tank: savedTank(), create,
      onStatus: s => {
        if (ON.link !== link) return;
        if (s === 'online' && !done) {
          done = true; resolve(true);
          try { history.replaceState(null, '', `#r=${code}&b=${idx}`); sessionStorage.setItem('bm.room', code); } catch (e) {}
          if (!link.room) homeMsg('방 정보를 받는 중…');
        }
        if (s === 'failed' && !done) { done = true; link.closed = true; ON.link = null; resolve(false); }
        if (s === 'noroom' && !link.room) { leaveOnline(); homeMsg(`방 ${code}을(를) 찾지 못했습니다. 링크가 맞는지, 방장이 아직 방에 있는지 확인하세요.`, true); }
        if (s === 'host') banner('이제 내가 방장입니다');
        updateNetStatus();
      },
      onChange: room => onRoomChange(room),
      onGame: (game, late) => startOnlineMatch(game, late),
      onInput: inp => onNetInput(inp),
      onLive: lv => { ON.live = lv; lv.n = ++ON.liveN; ON.liveAt = performance.now(); },
      onLog: log => onNetLog(log),
      onCmd: cmd => { if (cmd.type === 'resync' && (cmd.id === ON.myId || cmd.id === '*')) requestRebuild('hash'); if (cmd.type === 'full' && cmd.id === ON.myId) { leaveOnline(); homeMsg('방이 가득 찼습니다 (최대 8명).', true); } },
      onChat: c => onChat(c),
      onKicked: () => { leaveOnline(); homeMsg('방장이 나를 내보냈습니다.', true); },
    });
    ON.link = link;
  });
}
function leaveOnline() {
  if (ON.link) ON.link.leave();
  ON.link = null; ON.game = null; ON.active = false; setTurnTitle(false);
  try { history.replaceState(null, '', location.pathname + location.search); sessionStorage.removeItem('bm.room'); } catch (e) {}
  showScreen('home');
}

// ---------------------------------------------------------------- lobby
function onRoomChange(room) {
  if (!room || !ON.link) return;
  if (room.state === 'lobby') {
    if (screen !== 'lobby') { ON.game = null; ON.active = false; showScreen('lobby'); }
    renderLobby();
  } else if (room.state === 'game' && screen === 'home') {
    // arrived while a game is running and it was not started for us yet (spectate)
    if (!ON.game) startOnlineMatch(room.game);
  }
  updateNetStatus();
}
function updateNetStatus() {
  const L = ON.link; if (!L) return;
  const txt = { connecting: '연결 중…', online: '연결됨', reconnecting: '다시 연결하는 중…', failed: '연결 실패' }[L.status] || '';
  const el = $('lobbyStatus'); if (el) { el.textContent = `중계 서버 ${ON.brokerIdx + 1} · ${txt}`; el.classList.toggle('bad', L.status !== 'online'); }
  const ns = $('netState'); if (ns) { ns.hidden = L.status === 'online'; ns.textContent = txt; }
}
function playerCard(p, room) {
  const L = ON.link, me = p.id === ON.myId, host = room.host === p.id, isHost = L.isHost();
  const el = document.createElement('div'); el.className = 'pc' + (me ? ' me' : '') + (L.online(p.id) || me ? '' : ' off');
  el.append(cloneCanvas(thumbs[p.tank] || thumbs.uboat));
  const info = document.createElement('div'); info.className = 'pi';
  const nm = document.createElement('b'); nm.textContent = p.nick; info.append(nm);
  const tags = document.createElement('span'); tags.className = 'tags';
  tags.textContent = [tankLabel(p.tank), host ? '방장' : '', me ? '나' : '', L.online(p.id) || me ? '' : '연결 끊김'].filter(Boolean).join(' · ');
  if (!host && p.ready) { const r = document.createElement('span'); r.className = 'ready'; r.textContent = ' · 준비 완료'; tags.append(r); }
  info.append(tags); el.append(info);
  const act = document.createElement('div'); act.className = 'pa';
  if (me || isHost) {
    const other = p.team === 'red' ? 'blue' : 'red';
    const mv = document.createElement('button'); mv.type = 'button'; mv.className = 'mini';
    mv.textContent = other === 'blue' ? '블루로 →' : '← 레드로';
    mv.setAttribute('aria-label', `${p.nick}을(를) ${other === 'blue' ? '블루' : '레드'} 팀으로`);
    mv.disabled = teamCount(room, other) >= CONFIG.turn.teamMax;
    mv.onclick = () => { AU.play('ui'); if (me) L.requestTeam(other); else L.moveOther(p.id, other); };
    act.append(mv);
  }
  if (isHost && !me) {
    const k = document.createElement('button'); k.type = 'button'; k.className = 'mini warn'; k.textContent = '내보내기';
    k.onclick = () => { if (confirm(`${p.nick}을(를) 방에서 내보낼까요?`)) L.kick(p.id); };
    act.append(k);
  }
  el.append(act);
  return el;
}
function renderLobby() {
  const L = ON.link; if (!L || !L.room) return;
  const room = L.room, isHost = L.isHost(), me = L.me();
  $('roomCode').textContent = ON.code;
  $('shareLink').value = inviteUrl();
  for (const team of ['red', 'blue']) {
    const list = $(team + 'List'); list.innerHTML = '';
    const ps = room.players.filter(p => p.team === team);
    ps.forEach(p => list.append(playerCard(p, room)));
    for (let i = ps.length; i < CONFIG.turn.teamMax; i++) { const e = document.createElement('div'); e.className = 'pc empty'; e.textContent = '빈 자리'; list.append(e); }
    $(team + 'N').textContent = `${ps.length} / ${CONFIG.turn.teamMax}`;
  }
  // my tank
  const picks = $('myPicks'); picks.innerHTML = '';
  const myTank = me ? me.tank : savedTank();
  buildPicks(picks, myTank, k => { AU.play('ui'); saveTank(k); L.requestTank(k); renderTankInfo(k); }, '내 잠수함', k => renderTankInfo(k));
  picks.onmouseleave = () => renderTankInfo(me ? me.tank : savedTank());
  renderTankInfo(myTank);
  // maps
  const maps = $('lobbyMaps'); maps.innerHTML = '';
  for (const [k, meta] of Object.entries(CONFIG.maps)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mapc' + (room.map === k ? ' sel' : '');
    b.append(cloneCanvas(previews[k] || (previews[k] = mapPreview(k))));
    const inner = document.createElement('div'); inner.className = 'in';
    inner.innerHTML = `<span class="t">${meta.name}</span><span class="g">${meta.tag}</span>`;
    b.append(inner); b.disabled = !isHost && room.map !== k; b.setAttribute('aria-pressed', String(room.map === k));
    if (isHost) b.onclick = () => { AU.play('ui'); L.setMap(k); };
    maps.append(b);
  }
  $('mapNote').textContent = isHost ? '(방장이 고릅니다 · 눌러서 변경)' : '(방장이 고릅니다)';
  const st = $('lobbyStart');
  st.hidden = !isHost;
  st.disabled = !L.canStart();
  const rb = $('readyBtn'); rb.hidden = isHost || !me;
  if (me) { rb.textContent = me.ready ? '준비 취소' : '준비 완료'; rb.className = me.ready ? 'ghost big' : 'start'; }
  const red = teamCount(room, 'red'), blue = teamCount(room, 'blue');
  const others = room.players.filter(p => p.id !== room.host), readyN = others.filter(p => p.ready).length;
  $('startNote').textContent = isHost
    ? (L.canStart() ? `${red} 대 ${blue} · 준비 ${readyN}/${others.length}` + (readyN < others.length ? ' (준비 안 해도 시작할 수 있어요)' : ' · 모두 준비 완료!') : '양 팀에 1명 이상 있어야 시작할 수 있습니다')
    : (me ? (me.ready ? '준비 완료! 방장이 시작하면 바로 전투가 시작됩니다' : '준비되면 "준비 완료"를 눌러 주세요') : '방에 들어가는 중…');
  updateNetStatus();
}
function renderTankInfo(k) { renderTankCard($('tankInfo'), k); }

// ---------------------------------------------------------------- network game
function cleanGame(game) {
  const ok = game && Array.isArray(game.players) && game.players.length >= 2 && game.players.length <= CONFIG.turn.maxPlayers && CONFIG.maps[game.mapId];
  if (!ok) return null;
  const seen = {};
  const players = game.players.filter(p => p && typeof p.id === 'string' && !seen[p.id] && (seen[p.id] = 1)).map(p => ({
    id: p.id, nick: String(p.nick || '').slice(0, 8) || '?', team: p.team === 'blue' ? 'blue' : 'red', subId: CONFIG.subs[p.subId] ? p.subId : PICK_KEYS[0],
  }));
  if (!players.some(p => p.team === 'red') || !players.some(p => p.team === 'blue')) return null;
  return Object.assign({}, game, { seed: game.seed >>> 0, players });
}
function startOnlineMatch(game, late) {
  game = cleanGame(game); if (!game) return;
  ON.game = game; ON.inputs = {}; ON.applied = {}; ON.live = null; ON.liveSeen = -1; ON.autoSent = {};
  ON.hashTurn = 0; ON.aimTurn = 0; ON.lastLive = ''; ON.active = true;
  ON.spectator = !game.players.some(p => p.id === ON.myId);
  TUT.on = false; showCoach(); PRACTICE.bots = {};
  // joined late (reload or spectator): wait for the retained log, then fast-forward
  ON.syncing = !!late; ON.needAt = 0; ON.liveAt = 0;
  beginMatch({ seed: game.seed, mapId: game.mapId, players: game.players }, onlineCtrlOpts());
  showScreen('game');
  banner(ON.spectator ? '관전 중 — 다음 판부터 참여합니다' : CONFIG.maps[game.mapId].name);
  if (!late) announceHappening();
  if (ON.syncing) {
    banner('진행 중인 게임에 맞추는 중…');
    setTimeout(() => { ON.syncing = false; if (ON.link && ON.link.log.length) rebuildFrom(ON.link.log); }, 1800);
  }
}
function onlineCtrlOpts() {
  return {
    isLocal: idx => !ON.syncing && !ON.spectator && match.subs[idx].id === ON.myId && !ON.inputs[ik(match.turnNo, match.subs[idx].id)],
    remote: remoteTick,
    onInput: inp => { ON.applied[inp.turnNo] = inp; if (ON.link) ON.link.sendInput(inp); },
  };
}
// inputs are keyed by turn AND seat: a stray input for the wrong seat (a desynced device, a bad packet) can never
// block the real one — every device takes the one whose seat matches its own simulation's current sub
const ik = (turnNo, seat) => turnNo + ':' + seat;
const curKey = m => ik(m.turnNo, m.cur >= 0 ? m.subs[m.cur].id : '');
function validInput(x) { return !!x && Number.isInteger(x.turnNo) && typeof x.seat === 'string' && !!ON.game && ON.game.players.some(p => p.id === x.seat); }
function inputKey(x) { return JSON.stringify([x.turnNo, x.seat, x.actions, x.pts || null, x.gauge, x.weapon, x.used || 0, !!x.timeout, !!x.ended, x.forfeit || '']); }
function onNetInput(inp) {
  if (!ON.active || !validInput(inp)) return;
  const mine = ON.applied[inp.turnNo];
  if (mine) { if (mine.seat === inp.seat && inputKey(mine) !== inputKey(inp)) requestRebuild('input'); return; }
  ON.inputs[ik(inp.turnNo, inp.seat)] = inp;
}
function onNetLog(log) {
  if (!ON.active || ON.syncing) return;
  // a longer authoritative log than what we have seen: take the missing inputs, rebuild if anything disagrees
  for (const x of log) {
    if (!validInput(x)) continue;
    const a = ON.applied[x.turnNo];
    if (a && a.seat === x.seat && inputKey(a) !== inputKey(x)) { requestRebuild('log'); return; }
    if (!a) ON.inputs[ik(x.turnNo, x.seat)] = x;
  }
}
function actUnits(actions) { let n = 0; for (const a of actions) n += a.t === 'm' ? a.n : 1; return n; }
// Applies whatever part of `actions` this device has not applied yet. False if what we applied is not a prefix of it.
function applyPartial(m, actions) {
  if (!Array.isArray(actions)) return false;
  const done = m.turn.actions;
  for (let i = 0; i < done.length; i++) {
    const a = done[i], b = actions[i];
    if (!b || a.t !== b.t) return false;
    if (a.t === 'm') { if (a.d !== b.d || a.n > b.n || (a.n < b.n && i !== done.length - 1)) return false; }
    else if (a.s !== b.s) return false;
  }
  const U = actUnits(done); let u = 0;
  let budget = CONFIG.turn.maxUnits; // same cut as applyTurnInput, so live and final inputs replay identically
  for (const b of actions) {
    if (!b || budget <= 0) break;
    if (b.t !== 'm' && b.t !== 'i') continue;
    const n = b.t === 'm' ? clampN(Math.floor(+b.n || 0), 0, budget) : 1;
    budget -= n;
    if (u + n <= U) { u += n; continue; }
    for (let k = 0; k < n; k++, u++) {
      if (u < U) continue;
      if (m.phase !== 'aim') return true;
      if (b.t === 'm') cmdMove(m, b.d); else cmdItem(m, b.s);
    }
  }
  return true;
}
function remoteTick(m, t) {
  const fin = ON.inputs[ik(m.turnNo, t.id)];
  if (fin) {
    if (!applyPartial(m, fin.actions || [])) { requestRebuild('partial'); return; }
    if (m.phase === 'aim') {
      if (fin.forfeit) cmdForfeit(m, fin.forfeit);
      else if (fin.timeout) cmdTimeout(m);
      else if (fin.ended) { requestRebuild('ended'); return; }
      else cmdFire(m, fin.pts, fin.gauge, fin.weapon, fin.used);
    }
    ON.applied[m.turnNo] = fin; delete ON.inputs[ik(m.turnNo, t.id)];
    return;
  }
  const lv = ON.live;
  if (lv && lv.turnNo === m.turnNo && lv.seat === t.id && applyPartial(m, lv.actions || [])) {
    if (m.phase !== 'aim') return;
    if (lv.n !== ON.liveSeen) { ON.liveSeen = lv.n; ctrl.timeLeft = lv.timeLeft; return; }
  }
  if (ctrl.timeLeft > 0) ctrl.timeLeft--;
}
let rebuildTimer = 0;
function requestRebuild(why) {
  if (rebuildTimer || !ON.link) return;
  console.warn('resync:', why); ON.resyncs = (ON.resyncs || 0) + 1;
  rebuildTimer = setTimeout(() => { rebuildTimer = 0; if (ON.active && ON.link) rebuildFrom(ON.link.log); }, 60);
}
// Recreate the match from the seed and every accepted input — identical on every device.
function rebuildFrom(log) {
  const g = ON.game; if (!g) return;
  const m = createMatch({ seed: g.seed, mapId: g.mapId, players: g.players });
  const byKey = {}, byTurn = {}; for (const x of log) if (validInput(x) && !byKey[ik(x.turnNo, x.seat)]) byKey[ik(x.turnNo, x.seat)] = x;
  let guard = 0;
  while (m.phase !== 'over' && guard++ < 4e6) {
    if (m.phase === 'aim') {
      const x = byKey[curKey(m)]; if (!x) break;
      byTurn[x.turnNo] = x;
      applyTurnInput(m, x);
      if (m.phase === 'aim') break; // input did not end the turn (should not happen)
    } else step(m);
    if (m.events.length > 2000) m.events.length = 0;
  }
  m.events.length = 0;
  ON.applied = byTurn; ON.inputs = {}; ON.hashTurn = 0;
  const cam = { x: R.cam.x, y: R.cam.y }, old = ctrl, oldTurn = match && match.turnNo;
  installMatch(m, onlineCtrlOpts());
  R.cam.x = cam.x; R.cam.y = cam.y;
  // same turn still running (e.g. my own turn): keep its clock, curve, weapon and curve memory
  if (old) { ctrl.mem = old.mem; if (m.phase === 'aim' && oldTurn === m.turnNo) { ctrl.lastTurnSeen = m.turnNo; ctrl.timeLeft = old.timeLeft; ctrl.rel = old.rel; ctrl.weapon = old.weapon; } }
  if (m.phase === 'over') R.onOver(m.winner, m.forfeit);
  ON.rebuildAt = performance.now();
}

// called from the main loop every frame while an online game is on screen
function onlineFrame(now) {
  const L = ON.link, m = match; if (!L || !m || !ON.active) return;
  if (now - (ON.diagAt || 0) > 500) {
    ON.diagAt = now;
    const st = { online: '●', reconnecting: '재연결 중', connecting: '연결 중', failed: '끊김' }[L.status] || L.status;
    $('diag').textContent = `턴 ${m.turnNo} · 기록 ${L.log.length} · 서버${ON.brokerIdx + 1} ${st}` + (ON.needs ? ` · 재요청 ${ON.needs}` : '') + (ON.resyncs ? ` · 재동기 ${ON.resyncs}` : '');
  }
  // state hash once per turn
  if (m.turnNo !== ON.hashTurn && m.hashes[m.turnNo] !== undefined) {
    ON.hashTurn = m.turnNo; L.noteMyHash(m.turnNo, m.hashes[m.turnNo]); L.sendHash(m.turnNo, m.hashes[m.turnNo]);
  }
  forfeitWatch(now, m, L);
  if (m.phase !== 'aim') { setTurnTitle(false); return; }
  const t = m.subs[m.cur];
  if (ON.aimTurn !== m.turnNo) { ON.aimTurn = m.turnNo; ON.aimSince = now; }
  setTurnTitle(ctrl.activeLocal() && document.hidden);
  // live feed of my turn for everyone else
  if (ctrl.activeLocal()) {
    const lv = { turnNo: m.turnNo, seat: ON.myId, actions: m.turn.actions }; // only movement and items are live; the curve, gauge and weapon stay private
    const s = JSON.stringify(lv);
    if ((s !== ON.lastLive && now - ON.lastLiveAt > 250) || now - ON.lastLiveAt > 1000) {
      ON.lastLive = s; ON.lastLiveAt = now; lv.timeLeft = ctrl.timeLeft; L.sendLive(lv);
    }
  }
  // stalled: waiting on someone else's turn with no sign of life for 5 s -> the turn probably ended
  // elsewhere and its input was lost on the way; ask for it again (repeats every 3 s)
  if (!ctrl.activeLocal() && !ON.inputs[curKey(m)] && !ON.syncing) {
    const lastSign = Math.max(ON.aimSince, ON.live && ON.live.turnNo === m.turnNo ? ON.liveAt : 0);
    if (now - lastSign > 5000 && now - (ON.needAt || 0) > 3000) { ON.needAt = now; L.requestTurn(m.turnNo); ON.needs = (ON.needs || 0) + 1; }
  }
  // host: skip the turn of a player who is gone (or frozen far past the time limit)
  if (L.isHost() && t.id !== ON.myId && !ON.inputs[curKey(m)] && !ON.applied[m.turnNo] && !ON.autoSent[m.turnNo]) {
    // gone = offline for 8 s in a row (a short network drop reconnects well inside that and its input still arrives)
    const waited = now - ON.aimSince;
    if (L.online(t.id)) ON.goneSince = 0; else if (!ON.goneSince || ON.goneTurn !== m.turnNo) { ON.goneSince = now; ON.goneTurn = m.turnNo; }
    const gone = ON.goneSince && now - ON.goneSince > 8000;
    if (gone || waited > (CONFIG.turn.timeLimitTicks / CONFIG.physics.tickRate + 15) * 1000) {
      ON.autoSent[m.turnNo] = true;
      L.sendInput({ turnNo: m.turnNo, seat: t.id, actions: JSON.parse(JSON.stringify(m.turn.actions)), timeout: true, auto: true });
    }
  }
}
// A whole team gone for 30 s loses. Every device shows the countdown; the host records the result as a TurnInput.
const FORFEIT_MS = 30000;
function forfeitWatch(now, m, L) {
  ON.goneTeam = null;
  if (m.phase === 'over') return;
  for (const team of ['red', 'blue']) {
    const members = ON.game.players.filter(p => p.team === team);
    const away = members.every(p => p.id !== ON.myId && !L.online(p.id));
    const k = 'gone_' + team;
    if (!away) { ON[k] = 0; continue; }
    if (!ON[k]) ON[k] = now;
    ON.goneTeam = { team, left: Math.max(0, Math.ceil((FORFEIT_MS - (now - ON[k])) / 1000)) };
    if (now - ON[k] > FORFEIT_MS && L.isHost() && m.phase === 'aim' && !ON.inputs[curKey(m)] && !ON.autoSent['f' + m.turnNo]) {
      ON.autoSent['f' + m.turnNo] = true;
      L.sendInput({ turnNo: m.turnNo, seat: m.subs[m.cur].id, actions: JSON.parse(JSON.stringify(m.turn.actions)), forfeit: team });
    }
  }
}
// the tab title tells a player in another tab that it is their turn
const BASE_TITLE = document.title;
function setTurnTitle(on) { const want = on ? '▶ 내 차례! · ' + BASE_TITLE : BASE_TITLE; if (document.title !== want) document.title = want; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTurnTitle(false); });
// hidden tabs get no animation frames: keep the simulation running in bigger steps so this device never falls behind
let hiddenLast = 0;
setInterval(() => {
  if (!document.hidden || screen !== 'game' || !match || !ctrl || !ON.active) { hiddenLast = 0; return; }
  const now = performance.now(), dt = hiddenLast ? (now - hiddenLast) / 1000 : 0.5; hiddenLast = now;
  if (match.phase !== 'over') ctrl.frame(dt, 6, 6 * CONFIG.physics.tickRate);
  match.events = match.events.filter(e => e.type === 'carve' || e.type === 'over');
  onlineFrame(now);
}, 500);

function onlineOver() {
  const L = ON.link, isHost = L && L.isHost();
  $('again').hidden = true; $('toSetup').hidden = true;
  $('toLobby').hidden = !isHost; $('leaveGame').hidden = false;
  $('rematchBtn').hidden = !isHost; $('rematchBtn').disabled = !(L && L.canRematch());
  $('overWait').hidden = isHost;
}
function bindOnlineUi() {
  $('createBtn').onclick = () => { AU.unlock(); createRoom(); };
  $('joinBtn').onclick = () => { AU.unlock(); const inv = parseInvite(); if (inv) joinRoom(inv.code, inv.b); };
  $('codeBtn').onclick = () => {
    AU.unlock();
    const c = $('codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 5) { homeMsg('방 코드는 5글자입니다', true); return; }
    joinRoom(c, 0);
  };
  $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('codeBtn').click(); });
  $('nickIn').addEventListener('keydown', e => { if (e.key === 'Enter') (parseInvite() ? $('joinBtn') : $('createBtn')).click(); });
  $('practiceBtn').onclick = () => { AU.unlock(); showScreen('setup'); };
  $('tutorialBtn').onclick = () => { AU.unlock(); const n = $('nickIn').value.trim().slice(0, 8); if (n) { ON.nick = n; saveNick(n); } startTutorial(); };
  $('coachSkip').onclick = () => { TUT.on = false; showCoach(); };
  $('rotateX').onclick = () => { $('rotateTip').hidden = true; try { sessionStorage.setItem('bm.rot', '1'); } catch (e) {} };
  const rot = () => { let seen = false; try { seen = sessionStorage.getItem('bm.rot') === '1'; } catch (e) {} $('rotateTip').hidden = !(screen === 'game' && matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth * 1.15) || seen; };
  window.addEventListener('resize', rot); setInterval(rot, 1500);
  $('backHome').onclick = () => showScreen('home');
  $('copyBtn').onclick = async () => {
    const url = inviteUrl();
    try { await navigator.clipboard.writeText(url); $('copyBtn').textContent = '복사됨!'; }
    catch (e) { $('shareLink').select(); document.execCommand && document.execCommand('copy'); $('copyBtn').textContent = '복사됨!'; }
    setTimeout(() => { $('copyBtn').textContent = '초대 링크 복사'; }, 1600);
  };
  $('lobbyStart').onclick = () => { AU.unlock(); if (ON.link && ON.link.start()) $('lobbyStart').disabled = true; };
  $('leaveBtn').onclick = () => leaveOnline();
  $('toLobby').onclick = () => { if (ON.link) ON.link.backToLobby(); };
  $('rematchBtn').onclick = () => { AU.unlock(); if (ON.link && ON.link.rematch()) $('rematchBtn').disabled = true; };
  $('readyBtn').onclick = () => { AU.play('ui'); const me = ON.link && ON.link.me(); if (me) ON.link.setReady(!me.ready); };
  $('leaveGame').onclick = () => leaveOnline();
  $('exitBtn').onclick = () => {
    if (ON.active) { if (confirm('게임에서 나갈까요? 내 잠수함은 남아서 차례가 자동으로 넘어갑니다.')) leaveOnline(); }
    else if (confirm('연습을 끝내고 처음 화면으로 갈까요?')) showScreen('home');
  };
  window.addEventListener('hashchange', () => { if (screen === 'home') renderHome(); });
}

// ---------------------------------------------------------------- chat + emotes
const EMOTES = [['nice', '👍', '나이스!'], ['lol', '😂', 'ㅋㅋㅋ'], ['wow', '😮', '헉!'], ['grr', '😤', '두고 봐'], ['sorry', '🙏', '미안~'], ['gg', '🤝', 'GG']];
function chatLine(c) {
  const d = document.createElement('div'); d.className = 'm ' + (c.team || '');
  const b = document.createElement('b'); b.textContent = c.nick; d.append(b, document.createTextNode(c.emote ? EMOTES.find(e => e[0] === c.emote)[1] + ' ' + c.text : c.text));
  return d;
}
function onChat(c) {
  if (c.emote && !EMOTES.some(e => e[0] === c.emote)) c.emote = null;
  const lm = $('lobbyMsgs'); lm.append(chatLine(c)); while (lm.children.length > 60) lm.firstChild.remove(); lm.scrollTop = lm.scrollHeight;
  if (screen === 'game') {
    const gm = $('gameMsgs'), line = chatLine(c); gm.append(line); while (gm.children.length > 5) gm.firstChild.remove();
    setTimeout(() => line.classList.add('old'), 8000); setTimeout(() => line.remove(), 8800);
    // speech bubble over the sender's tank
    if (match) { const t = match.subs.find(x => x.id === c.from); if (t) R.say(t.idx, c.emote ? EMOTES.find(e => e[0] === c.emote)[1] + ' ' + c.text : c.text); }
  }
  if (c.from !== ON.myId) AU.play('ui');
}
function sendChat(text, emote) {
  text = String(text || '').trim(); if (!text || !ON.link) return;
  const now = performance.now(); if (now - (ON.chatAt || 0) < 400) return; ON.chatAt = now; // no flooding
  ON.link.sendChat(text, emote);
}
function bindChat() {
  document.querySelectorAll('[data-emotes]').forEach(box => {
    for (const [id, ic, tx] of EMOTES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'emo'; b.textContent = ic + ' ' + tx;
      b.onclick = () => { sendChat(tx, id); if (box.closest('.gchat')) closeGameChat(); };
      box.append(b);
    }
  });
  $('lobbyChatForm').onsubmit = e => { e.preventDefault(); sendChat($('lobbyChatIn').value); $('lobbyChatIn').value = ''; };
  $('gameChatForm').onsubmit = e => { e.preventDefault(); sendChat($('gameChatIn').value); $('gameChatIn').value = ''; closeGameChat(); };
  $('chatBtn').onclick = () => ($('gchat').classList.contains('open') ? closeGameChat() : openGameChat());
  $('gameChatIn').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeGameChat(); } e.stopPropagation(); });
  window.addEventListener('keydown', e => {
    if (screen !== 'game' || !ON.active || e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') { e.preventDefault(); openGameChat(); }
  });
}
function openGameChat() { $('gchat').classList.add('open'); $('gameChatForm').hidden = false; if (ctrl) for (const k in ctrl.keys) ctrl.keys[k] = false; setTimeout(() => $('gameChatIn').focus(), 0); }
function closeGameChat() { $('gchat').classList.remove('open'); $('gameChatForm').hidden = true; $('gameChatIn').blur(); }
// first screen: rejoin straight away after a reload, otherwise the home screen
function routeStart() {
  bindOnlineUi(); bindChat();
  ON.myId = onlineId(); ON.nick = savedNick();
  const inv = parseInvite();
  let again = null; try { again = sessionStorage.getItem('bm.room'); } catch (e) {}
  showScreen('home');
  if (inv && again === inv.code && ON.nick) joinRoom(inv.code, inv.b);
}
