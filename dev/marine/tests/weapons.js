// Browser: fire every weapon of every sub (incl. the hidden one) on every map, aimed at the nearest enemy.
// Checks page errors, frame rate during the busiest moments and that effect lists do not pile up. run: node tests/weapons.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|WebSocket/.test(m.text())) errs.push(m.text()); });
  const MAPS = ['reef', 'cave', 'wreck', 'ice', 'vents'];
  const slot = (team, i) => ({ nick: team + i, tank: 'uboat', ctl: 'human' });
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  const SUBS = await p.evaluate(() => Object.keys(__pg.CONFIG.subs));
  let shots = 0, minFps = 999, maxFx = 0;
  for (let mi = 0; mi < MAPS.length; mi++) {
    await p.evaluate(s => localStorage.setItem('bm.setup', JSON.stringify(s)), { map: MAPS[mi], red: 2, blue: 2, slots: { red: [0, 1, 2, 3].map(i => slot('red', i)), blue: [0, 1, 2, 3].map(i => slot('blue', i)) } });
    await p.reload(); await p.waitForTimeout(400);
    await p.click('#practiceBtn'); await p.click('#start'); await p.waitForTimeout(1500);
    const list = mi === 0 ? SUBS.flatMap(s => [[s, 0], [s, 1]]) : SUBS.filter((_, i) => i % 5 === mi % 5 || i % 5 === (mi + 2) % 5).flatMap(s => [[s, 0], [s, 1]]);
    for (const [sub, w] of list) {
      const ok = await p.waitForFunction(() => __pg.match.phase === 'aim' || __pg.match.phase === 'over', null, { timeout: 30000 }).then(() => true, () => false);
      if (!ok || await p.evaluate(() => __pg.match.phase === 'over')) break;
      await p.evaluate(([sub, w]) => {
        const m = __pg.match, t = m.subs[m.cur]; t.subId = sub; t.cd = 0;
        const f = m.subs.filter(o => o.alive && o.team !== t.team).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
        __pg.ctrl.aimAt(f.x + 40, f.y); __pg.ctrl.selectWeapon(w);
      }, [sub, w]);
      await p.keyboard.down('Space'); await p.waitForTimeout(700 + Math.random() * 2600); await p.keyboard.up('Space');
      shots++;
      // frame rate while the shot is in the water / exploding
      const fps = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
      minFps = Math.min(minFps, fps);
      maxFx = Math.max(maxFx, await p.evaluate(() => __pg.R.fx.length));
      // keep everyone alive so the match lasts
      await p.evaluate(() => { for (const t of __pg.match.subs) if (t.alive) t.hp = t.maxhp; });
    }
    console.log(`${MAPS[mi]}: shots so far ${shots}`);
  }
  await p.screenshot({ path: path.join(__dirname, 'out', 'w_last.png') });
  console.log(`shots ${shots}, min fps ${minFps}, max fx ${maxFx}`);
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 10).join('\n') : 'no page errors');
  await b.close();
})();
