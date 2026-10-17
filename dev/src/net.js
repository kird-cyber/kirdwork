// ============================================================== ROOM PROTOCOL (no DOM)
// One room = one topic tree on the relay broker:  kwpg/v1/<CODE>/
//   room        retained · lobby/game state, written only by the host (ver increases on every change)
//   p/<id>      retained · presence {id,nick,on}; the broker writes {on:0} itself if a device drops (last will)
//   req         player -> host requests (join / team / tank / leave)
//   cmd         host -> players (kick / resync)
//   g/<gid>/in    TurnInputs (first one per turn number wins — the broker gives every device the same order)
//   g/<gid>/log   retained · every accepted TurnInput so far (late joiners and reconnects rebuild from it)
//   g/<gid>/live  the active player's partial turn (moves so far, aim, power) for spectators
//   g/<gid>/hash  per-turn state hash from each device; the host compares
const NET_PREFIX = 'kwpg/v1/';
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode(n) { let s = ''; for (let i = 0; i < (n || 5); i++) s += CODE_ABC[(Math.random() * CODE_ABC.length) | 0]; return s; }
function genId() { return genCode(10).toLowerCase(); }
function teamCount(room, team) { return room.players.filter(p => p.team === team).length; }

// o: { code, url, myId, nick, tank, create, onChange, onStatus(kind, text), onGame(game), onInput(inp), onLive(live), onLog(log), onCmd(cmd), onKicked }
function createRoomLink(o) {
  const base = NET_PREFIX + o.code + '/';
  const r = {
    code: o.code, myId: o.myId, nick: o.nick, room: null, presence: {}, log: [], gid: null,
    status: 'connecting', mq: null, closed: false, joinSent: 0, kicked: false, hostWatch: 0, dropTimers: {}, hashes: {},
  };
  const cb = (name, ...a) => { if (o[name]) { try { o[name](...a); } catch (e) { console.error(e); } } };
  r.isHost = () => !!(r.room && r.room.host === r.myId);
  r.me = () => r.room && r.room.players.find(p => p.id === r.myId);
  r.online = id => !!(r.presence[id] && r.presence[id].on);

  // QoS 1 (confirmed by the broker) for everything except the high-rate cosmetic feed
  function pub(sub, obj, retain, qos) { return r.mq && r.mq.publish(base + sub, obj === null ? '' : JSON.stringify(obj), retain, qos === undefined ? 1 : qos); }
  function publishRoom() { r.room.ver++; r.room.t = Date.now(); pub('room', r.room, true); cb('onChange', r.room); }
  r.publishRoom = publishRoom;

  async function connect() {
    if (r.closed) return;
    setStatus('connecting');
    const mq = createMqtt(o.url, {
      clientId: 'pg' + r.myId + Math.floor(Math.random() * 1e6), keepalive: 90,
      will: { topic: base + 'p/' + r.myId, payload: JSON.stringify({ id: r.myId, nick: r.nick, on: 0 }), retain: true },
    });
    r.mq = mq;
    mq.onMessage = onMessage;
    mq.onClose = () => { if (r.closed) return; setStatus('reconnecting'); setTimeout(connect, 1500); };
    try { await mq.ready; } catch (e) {
      if (r.closed) return;
      if (r.status === 'connecting' && !r.everConnected) { setStatus('failed'); return; }
      setStatus('reconnecting'); setTimeout(connect, 2500); return;
    }
    const again = r.everConnected;
    r.everConnected = true;
    mq.subscribe(base + '#');
    // back after a drop: inputs sent meanwhile were missed, ask the others for their logs
    if (again && r.gid) setTimeout(() => { pub('cmd', { type: 'logreq', gid: r.gid, from: r.myId }); setTimeout(flushOutbox, 700); }, 300);
    pub('p/' + r.myId, { id: r.myId, nick: r.nick, on: 1 }, true);
    if (o.create && !r.room) {
      r.room = { ver: 0, host: r.myId, map: 'temple', state: 'lobby', game: null, players: [{ id: r.myId, nick: r.nick, team: 'red', tank: o.tank }] };
      publishRoom();
    }
    setStatus('online');
    // no room on this code after a few seconds = wrong or expired link
    if (!r.room) setTimeout(() => { if (!r.room && !r.closed) cb('onStatus', 'noroom'); }, 5000);
    else maybeJoin();
  }
  function setStatus(s) { r.status = s; cb('onStatus', s); }

  function onMessage(topic, payload) {
    if (!topic.startsWith(base)) return;
    const sub = topic.slice(base.length);
    let msg = null;
    if (payload) { try { msg = JSON.parse(payload); } catch (e) { return; } }
    if (sub === 'room') return msg && onRoom(msg);
    if (sub.startsWith('p/')) return onPresence(sub.slice(2), msg);
    if (sub === 'req') return msg && r.isHost() && onReq(msg);
    if (sub === 'cmd') {
      if (!msg) return;
      if (msg.type === 'kick' && msg.id === r.myId) { r.kicked = true; cb('onKicked'); return; }
      if (msg.type === 'logreq') { if (msg.gid === r.gid && msg.from !== r.myId && r.log.length) pub('g/' + r.gid + '/logx', r.log); return; }
      if (msg.type === 'need') { if (msg.gid === r.gid && msg.from !== r.myId) answerNeed(msg.turnNo); return; }
      return cb('onCmd', msg);
    }
    const g = sub.match(/^g\/([a-z0-9]+)\/(in|log|logx|live|hash)$/);
    if (g && msg && g[1] === r.gid) {
      if (g[2] === 'in') acceptInput(msg);
      else if (g[2] === 'log' || g[2] === 'logx') { if (Array.isArray(msg)) for (const x of msg) if (x) r.seenAt[x.turnNo] = Date.now(); mergeLog(msg); }
      else if (g[2] === 'live') { if (msg.from !== r.myId) cb('onLive', msg); }
      else if (g[2] === 'hash') onHash(msg);
    }
  }

  function onRoom(msg) {
    const cur = r.room;
    if (cur && (msg.ver < cur.ver || (msg.ver === cur.ver && msg.host >= cur.host && msg.host !== cur.host))) return;
    if (cur && msg.ver === cur.ver && msg.host === cur.host && msg.t === cur.t) return;
    const prevGid = cur && cur.game ? cur.game.gid : null;
    // late = we did not see this game start (page reload / joined mid-game): the device must catch up from the log first
    const late = !cur || cur.state === 'game';
    r.room = msg;
    if (msg.state === 'game' && msg.game && msg.game.gid !== prevGid) {
      r.gid = msg.game.gid; r.log = []; r.hashes = {};
      cb('onGame', msg.game, late);
    }
    if (msg.state === 'lobby') r.gid = null;
    cb('onChange', msg);
    maybeJoin();
    watchHost();
  }
  function maybeJoin() {
    if (!r.room || r.kicked || r.room.state !== 'lobby' || r.me()) return;
    if (Date.now() - r.joinSent < 2500) return;
    r.joinSent = Date.now();
    pub('req', { type: 'join', id: r.myId, nick: r.nick, tank: o.tank });
    setTimeout(maybeJoin, 2600);
  }

  function onPresence(id, msg) {
    if (!msg) delete r.presence[id]; else r.presence[id] = msg;
    cb('onChange', r.room);
    if (!r.room) return;
    watchHost();
    if (!r.isHost()) return;
    // host: a lobby player who stays offline for 12 s leaves the room (a page reload comes back well inside that)
    const inRoom = r.room.players.some(p => p.id === id);
    if (inRoom && id !== r.myId && !r.online(id) && r.room.state === 'lobby') {
      clearTimeout(r.dropTimers[id]);
      r.dropTimers[id] = setTimeout(() => {
        if (r.isHost() && !r.online(id) && r.room.state === 'lobby' && r.room.players.some(p => p.id === id)) {
          r.room.players = r.room.players.filter(p => p.id !== id); publishRoom();
        }
      }, 12000);
    }
  }
  // host migration: the host has been offline for 6 s -> the first online player in join order takes over
  function watchHost() {
    if (!r.room || r.isHost()) return;
    const h = r.room.host;
    if (r.online(h)) { clearTimeout(r.hostWatch); r.hostWatch = 0; return; }
    if (r.hostWatch) return;
    r.hostWatch = setTimeout(() => {
      r.hostWatch = 0;
      if (!r.room || r.online(r.room.host) || r.closed) return;
      const next = r.room.players.find(p => p.id !== r.room.host && (r.online(p.id) || p.id === r.myId));
      if (next && next.id === r.myId) {
        r.room.host = r.myId;
        if (r.room.state === 'lobby') r.room.players = r.room.players.filter(p => r.online(p.id) || p.id === r.myId);
        publishRoom();
        cb('onStatus', 'host');
      } else if (!next && !r.me()) {
        // an old link: everybody is gone. Reopen the room with just me.
        r.room = { ver: r.room.ver, host: r.myId, map: r.room.map || 'temple', state: 'lobby', game: null, players: [{ id: r.myId, nick: r.nick, team: 'red', tank: o.tank }] };
        r.gid = null;
        publishRoom();
        cb('onStatus', 'host');
      } else watchHost();
    }, 6000);
  }

  // ---- host: lobby requests
  function onReq(q) {
    const room = r.room; if (!room) return;
    const p = room.players.find(x => x.id === q.id);
    if (q.type === 'join') {
      if (p) { if (p.nick !== q.nick) { p.nick = q.nick; publishRoom(); } return; }
      if (room.state !== 'lobby' || r.banned[q.id]) return;
      if (room.players.length >= CONFIG.turn.maxPlayers) { pub('cmd', { type: 'full', id: q.id }); return; }
      const team = teamCount(room, 'red') <= teamCount(room, 'blue') ? 'red' : 'blue';
      room.players.push({ id: q.id, nick: String(q.nick || '').slice(0, 8) || '손님', team, tank: CONFIG.tanks[q.tank] ? q.tank : 'rookie' });
      publishRoom();
    } else if (!p || room.state !== 'lobby') return;
    else if (q.type === 'team') { if (r.setTeam(q.id, q.team, true)) publishRoom(); }
    else if (q.type === 'tank') { if (CONFIG.tanks[q.tank]) { p.tank = q.tank; publishRoom(); } }
    else if (q.type === 'leave') { room.players = room.players.filter(x => x.id !== q.id); publishRoom(); }
  }
  r.setTeam = function (id, team, noPublish) {
    const p = r.room.players.find(x => x.id === id);
    if (!p || (team !== 'red' && team !== 'blue') || p.team === team || teamCount(r.room, team) >= CONFIG.turn.teamMax) return false;
    p.team = team; if (!noPublish) publishRoom(); return true;
  };

  // ---- player actions (host applies directly, others ask)
  r.requestTeam = team => { if (r.isHost()) return r.setTeam(r.myId, team); pub('req', { type: 'team', id: r.myId, team }); };
  r.requestTank = tank => { o.tank = tank; if (r.isHost()) { const p = r.me(); if (p) { p.tank = tank; publishRoom(); } return; } pub('req', { type: 'tank', id: r.myId, tank }); };
  r.setMap = map => { if (r.isHost() && CONFIG.maps[map]) { r.room.map = map; publishRoom(); } };
  r.moveOther = (id, team) => r.isHost() && r.setTeam(id, team);
  r.banned = {};
  r.kick = id => { if (!r.isHost() || id === r.myId) return; r.banned[id] = 1; pub('cmd', { type: 'kick', id }); r.room.players = r.room.players.filter(p => p.id !== id); publishRoom(); };
  r.canStart = () => r.isHost() && r.room.state === 'lobby' && teamCount(r.room, 'red') > 0 && teamCount(r.room, 'blue') > 0;
  r.start = function () {
    if (!r.canStart()) return false;
    const old = r.room.game;
    if (old) pub('g/' + old.gid + '/log', null, true); // clear the previous game's retained log
    r.room.game = {
      gid: genId(), seed: (Math.random() * 4294967296) >>> 0, mapId: r.room.map, at: Date.now(),
      players: r.room.players.map(p => ({ id: p.id, nick: p.nick, team: p.team, tankId: p.tank })),
    };
    r.room.state = 'game';
    r.gid = r.room.game.gid; r.log = []; r.hashes = {}; r.myHash = {};
    publishRoom();
    cb('onGame', r.room.game, false); // our own echo is ignored, so start locally
    return true;
  };
  r.backToLobby = function () {
    if (!r.isHost() || r.room.state !== 'game') return;
    r.room.state = 'lobby';
    r.room.players = r.room.players.filter(p => r.online(p.id) || p.id === r.myId);
    publishRoom();
  };
  r.leave = function () {
    if (r.mq && r.mq.connected) {
      if (r.room && r.room.state === 'lobby' && r.me()) {
        if (r.isHost()) {
          // hand the room to the next player right away
          const next = r.room.players.find(p => p.id !== r.myId && r.online(p.id));
          r.room.players = r.room.players.filter(p => p.id !== r.myId);
          if (next) { r.room.host = next.id; publishRoom(); }
          else pub('room', null, true); // last one out: remove the room from the broker
        } else pub('req', { type: 'leave', id: r.myId });
      }
      pub('p/' + r.myId, null, true);
    }
    r.closed = true;
    setTimeout(() => r.mq && r.mq.close(), 150);
  };

  // ---- game traffic
  function acceptInput(inp) {
    if (typeof inp.turnNo !== 'number') return;
    if (r.log.some(x => x.turnNo === inp.turnNo)) return;
    r.log.push(inp);
    if (r.log.length > 1 && r.log[r.log.length - 2].turnNo > inp.turnNo) r.log.sort((a, b) => a.turnNo - b.turnNo);
    if (r.isHost()) pub('g/' + r.gid + '/log', r.log, true);
    cb('onInput', inp);
  }
  // fill gaps from another device's log (every device saw the same broker order, so entries agree)
  function mergeLog(list) {
    if (!Array.isArray(list)) return;
    const have = {}; for (const x of r.log) have[x.turnNo] = 1;
    let added = 0;
    for (const x of list) if (x && typeof x.turnNo === 'number' && !have[x.turnNo]) { r.log.push(x); have[x.turnNo] = 1; added++; }
    if (!added) return;
    r.log.sort((a, b) => a.turnNo - b.turnNo);
    if (r.isHost()) pub('g/' + r.gid + '/log', r.log, true);
    cb('onLog', r.log);
  }
  // inputs survive a short drop: kept until they show up in the log, resent after reconnecting
  r.outbox = [];
  r.sendInput = inp => { r.outbox.push({ gid: r.gid, inp }); pub('g/' + r.gid + '/in', inp); };
  function flushOutbox() {
    r.outbox = r.outbox.filter(o => o.gid === r.gid && !r.log.some(x => x.turnNo === o.inp.turnNo));
    for (const o of r.outbox) pub('g/' + o.gid + '/in', o.inp);
  }
  r.sendLive = live => pub('g/' + r.gid + '/live', Object.assign({ from: r.myId }, live), false, 0);
  r.sendHash = (turnNo, h) => pub('g/' + r.gid + '/hash', { id: r.myId, turnNo, h }, false, 0);
  // stall recovery: a device stuck waiting for a turn asks; whoever has it answers (one answer is enough)
  r.seenAt = {};
  r.requestTurn = turnNo => pub('cmd', { type: 'need', gid: r.gid, turnNo, from: r.myId });
  function answerNeed(turnNo) {
    const have = r.log.filter(x => x.turnNo >= turnNo);
    for (const o of r.outbox || []) if (o.gid === r.gid && o.inp.turnNo >= turnNo && !have.some(x => x.turnNo === o.inp.turnNo)) have.push(o.inp);
    have.sort((a, b) => a.turnNo - b.turnNo);
    if (!have.length) return;
    const asked = Date.now(), wait = r.isHost() ? 0 : 150 + Math.random() * 400;
    setTimeout(() => { if ((r.seenAt[turnNo] || 0) < asked) pub('g/' + r.gid + '/logx', have); }, wait);
  }
  r.myHash = {};
  function onHash(msg) {
    if (!r.isHost() || msg.id === r.myId) return;
    const mine = r.myHash[msg.turnNo];
    if (mine !== undefined && mine !== msg.h) pub('cmd', { type: 'resync', id: msg.id, turnNo: msg.turnNo });
    else if (mine === undefined) (r.hashes[msg.turnNo] = r.hashes[msg.turnNo] || []).push(msg);
  }
  r.noteMyHash = function (turnNo, h) {
    r.myHash[turnNo] = h;
    if (!r.isHost()) return;
    for (const msg of r.hashes[turnNo] || []) if (msg.h !== h) pub('cmd', { type: 'resync', id: msg.id, turnNo });
    delete r.hashes[turnNo];
  };
  r.resetGame = function () { r.log = []; r.myHash = {}; r.hashes = {}; };

  window.addEventListener('pagehide', () => { if (!r.closed && r.mq && r.mq.connected) pub('p/' + r.myId, { id: r.myId, nick: r.nick, on: 0 }, true); });
  Promise.resolve().then(connect); // callers get the object before the first callback fires
  return r;
}
