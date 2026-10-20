// 케이요새 · 연구부정 소탕전 기록 서버 (Google Apps Script 웹 앱)
// 설치 방법은 같은 폴더의 SETUP.md. 이 파일 전체를 Apps Script 편집기의 Code.gs에 붙여 넣으면 됩니다.
// 시트 두 장을 씁니다: 「기록」(도전 한 번 = 한 줄), 「닉네임」(닉네임마다 PIN 확인용 키). 관리자는 시트에서 직접 줄을 지우거나 고칠 수 있습니다.

var REC = '기록', USERS = '닉네임';
// 결과: 클리어(3대 소탕) · 시간종료(10분 다 씀) · 탈락(내가 격파됨, 순위 없음). 「남은 적 체력」은 시간종료 순위에 씁니다.
var REC_HEAD = ['시각', '날짜', '닉네임', '키', '결과', '쓴 시간(초)', '남은 체력', '격파', '탱크', '발사', '버전', '입력 기록', '남은 적 체력'];
var KIND = { clear: '클리어', timeup: '시간종료', out: '탈락' };
var USER_HEAD = ['닉네임', '키', '등록 시각'];

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad' }); }
  return handle_(body);
}
function handle_(p) {
  try {
    if (p.action === 'submit') return out_(submit_(p));
    return out_(top_(p));
  } catch (err) { return out_({ ok: false, error: 'server', msg: String(err) }); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); }
  else if (sh.getLastColumn() < head.length) sh.getRange(1, 1, 1, head.length).setValues([head]); // older sheet: add new columns
  return sh;
}
function rows_(sh) { var v = sh.getDataRange().getValues(); return v.slice(1); }
function kstDay_(ms) { return new Date(ms + 9 * 3600e3).toISOString().slice(0, 10); }
// Sheets turns '2026-10-20' into a date and '0012' into 12: write text with a leading ' and read back defensively
function txt_(s) { return "'" + String(s); }
function str_(v) { return v instanceof Date ? v.toISOString() : String(v); }
function dayOf_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd') : String(v); }

// ranked runs → best run per nickname. Every clear beats every timeup; clears by clock used (less = better),
// timeups by foe HP left (less = better); then my HP left (more = better), then who did it first
function better_(a, b) {
  var ga = a.kind === 'timeup' ? 1 : 0, gb = b.kind === 'timeup' ? 1 : 0;
  if (ga !== gb) return ga < gb;
  var ka = ga ? a.left : a.time, kb = gb ? b.left : b.time;
  return ka !== kb ? ka < kb : a.hp !== b.hp ? a.hp > b.hp : a.at < b.at;
}
function bestPerNick_(runs) {
  var m = {}, out = [];
  runs.forEach(function (r) { if (!m[r.nick] || better_(r, m[r.nick])) m[r.nick] = r; });
  for (var k in m) out.push(m[k]);
  out.sort(function (a, b) { return better_(a, b) ? -1 : better_(b, a) ? 1 : 0; });
  out.forEach(function (r, i) { r.rank = i + 1; });
  return out;
}
function runs_() {
  return rows_(sheet_(REC, REC_HEAD)).filter(function (r) { return r[4] === KIND.clear || r[4] === KIND.timeup; }).map(function (r) {
    return { at: str_(r[0]), day: dayOf_(r[1]), nick: str_(r[2]), key: str_(r[3]), kind: r[4] === KIND.clear ? 'clear' : 'timeup', time: Number(r[5]), hp: Number(r[6]),
      tank: String(r[8]), shots: Number(r[9]), left: Number(r[12]) || 0 };
  });
}
function pub_(r) { return { rank: r.rank, nick: r.nick, kind: r.kind, time: r.time, left: r.left, hp: r.hp, tank: r.tank, shots: r.shots, day: r.day, at: r.at }; }

function top_(p) {
  var day = String(p.day || kstDay_(Date.now())), all = runs_();
  var today = bestPerNick_(all.filter(function (r) { return r.day === day; }));
  var ever = bestPerNick_(all);
  // 명예의 전당: every day's top 10 earns 10..1 points
  var days = {}, fame = {};
  all.forEach(function (r) { (days[r.day] = days[r.day] || []).push(r); });
  for (var d in days) bestPerNick_(days[d]).slice(0, 10).forEach(function (r) {
    var f = fame[r.nick] = fame[r.nick] || { nick: r.nick, points: 0, firsts: 0, days: 0 };
    f.points += 11 - r.rank; f.days++; if (r.rank === 1) f.firsts++;
  });
  var fl = []; for (var n in fame) fl.push(fame[n]);
  fl.sort(function (a, b) { return b.points - a.points || b.firsts - a.firsts || (a.nick < b.nick ? -1 : 1); });
  fl.forEach(function (f, i) { f.rank = i + 1; });
  var res = { ok: true, day: day, today: today.slice(0, 10).map(pub_), all: ever.slice(0, 10).map(pub_), fame: fl.slice(0, 10), players: today.length };
  if (p.nick) {
    var mt = today.filter(function (r) { return r.nick === p.nick; })[0], ma = ever.filter(function (r) { return r.nick === p.nick; })[0], mf = fame[p.nick];
    res.me = { today: mt ? pub_(mt) : null, all: ma ? pub_(ma) : null, fame: mf || null };
  }
  return res;
}

function submit_(p) {
  var nick = String(p.nick || '').trim(), key = String(p.key || ''), day = String(p.day || '');
  var time = Number(p.time), hp = Math.round(Number(p.hp) || 0), left = Math.round(Number(p.left) || 0);
  var kind = KIND[p.kind] ? p.kind : (p.clear ? 'clear' : 'out'), ranked = kind !== 'out';
  if (!nick || nick.length > 8 || !/^[0-9a-f]{64}$/.test(key)) return { ok: false, error: 'bad' };
  var now = Date.now(), today = kstDay_(now), yesterday = kstDay_(now - 864e5);
  if (day !== today && day !== yesterday) return { ok: false, error: 'day' };       // a run that crossed midnight still counts
  if (!(time >= 0 && time < 36000) || left < 0 || left > 100000) return { ok: false, error: 'bad' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    // nickname = first PIN wins; later records with that nickname need the same PIN
    var us = sheet_(USERS, USER_HEAD), urows = rows_(us), known = null;
    for (var i = 0; i < urows.length; i++) if (str_(urows[i][0]) === nick) { known = str_(urows[i][1]); break; }
    if (known && known !== key) return { ok: false, error: 'pin' };
    if (!known) us.appendRow([txt_(nick), txt_(key), new Date(now).toISOString()]);
    var before = top_({ day: day, nick: nick });
    var log = typeof p.log === 'string' ? p.log : JSON.stringify(p.log || []);
    if (log.length > 45000) log = log.slice(0, 45000);              // one cell holds 50,000 characters
    sheet_(REC, REC_HEAD).appendRow([new Date(now).toISOString(), txt_(day), txt_(nick), txt_(key), KIND[kind], Math.round(time * 100) / 100, hp,
      Math.round(Number(p.kills) || 0), String(p.tank || ''), Math.round(Number(p.shots) || 0), txt_(p.ver || ''), txt_(log), left]);
    if (!ranked) return { ok: true, saved: true, ranked: false, me: before.me };
    var after = top_({ day: day, nick: nick }), mine = { kind: kind, time: Math.round(time * 100) / 100, left: left, hp: hp, at: new Date(now).toISOString() };
    var prev = before.me && before.me.today, cur = after.me.today, prevAll = before.me && before.me.all;
    return { ok: true, saved: true, ranked: true, best: !prev || better_(mine, prev),
      prevRank: prev ? prev.rank : null, rank: cur.rank, prev: prev || null, prevBest: prev ? prev.time : null,
      allBest: !prevAll || better_(mine, prevAll), allRank: after.me.all.rank, players: after.players, me: after.me };
  } finally { lock.releaseLock(); }
}
