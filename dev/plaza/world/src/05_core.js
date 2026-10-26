// ================================================================ 엔진: 상태 · 입력 · 이동 · 시야 · 렌더 · UI
const $ = s => document.querySelector(s);
const cv = $('#cv'); ctx = cv.getContext('2d');
const mmc = $('#mm'), mctx = mmc.getContext('2d');
const fog = document.createElement('canvas'), fctx = fog.getContext('2d');
let VW = 0, VH = 0, DPR = 1, SC = 1, FD = 1;
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); FD = Math.min(1, DPR); fog.width = Math.round(VW * FD); fog.height = Math.round(VH * FD); cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; SC = Math.max(0.55, Math.min(1.5, Math.min(VW, VH) / (15.5 * T))); }
addEventListener('resize', resize); resize();

const STATE = { mode: 'menu', t: 0, items: {}, power: false };
const PL = { x: 64.5, y: 38.5, a: -Math.PI / 2, r: 0.36, col: 'blue', name: '나', tread: 0, slow: 0, hidden: false };
let ENTS = [];        // 다른 탱크(봇)
let PUSH = [];        // 밀 수 있는 물체 {x,y,kind,ax,ay}
let INTER = [];       // 상호작용 {x,y,r,label,key?,show(),act()}
const HOLES = new Set();
let MODE = null;      // 현재 모드 객체
const MODES = {};
const rnd = (a, b) => a + Math.random() * (b - a), rndi = n => Math.floor(Math.random() * n), pick = a => a[rndi(a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rndi(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- 문 · 타일 통과
function doorUnlocked(d) { return MODE && MODE.doorOK ? MODE.doorOK(d) : true; }
function gateActive(g) { const p = ((STATE.t / 2.6 + g.ph) % 1); return p < 0.42; }
function gateWarn(g) { const p = ((STATE.t / 2.6 + g.ph) % 1); return p > 0.86; }
// GATEAT: 맵 파일에서 만든다 (게이트 타일 → 게이트)
function pushAt(x, y) { for (const p of PUSH) if (p.x === x && p.y === y) return p; return null; }
function tileBlocks(x, y, who) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  const i = gi(x, y), t = G[i];
  if (t === TL.WALL || t === TL.VOID) return true;
  if (t === TL.DOOR) { const d = doorAt(x, y); return d && (!doorUnlocked(d) || d.amt < 0.6); }
  if (t === TL.WATER) return !STATE.drained;
  if (HOLES.has(i)) return true;
  if (t === TL.GATE) return false;
  if (SOLID[i]) return true;
  if (pushAt(x, y)) return true;
  return false;
}
function opaque(x, y) { if (x < 0 || y < 0 || x >= MW || y >= MH) return true; const t = G[gi(x, y)]; if (t === TL.WALL || t === TL.VOID) return true; if (t === TL.DOOR) { const d = doorAt(x, y); return d && d.amt < 0.5; } return false; }
function circleHits(x, y, r, who) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
    if (!tileBlocks(tx, ty, who)) continue;
    const cx = clamp(x, tx, tx + 1), cy = clamp(y, ty, ty + 1); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return [tx, ty];
  }
  return null;
}
// 움직임: 축 분리. 반환 = 막힌 타일들
function moveEnt(e, dx, dy, who) {
  const hit = { x: null, y: null };
  if (dx) { const nx = e.x + dx, h = circleHits(nx, e.y, e.r, who); if (!h) e.x = nx; else hit.x = h; }
  if (dy) { const ny = e.y + dy, h = circleHits(e.x, ny, e.r, who); if (!h) e.y = ny; else hit.y = h; }
  return hit;
}
// 밀기(소코반): 축 방향 입력이 우세할 때 0.16초 버티면 한 칸
let pushT = 0, pushKey = '';
function tryPush(hit, ix, iy, dt) {
  let cand = null;
  if (hit.x && Math.abs(ix) > Math.abs(iy) * 1.4) { const p = pushAt(hit.x[0], hit.x[1]); if (p && Math.abs(PL.y - (p.y + 0.5)) < 0.42) cand = [p, Math.sign(ix), 0]; }
  if (hit.y && Math.abs(iy) > Math.abs(ix) * 1.4) { const p = pushAt(hit.y[0], hit.y[1]); if (p && Math.abs(PL.x - (p.x + 0.5)) < 0.42) cand = [p, 0, Math.sign(iy)]; }
  if (!cand) { pushT = 0; return; }
  const [p, sx, sy] = cand, k = p.x + ',' + p.y + ',' + sx + sy; if (k !== pushKey) { pushKey = k; pushT = 0; }
  pushT += dt; if (pushT < 0.16) return; pushT = 0;
  const nx = p.x + sx, ny = p.y + sy, ni = gi(nx, ny);
  const t = G[ni]; let ok = (t === TL.FLOOR || t === TL.CONV) && !SOLID[ni] && !pushAt(nx, ny);
  if (HOLES.has(ni)) ok = true;
  // 탱크가 그 칸에 있으면 못 밈
  if (ok && ENTS.some(e => Math.floor(e.x) === nx && Math.floor(e.y) === ny)) ok = false;
  if (!ok) { sfx('bump'); return; }
  p.ax = p.x; p.ay = p.y; p.anim = 0; p.x = nx; p.y = ny; sfx('push');
  if (HOLES.has(ni)) { HOLES.delete(ni); PUSH.splice(PUSH.indexOf(p), 1); FILLED.push({ x: nx, y: ny, kind: p.kind, t: STATE.t }); sfx('thud'); MODE.onFill && MODE.onFill(nx, ny, p); }
  MODE.onPush && MODE.onPush(p);
}
const FILLED = [];

// ---------------------------------------------------------------- 입력
const KEY = {}; let joy = { x: 0, y: 0, on: false };
// 한글 자판에서도 동작하도록 물리 키(e.code) 기준
function keyOf(e) { const c = e.code || ''; if (c.startsWith('Key')) return c.slice(3).toLowerCase(); if (c === 'Space') return ' '; return (e.key || '').toLowerCase(); }
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = keyOf(e); KEY[k] = true;
  if (!$('#modal').hidden) { if ((k === 'escape' && !(MODAL && MODAL.sticky)) || (k === 'm' && MAPOPEN) || (k === 'h' && MODAL && MODAL.hint)) closeModal(); return; }
  if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); doAction(); }
  if (k === 'm') toggleMap();
  if (k === 'h' && MODE && MODE.hint) MODE.hint();
  if (k === 'q' && MODE && MODE.alt) MODE.alt();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});
addEventListener('keyup', e => { KEY[keyOf(e)] = false; });
addEventListener('blur', () => { for (const k in KEY) KEY[k] = false; });
(function () {
  const J = $('#joy'), K = $('#joyk'); let id = null, cx = 0, cy = 0;
  J.addEventListener('pointerdown', e => { id = e.pointerId; J.setPointerCapture(id); const b = J.getBoundingClientRect(); cx = b.left + b.width / 2; cy = b.top + b.height / 2; mv(e); });
  J.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
  const up = e => { if (e.pointerId !== id) return; id = null; joy = { x: 0, y: 0, on: false }; K.style.transform = ''; };
  J.addEventListener('pointerup', up); J.addEventListener('pointercancel', up);
  function mv(e) { let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), R = 46; if (m > R) { dx *= R / m; dy *= R / m; } joy = { x: dx / R, y: dy / R, on: true }; K.style.transform = `translate(${dx}px,${dy}px)`; }
  $('#actBtn').addEventListener('pointerdown', e => { e.preventDefault(); doAction(); });
  $('#altBtn').addEventListener('pointerdown', e => { e.preventDefault(); MODE && MODE.alt && MODE.alt(); });
})();
function inputVec() {
  let x = 0, y = 0;
  if (KEY['arrowleft'] || KEY['a']) x--; if (KEY['arrowright'] || KEY['d']) x++; if (KEY['arrowup'] || KEY['w']) y--; if (KEY['arrowdown'] || KEY['s']) y++;
  if (joy.on && Math.hypot(joy.x, joy.y) > 0.18) { x = joy.x; y = joy.y; }
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  return [x, y];
}

// ---------------------------------------------------------------- 소리 (WebAudio 간단 신스)
let AC = null; function ac() { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } return AC; }
let MUTE = false; try { MUTE = localStorage.getItem('kw_mute') === '1'; } catch (e) { }
function beep(f, d, type, vol, slide) { const a = ac(); if (!a || MUTE) return; const o = a.createOscillator(), g = a.createGain(); o.type = type || 'square'; o.frequency.value = f; if (slide) o.frequency.exponentialRampToValueAtTime(slide, a.currentTime + d); g.gain.value = vol || 0.05; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d); }
function sfx(n) {
  const S = { ok: () => { beep(660, .12, 'square', .05); setTimeout(() => beep(990, .16, 'square', .05), 90); }, bad: () => beep(160, .25, 'sawtooth', .05, 90), push: () => beep(110, .08, 'triangle', .08), thud: () => beep(70, .3, 'triangle', .12, 40), bump: () => beep(90, .05, 'triangle', .04), item: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .12, 'square', .045), i * 70)); }, door: () => beep(300, .12, 'triangle', .04, 500), click: () => beep(880, .04, 'square', .03), alarm: () => { for (let i = 0; i < 3; i++) setTimeout(() => beep(880, .15, 'sawtooth', .05, 440), i * 180); }, whistle: () => beep(1400, .35, 'sine', .06, 2200), zap: () => beep(1200, .2, 'sawtooth', .05, 200), vent: () => beep(200, .25, 'square', .05, 80), win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, .2, 'square', .05), i * 110)); }, step: () => beep(60 + Math.random() * 20, .03, 'triangle', .02) };
  S[n] && S[n]();
}

// ---------------------------------------------------------------- 시야 (어몽어스식 시야 폴리곤)
function castRay(x, y, a, R) {
  const dx = Math.cos(a), dy = Math.sin(a); let mx = Math.floor(x), my = Math.floor(y);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1; const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9));
  let tx = (dx > 0 ? mx + 1 - x : x - mx) * tdx, ty = (dy > 0 ? my + 1 - y : y - my) * tdy, d = 0;
  while (d < R) { if (tx < ty) { d = tx; tx += tdx; mx += sx; } else { d = ty; ty += tdy; my += sy; } if (d >= R) break; if (opaque(mx, my)) return d + 0.12; }
  return R;
}
function visPoly(x, y, R, n) { n = n || 240; const pts = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const d = castRay(x, y, a, R); pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]); } return pts; }
function los(x0, y0, x1, y1) { const d = Math.hypot(x1 - x0, y1 - y0); if (d < 0.01) return true; return castRay(x0, y0, Math.atan2(y1 - y0, x1 - x0), d) >= d - 0.15; }
let VIS = null, VISR = 8;
function canSee(x, y) { return Math.hypot(x - PL.x, y - PL.y) <= VISR + 0.3 && los(PL.x, PL.y, x, y); }

// ---------------------------------------------------------------- 카메라 · 렌더
let CAM = { x: PL.x * T, y: PL.y * T }, SHAKE = 0;
function roomFloor(i, j) { const v = GR[gi(i, j)]; if (v === -2) return typeof MAP !== 'undefined' && MAP && MAP.corrFl || 'corr'; if (v >= 0) return ROOMS[v].fl; return 'corr'; }
function lit(i, j) { if (!MODE || !MODE.dark) return true; return MODE.lit(i, j); }
function drawFloor(i0, j0, i1, j1) {
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const t = G[gi(i, j)]; if (t === TL.WALL || t === TL.VOID) continue;
    const X = i * T, Y = j * T, fl = roomFloor(i, j);
    if (t === TL.WATER && !STATE.drained) { ctx.fillStyle = '#1C6E9E'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = 'rgba(160,230,255,.25)'; const w = Math.sin(STATE.t * 2 + i * 0.7 + j * 0.4); ctx.fillRect(X + 6, Y + 18 + w * 4, 18, 3); ctx.fillRect(X + 26, Y + 32 - w * 4, 14, 3); continue; }
    (FLOOR[fl] || FLOOR.corr)(X, Y, i, j, seedRand(i * 131 + j * 7));
    if (t === TL.WATER && STATE.drained) { ctx.fillStyle = 'rgba(28,110,158,.22)'; ctx.fillRect(X, Y, T, T); }
    if (t === TL.CONV) { ctx.fillStyle = '#3A3F4A'; ctx.fillRect(X, Y + 4, T, T - 8); ctx.fillStyle = '#F5C542'; const dir = CONV[gi(i, j)], ph = ((STATE.t * 3.4 * dir) % 1 + 1) % 1; for (let k = -1; k < 2; k++) { const cx = X + (k + ph) * T * 0.5 + T * 0.25; ctx.beginPath(); ctx.moveTo(cx - dir * 6, Y + 12); ctx.lineTo(cx + dir * 6, Y + T / 2); ctx.lineTo(cx - dir * 6, Y + T - 12); ctx.lineWidth = 4; ctx.strokeStyle = '#F5C542'; ctx.stroke(); } }
    if (HOLES.has(gi(i, j))) { ctx.fillStyle = '#120C08'; ctx.fillRect(X + 2, Y + 2, T - 4, T - 4); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(X + 2, Y + 2, T - 4, 6); }
  }
}
// ---- 정적 바닥·벽 청크 캐시 (매 프레임 타일 그리기 대신)
let USECHUNK = false; const CHK = 8, CHC = new Map(); let CHKK = 1;
function chunkScale() { return Math.min(2, DPR * SC); }
function getChunk(cx, cy) {
  const key = cx + ',' + cy; let c = CHC.get(key); if (c) { CHC.delete(key); CHC.set(key, c); return c; }
  const k = CHKK, px = CHK * T * k; const f = document.createElement('canvas'), w = document.createElement('canvas'); f.width = f.height = w.width = w.height = Math.ceil(px);
  const save = ctx; const i0 = cx * CHK, j0 = cy * CHK, i1 = Math.min(MW - 1, i0 + CHK - 1), j1 = Math.min(MH - 1, j0 + CHK - 1);
  ctx = f.getContext('2d'); ctx.setTransform(k, 0, 0, k, -i0 * T * k, -j0 * T * k); drawFloorStatic(i0, j0, i1, j1);
  ctx = w.getContext('2d'); ctx.setTransform(k, 0, 0, k, -i0 * T * k, -j0 * T * k); drawWalls(i0, j0, i1, j1);
  ctx = save; c = { f, w }; CHC.set(key, c); while (CHC.size > 40) CHC.delete(CHC.keys().next().value); return c;
}
function blitChunks(i0, j0, i1, j1, layer) {
  const k = chunkScale(); if (k !== CHKK) { CHKK = k; CHC.clear(); }
  for (let cy = Math.floor(j0 / CHK); cy <= Math.floor(j1 / CHK); cy++) for (let cx = Math.floor(i0 / CHK); cx <= Math.floor(i1 / CHK); cx++) { const c = getChunk(cx, cy), m = ctx.getTransform(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c[layer], Math.round(m.e + cx * CHK * T * m.a), Math.round(m.f + cy * CHK * T * m.d)); ctx.restore(); }
}
function drawFloorStatic(i0, j0, i1, j1) {
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = G[gi(i, j)]; if (t === TL.WALL || t === TL.VOID || t === TL.WATER || t === TL.CONV) continue; (FLOOR[roomFloor(i, j)] || FLOOR.corr)(i * T, j * T, i, j, seedRand(i * 131 + j * 7)); }
}
function drawFloorLive(i0, j0, i1, j1) {
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = G[gi(i, j)]; if (t === TL.WATER || t === TL.CONV || HOLES.has(gi(i, j))) drawFloor(i, j, i, j); }
}
function wallAt(i, j) { if (i < 0 || j < 0 || i >= MW || j >= MH) return true; const t = G[gi(i, j)]; return t === TL.WALL || t === TL.VOID; }
function drawWalls(i0, j0, i1, j1) {
  const MS = typeof MAP !== 'undefined' ? MAP : null;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (!wallAt(i, j)) continue;
    // 바닥과 닿지 않은 벽은 빈 공간(VOID)으로
    let near = false; for (let b = -1; b <= 1 && !near; b++) for (let a = -1; a <= 1; a++) if (!wallAt(i + a, j + b)) { near = true; break; }
    const X = i * T, Y = j * T;
    if (!near) { if (MS && MS.voidFn) MS.voidFn(X, Y, i, j); else { ctx.fillStyle = '#0A0F1C'; ctx.fillRect(X, Y, T + 1, T + 1); } continue; }
    const below = !wallAt(i, j + 1); const rv = GR[gi(i, j + 1)]; const rc = rv >= 0 ? ROOMS[rv].c : MS && MS.corrWall || '#5B6B82';
    const wv = GR[gi(i, j)], wtop = wv >= 0 && ROOMS[wv].wallTop || MS && MS.wallTop || '#2A3450';
    ctx.fillStyle = '#1E2638'; ctx.fillRect(X, Y, T + 1, T + 1);
    if (below) { ctx.fillStyle = shade(rc, 0.62); ctx.fillRect(X, Y + T * 0.3, T + 1, T * 0.7 + 1); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(X, Y + T * 0.3, T + 1, 4); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X, Y + T - 5, T + 1, 5); }
    ctx.fillStyle = wtop; ctx.fillRect(X, Y, T + 1, below ? T * 0.3 : T + 1);
  }
}
function dimWalls(i0, j0, i1, j1) {
  const R = VISR; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const t = G[gi(i, j)]; if (t !== TL.WALL && t !== TL.DOOR) continue; const d = Math.hypot(i + .5 - PL.x, j + .5 - PL.y); const a = clamp((d - R + 1.5) / 3, 0, 0.82); if (a > 0) { ctx.fillStyle = `rgba(4,6,14,${a})`; ctx.fillRect(i * T, j * T, T + 1, T + 1); } }
}
function drawDoors() {
  for (const d of DOORLIST) {
    const X = d.x0 * T, Y = d.y0 * T, W = (d.x1 - d.x0 + 1) * T, H = (d.y1 - d.y0 + 1) * T, a = d.amt;
    const ok = doorUnlocked(d), col = MODE && MODE.lockColor ? MODE.lockColor(d) : '#8A97AA';
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X, Y, W, H);
    if (d.vert) { const pw = W / 2 * (1 - a); rr(X, Y + 4, pw, H - 8, 3, '#9AA6B8', OL, 2); rr(X + W - pw, Y + 4, pw, H - 8, 3, '#9AA6B8', OL, 2); if (pw > 6) { ctx.fillStyle = col; ctx.fillRect(X + pw - 6, Y + 6, 4, H - 12); ctx.fillRect(X + W - pw + 2, Y + 6, 4, H - 12); } }
    else { const ph = H / 2 * (1 - a); rr(X + 4, Y, W - 8, ph, 3, '#9AA6B8', OL, 2); rr(X + 4, Y + H - ph, W - 8, ph, 3, '#9AA6B8', OL, 2); if (ph > 6) { ctx.fillStyle = col; ctx.fillRect(X + 6, Y + ph - 6, W - 12, 4); ctx.fillRect(X + 6, Y + H - ph + 2, W - 12, 4); } }
    if (!ok && a < 0.1) { circ(X + W / 2, Y + H / 2, 13, col, OL, 2.5); txt('🔒', X + W / 2, Y + H / 2 + 1, 13, OL, 900); }
  }
}
function updateDoors(dt) {
  for (const d of DOORLIST) {
    const cx = (d.x0 + d.x1 + 1) / 2, cy = (d.y0 + d.y1 + 1) / 2; let near = Math.hypot(PL.x - cx, PL.y - cy) < 2.3;
    for (const e of ENTS) if (!near && Math.hypot(e.x - cx, e.y - cy) < 2.3) near = true;
    if (MODE && MODE.doorForce) { const f = MODE.doorForce(d); if (f !== undefined) near = f; }
    const want = near && doorUnlocked(d) ? 1 : 0; const prev = d.amt;
    d.amt += clamp(want - d.amt, -dt * 4, dt * 4);
    if (prev === 0 && d.amt > 0 && Math.hypot(PL.x - cx, PL.y - cy) < 5) sfx('door');
  }
}
DOORLIST.forEach(d => d.amt = 0);
function drawGates() {
  for (const g of GATES) { const on = gateActive(g), w = gateWarn(g); const X = g.x * T + T / 2; const Y0 = g.y0 * T, Y1 = (g.y1 + 1) * T;
    rr(X - 8, Y0 - 4, 16, 10, 3, '#2B2B3A', OL, 2); rr(X - 8, Y1 - 6, 16, 10, 3, '#2B2B3A', OL, 2);
    if (on) { ctx.save(); ctx.shadowColor = '#FF2A2A'; ctx.shadowBlur = 16; line(X, Y0, X, Y1, '#FF4A3A', 6); line(X - 4, Y0, X - 4, Y1, 'rgba(255,120,100,.6)', 2); line(X + 4, Y0, X + 4, Y1, 'rgba(255,120,100,.6)', 2); ctx.restore(); }
    else if (w) { ctx.setLineDash([6, 8]); line(X, Y0, X, Y1, 'rgba(255,90,70,.7)', 2); ctx.setLineDash([]); }
  }
}
function drawDecor(list) {
  for (const d of list) { const f = DRAW[d.t]; if (!f) continue; f(d, d.x * T, d.y * T, d.w * T, d.h * T); }
}
function drawPush() {
  for (const p of PUSH) { let x = p.x, y = p.y; if (p.anim !== undefined && p.anim < 1) { p.anim = Math.min(1, p.anim + 0.25); x = p.ax + (p.x - p.ax) * p.anim; y = p.ay + (p.y - p.ay) * p.anim; } const X = x * T, Y = y * T;
    if (p.kind === 'boulder') { shadowE(X + T / 2 + 4, Y + T - 6, 20, 8); circ(X + T / 2, Y + T / 2, 21, '#8A6A44', OL, 3); circ(X + T / 2 - 6, Y + T / 2 - 7, 7, 'rgba(255,255,255,.22)'); ctx.setLineDash([5, 4]); circ(X + T / 2, Y + T / 2, 23, null, '#FFD24A', 2.5); ctx.setLineDash([]); txt('⇄', X + T / 2, Y + T / 2 + 1, 14, 'rgba(255,255,255,.85)', 900); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X + 16, Y + 30); ctx.lineTo(X + 26, Y + 24); ctx.lineTo(X + 32, Y + 32); ctx.stroke(); }
    else { shadowE(X + T / 2 + 4, Y + T - 6, 20, 8); rr(X + 5, Y + 12, T - 10, T - 16, 6, '#B5701A', OL, 3); circ(X + T / 2 - 7, Y + 14, 10, '#5E9A22', OL, 2); circ(X + T / 2 + 7, Y + 12, 11, '#8CC63F', OL, 2); circ(X + T / 2, Y + 6, 9, '#7DB54C', OL, 2); }
  }
  for (const f of FILLED) { const X = f.x * T, Y = f.y * T; ctx.fillStyle = f.kind === 'boulder' ? '#6E5236' : '#5A3A1E'; ctx.fillRect(X + 2, Y + 2, T - 4, T - 4); ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let k = 0; k < 3; k++) ctx.fillRect(X + 8 + k * 12, Y + 10 + (k % 2) * 16, 8, 6); }
}
function drawVents() {
  if (!MODE || !MODE.vents) return;
  for (const v of VENTS) for (const [x, y] of [[v[0], v[1]], [v[2], v[3]]]) { const X = x * T, Y = y * T; rr(X - 20, Y - 15, 40, 30, 5, '#5B6B82', OL, 2.5); for (let k = 0; k < 4; k++) line(X - 14, Y - 9 + k * 6, X + 14, Y - 9 + k * 6, '#2A3344', 3); }
}
function drawTracks() {
  if (!TRACK.sw.length) return;
    for (const k of ['up', 'lo']) { const Y = (TRACK[k] + .5) * T; ctx.fillStyle = 'rgba(80,60,40,.35)'; ctx.fillRect(TRACK.x0 * T, Y - 16, (TRACK.x1 - TRACK.x0) * T, 32); for (let x = TRACK.x0 * T; x < TRACK.x1 * T; x += 22) ctx.fillRect(x, Y - 18, 8, 36); line(TRACK.x0 * T, Y - 9, TRACK.x1 * T, Y - 9, '#5B6B82', 4); line(TRACK.x0 * T, Y + 9, TRACK.x1 * T, Y + 9, '#5B6B82', 4); }
    TRACK.sw.forEach((sx, i) => { const st = decorById('lev' + i).st; ctx.globalAlpha = st ? 1 : .35; line(sx * T, (TRACK.up + .5) * T, (sx + 3) * T, (TRACK.lo + .5) * T, st ? '#7CFF8A' : '#9AA6B8', 6); line(sx * T, (TRACK.lo + .5) * T, (sx + 3) * T, (TRACK.up + .5) * T, st ? '#7CFF8A' : '#9AA6B8', 6); ctx.globalAlpha = 1; });
}
function drawDoorSigns() {
  for (const d of DOORLIST) { const r = ROOMS[RID[d.room]]; let sx, sy, ar;
    if (d.vert) { const cx = (d.x0 + d.x1 + 1) / 2; if (GR[gi(d.x0, d.y0 - 1)] === -2) { sx = cx; sy = d.y0 - 0.75; ar = '▼'; } else if (GR[gi(d.x0, d.y1 + 1)] === -2) { sx = cx; sy = d.y1 + 1.75; ar = '▲'; } }
    else { const cy = (d.y0 + d.y1 + 1) / 2; if (GR[gi(d.x0 - 1, d.y0)] === -2) { sx = d.x0 - 1.4; sy = cy; ar = '▶'; } else if (GR[gi(d.x1 + 1, d.y0)] === -2) { sx = d.x1 + 2.4; sy = cy; ar = '◀'; } }
    if (sx === undefined) continue; const col = MODE && MODE.lockColor ? MODE.lockColor(d) : '#8A97AA'; const ok = doorUnlocked(d);
    ctx.globalAlpha = .9; tag(`${ar} ${r.s}${ok ? '' : ' 🔒'}`, sx * T, sy * T, ok ? 'rgba(14,34,56,.72)' : col, '#fff', 12); ctx.globalAlpha = 1; }
}
function drawRoomLabels() {
  for (const r of ROOMS) { if (r.inner) continue; const X = (r.lab ? r.lab[0] : r.r[0] + 0.3) * T, Y = (r.lab ? r.lab[1] : r.r[1] + 0.55) * T; ctx.globalAlpha = 0.85; tag(`${r.s} · ${r.n}`, X + 0, Y, shade(r.c, 0.7), '#fff', 15); ctx.globalAlpha = 1; }
}
let TUTDRAW = null; // 따라하기 안내 화살표 (있을 때만)
let PROMPT = null; const COARSE = matchMedia('(pointer:coarse)').matches;
function drawPrompt() {
  if (!PROMPT) return; const X = PROMPT.x * T, Y = PROMPT.y * T - 46 + Math.sin(STATE.t * 5) * 3;
  ctx.font = `900 14px ${FONT}`; const s = PROMPT.label, w = ctx.measureText(s).width + 52;
  rr(X - w / 2, Y - 16, w, 32, 10, '#FFD24A', OL, 2.5); if (COARSE) { rr(X - w / 2 + 6, Y - 11, 22, 22, 11, OL); txt('●', X - w / 2 + 17, Y, 10, '#FFD24A', 900); } else { rr(X - w / 2 + 6, Y - 11, 22, 22, 5, OL); txt(PROMPT.key || 'E', X - w / 2 + 17, Y, 12, '#FFD24A', 900); } txt(s, X + 13, Y, 14, OL, 900);
}
// 파티클 · 떠오르는 글자
const FX = [];
function fxText(x, y, s, c) { FX.push({ k: 'txt', x, y, s, c: c || '#FFD24A', t: 0, life: 1.4 }); }
function fxBurst(x, y, c, n) { for (let i = 0; i < (n || 16); i++) { const a = Math.random() * 6.28, v = rnd(1, 4); FX.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c || '#FFD24A', t: 0, life: rnd(0.4, 0.9) }); } }
function drawFX(dt) {
  for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; if (f.t > f.life) { FX.splice(i, 1); continue; } const k = 1 - f.t / f.life;
    if (f.k === 'txt') { ctx.globalAlpha = Math.min(1, k * 2); tag(f.s, f.x * T, f.y * T - 30 - f.t * 30, OL, f.c, 15); ctx.globalAlpha = 1; }
    else if (f.k === 'ring') { ctx.strokeStyle = f.c; ctx.globalAlpha = k; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x * T, f.y * T, (0.5 + (1 - k) * 5) * T, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else { f.x += f.vx * dt; f.y += f.vy * dt; circ(f.x * T, f.y * T, 5 * k + 1, f.c); } }
}
function drawFog() {
  fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalCompositeOperation = 'source-over'; fctx.clearRect(0, 0, fog.width, fog.height);
  fctx.fillStyle = MODE && MODE.fogColor ? MODE.fogColor() : 'rgba(6,9,20,.9)'; fctx.fillRect(0, 0, fog.width, fog.height);
  fctx.setTransform(FD * SC, 0, 0, FD * SC, VW * FD / 2 - CAM.x * FD * SC, VH * FD / 2 - CAM.y * FD * SC);
  fctx.globalCompositeOperation = 'destination-out';
  if (VIS) { const g = fctx.createRadialGradient(PL.x * T, PL.y * T, VISR * T * 0.55, PL.x * T, PL.y * T, VISR * T); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); fctx.fillStyle = g; fctx.beginPath(); VIS.forEach(([x, y], k) => k ? fctx.lineTo(x * T, y * T) : fctx.moveTo(x * T, y * T)); fctx.closePath(); fctx.fill(); }
  if (MODE && MODE.fogHoles) MODE.fogHoles(fctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fog, 0, 0, cv.width, cv.height);
}
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0A0F1C'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sh = SHAKE > 0 ? (Math.random() - .5) * SHAKE * 14 : 0; SHAKE = Math.max(0, SHAKE - dt * 2);
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, Math.round(VW * DPR / 2 - (CAM.x + sh) * DPR * SC), Math.round(VH * DPR / 2 - (CAM.y + sh) * DPR * SC));
  const hw = VW / 2 / SC / T + 2, hh = VH / 2 / SC / T + 2, cx = CAM.x / T, cy = CAM.y / T;
  const i0 = Math.max(0, Math.floor(cx - hw)), i1 = Math.min(MW - 1, Math.ceil(cx + hw)), j0 = Math.max(0, Math.floor(cy - hh)), j1 = Math.min(MH - 1, Math.ceil(cy + hh));
  if (USECHUNK) { blitChunks(i0, j0, i1, j1, 'f'); drawFloorLive(i0, j0, i1, j1); } else drawFloor(i0, j0, i1, j1);
  drawTracks(); MODE && MODE.drawUnder && MODE.drawUnder();
  drawRoomLabels(); drawDoorSigns(); drawVents();
  const vis = DEC.filter(d => d.x + d.w >= i0 - 3 && d.x <= i1 + 3 && d.y + d.h >= j0 - 3 && d.y <= j1 + 3 && !(MODE && MODE.hideDecor && MODE.hideDecor(d)));
  drawDecor(vis.filter(d => !d.solid)); drawPush(); drawDecor(vis.filter(d => d.solid));
  MODE && MODE.drawMid && MODE.drawMid();
  drawGates();
  // 탱크
  const all = ENTS.filter(e => !e.gone).concat(PL.gone ? [] : [PL]).sort((a, b) => a.y - b.y);
  for (const e of all) { if (e !== PL && !(MODE && MODE.showEnt ? MODE.showEnt(e) : canSee(e.x, e.y))) continue; drawTank(e); }
  MODE && MODE.drawOver && MODE.drawOver();
  drawFX(dt);
  drawFog();
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, Math.round(VW * DPR / 2 - (CAM.x + sh) * DPR * SC), Math.round(VH * DPR / 2 - (CAM.y + sh) * DPR * SC));
  if (USECHUNK) blitChunks(i0, j0, i1, j1, 'w'); else drawWalls(i0, j0, i1, j1); drawDoors(); dimWalls(i0, j0, i1, j1);
  MODE && MODE.drawTop && MODE.drawTop();
  TUTDRAW && TUTDRAW();
  drawPrompt();
}
function drawTank(e) {
  if (MODE && MODE.drawEnt) { MODE.drawEnt(e); return; }
  if (e.disguise) { MODE.drawDisguise(e); return; }
  tank(e.x * T, e.y * T, e.a, e.col, e.name, { tread: e.tread, paint: e.paint, me: e === PL, alpha: e.alpha, scale: e.scale });
  if (e.badge) tag(e.badge, e.x * T, e.y * T + 36, e.badgeC || '#E0533F', '#fff', 11);
}

// ---------------------------------------------------------------- 미니맵 · 전체 지도
function drawMapTo(c2, W, H, opt) {
  const s = Math.min(W / MW, H / MH), ox = (W - MW * s) / 2, oy = (H - MH * s) / 2;
  c2.fillStyle = '#0A0F1C'; c2.fillRect(0, 0, W, H);
  const tiled = typeof MAP !== 'undefined' && MAP && MAP.tiled;
  if (tiled) { c2.imageSmoothingEnabled = false; c2.drawImage(mapBaseImage(), ox, oy, MW * s, MH * s); }
  else { for (const r of ROOMS) { if (r.inner) continue; c2.fillStyle = shade(r.c, 0.55); c2.fillRect(ox + r.r[0] * s, oy + r.r[1] * s, (r.r[2] - r.r[0] + 1) * s, (r.r[3] - r.r[1] + 1) * s); }
  c2.fillStyle = '#3A4560'; for (const c of CORR) c2.fillRect(ox + c[0] * s, oy + c[1] * s, (c[2] - c[0] + 1) * s, (c[3] - c[1] + 1) * s); }
  if (RID.ctrl !== undefined) { const cr = ROOMS[RID.ctrl].r; c2.fillStyle = '#13294B'; c2.fillRect(ox + (cr[0] - 1) * s, oy + (cr[1] - 1) * s, (cr[2] - cr[0] + 3) * s, (cr[3] - cr[1] + 3) * s); c2.fillStyle = '#FFD24A'; c2.fillRect(ox + cr[0] * s, oy + cr[1] * s, (cr[2] - cr[0] + 1) * s, (cr[3] - cr[1] + 1) * s); }
  for (const d of DOORLIST) { const ok = doorUnlocked(d); c2.fillStyle = ok ? '#C9D1DE' : (MODE && MODE.lockColor ? MODE.lockColor(d) : '#E0533F'); c2.fillRect(ox + d.x0 * s, oy + d.y0 * s, (d.x1 - d.x0 + 1) * s, (d.y1 - d.y0 + 1) * s); }
  if (opt && opt.labels) { c2.textAlign = 'center'; c2.textBaseline = 'middle'; for (const r of ROOMS) { if (r.inner) continue; const x = ox + (r.ctr ? r.ctr[0] : (r.r[0] + r.r[2] + 1) / 2) * s, y = oy + (r.ctr ? r.ctr[1] : r.id === 'lobby' ? r.r[3] - 1.5 : (r.r[1] + r.r[3] + 1) / 2) * s; c2.font = `900 ${Math.max(10, s * 1.7)}px ${FONT}`; c2.fillStyle = '#fff'; c2.fillText(r.s, x, y - s * 1.2); c2.font = `800 ${Math.max(9, s * 1.25)}px ${FONT}`; c2.fillStyle = 'rgba(255,255,255,.8)'; c2.fillText(r.n, x, y + s * 0.9); } c2.font = `900 ${Math.max(9, s * 1.2)}px ${FONT}`; if (RID.ctrl !== undefined) { c2.fillStyle = OL; c2.fillText('관제실', ox + 64.5 * s, oy + 30 * s); } }
  if (MODE && MODE.mapMarks) MODE.mapMarks(c2, ox, oy, s, opt);
  c2.fillStyle = '#FFD24A'; c2.strokeStyle = OL; c2.lineWidth = 2; c2.beginPath(); c2.arc(ox + PL.x * s, oy + PL.y * s, Math.max(3.5, s * 1.1), 0, 7); c2.fill(); c2.stroke();
}
let MAPOPEN = false;
function toggleMap() {
  if (STATE.mode === 'menu') return;
  if (MAPOPEN) { closeModal(); return; }
  openModal(`<div class="mh"><div><div class="mk">전체 지도 · M</div><h3>${MODE && MODE.mapTitle ? MODE.mapTitle : typeof MAP !== 'undefined' && MAP ? MAP.name : '케이요새 연구단지'}</h3></div><button class="x" data-close aria-label="닫기">✕</button></div><canvas id="bigmap" width="1220" height="840" style="width:100%;border-radius:12px;border:2px solid var(--ink)"></canvas><div class="maplegend">${MODE && MODE.mapLegend ? MODE.mapLegend() : ''}</div>`, { wide: true, onclose: () => { MAPOPEN = false; } });
  MAPOPEN = true; const c = $('#bigmap'); drawMapTo(c.getContext('2d'), c.width, c.height, { labels: true, big: true });
}

// ---------------------------------------------------------------- UI: 토스트 · 배너 · 모달
let rcT = 0;
function roomCard(r) { const el = $('#roomcard'); el.innerHTML = `<i style="background:${r.c}"></i><div><b>${r.s} · ${r.n}</b><small>${r.inst} — ${FLAVOR[r.id] || ''}</small></div>`; el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); rcT = 3.2; }
let toastT = 0;
function toast(s, ms) { const el = $('#toast'); el.innerHTML = s; el.hidden = false; toastT = (ms || 2600) / 1000; }
let bannerT = 0;
function banner(b, s, ms) { const el = $('#banner'); el.querySelector('b').textContent = b; el.querySelector('small').textContent = s || ''; el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); bannerT = (ms || 2200) / 1000; }
let MODAL = null;
// 모달 수명에 묶인 키 핸들러 · 타이머
function modalKey(fn) { const o = MODAL; if (!o) return; const h = e => { if (MODAL !== o) return; fn(e); }; addEventListener('keydown', h); (o._clean = o._clean || []).push(() => removeEventListener('keydown', h)); }
function modalLater(fn, ms) { const o = MODAL; setTimeout(() => { if (MODAL === o && o) fn(); }, ms); }
function later(fn, ms) { const r = STATE.run; setTimeout(() => { if (STATE.run === r) fn(); }, ms); }
function cleanModal(o) { if (o && o._clean) { o._clean.forEach(f => f()); o._clean = null; } }
function openModal(html, o) {
  cleanModal(MODAL); o = o || {}; const m = $('#modal'), b = m.querySelector('.box'); b.className = 'box' + (o.wide ? ' wide' : '') + (o.cls ? ' ' + o.cls : ''); b.innerHTML = html; m.hidden = false; MODAL = o;
  if (o.sticky) b.querySelectorAll('.x').forEach(x => x.remove());
  b.querySelectorAll('[data-close]').forEach(x => x.onclick = closeModal);
  for (const k in KEY) KEY[k] = false; joy = { x: 0, y: 0, on: false };
  const f = o.nofocus ? null : (b.querySelector('[autofocus]') || b.querySelector('button:not(.x)')); f && setTimeout(() => f.focus(), 30);
  o.onopen && o.onopen(b);
  return b;
}
function closeModal() { const m = $('#modal'); if (m.hidden) return; m.hidden = true; const o = MODAL; MODAL = null; cleanModal(o); o && o.onclose && o.onclose(); }
$('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' && MODAL && !MODAL.sticky) closeModal(); });
function fmtT(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ---------------------------------------------------------------- 상호작용
function nearestInter() {
  let best = null, bd = 1e9;
  for (const it of INTER) { if (it.show && !it.show()) continue; const d = Math.hypot(PL.x - it.x, PL.y - it.y); if (d < (it.r || 1.5) && d < bd) { bd = d; best = it; } }
  return best;
}
function doAction() {
  if (!$('#modal').hidden || STATE.mode === 'menu' || STATE.over) return;
  ac(); const it = nearestInter(); if (it) { sfx('click'); it.act(); return; }
  MODE && MODE.action && MODE.action();
}

// ---------------------------------------------------------------- 메인 루프
let last = performance.now(), stepAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (STATE.mode !== 'menu') tick(dt);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').hidden = true; }
  if (rcT > 0) { rcT -= dt; if (rcT <= 0) $('#roomcard').hidden = true; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('#banner').hidden = true; }
  requestAnimationFrame(frame);
}
function tick(dt) {
  const paused = !$('#modal').hidden && !(MODAL && MODAL.live);
  if (!paused) {
    STATE.t += dt; if (!STATE.over) STATE.clock += dt;
    let [ix, iy] = inputVec(); if (PL.frozen || STATE.over || PL.caged || (MODAL && MODAL.live)) { ix = 0; iy = 0; }
    const sp = (PL.speed || 4.4) * (PL.slow > 0 ? 0.5 : 1); PL.slow = Math.max(0, PL.slow - dt);
    let cvx = 0; const ci = gi(Math.floor(PL.x), Math.floor(PL.y)); if (G[ci] === TL.CONV && !PL.gone) cvx = CONV[ci] * 4.2;
    const hit = moveEnt(PL, (ix * sp + cvx) * dt, iy * sp * dt, 'pl');
    if (ix || iy) { PL.a = lerpA(PL.a, Math.atan2(iy, ix), Math.min(1, dt * 14)); PL.tread += dt * 30; stepAcc += dt; if (stepAcc > 0.14) { stepAcc = 0; if (!PL.disguise) FX.push({ k: 'p', x: PL.x - Math.cos(PL.a) * .45 + rnd(-.15, .15), y: PL.y - Math.sin(PL.a) * .45 + rnd(-.15, .15), vx: rnd(-.3, .3), vy: rnd(-.3, .3), c: 'rgba(140,150,170,.45)', t: 0, life: .5 }); } }
    PL.moving = !!(ix || iy);
    if (ix || iy) tryPush(hit, ix, iy, dt); else pushT = 0;
    updateDoors(dt);
    MODE && MODE.update && MODE.update(dt, hit);
    const rm = roomAt(PL.x, PL.y); const rid = rm ? rm.id : null; if (rid !== STATE.curRoom) { STATE.curRoom = rid; if (rm && !(STATE.visited || (STATE.visited = {}))[rid]) { STATE.visited[rid] = 1; roomCard(rm); } }
    // 카메라
    const ct = MODE && MODE.camTarget && MODE.camTarget(); const tx = (ct ? ct[0] : PL.x) * T, ty = (ct ? ct[1] : PL.y) * T; CAM.x += (tx - CAM.x) * Math.min(1, dt * 8); CAM.y += (ty - CAM.y) * Math.min(1, dt * 8);
  }
  VISR = MODE && MODE.visR ? MODE.visR() : 8; VIS = visPoly(PL.x, PL.y, VISR, VW < 700 ? 180 : 260);
  const it = (STATE.over || paused) ? null : nearestInter(); PROMPT = it ? { x: it.x, y: it.y, label: it.label, key: 'E' } : null;
  const ab = $('#actBtn'); ab.classList.toggle('lit', !!it); ab.textContent = it ? (it.btn || '사용') : (MODE && MODE.actLabel ? MODE.actLabel() : '사용');
  render(dt);
  if (!paused || MODAL && MODAL.live) { mctx.setTransform(1, 0, 0, 1, 0, 0); drawMapTo(mctx, mmc.width, mmc.height); }
  MODE && MODE.hud && MODE.hud(dt);
}
function lerpA(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; }
