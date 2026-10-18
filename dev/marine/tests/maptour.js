// Browser: open every map in practice and photograph its signature spot. run: node tests/maptour.js  → tests/out/tour_<map>.png
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const SPOT = { god12: [2000, 700], atlantic: [1950, 700], battlefield: [2100, 800], bermuda: [2100, 850], cave: [1450, 700], cube: [1900, 700], duke: [2200, 900], iceberg: [2050, 600], jurassic: [2000, 1000], nautilus: [2000, 800], seacity: [2100, 700], spa: [2000, 1000] };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  for (const [id, [x, y]] of Object.entries(SPOT)) {
    await p.evaluate(m => localStorage.setItem('bm.setup', JSON.stringify({ map: m, red: 1, blue: 1, slots: { red: [0, 1, 2, 3].map(i => ({ nick: '나', tank: 'uboat', ctl: 'human' })), blue: [0, 1, 2, 3].map(i => ({ nick: '봇', tank: 'orca', ctl: 'easy' })) } })), id);
    await p.reload(); await p.waitForTimeout(300); await p.click('#practiceBtn'); await p.click('#start');
    await p.waitForFunction(() => window.__pg.match && __pg.match.phase === 'aim', null, { timeout: 20000 });
    await p.evaluate(([x, y]) => { const R = __pg.R; R.free = true; R.follow = null; R.cam.x = x; R.cam.y = y; }, [x, y]);
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(__dirname, 'out', `tour_${id}.png`) });
  }
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
