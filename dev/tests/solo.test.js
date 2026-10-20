// 연구부정 소탕전: turn order, daily determinism, scoring, and replay of a full run from the player's inputs alone.
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js', 'bot.js', 'solo.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {CONFIG,SOLO,soloDay,soloSeed,soloFoeTanks,soloMatch,soloBotTurn,soloReplay,soloResult,soloScore,step,cmdFire,cmdPass,curTank,botPlan,stateHash};')();
let pass = 0, fail = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); c ? pass++ : fail++; };
const day = '2026-10-20';
ok(A.soloDay(Date.UTC(2026, 9, 19, 15, 30)) === '2026-10-20', 'day is counted in Korean time (UTC 15:30 = next day in KST)');
const ft = A.soloFoeTanks(day);
ok(ft.length === 3 && new Set(ft).size === 3 && ft.every(k => !A.CONFIG.tanks[k].hidden), 'three different pickable foe tanks: ' + ft.join(','));
ok(JSON.stringify(A.soloFoeTanks(day)) === JSON.stringify(ft), 'same day -> same foes');
const days = ['2026-10-21', '2026-10-22', '2026-10-23'].map(d => A.soloFoeTanks(d).join(','));
ok(new Set(days.concat(ft.join(','))).size > 1, 'foes change from day to day');
const m0 = A.soloMatch(day, 'rookie'), m1 = A.soloMatch(day, 'rookie');
ok(A.stateHash(m0) === A.stateHash(m1) && m0.tanks.map(t => t.x).join() === m1.tanks.map(t => t.x).join(), 'same day -> same map, spawns and state');
ok(m0.tanks.map(t => t.nick).join() === '나,위조탱,변조탱,표절탱', 'foes are named 위조탱·변조탱·표절탱');

// play: a bot controls "me" (Math.random), foes use the solo bot turn
function play(tankId, level, seedRnd) {
  let s = seedRnd; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const m = A.soloMatch(day, tankId), mem = {}, pmem = {}, inputs = [], order = [];
  let guard = 0;
  while (m.phase !== 'over' && guard++ < 4e6) {
    if (m.phase === 'aim') {
      const t = A.curTank(m); order.push(t.nick);
      if (t.team === 'red') {
        const used = Math.floor(rnd() * 1200);
        const plan = A.botPlan(m, level, rnd, pmem);
        if (m.phase !== 'aim') continue;
        const inp = plan ? A.cmdFire(m, plan.angle, plan.power, plan.weapon, used) : A.cmdPass(m, used);
        inputs.push(inp);
      } else { const plan = A.soloBotTurn(m, mem); if (plan) A.cmdFire(m, plan.angle, plan.power, plan.weapon, A.SOLO.botUsed); }
    } else A.step(m);
  }
  return { m, inputs, order, res: A.soloResult(m, inputs) };
}
const g = play('rookie', 'hard', 7);
console.log('   order:', g.order.slice(0, 9).join(' → '), '…');
const o = g.order.slice(0, 6);
ok(o[0] === '나' && o[2] === '나' && o[4] === '나' && o[1] !== o[3] && o[3] !== o[5] && o[1] !== '나', 'turns: me → foe A → me → foe B → me → foe C');
console.log('   result:', JSON.stringify(g.res));
ok(g.m.phase === 'over', 'the run ends (' + (g.res.clear ? 'clear' : 'fail') + ' in ' + g.res.turns + ' turns)');
const rp = A.soloReplay(day, 'rookie', g.inputs.map(x => JSON.parse(JSON.stringify(x))));
ok(rp.hash === A.stateHash(g.m) && rp.clear === g.res.clear && rp.time === g.res.time && rp.hp === g.res.hp, `replay from inputs gives the same end (time ${rp.time}s, hp ${rp.hp}, kills ${rp.kills})`);
const sc = A.soloScore([{ used: 600 }, { used: 120 }, { timeout: true }, { pass: true, used: 240 }]);
ok(sc.shots === 2 && Math.abs(sc.time - (5 + 1 + 60 + 2 + 6)) < 1e-9, 'score = my used time + 3 s per shot (timeouts count 60 s, passes no shot)');
// a forged input list does not reproduce a clear
if (g.res.clear) { const forged = g.inputs.slice(0, Math.max(1, g.inputs.length - 2)); const fr = A.soloReplay(day, 'rookie', forged); ok(!fr.clear, 'cutting inputs off does not give a clear'); }
// win rate check over a few runs per tank level, to see the challenge is beatable but not trivial
let clears = 0, total = 0, times = [];
for (let s = 1; s <= 12; s++) { const r = play(['rookie', 'hammer', 'swarm', 'viper'][s % 4], 'normal', s * 31).res; total++; if (r.clear) { clears++; times.push(r.time); } }
console.log(`   'normal'-bot player clears ${clears}/${total}` + (times.length ? `, times ${times.map(t => t.toFixed(0)).join(',')}s` : ''));
ok(clears > 0 && clears < total, 'a normal-level player can clear sometimes, not always');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
