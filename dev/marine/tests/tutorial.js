// Browser: tutorial steps advance with real input (keys, dragging handle 1 with the mouse, holding Space).
// run: node tests/tutorial.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html')); await p.waitForTimeout(500);
  await p.click('#tutorialBtn'); await p.waitForTimeout(1500);
  const step = () => p.evaluate(() => document.getElementById('coachStep').textContent);
  const res = [await step()];
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1200); await p.keyboard.up('ArrowRight');
  await p.waitForTimeout(300); res.push(await step());
  // drag handle 1 on the aiming panel with the mouse
  const h = await p.evaluate(() => { const pad = document.getElementById('aimPad').getBoundingClientRect(), c = __pg.ctrl, t = __pg.match.subs[__pg.match.cur], w = c.worldPts(t)[0], s = (pad.width / 2) / 2400; return { x: pad.left + pad.width / 2 + (w[0] - t.x) * s, y: pad.top + pad.height / 2 + (w[1] - t.y) * s, before: JSON.stringify(c.worldPts()) }; });
  await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(h.x + 10, h.y - 25, { steps: 8 }); await p.mouse.up();
  const after = await p.evaluate(() => JSON.stringify(__pg.ctrl.worldPts()));
  await p.waitForTimeout(300); res.push(await step());
  await p.screenshot({ path: path.join(__dirname, 'out', 't_drag.png') });
  await p.keyboard.down('Space'); await p.waitForTimeout(1200); await p.keyboard.up('Space');
  await p.waitForTimeout(300); res.push(await step());
  console.log(res.join(' → '), '| handle moved:', h.before !== after);
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
