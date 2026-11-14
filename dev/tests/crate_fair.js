// 보급 상자 공정성: 실제 맵·인원 구성으로 턴만 넘기며(아무도 안 움직임) 상자가 누구 옆에 떨어지는지 센다.
// 기준(2026-11 팀 단위): 두 팀이 받은 상자 수 차이 1 이하(인원이 달라도 반반), 같은 팀 안 살아 있는 탱크끼리 차이 1 이하, 아무 데나 1% 이하.
// run: node tests/crate_fair.js   (exit 1 = 기준 미달)
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {CONFIG,createMatch,step,cmdTimeout};')();
const { CONFIG } = A;
const maps = Object.keys(CONFIG.maps).filter(k => !CONFIG.maps[k].solo);
let bad = 0;
for (const [red, blue] of [[1, 1], [2, 2], [2, 3], [1, 3], [4, 4]]) {
  let drops = 0, near = 0, onActive = 0, turns = 0, worst = 0, gap = 0; const team = { red: 0, blue: 0 };
  for (const mapId of maps) for (let s = 1; s <= 8; s++) {
    const pl = []; for (let i = 0; i < red + blue; i++) pl.push({ id: 'p' + i, nick: 'p', team: i < red ? 'red' : 'blue', tankId: Object.keys(CONFIG.tanks)[i % 4] });
    const m = A.createMatch({ seed: s * 977 + red * 13 + blue, mapId, players: pl });
    let g = 0; while (m.phase !== 'aim' && g++ < 20000) A.step(m);
    for (let k = 0; k < 32 && m.phase !== 'over'; k++) {
      const before = (m.crateGot || []).slice();
      m.events.length = 0; m.crates = []; // taken (nobody drives in this test)
      A.cmdTimeout(m); turns++; let g2 = 0; while (m.phase !== 'aim' && m.phase !== 'over' && g2++ < 20000) A.step(m);
      for (const e of m.events) if (e.type === 'crate') drops++;
      if (m.crateGot) m.crateGot.forEach((v, i) => { if (v > (before[i] || 0) && i === m.cur) onActive++; });
    }
    const got = m.crateGot || m.tanks.map(() => 0);
    got.forEach((v, i) => { near += v; team[m.tanks[i].team] += v; });
    for (const tm of ['red', 'blue']) { const live = got.filter((_, i) => m.tanks[i].alive && m.tanks[i].team === tm); if (live.length) worst = Math.max(worst, Math.max(...live) - Math.min(...live)); }
    gap = Math.max(gap, Math.abs((m.crateTeam ? m.crateTeam.red - m.crateTeam.blue : 0)));
  }
  const share = team.red / Math.max(1, near), anywhere = drops - near;
  const pass = worst <= 1 && gap <= 1 && Math.abs(share - 0.5) <= 0.03 && anywhere <= drops * 0.01;
  if (!pass) bad++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${red}:${blue}  상자 ${drops}개 / ${turns}턴 (턴당 ${(drops / turns).toFixed(2)})  레드 팀 몫 ${(share * 100).toFixed(0)}% (목표 50%)  한 판 안 두 팀 차이 최대 ${gap}  같은 팀 탱크끼리 차이 최대 ${worst}  아무 데나 ${anywhere}`);
}
process.exit(bad ? 1 : 0);
