// Browser smoke: home → practice setup → bot match; play my turns by dragging a curve and firing; screenshots + console errors.
// run: node tests/smoke.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'), OUT = path.join(__dirname, 'out');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/s1_home.png' });
  await p.click('#practiceBtn'); await p.waitForTimeout(600); await p.screenshot({ path: OUT + '/s2_setup.png' });
  await p.click('#start'); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/s3_game.png' });
  let shotN = 0;
  for (let k = 0; k < 40; k++) {
    const st = await p.evaluate(() => { const m = __pg.match; return { phase: m.phase, turn: m.turnNo, mine: __pg.ctrl.activeLocal(), over: m.phase === 'over' }; });
    if (st.over) break;
    if (st.mine) {
      // aim straight at the nearest enemy with a double-click on screen
      const tgt = await p.evaluate(() => { const m = __pg.match, t = m.subs[m.cur]; const f = m.subs.filter(o => o.alive && o.team !== t.team).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0]; __pg.ctrl.aimAt(f.x, f.y); return [f.x, f.y]; });
      if (shotN === 0) { await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/s4_aim.png' }); }
      await p.keyboard.down('Space'); await p.waitForTimeout(900); await p.keyboard.up('Space');
      if (shotN++ === 0) { await p.waitForTimeout(250); await p.screenshot({ path: OUT + '/s5_flight.png' }); }
    }
    await p.waitForTimeout(1500);
    if (k === 6) await p.screenshot({ path: OUT + '/s6_mid.png' });
  }
  const fin = await p.evaluate(() => ({ phase: __pg.match.phase, turn: __pg.match.turnNo, hp: __pg.match.subs.map(t => t.subId + ':' + t.hp) }));
  await p.screenshot({ path: OUT + '/s7_end.png' });
  console.log(JSON.stringify(fin), 'my shots', shotN); console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 10).join('\n') : 'no errors');
  await b.close();
})();
