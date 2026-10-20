// Google Apps Script 서비스 흉내 (시트·캐시·속성·잠금·드라이브) — Code.gs 를 Node 에서 그대로 돌려 보기 위한 것
const vm = require('vm'), fs = require('fs'), crypto = require('crypto');

function makeEnv() {
  const sheets = new Map(); let order = [];
  const calls = { getValues: 0, setValues: 0, lock: 0 };
  function Sheet(name) {
    const d = [];  // 2D
    const maxRows = () => Math.max(1000, d.length);
    const ensure = (r, c) => { while (d.length < r) d.push([]); for (const row of d) while (row.length < c) row.push(''); };
    const width = () => d.reduce((m, r) => Math.max(m, r.length), 0);
    const range = (r, c, nr, nc) => ({
      setValues(v) {
        calls.setValues++;
        if (v.length !== nr || v.some(x => x.length !== nc)) throw new Error('setValues size mismatch');
        ensure(r + nr - 1, c + nc - 1);
        v.forEach((row, i) => row.forEach((x, j) => { d[r - 1 + i][c - 1 + j] = (typeof x === 'string' && x[0] === "'") ? x.slice(1) : x; }));
        return this;
      },
      clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (d[r - 1 + i]) d[r - 1 + i][c - 1 + j] = ''; return this; },
      setFontWeight() { return this; }, setBackground() { return this; }, setNumberFormat() { return this; }
    });
    return {
      name, _d: d,
      getDataRange() { return { getValues() { calls.getValues++; const w = Math.max(1, width()); const n = Math.max(1, sh.getLastRow()); return Array.from({ length: n }, (_, i) => Array.from({ length: w }, (_, j) => (d[i] && d[i][j] !== undefined) ? d[i][j] : '')); } }; },
      getRange: range,
      getLastRow() { for (let i = d.length - 1; i >= 0; i--) if (d[i].some(x => x !== '' && x !== undefined)) return i + 1; return 0; },
      getMaxRows: maxRows, setFrozenRows() {}, setColumnWidth() {}
    };
    var sh;
  }
  function mkSheet(name) { const s = Sheet(name); s.getDataRange = s.getDataRange.bind(s); const real = s; real.getLastRow = real.getLastRow; sheets.set(name, real); order.push(name); return real; }
  // Sheet() 안에서 sh 를 쓰기 위한 작은 우회
  function SheetFixed(name) { const s = mkSheet(name); const gl = s.getLastRow; s.getDataRange = function () { return { getValues() { calls.getValues++; const n = Math.max(1, gl()); const w = Math.max(1, s._d.reduce((m, r) => Math.max(m, r.length), 0)); return Array.from({ length: n }, (_, i) => Array.from({ length: w }, (_, j) => (s._d[i] && s._d[i][j] !== undefined) ? s._d[i][j] : '')); } }; }; return s; }
  const ssObj = {
    getId: () => 'SHEET123',
    getSheetByName: n => sheets.get(n) || null,
    insertSheet: n => SheetFixed(n),
    getSheets: () => order.map(n => sheets.get(n)),
    deleteSheet: s => { sheets.delete(s.name); order = order.filter(n => n !== s.name); }
  };
  SheetFixed('시트1');
  const props = new Map(), cache = new Map(); const drive = [];
  const ctx = {
    console: { log: (...a) => ctx._logs.push(a.join(' ')), error: (...a) => ctx._errors.push(a.join(' ')) }, _logs: [], _errors: [],
    SpreadsheetApp: { getActiveSpreadsheet: () => ssObj, openById: () => ssObj, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => props.set(k, String(v)) }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, getAll: ks => { const o = {}; ks.forEach(k => { if (cache.has(k)) o[k] = cache.get(k); }); return o; }, put: (k, v) => { if (String(v).length > 100000) throw new Error('cache value too big'); cache.set(k, String(v)); }, putAll: o => { for (const k in o) { if (o[k].length > 100000) throw new Error('cache value too big'); cache.set(k, o[k]); } }, remove: k => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => (calls.lock++, true), waitLock: () => { calls.lock++; }, releaseLock() {} }) },
    Utilities: { getUuid: () => crypto.randomUUID(), base64Decode: b => [...Buffer.from(b, 'base64')], newBlob: (bytes, mime, name) => ({ bytes, mime, name }) },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' },
      getFoldersByName: () => { let done = false; return { hasNext: () => !!drive.folder && !done, next: () => { done = true; return drive.folder; } }; },
      createFolder: n => (drive.folder = { name: n, createFile: b => { const f = { id: 'F' + (drive.length + 1), blob: b, sharing: null, getId() { return this.id; }, setSharing(a) { this.sharing = a; } }; drive.push(f); return f; } })
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
    Date, JSON, Math, Number, String, Object, Array, Error, isNaN, parseInt, encodeURIComponent
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  return { ctx, sheets, props, cache, drive, calls };
}
function loadGas(file) {
  const env = makeEnv();
  vm.runInContext(fs.readFileSync(file, 'utf8'), env.ctx, { filename: 'Code.gs' });
  env.post = (action, payload, token) => JSON.parse(env.ctx.doPost({ postData: { contents: JSON.stringify({ action, payload, token }) } }).s);
  return env;
}
module.exports = { loadGas };
