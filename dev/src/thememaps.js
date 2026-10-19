// ============================================================== KIRD 주제 맵 그림 (연구윤리 · 연구노트 · 연구실 안전 · 연구비 관리)
// The shapes live in mapgen.js (TMAPGEN); this paints them: a backdrop behind the terrain, the solid art (clipped to the mask),
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
  function text(x, s, px, py, size, opt = {}) {
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
      x.save(); x.globalAlpha = alpha || 0.95; x.filter = 'blur(6px)';
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

  const S = {};
  // ---------------------------------------------------------------- 정의의 저울 (연구윤리)
  function labRoomE(x, a, top, b, bot, floor) { return labRoom(x, a, top, b, bot, floor); }
  S.scale = {
    back(x) {
      x.fillStyle = rg(x, CX, 560, 20, 700, [[0, 'rgba(255,248,220,0.7)'], [0.35, 'rgba(255,236,190,0.3)'], [1, 'rgba(255,236,190,0)']]); x.fillRect(CX - 700, 0, 1400, G);
      x.fillStyle = '#9DBFA8'; x.beginPath(); x.moveTo(0, G - 120); for (let px = 0; px <= W; px += 40) x.lineTo(px, G - 170 - Math.sin(px / 520) * 60 - Math.sin(px / 190) * 14); x.lineTo(W, G); x.lineTo(0, G); x.fill();
      x.save(); x.globalAlpha = 0.82;
      const base = G - 120, top = base - 520;
      x.fillStyle = '#EDE8DC'; x.fillRect(1450, base - 30, 2300, 30);
      for (let i = 0; i < 10; i++) { const cx = 1560 + i * 231; if (Math.abs(cx - CX) < 150) continue; columnBack(x, cx, base - 30, 470, 70); }
      x.fillStyle = vg(x, top - 30, top + 40, [[0, '#F6F2E8'], [1, '#D8D1C2']]); x.fillRect(1420, top - 30, 2360, 70);
      x.fillStyle = '#E4DED1'; poly(x, [[1400, top - 30], [CX, top - 250], [3800, top - 30]]); x.fill();
      x.strokeStyle = '#CFC7B6'; x.lineWidth = 8; poly(x, [[1440, top - 34], [CX, top - 236], [3760, top - 34]]); x.stroke();
      text(x, '정직 · 책임', CX - 420, top + 6, 44, { color: '#7A6440', weight: 900, ls: 10 }); text(x, '공정 · 관리', CX + 420, top + 6, 44, { color: '#7A6440', weight: 900, ls: 10 });
      kMark(x, CX, top - 110, 84);
      x.restore();
      x.fillStyle = vg(x, G - 600, G, [[0, 'rgba(247,235,211,0)'], [1, 'rgba(247,235,211,0.35)']]); x.fillRect(0, G - 600, W, 600);
    },
    solid(x) {
      noiseBand(x, 0, W, G, H, [[0, '#B6AC9C'], [0.15, '#8E8474'], [1, '#5E564B']], 3); blocks(x, 0, W, G + 26, H, 'rgba(50,42,34,0.35)');
      marble(x, 0, G, W, G + 26, 2);
      both(x, () => { x.fillStyle = vg(x, G - 300, G, [[0, '#7A9A52'], [0.08, '#6E5A3E'], [1, '#5A4A36']]); x.fillRect(0, G - 310, 480, 310); });
      kirdBlock(x, 520, 1180, 3, 120, { room: labRoomE });
      kirdBlock(x, mx(1180), mx(520), 3, 120, { room: labRoomE, louvre: [mx(1180) + 470, mx(520) - 20, G - 370] });
      mascotBanner(x, (mx(1180) + 470 + mx(520) - 20) / 2, G - 330, 110, '연구윤리 지킴이');
      [[1460, 40], [1760, 80], [2130, 125]].forEach(([a, hgt], i) => marble(x, a, G - hgt, mx(a), G - hgt + 46, 20 + i));
      x.fillStyle = vg(x, G - 290, G - 125, [[0, '#4C5560'], [1, '#2B3138']]); x.fillRect(2370, G - 290, 460, 165);
      x.fillStyle = '#5F6974'; x.fillRect(2350, G - 300, 500, 18);
      x.fillStyle = bronze(x, G - 250, G - 170); rr(x, 2440, G - 252, 320, 84, 6); x.fill();
      text(x, '연구윤리', CX, G - 226, 34, { color: '#3A2810', weight: 900, ls: 6 });
      text(x, 'RESEARCH INTEGRITY', CX, G - 188, 18, { color: '#3A2810', weight: 700, ls: 4 });
      x.fillStyle = bronzeH(x, 2550, 2650); x.fillRect(2550, G - 730, 100, 440);
      x.strokeStyle = 'rgba(60,40,10,0.35)'; x.lineWidth = 2; for (let k = 1; k < 5; k++) { x.beginPath(); x.moveTo(2556 + k * 17.6, G - 700); x.lineTo(2556 + k * 17.6, G - 320); x.stroke(); }
      x.fillStyle = bronzeH(x, 2520, 2680); rr(x, 2518, G - 332, 164, 38, 8); x.fill(); rr(x, 2526, G - 744, 148, 34, 8); x.fill();
      x.fillStyle = bronze(x, G - 776, G - 746); x.fillRect(1850, G - 790, 1500, 44);
      for (const ex of [1880, 3320]) { x.fillStyle = '#5E4018'; x.beginPath(); x.arc(ex, G - 759, 8, 0, 7); x.fill(); }
      x.fillStyle = bronze(x, G - 900, G - 772); x.fillRect(CX - 50, G - 900, 100, 130);
      x.fillStyle = 'rgba(255,250,220,0.8)'; x.beginPath(); x.arc(CX - 9, G - 878, 9, 0, 7); x.fill();
      for (const pc of [1880, 3320]) {
        const py = G - 390; x.fillStyle = bronze(x, py - 10, py + 70); x.fillRect(pc - 240, py - 4, 480, 84);
        x.fillStyle = 'rgba(255,240,190,0.7)'; x.fillRect(pc - 228, py, 456, 4);
        x.strokeStyle = 'rgba(70,45,15,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(pc - 190, py + 22); x.quadraticCurveTo(pc, py + 40, pc + 190, py + 22); x.stroke();
      }
    },
    front(x, surface) {
      for (const pc of [1880, 3320]) {
        const top = [pc, G - 740], py = G - 390;
        for (const dx of [-215, 0, 215]) {
          x.strokeStyle = '#7A5A26'; x.lineWidth = 5; x.setLineDash([12, 6]); x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(pc + dx, py); x.stroke();
          x.strokeStyle = '#E7C77A'; x.lineWidth = 2; x.beginPath(); x.moveTo(top[0], top[1]); x.lineTo(pc + dx, py); x.stroke(); x.setLineDash([]);
        }
      }
      logoPlate(x, 850, G - 404, 40);
      const r = rng(31);
      both(x, () => { for (const tx of [90, 210, 330]) tree(x, tx, surface(tx, 600) + 4, 110 + r() * 40, r, tx === 210 ? 'pine' : 'dark'); tree(x, 1330, G + 2, 130, r, 'light'); });
      both(x, () => { for (const lx of [1270, 1420]) { x.strokeStyle = '#4A535B'; x.lineWidth = 4; x.beginPath(); x.moveTo(lx, G); x.lineTo(lx, G - 100); x.stroke(); x.fillStyle = '#F7F3D8'; x.beginPath(); x.arc(lx, G - 104, 8, 0, 7); x.fill(); } });
      both(x, () => grassTop(x, [[0, G - 300], [120, G - 290], [260, G - 230], [360, G - 150], [430, G - 60]], '#6FA34E'));
    },
  };

  // ---------------------------------------------------------------- 연구노트 (연구윤리)
  S.notebook = {
    ceil: '#E9E2D4',
    back(x) {
      x.fillStyle = vg(x, 0, G, [[0, '#E9E2D4'], [1, '#D9CFBC']]); x.fillRect(0, 0, W, H);
      x.fillStyle = vg(x, G - 260, G, [[0, '#B98F62'], [1, '#8C6640']]); x.fillRect(0, G - 260, W, 260);
      x.fillStyle = 'rgba(60,35,15,0.25)'; for (let px = 0; px < W; px += 260) x.fillRect(px, G - 260, 4, 260); x.fillStyle = '#D9B98C'; x.fillRect(0, G - 268, W, 10);
      const wa = 1150, wb = 4050, wt = 240, wbm = G - 300;
      x.fillStyle = vg(x, wt, wbm, [[0, '#6FAEE0'], [0.7, '#BFDDF0'], [1, '#E8F2EC']]); x.fillRect(wa, wt, wb - wa, wbm - wt);
      clouds(x, [[1600, 380, 90], [2900, 330, 110], [3700, 420, 70]], 0.9);
      x.fillStyle = '#8DB59A'; x.beginPath(); x.moveTo(wa, wbm - 90); for (let px = wa; px <= wb; px += 30) x.lineTo(px, wbm - 120 - Math.sin(px / 300) * 40 - Math.sin(px / 90) * 8); x.lineTo(wb, wbm); x.lineTo(wa, wbm); x.fill();
      for (const [a, b, h] of [[1500, 2100, 150], [2950, 3600, 210]]) { x.fillStyle = '#F2F4F5'; x.fillRect(a, wbm - h, b - a, h); x.fillStyle = '#5E9BA3'; for (let y = wbm - h + 24; y < wbm - 20; y += 44) x.fillRect(a + 10, y, b - a - 20, 16); }
      x.fillStyle = '#D58A55'; x.fillRect(3480, wbm - 250, 80, 250);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(wa, wt, wb - wa, wbm - wt);
      x.strokeStyle = '#F7F5F0'; x.lineWidth = 26; x.strokeRect(wa, wt, wb - wa, wbm - wt); x.lineWidth = 14; x.beginPath(); for (let px = wa + 725; px < wb; px += 725) { x.moveTo(px, wt); x.lineTo(px, wbm); } x.moveTo(wa, wt + 180); x.lineTo(wb, wt + 180); x.stroke();
      x.fillStyle = '#F7F5F0'; x.fillRect(wa - 40, wbm, wb - wa + 80, 22); x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(wa - 40, wbm + 22, wb - wa + 80, 6);
      x.fillStyle = '#7A5634'; x.fillRect(170, 300, 860, 470); x.fillStyle = vg(x, 312, 758, [[0, '#C9925A'], [1, '#B07A44']]); x.fillRect(184, 314, 832, 442);
      mascotBanner(x, 340, 340, 200, '연구노트 쓰는 날');
      x.fillStyle = '#FFFDF5'; x.fillRect(500, 350, 470, 360); x.fillStyle = '#E8402E'; x.beginPath(); x.arc(735, 356, 9, 0, 7); x.fill();
      text(x, '연구노트 작성 원칙', 735, 400, 30, { color: '#1E3A5A', weight: 900 });
      ['① 날짜를 적고 쪽 번호를 이어 쓴다', '② 지우지 말고 줄 긋고 서명한다', '③ 원본 데이터 위치를 남긴다', '④ 작성자·확인자가 서명한다', '⑤ 정해진 기간 동안 보관한다'].forEach((t, i) => text(x, t, 530, 455 + i * 50, 23, { color: '#34404E', weight: 600, align: 'left' }));
      x.fillStyle = '#6B4A2C'; x.fillRect(4170, 560, 860, 18); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(4170, 578, 860, 8);
      ['#2E86D6', '#8CC63F', '#E8EDF1', '#2E86D6', '#3B4A5A', '#8CC63F', '#E8EDF1', '#C98A50'].forEach((c, i) => { x.fillStyle = c; x.fillRect(4200 + i * 64, 400 + (i % 3) * 10, 54, 160 - (i % 3) * 10); x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(4212 + i * 64, 440 + (i % 3) * 10, 30, 34); });
      x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(4600, 300, 70, 0, 7); x.fill(); x.strokeStyle = '#3B4A5A'; x.lineWidth = 8; x.stroke(); x.lineWidth = 6; x.beginPath(); x.moveTo(4600, 300); x.lineTo(4600, 254); x.moveTo(4600, 300); x.lineTo(4636, 314); x.stroke();
      x.fillStyle = 'rgba(255,240,215,0.2)'; x.fillRect(0, 0, W, G);
    },
    solid(x) {
      x.fillStyle = vg(x, G, H, [[0, '#8A5A34'], [0.06, '#6E4526'], [1, '#3E2614']]); x.fillRect(0, G, W, H - G);
      const r = rng(17); x.strokeStyle = 'rgba(30,15,5,0.25)'; x.lineWidth = 2;
      for (let y = G + 30; y < H; y += 18 + r() * 14) { x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= W; px += 80) x.lineTo(px, y + Math.sin(px / 340 + y) * 6); x.stroke(); }
      x.fillStyle = 'rgba(255,220,180,0.45)'; x.fillRect(0, G, W, 4);
      both(x, (_, side) => {
        x.fillStyle = vg(x, G - 30, G, [[0, '#3C93DC'], [1, '#1D5E9E']]); x.fillRect(600, G - 34, 2000, 34);
        poly(x, [...nbPoly(-6), [2566, G - 26], [634, G - 26]]); x.fillStyle = vg(x, G - 340, G, [[0, '#FFFDF6'], [1, '#E9E1CC']]); x.fill();
        x.save(); x.clip(); x.strokeStyle = 'rgba(150,130,95,0.35)'; x.lineWidth = 1.2;
        for (let off = 236; off < 340; off += 5) { x.beginPath(); nbPoly(off).forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); }
        poly(x, [...nbPoly(-6), ...nbPoly(232).reverse()]); x.fillStyle = vg(x, G - 340, G - 100, [[0, '#FFFFFF'], [1, '#F6F3EA']]); x.fill();
        x.strokeStyle = 'rgba(70,130,200,0.35)'; x.lineWidth = 1.5; for (let y = G - 300; y < G - 100; y += 32) { x.beginPath(); x.moveTo(640, y); x.lineTo(2560, y); x.stroke(); }
        x.strokeStyle = 'rgba(220,60,60,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(880, G - 340); x.lineTo(880, G - 100); x.stroke();
        x.fillStyle = hg(x, 2300, 2560, [[0, 'rgba(90,70,40,0)'], [1, 'rgba(90,70,40,0.35)']]); x.fillRect(2300, G - 360, 260, 360);
        x.restore();
        if (side > 0) {
          x.fillStyle = hg(x, 230, 470, [[0, '#D8DEE2'], [0.3, '#FFFFFF'], [0.8, '#E3E8EB'], [1, '#B9C1C7']]); x.fillRect(226, G - 336, 248, 336);
          x.fillStyle = '#4A2E1A'; x.beginPath(); x.ellipse(350, G - 326, 112, 10, 0, 0, 7); x.fill();
          logoOnly(x, 350, G - 190, 52);
        }
      });
      ['연구윤리 지침', 'IRB 심의 서류', '연구노트 2025', '연구노트 2026', '데이터 관리 계획'].forEach((t, i) => {
        const y = G - 66 * (i + 1), c = [KB, '#3B4A5A', KG, KB, '#C98A50'][i];
        x.fillStyle = c; rr(x, mx(470) - 10, y + 2, 262, 62, 6); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.88)'; x.fillRect(mx(470) + 40, y + 16, 160, 34); text(x, t, mx(470) + 120, y + 34, 18, { color: '#1E2A36', weight: 800 });
      });
      const T = G - 330;
      ink(x, '연구노트', 900, T + 12, 30, { weight: 900, color: '#2E86D6', font: FONT }); ink(x, 'No. 2026-017', 1060, T + 14, 22, { color: '#56657A', font: FONT });
      ink(x, '날짜  2026. 10. 19.', 1620, T + 14, 22, { color: '#56657A', font: FONT }); ink(x, 'p.12', 2130, T + 14, 20, { color: '#56657A', font: FONT });
      ink(x, '실험 목적 : 신소재 박막의 열안정성 확인', 900, T + 58, 24); ink(x, '조건 : 25 ℃ / 습도 40 % / 3회 반복', 900, T + 90, 24);
      ink(x, '원본 데이터 → 서버 저장 (raw_1019.csv)', 900, T + 122, 24);
      x.strokeStyle = '#1F3A93'; x.lineWidth = 2; x.beginPath(); x.moveTo(1180, T + 150); x.lineTo(1420, T + 150); x.stroke(); ink(x, '1.82  2.05', 1440, T + 152, 22, { color: '#1F3A93' }); ink(x, '(재측정, 서명)', 1570, T + 152, 18, { color: '#C0392B' });
      x.strokeStyle = '#1F3A93'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(1880, T + 40); x.lineTo(1880, T + 170); x.lineTo(2150, T + 170); x.stroke();
      x.beginPath(); x.moveTo(1890, T + 160); x.bezierCurveTo(1960, T + 150, 2010, T + 70, 2140, T + 60); x.stroke();
      [[1920, 152], [1980, 128], [2040, 92], [2100, 70]].forEach(([a, b]) => { x.fillStyle = '#C0392B'; x.beginPath(); x.arc(a, T + b, 5, 0, 7); x.fill(); });
      sigBox(x, 1080, T + 184, '작성자', '2026.10.19'); sigBox(x, 1420, T + 184, '확인자', '2026.10.20');
      ink(x, 'p.13', 4420, T + 14, 20, { color: '#56657A', font: FONT }); ink(x, '측정 결과 (n = 3)', 2880, T + 58, 24, { weight: 700 });
      const ta = 2880, tt = T + 76; x.strokeStyle = '#1F3A93'; x.lineWidth = 1.6; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(ta, tt + i * 26); x.lineTo(ta + 420, tt + i * 26); x.stroke(); } for (let j = 0; j <= 4; j++) { x.beginPath(); x.moveTo(ta + j * 105, tt); x.lineTo(ta + j * 105, tt + 104); x.stroke(); }
      [['시료', '1차', '2차', '3차'], ['A', '1.82', '1.85', '1.80'], ['B', '2.05', '2.02', '2.07'], ['C', '2.41', '2.44', '2.39']].forEach((row, i) => row.forEach((c, j) => text(x, c, ta + 52 + j * 105, tt + 14 + i * 26, 17, { color: '#1F3A93', weight: i ? 500 : 800 })));
      x.strokeStyle = '#1F3A93'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(3460, T + 40); x.lineTo(3460, T + 90); x.lineTo(3410, T + 170); x.lineTo(3550, T + 170); x.lineTo(3500, T + 90); x.lineTo(3500, T + 40); x.stroke();
      x.fillStyle = 'rgba(46,134,214,0.25)'; poly(x, [[3430, T + 140], [3530, T + 140], [3550, T + 170], [3410, T + 170]]); x.fill();
      ink(x, '결론 : 재현성 확인 → 동료 검증 요청', 3620, T + 90, 24); ink(x, '참고 : Kim et al. (2025), p.41', 3620, T + 122, 22, { color: '#3B5BA8' });
      sigBox(x, 3520, T + 184, '작성자', '2026.10.19'); sigBox(x, 3860, T + 184, '확인자', '2026.10.20');
      const py = G - 372;
      x.fillStyle = vg(x, py - 26, py + 26, [[0, '#4A5A6C'], [0.3, '#1C2530'], [1, '#0B1016']]); x.fillRect(2140, py - 30, 780, 60);
      x.fillStyle = vg(x, py - 20, py + 20, [[0, '#F7DE96'], [0.5, '#C9973E'], [1, '#7A5520']]); x.fillRect(2420, py - 28, 16, 56); x.fillRect(2460, py - 28, 6, 56); x.fillRect(2880, py - 26, 12, 52);
      x.fillStyle = vg(x, py - 36, py - 22, [[0, '#F7DE96'], [1, '#9C7430']]); x.fillRect(2176, py - 36, 238, 14);
      x.fillStyle = vg(x, py - 18, py + 18, [[0, '#F7DE96'], [0.5, '#D7AA4E'], [1, '#8A6228']]); x.fillRect(2906, py - 24, 160, 48);
      x.strokeStyle = '#5E4018'; x.lineWidth = 2; x.beginPath(); x.moveTo(2930, py); x.lineTo(3050, py); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(2170, py - 18, 700, 6);
      kMark(x, 2560, py, 30);
    },
    front(x) {
      [[1180, KB], [1300, KG]].forEach(([tx, c]) => { x.fillStyle = c; rr(x, tx, nbTop(tx) - 30, 70, 30, [5, 5, 0, 0]); x.fill(); x.fillStyle = c; rr(x, mx(tx) - 70, nbTop(tx) - 30, 70, 30, [5, 5, 0, 0]); x.fill(); });
      [[300, '#2E86D6', -0.12], [350, '#1C2530', 0.02], [400, '#8CC63F', 0.14]].forEach(([px, c, a]) => { x.save(); x.translate(px, G - 326); x.rotate(a); x.fillStyle = c; rr(x, -10, -150, 20, 150, 8); x.fill(); x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(-6, -144, 4, 140); x.restore(); });
      x.strokeStyle = '#C9D0D5'; x.lineWidth = 22; x.beginPath(); x.arc(230, G - 180, 70, Math.PI * 0.5, Math.PI * 1.5); x.stroke();
      x.fillStyle = vg(x, G - 200, G + 60, [[0, '#2E86D6'], [1, '#1D5E9E']]); poly(x, [[2588, G - 190], [2612, G - 190], [2614, G], [2586, G]]); x.fill();
    },
  };

  // ---------------------------------------------------------------- 화학 실험동 (연구실 안전)
  S.lab = {
    back(x) {
      x.fillStyle = '#A9C7B2'; x.beginPath(); x.moveTo(0, G - 140); for (let px = 0; px <= W; px += 40) x.lineTo(px, G - 190 - Math.sin(px / 600) * 70 - Math.sin(px / 170) * 12); x.lineTo(W, G); x.lineTo(0, G); x.fill();
    },
    solid(x) {
      concrete(x, 0, W, G, H, 8); hazardStripe(x, 1560, G, mx(1560), 16);
      both(x, () => { x.fillStyle = vg(x, G - 210, G, [[0, '#6E8F4A'], [0.1, '#6A5A40'], [1, '#55473A']]); x.fillRect(0, G - 220, 360, 220); });
      const top = labBlock(x, 380, 1500, 2, 175); labBlock(x, mx(1500), mx(380), 2, 175, { louvre: [mx(1500) + 860, mx(380) - 20, top] });
      mascotBanner(x, mx(1500) + 945, G - 320, 96, '안전 제일');
      both(x, () => {
        roofKit(x, 380, 1500, top);
        x.fillStyle = vg(x, top, G, [[0, '#6F7880'], [1, '#4A535B']]); poly(x, [[1500, top], [1545, top], [1866, G], [1500, G]]); x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3; for (let t = 0.05; t < 1; t += 0.06) { x.beginPath(); x.moveTo(1500 + 360 * t, top + 4 + (G - top) * t); x.lineTo(1540 + 320 * t, top + 4 + (G - top) * t); x.stroke(); }
        drum(x, 1950, G, 80, 110, '#F2C230'); drum(x, 2040, G, 80, 110, '#2E86D6'); drum(x, 1995, G - 110, 80, 110, '#F2C230');
        x.fillStyle = vg(x, G - 40, G, [[0, '#E6E9EB'], [1, '#A9B0B5']]); x.fillRect(2106, G - 44, 128, 44); hazardStripe(x, 2106, G - 44, 2234, 8);
        x.fillStyle = '#8A939A'; x.fillRect(2154, G - 104, 32, 64);
      });
      // GHS signs, unmirrored so the symbols read right; red caps are the perch on top
      [[2170, 'flame'], [mx(2170), 'excl']].forEach(([cx, k]) => { ghs(x, cx, G - 195, 100, k); x.fillStyle = '#E3232B'; x.fillRect(cx - 34, G - 302, 68, 22); });
      // the reagent store
      x.fillStyle = vg(x, G - 230, G, [[0, '#D9DDE0'], [1, '#A9B0B5']]); x.fillRect(2276, G - 232, 648, 232); x.fillStyle = '#7A838A'; x.fillRect(2256, G - 250, 688, 26);
      hazardStripe(x, 2280, G - 224, 2920, 14);
      for (const dx of [2370, 2650]) { x.fillStyle = vg(x, G - 180, G, [[0, '#F2C230'], [1, '#C99A18']]); x.fillRect(dx, G - 180, 180, 180); x.strokeStyle = '#7A6010'; x.lineWidth = 3; x.strokeRect(dx, G - 180, 180, 180); ghs(x, dx + 90, G - 100, 48, dx < CX ? 'ox' : 'gas'); }
      text(x, '시약 창고', CX, G - 200, 24, { color: '#1E2A36', weight: 900 });
      // the fire extinguisher on the store roof (the summit): red body, gauge, valve head, the flat lever
      const bt = G - 546;
      x.fillStyle = hg(x, 2506, 2694, [[0, '#7A0F14'], [0.25, '#E8383F'], [0.42, '#FF8A8E'], [0.55, '#E8383F'], [1, '#6A0C10']]); x.fillRect(2500, bt - 4, 200, G - 246 - bt + 8);
      x.fillStyle = '#FFFFFF'; rr(x, 2530, G - 470, 140, 196, 8); x.fill();
      text(x, '소화기', CX, G - 446, 26, { color: '#C62828', weight: 900 });
      ['① 안전핀 뽑기', '② 노즐 조준', '③ 손잡이 누르기', '④ 골고루 분사'].forEach((t, i) => text(x, t, 2542, G - 412 + i * 30, 15, { color: '#222', weight: 800, align: 'left' }));
      logoOnly(x, CX, G - 290, 18);
      x.fillStyle = '#FFF'; x.beginPath(); x.arc(2650, bt + 40, 22, 0, 7); x.fill(); x.strokeStyle = '#333'; x.lineWidth = 4; x.stroke();
      x.strokeStyle = '#2FBF6E'; x.lineWidth = 6; x.beginPath(); x.arc(2650, bt + 40, 15, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
      x.fillStyle = hg(x, 2566, 2634, [[0, '#3A3A3A'], [0.5, '#8A8A8A'], [1, '#2A2A2A']]); x.fillRect(2566, G - 600, 68, 64);
      x.fillStyle = vg(x, G - 620, G - 594, [[0, '#2A2A2A'], [1, '#111']]); x.fillRect(2466, G - 620, 268, 26);
    },
    front(x, surface) {
      both(x, () => {
        exitSign(x, 1600, 990, 80);
        const r = rng(4); for (const tx of [90, 200]) tree(x, tx, surface(tx, 500) + 4, 120 + r() * 30, r, tx === 200 ? 'pine' : 'dark');
        grassTop(x, [[0, G - 210], [140, G - 200], [260, G - 120], [330, G - 30]], '#6FA34E');
      });
      logoPlate(x, 940, G - 380, 38);
      // hose of the extinguisher and its safety pin, warning beacons on the store corners
      x.strokeStyle = '#1A1A1A'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(2580, G - 590); x.bezierCurveTo(2420, G - 600, 2430, G - 420, 2470, G - 300); x.stroke(); x.lineCap = 'butt';
      x.strokeStyle = '#F2C230'; x.lineWidth = 6; x.beginPath(); x.arc(2660, G - 640, 18, 0, 7); x.stroke();
      for (const bx of [2290, 2910]) { x.fillStyle = '#333'; x.fillRect(bx - 10, G - 262, 20, 12); x.fillStyle = rg(x, bx, G - 276, 2, 18, [[0, '#FFD0C8'], [0.5, '#FF3B2E'], [1, '#B3120A']]); x.beginPath(); x.arc(bx, G - 268, 15, Math.PI, 0); x.lineTo(bx + 15, G - 262); x.lineTo(bx - 15, G - 262); x.fill(); }
    },
    beacons: [[2290, G - 270], [2910, G - 270]],
  };

  // ---------------------------------------------------------------- 증빙 보관실 (연구비 관리)
  S.archive = {
    ceil: '#2C3A48',
    back(x) {
      x.fillStyle = vg(x, 0, G, [[0, '#2C3A48'], [1, '#4A5A68']]); x.fillRect(0, 0, W, H);
      const r = rng(8);
      for (let a = 60; a < W; a += 640) {
        x.fillStyle = '#6E7C88'; x.fillRect(a, 230, 12, G - 230); x.fillRect(a + 560, 230, 12, G - 230);
        for (let y = 300; y < G - 40; y += 170) {
          x.fillStyle = '#8A97A2'; x.fillRect(a, y + 130, 572, 12);
          for (let bx = a + 20; bx < a + 540; bx += 132) { const yr = 2020 + Math.floor(r() * 7); x.fillStyle = vg(x, y + 40, y + 130, [[0, '#E9DCC0'], [1, '#C9B690']]); x.fillRect(bx, y + 40, 120, 90); x.fillStyle = '#FFF'; x.fillRect(bx + 18, y + 58, 84, 40); text(x, '증빙 ' + yr, bx + 60, y + 72, 15, { color: '#2A3440', weight: 800 }); text(x, ['인건비', '재료비', '장비비', '출장비', '회의비'][Math.floor(r() * 5)], bx + 60, y + 90, 12, { color: '#56657A', weight: 700 }); }
        }
      }
      for (let i = 0; i < 9; i++) { const lx = 300 + i * 575; x.fillStyle = '#E8F4FF'; x.fillRect(lx - 90, 220, 180, 10); x.fillStyle = vg(x, 230, 700, [[0, 'rgba(220,240,255,0.25)'], [1, 'rgba(220,240,255,0)']]); poly(x, [[lx - 90, 230], [lx + 90, 230], [lx + 260, 760], [lx - 260, 760]]); x.fill(); }
      x.fillStyle = 'rgba(30,44,58,0.35)'; x.fillRect(0, 0, W, G);
      x.fillStyle = '#FAFBFC'; rr(x, CX - 300, 250, 600, 90, 10); x.fill(); logoOnly(x, CX - 140, 295, 50); text(x, '증빙 보관실', CX + 120, 296, 34, { color: '#1E2A36', weight: 900 });
      mascotBanner(x, 1260, 430, 130, '증빙은 꼼꼼히');
    },
    solid(x) {
      noiseBand(x, 0, W, G, H, [[0, '#5C6670'], [0.08, '#48515A'], [1, '#2C3238']], 41); x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 2; for (let px = 0; px < W; px += 200) { x.beginPath(); x.moveTo(px, G); x.lineTo(px, H); x.stroke(); }
      both(x, () => {
        const rx = 470, R = 244, ry = G - 240;
        x.fillStyle = rg(x, rx - 60, ry - 70, 20, R, [[0, '#FFFFFF'], [0.8, '#EDEAE2'], [1, '#C9C4B8']]); x.beginPath(); x.arc(rx, ry, R, 0, 7); x.fill();
        x.strokeStyle = 'rgba(150,140,120,0.35)'; x.lineWidth = 1.5; for (let k = 70; k < R; k += 9) { x.beginPath(); x.arc(rx, ry, k, 0, 7); x.stroke(); }
        x.fillStyle = '#8A7A5E'; x.beginPath(); x.arc(rx, ry, 64, 0, 7); x.fill(); x.fillStyle = '#4A3E2C'; x.beginPath(); x.arc(rx, ry, 40, 0, 7); x.fill();
        x.fillStyle = vg(x, G - 280, G, [[0, '#FFFFFF'], [1, '#DCD6C8']]); x.fillRect(1496, G - 284, 368, 284);
        x.strokeStyle = 'rgba(140,130,110,0.4)'; x.lineWidth = 1.5; for (let y = G - 274; y < G; y += 7) { x.beginPath(); x.moveTo(1500, y); x.lineTo(1860, y + ((y % 3) - 1) * 2); x.stroke(); }
        x.fillStyle = '#1C1C1C'; poly(x, [[1576, G - 304], [1784, G - 304], [1764, G - 236], [1596, G - 236]]); x.fill();
      });
      receiptText(x, 1520, G - 230, [['연구비 카드 결제', ''], ['재료비  시약', '128,000'], ['증빙  세금계산서', '첨부']], 320);
      receiptText(x, mx(1860), G - 230, [['출장 승인 번호', 'T-1019'], ['출장비  교통', '46,800'], ['증빙  영수증', '첨부']], 320);
      for (const px of [1780, mx(1580)]) stamp(x, px, G - 50, 40, '증빙', '#D62828', -0.25);
      // fund cards along the ramps (left rises to the right, right rises to the left); the text reads normally on both
      x.save(); x.beginPath(); x.rect(0, 0, W, G); x.clip(); cardAlong(x, 1000, G, Math.atan2(-310, 520)); cardAlong(x, 3680, G - 310, Math.atan2(310, 520)); x.restore();
      const a = 2240, b = 2960, t = G - 330;
      x.fillStyle = vg(x, t, G, [[0, '#3A4652'], [1, '#1C242C']]); x.fillRect(a - 4, t - 4, b - a + 8, G - t + 4);
      x.fillStyle = '#B9E3C4'; rr(x, a + 40, t + 30, b - a - 80, 90, 10); x.fill(); x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(a + 40, t + 30, b - a - 80, 16);
      text(x, '집행률  100.0 %', b - 70, t + 78, 46, { color: '#1E3A2A', weight: 900, align: 'right' });
      const keys = ['7', '8', '9', '÷', 'C', '4', '5', '6', '×', '%', '1', '2', '3', '−', '=', '0', '00', '.', '+', '='];
      keys.forEach((k, i) => { const c = i % 5, r2 = Math.floor(i / 5), kx = a + 40 + c * 130, ky = t + 140 + r2 * 46; if (ky + 40 > G - 4) return; x.fillStyle = k === '=' ? '#E8913C' : k === 'C' ? '#C9384A' : '#E9EDF0'; rr(x, kx, ky, 116, 38, 8); x.fill(); text(x, k, kx + 58, ky + 20, 22, { color: k === '=' || k === 'C' ? '#FFF' : '#2A3440', weight: 800 }); });
      logoOnly(x, a + 110, t + 14, 16);
    },
    front(x) {
      both(x, () => {
        x.strokeStyle = '#B8C0C6'; x.lineWidth = 8; x.beginPath(); x.moveTo(1610, G - 300); x.lineTo(1640, G - 370); x.moveTo(1750, G - 300); x.lineTo(1720, G - 370); x.stroke();
        x.fillStyle = '#FFFFFF'; x.fillRect(470, G - 8, 520, 8); x.fillStyle = 'rgba(0,0,0,0.12)'; for (let px = 520; px < 980; px += 30) x.fillRect(px, G - 6, 16, 2);
      });
    },
  };
  // the card art laid along a ramp: (ox, oy) is the card's top-left corner, the face hangs below the edge (the mask clips it)
  function cardAlong(x, ox, oy, ang) {
    const w = 640, h = 404; x.save(); x.translate(ox, oy); x.rotate(ang); x.translate(w / 2 - 10, h / 2 - 6); fundCard(x, 0, 0, w, 0); x.restore();
  }

  function paint(x, m) { // after the base colours: the art clipped to the solid pixels, then the decorations
    const S1 = S[m.mapId], surface = (px, from) => { const y = maskSurface(m.mask, m.W, m.H, px, from || 0); return y < 0 ? m.H : y; };
    x.save(); x.globalCompositeOperation = 'source-atop'; S1.solid(x); x.restore();
    x.save(); S1.front(x, surface); x.restore();
  }
  function backdrop(m) { // the scene behind the terrain, at half resolution
    const c = document.createElement('canvas'); c.width = m.W / 2; c.height = m.H / 2; const x = c.getContext('2d'); x.scale(0.5, 0.5); S[m.mapId].back(x); return c;
  }
  return { has: id => !!S[id], paint, backdrop, beacons: id => (S[id] && S[id].beacons) || [], ceil: id => S[id] && S[id].ceil, stamp, flame };
})();
