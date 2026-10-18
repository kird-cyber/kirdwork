// Auto-tune: repeat balance runs, nudging each sub's hp and weapon damage toward a 50% win rate.
// node tests/tune.js [rounds=4] [games=16]  (fresh seeds every round so it does not fit one sample's noise)   → prints suggested hp / dmg values for src/config.js
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const A = require('./load.js')([]), SUBS = Object.keys(A.CONFIG.subs);
const rounds = +(process.argv[2] || 4), games = +(process.argv[3] || 16);
const ov = {}; for (const k of SUBS) ov[k] = { hp: 1, dmg: 1 };
let round = 0;
function winrates() {
  round++;
  execFileSync('node', [path.join(__dirname, 'balance.js'), String(games)], { env: Object.assign({}, process.env, { BM_OVERRIDE: JSON.stringify(ov), BM_OUT: 'tune.json', BM_SEED: String(round) }), stdio: ['ignore', 'ignore', 'ignore'] });
  const res = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'tune.json'))), w = {}, n = {};
  for (const r of res) for (const [me, side] of [[r.a, 'a'], [r.b, 'b']]) { n[me] = (n[me] || 0) + 1; w[me] = (w[me] || 0) + (r.res === 'draw' ? 0.5 : r.res === side ? 1 : 0); }
  const out = {}; for (const k of SUBS) out[k] = 100 * w[k] / n[k]; return out;
}
for (let r = 0; r < rounds; r++) {
  const wr = winrates();
  console.log(`round ${r}: ` + SUBS.map(k => `${k} ${wr[k].toFixed(0)}`).join(' · '));
  for (const k of SUBS) { const f = 1 + (50 - wr[k]) / 100 * 0.25; ov[k].hp *= f; ov[k].dmg *= f; }
}
const wr = winrates();
console.log('final: ' + SUBS.map(k => `${k} ${wr[k].toFixed(1)}`).join(' · '));
for (const k of SUBS) { const d = A.CONFIG.subs[k]; console.log(`${k.padEnd(9)} hp ${d.hp} → ${Math.round(d.hp * ov[k].hp / 10) * 10}   dmg ×${ov[k].dmg.toFixed(3)}: ` + d.weapons.map(w => `${w.id} ${w.dmg}→${Math.round(w.dmg * ov[k].dmg / 5) * 5}`).join(', ')); }
