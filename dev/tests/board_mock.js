// Runs leaderboard/Code.gs under a tiny fake of Google Sheets / Apps Script, so the record server can be tested here.
// require: const B = require('./board_mock')(); B.get({...}); B.post({...})   ·   node tests/board_mock.js 8790  -> HTTP server
const fs = require('fs'), path = require('path'), vm = require('vm'), http = require('http');
module.exports = function makeBoard() {
  const sheets = {};
  // Sheets-like value parsing: 'text stays text, dates and numbers get converted
  const parse = v => {
    if (typeof v !== 'string') return v;
    if (v.startsWith("'")) return v.slice(1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + 'T00:00:00+09:00');
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  };
  const mkSheet = () => { const rows = []; return { rows, appendRow: r => rows.push(r.map(parse)), getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getLastColumn: () => rows.reduce((a, r) => Math.max(a, r.length), 0),
    getRange: (r0, c0, nr, nc) => ({ setValues: v => { v.forEach((row, i) => { const t = rows[r0 - 1 + i] || (rows[r0 - 1 + i] = []); row.forEach((x, j) => { t[c0 - 1 + j] = parse(x); }); }); } }) }; };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = mkSheet()) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ content: s, setMimeType() { return this; } }) },
    Utilities: { formatDate: (d, tz, f) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10) },
    Date, JSON, Math, String, Number, Object, Array,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../leaderboard/Code.gs'), 'utf8'), ctx);
  return {
    sheets,
    get: p => JSON.parse(ctx.doGet({ parameter: p }).content),
    post: b => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).content),
    raw: (method, q, body) => method === 'POST' ? ctx.doPost({ postData: { contents: body } }).content : ctx.doGet({ parameter: q }).content,
  };
};
if (require.main === module) {
  const B = module.exports(), port = +(process.argv[2] || 8790);
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), head = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS') { res.writeHead(204, head); return res.end(); }
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      const q = Object.fromEntries(u.searchParams);
      if (q.action === 'dump') { res.writeHead(200, head); return res.end(JSON.stringify((B.sheets['기록'] || { rows: [] }).rows)); } // mock only: raw rows for tests
      res.writeHead(200, head); res.end(B.raw(req.method, q, body));
    });
  }).listen(port, '127.0.0.1', () => console.log('board mock on', port));
}
