// Replays a log recorded in the browser inside Node and compares every turn hash.
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {createMatch,createController};')();
const rec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const m = A.createMatch({ seed: rec.seed, mapId: rec.mapId, players: rec.players });
const by = {}; for (const i of rec.log) by[i.turnNo] = i;
const c = A.createController(m, { replay: by });
let f = 0; while (m.phase !== 'over' && f < 200000) { f++; if (m.phase === 'aim' && !by[m.turnNo]) break; c.frame(1 / 60); }
const turns = Object.keys(rec.hashes).map(Number);
const bad = turns.filter(t => rec.hashes[t] !== m.hashes[t]);
console.log(`browser turns: ${turns.length}, inputs: ${rec.log.length}, node replay mismatched turns: ${bad.length ? bad.join(',') : 'none'}`);
