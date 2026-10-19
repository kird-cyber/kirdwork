// Browser check of the items: a crate touched by the hull is picked up, the item bar uses it, 2연발 fires twice and
// 순간이동 moves the sub. run: node tests/items.js  (screenshots tests/out/item_*.png)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'), OUT = path.join(__dirname, 'out');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p.waitForTimeout(600); await p.click('#practiceBtn'); await p.waitForTimeout(400); await p.click('#start');
  const waitMine = async () => { for (let k = 0; k < 120; k++) { if (await p.evaluate(() => __pg.match && __pg.match.phase === 'aim' && __pg.ctrl.activeLocal())) return true; await p.waitForTimeout(500); } return false; };
  const res = [];
  const ok = (name, v) => { res.push((v ? 'PASS ' : 'FAIL ') + name); };
  ok('내 차례 옴', await waitMine());
  // a crate just ahead of the nose: hold the arrow key toward it
  const dir = await p.evaluate(() => { const m = __pg.match, t = m.subs[m.cur]; t.items = []; const s = t.x < m.W / 2 ? 1 : -1; m.crates.push({ x: Math.round(t.x + s * 66), y: Math.round(t.y), item: 'double', dead: false, id: 9001 }); return s > 0 ? 'ArrowRight' : 'ArrowLeft'; });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/item_1_crate.png' });
  await p.keyboard.down(dir); await p.waitForTimeout(250); await p.keyboard.up(dir); await p.waitForTimeout(400);
  ok('몸이 닿은 상자 획득', await p.evaluate(() => __pg.match.subs[__pg.match.cur].items[0] === 'double'));
  await p.screenshot({ path: OUT + '/item_2_got.png' });
  await p.click('#items .item:not(.empty)'); await p.waitForTimeout(200);
  ok('아이템 칸 클릭으로 2연발 사용', await p.evaluate(() => __pg.match.turn.double === true));
  ok('HUD에 "2연발 준비"', (await p.textContent('#whoHp')).includes('2연발'));
  let fires = 0; await p.exposeFunction('__fire', () => fires++);
  await p.evaluate(() => { const m = __pg.match, t = m.subs[m.cur]; const f = m.subs.filter(o => o.alive && o.team !== t.team).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0]; __pg.ctrl.aimAt(f.x, f.y);
    const push = m.events.push.bind(m.events); m.events.push = e => { if (e.type === 'fire') window.__fire(); return push(e); }; });
  await p.keyboard.down('Space'); await p.waitForTimeout(900); await p.keyboard.up('Space');
  await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/item_3_double.png' });
  await p.waitForTimeout(1500);
  ok('2연발: 발사 2번', fires === 2);
  ok('다음 내 차례', await waitMine());
  const before = await p.evaluate(() => { const m = __pg.match, t = m.subs[m.cur]; t.items = ['tele']; return { x: t.x, y: t.y, i: t.idx }; });
  await p.waitForTimeout(200); await p.keyboard.press('Digit3'); await p.waitForTimeout(150);
  ok('키 3으로 순간이동 사용', await p.evaluate(() => __pg.match.turn.tele === true));
  await p.evaluate(() => { const m = __pg.match, t = m.subs[m.cur]; __pg.ctrl.aimAt(t.x + (t.x < m.W / 2 ? 700 : -700), t.y - 150); });
  await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space');
  await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/item_4_tele_fly.png' });
  for (let k = 0; k < 20; k++) { if (await p.evaluate(() => __pg.match.phase !== 'flight')) break; await p.waitForTimeout(200); }
  await p.waitForTimeout(150); await p.screenshot({ path: OUT + '/item_5_tele_done.png' });
  const me = await p.evaluate(i => { const t = __pg.match.subs[i]; return { x: t.x, y: t.y }; }, before.i);
  ok(`순간이동: 위치 바뀜 (${Math.round(before.x)},${Math.round(before.y)} → ${Math.round(me.x)},${Math.round(me.y)})`, Math.hypot(me.x - before.x, me.y - before.y) > 200);
  console.log(res.join('\n')); console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  await b.close();
  process.exit(res.some(r => r.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
