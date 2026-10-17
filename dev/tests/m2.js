const { chromium } = require('playwright'); const fs = require('fs');
const SP = '/tmp/claude-0/-home-claude/3d72a4ac-67b3-5258-9678-3a944320e7db/scratchpad/';
const html = fs.readFileSync(__dirname + '/../dist/pogyeokjeon.html', 'utf8');
const wrap = '<!doctype html><html><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' + html + '</body></html>';
const res = []; const ok = (c, m) => res.push((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setContent(wrap); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => __pg.AU.ctx === null), '첫 조작 전에는 소리 엔진이 꺼져 있음');
  await p.click('#practiceBtn');
  await p.click('.seg[data-team="red"][data-n="2"]'); await p.click('.seg[data-team="blue"][data-n="2"]');
  await p.evaluate(() => document.querySelectorAll('select.ctl').forEach(s => { s.value = 'human'; s.dispatchEvent(new Event('change')); })); await p.click('#start'); await p.waitForTimeout(2600);
  ok(await p.evaluate(() => __pg.AU.ctx !== null), '클릭 후 소리 엔진 시작');
  // put the current tank on a slope-free spot is not needed; aim up to the limit and hold
  await p.evaluate(() => { const t = __pg.match.tanks[__pg.match.cur]; t.lastAim = Math.round((__pg.CONFIG.tanks[t.tankId].angleMin + __pg.CONFIG.tanks[t.tankId].angleMax) / 2); t.lastPower = 620; });
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(3200);
  await p.screenshot({ path: SP + 'm2_nav_limit.png' });
  ok(await p.evaluate(() => __pg.ctrl.limit === 'max'), '각도 끝에서 멈춤 신호');
  await p.keyboard.up('ArrowUp');
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(700); await p.keyboard.up('ArrowDown');
  await p.waitForTimeout(150);
  await p.screenshot({ path: SP + 'm2_nav.png' });
  // charge
  await p.keyboard.down('Space'); await p.waitForTimeout(900);
  await p.screenshot({ path: SP + 'm2_charge.png' });
  await p.keyboard.up('Space');
  await p.waitForTimeout(180); await p.screenshot({ path: SP + 'm2_fire.png' });
  const c0 = await p.evaluate(() => __pg.AU.count);
  ok(c0 > 0, `효과음 재생 횟수 ${c0}`);
  await p.waitForFunction(() => __pg.match.phase === 'aim', null, { timeout: 20000 });
  await p.waitForTimeout(900);
  // effects showcase on the current tank
  await p.evaluate(() => {
    const m = __pg.match, t = m.tanks[m.cur], o = m.tanks.find(x => x !== t && Math.abs(x.x - t.x) < 900) || m.tanks[(m.cur + 1) % m.tanks.length];
    t.shield = true; t.poison = { dmg: 40, turns: 2, healCut: 1 };
    m.events.push({ type: 'dmg', idx: t.idx, x: t.x, y: t.y, amount: 230, kind: 'hit' });
    m.events.push({ type: 'boom', x: t.x + 160, y: t.y - 10, r: 28, color: '#FFB040' });
    m.events.push({ type: 'boom', x: t.x - 200, y: t.y - 10, r: 44, color: '#FFB040' });
    m.events.push({ type: 'boom', x: t.x + 380, y: t.y - 10, r: 70, color: '#FF7FA8' });
    const x = Math.round(t.x - 300); m.crates.push({ x, y: Math.max(0, (function () { for (let y = 0; y < m.H; y++) if (m.mask[y * m.W + x]) return y; return 0; })()), item: 'heal', dead: false, id: 99999 });
    m.events.push({ type: 'crate', x, y: 0, item: 'heal', id: 99999 });
  });
  await p.waitForTimeout(140); await p.screenshot({ path: SP + 'm2_fx1.png' });
  await p.waitForTimeout(700); await p.screenshot({ path: SP + 'm2_fx2.png' });
  ok(await p.evaluate(() => __pg.R.fx.some(f => f.kind === 'bubble')), '중독 거품 표시');
  // reduced motion
  await p.click('#shakeBtn');
  await p.evaluate(() => { const m = __pg.match, t = m.tanks[m.cur]; m.events.push({ type: 'boom', x: t.x + 100, y: t.y, r: 70, color: '#FFB040' }); });
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => __pg.R.shake === 0 && __pg.R.reduceMotion), '흔들림 끄기 → 화면 흔들림 없음');
  await p.click('#sndBtn');
  ok(await p.evaluate(() => __pg.AU.muted), '음소거 버튼');
  // death fx
  await p.evaluate(() => { const m = __pg.match, t = m.tanks[(m.cur + 1) % m.tanks.length]; m.events.push({ type: 'death', idx: t.idx, x: t.x, y: t.y }); __pg.R.camTo(t); });
  await p.waitForTimeout(1600); await p.screenshot({ path: SP + 'm2_death.png' });
  // tilt: find a tank on a slope and show dial
  ok(errs.length === 0, '페이지 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(res.join('\n'));
})();
