// ============================================================== ROPE PLAYGROUND: input, camera, drawing, HUD
const $ = id => document.getElementById(id);
const cv = $('cv'), cx = cv.getContext('2d');
const store = {
  get(k, d) { try { const v = localStorage.getItem('rope.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rope.' + k, JSON.stringify(v)); } catch (e) {} },
};
let MAP = createCourse(), mapDirty = false;
let cfg = Object.assign({}, ROPE_DEFAULT, store.get('cfg', {}));
let mode = store.get('mode', 'race'); // 'race' (rope course, ghost) | 'target' (weapons + dummies)
let run = null, rle = [], ghost = null, ghostRun = null, ghostCur = null, showGhost = store.get('ghost', true);
let best = store.get('best', null); // { time, cfg, rle, ropes }
let tbest = store.get('tbest', null); // target practice best { time, shots }
// demo run found by the course solver (tests/solve.js), default feel: shown as the ghost until you set your own record
const DEMO = /*__DEMO__*/null;
let watching = false;
const ghostSrc = () => best || (DEMO && { time: DEMO.time, cfg: {}, rle: DEMO.rle, ropes: DEMO.ropes, demo: true });
const cam = { x: 0, y: 0, zoom: 1, shake: 0 };
const fx = [], texts = [], tracers = [], planes = [];
let acc = 0, last = performance.now();
let pendingCmd = null; const pushCmd = c => { pendingCmd = Object.assign(pendingCmd || {}, c); };
let selW = store.get('weapon', 0), selFuse = store.get('fuse', 3);

// ---------------------------------------------------------------- terrain image
const terr = document.createElement('canvas');
function paintTerrain() {
  terr.width = MAP.W; terr.height = MAP.H;
  const g = terr.getContext('2d'), img = g.createImageData(MAP.W, MAP.H), d = img.data, W = MAP.W, H = MAP.H, mk = MAP.mask;
  const depth = new Uint8Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mk[i]) { depth[x] = 0; continue; }
      depth[x] = Math.min(255, depth[x] + 1);
      const dp = depth[x], h = ((x * 73856093) ^ (y * 19349663)) >>> 0, n = (h & 255) / 255;
      const below = y + 1 < H && !mk[i + W];
      let r, gg, b;
      if (dp <= 3) { r = 120 + n * 20; gg = 196 + n * 30; b = 70; }
      else if (dp <= 7) { r = 86; gg = 150 + n * 12; b = 58; }
      else {
        const band = ((y >> 4) + (x >> 6)) & 1, k = 0.85 + n * 0.25 - Math.min(0.25, dp / 900);
        r = (band ? 132 : 122) * k; gg = (band ? 98 : 90) * k; b = (band ? 74 : 70) * k;
        if (((x + 3 * y) % 97) < 2 && n > 0.6) { r *= 0.8; gg *= 0.8; b *= 0.8; }
      }
      if (below) { r *= 0.62; gg *= 0.62; b *= 0.7; }
      const o = i * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}
function carveTerrain(x, y, r) {
  const g = terr.getContext('2d'); g.save();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(46,28,16,0.9)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, r + 2, 0, 6.283); g.stroke();
  g.restore();
}
paintTerrain();

// ---------------------------------------------------------------- run control
function newRun() {
  if (mode === 'target' || mapDirty) { MAP = createCourse(); paintTerrain(); mapDirty = mode === 'target'; }
  if (mode === 'target') watching = false;
  run = createRun(MAP, cfg, mode); rle = []; fx.length = 0; texts.length = 0; tracers.length = 0; planes.length = 0;
  if (mode === 'target') { run.rng = (Date.now() & 0x7fffffff) >>> 0; run.wind = Math.round((rngNext(run) + rngNext(run) - 1) * 10); pushCmd({ w: selW, fuse: selFuse }); }
  ghostRun = null; ghost = mode === 'race' ? ghostSrc() : null;
  if (ghost && (showGhost || watching)) { ghostRun = createRun(MAP, ghost.cfg); ghostCur = { i: 0, n: 0 }; }
  $('result').hidden = true; $('watchTag').hidden = !watching;
  $('watchBtn').textContent = watching ? '시범 끄기' : '시범 보기';
  document.body.classList.toggle('tmode', mode === 'target');
  $('modeBtn').textContent = mode === 'target' ? '로프 레이스로' : '표적 연습';
  cam.x = run.x; cam.y = run.y;
  syncWeaponUi();
}
function setMode(m) { mode = m; store.set('mode', m); watching = false; $('wpanel').hidden = true; newRun(); }

// ---------------------------------------------------------------- input
const keys = { L: false, R: false, U: false, D: false, FIRE: false, JUMP: false, BACK: false, ATK: false };
const latch = { FIRE: false, JUMP: false, BACK: false, ATK: false };
const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', Space: 'FIRE', Enter: 'JUMP', NumpadEnter: 'JUMP', Backspace: 'BACK', KeyF: 'ATK' };
let mouseAim = false, mouseSX = 0, mouseSY = 0;
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (watching && e.code !== 'KeyH') { e.preventDefault(); stopWatch(); return; }
  const k = KEYMAP[e.code];
  if (k) {
    e.preventDefault();
    if (k === 'ATK' && mode !== 'target') return;
    if (!e.repeat) { keys[k] = true; if (k in latch) latch[k] = true; if (k === 'U' || k === 'D') mouseAim = false; }
    return;
  }
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'target') toggleWeapons(); return; }
  if (e.code === 'Escape') { $('wpanel').hidden = true; $('panel').hidden = true; $('help').hidden = true; }
  if (mode === 'target' && /^Digit[1-8]$/.test(e.code)) selectWeapon(+e.code.slice(5) - 1);
  if (mode === 'target' && (e.code === 'KeyQ' || e.code === 'KeyE')) setFuse(selFuse + (e.code === 'KeyE' ? 1 : -1));
  if (e.code === 'KeyR') newRun();
  if (e.code === 'KeyG' && mode === 'race') toggleGhost();
  if (e.code === 'KeyT') togglePanel();
  if (e.code === 'KeyM') setMode(mode === 'race' ? 'target' : 'race');
  if (e.code === 'KeyH') $('help').hidden = !$('help').hidden;
  if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(zoomMul * 1.1);
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(zoomMul / 1.1);
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll('[data-k]').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); keys[k] = true; if (k in latch) latch[k] = true; if (k === 'U' || k === 'D') mouseAim = false; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
  const up = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
});
const screenToWorld = (sx, sy) => ({ x: (sx - VW / 2) / cam.zoom + cam.x, y: (sy - VH / 2) / cam.zoom + cam.y });
cv.addEventListener('contextmenu', e => { e.preventDefault(); if (mode === 'target') toggleWeapons(); });
cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && mode === 'target') { mouseAim = true; mouseSX = e.clientX; mouseSY = e.clientY; } });
cv.addEventListener('pointerdown', e => {
  if (watching) { stopWatch(); return; }
  if (mode !== 'target' || e.button === 2) return;
  const w = WEAPONS[selW];
  if (w.kind === 'strike') { const p = screenToWorld(e.clientX, e.clientY); pushCmd({ tx: p.x }); snd('ui'); return; }
  if (e.pointerType === 'mouse' && e.button === 0) { keys.ATK = true; latch.ATK = true; mouseSX = e.clientX; mouseSY = e.clientY; mouseAim = true; }
});
window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) keys.ATK = false; });
function currentBits() {
  let b = 0;
  if (keys.L) b |= IN.L; if (keys.R) b |= IN.R; if (keys.U) b |= IN.U; if (keys.D) b |= IN.D;
  if (keys.FIRE || latch.FIRE) b |= IN.FIRE; if (keys.JUMP || latch.JUMP) b |= IN.JUMP; if (keys.BACK || latch.BACK) b |= IN.BACK;
  if (mode === 'target' && (keys.ATK || latch.ATK)) b |= IN.ATK;
  return b;
}

// ---------------------------------------------------------------- tick loop
function tick() {
  if (watching) {
    const gb = ghost ? rleAt(ghost.rle, ghostCur) : -1;
    if (gb >= 0) { stepRun(ghostRun, gb); for (const e of ghostRun.events) onEvent(e, ghostRun); ghostRun.events.length = 0; }
    return;
  }
  let bits = currentBits();
  latch.FIRE = latch.JUMP = latch.BACK = latch.ATK = false;
  if (run.done && mode === 'race') bits = 0;
  if (mode === 'race' && !run.done) rleAppend(rle, bits);
  if (mode === 'target' && mouseAim && !run.dead) {
    const p = screenToWorld(mouseSX, mouseSY), dx = p.x - run.x, dy = p.y - run.y;
    if (dx * dx + dy * dy > 64) pushCmd({ aim: Math.round(Math.atan2(-dy, Math.abs(dx)) * 1800 / Math.PI), face: dx >= 0 ? 1 : -1 });
  }
  const cmd = pendingCmd; pendingCmd = null;
  stepRun(run, bits, cmd);
  for (const e of run.events) onEvent(e, run);
  run.events.length = 0;
  if (ghostRun) {
    const gb = rleAt(ghost.rle, ghostCur);
    if (gb >= 0) stepRun(ghostRun, gb);
    ghostRun.events.length = 0;
  }
  if (run.done && run.finishTick === run.tick) finish();
}
function onEvent(e, r) {
  switch (e.type) {
    case 'attach': burst(e.x, e.y, '#F3E2B3', 6, 70); snd('attach'); break;
    case 'shoot': snd('shoot'); break;
    case 'miss': snd('miss'); break;
    case 'release': snd('release'); break;
    case 'jump': snd('jump'); break;
    case 'bump': burst(e.x, e.y, '#E8D2A0', 4, Math.min(160, e.power * 0.25)); if (e.power > 260) snd('bump'); break;
    case 'splash': burst(e.x, MAP.waterY, '#BFE6FF', 18, 220); popText(r.x, MAP.waterY - 40, mode === 'race' ? '풍덩! 체크포인트로' : '풍덩! 처음 자리로', '#BFE6FF'); snd('splash'); break;
    case 'checkpoint': {
      const c = MAP.course[e.n - 1];
      burst(c.x, c.y, e.finish ? '#FFD24A' : '#9BE36B', 22, 200);
      popText(c.x, c.y - 50, e.finish ? '도착!' : `체크포인트 ${e.n}`, e.finish ? '#FFD24A' : '#C6F59E');
      snd(e.finish ? 'finish' : 'cp'); break;
    }
    case 'boom':
      carveTerrain(e.x, e.y, e.r);
      fx.push({ kind: 'flash', x: e.x, y: e.y, r: e.r, t: 0, life: 0.28 });
      burst(e.x, e.y, '#FFB040', Math.round(8 + e.r / 3), 90 + e.r * 4); burst(e.x, e.y, '#6B4A32', Math.round(6 + e.r / 4), 60 + e.r * 3);
      for (let i = 0; i < 4 + e.r / 12; i++) fx.push({ kind: 'smoke', x: e.x + (Math.random() - 0.5) * e.r, y: e.y + (Math.random() - 0.5) * e.r * 0.6, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, t: 0, life: 1.2 + Math.random(), r: 8 + e.r * 0.3 });
      cam.shake = Math.min(18, cam.shake + e.r / 5); snd('boom', e.r); break;
    case 'hit': popText(e.x, e.y - 30, '-' + e.dmg, e.bat ? '#FFE27A' : '#FFFFFF'); if (e.bat) { snd('bat'); popText(e.x, e.y - 56, '딱!', '#FFD24A'); } break;
    case 'kill': popText(e.x, e.y - 50, '격파!', '#FFD24A'); snd('cp'); break;
    case 'drown': burst(e.x, MAP.waterY, '#BFE6FF', 18, 220); popText(e.x, MAP.waterY - 50, '풍덩! 격파', '#BFE6FF'); snd('splash'); break;
    case 'fizz': burst(e.x, MAP.waterY, '#BFE6FF', 6, 90); break;
    case 'fire':
      if (e.w === 'shotgun') { tracers.push({ x0: e.x0, y0: e.y0, x1: e.x1, y1: e.y1, t: 0 }); snd('shotgun'); }
      else snd(e.w === 'bazooka' ? 'launch' : 'throw'); break;
    case 'drop': snd('throw'); break;
    case 'swing': snd(e.hit ? 'bat' : 'whoosh'); break;
    case 'strike': planes.push({ x: e.x - e.dir * 900, y: 60, dir: e.dir, t: 0 }); snd('plane'); break;
    case 'beep': snd('beep'); break;
    case 'tink': snd('tink'); break;
    case 'need': popText(r.x, r.y - 50, e.what, '#FFD0D0'); snd('miss'); break;
    case 'cleared': popText(r.x, r.y - 60, '모든 표적 격파!', '#FFD24A'); snd('finish'); break;
  }
}
function finish() {
  const time = (run.finishTick - run.startTick) / TICK_RATE;
  if (mode === 'target') {
    const isBest = !tbest || time < tbest.time;
    if (isBest) { tbest = { time, shots: run.shots }; store.set('tbest', tbest); }
    $('resTitle').textContent = '표적 전부 격파';
    $('resTime').textContent = fmtTime(time);
    $('resSub').textContent = `${isBest ? '최고 기록! ' : `최고 ${fmtTime(tbest.time)} · `}발사 ${run.shots}번 · 바다에 빠뜨림 ${run.drowned}개`;
  } else {
    const isBest = !best || time < best.time;
    if (isBest) { best = { time, cfg: Object.assign({}, run.cfg), rle: rle.map(x => x.slice()), ropes: run.ropes }; store.set('best', best); }
    $('resTitle').textContent = '도착 기록';
    $('resTime').textContent = fmtTime(time);
    $('resSub').textContent = `${isBest ? '최고 기록! ' : `최고 ${fmtTime(best.time)} · `}로프 ${run.ropes}번 · 풍덩 ${run.splashes}번 · 최고 속도 ${Math.round(run.maxSpeed)}`;
  }
  $('result').hidden = false;
}
const fmtTime = t => { const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' : '') + (m && s < 10 ? '0' : '') + s.toFixed(2); };

// ---------------------------------------------------------------- weapons UI
function selectWeapon(i) { selW = clampN(i, 0, WEAPONS.length - 1); store.set('weapon', selW); pushCmd({ w: selW }); $('wpanel').hidden = true; syncWeaponUi(); snd('ui'); }
function setFuse(f) { selFuse = clampN(f, 1, 5); store.set('fuse', selFuse); pushCmd({ fuse: selFuse }); syncWeaponUi(); snd('ui'); }
function toggleWeapons() { $('wpanel').hidden = !$('wpanel').hidden; syncWeaponUi(); }
function syncWeaponUi() {
  const w = WEAPONS[selW];
  document.querySelectorAll('.wcell').forEach((b, i) => b.classList.toggle('sel', i === selW));
  $('wHow').textContent = w.how;
  $('wName').textContent = w.name;
  $('wSub').textContent = w.fuse ? `타이머 ${selFuse}초 (Q/E)` : w.kind === 'strike' ? '맵 클릭으로 목표' : w.kind === 'power' ? '길게 눌러 파워' : 'F 한 번';
  $('fuseRow').hidden = !w.fuse;
  document.querySelectorAll('.fz').forEach(b => b.classList.toggle('sel', +b.dataset.f === selFuse));
  const ic = $('wIcon'); drawWeaponIcon(ic.getContext('2d'), w.id, ic.width);
}
function buildWeaponPanel() {
  const grid = $('wgrid'); grid.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'wcell';
    const c = document.createElement('canvas'); c.width = c.height = 64; drawWeaponIcon(c.getContext('2d'), w.id, 64);
    const nm = document.createElement('span'); nm.textContent = w.name;
    const k = document.createElement('kbd'); k.textContent = i + 1;
    b.append(k, c, nm);
    b.onclick = () => selectWeapon(i);
    b.onmouseenter = () => { $('wHow').textContent = w.how; };
    b.onmouseleave = () => { $('wHow').textContent = WEAPONS[selW].how; };
    grid.append(b);
  });
  const fr = $('fuseRow'); fr.querySelectorAll('.fz').forEach(b => b.onclick = () => setFuse(+b.dataset.f));
}
// small hand-drawn icons (also used for the weapon the worm is holding)
function drawWeaponIcon(g, id, S) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.save(); g.scale(S / 64, S / 64); g.translate(32, 32);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ball = (col, r) => { g.fillStyle = col; g.strokeStyle = '#1A1A1A'; g.lineWidth = 2; g.beginPath(); g.arc(0, 4, r, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(-r * 0.35, 4 - r * 0.35, r * 0.3, 0, 6.283); g.fill(); };
  if (id === 'bazooka') { g.rotate(-0.5); g.fillStyle = '#4E6B2E'; g.strokeStyle = '#1F2A12'; g.lineWidth = 2; g.fillRect(-24, -6, 44, 12); g.strokeRect(-24, -6, 44, 12); g.fillStyle = '#2E3F1A'; g.fillRect(16, -8, 8, 16); g.fillRect(-6, 6, 6, 9); }
  else if (id === 'grenade') { ball('#3F6B2A', 14); g.fillStyle = '#888'; g.fillRect(-4, -14, 8, 6); g.strokeStyle = '#BBB'; g.lineWidth = 2; g.beginPath(); g.arc(8, -14, 5, 0, 6.283); g.stroke(); }
  else if (id === 'cluster') { ball('#B5302A', 13); for (const [x, y] of [[-14, -14], [14, -12], [0, -20]]) { g.fillStyle = '#5A1612'; g.beginPath(); g.arc(x, y, 4, 0, 6.283); g.fill(); } }
  else if (id === 'shotgun') { g.rotate(-0.25); g.fillStyle = '#5A3A22'; g.fillRect(-26, 0, 18, 9); g.fillStyle = '#3A3A44'; g.fillRect(-10, -4, 36, 7); g.fillStyle = '#22222A'; g.fillRect(-10, 3, 20, 4); }
  else if (id === 'dynamite') { g.fillStyle = '#C8281E'; g.strokeStyle = '#5A0E0A'; g.lineWidth = 2; g.fillRect(-8, -16, 16, 34); g.strokeRect(-8, -16, 16, 34); g.fillStyle = '#F5E6C8'; g.fillRect(-8, -2, 16, 5); g.strokeStyle = '#2A2A2A'; g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(6, -24, 2, -28); g.stroke(); g.fillStyle = '#FFD24A'; g.beginPath(); g.arc(2, -28, 3.5, 0, 6.283); g.fill(); }
  else if (id === 'mine') { g.fillStyle = '#5E646E'; g.strokeStyle = '#22262C'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 6, 20, 11, 0, Math.PI, 0); g.lineTo(20, 10); g.lineTo(-20, 10); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#FF3B30'; g.beginPath(); g.arc(0, -4, 4, 0, 6.283); g.fill(); }
  else if (id === 'airstrike') { g.fillStyle = '#7A8494'; g.strokeStyle = '#2A2F38'; g.lineWidth = 2; g.beginPath(); g.moveTo(-24, -10); g.lineTo(18, -10); g.lineTo(26, -6); g.lineTo(18, -2); g.lineTo(-24, -2); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-4, -10); g.lineTo(-12, -22); g.lineTo(-6, -22); g.lineTo(6, -10); g.fill(); g.stroke(); for (const x of [-12, 0, 12]) { g.fillStyle = '#2A2A2A'; g.beginPath(); g.ellipse(x, 12 + (x + 12) / 6, 3.5, 5, 0, 0, 6.283); g.fill(); } }
  else if (id === 'bat') { g.rotate(-0.7); g.fillStyle = '#C9965A'; g.strokeStyle = '#5A3C1E'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, -2.5); g.lineTo(10, -6); g.quadraticCurveTo(26, -6, 26, 0); g.quadraticCurveTo(26, 6, 10, 6); g.lineTo(-26, 2.5); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------- effects + sound
function burst(x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (0.3 + Math.random() * 0.7); fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, t: 0, life: 0.5 + Math.random() * 0.4, col, r: 2 + Math.random() * 2.5 }); } }
function popText(x, y, s, col) { texts.push({ x, y, s, col, t: 0 }); }
let actx = null;
function tone(type, f0, f1, dur, vol, delay) {
  const t = actx.currentTime + (delay || 0), o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05); o.start(t); o.stop(t + dur + 0.08);
}
function noise(dur, vol, lp) {
  const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = vol;
  s.buffer = buf; s.connect(f); f.connect(g); g.connect(actx.destination); s.start();
}
function snd(kind, k) {
  if (!actx) return;
  const P = { shoot: ['square', 880, 1500, 0.06, 0.05], attach: ['triangle', 300, 180, 0.08, 0.16], miss: ['sawtooth', 400, 200, 0.12, 0.04], release: ['triangle', 500, 700, 0.05, 0.08],
    jump: ['triangle', 420, 640, 0.09, 0.08], bump: ['square', 120, 60, 0.08, 0.08], cp: ['triangle', 660, 990, 0.18, 0.14], finish: ['triangle', 523, 1046, 0.5, 0.16], ui: ['triangle', 700, 900, 0.04, 0.06],
    throw: ['triangle', 300, 520, 0.1, 0.08], launch: ['sawtooth', 160, 420, 0.18, 0.08], whoosh: ['sine', 500, 200, 0.14, 0.06], tink: ['triangle', 1500, 1200, 0.03, 0.05], beep: ['square', 1300, 1300, 0.08, 0.05], plane: ['sawtooth', 90, 140, 0.9, 0.05] }[kind];
  if (P) tone(P[0], P[1], P[2], P[3], P[4]);
  if (kind === 'splash') noise(0.5, 0.25, 900);
  if (kind === 'boom') { noise(0.35 + (k || 40) / 160, 0.5, 500 + (k || 40) * 4); tone('sine', 110, 40, 0.3, 0.25); }
  if (kind === 'shotgun') { noise(0.18, 0.4, 2500); }
  if (kind === 'bat') { tone('square', 220, 90, 0.08, 0.12); noise(0.08, 0.3, 3000); }
}
const unlockAudio = () => { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} };
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });

// ---------------------------------------------------------------- camera
let VW = 0, VH = 0, DPR = 1, baseZoom = 1.5, zoomMul = store.get('zoom', 1);
function setZoom(k) { zoomMul = clampN(k, 0.5, 1.6); store.set('zoom', zoomMul); cam.zoom = baseZoom * zoomMul; }
window.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoomMul * (e.deltaY > 0 ? 0.9 : 1.1)); }, { passive: false });
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = window.innerWidth; VH = window.innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; baseZoom = VW < 700 ? 1.0 : VW < 1100 ? 1.25 : 1.5; cam.zoom = baseZoom * zoomMul; }
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- the worm (original earthworm design: long ringed body, raised head)
// spine through a few control points (Catmull-Rom), drawn as overlapping discs so it reads as a soft segmented tube
function spline(pts, n) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push({ x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                 y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) });
    }
  }
  out.push(pts[pts.length - 1]); return out;
}
function drawWorm(r, alpha, ghostStyle, holding) {
  const g = cx; g.save(); g.globalAlpha = alpha;
  const x = r.x, y = r.y, f = r.facing, now = performance.now() / 1000;
  // rope
  if (r.state === 'rope' && r.anchors.length) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); g.moveTo(r.anchors[0].x, r.anchors[0].y); for (let i = 1; i < r.anchors.length; i++) g.lineTo(r.anchors[i].x, r.anchors[i].y); g.lineTo(x, y - 4); };
    g.strokeStyle = ghostStyle ? '#9FD2FF' : '#3B2A14'; g.lineWidth = 3.4; path(); g.stroke();
    if (!ghostStyle) { g.strokeStyle = '#E9CF8E'; g.lineWidth = 1.6; path(); g.stroke(); }
    for (const a of r.anchors) { g.fillStyle = ghostStyle ? '#9FD2FF' : '#C9C9D2'; g.beginPath(); g.arc(a.x, a.y, 2.6, 0, 6.283); g.fill(); }
  }
  if (r.shot) { g.strokeStyle = ghostStyle ? '#9FD2FF' : '#E9CF8E'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(r.shot.x, r.shot.y); g.stroke(); g.fillStyle = '#C9C9D2'; g.beginPath(); g.arc(r.shot.x, r.shot.y, 2.5, 0, 6.283); g.fill(); }
  if (r.dead) { g.restore(); return; }
  const ax = f * cosD10(r.aim), ay = -sinD10(r.aim);
  // pose: control points in local space (facing right), y = 0 at the collision centre, ground at +7
  let pts;
  if (r.state === 'ground') {
    const walk = Math.abs(r.prevBits & (IN.L | IN.R)) ? Math.sin(now * 14) : 0;
    pts = [{ x: -19, y: 6 }, { x: -12, y: 5.6 - walk * 1.2 }, { x: -5, y: 4.5 + walk * 1.2 }, { x: 0, y: -1 }, { x: 1.5, y: -8 }, { x: 2 + ax * 2, y: -14 + ay * 2 }];
  } else if (r.state === 'rope') {
    const lag = clampN(-r.vx / 60, -9, 9);
    pts = [{ x: 0, y: -6 }, { x: 0.5, y: 0 }, { x: lag * 0.3 - 1.5, y: 6 }, { x: lag * 0.6 + 1, y: 12 }, { x: lag - 0.5, y: 18 }];
    pts.reverse(); // tail first, head (top, at the rope) last
  } else {
    const k = clampN(r.vy / 500, -1, 1);
    pts = [{ x: -9, y: 9 - k * 4 }, { x: -6, y: 4 }, { x: -2, y: -1 }, { x: 1, y: -6 }, { x: 2 + ax * 2, y: -12 + ay * 2 }];
  }
  const SC = 1.3, gy = r.state === 'ground' ? 7 : 0; // drawn a bit larger than the collision circle, scaled from the ground contact
  const sp = spline(pts.map(p => ({ x: x + p.x * f * SC, y: y + gy + (p.y - gy) * SC })), 5), n = sp.length;
  const rad = i => (3.1 + 2.3 * Math.min(1, i / (n * 0.55)) + (i > n - 4 ? 0.5 : 0)) * SC;
  const C = ghostStyle ? { out: '#2C5A88', body: '#8FC3F2', ring: '#6E9FD0', band: '#BFDDF8' } : { out: '#6E3424', body: '#DE8A6E', ring: '#B9654E', band: '#F1B39C' };
  for (let i = 0; i < n; i++) { g.fillStyle = C.out; g.beginPath(); g.arc(sp[i].x, sp[i].y, rad(i) + 1.3, 0, 6.283); g.fill(); }
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), band = t > 0.58 && t < 0.72;
    g.fillStyle = band ? C.band : C.body; g.beginPath(); g.arc(sp[i].x, sp[i].y, rad(i), 0, 6.283); g.fill();
  }
  // belly highlight + ring segments across the body
  g.strokeStyle = C.ring; g.lineWidth = 1;
  for (let i = 2; i < n - 3; i += 2) {
    const a = sp[i - 1], b = sp[i + 1], dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l, rr = rad(i) * 0.9;
    g.beginPath(); g.moveTo(sp[i].x + nx * rr, sp[i].y + ny * rr); g.lineTo(sp[i].x - nx * rr, sp[i].y - ny * rr); g.stroke();
  }
  // head: headband, small bead eyes looking along the aim, a little mouth
  const h = sp[n - 1], hb = sp[n - 3];
  const hx = h.x - hb.x, hy = h.y - hb.y, hl = Math.sqrt(hx * hx + hy * hy) || 1, ux = hx / hl, uy = hy / hl; // head direction
  g.fillStyle = ghostStyle ? '#4F8FD0' : '#E2412F';
  g.save(); g.translate(hb.x + ux * 1.5, hb.y + uy * 1.5); g.rotate(Math.atan2(uy, ux) + Math.PI / 2); g.fillRect(-6.4, -1.6, 12.8, 3.2); g.restore();
  const tailFlap = Math.sin(now * 9 + x * 0.05) * 1.6;
  const kx = hb.x - f * 6, ky = hb.y + 1;
  g.beginPath(); g.moveTo(hb.x - f * 4.5, hb.y); g.lineTo(kx - f * 5, ky - 2 + tailFlap); g.lineTo(kx - f * 4, ky + 2 + tailFlap * 0.6); g.closePath(); g.fill();
  const ex = h.x + f * 1.6, ey = h.y + 0.5;
  for (const o of [-1.9, 1.9]) {
    const px = ex + o * (f > 0 ? 0.6 : 0.6) + (o > 0 ? f * 1.4 : 0), py = ey - 1;
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(px, py, 1.9, 0, 6.283); g.fill();
    g.fillStyle = '#16141A'; g.beginPath(); g.arc(px + ax * 0.7, py + ay * 0.7, 1.1, 0, 6.283); g.fill();
  }
  g.strokeStyle = C.out; g.lineWidth = 0.9; g.beginPath(); g.arc(h.x + f * 2.6, h.y + 3.2, 1.6, 0.1 * Math.PI, 0.8 * Math.PI); g.stroke();
  // held weapon floats in front of the head along the aim
  if (holding) {
    const w = WEAPONS[r.w], hx2 = h.x + ax * 9, hy2 = h.y + ay * 9 + 2;
    g.save(); g.translate(hx2, hy2); g.rotate(Math.atan2(ay, ax) + (f < 0 && (w.id === 'bazooka' || w.id === 'shotgun') ? 0 : 0)); if (f < 0) g.scale(1, -1);
    const S = 18; g.translate(-S / 2, -S / 2); g.drawImage(iconCache(w.id), 0, 0, S, S); g.restore();
  }
  g.restore();
}
const _icons = {};
function iconCache(id) { if (!_icons[id]) { const c = document.createElement('canvas'); c.width = c.height = 64; drawWeaponIcon(c.getContext('2d'), id, 64); _icons[id] = c; } return _icons[id]; }

function drawDummy(t) {
  const g = cx; g.save(); g.translate(t.x, t.y);
  if (!t.rest) g.rotate(clampN(t.vx / 300, -1.4, 1.4) * Math.sin(performance.now() / 120));
  g.fillStyle = '#8A6A3A'; g.fillRect(-1.5, 4, 3, 7);
  g.fillStyle = '#E3CFA0'; g.strokeStyle = '#6B5326'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(-9, 9); g.quadraticCurveTo(-12, -6, -6, -11); g.quadraticCurveTo(0, -14, 6, -11); g.quadraticCurveTo(12, -6, 9, 9); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#6B5326'; g.beginPath(); g.moveTo(-6, -11); g.lineTo(-7, -14); g.moveTo(6, -11); g.lineTo(7, -14); g.stroke();
  for (const [rr, col] of [[7, '#D8342A'], [4.6, '#FFFFFF'], [2.3, '#D8342A']]) { g.fillStyle = col; g.beginPath(); g.arc(0, -1, rr, 0, 6.283); g.fill(); }
  g.restore();
  // health
  const w = 26, hp = Math.max(0, t.hp);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(t.x - w / 2 - 1, t.y - 26, w + 2, 6);
  g.fillStyle = hp > 50 ? '#7CD957' : hp > 25 ? '#FFC93C' : '#FF5A4A'; g.fillRect(t.x - w / 2, t.y - 25, w * hp / 100, 4);
}
function drawProj(p, run) {
  const g = cx; g.save(); g.translate(p.x, p.y);
  const secs = p.fuse > 0 ? Math.ceil(p.fuse / TICK_RATE) : 0;
  if (p.k === 'bazooka' || p.k === 'airbomb') {
    g.rotate(Math.atan2(p.vy, p.vx));
    g.fillStyle = p.k === 'bazooka' ? '#566B30' : '#2E2E34'; g.strokeStyle = '#1A1A1A'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(8, 0); g.quadraticCurveTo(4, -3.6, -6, -3); g.lineTo(-6, 3); g.quadraticCurveTo(4, 3.6, 8, 0); g.fill(); g.stroke();
    g.fillStyle = '#8A8A90'; g.fillRect(-9, -4, 3, 8);
  } else if (p.k === 'grenade' || p.k === 'cluster' || p.k === 'bomblet') {
    const rr = p.k === 'bomblet' ? 2.6 : 4.4;
    g.fillStyle = p.k === 'grenade' ? '#3F6B2A' : p.k === 'cluster' ? '#B5302A' : '#3A1A14'; g.strokeStyle = '#141414'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(0, 0, rr, 0, 6.283); g.fill(); g.stroke();
  } else if (p.k === 'dynamite') {
    g.fillStyle = '#C8281E'; g.fillRect(-2.6, -7, 5.2, 12); g.fillStyle = '#F5E6C8'; g.fillRect(-2.6, -2, 5.2, 2);
    if (Math.random() < 0.7) { g.fillStyle = '#FFD24A'; g.beginPath(); g.arc(1, -9, 1.8 + Math.random() * 1.5, 0, 6.283); g.fill(); }
  } else if (p.k === 'mine') {
    g.fillStyle = '#5E646E'; g.strokeStyle = '#22262C'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 1, 6, 3.6, 0, Math.PI, 0); g.lineTo(6, 2.4); g.lineTo(-6, 2.4); g.closePath(); g.fill(); g.stroke();
    const armed = p.age > TICK_RATE, blink = p.trig > 0 ? Math.floor(performance.now() / 70) % 2 : Math.floor(performance.now() / 500) % 2;
    g.fillStyle = armed && blink ? '#FF3B30' : '#5A1A18'; g.beginPath(); g.arc(0, -2.4, 1.6, 0, 6.283); g.fill();
  }
  g.restore();
  if (secs) { g.font = '900 12px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(secs, p.x, p.y - 10); g.fillStyle = '#FFFFFF'; g.fillText(secs, p.x, p.y - 10); }
}
function surfaceY(x) { x = Math.floor(clampN(x, 0, MAP.W - 1)); for (let y = 0; y < MAP.H; y++) if (MAP.mask[y * MAP.W + x]) return y; return MAP.waterY; }

function render() {
  const g = cx, z = cam.zoom * DPR, t = performance.now() / 1000;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, '#5DA9E9'); sky.addColorStop(0.65, '#BFE3F7'); sky.addColorStop(1, '#E9F5FB');
  g.fillStyle = sky; g.fillRect(0, 0, cv.width, cv.height);
  for (const [k, col, base, amp] of [[0.25, '#9CC7E4', 0.62, 90], [0.45, '#86B6D6', 0.72, 70]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, cv.height);
    for (let sx = 0; sx <= VW; sx += 20) { const wx = sx / cam.zoom + (cam.x - VW / 2 / cam.zoom) * k; g.lineTo(sx * DPR, (VH * base - (Math.sin(wx / 210) * 0.6 + Math.sin(wx / 97) * 0.4) * amp + (cam.y - MAP.H * 0.6) * -0.05 * k) * DPR); }
    g.lineTo(cv.width, cv.height); g.fill();
  }
  const shx = cam.shake ? (Math.random() - 0.5) * cam.shake : 0, shy = cam.shake ? (Math.random() - 0.5) * cam.shake : 0;
  g.setTransform(z, 0, 0, z, (VW / 2 - cam.x * cam.zoom + shx) * DPR, (VH / 2 - cam.y * cam.zoom + shy) * DPR);
  g.imageSmoothingEnabled = false;
  g.drawImage(terr, 0, 0);
  g.imageSmoothingEnabled = true;
  g.fillStyle = '#5A4636'; g.fillRect(-600, -800, 600, MAP.H + 1600); g.fillRect(MAP.W, -800, 600, MAP.H + 1600);
  g.fillStyle = '#7A5E48'; g.fillRect(-6, -800, 6, MAP.H + 1600); g.fillRect(MAP.W, -800, 6, MAP.H + 1600);
  if (mode === 'race') {
    const cr = watching && ghostRun ? ghostRun : run;
    MAP.course.forEach((c, i) => {
      const done = cr.cp > i, next = cr.cp === i;
      g.save(); g.translate(c.x, c.y);
      g.globalAlpha = done ? 0.35 : 1;
      g.strokeStyle = c.finish ? '#FFD24A' : next ? '#9BE36B' : '#FFFFFF'; g.lineWidth = next ? 4 : 2.5;
      g.setLineDash(next ? [] : [6, 6]); g.beginPath(); g.arc(0, 0, 30 + (next ? Math.sin(t * 5) * 2 : 0), 0, 6.283); g.stroke(); g.setLineDash([]);
      g.fillStyle = c.finish ? '#FFD24A' : next ? '#9BE36B' : 'rgba(255,255,255,0.85)';
      g.font = '900 16px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.label, 0, 1);
      g.restore();
    });
  } else {
    for (const tg of run.targets) if (tg.alive) drawDummy(tg);
    // strike target marker
    if (run.strikeX >= 0 && WEAPONS[run.w].kind === 'strike') {
      const sy = surfaceY(run.strikeX); g.strokeStyle = '#FF3B30'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(run.strikeX - 9, sy - 9); g.lineTo(run.strikeX + 9, sy + 9); g.moveTo(run.strikeX + 9, sy - 9); g.lineTo(run.strikeX - 9, sy + 9); g.stroke();
      g.setLineDash([6, 8]); g.beginPath(); g.moveTo(run.strikeX, sy - 14); g.lineTo(run.strikeX, sy - 400); g.stroke(); g.setLineDash([]);
    }
    for (const p of run.projs) if (!p.dead) drawProj(p, run);
    for (const pl of planes) {
      g.save(); g.translate(pl.x, pl.y); if (pl.dir < 0) g.scale(-1, 1);
      g.fillStyle = '#7A8494'; g.strokeStyle = '#2A2F38'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-40, -6); g.lineTo(30, -6); g.lineTo(44, 0); g.lineTo(30, 6); g.lineTo(-40, 6); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-6, -6); g.lineTo(-22, -26); g.lineTo(-10, -26); g.lineTo(10, -6); g.fill(); g.stroke();
      g.restore();
    }
    for (const tr of tracers) { g.strokeStyle = `rgba(255,240,180,${1 - tr.t / 0.25})`; g.lineWidth = 2; g.beginPath(); g.moveTo(tr.x0, tr.y0); g.lineTo(tr.x1, tr.y1); g.stroke(); }
  }
  if (ghostRun) drawWorm(ghostRun, watching ? 1 : 0.45, !watching, false);
  if (!watching) drawWorm(run, 1, false, mode === 'target');
  // aim crosshair (in target practice also while hanging on the rope) + power gauge
  const wk = mode === 'target' ? WEAPONS[run.w].kind : 'rope';
  const showAim = !watching && !run.dead && (mode === 'race' ? run.state !== 'rope' : (wk === 'power' || wk === 'hitscan' || wk === 'melee' || run.state !== 'rope'));
  if (showAim) {
    const R = wk === 'melee' ? 26 : 46, axp = run.x + run.facing * cosD10(run.aim) * R, ayp = run.y - sinD10(run.aim) * R;
    g.strokeStyle = '#E2412F'; g.lineWidth = 2; g.beginPath(); g.arc(axp, ayp, 5, 0, 6.283); g.moveTo(axp - 8, ayp); g.lineTo(axp - 3, ayp); g.moveTo(axp + 3, ayp); g.lineTo(axp + 8, ayp); g.moveTo(axp, ayp - 8); g.lineTo(axp, ayp - 3); g.moveTo(axp, ayp + 3); g.lineTo(axp, ayp + 8); g.stroke();
  }
  if (mode === 'target' && run.charge >= 0) {
    const dx = run.facing * cosD10(run.aim), dy = -sinD10(run.aim);
    for (let i = 0; i < 14; i++) { const k = i / 13; if (k > run.charge) break; const d = 14 + k * 46; g.fillStyle = `hsl(${50 - k * 50}, 100%, 55%)`; g.beginPath(); g.arc(run.x + dx * d, run.y + dy * d, 2 + k * 4, 0, 6.283); g.fill(); }
  }
  for (const p of fx) {
    const a = Math.max(0, 1 - p.t / p.life);
    if (p.kind === 'flash') { g.globalAlpha = a; g.fillStyle = '#FFF2C0'; g.beginPath(); g.arc(p.x, p.y, p.r * (0.6 + p.t / p.life * 0.8), 0, 6.283); g.fill(); g.globalAlpha = a * 0.6; g.fillStyle = '#FF8A2A'; g.beginPath(); g.arc(p.x, p.y, p.r * (0.9 + p.t / p.life), 0, 6.283); g.fill(); }
    else if (p.kind === 'smoke') { g.globalAlpha = a * 0.5; g.fillStyle = '#5A5A60'; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + p.t), 0, 6.283); g.fill(); }
    else { g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
  }
  g.globalAlpha = 1;
  const wy = MAP.waterY, x0 = Math.floor((cam.x - VW / cam.zoom) / 20) * 20;
  g.fillStyle = 'rgba(40,120,190,0.86)'; g.beginPath(); g.moveTo(cam.x - 2000, MAP.H + 400);
  for (let x = x0; x <= cam.x + VW / cam.zoom; x += 20) g.lineTo(x, wy + Math.sin(x / 60 + t * 2) * 4);
  g.lineTo(cam.x + 2000, MAP.H + 400); g.fill();
  g.strokeStyle = 'rgba(220,240,255,0.7)'; g.lineWidth = 2; g.beginPath();
  for (let x = x0; x <= cam.x + VW / cam.zoom; x += 20) { const yy = wy + Math.sin(x / 60 + t * 2) * 4; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
  g.stroke();
  g.textAlign = 'center'; g.font = '900 20px "Noto Sans KR", sans-serif';
  for (const tx of texts) { g.globalAlpha = Math.max(0, 1 - tx.t / 1.4); g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(tx.s, tx.x, tx.y - tx.t * 30); g.fillStyle = tx.col; g.fillText(tx.s, tx.x, tx.y - tx.t * 30); }
  g.globalAlpha = 1;
  // screen space: arrow to the next checkpoint / nearest dummy
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  let goal = null;
  if (mode === 'race' && !run.done && !watching) { const c = MAP.course[run.cp]; goal = { x: c.x, y: c.y, label: c.label, col: c.finish ? '#FFD24A' : '#9BE36B' }; }
  if (mode === 'target' && !run.done) {
    let bd = 1e18; for (const tg of run.targets) if (tg.alive) { const d = (tg.x - run.x) ** 2 + (tg.y - run.y) ** 2; if (d < bd) { bd = d; goal = { x: tg.x, y: tg.y, label: '표적', col: '#FF8A7A' }; } }
  }
  if (goal) {
    const sx = (goal.x - cam.x) * cam.zoom + VW / 2, sy = (goal.y - cam.y) * cam.zoom + VH / 2;
    if (sx < 30 || sx > VW - 30 || sy < 30 || sy > VH - 30) {
      const ex = clampN(sx, 40, VW - 40), ey = clampN(sy, 90, VH - 150), ang = Math.atan2(sy - VH / 2, sx - VW / 2);
      g.save(); g.translate(ex, ey); g.rotate(ang); g.fillStyle = goal.col; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(16, 0); g.lineTo(-8, -11); g.lineTo(-3, 0); g.lineTo(-8, 11); g.closePath(); g.fill(); g.stroke(); g.restore();
      g.fillStyle = '#fff'; g.font = '900 13px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText(goal.label, ex, ey + 26);
    }
  }
}

// ---------------------------------------------------------------- HUD
const hudCache = {};
const setTxt = (id, s) => { if (hudCache[id] !== s) { hudCache[id] = s; $(id).textContent = s; } };
function updateHud() {
  const r = watching && ghostRun ? ghostRun : run;
  const time = r.startTick < 0 ? 0 : ((r.done ? r.finishTick : r.tick) - r.startTick) / TICK_RATE;
  setTxt('hTime', fmtTime(time));
  if (mode === 'target') {
    setTxt('lCp', '표적'); setTxt('hCp', `${r.kills} / ${r.targets.length}`);
    setTxt('lBest', '최고'); setTxt('hBest', tbest ? fmtTime(tbest.time) : '–');
    setTxt('lRopes', '발사'); setTxt('hRopes', String(r.shots));
    setTxt('lSpeed', '바람'); setTxt('hSpeed', r.wind === 0 ? '없음' : (r.wind < 0 ? '← ' : '') + Math.abs(r.wind) + (r.wind > 0 ? ' →' : ''));
    $('spBar').style.width = Math.abs(r.wind) * 10 + '%';
  } else {
    setTxt('lCp', '체크'); setTxt('hCp', `${Math.min(r.cp, MAP.course.length)} / ${MAP.course.length}`);
    setTxt('lBest', '최고'); setTxt('hBest', best ? fmtTime(best.time) : DEMO ? '시범 ' + fmtTime(DEMO.time) : '–');
    setTxt('lRopes', '로프'); setTxt('hRopes', String(r.ropes));
    const sp = Math.round(Math.sqrt(r.vx * r.vx + r.vy * r.vy));
    setTxt('lSpeed', '속도'); setTxt('hSpeed', String(sp));
    $('spBar').style.width = Math.min(100, sp / 12) + '%';
  }
  setTxt('hState', r.dead ? '풍덩!' : r.state === 'rope' ? `로프 · 길이 ${Math.round(ropeTotal(r))}${r.anchors.length > 1 ? ` · 꺾임 ${r.anchors.length - 1}` : ''}` : r.shot ? '줄 발사 중' : r.state === 'ground' ? `조준 ${Math.round(r.aim / 10)}°` : `공중 · 조준 ${Math.round(r.aim / 10)}°`);
}

// ---------------------------------------------------------------- tuning panel
function buildPanel() {
  const box = $('sliders'); box.innerHTML = '';
  for (const [k, label, mn, mx, stp] of ROPE_SLIDERS) {
    const row = document.createElement('label'); row.className = 'sl';
    const nm = document.createElement('span'); nm.textContent = label;
    const val = document.createElement('b'); val.textContent = fmtVal(cfg[k], stp);
    const inp = document.createElement('input'); inp.type = 'range'; inp.min = mn; inp.max = mx; inp.step = stp; inp.value = cfg[k];
    inp.oninput = () => { cfg[k] = +inp.value; val.textContent = fmtVal(cfg[k], stp); run.cfg[k] = cfg[k]; store.set('cfg', diffCfg()); markPreset(); };
    row.append(nm, val, inp); box.append(row);
  }
  const pb = $('presets'); pb.innerHTML = '';
  for (const [id, p] of Object.entries(ROPE_PRESETS)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'preset'; b.dataset.id = id;
    b.innerHTML = `<b>${p.name}</b><small>${p.desc}</small>`;
    b.onclick = () => { cfg = Object.assign({}, ROPE_DEFAULT, p.v); store.set('cfg', diffCfg()); buildPanel(); newRun(); };
    pb.append(b);
  }
  markPreset();
}
const fmtVal = (v, stp) => stp < 1 ? (+v).toFixed(2) : String(Math.round(v));
function diffCfg() { const o = {}; for (const k in cfg) if (cfg[k] !== ROPE_DEFAULT[k]) o[k] = cfg[k]; return o; }
function markPreset() {
  document.querySelectorAll('.preset').forEach(b => {
    const v = Object.assign({}, ROPE_DEFAULT, ROPE_PRESETS[b.dataset.id].v);
    b.classList.toggle('sel', Object.keys(ROPE_DEFAULT).every(k => v[k] === cfg[k]));
  });
  $('cfgCode').textContent = JSON.stringify(diffCfg()) === '{}' ? '기본값 (2세대 손맛)' : Object.entries(diffCfg()).map(([k, v]) => `${(ROPE_SLIDERS.find(s => s[0] === k) || [k, k])[1]} ${fmtVal(v, v % 1 ? 0.01 : 1)}`).join(' · ');
}
function togglePanel() { $('panel').hidden = !$('panel').hidden; }
function toggleGhost() { showGhost = !showGhost; store.set('ghost', showGhost); $('ghostBtn').textContent = showGhost ? '유령 켜짐' : '유령 꺼짐'; $('ghostBtn').setAttribute('aria-pressed', String(showGhost)); newRun(); }
$('panelBtn').onclick = togglePanel; $('panelClose').onclick = togglePanel;
$('ghostBtn').onclick = toggleGhost;
$('resetBtn').onclick = () => { watching = false; newRun(); };
function startWatch() { if (mode !== 'race' || !ghostSrc()) return; watching = true; newRun(); }
function stopWatch() { watching = false; newRun(); }
$('watchBtn').onclick = () => (watching ? stopWatch() : startWatch());
$('againBtn').onclick = newRun;
$('modeBtn').onclick = () => setMode(mode === 'race' ? 'target' : 'race');
$('wChip').onclick = toggleWeapons; $('wClose').onclick = () => { $('wpanel').hidden = true; };
$('wBtn').addEventListener('pointerdown', e => { e.preventDefault(); toggleWeapons(); });
$('helpBtn').onclick = () => { $('help').hidden = !$('help').hidden; };
$('helpClose').onclick = () => { $('help').hidden = true; };
$('clearBest').onclick = () => { best = null; tbest = null; store.set('best', null); store.set('tbest', null); newRun(); };
$('ghostBtn').textContent = showGhost ? '유령 켜짐' : '유령 꺼짐';
if (store.get('seenHelp2', false)) $('help').hidden = true; else store.set('seenHelp2', true);
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touchmode');

// ---------------------------------------------------------------- main loop
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += dt; let n = 0;
  while (acc >= TICK && n < 30) { tick(); acc -= TICK; n++; }
  const fr = watching && ghostRun ? ghostRun : run;
  // follow the worm; in target practice a flying shell gets the camera
  let fx0 = fr.x + clampN(fr.vx * 0.25, -220, 220), fy0 = fr.y + clampN(fr.vy * 0.15, -120, 160) - 30;
  if (mode === 'target') { const p = run.projs.find(q => !q.dead && q.rest === undefined && q.k !== 'bomblet'); if (p) { fx0 = p.x; fy0 = p.y; } }
  const k = 1 - Math.pow(0.002, dt);
  cam.x += (fx0 - cam.x) * k; cam.y += (fy0 - cam.y) * k;
  const hw = VW / 2 / cam.zoom, hh = VH / 2 / cam.zoom;
  cam.x = clampN(cam.x, Math.min(hw - 60, MAP.W / 2), Math.max(MAP.W - hw + 60, MAP.W / 2)); cam.y = clampN(cam.y, hh - 400, MAP.H - hh + 60);
  cam.shake = Math.max(0, cam.shake - dt * 40);
  for (const p of fx) { p.t += dt; if (p.kind === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; } else if (p.kind !== 'flash') { p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].life) fx.splice(i, 1);
  for (const tx of texts) tx.t += dt;
  for (let i = texts.length - 1; i >= 0; i--) if (texts[i].t > 1.4) texts.splice(i, 1);
  for (const tr of tracers) tr.t += dt; for (let i = tracers.length - 1; i >= 0; i--) if (tracers[i].t > 0.25) tracers.splice(i, 1);
  for (const pl of planes) { pl.t += dt; pl.x += pl.dir * 700 * dt; } for (let i = planes.length - 1; i >= 0; i--) if (planes[i].t > 3) planes.splice(i, 1);
  // smoke trail behind bazooka shells
  if (mode === 'target') for (const p of run.projs) if (!p.dead && p.k === 'bazooka' && Math.random() < 0.8) fx.push({ kind: 'smoke', x: p.x, y: p.y, vx: 0, vy: -10, t: 0, life: 0.6, r: 2.5 });
  render(); updateHud();
  requestAnimationFrame(frame);
}
buildPanel(); buildWeaponPanel(); newRun();
requestAnimationFrame(t => { last = t; frame(t); });
window.__rope = { get run() { return run; }, get MAP() { return MAP; }, keys, latch, newRun, setMode, selectWeapon, get best() { return best; }, get cfg() { return cfg; } };
