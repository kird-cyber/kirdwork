// online test (배틀서브): real Mosquitto broker + several separate browsers.
// needs: node tests/broker.js 9001  and  (cd dist && python3 -m http.server 8766)
// run:   NODE_PATH=/opt/npm-tools/node_modules node tests/online.js [players=4]
const { chromium } = require('playwright');
const fs = require('fs');
const N = +(process.argv[2] || 4);
const BASE = 'http://127.0.0.1:8766/index.html?broker=' + encodeURIComponent('ws://127.0.0.1:9001');
const SP = process.env.SP || __dirname + '/out/';
let pass = 0, fail = 0;
const ok = (c, s) => { console.log((c ? 'PASS ' : 'FAIL ') + s); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, step = 150) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch (e) {} await sleep(step); } return false; }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] }).catch(() => chromium.launch());
  const errors = [];
  const pages = [];
  async function open(url, nick) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 760 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(nick + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(nick + ' console: ' + m.text()); });
    await p.goto(url);
    await p.waitForFunction(() => window.__pg && document.getElementById('nickIn'), null, { timeout: 15000 });
    await p.fill('#nickIn', nick);
    p.nick = nick;
    return p;
  }
  const S = p => p.evaluate(() => { const L = __pg.ON.link, m = __pg.match; return { screen: __pg.screen, host: L && L.isHost(), players: L && L.room ? L.room.players.map(x => x.nick + ':' + x.team + ':' + x.tank).join(',') : '', state: L && L.room && L.room.state, turn: m && m.turnNo, phase: m && m.phase, active: !!(__pg.ctrl && __pg.ctrl.activeLocal && __pg.ctrl.activeLocal()), hashes: m ? m.hashes : {}, over: m && m.phase === 'over', winner: m && m.winner }; });

  // ---- 1. host creates a room
  const A = await open(BASE, '방장');
  await A.click('#createBtn');
  ok(await until(async () => (await S(A)).screen === 'lobby', 8000), '방 만들기 → 대기방 표시');
  const link = await A.inputValue('#shareLink');
  ok(/#r=[A-Z0-9]{5}&b=0/.test(link), '초대 링크 생성: ' + link.replace(/.*#/, '#'));
  await A.screenshot({ path: SP + 'm4_lobby_host.png' });
  pages.push(A);

  // ---- 2. friends join by link
  const names = ['민수', '지영', '철수', '영희', '동현', '수아', '준호'];
  for (let i = 1; i < N; i++) {
    const P = await open(link, names[i - 1]);
    ok(await P.isVisible('#joinBtn'), `${P.nick}: 초대 링크로 열면 참여하기 버튼`);
    await P.click('#joinBtn');
    pages.push(P);
  }
  ok(await until(async () => { const s = await S(A); return s.players.split(',').length === N; }, 10000), `방장 화면에 ${N}명 모두 표시`);
  const sync = async () => (await Promise.all(pages.map(S))).map(s => s.players);
  ok(await until(async () => new Set(await sync()).size === 1, 5000), '모든 기기의 대기방 명단이 같음');
  console.log('   명단:', (await S(A)).players);

  // ---- 3. tank, team, map
  const B = pages[1];
  await B.click('#myPicks .pick:nth-child(3)'); // 오하이오
  ok(await until(async () => (await S(A)).players.includes('민수:') && (await S(A)).players.split(',').find(x => x.startsWith('민수:')).endsWith(':ohio'), 5000), '참가자가 잠수함을 고르면 방장 화면에 반영');
  if (N < 8) { // with 4 v 4 both teams are full, so team moves are (correctly) disabled
  // a player moves himself to the other team
  const bTeam0 = (await S(A)).players.split(',').find(x => x.startsWith('민수:')).split(':')[1];
  await B.click('.pc.me .mini');
  ok(await until(async () => (await S(A)).players.split(',').find(x => x.startsWith('민수:')).split(':')[1] !== bTeam0, 5000), '참가자가 직접 팀 이동 (←→)');
  // host moves someone else
  if (N >= 3) {
    const tgt = pages[2].nick, before = (await S(A)).players.split(',').find(x => x.startsWith(tgt + ':')).split(':')[1];
    await A.evaluate(n => { const cards = [...document.querySelectorAll('.pc')].filter(c => c.querySelector('b') && c.querySelector('b').textContent === n); cards[0].querySelector('.mini').click(); }, tgt);
    ok(await until(async () => (await S(pages[2])).players.split(',').find(x => x.startsWith(tgt + ':')).split(':')[1] !== before, 5000), '방장이 다른 사람 팀 이동');
  }
  } else ok(await B.evaluate(() => document.querySelector('.pc.me .mini').disabled), '양 팀이 꽉 차면 팀 이동 버튼 비활성');
  // non-host cannot pick the map
  ok(await B.evaluate(() => [...document.querySelectorAll('#lobbyMaps .mapc')].filter(b => !b.disabled).length === 1), '방장 아닌 사람은 맵 변경 불가');
  ok(await B.isHidden('#lobbyStart'), '방장 아닌 사람에겐 시작 버튼 없음');
  await A.click('#lobbyMaps .mapc:nth-child(2)'); // 해저 동굴
  ok(await until(async () => B.evaluate(() => __pg.ON.link.room.map === 'cave'), 4000), '방장이 맵 변경 → 모두에게 반영');
  // make the teams 2:2-ish and valid
  await until(async () => A.evaluate(() => __pg.ON.link.canStart()), 3000);
  await B.screenshot({ path: SP + 'm4_lobby_guest.png' });
  await A.screenshot({ path: SP + 'm4_lobby_host2.png' });

  // one guest picks "?" random
  await pages[N - 1].click('#myPicks .pick.rnd');
  ok(await until(async () => (await S(A)).players.split(',').find(x => x.startsWith(pages[N - 1].nick + ':')).endsWith(':random'), 5000), '참가자가 ? 랜덤을 고르면 방장 화면에 반영');
  // ---- 4. start
  await A.click('#lobbyStart');
  const started = await until(async () => (await Promise.all(pages.map(S))).every(s => s.screen === 'game' && s.phase), 10000);
  ok(started, '시작 → 모든 기기가 게임 화면');
  if (!started) { console.log(JSON.stringify((await Promise.all(pages.map(S))).map(s => [s.screen, s.state, s.players, s.phase])), errors); process.exit(1); }
  const seeds = await Promise.all(pages.map(p => p.evaluate(() => __pg.match.seed + ':' + __pg.match.subs.map(t => t.nick + '/' + t.subId + '@' + Math.round(t.x)).join(','))));
  ok(new Set(seeds).size === 1, '모든 기기의 전장 배치가 같음');
  console.log('   배치:', seeds[0]);
  const rnick = pages[N - 1].nick, rsub = seeds[0].split(',').find(x => x.includes(rnick + '/')).split('/')[1].split('@')[0];
  ok(rsub !== 'random' && !!rsub, `랜덤 잠수함이 모든 기기에서 같은 잠수함으로 정해짐 (${rnick} → ${rsub})`);

  // ---- 5. play turns: whoever is active plays a little turn with keys
  async function playTurns(n, plist, label) {
    const startTurn = Math.max(...(await Promise.all(plist.map(S))).map(s => s.turn || 0));
    const acted = {};
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      const st = await Promise.all(plist.map(S));
      const minTurn = Math.min(...st.map(s => s.turn));
      if (minTurn >= startTurn + n || st.some(s => s.over)) break;
      for (let i = 0; i < plist.length; i++) {
        const s = st[i], P = plist[i];
        if (s.active && !acted[s.turn]) {
          acted[s.turn] = true;
          const dir = Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight';
          await P.keyboard.down(dir); await sleep(250 + Math.random() * 400); await P.keyboard.up(dir);
          await P.keyboard.down('ArrowUp'); await sleep(150); await P.keyboard.up('ArrowUp');
          if (Math.random() < 0.3) await P.keyboard.press('Digit2');
          await P.keyboard.down('Space'); await sleep(500 + Math.random() * 900); await P.keyboard.up('Space');
        }
      }
      await sleep(200);
    }
    const st = await Promise.all(plist.map(S));
    // compare per-turn state hashes across devices
    let bad = 0, common = 0;
    const turns = Object.keys(st[0].hashes);
    for (const tn of turns) { const hs = st.map(s => s.hashes[tn]).filter(h => h !== undefined); if (hs.length === st.length) { common++; if (new Set(hs).size > 1) bad++; } }
    ok(bad === 0 && common >= n, `${label}: ${common}턴 진행, 기기 간 상태 해시 불일치 ${bad}`);
    return st;
  }
  // spectators see the live aim of the active player
  {
    const st = await Promise.all(pages.map(S));
    const ai = st.findIndex(s => s.active);
    if (ai >= 0) {
      const P = pages[ai], O = pages[(ai + 1) % pages.length];
      await P.keyboard.down('ArrowUp'); await sleep(700); await P.keyboard.up('ArrowUp');
      await P.keyboard.down('ArrowRight'); await sleep(600); await P.keyboard.up('ArrowRight');
      await sleep(500);
      // bend the curve on the active screen: nobody else may receive it
      await P.evaluate(() => { const t = __pg.match.subs[__pg.match.cur]; __pg.ctrl.setPoint(1, t.x + 120, t.y - 160); });
      await sleep(900);
      const [a, b] = await Promise.all([P, O].map(x => x.evaluate(() => { const t = __pg.match.subs[__pg.match.cur]; return t.x.toFixed(1) + ',' + t.y.toFixed(1); })));
      ok(a === b, `다른 사람 화면에도 이동이 실시간 반영 (${a} vs ${b})`);
      const leak = await O.evaluate(() => JSON.stringify(__pg.ON.live || {}).includes('pts'));
      ok(!leak, '곡선(조준)은 다른 사람에게 전송되지 않음');
      await P.keyboard.down('Space'); await sleep(600);
      const spec = await O.evaluate(() => ({ pw: document.getElementById('pw').style.width, who: document.getElementById('whoName').textContent, me: __pg.ON.nick }));
      const act = await P.evaluate(() => document.getElementById('pw').style.width);
      ok(spec.pw === '0%' && act !== '0%', `상대가 충전 중일 때 내 게이지는 비어 있음 (내 화면 ${spec.pw}, 쏘는 사람 ${act})`);
      ok(spec.who.startsWith(spec.me), `아래 조작판은 내 잠수함 표시 (${spec.who})`);
      await P.keyboard.up('Space');
      await O.screenshot({ path: SP + 'm4_spectator_view.png' });
      await P.screenshot({ path: SP + 'm4_active_view.png' });
    }
  }
  await playTurns(6, pages, '4명 대전');
  await pages[0].screenshot({ path: SP + 'm4_game_host.png' });

  // ---- 5b. a stray input for the wrong seat (desynced device / bad packet) must not block the real turn
  await A.evaluate(() => { const m = __pg.match, wrong = m.subs.find(t => t.idx !== m.cur); __pg.ON.link.sendInput({ turnNo: m.turnNo, seat: wrong.id, actions: [{ t: 'i', s: 'length' }, { t: 'm', d: 0, n: 1e12 }], pts: [[NaN, 1], [2, 2]], gauge: 'x', weapon: 7, used: {} }); });
  await playTurns(2, pages, '엉뚱한 좌석 입력이 끼어든 뒤');
  // ---- 6. a player reloads mid-game and catches up
  const C = pages[N - 1];
  await C.reload();
  ok(await until(async () => { const s = await S(C); return s.screen === 'game' && s.turn >= 5; }, 15000), '게임 중 새로고침 → 자동 재접속, 진행 중인 게임으로 복귀');
  await sleep(2500);
  await playTurns(3, pages, '재접속 후');

  // ---- 6b. the host's connection drops for a few seconds while the game goes on
  await A.evaluate(() => { window.__pgBlockNet = Date.now() + 3500; __pg.ON.link.mq._drop(); });
  await playTurns(2, pages.slice(1), '방장 연결 끊긴 동안');
  ok(await until(async () => A.evaluate(() => __pg.ON.link.status === 'online'), 15000), '방장 자동 재연결');
  await sleep(1500);
  await playTurns(2, pages, '방장 재연결 후 (빠진 입력 복구)');
  const logs = await Promise.all(pages.map(p => p.evaluate(() => __pg.ON.link.log.map(x => x.turnNo).join(','))));
  ok(new Set(logs).size === 1, '모든 기기의 입력 기록이 같음');

  // ---- 7. a player closes the tab: his turns get skipped by the host
  const D = pages.splice(N - 2, 1)[0];
  const dNick = D.nick;
  await D.context().close();
  await playTurns(4, pages, `${dNick} 나감 → 차례 자동 넘김`);

  // ---- 8. the host leaves: the next player becomes host and the game goes on
  const oldHost = pages.shift();
  await oldHost.context().close();
  ok(await until(async () => (await S(pages[0])).host, 15000), '방장이 나가면 다음 사람이 방장이 됨');
  await playTurns(3, pages, '방장 교체 후');

  // ---- 9. end the game (same change on every device keeps them in sync) and return to the lobby
  // wait until every device sits in the same aim phase (time is frozen there), then change hp everywhere
  await until(async () => { const s = await Promise.all(pages.map(S)); return s.every(x => x.phase === 'aim' && x.turn === s[0].turn); }, 30000, 50);
  // the team that is not playing right now is wiped out on every device; the current shot then ends the game
  await Promise.all(pages.map(p => p.evaluate(() => { const m = __pg.match, cur = m.subs[m.cur].team; for (const t of m.subs) if (t.team !== cur) { t.hp = 0; t.alive = false; } })));
  const st9 = await playTurns(2, pages, '마무리');
  const over = await until(async () => (await Promise.all(pages.map(S))).every(s => s.over), 60000);
  ok(over, '게임 종료가 모든 기기에서 같음: ' + (await S(pages[0])).winner);
  if (over) {
    await sleep(1500);
    await pages[0].screenshot({ path: SP + 'm4_over_host.png' });
    ok(await pages[0].isVisible('#toLobby'), '새 방장에게 대기방으로 버튼');
    if (pages[1]) ok(await pages[1].isVisible('#overWait'), '다른 사람에겐 대기 안내');
    await pages[0].click('#toLobby');
    ok(await until(async () => (await Promise.all(pages.map(S))).every(s => s.screen === 'lobby'), 8000), '모두 대기방으로 돌아옴');
    const pl = (await S(pages[0])).players;
    ok(!pl.includes(dNick + ':') && !pl.includes('방장:'), '나간 사람은 대기방 명단에서 빠짐: ' + pl);
  }

  const realErr = errors.filter(e => !/resync|ERR_TUNNEL|status of 404|fonts\.g/.test(e));
  ok(realErr.length === 0, '페이지 오류 없음' + (realErr.length ? ' — ' + realErr.slice(0, 5).join(' | ') : ''));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
