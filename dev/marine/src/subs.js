// ============================================================== SUBMARINE ART (drawing only, never read by the simulation)
// Each drawing faces +x, centred on (0,0), about 140 x 80 units. One porthole is the face. team = accent colour.
const SUB_OUT = '#0A1420';
const TAU2 = Math.PI * 2;
function porthole(c, x, y, r, glass, pupil) {
  c.fillStyle = '#B8C3CE'; c.beginPath(); c.arc(x, y, r + 2.4, 0, TAU2); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, glass || '#9FD4F2');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU2); c.fill();
  if (pupil !== false) { c.fillStyle = '#0A1420'; c.beginPath(); c.arc(x + r * 0.25, y + r * 0.05, r * 0.45, 0, TAU2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + r * 0.4, y - r * 0.15, r * 0.16, 0, TAU2); c.fill(); }
}
function prop(c, x, y, t, s) {
  s = s || 1; c.save(); c.translate(x, y);
  const k = Math.abs(Math.sin(t * 22));
  c.fillStyle = '#CBD3DC'; c.strokeStyle = SUB_OUT; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(-4 * s, 0, 3 * s, (2 + 10 * k) * s, 0, 0, TAU2); c.fill(); c.stroke();
  c.fillStyle = '#7F8B98'; c.beginPath(); c.arc(0, 0, 4 * s, 0, TAU2); c.fill(); c.stroke();
  c.restore();
}
function shape(c, pts, fill, stroke) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke !== false) { c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke(); } }
function bodyFill(c, top, bot, y0, y1) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot); return g; }

// each sub faces +x, centred on (0,0), about 140 x 80 units. One porthole is the face.
const SUBDRAW = {
  // 유보트 U-96 (VII-C형): 평평한 갑판, 새들 탱크, 그물 절단기, 88mm 갑판포, 윈터가르텐 지휘탑, 방향탐지 고리 안테나
  uboat(c, t, team) {
    // jumping wire bow → tower → stern
    c.strokeStyle = 'rgba(200,210,220,0.75)'; c.lineWidth = 1; c.beginPath(); c.moveTo(66, -9); c.lineTo(4, -44); c.lineTo(-62, -6); c.stroke();
    shape(c, [-58, -1, -72, -10, -70, 1], '#5E676F'); shape(c, [-58, 2, -70, 13, -66, 2], '#5E676F');
    prop(c, -70, 1, t);
    // pressure hull + flat casing deck, raked bow
    const bp = new Path2D(); bp.moveTo(70, -6); bp.lineTo(60, -8); bp.lineTo(-50, -8); bp.quadraticCurveTo(-64, -6, -68, 1); bp.quadraticCurveTo(-62, 9, -46, 11); bp.lineTo(30, 12); bp.quadraticCurveTo(56, 10, 70, -6); bp.closePath();
    c.fillStyle = bodyFill(c, '#AEB7BF', '#6C757D', -8, 12); c.fill(bp);
    c.save(); c.clip(bp);
    c.fillStyle = '#5A636B'; c.fillRect(-80, 5.5, 160, 8);
    c.fillStyle = '#B3362B'; c.fillRect(-80, 3, 160, 2.6);
    c.fillStyle = 'rgba(80,90,98,0.45)'; c.beginPath(); c.ellipse(-6, 5, 30, 7, 0, 0, TAU2); c.fill();
    c.strokeStyle = 'rgba(10,20,32,0.18)'; c.lineWidth = 1; for (let x = -44; x < 56; x += 11) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x, 3); c.stroke(); }
    c.fillStyle = 'rgba(10,20,32,0.35)'; for (let x = -40; x < 40; x += 6) c.fillRect(x, -6.5, 3, 1.2);
    c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    // net cutter teeth on the bow
    c.strokeStyle = '#4A535B'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(56, -8); c.lineTo(60, -12); c.lineTo(62, -8.5); c.lineTo(65, -12.5); c.lineTo(67, -8); c.stroke();
    // 88 mm deck gun
    c.fillStyle = '#6C757D'; c.beginPath(); c.roundRect(24, -13, 9, 5, 1.5); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = '#3E474F'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(29, -12); c.lineTo(44, -15); c.stroke(); c.lineCap = 'butt';
    // conning tower with the wintergarten platform behind it
    c.beginPath(); c.moveTo(-18, -8); c.lineTo(-18, -22); c.lineTo(-8, -22); c.lineTo(-8, -30); c.lineTo(8, -30); c.lineTo(13, -22); c.lineTo(14, -8); c.closePath();
    c.fillStyle = bodyFill(c, '#B9C2CA', '#7E878F', -30, -8); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = team; c.fillRect(-8, -30, 16, 2.4);
    c.strokeStyle = '#8E979F'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-18, -26); c.lineTo(-8, -26); c.moveTo(-17, -26); c.lineTo(-17, -22); c.moveTo(-12.5, -26); c.lineTo(-12.5, -22); c.stroke();
    c.strokeStyle = '#3E474F'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-13, -22); c.lineTo(-9, -27); c.stroke();
    c.fillStyle = '#FFFFFF'; c.font = '700 7px "IBM Plex Sans KR", sans-serif'; c.textAlign = 'center'; c.fillText('U-96', 0, -14);
    // periscopes and the round direction-finder loop
    c.strokeStyle = '#B8C3CE'; c.lineWidth = 2; c.beginPath(); c.moveTo(-2, -30); c.lineTo(-2, -46); c.moveTo(3, -30); c.lineTo(3, -40); c.stroke();
    c.strokeStyle = '#8E979F'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(8, -30); c.lineTo(8, -35); c.stroke(); c.beginPath(); c.arc(8, -38, 3, 0, TAU2); c.stroke();
    porthole(c, 54, -2, 4);
  },
  // 미국 오하이오급 + 향유고래 몸집
  ohio(c, t, team) {
    shape(c, [-58, -5, -72, -19, -68, -3], '#20262E'); shape(c, [-58, 5, -72, 19, -68, 3], '#20262E');
    c.fillStyle = '#4A535E'; c.beginPath(); c.roundRect(-78, -6, 8, 12, 3); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
    const bp = new Path2D(); bp.moveTo(68, 1); bp.quadraticCurveTo(66, -13, 48, -14); bp.lineTo(-48, -14); bp.quadraticCurveTo(-64, -11, -70, 0); bp.quadraticCurveTo(-64, 11, -48, 13); bp.lineTo(48, 13); bp.quadraticCurveTo(66, 13, 68, 1); bp.closePath();
    c.fillStyle = bodyFill(c, '#353D48', '#161B22', -14, 13); c.fill(bp);
    c.save(); c.clip(bp); c.fillStyle = '#8E3A33'; c.fillRect(-80, 6, 160, 10); c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.fillStyle = '#2C333D'; c.beginPath(); c.roundRect(-40, -19, 58, 7, 3); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.8; c.stroke();
    c.fillStyle = '#4C5662'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(-34 + i * 9.4, -17.5, 3.2, 1.3, 0, 0, TAU2); c.fill(); }
    c.beginPath(); c.moveTo(22, -14); c.lineTo(26, -38); c.quadraticCurveTo(36, -40, 44, -38); c.lineTo(46, -14); c.closePath(); c.fillStyle = bodyFill(c, '#3A434F', '#20262E', -38, -14); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = team; c.fillRect(25.5, -31, 19, 4);
    c.fillStyle = '#20262E'; c.beginPath(); c.roundRect(14, -26, 46, 3.5, 1.5); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.3; c.stroke();
    porthole(c, 56, -4, 5);
    c.strokeStyle = 'rgba(111,227,225,0.8)'; c.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(68, 0, 6 + ph * 18, -0.6, 0.6); c.stroke(); }
    c.globalAlpha = 1;
  },
  // 쥘 베른 노틸러스 + 범고래(충각)
  nautilus(c, t, team) {
    shape(c, [56, -5, 84, 0, 56, 5], '#A3ACB6');
    shape(c, [-54, -3, -68, -16, -64, 0], '#3A414B'); shape(c, [-54, 3, -68, 16, -64, 0], '#3A414B');
    prop(c, -66, 0, t);
    for (let x = -40; x <= 36; x += 8) shape(c, [x, -13, x + 4, -21, x + 8, -13], '#4A525D');
    shape(c, [24, -21, 28, -29, 32, -21], team);
    const bp = new Path2D(); bp.ellipse(0, 0, 60, 15, 0, 0, TAU2);
    c.fillStyle = bodyFill(c, '#66707D', '#353C46', -15, 15); c.fill(bp);
    c.save(); c.clip(bp);
    c.strokeStyle = 'rgba(10,20,32,0.35)'; c.lineWidth = 1.2; for (let x = -48; x < 56; x += 12) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x, 16); c.stroke(); }
    c.fillStyle = 'rgba(201,162,74,0.9)'; for (let x = -48; x < 56; x += 12) for (const y of [-10, 0, 10]) { c.beginPath(); c.arc(x + 1.6, y, 0.9, 0, TAU2); c.fill(); }
    c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.strokeStyle = '#C9A24A'; c.lineWidth = 1.8; c.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = 1 + a * 0.75, x = -30 + Math.cos(a) * r, y = 2 + Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.fillStyle = '#C9A24A'; c.beginPath(); c.arc(-4, 2, 11.5, 0, TAU2); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
    const wg = c.createRadialGradient(-6, 0, 1, -4, 2, 9); wg.addColorStop(0, '#FFF6D0'); wg.addColorStop(1, '#E6B65A'); c.fillStyle = wg; c.beginPath(); c.arc(-4, 2, 8.5, 0, TAU2); c.fill();
    c.strokeStyle = 'rgba(80,50,10,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-12.5, 2); c.lineTo(4.5, 2); c.moveTo(-4, -6.5); c.lineTo(-4, 10.5); c.stroke();
    c.fillStyle = bodyFill(c, '#D8B860', '#9C7A2E', -24, -12); c.beginPath(); c.arc(32, -12, 9, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
    porthole(c, 34, -15, 4.2, '#FFE9A0');
  },
  // 소련 킬로급: 디젤로 배터리를 충전해 전기 모터로 다니는 잠수함 → 전기 컨셉
  kilo(c, t, team) {
    shape(c, [-54, -3, -68, -15, -64, 0], '#1D2128'); shape(c, [-54, 3, -68, 15, -64, 0], '#1D2128');
    prop(c, -66, 0, t);
    const bp = new Path2D(); bp.moveTo(60, 2); bp.quadraticCurveTo(58, -16, 32, -18); bp.lineTo(-40, -14); bp.quadraticCurveTo(-60, -8, -64, 0); bp.quadraticCurveTo(-60, 8, -40, 12); bp.lineTo(32, 17); bp.quadraticCurveTo(58, 17, 60, 2); bp.closePath();
    c.fillStyle = bodyFill(c, '#3A404B', '#1A1E24', -18, 17); c.fill(bp);
    c.save(); c.clip(bp);
    c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1; for (let x = -64; x < 62; x += 6) { c.beginPath(); c.moveTo(x, -20); c.lineTo(x, 20); c.stroke(); } for (let y = -18; y < 18; y += 6) { c.beginPath(); c.moveTo(-66, y); c.lineTo(62, y); c.stroke(); }
    // battery seams that pulse along the hull
    const pulse = (t * 1.2) % 1;
    for (const y of [-3, 6]) { const g = c.createLinearGradient(-60, 0, 60, 0); const p = pulse; g.addColorStop(Math.max(0, p - 0.15), 'rgba(140,200,255,0.15)'); g.addColorStop(p, 'rgba(190,170,255,0.95)'); g.addColorStop(Math.min(1, p + 0.15), 'rgba(140,200,255,0.15)'); c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-56, y); c.lineTo(54, y); c.stroke(); }
    c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.beginPath(); c.moveTo(4, -16); c.lineTo(9, -44); c.quadraticCurveTo(20, -47, 30, -44); c.lineTo(33, -17); c.closePath(); c.fillStyle = bodyFill(c, '#434A56', '#22272E', -46, -16); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = team; c.fillRect(8, -36, 23, 4);
    shape(c, [21, -31, 15, -23, 19, -23, 17, -17, 24, -26, 20, -26, 22, -31], '#BFA8FF', false);
    // two masts with a crackling arc between them
    c.strokeStyle = '#B8C3CE'; c.lineWidth = 2; c.beginPath(); c.moveTo(13, -46); c.lineTo(13, -56); c.moveTo(26, -45); c.lineTo(26, -56); c.stroke();
    c.fillStyle = '#D6DEE8'; for (const x of [13, 26]) { c.beginPath(); c.arc(x, -57, 2.2, 0, TAU2); c.fill(); }
    const fl = 0.5 + 0.5 * Math.sin(t * 9);
    c.strokeStyle = `rgba(200,180,255,${0.45 + fl * 0.55})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(15, -57);
    for (let i = 1; i < 5; i++) c.lineTo(15 + i * 2.2, -57 + Math.sin(t * 40 + i * 2.3) * 3);
    c.lineTo(24, -57); c.stroke();
    shape(c, [46, -6, 40, -4, 46, -2], '#22272E');
    porthole(c, 46, -4, 5.5, '#C8B6F2');
  },
  // 심해 탐사정 앨빈 + 꽃게(로봇 팔)
  alvin(c, t, team) {
    c.strokeStyle = '#8A8F96'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-40, 24); c.lineTo(26, 24); for (const x of [-30, 14]) { c.moveTo(x, 17); c.lineTo(x - 3, 24); } c.stroke();
    prop(c, -54, 0, t, 0.85);
    const bp = new Path2D(); bp.moveTo(42, -4); bp.quadraticCurveTo(42, -26, 12, -28); bp.lineTo(-34, -24); bp.quadraticCurveTo(-50, -20, -52, -4); bp.lineTo(-52, 8); bp.quadraticCurveTo(-50, 18, -34, 18); bp.lineTo(24, 18); bp.quadraticCurveTo(42, 16, 42, -4); bp.closePath();
    c.fillStyle = bodyFill(c, '#FBFCFD', '#C3CAD3', -28, 18); c.fill(bp);
    c.save(); c.clip(bp); c.fillStyle = team; c.fillRect(-60, -2, 120, 4); c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.fillStyle = bodyFill(c, '#F06548', '#C23A22', -40, -26); c.beginPath(); c.roundRect(-26, -38, 34, 12, 6); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.8; c.stroke();
    c.fillStyle = '#FFFFFF'; c.font = '700 6px sans-serif'; c.textAlign = 'center'; c.fillText('DSV', -9, -30);
    for (const [x, y] of [[36, -18], [26, -22]]) { const g = c.createRadialGradient(x, y, 0, x + 14, y + 4, 22); g.addColorStop(0, 'rgba(255,250,210,0.55)'); g.addColorStop(1, 'rgba(255,250,210,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26, y - 8); c.lineTo(x + 26, y + 14); c.closePath(); c.fill(); c.fillStyle = '#E8EDF2'; c.beginPath(); c.arc(x, y, 2.6, 0, TAU2); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1; c.stroke(); }
    const sw = Math.sin(t * 2.2) * 3;
    c.strokeStyle = '#7F8B98'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(32, 12); c.lineTo(46, 18 + sw * 0.4); c.lineTo(58, 10 + sw); c.stroke();
    c.beginPath(); c.moveTo(26, 16); c.lineTo(40, 26 - sw * 0.4); c.lineTo(52, 24 - sw); c.stroke();
    c.lineCap = 'butt'; c.strokeStyle = '#3E474F'; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(58, 10 + sw); c.lineTo(65, 6 + sw); c.moveTo(58, 10 + sw); c.lineTo(65, 13 + sw); c.stroke();
    c.beginPath(); c.moveTo(52, 24 - sw); c.lineTo(58, 20 - sw); c.moveTo(52, 24 - sw); c.lineTo(58, 27 - sw); c.stroke();
    porthole(c, 30, 0, 5.5); porthole(c, 22, 9, 3, '#9FD4F2', false); porthole(c, 37, 9, 3, '#9FD4F2', false);
  },
  blue(c, t, team) {
    shape(c, [-54, -4, -76, -28, -66, -2], '#2E5B8B'); shape(c, [-54, 4, -74, 22, -66, 2], '#2E5B8B');
    prop(c, -62, 0, t);
    shape(c, [8, 14, -8, 32, -12, 14], '#2E5B8B');
    const bp = new Path2D(); bp.moveTo(64, 2); bp.bezierCurveTo(50, -18, 10, -26, -20, -20); bp.bezierCurveTo(-42, -16, -56, -8, -58, 0); bp.bezierCurveTo(-56, 8, -40, 16, -20, 18); bp.bezierCurveTo(10, 22, 48, 18, 64, 2); bp.closePath();
    c.fillStyle = bodyFill(c, '#4A80B8', '#2F5F92', -24, 20); c.fill(bp);
    c.save(); c.clip(bp); c.fillStyle = '#D7E4EF'; c.beginPath(); c.ellipse(14, 20, 62, 13, 0, 0, TAU2); c.fill(); c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    shape(c, [-6, -20, 8, -48, 20, -19], '#4A80B8'); shape(c, [4, -40, 8, -48, 11.5, -40], team, false);
    c.strokeStyle = '#B8C3CE'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, -42); c.lineTo(14, -56); c.lineTo(21, -56); c.stroke();
    c.strokeStyle = 'rgba(10,20,32,0.6)'; c.lineWidth = 1.6; for (const x of [18, 23, 28]) { c.beginPath(); c.moveTo(x, -7); c.quadraticCurveTo(x - 3, 0, x, 7); c.stroke(); }
    porthole(c, 41, -5, 6.5);
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(42, 9); for (let i = 0; i < 6; i++) { c.lineTo(44 + i * 3, i % 2 ? 9 : 13); } c.lineTo(61, 6); c.closePath(); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.2; c.stroke();
  },
  sona(c, t, team) {
    c.beginPath(); c.moveTo(-52, 0); c.lineTo(-74, -10); c.quadraticCurveTo(-66, 0, -74, 10); c.closePath(); c.fillStyle = '#495766'; c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    prop(c, -56, 0, t, 0.9);
    const bp = new Path2D(); bp.moveTo(-54, -3); bp.bezierCurveTo(-40, -16, -20, -27, 0, -29); bp.lineTo(50, -29); bp.quadraticCurveTo(66, -29, 66, -14); bp.lineTo(66, 8); bp.quadraticCurveTo(66, 23, 50, 23); bp.lineTo(0, 23); bp.bezierCurveTo(-20, 21, -40, 12, -54, 3); bp.closePath();
    c.fillStyle = bodyFill(c, '#6B7A8C', '#4F5C6C', -29, 23); c.fill(bp);
    c.save(); c.clip(bp); c.fillStyle = '#A9B4C0'; c.fillRect(-60, 12, 130, 14); c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.strokeStyle = SUB_OUT; c.lineWidth = 1.8; c.beginPath(); c.moveTo(63, 12); c.lineTo(8, 16); c.stroke();
    c.fillStyle = '#F2F4F6'; for (let x = 14; x < 60; x += 7) { c.beginPath(); c.arc(x, 15.5 - (x - 8) * 0.07, 1.8, 0, TAU2); c.fill(); }
    c.strokeStyle = 'rgba(10,20,32,0.35)'; c.lineWidth = 1.4; for (const y of [-18, -10]) { c.beginPath(); c.moveTo(22, y); c.quadraticCurveTo(40, y - 3, 58, y); c.stroke(); }
    porthole(c, 6, 1, 6);
    c.fillStyle = team; c.beginPath(); c.roundRect(34, -33, 14, 5, 2); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(200,235,255,0.7)'; c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(41 + Math.sin(ph * 6 + i) * 2, -36 - ph * 26, 2 + ph * 2, 0, TAU2); c.stroke(); }
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(111,227,225,0.8)'; c.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(66, -8, 6 + ph * 18, -0.6, 0.6); c.stroke(); }
    c.globalAlpha = 1;
  },
  orca(c, t, team) {
    c.beginPath(); c.moveTo(-50, 0); c.lineTo(-70, -11); c.quadraticCurveTo(-63, 0, -70, 11); c.closePath(); c.fillStyle = '#1C2027'; c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    prop(c, -54, 0, t);
    const bp = new Path2D(); bp.moveTo(60, 4); bp.bezierCurveTo(56, -16, 20, -26, -14, -22); bp.bezierCurveTo(-40, -18, -52, -8, -54, 0); bp.bezierCurveTo(-52, 8, -40, 16, -14, 18); bp.bezierCurveTo(20, 22, 54, 20, 60, 4); bp.closePath();
    c.fillStyle = '#1E232B'; c.fill(bp);
    c.save(); c.clip(bp); c.fillStyle = '#EEF2F5'; c.beginPath(); c.ellipse(18, 16, 46, 9, 0, 0, TAU2); c.fill(); c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.beginPath(); c.moveTo(-12, -20); c.lineTo(-4, -60); c.quadraticCurveTo(4, -58, 14, -20); c.closePath(); c.fillStyle = '#1E232B'; c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    c.strokeStyle = team; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, -24); c.lineTo(-4, -56); c.stroke();
    c.fillStyle = '#1E232B'; c.beginPath(); c.ellipse(4, 19, 11, 5, 0.6, 0, TAU2); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
    c.save(); c.translate(26, -8); c.rotate(-0.15);
    const g = c.createLinearGradient(-13, -6, 13, 6); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#BFE4FF');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 13, 6, 0, 0, TAU2); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#0A1420'; c.beginPath(); c.arc(5, 0.5, 2.6, 0, TAU2); c.fill(); c.restore();
    c.strokeStyle = '#AEB6C0'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.arc(46, 3, 15, -0.95, 0.95); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = '#6A737E'; for (const a of [-0.6, 0, 0.6]) { c.beginPath(); c.arc(46 + Math.cos(a) * 15, 3 + Math.sin(a) * 15, 1.4, 0, TAU2); c.fill(); }
  },

  // 도산안창호급(KSS-III) 몸체 + 세종 시대 발명품
  sejong(c, t, team) {
    shape(c, [-58, -3, -72, -16, -67, 0], '#16213A'); shape(c, [-58, 3, -72, 16, -67, 0], '#16213A');
    prop(c, -69, 0, t);
    const bp = new Path2D(); bp.moveTo(68, 2); bp.quadraticCurveTo(66, -13, 48, -14); bp.lineTo(-48, -12); bp.quadraticCurveTo(-64, -8, -68, 0); bp.quadraticCurveTo(-64, 8, -48, 11); bp.lineTo(48, 14); bp.quadraticCurveTo(66, 14, 68, 2); bp.closePath();
    c.fillStyle = bodyFill(c, '#2C3E62', '#141D33', -14, 14); c.fill(bp);
    c.save(); c.clip(bp);
    const DC = ['#2E8B57', '#C0392B', '#1F5FA8', '#E2B33C'];
    for (let i = 0, x = -66; x < 68; i++, x += 5) { c.fillStyle = DC[i % 4]; c.fillRect(x, 5, 5, 2.6); }
    c.fillStyle = '#E2B33C'; c.fillRect(-66, 4, 134, 0.8); c.fillRect(-66, 8, 134, 0.8);
    c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.fillStyle = '#22314F'; c.beginPath(); c.roundRect(-16, -17, 34, 6, 3); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#E2B33C'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(-12 + i * 5.4, -15.6, 2, 1.2, 0, 0, TAU2); c.fill(); }
    c.beginPath(); c.moveTo(20, -13); c.lineTo(24, -40); c.quadraticCurveTo(34, -43, 44, -40); c.lineTo(46, -13); c.closePath(); c.fillStyle = bodyFill(c, '#34486F', '#1B2742', -42, -13); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    c.fillStyle = team; c.fillRect(23.5, -40, 21, 3);
    c.fillStyle = '#F2C94C'; c.font = '700 9px "Noto Sans KR", "IBM Plex Sans KR", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('세종', 34, -27); c.textBaseline = 'alphabetic';
    c.fillStyle = '#1B2742'; c.beginPath(); c.roundRect(16, -24, 36, 3.5, 1.5); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 1.2; c.stroke();
    c.save(); c.translate(-36, -3); c.strokeStyle = '#E2B33C'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(0, 0, 7, 0, TAU2); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 7, 2.6, t * 0.6, 0, TAU2); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 2.6, 7, 0, 0, TAU2); c.stroke();
    c.fillStyle = '#E2B33C'; c.beginPath(); c.arc(0, 0, 1.6, 0, TAU2); c.fill(); c.restore();
    porthole(c, 56, -3, 5);
  },
  // 회사 색 히든 잠수함 케이: 파랑 선체, 연두 K자 꼬리날개
  kird(c, t, team) {
    c.fillStyle = '#8CC63F'; c.strokeStyle = SUB_OUT; c.lineWidth = 1.8;
    c.beginPath(); c.roundRect(-66, -18, 5, 36, 2); c.fill(); c.stroke();
    shape(c, [-60, -1, -76, -20, -70, -22, -56, -4], '#8CC63F'); shape(c, [-60, 1, -76, 20, -70, 22, -56, 4], '#8CC63F');
    prop(c, -64, 0, t);
    const bp = new Path2D(); bp.moveTo(66, 2); bp.quadraticCurveTo(64, -12, 44, -13); bp.lineTo(-44, -11); bp.quadraticCurveTo(-60, -7, -62, 0); bp.quadraticCurveTo(-60, 7, -44, 10); bp.lineTo(44, 13); bp.quadraticCurveTo(64, 13, 66, 2); bp.closePath();
    c.fillStyle = bodyFill(c, '#4AA0EA', '#1C5C9A', -13, 13); c.fill(bp);
    c.save(); c.clip(bp); c.fillStyle = '#8CC63F'; c.fillRect(-64, 5, 132, 3.4); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(4, -8, 46, 3, 0, 0, TAU2); c.fill(); c.restore();
    c.strokeStyle = SUB_OUT; c.lineWidth = 2.2; c.stroke(bp);
    c.beginPath(); c.moveTo(14, -13); c.lineTo(18, -36); c.quadraticCurveTo(28, -39, 38, -36); c.lineTo(40, -12); c.closePath(); c.fillStyle = bodyFill(c, '#3D93DD', '#1F64A8', -38, -12); c.fill(); c.strokeStyle = SUB_OUT; c.lineWidth = 2; c.stroke();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(23, -32); c.lineTo(23, -17); c.moveTo(33, -32); c.lineTo(24.5, -24.5); c.lineTo(33, -17); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = team; c.fillRect(17.5, -38.5, 21, 2.6);
    const p = 0.6 + 0.4 * Math.sin(t * 3); c.fillStyle = `rgba(216,245,154,${p})`; c.beginPath(); c.arc(28, -42, 2.2, 0, TAU2); c.fill();
    porthole(c, 52, -3, 5.5, '#BFE0FF');
  },
};

// draw sub `id` at (x, y), scale s, facing -1 / 1
function drawSubAt(c, id, x, y, s, t, team, facing) {
  c.save(); c.translate(x, y); c.scale(facing < 0 ? -s : s, s); SUBDRAW[id](c, t, team); c.restore();
}
function subThumb(id, cw, ch, team) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  drawSubAt(x, id, cw / 2, ch / 2 + ch * 0.06, Math.min(cw / 160, ch / 95), 0.3, team || '#4FA3FF', 1);
  return c;
}
