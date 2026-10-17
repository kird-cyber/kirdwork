"""Generate high-quality tank SVGs (v2). Light from top-left, hue-shifted ramps, selective colored outlines."""
import os, math

OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 256, 192
GROUND = 178


class S:
    def __init__(self, key):
        self.key = key
        self.defs = []
        self.body = []

    def id(self, n):
        return f"{self.key}-{n}"

    def lg(self, n, stops, x1=0, y1=0, x2=0, y2=1):
        st = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
        self.defs.append(f'<linearGradient id="{self.id(n)}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{st}</linearGradient>')
        return f"url(#{self.id(n)})"

    def rg(self, n, stops, cx=0.35, cy=0.3, r=0.75):
        st = ""
        for t in stops:
            a = f' stop-opacity="{t[2]}"' if len(t) > 2 else ""
            st += f'<stop offset="{t[0]}" stop-color="{t[1]}"{a}/>'
        self.defs.append(f'<radialGradient id="{self.id(n)}" cx="{cx}" cy="{cy}" r="{r}">{st}</radialGradient>')
        return f"url(#{self.id(n)})"

    def add(self, *parts):
        self.body.extend(parts)

    def split(self):
        body, wpn, cur = [], [], None
        for p in self.body:
            if p == "§WS": cur = wpn; continue
            if p == "§WE": cur = None; continue
            (cur if cur is not None else body).append(p)
        head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>{"".join(self.defs)}</defs>'
        return head + "".join(body) + "</svg>", (head + "".join(wpn) + "</svg>") if wpn else None

    def svg(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
                f'<defs>{"".join(self.defs)}</defs>' + "".join(p for p in self.body if p not in ("§WS", "§WE")) + "</svg>")


def ramp(hl, base, mid, deep):
    return [(0, hl), (0.35, base), (0.75, mid), (1, deep)]


def shadow(s, cx=128, rx=92):
    g = s.rg("shadow", [(0, "#000", 0.38), (0.7, "#000", 0.16), (1, "#000", 0)], cx=0.5, cy=0.5, r=0.5)
    s.add(f'<ellipse cx="{cx}" cy="{GROUND}" rx="{rx}" ry="10" fill="{g}"/>')


def treads(s, x, y, w, h, n, pal, ol, neon=None):
    """pal: dict hl, base, mid, deep, wheel_hl, wheel, wheel_deep, hub"""
    trk = s.lg("trk", [(0, pal["mid"]), (0.5, pal["deep"]), (1, pal["deep"])])
    r = h / 2
    s.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{trk}" stroke="{ol}" stroke-width="3.5"/>')
    # tread teeth: outer dashed ring
    s.add(f'<rect x="{x+2.5}" y="{y+2.5}" width="{w-5}" height="{h-5}" rx="{r-2.5}" fill="none" stroke="{pal["base"]}" stroke-width="3" stroke-dasharray="5 4" opacity="0.85"/>')
    # inner well
    s.add(f'<rect x="{x+7}" y="{y+7}" width="{w-14}" height="{h-14}" rx="{r-7}" fill="{pal["deep"]}" opacity="0.9"/>')
    wr = h * 0.3
    wg = s.rg("whl", [(0, pal["wheel_hl"]), (0.55, pal["wheel"]), (1, pal["wheel_deep"])])
    xs = [x + r + (w - 2 * r) * i / (n - 1) for i in range(n)]
    cy = y + h / 2
    for i, cx in enumerate(xs):
        rr = wr * (1.12 if i in (0, n - 1) else 1)
        s.add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rr:.1f}" fill="{wg}" stroke="{ol}" stroke-width="2.5"/>')
        s.add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rr*0.42:.1f}" fill="{pal["hub"]}" stroke="{ol}" stroke-width="1.5"/>')
        s.add(f'<circle cx="{cx-rr*0.38:.1f}" cy="{cy-rr*0.42:.1f}" r="{rr*0.18:.1f}" fill="#fff" opacity="0.55"/>')
    # top run highlight
    s.add(f'<path d="M{x+r} {y+2.2} L{x+w-r} {y+2.2}" stroke="{pal["hl"]}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>')
    if neon:
        s.add(f'<rect x="{x+r}" y="{y+h-6}" width="{w-2*r}" height="3" rx="1.5" fill="{neon}"/>')


def glint(s, x, y, rx=4, ry=2.2, rot=-20, op=0.8):
    s.add(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{op}" transform="rotate({rot} {x} {y})"/>')


def eye(s, x, y, w, h, ol, glow, skew=0):
    """visor 'eye' — the tank's face"""
    s.add(f'<path d="M{x} {y+skew} L{x+w} {y} L{x+w-2} {y+h} L{x+2} {y+h+skew*0.3} Z" fill="#141019" stroke="{ol}" stroke-width="2.5" stroke-linejoin="round"/>')
    s.add(f'<path d="M{x+w*0.35} {y+h*0.5} L{x+w*0.8} {y+h*0.45}" stroke="{glow}" stroke-width="{h*0.42:.1f}" stroke-linecap="round"/>')
    s.add(f'<circle cx="{x+w*0.74}" cy="{y+h*0.36}" r="{h*0.14:.1f}" fill="#fff"/>')


def bolt(s, x, y, r, base, ol):
    s.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{base}" stroke="{ol}" stroke-width="1.2"/>'
          f'<circle cx="{x-r*0.35}" cy="{y-r*0.35}" r="{r*0.35}" fill="#fff" opacity="0.6"/>')


# ---------------------------------------------------------------- BOULDER
def boulder():
    s = S("bo")
    ol = "#2E211B"
    shadow(s, 126, 96)
    wood = s.lg("wood", [(0, "#F6C784"), (0.4, "#CF8A47"), (1, "#7E4522")])
    woodside = s.lg("woodside", [(0, "#B87439"), (1, "#5C2F17")])
    # A-frame supports behind arm
    s.add(f'<path d="M108 116 L128 82 L136 82 L124 116 Z" fill="{woodside}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    s.add("§WS")
    # arm (beam) rotated
    s.add('<g transform="rotate(46 132 92)">')
    s.add(f'<path d="M70 86 L140 84 Q146 92 140 100 L70 98 Q66 92 70 86 Z" fill="{wood}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add('<path d="M76 88.5 L132 87" stroke="#FFE2B0" stroke-width="2" stroke-linecap="round" opacity="0.8"/>')
    s.add('<path d="M70 94 q8 2 16 0 M98 95 q10 2 20 -1" stroke="#8E5228" stroke-width="1.5" fill="none" opacity="0.8"/>')
    for bx in (86, 114):
        s.add(f'<rect x="{bx}" y="83" width="7" height="18" rx="2" fill="#7A818F" stroke="{ol}" stroke-width="2"/>')
        s.add(f'<rect x="{bx+1.5}" y="84.5" width="2" height="15" fill="#C9D1DE" opacity="0.8"/>')
    s.add('</g>')
    # cup + boulder (at arm end, computed)
    ang = math.radians(46)
    ex, ey = 132 + (70 - 132) * math.cos(ang) - (92 - 92) * math.sin(ang), 92 + (70 - 132) * math.sin(ang)
    cup = s.lg("cup", [(0, "#A9663A"), (1, "#5C2F17")])
    s.add(f'<path d="M{ex-22:.1f} {ey-6:.1f} Q{ex-4:.1f} {ey+18:.1f} {ex+16:.1f} {ey+2:.1f} L{ex+12:.1f} {ey-6:.1f} Q{ex-4:.1f} {ey+6:.1f} {ex-16:.1f} {ey-12:.1f} Z" fill="{cup}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    stone = s.rg("stone", [(0, "#F1E9D6"), (0.45, "#B5AA95"), (1, "#5E554A")], cx=0.32, cy=0.28, r=0.8)
    bx, by = ex - 4, ey - 18
    s.add(f'<path d="M{bx-19} {by+2} Q{bx-20} {by-16} {bx-4} {by-20} Q{bx+14} {by-22} {bx+20} {by-6} Q{bx+24} {by+12} {bx+6} {by+18} Q{bx-14} {by+20} {bx-19} {by+2} Z" fill="{stone}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add(f'<path d="M{bx-6} {by-6} l7 4 l-2 8 M{bx+8} {by+6} l6 2" stroke="#6A5F52" stroke-width="2" fill="none" stroke-linecap="round"/>')
    s.add(f'<path d="M{bx-12} {by-10} q4 -6 10 -7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>')
    s.add(f'<ellipse cx="{bx+10}" cy="{by+12}" rx="5" ry="3" fill="#7FA24A" opacity="0.85"/>')
    s.add("§WE")
    # treads
    treads(s, 36, 138, 180, 34, 5, dict(hl="#9C8468", base="#6E5A47", mid="#4E3F33", deep="#2F2621",
                                        wheel_hl="#D7B98E", wheel="#8E6B48", wheel_deep="#4E3826", hub="#4B4F59"), ol)
    # hull: stone fortress body
    st = s.lg("hull", ramp("#F2E7C9", "#CDBE9A", "#9E8C6C", "#6E5D4A"))
    s.add(f'<path d="M40 142 L50 104 Q54 92 66 92 L170 90 Q184 90 190 102 L206 142 Z" fill="{st}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    # stone blocks: seams + bevel highlights
    s.add('<path d="M48 116 L198 114 M46 129 L202 128" stroke="#7F6F57" stroke-width="2.2" fill="none"/>')
    for x0, y0, y1 in ((88, 92, 116), (132, 91, 116), (70, 116, 129), (112, 115, 129), (156, 115, 128), (94, 129, 142), (144, 128, 142), (182, 128, 142)):
        s.add(f'<path d="M{x0} {y0} L{x0-1} {y1}" stroke="#7F6F57" stroke-width="2.2"/>')
        s.add(f'<path d="M{x0+2} {y0+2} L{x0+1.5} {y1-2}" stroke="#FFF6DD" stroke-width="1.2" opacity="0.7"/>')
    s.add('<path d="M58 96 L168 94" stroke="#FFF8E6" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>')
    # moss tufts
    s.add('<path d="M52 104 q4 -6 8 0 q4 -5 7 1" fill="#86AA4C" stroke="#4F6B2A" stroke-width="1.5"/>')
    # iron front plate + spikes
    s.add(f'<path d="M186 100 L206 142 L196 142 L180 104 Z" fill="#5E6676" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    for yy in (112, 126):
        s.add(f'<path d="M199 {yy} l12 3 l-10 5 Z" fill="#AEB7C7" stroke="{ol}" stroke-width="2" stroke-linejoin="round"/>')
    eye(s, 154, 100, 26, 10, ol, "#FFC34A")
    # pivot hub
    hub = s.rg("hub", [(0, "#D7DEEA"), (0.5, "#7A8496"), (1, "#3A4050")])
    s.add(f'<circle cx="132" cy="92" r="12" fill="{hub}" stroke="{ol}" stroke-width="3.5"/>')
    s.add('<circle cx="132" cy="92" r="4.5" fill="#E8A54A" stroke="#2E211B" stroke-width="1.5"/>')
    # rope coil
    s.add('<ellipse cx="74" cy="100" rx="11" ry="5" fill="#C7A36A" stroke="#2E211B" stroke-width="2"/><ellipse cx="74" cy="99" rx="6" ry="2.4" fill="#8B6B3C"/>')
    return s


# ---------------------------------------------------------------- VIPER
def viper():
    s = S("vi")
    ol = "#1F1230"
    shadow(s, 124, 90)
    # poison capsule (behind)
    glass = s.lg("glass", [(0, "#F4FFF0"), (0.5, "#CDEBD0"), (1, "#8DB89A")], 0, 0, 1, 0)
    liq = s.lg("liq", [(0, "#E6FF8A"), (0.5, "#8EDB3A"), (1, "#3E9A2E")])
    s.add(f'<rect x="54" y="52" width="34" height="56" rx="12" fill="{glass}" stroke="{ol}" stroke-width="3.5"/>')
    s.add(f'<path d="M57 72 Q71 66 85 72 L85 96 Q85 105 76 105 L66 105 Q57 105 57 96 Z" fill="{liq}"/>')
    s.add('<path d="M57 72 Q71 66 85 72" stroke="#F4FFB0" stroke-width="2" fill="none"/>')
    for cx, cy, r in ((66, 86, 3), (76, 94, 2.2), (71, 78, 1.8), (79, 82, 1.4)):
        s.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#F4FFB0" opacity="0.9"/>')
    s.add('<rect x="60" y="58" width="5" height="40" rx="2.5" fill="#fff" opacity="0.55"/>')
    cap = s.lg("cap", [(0, "#B9A3D6"), (1, "#4A3170")])
    s.add(f'<rect x="58" y="44" width="26" height="12" rx="3" fill="{cap}" stroke="{ol}" stroke-width="3"/>')
    s.add(f'<rect x="58" y="104" width="26" height="8" rx="3" fill="{cap}" stroke="{ol}" stroke-width="3"/>')
    # tube from capsule to bolt rail
    s.add(f'<path d="M84 50 Q110 40 118 74" stroke="{ol}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M84 50 Q110 40 118 74" stroke="#7DD13A" stroke-width="3.5" fill="none" stroke-linecap="round"/>')
    treads(s, 42, 140, 168, 32, 4, dict(hl="#8A75A8", base="#5D4A7A", mid="#3D2E55", deep="#251A36",
                                        wheel_hl="#C8B4E4", wheel="#7A62A0", wheel_deep="#3E2C5C", hub="#2A1E3E"), ol)
    # hull
    hull = s.lg("hull", ramp("#D8B6F2", "#8E62BC", "#62408E", "#3E2766"))
    s.add(f'<path d="M44 144 L54 112 Q58 100 72 100 L156 98 Q168 98 178 106 L208 126 L200 144 Z" fill="{hull}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    # scales
    for row, (y0, x0, x1) in enumerate(((116, 62, 176), (128, 56, 190))):
        x = x0 + (row * 5)
        d = ""
        while x < x1:
            d += f"M{x} {y0} q5 -6 10 0 "
            x += 10
        s.add(f'<path d="{d}" stroke="#B48ADB" stroke-width="2" fill="none" opacity="0.75"/>')
    s.add('<path d="M64 104 L156 102 Q166 102 174 108" stroke="#F0DDFF" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.9"/>')
    # snake-head prow with fang
    s.add(f'<path d="M200 128 L214 132 L200 138 Z" fill="#F2EEE0" stroke="{ol}" stroke-width="2" stroke-linejoin="round"/>')
    eye(s, 166, 106, 22, 9, ol, "#B6FF5A", skew=2)
    # mount
    mt = s.lg("mt", [(0, "#8F7AA8"), (1, "#3B2A52")])
    s.add(f'<path d="M110 100 L116 84 L134 84 L140 100 Z" fill="{mt}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    s.add("§WS")
    # crossbow stock
    stk = s.lg("stk", [(0, "#C98A55"), (1, "#5E3218")])
    s.add(f'<rect x="96" y="74" width="92" height="12" rx="5" fill="{stk}" stroke="{ol}" stroke-width="3"/>')
    s.add('<path d="M100 77 L184 77" stroke="#F3C48F" stroke-width="1.8" stroke-linecap="round"/>')
    # bow limbs
    limb = s.lg("limb", [(0, "#E3A066"), (1, "#6E3B1C")], 0, 0, 1, 0)
    s.add(f'<path d="M184 34 Q214 80 184 126" stroke="{ol}" stroke-width="13" fill="none" stroke-linecap="round"/>')
    s.add(f'<path d="M184 34 Q214 80 184 126" stroke="{limb}" stroke-width="7.5" fill="none" stroke-linecap="round"/>')
    s.add('<path d="M190 46 Q204 70 200 86" stroke="#FFD9A8" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>')
    for yy in (34, 126):
        s.add(f'<circle cx="184" cy="{yy}" r="5" fill="#AEB7C7" stroke="{ol}" stroke-width="2.5"/>')
    s.add('<path d="M184 34 L160 80 L184 126" stroke="#F4ECD4" stroke-width="2" fill="none"/>')
    # bolt
    s.add(f'<path d="M110 80 L222 80" stroke="{ol}" stroke-width="7" stroke-linecap="round"/><path d="M110 80 L222 80" stroke="#E6D7B0" stroke-width="3" stroke-linecap="round"/>')
    s.add(f'<path d="M112 73 L124 80 L112 87 Z" fill="#7DD13A" stroke="{ol}" stroke-width="2"/>')
    head = s.lg("head", [(0, "#F2FF9A"), (1, "#3E9A2E")])
    s.add(f'<path d="M218 70 L240 80 L218 90 L222 80 Z" fill="{head}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    s.add('<circle cx="234" cy="72" r="2" fill="#B6FF5A"/><circle cx="240" cy="88" r="1.6" fill="#B6FF5A"/>')
    s.add("§WE")
    return s


# ---------------------------------------------------------------- HAMMER
def hammer():
    s = S("ha")
    ol = "#2A150C"
    shadow(s, 122, 94)
    # ammo crate behind
    crate = s.lg("crate", [(0, "#D8A060"), (1, "#7A4420")])
    s.add(f'<rect x="34" y="94" width="40" height="32" rx="4" fill="{crate}" stroke="{ol}" stroke-width="3"/>')
    s.add('<path d="M34 110 L74 110 M54 94 L54 126" stroke="#6A3A1A" stroke-width="2"/>')
    for x in (42, 52, 62):
        s.add(f'<path d="M{x} 94 L{x} 84 Q{x+4} 76 {x+8} 84 L{x+8} 94 Z" fill="#E8402E" stroke="{ol}" stroke-width="2"/>')
        s.add(f'<path d="M{x+2} 90 L{x+2} 85" stroke="#FFB49A" stroke-width="1.5" stroke-linecap="round"/>')
    s.add("§WS")
    # barrel
    br = s.lg("brz", [(0, "#FFE6A8"), (0.3, "#E9A84E"), (0.75, "#B06A2A"), (1, "#6E3A1A")])
    lip = s.lg("lip", [(0, "#F6C474"), (1, "#7E4720")])
    s.add('<g transform="rotate(-36 112 104)">')
    s.add(f'<path d="M104 80 L188 76 Q194 76 194 82 L194 126 Q194 132 188 132 L104 128 Q96 104 104 80 Z" fill="{br}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M108 85 L186 82" stroke="#FFF4D2" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>')
    # glowing red band
    hot = s.lg("hot", [(0, "#FFB08A"), (0.5, "#F0442E"), (1, "#8E1A1E")])
    s.add(f'<rect x="136" y="78" width="15" height="52" fill="{hot}" stroke="{ol}" stroke-width="3"/>')
    s.add('<rect x="139" y="81" width="4" height="46" fill="#FFE0CF" opacity="0.7"/>')
    s.add(f'<rect x="186" y="68" width="26" height="72" rx="7" fill="{lip}" stroke="{ol}" stroke-width="4"/>')
    s.add('<rect x="190" y="72" width="5" height="62" rx="2" fill="#FFE6A8" opacity="0.85"/>')
    s.add('<ellipse cx="209" cy="104" rx="4" ry="27" fill="#1A0C06"/>')
    for yy in (90, 118):
        s.add(f'<circle cx="166" cy="{yy}" r="3" fill="#6E3A1A"/><circle cx="165" cy="{yy-1}" r="1.1" fill="#FFE6A8"/>')
    s.add('</g>')
    # heat glow
    glow = s.rg("glow", [(0, "#FF7A4A", 0.55), (1, "#FF7A4A", 0)], cx=0.5, cy=0.5, r=0.5)
    s.add(f'<circle cx="150" cy="80" r="26" fill="{glow}"/>')
    s.add("§WE")
    # carriage
    car = s.lg("car", ramp("#D4DCEA", "#8792AA", "#58627C", "#363D52"))
    s.add(f'<path d="M48 140 L60 106 Q63 98 72 98 L154 98 Q164 98 168 106 L178 140 Z" fill="{car}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M68 102 L156 102" stroke="#F2F6FF" stroke-width="2.2" stroke-linecap="round"/>')
    s.add('<path d="M54 124 L174 124" stroke="#4A5269" stroke-width="2"/>')
    for x in range(70, 166, 16):
        bolt(s, x, 112, 2.6, "#B8C1D3", ol)
    # gunner shield w/ eye
    sh = s.lg("sh", [(0, "#AEB8CC"), (1, "#454D63")])
    s.add(f'<path d="M150 98 L158 76 L176 80 L172 106 Z" fill="{sh}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    eye(s, 157, 84, 15, 7, ol, "#FFB14A")
    # pivot
    pv = s.rg("pv", [(0, "#FFC8A8"), (0.45, "#E8402E"), (1, "#7A1418")])
    s.add(f'<circle cx="112" cy="104" r="15" fill="{pv}" stroke="{ol}" stroke-width="4"/>')
    s.add('<circle cx="112" cy="104" r="6" fill="#FFD9C0" opacity="0.9"/>')
    # big spoked wheels
    for cx in (72, 156):
        wg = s.rg(f"wh{cx}", [(0, "#C98A55"), (0.7, "#7A4A28"), (1, "#3E220F")], cx=0.4, cy=0.35, r=0.7)
        s.add(f'<circle cx="{cx}" cy="150" r="27" fill="#3A2412" stroke="{ol}" stroke-width="4"/>')
        s.add(f'<circle cx="{cx}" cy="150" r="21" fill="{wg}"/>')
        for k in range(8):
            a = math.pi * k / 4
            s.add(f'<path d="M{cx} 150 L{cx+19*math.cos(a):.1f} {150+19*math.sin(a):.1f}" stroke="#4A2A12" stroke-width="3.5" stroke-linecap="round"/>')
        s.add(f'<circle cx="{cx}" cy="150" r="27" fill="none" stroke="#8E929C" stroke-width="3.5"/>')
        s.add(f'<path d="M{cx-22} 138 A26 26 0 0 1 {cx-6} 125" stroke="#E2E6EE" stroke-width="2" fill="none" stroke-linecap="round"/>')
        s.add(f'<circle cx="{cx}" cy="150" r="7.5" fill="#E9A84E" stroke="{ol}" stroke-width="2.5"/><circle cx="{cx-2}" cy="148" r="2.2" fill="#FFF4D2"/>')
    return s


# ---------------------------------------------------------------- ROOKIE
def rookie():
    s = S("ro")
    ol = "#1C2A12"
    shadow(s, 128, 98)
    # antenna + pennant
    s.add(f'<path d="M96 66 L88 20" stroke="{ol}" stroke-width="3" stroke-linecap="round"/>')
    pen = s.lg("pen", [(0, "#FFD27A"), (1, "#E8792A")], 0, 0, 1, 0)
    s.add(f'<path d="M88 20 Q100 22 114 28 Q100 30 89 36 Z" fill="{pen}" stroke="{ol}" stroke-width="2.5" stroke-linejoin="round"/>')
    s.add("§WS")
    # barrel
    bar = s.lg("bar", [(0, "#C8DE86"), (0.5, "#6D8F35"), (1, "#3B5420")])
    s.add(f'<rect x="150" y="70" width="64" height="14" rx="6" fill="{bar}" stroke="{ol}" stroke-width="3.5"/>')
    s.add('<path d="M156 73.5 L208 73.5" stroke="#F0FFC0" stroke-width="2" stroke-linecap="round"/>')
    s.add(f'<rect x="168" y="68" width="12" height="18" rx="3" fill="{bar}" stroke="{ol}" stroke-width="3"/>')
    mb = s.lg("mb", [(0, "#8C9AA8"), (1, "#3A4450")])
    s.add(f'<rect x="210" y="65" width="20" height="24" rx="4" fill="{mb}" stroke="{ol}" stroke-width="3.5"/>')
    s.add(f'<rect x="215" y="72" width="10" height="10" fill="#1C2A12"/>')
    s.add("§WE")
    treads(s, 32, 136, 192, 38, 5, dict(hl="#8E9870", base="#5C6446", mid="#3E4430", deep="#252A1C",
                                        wheel_hl="#D6E0A8", wheel="#7E8A58", wheel_deep="#3C4428", hub="#2C3220"), ol)
    # side skirt
    sk = s.lg("sk", ramp("#CFE68A", "#8DAE48", "#62822F", "#41591F"))
    s.add(f'<path d="M36 140 L48 106 Q52 96 64 96 L182 96 Q196 96 202 108 L222 140 Z" fill="{sk}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M56 101 L184 101" stroke="#F4FFCC" stroke-width="2.5" stroke-linecap="round"/>')
    s.add('<path d="M44 124 L214 124" stroke="#4E6B26" stroke-width="2"/>')
    for x in range(56, 210, 20):
        bolt(s, x, 131, 2.4, "#A8C266", ol)
    # chevron decal
    s.add('<path d="M64 106 l9 7 l9 -7 M64 113 l9 7 l9 -7" stroke="#FFF3C4" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    # headlight eye
    eye(s, 180, 104, 26, 10, ol, "#E8FF7A")
    # tool box
    s.add(f'<rect x="96" y="106" width="34" height="12" rx="2.5" fill="#5F7A30" stroke="{ol}" stroke-width="2.5"/><path d="M100 109 L126 109" stroke="#B8D07A" stroke-width="1.5"/>')
    # turret (egg proportion: big)
    tur = s.rg("tur", [(0, "#ECFFB0"), (0.35, "#A8C85C"), (0.8, "#6A8B33"), (1, "#45601F")], cx=0.35, cy=0.25, r=0.85)
    s.add(f'<path d="M80 98 Q80 52 122 50 Q164 52 166 98 Z" fill="{tur}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M92 76 Q98 60 116 56" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.65"/>')
    s.add('<path d="M84 90 L162 90" stroke="#55732A" stroke-width="2.2"/>')
    # hatch + periscope
    hat = s.lg("hat", [(0, "#C8DE86"), (1, "#55732A")])
    s.add(f'<ellipse cx="120" cy="54" rx="16" ry="6" fill="{hat}" stroke="{ol}" stroke-width="3"/>')
    s.add(f'<rect x="132" y="56" width="12" height="9" rx="2" fill="#2C3A1A" stroke="{ol}" stroke-width="2"/><rect x="134" y="58" width="6" height="3" fill="#9FE8FF"/>')
    # number plate
    s.add(f'<rect x="104" y="74" width="26" height="12" rx="3" fill="#FFF3C4" stroke="{ol}" stroke-width="2"/>')
    s.add(f'<path d="M110 80 L124 80" stroke="#E8792A" stroke-width="4" stroke-linecap="round"/>')
    return s


# ---------------------------------------------------------------- TRAPPER
def trapper():
    s = S("tr")
    ol = "#272010"
    shadow(s, 122, 100)
    # hopper with mines (behind)
    hop = s.lg("hop", ramp("#E8DC9A", "#A89C58", "#7C7140", "#524A28"))
    s.add(f'<path d="M40 104 L48 64 L112 64 L120 104 Z" fill="{hop}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add('<path d="M52 68 L108 68" stroke="#FFF8D0" stroke-width="2" stroke-linecap="round"/>')
    s.add('<path d="M46 84 L114 84" stroke="#6E643A" stroke-width="2"/>')
    mine = s.rg("mine", [(0, "#9AA0AA"), (0.5, "#454A54"), (1, "#1C1E24")], cx=0.35, cy=0.3, r=0.8)
    for cx, cy in ((60, 60), (86, 58), (104, 62)):
        s.add(f'<ellipse cx="{cx}" cy="{cy}" rx="14" ry="7.5" fill="{mine}" stroke="{ol}" stroke-width="3"/>')
        s.add(f'<rect x="{cx-4}" y="{cy-11}" width="8" height="5" rx="1.5" fill="#5A606C" stroke="{ol}" stroke-width="1.8"/>')
        s.add(f'<circle cx="{cx}" cy="{cy-12}" r="2.6" fill="#FF4A3A"/><circle cx="{cx}" cy="{cy-12}" r="5" fill="#FF4A3A" opacity="0.3"/>')
    # chute
    s.add(f'<path d="M22 112 L40 106 L40 126 L24 126 Z" fill="#6E643A" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    treads(s, 28, 140, 190, 34, 6, dict(hl="#A0966A", base="#6E6646", mid="#4C462F", deep="#2E2A1C",
                                        wheel_hl="#E2D8A8", wheel="#9A8E5A", wheel_deep="#544A2A", hub="#3A3420"), ol)
    # hull low & wide
    hull = s.lg("hull", ramp("#F2E8A8", "#C2B466", "#908244", "#5F5430"))
    s.add(f'<path d="M30 144 L40 112 Q44 102 56 102 L174 102 Q186 102 190 112 L198 144 Z" fill="{hull}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M48 107 L176 107" stroke="#FFFCE0" stroke-width="2.5" stroke-linecap="round"/>')
    s.add('<path d="M38 126 L194 126" stroke="#7C7140" stroke-width="2"/>')
    # hazard stripe band
    s.add(f'<rect x="60" y="130" width="70" height="8" rx="2" fill="#FFD24A" stroke="{ol}" stroke-width="1.8"/>')
    for x in range(62, 128, 10):
        s.add(f'<path d="M{x} 138 L{x+5} 130" stroke="{ol}" stroke-width="3"/>')
    for x in range(140, 192, 16):
        bolt(s, x, 134, 2.3, "#D8CC88", ol)
    # small turret + low barrel
    tg = s.lg("tg", [(0, "#F2E8A8"), (1, "#7C7140")])
    s.add("§WS")
    s.add(f'<rect x="150" y="90" width="64" height="10" rx="4.5" fill="#7C7140" stroke="{ol}" stroke-width="3.2"/>')
    s.add('<path d="M156 93 L208 93" stroke="#F2E8A8" stroke-width="1.8" stroke-linecap="round"/>')
    s.add("§WE")
    s.add(f'<path d="M124 102 Q124 82 144 80 L160 80 Q170 82 170 102 Z" fill="{tg}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add('<path d="M130 92 Q132 85 142 84" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>')
    eye(s, 172, 108, 18, 8, ol, "#FFD24A")
    # dozer blade + hydraulic arm
    s.add(f'<path d="M180 128 L206 120" stroke="{ol}" stroke-width="8" stroke-linecap="round"/><path d="M180 128 L206 120" stroke="#B8BFCC" stroke-width="4" stroke-linecap="round"/>')
    bl = s.lg("bl", [(0, "#FFE680"), (0.5, "#F0B42A"), (1, "#A8681A")], 0, 0, 1, 0)
    s.add(f'<path d="M204 96 Q228 128 208 172 L222 172 Q246 128 218 92 Z" fill="{bl}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    for yy in (108, 126, 144, 160):
        s.add(f'<path d="M{213 + (4 if yy in (126,144) else 0)} {yy} l12 7" stroke="{ol}" stroke-width="4.5" stroke-linecap="round"/>')
    s.add('<path d="M222 96 Q238 122 230 152" stroke="#FFF4C0" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>')
    return s


# ---------------------------------------------------------------- SWARM
def swarm():
    s = S("sw")
    ol = "#0E1C36"
    shadow(s, 128, 100)
    pod = s.lg("pod", ramp("#B8DCFF", "#4F8FDB", "#2F62A8", "#1E3F72"))
    face = s.lg("face", [(0, "#3A6CB0"), (1, "#152C52")])
    # support strut
    s.add(f'<path d="M100 120 L114 96" stroke="{ol}" stroke-width="10" stroke-linecap="round"/><path d="M100 120 L114 96" stroke="#9AB4D6" stroke-width="5" stroke-linecap="round"/>')
    s.add("§WS")
    s.add('<g transform="rotate(-24 104 116)">')
    s.add(f'<rect x="38" y="58" width="96" height="58" rx="9" fill="{pod}" stroke="{ol}" stroke-width="4"/>')
    s.add('<path d="M46 64 L126 64" stroke="#E6F3FF" stroke-width="2.5" stroke-linecap="round"/>')
    for yy in (78, 86, 94):
        s.add(f'<path d="M52 {yy} L92 {yy}" stroke="#1E3F72" stroke-width="2.4" stroke-linecap="round"/>')
    s.add(f'<rect x="100" y="76" width="22" height="14" rx="2" fill="#FFD24A" stroke="{ol}" stroke-width="2"/>')
    s.add(f'<path d="M104 80 l6 6 M110 80 l6 6" stroke="{ol}" stroke-width="2"/>')
    s.add(f'<rect x="130" y="54" width="40" height="66" rx="6" fill="{face}" stroke="{ol}" stroke-width="4"/>')
    nose = s.rg("nose", [(0, "#FFE0B0"), (0.5, "#FF7A3A"), (1, "#B03A16")], cx=0.35, cy=0.3, r=0.8)
    for cy in (68, 87, 106):
        for cx in (140, 150, 160):
            s.add(f'<circle cx="{cx}" cy="{cy}" r="6" fill="#0A1426"/>')
            s.add(f'<circle cx="{cx+1}" cy="{cy}" r="4.6" fill="{nose}" stroke="{ol}" stroke-width="1.3"/>')
    s.add('</g>')
    s.add("§WE")
    # chassis
    ch = s.lg("ch", ramp("#A8CCF6", "#4C7FC0", "#2F5A96", "#1E3C68"))
    s.add(f'<rect x="30" y="118" width="190" height="28" rx="9" fill="{ch}" stroke="{ol}" stroke-width="4"/>')
    s.add('<path d="M40 122.5 L210 122.5" stroke="#E6F3FF" stroke-width="2" stroke-linecap="round"/>')
    s.add(f'<rect x="40" y="130" width="110" height="7" rx="3" fill="#1E3C68"/>')
    # cab
    cab = s.lg("cab", ramp("#C8E4FF", "#5C98E0", "#3A6EB4", "#24487E"))
    s.add(f'<path d="M160 120 L164 80 Q166 72 174 72 L204 72 Q214 72 216 82 L226 120 Z" fill="{cab}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    win = s.lg("win", [(0, "#E8F8FF"), (0.5, "#8FD0F8"), (1, "#3A84C0")])
    s.add(f'<path d="M172 80 L204 80 L212 102 L170 102 Z" fill="{win}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    s.add('<path d="M180 84 L174 98 M190 84 L183 98" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.75"/>')
    # headlight eye
    hl = s.rg("hl", [(0, "#FFFFFF"), (0.4, "#FFF0A0"), (1, "#E8B03A")], cx=0.4, cy=0.4, r=0.7)
    s.add(f'<rect x="214" y="106" width="12" height="9" rx="3" fill="{hl}" stroke="{ol}" stroke-width="2.5"/>')
    s.add('<circle cx="166" cy="110" r="2.4" fill="#BFDCF8"/>')
    # wheels
    for cx in (62, 108, 190):
        tg = s.rg(f"t{cx}", [(0, "#5A6476"), (0.7, "#2B3240"), (1, "#141820")], cx=0.4, cy=0.35, r=0.75)
        s.add(f'<circle cx="{cx}" cy="152" r="21" fill="{tg}" stroke="{ol}" stroke-width="4"/>')
        s.add(f'<circle cx="{cx}" cy="152" r="17.5" fill="none" stroke="#454E60" stroke-width="3.5" stroke-dasharray="4 3.5"/>')
        rim = s.rg(f"r{cx}", [(0, "#E6F0FF"), (0.6, "#8AA0BB"), (1, "#4A5A72")], cx=0.4, cy=0.35, r=0.7)
        s.add(f'<circle cx="{cx}" cy="152" r="9" fill="{rim}" stroke="{ol}" stroke-width="2.5"/><circle cx="{cx}" cy="152" r="3" fill="#2B3240"/>')
    return s


# ---------------------------------------------------------------- PRISM
def prism():
    s = S("pr")
    ol = "#0B0818"
    g = s.rg("shadow2", [(0, "#000", 0.28), (1, "#000", 0)], cx=0.5, cy=0.5, r=0.5)
    s.add(f'<ellipse cx="124" cy="{GROUND}" rx="74" ry="8" fill="{g}"/>')
    hov = s.rg("hov", [(0, "#BFFFF8", 0.95), (0.4, "#3FF0E0", 0.55), (1, "#3FF0E0", 0)], cx=0.5, cy=0.4, r=0.55)
    s.add(f'<ellipse cx="124" cy="160" rx="86" ry="16" fill="{hov}"/>')
    for x in (76, 118, 160):
        s.add(f'<path d="M{x} 150 L{x-4} 166" stroke="#7FFFF2" stroke-width="2" stroke-linecap="round" opacity="0.6"/>')
    # rear fin
    fin = s.lg("fin", [(0, "#8C7FD0"), (1, "#2A2350")])
    s.add(f'<path d="M44 124 L24 92 Q22 86 28 88 L66 100 Z" fill="{fin}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add('<path d="M30 92 L56 101" stroke="#3FF0E0" stroke-width="2" stroke-linecap="round"/>')
    # hover pods
    pod = s.lg("pod", [(0, "#6C5FA8"), (1, "#18122E")])
    for x in (56, 140):
        s.add(f'<path d="M{x} 132 L{x+56} 132 L{x+50} 150 L{x+6} 150 Z" fill="{pod}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
        s.add(f'<rect x="{x+10}" y="146" width="36" height="5" rx="2.5" fill="#BFFFF8"/>')
    # hull wedge
    hull = s.lg("hull", ramp("#9C8FE0", "#4A4088", "#30285E", "#1C1638"))
    s.add(f'<path d="M38 132 L58 98 Q62 92 70 92 L172 86 Q182 86 190 92 L230 114 Q234 118 228 122 L208 138 L44 140 Z" fill="{hull}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M64 97 L172 91 Q180 91 186 95 L222 114" stroke="#D4CCFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.9"/>')
    s.add('<path d="M56 122 L210 120" stroke="#1C1638" stroke-width="2"/>')
    # cyan light strip
    strip = s.lg("strip", [(0, "#3FF0E0"), (1, "#B6FFF8")], 0, 0, 1, 0)
    s.add(f'<path d="M66 114 L200 108" stroke="{strip}" stroke-width="5" stroke-linecap="round"/>')
    s.add('<path d="M66 114 L200 108" stroke="#3FF0E0" stroke-width="11" stroke-linecap="round" opacity="0.2"/>')
    eye(s, 186, 100, 26, 9, ol, "#7FFFF2", skew=1)
    # emitter
    em = s.rg("em", [(0, "#FFFFFF"), (0.35, "#7FFFF2"), (1, "#1FA8A0")], cx=0.45, cy=0.45, r=0.6)
    s.add(f'<circle cx="226" cy="118" r="16" fill="#3FF0E0" opacity="0.18"/>')
    s.add(f'<circle cx="226" cy="118" r="8.5" fill="{em}" stroke="{ol}" stroke-width="3"/>')
    # crystal
    c1 = s.lg("c1", [(0, "#F4F0FF"), (1, "#A898F0")])
    c2 = s.lg("c2", [(0, "#B9A6FF"), (1, "#5A40C8")])
    c3 = s.lg("c3", [(0, "#8E78F0"), (1, "#3A2896")])
    s.add(f'<path d="M100 92 L124 22 L116 92 Z" fill="{c1}"/>')
    s.add(f'<path d="M116 92 L124 22 L140 92 Z" fill="{c2}"/>')
    s.add(f'<path d="M140 92 L124 22 L156 92 Z" fill="{c3}"/>')
    s.add(f'<path d="M100 92 L124 22 L156 92 Z" fill="none" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add(f'<path d="M124 22 L116 92 M124 22 L140 92" stroke="{ol}" stroke-width="1.6" opacity="0.7"/>')
    s.add('<path d="M110 74 L119 46" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')
    # sparkle
    s.add('<path d="M140 30 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#fff"/>')
    # crystal base ring
    ring = s.lg("ring", [(0, "#D4CCFF"), (1, "#3A3170")])
    s.add(f'<path d="M94 92 L162 92 L156 100 L100 100 Z" fill="{ring}" stroke="{ol}" stroke-width="3" stroke-linejoin="round"/>')
    return s


# ---------------------------------------------------------------- RAGE
def rage():
    s = S("ra")
    ol = "#1A0824"
    shadow(s, 124, 96)
    s.add("§WS")
    # dish mast
    mast = s.lg("mast", [(0, "#9A6AB8"), (1, "#3A1450")], 0, 0, 1, 0)
    s.add(f'<rect x="113" y="54" width="12" height="40" rx="3" fill="{mast}" stroke="{ol}" stroke-width="3"/>')
    dish = s.lg("dish", [(0, "#F6EEFF"), (0.5, "#CDB8E0"), (1, "#7E5C9C")])
    s.add(f'<path d="M80 46 Q119 82 158 46 Q150 42 119 44 Q88 42 80 46 Z" fill="{dish}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M90 50 Q112 66 134 58" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/>')
    s.add(f'<path d="M119 62 L119 22 M100 50 L119 26 M138 50 L119 26" stroke="{ol}" stroke-width="2.5" stroke-linecap="round"/>')
    tip = s.rg("tip", [(0, "#FFFFFF"), (0.4, "#FF7FA8"), (1, "#C01850")], cx=0.45, cy=0.4, r=0.65)
    s.add('<circle cx="119" cy="20" r="12" fill="#FF3D7A" opacity="0.22"/>')
    s.add(f'<circle cx="119" cy="20" r="6.5" fill="{tip}" stroke="{ol}" stroke-width="2.5"/>')
    s.add("§WE")
    # horns
    horn = s.lg("horn", [(0, "#E2A6F2"), (1, "#5E2878")])
    s.add(f'<path d="M70 98 L48 56 Q46 50 52 54 L94 92 Z" fill="{horn}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add(f'<path d="M156 96 L180 54 Q184 50 185 56 L178 98 Z" fill="{horn}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add('<path d="M56 62 L80 88" stroke="#FFD0F0" stroke-width="2" stroke-linecap="round" opacity="0.8"/>')
    treads(s, 34, 138, 186, 34, 5, dict(hl="#7A5A90", base="#4E3462", mid="#341F44", deep="#1F1029",
                                        wheel_hl="#D8A8F0", wheel="#7A4A98", wheel_deep="#3A1A50", hub="#1F1029"), ol, neon="#FF3D7A")
    # hull angular
    hull = s.lg("hull", ramp("#E2A6F2", "#9446B0", "#662A80", "#3E1656"))
    s.add(f'<path d="M38 142 L48 110 Q52 94 70 92 L170 92 Q188 94 196 108 L216 142 Z" fill="{hull}" stroke="{ol}" stroke-width="4" stroke-linejoin="round"/>')
    s.add('<path d="M58 98 L172 97 Q184 98 190 106" stroke="#FBE0FF" stroke-width="2.5" fill="none" stroke-linecap="round"/>')
    s.add('<path d="M46 124 L208 124" stroke="#4E1C66" stroke-width="2"/>')
    s.add('<path d="M70 132 L96 132 M196 132 L206 132" stroke="#FF3D7A" stroke-width="3" stroke-linecap="round"/>')
    # angry visor
    vis = s.lg("vis", [(0, "#FFB8D0"), (0.5, "#FF3D7A"), (1, "#B0104A")])
    s.add('<path d="M146 100 L208 110 L202 124 L146 118 Z" fill="#FF3D7A" opacity="0.25" transform="translate(0 -1) scale(1)"/>')
    s.add(f'<path d="M148 102 L204 110 L198 122 L148 116 Z" fill="{vis}" stroke="{ol}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.add('<path d="M156 106 L186 110" stroke="#FFF0F6" stroke-width="2.5" stroke-linecap="round"/>')
    # reactor core
    core = s.rg("core", [(0, "#FFFFFF"), (0.3, "#FFB8D0"), (0.7, "#FF3D7A"), (1, "#8A0E3A")], cx=0.45, cy=0.45, r=0.6)
    s.add('<circle cx="106" cy="110" r="20" fill="#FF3D7A" opacity="0.18"/>')
    s.add(f'<circle cx="106" cy="110" r="13" fill="#2A0E36" stroke="{ol}" stroke-width="3.5"/>')
    s.add(f'<circle cx="106" cy="110" r="9" fill="{core}"/>')
    for k in range(6):
        a = math.pi * k / 3
        s.add(f'<path d="M{106+10.5*math.cos(a):.1f} {110+10.5*math.sin(a):.1f} L{106+12.5*math.cos(a):.1f} {110+12.5*math.sin(a):.1f}" stroke="#FF7FA8" stroke-width="2"/>')
    for x in (62, 140):
        bolt(s, x, 110, 2.5, "#C88ADC", ol)
    return s


TANKS = dict(boulder=boulder, viper=viper, hammer=hammer, rookie=rookie, trapper=trapper, swarm=swarm, prism=prism, rage=rage)

if __name__ == "__main__":
    for k, f in TANKS.items():
        with open(os.path.join(OUT, f"{k}.svg"), "w") as fh:
            fh.write(f().svg())
    import json
    out = {}
    for k, f in TANKS.items():
        b, w = f().split()
        out[k] = {"body": b, "wpn": w}
    json.dump(out, open(os.path.join(OUT, "sprites.json"), "w"))
    print("ok")
