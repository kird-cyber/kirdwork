/* KIRD 나눔마켓 — 화면 공용: 서버 연결(또는 데모), 숫자·시간 표시, 아이콘, 토스트, 사진 줄이기 */
(function () {
  'use strict';
  const cfg = window.MARKET_CONFIG || {};
  const DEMO = !cfg.api;
  const NS = cfg.ns ? String(cfg.ns) + ':' : '';
  const DEMO_KEY = cfg.ns ? 'kird-market-demo-' + cfg.ns : 'kird-market-demo-v1';

  /* ── 작은 도구 ── */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => (Math.round(Number(n) || 0)).toLocaleString('ko-KR') + '원';
  const num = n => (Math.round(Number(n) || 0)).toLocaleString('ko-KR');
  const pad = n => String(n).padStart(2, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let clockOffset = 0; // 서버 시각 - 내 시각
  const now = () => Date.now() + clockOffset;
  function setServerNow(t) { if (t) clockOffset = t - Date.now(); }
  function fmtDate(t, o) {
    if (!t) return '-';
    const d = new Date(t), w = '일월화수목금토'[d.getDay()];
    const md = (d.getMonth() + 1) + '.' + d.getDate() + '(' + w + ')';
    const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (o === 'time') return hm;
    if (o === 'sec') return md + ' ' + hm + ':' + pad(d.getSeconds());
    return md + ' ' + hm;
  }
  function left(ms) {
    if (ms <= 0) return '0초';
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    if (d > 0) return d + '일 ' + h + '시간';
    if (h > 0) return h + '시간 ' + pad(m) + '분';
    return m + '분 ' + pad(x) + '초';
  }
  function clockLeft(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return (d ? d + '일 ' : '') + pad(h) + ':' + pad(m) + ':' + pad(x);
  }
  function ago(t) {
    if (!t) return '-'; const s = Math.max(0, Math.floor((now() - t) / 1000));
    if (s < 60) return '방금'; if (s < 3600) return Math.floor(s / 60) + '분 전'; if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    return fmtDate(t);
  }
  function toDT(t) { if (!t) return ''; const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fromDT(s) { if (!s) return 0; const t = new Date(s).getTime(); return isFinite(t) ? t : 0; }

  /* ── 아이콘 (선 아이콘, currentColor) ── */
  const P = {
    gavel: '<path d="M14.5 3.5l6 6M12 6l6 6M9.5 8.5l6 6M4 20l7-7"/><path d="M13 5l6 6-3 3-6-6z"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 018 0v2.7"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c5 0 8.5 4.5 9.5 7a13 13 0 01-2.6 3.8M6.2 6.6A13.3 13.3 0 002.5 12c1 2.5 4.5 7 9.5 7 1.6 0 3-.4 4.3-1"/><path d="M9.9 10a3 3 0 004.1 4.2"/>',
    key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.3 11.7L20 3M16.5 6.5l2.5 2.5M14 9l2 2"/>',
    check: '<path d="M4.5 12.5l4.5 4.5L19.5 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
    trend: '<path d="M3.5 16.5l6-6 4 4 7-7"/><path d="M15 7.5h5.5V13"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.3" cy="6.5" r=".6"/><circle cx="4.3" cy="12" r=".6"/><circle cx="4.3" cy="17.5" r=".6"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/>',
    ticket: '<path d="M3.5 8.5V6.5a1 1 0 011-1h15a1 1 0 011 1v2a3.5 3.5 0 000 7v2a1 1 0 01-1 1h-15a1 1 0 01-1-1v-2a3.5 3.5 0 000-7z"/><path d="M14.5 6v12" stroke-dasharray="1.5 2.2"/>',
    trophy: '<path d="M7.5 4.5h9v4.5a4.5 4.5 0 01-9 0z"/><path d="M7.5 6.5H4.5a3 3 0 003 4M16.5 6.5h3a3 3 0 01-3 4M12 13.5v3.5M8.5 20.5h7M9.5 17h5"/>',
    history: '<path d="M4 12a8 8 0 102.4-5.7"/><path d="M3.5 4.5v4h4M12 8v4.5l3 1.8"/>',
    pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
    play: '<path d="M7.5 5l11 7-11 7z"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15"/>',
    upload: '<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9M4.5 19.5h15"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8.5"/>',
    edit: '<path d="M4.5 19.5l1-4.2L15.8 5a1.8 1.8 0 012.6 0l.6.6a1.8 1.8 0 010 2.6L8.7 18.5z"/><path d="M13.5 7.3l3.2 3.2"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.5h9l1-12.5M10.3 10.5v6M13.7 10.5v6"/>',
    eye: '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
    print: '<path d="M7 9V3.5h10V9M7 17H4.5v-6.5a1.5 1.5 0 011.5-1.5h12a1.5 1.5 0 011.5 1.5V17H17"/><rect x="7" y="14" width="10" height="6.5" rx="1"/>',
    logout: '<path d="M14.5 4.5h4a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-4M10 16.5L5.5 12 10 7.5M5.5 12H16"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4v4.5H15"/>',
    ext: '<path d="M13.5 4.5h6v6M19.5 4.5l-8 8M17.5 13.5v5a1 1 0 01-1 1h-11a1 1 0 01-1-1v-11a1 1 0 011-1h5"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-3a1 1 0 00-1-1h-9a1 1 0 00-1 1v9a1 1 0 001 1h3"/>',
    home: '<path d="M4 11l8-6.5 8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
    bars: '<path d="M5 20V11M12 20V5M19 20v-6M3 20.5h18"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5M20 14v.01M17.5 20H20v-3M14 20h.01"/>',
    chev: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    chevl: '<path d="M15 5.5L8.5 12l6.5 6.5"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.3 2.3 4.3-4.6"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z"/>',
    dash: '<rect x="3.5" y="3.5" width="7.5" height="9" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="5" rx="1.5"/><rect x="13" y="11" width="7.5" height="9.5" rx="1.5"/><rect x="3.5" y="15" width="7.5" height="5.5" rx="1.5"/>'
  };
  const ic = (n, s, w) => '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.9) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>';

  /* ── 토스트 ── */
  function toast(msg, kind, ms) {
    let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (kind || '');
    t.innerHTML = ic(kind === 'ok' ? 'check' : kind === 'bad' ? 'alert' : 'info', 18, 2.2) + '<div>' + esc(msg) + '</div>';
    box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 320); }, ms || 3200);
  }

  /* ── 서버 연결 ── */
  let core = null;
  function cryptoRand(n) {
    const abc = (window.MarketCore || {}).CODE_ABC || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = [], a = new Uint8Array(n * 2);
    crypto.getRandomValues(a);
    for (let i = 0; out.length < n; i++) { if (i >= a.length) { crypto.getRandomValues(a); i = 0; } if (a[i] < 256 - 256 % abc.length) out.push(abc[a[i] % abc.length]); }
    return out.join('');
  }
  function demoCore(rand, clock) {
    return MarketCore.createMarket(MarketCore.LocalStore(DEMO_KEY, localStorage), {
      adminPassword: 'demo', now: clock || now, rand: rand || cryptoRand,
      savePhoto: (mime, b64) => 'data:' + mime + ';base64,' + b64
    });
  }
  async function api(action, payload, token) {
    if (DEMO) {
      if (!core) { seedDemo(); core = demoCore(); }
      await sleep(140 + Math.random() * 160); // 실제 서버처럼 살짝 기다림
      return core.call(action, payload, token);
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(cfg.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, payload: payload || {}, token: token || '' }), redirect: 'follow', cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        if (j && j.now) setServerNow(j.now); else if (j && j.info && j.info.now) setServerNow(j.info.now);
        return j;
      } catch (e) { if (attempt) return { ok: false, error: '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', code: 'net' }; await sleep(700); }
    }
  }

  /* ── 사진 줄이기 (올리기 전에 브라우저에서) ── */
  function shrinkImage(file, maxSide, q) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error('사진 파일(JPG·PNG)만 올릴 수 있어요.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 읽지 못했어요. 다른 파일로 해 주세요.')); };
      img.src = url;
    });
  }
  const PHOTO_MAX = DEMO ? [900, 0.72] : [1600, 0.84];

  /* ── 저장 (토큰) ── */
  const ls = {
    get(k) { try { return localStorage.getItem(NS + k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(NS + k) : localStorage.setItem(NS + k, v); } catch (e) { } }
  };

  /* ── CSV (엑셀에서 한글 깨지지 않게 BOM) ── */
  function downloadCSV(name, rows) {
    const q = v => { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadJSON(name, obj) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ── 데모: 예시 상품 그림 (단색 일러스트 SVG) ── */
  function art(bg, body) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="' + bg + '"/><ellipse cx="200" cy="250" rx="130" ry="14" fill="#000" opacity=".07"/>' + body + '</svg>'); }
  const DEMO_ITEMS = [
    { name: '로봇청소기 (물걸레 겸용)', min_price: 80000, descr: '2024년 구입, 1년 반 사용했어요. 충전독·여분 걸레 2장·리모컨 포함. 배터리 상태 좋아요.', photos: [art('#E7F0F8', '<circle cx="200" cy="170" r="92" fill="#2B3440"/><circle cx="200" cy="170" r="74" fill="#3A4554"/><circle cx="200" cy="140" r="16" fill="#2F84C5"/><rect x="150" y="196" width="100" height="10" rx="5" fill="#56677C"/><circle cx="242" cy="126" r="5" fill="#8DBE45"/>'), art('#F3F5F8', '<rect x="140" y="120" width="120" height="110" rx="14" fill="#DDE3EA"/><rect x="160" y="96" width="80" height="34" rx="10" fill="#C7D0DA"/><circle cx="200" cy="175" r="22" fill="#2F84C5" opacity=".8"/>')] },
    { name: '캠핑 의자 2개 세트', min_price: 50000, descr: '접이식, 수납 가방 포함. 두 번 사용했어요.', photos: [art('#EEF6E4', '<path d="M120 120h70l-10 60h-50z" fill="#5E8F22"/><path d="M210 120h70l-10 60h-50z" fill="#8DBE45"/><path d="M128 180l-18 60M182 180l18 60M218 180l-18 60M272 180l18 60" stroke="#2B3440" stroke-width="8" stroke-linecap="round"/><rect x="112" y="176" width="86" height="12" rx="6" fill="#2B3440"/><rect x="202" y="176" width="86" height="12" rx="6" fill="#2B3440"/>')] },
    { name: '블루투스 스피커', min_price: 60000, descr: '방수 지원, 박스 그대로 있어요. 생활 기스 조금.', photos: [art('#FFF1E8', '<rect x="110" y="120" width="180" height="104" rx="52" fill="#E8590C"/><circle cx="160" cy="172" r="30" fill="#B8430A"/><circle cx="240" cy="172" r="30" fill="#B8430A"/><circle cx="160" cy="172" r="12" fill="#FFB98A"/><circle cx="240" cy="172" r="12" fill="#FFB98A"/><rect x="185" y="110" width="30" height="10" rx="5" fill="#2B3440"/>')] },
    { name: '무선 기계식 키보드', min_price: 30000, descr: '갈축, 텐키리스. 키캡 깨끗해요. USB-C 케이블 포함.', photos: [art('#EEF0FD', '<rect x="70" y="130" width="260" height="100" rx="14" fill="#2B3440"/>' + Array.from({ length: 4 }, (_, r) => Array.from({ length: 10 }, (_, c) => '<rect x="' + (84 + c * 23.5) + '" y="' + (142 + r * 20) + '" width="19" height="15" rx="3" fill="' + (r === 3 && c > 2 && c < 7 ? '#4F5BD5' : '#E7EAF2') + '"/>').join('')).join(''))] },
    { name: '전공 서적 묶음 (통계·데이터)', min_price: 10000, descr: '6권. 필기 거의 없어요. 목록은 사진 참고.', photos: [art('#F6F1E7', '<rect x="120" y="106" width="34" height="130" rx="4" fill="#2F84C5"/><rect x="158" y="96" width="30" height="140" rx="4" fill="#8DBE45"/><rect x="192" y="116" width="40" height="120" rx="4" fill="#E8590C"/><rect x="236" y="100" width="28" height="136" rx="4" fill="#4F5BD5"/><rect x="268" y="120" width="26" height="116" rx="4" fill="#C9A066"/><rect x="110" y="236" width="196" height="8" rx="4" fill="#6B5634"/>')] },
    { name: '스테인리스 텀블러 3개', min_price: 8000, descr: '미개봉 2개 + 한 번 쓴 것 1개. 473ml.', photos: [art('#E9F5F2', '<path d="M128 112h56l-6 124h-44z" fill="#2F84C5"/><rect x="124" y="100" width="64" height="16" rx="6" fill="#1F6AA6"/><path d="M194 112h56l-6 124h-44z" fill="#8DBE45"/><rect x="190" y="100" width="64" height="16" rx="6" fill="#5E8F22"/><path d="M260 112h56l-6 124h-44z" fill="#C7D0DA"/><rect x="256" y="100" width="64" height="16" rx="6" fill="#93A1B2"/>')] },
    { name: '몬스테라 화분 (중형)', min_price: 15000, descr: '잎 9장, 건강해요. 화분 포함. 직접 가져가셔야 해요.', photos: [art('#EDF6E8', '<path d="M162 236h76l10-60h-96z" fill="#C9A066"/><path d="M200 180c-6-40-40-60-70-50 10 30 40 50 70 50z" fill="#5E8F22"/><path d="M200 180c6-46 44-70 78-58-10 34-46 58-78 58z" fill="#8DBE45"/><path d="M200 180c-2-44 10-80 30-96 10 40 0 76-30 96z" fill="#6FA532"/><path d="M200 182V120" stroke="#3F6A14" stroke-width="5"/>')] },
    { name: '장우산 (자동, 네이비)', min_price: 5000, descr: '거의 새것. 회사 로고 없음.', photos: [art('#EAF0F7', '<path d="M100 170a100 80 0 01200 0z" fill="#164E7D"/><path d="M100 170q25-14 50 0q25-14 50 0q25-14 50 0q25-14 50 0" fill="#EAF0F7"/><path d="M200 90v130q0 18 -18 18" stroke="#2B3440" stroke-width="8" fill="none" stroke-linecap="round"/>')] }
  ];
  function seedDemo() {
    try { const raw = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); if (raw && raw.seeded) return; } catch (e) { }
    const fixed = ['TESTAAAA', 'TESTBBBB', 'TESTCCCC', 'ZZXAMP23', 'ZZXAMP45', 'ZZXAMP67'];
    const t = now(), H = 3600e3; let at = t - 23 * H;
    const c = demoCore(n => n === 8 && fixed.length ? fixed.shift() : cryptoRand(n), () => at);
    const A = c.call('adminLogin', { password: 'demo' }).token;
    c.call('admin.saveSettings', { settings: { open_at: t - 24 * H, close_at: t + 3 * 86400e3 + 5 * H } }, A);
    DEMO_ITEMS.forEach(it => c.call('admin.saveItem', { item: it }, A));
    c.call('admin.createCodes', { labels: ['체험 직원 A', '체험 직원 B', '체험 직원 C', '예시 참가자 1', '예시 참가자 2', '예시 참가자 3'] }, A);
    const tok = k => c.call('login', { code: k }).token;
    const x1 = tok('ZZXAMP23'), x2 = tok('ZZXAMP45'), x3 = tok('ZZXAMP67');
    const bid = (h, id, amt, x) => { at = t - h * H; c.call('bid', { itemId: id, amount: amt }, x); };
    bid(21, 1, 80000, x1); bid(15, 1, 84000, x2); bid(9, 1, 88000, x1); bid(3, 1, 92000, x2);
    bid(12, 2, 55000, x3);
    bid(18, 3, 61000, x1);
    bid(14, 4, 34000, x2); bid(10, 6, 9000, x3); bid(5, 6, 12000, x1);
    at = t;
    const raw = JSON.parse(localStorage.getItem(DEMO_KEY)); raw.seeded = 1; localStorage.setItem(DEMO_KEY, JSON.stringify(raw));
  }
  function resetDemo() { localStorage.removeItem(DEMO_KEY); ['mk_tok', 'mk_code', 'mk_admin'].forEach(k => localStorage.removeItem(NS + k)); core = null; }

  /* 직원에게 보이는 규칙 문장 (관리자 미리보기와 같은 문장) */
  // auto=true 면 관리자가 적은 문장 대신 설정에서 자동으로 만든 문장
  function rulesText(i, auto) {
    const unit = won(i.unit);
    const c = '현재 최고가가 실시간으로 보여요. ' + (i.comp_rebid === 'raise' ? '최고가보다 ' + won(Math.max(i.unit, i.comp_step)) + ' 이상 높게 몇 번이든 다시 입찰할 수 있어요. (내가 최고가여도 더 올릴 수 있어요)' : '한 사람당 한 번만 입찰할 수 있어요.') + (i.extend_min ? ' 마감 ' + i.extend_min + '분 전에 입찰이 들어오면 ' + i.extend_min + '분 연장돼요.' : '');
    const s = '다른 사람의 금액은 보이지 않아요' + (i.show_count === 'all' ? ' (입찰 수만 보여요)' : '') + '. 최소가 이상으로 적어 내면 마감 때 가장 높은 금액이 낙찰돼요. ' +
      ({ replace: '마감 전까지 금액을 다시 적어 바꿀 수 있어요. (낮춰도 돼요)', raise: '다시 입찰할 땐 내 이전 금액보다 높게만 낼 수 있어요.', none: '한 사람당 한 번만 입찰할 수 있어요.' }[i.sealed_rebid]) + (i.allow_cancel ? ' 입찰 취소도 할 수 있어요.' : '');
    const p = unit + ' 단위로 접수돼요. (' + unit + ' 미만은 버림 — 예: ' + num(52000 + i.unit * 3.5) + '원 → ' + num(52000 + i.unit * 3) + '원) 같은 금액이면 먼저 낸 사람이 앞서요. 누가 입찰했는지는 다른 직원에게 공개되지 않아요.';
    if (auto) return { c, s, p };
    const own = v => String(v || '').trim();
    return { c: own(i.rules_comp) || c, s: own(i.rules_sealed) || s, p: own(i.rules_common) || p };
  }
  const STEPS = ['참가 코드 입력', '상품 고르기 (일반·경쟁)', '금액 입력 후 입찰 확정', '행사 종료 후 최종 입찰자 안내'];
  function stepsOf(i) { const a = String((i && i.steps) || '').split('\n').map(x => x.trim()).filter(Boolean); return a.length ? a : STEPS.slice(); }

  window.MK = { rulesText, stepsOf, STEPS, cfg, DEMO, api, $, $$, esc, won, num, pad, sleep, now, setServerNow, fmtDate, left, clockLeft, ago, toDT, fromDT, ic, toast, shrinkImage, PHOTO_MAX, ls, downloadCSV, downloadJSON, resetDemo, DEMO_KEY };
})();
