// M3: every tank / weapon / item spec line verified in a controlled flat test field.
// run: node tests/spec.test.js  -> prints a table and writes tests/out/spec.json
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {CONFIG,createMatch,step,cmdFire,cmdMove,cmdItem,cmdTimeout,explode,tankCenter,updateTilt,surfaceAt,stateHash,curTank,beginTurn};')();
const { CONFIG } = A;
const GROUND = 800;
const rows = [];
const check = (tank, item, expected, actual, pass) => rows.push({ tank, item, expected: String(expected), actual: String(actual), pass: !!pass });
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// flat field, tanks at given x, everyone settled; returns match with phase 'aim' for players[0]
function field(specs, opts) {
  opts = opts || {};
  const players = specs.map((s, i) => ({ id: 'p' + i, nick: 'p' + i, team: s.team || (i === 0 ? 'red' : 'blue'), tankId: s.tank }));
  const m = A.createMatch({ seed: opts.seed || 7, mapId: 'temple', players });
  m.mask.fill(0);
  for (let y = GROUND; y < m.H; y++) m.mask.fill(1, y * m.W, (y + 1) * m.W);
  m.tanks.forEach((t, i) => { t.x = specs[i].x; t.y = GROUND; t.facing = specs[i].facing || 1; t.delay = i === 0 ? 0 : 500 + i; A.updateTilt(m, t); });
  m.wind = 0; m.crates = []; m.mines = []; m.happening = null; m.column = null;
  // force first turn to player 0, no wind, no crate
  m.phase = 'aim'; m.turnNo = 1; m.cur = 0; m.turn = { actions: [], itemUsed: false, double: false, amp: false, movedPx: 0 };
  m.tanks[0].fuel = CONFIG.tanks[specs[0].tank].movePx;
  return m;
}
function runFlight(m, maxTicks) {
  const evs = []; let n = 0;
  while (m.phase !== 'aim' && m.phase !== 'over' && n < (maxTicks || 6000)) { A.step(m); n++; for (const e of m.events) evs.push(Object.assign({ tick: m.tick }, e)); m.events.length = 0; }
  return evs;
}
function fireAndTrace(m, angle, power, weapon) {
  const shots = []; m.events.length = 0;
  A.cmdFire(m, angle, power, weapon);
  let n = 0, firstProj = null;
  const traj = [];
  while (m.phase === 'flight' && n < 8000) {
    A.step(m); n++;
    if (m.proj.length && !firstProj) firstProj = Object.assign({}, m.proj[0]);
    if (m.proj[0]) traj.push([m.proj[0].x, m.proj[0].y]);
    for (const e of m.events) shots.push(Object.assign({ tick: m.tick }, e)); m.events.length = 0;
  }
  return { evs: shots, firstProj, traj };
}
const carvedCount = (m, cx, cy, r0) => { const r = Math.ceil(r0); let c = 0; for (let y = Math.max(GROUND, cy - r - 2); y <= cy + r + 2; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) if (!m.mask[y * m.W + x]) c++; return c; };

// ---------------------------------------------------------------- base stats for all tanks
for (const [id, d] of Object.entries(CONFIG.tanks)) {
  const m = field([{ tank: id, x: 1500 }, { tank: 'rookie', x: 3500 }]);
  const t = m.tanks[0];
  check(d.name, '체력', d.hp, t.maxhp, t.maxhp === d.hp);
  // movement: walk right until fuel runs out on flat ground
  const x0 = t.x; let steps = 0; while (A.cmdMove(m, 1) && steps < 5000) steps++;
  check(d.name, '이동거리(px)', d.movePx, Math.round(t.x - x0), near(t.x - x0, d.movePx, 1));
  // angle clamp
  const m2 = field([{ tank: id, x: 1500 }, { tank: 'rookie', x: 3500 }]);
  const inp = A.cmdFire(m2, -20, 500, 0);
  const inp2 = (() => { const m3 = field([{ tank: id, x: 1500 }, { tank: 'rookie', x: 3500 }]); return A.cmdFire(m3, 200, 500, 0); })();
  check(d.name, '발사각 범위', `${d.angleMin}~${d.angleMax}`, `${inp.angle}~${inp2.angle}`, inp.angle === d.angleMin && inp2.angle === d.angleMax);
  // delay after a plain shot without moving
  check(d.name, '발사 딜레이', CONFIG.turn.baseDelay[d.speedClass], m2.tanks[0].delay, m2.tanks[0].delay === CONFIG.turn.baseDelay[d.speedClass]);
  // damage taken multiplier: explode 300 dmg exactly on centre
  const m4 = field([{ tank: 'rookie', x: 1000 }, { tank: id, x: 2500 }]);
  const v = m4.tanks[1], c = A.tankCenter(v), hp0 = v.hp;
  A.explode(m4, c.x, c.y, 40, 300, m4.tanks[0], null, false);
  check(d.name, '받는 피해', `300×${d.dmgTaken}=${Math.round(300 * d.dmgTaken)}`, hp0 - v.hp, hp0 - v.hp === Math.round(300 * d.dmgTaken));
}

// damage falloff: 100% at the centre down to edgeDmg at r*blastDmgMul + bodyRadius
const fall = (dist, r) => { const P = CONFIG.physics, reach = r * P.blastDmgMul + P.bodyRadius; return 1 - (1 - P.edgeDmg) * Math.min(1, dist / reach); };
// ---------------------------------------------------------------- weapon damage + radius for every weapon
for (const [id, d] of Object.entries(CONFIG.tanks)) d.weapons.forEach((w, wi) => {
  const m = field([{ tank: id, x: 1500 }, { tank: 'rookie', x: 3500 }]);
  const cx = 2500, cy = GROUND;
  A.explode(m, cx, cy, w.radius, w.dmg, m.tanks[0], w, false);
  const cr = w.radius * CONFIG.physics.blastCarveMul;
  const area = carvedCount(m, cx, cy, cr), half = Math.PI * cr * cr / 2;
  check(d.name, `${w.name} 땅 파임 반경 (${w.radius}×${CONFIG.physics.blastCarveMul})`, Math.round(cr) + 'px', `파인 면적 ${Math.round(area)} (반원 ${Math.round(half)})`, Math.abs(area - half) < Math.PI * cr + 4);
  const m2 = field([{ tank: id, x: 1000 }, { tank: 'rookie', x: 2500 }]);
  const v = m2.tanks[1], c = A.tankCenter(v); const hp0 = v.hp;
  A.explode(m2, c.x + 15, c.y, w.radius, w.dmg, m2.tanks[0], w, false);
  const exp = Math.round(w.dmg * fall(15, w.radius) * 0.9);
  check(d.name, `${w.name} 피해(15px 거리, 루키)`, exp, hp0 - v.hp, hp0 - v.hp === exp);
  if (wi === 0) {
    const reach = w.radius * CONFIG.physics.blastDmgMul + CONFIG.physics.bodyRadius;
    const m3 = field([{ tank: id, x: 1000 }, { tank: 'rookie', x: 2500 }]), v3 = m3.tanks[1], c3 = A.tankCenter(v3), h3 = v3.hp;
    A.explode(m3, c3.x + reach - 2, c3.y, w.radius, w.dmg, m3.tanks[0], w, false);
    const m4 = field([{ tank: id, x: 1000 }, { tank: 'rookie', x: 2500 }]), v4 = m4.tanks[1], c4 = A.tankCenter(v4), h4 = v4.hp;
    A.explode(m4, c4.x + reach + 2, c4.y, w.radius, w.dmg, m4.tanks[0], w, false);
    check(d.name, `${w.name} 피해 거리 ${Math.round(reach)}px (안: 피해, 밖: 없음)`, '안 >0, 밖 0', `안 ${h3 - v3.hp}, 밖 ${h4 - v4.hp}`, h3 - v3.hp > 0 && h4 - v4.hp === 0);
  }
});

// ---------------------------------------------------------------- tank-specific traits
{ // boulder: heavy shot halves wind drift
  const drift = (tank, wind) => { const m = field([{ tank, x: 1000 }, { tank: 'rookie', x: 4000 }]); m.wind = wind; const r = fireAndTrace(m, 45, 600, 0); return r.traj; };
  const land = tr => tr[tr.length - 1][0];
  const b0 = land(drift('boulder', 0)), b10 = land(drift('boulder', 10)), h0 = land(drift('hammer', 0)), h10 = land(drift('hammer', 10));
  const ratio = (b10 - b0) / (h10 - h0);
  check('볼더', '무게탄: 바람 영향 절반', '0.50', ratio.toFixed(2), near(ratio, 0.5, 0.08));
  // roll: second explosion ~66 ticks after the first, about 80 px away
  const m = field([{ tank: 'boulder', x: 1000 }, { tank: 'rookie', x: 4000 }]);
  m.mask.fill(0); for (let x = 0; x < m.W; x++) { const g = GROUND + Math.floor((x - 1000) * 0.08); for (let y = Math.max(0, g); y < m.H; y++) m.mask[y * m.W + x] = 1; }
  m.tanks[0].y = A.surfaceAt(m, 1000, 0); A.updateTilt(m, m.tanks[0]);
  const r = fireAndTrace(m, 50, 640, 1);
  const booms = r.evs.filter(e => e.type === 'boom');
  const gap = booms.length >= 2 ? booms[1].tick - booms[0].tick : -1, dist = booms.length >= 2 ? Math.round(booms[1].x - booms[0].x) : 0;
  check('볼더', '거대 바위: 굴러서 2차 폭발', '66틱 뒤, ±80px', `${gap}틱 뒤, ${dist}px`, gap === 66 && Math.abs(dist) === 80);
}
{ // viper poison + venom heal cut + amplify poison
  const m = field([{ tank: 'viper', x: 1000 }, { tank: 'rookie', x: 2500 }]);
  A.explode(m, A.tankCenter(m.tanks[1]).x, A.tankCenter(m.tanks[1]).y, 30, 200, m.tanks[0], CONFIG.tanks.viper.weapons[0], false);
  const p = m.tanks[1].poison;
  const PD = CONFIG.tanks.viper.weapons[0].onHit.poison.dmg;
  check('바이퍼', `독화살: 독 ${PD} × 3턴`, `${PD}×3`, p ? `${p.dmg}×${p.turns}` : '없음', p && p.dmg === PD && p.turns === 3);
  // poison ticks at the start of the victim's turns
  const v = m.tanks[1]; let hp = v.hp, ticks = [];
  for (let k = 0; k < 4; k++) { m.tanks[0].delay = 9999; v.delay = 0; m.phase = 'settle'; m.settle = 0; let g = 0; while (m.phase !== 'aim' && g++ < 5000) A.step(m); ticks.push(hp - v.hp); hp = v.hp; }
  check('바이퍼', '독 피해가 턴마다 들어감', `${PD}, ${PD}, ${PD}, 0`, ticks.join(', '), ticks.join() === `${PD},${PD},${PD},0`);
  const m2 = field([{ tank: 'rookie', x: 1000 }, { tank: 'viper', x: 2500 }]);
  const t = m2.tanks[0]; t.poison = { dmg: 80, turns: 3, healCut: 0.5 }; t.hp = 400; t.items = ['heal'];
  A.cmdItem(m2, 0);
  check('바이퍼', '맹독: 회복 아이템 효과 50%', '+125', '+' + (t.hp - 400), t.hp - 400 === 125);
  const m3 = field([{ tank: 'viper', x: 1000 }, { tank: 'rookie', x: 2500 }]);
  A.explode(m3, A.tankCenter(m3.tanks[1]).x, A.tankCenter(m3.tanks[1]).y, 30, 200, m3.tanks[0], CONFIG.tanks.viper.weapons[0], true);
  check('바이퍼', '증폭이 독에도 적용', `${PD}×1.5=${Math.round(PD * 1.5)}`, m3.tanks[1].poison.dmg, m3.tanks[1].poison.dmg === Math.round(PD * 1.5));
}
{ // hammer crit and cooldown
  const w = CONFIG.tanks.hammer.weapons[0];
  const hit = off => { const m = field([{ tank: 'hammer', x: 1000 }, { tank: 'rookie', x: 2500 }]); const v = m.tanks[1], c = A.tankCenter(v), h = v.hp; A.explode(m, c.x + off, c.y, w.radius, w.dmg, m.tanks[0], w, false); return h - v.hp; };
  const a = hit(5), b = hit(5.0001);
  const base = Math.round(w.dmg * fall(5, w.radius) * 0.9), crit = Math.round(w.dmg * fall(5, w.radius) * 1.2 * 0.9);
  check('해머', '정타(10px 안) 피해 +20%', crit, a, a === crit && a > base);
  const off = hit(12), plain = Math.round(w.dmg * fall(12, w.radius) * 0.9);
  check('해머', '10px 밖은 정타 아님', plain, off, off === plain);
  const m = field([{ tank: 'hammer', x: 1000 }, { tank: 'rookie', x: 3000 }]);
  A.cmdFire(m, 45, 500, 1);
  const t = m.tanks[0];
  const cds = [t.cd];
  for (let k = 0; k < 3; k++) { t.delay = 0; m.tanks[1].delay = 9999; m.phase = 'settle'; m.settle = 9999; m.proj = []; m.sched = []; A.step(m); cds.push(t.cd); if (m.phase === 'aim') { const inp = A.cmdFire(m, 45, 300, 1); cds.push('w' + inp.weapon); } }
  check('해머', '홍염탄 3턴 재충전', '3 → 2 → 1 → 0(사용 가능)', cds.join(' '), cds[0] === 3 && cds[2] === 'w0' && cds[cds.length - 1] === 'w1');
}
{ // rookie twin
  const m = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  const r = fireAndTrace(m, 30, 600, 1);
  const shots = r.evs.filter(e => e.type === 'shot');
  check('루키', '2연발: 36틱 간격 두 발', '2발, 36틱', `${shots.length}발, ${shots.length > 1 ? shots[1].tick - shots[0].tick : '-'}틱`, shots.length === 2 && shots[1].tick - shots[0].tick === 36);
}
{ // trapper mines
  const m = field([{ tank: 'trapper', x: 1000 }, { tank: 'rookie', x: 3500 }]);
  fireAndTrace(m, 30, 500, 1);
  check('트래퍼', '지뢰 2개 설치', 2, m.mines.length, m.mines.length === 2);
  let total = 0; for (let k = 0; k < 4; k++) { const m2 = field([{ tank: 'trapper', x: 1000 }, { tank: 'rookie', x: 3500 }]); m2.mines = m.mines.slice(); fireAndTrace(m2, 30, 400 + k * 80, 1); total = Math.max(total, m2.mines.length); }
  const mm = field([{ tank: 'trapper', x: 1000 }, { tank: 'rookie', x: 3500 }]);
  for (let k = 0; k < 5; k++) { mm.phase = 'aim'; mm.cur = 0; mm.turn = { actions: [], itemUsed: false, double: false, amp: false, movedPx: 0 }; fireAndTrace(mm, 20 + k * 5, 300 + k * 90, 1); }
  check('트래퍼', '지뢰 맵 최대 6개', 6, mm.mines.length, mm.mines.length === 6);
  // walking onto a mine
  const m3 = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  m3.mines.push({ x: 1040, y: GROUND, owner: m3.tanks[1], dead: false, id: 1 });
  const hp0 = m3.tanks[0].hp; let s = 0; while (A.cmdMove(m3, 1) && s < 200 && m3.mines.length && !m3.mines[0].dead) s++;
  check('트래퍼', '지뢰 밟으면 폭발(최대 250)', '≤250, >0', hp0 - m3.tanks[0].hp, hp0 - m3.tanks[0].hp > 0 && hp0 - m3.tanks[0].hp <= 250);
}
{ // swarm power and spread
  const sp = tank => { const m = field([{ tank, x: 1000 }, { tank: 'rookie', x: 3500 }]); const r = fireAndTrace(m, 45, 1000, 0); return Math.sqrt(r.firstProj.vx ** 2 + r.firstProj.vy ** 2); };
  const ratio = sp('swarm') / sp('rookie');
  check('스웜', '최대 파워 +15%', '1.15', ratio.toFixed(3), near(ratio, 1.15, 0.01));
  const m = field([{ tank: 'swarm', x: 1000 }, { tank: 'rookie', x: 3500 }]);
  const r = fireAndTrace(m, 45, 600, 1);
  const shots = r.evs.filter(e => e.type === 'shot'), booms = r.evs.filter(e => e.type === 'boom');
  check('스웜', '다연장: 6발 부채꼴', '6발', `${shots.length}발, 착탄 폭 ${Math.round(Math.max(...booms.map(b => b.x)) - Math.min(...booms.map(b => b.x)))}px`, shots.length === 6 && booms.length === 6);
}
{ // prism
  const m = field([{ tank: 'prism', x: 1000 }, { tank: 'rookie', x: 4000 }]); m.wind = 10;
  const r = fireAndTrace(m, 20, 700, 0);
  const m2 = field([{ tank: 'prism', x: 1000 }, { tank: 'rookie', x: 4000 }]); m2.wind = 0;
  const r2 = fireAndTrace(m2, 20, 700, 0);
  const l1 = r.traj[r.traj.length - 1][0], l2 = r2.traj[r2.traj.length - 1][0];
  check('프리즘', '광선: 바람 무시', '바람 10과 0의 착탄 차이 0', Math.round(l1 - l2), Math.abs(l1 - l2) < 0.001);
  // gravity 0.3: compare apex drop rate via vy change over 60 ticks
  const g = tank => { const mm = field([{ tank, x: 1000 }, { tank: 'rookie', x: 4000 }]); A.cmdFire(mm, 30, 600, 0); let v0 = null, k = 0; while (k < 80) { A.step(mm); k++; if (mm.proj[0] && v0 === null) v0 = mm.proj[0].vy; } return (mm.proj[0].vy - v0); };
  const gr = g('prism') / g('rookie');
  check('프리즘', '광선: 중력 0.3배', '0.30', gr.toFixed(2), near(gr, 0.3, 0.02));
  const m3 = field([{ tank: 'prism', x: 1000 }, { tank: 'rookie', x: 4000 }]);
  const r3 = fireAndTrace(m3, 20, 600, 1);
  check('프리즘', '3분광: 3발 ±8°', '3발', r3.evs.filter(e => e.type === 'shot').length + '발', r3.evs.filter(e => e.type === 'shot').length === 3);
  const m4 = field([{ tank: 'prism', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  m4.mines.push({ x: 1040, y: GROUND, owner: m4.tanks[1], dead: false, id: 1 });
  let s = 0; while (A.cmdMove(m4, 1) && s < 200) s++;
  check('프리즘', '호버: 지뢰를 밟지 않음', '지뢰 그대로', m4.mines.length && !m4.mines[0].dead ? '그대로' : '터짐', m4.mines.length === 1 && !m4.mines[0].dead);
}
{ // rage orbital + berserk
  const m = field([{ tank: 'rage', x: 1000 }, { tank: 'rookie', x: 3500 }]);
  const r = fireAndTrace(m, 60, 650, 1);
  const beam = r.evs.find(e => e.type === 'beam'), boom = r.evs.find(e => e.type === 'boom');
  const OR = CONFIG.tanks.rage.weapons[1].radius;
  check('레이지', `궤도 낙하: 빔 후 72틱 뒤 반경 ${OR} 폭발`, `72틱, ${OR}px`, beam && boom ? `${boom.tick - beam.tick}틱, ${boom.r}px` : '없음', beam && boom && boom.tick - beam.tick === 72 && boom.r === OR);
  const rad = hpFrac => { const mm = field([{ tank: 'rage', x: 1000 }, { tank: 'rookie', x: 3500 }]); mm.tanks[0].hp = Math.round(mm.tanks[0].maxhp * hpFrac); const rr = fireAndTrace(mm, 60, 650, 0); return rr.evs.find(e => e.type === 'boom').r; };
  const a = rad(0.6), b = rad(0.45);
  const BM = CONFIG.tanks.rage.traits.berserk.mul;
  check('레이지', `광폭화: 체력 50% 아래 반경·피해 ×${BM}`, `40 → ${40 * BM}`, `${a} → ${b}`, a === 40 && Math.abs(b - 40 * BM) < 1e-9);
}
{ // items
  const m = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  m.tanks[0].items = ['double']; A.cmdItem(m, 0);
  const r = fireAndTrace(m, 30, 600, 0);
  check('아이템', '더블샷: 같은 무기 두 번', '2발', r.evs.filter(e => e.type === 'shot').length + '발', r.evs.filter(e => e.type === 'shot').length === 2);
  const m2 = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); const t = m2.tanks[0]; t.hp = 500; t.items = ['heal']; A.cmdItem(m2, 0);
  check('아이템', '회복 +250', 750, t.hp, t.hp === 750);
  const m3 = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); m3.tanks[0].items = ['tele']; A.cmdItem(m3, 0);
  const hp3 = m3.tanks[1].hp, rt = fireAndTrace(m3, 30, 700, 1), land = rt.evs.find(e => e.type === 'tele');
  check('아이템', '텔레포트: 포탄이 떨어진 지면으로 이동', '착탄 지점·지면, 폭발 없음', land ? `x ${land.x2}, y ${m3.tanks[0].y}, 폭발 ${rt.evs.filter(e => e.type === 'boom').length}` : '이동 없음',
    !!land && m3.tanks[0].x === land.x2 && m3.tanks[0].x > 1300 && m3.tanks[0].y === GROUND && !rt.evs.some(e => e.type === 'boom') && m3.tanks[1].hp === hp3 && rt.evs.filter(e => e.type === 'shot').length === 1);
  const m5 = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); m5.tanks[0].items = ['tele']; m5.tanks[0].facing = -1; A.cmdItem(m5, 0);
  const ro = fireAndTrace(m5, 40, 1000, 0);
  check('아이템', '텔레포트: 맵 밖으로 나가면 실패(제자리)', 'x 1000', `x ${m5.tanks[0].x}`, m5.tanks[0].x === 1000 && ro.evs.some(e => e.type === 'out' && e.tele));
  const m4 = field([{ tank: 'trapper', x: 1000 }, { tank: 'rookie', x: 2500 }]); const v = m4.tanks[1]; v.shield = true; const h = v.hp; const c = A.tankCenter(v);
  A.explode(m4, c.x, c.y, 40, 300, m4.tanks[0], null, false);
  check('아이템', '실드: 피해 절반', Math.round(300 * 0.9 * 0.5), h - v.hp, h - v.hp === Math.round(300 * 0.9 * 0.5));
  const shotDmg = amp => {
    for (let pw = 300; pw <= 900; pw += 5) {
      const mm = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 1700 }]);
      if (amp) { mm.tanks[0].items = ['amplify']; A.cmdItem(mm, 0); }
      const rr = fireAndTrace(mm, 20, pw, 0); const e = rr.evs.find(x => x.type === 'dmg' && x.idx === 1);
      if (e) return { pw, dmg: e.amount };
    }
    return null;
  };
  const plainHit = shotDmg(false), ampHit = shotDmg(true);
  const ratio = plainHit && ampHit && plainHit.pw === ampHit.pw ? ampHit.dmg / plainHit.dmg : 0;
  check('아이템', '증폭: 같은 탄 피해 ×1.5', '1.50', ratio ? `${plainHit.dmg} → ${ampHit.dmg} (${ratio.toFixed(2)})` : '측정 실패', near(ratio, 1.5, 0.02));
  check('아이템', '턴당 1개만 사용', '두 번째 거부', (() => { const mm = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mm.tanks[0].items = ['heal', 'shield']; A.cmdItem(mm, 0); return A.cmdItem(mm, 0) ? '허용됨' : '거부'; })(), (() => { const mm = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mm.tanks[0].items = ['heal', 'shield']; A.cmdItem(mm, 0); return !A.cmdItem(mm, 0); })());
}
{ // fall damage + fall out
  const m = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  m.mask.fill(0); for (let x = 0; x < m.W; x++) { const g = x < 1010 ? 500 : 800; for (let y = g; y < m.H; y++) m.mask[y * m.W + x] = 1; }
  m.tanks[0].y = 500; let s = 0; const h = m.tanks[0].hp; while (m.tanks[0].y < 700 && s < 200) { A.cmdMove(m, 1); s++; }
  check('공통', '낙하 피해 (300px → (300-140)×0.35)', 56, h - m.tanks[0].hp, h - m.tanks[0].hp === 56);
  const m2 = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  m2.mask.fill(0); for (let x = 0; x < 1010; x++) for (let y = 800; y < m2.H; y++) m2.mask[y * m2.W + x] = 1;
  let s2 = 0; while (m2.tanks[0].alive && s2 < 200) { A.cmdMove(m2, 1); s2++; }
  check('공통', '맵 밖으로 떨어지면 낙사', '탈락', m2.tanks[0].alive ? '생존' : '탈락(' + m2.tanks[0].deathCause + ')', !m2.tanks[0].alive);
}
{ // new items: fuel, calm; sudden death
  const mf = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mf.tanks[0].items = ['fuel']; const f0 = mf.tanks[0].fuel; A.cmdItem(mf, 0);
  check('아이템', '연료: 이번 턴 이동력 2배', f0 * 2, mf.tanks[0].fuel, mf.tanks[0].fuel === f0 * 2);
  const land = (calm) => { const mm = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mm.wind = 10; if (calm) { mm.tanks[0].items = ['calm']; A.cmdItem(mm, 0); } const r = fireAndTrace(mm, 30, 700, 0); const b = r.evs.find(e => e.type === 'boom'); return b ? Math.round(b.x) : null; };
  const still = (() => { const mm = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mm.wind = 0; const r = fireAndTrace(mm, 30, 700, 0); return Math.round(r.evs.find(e => e.type === 'boom').x); })();
  const windy = land(false), calm = land(true);
  check('아이템', '무풍탄: 바람 10에서도 바람 없을 때와 같은 곳에 떨어짐', still, `무풍 ${calm} / 그냥 ${windy}`, calm === still && windy !== still);
  const T = CONFIG.turn, ms = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]);
  const sdTurn = T.suddenBase + T.suddenPerPlayer * 2; ms.turnNo = sdTurn - 1; ms.events.length = 0;
  const hp = ms.tanks.map(t => t.hp); A.cmdTimeout(ms); let g = 0; while (ms.phase !== 'aim' && g++ < 5000) A.step(ms);
  const lost = ms.tanks.map((t, i) => hp[i] - t.hp);
  check('공통', `서든데스: ${sdTurn}턴부터 모두 최대 체력의 4% 감소`, ms.tanks.map(t => Math.round(t.maxhp * 0.04)).join(','), lost.join(','), ms.sudden && lost.every((v, i) => v === Math.round(ms.tanks[i].maxhp * 0.04)));
}
{ // random-only company tank: bounce + K split, and the 1/9 odds
  const mb = field([{ tank: 'kird', x: 1000 }, { tank: 'rookie', x: 3500 }]);
  const rb = fireAndTrace(mb, 35, 520, 0);
  const bn = rb.evs.filter(e => e.type === 'bounce').length, bm = rb.evs.filter(e => e.type === 'boom').length;
  const firstBounce = rb.evs.find(e => e.type === 'bounce'), boom = rb.evs.find(e => e.type === 'boom');
  check('케이', 'K-바운스탄: 땅에 한 번 튕긴 뒤 폭발', '튕김 1, 폭발 1, 폭발은 튕긴 곳보다 멀리', `튕김 ${bn}, 폭발 ${bm}`, bn === 1 && bm === 1 && boom.x > firstBounce.x);
  const ms = field([{ tank: 'kird', x: 1000 }, { tank: 'rookie', x: 3500 }]);
  const rs = fireAndTrace(ms, 45, 700, 1);
  const sp = rs.evs.filter(e => e.type === 'split').length, booms = rs.evs.filter(e => e.type === 'boom');
  check('케이', 'K-분열탄: 정점에서 두 갈래로 갈라져 2번 폭발', '분열 1, 폭발 2 (서로 떨어진 곳)', `분열 ${sp}, 폭발 ${booms.length}${booms.length === 2 ? `, 간격 ${Math.round(Math.abs(booms[0].x - booms[1].x))}px` : ''}`, sp === 1 && booms.length === 2 && Math.abs(booms[0].x - booms[1].x) > 80);
  check('케이', '직접 고를 수 없음 (히든)', 'hidden', CONFIG.tanks.kird.hidden ? 'hidden' : '선택 가능', !!CONFIG.tanks.kird.hidden);
  const PICK = Object.keys(CONFIG.tanks).filter(k => !CONFIG.tanks[k].hidden);
  const roll = rnd => rnd() < CONFIG.randomTank.chance ? CONFIG.randomTank.id : PICK[Math.floor(rnd() * PICK.length)];
  let seed = 99; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const N = 90000, cnt = {}; for (let i = 0; i < N; i++) { const k = roll(rnd); cnt[k] = (cnt[k] || 0) + 1; }
  const pk = cnt.kird / N;
  check('케이', '랜덤 9만 번 → 케이 확률 1/9', '0.111', pk.toFixed(3), Math.abs(pk - 1 / 9) < 0.005 && PICK.every(k => Math.abs(cnt[k] / N - 1 / 9) < 0.006));
}
{ // happenings
  const H = CONFIG.happenings;
  // meteor: announced at a turn start, lands once time runs and hurts whoever stands there
  const mm = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mm.happening = 'meteor';
  mm.turnNo = H.meteor.every * 2 - 1; mm.events.length = 0; A.cmdTimeout(mm);
  let g = 0, mev = []; while (mm.phase !== 'aim' && g++ < 9000) { A.step(mm); for (const e of mm.events) mev.push(e); mm.events.length = 0; }
  const warned = mev.filter(e => e.type === 'meteor');
  // put a tank under the first meteor and let time run
  const target = warned[0]; if (target) { const v = mm.tanks[1]; v.x = target.x; v.y = 800; A.updateTilt(mm, v); }
  const hp0 = mm.tanks[1].hp; A.cmdTimeout(mm); g = 0; const ev2 = [];
  while (mm.phase !== 'aim' && g++ < 9000) { A.step(mm); for (const e of mm.events) ev2.push(e); mm.events.length = 0; }
  check('해프닝', '운석: 예고된 자리에 떨어져 피해', '예고 1~2개, 피해 >0', `예고 ${warned.length}, 피해 ${hp0 - mm.tanks[1].hp}`, warned.length >= 1 && hp0 - mm.tanks[1].hp > 0);
  // quake: tanks get shoved before the next turn
  const mq = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); mq.happening = 'quake'; mq.turnNo = H.quake.every - 1;
  const xs = mq.tanks.map(t => t.x); A.cmdTimeout(mq); g = 0; let qe = false;
  while (mq.phase !== 'aim' && g++ < 9000) { A.step(mq); if (mq.events.some(e => e.type === 'quake')) qe = true; mq.events.length = 0; }
  check('해프닝', '지진: 다음 턴 전에 탱크가 밀려남', '이동 있음', mq.tanks.map((t, i) => Math.round(t.x - xs[i])).join(', '), qe && mq.tanks.some((t, i) => Math.abs(t.x - xs[i]) >= 1));
  // tornado: a shell through it lands somewhere else
  const shot = (col) => { const mt = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); if (col) mt.column = { kind: col, x: 1500 }; const r = fireAndTrace(mt, 30, 700, 0); const b = r.evs.find(e => e.type === 'boom'); return { x: b ? Math.round(b.x) : null, r }; };
  const plain = shot(null), tor = shot('tornado');
  check('해프닝', '토네이도: 통과한 포탄의 착탄점이 바뀜', `≠ ${plain.x}`, tor.x, tor.x !== plain.x && tor.r.evs.some(e => e.type === 'tornadoHit'));
  // fire pillar: same landing spot, 1.5x damage
  const dmgAt = (col) => { const mt = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 2067 }]); if (col) mt.column = { kind: col, x: 1500 }; const r = fireAndTrace(mt, 30, 700, 0); const e = r.evs.find(x => x.type === 'dmg' && x.idx === 1); return e ? e.amount : 0; };
  const d0 = dmgAt(null), d1 = dmgAt('pillar');
  check('해프닝', '불기둥: 통과한 포탄 위력 1.5배', `${d0} → ${Math.round(d0 * 1.5)}`, `${d0} → ${d1}`, d0 > 0 && Math.abs(d1 - d0 * 1.5) <= 2);
  // every match draws one happening (or none) deterministically from the seed
  const counts = {}; for (let sd = 1; sd <= 200; sd++) { const m = A.createMatch({ seed: sd, mapId: 'temple', players: [{ id: 'a', nick: 'a', team: 'red', tankId: 'rookie' }, { id: 'b', nick: 'b', team: 'blue', tankId: 'rookie' }] }); counts[m.happening || 'none'] = (counts[m.happening || 'none'] || 0) + 1; }
  check('해프닝', '판마다 무작위 해프닝 (없음 약 20%)', 'none ≈ 40/200', JSON.stringify(counts), counts.none > 20 && counts.none < 65 && H.list.every(k => counts[k] > 15));
}
{ // turn delay: time spent, timeout, movement (+30%)
  const d0 = (used) => { const m = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); A.cmdFire(m, 20, 300, 0, used); return m.tanks[0].delay; };
  const fast = d0(0), slow = d0(30 * 120);
  check('공통', '시간 딜레이: 30초 쓰면 +120', '+120', '+' + (slow - fast), slow - fast === 120);
  const mt = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); A.cmdTimeout(mt);
  check('공통', '시간 초과: 기본+150+240', CONFIG.turn.baseDelay[3] + 150 + 240, mt.tanks[0].delay, mt.tanks[0].delay === CONFIG.turn.baseDelay[3] + 150 + 240);
  // two turns in a row: a slow, item-using, far-moving turn lets a quick opponent go twice
  const m2 = field([{ tank: 'boulder', x: 1000 }, { tank: 'prism', x: 3000 }]);
  m2.tanks[1].delay = 0; m2.tanks[0].items = ['heal']; m2.tanks[0].hp = 500; A.cmdItem(m2, 0);
  for (let k = 0; k < 300; k++) A.cmdMove(m2, 1);
  A.cmdFire(m2, 40, 200, 1, 50 * 120);
  const order = []; let g = 0;
  while (order.length < 3 && g++ < 200000) { if (m2.phase === 'aim') { order.push(m2.tanks[m2.cur].tankId); A.cmdFire(m2, 30, 200, 0, 5 * 120); } else A.step(m2); }
  check('공통', '느린 턴(아이템·이동·시간) 뒤 상대가 2번 연속', 'prism, prism', order.slice(0, 2).join(', '), order[0] === 'prism' && order[1] === 'prism');
  const ms = field([{ tank: 'rookie', x: 1000 }, { tank: 'trapper', x: 3500 }]); let n = 0; while (A.cmdMove(ms, 1) !== false && n < 5000 && ms.tanks[0].fuel > 0) n++;
  check('공통', '이동력 30% 증가 (루키 190→247px)', 247, Math.round(ms.tanks[0].x - 1000), Math.abs(ms.tanks[0].x - 1000 - 247) < 1);
}

fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'spec.json'), JSON.stringify(rows, null, 1));
const fails = rows.filter(r => !r.pass);
for (const r of rows) console.log((r.pass ? 'PASS' : 'FAIL') + ` | ${r.tank} | ${r.item} | 기대 ${r.expected} | 실제 ${r.actual}`);
console.log(`\n${rows.length - fails.length}/${rows.length} passed`);
process.exit(fails.length ? 1 : 0);
