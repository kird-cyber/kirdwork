// ============================================================== ROPE PLAYGROUND: input, camera, drawing, HUD
const $ = id => document.getElementById(id);
const cv = $('cv'), cx = cv.getContext('2d');
const store = {
  get(k, d) { try { const v = localStorage.getItem('rope.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rope.' + k, JSON.stringify(v)); } catch (e) {} },
};
const MAP = createCourse();
let cfg = Object.assign({}, ROPE_DEFAULT, store.get('cfg', {}));
let run = null, rle = [], ghost = null, ghostRun = null, ghostCur = null, showGhost = store.get('ghost', true);
let best = store.get('best', null); // { time, cfg, rle, ropes }
// demo run found by the course solver (tests/solve.js), default feel: shown as the ghost until you set your own record
const DEMO = /*__DEMO__*/null;
let watching = false;
const ghostSrc = () => best || (DEMO && { time: DEMO.time, cfg: {}, rle: DEMO.rle, ropes: DEMO.ropes, demo: true });
const cam = { x: 0, y: 0, zoom: 1 };
const fx = [], texts = [];
let acc = 0, last = performance.now(), paused = false;

// ---------------------------------------------------------------- terrain image (built once)
const terr = document.createElement('canvas'); terr.width = MAP.W; terr.height = MAP.H;
(function paintTerrain() {
  const g = terr.getContext('2d'), img = g.createImageData(MAP.W, MAP.H), d = img.data, W = MAP.W, H = MAP.H, mk = MAP.mask;
  const depth = new Uint8Array(W); // solid pixels counted from the surface above, per column
  const under = new Uint8Array(W); // empty pixels below the last solid (for the under-side shade)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, s = mk[i];
      if (!s) { depth[x] = 0; continue; }
      depth[x] = Math.min(255, depth[x] + 1);
      const dp = depth[x], h = ((x * 73856093) ^ (y * 19349663)) >>> 0, n = (h & 255) / 255;
      const below = y + 1 < H && !mk[i + W];
      let r, gg, b;
      if (dp <= 3) { r = 120 + n * 20; gg = 196 + n * 30; b = 70; }               // moss
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
})();

// ---------------------------------------------------------------- run control
function newRun() {
  run = createRun(MAP, cfg); rle = []; fx.length = 0; texts.length = 0;
  ghostRun = null; ghost = ghostSrc();
  if (ghost && (showGhost || watching)) { ghostRun = createRun(MAP, ghost.cfg); ghostCur = { i: 0, n: 0 }; }
  $('result').hidden = true; $('watchTag').hidden = !watching;
  $('watchBtn').textContent = watching ? '시범 끄기' : '시범 보기';
  cam.x = run.x; cam.y = run.y;
}
// ---------------------------------------------------------------- input
const keys = { L: false, R: false, U: false, D: false, FIRE: false, JUMP: false, BACK: false };
const latch = { FIRE: false, JUMP: false, BACK: false }; // taps shorter than a tick still count
const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', Space: 'FIRE', Enter: 'JUMP', NumpadEnter: 'JUMP', Backspace: 'BACK' };
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (watching && e.code !== 'KeyH') { e.preventDefault(); stopWatch(); return; }
  const k = KEYMAP[e.code];
  if (k) { e.preventDefault(); if (!e.repeat) { keys[k] = true; if (k in latch) latch[k] = true; } return; }
  if (e.code === 'KeyR') newRun();
  if (e.code === 'KeyG') toggleGhost();
  if (e.code === 'KeyT') togglePanel();
  if (e.code === 'KeyH') $('help').hidden = !$('help').hidden;
  if (e.code === 'Equal' || e.code === 'NumpadAdd') setZoom(zoomMul * 1.1);
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') setZoom(zoomMul / 1.1);
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll('[data-k]').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); keys[k] = true; if (k in latch) latch[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
  const up = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
});
function currentBits() {
  let b = 0;
  if (keys.L) b |= IN.L; if (keys.R) b |= IN.R; if (keys.U) b |= IN.U; if (keys.D) b |= IN.D;
  if (keys.FIRE || latch.FIRE) b |= IN.FIRE; if (keys.JUMP || latch.JUMP) b |= IN.JUMP; if (keys.BACK || latch.BACK) b |= IN.BACK;
  return b;
}

// ---------------------------------------------------------------- tick loop
function tick() {
  if (watching) { // demo playback: only the ghost moves; any key stops it
    const gb = ghost ? rleAt(ghost.rle, ghostCur) : -1;
    if (gb >= 0) { stepRun(ghostRun, gb); for (const e of ghostRun.events) onEvent(e, ghostRun); ghostRun.events.length = 0; }
    return;
  }
  let bits = currentBits();
  latch.FIRE = latch.JUMP = latch.BACK = false; // a tap shorter than one tick still counts once
  if (run.done) bits = 0;
  if (!run.done) rleAppend(rle, bits);
  stepRun(run, bits);
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
  if (e.type === 'attach') { burst(e.x, e.y, '#F3E2B3', 6, 70); snd('attach'); }
  else if (e.type === 'shoot') snd('shoot');
  else if (e.type === 'miss') snd('miss');
  else if (e.type === 'release') snd('release');
  else if (e.type === 'jump') snd('jump');
  else if (e.type === 'bump') { burst(e.x, e.y, '#E8D2A0', 4, Math.min(160, e.power * 0.25)); if (e.power > 260) snd('bump'); }
  else if (e.type === 'splash') { burst(e.x, MAP.waterY, '#BFE6FF', 18, 220); popText(r.x, MAP.waterY - 40, '풍덩! 체크포인트로', '#BFE6FF'); snd('splash'); }
  else if (e.type === 'checkpoint') {
    const c = MAP.course[e.n - 1];
    burst(c.x, c.y, e.finish ? '#FFD24A' : '#9BE36B', 22, 200);
    popText(c.x, c.y - 50, e.finish ? '도착!' : `체크포인트 ${e.n}`, e.finish ? '#FFD24A' : '#C6F59E');
    snd(e.finish ? 'finish' : 'cp');
  }
}
function finish() {
  const time = (run.finishTick - run.startTick) / TICK_RATE;
  const isBest = !best || time < best.time;
  if (isBest) { best = { time, cfg: Object.assign({}, run.cfg), rle: rle.map(x => x.slice()), ropes: run.ropes }; store.set('best', best); }
  $('resTime').textContent = fmtTime(time);
  $('resSub').textContent = `${isBest ? '최고 기록! ' : `최고 ${fmtTime(best.time)} · `}로프 ${run.ropes}번 · 풍덩 ${run.splashes}번 · 최고 속도 ${Math.round(run.maxSpeed)}`;
  $('result').hidden = false;
}
const fmtTime = t => { const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' : '') + (m && s < 10 ? '0' : '') + s.toFixed(2); };

// ---------------------------------------------------------------- effects
function burst(x, y, col, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = sp * (0.3 + Math.random() * 0.7); fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, t: 0, life: 0.5 + Math.random() * 0.4, col, r: 2 + Math.random() * 2.5 }); } }
function popText(x, y, s, col) { texts.push({ x, y, s, col, t: 0 }); }
let actx = null;
function snd(kind) {
  if (!actx || store.mute) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
  const P = { shoot: [880, 1500, 0.06, 'square', 0.05], attach: [300, 180, 0.08, 'triangle', 0.16], miss: [400, 200, 0.12, 'sawtooth', 0.04], release: [500, 700, 0.05, 'triangle', 0.08],
    jump: [420, 640, 0.09, 'triangle', 0.08], bump: [120, 60, 0.08, 'square', 0.08], splash: [260, 60, 0.4, 'sawtooth', 0.06], cp: [660, 990, 0.18, 'triangle', 0.14], finish: [523, 1046, 0.5, 'triangle', 0.16] }[kind];
  if (!P) return;
  o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
  g.gain.setValueAtTime(P[4], t); g.gain.exponentialRampToValueAtTime(0.0001, t + P[2] + 0.05); o.start(t); o.stop(t + P[2] + 0.08);
}
window.addEventListener('pointerdown', () => { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }, { capture: true });
window.addEventListener('keydown', () => { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }, { capture: true });

// ---------------------------------------------------------------- drawing
let VW = 0, VH = 0, DPR = 1, baseZoom = 1.5, zoomMul = store.get('zoom', 1);
function setZoom(k) { zoomMul = clampN(k, 0.5, 1.6); store.set('zoom', zoomMul); cam.zoom = baseZoom * zoomMul; }
window.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoomMul * (e.deltaY > 0 ? 0.9 : 1.1)); }, { passive: false });
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = window.innerWidth; VH = window.innerHeight; cv.width = VW * DPR; cv.height = VH * DPR; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; baseZoom = VW < 700 ? 1.0 : VW < 1100 ? 1.25 : 1.5; cam.zoom = baseZoom * zoomMul; }
window.addEventListener('resize', resize); resize();

function drawWorm(r, alpha, ghostStyle) {
  const g = cx; g.save(); g.globalAlpha = alpha;
  const x = r.x, y = r.y, f = r.facing;
  // rope
  if (r.state === 'rope' && r.anchors.length) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); g.moveTo(r.anchors[0].x, r.anchors[0].y); for (let i = 1; i < r.anchors.length; i++) g.lineTo(r.anchors[i].x, r.anchors[i].y); g.lineTo(x, y); };
    g.strokeStyle = ghostStyle ? '#9FD2FF' : '#3B2A14'; g.lineWidth = 3.4; path(); g.stroke();
    if (!ghostStyle) { g.strokeStyle = '#E9CF8E'; g.lineWidth = 1.6; path(); g.stroke(); }
    for (const a of r.anchors) { g.fillStyle = ghostStyle ? '#9FD2FF' : '#C9C9D2'; g.beginPath(); g.arc(a.x, a.y, 2.6, 0, 6.283); g.fill(); }
  }
  if (r.shot) { g.strokeStyle = ghostStyle ? '#9FD2FF' : '#E9CF8E'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(r.shot.x, r.shot.y); g.stroke(); g.fillStyle = '#C9C9D2'; g.beginPath(); g.arc(r.shot.x, r.shot.y, 2.5, 0, 6.283); g.fill(); }
  // body: a round little ninja critter (original design)
  const sq = r.state === 'ground' ? 1 : 0.94 + Math.min(0.12, Math.abs(r.vy) / 4000);
  g.translate(x, y); g.scale(1 / sq, sq);
  g.fillStyle = ghostStyle ? '#7FB8F0' : '#FFB347'; g.strokeStyle = ghostStyle ? '#2C5A88' : '#7A4310'; g.lineWidth = 1.6;
  g.beginPath(); g.ellipse(0, 0, 9, 8.4, 0, 0, 6.283); g.fill(); g.stroke();
  g.fillStyle = ghostStyle ? '#C9E4FF' : '#FFE1A8'; g.beginPath(); g.ellipse(f * 1.5, 2.6, 5.2, 3.6, 0, 0, 6.283); g.fill();
  // headband with fluttering tails
  g.fillStyle = ghostStyle ? '#4F8FD0' : '#E2412F'; g.fillRect(-9, -5, 18, 3.2);
  const flap = Math.sin(performance.now() / 90 + x * 0.05) * 2 - Math.min(6, Math.abs(r.vx) / 90);
  g.beginPath(); g.moveTo(-f * 8, -4); g.lineTo(-f * 15, -6 + flap); g.lineTo(-f * 14, -2 + flap * 0.6); g.closePath(); g.fill();
  // eyes look along the aim
  const ax = f * cosD10(r.aim), ay = -sinD10(r.aim);
  for (const ex of [-2.6, 2.6]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + f * 1.2, -1.2, 2.4, 0, 6.283); g.fill(); g.fillStyle = '#1B1B24'; g.beginPath(); g.arc(ex + f * 1.2 + ax * 1, -1.2 + ay * 1, 1.25, 0, 6.283); g.fill(); }
  g.restore();
}
function render(alpha) {
  const g = cx, z = cam.zoom * DPR;
  g.setTransform(1, 0, 0, 1, 0, 0);
  // sky
  const sky = g.createLinearGradient(0, 0, 0, cv.height); sky.addColorStop(0, '#5DA9E9'); sky.addColorStop(0.65, '#BFE3F7'); sky.addColorStop(1, '#E9F5FB');
  g.fillStyle = sky; g.fillRect(0, 0, cv.width, cv.height);
  // parallax mountains
  for (const [k, col, base, amp] of [[0.25, '#9CC7E4', 0.62, 90], [0.45, '#86B6D6', 0.72, 70]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, cv.height);
    for (let sx = 0; sx <= VW; sx += 20) { const wx = sx / cam.zoom + (cam.x - VW / 2 / cam.zoom) * k; g.lineTo(sx * DPR, (VH * base - (Math.sin(wx / 210) * 0.6 + Math.sin(wx / 97) * 0.4) * amp + (cam.y - MAP.H * 0.6) * -0.05 * k) * DPR); }
    g.lineTo(cv.width, cv.height); g.fill();
  }
  g.setTransform(z, 0, 0, z, (VW / 2 - cam.x * cam.zoom) * DPR, (VH / 2 - cam.y * cam.zoom) * DPR);
  g.imageSmoothingEnabled = false;
  g.drawImage(terr, 0, 0);
  // side walls (the map edges are solid)
  g.fillStyle = '#5A4636'; g.fillRect(-600, -800, 600, MAP.H + 1600); g.fillRect(MAP.W, -800, 600, MAP.H + 1600);
  g.fillStyle = '#7A5E48'; g.fillRect(-6, -800, 6, MAP.H + 1600); g.fillRect(MAP.W, -800, 6, MAP.H + 1600);
  // checkpoints
  const t = performance.now() / 1000;
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
  // next-checkpoint pointer when it is off screen is drawn in screen space later
  if (ghostRun) drawWorm(ghostRun, watching ? 1 : 0.45, !watching);
  if (!watching) drawWorm(run, 1, false);
  // aim crosshair
  if (!watching && run.state !== 'rope' && !run.dead) {
    const ax = run.x + run.facing * cosD10(run.aim) * 46, ay = run.y - sinD10(run.aim) * 46;
    g.strokeStyle = '#E2412F'; g.lineWidth = 2; g.beginPath(); g.arc(ax, ay, 5, 0, 6.283); g.moveTo(ax - 8, ay); g.lineTo(ax - 3, ay); g.moveTo(ax + 3, ay); g.lineTo(ax + 8, ay); g.moveTo(ax, ay - 8); g.lineTo(ax, ay - 3); g.moveTo(ax, ay + 3); g.lineTo(ax, ay + 8); g.stroke();
  }
  // particles
  for (const p of fx) { g.globalAlpha = Math.max(0, 1 - p.t / p.life); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); }
  g.globalAlpha = 1;
  // sea
  const wy = MAP.waterY;
  g.fillStyle = 'rgba(40,120,190,0.86)'; g.beginPath(); g.moveTo(cam.x - 2000, MAP.H + 400);
  for (let x = Math.floor((cam.x - VW / cam.zoom) / 20) * 20; x <= cam.x + VW / cam.zoom; x += 20) g.lineTo(x, wy + Math.sin(x / 60 + t * 2) * 4);
  g.lineTo(cam.x + 2000, MAP.H + 400); g.fill();
  g.strokeStyle = 'rgba(220,240,255,0.7)'; g.lineWidth = 2; g.beginPath();
  for (let x = Math.floor((cam.x - VW / cam.zoom) / 20) * 20; x <= cam.x + VW / cam.zoom; x += 20) { const yy = wy + Math.sin(x / 60 + t * 2) * 4; x === Math.floor((cam.x - VW / cam.zoom) / 20) * 20 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
  g.stroke();
  // floating texts
  g.textAlign = 'center'; g.font = '900 20px "Noto Sans KR", sans-serif';
  for (const tx of texts) { g.globalAlpha = Math.max(0, 1 - tx.t / 1.4); g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(tx.s, tx.x, tx.y - tx.t * 30); g.fillStyle = tx.col; g.fillText(tx.s, tx.x, tx.y - tx.t * 30); }
  g.globalAlpha = 1;
  // screen space: arrow to the next checkpoint
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!run.done && !watching) {
    const c = MAP.course[run.cp], sx = (c.x - cam.x) * cam.zoom + VW / 2, sy = (c.y - cam.y) * cam.zoom + VH / 2;
    if (sx < 30 || sx > VW - 30 || sy < 30 || sy > VH - 30) {
      const ex = clampN(sx, 40, VW - 40), ey = clampN(sy, 90, VH - 150), ang = Math.atan2(sy - VH / 2, sx - VW / 2);
      g.save(); g.translate(ex, ey); g.rotate(ang); g.fillStyle = c.finish ? '#FFD24A' : '#9BE36B'; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(16, 0); g.lineTo(-8, -11); g.lineTo(-3, 0); g.lineTo(-8, 11); g.closePath(); g.fill(); g.stroke(); g.restore();
      g.fillStyle = '#fff'; g.font = '900 13px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText(c.label, ex, ey + 26);
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
  setTxt('hCp', `${Math.min(r.cp, MAP.course.length)} / ${MAP.course.length}`);
  setTxt('hBest', best ? fmtTime(best.time) : DEMO ? '시범 ' + fmtTime(DEMO.time) : '–');
  setTxt('hRopes', String(r.ropes));
  const sp = Math.round(Math.sqrt(r.vx * r.vx + r.vy * r.vy));
  setTxt('hSpeed', String(sp));
  $('spBar').style.width = Math.min(100, sp / 12) + '%';
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
function startWatch() { if (!ghostSrc()) return; watching = true; newRun(); }
function stopWatch() { watching = false; newRun(); }
$('watchBtn').onclick = () => (watching ? stopWatch() : startWatch());
cv.addEventListener('pointerdown', () => { if (watching) stopWatch(); }); $('againBtn').onclick = newRun;
$('helpBtn').onclick = () => { $('help').hidden = !$('help').hidden; };
$('helpClose').onclick = () => { $('help').hidden = true; };
$('clearBest').onclick = () => { best = null; store.set('best', null); newRun(); };
$('ghostBtn').textContent = showGhost ? '유령 켜짐' : '유령 꺼짐';
if (store.get('seenHelp', false)) $('help').hidden = true; else store.set('seenHelp', true);
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touchmode');

// ---------------------------------------------------------------- main loop
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  acc += dt; let n = 0;
  while (acc >= TICK && n < 30) { tick(); acc -= TICK; n++; }
  // camera: follow with a little look-ahead in the direction of travel
  const fr = watching && ghostRun ? ghostRun : run;
  const lx = fr.x + clampN(fr.vx * 0.25, -220, 220), ly = fr.y + clampN(fr.vy * 0.15, -120, 160) - 30;
  const k = 1 - Math.pow(0.002, dt);
  cam.x += (lx - cam.x) * k; cam.y += (ly - cam.y) * k;
  const hw = VW / 2 / cam.zoom, hh = VH / 2 / cam.zoom;
  cam.x = clampN(cam.x, Math.min(hw - 60, MAP.W / 2), Math.max(MAP.W - hw + 60, MAP.W / 2)); cam.y = clampN(cam.y, hh - 400, MAP.H - hh + 60);
  for (const p of fx) { p.t += dt; p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > fx[i].life) fx.splice(i, 1);
  for (const tx of texts) tx.t += dt;
  for (let i = texts.length - 1; i >= 0; i--) if (texts[i].t > 1.4) texts.splice(i, 1);
  render(); updateHud();
  requestAnimationFrame(frame);
}
buildPanel(); newRun();
requestAnimationFrame(t => { last = t; frame(t); });
window.__rope = { get run() { return run; }, MAP, keys, latch, newRun, get best() { return best; }, get cfg() { return cfg; } };
