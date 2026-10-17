// Finds bot games that never end (debug helper). node tests/hang.js <map> <tankA> <tankB> <seedFrom> <count>
const fs = require('fs'), path = require('path');
const A = new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + ';return {CONFIG,createMatch,step,botPlayTurn,curTank};')();
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const [map, ta, tb, from, count] = [process.argv[2] || 'clouds', process.argv[3] || 'boulder', process.argv[4] || 'viper', +(process.argv[5] || 1201), +(process.argv[6] || 60)];
for (let seed = from; seed < from + count; seed++) {
  const m = A.createMatch({ seed, mapId: map, players: [{ id: 'a', nick: 'a', team: 'red', tankId: ta }, { id: 'b', nick: 'b', team: 'blue', tankId: tb }] });
  const rnd = lcg(seed * 31 + 7); let guard = 0, t0 = Date.now(), aimRepeat = 0;
  while (m.phase !== 'over' && m.turnNo <= 80 && guard++ < 400000) {
    if (m.phase === 'aim') {
      A.botPlayTurn(m, 'measure', rnd);
      if (m.phase === 'aim') { if (++aimRepeat > 3) { const t = A.curTank(m); console.log('STUCK-AIM seed', seed, 'turn', m.turnNo, t.tankId, 'alive', t.alive, 'fuel', t.fuel, 'x', t.x, 'y', t.y); break; } } else aimRepeat = 0;
    } else A.step(m);
    if (Date.now() - t0 > 6000) { console.log('SLOW seed', seed, 'phase', m.phase, 'turn', m.turnNo, 'tick', m.tick, 'proj', JSON.stringify(m.proj.map(p => [Math.round(p.x), Math.round(p.y), Math.round(p.vx), Math.round(p.vy)])), 'sched', m.sched.length, 'tanks', JSON.stringify(m.tanks.map(t => [t.alive, t.falling, t.y, t.vy]))); break; }
  }
}
console.log('scan done');
