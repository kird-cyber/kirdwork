// ============================================================== SHELLS
// Projectile art, one drawing per weapon (drawing only: the simulation never reads this file).
// look.shape picks the drawing, look.size scales it, look.color / look.glow tint it.
// Sizes are world px. Reference: a tank is ~105 px wide.
const SHELLS = (() => {
  const S = {}, TAU = Math.PI * 2;
  // fixed jitter per shell id, so a rock keeps the same outline for its whole flight
  const hr = (id, k) => { let h = ((id + 1) * 2654435761 + k * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h % 10000) / 10000; };
  const fr = Math.random; // flicker (look only)

  // ---- small helpers
  function rockPath(c, r, id, rot) {
    const n = 10; c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rot, rr = r * (0.76 + hr(id, i) * 0.34);
      i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
  }
  function shadedBall(c, r, hi, mid, lo, edge) {
    const g = c.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.08, 0, 0, r);
    g.addColorStop(0, hi); g.addColorStop(0.45, mid); g.addColorStop(1, lo);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = edge; c.lineWidth = Math.max(1.5, r * 0.12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.14, -0.6, 0, TAU); c.fill();
  }
  // flame tongue pointing toward -x (behind a shell flying toward +x)
  function flame(c, len, wid, tick) {
    const layers = [['rgba(255,80,20,0.75)', 1], ['rgba(255,170,50,0.9)', 0.68], ['rgba(255,245,190,0.95)', 0.36]];
    for (const [col, k] of layers) {
      const L = len * k * (0.85 + fr() * 0.3), W = wid * k;
      c.fillStyle = col; c.beginPath(); c.moveTo(0, -W);
      c.quadraticCurveTo(-L * 0.55, -W * (1.1 + Math.sin(tick * 30) * 0.15), -L, 0);
      c.quadraticCurveTo(-L * 0.55, W * (1.1 + Math.cos(tick * 27) * 0.15), 0, W);
      c.closePath(); c.fill();
    }
  }
  function kLetter(c, s, col) {
    c.strokeStyle = col; c.lineWidth = s * 0.26; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-s * 0.35, -s * 0.55); c.lineTo(-s * 0.35, s * 0.55);
    c.moveTo(s * 0.4, -s * 0.55); c.lineTo(-s * 0.3, 0); c.lineTo(s * 0.4, s * 0.55); c.stroke();
  }

  // ---- drawings. Each gets (c, look, p, s) with the origin at the shell and +x along its flight where it matters.
  const D = {};
  // 볼더: rough stone, tumbling
  D.rock = (c, look, p, s) => {
    const r = 15 * s, rot = (p.age || 0) * 7 * (p.vx < 0 ? -1 : 1);
    rockPath(c, r, p.id || 0, rot);
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, '#CFC4AA'); g.addColorStop(0.5, look.color || '#9A8F78'); g.addColorStop(1, '#4E4638');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#2B241C'; c.lineWidth = 2.4; c.stroke();
    c.save(); c.clip(); c.rotate(rot); c.strokeStyle = 'rgba(40,32,24,0.55)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-r * 0.5, -r * 0.1); c.lineTo(-r * 0.05, r * 0.15); c.lineTo(r * 0.25, -r * 0.35);
    c.moveTo(r * 0.05, r * 0.2); c.lineTo(r * 0.2, r * 0.6); c.stroke();
    c.fillStyle = 'rgba(60,50,38,0.5)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc((hr(p.id || 0, 20 + i) - 0.5) * r, (hr(p.id || 0, 30 + i) - 0.5) * r, 1.6, 0, TAU); c.fill(); }
    c.restore();
  };
  // 볼더 2번: burning boulder, glowing cracks, flames streaming behind
  D.firerock = (c, look, p, s) => {
    const r = 15 * s, a = Math.atan2(p.vy || 0, p.vx || 1), rot = (p.age || 0) * 5 * (p.vx < 0 ? -1 : 1), tick = p.age || 0;
    c.save(); c.rotate(a); flame(c, r * 3.4, r * 0.95, tick); c.restore();
    const glow = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.9); glow.addColorStop(0, 'rgba(255,140,40,0.55)'); glow.addColorStop(1, 'rgba(255,90,20,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, r * 1.9, 0, TAU); c.fill();
    rockPath(c, r, p.id || 0, rot);
    const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, '#8A6A52'); g.addColorStop(0.55, '#4A362A'); g.addColorStop(1, '#22160F');
    c.fillStyle = g; c.fill(); c.strokeStyle = '#140C08'; c.lineWidth = 2.6; c.stroke();
    c.save(); c.rotate(rot); c.lineCap = 'round';
    const crack = () => { c.beginPath(); c.moveTo(-r * 0.6, -r * 0.15); c.lineTo(-r * 0.1, r * 0.1); c.lineTo(r * 0.3, -r * 0.4); c.moveTo(-r * 0.1, r * 0.1); c.lineTo(r * 0.1, r * 0.6); c.moveTo(r * 0.3, -r * 0.4); c.lineTo(r * 0.62, -r * 0.1); c.stroke(); };
    c.strokeStyle = `rgba(255,120,30,${0.55 + fr() * 0.2})`; c.lineWidth = 4.5; crack();
    c.strokeStyle = '#FFE08A'; c.lineWidth = 1.6; crack();
    c.restore();
  };
  // 바이퍼 1번: poison arrow, green-tipped head, feather fletching
  D.arrow = (c, look, p, s) => {
    c.scale(s, s); const head = look.color || '#8EDB3A';
    c.fillStyle = '#B98B57'; c.strokeStyle = '#4A3420'; c.lineWidth = 1;
    c.fillRect(-30, -1.6, 44, 3.2); c.strokeRect(-30, -1.6, 44, 3.2);
    c.fillStyle = head; c.beginPath(); c.moveTo(-31, 0); c.lineTo(-38, -7); c.lineTo(-24, -7); c.lineTo(-19, -1.6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-31, 0); c.lineTo(-38, 7); c.lineTo(-24, 7); c.lineTo(-19, 1.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#E8EEF0'; c.beginPath(); c.moveTo(12, -4.5); c.lineTo(26, 0); c.lineTo(12, 4.5); c.lineTo(14, 0); c.closePath(); c.fill();
    c.strokeStyle = '#3A4248'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = head; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(17, -2.6); c.lineTo(25, 0); c.lineTo(17, 2.6); c.closePath(); c.fill(); c.globalAlpha = 1;
  };
  // 바이퍼 2번: heavy barbed harpoon bolt dripping venom
  D.bolt = (c, look, p, s) => {
    c.scale(s, s); const venom = look.color || '#6CC23A';
    c.fillStyle = 'rgba(140,240,80,0.28)'; c.beginPath(); c.ellipse(20, 0, 16, 10, 0, 0, TAU); c.fill();
    c.fillStyle = '#6B4E30'; c.strokeStyle = '#2C1E12'; c.lineWidth = 1.3;
    c.fillRect(-34, -2.6, 50, 5.2); c.strokeRect(-34, -2.6, 50, 5.2);
    c.fillStyle = '#A8B0B6'; c.fillRect(-36, -4, 6, 8); c.strokeRect(-36, -4, 6, 8);
    c.fillStyle = venom; c.beginPath(); c.moveTo(-32, -2.6); c.lineTo(-40, -9); c.lineTo(-28, -9); c.lineTo(-24, -2.6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-32, 2.6); c.lineTo(-40, 9); c.lineTo(-28, 9); c.lineTo(-24, 2.6); c.closePath(); c.fill(); c.stroke();
    // barbed head
    c.fillStyle = '#7E8890'; c.strokeStyle = '#262C30'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(14, -3); c.lineTo(10, -9); c.lineTo(20, -4); c.lineTo(32, 0); c.lineTo(20, 4); c.lineTo(10, 9); c.lineTo(14, 3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = venom; c.beginPath(); c.moveTo(20, -2.4); c.lineTo(30, 0); c.lineTo(20, 2.4); c.closePath(); c.fill();
  };
  // 해머 1번 (검콩): big black iron cannonball
  D.cannonball = (c, look, p, s) => { const r = 19 * s; shadedBall(c, r, '#8A9098', '#2A2D33', '#060708', '#000000'); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r + 1.5, 0.6, 2.4); c.stroke(); };
  // 해머 2번 (빨콩): small glossy red high-explosive shell
  D.redshell = (c, look, p, s) => {
    const r = 9 * s;
    const g = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2); g.addColorStop(0, 'rgba(255,60,40,0.45)'); g.addColorStop(1, 'rgba(255,40,20,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2, 0, TAU); c.fill();
    shadedBall(c, r, '#FFC2B4', '#F02A1C', '#7E0904', '#3A0402');
  };
  // 루키: modern pointed artillery shell with a copper band and a yellow HE ring
  D.shell = (c, look, p, s) => {
    c.scale(s, s); const body = look.color || '#5F7A30';
    c.fillStyle = 'rgba(255,224,138,0.8)'; c.beginPath(); c.arc(-17, 0, 3.5 + fr() * 1.5, 0, TAU); c.fill();
    c.strokeStyle = '#1E2612'; c.lineWidth = 1.3; c.fillStyle = body;
    c.beginPath(); c.moveTo(-16, -5); c.lineTo(-13, -6.5); c.lineTo(6, -6.5); c.quadraticCurveTo(16, -5.5, 22, 0); c.quadraticCurveTo(16, 5.5, 6, 6.5); c.lineTo(-13, 6.5); c.lineTo(-16, 5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#E2C23A'; c.fillRect(6, -6.3, 3, 12.6);
    c.fillStyle = '#B87333'; c.fillRect(-11, -6.8, 3.5, 13.6); c.strokeRect(-11, -6.8, 3.5, 13.6);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-12, -5, 18, 2);
  };
  // 트래퍼 1번: pineapple hand grenade with lever and pin ring, tumbling
  D.grenade = (c, look, p, s) => {
    c.scale(s, s); c.rotate((p.age || 0) * 9 * (p.vx < 0 ? -1 : 1));
    const body = look.color || '#5B6B2E';
    const g = c.createRadialGradient(-4, -3, 1, 0, 2, 13); g.addColorStop(0, '#A9B86A'); g.addColorStop(0.5, body); g.addColorStop(1, '#2A3214');
    c.fillStyle = g; c.strokeStyle = '#1A2008'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(0, 2, 10.5, 12.5, 0, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(20,26,8,0.6)'; c.lineWidth = 1;
    for (const y of [-4, 2, 8]) { c.beginPath(); c.moveTo(-10, y); c.lineTo(10, y); c.stroke(); }
    for (const x of [-5, 0, 5]) { c.beginPath(); c.moveTo(x, -10); c.lineTo(x, 14); c.stroke(); }
    c.fillStyle = '#8C9298'; c.strokeStyle = '#2A2E32'; c.lineWidth = 1.2;
    c.fillRect(-4, -15, 8, 6); c.strokeRect(-4, -15, 8, 6);
    c.beginPath(); c.moveTo(3, -14); c.quadraticCurveTo(12, -12, 10, 2); c.lineTo(8, 2); c.quadraticCurveTo(9, -10, 3, -11); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#D8DDE2'; c.lineWidth = 1.6; c.beginPath(); c.arc(-7, -14, 3.6, 0, TAU); c.stroke();
  };
  // 트래퍼 2번: spiked mine casing with a blinking red light
  D.minecase = (c, look, p, s) => {
    c.scale(s, s); c.rotate((p.age || 0) * 4);
    c.fillStyle = '#5A5E66'; c.strokeStyle = '#141518'; c.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.save(); c.rotate(a); c.beginPath(); c.moveTo(10, -2.4); c.lineTo(16, 0); c.lineTo(10, 2.4); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    const g = c.createRadialGradient(-3, -3, 1, 0, 0, 12); g.addColorStop(0, '#6A6E76'); g.addColorStop(1, '#1C1E22');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.stroke();
    const on = Math.floor((p.age || 0) * 8) % 2 === 0;
    c.fillStyle = on ? '#FF4A3A' : '#7A1A12'; c.beginPath(); c.arc(0, 0, 3.4, 0, TAU); c.fill();
    if (on) { c.fillStyle = 'rgba(255,80,60,0.35)'; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); }
  };
  // 스웜 1번: guided missile, red nose cone, tail fins, exhaust
  D.missile = (c, look, p, s) => {
    c.scale(s, s); const nose = look.color || '#FF7A3A';
    c.save(); c.translate(-22, 0); flame(c, 26, 5, p.age || 0); c.restore();
    c.fillStyle = '#9AA4B0'; c.strokeStyle = '#2A3038'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-22, -4.5); c.lineTo(-28, -12); c.lineTo(-14, -4.5); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-22, 4.5); c.lineTo(-28, 12); c.lineTo(-14, 4.5); c.closePath(); c.fill(); c.stroke();
    const g = c.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#D6DEE8'); g.addColorStop(1, '#8E98A6');
    c.fillStyle = g; c.beginPath(); c.roundRect(-23, -5, 37, 10, 2); c.fill(); c.stroke();
    c.fillStyle = '#C23A2A'; c.fillRect(-6, -5, 3, 10);
    c.fillStyle = '#9AA4B0'; c.beginPath(); c.moveTo(-2, -5); c.lineTo(2, -8.5); c.lineTo(6, -5); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-2, 5); c.lineTo(2, 8.5); c.lineTo(6, 5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = nose; c.beginPath(); c.moveTo(14, -5); c.quadraticCurveTo(24, -3, 28, 0); c.quadraticCurveTo(24, 3, 14, 5); c.closePath(); c.fill(); c.stroke();
  };
  // 스웜 2번: slim rocket from the launcher pod
  D.rocket = (c, look, p, s) => {
    c.scale(s, s); const nose = look.color || '#FF7A3A';
    c.save(); c.translate(-16, 0); flame(c, 18, 3.6, p.age || 0); c.restore();
    c.fillStyle = '#5E6656'; c.strokeStyle = '#20241C'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-16, -3); c.lineTo(-21, -8); c.lineTo(-10, -3); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-16, 3); c.lineTo(-21, 8); c.lineTo(-10, 3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#8A9280'; c.beginPath(); c.roundRect(-17, -3.4, 27, 6.8, 1.5); c.fill(); c.stroke();
    c.fillStyle = '#E2C23A'; c.fillRect(-4, -3.4, 2.2, 6.8);
    c.fillStyle = nose; c.beginPath(); c.moveTo(10, -3.4); c.quadraticCurveTo(17, -2, 20, 0); c.quadraticCurveTo(17, 2, 10, 3.4); c.closePath(); c.fill(); c.stroke();
  };
  // 프리즘: elongated laser bolt, coloured halo with a white-hot core
  D.laser = (c, look, p, s) => {
    const col = look.color || '#7FFFF2', L = 46 * s;
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    c.strokeStyle = col + '40'; c.lineWidth = 20 * s; c.beginPath(); c.moveTo(-L, 0); c.lineTo(6, 0); c.stroke();
    c.strokeStyle = col + 'B0'; c.lineWidth = 10 * s; c.beginPath(); c.moveTo(-L * 0.85, 0); c.lineTo(8, 0); c.stroke();
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(-L * 0.7, 0); c.lineTo(10, 0); c.stroke();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(10, 0, 4.5 * s, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over';
  };
  // 레이지 1번: pink plasma orb with crackling arcs
  D.plasma = (c, look, p, s) => {
    const r = 11 * s, col = look.color || '#FF3D7A';
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 2.2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.3, '#FFC2D8'); g.addColorStop(0.55, col + 'AA'); g.addColorStop(1, col + '00');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2.2, 0, TAU); c.fill();
    c.strokeStyle = '#FFE0EC'; c.lineWidth = 1.6;
    for (let k = 0; k < 3; k++) {
      let a = fr() * TAU; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
      for (let j = 1; j <= 4; j++) { a += (fr() - 0.5) * 0.9; const rr = r * (0.4 + j * 0.32); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  };
  // 레이지 2번: orbital targeting beacon pod with a blinking light
  D.beacon = (c, look, p, s) => {
    c.scale(s, s); const col = look.color || '#FF3D7A';
    const on = Math.floor((p.age || 0) * 10) % 2 === 0;
    if (on) { c.fillStyle = col + '55'; c.beginPath(); c.arc(10, 0, 14, 0, TAU); c.fill(); }
    c.fillStyle = '#3A3E48'; c.strokeStyle = '#121418'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-14, -3); c.lineTo(-20, -9); c.lineTo(-10, -4); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-14, 3); c.lineTo(-20, 9); c.lineTo(-10, 4); c.closePath(); c.fill(); c.stroke();
    const g = c.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#F2F4F8'); g.addColorStop(1, '#8A909C');
    c.fillStyle = g; c.beginPath(); c.roundRect(-15, -6, 26, 12, 6); c.fill(); c.stroke();
    c.fillStyle = col; c.fillRect(-9, -6, 3, 12); c.fillRect(-3, -6, 3, 12);
    c.fillStyle = on ? '#FFFFFF' : col; c.beginPath(); c.arc(10, 0, 3.6, 0, TAU); c.fill();
    c.strokeStyle = '#C8CCD4'; c.beginPath(); c.moveTo(-15, 0); c.lineTo(-24, 0); c.stroke();
  };
  // 케이 1번: blue sphere with a green band and a white K, spinning
  D.kball = (c, look, p, s) => {
    const r = 13 * s;
    shadedBall(c, r, '#BFE0FF', '#2E86D6', '#0F3460', '#0A2240');
    c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
    c.rotate((p.age || 0) * 6 * (p.vx < 0 ? -1 : 1));
    c.strokeStyle = '#8CC63F'; c.lineWidth = r * 0.28; c.beginPath(); c.moveTo(-r, r * 0.55); c.lineTo(r, r * 0.55); c.stroke();
    kLetter(c, r * 0.9, '#FFFFFF');
    c.restore();
  };
  // 케이 2번: green K-wing shell (splits at the top of its arc)
  D.ksplit = (c, look, p, s) => {
    c.scale(s, s);
    c.fillStyle = '#2E86D6'; c.strokeStyle = '#0A2240'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-4, -5); c.lineTo(-16, -15); c.lineTo(-12, -5); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-4, 5); c.lineTo(-16, 15); c.lineTo(-12, 5); c.closePath(); c.fill(); c.stroke();
    const g = c.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#D8F59A'); g.addColorStop(0.5, '#8CC63F'); g.addColorStop(1, '#4C7A1A');
    c.fillStyle = g; c.strokeStyle = '#2A4410'; c.beginPath(); c.moveTo(-14, -6); c.lineTo(8, -6); c.quadraticCurveTo(18, -4, 20, 0); c.quadraticCurveTo(18, 4, 8, 6); c.lineTo(-14, 6); c.closePath(); c.fill(); c.stroke();
    c.save(); c.translate(2, 0); kLetter(c, 7, '#FFFFFF'); c.restore();
  };
  // the two halves after the K split: one blue wing, one green wing
  D.kshard = (c, look, p, s) => {
    c.scale(s, s); const blue = look.color === '#2E86D6';
    c.fillStyle = (look.glow || '#FFFFFF') + '55'; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
    c.fillStyle = look.color; c.strokeStyle = blue ? '#0A2240' : '#2A4410'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(14, 0); c.lineTo(-6, -10); c.lineTo(-12, -6); c.lineTo(-4, 0); c.lineTo(-12, 6); c.lineTo(-6, 10); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.moveTo(10, 0); c.lineTo(-4, -6); c.lineTo(-2, 0); c.closePath(); c.fill();
  };
  // K-그린 1번 성장탄: a seed that swells into a leafy ball the longer it flies (x0.75 → x1.4 over 3.2 s, same as the sim)
  D.seed = (c, look, p, s) => {
    const g = Math.min(1, (p.age || 0) / 3.2), k = (0.75 + 0.65 * g) * s, r = 11 * k;
    if (g > 0.5) { c.fillStyle = `rgba(216,245,154,${0.25 + 0.35 * (g - 0.5)})`; c.beginPath(); c.arc(0, 0, r * 1.9, 0, TAU); c.fill(); }
    shadedBall(c, r, '#F4FFD0', '#8CC63F', '#3E6E14', '#1F3A0A');
    c.save(); c.rotate((p.age || 0) * 3 * (p.vx < 0 ? -1 : 1));
    const leaves = 1 + Math.floor(g * 3.99);
    for (let i = 0; i < leaves; i++) {
      c.save(); c.rotate(i * TAU / 4); c.translate(0, -r * 0.95);
      c.fillStyle = i % 2 ? '#2E86D6' : '#B6F25A'; c.strokeStyle = '#1F3A0A'; c.lineWidth = 1.2;
      const lw = r * (0.35 + 0.35 * g), lh = r * (0.6 + 0.6 * g);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(lw, -lh * 0.5, 0, -lh); c.quadraticCurveTo(-lw, -lh * 0.5, 0, 0); c.fill(); c.stroke();
      c.restore();
    }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.18, -0.6, 0, TAU); c.fill();
  };
  // K-그린 2번 뿌리탄: an acorn-like seed with a root tail (drawn along the flight)
  D.rootseed = (c, look, p, s) => {
    c.scale(s, s);
    c.strokeStyle = '#7A5A30'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(-16, -5, -22, 1); c.quadraticCurveTo(-27, 6, -32, 2); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-14, -1); c.quadraticCurveTo(-18, 6, -24, 9); c.stroke();
    const g = c.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, '#E6F8B0'); g.addColorStop(0.5, '#6AA22E'); g.addColorStop(1, '#2C4A12');
    c.fillStyle = g; c.strokeStyle = '#1F3A0A'; c.lineWidth = 1.4;
    c.beginPath(); c.ellipse(2, 0, 12, 9, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#2E86D6'; c.beginPath(); c.ellipse(9, 0, 5, 8.5, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-1, -4, 5, 2.2, 0, 0, TAU); c.fill();
  };
  // plain ball (teleport shell and anything without its own drawing)
  D.ball = (c, look, p, s) => {
    const r = 7 * 2.1 * s;
    if (look.glow) { c.fillStyle = look.glow + '55'; c.beginPath(); c.arc(0, 0, r * 1.9, 0, TAU); c.fill(); }
    shadedBall(c, r, '#FFFFFF', look.color, look.color, '#1A1A1A');
  };

  // shapes drawn along the flight direction (the rest handle their own spin / stay upright)
  const ALIGNED = { arrow: 1, bolt: 1, shell: 1, missile: 1, rocket: 1, laser: 1, beacon: 1, ksplit: 1, kshard: 1, rootseed: 1 };
  S.draw = function (c, look, p) {
    const fn = D[look.shape] || D.ball, s = look.size || 1;
    c.save(); c.translate(p.x, p.y);
    if (ALIGNED[look.shape]) c.rotate(Math.atan2(p.vy || 0, p.vx || 1));
    fn(c, look, p, s);
    c.restore();
  };
  S.has = shape => !!D[shape];

  // trail line behind the shell: colour, width, alpha, points kept (null = no line)
  const TRAIL = {
    rock: null, firerock: null, grenade: null, minecase: null, beacon: { col: 'rgba(255,61,122,1)', w: 2, a: 0.35, n: 20 },
    arrow: { col: 'rgba(255,255,255,1)', w: 2, a: 0.35, n: 14 }, bolt: { col: 'rgba(160,240,100,1)', w: 3, a: 0.4, n: 16 },
    cannonball: { col: 'rgba(60,60,64,1)', w: 6, a: 0.28, n: 22 }, redshell: { col: 'rgba(255,60,40,1)', w: 3.5, a: 0.7, n: 22 },
    shell: { col: 'rgba(255,224,138,1)', w: 2.5, a: 0.55, n: 20 }, missile: null, rocket: null,
    laser: { col: null, w: 8, a: 0.9, n: 44, glow: 22 }, plasma: { col: 'rgba(255,120,170,1)', w: 7, a: 0.45, n: 24 },
    kball: { col: 'rgba(140,200,255,1)', w: 4, a: 0.5, n: 22 }, ksplit: { col: 'rgba(216,245,154,1)', w: 4, a: 0.5, n: 22 }, kshard: { col: 'rgba(255,255,255,1)', w: 3, a: 0.45, n: 16 },
    seed: { col: 'rgba(182,242,90,1)', w: 4, a: 0.5, n: 24 }, rootseed: { col: 'rgba(122,90,48,1)', w: 3, a: 0.45, n: 18 },
  };
  S.trail = shape => (shape in TRAIL ? TRAIL[shape] : { col: 'rgba(255,255,255,1)', w: 5, a: 0.6, n: 28 });

  // particles the shell leaves while flying (push(fx) adds one to the renderer's effect list)
  S.emit = function (shape, p, push) {
    const back = Math.atan2(p.vy || 0, p.vx || 1) + Math.PI, bx = Math.cos(back), by = Math.sin(back);
    switch (shape) {
      case 'missile': if (fr() < 0.8) push({ kind: 'smoke', x: p.x + bx * 30, y: p.y + by * 30, vy: -8, t: 0, life: 0.9, r: 6 + fr() * 7 }); break;
      case 'rocket': if (fr() < 0.6) push({ kind: 'smoke', x: p.x + bx * 20, y: p.y + by * 20, vy: -8, t: 0, life: 0.6, r: 4 + fr() * 5 }); break;
      case 'firerock':
        if (fr() < 0.7) push({ kind: 'ember', x: p.x + bx * 20 + (fr() - 0.5) * 16, y: p.y + by * 20 + (fr() - 0.5) * 16, vx: bx * 30, vy: -30 - fr() * 30, t: 0, life: 0.6 + fr() * 0.4, col: fr() < 0.5 ? '#FFB040' : '#FF6A20' });
        if (fr() < 0.4) push({ kind: 'smoke', x: p.x + bx * 36, y: p.y + by * 36, vy: -20, t: 0, life: 1.1, r: 8 + fr() * 8, dark: true });
        break;
      case 'rock': if (fr() < 0.25) push({ kind: 'dust', x: p.x + bx * 12, y: p.y + by * 12, vx: 0, vy: -6, t: 0, life: 0.5, r: 4 + fr() * 3, col: '#B5AA95' }); break;
      case 'cannonball': if (fr() < 0.35) push({ kind: 'smoke', x: p.x + bx * 18, y: p.y + by * 18, vy: -6, t: 0, life: 0.7, r: 6 + fr() * 5 }); break;
      case 'bolt': if (fr() < 0.35) push({ kind: 'drip', x: p.x + (fr() - 0.5) * 10, y: p.y + 4, vx: 0, vy: 30, t: 0, life: 0.7, col: '#8EDB3A' }); break;
      case 'arrow': if (fr() < 0.15) push({ kind: 'drip', x: p.x, y: p.y + 3, vx: 0, vy: 30, t: 0, life: 0.6, col: '#8EDB3A' }); break;
      case 'plasma': if (fr() < 0.5) push({ kind: 'spark', x: p.x + (fr() - 0.5) * 14, y: p.y + (fr() - 0.5) * 14, vx: (fr() - 0.5) * 60, vy: (fr() - 0.5) * 60, t: 0, life: 0.3, col: '#FFC2D8' }); break;
    }
  };

  // sound family for the firing noise
  const SFX = { arrow: 'arrow', bolt: 'arrow', missile: 'missile', rocket: 'missile', laser: 'beam', plasma: 'beam', beacon: 'beam', grenade: 'grenade', minecase: 'grenade', redshell: 'redshell', rock: 'rock', firerock: 'rock' };
  S.sfx = shape => SFX[shape] || 'ball';
  return S;
})();
