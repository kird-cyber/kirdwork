#!/usr/bin/env python3
"""나눔마켓 v2 시안 3종 만들기 → market-f/ · market-h/ · market-j/  (python3 dev/market-v2/build.py)

- 규칙·서버(core.js, client.js, admin, apps-script)는 지금 쓰는 market/ 을 그대로 가져와 아래만 덧붙임
  · 시안마다 데모 저장 공간을 따로 씀 (config.ns) — 시안끼리 입찰이 섞이지 않음
  · 데모 예시 입찰 시각을 하루에 걸쳐 흩어 둠 (그래프가 보이게)
  · 서버에 'trend'(경쟁입찰 최고가가 바뀐 기록, 누가 냈는지는 없음) 추가 — 시안 J 그래프용
- 화면(index.html)은 dev/market-v2/common + themes/<시안> 을 합쳐 만듦
- market/ (실제 행사용)은 건드리지 않음
"""
import json, pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'market'
HERE = pathlib.Path(__file__).resolve().parent
V = '5'
VARIANTS = {
    'f': {'dir': 'market-f', 'name': '시안 F · 모노 마켓', 'color': '#000000'},
    'h': {'dir': 'market-h', 'name': '시안 H · 물건 꼬리표', 'color': '#2F6656'},
    'j': {'dir': 'market-j', 'name': '시안 J · 나눔 시세판', 'color': '#13294B'},
}


def sub(s, old, new, count=1):
    if old not in s:
        raise SystemExit('패치 위치를 찾지 못함: ' + old[:60])
    return s.replace(old, new, count)


def patch_client(s):
    s = sub(s, "const DEMO_KEY = 'kird-market-demo-v1';",
            "const NS = cfg.ns ? String(cfg.ns) + ':' : '';\n  const DEMO_KEY = cfg.ns ? 'kird-market-demo-' + cfg.ns : 'kird-market-demo-v1';")
    s = sub(s, "get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },",
            "get(k) { try { return localStorage.getItem(NS + k); } catch (e) { return null; } },")
    s = sub(s, "set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { } }",
            "set(k, v) { try { v == null ? localStorage.removeItem(NS + k) : localStorage.setItem(NS + k, v); } catch (e) { } }")
    s = sub(s, "['mk_tok', 'mk_code', 'mk_admin'].forEach(k => localStorage.removeItem(k));",
            "['mk_tok', 'mk_code', 'mk_admin'].forEach(k => localStorage.removeItem(NS + k));")
    # 아이콘 추가
    s = sub(s, "    chev: '", "    home: '<path d=\"M4 11l8-6.5 8 6.5V20h-5.5v-5.5h-5V20H4z\"/>',\n"
            "    bars: '<path d=\"M5 20V11M12 20V5M19 20v-6M3 20.5h18\"/>',\n"
            "    qr: '<rect x=\"4\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"14\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"4\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M14 14h2.5v2.5M20 14v.01M17.5 20H20v-3M14 20h.01\"/>',\n"
            "    chev: '")
    # 데모 시계 (예시 입찰 시각을 흩어 둠)
    s = sub(s, "function demoCore(rand) {", "function demoCore(rand, clock) {")
    s = sub(s, "adminPassword: 'demo', now: now, rand: rand || cryptoRand,", "adminPassword: 'demo', now: clock || now, rand: rand || cryptoRand,")
    a = s.index('  function seedDemo() {')
    b = s.index('  function resetDemo()')
    seed = r'''  function seedDemo() {
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
'''
    s = s[:a] + seed + s[b:]
    return s


def patch_core(s):
    trend = r'''      // 경쟁입찰 최고가가 바뀐 기록 (그래프용). 누가 냈는지는 담지 않음 — 화면에 이미 공개되는 「현재 최고가」의 지난 값들뿐
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
      login(p) {'''
    s = sub(s, "      login(p) {", trend)
    s = sub(s, "const read = action === 'info' || action === 'items' ||", "const read = action === 'info' || action === 'items' || action === 'trend' ||")
    return s


ADMIN_FIX = '''
  /* v2: 좁은 휴대폰(360px)에서 표가 화면 밖으로 밀리던 문제 · iOS 입력 확대 */
  .main, .content, .panel, .two > *, .tiles > * { min-width: 0; }
  .panel .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  @media (max-width: 640px) { .inp, select.inp, textarea.inp { font-size: 16px; } .content, .head .in { padding-left: 12px; padding-right: 12px; } .tiles { grid-template-columns: 1fr 1fr; gap: 8px; } }
</style>'''


def build(key, meta):
    out = ROOT / meta['dir']
    if out.exists():
        shutil.rmtree(out)
    (out / 'assets').mkdir(parents=True)
    (out / 'apps-script').mkdir()
    for f in ['admin.js', 'qr.js', 'kmark.png', 'k.png', 'app.css']:
        shutil.copy(SRC / 'assets' / f, out / 'assets' / f)
    client = patch_client((SRC / 'assets/client.js').read_text(encoding='utf-8'))
    core = patch_core((SRC / 'assets/core.js').read_text(encoding='utf-8'))
    (out / 'assets/client.js').write_text(client, encoding='utf-8')
    (out / 'assets/core.js').write_text(core, encoding='utf-8')
    admin = (SRC / 'admin.html').read_text(encoding='utf-8')
    admin = sub(admin, '</style>', ADMIN_FIX)
    admin = admin.replace('?v=1', '?v=' + V).replace('?v=2', '?v=' + V).replace('?v=3', '?v=' + V)
    admin = sub(admin, '<title>', '<title>[' + meta['name'] + '] ')
    (out / 'admin.html').write_text(admin, encoding='utf-8')
    (out / 'config.js').write_text(
        "/* KIRD 나눔마켓 " + meta['name'] + " 설정\n"
        " * api: 비워 두면 「데모 모드」 — 입찰이 각자 브라우저에만 저장돼요. 실제로 쓸 때 Apps Script 웹 앱 주소(…/exec)를 넣으세요.\n"
        " * ns: 시안끼리 데모 저장 공간을 나누는 이름 (바꾸지 않아도 됨)\n"
        " */\nwindow.MARKET_CONFIG = {\n  api: '',\n  poll: 12000,\n  ns: '" + key + "'\n};\n", encoding='utf-8')
    gas = (SRC / 'apps-script/gas.js').read_text(encoding='utf-8')
    shutil.copy(SRC / 'apps-script/gas.js', out / 'apps-script/gas.js')
    head = ('/* KIRD 나눔마켓 (' + meta['name'] + ') — Google Apps Script 백엔드 (자동 생성: dev/market-v2/build.py)\n'
            ' * 사용법: 구글 시트 → 확장 프로그램 → Apps Script → Code.gs 내용을 이 파일로 바꾸고 저장 → (처음이면 setup 실행) → 배포 관리에서 새 버전 */\n\n')
    (out / 'apps-script/Code.gs').write_text(head + core + '\n\n' + gas, encoding='utf-8')
    # 화면
    shutil.copy(HERE / 'common/bidder.js', out / 'assets/bidder.js')
    shutil.copy(HERE / 'common/base.css', out / 'assets/base.css')
    th = HERE / 'themes' / key
    shutil.copy(th / 'theme.js', out / 'assets/theme.js')
    shutil.copy(th / 'theme.css', out / 'assets/theme.css')
    for extra in list(th.glob('*.png')) + list(th.glob('*.woff')):
        shutil.copy(extra, out / 'assets' / extra.name)
    for lic in th.glob('*-OFL.txt'):
        shutil.copy(lic, out / 'assets' / lic.name)
    tpl = (HERE / 'common/index.tpl.html').read_text(encoding='utf-8')
    frag = lambda n: (th / (n + '.html')).read_text(encoding='utf-8').strip() if (th / (n + '.html')).exists() else ''
    html = (tpl.replace('{{HEAD}}', frag('head')).replace('{{HERO}}', frag('hero')).replace('{{TOP_EXTRA}}', frag('top'))
            .replace('{{GRID_BEFORE}}', frag('grid_before')).replace('{{LOGIN_TOP}}', frag('login_top') or '<div class="ic" data-ic="key" data-s="28"></div>')
            .replace('{{VARIANT}}', key).replace('{{THEME_COLOR}}', meta['color']).replace('{{V}}', V))
    (out / 'index.html').write_text(html, encoding='utf-8')
    (out / 'README.md').write_text(
        '# KIRD 나눔마켓 — ' + meta['name'] + '\n\n'
        '써 보기용 시안입니다. 지금은 **데모 모드**라 입찰이 각자 브라우저에만 저장돼요.\n\n'
        '- 직원 화면: `index.html` · 관리자 화면: `admin.html` (비밀번호 `demo`)\n'
        '- 체험 코드: `TEST-AAAA`, `TEST-BBBB`, `TEST-CCCC` · 입찰 기록이 있는 예시: `ZZXA-MP23`\n'
        '- 실제로 쓰려면: `config.js` 의 `api` 에 Apps Script 웹 앱 주소를 넣고, 서버에는 이 폴더의 `apps-script/Code.gs` 를 새 버전으로 배포\n'
        '- 고칠 때는 이 폴더를 직접 고치지 말고 `dev/market-v2/` 를 고친 뒤 `python3 dev/market-v2/build.py`\n', encoding='utf-8')
    print(meta['dir'], 'ok')


if __name__ == '__main__':
    for k, m in VARIANTS.items():
        if (HERE / 'themes' / k / 'theme.js').exists():
            build(k, m)
