// Re-run 연구부정 소탕전 records from their input logs and compare with what was saved.
// usage: node tests/verify_solo.js records.json   (an array of {day, nick, tank, time, hp, clear, log}; e.g. copied from the sheet)
//        node tests/verify_solo.js records.csv    (the 「기록」 tab downloaded as CSV)
const fs = require('fs'), path = require('path');
const code = ['config.js', 'core.js', 'mapgen.js', 'sim.js', 'controller.js', 'bot.js', 'solo.js'].map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
const A = new Function(code + '\n;return {soloReplay};')();
const file = process.argv[2]; if (!file) { console.log('usage: node tests/verify_solo.js records.json|records.csv'); process.exit(1); }
let recs, text = fs.readFileSync(file, 'utf8');
if (/\.csv$/i.test(file)) {
  // minimal CSV parser (quoted fields with "" escapes)
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const K = { '클리어': 'clear', '시간종료': 'timeup', '탈락': 'out' };
  recs = rows.slice(1).map(r => ({ day: r[1], nick: r[2], kind: K[r[4]] || 'out', time: +r[5], hp: +r[6], tank: r[8], log: r[11], left: +(r[12] || 0) }));
} else recs = JSON.parse(text);
let bad = 0;
for (const r of recs) {
  let inputs; try { inputs = typeof r.log === 'string' ? JSON.parse(r.log) : r.log; } catch (e) { console.log(`?? ${r.day} ${r.nick}: 입력 기록을 읽을 수 없음`); bad++; continue; }
  const rp = A.soloReplay(r.day, r.tank, inputs || []);
  const kind = r.kind || (r.clear ? 'clear' : 'out');
  const same = rp.kind === kind && Math.abs(rp.time - r.time) < 0.011 && rp.hp === r.hp && (kind !== 'timeup' || rp.left === r.left);
  if (!same) bad++;
  console.log(`${same ? 'OK ' : 'XX '} ${r.day} ${r.nick} ${r.tank}: 저장 ${kind} ${r.time}s/${r.hp}/적${r.left || 0} · 재실행 ${rp.kind} ${rp.time}s/${rp.hp}/적${rp.left}${rp.bad ? ' (' + rp.bad + ')' : ''}`);
}
console.log(`\n${recs.length - bad}/${recs.length} 일치`); process.exit(bad ? 1 : 0);
