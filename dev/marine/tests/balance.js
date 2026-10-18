// Balance: measure-level bots play 1:1 for every sub pair on every map (sides alternate). Worker threads; maps cached.
// node tests/balance.js <gamesPerPairPerMap=2> [level=measure]   → tests/out/balance_<level>.json + per-sub table
const { Worker, isMainThread, parentPort } = require('worker_threads');
const fs = require('fs'), path = require('path');
const load = () => new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + `
;const _bm = buildMap, _cache = {};
buildMap = id => { const mp = _cache[id] || (_cache[id] = _bm(id)); return Object.assign({}, mp, { mask: mp.mask.slice(), spawns: mp.spawns.map(s => Object.assign({}, s)) }); };
return {CONFIG,createMatch,step,botPlayTurn,curSub};`)();
// BM_OVERRIDE='{"ohio":{"hp":1.1,"dmg":0.95}}' scales hp and every weapon's dmg (used by tests/tune.js)
const loadTuned = () => { const A = load(), o = JSON.parse(process.env.BM_OVERRIDE || '{}'); for (const [k, v] of Object.entries(o)) { const d = A.CONFIG.subs[k]; d.hp = Math.round(d.hp * (v.hp || 1)); for (const w of d.weapons) w.dmg = Math.round(w.dmg * (v.dmg || 1)); } return A; };
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function playGame(A, job) {
  const players = [{ id: 'a', nick: 'a', team: job.swap ? 'blue' : 'red', subId: job.a }, { id: 'b', nick: 'b', team: job.swap ? 'red' : 'blue', subId: job.b }];
  const m = A.createMatch({ seed: job.seed, mapId: job.map, players });
  const rnd = lcg(job.seed * 31 + 7), mem = { a: {}, b: {} };
  let guard = 0;
  while (m.phase !== 'over' && m.turnNo <= 80 && guard++ < 600000) {
    if (m.phase === 'aim') A.botPlayTurn(m, job.level, rnd, mem[A.curSub(m).id]);
    else A.step(m);
  }
  const ta = m.subs.find(t => t.id === 'a'), tb = m.subs.find(t => t.id === 'b'), redIsA = ta.team === 'red';
  let res;
  if (m.phase === 'over') res = m.winner === 'draw' ? 'draw' : (m.winner === 'red') === redIsA ? 'a' : 'b';
  else { const fa = ta.hp / ta.maxhp, fb = tb.hp / tb.maxhp; res = Math.abs(fa - fb) < 0.05 ? 'draw' : fa > fb ? 'a' : 'b'; }
  return { a: job.a, b: job.b, map: job.map, res, turns: m.turnNo, over: m.phase === 'over', outA: ta.deathCause === 'out', outB: tb.deathCause === 'out', dA: ta.st.dealt, dB: tb.st.dealt, sA: ta.st.shots, sB: tb.st.shots, hA: ta.st.hitTurns, hB: tb.st.hitTurns };
}
function report(results, CONFIG) {
  const S = {}; for (const k of Object.keys(CONFIG.subs)) S[k] = { w: 0, l: 0, d: 0, dealt: 0, shots: 0, hits: 0, outs: 0, maps: {} };
  for (const r of results) {
    if (r.a === r.b) continue;
    for (const [me, side, other] of [[r.a, 'a', 'b'], [r.b, 'b', 'a']]) {
      const s = S[me], mp = s.maps[r.map] || (s.maps[r.map] = { w: 0, n: 0 });
      mp.n++;
      if (r.res === 'draw') { s.d++; mp.w += 0.5; } else if (r.res === side) { s.w++; mp.w++; } else s.l++;
      s.dealt += side === 'a' ? r.dA : r.dB; s.shots += side === 'a' ? r.sA : r.sB; s.hits += side === 'a' ? r.hA : r.hB; if (side === 'a' ? r.outA : r.outB) s.outs++;
    }
  }
  const rows = Object.entries(S).map(([k, s]) => { const n = s.w + s.l + s.d; return { k, pct: n ? (s.w + s.d / 2) / n * 100 : 0, n, s }; }).sort((a, b) => b.pct - a.pct);
  const maps = Object.keys(CONFIG.maps);
  console.log('sub        win%   games  hit%  dmg/shot  ring-out  ' + maps.map(m => m.padStart(6)).join(''));
  for (const r of rows) console.log(`${r.k.padEnd(9)} ${r.pct.toFixed(1).padStart(5)}  ${String(r.n).padStart(6)}  ${(100 * r.s.hits / Math.max(1, r.s.shots)).toFixed(0).padStart(4)}  ${(r.s.dealt / Math.max(1, r.s.shots)).toFixed(0).padStart(8)}  ${String(r.s.outs).padStart(8)}  ` + maps.map(m => { const x = r.s.maps[m]; return (x ? (100 * x.w / x.n).toFixed(0) : '-').padStart(6); }).join(''));
  const turns = results.reduce((a, r) => a + r.turns, 0) / results.length, unf = results.filter(r => !r.over).length;
  console.log(`avg turns ${turns.toFixed(1)}, unfinished ${unf}/${results.length}, spread ${(rows[0].pct - rows[rows.length - 1].pct).toFixed(1)}%p`);
}
if (isMainThread) {
  const N = +(process.argv[2] || 2), level = process.argv[3] || 'measure';
  const A = loadTuned(), T = Object.keys(A.CONFIG.subs), M = Object.keys(A.CONFIG.maps);
  if (process.argv[2] === 'report') { report(JSON.parse(fs.readFileSync(path.join(__dirname, 'out', `balance_${level}.json`))), A.CONFIG); return; }
  const jobs = []; let seed = 1 + (+process.env.BM_SEED || 0) * 100000;
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) for (const map of M) for (let k = 0; k < N; k++) jobs.push({ a: T[i], b: T[j], map, seed: seed++, level, swap: k % 2 });
  const nW = Math.max(2, require('os').cpus().length), results = []; let next = 0, done = 0; const t0 = Date.now();
  const finish = () => { fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'out', process.env.BM_OUT || `balance_${level}.json`), JSON.stringify(results)); console.log(`done ${results.length} games in ${((Date.now() - t0) / 1000).toFixed(1)}s`); report(results, A.CONFIG); };
  for (let i = 0; i < nW; i++) {
    const w = new Worker(__filename);
    const feed = () => { if (next < jobs.length) w.postMessage(jobs[next++]); else w.terminate(); };
    w.on('message', r => { results.push(r); done++; if (done % 100 === 0) console.error(`${done}/${jobs.length} games, ${((Date.now() - t0) / 1000).toFixed(0)}s`); feed(); if (done === jobs.length) finish(); });
    feed();
  }
} else {
  const A = loadTuned();
  parentPort.on('message', job => parentPort.postMessage(playGame(A, job)));
}
