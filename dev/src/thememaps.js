// ============================================================== KIRD 주제 맵 그림 (연구윤리 · 연구노트 · 연구실 안전 · 연구비 관리)
// The ground shapes live in mapgen.js (TMAP_F walkable structures; each structure painted by ART below); this paints them: a backdrop behind the terrain, the solid art (clipped to the mask),
// and decorations drawn on the terrain picture. Visual only: nothing here touches the simulation.
// Map-specific names: items, happenings (from CONFIG.maps[id].items / .happen); falls back to the usual names.
function mapMetaOf(m) { return (m && CONFIG.maps[m.mapId]) || {}; }
function itemName(m, k) { const n = mapMetaOf(m).items; return (n && n[k]) || CONFIG.items[k].name; }
function happenName(m, k, i) { const h = mapMetaOf(m).happen; if (!h || !h[k]) return null; return Array.isArray(h[k]) ? h[k][i || 0] : h[k]; }
const TMAP_ART = (() => {
  const W = 5200, H = 1500, G = TG, CX = TCX, KB = '#2E86D6', KG = '#8CC63F';
  const FONT = '"Noto Sans KR", sans-serif', SERIF = '"Noto Serif KR", "Noto Sans KR", serif';
  const IMG = { get logo() { return KIMG.logo; }, get mascot() { return KIMG.mascot; } };
  function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function vg(x, y0, y1, stops) { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function hg(x, x0, x1, stops) { const g = x.createLinearGradient(x0, 0, x1, 0); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function rg(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
  function mx(px) { return 2 * CX - px; }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.roundRect(a, b, w, h, r); }
  function poly(x, pts) { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); }
  let MUTE = false; // true while painting tiny room interiors on the 주제 맵 structures: their small labels would be cut by the structure's edge
  function text(x, s, px, py, size, opt = {}) {
    if (MUTE) return;
    x.save(); x.font = `${opt.weight || 700} ${size}px ${opt.font || FONT}`; x.textAlign = opt.align || 'center'; x.textBaseline = opt.base || 'middle';
    if (opt.shadow) { x.shadowColor = opt.shadow; x.shadowBlur = opt.blur || 6; }
    if (opt.stroke) { x.lineJoin = 'round'; x.strokeStyle = opt.stroke; x.lineWidth = opt.sw || 4; x.strokeText(s, px, py); }
    x.fillStyle = opt.color || '#222'; if (opt.ls) x.letterSpacing = opt.ls + 'px'; x.fillText(s, px, py); x.restore();
  }
  function both(x, fn) { fn(x, 1); x.save(); x.translate(2 * CX, 0); x.scale(-1, 1); fn(x, -1); x.restore(); }
  function panel(x, a, y0, b, y1, tone) {
    const t = tone || [244, 246, 248], c = d => `rgb(${t[0] - d},${t[1] - d},${t[2] - d})`;
    x.fillStyle = vg(x, y0, y1, [[0, c(0)], [0.55, c(10)], [1, c(26)]]); x.fillRect(a, y0, b - a, y1 - y0);
    x.strokeStyle = c(36); x.lineWidth = 1.2; x.beginPath();
    for (let px = a + 110; px < b; px += 110) { x.moveTo(px + 0.5, y0); x.lineTo(px + 0.5, y1); }
    if (y1 - y0 > 70) for (let py = y0 + 55; py < y1; py += 55) { x.moveTo(a, py + 0.5); x.lineTo(b, py + 0.5); }
    x.stroke(); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(a, y0, b - a, 1.5); x.fillStyle = 'rgba(60,70,80,0.28)'; x.fillRect(a, y1 - 3, b - a, 3);
  }
  function louvre(x, a, y0, b, y1) {
    x.fillStyle = vg(x, y0, y1, [[0, '#D88C58'], [1, '#B4673A']]); x.fillRect(a, y0, b - a, y1 - y0);
    for (let px = a + 3; px < b - 2; px += 9) { x.fillStyle = 'rgba(255,214,170,0.55)'; x.fillRect(px, y0, 2, y1 - y0); x.fillStyle = 'rgba(96,44,18,0.45)'; x.fillRect(px + 5, y0, 2, y1 - y0); }
    x.fillStyle = vg(x, y0, y0 + 8, [[0, '#E8ECEF'], [1, '#9AA3AB']]); x.fillRect(a - 2, y0, b - a + 4, 7);
  }
  function glass(x, a, y0, b, y1, mull) {
    x.fillStyle = vg(x, y0, y1, [[0, '#A9DAE0'], [0.45, '#4C9AA2'], [1, '#2A6E76']]); x.fillRect(a, y0, b - a, y1 - y0);
    x.save(); x.beginPath(); x.rect(a, y0, b - a, y1 - y0); x.clip();
    x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); for (let px = a - 60; px < b; px += 170) { x.moveTo(px, y1); x.lineTo(px + 50, y0); x.lineTo(px + 84, y0); x.lineTo(px + 34, y1); } x.fill(); x.restore();
    x.fillStyle = '#5E6870'; for (let px = a; px <= b - 3; px += (mull || 62)) x.fillRect(px, y0, 3, y1 - y0); x.fillRect(b - 3, y0, 3, y1 - y0);
  }
  function interior(x, a, top, b, bot, wall, cb) {
    x.fillStyle = vg(x, top, bot, wall || [[0, '#EEF1F2'], [1, '#D7DCDF']]); x.fillRect(a, top, b - a, bot - top);
    x.fillStyle = '#E2E6E9'; x.fillRect(a, top, b - a, 12);
    for (let px = a + 50; px < b - 70; px += 140) { x.fillStyle = 'rgba(255,255,220,0.4)'; x.fillRect(px - 8, top + 11, 76, 9); x.fillStyle = '#FFFFF4'; x.fillRect(px, top + 11, 60, 3); }
    x.fillStyle = vg(x, top + 12, top + 36, [[0, 'rgba(30,40,50,0.22)'], [1, 'rgba(30,40,50,0)']]); x.fillRect(a, top + 12, b - a, 24);
    x.fillStyle = vg(x, bot - 10, bot, [[0, '#C4C8CB'], [1, '#A2A7AB']]); x.fillRect(a, bot - 10, b - a, 10);
    if (cb) { x.save(); x.beginPath(); x.rect(a, top, b - a, bot - top); x.clip(); cb(x, a, top, b, bot); x.restore(); }
  }
  function logoPlate(x, cx, cy, h, bg) {
    const L = IMG.logo, w = h * L.width / L.height;
    x.fillStyle = 'rgba(20,30,40,0.25)'; x.fillRect(cx - w / 2 - 14 + 4, cy - h / 2 - 9 + 5, w + 28, h + 18);
    x.fillStyle = bg || '#FAFBFC'; x.fillRect(cx - w / 2 - 14, cy - h / 2 - 9, w + 28, h + 18);
    x.drawImage(L, cx - w / 2, cy - h / 2, w, h);
  }
  function logoOnly(x, cx, cy, h) { const L = IMG.logo, w = h * L.width / L.height; x.drawImage(L, cx - w / 2, cy - h / 2, w, h); }
  function kMark(x, cx, cy, s) { // the K symbol cropped from the logo (left 30% of the image)
    const L = IMG.logo, sw = L.width * 0.27, sh = L.height; x.drawImage(L, 0, 0, sw, sh, cx - s * sw / sh / 2, cy - s / 2, s * sw / sh, s);
  }
  function mascotBanner(x, cx, top, bw, caption) {
    const bh = bw * 1.32;
    x.fillStyle = 'rgba(20,20,20,0.28)'; x.fillRect(cx - bw / 2 + 5, top + 6, bw, bh);
    x.fillStyle = '#FFFFFF'; x.fillRect(cx - bw / 2, top, bw, bh);
    x.drawImage(IMG.mascot, 20, 0, 360, 340, cx - bw / 2 + 6, top + 6, bw - 12, bh * 0.74);
    if (caption) text(x, caption, cx, top + bh * 0.84, bw * 0.105, { color: '#1E3A5A', weight: 900 });
    const lh = bh * 0.08, lw = lh * IMG.logo.width / IMG.logo.height; x.drawImage(IMG.logo, cx - lw / 2, top + bh * 0.9, lw, lh);
    x.fillStyle = '#5A646C'; x.fillRect(cx - bw / 2 - 3, top - 4, bw + 6, 5);
  }
  function kirdBlock(x, a, b, floors, fh, opts = {}) {
    const top = G - floors * fh, S = 26;
    // body interior through glass
    for (let i = 0; i < floors; i++) {
      const bot = G - i * fh, t = bot - fh + S;
      interior(x, a, t, b, bot, null, opts.room ? (xx, A, T, B, Bt) => opts.room(xx, A, T, B, Bt, i) : null);
      x.fillStyle = 'rgba(46,120,126,0.16)'; x.fillRect(a, t, b - a, bot - t);
      x.fillStyle = '#5E6870'; for (let px = a; px < b; px += 92) x.fillRect(px, t, 3, bot - t); x.fillRect(a, t + (bot - t) * 0.42, b - a, 2);
      x.fillStyle = 'rgba(255,255,255,0.14)'; x.beginPath(); for (let px = a - 40; px < b; px += 240) { x.moveTo(px, bot); x.lineTo(px + 60, t); x.lineTo(px + 96, t); x.lineTo(px + 36, bot); } x.fill();
      panel(x, a, bot - fh, b, bot - fh + S);
    }
    panel(x, a - 6, top - 6, b + 6, top + S - 4); // roof slab
    x.fillStyle = vg(x, top - 10, top - 2, [[0, '#FFFFFF'], [1, '#B4BCC2']]); x.fillRect(a - 8, top - 10, b - a + 16, 8);
    if (opts.louvre) { const [la, lb, lt] = opts.louvre; louvre(x, la, lt != null ? lt : top - 4, lb, G); }
    // end walls
    panel(x, a - 4, top, a + 18, G); panel(x, b - 18, top, b + 4, G);
    return top;
  }
  function noiseBand(x, a, b, y0, y1, cols, seed) {
    x.fillStyle = vg(x, y0, y1, cols); x.fillRect(a, y0, b - a, y1 - y0);
    const r = rng(seed || 7); x.globalAlpha = 0.07;
    for (let i = 0; i < (b - a) * (y1 - y0) / 1800; i++) { x.fillStyle = r() < 0.5 ? '#000' : '#fff'; x.fillRect(a + r() * (b - a), y0 + r() * (y1 - y0), 2 + r() * 5, 2 + r() * 3); }
    x.globalAlpha = 1;
  }
  function strata(x, a, b, y0, y1, col, seed) {
    const r = rng(seed || 3); x.strokeStyle = col; x.lineWidth = 3;
    for (let y = y0 + 40; y < y1; y += 46 + r() * 30) { x.beginPath(); x.moveTo(a, y); for (let px = a; px <= b; px += 60) x.lineTo(px, y + Math.sin(px / 210 + y) * 7 + (r() - 0.5) * 4); x.stroke(); }
  }
  function grassTop(x, pts, col) {
    x.save(); x.strokeStyle = col || '#5E9A48'; x.lineWidth = 10; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b + 3) : x.moveTo(a, b + 3)); x.stroke(); x.restore();
  }
  function tree(x, px, y, h, r, kind) {
    if (kind === 'pine') {
      x.fillStyle = '#5B4030'; x.fillRect(px - 3, y - h * 0.25, 6, h * 0.25);
      for (let i = 0; i < 4; i++) { const ty = y - h * (0.2 + i * 0.2), w = h * (0.34 - i * 0.06); x.fillStyle = hg(x, px - w, px + w, [[0, '#2F6B3E'], [0.45, '#245A33'], [1, '#173F24']]); x.beginPath(); x.moveTo(px, ty - h * 0.28); x.lineTo(px + w, ty); x.quadraticCurveTo(px, ty + 8, px - w, ty); x.closePath(); x.fill(); }
      return;
    }
    x.strokeStyle = '#5B4030'; x.lineCap = 'round'; x.lineWidth = Math.max(4, h * 0.06);
    x.beginPath(); x.moveTo(px, y); x.lineTo(px + h * 0.02, y - h * 0.5); x.moveTo(px, y - h * 0.32); x.lineTo(px - h * 0.16, y - h * 0.56); x.moveTo(px + h * 0.01, y - h * 0.4); x.lineTo(px + h * 0.18, y - h * 0.6); x.stroke();
    const blobs = 7 + Math.floor(r() * 4), cy = y - h * 0.68, R = h * 0.3, pts = [];
    for (let i = 0; i < blobs; i++) { const a = (i / blobs) * Math.PI * 2 + r(); pts.push([px + Math.cos(a) * R * (0.5 + r() * 0.5), cy + Math.sin(a) * R * 0.7 * (0.5 + r() * 0.5), R * (0.45 + r() * 0.3)]); }
    pts.push([px, cy, R * 0.7]); pts.sort((a, b) => a[1] - b[1]);
    for (const [bx, by, br] of pts) { x.fillStyle = rg(x, bx - br * 0.35, by - br * 0.4, br * 0.1, br, [[0, kind === 'light' ? '#8CC46A' : '#6FA65A'], [0.6, kind === 'light' ? '#5E9A48' : '#3F7E44'], [1, '#2C5A32']]); x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
  }
  function clouds(x, list, alpha) {
    for (const [cx, cy, s] of list) {
      x.save(); x.globalAlpha = alpha || 0.95;
      for (const [dx, dy, r] of [[-1, 0.1, 0.55], [-0.45, -0.25, 0.7], [0.15, -0.35, 0.8], [0.7, -0.1, 0.6], [1.1, 0.15, 0.45], [0, 0.2, 0.7]]) { x.fillStyle = rg(x, cx + dx * s, cy + dy * s - r * s * 0.3, 0, r * s, [[0, '#FFFFFF'], [0.7, '#F4F8FC'], [1, 'rgba(230,238,248,0)']]); x.beginPath(); x.arc(cx + dx * s, cy + dy * s, r * s, 0, 7); x.fill(); }
      x.restore();
    }
  }
  function fallStreak(x, px, py, len, col) { x.save(); x.fillStyle = hg(x, 0, 0, [[0, col], [1, col]]); const g = x.createLinearGradient(px, py - len, px, py); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, col); x.fillStyle = g; x.beginPath(); x.moveTo(px - 26, py - len); x.lineTo(px + 26, py - len); x.lineTo(px + 34, py); x.lineTo(px - 34, py); x.fill(); x.restore(); }
  function targetRing(x, px, py, col) { x.save(); x.strokeStyle = col; x.lineWidth = 4; x.setLineDash([12, 8]); x.beginPath(); x.ellipse(px, py, 70, 14, 0, 0, 7); x.stroke(); x.restore(); }
  function stamp(x, px, py, r, word, col, rot) {
    x.save(); x.translate(px, py); x.rotate(rot || -0.18);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.arc(5, 7, r, 0, 7); x.fill();
    x.fillStyle = '#FFF6F2'; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
    x.strokeStyle = col; x.lineWidth = r * 0.1; x.beginPath(); x.arc(0, 0, r * 0.9, 0, 7); x.stroke(); x.lineWidth = r * 0.04; x.beginPath(); x.arc(0, 0, r * 0.74, 0, 7); x.stroke();
    text(x, word, 0, 2, r * 0.62, { color: col, weight: 900 }); x.restore();
  }
  function flame(x, px, py, s, seed) {
    const r = rng(seed || 5);
    for (let layer = 0; layer < 3; layer++) {
      const cols = [['#FF5A1F', '#FF9A1F'], ['#FFB020', '#FFE16A'], ['#FFF4B0', '#FFFFFF']][layer], sc = [1, 0.68, 0.36][layer];
      for (let i = -2; i <= 2; i++) {
        const fx = px + i * s * 0.32 * sc, fh = s * (1.25 - Math.abs(i) * 0.24) * sc * (0.85 + r() * 0.3), fw = s * 0.34 * sc;
        x.fillStyle = vg(x, py - fh, py, [[0, cols[1]], [1, cols[0]]]);
        x.beginPath(); x.moveTo(fx - fw, py); x.bezierCurveTo(fx - fw * 1.1, py - fh * 0.5, fx - fw * 0.2, py - fh * 0.7, fx + (r() - 0.5) * fw, py - fh); x.bezierCurveTo(fx + fw * 0.3, py - fh * 0.6, fx + fw * 1.1, py - fh * 0.45, fx + fw, py); x.closePath(); x.fill();
      }
    }
  }
  function smoke(x, px, py, s, seed) { const r = rng(seed || 9); x.save(); x.filter = 'blur(4px)'; for (let i = 0; i < 12; i++) { const k = i / 12; x.fillStyle = `rgba(${70 + k * 60},${66 + k * 60},${64 + k * 60},${0.55 - k * 0.35})`; x.beginPath(); x.arc(px + Math.sin(i * 1.3) * s * 0.3 * k + i * s * 0.12, py - i * s * 0.22, s * (0.25 + k * 0.45) * (0.8 + r() * 0.4), 0, 7); x.fill(); } x.restore(); }
  function skyDay(x) { x.fillStyle = vg(x, 0, G, [[0, '#3F8FD8'], [0.6, '#8FC3EA'], [1, '#DCEEF6']]); x.fillRect(0, 0, W, H); }
  function hazardStripe(x, a, y, b, h) { x.save(); x.beginPath(); x.rect(a, y, b - a, h); x.clip(); x.fillStyle = '#F2C230'; x.fillRect(a, y, b - a, h); x.fillStyle = '#1E1E1E'; for (let px = a - h; px < b; px += h * 1.6) { x.beginPath(); x.moveTo(px, y + h); x.lineTo(px + h * 0.8, y + h); x.lineTo(px + h * 1.6, y); x.lineTo(px + h * 0.8, y); x.fill(); } x.restore(); }
  function concrete(x, a, b, y0, y1, seed) { noiseBand(x, a, b, y0, y1, [[0, '#B7BCC0'], [0.12, '#9AA0A5'], [1, '#5F656B']], seed || 8); x.strokeStyle = 'rgba(40,44,48,0.25)'; x.lineWidth = 2; for (let px = a; px < b; px += 240) { x.beginPath(); x.moveTo(px, y0); x.lineTo(px, y0 + 40); x.stroke(); } }
  function ghs(x, cx, cy, s, kind) {
    x.save(); x.translate(cx, cy);
    x.fillStyle = '#FFFFFF'; poly(x, [[0, -s], [s, 0], [0, s], [-s, 0]]); x.fill();
    x.strokeStyle = '#E3232B'; x.lineWidth = s * 0.11; x.lineJoin = 'miter'; poly(x, [[0, -s * 0.94], [s * 0.94, 0], [0, s * 0.94], [-s * 0.94, 0]]); x.stroke();
    x.fillStyle = '#111'; x.strokeStyle = '#111'; const k = s / 100;
    if (kind === 'flame' || kind === 'ox') {
      const fy = kind === 'ox' ? -6 : 20;
      x.beginPath(); x.moveTo(-26 * k, fy * k); x.bezierCurveTo(-34 * k, (fy - 30) * k, -10 * k, (fy - 40) * k, -8 * k, (fy - 62) * k); x.bezierCurveTo(4 * k, (fy - 44) * k, 14 * k, (fy - 40) * k, 10 * k, (fy - 22) * k); x.bezierCurveTo(20 * k, (fy - 30) * k, 22 * k, (fy - 44) * k, 18 * k, (fy - 52) * k); x.bezierCurveTo(36 * k, (fy - 34) * k, 34 * k, (fy - 6) * k, 24 * k, fy * k); x.closePath(); x.fill();
      if (kind === 'ox') { x.lineWidth = 9 * k; x.beginPath(); x.arc(0, 20 * k, 22 * k, 0, 7); x.stroke(); }
      x.fillRect(-36 * k, 46 * k, 72 * k, 8 * k);
    } else if (kind === 'excl') { x.beginPath(); x.moveTo(-9 * k, -50 * k); x.lineTo(9 * k, -50 * k); x.lineTo(5 * k, 18 * k); x.lineTo(-5 * k, 18 * k); x.fill(); x.beginPath(); x.arc(0, 36 * k, 9 * k, 0, 7); x.fill(); }
    else if (kind === 'gas') { x.save(); x.rotate(-0.45); rr(x, -44 * k, -14 * k, 82 * k, 28 * k, 14 * k); x.fill(); x.fillRect(38 * k, -6 * k, 12 * k, 12 * k); x.restore(); x.fillRect(-40 * k, 44 * k, 80 * k, 6 * k); }
    else if (kind === 'health') { x.beginPath(); x.arc(-4 * k, -30 * k, 16 * k, 0, 7); x.fill(); x.beginPath(); x.moveTo(-36 * k, 50 * k); x.quadraticCurveTo(-36 * k, -6 * k, -4 * k, -10 * k); x.quadraticCurveTo(30 * k, -6 * k, 30 * k, 50 * k); x.fill(); x.fillStyle = '#FFF'; x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, rr2 = (i % 2 ? 6 : 16) * k; x.lineTo(-2 * k + Math.cos(a) * rr2, 20 * k + Math.sin(a) * rr2); } x.fill(); }
    x.restore();
  }
  function exitSign(x, cx, cy, w) { // green emergency-exit sign: running figure toward a door
    const h = w * 0.5; x.fillStyle = '#0B8A43'; rr(x, cx - w / 2, cy - h / 2, w, h, 4); x.fill(); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(cx - w / 2, cy - h / 2, w, h * 0.18);
    x.fillStyle = '#FFFFFF'; x.fillRect(cx + w * 0.16, cy - h * 0.36, w * 0.24, h * 0.72); x.fillStyle = '#0B8A43'; x.fillRect(cx + w * 0.2, cy - h * 0.3, w * 0.16, h * 0.66);
    const k = w / 100; x.strokeStyle = '#FFFFFF'; x.lineCap = 'round'; x.lineWidth = 6 * k; x.fillStyle = '#FFF';
    x.beginPath(); x.arc(cx - 6 * k, cy - 15 * k, 5 * k, 0, 7); x.fill();
    x.beginPath(); x.moveTo(cx - 12 * k, cy - 6 * k); x.lineTo(cx - 20 * k, cy + 6 * k); x.moveTo(cx - 12 * k, cy - 6 * k); x.lineTo(cx - 2 * k, cy + 2 * k); x.lineTo(cx + 4 * k, cy - 6 * k); x.moveTo(cx - 20 * k, cy + 6 * k); x.lineTo(cx - 30 * k, cy + 4 * k); x.moveTo(cx - 20 * k, cy + 6 * k); x.lineTo(cx - 10 * k, cy + 18 * k); x.moveTo(cx - 12 * k, cy - 6 * k); x.lineTo(cx - 26 * k, cy - 8 * k); x.stroke();
  }
  function extinguisher(x, cx, base, h) { const w = h * 0.36; x.fillStyle = hg(x, cx - w / 2, cx + w / 2, [[0, '#8E1218'], [0.35, '#F0454B'], [1, '#7A0F14']]); rr(x, cx - w / 2, base - h * 0.82, w, h * 0.82, w * 0.4); x.fill(); x.fillStyle = '#222'; x.fillRect(cx - w * 0.2, base - h, w * 0.4, h * 0.2); x.fillStyle = '#FFF'; x.fillRect(cx - w * 0.36, base - h * 0.6, w * 0.72, h * 0.22); }
  function drum(x, cx, base, w, h, col) {
    x.fillStyle = hg(x, cx - w / 2, cx + w / 2, [[0, 'rgba(0,0,0,0.35)'], [0.3, col], [0.7, col], [1, 'rgba(0,0,0,0.45)']]); x.fillRect(cx - w / 2, base - h, w, h);
    x.fillStyle = hg(x, cx - w / 2, cx + w / 2, [[0, '#2A2A2A'], [0.4, '#4A4A4A'], [1, '#1A1A1A']]); for (const t of [0.12, 0.88]) x.fillRect(cx - w / 2, base - h * t - 5, w, 10);
    x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(cx - w * 0.28, base - h + 8, w * 0.08, h - 16);
    ghs(x, cx, base - h * 0.5, w * 0.26, 'flame');
  }
  function labRoomS(x, a, top, b, bot, i) {
    // benches, reagent shelves, a fume hood, safety shower + eyewash, extinguisher, exit sign
    const fh = bot - top;
    x.fillStyle = '#DDE3E6'; x.fillRect(a, top + 14, b - a, fh - 24);
    for (let px = a + 40; px < b - 120; px += 260) {
      // reagent shelf
      x.fillStyle = '#C8CFD4'; x.fillRect(px, top + 34, 150, 6); x.fillRect(px, top + 74, 150, 6);
      ['#E85D3F', '#3FA3D6', '#F2C230', '#7CC36B', '#9B6BC9'].forEach((c, j) => { x.fillStyle = c; x.fillRect(px + 10 + j * 28, top + 52, 14, 22); x.fillStyle = '#FFF'; x.fillRect(px + 10 + j * 28, top + 60, 14, 6); });
      // bench
      x.fillStyle = '#2F3A44'; x.fillRect(px, bot - 58, 200, 10); x.fillStyle = vg(x, bot - 48, bot - 10, [[0, '#E9EDF0'], [1, '#B9C1C7']]); x.fillRect(px + 6, bot - 48, 188, 38);
      x.strokeStyle = '#9AA3AB'; x.lineWidth = 2; for (let k = 1; k < 3; k++) { x.beginPath(); x.moveTo(px + 6 + k * 63, bot - 48); x.lineTo(px + 6 + k * 63, bot - 10); x.stroke(); }
      x.fillStyle = 'rgba(150,215,235,0.9)'; x.beginPath(); x.moveTo(px + 40, bot - 58); x.lineTo(px + 50, bot - 92); x.lineTo(px + 60, bot - 58); x.fill(); x.fillRect(px + 90, bot - 84, 10, 26); x.fillStyle = 'rgba(240,120,60,0.8)'; x.fillRect(px + 90, bot - 70, 10, 12);
    }
    // fume hood at the right end
    const hx = b - 170; x.fillStyle = vg(x, top + 20, bot, [[0, '#F2F4F5'], [1, '#C9CFD3']]); x.fillRect(hx, top + 22, 140, fh - 32); x.fillStyle = 'rgba(160,210,225,0.75)'; x.fillRect(hx + 12, top + 50, 116, fh * 0.45); x.fillStyle = '#5E6870'; x.fillRect(hx + 12, top + 50 + fh * 0.45, 116, 6);
    text(x, '흄후드', hx + 70, top + 36, 15, { color: '#2E3A44', weight: 800 });
    // safety shower + eyewash + extinguisher at the left end
    x.strokeStyle = '#2E9E4F'; x.lineWidth = 6; x.beginPath(); x.moveTo(a + 26, bot - 10); x.lineTo(a + 26, top + 30); x.lineTo(a + 60, top + 30); x.stroke(); x.fillStyle = '#2E9E4F'; x.beginPath(); x.ellipse(a + 60, top + 38, 18, 8, 0, 0, 7); x.fill();
    x.fillStyle = '#0B8A43'; x.fillRect(a + 4, top + 54, 64, 22); text(x, '비상샤워', a + 36, top + 65, 12, { color: '#FFF', weight: 800 });
    extinguisher(x, a + 90, bot - 10, 52);
    exitSign(x, (a + b) / 2, top + 30, 70);
  }
  function labBlock(x, a, b, floors, fh, opts = {}) { return kirdBlock(x, a, b, floors, fh, Object.assign({ room: labRoomS }, opts)); }
  function roofKit(x, a, b, top) { // HVAC box and exhaust stacks on the roof (solid)
    x.fillStyle = vg(x, top - 70, top, [[0, '#D5DADD'], [1, '#9AA3AB']]); x.fillRect(a + 60, top - 70, 170, 70); x.strokeStyle = 'rgba(60,70,80,0.4)'; x.lineWidth = 2; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(a + 80 + k * 20, top - 60); x.lineTo(a + 80 + k * 20, top - 12); x.stroke(); }
    for (const sx of [b - 180, b - 110]) { x.fillStyle = hg(x, sx - 16, sx + 16, [[0, '#8A939A'], [0.4, '#E3E7EA'], [1, '#7A838A']]); x.fillRect(sx - 16, top - 150, 32, 150); x.fillStyle = '#5E6870'; x.fillRect(sx - 22, top - 156, 44, 10); }
  }
  function gold(x, y0, y1) { return vg(x, y0, y1, [[0, '#FFF1B8'], [0.3, '#F2C94C'], [0.7, '#C9972B'], [1, '#8A6418']]); }
  function receiptText(x, a, y, lines, w) {
    x.fillStyle = '#FFFFFF'; x.fillRect(a, y, w, lines.length * 30 + 40);
    x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(a, y, 6, lines.length * 30 + 40);
    lines.forEach((l, i) => { text(x, l[0], a + 18, y + 26 + i * 30, 18, { color: '#333', weight: 600, align: 'left', font: '"Noto Sans Mono CJK KR", monospace' }); if (l[1]) text(x, l[1], a + w - 16, y + 26 + i * 30, 18, { color: '#333', weight: 700, align: 'right', font: '"Noto Sans Mono CJK KR", monospace' }); });
  }
  function fundCard(x, cx, cy, w, ang) { // a fictional research-fund card (no real bank branding)
    const h = w * 0.63; x.save(); x.translate(cx, cy); x.rotate(ang);
    x.fillStyle = hg(x, -w / 2, w / 2, [[0, '#1D5E9E'], [0.55, '#2E86D6'], [1, '#8CC63F']]); rr(x, -w / 2, -h / 2, w, h, 28); x.fill(); x.save(); rr(x, -w / 2, -h / 2, w, h, 28); x.clip();
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.ellipse(w * 0.2, -h * 0.5, w * 0.5, h * 0.5, 0.3, 0, 7); x.fill(); x.restore();
    x.fillStyle = gold(x, -h * 0.15, h * 0.1); rr(x, -w * 0.38, -h * 0.14, w * 0.14, h * 0.22, 8); x.fill(); x.strokeStyle = 'rgba(110,75,15,0.6)'; x.lineWidth = 2; x.strokeRect(-w * 0.38 + 8, -h * 0.14 + 10, w * 0.14 - 16, h * 0.22 - 20);
    text(x, '연구비 카드', -w * 0.4, -h * 0.32, h * 0.12, { color: '#FFF', weight: 900, align: 'left' });
    text(x, '0000  ····  ····  2026', -w * 0.4, h * 0.2, h * 0.09, { color: 'rgba(255,255,255,0.92)', weight: 700, align: 'left', ls: 4 });
    text(x, '용도 내 집행 전용', -w * 0.4, h * 0.36, h * 0.07, { color: 'rgba(255,255,255,0.85)', weight: 700, align: 'left' });
    x.fillStyle = '#FFF'; rr(x, w * 0.18, h * 0.22, w * 0.26, h * 0.18, 8); x.fill(); logoOnly(x, w * 0.31, h * 0.31, h * 0.12);
    x.restore();
  }
  function skyDawn(x, warm) {
    x.fillStyle = vg(x, 0, G, [[0, '#5D9FD8'], [0.55, '#A9CDEA'], [0.85, warm || '#F3E3C4'], [1, '#F7EBD3']]); x.fillRect(0, 0, W, H);
  }
  function marble(x, a, y0, b, y1, seed, tone) {
    const t = tone || ['#FBFAF7', '#E9E6DF', '#D5D1C8'];
    x.fillStyle = vg(x, y0, y1, [[0, t[0]], [0.5, t[1]], [1, t[2]]]); x.fillRect(a, y0, b - a, y1 - y0);
    const r = rng(seed || 11); x.save(); x.beginPath(); x.rect(a, y0, b - a, y1 - y0); x.clip();
    x.strokeStyle = 'rgba(120,112,100,0.12)'; x.lineWidth = 1.2;
    for (let i = 0; i < (b - a) / 60; i++) { let px = a + r() * (b - a), py = y0 + r() * (y1 - y0); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += 14 + r() * 26; py += (r() - 0.45) * 18; x.lineTo(px, py); } x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(a, y0, b - a, 2); x.fillStyle = 'rgba(80,70,60,0.22)'; x.fillRect(a, y1 - 4, b - a, 4);
    x.restore();
  }
  function bronze(x, y0, y1, dark) { return vg(x, y0, y1, dark ? [[0, '#A77B36'], [0.5, '#6E4E1F'], [1, '#4A3415']] : [[0, '#F1D58E'], [0.35, '#C99A45'], [0.7, '#97692A'], [1, '#6B4A1C']]); }
  function bronzeH(x, a, b) { return hg(x, a, b, [[0, '#6B4A1C'], [0.2, '#B98A3E'], [0.42, '#F3DA98'], [0.6, '#C49543'], [1, '#5E4018']]); }
  function columnBack(x, cx, base, h, w) { // a fluted classical column (background)
    x.fillStyle = hg(x, cx - w / 2, cx + w / 2, [[0, '#C9C3B6'], [0.35, '#F7F4EC'], [0.7, '#E1DBCF'], [1, '#B9B2A4']]); x.fillRect(cx - w / 2, base - h, w, h);
    x.strokeStyle = 'rgba(120,110,95,0.35)'; x.lineWidth = 2; for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(cx - w / 2 + k * w / 6, base - h + 26); x.lineTo(cx - w / 2 + k * w / 6, base - 20); x.stroke(); }
    x.fillStyle = '#E9E4D8'; x.fillRect(cx - w * 0.7, base - h, w * 1.4, 22); x.fillRect(cx - w * 0.7, base - 22, w * 1.4, 22);
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(cx - w * 0.7, base - h + 18, w * 1.4, 4);
  }
  function labRoom(x, a, top, b, bot, floor) {
    const r = rng(floor * 13 + a);
    for (let px = a + 60; px < b - 110; px += 170) {
      if (floor === 0 && px > a + 300) { // lab bench with glassware
        x.fillStyle = '#E7ECEE'; x.fillRect(px, bot - 42, 130, 6); x.fillStyle = '#6B747C'; x.fillRect(px + 6, bot - 36, 118, 26);
        x.fillStyle = 'rgba(120,200,220,0.8)'; x.fillRect(px + 20, bot - 62, 10, 20); x.beginPath(); x.moveTo(px + 50, bot - 42); x.lineTo(px + 58, bot - 66); x.lineTo(px + 66, bot - 42); x.fill();
      } else { // desks with monitors
        x.fillStyle = '#8A6A4C'; x.fillRect(px, bot - 40, 90, 5); x.fillStyle = '#6B737A'; x.fillRect(px + 6, bot - 35, 3, 25); x.fillRect(px + 81, bot - 35, 3, 25);
        x.fillStyle = '#2A3440'; x.fillRect(px + 30, bot - 66, 34, 22); x.fillStyle = '#7FC4E8'; x.fillRect(px + 33, bot - 63, 28, 16);
      }
    }
    if (floor === 1) { x.fillStyle = '#FFFFFF'; x.fillRect(a + 40, top + 24, 120, 50); x.strokeStyle = '#98A2AA'; x.lineWidth = 3; x.strokeRect(a + 40, top + 24, 120, 50); text(x, '연구노트 작성', a + 100, top + 49, 15, { color: '#2E86D6', weight: 800 }); }
  }
  function blocks(x, a, b, y0, y1, col) { x.strokeStyle = col; x.lineWidth = 2; let row = 0; for (let y = y0; y < y1; y += 52, row++) { x.beginPath(); x.moveTo(a, y); x.lineTo(b, y); for (let px = a + (row % 2) * 90; px < b; px += 180) { x.moveTo(px, y); x.lineTo(px, y + 52); } x.stroke(); } x.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = y0; y < y1; y += 52) x.fillRect(a, y + 2, b - a, 3); }
  function nbPoly(off) { const pts = []; for (let px = 640; px <= 2560; px += 10) pts.push([px, nbTop(px) + off]); return pts; }
  function ink(x, s, px, py, size, opt = {}) { text(x, s, px, py, size, Object.assign({ color: '#1F3A93', weight: 500, font: SERIF, align: 'left' }, opt)); }
  function sigBox(x, a, y, label, who) {
    x.strokeStyle = '#8A97A8'; x.lineWidth = 2; x.strokeRect(a, y, 260, 44); x.beginPath(); x.moveTo(a + 96, y); x.lineTo(a + 96, y + 44); x.stroke();
    text(x, label, a + 48, y + 22, 15, { color: '#56657A', weight: 700 });
    x.strokeStyle = '#1F3A93'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(a + 112, y + 30); x.bezierCurveTo(a + 130, y + 4, a + 140, y + 40, a + 156, y + 18); x.bezierCurveTo(a + 168, y + 6, a + 176, y + 34, a + 196, y + 22); x.lineTo(a + 236, y + 20); x.stroke();
    if (who) ink(x, who, a + 200, y + 36, 11, { color: '#56657A' });
  }
  function dust(x, px, py) { x.save(); x.filter = 'blur(3px)'; for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + i * 0.1); x.fillStyle = 'rgba(210,190,160,0.55)'; x.beginPath(); x.arc(px + Math.cos(a) * 70, py + Math.sin(a) * 40, 22 + (i % 3) * 8, 0, 7); x.fill(); } x.restore(); }

  // an information board: header band + left-aligned lines (all text verified against the law; see HANDOFF)
  function board(x, a, y, w, title, lines, o = {}) {
    const fs = o.size || 24, lh = fs * 1.55, h = 78 + lines.length * lh + 18, col = o.color || '#2E86D6';
    if (o.legs) { x.fillStyle = '#5E6870'; for (const lx of [a + w * 0.18, a + w * 0.82]) x.fillRect(lx - 7, y + h, 14, o.legs); }
    x.fillStyle = 'rgba(0,0,0,0.18)'; rr(x, a + 6, y + 8, w, h, 14); x.fill();
    x.fillStyle = o.bg || '#FFFDF7'; rr(x, a, y, w, h, 14); x.fill();
    x.fillStyle = col; rr(x, a, y, w, 60, [14, 14, 0, 0]); x.fill();
    text(x, title, a + 24, y + 31, fs + 6, { color: '#FFF', weight: 900, align: 'left' });
    if (o.badge) text(x, o.badge, a + w - 22, y + 31, fs * 0.62, { color: 'rgba(255,255,255,0.85)', weight: 700, align: 'right' });
    lines.forEach((l, i) => {
      const ly = y + 60 + 30 + i * lh, hl = Array.isArray(l);
      x.fillStyle = col; x.beginPath(); x.arc(a + 32, ly, 5, 0, 7); x.fill();
      text(x, hl ? l[0] : l, a + 48, ly, fs, { color: '#1E2A36', weight: 800, align: 'left' });
      if (hl) text(x, l[1], a + w - 24, ly, fs, { color: col, weight: 900, align: 'right' });
    });
    return h;
  }

  const S = {};
  // ---------------------------------------------------------------- 혁신의 능선의 평가 시설 (선정평가관 · 단계평가 게이트 · 최종평가 단상)과 캐릭터 조형물
  function ridgeLine(x, off, step) { x.beginPath(); x.moveTo(0, ridgeTop(0) + off); for (let px = 0; px <= W; px += step || 20) x.lineTo(px, ridgeTop(px) + off); }
  function wave(x, base, a1, f1, a2, f2, col) { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 40) x.lineTo(px, base + a1 * Math.sin(px / f1) + a2 * Math.sin(px / f2 + 1)); x.lineTo(W, H); x.closePath(); x.fill(); }

  // 낮의 야외 + 평가 시설 3곳(선정평가관 · 단계평가 게이트 · 최종평가 단상) + KIRD 캐릭터 조형물
  const MED = { blue: [108, 122, 96], green: [298, 178, 86] }; // head crops in the mascot picture: cx, cy, r
  function medallion(x, cx, cy, r, who) {
    const [ix, iy, ir] = MED[who];
    x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.arc(cx + 6, cy + 8, r + 18, 0, 7); x.fill();
    x.fillStyle = bronzeH(x, cx - r - 18, cx + r + 18); x.beginPath(); x.arc(cx, cy, r + 18, 0, 7); x.fill();
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(cx, cy, r + 5, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip(); x.drawImage(IMG.mascot, ix - ir, iy - ir, ir * 2, ir * 2, cx - r, cy - r, r * 2, r * 2); x.restore();
  }
  function statuePillar(x, cx, cy, r, base, who, say) {
    x.fillStyle = hg(x, cx - 50, cx + 50, [[0, '#9AA3AB'], [0.45, '#F1F3F5'], [1, '#8A939B']]); x.fillRect(cx - 42, cy + r, 84, base - cy - r);
    x.fillStyle = '#7A848C'; x.fillRect(cx - 60, cy + r + 8, 120, 16); x.fillRect(cx - 70, base - 40, 140, 40);
    medallion(x, cx, cy, r, who);
    x.fillStyle = '#1E3A5A'; rr(x, cx - 84, cy + r + 40, 168, 44, 8); x.fill(); text(x, say, cx, cy + r + 63, 22, { color: '#FFF', weight: 900 });
  }
  function selectionHall(x, cx, cy) { // 선정평가관: 계획서 발표 화면과 평가위원석이 유리 너머로 보이는 심사 건물
    const a = cx - 330, b = cx + 330, top = cy - 400, bot = cy + 240, gt = top + 70, gb = cy + 60;
    panel(x, a, top, b, bot, [236, 240, 243]);
    interior(x, a + 36, gt, b - 36, gb, null, (xx, A, T, B) => {
      xx.fillStyle = '#1E2A36'; rr(xx, A + 26, T + 40, 300, 176, 8); xx.fill();
      xx.fillStyle = '#FFFFFF'; rr(xx, A + 38, T + 52, 276, 152, 4); xx.fill();
      text(xx, '연구개발계획서', A + 176, T + 86, 24, { color: '#1E3A5A', weight: 900 });
      xx.fillStyle = '#D5DCE3'; for (let k = 0; k < 3; k++) xx.fillRect(A + 66, T + 116 + k * 22, 220 - k * 40, 10);
      xx.fillStyle = '#5E6870'; xx.fillRect(A + 172, T + 216, 8, 40);
      const ta = A + 360; xx.fillStyle = '#6B4A2A'; xx.fillRect(ta, T + 178, B - ta - 20, 18); xx.fillStyle = '#4A3420'; xx.fillRect(ta + 10, T + 196, 12, 70); xx.fillRect(B - 44, T + 196, 12, 70);
      for (let k = 0; k < 3; k++) { const px = ta + 14 + k * 60; xx.fillStyle = '#2C3E50'; rr(xx, px + 6, T + 120, 40, 58, [16, 16, 4, 4]); xx.fill(); xx.fillStyle = '#FFFFFF'; xx.fillRect(px, T + 160, 52, 20); text(xx, '평가위원', px + 26, T + 170, 11, { color: '#1E3A5A', weight: 900 }); }
    });
    x.fillStyle = 'rgba(46,120,126,0.14)'; x.fillRect(a + 36, gt, b - a - 72, gb - gt);
    x.fillStyle = '#5E6870'; for (let px = a + 36; px <= b - 36; px += 118) x.fillRect(px, gt, 4, gb - gt);
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.beginPath(); for (let px = a; px < b; px += 230) { x.moveTo(px, gb); x.lineTo(px + 70, gt); x.lineTo(px + 110, gt); x.lineTo(px + 40, gb); } x.fill();
    louvre(x, b - 34, top, b - 4, bot);
    x.fillStyle = vg(x, top - 16, top, [[0, '#FFFFFF'], [1, '#AEB6BD']]); x.fillRect(a - 14, top - 16, b - a + 28, 16);
    x.fillStyle = 'rgba(0,0,0,0.2)'; rr(x, cx - 262 + 6, top - 140 + 8, 524, 112, 14); x.fill();
    x.fillStyle = '#1D5E9E'; rr(x, cx - 262, top - 140, 524, 112, 14); x.fill();
    x.fillStyle = '#FFFFFF'; rr(x, cx - 246, top - 124, 116, 80, 10); x.fill(); kMark(x, cx - 188, top - 84, 60);
    text(x, '선정평가', cx + 62, top - 100, 50, { color: '#FFF', weight: 900 });
    text(x, '연구개발과제 선정 심사', cx + 62, top - 50, 22, { color: '#CFE4F7', weight: 700 });
    x.fillStyle = '#5E6870'; x.fillRect(cx - 200, top - 28, 10, 12); x.fillRect(cx + 190, top - 28, 10, 12);
  }
  function stageGate(x, cx, cy) { // 단계평가 게이트: 1단계에서 2단계로 넘어가는 관문
    const L = cx - 340, R = cx + 340, top = cy - 400;
    for (const px of [L, R]) {
      x.fillStyle = hg(x, px - 60, px + 60, [[0, '#5E6870'], [0.35, '#C9D1D8'], [0.6, '#F4F6F8'], [1, '#6E7880']]);
      poly(x, [[px - 34, top], [px + 34, top], [px + 58, cy + 140], [px - 58, cy + 140]]); x.fill();
      x.fillStyle = 'rgba(127,209,199,0.35)'; x.fillRect(px - 9, top + 20, 18, cy + 120 - top); x.fillStyle = '#BFF5EE'; x.fillRect(px - 4, top + 20, 8, cy + 120 - top);
    }
    x.fillStyle = 'rgba(0,0,0,0.22)'; rr(x, L - 90 + 8, top - 140 + 10, R - L + 180, 160, 18); x.fill();
    x.fillStyle = vg(x, top - 140, top + 20, [[0, '#21405F'], [1, '#12263A']]); rr(x, L - 90, top - 140, R - L + 180, 160, 18); x.fill();
    x.strokeStyle = '#7FD1C7'; x.lineWidth = 5; x.stroke();
    text(x, '단계평가', cx, top - 78, 64, { color: '#FFF', weight: 900 });
    text(x, 'STAGE GATE · 다음 단계로 갈지 정하는 관문', cx, top - 24, 23, { color: '#9FE3DA', weight: 700 });
    x.fillStyle = '#FFFFFF'; rr(x, cx - 66, top - 262, 132, 110, 22); x.fill(); x.strokeStyle = '#2E86D6'; x.lineWidth = 5; x.stroke(); kMark(x, cx, top - 207, 84);
    const ty = top + 78;
    x.fillStyle = 'rgba(255,255,255,0.88)'; rr(x, L + 20, ty - 34, R - L - 40, 110, 16); x.fill();
    x.lineCap = 'round'; x.strokeStyle = '#C9D1D8'; x.lineWidth = 10; x.beginPath(); x.moveTo(L + 80, ty); x.lineTo(R - 80, ty); x.stroke();
    x.strokeStyle = KG; x.beginPath(); x.moveTo(L + 80, ty); x.lineTo(cx, ty); x.stroke(); x.lineCap = 'butt';
    [[L + 80, '1단계', KG, 18], [cx, '단계평가', '#F2C94C', 26], [R - 80, '2단계', '#FFFFFF', 18]].forEach(([px, s, c, r]) => {
      x.fillStyle = c; x.beginPath(); x.arc(px, ty, r, 0, 7); x.fill(); x.strokeStyle = '#1E2A36'; x.lineWidth = 4; x.stroke();
      text(x, s, px, ty + 50, 26, { color: '#1E2A36', weight: 900 });
    });
    const sx = R - 40, sy = top - 196;
    x.fillStyle = '#5E6870'; x.fillRect(sx - 6, sy + 60, 12, 60);
    x.fillStyle = '#2A333B'; rr(x, sx - 92, sy, 184, 62, 14); x.fill();
    [['#E8402E', 0.25], ['#F2C94C', 0.25], ['#5EE07A', 1]].forEach(([c, al], k) => { x.globalAlpha = al; x.fillStyle = c; x.beginPath(); x.arc(sx - 56 + k * 56, sy + 31, 21, 0, 7); x.fill(); x.globalAlpha = 1; });
  }
  function finalStage(x, cx, cy) { // 최종평가 단상: 최종보고서 조형물과 리본 현판
    for (let k = 0; k < 3; k++) { const w = 620 - k * 110, y = cy - 40 - k * 44; x.fillStyle = vg(x, y, y + 44, [[0, '#F7F5EF'], [1, '#CFC8B8']]); x.fillRect(cx - w / 2, y, w, 44 + (k ? 0 : 200)); x.fillStyle = '#B9B2A2'; x.fillRect(cx - w / 2, y, w, 4); }
    const a = cx - 150, b = cx + 150, t = cy - 520, bt = cy - 128;
    x.fillStyle = '#F4EBD6'; poly(x, [[b, t + 14], [b + 34, t + 34], [b + 34, bt + 8], [b, bt]]); x.fill();
    x.strokeStyle = 'rgba(150,130,90,0.5)'; x.lineWidth = 2; for (let y = t + 30; y < bt; y += 9) { x.beginPath(); x.moveTo(b + 2, y); x.lineTo(b + 32, y + 18); x.stroke(); }
    x.fillStyle = vg(x, t, bt, [[0, '#24466E'], [1, '#14284A']]); rr(x, a, t, b - a, bt - t, [8, 14, 14, 8]); x.fill();
    x.fillStyle = '#0E1E36'; x.fillRect(a, t, 26, bt - t);
    x.strokeStyle = '#E9C46A'; x.lineWidth = 4; x.strokeRect(a + 46, t + 26, b - a - 72, bt - t - 52);
    text(x, '최종보고서', cx + 12, t + 120, 36, { color: '#F2D27A', weight: 900 });
    x.fillStyle = '#E9C46A'; x.fillRect(cx - 80, t + 158, 184, 3);
    text(x, '연구개발 성과', cx + 12, t + 196, 24, { color: '#E8DDBE', weight: 700 });
    x.fillStyle = '#FFFFFF'; rr(x, cx - 38, bt - 112, 100, 70, 12); x.fill(); kMark(x, cx + 12, bt - 77, 50);
    const ry = t - 120; x.fillStyle = '#9E2A3A'; poly(x, [[cx - 330, ry + 20], [cx - 250, ry + 20], [cx - 250, ry + 84], [cx - 330, ry + 84], [cx - 300, ry + 52]]); x.fill(); poly(x, [[cx + 330, ry + 20], [cx + 250, ry + 20], [cx + 250, ry + 84], [cx + 330, ry + 84], [cx + 300, ry + 52]]); x.fill();
    x.fillStyle = vg(x, ry, ry + 80, [[0, '#E0475A'], [1, '#B8303F']]); rr(x, cx - 270, ry, 540, 84, 10); x.fill();
    text(x, '최종평가', cx, ry + 42, 50, { color: '#FFF', weight: 900 });
    const r = rng(77); for (let i = 0; i < 14; i++) { const px = cx - 320 + r() * 640, py = ry - 60 + r() * 520; if (Math.abs(px - cx) < 190 && py > t - 10) continue; x.fillStyle = r() < 0.5 ? '#F2C94C' : '#FFFFFF'; x.save(); x.translate(px, py); x.rotate(r()); x.fillRect(-7, -7, 14, 14); x.restore(); }
  }
  function photoFrame(x, cx, top, w, base, say) { // KIRD 캐릭터 포토존
    const h = w * 360 / 400;
    x.fillStyle = '#5E6870'; x.fillRect(cx - w * 0.3, top + h, 12, base - top - h); x.fillRect(cx + w * 0.3 - 12, top + h, 12, base - top - h);
    x.fillStyle = 'rgba(0,0,0,0.2)'; rr(x, cx - w / 2 - 16 + 6, top - 16 + 8, w + 32, h + 80, 20); x.fill();
    x.fillStyle = '#FFFFFF'; rr(x, cx - w / 2 - 16, top - 16, w + 32, h + 80, 20); x.fill(); x.strokeStyle = KB; x.lineWidth = 6; x.stroke();
    x.save(); rr(x, cx - w / 2, top, w, h, 12); x.clip(); x.drawImage(IMG.mascot, cx - w / 2, top, w, h); x.restore();
    text(x, say, cx, top + h + 32, 26, { color: '#1E3A5A', weight: 900 });
  }
  // ================================================================ 2026-11 v3 — the five 주제 맵, designed again from scratch.
  // Ground = walkable structures (TMAP_F in mapgen.js), each one a rule from the 「알고 계셨나요?」 pool, its short form engraved
  // on its face as a plaque. Behind: a fresh scene per map; every sign stands on posts that reach the ground, hangs from the
  // ceiling rail, or is pinned to the board — nothing floats. Text is always fitted to its box. Every label registers its
  // rectangle (REG) so tests/layout_check.js can prove nothing is cut off, hidden behind the ground, or on top of another.
  const TOP = id => TMAP_TOP[id];
  let REG = null;
  const reg = (layer, name, a, t, w, h, o) => { if (REG) REG.push(Object.assign({ layer, name, a: Math.round(a), t: Math.round(t), w: Math.round(w), h: Math.round(h) }, o || {})); };
  function fitSize(x, s, maxW, size, weight, font) { for (; size > 9; size--) { x.font = `${weight || 700} ${size}px ${font || FONT}`; if (x.measureText(s).width <= maxW) break; } return size; }
  function fitText(x, s, cx, cy, maxW, size, opt = {}) { const z = fitSize(x, s, maxW, size, opt.weight || 700, opt.font); text(x, s, cx, cy, z, opt); return z; }
  const SIGN = { head: 48, line: 36, pad: 14 };
  function signH(n) { return SIGN.head + n * SIGN.line + SIGN.pad * 2 - 6; }
  function signBoard(x, cx, top, w, title, lines, col) {
    const h = signH(lines.length), a = cx - w / 2;
    x.fillStyle = 'rgba(0,0,0,0.22)'; rr(x, a + 6, top + 8, w, h, 12); x.fill();
    x.fillStyle = '#FBFCFD'; rr(x, a, top, w, h, 12); x.fill();
    x.fillStyle = col; rr(x, a, top, w, SIGN.head, [12, 12, 0, 0]); x.fill();
    fitText(x, title, cx, top + SIGN.head / 2 + 1, w - 36, 28, { color: '#FFF', weight: 900 });
    lines.forEach((s, i) => {
      const y = top + SIGN.head + SIGN.pad + i * SIGN.line + SIGN.line / 2 - 3; x.fillStyle = col; x.beginPath(); x.arc(a + 24, y, 5, 0, 7); x.fill();
      const z = fitSize(x, s, w - 60, 24, 700); text(x, s, a + 40, y, z, { color: '#1E2A36', weight: 700, align: 'left' });
    });
    x.strokeStyle = 'rgba(30,42,54,0.35)'; x.lineWidth = 2; rr(x, a, top, w, h, 12); x.stroke();
    reg('back', title, a, top, w, h); return h;
  }
  const steel = (x, px) => hg(x, px - 7, px + 7, [[0, '#5E6870'], [0.5, '#C9D1D8'], [1, '#5E6870']]);
  function groundMin(id, a, b) { const f = TOP(id); let g = G; for (let px = a; px <= b; px += 10) g = Math.min(g, f(px)); return g; }
  function postSign(x, id, cx, w, title, lines, col, up) { // stands on two posts that go into the ground
    const f = TOP(id), h = signH(lines.length), top = groundMin(id, cx - w / 2, cx + w / 2) - (up || 150) - h;
    for (const px of [cx - w * 0.32, cx + w * 0.32]) { x.fillStyle = steel(x, px); x.fillRect(px - 7, top + h - 8, 14, f(px) - (top + h) + 48); }
    signBoard(x, cx, top, w, title, lines, col);
  }
  function hangSign(x, cx, top, w, title, lines, col, rail) { // hangs on two rods from the ceiling rail
    for (const px of [cx - w * 0.32, cx + w * 0.32]) { x.fillStyle = steel(x, px); x.fillRect(px - 4, rail, 8, top - rail + 6); x.fillStyle = '#3A444E'; x.fillRect(px - 12, top - 4, 24, 10); }
    signBoard(x, cx, top, w, title, lines, col);
  }
  function pinNote(x, cx, top, w, title, lines, col) { // a memo pinned on the cork board
    const h = signH(lines.length), a = cx - w / 2;
    x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(a + 6, top + 8, w, h); x.fillStyle = '#FFFDF2'; x.fillRect(a, top, w, h);
    x.fillStyle = col; x.fillRect(a, top + SIGN.head - 4, w, 4);
    fitText(x, title, cx, top + SIGN.head / 2 + 4, w - 40, 28, { color: col, weight: 900 });
    lines.forEach((s, i) => { const y = top + SIGN.head + SIGN.pad + i * SIGN.line + SIGN.line / 2 - 3, z = fitSize(x, s, w - 56, 24, 700); text(x, '✓', a + 24, y, 20, { color: col, weight: 900 }); text(x, s, a + 42, y, z, { color: '#1E2A36', weight: 700, align: 'left' }); });
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.arc(cx + 2, top + 5, 11, 0, 7); x.fill(); x.fillStyle = '#E3232B'; x.beginPath(); x.arc(cx, top + 2, 11, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.arc(cx - 3, top - 1, 4, 0, 7); x.fill();
    reg('back', title, a, top, w, h);
  }
  function frameOnPosts(x, id, cx, w, up, say) { // the KIRD characters in a frame on two posts (outdoor maps)
    const f = TOP(id), ih = w * 340 / 360, h = ih + 54, top = groundMin(id, cx - w / 2 - 14, cx + w / 2 + 14) - up - h;
    for (const px of [cx - w * 0.3, cx + w * 0.3]) { x.fillStyle = steel(x, px); x.fillRect(px - 6, top + h, 12, f(px) - (top + h) + 48); }
    x.fillStyle = 'rgba(0,0,0,0.2)'; rr(x, cx - w / 2 - 8, top - 6, w + 28, h + 20, 18); x.fill();
    x.fillStyle = '#FFFFFF'; rr(x, cx - w / 2 - 14, top - 14, w + 28, h + 20, 18); x.fill(); x.strokeStyle = KB; x.lineWidth = 5; x.stroke();
    x.save(); rr(x, cx - w / 2, top, w, ih, 10); x.clip(); x.drawImage(IMG.mascot, 20, 0, 360, 340, cx - w / 2, top, w, ih); x.restore();
    fitText(x, say, cx, top + ih + 24, w - 8, 24, { color: '#1E3A5A', weight: 900 });
    reg('back', say, cx - w / 2 - 14, top - 14, w + 28, h + 20);
  }
  function hangMascot(x, cx, top, bw, say, rail) { for (const px of [cx - bw * 0.3, cx + bw * 0.3]) { x.fillStyle = steel(x, px); x.fillRect(px - 3, rail, 6, top - rail); } mascotBanner(x, cx, top, bw, say); reg('back', say, cx - bw / 2, top, bw, bw * 1.32); }

  // ---- structures
  function fPoly(x, f, id) { // the band this structure shows: from its top down to the lower structures under it
    const [A, B] = featSpan(f), F = TMAP_F[id], below = px => { let h = 0; for (const g of F) if (g !== f && g.h < f.h) { const v = featH(g, px); if (v > h) h = v; } return G - h + (h ? 0 : 60); };
    const pts = []; for (let px = A; px <= B; px += 8) pts.push(px); pts.push(B);
    x.beginPath(); pts.forEach((px, i) => { const y = G - featH(f, px); i ? x.lineTo(px, y) : x.moveTo(px, y); });
    for (let i = pts.length - 1; i >= 0; i--) { const px = pts[i]; x.lineTo(px, Math.max(G - featH(f, px), below(px))); } x.closePath();
  }
  const bx = (x, a, b, t, stops) => { x.fillStyle = vg(x, t, G + 20, stops); x.fillRect(a, t - 4, b - a, G + 64 - t); };
  function treads(x, f, line) { if (f.k === 'dome') return; const [A, B] = featSpan(f); x.strokeStyle = line; x.lineWidth = 3; for (const [a, b] of [[A, f.a], [f.b, B]]) for (let y = G - (f.on || 0) - 2; y > G - f.h; y -= 22) { x.beginPath(); x.moveTo(a, y); x.lineTo(b, y); x.stroke(); } }
  function topLine(x, f, w, col) { const [A, B] = featSpan(f); x.lineJoin = 'round'; x.beginPath(); for (let px = A; px <= B; px += 8) x.lineTo(px, G - featH(f, px) + w / 2 - 2); x.lineWidth = w; x.strokeStyle = col; x.stroke(); }
  const BOOKC = [KB, KG, '#E9EDF1', '#C98A50', '#3B4A5A', '#9B6BC9', '#F2C230'];
  const ART = {
    // 진실의 전당
    shelf(x, f, A, B, t) { bx(x, A, B, t, [[0, '#9A6E46'], [1, '#5E3F26']]); treads(x, f, 'rgba(50,30,14,0.55)');
      for (let y0 = t + 14, row = 0; y0 + 44 < G; y0 += 60, row++) { if (row === 1) continue; let i = row * 3; for (let px = Math.max(8, f.a + 12); px < f.b - 26; px += 28, i++) { x.fillStyle = BOOKC[i % BOOKC.length]; x.fillRect(px, y0 + (i % 3) * 4, 22, 44 - (i % 3) * 4); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(px + 4, y0 + 18, 14, 4); } x.fillStyle = '#4A3018'; x.fillRect(Math.max(0, f.a), y0 + 44, f.b - Math.max(0, f.a), 8); } },
    podium(x, f, A, B, t) { bx(x, A, B, t, [[0, '#FFFFFF'], [1, '#C4CDD4']]); treads(x, f, 'rgba(90,100,110,0.4)'); x.fillStyle = f.on ? '#E9C46A' : KB; x.fillRect(f.a, t - 4, f.b - f.a, 12); },
    dais(x, f, A, B, t) { marble(x, A, t - 4, B, G + 60, 7 + f.h); treads(x, f, 'rgba(120,112,96,0.45)'); x.fillStyle = '#C9A55A'; x.fillRect(f.a, t - 4, f.b - f.a, 9); },
    ai(x, f, A, B, t) { bx(x, A, B, t, [[0, '#26384A'], [1, '#131C26']]); treads(x, f, 'rgba(127,209,199,0.35)'); x.strokeStyle = 'rgba(127,209,199,0.5)'; x.lineWidth = 2; for (let k = 0; k < 6; k++) { const px = f.a + 20 + k * 52; x.beginPath(); x.moveTo(px, t + 8); x.lineTo(px, t + 22); x.lineTo(px + 18, t + 22); x.stroke(); x.fillStyle = '#7FD1C7'; x.fillRect(px + 16, t + 19, 6, 6); } },
    sanc(x, f, A, B, t) { bx(x, A, B, t, [[0, '#8E2A2E'], [1, '#4E1418']]); treads(x, f, 'rgba(0,0,0,0.35)'); x.fillStyle = '#E9C46A'; x.fillRect(f.a, t - 4, W, 10); for (let px = f.a + 30; px < W; px += 90) { x.fillStyle = 'rgba(255,220,160,0.5)'; x.beginPath(); x.arc(px, t + 18, 4, 0, 7); x.fill(); } },
    // 증명의 노트
    ink(x, f, A, B, t) { x.fillStyle = hg(x, 0, f.b + 300, [[0, '#0E1E46'], [0.35, '#2B4BA0'], [0.55, '#16306E'], [1, '#0A1634']]); x.fillRect(A, t - 4, B - A, G + 64 - t); x.fillStyle = '#16181C'; x.fillRect(A, t - 4, f.b - A, 16); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(60, t + 14, 26, f.h - 20); },
    bound(x, f, A, B, t) { bx(x, A, B, t, [[0, '#FFFDF6'], [1, '#E3DAC2']]); x.strokeStyle = 'rgba(150,130,95,0.45)'; x.lineWidth = 1.2; for (let y = t + 16; y < G - 12; y += 5) { x.beginPath(); x.moveTo(A, y); x.lineTo(B, y); x.stroke(); } x.fillStyle = vg(x, t, t + 14, [[0, '#3C93DC'], [1, '#1D5E9E']]); x.fillRect(A, t - 4, B - A, 16); x.fillStyle = '#1D5E9E'; x.fillRect(A, G - 12, B - A, 80); },
    pageL(x, f, A, B, t) { bx(x, A, B, t, [[0, '#FFFDF6'], [1, '#E9E1CC']]); x.strokeStyle = 'rgba(70,130,200,0.35)'; x.lineWidth = 1.5; for (let y = t + 26; y < G; y += 26) { x.beginPath(); x.moveTo(A, y); x.lineTo(B, y); x.stroke(); } x.strokeStyle = 'rgba(220,60,60,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(f.a + 50, t); x.lineTo(f.a + 50, G); x.stroke(); },
    pageR(x, f, A, B, t) { ART.pageL(x, f, A, B, t); },
    stamp(x, f, A, B, t) { bx(x, A, B, t, [[0, '#C98A50'], [1, '#8A5A2A']]); x.fillStyle = '#C0392B'; x.fillRect(A, G - f.on - 16, B - A, 16); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(f.a + 14, t + 4, 10, f.h - f.on - 24); },
    whiteout(x, f, A, B, t) { bx(x, A, B, t, [[0, '#FFFFFF'], [1, '#CFD6DB']]); x.fillStyle = '#E3232B'; x.fillRect(A, t - 4, B - A, 14); x.fillRect(A, G - 12, B - A, 12); },
    box(x, f, A, B, t) { bx(x, A, B, t, [[0, '#D9B98C'], [1, '#A9855A']]); treads(x, f, 'rgba(90,60,30,0.4)'); x.fillStyle = '#B9966A'; x.fillRect(f.a, t - 4, W, 20); x.strokeStyle = 'rgba(90,60,30,0.45)'; x.lineWidth = 3; for (let px = f.a; px < W; px += 230) { x.beginPath(); x.moveTo(px, t); x.lineTo(px, G - (f.on || 0)); x.stroke(); } },
    // 예방의 실험동
    yard(x, f, A, B, t) { bx(x, A, B, t, [[0, '#6A5A40'], [1, '#3A3028']]); topLine(x, f, 26, '#5E9A44'); topLine(x, f, 8, '#8CC66A'); },
    shower(x, f, A, B, t) { bx(x, A, B, t, [[0, '#2E9E4F'], [1, '#1D6E36']]); treads(x, f, 'rgba(255,255,255,0.3)'); x.fillStyle = 'rgba(0,0,0,0.35)'; for (let px = f.a + 20; px < f.b - 20; px += 22) x.fillRect(px, t + 2, 12, 5); },
    labFloor(x, f, A, B, t) { bx(x, A, B, t, [[0, '#9AA3AB'], [1, '#6E7880']]); treads(x, f, 'rgba(255,255,255,0.4)'); MUTE = true; x.save(); labBlock(x, f.a, f.b, 1, f.h); x.restore(); MUTE = false; },
    labRoof(x, f, A, B, t) { bx(x, A, B, t, [[0, '#9AA3AB'], [1, '#6E7880']]); treads(x, f, 'rgba(255,255,255,0.4)'); MUTE = true; x.save(); x.translate(0, -f.on); labBlock(x, f.a, f.b, 1, f.h - f.on); x.restore(); MUTE = false; },
    drums(x, f, A, B, t) { bx(x, A, B, t, [[0, '#4A525A'], [1, '#2E343A']]); if (f.on) drum(x, (f.a + f.b) / 2, G - f.on, 76, f.h - f.on, '#F2C230'); else for (let px = f.a + 42, i = 0; px < f.b; px += 84, i++) drum(x, px, G, 78, f.h, i % 2 ? '#2E86D6' : '#F2C230'); },
    store(x, f, A, B, t) { bx(x, A, B, t, [[0, '#D9DDE0'], [1, '#A9B0B5']]); treads(x, f, 'rgba(60,70,80,0.4)'); hazardStripe(x, f.a, t - 4, f.b, 16); for (const dx of [f.a + 40, f.b - 160]) { x.fillStyle = vg(x, t + 24, G, [[0, '#F2C230'], [1, '#C99A18']]); x.fillRect(dx, t + 26, 120, f.h - 26); ghs(x, dx + 60, t + 26 + (f.h - 26) / 2, 40, dx < (f.a + f.b) / 2 ? 'flame' : 'excl'); } },
    ext(x, f, A, B, t) { x.fillStyle = hg(x, f.a, f.b, [[0, '#7A0F14'], [0.3, '#E8383F'], [0.45, '#FF8A8E'], [0.6, '#E8383F'], [1, '#6A0C10']]); x.fillRect(f.a, t - 4, f.b - f.a, f.h); const [a0, b0] = featSpan(f); x.fillStyle = '#7A848C'; x.fillRect(a0, t, f.a - a0, f.h); x.fillRect(f.b, t, b0 - f.b, f.h); treads(x, f, 'rgba(255,255,255,0.4)'); },
    waste(x, f, A, B, t) { bx(x, A, B, t, [[0, '#5E6870'], [1, '#3A424A']]); treads(x, f, 'rgba(255,255,255,0.25)'); ['#E8402E', '#2E86D6', '#F2C230', '#8CC63F'].forEach((c, i) => { x.fillStyle = c; x.fillRect(f.a + 16 + i * 52, t - 4, 40, 12); }); },
    // 신뢰의 집행실
    coins(x, f, A, B, t) { for (let y = G + 40, k = 0; y > t - 20; y -= 18, k++) { x.fillStyle = k % 2 ? '#E9C46A' : '#C9972B'; x.fillRect(A, y - 18, B - A, 18); x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(A, y - 16, B - A, 3); } x.strokeStyle = 'rgba(120,80,20,0.3)'; x.lineWidth = 2; for (let px = 6; px < B; px += 14) { x.beginPath(); x.moveTo(px, t); x.lineTo(px, G + 40); x.stroke(); } },
    card(x, f, A, B, t) { x.fillStyle = hg(x, A, B, [[0, '#2E86D6'], [1, '#2AA37A']]); x.fillRect(A, t - 4, B - A, G + 64 - t); const ang = Math.atan2(-f.h, f.a - A); x.save(); x.translate(A + 240, G - 30); x.rotate(ang); x.fillStyle = '#F2C94C'; rr(x, 0, -40, 64, 46, 8); x.fill(); x.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 4; k++) x.fillRect(110 + k * 70, -22, 52, 10); x.restore(); },
    roll(x, f) { x.fillStyle = rg(x, f.c - 120, G - 110, 20, f.w, [[0, '#FFFFFF'], [0.8, '#EDEAE2'], [1, '#C9C4B8']]); x.fillRect(f.c - f.w, G - f.h - 4, 2 * f.w, f.h + 70); x.strokeStyle = 'rgba(150,140,120,0.35)'; x.lineWidth = 1.5; for (let k = 60; k < f.w; k += 16) { x.beginPath(); x.ellipse(f.c, G + 30, k, k * 0.36, 0, Math.PI, 0); x.stroke(); } },
    calc(x, f, A, B, t) { bx(x, A, B, t, [[0, '#3A4652'], [1, '#1C242C']]); treads(x, f, 'rgba(255,255,255,0.2)'); const kw = (f.b - f.a - 40) / 10; for (let c = 0; c < 10; c++) { if (c > 1 && c < 8) continue; for (let r2 = 0; r2 < 3; r2++) { x.fillStyle = c === 9 ? '#E8913C' : '#5A6672'; rr(x, f.a + 22 + c * kw, t + 22 + r2 * 38, kw - 10, 28, 5); x.fill(); } } },
    crate(x, f, A, B, t) { bx(x, A, B, t, [[0, '#C99A5A'], [1, '#8A6230']]); treads(x, f, 'rgba(70,45,15,0.45)'); x.strokeStyle = 'rgba(70,45,15,0.5)'; x.lineWidth = 3; for (let px = f.a; px <= f.b; px += 50) { x.beginPath(); x.moveTo(px, t); x.lineTo(px, G); x.stroke(); } x.strokeRect(f.a + 2, t + 2, f.b - f.a - 4, f.h - 2); },
    safe(x, f, A, B, t) { bx(x, A, B, t, [[0, '#8794A0'], [1, '#3F4A55']]); treads(x, f, 'rgba(255,255,255,0.3)'); x.fillStyle = '#2A333B'; x.fillRect(f.a, t - 4, W, 10); for (let px = f.a + 24; px < W; px += 60) { x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.arc(px, t + 20, 4, 0, 7); x.fill(); }
      if (f.on) { const cx = (f.a + W) / 2, cy = t + 62; x.fillStyle = '#C9D1D8'; x.beginPath(); x.arc(cx, cy, 30, 0, 7); x.fill(); x.strokeStyle = '#2A333B'; x.lineWidth = 5; x.stroke(); for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 40 * Math.cos(k * Math.PI / 2 + 0.6), cy + 40 * Math.sin(k * Math.PI / 2 + 0.6)); x.stroke(); } } },
    // 혁신의 능선 (grass = the map's own soil and turf)
    grass() {},
  };
  const PLAQUE = { scale: ['#F3E2B0', '#9C7430', '#3E2A0E'], notebook: ['#FFFFFF', '#1F3A93', '#1F3A93'], lab: ['#F2C230', '#1A1A1A', '#1A1A1A'], archive: ['#B9E3C4', '#1E3A2A', '#1E3A2A'], ridge: ['#F4F2EC', '#6B5E44', '#3E3424'] };
  function plaque(x, f, st) { // the rule engraved on the structure's face
    const L = f.lab; if (!L) return; let cx, cy, w, hmax;
    if (f.lx != null) { cx = f.lx; cy = G - f.ly; w = f.lw; hmax = 2 * f.ly - 16; }
    else { const a = Math.max(24, f.a), b = Math.min(W - 24, f.b), bt = G - f.h, bb = G - (f.on || 0); cx = (a + b) / 2; cy = (bt + bb) / 2 + 3; w = Math.min(b - a - 30, 780); hmax = bb - bt - 24; }
    const n = L.length; let z = Math.min(34, Math.floor((hmax - 12) / n / 1.2)); for (const s of L) z = Math.min(z, fitSize(x, s, w - 36, z, 900));
    let tw = 0; x.font = `900 ${z}px ${FONT}`; for (const s of L) tw = Math.max(tw, x.measureText(s).width);
    const pw = tw + 36, ph = n * z * 1.2 + 12, a = cx - pw / 2, t = cy - ph / 2;
    x.fillStyle = 'rgba(0,0,0,0.3)'; rr(x, a + 3, t + 4, pw, ph, 8); x.fill();
    x.fillStyle = st[0]; rr(x, a, t, pw, ph, 8); x.fill(); x.strokeStyle = st[1]; x.lineWidth = 3; x.stroke();
    L.forEach((s, i) => text(x, s, cx, t + 6 + z * 1.2 * (i + 0.5) + 1, z, { color: st[2], weight: 900 }));
    reg('solid', L.join(' / '), a, t, pw, ph, { size: z });
  }
  function paintFeatures(x, id) {
    const F = TMAP_F[id].slice().sort((p, q) => p.h - q.h);
    for (const f of F) { const [A, B] = featSpan(f); x.save(); fPoly(x, f, id); x.clip(); ART[f.art](x, f, A, B, G - f.h); x.restore(); }
    for (const f of F) plaque(x, f, PLAQUE[id]);
  }

  // ---- 진실의 전당 (연구윤리): a hall of marble columns and tall windows; the signs hang from the ceiling rail
  S.scale = {
    veil: 'rgba(236,240,244,0.22)', ceil: '#4A5560',
    back(x) {
      x.fillStyle = vg(x, 0, G, [[0, '#E9EEF1'], [1, '#CDD5DB']]); x.fillRect(0, 0, W, H);
      for (let cx = 400; cx < W; cx += 800) { x.fillStyle = vg(x, 240, 900, [[0, '#8FC3EA'], [1, '#E6F2F8']]); rr(x, cx - 170, 240, 340, 660, [170, 170, 0, 0]); x.fill(); x.strokeStyle = '#F7F5F0'; x.lineWidth = 14; x.stroke(); x.lineWidth = 8; x.beginPath(); x.moveTo(cx, 240); x.lineTo(cx, 900); x.moveTo(cx - 170, 560); x.lineTo(cx + 170, 560); x.stroke(); }
      x.fillStyle = vg(x, G - 250, G, [[0, '#B9C4CC'], [1, '#A3AFB8']]); x.fillRect(0, G - 250, W, 250); x.fillStyle = '#8E9AA4'; x.fillRect(0, G - 256, W, 8);
      for (let cx = 0; cx <= W; cx += 800) columnBack(x, cx, G + 40, 1110, 84);
      x.fillStyle = '#4A5560'; x.fillRect(0, 0, W, 76); x.fillStyle = '#2F3A44'; x.fillRect(0, 76, W, 12);
      const R = 88;
      hangSign(x, 760, 430, 540, '이런 것도 부정행위', ['연구비를 용도와 다르게 사용', '거짓으로 과제 신청 · 수행', '보안사항 누설 · 유출', '제보자에게 불이익 주기'], '#B5553C', R);
      hangSign(x, 1400, 520, 460, '저자 표시', ['기여한 사람을 빼면 부당', '기여 없는 사람을 넣어도 부당', '특수관계자는 미리 보고'], '#1D5E9E', R);
      hangMascot(x, 2020, 430, 190, '연구윤리 지킴이', R);
      // 정의의 저울: post, beam and pans over the three-step dais
      const cx = 2800, bt = 520, top = G - 260;
      x.fillStyle = hg(x, cx - 18, cx + 18, [[0, '#6E4E1E'], [0.5, '#E9C46A'], [1, '#6E4E1E']]); x.fillRect(cx - 16, bt, 32, top - bt + 20);
      x.fillStyle = vg(x, bt - 14, bt + 14, [[0, '#F2D27A'], [1, '#9C7430']]); rr(x, cx - 330, bt - 14, 660, 28, 14); x.fill();
      for (const px of [cx - 300, cx + 300]) { x.strokeStyle = '#9C7430'; x.lineWidth = 4; x.beginPath(); x.moveTo(px, bt + 12); x.lineTo(px - 70, bt + 190); x.moveTo(px, bt + 12); x.lineTo(px + 70, bt + 190); x.stroke(); x.fillStyle = vg(x, bt + 186, bt + 230, [[0, '#F2D27A'], [1, '#8A6418']]); x.beginPath(); x.ellipse(px, bt + 190, 84, 34, 0, 0, Math.PI); x.fill(); x.fillRect(px - 84, bt + 184, 168, 8); }
      x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(cx, bt - 56, 44, 0, 7); x.fill(); x.strokeStyle = '#C9973E'; x.lineWidth = 6; x.stroke(); kMark(x, cx, bt - 56, 48);
      reg('back', '정의의 저울', cx - 390, bt - 104, 780, 340);
      hangSign(x, 3900, 500, 500, 'AI와 연구윤리', ['AI는 도구, 책임은 연구자', '심사 자료는 외부 AI에 넣지 않기'], '#1F6F78', R);
      hangSign(x, 4780, 400, 540, '부정행위의 제재', ['참여제한 최대 10년', '2027년 3월부터 최대 20년', '제재부가금 5배 → 30배', '관련 연구비는 환수'], '#8E2A2E', R);
    },
    solid(x) {
      x.fillStyle = vg(x, G, H, [[0, '#A7B2BA'], [0.1, '#8B979F'], [1, '#4E585F']]); x.fillRect(0, 800, W, H - 800);
      x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 2; for (let px = 0; px < W; px += 160) { x.beginPath(); x.moveTo(px, G); x.lineTo(px, H); x.stroke(); }
      paintFeatures(x, 'scale');
    },
    front() {},
  };

  // ---- 증명의 노트 (연구노트): on a desk, under a cork board; the rules are memos pinned to the board
  S.notebook = {
    veil: 'rgba(246,240,228,0.20)', ceil: '#EFE7D8',
    back(x) {
      x.fillStyle = vg(x, 0, G, [[0, '#EFE7D8'], [1, '#DDD2BE']]); x.fillRect(0, 0, W, H);
      x.fillStyle = '#7A5634'; x.fillRect(0, 340, W, 420); x.fillStyle = vg(x, 356, 744, [[0, '#C9925A'], [1, '#B07A44']]); x.fillRect(0, 356, W, 388);
      const r = rng(5); x.fillStyle = 'rgba(90,55,25,0.18)'; for (let i = 0; i < 900; i++) x.fillRect(r() * W, 356 + r() * 388, 3, 2);
      x.fillStyle = vg(x, G - 190, G, [[0, '#CDBFA6'], [1, '#B9A98C']]); x.fillRect(0, G - 190, W, 190); x.fillStyle = '#A39274'; x.fillRect(0, G - 196, W, 8);
      pinNote(x, 620, 420, 500, '이렇게 써요', ['객관적인 사실만', '제3자가 재현할 수 있게', '그날 바로 기록'], '#1F3A93');
      pinNote(x, 1450, 450, 500, '고칠 때는', ['수정액으로 지우지 않기', '고치면 서명과 날짜', '빈 공간에는 사선'], '#C0392B');
      x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(2106, 396, 208, 290); mascotBanner(x, 2200, 390, 200, '연구노트 쓰는 날'); x.fillStyle = '#E3232B'; x.beginPath(); x.arc(2200, 392, 11, 0, 7); x.fill(); reg('back', '연구노트 쓰는 날', 2100, 390, 200, 264);
      pinNote(x, 3300, 400, 540, '서명', ['항상 날짜와 함께', '확인자 서명은 1~2주 안에', '확인자는 공동연구자가 아닌 사람'], '#2E7D4F');
      pinNote(x, 4420, 440, 540, '보존', ['과제 종료일부터 30년', '과제에서 빠져도 담당부서에 제출', '유출 · 양도 · 매매 금지'], '#8A5A1C');
      // the fountain pen standing in the ink bottle, and the signature stamp's handle
      x.save(); x.translate(170, G - 160); x.rotate(0.22); x.fillStyle = hg(x, -16, 16, [[0, '#0B1016'], [0.4, '#4A5A6C'], [1, '#0B1016']]); x.fillRect(-16, -330, 32, 340); x.fillStyle = '#E9C46A'; x.fillRect(-17, -250, 34, 12); poly(x, [[-16, -330], [16, -330], [0, -392]]); x.fill(); x.restore(); reg('back', '만년필', 40, G - 560, 180, 400);
      x.fillStyle = hg(x, 3260, 3340, [[0, '#6E3B10'], [0.5, '#C98A50'], [1, '#6E3B10']]); rr(x, 3262, G - 400, 76, 140, [30, 30, 6, 6]); x.fill(); reg('back', '도장 손잡이', 3262, G - 400, 76, 130);
    },
    solid(x) {
      x.fillStyle = vg(x, G, H, [[0, '#9A6A40'], [0.08, '#7A4E2C'], [1, '#3E2614']]); x.fillRect(0, 800, W, H - 800);
      const r = rng(17); x.strokeStyle = 'rgba(30,15,5,0.22)'; x.lineWidth = 2; for (let y = G + 20; y < H; y += 20 + r() * 14) { x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= W; px += 80) x.lineTo(px, y + Math.sin(px / 340 + y) * 6); x.stroke(); }
      paintFeatures(x, 'notebook');
    },
    front() {},
  };

  // ---- 예방의 실험동 (연구실 안전): the yard outside the lab block; safety signs stand on posts
  S.lab = {
    veil: 'rgba(222,236,246,0.20)',
    back(x) {
      skyDay(x); clouds(x, [[500, 200, 80], [1900, 150, 90], [3300, 230, 70], [4700, 170, 85]]);
      wave(x, 900, 60, 520, 26, 150, '#B7D3C0'); wave(x, 1000, 40, 300, 18, 110, '#9FC3A8');
      x.fillStyle = '#8A949C'; for (let px = 0; px < W; px += 90) x.fillRect(px, G - 150, 8, 150); x.fillRect(0, G - 150, W, 8); x.fillRect(0, G - 80, W, 6);
      const GR = '#1D7A3E', RD = '#B5343A', YL = '#9A7410';
      postSign(x, 'lab', 570, 560, '안전교육', ['신규 (진단대상 연구실) 6개월 안에 8시간', '학생은 참여 후 3개월 안에 2시간', '정기 (진단대상 연구실) 반기마다 6시간', '온라인은 60점 이상이어야 이수'], GR, 130);
      // emergency shower over the green pad
      { const px = 1040, t = G - 70; x.strokeStyle = '#1D7A3E'; x.lineWidth = 12; x.lineJoin = 'round'; x.beginPath(); x.moveTo(px, t + 30); x.lineTo(px, t - 300); x.lineTo(px - 90, t - 300); x.stroke(); x.fillStyle = '#1D7A3E'; x.beginPath(); x.ellipse(px - 90, t - 286, 46, 14, 0, 0, 7); x.fill();
        x.fillStyle = '#0B8A43'; rr(x, px - 150, t - 390, 190, 56, 8); x.fill(); fitText(x, '비상샤워', px - 55, t - 361, 160, 30, { color: '#FFF', weight: 900 }); reg('back', '비상샤워', px - 150, t - 390, 190, 110); }
      postSign(x, 'lab', 2740, 480, '점검과 위험분석', ['일상점검 · 매일 1회, 연구 시작 전', '사전유해인자위험분석 · 연구 전', '연구가 크게 바뀌면 다시'], YL, 150);
      postSign(x, 'lab', 3640, 440, '사고가 나면', ['눈 · 피부 · 15분 이상 물로', '금수성 물질은 물 금지', '감전 · 전원부터 끄기'], RD, 150);
      // the extinguisher's valve, lever and hose above the red body
      { const cx = 4250, t = G - 260; x.fillStyle = hg(x, cx - 30, cx + 30, [[0, '#3A3A3A'], [0.5, '#8A8A8A'], [1, '#2A2A2A']]); x.fillRect(cx - 30, t - 56, 60, 60); x.fillStyle = '#1A1A1A'; rr(x, cx - 110, t - 78, 220, 24, 8); x.fill();
        x.strokeStyle = '#1A1A1A'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - 26, t - 44); x.bezierCurveTo(cx - 170, t - 50, cx - 180, t + 40, cx - 130, t + 96); x.stroke(); x.lineCap = 'butt';
        x.strokeStyle = '#F2C230'; x.lineWidth = 6; x.beginPath(); x.arc(cx + 60, t - 92, 16, 0, 7); x.stroke(); reg('back', '소화기 밸브', cx - 185, t - 112, 300, 110); }
      postSign(x, 'lab', 4800, 460, '과태료', ['점검 · 교육 · 검진 안 하면 최대 1천만 원', '사고 미보고 · 거짓 보고 최대 500만 원'], '#5E4A8A', 170);
    },
    solid(x) { concrete(x, 0, W, 800, H, 8); hazardStripe(x, 0, G, W, 12); paintFeatures(x, 'lab'); },
    front(x, surface) { const r = rng(4); for (const tx of [60, 170]) tree(x, tx, surface(tx) + 6, 120 + r() * 30, r, tx === 170 ? 'pine' : 'dark'); },
  };

  // ---- 신뢰의 집행실 (연구비 관리): the finance office at night — filing cabinets along the wall, signs on the ceiling rail
  S.archive = {
    veil: 'rgba(16,24,34,0.22)', ceil: '#1C2733',
    back(x) {
      x.fillStyle = vg(x, 0, G, [[0, '#243242'], [1, '#3E4E5E']]); x.fillRect(0, 0, W, H);
      for (let a = 40; a < W; a += 330) { x.fillStyle = vg(x, 700, G, [[0, '#6E7C88'], [1, '#4A5662']]); x.fillRect(a, 700, 300, G - 700); for (let y = 716; y < G - 40; y += 104) { x.fillStyle = '#56636F'; x.fillRect(a + 12, y, 276, 92); x.fillStyle = '#C9D1D8'; x.fillRect(a + 120, y + 14, 60, 10); x.fillStyle = '#E9DCC0'; x.fillRect(a + 100, y + 38, 100, 30); } }
      x.fillStyle = '#1C2733'; x.fillRect(0, 0, W, 76); x.fillStyle = '#0F1720'; x.fillRect(0, 76, W, 12);
      for (let lx = 300; lx < W; lx += 650) { x.fillStyle = '#0F1720'; x.fillRect(lx - 3, 88, 6, 120); x.fillStyle = '#E8F4FF'; x.beginPath(); x.ellipse(lx, 214, 60, 16, 0, 0, 7); x.fill(); x.fillStyle = vg(x, 220, 760, [[0, 'rgba(220,240,255,0.16)'], [1, 'rgba(220,240,255,0)']]); poly(x, [[lx - 60, 220], [lx + 60, 220], [lx + 250, 760], [lx - 250, 760]]); x.fill(); }
      const R = 88;
      hangSign(x, 640, 420, 580, '연구혁신비 (2026.6.11 신설)', ['한도 · 재료비+활동비 합의 10%', '재료비 용도 · 한 건에 300만 원까지', '활동비 용도 · 한 건에 50만 원까지', '증빙 · 카드전표 + 입력한 사용목적'], '#1D5E9E', R);
      hangMascot(x, 1500, 430, 180, '증빙은 꼼꼼히', R);
      hangSign(x, 2500, 440, 560, '회의비', ['같은 과제 참여자끼리만 · 식비 불가', '다른 기관 참여자와 함께 · 가능', '10만 원 이하 · 기록으로 대신 가능'], '#2E7D4F', R);
      hangSign(x, 3450, 520, 500, '출장비', ['두 여비규정 섞어 쓰기 금지', '식사를 제공받으면 그만큼 빼기', '국외 · 계획서 + 결과보고서'], '#8A5A1C', R);
      hangSign(x, 4520, 430, 520, '연구비로 쓸 수 없어요', ['술 같은 유흥성 비용', '평일 점심값 (연구인력 지원비)', '학위과정 비용 · 종신 학회비'], '#8E2A2E', R);
    },
    solid(x) { noiseBand(x, 0, W, 800, H, [[0, '#5C6670'], [0.08, '#48515A'], [1, '#2C3238']], 41); paintFeatures(x, 'archive'); },
    front() {},
  };

  // ---- 혁신의 능선 (국가연구개발혁신법): 출발 → 선정평가관 → 수행 → 단계평가 게이트 → 수행 → 최종평가 단상 → 성과
  S.ridge = {
    veil: 'rgba(236,244,250,0.12)',
    back(x) {
      skyDay(x); clouds(x, [[420, 170, 80], [1700, 120, 70], [3500, 140, 90], [4800, 200, 70]]);
      wave(x, 820, 60, 430, 40, 170, '#B4CEDD'); wave(x, 930, 50, 300, 30, 120, '#9DBFA8');
      const T = TOP('ridge');
      postSign(x, 'ridge', 330, 420, '3책5공', ['동시에 최대 5개 과제', '그중 연구책임자로 3개까지'], '#1D5E9E', 190);
      selectionHall(x, 950, T(950)); reg('back', '선정평가관', 600, T(950) - 550, 700, 300);
      postSign(x, 'ridge', 1700, 440, '협약', ['통보받은 날부터 30일 안에', '안전교육 이수확인서 첨부'], '#2E7D4F', 170);
      statuePillar(x, 2040, T(2040) - 400, 82, T(2040) + 30, 'blue', '도전하는 연구'); reg('back', '도전하는 연구', 1940, T(2040) - 500, 200, 250);
      stageGate(x, 2600, T(2600)); reg('back', '단계평가 게이트', 2170, T(2600) - 662, 860, 420);
      statuePillar(x, 3160, T(3160) - 400, 82, T(3160) + 30, 'green', '함께하는 연구'); reg('back', '함께하는 연구', 3060, T(3160) - 500, 200, 250);
      postSign(x, 'ridge', 3520, 440, '평가', ['이의신청 · 10일 안에 한 번', "단계평가 '극히 불량'이면 중단"], '#8A5A1C', 170);
      finalStage(x, 4250, T(4250)); reg('back', '최종평가', 3920, T(4250) - 640, 660, 500);
      postSign(x, 'ridge', 4900, 440, '성과', ['최종보고서 · 종료 후 60일까지', '3개월 안에 보고서 · 성과목록 공개'], '#B5343A', 150);
    },
    solid(x) {
      noiseBand(x, 0, W, 600, H, [[0, '#8A6A44'], [0.3, '#6E5236'], [1, '#3E2E1E']], 51); strata(x, 0, W, 760, H, 'rgba(40,26,14,0.22)', 5);
      x.lineJoin = 'round'; ridgeLine(x, 22); x.lineWidth = 64; x.strokeStyle = '#4F8A3E'; x.stroke(); ridgeLine(x, 4); x.lineWidth = 22; x.strokeStyle = '#7DB85A'; x.stroke();
      const r = rng(17); x.fillStyle = 'rgba(160,150,135,0.55)'; for (let i = 0; i < 40; i++) { const px = r() * W, py = G + 60 + r() * 240; x.beginPath(); x.ellipse(px, py, 22 + r() * 30, 12 + r() * 14, 0, 0, 7); x.fill(); }
      paintFeatures(x, 'ridge');
    },
    front(x, surface) {
      for (const px of [60, 150, W - 70]) tree(x, px, surface(px) + 6, px % 2 ? 190 : 150, 0, 'pine');
      const r = rng(23); for (let i = 0; i < 70; i++) { const px = 300 + r() * (W - 600); if (px > 3880 && px < 4620) continue; const y = surface(px); x.fillStyle = ['#FFFFFF', '#FFD24A', '#F59AB8'][i % 3]; x.beginPath(); x.arc(px, y + 4, 5, 0, 7); x.fill(); }
    },
  };

  function layout(id) { // every label's rectangle, for tests/layout_check.js
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d'); };
    REG = []; S[id].back(mk()); S[id].solid(mk()); const out = REG; REG = null; return out;
  }

  function paint(x, m) { // after the base colours: the art clipped to the solid pixels, then the decorations
    const S1 = S[m.mapId], surface = (px, from) => { const y = maskSurface(m.mask, m.W, m.H, px, from || 0); return y < 0 ? m.H : y; };
    x.save(); x.globalCompositeOperation = 'source-atop'; S1.solid(x); x.restore();
    x.save(); S1.front(x, surface); x.restore();
  }
  const BACK_RES = 1; // backdrop pixels per world px (was 0.5: twice as sharp now, same size as the terrain picture)
  function backdrop(m) { // the scene behind the terrain
    const k = BACK_RES, c = document.createElement('canvas'); c.width = Math.round(m.W * k); c.height = Math.round(m.H * k); const x = c.getContext('2d'); x.scale(k, k); S[m.mapId].back(x);
    const veil = S[m.mapId].veil; if (veil) { x.fillStyle = veil; x.fillRect(0, 0, W, H); } // push the scenery back so the solid ground stands out
    c.k = k; return c;
  }
  return { has: id => !!S[id], paint, backdrop, layout, beacons: id => (S[id] && S[id].beacons) || [], ceil: id => S[id] && S[id].ceil, stamp, flame };
})();
