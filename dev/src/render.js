// ============================================================== RENDER (reads match state, never changes it)
// Visual-only randomness and timing live here (Math.random, performance.now).

const S_ = CONFIG.sprite;
const D2R = Math.PI / 180;
const vrnd = Math.random;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

const THEMES = {
  desert: { sky: ['#F2A65A', '#F9D59B', '#FCEBCB'], far: '#E5B57C', mid: '#D49A5A', sun: '#FFF4D2', abyss: '#5A2E1A', debris: '#D9A866', mini: '#C99A5E' },
  valley: { sky: ['#2A2350', '#7A4A86', '#E8866A'], far: '#4A3A6E', mid: '#2C2448', sun: '#FFD6B0', abyss: '#140E24', debris: '#8A7E9A', mini: '#7E7096' },
  clouds: { sky: ['#3E8FE0', '#86C3F2', '#D8EEFF'], far: '#E6F2FF', mid: '#C9E2FA', sun: '#FFFBE6', abyss: '#1E3A6E', debris: '#E6F0FF', mini: '#FFFFFF' },
  bridge: { sky: ['#5E9CB0', '#A9D2D6', '#E6F1EA'], far: '#8FB2BA', mid: '#5F8890', sun: '#FFFDF0', abyss: '#1C3238', debris: '#9C7A58', mini: '#8A6A4A' },
};

function paintPixel(theme, W, dt, db, x, y) {
  const n = (hash2(x >> 1, y >> 1) - 0.5) * 14;
  let r, g, b;
  if (theme === 'desert') {
    if (dt < 5) { r = 252; g = 230; b = 168; }
    else if (dt < 16) { r = 236; g = 200; b = 124; }
    else {
      const row = Math.floor(y / 22), off = (row & 1) * 24;
      const mortar = (y % 22) < 2 || ((x + off) % 48) < 2;
      const t = Math.min(1, dt / 300) * 0.35;
      if (mortar) { r = 160; g = 116; b = 70; } else { r = 214 - t * 120; g = 166 - t * 100; b = 102 - t * 60; }
    }
    if (db < 9) { r = 120; g = 76; b = 44; }
  } else if (theme === 'valley') {
    if (dt < 4) { r = 168; g = 214; b = 104; }
    else if (dt < 10) { r = 112; g = 162; b = 74; }
    else {
      const t = Math.min(1, dt / 120);
      r = 146 - t * 50; g = 134 - t * 50; b = 170 - t * 50;
      if (Math.sin(y / 7 + x / 160) > 0.9) { r += 22; g += 22; b += 22; }
    }
    if (db < 6) { r = 52; g = 42; b = 74; }
  } else if (theme === 'clouds') {
    const t = Math.min(1, dt / 220);
    r = 255 - t * 60; g = 255 - t * 40; b = 255 - t * 14;
    if (dt < 6) { r = g = b = 255; }
    if (db < 16) { const u = 1 - db / 16; r -= 50 * u; g -= 34 * u; b -= 10 * u; }
    return [r + n * 0.3, g + n * 0.3, b + n * 0.2];
  } else {
    if (x > 540 && x < W - 540) {
      const seam = (x % 44) < 2;
      r = seam ? 120 : 196; g = seam ? 76 : 136; b = seam ? 44 : 84;
      if (dt < 4) { r = 238; g = 190; b = 124; }
      if (db < 5) { r = 104; g = 66; b = 38; }
    } else {
      const t = Math.min(1, dt / 260);
      r = 150 - t * 60; g = 140 - t * 56; b = 126 - t * 50;
      if (dt < 5) { r = 140; g = 190; b = 96; }
      else if (dt < 12) { r = 98; g = 150; b = 70; }
      if (db < 8) { r = 60; g = 52; b = 46; }
    }
  }
  return [r + n, g + n, b + n];
}

// ---------------------------------------------------------------- sprites
const SP = {};
function svgImg(svg) { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return i; }
async function loadSprites() {
  const jobs = [];
  for (const k of Object.keys(CONFIG.tanks)) {
    const b = svgImg(SPR[k].body), w = SPR[k].wpn ? svgImg(SPR[k].wpn) : null;
    SP[k] = { bodyImg: b, wpnImg: w };
    jobs.push(b.decode()); if (w) jobs.push(w.decode());
  }
  await Promise.all(jobs);
  const R = 2.2;
  for (const k of Object.keys(CONFIG.tanks)) {
    const mk = img => { const c = document.createElement('canvas'); c.width = Math.round(S_.w * S_.scale * R); c.height = Math.round(S_.h * S_.scale * R); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; };
    SP[k].body = mk(SP[k].bodyImg); SP[k].wpn = SP[k].wpnImg ? mk(SP[k].wpnImg) : null;
  }
}
function drawTankLocal(ctx, k, aim, kick) {
  const sp = CONFIG.tanks[k].sprite, img = SP[k], w = S_.w * S_.scale, h = S_.h * S_.scale, ox = -S_.anchorX * S_.scale, oy = -S_.anchorY * S_.scale;
  const wpn = () => {
    if (!img.wpn) return;
    const px = (sp.pivot[0] - S_.anchorX) * S_.scale, py = (sp.pivot[1] - S_.anchorY) * S_.scale;
    ctx.save(); ctx.translate(px, py); ctx.rotate(sp.dir * (aim + (kick || 0) - sp.baseAngle) * D2R); ctx.translate(-px, -py);
    ctx.drawImage(img.wpn, ox, oy, w, h); ctx.restore();
  };
  if (sp.behind) wpn();
  ctx.drawImage(img.body, ox, oy, w, h);
  if (!sp.behind) wpn();
}
function tankThumb(k, cw, ch) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d'), sc = cw / (S_.w * S_.scale);
  x.translate(cw / 2, ch * 0.93); x.scale(sc, sc); drawTankLocal(x, k, CONFIG.tanks[k].sprite.baseAngle || 0);
  return c;
}

// ---------------------------------------------------------------- renderer
function createRenderer(cv, mini) {
  const ctx = cv.getContext('2d'), mctx = mini.getContext('2d');
  const R = {
    m: null, terrain: null, tctx: null, bg: null, th: null,
    cam: { x: 0, y: 0, zoom: 1 }, dpr: 1, VW: 800, VH: 600,
    fx: [], texts: [], beams: [], rollers: [], shake: 0,
    follow: null, free: false, view: {}, onBanner: () => {}, onOver: () => {},
    aimHint: null, trails: {}, crateDrop: {}, reduceMotion: false, t: 0,
    onSfx: () => {}, onHitstop: () => {}, onEngine: () => {},
  };

  R.setMatch = function (m) {
    R.m = m; R.th = THEMES[m.theme];
    R.fx = []; R.texts = []; R.beams = []; R.rollers = []; R.view = {}; R.shake = 0; R.crateDrop = {}; R.trails = {};
    buildTerrainTexture(); buildBackground();
    const t0 = m.tanks[0]; R.cam.x = t0.x; R.cam.y = t0.y; R.follow = null; R.free = false;
    m.events.length = 0;
  };
  function buildTerrainTexture() {
    const m = R.m, W = m.W, H = m.H, mask = m.mask;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const out = x.createImageData(W, H), o = out.data;
    const dtop = new Int32Array(H), dbot = new Int32Array(H);
    for (let cx = 0; cx < W; cx++) {
      let d = 0;
      for (let y = 0; y < H; y++) { d = mask[y * W + cx] ? d + 1 : 0; dtop[y] = d; }
      d = 0;
      for (let y = H - 1; y >= 0; y--) { d = mask[y * W + cx] ? d + 1 : 0; dbot[y] = d; }
      for (let y = 0; y < H; y++) {
        const i = y * W + cx; if (!mask[i]) continue;
        const col = paintPixel(m.theme, W, dtop[y] - 1, dbot[y] - 1, cx, y);
        const p = i * 4; o[p] = col[0]; o[p + 1] = col[1]; o[p + 2] = col[2]; o[p + 3] = 255;
      }
    }
    x.putImageData(out, 0, 0);
    decorate(x, m);
    R.terrain = c; R.tctx = x;
  }
  // small props along the surface, themed per map. Seeded so every match on a map looks the same.
  function decorate(x, m) {
    let s = 1234 + m.W; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const surf = px => surfaceAt(m, px, 0);
    for (let px = 60; px < m.W - 60; px += 26 + r() * 70) {
      const y = surf(px); if (y < 0) continue;
      const k = r();
      x.save(); x.translate(px, y);
      if (m.theme === 'desert') {
        if (k < 0.18) { // cactus
          x.fillStyle = '#5E8A3A'; x.strokeStyle = '#2E4A1C'; x.lineWidth = 2;
          x.beginPath(); x.roundRect(-4, -30, 8, 32, 4); x.fill(); x.stroke();
          x.beginPath(); x.roundRect(-13, -20, 6, 12, 3); x.fill(); x.stroke(); x.beginPath(); x.roundRect(7, -24, 6, 12, 3); x.fill(); x.stroke();
        } else if (k < 0.4) { x.fillStyle = '#B88A55'; x.beginPath(); x.ellipse(0, 1, 6 + r() * 6, 4, 0, 0, 7); x.fill(); x.fillStyle = '#E8C48A'; x.beginPath(); x.ellipse(-2, -1, 3, 1.5, 0, 0, 7); x.fill(); }
        else if (k < 0.48) { x.strokeStyle = '#F2E6CC'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-8, 0); x.lineTo(8, -3); x.stroke(); x.beginPath(); x.arc(-9, 0, 2.5, 0, 7); x.arc(9, -3, 2.5, 0, 7); x.fillStyle = '#F2E6CC'; x.fill(); }
      } else if (m.theme === 'valley') {
        if (k < 0.5) { x.strokeStyle = '#7FC24A'; x.lineWidth = 2; x.beginPath(); for (let i = -2; i <= 2; i++) { x.moveTo(i * 3, 0); x.lineTo(i * 3 + (r() - 0.5) * 4, -6 - r() * 6); } x.stroke(); }
        else if (k < 0.58) { x.strokeStyle = '#2C2448'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 2); x.lineTo(0, -34); x.lineTo(8, -34); x.stroke(); x.fillStyle = '#FFD27A'; x.beginPath(); x.arc(9, -31, 3.5, 0, 7); x.fill(); x.fillStyle = 'rgba(255,210,122,0.25)'; x.beginPath(); x.arc(9, -31, 10, 0, 7); x.fill(); }
      } else if (m.theme === 'clouds') {
        if (k < 0.3) { x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(0, -2, 8 + r() * 8, Math.PI, 0); x.fill(); }
        else if (k < 0.38) { x.fillStyle = '#FFE680'; x.beginPath(); x.moveTo(0, -12); x.lineTo(3, -4); x.lineTo(0, 0); x.lineTo(-3, -4); x.fill(); }
      } else {
        const onBridge = px > 540 && px < m.W - 540;
        if (onBridge) { if (Math.round(px) % 3 === 0) { x.fillStyle = '#6E4424'; x.fillRect(-2, -18, 4, 20); x.strokeStyle = '#C9A06A'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-40, -14); x.quadraticCurveTo(-20, -9, 0, -16); x.stroke(); } }
        else if (k < 0.5) { x.strokeStyle = '#6FAE48'; x.lineWidth = 2; x.beginPath(); for (let i = -2; i <= 2; i++) { x.moveTo(i * 3, 0); x.lineTo(i * 3, -5 - r() * 7); } x.stroke(); }
        else if (k < 0.62) { x.fillStyle = '#3E6A3A'; x.beginPath(); x.moveTo(0, -36); x.lineTo(11, -8); x.lineTo(-11, -8); x.fill(); x.fillStyle = '#5A3A22'; x.fillRect(-2, -8, 4, 9); }
      }
      x.restore();
    }
  }
  function carveTexture(cx, cy, r) {
    const t = R.tctx;
    t.save();
    t.globalCompositeOperation = 'source-atop';
    const g = t.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.35);
    g.addColorStop(0, 'rgba(40,20,12,0.7)'); g.addColorStop(1, 'rgba(40,20,12,0)');
    t.fillStyle = g; t.beginPath(); t.arc(cx, cy, r * 1.35, 0, 7); t.fill();
    t.globalCompositeOperation = 'destination-out';
    t.beginPath(); t.arc(cx, cy, r + 0.5, 0, 7); t.fill();
    t.restore();
  }
  function buildBackground() {
    const theme = R.m.theme, th = R.th;
    const mk = (h, fn) => { const c = document.createElement('canvas'); c.width = 2400; c.height = h; fn(c.getContext('2d')); return c; };
    let s = 99; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const far = mk(520, x => {
      x.fillStyle = th.far;
      if (theme === 'desert') {
        x.beginPath(); x.moveTo(0, 520);
        for (let i = 0; i <= 2400; i += 40) x.lineTo(i, 420 - 50 * Math.sin(i / 300) - 30 * Math.sin(i / 97));
        x.lineTo(2400, 520); x.fill();
        for (const [px, sc] of [[420, 1], [640, 0.6], [1500, 0.85], [2050, 0.5]]) { x.beginPath(); x.moveTo(px - 200 * sc, 430); x.lineTo(px, 430 - 230 * sc); x.lineTo(px + 200 * sc, 430); x.fill(); }
      } else if (theme === 'valley') {
        for (let i = 0; i < 2400; i += 34 + r() * 30) { const h = 120 + r() * 260, w = 40 + r() * 60; x.fillRect(i, 520 - h, w, h); }
        x.fillStyle = '#FFD27A';
        for (let i = 0; i < 260; i++) { x.globalAlpha = 0.35 + r() * 0.5; x.fillRect(r() * 2400, 520 - r() * 300, 3, 4); }
        x.globalAlpha = 1;
      } else if (theme === 'clouds') {
        x.globalAlpha = 0.8;
        for (let i = 0; i < 26; i++) { const cx = r() * 2400, cy = 260 + r() * 220, rr = 60 + r() * 90; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.arc(cx + rr, cy + 20, rr * 0.8, 0, 7); x.arc(cx - rr, cy + 25, rr * 0.7, 0, 7); x.fill(); }
        x.globalAlpha = 1;
      } else {
        x.beginPath(); x.moveTo(0, 520);
        for (let i = 0; i <= 2400; i += 60) x.lineTo(i, 300 - 140 * Math.abs(Math.sin(i / 260)) - 40 * Math.sin(i / 77));
        x.lineTo(2400, 520); x.fill();
      }
    });
    const mid = mk(420, x => {
      x.fillStyle = th.mid;
      if (theme === 'clouds') {
        x.globalAlpha = 0.9;
        for (let i = 0; i < 18; i++) { const cx = r() * 2400, cy = 300 + r() * 120, rr = 40 + r() * 60; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.arc(cx + rr * 0.9, cy + 10, rr * 0.7, 0, 7); x.fill(); }
        x.globalAlpha = 1; return;
      }
      x.beginPath(); x.moveTo(0, 420);
      for (let i = 0; i <= 2400; i += 30) x.lineTo(i, 300 - 60 * Math.sin(i / 180 + 1) - 25 * Math.sin(i / 61));
      x.lineTo(2400, 420); x.fill();
    });
    const near = mk(300, x => {
      x.fillStyle = th.mid; x.globalAlpha = 0.55;
      if (theme === 'desert') { for (let i = 0; i < 2400; i += 160 + r() * 220) { const h = 40 + r() * 40; x.fillRect(i, 300 - h, 6, h); x.beginPath(); for (let k = 0; k < 5; k++) { x.ellipse(i + 3, 300 - h, 26, 6, -0.6 + k * 0.3, 0, 7); } x.fill(); } }
      else if (theme === 'valley') { for (let i = 0; i < 2400; i += 60 + r() * 50) { const h = 60 + r() * 150; x.fillRect(i, 300 - h, 44, h); x.fillStyle = '#FFD27A'; for (let wy = 300 - h + 10; wy < 290; wy += 14) for (let wx = i + 6; wx < i + 40; wx += 12) if (r() < 0.35) x.fillRect(wx, wy, 5, 6); x.fillStyle = th.mid; } }
      else if (theme === 'clouds') { x.fillStyle = '#FFFFFF'; x.globalAlpha = 0.5; for (let i = 0; i < 2400; i += 140 + r() * 120) { const rr = 30 + r() * 40; x.beginPath(); x.arc(i, 280, rr, 0, 7); x.arc(i + rr, 290, rr * 0.7, 0, 7); x.fill(); } }
      else { for (let i = 0; i < 2400; i += 40 + r() * 60) { const h = 60 + r() * 80; x.beginPath(); x.moveTo(i, 300); x.lineTo(i + 18, 300 - h); x.lineTo(i + 36, 300); x.fill(); } }
      x.globalAlpha = 1;
    });
    R.bg = { far, mid, near, clouds: Array.from({ length: 7 }, () => ({ x: r() * 3000, y: 60 + r() * 260, s: 0.5 + r() * 0.8, v: 6 + r() * 10 })) };
  }

  // ---------------- events -> effects
  function burst(x, y, col, n, smokeN) {
    for (let i = 0; i < n; i++) { const a = vrnd() * Math.PI * 2, v = 80 + vrnd() * 260; R.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0, life: 0.4 + vrnd() * 0.4, col }); }
    for (let i = 0; i < (smokeN == null ? 5 : smokeN); i++) R.fx.push({ kind: 'smoke', x: x + (vrnd() - 0.5) * 30, y: y + (vrnd() - 0.5) * 20, vy: -30 - vrnd() * 30, t: 0, life: 0.9 + vrnd() * 0.6, r: 14 + vrnd() * 14 });
  }
  function debris(x, y, n) {
    for (let i = 0; i < n; i++) { const a = -Math.PI * vrnd(), v = 120 + vrnd() * 300; R.fx.push({ kind: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1.2 + vrnd() * 0.4, col: R.th.debris, s: 3 + vrnd() * 5, rot: vrnd() * 6 }); }
  }
  function shake(a) { if (!R.reduceMotion) R.shake = Math.min(18, R.shake + a); }
  // tier 1 small (< 32px), 2 medium (< 50px), 3 large
  function explosionFx(x, y, r, col) {
    const tier = r < 32 ? 1 : r < 50 ? 2 : 3;
    R.fx.push({ kind: 'flash', x, y, r: r * (1.4 + tier * 0.25), t: 0, life: 0.25 + tier * 0.08, col });
    R.fx.push({ kind: 'ring', x, y, r, t: 0, life: 0.35 + tier * 0.1, w: 2 + tier * 2 });
    if (tier >= 2) R.fx.push({ kind: 'ring', x, y, r: r * 1.6, t: 0, life: 0.55, w: 2 });
    burst(x, y, col, [14, 24, 40][tier - 1], [4, 8, 14][tier - 1]);
    debris(x, y, [8, 14, 24][tier - 1]);
    for (let i = 0; i < tier * 4; i++) R.fx.push({ kind: 'ember', x: x + (vrnd() - 0.5) * r, y: y + (vrnd() - 0.5) * r * 0.6, vx: (vrnd() - 0.5) * 40, vy: -40 - vrnd() * 60, t: 0, life: 1 + vrnd(), col: '#FFB040' });
    shake([4, 8, 14][tier - 1]);
    if (tier === 3) R.onHitstop(70);
    R.onSfx('boom', { tier });
    return tier;
  }
  function text(x, y, s, col, big) { R.texts.push({ x, y, s, col, t: 0, big }); }
  const viewOf = idx => R.view[idx] || (R.view[idx] = { y: R.m.tanks[idx].y, ang: 0, recoil: 0, flash: 0, px: R.m.tanks[idx].x, move: 0, bob: vrnd() * 6, dust: 0, fxT: 0 });
  R.consumeEvents = function () {
    const m = R.m, ev = m.events;
    for (const e of ev) {
      const t = e.idx != null ? m.tanks[e.idx] : null;
      switch (e.type) {
        case 'carve': carveTexture(e.x, e.y, e.r); break;
        case 'boom': explosionFx(e.x, e.y, e.r, e.color); break;
        case 'dmg':
          text(e.x, e.y - 60, '-' + e.amount, e.kind === 'poison' ? '#8EDB3A' : e.kind === 'fall' ? '#FFB4A4' : e.kind === 'friendly' ? '#FFD0A0' : '#FFFFFF', e.amount >= 200);
          viewOf(e.idx).flash = 1; if (e.kind !== 'poison') R.onSfx('hit'); break;
        case 'death': {
          const v = viewOf(e.idx);
          explosionFx(e.x, v.y - 20, 64, '#FF9A40');
          for (let i = 0; i < 18; i++) R.fx.push({ kind: 'smoke', x: e.x + (vrnd() - 0.5) * 40, y: v.y - 10 - vrnd() * 20, vy: -40 - vrnd() * 50, t: -vrnd() * 1.2, life: 2.4, r: 18 + vrnd() * 20, dark: true });
          text(e.x, v.y - 120, '격파!', '#FFD24A', true);
          R.onBanner(`${t.nick} 격파!`, t.team); R.onSfx('death'); break;
        }
        case 'fallout': burst(e.x, m.H - 30, '#FFFFFF', 18); R.onBanner(`${t.nick} 낙사!`, t.team); R.onSfx('fall'); break;
        case 'text': text(e.x, e.y, e.text, e.color); break;
        case 'pickup': text(e.x, e.y - 70, CONFIG.items[e.item].name + ' 획득', CONFIG.items[e.item].color); R.onSfx('pickup'); break;
        case 'heal': text(e.x, e.y - 70, '+' + e.amount, '#6EF0C8'); for (let i = 0; i < 10; i++) R.fx.push({ kind: 'plus', x: e.x + (vrnd() - 0.5) * 60, y: e.y - 20 - vrnd() * 30, vy: -50 - vrnd() * 30, t: 0, life: 1 }); R.onSfx('heal'); break;
        case 'item': if (t && e.item === 'tele') text(t.x, t.y - 70, '순간이동탄 장전', '#9CC6F7'); if (t && e.item !== 'heal' && e.item !== 'tele') { text(t.x, t.y - 70, CONFIG.items[e.item].name, CONFIG.items[e.item].color); R.onSfx('item'); } break;
        case 'tele': burst(e.x, e.y - 20, '#9CC6F7', 14); burst(e.x2, e.y2 - 20, '#9CC6F7', 14); viewOf(e.idx).y = e.y2; R.follow = t; R.free = false; R.onSfx('tele'); break;
        case 'shot': {
          const w = CONFIG.tanks[t.tankId].weapons[e.wIdx], v = viewOf(e.idx);
          R.fx.push({ kind: 'flash', x: e.x, y: e.y, r: 26, t: 0, life: 0.16, col: w.look.glow || '#FFE6A8' });
          for (let i = 0; i < 4; i++) R.fx.push({ kind: 'smoke', x: e.x, y: e.y, vy: -20 - vrnd() * 20, vx: t.facing * (20 + vrnd() * 40), t: 0, life: 0.6 + vrnd() * 0.3, r: 8 + vrnd() * 8 });
          v.recoil = 1; shake(1.5);
          R.onSfx('fire', { shape: w.look.shape, catapult: !!CONFIG.tanks[t.tankId].sprite.catapult }); break;
        }
        case 'beam': R.beams.push({ x: e.x, t: 0, life: e.ticks / CONFIG.physics.tickRate + 0.1 }); R.onSfx('beam'); break;
        case 'roll': R.fx.push({ kind: 'roller', x0: e.x0, y0: e.y0, x1: e.x1, y1: e.y1, t: 0, life: e.ticks / CONFIG.physics.tickRate }); break;
        case 'out': text(clamp(e.x, 40, m.W - 40), clamp(e.y, 60, m.H - 60), e.tele ? '순간이동 실패' : '장외', e.tele ? '#9CC6F7' : '#FFFFFF'); break;
        case 'crate': R.crateDrop[e.id] = { t: 0 }; R.onSfx('crate'); break;
        case 'turn': R.follow = t; R.free = false; R.onBanner(R.isMine && R.isMine(t) ? '내 차례!' : `${t.nick} 차례`, t.team, true); R.onSfx('turn', { team: t.team }); break;
        case 'timeout': R.onBanner('시간 초과'); break;
        case 'over': R.onOver(e.winner); break;
      }
    }
    ev.length = 0;
  };

  // ---------------- camera
  R.viewSize = () => ({ w: R.VW / R.cam.zoom, h: R.VH / R.cam.zoom });
  R.clampCam = function () {
    const m = R.m, v = R.viewSize(), cam = R.cam;
    cam.x = m.W > v.w ? clamp(cam.x, v.w / 2, m.W - v.w / 2) : m.W / 2;
    cam.y = clamp(cam.y, v.h / 2 - 300, Math.max(v.h / 2 - 300, m.H - v.h / 2 + 60));
  };
  R.camTo = o => { R.follow = o; R.free = false; };
  function updateCam(dt) {
    const m = R.m, cam = R.cam;
    let target = null, fast = false;
    if (m.proj.length) { const p = m.proj[0]; target = { x: p.x + clamp(p.vx * 0.22, -260, 260), y: p.y + clamp(p.vy * 0.15, -160, 160) }; fast = true; }
    else if (!R.free && R.follow) target = R.view[R.follow.idx] ? { x: R.follow.x, y: R.view[R.follow.idx].y } : R.follow;
    if (target && (!R.free || fast)) {
      if (fast) R.free = false;
      const k = Math.min(1, dt * (fast ? 5 : 3.2));
      cam.x = lerp(cam.x, target.x, k); cam.y = lerp(cam.y, target.y - (fast ? 0 : 20), k);
    }
    R.clampCam();
  }

  // ---------------- draw
  R.resize = function () {
    R.dpr = Math.min(2, window.devicePixelRatio || 1);
    R.VW = cv.clientWidth; R.VH = cv.clientHeight;
    cv.width = Math.round(R.VW * R.dpr); cv.height = Math.round(R.VH * R.dpr);
    R.cam.zoom = clamp(R.VH / 820, 0.55, 1.5);
    if (R.m) { const mw = Math.round(Math.min(240, Math.max(140, R.VW * 0.18))); mini.width = mw; mini.height = Math.round(mw * R.m.H / R.m.W); }
  };
  R.frame = function (dt, ui) {
    const m = R.m; if (!m) return;
    R.consumeEvents();
    // smoothed display state per tank
    R.t += dt;
    let anyMove = false;
    for (const t of m.tanks) {
      const v = viewOf(t.idx);
      const ang = Math.atan2(t.ts, t.tc);
      v.y = Math.abs(v.y - t.y) > 400 ? t.y : lerp(v.y, t.y, Math.min(1, dt * 14));
      v.ang = lerp(v.ang, ang, Math.min(1, dt * 10));
      const dx = t.x - v.px; v.px = t.x;
      v.move = Math.abs(dx) > 0.01 ? Math.min(1, v.move + dt * 8) : Math.max(0, v.move - dt * 6);
      if (Math.abs(dx) > 0.01 && t.idx === m.cur) anyMove = true;
      v.recoil = Math.max(0, v.recoil - dt * 4);
      v.flash = Math.max(0, v.flash - dt * 5);
      if (!t.alive) continue;
      v.fxT -= dt;
      if (v.move > 0.3 && v.fxT <= 0 && !CONFIG.tanks[t.tankId].traits.hover) {
        v.fxT = 0.07;
        R.fx.push({ kind: 'dust', x: t.x - t.facing * 34, y: v.y - 4, vx: -t.facing * (20 + vrnd() * 30), vy: -10 - vrnd() * 20, t: 0, life: 0.6, r: 5 + vrnd() * 5, col: R.th.debris });
      }
      if (t.poison && v.fxT <= 0) { v.fxT = 0.25; R.fx.push({ kind: 'bubble', x: t.x + (vrnd() - 0.5) * 40, y: v.y - 30, vy: -30 - vrnd() * 20, t: 0, life: 1.1, r: 3 + vrnd() * 3 }); }
      const d = CONFIG.tanks[t.tankId];
      if (d.traits.berserk && t.hp < t.maxhp * d.traits.berserk.hpBelow && vrnd() < dt * 8) R.fx.push({ kind: 'ember', x: t.x + (vrnd() - 0.5) * 60, y: v.y - 20 - vrnd() * 20, vx: (vrnd() - 0.5) * 30, vy: -50 - vrnd() * 40, t: 0, life: 0.9, col: '#FF3D7A' });
    }
    R.onEngine(anyMove && m.phase === 'aim');
    for (const id in R.crateDrop) R.crateDrop[id].t += dt;
    for (const f of R.fx) {
      f.t += dt; if (f.t < 0) continue;
      if (f.kind === 'smoke' || f.kind === 'bubble' || f.kind === 'plus' || f.kind === 'ember' || f.kind === 'dust') { f.y += f.vy * dt; if (f.vx) f.x += f.vx * dt; f.vy *= 0.98; }
      else if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.kind === 'chunk' ? 600 : 300) * dt; }
    }
    R.fx = R.fx.filter(f => f.t < f.life);
    for (const s of R.texts) s.t += dt; R.texts = R.texts.filter(s => s.t < 1.4);
    for (const b of R.beams) b.t += dt; R.beams = R.beams.filter(b => b.t < b.life);
    for (const c of R.bg.clouds) c.x += c.v * dt;
    R.shake *= Math.pow(0.02, dt);
    updateCam(dt);
    draw(ui);
  };
  function draw(ui) {
    const m = R.m, th = R.th, cam = R.cam, dpr = R.dpr, W = cv.width, H = cv.height, z = cam.zoom * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sg = ctx.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, th.sky[0]); sg.addColorStop(0.6, th.sky[1]); sg.addColorStop(1, th.sky[2]);
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    const v = R.viewSize(), left = cam.x - v.w / 2, top = cam.y - v.h / 2;
    const sx = W * 0.78 - (cam.x / m.W) * W * 0.12, sy = H * 0.2;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, 160 * dpr); sun.addColorStop(0, th.sun); sun.addColorStop(0.25, th.sun + 'CC'); sun.addColorStop(1, th.sun + '00');
    ctx.fillStyle = sun; ctx.fillRect(sx - 170 * dpr, sy - 170 * dpr, 340 * dpr, 340 * dpr);
    const layer = (img, f, yoff) => {
      const s = dpr * Math.max(1, cam.zoom), w = img.width * s, h = img.height * s;
      let x = -((left * f * cam.zoom * dpr) % w); if (x > 0) x -= w;
      const y = H - h + yoff * dpr + (m.H * 0.55 - cam.y) * 0.08 * cam.zoom * dpr;
      for (; x < W; x += w) ctx.drawImage(img, x, y, w, h);
    };
    layer(R.bg.far, 0.12, -60); layer(R.bg.mid, 0.3, 0); layer(R.bg.near, 0.5, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const c of R.bg.clouds) {
      const span = W / dpr + 400, x = ((c.x - left * 0.2) % span + span) % span - 200;
      ctx.save(); ctx.scale(dpr, dpr); ctx.beginPath(); ctx.ellipse(x, c.y, 90 * c.s, 22 * c.s, 0, 0, 7); ctx.arc(x - 30 * c.s, c.y - 10 * c.s, 30 * c.s, 0, 7); ctx.arc(x + 14 * c.s, c.y - 18 * c.s, 38 * c.s, 0, 7); ctx.fill(); ctx.restore();
    }
    const shx = (vrnd() - 0.5) * R.shake, shy = (vrnd() - 0.5) * R.shake;
    ctx.setTransform(z, 0, 0, z, (-left + shx) * z, (-top + shy) * z);
    const ag = ctx.createLinearGradient(0, m.H - 260, 0, m.H + 80); ag.addColorStop(0, th.abyss + '00'); ag.addColorStop(1, th.abyss + 'DD');
    ctx.fillStyle = ag; ctx.fillRect(left - 10, m.H - 260, v.w + 20, 360);
    const rx = clamp(Math.floor(left), 0, m.W), ry = clamp(Math.floor(top), 0, m.H);
    const rw = clamp(Math.ceil(left + v.w), 0, m.W) - rx, rh = clamp(Math.ceil(top + v.h), 0, m.H) - ry;
    if (rw > 0 && rh > 0) ctx.drawImage(R.terrain, rx, ry, rw, rh, rx, ry, rw, rh);
    for (const b of R.beams) {
      const a = Math.sin(Math.PI * b.t / b.life), sy2 = Math.max(0, surfaceAt(m, b.x, 0));
      const g = ctx.createLinearGradient(b.x - 30, 0, b.x + 30, 0); g.addColorStop(0, 'rgba(255,61,122,0)'); g.addColorStop(0.5, `rgba(255,190,215,${a})`); g.addColorStop(1, 'rgba(255,61,122,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - 30, top - 50, 60, sy2 - top + 50);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(b.x - 4, top - 50, 8, sy2 - top + 50);
    }
    for (const mi of m.mines) {
      ctx.fillStyle = '#2B2E36'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(mi.x, mi.y - 4, 9, 5, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = (performance.now() / 300 | 0) % 2 ? '#FF4A3A' : '#7A1A12'; ctx.beginPath(); ctx.arc(mi.x, mi.y - 9, 2.4, 0, 7); ctx.fill();
    }
    for (const c of m.crates) drawCrate(c);
    const t = m.cur >= 0 ? m.tanks[m.cur] : null;
    if (t && t.alive && m.phase === 'aim' && ui) drawAimGuide(t, ui);
    for (const tk of m.tanks) if (tk.alive) drawTank(tk);
    for (const p of m.proj) drawProj(p);
    if (!m.proj.length) R.trails = {};
    for (const f of R.fx) drawFx(f);
    ctx.textAlign = 'center'; ctx.font = '900 18px "Noto Sans KR", sans-serif';
    for (const s of R.texts) { const a = 1 - s.t / 1.4; ctx.globalAlpha = a; ctx.font = s.big ? '900 26px "Noto Sans KR", sans-serif' : '900 18px "Noto Sans KR", sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(s.s, s.x, s.y - s.t * 40); ctx.fillStyle = s.col; ctx.fillText(s.s, s.x, s.y - s.t * 40); }
    ctx.globalAlpha = 1;
    for (const tk of m.tanks) if (tk.alive) drawLabel(tk);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEdges(left, top);
    drawMini(left, top, v);
  }
  const flashCv = document.createElement('canvas'); flashCv.width = 256; flashCv.height = 200;
  const fctx = flashCv.getContext('2d');
  function tankPose(t, v, d) {
    let oy = 0;
    if (d.traits.hover) oy = -4 + Math.sin(R.t * 3.3 + v.bob) * 2;
    else oy = -Math.abs(Math.sin(R.t * 2 + v.bob)) * 0.8 * (1 - v.move) + (v.move ? Math.sin(R.t * 40) * 0.9 * v.move : 0);
    const kickBack = v.recoil * v.recoil * 7;
    const kick = d.sprite.catapult ? -70 * Math.sin(Math.PI * Math.min(1, (1 - v.recoil) * 1.4)) * (v.recoil > 0 ? 1 : 0) : v.recoil * 7;
    return { oy, kickBack, kick };
  }
  function drawTank(t) {
    const v = R.view[t.idx], d = CONFIG.tanks[t.tankId], pose = tankPose(t, v, d);
    ctx.save();
    ctx.translate(t.x, v.y); ctx.rotate(v.ang);
    ctx.translate(0, pose.oy);
    ctx.scale(t.facing, 1);
    ctx.translate(-pose.kickBack, 0);
    drawTankLocal(ctx, t.tankId, t.aim, pose.kick);
    if (v.flash > 0.02) {
      // white silhouette for the hit flash
      fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, 256, 200);
      fctx.translate(128, 170); fctx.globalCompositeOperation = 'source-over';
      drawTankLocal(fctx, t.tankId, t.aim, pose.kick);
      fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalCompositeOperation = 'source-atop';
      fctx.fillStyle = '#FFFFFF'; fctx.fillRect(0, 0, 256, 200); fctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = v.flash * 0.85; ctx.drawImage(flashCv, -128, -170); ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (t.shield) {
      const pulse = 0.5 + 0.5 * Math.sin(R.t * 4);
      const g = ctx.createRadialGradient(t.x, v.y - 28, 20, t.x, v.y - 28, 64);
      g.addColorStop(0, 'rgba(200,180,255,0)'); g.addColorStop(0.8, `rgba(200,180,255,${0.12 + pulse * 0.08})`); g.addColorStop(1, 'rgba(220,200,255,0.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(t.x, v.y - 28, 62, 46, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(230,215,255,${0.5 + pulse * 0.4})`; ctx.lineWidth = 2; ctx.stroke();
    }
    if (d.traits.berserk && t.hp < t.maxhp * d.traits.berserk.hpBelow) { const a = 0.22 + 0.18 * Math.sin(R.t * 8); const g = ctx.createRadialGradient(t.x, v.y - 22, 10, t.x, v.y - 22, 70); g.addColorStop(0, `rgba(255,61,122,${a})`); g.addColorStop(1, 'rgba(255,61,122,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(t.x, v.y - 22, 70, 46, 0, 0, 7); ctx.fill(); }
  }
  function drawLabel(t) {
    const m = R.m, v = R.view[t.idx], cur = m.cur === t.idx, x = t.x, w = 86;
    v.lab = lerp(v.lab || 106, cur && m.phase === 'aim' ? 182 : 106, 0.15);
    const y = v.y - v.lab;
    ctx.textAlign = 'center';
    if (cur) { ctx.fillStyle = '#FFD24A'; ctx.beginPath(); ctx.moveTo(x - 8, y - 32); ctx.lineTo(x + 8, y - 32); ctx.lineTo(x, y - 22); ctx.fill(); }
    ctx.font = '800 14px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'; ctx.lineJoin = 'round';
    const mine = R.isMine && R.isMine(t), label = mine ? t.nick + ' (나)' : t.nick;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(label, x, y - 6);
    ctx.fillStyle = mine ? '#FFE79A' : t.team === 'red' ? '#FFC2B6' : '#C2DEFF'; ctx.fillText(label, x, y - 6);
    ctx.fillStyle = '#10141F'; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 10);
    ctx.fillStyle = t.team === 'red' ? '#F0583E' : '#3E94F0'; ctx.fillRect(x - w / 2, y, w * (t.hp / t.maxhp), 6);
    if (t.poison) { ctx.fillStyle = '#8EDB3A'; ctx.beginPath(); ctx.arc(x + w / 2 + 9, y + 3, 4, 0, 7); ctx.fill(); }
  }
  // Angle navigator: protractor around the tank, allowed band, live needle, last-shot ghost, limit flash
  function drawAimGuide(t, ui) {
    const d = CONFIG.tanks[t.tankId], v = R.view[t.idx], R0 = 64, R1 = 92;
    const limitHit = ui.limit && ui.keys && (ui.keys.up || ui.keys.down);
    const blink = limitHit && Math.floor(R.t * 10) % 2 === 0;
    ctx.save(); ctx.translate(t.x, v.y - 26); ctx.rotate(v.ang); ctx.scale(t.facing, 1);
    // quarter dial 0..90
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(10,14,26,0.35)'; ctx.lineWidth = R1 - R0; ctx.beginPath(); ctx.arc(0, 0, (R0 + R1) / 2, -Math.PI / 2, 0); ctx.stroke();
    // allowed band
    ctx.strokeStyle = 'rgba(255,210,74,0.32)'; ctx.beginPath(); ctx.arc(0, 0, (R0 + R1) / 2, -d.angleMax * D2R, -d.angleMin * D2R); ctx.stroke();
    // ticks every 10 deg, longer every 30
    for (let a = 0; a <= 90; a += 10) {
      const inR = a >= d.angleMin && a <= d.angleMax, c = Math.cos(a * D2R), s2 = -Math.sin(a * D2R), l = a % 30 === 0 ? 12 : 6;
      ctx.strokeStyle = inR ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = a % 30 === 0 ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(c * R1, s2 * R1); ctx.lineTo(c * (R1 - l), s2 * (R1 - l)); ctx.stroke();
    }
    // range ends
    for (const [a, side] of [[d.angleMin, 'min'], [d.angleMax, 'max']]) {
      const hot = blink && ui.limit === side, c = Math.cos(a * D2R), s2 = -Math.sin(a * D2R);
      ctx.strokeStyle = hot ? '#FF5A4A' : 'rgba(255,210,74,0.95)'; ctx.lineWidth = hot ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(c * (R0 - 4), s2 * (R0 - 4)); ctx.lineTo(c * (R1 + 4), s2 * (R1 + 4)); ctx.stroke();
    }
    // last shot ghost
    if (t.lastAim >= 0) {
      const c = Math.cos(t.lastAim * D2R), s2 = -Math.sin(t.lastAim * D2R);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(c * 30, s2 * 30); ctx.lineTo(c * (R1 + 2), s2 * (R1 + 2)); ctx.stroke(); ctx.setLineDash([]);
    }
    // needle
    const c = Math.cos(t.aim * D2R), s2 = -Math.sin(t.aim * D2R);
    ctx.strokeStyle = blink ? '#FF5A4A' : '#FFD24A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c * 22, s2 * 22); ctx.lineTo(c * (R1 + 14), s2 * (R1 + 14)); ctx.stroke();
    ctx.fillStyle = blink ? '#FF5A4A' : '#FFD24A';
    ctx.beginPath(); ctx.moveTo(c * (R1 + 24), s2 * (R1 + 24)); ctx.lineTo(c * (R1 + 10) - s2 * 7, s2 * (R1 + 10) + c * 7); ctx.lineTo(c * (R1 + 10) + s2 * 7, s2 * (R1 + 10) - c * 7); ctx.fill();
    const tip = ctx.getTransform().transformPoint(new DOMPoint(c * (R1 + 40), s2 * (R1 + 40)));
    ctx.restore();
    // angle label at the needle tip (unmirrored)
    const inv = ctx.getTransform().inverse().transformPoint(tip);
    ctx.font = '900 16px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t.aim + '°', inv.x, inv.y + 5);
    ctx.fillStyle = blink ? '#FF8A7A' : '#FFE9A0'; ctx.fillText(t.aim + '°', inv.x, inv.y + 5);
    // power ring while charging
    if (ui.charging) {
      const p = ui.powerF / 1000;
      ctx.strokeStyle = 'rgba(10,14,26,0.5)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(t.x, v.y - 26, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = p < 0.7 ? '#3EC86A' : p < 0.9 ? '#FFD24A' : '#F0583E'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(t.x, v.y - 26, 40, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      if (t.lastPower >= 0) { const a = -Math.PI / 2 + t.lastPower / 1000 * Math.PI * 2; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x + Math.cos(a) * 34, v.y - 26 + Math.sin(a) * 34); ctx.lineTo(t.x + Math.cos(a) * 47, v.y - 26 + Math.sin(a) * 47); ctx.stroke(); }
    }
  }
  function drawCrate(c) {
    const dr = R.crateDrop[c.id], fall = dr ? Math.min(1, dr.t / 2.2) : 1;
    const e = 1 - Math.pow(1 - fall, 2), y = c.y - (1 - e) * 900, sway = (1 - fall) * Math.sin(R.t * 2.5) * 10;
    ctx.save(); ctx.translate(c.x + sway, y);
    if (fall < 1) {
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#5A2A3A'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-34, -64); ctx.quadraticCurveTo(0, -104, 34, -64); ctx.quadraticCurveTo(0, -74, -34, -64); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#F06A9A'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-12, -90); ctx.quadraticCurveTo(0, -98, 12, -90); ctx.stroke();
      ctx.strokeStyle = '#5A2A3A'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-32, -64); ctx.lineTo(-12, -30); ctx.moveTo(32, -64); ctx.lineTo(12, -30); ctx.moveTo(0, -70); ctx.lineTo(0, -30); ctx.stroke();
    }
    ctx.fillStyle = '#E8A040'; ctx.strokeStyle = '#4A2410'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-16, -30, 32, 30, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E8402E'; ctx.fillRect(-4, -30, 8, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-12, -26, 7, 3);
    if (fall >= 1) { const g = 0.5 + 0.5 * Math.sin(R.t * 4); ctx.strokeStyle = `rgba(255,230,140,${0.3 + g * 0.4})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-20, -34, 40, 38, 6); ctx.stroke(); }
    ctx.restore();
  }
  const TELE_LOOK = { shape: 'ball', color: '#9CC6F7', size: 1.1, glow: '#BFE0FF' };
  function drawProj(p) {
    const w = CONFIG.tanks[R.m.tanks[p.idx].tankId].weapons[p.wIdx], look = p.tele ? TELE_LOOK : w.look;
    const tr = R.trails[p.id] || (R.trails[p.id] = []);
    if (look.shape === 'missile' && vrnd() < 0.6) R.fx.push({ kind: 'smoke', x: p.x, y: p.y, vy: -10, t: 0, life: 0.6, r: 4 + vrnd() * 4 });
    tr.push(p.x, p.y); if (tr.length > (look.shape === 'beam' ? 40 : 24)) tr.splice(0, 2);
    if (tr.length > 4) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = look.shape === 'beam' ? look.color : 'rgba(255,255,255,0.55)'; ctx.lineWidth = look.shape === 'beam' ? 5 : 3;
      ctx.globalAlpha = look.shape === 'beam' ? 0.9 : 0.6;
      ctx.beginPath(); ctx.moveTo(tr[0], tr[1]); for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]); ctx.stroke();
      if (look.shape === 'beam') { ctx.globalAlpha = 0.25; ctx.lineWidth = 14; ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    const a = Math.atan2(p.vy, p.vx), s = look.size || 1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    if (look.glow) { ctx.fillStyle = look.glow + '55'; ctx.beginPath(); ctx.arc(0, 0, 14 * s, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2;
    if (look.shape === 'beam') { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); }
    else if (look.shape === 'arrow') { ctx.fillStyle = '#E6D7B0'; ctx.fillRect(-16, -1.5, 22, 3); ctx.fillStyle = look.color; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(14, 0); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (look.shape === 'missile') { ctx.fillStyle = '#D8E2F0'; ctx.beginPath(); ctx.roundRect(-10, -3.5, 16, 7, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = look.color; ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(12, 0); ctx.lineTo(6, 3.5); ctx.fill(); ctx.fillStyle = '#FFB040'; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-18 - vrnd() * 6, 0); ctx.lineTo(-10, 2); ctx.fill(); }
    else { ctx.fillStyle = look.color; ctx.beginPath(); ctx.arc(0, 0, 7 * s, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-2 * s, -2 * s, 2.4 * s, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawFx(f) {
    const k = f.t / f.life;
    if (f.kind === 'flash') { const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); g.addColorStop(0, `rgba(255,250,220,${1 - k})`); g.addColorStop(0.4, f.col + Math.round((1 - k) * 200).toString(16).padStart(2, '0')); g.addColorStop(1, f.col + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
    else if (f.kind === 'ring') { ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - k)})`; ctx.lineWidth = f.w || 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.8), 0, 7); ctx.stroke(); }
    else if (f.kind === 'spark') { ctx.fillStyle = f.col; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(f.x, f.y, 3.5 * (1 - k) + 1, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (f.kind === 'smoke') { if (f.t < 0) return; ctx.fillStyle = f.dark ? `rgba(40,34,36,${0.5 * (1 - k)})` : `rgba(70,64,68,${0.32 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + k * 1.2), 0, 7); ctx.fill(); }
    else if (f.kind === 'chunk') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate((f.rot || 0) + f.t * 8); ctx.fillStyle = f.col; ctx.globalAlpha = 1 - k * 0.6; ctx.fillRect(-f.s / 2, -f.s / 2, f.s, f.s); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(-f.s / 2, -f.s / 2, f.s, f.s); ctx.restore(); }
    else if (f.kind === 'ember') { ctx.fillStyle = f.col; ctx.globalAlpha = 1 - k; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); ctx.globalAlpha = 1; }
    else if (f.kind === 'dust') { ctx.fillStyle = f.col; ctx.globalAlpha = 0.45 * (1 - k); ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + k), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (f.kind === 'bubble') { ctx.strokeStyle = `rgba(150,240,90,${0.9 * (1 - k)})`; ctx.fillStyle = `rgba(120,210,60,${0.35 * (1 - k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x + Math.sin(f.t * 8) * 3, f.y, f.r, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (f.kind === 'plus') { ctx.fillStyle = `rgba(110,240,200,${1 - k})`; ctx.fillRect(f.x - 5, f.y - 1.5, 10, 3); ctx.fillRect(f.x - 1.5, f.y - 5, 3, 10); }
    else if (f.kind === 'roller') { const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - 12; ctx.fillStyle = '#9C907A'; ctx.strokeStyle = '#2E211B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  function drawEdges(left, top) {
    const cam = R.cam, list = [];
    for (const t of R.m.tanks) {
      if (!t.alive) continue;
      const v = R.view[t.idx], sx = (t.x - left) * cam.zoom, sy = (v.y - 30 - top) * cam.zoom;
      if (sx > 0 && sx < R.VW && sy > 0 && sy < R.VH) continue;
      list.push({ t, sx, sy, ex: clamp(sx, 26, R.VW - 26), ey: clamp(sy, 100, R.VH - 180) });
    }
    // keep markers on the same edge at least 46px apart
    for (const side of [26, R.VW - 26]) {
      const g = list.filter(o => o.ex === side).sort((a, b) => a.ey - b.ey);
      for (let i = 1; i < g.length; i++) if (g[i].ey - g[i - 1].ey < 46) g[i].ey = g[i - 1].ey + 46;
    }
    for (const o of list) {
      const t = o.t, a = Math.atan2(o.sy - o.ey, o.sx - o.ex);
      ctx.save(); ctx.translate(o.ex, o.ey);
      ctx.fillStyle = t.team === 'red' ? '#F0583E' : '#3E94F0';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill();
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(16, -8); ctx.lineTo(16, 8); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '900 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.round(Math.abs(t.x - cam.x) / 10) + 'm', 0, 4);
      ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(t.nick, 0, 31); ctx.fillText(t.nick, 0, 31);
      ctx.restore();
    }
  }
  function drawMini(left, top, v) {
    const m = R.m, mw = mini.width, mh = mini.height, sx = mw / m.W, sy = mh / m.H;
    mctx.clearRect(0, 0, mw, mh);
    mctx.drawImage(R.terrain, 0, 0, mw, mh);
    for (const c of m.crates) { mctx.fillStyle = '#FFD24A'; mctx.fillRect(c.x * sx - 2, c.y * sy - 4, 4, 4); }
    for (const t of m.tanks) if (t.alive) { mctx.fillStyle = t.team === 'red' ? '#FF6A50' : '#5AA8FF'; mctx.beginPath(); mctx.arc(t.x * sx, (t.y - 10) * sy, m.cur === t.idx ? 4.5 : 3.2, 0, 7); mctx.fill(); if (m.cur === t.idx) { mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.stroke(); } }
    mctx.strokeStyle = 'rgba(255,255,255,0.9)'; mctx.lineWidth = 1.5; mctx.strokeRect(left * sx, top * sy, v.w * sx, v.h * sy);
  }
  R.screenToWorld = function (cx, cy) {
    const v = R.viewSize(), r = cv.getBoundingClientRect();
    return { x: R.cam.x - v.w / 2 + (cx - r.left) / R.cam.zoom, y: R.cam.y - v.h / 2 + (cy - r.top) / R.cam.zoom };
  };
  return R;
}
