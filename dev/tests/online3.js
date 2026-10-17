// M4 online test 3: message loss. Every device drops a share of incoming messages; the game must stay in step.
// node tests/online3.js [loss=0.3] [players=3] [turns=12]
const { chromium } = require('playwright');
const LOSS = +(process.argv[2] || 0.3), N = +(process.argv[3] || 3), TURNS = +(process.argv[4] || 12);
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const open = async (url, nick) => { const p = await (await browser.newContext({ viewport: { width: 1000, height: 640 } })).newPage(); p.on('pageerror', e => errors.push(nick + ': ' + e.message)); await p.goto(url); await p.waitForFunction(() => window.__pg && document.getElementById('nickIn')); await p.fill('#nickIn', nick); return p; };
  const S = p => p.evaluate(() => { const m = __pg.match; return { screen: __pg.screen, turn: m && m.turnNo, phase: m && m.phase, active: !!(__pg.ctrl && __pg.ctrl.activeLocal()), hashes: m ? m.hashes : {}, over: m && m.phase === 'over', needs: __pg.ON.needs || 0, resyncs: __pg.ON.resyncs || 0 }; });
  const A = await open(BASE, '갑'); await A.click('#createBtn'); await until(async () => (await S(A)).screen === 'lobby', 8000);
  const link = await A.inputValue('#shareLink'); const pages = [A];
  for (let i = 1; i < N; i++) { const P = await open(link, '플' + i); await P.click('#joinBtn'); pages.push(P); }
  await until(async () => A.evaluate(n => __pg.ON.link.room.players.length === n && __pg.ON.link.canStart(), N), 10000);
  await A.click('#lobbyStart');
  ok(await until(async () => (await Promise.all(pages.map(S))).every(s => s.screen === 'game'), 10000), '게임 시작');
  await Promise.all(pages.map(p => p.evaluate(l => { window.__pgLoss = l; }, LOSS)));
  const acted = {}; const t0 = Date.now(); let stuckSince = Date.now(), lastMin = 0;
  while (Date.now() - t0 < 300000) {
    const st = await Promise.all(pages.map(S));
    const minT = Math.min(...st.map(s => s.turn));
    if (minT !== lastMin) { lastMin = minT; stuckSince = Date.now(); }
    if (minT >= TURNS || st.some(s => s.over)) break;
    if (Date.now() - stuckSince > 60000) { console.log('STUCK', JSON.stringify(st.map(s => [s.turn, s.phase, s.active]))); break; }
    for (let i = 0; i < pages.length; i++) if (st[i].active && !acted[st[i].turn]) {
      acted[st[i].turn] = 1; const P = pages[i];
      await P.keyboard.down(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight'); await sleep(300); await P.keyboard.up('ArrowLeft'); await P.keyboard.up('ArrowRight');
      await P.keyboard.down('Space'); await sleep(500 + Math.random() * 800); await P.keyboard.up('Space');
    }
    await sleep(200);
  }
  const st = await Promise.all(pages.map(S));
  let bad = 0, common = 0;
  for (const tn of Object.keys(st[0].hashes)) { const hs = st.map(s => s.hashes[tn]); if (hs.every(h => h !== undefined)) { common++; if (new Set(hs).size > 1) bad++; } }
  ok(Math.min(...st.map(s => s.turn)) >= TURNS || st.some(s => s.over), `메시지 ${Math.round(LOSS * 100)}% 유실 속에서 ${Math.min(...st.map(s => s.turn))}턴까지 진행 (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  ok(bad === 0, `해시 불일치 ${bad} / ${common}턴`);
  console.log('   재요청', st.map(s => s.needs).join(','), '재동기', st.map(s => s.resyncs).join(','));
  ok(errors.length === 0, '페이지 오류 없음' + (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
