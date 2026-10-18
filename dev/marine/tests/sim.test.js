// Determinism + coverage: bot games on every map with every sub; each game is replayed from its TurnInputs alone
// and must reach the same state hash on every turn. Also checks every weapon was fired and both games end.
// run: node tests/sim.test.js [games=30]
const A = require('./load.js')(['bot.js']);
const N = +(process.argv[2] || 30);
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const SUBS = Object.keys(A.CONFIG.subs), MAPS = Object.keys(A.CONFIG.maps);
const fired = {}; let fails = 0, draws = 0, turnsTotal = 0;
for (let g = 0; g < N; g++) {
  const rnd = lcg(1000 + g), n = 2 + Math.floor(rnd() * 3) * 2; // 2, 4 or 6 players
  const players = [];
  for (let i = 0; i < n; i++) players.push({ id: 'p' + i, nick: 'p' + i, team: i % 2 ? 'blue' : 'red', subId: SUBS[(g * 3 + i) % SUBS.length] });
  const cfg = { seed: 77 + g * 13, mapId: MAPS[g % MAPS.length], players };
  const m = A.createMatch(cfg), log = [], mem = {};
  let guard = 0;
  while (m.phase !== 'over' && m.turnNo <= 70 && guard++ < 600000) {
    if (m.phase === 'aim') {
      const t = A.curSub(m), inp = A.botPlayTurn(m, ['easy', 'normal', 'hard', 'measure'][g % 4], rnd, mem[t.id] || (mem[t.id] = {}));
      if (inp) { log.push(inp); if (inp.weapon !== undefined) fired[t.subId + ':' + inp.weapon] = 1; }
    } else A.step(m);
  }
  turnsTotal += m.turnNo;
  if (m.phase !== 'over') draws++;
  // replay from inputs only
  const r = A.createMatch(cfg), byTurn = {}; for (const x of log) byTurn[x.turnNo] = x;
  guard = 0;
  while (r.phase !== 'over' && r.turnNo <= 70 && guard++ < 600000) {
    if (r.phase === 'aim') { const x = byTurn[r.turnNo]; if (!x) break; A.applyTurnInput(r, x); }
    else A.step(r);
  }
  let bad = 0;
  for (const k of Object.keys(m.hashes)) if (m.hashes[k] !== r.hashes[k]) bad++;
  if (A.stateHash(m) !== A.stateHash(r)) bad++;
  if (bad) { fails++; console.log(`FAIL game ${g} (${cfg.mapId}, ${n}p): ${bad} hash mismatches`); }
}
const missing = SUBS.flatMap(s => [0, 1].map(w => s + ':' + w)).filter(k => !fired[k]);
console.log(`${N} games, replay mismatches: ${fails}, unfinished (70+ turns): ${draws}, avg turns ${(turnsTotal / N).toFixed(1)}, weapons never fired: ${missing.length ? missing.join(' ') : 'none'}`);
console.log(fails ? 'FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
