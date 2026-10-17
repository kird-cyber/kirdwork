// Rage experiment: which knob drives its win rate? node tests/rage_exp.js <games per opp per map>
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path');
const load = () => new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + ';return {CONFIG,createMatch,step,botPlayTurn,curTank};')();
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const VARIANTS = {
  base: c => {},
  speed3: c => { c.tanks.rage.speedClass = 3; },
  noOrbital: c => { c.tanks.rage.weapons[1] = JSON.parse(JSON.stringify(c.tanks.rage.weapons[0])); },
  hp850: c => { c.tanks.rage.hp = 850; },
  photon185: c => { c.tanks.rage.weapons[0].dmg = 185; },
  angle45: c => { c.tanks.rage.angleMin = 45; c.tanks.rage.angleMax = 80; },
};
if (isMainThread) {
  const N = +(process.argv[2] || 10), opps = ['boulder', 'viper', 'hammer', 'rookie', 'trapper', 'swarm', 'prism'], maps = ['temple', 'valley', 'clouds', 'bridge'];
  const jobs = []; let seed = 5000;
  for (const v of Object.keys(VARIANTS).filter(v => !ONLY || ONLY.includes(v))) for (const o of opps) for (const map of maps) for (let k = 0; k < N; k++) jobs.push({ v, o, map, seed: seed++, swap: k % 2 });
  const res = {}; let next = 0, done = 0; const nW = Math.max(2, require('os').cpus().length - 1);
  for (let i = 0; i < nW; i++) {
    const w = new Worker(__filename);
    const feed = () => { if (next < jobs.length) w.postMessage(jobs[next++]); else w.terminate(); };
    w.on('message', r => { const k = r.v + (r.swap ? '/rage파랑' : '/rage빨강'); res[k] = res[k] || { w: 0, n: 0 }; res[k].n++; res[k].w += r.win; done++; if (done === jobs.length) { for (const [k, x] of Object.entries(res)) console.log(k.padEnd(12), (100 * x.w / x.n).toFixed(1) + '%', x.n); } feed(); });
    feed();
  }
} else {
  parentPort.on('message', job => {
    const A = load(); VARIANTS[job.v](A.CONFIG);
    const pl = [{ id: 'a', nick: 'a', team: 'red', tankId: job.swap ? job.o : 'rage' }, { id: 'b', nick: 'b', team: 'blue', tankId: job.swap ? 'rage' : job.o }];
    const m = A.createMatch({ seed: job.seed, mapId: job.map, players: pl }); const rnd = lcg(job.seed * 31 + 7); let g = 0;
    while (m.phase !== 'over' && m.turnNo <= 80 && g++ < 400000) { if (m.phase === 'aim') A.botPlayTurn(m, 'normal', rnd); else A.step(m); }
    const rage = m.tanks.find(t => t.tankId === 'rage'), opp = m.tanks.find(t => t !== rage);
    let win;
    if (m.phase === 'over') win = m.winner === rage.team ? 1 : m.winner === 'draw' ? 0.5 : 0;
    else win = rage.hp / rage.maxhp > opp.hp / opp.maxhp ? 1 : 0;
    parentPort.postMessage({ v: job.v, win, swap: job.swap });
  });
}
