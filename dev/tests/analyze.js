// Summarise tests/out/balance_<level>.json
const fs = require('fs'), path = require('path');
const level = process.argv[2] || 'normal';
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', `balance_${level}.json`)));
const T = ['boulder', 'viper', 'hammer', 'rookie', 'trapper', 'swarm', 'prism', 'rage', 'kblue', 'kgreen'], M = ['temple', 'valley', 'clouds', 'bridge', 'snow', 'lava', 'moon', 'islands'];
const NAME = { boulder: '볼더', viper: '바이퍼', hammer: '해머', rookie: '루키', trapper: '트래퍼', swarm: '스웜', prism: '프리즘', rage: '레이지', kird: '케이' };
const MAPN = { temple: '사막 신전', valley: '협곡 도시', clouds: '구름 대륙', bridge: '외나무 다리', snow: '설원 요새', lava: '화산 지대', moon: '달 기지', islands: '푸른 군도' };
const score = (r, side) => r.res === side ? 1 : r.res === 'draw' ? 0.5 : 0;
const W = {}, N = {}, mapW = {}, mapN = {};
for (const r of R) {
  if (r.a === r.b) continue;
  for (const [me, op, side] of [[r.a, r.b, 'a'], [r.b, r.a, 'b']]) {
    const k = me + '|' + op; W[k] = (W[k] || 0) + score(r, side); N[k] = (N[k] || 0) + 1;
    const mk = me + '|' + r.map; mapW[mk] = (mapW[mk] || 0) + score(r, side); mapN[mk] = (mapN[mk] || 0) + 1;
  }
}
const overall = {}; for (const t of T) { let w = 0, n = 0; for (const o of T) if (o !== t) { w += W[t + '|' + o]; n += N[t + '|' + o]; } overall[t] = { w, n, pct: 100 * w / n }; }
const matrix = T.map(t => T.map(o => t === o ? null : Math.round(1000 * W[t + '|' + o] / N[t + '|' + o]) / 10));
const perMap = {}; for (const t of T) perMap[t] = M.map(mp => Math.round(1000 * mapW[t + '|' + mp] / mapN[t + '|' + mp]) / 10);
const mapStats = M.map(mp => { const g = R.filter(r => r.map === mp), tu = g.map(r => r.turns).sort((a, b) => a - b); return { map: mp, games: g.length, medianTurns: tu[tu.length >> 1], finished: Math.round(100 * g.filter(r => r.over).length / g.length), fallPct: Math.round(100 * g.filter(r => r.fallA || r.fallB).length / g.length) }; });
const out = { level, games: R.length, overall, matrix, perMap, mapStats, T, M, NAME, MAPN };
fs.writeFileSync(path.join(__dirname, 'out', `analysis_${level}.json`), JSON.stringify(out, null, 1));
console.log(`games: ${R.length}`);
console.log('전체 승률 (미러전 제외):'); for (const t of T.slice().sort((a, b) => overall[b].pct - overall[a].pct)) console.log(`  ${NAME[t].padEnd(4)} ${overall[t].pct.toFixed(1)}%  (${overall[t].n}판)${overall[t].pct < 45 || overall[t].pct > 55 ? '  ← 범위 밖' : ''}`);
console.log('\n상대 승률 (행이 열을 이길 확률):\n        ' + T.map(t => NAME[t].padStart(5)).join(''));
T.forEach((t, i) => console.log(NAME[t].padEnd(6) + matrix[i].map(v => (v === null ? '  -  ' : v.toFixed(0).padStart(5))).join('')));
console.log('\n맵별 승률:\n        ' + M.map(m => MAPN[m].padStart(7)).join(''));
for (const t of T) console.log(NAME[t].padEnd(6) + perMap[t].map(v => v.toFixed(0).padStart(8)).join(''));
console.log('\n맵 통계:'); for (const s of mapStats) console.log(`  ${MAPN[s.map]}: 중앙 ${s.medianTurns}턴, 끝난 판 ${s.finished}%, 낙사로 끝난 판 ${s.fallPct}%`);
