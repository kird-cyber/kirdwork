// ================================================================ 그림 도구
let ctx;
const P = v => v * T;
function seedRand(s) { let x = (s * 9301 + 49297) % 233280; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
function rr(x, y, w, h, r, fill, stroke, lw) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
function circ(x, y, r, fill, stroke, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
function ell(x, y, rx, ry, fill, stroke, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); } }
function line(x1, y1, x2, y2, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
const FONT = '"Noto Sans KR", system-ui, sans-serif';
function txt(s, x, y, size, color, weight, align) { ctx.font = `${weight || 800} ${size}px ${FONT}`; ctx.fillStyle = color || OL; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }
function tag(s, x, y, bg, fg, size) { size = size || 13; ctx.font = `900 ${size}px ${FONT}`; const w = ctx.measureText(s).width + 14; rr(x - w / 2, y - size * 0.85, w, size * 1.7, 7, bg || 'rgba(14,34,56,.85)'); txt(s, x, y, size, fg || '#fff', 900); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); b = Math.min(255, Math.round(b * f)); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
function shadowE(x, y, rx, ry) { ctx.fillStyle = 'rgba(14,34,56,.2)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
// ---- floors
const FLOOR = {
  corr: (X, Y, i, j) => { ctx.fillStyle = (i + j) % 2 ? '#C9D1DE' : '#BFC8D6'; ctx.fillRect(X, Y, T, T); },
  pad: (X, Y, i, j) => { ctx.fillStyle = '#9AA3B2'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.strokeRect(X + .5, Y + .5, T, T); },
  stars: (X, Y, i, j, r) => { ctx.fillStyle = '#1B1846'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = 'rgba(255,255,255,.6)'; if (r() < .5) ctx.fillRect(X + r() * 44, Y + r() * 44, 2, 2); },
  lab: (X, Y) => { ctx.fillStyle = '#EEF2F7'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = '#D3DBE6'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, T, T); },
  raised: (X, Y) => { ctx.fillStyle = '#2A3346'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = '#3A4560'; ctx.lineWidth = 2; ctx.strokeRect(X + 2, Y + 2, T - 4, T - 4); ctx.fillStyle = '#323C52'; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) ctx.fillRect(X + 10 + a * 12, Y + 10 + b * 12, 4, 4); },
  teal: (X, Y, i, j) => { ctx.fillStyle = (i + j) % 2 ? '#BFE6E8' : '#AEDDE0'; ctx.fillRect(X, Y, T, T); },
  stone: (X, Y, i, j, r) => { ctx.fillStyle = '#A88E6E'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = 'rgba(80,55,30,.18)'; ell(X + r() * 40 + 4, Y + r() * 40 + 4, 8, 5, 'rgba(80,55,30,.18)'); },
  power: (X, Y, i, j) => { ctx.fillStyle = '#4A5160'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.strokeRect(X + .5, Y + .5, T, T); },
  marble: (X, Y, i, j) => { ctx.fillStyle = (i + j) % 2 ? '#EEF1F6' : '#E1E6EE'; ctx.fillRect(X, Y, T, T); },
  metal: (X, Y, i, j) => { ctx.fillStyle = (i + j) % 2 ? '#5B5478' : '#544D70'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(X + 4, Y + 4, 4, 4); ctx.fillRect(X + T - 8, Y + T - 8, 4, 4); },
  matrix: (X, Y, i, j, r) => { ctx.fillStyle = '#0F2A1C'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = 'rgba(74,222,128,.18)'; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, T, T); if (r() < .3) { ctx.fillStyle = 'rgba(74,222,128,.5)'; ctx.font = '700 11px monospace'; ctx.fillText(r() < .5 ? '1' : '0', X + 10 + r() * 20, Y + 16 + r() * 20); } },
  soil: (X, Y, i, j, r) => { ctx.fillStyle = '#8CBF5A'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = '#7AAE4A'; ctx.fillRect(X + r() * 40, Y + r() * 40, 5, 7); },
  deck: (X, Y, i, j) => { ctx.fillStyle = j % 2 ? '#C79A62' : '#BF925A'; ctx.fillRect(X, Y, T, T); line(X, Y + T / 2, X + T, Y + T / 2, 'rgba(90,58,30,.25)', 1); },
  epoxy: (X, Y, i, j) => { ctx.fillStyle = (i + j) % 2 ? '#9FD8D2' : '#93D0CA'; ctx.fillRect(X, Y, T, T); },
  steel: (X, Y, i, j) => { ctx.fillStyle = '#9AA6B8'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 8; k < T; k += 10) { ctx.moveTo(X + k, Y); ctx.lineTo(X + k - 6, Y + T); } ctx.stroke(); },
  factory: (X, Y, i, j) => { ctx.fillStyle = '#8A919E'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.strokeRect(X + .5, Y + .5, T, T); },
  gravel: (X, Y, i, j, r) => { ctx.fillStyle = '#B7AFA2'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = 'rgba(80,70,60,.22)'; for (let k = 0; k < 4; k++) ctx.fillRect(X + r() * 44, Y + r() * 44, 3, 3); },
  carpetN: (X, Y, i, j) => { ctx.fillStyle = '#23365C'; ctx.fillRect(X, Y, T, T); ctx.fillStyle = 'rgba(255,210,74,.08)'; if ((i + j) % 2) ctx.fillRect(X, Y, T, T); },
};
// ---- top-down tank
const PAL = {
  blue: { body: '#2E86D6', dark: '#1B5EA0', light: '#8CC8FF', tread: '#24344A' }, green: { body: '#8CC63F', dark: '#5E8F22', light: '#D8F59A', tread: '#2C3824' },
  orange: { body: '#F2A23A', dark: '#B5701A', light: '#FFE0A8', tread: '#3A2A12' }, purple: { body: '#7C5CE0', dark: '#4E35A8', light: '#C8B4FF', tread: '#241E44' },
  fake: { body: '#2B2B3A', dark: '#15151F', light: '#FF3B3B', tread: '#0B0B12' }, red: { body: '#E0533F', dark: '#A8321F', light: '#FFB4A4', tread: '#3A1A16' }, gray: { body: '#8A97AA', dark: '#5B6B82', light: '#DCE3EC', tread: '#2A3344' },
};
function tank(x, y, a, color, name, op) {
  op = op || {}; const c = PAL[color] || PAL.blue, s = op.scale || 1;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(14,34,56,.22)'; ctx.beginPath(); ctx.ellipse(3 * s, 6 * s, 24 * s, 20 * s, 0, 0, 7); ctx.fill();
  ctx.rotate(a); ctx.scale(s, s); if (op.alpha) ctx.globalAlpha = op.alpha;
  rr(-24, -21, 48, 11, 4, c.tread, OL, 2); rr(-24, 10, 48, 11, 4, c.tread, OL, 2);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; const ph = (op.tread || 0) % 7; for (let k = -20 + ph; k < 22; k += 7) { ctx.fillRect(k, -19, 3, 7); ctx.fillRect(k, 12, 3, 7); }
  rr(-21, -13, 42, 26, 6, op.paint || c.body, OL, 2.5);
  rr(-1, -3, 34, 6, 3, op.paint ? shade(op.paint, .8) : c.dark, OL, 2);
  circ(-2, 0, 11, op.paint ? shade(op.paint, 1.06) : c.light, OL, 2.5);
  if (color === 'fake') { ctx.fillStyle = '#FF3B3B'; ctx.shadowColor = '#FF2020'; ctx.shadowBlur = 12; ctx.fillRect(4, -9, 6, 4); ctx.fillRect(4, 5, 6, 4); ctx.shadowBlur = 0; ctx.fillStyle = '#5B5B6E'; for (const sy of [-21, 17]) for (let k = -18; k < 22; k += 10) { ctx.beginPath(); ctx.moveTo(k, sy + (sy < 0 ? 0 : 4)); ctx.lineTo(k + 4, sy + (sy < 0 ? -6 : 10)); ctx.lineTo(k + 8, sy + (sy < 0 ? 0 : 4)); ctx.fill(); } }
  ctx.globalAlpha = 1; ctx.restore();
  if (name) tag(name, x, y - 42 * s, op.me ? '#FFD24A' : 'rgba(14,34,56,.85)', op.me ? OL : '#fff', 12);
}
