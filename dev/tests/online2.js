// M4 online test 2: full 4:4 room, 9th player refused, kick, host leaving the lobby, 8-player game sync, hidden tab.
// needs the local broker + http server (see tests/online.js)
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
const SP = process.env.SP || '/tmp/claude-0/';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const errors = [];
  async function open(url, nick) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(nick + ': ' + e.message));
    await p.goto(url);
    await p.waitForFunction(() => window.__pg && document.getElementById('nickIn'), null, { timeout: 15000 });
    await p.fill('#nickIn', nick); p.nick = nick;
    return p;
  }
  const S = p => p.evaluate(() => { const L = __pg.ON.link, m = __pg.match; return { screen: __pg.screen, host: L && L.isHost(), n: L && L.room ? L.room.players.length : 0, players: L && L.room ? L.room.players.map(x => x.nick + ':' + x.team).join(',') : '', turn: m && m.turnNo, phase: m && m.phase, active: !!(__pg.ctrl && __pg.ctrl.activeLocal()), hashes: m ? m.hashes : {}, msg: document.getElementById('homeMsg').textContent }; });

  const H = await open(BASE, '호스트');
  await H.click('#createBtn');
  await until(async () => (await S(H)).screen === 'lobby', 8000);
  const link = await H.inputValue('#shareLink');
  const pages = [H];
  for (let i = 1; i < 8; i++) { const P = await open(link, '친구' + i); await P.click('#joinBtn'); pages.push(P); }
  ok(await until(async () => (await S(H)).n === 8, 15000), '8명 입장 (4:4)');
  const pl = (await S(H)).players.split(',');
  ok(pl.filter(x => x.endsWith(':red')).length === 4 && pl.filter(x => x.endsWith(':blue')).length === 4, '자동으로 4:4 배정');
  ok(await pages[1].evaluate(() => document.querySelector('.pc.me .mini').disabled), '상대 팀이 4명이면 팀 이동 버튼 비활성');
  // 9th player
  const X = await open(link, '아홉째');
  await X.click('#joinBtn');
  ok(await until(async () => /가득/.test((await S(X)).msg), 8000), '9번째 사람은 "방이 가득 찼습니다" 안내');
  ok((await S(H)).n === 8, '방 인원은 8명 그대로');
  await X.context().close();
  // kick
  H.on('dialog', d => d.accept());
  const victim = pages[7];
  await H.evaluate(() => { const c = [...document.querySelectorAll('.pc')].find(c => c.querySelector('b') && c.querySelector('b').textContent === '친구7'); c.querySelector('.mini.warn').click(); });
  ok(await until(async () => /내보냈/.test((await S(victim)).msg), 6000), '내보내기 → 당사자 화면에 안내');
  ok(await until(async () => (await S(H)).n === 7, 4000), '내보낸 뒤 7명');
  await sleep(3000);
  ok((await S(H)).n === 7, '내보낸 사람은 다시 자동 입장하지 않음');
  pages.pop(); await victim.context().close();
  // host closes the tab in the lobby
  await H.context().close(); pages.shift();
  ok(await until(async () => (await S(pages[0])).host, 15000), '대기방에서 방장이 나가면 다음 사람이 방장');
  ok(await until(async () => (await S(pages[0])).n === 6, 16000), '나간 방장은 명단에서 빠짐 (6명)');
  ok(await until(async () => new Set((await Promise.all(pages.map(S))).map(s => s.players)).size === 1, 6000), '모두 같은 명단');
  // new host starts a 3:3 game
  await until(async () => pages[0].evaluate(() => __pg.ON.link.canStart()), 3000);
  await pages[0].click('#lobbyStart');
  ok(await until(async () => (await Promise.all(pages.map(S))).every(s => s.screen === 'game'), 10000), '새 방장이 시작 → 6명 게임 시작');
  // one tab goes to the background (hidden): it must keep up
  const bg = pages[3];
  await bg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const acted = {}; const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const st = await Promise.all(pages.map(S));
    if (Math.min(...st.map(s => s.turn)) >= 8) break;
    for (let i = 0; i < pages.length; i++) if (st[i].active && !acted[st[i].turn]) {
      acted[st[i].turn] = 1; const P = pages[i];
      await P.keyboard.down('ArrowRight'); await sleep(300); await P.keyboard.up('ArrowRight');
      await P.keyboard.down('Space'); await sleep(600 + Math.random() * 700); await P.keyboard.up('Space');
    }
    await sleep(200);
  }
  const st = await Promise.all(pages.map(S));
  let bad = 0, common = 0;
  for (const tn of Object.keys(st[0].hashes)) { const hs = st.map(s => s.hashes[tn]); if (hs.every(h => h !== undefined)) { common++; if (new Set(hs).size > 1) bad++; } }
  ok(common >= 8 && bad === 0, `6명 게임 ${common}턴, 해시 불일치 ${bad} (숨겨진 탭 포함)`);
  await pages[0].screenshot({ path: SP + 'm4b_game.png' });
  ok(errors.length === 0, '페이지 오류 없음' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
