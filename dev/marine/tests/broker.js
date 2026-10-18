// Local test broker: a real Mosquitto (TCP) behind a tiny WebSocket bridge, so browsers talk MQTT-over-WS like on the public brokers.
// run: NODE_PATH=/opt/npm-tools/node_modules node tests/broker.js [wsPort] [tcpPort]
const { spawn } = require('child_process'), net = require('net'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const WS_PORT = +(process.argv[2] || 9001), TCP_PORT = +(process.argv[3] || 18830);
const MOSQ = process.env.MOSQ || '/tmp/claude-0/mosq/src/mosquitto';
const conf = path.join(require('os').tmpdir(), `mosq-${TCP_PORT}.conf`);
fs.writeFileSync(conf, `listener ${TCP_PORT} 127.0.0.1\nallow_anonymous true\npersistence false\nmax_keepalive 300\n`);
const broker = spawn(MOSQ, ['-c', conf], { stdio: ['ignore', 'ignore', 'pipe'] });
broker.stderr.on('data', d => { if (process.env.MQTT_LOG) process.stderr.write(d); });
process.on('exit', () => broker.kill());
['SIGINT', 'SIGTERM'].forEach(s => process.on(s, () => process.exit(0)));
const wss = new WebSocketServer({ port: WS_PORT, handleProtocols: p => (p.has('mqtt') ? 'mqtt' : false) });
let n = 0;
wss.on('connection', ws => {
  n++;
  const sock = net.connect(TCP_PORT, '127.0.0.1');
  sock.on('data', d => { if (ws.readyState === 1) ws.send(d); });
  ws.on('message', d => sock.write(d));
  // a dropped socket must look like a network failure to Mosquitto so the last will fires
  ws.on('close', () => sock.destroy());
  sock.on('close', () => { try { ws.close(); } catch (e) {} });
  sock.on('error', () => {}); ws.on('error', () => {});
});
setTimeout(() => console.log(`broker ready ws://127.0.0.1:${WS_PORT}`), 400);
