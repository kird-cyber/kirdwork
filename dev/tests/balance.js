// M3 balance: bots play 1:1 for every tank pair on every map. Uses worker threads.
// node tests/balance.js <gamesPerPairPerMap> [level]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path');
const load = () => new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + ';return {CONFIG,createMatch,step,botPlayTurn,curTank};')();
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function playGame(A, job) {
  // sides alternate (job.swap) so neither tank always moves first
  const players = [{ id: 'a', nick: 'a', team: job.swap ? 'blue' : 'red', tankId: job.a }, { id: 'b', nick: 'b', team: job.swap ? 'red' : 'blue', tankId: job.b }];
  const m = A.createMatch({ seed: job.seed, mapId: job.map, players });
  const rnd = lcg(job.seed * 31 + 7);
  let guard = 0;
  while (m.phase !== 'over' && m.turnNo <= 80 && guard++ < 400000) {
    if (m.phase === 'aim') A.botPlayTurn(m, job.level, rnd);
    else A.step(m);
  }
  const ta = m.tanks.find(t => t.id === 'a'), tb = m.tanks.find(t => t.id === 'b'), redIsA = ta.team === 'red';
  let res;
  if (m.phase === 'over') res = m.winner === 'draw' ? 'draw' : (m.winner === 'red') === redIsA ? 'a' : 'b';
  else { const fa = ta.hp / ta.maxhp, fb = tb.hp / tb.maxhp; res = Math.abs(fa - fb) < 0.05 ? 'draw' : fa > fb ? 'a' : 'b'; }
  return { a: job.a, b: job.b, map: job.map, res, turns: m.turnNo, over: m.phase === 'over', fallA: ta.deathCause === 'fall', fallB: tb.deathCause === 'fall' };
}
if (isMainThread) {
  const N = +(process.argv[2] || 2), level = process.argv[3] || 'measure';
  const A = load(), T = Object.keys(A.CONFIG.tanks), M = Object.keys(A.CONFIG.maps);
  const jobs = []; let seed = 1;
  for (let i = 0; i < T.length; i++) for (let j = i; j < T.length; j++) for (const map of M) for (let k = 0; k < N; k++) jobs.push({ a: T[i], b: T[j], map, seed: seed++, level, swap: k % 2 });
  const nW = Math.max(2, require('os').cpus().length - 1), results = []; let next = 0, done = 0; const t0 = Date.now();
  const startW = () => {
    const w = new Worker(__filename, { workerData: {} });
    const feed = () => { if (next < jobs.length) w.postMessage(jobs[next++]); else w.terminate(); };
    w.on('message', r => { results.push(r); done++; if (done % 100 === 0) console.error(`${done}/${jobs.length} games, ${((Date.now() - t0) / 1000).toFixed(0)}s`); feed(); if (done === jobs.length) finish(); });
    feed();
  };
  const finish = () => {
    fs.writeFileSync(path.join(__dirname, 'out', `balance_${level}.json`), JSON.stringify(results));
    console.log(`done ${results.length} games in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  };
  for (let i = 0; i < nW; i++) startW();
} else {
  const A = load();
  parentPort.on('message', job => { const t0 = Date.now(); const r = playGame(A, job); const ms = Date.now() - t0; if (ms > 5000) console.error('SLOW', ms, JSON.stringify(job)); parentPort.postMessage(r); });
}
