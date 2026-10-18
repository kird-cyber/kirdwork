// Rule-by-rule checks on hand-built fields. run: node tests/spec.test.js
const A = require('./load.js')(['bot.js']);
const C = A.CONFIG;
let pass = 0, fail = 0;
const rows = [];
function check(area, name, want, got, ok) { rows.push({ area, name, want: String(want), got: String(got), ok: !!ok }); ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} | ${area} | ${name} | 기대 ${want} | 실제 ${got}`); }
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// empty sea 4000 x 1600 with a bedrock floor; subs = [{ sub, x, y, team }]; rocks = [{ x, y, rx, ry }]
function field(subs, rocks, opts) {
  opts = opts || {};
  const players = subs.map((s, i) => ({ id: 'p' + i, nick: 'p' + i, team: s.team || (i ? 'blue' : 'red'), subId: s.sub }));
  const m = A.createMatch({ seed: 5, mapId: 'reef', players });
  m.mask.fill(0);
  for (let y = m.H - 30; y < m.H; y++) for (let x = 0; x < m.W; x++) m.mask[y * m.W + x] = 2;
  for (const r of rocks || []) for (let y = Math.floor(r.y - r.ry); y <= r.y + r.ry; y++) for (let x = Math.floor(r.x - r.rx); x <= r.x + r.rx; x++) {
    const a = (x - r.x) / r.rx, b = (y - r.y) / r.ry; if (r.box ? Math.abs(a) <= 1 && Math.abs(b) <= 1 : a * a + b * b <= 1) if (x >= 0 && y >= 0 && x < m.W && y < m.H) m.mask[y * m.W + x] = 1;
  }
  m.subs.forEach((t, i) => { t.x = subs[i].x; t.y = subs[i].y; t.delay = i * 100; });
  m.crates = [];
  let g = 0; while (m.phase !== 'aim' && g++ < 2000) A.step(m);
  m.crates = []; m.current = opts.current || 0;
  return m;
}
function fire(m, pts, gauge, w) {
  const ev = [];
  A.cmdFire(m, pts, gauge, w || 0, 0);
  let g = 0;
  while (m.phase !== 'aim' && m.phase !== 'over' && g++ < 20000) { A.step(m); for (const e of m.events) ev.push(e); m.events.length = 0; }
  return ev;
}
const line = (t, x, y) => [[Math.round(t.x + (x - t.x) / 3), Math.round(t.y + (y - t.y) / 3)], [Math.round(t.x + 2 * (x - t.x) / 3), Math.round(t.y + 2 * (y - t.y) / 3)], [Math.round(x), Math.round(y)]];
const dmgTo = (ev, idx, kind) => ev.filter(e => e.type === 'dmg' && e.idx === idx && (!kind || e.kind === kind)).reduce((a, e) => a + e.amount, 0);
const booms = ev => ev.filter(e => e.type === 'boom');

// ---- curve rules
{
  const m = field([{ sub: 'ohio', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 800 }]);
  const t = m.subs[0], p = A.buildPath(t, line(t, 3600, 800));
  check('곡선', '사거리에서 잘림 (오하이오 2500)', 2500, Math.round(p.L), Math.round(p.L) === 2500);
  const p2 = A.buildPath(t, [[700, 800], [700, 400], [500, 400]]);
  check('곡선', '회전각 넘는 점은 버림 (오하이오 60°, 90° 꺾기)', '점 1개만 사용', `점 ${p2.used}개`, p2.used === 1);
  const k = field([{ sub: 'kilo', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 800 }]);
  const p3 = A.buildPath(k.subs[0], [[700, 800], [700, 500], [500, 500]]);
  check('곡선', '킬로는 150°까지 꺾임', '점 3개 사용', `점 ${p3.used}개`, p3.used === 3);
}
// ---- gauge: burst point along the curve
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 300 }]);
  const t = m.subs[0], pts = line(t, 1630, 800), path = A.buildPath(t, pts), want = A.pathAt(path, path.L / 2);
  const b = booms(fire(m, pts, 500, 0))[0];
  check('게이지', '게이지 50% = 곡선 절반 지점에서 폭발', `x≈${Math.round(want.x)}`, `x=${Math.round(b.x)}`, near(b.x, want.x, 4));
}
// ---- graze / centre / shapes
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1000, y: 800 }]);
  const t = m.subs[0], ev = fire(m, line(t, 2000, 800), 1000, 0);
  check('피해', '뚫고 지나가면 스침 20%만', Math.round(220 * 0.2), dmgTo(ev, 1), dmgTo(ev, 1) === 44);
  const m2 = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  const t2 = m2.subs[0], ev2 = fire(m2, line(t2, 1300, 800), 1000, 0);
  check('피해', '폭발 중심에 있으면 100% (+스침)', 220 + 44, dmgTo(ev2, 1), dmgTo(ev2, 1) === 264);
}
function shapeTest(sub, w, dx, dy) {
  const m = field([{ sub, x: 400, y: 800 }, { sub: 'uboat', x: 1300 + dx, y: 800 + dy }]);
  const t = m.subs[0]; return dmgTo(fire(m, line(t, 1300, 800), 1000, w), 1);
}
check('모양', '오르카 꼬리치기(가로): 옆 150px 맞음', '> 0', shapeTest('orca', 1, 150, 0), shapeTest('orca', 1, 150, 0) > 0);
check('모양', '오르카 꼬리치기(가로): 아래 90px 안 맞음', 0, shapeTest('orca', 1, 0, 90), shapeTest('orca', 1, 0, 90) === 0);
check('모양', '소나 음파탄(세로): 아래 150px 맞음', '> 0', shapeTest('sona', 0, 0, 150), shapeTest('sona', 0, 0, 150) > 0);
check('모양', '소나 음파탄(세로): 옆 90px 안 맞음', 0, shapeTest('sona', 0, 90, 0), shapeTest('sona', 0, 90, 0) === 0);
check('모양', '세종 천지(십자): 아래 140px 맞음', '> 0', shapeTest('sejong', 0, 0, 140), shapeTest('sejong', 0, 0, 140) > 0);
check('모양', '세종 천지(십자): 대각선 110px 안 맞음', 0, shapeTest('sejong', 0, 110, 110), shapeTest('sejong', 0, 110, 110) === 0);
// a tall burst reaches a sub hidden under rock
{
  const m = field([{ sub: 'sona', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 940 }], [{ x: 1300, y: 860, rx: 120, ry: 30, box: true }]);
  const t = m.subs[0], ev = fire(m, line(t, 1300, 780), 1000, 0);
  check('엄폐', '바위 밑에 숨은 적: 음파탄이 바위 넘어 닿음', '> 0', dmgTo(ev, 1), dmgTo(ev, 1) > 0);
}
// ---- current
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 300 }], [], { current: 5 });
  const t = m.subs[0], pts = line(t, 2400, 800), path = A.buildPath(t, pts), want = path.L / C.physics.torpSpeed * 5 * C.physics.currentPush;
  const b = booms(fire(m, pts, 1000, 0))[0], shift = b.x - A.pathAt(path, path.L).x;
  check('해류', '해류 +5: 날아간 시간만큼 오른쪽으로 밀림', `+${Math.round(want)}px`, `+${Math.round(shift)}px`, near(shift, want, 8));
  const m2 = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 300 }], [], { current: 5 });
  m2.subs[0].items = ['calm']; A.cmdItem(m2, 0);
  const b2 = booms(fire(m2, pts, 1000, 0))[0];
  check('해류', '정류탄을 쓰면 해류 무시', '0px', `${Math.round(b2.x - A.pathAt(path, path.L).x)}px`, near(b2.x, A.pathAt(path, path.L).x, 1));
}
// ---- terrain weapons
{
  const wall = [{ x: 1200, y: 800, rx: 30, ry: 300, box: true }];
  const m = field([{ sub: 'nautilus', x: 400, y: 800 }, { sub: 'uboat', x: 1400, y: 800 }], wall);
  const ev = fire(m, line(m.subs[0], 1400, 800), 1000, 0), b = booms(ev)[0];
  check('관통', '노틸러스 관통탄: 두께 60 바위를 뚫고 뒤의 적에서 폭발', 'x≈1400', `x=${Math.round(b.x)}, 피해 ${dmgTo(ev, 1)}`, b.x > 1300 && dmgTo(ev, 1) > 150);
  const m2 = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1400, y: 800 }], wall);
  const b2 = booms(fire(m2, line(m2.subs[0], 1400, 800), 1000, 0))[0];
  check('관통', '일반 어뢰는 바위 앞에서 폭발', 'x≈1170', `x=${Math.round(b2.x)}`, b2.x < 1200);
}
{
  const m = field([{ sub: 'kird', x: 400, y: 600 }, { sub: 'uboat', x: 400, y: 1100 }], [{ x: 1000, y: 850, rx: 30, ry: 400, box: true }]);
  const t = m.subs[0], ev = fire(m, [[600, 700], [800, 800], [1150, 975]], 1000, 0), b = booms(ev)[0], bn = ev.filter(e => e.type === 'bounce').length;
  check('튕김', '케이 K-바운스탄: 벽에 한 번 튕긴 뒤 반대쪽으로', '튕김 1번, 벽 왼쪽에서 폭발', `튕김 ${bn}번, x=${Math.round(b.x)}`, bn === 1 && b.x < 970);
}
{
  // overhang: rock slab with an enemy under it; the drone sticks to the top and crawls round the edge underneath
  const m = field([{ sub: 'alvin', x: 500, y: 700 }, { sub: 'uboat', x: 1300, y: 900 }], [{ x: 1250, y: 820, rx: 170, ry: 30, box: true }]);
  const t = m.subs[0], ev = fire(m, [[800, 720], [1050, 760], [1300, 1000]], 1000, 1), b = booms(ev)[0], stick = ev.find(e => e.type === 'stick');
  const crawled = stick ? Math.round(Math.sqrt((b.x - stick.x) ** 2 + (b.y - stick.y) ** 2)) : 0;
  check('기어가기', '앨빈 해저 드론: 바위에 붙어 표면을 따라 이동', '붙은 뒤 100px 이상 이동', stick ? `${crawled}px 이동` : '붙지 않음', !!stick && crawled > 100);
}
{
  const m = field([{ sub: 'ohio', x: 400, y: 500 }, { sub: 'uboat', x: 1300, y: 1200 }], [{ x: 1000, y: 800, rx: 200, ry: 30, box: true }]);
  const t = m.subs[0], ev = fire(m, line(t, 1300, 500), 1000, 1);
  check('수직', '오하이오 수직 미사일: 멈췄다가 아래로 내려꽂힘', '> 200', dmgTo(ev, 1), dmgTo(ev, 1) > 200);
}
{
  const m = field([{ sub: 'sejong', x: 400, y: 500 }, { sub: 'uboat', x: 1300, y: 1200 }, { sub: 'uboat', x: 1600, y: 1200, team: 'blue' }]);
  const ev = fire(m, line(m.subs[0], 1300, 900), 1000, 1);
  const arrows = booms(ev).filter(b => b.kind === 'fire').length;
  check('신기전', '세종대왕함 신기전: 불화살 5발이 내려옴', '5발', `${arrows}발, 아래 적 피해 ${dmgTo(ev, 1)}`, arrows === 5 && dmgTo(ev, 1) > 0);
}
{
  const m = field([{ sub: 'nautilus', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 960 }]);
  const before = Math.round(Math.sqrt((1300 - 1300) ** 2 + (960 - 800) ** 2)), ev = fire(m, line(m.subs[0], 1300, 800), 1000, 1);
  const o = m.subs[1], after = Math.round(Math.sqrt((o.x - 1300) ** 2 + (o.y - 800) ** 2));
  check('소용돌이', '노틸러스 마엘스트롬: 220px 안의 적을 끌어당긴 뒤 폭발', `${before}px → 더 가까이, 피해 > 0`, `${after}px, 피해 ${dmgTo(ev, 1)}`, after < before - 50 && dmgTo(ev, 1) > 0);
}
{
  const m = field([{ sub: 'kilo', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }, { sub: 'uboat', x: 1560, y: 1060, team: 'blue' }], [{ x: 1430, y: 930, rx: 50, ry: 50 }]);
  const ev = fire(m, line(m.subs[0], 1300, 800), 1000, 1);
  check('번개', '킬로 연쇄 번개: 바위 뒤 400px 안의 두 번째 적에게 튐', 110, dmgTo(ev, 2), dmgTo(ev, 2) === 110);
}
{
  const m = field([{ sub: 'kilo', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  const ev = fire(m, line(m.subs[0], 1300, 800), 1000, 0), o = m.subs[1];
  // the target's own turn starts right after the shot: 45 shock damage, 2 turns left, 70% fuel
  check('감전', '킬로 전류탄: 맞은 적이 감전됨', '감전 표시', ev.some(e => e.type === 'shocked' && e.idx === 1) ? '감전 표시' : '없음', ev.some(e => e.type === 'shocked' && e.idx === 1));
  check('감전', '감전된 적: 자기 차례 시작에 45 피해, 이동력 70%, 남은 2턴', `-45, 이동력 ${Math.round(C.subs.uboat.movePx * 0.7)}, 2턴`, `-${dmgTo(ev, 1, 'shock')}, 이동력 ${Math.round(o.fuel)}, ${o.shock ? o.shock.turns : 0}턴`, A.curSub(m) === o && dmgTo(ev, 1, 'shock') === 45 && Math.round(o.fuel) === Math.round(C.subs.uboat.movePx * 0.7) && o.shock && o.shock.turns === 2);
}
{
  const m = field([{ sub: 'kird', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 300 }]);
  const ev = fire(m, line(m.subs[0], 1300, 800), 1000, 1);
  const kinds = booms(ev).map(b => b.kind).join(',');
  check('분열', '케이 K-분열탄: 작은 폭발 뒤 파랑·연두 두 갈래', 'small,kblue,kgreen', kinds, booms(ev).length === 3 && kinds.includes('kblue') && kinds.includes('kgreen'));
}
{
  const m = field([{ sub: 'blue', x: 400, y: 800 }, { sub: 'uboat', x: 3800, y: 300 }]);
  const n = booms(fire(m, line(m.subs[0], 1300, 800), 1000, 1)).length;
  check('파편', '블루핀 파편탄: 가운데 1 + 8방향 8', 9, n, n === 9);
}
{
  const m = field([{ sub: 'blue', x: 400, y: 800 }, { sub: 'uboat', x: 1450, y: 930 }]);
  const ev = fire(m, line(m.subs[0], 1400, 800), 1000, 0);
  check('추적', '블루핀 추적 어뢰: 곡선 끝 근처의 적에게 휘어 들어감', '> 150', dmgTo(ev, 1), dmgTo(ev, 1) > 150);
  const m2 = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1450, y: 930 }]);
  const ev2 = fire(m2, line(m2.subs[0], 1400, 800), 1000, 0);
  check('추적', '같은 곡선 일반 어뢰는 거의 빗나감', '< 120', dmgTo(ev2, 1), dmgTo(ev2, 1) < 120);
}
// ---- ramming
function moveN(m, d, n) { let k = 0; for (let i = 0; i < n; i++) if (A.cmdMove(m, d)) k++; return k; }
{
  const m = field([{ sub: 'uboat', x: 1000, y: 800 }, { sub: 'uboat', x: 1080, y: 800 }]);
  const x0 = m.subs[1].x; moveN(m, 0, 40);
  const ram = C.ram.base + C.ram.perHull * 3;
  check('박치기', '부딪히면 선체만큼 피해, 상대가 밀려남', `피해 ${ram}, 밀림 > 0`, `피해 ${1000 - m.subs[1].hp}, 밀림 ${Math.round(m.subs[1].x - x0)}px`, 1000 - m.subs[1].hp === ram && m.subs[1].x > x0);
  const o = field([{ sub: 'orca', x: 1000, y: 800 }, { sub: 'uboat', x: 1080, y: 800 }]); moveN(o, 0, 40);
  const oram = Math.round((C.ram.base + C.ram.perHull * 5) * 1.5);
  check('박치기', '오르카는 박치기 피해 1.5배', oram, 1000 - o.subs[1].hp, 1000 - o.subs[1].hp === oram);
  const w = field([{ sub: 'uboat', x: 1000, y: 800 }, { sub: 'uboat', x: 1080, y: 800 }], [{ x: 1150, y: 800, rx: 20, ry: 100, box: true }]); moveN(w, 0, 60);
  check('박치기', '바위로 밀면 추가 피해', ram + C.ram.wall, 1000 - w.subs[1].hp, 1000 - w.subs[1].hp === ram + C.ram.wall);
  const e = field([{ sub: 'uboat', x: 3880, y: 800 }, { sub: 'uboat', x: 3955, y: 800 }]);
  e.subs[0].x = 3900; e.subs[1].x = 3970; moveN(e, 0, 80);
  check('밀어내기', '맵 가장자리 밖으로 밀면 탈락', '탈락', e.subs[1].alive ? '생존' : e.subs[1].deathCause, !e.subs[1].alive && e.subs[1].deathCause === 'out');
}
{
  const m = field([{ sub: 'uboat', x: 1000, y: 800 }, { sub: 'uboat', x: 3000, y: 800 }]);
  const moved = moveN(m, 0, 2000);
  check('이동', '이동력만큼만 움직임 (U-96 260px)', 260, moved * C.physics.moveStep, moved * C.physics.moveStep === 260);
  const f = field([{ sub: 'uboat', x: 1000, y: 800 }, { sub: 'uboat', x: 3000, y: 800 }], [{ x: 1080, y: 800, rx: 20, ry: 100, box: true }]);
  const mv = moveN(f, 0, 200);
  check('이동', '바위를 뚫고 지나갈 수 없음', '바위 앞에서 멈춤', `${mv * 0.5}px 이동`, mv * 0.5 < 30);
}
// ---- items and cooldown
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  m.subs[0].items = ['amplify']; A.cmdItem(m, 0);
  const ev = fire(m, line(m.subs[0], 1300, 800), 1000, 0);
  check('아이템', '증폭: 피해 1.5배', Math.round(220 * 1.5) + Math.round(330 * 0.2), dmgTo(ev, 1), dmgTo(ev, 1) === 330 + 66);
  const s = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  s.subs[1].shield = true;
  const ev2 = fire(s, line(s.subs[0], 1300, 800), 1000, 0);
  check('아이템', '실드: 폭발 피해 절반', 110 + 44, dmgTo(ev2, 1), dmgTo(ev2, 1) === 154);
}
{
  const m = field([{ sub: 'ohio', x: 400, y: 800 }, { sub: 'uboat', x: 3000, y: 300 }]);
  const t = m.subs[0], cds = [];
  A.cmdFire(m, [[600, 600], [700, 600], [800, 600]], 500, 1, 0);
  for (let k = 0; k < 4; k++) {
    let g = 0; while ((m.phase !== 'aim' || A.curSub(m) !== t) && g++ < 60000) { if (m.phase === 'aim') A.cmdFire(m, [[3000, 600], [3100, 600], [3200, 600]], 0, 0, 0); else A.step(m); }
    const inp = A.cmdFire(m, [[600, 600], [700, 600], [800, 600]], 500, 1, 0); cds.push(inp.weapon);
  }
  check('재충전', '오하이오 수직 미사일: 3턴 동안 못 씀', '0,0,0,1', cds.join(','), cds.join(',') === '0,0,0,1');
}
// ---- maps
for (const id of Object.keys(C.maps)) {
  const mp = A.buildMap(id), ok = mp.spawns.length === 12 && mp.spawns.every(s => A.clearAround(mp.mask, mp.W, mp.H, s.x, s.y, C.physics.hullRx + 20, C.physics.hullRy + 20));
  check('맵', `${C.maps[id].name}: 출현 자리 12곳, 모두 잠수함이 들어갈 공간`, '12곳', `${mp.spawns.length}곳`, ok);
}
console.log(`\n${pass}/${pass + fail} passed`);
require('fs').mkdirSync(__dirname + '/out', { recursive: true });
require('fs').writeFileSync(__dirname + '/out/spec.json', JSON.stringify(rows, null, 1));
process.exit(fail ? 1 : 0);
