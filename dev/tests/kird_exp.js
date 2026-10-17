// quick K-tank win rate vs the field (sides alternate). node tests/kird_exp.js <games per opp per map>
const { Worker, isMainThread, parentPort } = require('worker_threads');
const fs = require('fs'), path = require('path');
const load = () => new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + ';return {CONFIG,createMatch,step,botPlayTurn};')();
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
if (isMainThread) {
  const N = +(process.argv[2] || 4), opps = ['boulder', 'viper', 'hammer', 'rookie', 'trapper', 'swarm', 'prism', 'rage'], maps = ['temple', 'valley', 'clouds', 'bridge', 'snow', 'lava', 'moon', 'islands'];
  const jobs = []; let seed = 7000; for (const o of opps) for (const map of maps) for (let k = 0; k < N; k++) jobs.push({ o, map, seed: seed++, swap: k % 2 });
  let next = 0, done = 0, win = 0; const by = {};
  for (let i = 0; i < 2; i++) { const w = new Worker(__filename); const feed = () => { if (next < jobs.length) w.postMessage(jobs[next++]); else w.terminate(); }; w.on('message', r => { done++; win += r.win; by[r.o] = by[r.o] || [0, 0]; by[r.o][0] += r.win; by[r.o][1]++; if (done === jobs.length) { console.log('케이 승률', (100 * win / done).toFixed(1) + '%', done + '판'); for (const [k, v] of Object.entries(by)) console.log('  vs', k, (100 * v[0] / v[1]).toFixed(0) + '%'); } feed(); }); feed(); }
} else {
  const A = load();
  parentPort.on('message', job => {
    const pl = [{ id: 'a', nick: 'a', team: job.swap ? 'blue' : 'red', tankId: 'kird' }, { id: 'b', nick: 'b', team: job.swap ? 'red' : 'blue', tankId: job.o }];
    const m = A.createMatch({ seed: job.seed, mapId: job.map, players: pl }); const rnd = lcg(job.seed * 31 + 7); let g = 0;
    while (m.phase !== 'over' && m.turnNo <= 80 && g++ < 400000) { if (m.phase === 'aim') A.botPlayTurn(m, 'measure', rnd); else A.step(m); }
    const k = m.tanks.find(t => t.tankId === 'kird'), o = m.tanks.find(t => t !== k);
    const win = m.phase === 'over' ? (m.winner === k.team ? 1 : m.winner === 'draw' ? 0.5 : 0) : (k.hp / k.maxhp > o.hp / o.maxhp ? 1 : 0);
    parentPort.postMessage({ o: job.o, win });
  });
}
