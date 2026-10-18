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
  const m = A.createMatch({ seed: 5, mapId: opts.map || 'cave', players });
  if (!opts.map) { m.rules = {}; m.mines = []; } // a plain field: no map rules unless a test asks for one
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
// ---- graze / centre / shapes (numbers come from config so balance changes do not break the rules)
const UD = C.subs.uboat.weapons[0].dmg, GR = Math.round(UD * C.physics.grazeMul);
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1000, y: 800 }]);
  const t = m.subs[0], ev = fire(m, line(t, 2000, 800), 1000, 0);
  check('피해', '뚫고 지나가면 스침 20%만', GR, dmgTo(ev, 1), dmgTo(ev, 1) === GR);
  const m2 = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  const t2 = m2.subs[0], ev2 = fire(m2, line(t2, 1300, 800), 1000, 0);
  check('피해', '폭발 중심에 있으면 100% (+스침)', UD + GR, dmgTo(ev2, 1), dmgTo(ev2, 1) === UD + GR);
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
  const near = field([{ sub: 'kird', x: 400, y: 800 }, { sub: 'uboat', x: 1330, y: 830 }]);
  const evn = fire(near, line(near.subs[0], 1300, 800), 1000, 0), bn = booms(evn)[0];
  const full = C.subs.kird.weapons[0].dmg;
  check('자석', '케이 K-자석탄: 끌림 거리 안(42px)의 적에게 폭발이 끌려가 정확히 맞음', `폭발 x=1330, 피해 ${full}`, `x=${Math.round(bn.x)}, 피해 ${dmgTo(evn, 1)}`, Math.round(bn.x) === 1330 && dmgTo(evn, 1) === full && evn.some(e => e.type === 'magnet'));
  const far = field([{ sub: 'kird', x: 400, y: 800 }, { sub: 'uboat', x: 1450, y: 900 }]);
  const evf = fire(far, line(far.subs[0], 1300, 800), 1000, 0);
  check('자석', '케이 K-자석탄: 끌림 거리 밖이면 끌려가지 않음', '그 자리에서 폭발', `x=${Math.round(booms(evf)[0].x)}`, !evf.some(e => e.type === 'magnet') && Math.round(booms(evf)[0].x) === 1300);
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
  check('번개', '킬로 연쇄 번개: 바위 뒤 400px 안의 두 번째 적에게 튐', C.subs.kilo.weapons[1].dmg, dmgTo(ev, 2), dmgTo(ev, 2) === C.subs.kilo.weapons[1].dmg);
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
  check('박치기', '부딪히면 선체만큼 피해, 상대가 밀려남', `피해 ${ram}, 밀림 > 0`, `피해 ${(m.subs[1].maxhp - m.subs[1].hp)}, 밀림 ${Math.round(m.subs[1].x - x0)}px`, (m.subs[1].maxhp - m.subs[1].hp) === ram && m.subs[1].x > x0);
  const o = field([{ sub: 'orca', x: 1000, y: 800 }, { sub: 'uboat', x: 1080, y: 800 }]); moveN(o, 0, 40);
  const oram = Math.round((C.ram.base + C.ram.perHull * 5) * 1.5);
  check('박치기', '오르카는 박치기 피해 1.5배', oram, (o.subs[1].maxhp - o.subs[1].hp), (o.subs[1].maxhp - o.subs[1].hp) === oram);
  const w = field([{ sub: 'uboat', x: 1000, y: 800 }, { sub: 'uboat', x: 1080, y: 800 }], [{ x: 1150, y: 800, rx: 20, ry: 100, box: true }]); moveN(w, 0, 60);
  check('박치기', '바위로 밀면 추가 피해', ram + C.ram.wall, (w.subs[1].maxhp - w.subs[1].hp), (w.subs[1].maxhp - w.subs[1].hp) === ram + C.ram.wall);
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
  const AD = Math.round(UD * C.items.amplify.mul || UD * 1.5), AX = AD + Math.round(AD * C.physics.grazeMul);
  check('아이템', '증폭: 피해 1.5배', AX, dmgTo(ev, 1), Math.abs(dmgTo(ev, 1) - AX) <= 1);
  const s = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  s.subs[1].shield = true;
  const ev2 = fire(s, line(s.subs[0], 1300, 800), 1000, 0);
  check('아이템', '실드: 폭발 피해 절반', Math.round(UD / 2) + GR, dmgTo(ev2, 1), Math.abs(dmgTo(ev2, 1) - (Math.round(UD / 2) + GR)) <= 1);
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
// ---- robustness (found in review): bad network input, edges, sudden death
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  m.subs[0].items = ['heal'];
  let threw = false; try { A.cmdItem(m, 'length'); A.cmdItem(m, 'constructor'); A.cmdItem(m, 1.5); } catch (e) { threw = true; }
  check('입력 검증', '이상한 아이템 칸 번호는 무시(오류 없음)', '오류 없음, 아이템 그대로', threw ? '오류' : m.subs[0].items.join(','), !threw && m.subs[0].items.join(',') === 'heal');
  const t0 = Date.now(), cur = A.curSub(m);
  A.applyTurnInput(m, { turnNo: m.turnNo, seat: cur.id, actions: [{ t: 'm', d: 4, n: 1e12 }, ...Array(5000).fill({ t: 'm', d: 0, n: 1e9 })], pts: [[1, 1], [2, 2], [3, 3]], gauge: 'x', weapon: 9, used: 'x' });
  const ms = Date.now() - t0;
  check('입력 검증', '이동 횟수가 터무니없이 커도 멈추지 않음', '< 200ms', ms + 'ms', ms < 200);
  check('입력 검증', '잘못된 사용 시간(used)이 숫자로 정리됨', '숫자', String(m.subs[0].delay), Number.isFinite(m.subs[0].delay));
}
{
  const m = field([{ sub: 'uboat', x: 22, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  const x0 = m.subs[0].x; for (let i = 0; i < 40; i++) A.cmdMove(m, 0);
  check('이동', '맵 가장자리 여백에 밀려 들어간 잠수함도 안쪽으로는 움직임', '> 0px', (m.subs[0].x - x0) + 'px', m.subs[0].x > x0);
}
{
  const m = field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300, y: 800 }]);
  m.subs[1].hp = 1; m.turnNo = 200; // deep in sudden death: the next turn's drain sinks the last blue sub
  A.cmdTimeout(m); let g = 0; while (m.phase !== 'aim' && m.phase !== 'over' && g++ < 5000) A.step(m);
  check('서든데스', '서든데스 피해로 한 팀이 전멸하면 바로 끝남', 'over / red', m.phase + ' / ' + m.winner, m.phase === 'over' && m.winner === 'red');
}
{
  const m = field([{ sub: 'nautilus', x: 400, y: 800 }, { sub: 'uboat', x: 900, y: 800 }, { sub: 'uboat', x: 760, y: 800, team: 'red' }]);
  const ally = m.subs[2], ax = ally.x;
  fire(m, line(m.subs[0], 820, 800), 1000, 1);
  check('소용돌이', '노틸러스 소용돌이는 아군을 끌어당기지 않음', `x=${ax}`, `x=${ally.x}`, ally.x === ax);
}
// ---- map rules (each map's special rule on a plain field of that map)
const mapField = (id, subs, rocks) => { const m = field(subs, rocks, { map: id }); m.rules = JSON.parse(JSON.stringify(C.maps[id].rules)); m.mines = (m.rules.mines || []).map(([x, y], i) => ({ x, y, alive: true, id: i })); return m; };
{
  const m = mapField('god12', [{ sub: 'uboat', x: 300, y: 800 }, { sub: 'uboat', x: 3700, y: 800 }]);
  const ev = fire(m, [[100, 800], [-100, 800], [-300, 800]], 1000, 0);
  check('맵 규칙', '12신: 왼쪽 끝을 넘어간 어뢰가 오른쪽에서 나와 적을 맞힘', '> 150', dmgTo(ev, 1), dmgTo(ev, 1) > 150);
}
{
  const drift = id => { const m = mapField(id, [{ sub: 'uboat', x: 400, y: 600 }, { sub: 'uboat', x: 3700, y: 600 }]); m.current = 5; const ev = fire(m, line(m.subs[0], 1600, 600), 1000, 0); return booms(ev)[0].x - 1600; };
  const base = (() => { const m = field([{ sub: 'uboat', x: 400, y: 600 }, { sub: 'uboat', x: 3700, y: 600 }]); m.current = 5; const ev = fire(m, line(m.subs[0], 1600, 600), 1000, 0); return booms(ev)[0].x - 1600; })();
  const at = drift('atlantic');
  check('맵 규칙', '아틀란틱: 해류 1.6배', `+${Math.round(base * 1.6)}px`, `+${Math.round(at)}px`, Math.abs(at - base * 1.6) < 6);
}
{
  const mine = C.maps.battlefield.rules.mines[0], m = mapField('battlefield', [{ sub: 'uboat', x: mine[0] - 700, y: mine[1] }, { sub: 'uboat', x: mine[0], y: mine[1] + 110 }]);
  const ev = fire(m, line(m.subs[0], mine[0] + 60, mine[1]), 1000, 0);
  const mines = ev.filter(e => e.type === 'boom' && e.kind === 'mine').length;
  check('맵 규칙', '배틀 필드: 어뢰가 기뢰에 닿으면 기뢰가 터져 근처 적이 피해', '기뢰 폭발 1+, 피해 > 0', `기뢰 ${mines}, 피해 ${dmgTo(ev, 1)}`, mines >= 1 && dmgTo(ev, 1) > 0);
}
{
  const m = mapField('bermuda', [{ sub: 'uboat', x: 1700, y: 1000 }, { sub: 'uboat', x: 3900, y: 300 }]);
  const inside = A.driftAt(m, 2100, 900), outside = A.driftAt(m, 300, 900); m.current = 3;
  const a = A.driftAt(m, 2100, 900)[0], b = A.driftAt(m, 300, 900)[0];
  check('맵 규칙', '버뮤다: 삼각형 안 해류 2배', (b * 2).toFixed(4), a.toFixed(4), Math.abs(a - b * 2) < 1e-9 && b !== 0);
}
{
  const m = mapField('cave', [{ sub: 'uboat', x: 400, y: 900 }, { sub: 'uboat', x: 1600, y: 1000 }], [{ x: 1600, y: 300, rx: 400, ry: 120 }]);
  m.rules.rockfall.chance = 1;
  const ev = fire(m, line(m.subs[0], 1600, 520), 1000, 0);
  check('맵 규칙', '케이브: 천장 근처 폭발 → 종유석이 떨어져 아래 적이 피해', '낙석 1, 피해 > 0', `낙석 ${ev.filter(e => e.type === 'rockfall').length}, 피해 ${dmgTo(ev, 1)}`, ev.some(e => e.type === 'rockfall') && dmgTo(ev, 1) > 0);
}
{
  const hitCorner = id => { const m = id ? mapField(id, [{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1300 + 95, y: 800 + 95 }]) : field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 1395, y: 895 }]); return dmgTo(fire(m, line(m.subs[0], 1300, 800), 1000, 0), 1); };
  const sq = hitCorner('cube'), el = hitCorner(null);
  check('맵 규칙', '큐브: 네모 폭발은 모서리에 있는 적도 맞힘', '네모 > 0, 원 = 0', `네모 ${sq}, 원 ${el}`, sq > 0 && el === 0);
}
{
  const one = (x, y) => { const m = mapField('duke', [{ sub: 'uboat', x: x + 700, y }, { sub: 'uboat', x, y }]); return dmgTo(fire(m, line(m.subs[0], x, y), 1000, 0), 1); };
  const inYard = one(1500, 1200), outside = one(600, 1200);
  const boom = C.subs.uboat.weapons[0].dmg, graze = Math.round(boom * C.physics.grazeMul);
  check('맵 규칙', '듀크: 성 안뜰에선 폭발 피해 20% 감소', `${graze + Math.round(boom * 0.8)} (밖 ${graze + boom})`, `${inYard} (밖 ${outside})`, outside === graze + boom && Math.abs(inYard - (graze + Math.round(boom * 0.8))) <= 1);
}
{
  const dug = id => { const m = id ? mapField(id, [{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3600, y: 300 }], [{ x: 1500, y: 800, rx: 300, ry: 300, box: true }]) : field([{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3600, y: 300 }], [{ x: 1500, y: 800, rx: 300, ry: 300, box: true }]); const before = m.mask.reduce((a, v) => a + (v === 1), 0); fire(m, line(m.subs[0], 1300, 800), 1000, 0); return before - m.mask.reduce((a, v) => a + (v === 1), 0); };
  const ice = dug('iceberg'), rock = dug(null);
  check('맵 규칙', '아이스버그: 얼음은 1.4배 크게 파임', `${(1.96).toFixed(2)}배 넓이 근처`, (ice / rock).toFixed(2) + '배', ice / rock > 1.6 && ice / rock < 2.3);
}
{
  const m = mapField('jurassic', [{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3600, y: 300 }], [{ x: 1500, y: 800, rx: 300, ry: 300, box: true }]);
  m.rules.fossil = 1; m.crates = [];
  fire(m, line(m.subs[0], 1250, 800), 1000, 0);
  check('맵 규칙', '쥬라기: 바위를 파면 화석 상자가 나옴', '상자 1', `상자 ${m.crates.length}`, m.crates.length === 1);
}
{
  const m = mapField('nautilus', [{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3600, y: 300 }]); m.current = 0;
  const near = A.driftAt(m, 2300, 800), far = A.driftAt(m, 200, 200);
  check('맵 규칙', '노틸러스: 껍데기 주변은 해류가 없어도 휘감는 물살', '세로 물살 ≠ 0, 먼 곳 0', `${near[1].toFixed(3)} / ${far[1].toFixed(3)}`, near[1] > 0 && far[0] === 0 && far[1] === 0);
}
{
  const m = mapField('seacity', [{ sub: 'uboat', x: 400, y: 800 }, { sub: 'uboat', x: 3600, y: 800 }]);
  m.crates = []; let drops = 0;
  for (let k = 0; k < 6; k++) { const before = m.crates.length; A.cmdTimeout(m); let g = 0; while (m.phase !== 'aim' && g++ < 5000) A.step(m); if (m.crates.length > before) drops++; }
  check('맵 규칙', '씨 시티: 보급 상자가 2턴마다', '6턴에 3번', `${drops}번`, drops === 3);
}
{
  const m = mapField('spa', [{ sub: 'uboat', x: 700, y: 1180 }, { sub: 'uboat', x: 3600, y: 300 }]);
  const t = m.subs[0]; t.hp = 500; t.delay = -1000; m.subs[1].delay = 0; m.phase = 'settle'; A.beginTurn(m);
  const lift = A.driftAt(m, 2000, 900)[1];
  check('맵 규칙', '스파: 욕조 안에서 턴 시작 시 +60, 욕조 위 기포가 위로 밀어 올림', '체력 560, 위로 < 0', `체력 ${t.hp}, ${lift.toFixed(3)}`, t.hp === 560 && lift < 0);
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
