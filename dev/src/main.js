// ============================================================== UI + MAIN LOOP
const $ = id => document.getElementById(id);
const cv = $('cv'), mini = $('mini');
const R = createRenderer(cv, mini);
const AU = createAudio();
let freezeUntil = 0, lastSecs = -1, lastLimit = null;
try { const v = localStorage.getItem('pg.shake'); R.reduceMotion = v === null ? matchMedia('(prefers-reduced-motion: reduce)').matches : v === '0'; } catch (e) {}
R.onSfx = (n, p) => AU.play(n, p);
R.onHitstop = ms => { if (!R.reduceMotion) freezeUntil = performance.now() + ms; };
R.onEngine = on => AU.setEngine(on);
let match = null, ctrl = null;
const TANK_KEYS = Object.keys(CONFIG.tanks), ITEM_KEYS = Object.keys(CONFIG.items);

// ---------------------------------------------------------------- banner / over
let bannerTimer = 0;
function banner(s, team, turnin) { const b = $('banner'); b.textContent = s; if (team && turnin) { const sm = document.createElement('small'); sm.textContent = team === 'red' ? '레드 팀' : '블루 팀'; b.appendChild(sm); } b.style.color = team === 'red' ? '#FFB4A4' : team === 'blue' ? '#A9D0FF' : ''; b.classList.remove('turnin'); void b.offsetWidth; if (turnin) b.classList.add('turnin'); b.classList.add('show'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 1500); }
R.onBanner = banner;
R.onOver = (winner, forfeit) => {
  const t = $('overTitle'), teamName = w => w === 'red' ? '레드 팀' : '블루 팀';
  const me = ON.active ? match.tanks.find(x => x.id === ON.myId) : null;
  let title, cls;
  if (winner === 'draw') { title = '무승부'; cls = 'draw'; }
  else if (me) { title = me.team === winner ? '승리!' : '패배'; cls = me.team === winner ? 'win' : 'lose'; }
  else { title = teamName(winner) + ' 승리'; cls = winner; }
  t.textContent = title; t.className = 'ot ' + cls;
  $('overSub').textContent = (winner === 'draw' ? '' : teamName(winner) + ' 승리 · ') + `${match.turnNo}턴 · ${CONFIG.maps[match.mapId].name}` + (forfeit ? ` · ${teamName(forfeit)}이 모두 나가 기권` : '');
  const ros = $('overRoster'); ros.innerHTML = '';
  for (const team of ['red', 'blue']) {
    const col = document.createElement('div'); col.className = 'orcol ' + team + (team === winner ? ' won' : '');
    const h = document.createElement('div'); h.className = 'orh'; h.textContent = teamName(team) + (team === winner ? ' · 승리' : ''); col.append(h);
    for (const x of match.tanks.filter(k => k.team === team)) {
      const r = document.createElement('div'); r.className = 'orr' + (x.alive ? '' : ' dead') + (me && x.id === me.id ? ' me' : '');
      const nm = document.createElement('b'); nm.textContent = x.nick + (me && x.id === me.id ? ' (나)' : '');
      const sub = document.createElement('span'); sub.textContent = `${CONFIG.tanks[x.tankId].name} · ${forfeit === team ? '나감' : x.alive ? '생존 ' + x.hp : x.deathCause === 'fall' ? '낙사' : '격파'}`;
      r.append(nm, sub); col.append(r);
    }
    ros.append(col);
  }
  if (cls === 'win') AU.play('pickup');
  const online = ON.active;
  $('again').hidden = online; $('toSetup').hidden = online; $('toLobby').hidden = true; $('leaveGame').hidden = true; $('overWait').hidden = true;
  if (online) onlineOver();
  setTimeout(() => { if (screen === 'game' && match && match.phase === 'over') $('over').hidden = false; }, forfeit ? 300 : 1100);
};

// ---------------------------------------------------------------- HUD
const hudCache = {};
const setTxt = (id, s) => { if (hudCache[id] !== s) { hudCache[id] = s; $(id).textContent = s; } };
function buildWindBar() { const b = $('windBar'); b.innerHTML = ''; for (let i = 0; i < 10; i++) { if (i === 5) b.appendChild(document.createElement('b')); b.appendChild(document.createElement('i')); } }
// online: the bottom panel always shows MY tank (power and aim of the others stay private)
function hudTank(m) {
  if (ON.active && !ON.spectator) { const mine = m.tanks.find(x => x.id === ON.myId); if (mine) return mine; }
  return m.cur >= 0 ? m.tanks[m.cur] : null;
}
function updateHud() {
  const m = match, t = hudTank(m), cur = m.cur >= 0 ? m.tanks[m.cur] : null; if (!t || !cur) return;
  const mineNow = ctrl.activeLocal();
  const d = CONFIG.tanks[t.tankId];
  setTxt('whoName', t.nick + ' · ' + d.name);
  setTxt('whoHp', t.alive ? `체력 ${t.hp} / ${t.maxhp}` + (t.poison ? ' · 중독' : '') + (t.shield ? ' · 실드' : '') : '격파됨 · 관전 중');
  $('hpBar').style.width = (100 * t.hp / t.maxhp) + '%'; $('hpBar').style.background = t.team === 'red' ? '#F0583E' : '#3E94F0';
  $('fuelBar').style.width = (100 * t.fuel / d.movePx) + '%';
  const tiltDeg = Math.round(Math.atan2(t.ts, t.tc) * 180 / Math.PI);
  const real = t.aim - t.facing * tiltDeg;
  setTxt('angTxt', t.aim + '°');
  setTxt('angReal', tiltDeg ? `실제 ${real}° (기울기 ${-t.facing * tiltDeg > 0 ? '+' : ''}${-t.facing * tiltDeg})` : `${d.angleMin}°–${d.angleMax}°`);
  const dk = [t.aim, t.lastAim, t.tankId, t.facing, tiltDeg, ctrl.limit && (ctrl.keys.up || ctrl.keys.down) ? Math.floor(performance.now() / 100) % 2 : 0].join(',');
  if (hudCache.dial !== dk) { hudCache.dial = dk; drawDial(t, d, tiltDeg, real); }
  const pw = ctrl.charging && mineNow ? ctrl.powerF / 1000 : 0;
  $('gauge').classList.toggle('charging', ctrl.charging && mineNow);
  $('pw').style.width = (pw * 100) + '%';
  setTxt('pwTxt', (pw * 4).toFixed(1) + ' / 4');
  const lp = $('pwLast'); lp.hidden = t.lastPower < 0; if (t.lastPower >= 0) lp.style.left = `calc(${t.lastPower / 10}% - 1px)`;
  for (let i = 0; i < 2; i++) {
    const b = $('w' + i), w = d.weapons[i];
    const label = `${i + 1}  ${w.name}` + (i === 1 && t.cd > 0 ? ` (${t.cd}턴 후)` : '');
    if (hudCache['w' + i] !== label) { hudCache['w' + i] = label; b.textContent = label; }
    b.classList.toggle('sel', ctrl.weapon === i && (mineNow || !ON.active)); b.disabled = (i === 1 && t.cd > 0) || (ON.active && !mineNow);
  }
  const secs = Math.max(0, Math.ceil(ctrl.timeLeft / CONFIG.physics.tickRate));
  setTxt('timer', m.phase === 'aim' ? secs + '' : '–');
  $('timer').classList.toggle('low', m.phase === 'aim' && secs <= 10);
  const wd = Math.abs(m.wind);
  setTxt('windTxt', m.wind === 0 ? '없음' : (m.wind < 0 ? '← ' : '') + wd + (m.wind > 0 ? ' →' : ''));
  $('windBar').querySelectorAll('i').forEach((el, i) => { const on = m.wind < 0 ? (i < 5 && i >= 5 - Math.ceil(wd / 2)) : (i >= 5 && i < 5 + Math.ceil(wd / 2)); el.classList.toggle('on', on); });
  const used = m.turn && m.turn.itemUsed;
  const key = t.items.join(',') + '|' + used + '|' + mineNow + '|' + m.turnNo;
  if (hudCache.items !== key) {
    hudCache.items = key; const box = $('items'); box.innerHTML = '';
    for (let i = 0; i < CONFIG.turn.inventoryMax; i++) {
      const it = t.items[i], b = document.createElement('button'); b.type = 'button'; b.className = 'item' + (it ? '' : ' empty');
      if (it) {
        const meta = CONFIG.items[it]; b.style.background = meta.bg; b.style.borderColor = meta.color;
        b.innerHTML = `<span class="key">${i + 3}</span><span class="ic" style="color:${meta.color}">${meta.label}</span><span class="t">${meta.name}</span>`;
        b.title = meta.name; b.disabled = used || !mineNow; if (used || !mineNow) b.style.opacity = 0.45;
        b.onclick = () => useItemSlot(i);
      } else { b.disabled = true; b.setAttribute('aria-label', '빈 칸'); }
      box.appendChild(b);
    }
  }
  updateStatus(m, cur);
  if (hudCache.portrait !== t.tankId) {
    hudCache.portrait = t.tankId; const p = $('portrait').getContext('2d'); p.clearRect(0, 0, 172, 128);
    p.save(); p.translate(86, 120); const sc = 172 / (S_.w * S_.scale) * 0.95; p.scale(sc, sc); drawTankLocal(p, t.tankId, d.sprite.baseAngle || 0); p.restore();
  }
  const hb = $('hud').offsetHeight; if (hudCache.hb !== hb) { hudCache.hb = hb; $('touch').style.bottom = `calc(${hb + 24}px + env(safe-area-inset-bottom, 0px))`; }
  const gone = ON.active && ON.goneTeam && m.phase !== 'over' ? `${ON.goneTeam.team === 'red' ? '레드' : '블루'} 팀이 모두 나갔습니다 · ${ON.goneTeam.left}초 뒤 기권 처리` : '';
  const waitTxt = gone ? gone : ON.active && m.phase === 'aim' && !mineNow ? (ON.syncing ? '진행 중인 게임에 맞추는 중…' : ON.spectator || !t.alive ? `관전 중 · ${cur.nick}의 차례` : `${cur.nick}의 차례 — 기다리는 중`) : '';
  if (hudCache.wait !== waitTxt) { hudCache.wait = waitTxt; $('waitTag').textContent = waitTxt; $('waitTag').hidden = !waitTxt; }
}
// top status bar: every player with tank, health, alive/dead, turn order and connection
function updateStatus(m, cur) {
  const box = $('status');
  if (hudCache.statusFor !== m) {
    hudCache.statusFor = m; box.innerHTML = '';
    for (const team of ['red', 'blue']) {
      const row = document.createElement('div'); row.className = 'srow ' + team;
      for (const x of m.tanks.filter(k => k.team === team)) {
        const c = document.createElement('div'); c.className = 'sc ' + team; c.dataset.idx = x.idx;
        const no = document.createElement('span'); no.className = 'no';
        const th = cloneCanvas(thumbs[x.tankId]); th.className = 'sth';
        const sm = document.createElement('div'); sm.className = 'sm';
        const nm = document.createElement('b'); nm.textContent = x.nick + (ON.active && x.id === ON.myId ? ' (나)' : '');
        const hp = document.createElement('i'); hp.className = 'hp'; const hf = document.createElement('i'); hp.append(hf);
        const st = document.createElement('span'); st.className = 'st';
        sm.append(nm, hp, st); c.append(no, th, sm); c.title = `${x.nick} · ${CONFIG.tanks[x.tankId].name}`;
        row.append(c);
      }
      box.append(row);
    }
  }
  const order = [cur, ...m.tanks.filter(x => x.alive && x !== cur).sort((a, b) => a.delay - b.delay || a.idx - b.idx)];
  const L = ON.active ? ON.link : null;
  for (const c of box.querySelectorAll('.sc')) {
    const x = m.tanks[+c.dataset.idx], pos = order.indexOf(x), off = L && !L.online(x.id) && x.id !== ON.myId;
    const key = [x.hp, x.alive, pos, off, x.poison ? 1 : 0, x.shield ? 1 : 0].join(',');
    if (c.dataset.k === key) continue; c.dataset.k = key;
    c.classList.toggle('now', x === cur && x.alive); c.classList.toggle('dead', !x.alive); c.classList.toggle('off', !!off);
    c.classList.toggle('me', !!(ON.active && x.id === ON.myId));
    c.querySelector('.no').textContent = !x.alive ? '✕' : pos === 0 ? '▶' : String(pos + 1);
    c.querySelector('.hp > i').style.width = (100 * Math.max(0, x.hp) / x.maxhp) + '%';
    c.querySelector('.st').textContent = !x.alive ? (x.deathCause === 'fall' ? '낙사' : '격파') : off ? '연결 끊김' : `${x.hp}` + (x.poison ? ' · 독' : '') + (x.shield ? ' · 실드' : '');
  }
}
// HUD dial: the allowed range, current aim, last shot, and the real launch angle after terrain tilt
function drawDial(t, d, tiltDeg, real) {
  const c = $('angDial'), x = c.getContext('2d'), W = c.width, H = c.height, cx = t.facing > 0 ? 16 : W - 16, cy = H - 10, r = H - 22;
  x.clearRect(0, 0, W, H);
  const ang = a => t.facing > 0 ? -a * Math.PI / 180 : Math.PI + a * Math.PI / 180;
  x.lineCap = 'butt';
  x.strokeStyle = '#2A3348'; x.lineWidth = 14; x.beginPath(); x.arc(cx, cy, r, Math.min(ang(0), ang(90)), Math.max(ang(0), ang(90))); x.stroke();
  x.strokeStyle = 'rgba(255,210,74,0.55)'; x.beginPath(); x.arc(cx, cy, r, Math.min(ang(d.angleMin), ang(d.angleMax)), Math.max(ang(d.angleMin), ang(d.angleMax))); x.stroke();
  const blink = ctrl.limit && (ctrl.keys.up || ctrl.keys.down) && Math.floor(performance.now() / 100) % 2;
  const line = (a, col, w, dash, len) => { x.strokeStyle = col; x.lineWidth = w; x.setLineDash(dash || []); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang(a)) * (len || r + 10), cy + Math.sin(ang(a)) * (len || r + 10)); x.stroke(); x.setLineDash([]); };
  x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(8, cy); x.lineTo(W - 8, cy); x.stroke();
  if (tiltDeg) line(real, 'rgba(140,200,255,0.9)', 2, [3, 3]);
  if (t.lastAim >= 0) line(t.lastAim, 'rgba(255,255,255,0.7)', 2, [4, 3]);
  line(t.aim, blink ? '#FF5A4A' : '#FFD24A', 4);
  x.fillStyle = '#FFD24A'; x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill();
}
function useItemSlot(i) {
  if (!ctrl || !ctrl.activeLocal() || match.turn.itemUsed) return;
  AU.play('ui');
  const t = match.tanks[match.cur], it = t.items[i]; if (!it) return;
  if (ctrl.useItem(i) && CONFIG.items[it].effect === 'teleport') banner('순간이동탄 장전 — 떨어진 곳으로 이동합니다');
}

// ---------------------------------------------------------------- input
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'fire' };
const camKeys = {};
function inGame() { return !!match && screen === 'game'; }
window.addEventListener('pointerdown', () => AU.unlock(), { capture: true });
window.addEventListener('keydown', e => {
  AU.unlock();
  if (!inGame() || e.target.tagName === 'INPUT') return;
  if (KEYMAP[e.code]) { e.preventDefault(); if (!e.repeat) { ctrl.keys[KEYMAP[e.code]] = true; if (e.code !== 'Space') R.free = false; } }
  if (['KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) camKeys[e.code] = true;
  if (e.code === 'Digit1') ctrl.selectWeapon(0);
  if (e.code === 'Digit2') ctrl.selectWeapon(1);
  if (['Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) useItemSlot(+e.code.slice(5) - 3);
  if (e.code === 'KeyF') recenter();
});
window.addEventListener('keyup', e => { if (KEYMAP[e.code] && ctrl) ctrl.keys[KEYMAP[e.code]] = false; camKeys[e.code] = false; });
window.addEventListener('blur', () => { if (ctrl) for (const k in ctrl.keys) ctrl.keys[k] = false; for (const k in camKeys) camKeys[k] = false; });
let drag = null;
cv.addEventListener('pointerdown', e => { if (!inGame()) return; drag = { x: e.clientX, y: e.clientY, cx: R.cam.x, cy: R.cam.y, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; cv.classList.add('dragging'); R.free = true; }
  if (drag.moved) { R.cam.x = drag.cx - dx / R.cam.zoom; R.cam.y = drag.cy - dy / R.cam.zoom; }
});
cv.addEventListener('pointerup', () => { drag = null; cv.classList.remove('dragging'); });
mini.addEventListener('pointerdown', e => { const r = mini.getBoundingClientRect(); R.cam.x = (e.clientX - r.left) / r.width * match.W; R.cam.y = (e.clientY - r.top) / r.height * match.H; R.free = true; });
function syncSettings() {
  const sb = $('sndBtn'), kb = $('shakeBtn');
  sb.textContent = AU.muted ? '소리 꺼짐' : '소리 켜짐'; sb.setAttribute('aria-pressed', String(!AU.muted));
  kb.textContent = R.reduceMotion ? '흔들림 꺼짐' : '흔들림 켜짐'; kb.setAttribute('aria-pressed', String(!R.reduceMotion));
}
$('sndBtn').addEventListener('click', () => { AU.unlock(); AU.setMuted(!AU.muted); syncSettings(); });
$('shakeBtn').addEventListener('click', () => { R.reduceMotion = !R.reduceMotion; if (R.reduceMotion) R.shake = 0; try { localStorage.setItem('pg.shake', R.reduceMotion ? '0' : '1'); } catch (e) {} syncSettings(); });
syncSettings();
// F / button: my own tank online (if alive), otherwise the tank whose turn it is
function recenter() {
  if (!match) return;
  const mine = ON.active && match.tanks.find(t => t.id === ON.myId && t.alive);
  if (mine) R.camTo(mine); else if (match.cur >= 0) R.camTo(match.tanks[match.cur]);
}
$('recenter').addEventListener('click', recenter);
$('w0').addEventListener('click', () => ctrl && ctrl.selectWeapon(0));
$('w1').addEventListener('click', () => ctrl && ctrl.selectWeapon(1));
document.querySelectorAll('[data-k]').forEach(b => {
  const k = KEYMAP[b.dataset.k];
  const down = e => { e.preventDefault(); AU.unlock(); if (ctrl) { ctrl.keys[k] = true; R.free = false; } };
  const up = e => { e.preventDefault(); if (ctrl) ctrl.keys[k] = false; };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
});
window.addEventListener('resize', () => R.resize());

// ---------------------------------------------------------------- setup
const setup = { map: 'temple', red: 2, blue: 2, slots: { red: [], blue: [] } };
let thumbs = {};
function slotDefault(team, i) { return { nick: (team === 'red' ? '레드' : '블루') + ' ' + (i + 1), tank: TANK_KEYS[(team === 'red' ? i * 2 : i * 2 + 5) % TANK_KEYS.length] }; }
for (const team of ['red', 'blue']) for (let i = 0; i < 4; i++) setup.slots[team].push(slotDefault(team, i));
try { const sv = JSON.parse(localStorage.getItem('pg.setup') || 'null'); if (sv && sv.slots) Object.assign(setup, sv); } catch (e) {}
function saveSetup() { try { localStorage.setItem('pg.setup', JSON.stringify(setup)); } catch (e) {} }
function cloneCanvas(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; }
function mapPreview(id) {
  const meta = CONFIG.maps[id], th = THEMES[meta.theme];
  const mp = buildMap(id), cw = 320, ch = Math.round(320 * meta.H / meta.W);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[2]); x.fillStyle = g; x.fillRect(0, 0, cw, ch);
  const img = x.getImageData(0, 0, cw, ch), o = img.data, col = th.mini.match(/\w\w/g).map(h => parseInt(h, 16));
  for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
    const wx = Math.floor(px * meta.W / cw), wy = Math.floor(py * meta.H / ch);
    if (mp.mask[wy * meta.W + wx]) { const p = (py * cw + px) * 4; o[p] = col[0]; o[p + 1] = col[1]; o[p + 2] = col[2]; }
  }
  x.putImageData(img, 0, 0);
  return c;
}
const previews = {};
function renderSetup() {
  const maps = $('maps'); maps.innerHTML = '';
  for (const [k, meta] of Object.entries(CONFIG.maps)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mapc' + (setup.map === k ? ' sel' : '');
    b.append(cloneCanvas(previews[k] || (previews[k] = mapPreview(k))));
    const inner = document.createElement('div'); inner.className = 'in';
    inner.innerHTML = `<span class="t">${meta.name}</span><span class="g">${meta.tag}</span><span class="d">${meta.desc}</span>`;
    b.append(inner); b.onclick = () => { setup.map = k; saveSetup(); renderSetup(); };
    maps.appendChild(b);
  }
  document.querySelectorAll('.seg[data-team]').forEach(s => s.classList.toggle('sel', +s.dataset.n === setup[s.dataset.team]));
  const slots = $('slots'); slots.innerHTML = '';
  for (const team of ['red', 'blue']) for (let i = 0; i < setup[team]; i++) {
    const sl = setup.slots[team][i], row = document.createElement('div'); row.className = 'slot';
    const tag = document.createElement('label'); tag.className = 'tag ' + team;
    const sp = document.createElement('span'); sp.textContent = (team === 'red' ? '레드 ' : '블루 ') + (i + 1);
    const inp = document.createElement('input'); inp.id = `nick-${team}-${i}`; inp.maxLength = 8; inp.value = sl.nick; inp.placeholder = '닉네임';
    inp.oninput = () => { sl.nick = inp.value; saveSetup(); };
    tag.append(sp, inp); row.append(tag);
    const picks = document.createElement('div'); picks.className = 'picks';
    for (const k of TANK_KEYS) {
      const p = document.createElement('button'); p.type = 'button'; p.className = 'pick' + (sl.tank === k ? ' sel' : '');
      p.append(cloneCanvas(thumbs[k]));
      const s = document.createElement('span'); s.textContent = CONFIG.tanks[k].name; p.append(s);
      p.setAttribute('aria-label', `${sp.textContent}: ${CONFIG.tanks[k].name}`);
      p.onclick = () => { sl.tank = k; saveSetup(); renderSetup(); };
      picks.appendChild(p);
    }
    row.appendChild(picks); slots.appendChild(row);
  }
}
document.querySelectorAll('.seg[data-team]').forEach(s => s.onclick = () => { setup[s.dataset.team] = +s.dataset.n; saveSetup(); renderSetup(); });
$('rand').onclick = () => { for (const team of ['red', 'blue']) for (const sl of setup.slots[team]) sl.tank = TANK_KEYS[(Math.random() * TANK_KEYS.length) | 0]; saveSetup(); renderSetup(); };
$('start').onclick = startGame;
$('again').onclick = () => { $('over').hidden = true; startGame(); };
$('toSetup').onclick = () => { $('over').hidden = true; showScreen('setup'); };
// one match on screen: local practice or online (opts carry the online hooks)
function installMatch(m, opts) {
  match = m;
  ctrl = createController(match, opts || {});
  for (const k in hudCache) delete hudCache[k];
  R.setMatch(match); R.resize(); buildWindBar();
  R.isMine = t => ON.active && t.id === ON.myId;
  window.__pg.match = match; window.__pg.ctrl = ctrl;
}
function beginMatch(cfg, opts) {
  installMatch(createMatch(cfg), opts);
  $('over').hidden = true; $('loading').hidden = true;
}
function startGame() {
  ON.active = false;
  $('loading').hidden = false;
  setTimeout(() => {
    const players = [];
    for (const team of ['red', 'blue']) for (let i = 0; i < setup[team]; i++) {
      const sl = setup.slots[team][i];
      players.push({ id: team[0] + i, nick: (sl.nick || '').trim().slice(0, 8) || (team === 'red' ? '레드 ' : '블루 ') + (i + 1), team, tankId: sl.tank });
    }
    const seed = (Math.random() * 4294967296) >>> 0;
    beginMatch({ seed, mapId: setup.map, players });
    showScreen('game');
    banner(CONFIG.maps[setup.map].name);
  }, 30);
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (inGame()) {
    const frozen = now < freezeUntil;
    if (match.phase !== 'over' && !frozen) ctrl.frame(dt);
    // continuous / timed sounds read controller state (no effect on the game)
    const active = match.phase === 'aim' && ctrl.activeLocal();
    AU.setCharge(active && ctrl.charging, ctrl.powerF / 1000);
    const secs = Math.ceil(ctrl.timeLeft / CONFIG.physics.tickRate);
    if (active && secs <= 10 && secs !== lastSecs && secs > 0) AU.play('tick', { last: secs <= 3 });
    lastSecs = active ? secs : -1;
    const lim = active && ctrl.limit && (ctrl.keys.up || ctrl.keys.down) ? ctrl.limit : null;
    if (lim && lim !== lastLimit) AU.play('limit');
    lastLimit = lim;
    const sp = 900 * dt;
    if (camKeys.KeyA) { R.cam.x -= sp; R.free = true; }
    if (camKeys.KeyD) { R.cam.x += sp; R.free = true; }
    if (camKeys.KeyW) { R.cam.y -= sp; R.free = true; }
    if (camKeys.KeyS) { R.cam.y += sp; R.free = true; }
    if (ON.active) onlineFrame(now);
    // the angle guide and power ring are only for the player who is aiming
    R.frame(frozen ? dt * 0.08 : dt, !ON.active || ctrl.activeLocal() ? ctrl : null);
    updateHud();
  }
  requestAnimationFrame(loop);
}
window.__pg = { CONFIG, R, AU, createMatch, stateHash, ON, get screen() { return screen; } };
(async () => {
  R.resize();
  await loadSprites();
  for (const k of TANK_KEYS) thumbs[k] = tankThumb(k, 132, 98);
  routeStart();
  requestAnimationFrame(loop);
})();
