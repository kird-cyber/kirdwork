// ================================================================ 봇 공통: A* 길찾기 · 시야 원뿔 · 소품 변신
function botPass(x, y) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return false; const i = gi(x, y), t = G[i];
  if (t === TL.WALL || t === TL.VOID || t === TL.WATER && !STATE.drained) return false;
  if (t === TL.DOOR) { const d = doorAt(x, y); return !d || doorUnlocked(d); }
  if (SOLID[i] || HOLES.has(i) || pushAt(x, y)) return false; return true;
}
function astar(sx, sy, tx, ty, maxN) {
  sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
  if (!botPass(tx, ty)) return null; const N = MW * MH, gS = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open = [[0, gi(sx, sy)]]; gS[gi(sx, sy)] = 0; let n = 0; const H = i => Math.abs(i % MW - tx) + Math.abs((i / MW | 0) - ty);
  const push = (f, i) => { open.push([f, i]); let k = open.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (open[p][0] <= open[k][0]) break;[open[p], open[k]] = [open[k], open[p]]; k = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let k = 0; for (; ;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === k) break;[open[m], open[k]] = [open[k], open[m]]; k = m; } } return top; };
  const goal = gi(tx, ty);
  while (open.length) {
    const [, c] = pop(); if (closed[c]) continue; closed[c] = 1; if (c === goal) break; if (++n > (maxN || 9000)) return null;
    const cx = c % MW, cy = c / MW | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (!botPass(nx, ny)) continue; if (dx && dy && (!botPass(cx + dx, cy) || !botPass(cx, cy + dy))) continue;
      const ni = gi(nx, ny), g = gS[c] + (dx && dy ? 1.414 : 1) + (G[ni] === TL.CONV ? 2 : 0); if (g < gS[ni]) { gS[ni] = g; from[ni] = c; push(g + H(ni), ni); }
    }
  }
  if (from[goal] < 0 && goal !== gi(sx, sy)) return null;
  const path = []; for (let c = goal; c !== gi(sx, sy) && c >= 0; c = from[c]) path.push([c % MW + .5, (c / MW | 0) + .5]);
  return path.reverse();
}
function randFloor(roomId) {
  for (let k = 0; k < 400; k++) {
    let x, y; if (roomId) { const r = ROOMS[RID[roomId]].r; x = r[0] + rndi(r[2] - r[0] + 1); y = r[1] + rndi(r[3] - r[1] + 1); } else { x = rndi(MW); y = rndi(MH); }
    if (botPass(x, y) && G[gi(x, y)] === TL.FLOOR && !GATEAT[gi(x, y)] && (!roomId || GR[gi(x, y)] === RID[roomId] || ROOMS[RID[roomId]].inner)) return [x + .5, y + .5];
  }
  return roomId ? roomCenter(roomId) : [64.5, 38.5];
}
function mkBot(o) { return Object.assign({ x: 64.5, y: 38.5, r: 0.34, a: 0, col: 'red', name: '', tread: 0, path: null, pathT: 0, goal: null, stuck: 0, lx: 0, ly: 0 }, o); }
function botGo(e, x, y) { if (e.failT && STATE.t < e.failT) { e.goal = null; e.path = null; return; } e.goal = [x, y]; e.path = astar(e.x, e.y, x, y, 14000); e.pathT = 0; if (!e.path) { e.failT = STATE.t + 0.7; e.goal = null; } }
// 한 걸음. 도착하면 true
function botStep(e, dt, sp) {
  if (!e.path || !e.path.length) return true;
  let [wx, wy] = e.path[0]; if (Math.hypot(wx - e.x, wy - e.y) < 0.3) { e.path.shift(); if (!e.path.length) return true;[wx, wy] = e.path[0]; }
  const a = Math.atan2(wy - e.y, wx - e.x), dx = Math.cos(a) * sp * dt, dy = Math.sin(a) * sp * dt;
  const ox = e.x, oy = e.y; moveEnt(e, dx, dy, 'bot'); e.a = lerpA(e.a, a, Math.min(1, dt * 10)); e.tread += dt * 30;
  if (Math.hypot(e.x - ox, e.y - oy) < sp * dt * 0.25) { e.stuck += dt; if (e.stuck > 0.6) { e.stuck = 0; if (e.goal) botGo(e, e.goal[0], e.goal[1]); else e.path = null; e.x += rnd(-.05, .05); e.y += rnd(-.05, .05); } } else e.stuck = 0;
  return false;
}
function sees(e, x, y, fov, range) {
  const d = Math.hypot(x - e.x, y - e.y); if (d > range) return false; if (d < 1.1) return true;
  let da = Math.abs(((Math.atan2(y - e.y, x - e.x) - e.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > fov / 2) return false;
  return los(e.x, e.y, x, y);
}
function drawCone(e, fov, range, col) {
  ctx.fillStyle = col || 'rgba(255,80,60,.13)'; ctx.beginPath(); ctx.moveTo(e.x * T, e.y * T);
  for (let k = 0; k <= 24; k++) { const a = e.a - fov / 2 + fov * k / 24, d = castRay(e.x, e.y, a, range); ctx.lineTo((e.x + Math.cos(a) * d) * T, (e.y + Math.sin(a) * d) * T); }
  ctx.closePath(); ctx.fill();
}
// ---------------------------------------------------------------- 소품
// ROOMPROPS(방별 소품)는 맵 파일이 채운다
const PROPN = { cone: '라바콘', barrel: '드럼통', scope: '소형 망원경', lamp: '조명', flask: '플라스크', server: '서버', router: '공유기', rock: '바위', coil: '코일', drum: '약품통', plant: '화분', chair: '의자', canister: '가스통', jar: '김치독', crate: '상자', bush: '덤불', stump: '그루터기', lantern: '정원등', duck: '오리 인형', bust: '흉상', bin: '휴지통', hydrant: '소화전', bike: '자전거', mailbox: '우체통', tire: '타이어', barrier: '바리케이드', book: '책 더미', cushion: '방석' };
function propsHere(x, y) { const r = roomAt(x, y); return ROOMPROPS[r ? r.id : 'corr'] || ROOMPROPS.corr; }
function drawProp(k, X, Y, a) {
  shadowE(X + 3, Y + 14, 16, 6);
  switch (k) {
    case 'cone': ctx.fillStyle = '#F2A23A'; ctx.beginPath(); ctx.moveTo(X, Y - 18); ctx.lineTo(X + 13, Y + 14); ctx.lineTo(X - 13, Y + 14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); rr(X - 9, Y - 2, 18, 5, 2, '#fff'); rr(X - 16, Y + 12, 32, 6, 2, '#F2A23A', OL, 2); break;
    case 'barrel': rr(X - 14, Y - 16, 28, 32, 6, '#FFD24A', OL, 2.5); line(X - 14, Y - 6, X + 14, Y - 6, OL, 2); line(X - 14, Y + 6, X + 14, Y + 6, OL, 2); break;
    case 'drum': circ(X, Y, 15, '#2E86D6', OL, 2.5); circ(X, Y, 8, '#8CC8FF', OL, 1.5); break;
    case 'canister': rr(X - 9, Y - 18, 18, 34, 8, '#C084FC', OL, 2.5); rr(X - 4, Y - 22, 8, 6, 2, '#5B6B82', OL, 1.5); break;
    case 'scope': circ(X, Y + 6, 10, '#5B6B82', OL, 2); ctx.save(); ctx.translate(X, Y); ctx.rotate(-0.7); rr(-5, -20, 10, 26, 3, '#DCE3EC', OL, 2); ctx.restore(); break;
    case 'lamp': circ(X, Y, 14, '#FFF4C2', OL, 2.5); circ(X, Y, 6, '#FFD24A'); break;
    case 'flask': ctx.fillStyle = '#B6F25A'; ctx.beginPath(); ctx.moveTo(X - 5, Y - 16); ctx.lineTo(X + 5, Y - 16); ctx.lineTo(X + 14, Y + 14); ctx.lineTo(X - 14, Y + 14); ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); break;
    case 'server': rr(X - 14, Y - 18, 28, 36, 3, '#151C2B', OL, 2); for (let r = 0; r < 4; r++) { ctx.fillStyle = (Math.sin(STATE.t * 5 + r + X) > 0) ? '#7CFF8A' : '#26324A'; ctx.fillRect(X - 8, Y - 12 + r * 8, 16, 3); } break;
    case 'router': rr(X - 15, Y - 6, 30, 14, 4, '#DCE3EC', OL, 2); line(X - 10, Y - 6, X - 14, Y - 18, OL, 2.5); line(X + 10, Y - 6, X + 14, Y - 18, OL, 2.5); break;
    case 'rock': ctx.fillStyle = '#6E5236'; ctx.beginPath(); for (let k2 = 0; k2 < 7; k2++) { const aa = k2 / 7 * 6.283, rad = 15 + (k2 % 3) * 2; ctx.lineTo(X + Math.cos(aa) * rad, Y + Math.sin(aa) * rad); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.stroke(); break;
    case 'coil': circ(X, Y, 15, '#7A8BA8', OL, 2.5); circ(X, Y, 9, '#F5C542', OL, 2); circ(X, Y, 3, OL); break;
    case 'plant': circ(X, Y + 6, 11, '#B5701A', OL, 2); circ(X - 6, Y - 3, 10, '#5E9A22', OL, 2); circ(X + 6, Y - 5, 9, '#8CC63F', OL, 2); circ(X, Y - 11, 8, '#7DB54C', OL, 2); break;
    case 'chair': rr(X - 13, Y - 13, 26, 26, 7, '#4C8DF0', OL, 2.5); rr(X - 13, Y - 13, 26, 8, 4, '#2B3F6B'); break;
    case 'jar': circ(X, Y, 16, '#5A3A1E', OL, 2.5); circ(X, Y, 9, '#3A2410', OL, 1.5); break;
    case 'bush': circ(X - 8, Y + 2, 11, '#3F7F2A', OL, 2); circ(X + 8, Y + 1, 12, '#4E9A33', OL, 2); circ(X, Y - 8, 12, '#62B23F', OL, 2); circ(X - 3, Y - 10, 3, 'rgba(255,255,255,.25)'); break;
    case 'stump': ell(X, Y + 2, 15, 12, '#7A4E26', OL, 2.5); ell(X, Y, 12, 9, '#C8995C', OL, 1.5); ctx.strokeStyle = 'rgba(90,55,25,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(X, Y, 7, 5, 0, 0, 7); ctx.stroke(); break;
    case 'lantern': rr(X - 3, Y - 4, 6, 20, 2, '#3A4152', OL, 1.5); circ(X, Y - 10, 10, '#FFE7A0', OL, 2); circ(X, Y - 10, 18, 'rgba(255,220,120,.18)'); break;
    case 'duck': ell(X, Y + 4, 15, 10, '#FFD24A', OL, 2); circ(X + 8, Y - 6, 8, '#FFD24A', OL, 2); ctx.fillStyle = '#F2802A'; ctx.fillRect(X + 13, Y - 7, 7, 4); circ(X + 10, Y - 8, 1.6, OL); break;
    case 'bust': rr(X - 12, Y + 2, 24, 14, 3, '#9AA6B8', OL, 2); circ(X, Y - 8, 10, '#DCE3EC', OL, 2); rr(X - 8, Y - 2, 16, 8, 3, '#C9D3E2', OL, 1.5); break;
    case 'bin': rr(X - 11, Y - 14, 22, 28, 4, '#5B8C5A', OL, 2.5); rr(X - 13, Y - 16, 26, 6, 3, '#3F6B3E', OL, 2); txt('♻', X, Y + 2, 12, '#fff', 900); break;
    case 'hydrant': rr(X - 8, Y - 14, 16, 26, 5, '#E0533F', OL, 2.5); circ(X, Y - 14, 8, '#C9402E', OL, 2); rr(X - 14, Y - 4, 28, 7, 3, '#C9402E', OL, 2); break;
    case 'bike': circ(X - 10, Y + 4, 9, null, OL, 3); circ(X + 10, Y + 4, 9, null, OL, 3); line(X - 10, Y + 4, X, Y - 6, '#2E86D6', 3); line(X, Y - 6, X + 10, Y + 4, '#2E86D6', 3); line(X - 3, Y - 10, X + 5, Y - 10, OL, 3); break;
    case 'mailbox': rr(X - 11, Y - 14, 22, 24, 6, '#E0533F', OL, 2.5); rr(X - 7, Y - 6, 14, 3, 1, OL); rr(X - 3, Y + 10, 6, 6, 1, '#5B6B82'); break;
    case 'tire': circ(X, Y, 15, '#22252E', OL, 2); circ(X, Y, 7, '#5B6B82', OL, 1.5); break;
    case 'barrier': rr(X - 16, Y - 8, 32, 14, 3, '#fff', OL, 2.5); for (let k = 0; k < 3; k++) { ctx.fillStyle = '#E0533F'; ctx.fillRect(X - 14 + k * 11, Y - 6, 5, 10); } rr(X - 14, Y + 6, 4, 9, 1, '#5B6B82'); rr(X + 10, Y + 6, 4, 9, 1, '#5B6B82'); break;
    case 'book': for (let k = 0; k < 4; k++) rr(X - 13 + k % 2 * 2, Y + 8 - k * 7, 26, 7, 2, ['#E0533F', '#2E86D6', '#FFD24A', '#2FA84F'][k], OL, 1.5); break;
    case 'cushion': rr(X - 14, Y - 12, 28, 24, 9, '#C084FC', OL, 2.5); circ(X, Y, 3, '#7C5CE0'); break;
    case 'crate': rr(X - 15, Y - 15, 30, 30, 3, '#C08A52', OL, 2.5); line(X - 15, Y - 15, X + 15, Y + 15, '#7A4E26', 2); line(X + 15, Y - 15, X - 15, Y + 15, '#7A4E26', 2); break;
  }
}
let PROPS = [];  // 장식용 작은 소품(통과 가능) — 숨바꼭질·탈출전
function scatterProps() {
  PROPS = []; for (const r of ROOMS) { if (r.hold || !ROOMPROPS[r.id]) continue; const n = r.nprops || (r.id === 'krri' ? 22 : 7); for (let k = 0; k < n; k++) { const [x, y] = randFloor(r.id); PROPS.push({ x, y, k: pick(ROOMPROPS[r.id]) }); } }
  const nc = MAP && MAP.corrProps !== undefined ? MAP.corrProps : 26;
  for (let k = 0, tries = 0; k < nc && tries < 2000; tries++) { let x, y; if (CORR.length) { const c = pick(CORR); x = c[0] + rndi(c[2] - c[0] + 1); y = c[1] + rndi(c[3] - c[1] + 1); } else { x = rndi(MW); y = rndi(MH); } if (GR[gi(x, y)] === -2 && G[gi(x, y)] === TL.FLOOR && botPass(x, y)) { PROPS.push({ x: x + .5, y: y + .5, k: pick(ROOMPROPS.corr) }); k++; } }
}
function drawProps() { for (const p of PROPS) { if (Math.abs(p.x * T - CAM.x) > VW / SC / 2 + 60 || Math.abs(p.y * T - CAM.y) > VH / SC / 2 + 60) continue; drawProp(p.k, p.x * T, p.y * T); } }
function setupOpenWorld() {
  STATE.drained = false; HOLES.clear(); FILLED.length = 0; PUSH = []; for (const id of ['gdoor', 'toolbox']) { const d = decorById(id); if (d) d.off = true; } bakeSolids();
  STATE.power = true; STATE.fusion = true; STATE.laserOK = true;
}
function ring(x, y, col) { FX.push({ k: 'ring', x, y, c: col || '#FFD24A', t: 0, life: 1.6 }); }
