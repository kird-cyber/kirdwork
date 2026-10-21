/* KIRD 나눔마켓 (시안 H · 물건 꼬리표) — Google Apps Script 백엔드 (자동 생성: dev/market-v2/build.py)
 * 사용법: 구글 시트 → 확장 프로그램 → Apps Script → Code.gs 내용을 이 파일로 바꾸고 저장 → (처음이면 setup 실행) → 배포 관리에서 새 버전 */

/* KIRD 나눔마켓 — 입찰 규칙과 처리 (브라우저 데모 · Google Apps Script 양쪽에서 같은 코드가 돈다)
 *
 *  - 순수 규칙: resolveMode / floorUnit / checkBid / rankBids
 *  - 처리기:    createMarket(store, opts).call(action, payload, token)
 *  - 저장소:    store 는 동기식 표 API — tx / getSettings / setSettings / list / get / insert / update / remove
 *               (데모 = LocalStore, Apps Script = SheetStore)
 *  외부 라이브러리 없음. 동기식이라 Apps Script 의 LockService 한 번으로 요청 전체가 원자적으로 처리된다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarketCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ───────── SHA-256 / HMAC (동기식, 작은 구현) ───────── */
  const K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00); }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return out;
  }
  function sha256Bytes(bytes) {
    const l = bytes.length, words = [];
    const m = bytes.slice(); m.push(0x80);
    while ((m.length % 64) !== 56) m.push(0);
    const bits = l * 8;
    for (let i = 7; i >= 0; i--) m.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 255);
    for (let i = 0; i < m.length; i += 4) words.push((m[i] << 24) | (m[i + 1] << 16) | (m[i + 2] << 8) | m[i + 3]);
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Array(64);
    for (let j = 0; j < words.length; j += 16) {
      for (let i = 0; i < 16; i++) w[i] = words[j + i] | 0;
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [A, B, C, D, E, F, G, H] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7));
        const ch = (E & F) ^ (~E & G);
        const t1 = (H + S1 + ch + K256[i] + w[i]) | 0;
        const S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10));
        const mj = (A & B) ^ (A & C) ^ (B & C);
        const t2 = (S0 + mj) | 0;
        H = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0;
      }
      h = [h[0] + A, h[1] + B, h[2] + C, h[3] + D, h[4] + E, h[5] + F, h[6] + G, h[7] + H].map(x => x | 0);
    }
    const out = [];
    h.forEach(x => out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255));
    return out;
  }
  const hex = b => b.map(x => (x < 16 ? '0' : '') + x.toString(16)).join('');
  const sha256 = s => hex(sha256Bytes(utf8(s)));
  function hmac(key, msg) {
    let k = utf8(key); if (k.length > 64) k = sha256Bytes(k);
    while (k.length < 64) k.push(0);
    const ip = k.map(x => x ^ 0x36), op = k.map(x => x ^ 0x5c);
    return hex(sha256Bytes(op.concat(sha256Bytes(ip.concat(utf8(msg))))));
  }
  function b64url(s) {
    const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', b = utf8(s); let o = '';
    for (let i = 0; i < b.length; i += 3) {
      const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
      o += B[n >> 18 & 63] + B[n >> 12 & 63] + (i + 1 < b.length ? B[n >> 6 & 63] : '') + (i + 2 < b.length ? B[n & 63] : '');
    }
    return o;
  }
  function unb64url(s) {
    const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', b = [];
    let buf = 0, bits = 0;
    for (const ch of s) { const v = B.indexOf(ch); if (v < 0) throw new Error('bad'); buf = (buf << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; b.push((buf >> bits) & 255); } }
    let o = '', i = 0;
    while (i < b.length) {
      const c = b[i++];
      if (c < 0x80) o += String.fromCharCode(c);
      else if (c < 0xe0) o += String.fromCharCode(((c & 31) << 6) | (b[i++] & 63));
      else if (c < 0xf0) o += String.fromCharCode(((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
      else { const cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63) - 0x10000; o += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023)); }
    }
    return o;
  }
  function safeEq(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0); return d === 0; }

  /* ───────── 기본 설정 (관리자 화면에서 모두 바꿀 수 있다) ───────── */
  const DEFAULTS = {
    title: 'KIRD 나눔마켓',
    notice: '안 쓰는 물건에 새 주인을 찾아 주세요. 수익금은 전액 기부됩니다.',
    open_at: 0,             // 0 = 바로 시작
    close_at: 0,            // 0 = 마감 시각 미정 (관리자가 「마감」을 누를 때까지)
    paused: false,          // 일시 정지
    competitive_min: 50000, // 최소가가 이 금액 이상이면 경쟁입찰
    unit: 100,              // 입찰 단위 (이 단위 미만은 버림 — 100 = 십원 단위 절사)
    comp_rebid: 'raise',    // 경쟁입찰 재입찰: raise = 현재 최고가보다 높게 / none = 한 번만
    comp_step: 100,         // 경쟁입찰: 현재 최고가보다 최소 얼마 더
    sealed_rebid: 'replace',// 일반입찰 재입찰: replace = 새 금액으로 교체(낮춰도 됨) / raise = 올리기만 / none = 한 번만
    allow_cancel: false,    // 일반입찰 입찰 취소 허용
    show_count: 'comp',     // 입찰자 수 표시: none / comp(경쟁만) / all — 담당자 정의: 경쟁만 표시
    show_leading: true,     // 경쟁입찰에서 「내가 최고가」 표시
    extend_min: 0,          // 경쟁입찰: 마감 N분 전 입찰이 들어오면 N분 연장 (0 = 끔)
    results_public: false,  // 마감 후 각자 낙찰 여부 확인
    steps: '',              // 직원 화면 「참여 방법」 (한 줄에 한 단계, 비우면 기본 4단계)
    rules_common: '',       // 직원 화면 규칙 안내 문장 — 비우면 설정에 맞춰 자동으로 만든 문장
    rules_comp: '',
    rules_sealed: '',
    max_bidders_note: ''
  };
  const OPTION_ENUMS = { comp_rebid: ['raise', 'none'], sealed_rebid: ['replace', 'raise', 'none'], show_count: ['none', 'comp', 'all'] };
  const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0 O 1 I 제외

  /* ───────── 순수 규칙 ───────── */
  const won = n => Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원';
  function floorUnit(v, unit) { const n = Math.floor(Number(v)); if (!isFinite(n) || n <= 0) return 0; return Math.floor(n / unit) * unit; }
  function resolveMode(item, s) { if (item.mode === 'comp' || item.mode === 'sealed') return item.mode; return Number(item.min_price) >= Number(s.competitive_min) ? 'comp' : 'sealed'; }
  function closeOf(item, s) { return Number(item.close_at) || Number(s.close_at) || 0; }
  function phaseOf(s, now) {
    if (s.ended) return 'closed';
    if (Number(s.open_at) && now < Number(s.open_at)) return 'ready';
    return s.paused ? 'paused' : 'open';
  }
  // 동점이면 그 금액을 먼저 낸 사람이 앞선다
  function rankBids(active) { return active.slice().sort((a, b) => (b.amount - a.amount) || (a.created_at - b.created_at) || (a.id - b.id)); }
  function minNext(item, s, active, mine) {
    const mode = resolveMode(item, s), min = Number(item.min_price), unit = Number(s.unit);
    if (mode === 'comp') {
      if (!active.length) return Math.ceil(min / unit) * unit || min;
      const top = rankBids(active)[0].amount;
      return Math.max(min, top + Math.max(unit, Number(s.comp_step) || unit));
    }
    if (mine && s.sealed_rebid === 'raise') return mine.amount + unit;
    return Math.ceil(min / unit) * unit || min;
  }
  /** 입찰 하나가 규칙에 맞는지. 맞으면 { ok:true, amount }, 아니면 { ok:false, error } */
  function checkBid(o) {
    const { item, s, active, codeId, raw, now } = o;
    const unit = Number(s.unit) || 100, min = Number(item.min_price);
    const amount = floorUnit(raw, unit);
    const mode = resolveMode(item, s);
    const mine = active.find(b => b.code_id === codeId);
    const ph = phaseOf(s, now);
    if (ph === 'ready') return { ok: false, error: '아직 입찰 시작 전이에요.' };
    if (ph === 'paused') return { ok: false, error: '담당자가 입찰을 잠시 멈췄어요. 잠시 후 다시 시도해 주세요.' };
    if (ph === 'closed' || item.closed) return { ok: false, error: '입찰이 마감됐어요.' };
    const c = closeOf(item, s); if (c && now >= c) return { ok: false, error: '이 상품은 입찰이 마감됐어요.' };
    if (!amount) return { ok: false, error: '금액을 숫자로 입력해 주세요. (' + won(unit) + ' 단위)' };
    if (amount > 100000000) return { ok: false, error: '금액이 너무 커요. 다시 확인해 주세요.' };
    if (amount < min) return { ok: false, error: '최소 입찰가 ' + won(min) + ' 이상으로 입력해 주세요.' + (Number(raw) >= min ? ' (' + won(unit) + ' 미만은 버려져 ' + won(amount) + '이 돼요)' : '') };
    if (mode === 'comp') {
      if (mine && s.comp_rebid === 'none') return { ok: false, error: '이 상품은 한 번만 입찰할 수 있어요. 이미 ' + won(mine.amount) + '으로 입찰했어요.' };
      const need = minNext(item, s, active, mine);
      if (amount < need) return { ok: false, error: active.length ? '현재 최고가보다 높아야 해요. ' + won(need) + ' 이상으로 입력해 주세요.' : won(need) + ' 이상으로 입력해 주세요.', need: need };
    } else {
      if (mine) {
        if (s.sealed_rebid === 'none') return { ok: false, error: '이 상품은 한 번만 입찰할 수 있어요. 이미 ' + won(mine.amount) + '으로 입찰했어요.' };
        if (s.sealed_rebid === 'raise' && amount <= mine.amount) return { ok: false, error: '재입찰은 내 이전 금액(' + won(mine.amount) + ')보다 높아야 해요.' };
        if (amount === mine.amount) return { ok: false, error: '이미 같은 금액으로 입찰했어요.' };
      }
    }
    return { ok: true, amount: amount, mode: mode, rebid: !!mine, prev: mine ? mine.amount : 0 };
  }

  /* ───────── 처리기 ───────── */
  function createMarket(store, opts) {
    opts = opts || {};
    const now = opts.now || (() => Date.now());
    const rand = opts.rand || (n => { let o = ''; for (let i = 0; i < n; i++) o += CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]; return o; });
    const photoUrl = opts.photoUrl || (id => id);
    const TOKEN_H = 12 * 3600 * 1000, TOKEN_B = 7 * 24 * 3600 * 1000; // 관리자 12시간, 직원 7일

    function settings() {
      const raw = store.getSettings() || {}; const s = {};
      for (const k in DEFAULTS) s[k] = raw[k] === undefined || raw[k] === '' && typeof DEFAULTS[k] !== 'string' ? DEFAULTS[k] : raw[k];
      s.ended = !!raw.ended;
      ['open_at', 'close_at', 'competitive_min', 'unit', 'comp_step', 'extend_min'].forEach(k => s[k] = Number(s[k]) || 0);
      ['paused', 'allow_cancel', 'show_leading', 'results_public'].forEach(k => s[k] = s[k] === true || s[k] === 'true' || s[k] === 1 || s[k] === '1');
      if (!s.unit) s.unit = 100;
      for (const k in OPTION_ENUMS) if (OPTION_ENUMS[k].indexOf(s[k]) < 0) s[k] = DEFAULTS[k];
      s._secret = raw._secret; s._pepper = raw._pepper;
      return s;
    }
    function secretOf() {
      let raw = store.getSettings() || {};
      if (!raw._secret || !raw._pepper) { raw = Object.assign({}, raw, { _secret: raw._secret || rand(40), _pepper: raw._pepper || rand(40) }); store.setSettings(raw); }
      return raw;
    }
    function sign(payload) { const p = b64url(JSON.stringify(payload)); return p + '.' + hmac(secretOf()._secret, p); }
    function verify(tok) {
      if (!tok || typeof tok !== 'string' || tok.indexOf('.') < 0) return null;
      const [p, sig] = tok.split('.');
      if (!safeEq(hmac(secretOf()._secret, p), sig)) return null;
      try { const o = JSON.parse(unb64url(p)); if (!o.exp || o.exp < now()) return null; return o; } catch (e) { return null; }
    }
    const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
    const codeHash = c => sha256(secretOf()._pepper + ':' + normCode(c));
    const fmtCode = c => c.slice(0, 4) + '-' + c.slice(4);
    const err = (msg, code) => { const e = new Error(msg); e.code = code || 'bad'; return e; };
    const log = (actor, action, detail) => store.insert('logs', { at: now(), actor: actor, action: action, detail: typeof detail === 'string' ? detail : JSON.stringify(detail || '') });

    function itemStats(items, bids, s) {
      const by = {};
      bids.forEach(b => { if (b.active) (by[b.item_id] = by[b.item_id] || []).push(b); });
      return items.map(it => ({ it: it, active: by[it.id] || [], mode: resolveMode(it, s) }));
    }
    function publicInfo(s) {
      const t = now();
      let ph = phaseOf(s, t);
      // 전체 마감 시각이 지났고, 연장된 상품도 모두 끝났으면 「마감」
      if (ph !== 'closed' && ph !== 'ready' && s.close_at && t >= s.close_at && !store.list('items').some(i => !i.hidden && Number(i.close_at) > t)) ph = 'closed';
      return {
        title: s.title, notice: s.notice, open_at: s.open_at, close_at: s.close_at, phase: ph, now: t,
        unit: s.unit, competitive_min: s.competitive_min, comp_rebid: s.comp_rebid, comp_step: s.comp_step, sealed_rebid: s.sealed_rebid,
        allow_cancel: s.allow_cancel, show_count: s.show_count, show_leading: s.show_leading, extend_min: s.extend_min, results_public: s.results_public,
        steps: s.steps, rules_common: s.rules_common, rules_comp: s.rules_comp, rules_sealed: s.rules_sealed
      };
    }
    function bidderView(row, s, codeId) {
      const { it, active, mode } = row, t = now();
      const ranked = rankBids(active), mine = active.find(b => b.code_id === codeId) || null;
      const close = closeOf(it, s), ph = phaseOf(s, t);
      const closed = ph === 'closed' || (close && t >= close);
      const v = {
        id: it.id, no: it.no, name: it.name, descr: it.descr, photos: (it.photos || []).map(photoUrl), min_price: Number(it.min_price), mode: mode,
        close_at: close, closed: !!closed, next_min: minNext(it, s, active, mine)
      };
      if (mode === 'comp') { v.top = ranked.length ? ranked[0].amount : 0; }
      if (s.show_count === 'all' || (s.show_count === 'comp' && mode === 'comp')) v.count = active.length;
      if (mine) {
        v.mine = { amount: mine.amount, at: mine.created_at };
        if (mode === 'comp' && s.show_leading) v.mine.leading = ranked[0].code_id === codeId;
        if (closed && s.results_public && ranked.length) v.mine.result = ranked[0].code_id === codeId ? 'win' : 'lose';
      }
      return v;
    }
    function needBidder(tok) {
      const a = verify(tok); if (!a || a.r !== 'b') throw err('참가 코드로 다시 들어와 주세요.', 'auth');
      const c = store.get('codes', a.cid); if (!c || !c.active || c.hash !== a.h) throw err('이 참가 코드는 더 이상 쓸 수 없어요. 담당자에게 문의해 주세요.', 'auth');
      return c;
    }
    function needAdmin(tok) { const a = verify(tok); if (!a || a.r !== 'a') throw err('관리자 로그인이 필요해요.', 'auth'); return a; }
    function itemsSorted() { return store.list('items').sort((a, b) => (Number(a.no) - Number(b.no)) || (a.id - b.id)); }

    const A = {
      /* ── 직원 ── */
      info() { return publicInfo(settings()); },
      items(p, tok) {
        const s = settings(); let codeId = 0;
        if (tok) { try { codeId = needBidder(tok).id; } catch (e) { codeId = 0; } }
        const rows = itemStats(itemsSorted().filter(i => !i.hidden), store.list('bids', { active: 1 }), s);
        return { info: publicInfo(s), items: rows.map(r => bidderView(r, s, codeId)), me: codeId ? { ok: true } : null };
      },
      // 경쟁입찰 최고가가 바뀐 기록 (그래프용). 누가 냈는지는 담지 않음 — 화면에 이미 공개되는 「현재 최고가」의 지난 값들뿐
      trend() {
        const s = settings();
        const items = itemsSorted().filter(i => !i.hidden && resolveMode(i, s) === 'comp').map(it => {
          const bids = store.list('bids', { item_id: it.id }).sort((a, b) => (a.created_at - b.created_at) || (a.id - b.id));
          let top = 0; const pts = [];
          bids.forEach(b => { if (b.amount > top) { top = b.amount; pts.push([b.created_at, b.amount]); } });
          return { id: it.id, start: Number(it.min_price), pts: pts };
        });
        return { open_at: s.open_at, close_at: s.close_at, now: now(), items: items };
      },
      login(p) {
        const n = normCode(p.code);
        if (n.length !== 8) throw err('참가 코드는 8자리예요. (예: ABCD-EF23)');
        if (opts.limiter && !opts.limiter('login')) throw err('시도가 너무 많아요. 1분 뒤 다시 해 주세요.');
        const h = codeHash(n); const c = store.list('codes', { hash: h })[0];
        if (!c) throw err('맞지 않는 코드예요. 받은 코드를 다시 확인해 주세요.');
        if (!c.active) throw err('사용이 중지된 코드예요. 담당자에게 문의해 주세요.');
        store.update('codes', c.id, { last_at: now() });
        return { token: sign({ r: 'b', cid: c.id, h: h, exp: now() + TOKEN_B }), code: fmtCode(n) };
      },
      bid(p, tok) {
        const c = needBidder(tok), s = settings();
        const it = store.get('items', Number(p.itemId));
        if (!it || it.hidden) throw err('상품을 찾을 수 없어요.');
        const active = store.list('bids', { item_id: it.id, active: 1 });
        const r = checkBid({ item: it, s: s, active: active, codeId: c.id, raw: p.amount, now: now() });
        if (!r.ok) { const e = err(r.error, 'rule'); e.need = r.need; throw e; }
        const mine = active.find(b => b.code_id === c.id);
        if (mine) store.update('bids', mine.id, { active: 0 });
        const t = now();
        store.insert('bids', { item_id: it.id, code_id: c.id, amount: r.amount, created_at: t, active: 1 });
        if (r.mode === 'comp' && s.extend_min > 0) {
          const close = closeOf(it, s), win = s.extend_min * 60000;
          if (close && close - t < win) store.update('items', it.id, { close_at: t + win });
        }
        store.update('codes', c.id, { last_at: t });
        log('#' + c.id, r.rebid ? '재입찰' : '입찰', { item: it.no + ' ' + it.name, amount: r.amount, prev: r.prev || undefined });
        const s2 = settings();
        const row = itemStats([store.get('items', it.id)], store.list('bids', { item_id: it.id, active: 1 }), s2)[0];
        return { ok: true, amount: r.amount, floored: Number(p.amount) !== r.amount, rebid: r.rebid, item: bidderView(row, s2, c.id) };
      },
      cancel(p, tok) {
        const c = needBidder(tok), s = settings();
        const it = store.get('items', Number(p.itemId)); if (!it || it.hidden) throw err('상품을 찾을 수 없어요.');
        if (resolveMode(it, s) !== 'sealed' || !s.allow_cancel) throw err('이 상품은 입찰을 취소할 수 없어요.');
        const ph = phaseOf(s, now()), close = closeOf(it, s);
        if (ph !== 'open' || (close && now() >= close)) throw err('지금은 취소할 수 없어요.');
        const mine = store.list('bids', { item_id: it.id, active: 1 }).find(b => b.code_id === c.id);
        if (!mine) throw err('취소할 입찰이 없어요.');
        store.update('bids', mine.id, { active: 0 });
        log('#' + c.id, '입찰 취소', { item: it.no + ' ' + it.name, amount: mine.amount });
        return { ok: true };
      },
      mybids(p, tok) {
        const c = needBidder(tok);
        const all = store.list('bids', { code_id: c.id }).sort((a, b) => b.created_at - a.created_at);
        const items = {}; store.list('items').forEach(i => items[i.id] = i);
        return { history: all.filter(b => items[b.item_id] && !items[b.item_id].hidden).map(b => ({ item_id: b.item_id, no: items[b.item_id].no, name: items[b.item_id].name, amount: b.amount, at: b.created_at, active: !!b.active })) };
      },

      /* ── 관리자 ── */
      adminLogin(p) {
        if (!opts.adminPassword) throw err('관리자 비밀번호가 아직 설정되지 않았어요. 설치 안내서를 확인해 주세요.');
        if (opts.limiter && !opts.limiter('admin')) throw err('시도가 너무 많아요. 1분 뒤 다시 해 주세요.');
        if (!safeEq(String(p.password || ''), String(opts.adminPassword))) { log('관리자', '로그인 실패', ''); throw err('비밀번호가 맞지 않아요.'); }
        log('관리자', '로그인', '');
        return { token: sign({ r: 'a', exp: now() + TOKEN_H }) };
      },
      'admin.state'(p, tok) {
        needAdmin(tok); const s = settings();
        const bids = store.list('bids'), codes = store.list('codes');
        const rows = itemStats(itemsSorted(), bids, s);
        const labels = {}; codes.forEach(c => labels[c.id] = c.label);
        const items = rows.map(({ it, active, mode }) => {
          const r = rankBids(active);
          return Object.assign({}, it, {
            photos: it.photos || [], photo_urls: (it.photos || []).map(photoUrl), mode_resolved: mode, close_eff: closeOf(it, s), count: active.length,
            top: r[0] ? { amount: r[0].amount, code_id: r[0].code_id, label: labels[r[0].code_id] || '', at: r[0].created_at } : null,
            second: r[1] ? { amount: r[1].amount, code_id: r[1].code_id, label: labels[r[1].code_id] || '' } : null,
            history: bids.filter(b => b.item_id === it.id).length
          });
        });
        const pub = publicInfo(s); const st = {};
        for (const k in DEFAULTS) st[k] = s[k];
        st.ended = s.ended;
        return {
          info: pub, settings: st, items: items,
          totals: { items: items.filter(i => !i.hidden).length, hidden: items.filter(i => i.hidden).length, bids: bids.filter(b => b.active).length, rebids: bids.filter(b => !b.active).length, codes: codes.length, codes_active: codes.filter(c => c.active).length, bidders: Object.keys(bids.reduce((o, b) => (o[b.code_id] = 1, o), {})).length }
        };
      },
      'admin.saveSettings'(p, tok) {
        needAdmin(tok);
        const raw = Object.assign({}, store.getSettings() || {}); const inc = p.settings || {}; const changed = [];
        for (const k in DEFAULTS) if (k in inc) {
          let v = inc[k];
          if (typeof DEFAULTS[k] === 'number') { v = Math.max(0, Math.floor(Number(v) || 0)); }
          else if (typeof DEFAULTS[k] === 'boolean') v = v === true || v === 'true';
          else v = String(v).slice(0, 2000);
          if (OPTION_ENUMS[k] && OPTION_ENUMS[k].indexOf(v) < 0) throw err('설정값이 올바르지 않아요: ' + k);
          if (raw[k] !== v) changed.push(k);
          raw[k] = v;
        }
        if (raw.unit !== undefined && Number(raw.unit) < 10) throw err('입찰 단위는 10원 이상이어야 해요.');
        if ('ended' in inc) { if (!!raw.ended !== !!inc.ended) changed.push(inc.ended ? '전체 마감' : '마감 해제'); raw.ended = !!inc.ended; }
        store.setSettings(raw);
        if (changed.length) log('관리자', '설정 변경', changed.join(', '));
        return { ok: true };
      },
      'admin.saveItem'(p, tok) {
        needAdmin(tok); const x = p.item || {};
        const name = String(x.name || '').trim(); if (!name) throw err('상품명을 입력해 주세요.');
        const min = Math.floor(Number(x.min_price)); if (!(min > 0)) throw err('최소 입찰가를 입력해 주세요.');
        const row = {
          name: name.slice(0, 80), descr: String(x.descr || '').slice(0, 2000), min_price: min,
          mode: ['auto', 'comp', 'sealed'].indexOf(x.mode) >= 0 ? x.mode : 'auto', hidden: x.hidden ? 1 : 0,
          photos: (Array.isArray(x.photos) ? x.photos : []).slice(0, 8).map(String), close_at: Number(x.close_at) || 0, updated_at: now()
        };
        if (x.id) {
          const old = store.get('items', Number(x.id)); if (!old) throw err('상품을 찾을 수 없어요.');
          const bids = store.list('bids', { item_id: old.id, active: 1 });
          if (bids.length && Number(old.min_price) !== min) {
            if (min > Math.min.apply(null, bids.map(b => b.amount))) throw err('이미 입찰이 있어 최소가를 기존 입찰보다 높게 올릴 수 없어요.');
          }
          if (x.no) row.no = Math.floor(Number(x.no)) || old.no;
          store.update('items', old.id, row);
          log('관리자', '상품 수정', old.no + ' ' + name + (old.hidden !== row.hidden ? (row.hidden ? ' (숨김)' : ' (공개)') : ''));
          return { ok: true, id: old.id };
        }
        const no = Math.floor(Number(x.no)) || (store.list('items').reduce((m, i) => Math.max(m, Number(i.no) || 0), 0) + 1);
        row.no = no; row.created_at = now();
        const id = store.insert('items', row);
        log('관리자', '상품 등록', no + ' ' + name);
        return { ok: true, id: id };
      },
      'admin.setHidden'(p, tok) {
        needAdmin(tok); const it = store.get('items', Number(p.id)); if (!it) throw err('상품을 찾을 수 없어요.');
        store.update('items', it.id, { hidden: p.hidden ? 1 : 0, updated_at: now() });
        log('관리자', p.hidden ? '상품 숨김' : '상품 공개', it.no + ' ' + it.name); return { ok: true };
      },
      'admin.deleteItem'(p, tok) {
        needAdmin(tok); const it = store.get('items', Number(p.id)); if (!it) throw err('상품을 찾을 수 없어요.');
        if (store.list('bids', { item_id: it.id }).length) throw err('입찰 기록이 있는 상품은 지울 수 없어요. 「숨김」을 써 주세요.');
        store.remove('items', it.id); log('관리자', '상품 삭제', it.no + ' ' + it.name); return { ok: true };
      },
      'admin.uploadPhoto'(p, tok) {
        needAdmin(tok);
        if (!opts.savePhoto) throw err('사진 저장소가 설정되지 않았어요.');
        const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(p.dataUrl || ''));
        if (!m) throw err('사진 형식이 올바르지 않아요. (JPG·PNG)');
        if (m[3].length > 4 * 1024 * 1024) throw err('사진이 너무 커요.');
        const ref = opts.savePhoto(m[1], m[3], String(p.name || 'photo'));
        return { ok: true, ref: ref, url: photoUrl(ref) };
      },
      'admin.codes'(p, tok) {
        needAdmin(tok); const bids = store.list('bids');
        const cnt = {}; bids.forEach(b => { if (b.active) cnt[b.code_id] = (cnt[b.code_id] || 0) + 1; });
        return { codes: store.list('codes').sort((a, b) => a.id - b.id).map(c => ({ id: c.id, label: c.label, active: !!c.active, created_at: c.created_at, last_at: c.last_at, bids: cnt[c.id] || 0, hint: c.hint, code: c.code ? fmtCode(normCode(c.code)) : '' })) };
      },
      'admin.createCodes'(p, tok) {
        needAdmin(tok);
        let labels = Array.isArray(p.labels) ? p.labels.map(x => String(x).trim()).filter(Boolean) : [];
        const n = labels.length || Math.floor(Number(p.count) || 0);
        if (!(n > 0) || n > 1000) throw err('1~1000개 사이로 만들어 주세요.');
        const out = [], used = {}; store.list('codes').forEach(c => used[c.hash] = 1);
        for (let i = 0; i < n; i++) {
          let code, h, guard = 0;
          do { code = rand(8); h = codeHash(code); } while (used[h] && ++guard < 50);
          used[h] = 1;
          const label = (labels[i] || '').slice(0, 60);
          const id = store.insert('codes', { hash: h, label: label, active: 1, created_at: now(), last_at: 0, hint: code.slice(-2), code: code }); // 관리자가 언제든 다시 볼 수 있게 원래 코드도 저장
          out.push({ id: id, label: label, code: fmtCode(code) });
        }
        log('관리자', '참가 코드 발급', n + '개');
        return { codes: out };
      },
      'admin.updateCode'(p, tok) {
        needAdmin(tok); const c = store.get('codes', Number(p.id)); if (!c) throw err('코드를 찾을 수 없어요.');
        const patch = {};
        if ('label' in p) patch.label = String(p.label || '').slice(0, 60);
        if ('active' in p) patch.active = p.active ? 1 : 0;
        store.update('codes', c.id, patch);
        if ('active' in p && !!c.active !== !!p.active) log('관리자', p.active ? '코드 사용 재개' : '코드 사용 중지', '#' + c.id);
        return { ok: true };
      },
      // 코드 지우기: 한 번도 입찰하지 않은 코드만 (입찰 기록이 있으면 「사용 중지」로 막아야 결과가 남는다)
      'admin.deleteCodes'(p, tok) {
        needAdmin(tok);
        const ids = (Array.isArray(p.ids) ? p.ids : []).map(Number).filter(Boolean);
        if (!ids.length) throw err('지울 코드를 골라 주세요.');
        const used = {}; store.list('bids').forEach(b => used[b.code_id] = 1);
        const deleted = [], kept = [];
        ids.forEach(id => { const c = store.get('codes', id); if (!c) return; if (used[id]) kept.push(id); else { store.remove('codes', id); deleted.push(id); } });
        if (deleted.length) log('관리자', '코드 삭제', deleted.length + '개 (' + deleted.map(i => '#' + i).join(', ').slice(0, 300) + ')');
        return { deleted: deleted, kept: kept };
      },
      'admin.reissueCode'(p, tok) {
        needAdmin(tok); const c = store.get('codes', Number(p.id)); if (!c) throw err('코드를 찾을 수 없어요.');
        const used = {}; store.list('codes').forEach(x => used[x.hash] = 1);
        let code, h; do { code = rand(8); h = codeHash(code); } while (used[h]);
        store.update('codes', c.id, { hash: h, hint: code.slice(-2), code: code, active: 1 });
        log('관리자', '코드 재발급', '#' + c.id + (c.label ? ' ' + c.label : ''));
        return { id: c.id, label: c.label, code: fmtCode(code) }; // 기존 입찰은 그대로 이 참가자 것으로 남는다
      },
      'admin.bids'(p, tok) {
        needAdmin(tok); const it = store.get('items', Number(p.itemId)); if (!it) throw err('상품을 찾을 수 없어요.');
        const labels = {}; store.list('codes').forEach(c => labels[c.id] = c.label);
        const all = store.list('bids', { item_id: it.id });
        const rankedIds = rankBids(all.filter(b => b.active)).map(b => b.id);
        return { bids: all.sort((a, b) => b.created_at - a.created_at).map(b => ({ id: b.id, code_id: b.code_id, label: labels[b.code_id] || '', amount: b.amount, at: b.created_at, active: !!b.active, rank: b.active ? rankedIds.indexOf(b.id) + 1 : 0 })) };
      },
      'admin.logs'(p, tok) { needAdmin(tok); return { logs: store.list('logs').sort((a, b) => b.id - a.id).slice(0, 500) }; },
      'admin.dump'(p, tok) {
        needAdmin(tok); log('관리자', '전체 백업 내려받기', '');
        const st = Object.assign({}, store.getSettings()); delete st._secret; delete st._pepper;
        return { at: now(), settings: st, items: store.list('items'), codes: store.list('codes').map(c => ({ id: c.id, label: c.label, code: c.code ? fmtCode(normCode(c.code)) : '', active: c.active, created_at: c.created_at })), bids: store.list('bids') };
      }
    };

    function call(action, payload, token) {
      const fn = A[action];
      if (!fn) return { ok: false, error: '알 수 없는 요청이에요.', code: 'bad' };
      try {
        const read = action === 'info' || action === 'items' || action === 'trend' || action === 'mybids' || action === 'admin.state' || action === 'admin.codes' || action === 'admin.bids' || action === 'admin.logs';
        const res = store.tx(() => fn(payload || {}, token), { read: read });
        return Object.assign({ ok: true }, res);
      } catch (e) {
        if (!e.code) { if (opts.onError) opts.onError(e); return { ok: false, error: '처리 중 문제가 생겼어요. 잠시 후 다시 해 주세요.', code: 'server', detail: String(e && e.message || e) }; }
        return { ok: false, error: e.message, code: e.code, need: e.need };
      }
    }
    return { call: call, settings: settings, _A: A, codeHash: codeHash, normCode: normCode };
  }

  /* ───────── 브라우저 데모 저장소 (localStorage, 탭끼리 공유) ───────── */
  function LocalStore(key, storage) {
    const TABLES = ['items', 'codes', 'bids', 'logs', 'photos'];
    let db = null;
    const blank = () => { const o = { settings: {}, seq: {} }; TABLES.forEach(t => { o[t] = []; o.seq[t] = 0; }); return o; };
    const load = () => { try { db = JSON.parse(storage.getItem(key) || 'null') || blank(); } catch (e) { db = blank(); } TABLES.forEach(t => { db[t] = db[t] || []; db.seq[t] = db.seq[t] || 0; }); };
    const save = () => { try { storage.setItem(key, JSON.stringify(db)); } catch (e) { const x = new Error('데모 저장 공간이 꽉 찼어요. 사진을 줄이거나 「데모 초기화」를 해 주세요.'); x.code = 'quota'; throw x; } };
    const match = (r, w) => { for (const k in w) if (r[k] !== w[k]) return false; return true; };
    const clone = r => JSON.parse(JSON.stringify(r));
    return {
      tx(fn, o) { load(); const res = fn(); if (!(o && o.read) || db._dirty) { delete db._dirty; save(); } return res; },
      getSettings() { return db.settings; },
      setSettings(s) { db.settings = clone(s); db._dirty = 1; },
      list(t, w) { return db[t].filter(r => !w || match(r, w)).map(clone); },
      get(t, id) { const r = db[t].find(r => r.id === id); return r ? clone(r) : null; },
      insert(t, row) { const id = ++db.seq[t]; db[t].push(Object.assign(clone(row), { id: id })); db._dirty = 1; return id; },
      update(t, id, patch) { const r = db[t].find(r => r.id === id); if (r) Object.assign(r, clone(patch)); db._dirty = 1; },
      remove(t, id) { db[t] = db[t].filter(r => r.id !== id); db._dirty = 1; },
      raw() { load(); return db; }, reset() { storage.removeItem(key); db = null; }
    };
  }

  return { createMarket, LocalStore, checkBid, resolveMode, floorUnit, rankBids, minNext, phaseOf, closeOf, sha256, hmac, DEFAULTS, OPTION_ENUMS, CODE_ABC, won };
});


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
