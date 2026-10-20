/* ───────── Google Apps Script 쪽 (시트 = 저장소, 웹 앱 = API) ─────────
 * 이 파일은 core.js 뒤에 붙어 Code.gs 한 파일로 만들어진다 (dev/market/build_gas.py).
 * 설치 순서는 market/apps-script/설치안내.md 참고.
 */
var SHEET_NAMES = { settings: '설정', items: '상품', codes: '참가코드', bids: '입찰', logs: '기록' };
var COLS = {
  items: ['id', 'no', 'name', 'descr', 'photos', 'min_price', 'mode', 'hidden', 'close_at', 'created_at', 'updated_at'],
  codes: ['id', 'hash', 'label', 'active', 'created_at', 'last_at', 'hint', 'code'],
  bids: ['id', 'item_id', 'code_id', 'amount', 'created_at', 'active'],
  logs: ['id', 'at', 'actor', 'action', 'detail']
};
var JSON_COLS = { photos: 1 };
var STR_COLS = { name: 1, descr: 1, mode: 1, hash: 1, label: 1, hint: 1, code: 1, actor: 1, action: 1, detail: 1 };
var PHOTO_FOLDER = 'KIRD 나눔마켓 사진';
var CACHE_KEY = 'mk_snap_v1', CACHE_TTL = 120; // 초. 시트를 손으로 고쳐도 2분 안에 반영된다

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** 시트를 표처럼 쓰는 저장소. 읽기는 캐시 스냅샷, 쓰기는 잠금 안에서 시트를 직접 읽고 고친 줄만 다시 쓴다. */
function SheetStore() {
  var props = PropertiesService.getScriptProperties();
  var T = null, S = null, snapshot = false, writing = false;

  function parseCell(k, v) {
    if (JSON_COLS[k]) { try { return v === '' ? [] : JSON.parse(v); } catch (e) { return []; } }
    if (STR_COLS[k]) return v === null || v === undefined ? '' : String(v);
    if (v === '' || v === null) return 0;
    if (v instanceof Date) return v.getTime();
    var n = Number(v); return isNaN(n) ? v : n;
  }
  function cellOf(k, v) {
    if (JSON_COLS[k]) return JSON.stringify(v || []);
    if (v === undefined || v === null) return '';
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v; // 수식으로 해석되지 않게
    return v;
  }

  // 표는 처음 쓸 때 읽는다. 「기록」은 쌓이기만 하므로 입찰할 때는 읽지 않고 뒤에 붙이기만 한다.
  var SNAP_TABLES = ['items', 'codes', 'bids'];
  function readTable(t) {
    var sh = ss_().getSheetByName(SHEET_NAMES[t]);
    var vals = sh.getDataRange().getValues(), cols = COLS[t], rows = [], seq = 0;
    if (vals[0] && vals[0].filter(function (x) { return x !== ''; }).length < cols.length) { // 새로 생긴 열 제목 채우기 (예: 참가코드.code)
      sh.getRange(1, 1, 1, cols.length).setValues([cols]); sh.getRange(1, cols.length, sh.getMaxRows(), 1).setNumberFormat('@');
    }
    for (var i = 1; i < vals.length; i++) {
      if (vals[i][0] === '' || vals[i][0] === null) continue;
      var o = {}; for (var c = 0; c < cols.length; c++) o[cols[c]] = parseCell(cols[c], vals[i][c]);
      o._r = i + 1; rows.push(o); if (o.id > seq) seq = o.id;
    }
    return { rows: rows, seq: seq, dirty: {}, appends: [], rewrite: false, loaded: true };
  }
  function tb(t) {
    if (!T[t]) T[t] = { rows: [], seq: 0, dirty: {}, appends: [], rewrite: false, loaded: false };
    if (!T[t].loaded && !(t === 'logs' && T[t].appendOnly)) { var keep = T[t].appends; T[t] = readTable(t); keep.forEach(function (r) { T[t].rows.push(r); T[t].appends.push(r); }); }
    return T[t];
  }
  function readSettings() {
    var sv = ss_().getSheetByName(SHEET_NAMES.settings).getDataRange().getValues(); S = {};
    for (var j = 1; j < sv.length; j++) if (sv[j][0] !== '') { try { S[sv[j][0]] = JSON.parse(sv[j][1]); } catch (e) { S[sv[j][0]] = sv[j][1]; } }
    S._secret = props.getProperty('SECRET') || ''; S._pepper = props.getProperty('PEPPER') || '';
    S._dirty = false;
  }
  function loadSheets() { T = {}; readSettings(); }
  function loadSnapshot() {
    var c = CacheService.getScriptCache(), head = c.get(CACHE_KEY);
    if (!head) return false;
    var n = Number(head), keys = []; for (var i = 0; i < n; i++) keys.push(CACHE_KEY + '_' + i);
    var parts = c.getAll(keys), str = '';
    for (var k = 0; k < n; k++) { if (parts[keys[k]] === undefined) return false; str += parts[keys[k]]; }
    var o = JSON.parse(str); T = {};
    SNAP_TABLES.forEach(function (t) { T[t] = { rows: o.t[t], seq: 0, dirty: {}, appends: [], rewrite: false, loaded: true }; });
    S = o.s; S._secret = props.getProperty('SECRET') || ''; S._pepper = props.getProperty('PEPPER') || '';
    return true;
  }
  function saveSnapshot() {
    var o = { t: {}, s: {} };
    SNAP_TABLES.forEach(function (t) { o.t[t] = tb(t).rows.map(function (r) { var x = {}; for (var k in r) if (k !== '_r') x[k] = r[k]; return x; }); });
    for (var k in S) if (k.charAt(0) !== '_') o.s[k] = S[k];
    var str = JSON.stringify(o), size = 90000, put = {}, n = Math.ceil(str.length / size) || 1;
    for (var i = 0; i < n; i++) put[CACHE_KEY + '_' + i] = str.substr(i * size, size);
    var c = CacheService.getScriptCache();
    try { c.putAll(put, CACHE_TTL); c.put(CACHE_KEY, String(n), CACHE_TTL); } catch (e) { c.remove(CACHE_KEY); }
  }
  function flush() {
    var ss = ss_();
    Object.keys(T).forEach(function (t) {
      var tb = T[t], cols = COLS[t], sh = ss.getSheetByName(SHEET_NAMES[t]);
      if (!tb.rewrite && !tb.appends.length && !Object.keys(tb.dirty).length) return;
      var toRow = function (r) { return cols.map(function (k) { return cellOf(k, r[k]); }); };
      if (tb.rewrite) {
        var last = sh.getLastRow(); if (last > 1) sh.getRange(2, 1, last - 1, cols.length).clearContent();
        if (tb.rows.length) sh.getRange(2, 1, tb.rows.length, cols.length).setValues(tb.rows.map(toRow));
        tb.rows.forEach(function (r, i) { r._r = i + 2; });
        return;
      }
      Object.keys(tb.dirty).forEach(function (id) {
        var r = tb.rows.filter(function (x) { return x.id === Number(id); })[0];
        if (r && r._r) sh.getRange(r._r, 1, 1, cols.length).setValues([toRow(r)]);
      });
      if (tb.appends.length) {
        var start = sh.getLastRow() + 1;
        sh.getRange(start, 1, tb.appends.length, cols.length).setValues(tb.appends.map(toRow));
        tb.appends.forEach(function (r, i) { r._r = start + i; });
      }
    });
    if (S._dirty) {
      var sh = ss.getSheetByName(SHEET_NAMES.settings), keys = Object.keys(S).filter(function (k) { return k.charAt(0) !== '_'; }).sort();
      var last = sh.getLastRow(); if (last > 1) sh.getRange(2, 1, last - 1, 2).clearContent();
      if (keys.length) sh.getRange(2, 1, keys.length, 2).setValues(keys.map(function (k) { return [k, JSON.stringify(S[k])]; }));
      if (S._secret && !props.getProperty('SECRET')) props.setProperty('SECRET', S._secret);
      if (S._pepper && !props.getProperty('PEPPER')) props.setProperty('PEPPER', S._pepper);
    }
    SpreadsheetApp.flush();
  }
  var clone = function (r) { var x = {}; for (var k in r) if (k !== '_r') x[k] = JSON_COLS[k] ? (r[k] || []).slice() : r[k]; return x; };
  var match = function (r, w) { for (var k in w) if (r[k] !== w[k]) return false; return true; };
  function seqOf(t) {
    if (t === 'logs' && (!T.logs || !T.logs.loaded)) { // 기록은 읽지 않고 마지막 줄 번호로 번호를 매긴다
      if (!T.logs) T.logs = { rows: [], seq: 0, dirty: {}, appends: [], rewrite: false, loaded: false, appendOnly: true };
      if (!T.logs.seq) T.logs.seq = Math.max(0, ss_().getSheetByName(SHEET_NAMES.logs).getLastRow() - 1);
      return T.logs.seq;
    }
    var b = tb(t); if (!b.seq) b.seq = b.rows.reduce(function (m, r) { return Math.max(m, r.id); }, 0); return b.seq;
  }

  return {
    tx: function (fn, o) {
      if (o && o.read) {
        if (!loadSnapshot()) { loadSheets(); saveSnapshot(); }
        var res = fn();
        if (S._dirty) {
          // 읽기 요청에서 생긴 작은 쓰기 (첫 실행 때 비밀키 만들기 등)
          var lockR = LockService.getScriptLock(); lockR.waitLock(20000);
          try { if (S._secret && !props.getProperty('SECRET')) props.setProperty('SECRET', S._secret); if (S._pepper && !props.getProperty('PEPPER')) props.setProperty('PEPPER', S._pepper); CacheService.getScriptCache().remove(CACHE_KEY); } finally { lockR.releaseLock(); }
        }
        return res;
      }
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(25000)) { var e = new Error('사람이 몰려 처리가 늦어지고 있어요. 잠시 후 다시 눌러 주세요.'); e.code = 'busy'; throw e; }
      try { writing = true; loadSheets(); var r = fn(); flush(); saveSnapshot(); return r; }
      finally { writing = false; lock.releaseLock(); }
    },
    getSettings: function () { return S; },
    setSettings: function (s) { var keep = { _secret: S._secret, _pepper: S._pepper }; S = {}; for (var k in s) S[k] = s[k]; if (s._secret) keep._secret = s._secret; if (s._pepper) keep._pepper = s._pepper; S._secret = keep._secret; S._pepper = keep._pepper; S._dirty = true; },
    list: function (t, w) { if (t === 'logs' && T.logs && T.logs.appendOnly) { T.logs.appendOnly = false; T.logs.loaded = false; } return tb(t).rows.filter(function (r) { return !w || match(r, w); }).map(clone); },
    get: function (t, id) { var r = tb(t).rows.filter(function (x) { return x.id === id; })[0]; return r ? clone(r) : null; },
    insert: function (t, row) { var id = seqOf(t) + 1; T[t].seq = id; var r = clone(row); r.id = id; T[t].rows.push(r); T[t].appends.push(r); return id; },
    update: function (t, id, patch) { var r = tb(t).rows.filter(function (x) { return x.id === id; })[0]; if (!r) return; for (var k in patch) r[k] = JSON_COLS[k] ? (patch[k] || []).slice() : patch[k]; if (T[t].appends.indexOf(r) < 0) T[t].dirty[id] = 1; },
    remove: function (t, id) { tb(t); T[t].rows = T[t].rows.filter(function (x) { return x.id !== id; }); T[t].appends = T[t].appends.filter(function (x) { return x.id !== id; }); T[t].rewrite = true; }
  };
}

function photoUrl_(ref) {
  ref = String(ref || '');
  if (/^(https?:|data:)/.test(ref)) return ref;
  return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(ref) + '&sz=w1600';
}
function savePhoto_(mime, b64, name) {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  var ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, String(name).replace(/[^\w가-힣.-]/g, '_').slice(0, 40) + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}
function randCode_(n) {
  var abc = MarketCore.CODE_ABC, out = '', pool = '';
  while (out.length < n) {
    if (!pool) pool = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var v = parseInt(pool.slice(0, 2), 16); pool = pool.slice(2);
    if (v < 256 - (256 % abc.length)) out += abc[v % abc.length];
  }
  return out;
}
function limiter_(key) {
  if (key !== 'admin') return true;
  var c = CacheService.getScriptCache(), k = 'mk_lim_' + key + '_' + Math.floor(Date.now() / 60000);
  var n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 120);
  return n <= 20;
}
function market_() {
  return MarketCore.createMarket(SheetStore(), {
    adminPassword: PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '',
    rand: randCode_, photoUrl: photoUrl_, savePhoto: savePhoto_, limiter: limiter_,
    onError: function (e) { console.error(e && e.stack || e); }
  });
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** 웹 앱 진입점: 화면은 Content-Type: text/plain 으로 {action, payload, token} 을 보낸다 (CORS 사전 요청 없이) */
function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, error: '요청 형식이 올바르지 않아요.' }); }
  return json_(market_().call(String(body.action || ''), body.payload || {}, body.token || ''));
}
function doGet() { return json_({ ok: true, service: 'kird-market', version: 1, ready: !!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') }); }

/** 처음 한 번 실행: 시트 5개 만들기 · 비밀키 · 관리자 비밀번호(없으면 새로 만들어 실행 기록에 보여 줌) */
function setup() {
  var ss = ss_(), props = PropertiesService.getScriptProperties();
  if (!ss) throw new Error('이 스크립트는 구글 시트의 「확장 프로그램 → Apps Script」에서 열어야 해요.');
  props.setProperty('SHEET_ID', ss.getId());
  var mk = function (name, header, widths) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#E8F1FA'); sh.setFrozenRows(1); }
    (widths || []).forEach(function (w, i) { if (w) sh.setColumnWidth(i + 1, w); });
    header.forEach(function (k, i) { if (STR_COLS[k] || JSON_COLS[k] || name === SHEET_NAMES.settings) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
    return sh;
  };
  mk(SHEET_NAMES.settings, ['key', 'value'], [180, 420]);
  mk(SHEET_NAMES.items, COLS.items, [50, 50, 200, 300, 200]);
  mk(SHEET_NAMES.codes, COLS.codes, [50, 160, 160]);
  mk(SHEET_NAMES.bids, COLS.bids);
  mk(SHEET_NAMES.logs, COLS.logs, [50, 120, 90, 110, 380]);
  var first = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', randCode_(40));
  if (!props.getProperty('PEPPER')) props.setProperty('PEPPER', randCode_(40));
  var pw = props.getProperty('ADMIN_PASSWORD');
  if (!pw) { pw = randCode_(12); props.setProperty('ADMIN_PASSWORD', pw); }
  CacheService.getScriptCache().remove(CACHE_KEY);
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER); if (!it.hasNext()) DriveApp.createFolder(PHOTO_FOLDER);
  console.log('설치 완료. 관리자 비밀번호: ' + pw + '  (프로젝트 설정 → 스크립트 속성 ADMIN_PASSWORD 에서 바꿀 수 있어요)');
  return pw;
}
