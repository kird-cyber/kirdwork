// Automatic balance pass: measures every tank against the field (sides alternate, all maps) and scales its weapon
// damage toward 50%. Rewrites src/config.js. node tests/tune.js <rounds> <games per opponent per map>
const { Worker, isMainThread, parentPort } = require('worker_threads');
const fs = require('fs'), path = require('path');
const CFG = path.join(__dirname, '../src/config.js');
const load = () => new Function(['config.js', 'core.js', 'mapgen.js', 'sim.js', 'bot.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n') + ';return {CONFIG,createMatch,step,botPlayTurn};')();
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
if (isMainThread) {
  const rounds = +(process.argv[2] || 2), N = +(process.argv[3] || 2);
  const runRound = () => new Promise(res => {
    const A0 = load(), T = Object.keys(A0.CONFIG.tanks), maps = Object.keys(A0.CONFIG.maps);
    const jobs = []; let seed = 20000 + Math.floor(Math.random() * 1e6);
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) for (const map of maps) for (let k = 0; k < N; k++) jobs.push({ a: T[i], b: T[j], map, seed: seed++, swap: k % 2 });
    const score = {}, games = {}; for (const t of T) { score[t] = 0; games[t] = 0; }
    let next = 0, done = 0;
    for (let w = 0; w < 2; w++) {
      const wk = new Worker(__filename);
      const feed = () => { if (next < jobs.length) wk.postMessage(jobs[next++]); else wk.terminate(); };
      wk.on('message', r => { score[r.a] += r.sa; score[r.b] += 1 - r.sa; games[r.a]++; games[r.b]++; done++; if (done === jobs.length) res({ T, wr: Object.fromEntries(T.map(t => [t, score[t] / games[t]])) }); feed(); });
      feed();
    }
  });
  (async () => {
    for (let r = 1; r <= rounds; r++) {
      const { T, wr } = await runRound();
      console.log(`round ${r}: ` + T.map(t => `${t} ${(wr[t] * 100).toFixed(1)}`).join(' · '));
      if (r === rounds) break;
      let src = fs.readFileSync(CFG, 'utf8');
      const A0 = load();
      for (const t of T) {
        const f = Math.max(0.88, Math.min(1.14, 1 + (0.5 - wr[t]) * 0.7));
        for (const w of A0.CONFIG.tanks[t].weapons) {
          const re = new RegExp(`(name: '${w.name}', dmg: )(\\d+)`);
          src = src.replace(re, (m0, a, d) => a + Math.round(+d * f));
        }
      }
      fs.writeFileSync(CFG, src);
    }
  })();
} else {
  const A = load();
  parentPort.on('message', job => {
    const pl = [{ id: 'a', nick: 'a', team: job.swap ? 'blue' : 'red', tankId: job.a }, { id: 'b', nick: 'b', team: job.swap ? 'red' : 'blue', tankId: job.b }];
    const m = A.createMatch({ seed: job.seed, mapId: job.map, players: pl }); const rnd = lcg(job.seed * 31 + 7); let g = 0;
    while (m.phase !== 'over' && m.turnNo <= 80 && g++ < 400000) { if (m.phase === 'aim') A.botPlayTurn(m, 'measure', rnd); else A.step(m); }
    const ta = m.tanks[0], tb = m.tanks[1];
    let sa; if (m.phase === 'over') sa = m.winner === ta.team ? 1 : m.winner === 'draw' ? 0.5 : 0; else { const fa = ta.hp / ta.maxhp, fb = tb.hp / tb.maxhp; sa = Math.abs(fa - fb) < 0.05 ? 0.5 : fa > fb ? 1 : 0; }
    parentPort.postMessage({ a: job.a, b: job.b, sa });
  });
}
