// ============================================================== MQTT 3.1.1 over WebSocket (minimal, no library)
// QoS 0 and 1 (1 = the broker confirms, we resend until it does), retained messages, last will, keep-alive.
// Free public brokers need no signup; every device of one room must use the same broker (its index is in the invite link).
const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];
const ENC = new TextEncoder(), DEC = new TextDecoder();

function mqttStr(s) { const b = ENC.encode(s); const o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
function mqttLen(n) { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; }
function mqttPacket(head, parts) {
  let len = 0; for (const p of parts) len += p.length;
  const lb = mqttLen(len), o = new Uint8Array(1 + lb.length + len);
  o[0] = head; o.set(lb, 1); let at = 1 + lb.length;
  for (const p of parts) { o.set(p, at); at += p.length; }
  return o;
}

// opts: { clientId, keepalive (s), will: { topic, payload, retain } }
// returns { ready: Promise, publish(topic, string, retain), subscribe(filter), close(), onMessage, onClose, connected }
function createMqtt(url, opts) {
  const c = { connected: false, onMessage: null, onClose: null };
  let ws, buf = new Uint8Array(0), pid = 1, pingTimer = 0, closed = false, lastRx = Date.now();
  const inflight = new Map(); // packet id -> { pkt, at, tries } for QoS 1 publishes awaiting PUBACK
  const nextId = () => { pid = (pid % 65535) + 1; return pid; };
  const keepalive = opts.keepalive || 60;
  c.ready = new Promise((resolve, reject) => {
    let settled = false;
    const fail = e => { if (!settled) { settled = true; reject(e); } };
    const to = setTimeout(() => { fail(new Error('timeout')); try { ws.close(); } catch (e) {} }, opts.timeoutMs || 6000);
    if (typeof window !== 'undefined' && window.__pgBlockNet > Date.now()) { clearTimeout(to); setTimeout(() => fail(new Error('blocked')), 50); return; } // test hook
    try { ws = new WebSocket(url, ['mqtt']); } catch (e) { clearTimeout(to); fail(e); return; }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      const w = opts.will;
      let flags = 0x02; // clean session
      const payload = [mqttStr(opts.clientId)];
      if (w) { flags |= 0x04 | (w.retain ? 0x20 : 0); payload.push(mqttStr(w.topic), mqttStr(w.payload)); }
      const vh = new Uint8Array([0, 4, 77, 81, 84, 84, 4, flags, keepalive >> 8, keepalive & 255]);
      ws.send(mqttPacket(0x10, [vh, ...payload]));
    };
    ws.onmessage = ev => {
      lastRx = Date.now();
      const d = new Uint8Array(ev.data), nb = new Uint8Array(buf.length + d.length); nb.set(buf); nb.set(d, buf.length); buf = nb;
      for (;;) {
        if (buf.length < 2) break;
        let mul = 1, len = 0, i = 1, b;
        do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
        if (buf.length < i + len) break;
        const type = buf[0] >> 4, flags = buf[0] & 15, body = buf.subarray(i, i + len);
        buf = buf.slice(i + len);
        if (type === 2) { // CONNACK
          clearTimeout(to);
          if (body[1] === 0) { c.connected = true; settled = true; resolve(c); pingTimer = setInterval(ping, Math.min(30, keepalive / 2) * 1000); }
          else fail(new Error('refused ' + body[1]));
        } else if (type === 3) { // PUBLISH
          const tl = (body[0] << 8) | body[1], topic = DEC.decode(body.subarray(2, 2 + tl));
          const qos = (flags >> 1) & 3, start = 2 + tl + (qos ? 2 : 0);
          if (qos === 1) ws.send(new Uint8Array([0x40, 2, body[2 + tl], body[3 + tl]])); // PUBACK
          if (typeof window !== 'undefined' && window.__pgLoss && Math.random() < window.__pgLoss) continue; // test hook: simulated message loss
          if (c.onMessage) { try { c.onMessage(topic, DEC.decode(body.subarray(start)), !!(flags & 1)); } catch (e) { console.error(e); } }
        }
        else if (type === 4) inflight.delete((body[0] << 8) | body[1]); // PUBACK
        // SUBACK (9) and PINGRESP (13) need no handling
      }
    };
    ws.onerror = () => fail(new Error('socket error'));
    ws.onclose = () => { clearTimeout(to); clearInterval(pingTimer); clearInterval(c._resendTimer); c._resendTimer = 0; const was = c.connected; c.connected = false; fail(new Error('closed')); if (was && !closed && c.onClose) c.onClose(); };
  });
  function ping() {
    if (!c.connected) return;
    if (Date.now() - lastRx > (keepalive * 1.5 + 10) * 1000) { try { ws.close(); } catch (e) {} return; }
    ws.send(new Uint8Array([0xC0, 0]));
    resend();
  }
  function resend() {
    const now = Date.now();
    for (const [id, f] of inflight) {
      if (now - f.at < 2500) continue;
      if (f.tries >= 6) { inflight.delete(id); continue; }
      f.pkt[0] |= 0x08; f.at = now; f.tries++; // DUP flag
      try { ws.send(f.pkt); } catch (e) {}
    }
  }
  c.publish = function (topic, payload, retain, qos) {
    if (!c.connected) return false;
    if (qos === 1) {
      const id = nextId(), pkt = mqttPacket(0x32 | (retain ? 1 : 0), [mqttStr(topic), new Uint8Array([id >> 8, id & 255]), ENC.encode(payload)]);
      inflight.set(id, { pkt, at: Date.now(), tries: 0 });
      if (!c._resendTimer) c._resendTimer = setInterval(() => c.connected && resend(), 1000);
      ws.send(pkt);
      return true;
    }
    ws.send(mqttPacket(0x30 | (retain ? 1 : 0), [mqttStr(topic), ENC.encode(payload)]));
    return true;
  };
  c.subscribe = function (filter) {
    if (!c.connected) return false;
    const id = nextId();
    ws.send(mqttPacket(0x82, [new Uint8Array([id >> 8, id & 255]), mqttStr(filter), new Uint8Array([1])])); // up to QoS 1
    return true;
  };
  c._drop = function () { try { ws.close(); } catch (e) {} }; // test hook: behaves like a network drop
  c.close = function () {
    closed = true; clearInterval(pingTimer); clearInterval(c._resendTimer);
    if (c.connected) { try { ws.send(new Uint8Array([0xE0, 0])); } catch (e) {} }
    c.connected = false; try { ws.close(); } catch (e) {}
  };
  return c;
}
