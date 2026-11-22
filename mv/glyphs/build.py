#!/usr/bin/env python3
"""Build atlas.png / atlas.json / preview.png / CREDITS.md: a 32x32 atlas of REAL writing.

    /root/miniconda3/bin/python3 build.py            # fetch missing sources, then build
    /root/miniconda3/bin/python3 build.py --no-fetch # build from ./src only

Every cell is a genuine character / word / symbol: rendered from an OFL font (with cmap + HarfBuzz
.notdef checks, so no tofu) or from an authentic source drawing (Wikimedia Commons "Ancient Chinese
characters project", zdic.net CC0 clerical-script vectors). Nothing is synthesised.
"""
import csv, hashlib, io, json, os, sys, unicodedata

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
FONTDIR = os.path.join(SRC, "fonts")
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import fetch  # noqa: E402

CELL, COLS = 128, 32
BOX = 100          # glyph fits a BOX x BOX square -> >= 14 px black padding in each 128 cell
SS = 4             # supersampling factor for the working raster
WBOX = BOX * SS    # 400 px working box
RENDER_PX = 360    # font size of the working raster
MIN_STROKE = 6.0   # minimum stroke width in final pixels (readable at ~30 px display)
MAX_COVER = 0.42   # dilation never pushes ink coverage of the bbox above this (no blobs)

# --------------------------------------------------------------------------------------------
# Fonts
# --------------------------------------------------------------------------------------------
FONTS = {  # key: (file, weight for variable fonts or None, display name, licence url dir)
    "kai": ("LXGWWenKai-Medium.ttf", None, "LXGW WenKai Medium (霞鹜文楷) v1.530", "https://github.com/lxgw/LxgwWenKai"),
    "xing": ("ZhiMangXing-Regular.ttf", None, "Zhi Mang Xing (智莽行)", "ofl/zhimangxing"),
    "cao": ("LiuJianMaoCao-Regular.ttf", None, "Liu Jian Mao Cao (刘建毛草)", "ofl/liujianmaocao"),
    "song": ("NotoSerifSC[wght].ttf", 600, "Noto Serif SC (思源宋体), wght 600", "ofl/notoserifsc"),
    "sc": ("NotoSansSC[wght].ttf", 500, "Noto Sans SC, wght 500", "ofl/notosanssc"),
    "jp": ("NotoSansJP[wght].ttf", 500, "Noto Sans JP, wght 500", "ofl/notosansjp"),
    "kr": ("NotoSansKR[wght].ttf", 500, "Noto Sans KR, wght 500", "ofl/notosanskr"),
    "sans": ("NotoSans[wdth,wght].ttf", 500, "Noto Sans, wght 500", "ofl/notosans"),
    "serif": ("NotoSerif[wdth,wght].ttf", 500, "Noto Serif, wght 500", "ofl/notoserif"),
    "mono": ("NotoSansMono[wdth,wght].ttf", 500, "Noto Sans Mono, wght 500", "ofl/notosansmono"),
    "math": ("NotoSansMath-Regular.ttf", None, "Noto Sans Math", "ofl/notosansmath"),
    "sym": ("NotoSansSymbols[wght].ttf", 500, "Noto Sans Symbols, wght 500", "ofl/notosanssymbols"),
    "sym2": ("NotoSansSymbols2-Regular.ttf", None, "Noto Sans Symbols 2", "ofl/notosanssymbols2"),
    "emoji": ("NotoEmoji[wght].ttf", 500, "Noto Emoji (monochrome), wght 500", "ofl/notoemoji"),
    "cuneiform": ("NotoSansCuneiform-Regular.ttf", None, "Noto Sans Cuneiform", "ofl/notosanscuneiform"),
    "egyptian": ("NotoSansEgyptianHieroglyphs-Regular.ttf", None, "Noto Sans Egyptian Hieroglyphs", "ofl/notosansegyptianhieroglyphs"),
    "anatolian": ("NotoSansAnatolianHieroglyphs-Regular.ttf", None, "Noto Sans Anatolian Hieroglyphs", "ofl/notosansanatolianhieroglyphs"),
    "linearb": ("NotoSansLinearB-Regular.ttf", None, "Noto Sans Linear B", "ofl/notosanslinearb"),
    "phoenician": ("NotoSansPhoenician-Regular.ttf", None, "Noto Sans Phoenician", "ofl/notosansphoenician"),
    "oldpersian": ("NotoSansOldPersian-Regular.ttf", None, "Noto Sans Old Persian", "ofl/notosansoldpersian"),
    "ugaritic": ("NotoSansUgaritic-Regular.ttf", None, "Noto Sans Ugaritic", "ofl/notosansugaritic"),
    "brahmi": ("NotoSansBrahmi-Regular.ttf", None, "Noto Sans Brahmi", "ofl/notosansbrahmi"),
    "kharoshthi": ("NotoSansKharoshthi-Regular.ttf", None, "Noto Sans Kharoshthi", "ofl/notosanskharoshthi"),
    "runic": ("NotoSansRunic-Regular.ttf", None, "Noto Sans Runic", "ofl/notosansrunic"),
    "ogham": ("NotoSansOgham-Regular.ttf", None, "Noto Sans Ogham", "ofl/notosansogham"),
    "olditalic": ("NotoSansOldItalic-Regular.ttf", None, "Noto Sans Old Italic", "ofl/notosansolditalic"),
    "gothic": ("NotoSansGothic-Regular.ttf", None, "Noto Sans Gothic", "ofl/notosansgothic"),
    "osa": ("NotoSansOldSouthArabian-Regular.ttf", None, "Noto Sans Old South Arabian", "ofl/notosansoldsoutharabian"),
    "tifinagh": ("NotoSansTifinagh-Regular.ttf", None, "Noto Sans Tifinagh", "ofl/notosanstifinagh"),
    "hebrew": ("NotoSansHebrew[wdth,wght].ttf", 500, "Noto Sans Hebrew, wght 500", "ofl/notosanshebrew"),
    "arabic": ("NotoNaskhArabic[wght].ttf", 600, "Noto Naskh Arabic, wght 600", "ofl/notonaskharabic"),
    "deva": ("NotoSansDevanagari[wdth,wght].ttf", 500, "Noto Sans Devanagari, wght 500", "ofl/notosansdevanagari"),
    "beng": ("NotoSansBengali[wdth,wght].ttf", 500, "Noto Sans Bengali, wght 500", "ofl/notosansbengali"),
    "taml": ("NotoSansTamil[wdth,wght].ttf", 500, "Noto Sans Tamil, wght 500", "ofl/notosanstamil"),
    "thai": ("NotoSansThai[wdth,wght].ttf", 500, "Noto Sans Thai, wght 500", "ofl/notosansthai"),
    "tibt": ("NotoSerifTibetan[wght].ttf", 600, "Noto Serif Tibetan, wght 600", "ofl/notoseriftibetan"),
    "mong": ("NotoSansMongolian-Regular.ttf", None, "Noto Sans Mongolian", "ofl/notosansmongolian"),
    "ethi": ("NotoSansEthiopic[wdth,wght].ttf", 500, "Noto Sans Ethiopic, wght 500", "ofl/notosansethiopic"),
    "armn": ("NotoSansArmenian[wdth,wght].ttf", 500, "Noto Sans Armenian, wght 500", "ofl/notosansarmenian"),
    "geor": ("NotoSansGeorgian[wdth,wght].ttf", 500, "Noto Sans Georgian, wght 500", "ofl/notosansgeorgian"),
    "cher": ("NotoSansCherokee[wght].ttf", 500, "Noto Sans Cherokee, wght 500", "ofl/notosanscherokee"),
    "khmr": ("NotoSansKhmer[wdth,wght].ttf", 500, "Noto Sans Khmer, wght 500", "ofl/notosanskhmer"),
    "sinh": ("NotoSansSinhala[wdth,wght].ttf", 500, "Noto Sans Sinhala, wght 500", "ofl/notosanssinhala"),
}
LANG = {"arabic": "ar", "hebrew": "he", "deva": "hi", "beng": "bn", "taml": "ta", "thai": "th", "tibt": "bo",
        "mong": "mn", "khmr": "km", "sinh": "si", "jp": "ja", "kr": "ko", "sc": "zh", "song": "zh"}
RTL = {"arabic", "hebrew", "phoenician", "osa"}
_pil_cache, _hb_cache, _cmap_cache = {}, {}, {}


def font_path(key):
    return os.path.join(FONTDIR, FONTS[key][0])


def pil_font(key, size=RENDER_PX):
    k = (key, size)
    if k not in _pil_cache:
        f = ImageFont.truetype(font_path(key), size, layout_engine=ImageFont.Layout.RAQM)
        w = FONTS[key][1]
        if w is not None:
            axes = f.get_variation_axes()
            vals = [max(a["minimum"], min(a["maximum"], w)) if a["name"] in (b"Weight", "Weight") else a["default"]
                    for a in axes]
            f.set_variation_by_axes(vals)
        _pil_cache[k] = f
    return _pil_cache[k]


def cmap(key):
    if key not in _cmap_cache:
        from fontTools.ttLib import TTFont
        _cmap_cache[key] = set(TTFont(font_path(key), lazy=True).getBestCmap().keys())
    return _cmap_cache[key]


IGNORABLE = {0x200C, 0x200D, 0xFE0E, 0xFE0F, 0x20}


def hb_ok(key, text, direction):
    """True iff HarfBuzz shapes `text` with no .notdef (gid 0) glyphs."""
    import uharfbuzz as hb
    if key not in _hb_cache:
        blob = hb.Blob.from_file_path(font_path(key))
        _hb_cache[key] = hb.Font(hb.Face(blob))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    if direction:
        buf.direction = direction
    hb.shape(_hb_cache[key], buf, {})
    return all(g.codepoint != 0 for g in buf.glyph_infos)


def covers(key, text):
    cm = cmap(key)
    return all(ord(ch) in cm or ord(ch) in IGNORABLE for ch in text)


# --------------------------------------------------------------------------------------------
# Rasterisation helpers (working raster = float32 0..1 ink, cropped to ink bbox)
# --------------------------------------------------------------------------------------------
def crop_ink(a, thr=0.02):
    ys, xs = np.where(a > thr)
    if len(xs) == 0:
        return None
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def render_text(key, text, vertical=False):
    f = pil_font(key)
    direction = "rtl" if key in RTL else None
    lang = LANG.get(key)
    d = ImageDraw.Draw(Image.new("L", (8, 8)))
    kw = dict(font=f, direction=direction, language=lang)
    bb = d.textbbox((0, 0), text, **kw)
    pad = RENDER_PX // 2
    im = Image.new("L", (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), 0)
    ImageDraw.Draw(im).text((pad - bb[0], pad - bb[1]), text, fill=255, **kw)
    if vertical:  # traditional Mongolian is written top-to-bottom: rotate the shaped line 90° clockwise
        im = im.rotate(-90, expand=True)
    return crop_ink(np.asarray(im, np.float32) / 255.0)


def load_raster(path):
    """Authentic source drawing (SVG, or Wikimedia's PNG rendering of it) -> ink array."""
    if path.endswith(".svg"):
        import cairosvg
        png = cairosvg.svg2png(url=path, output_width=1200)
        im = Image.open(io.BytesIO(png))
    else:
        im = Image.open(path)
    im = im.convert("RGBA")
    a = np.asarray(im, np.float32) / 255.0
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    # Dark strokes on transparent/white. The ACC project draws *context* strokes (the rest of the compound
    # character a component was taken from) in light grey: those are not part of the character -> dropped.
    ink = a[..., 3] * np.clip((0.55 - lum) / 0.4, 0, 1)
    # some source drawings use grey instead of black strokes: stretch so solid strokes are full white
    solid = ink[ink > 0.05]
    if solid.size:
        ink = np.clip(ink / max(np.percentile(solid, 90), 0.2), 0, 1)
    return crop_ink(ink, 0.05)


def has_grey_context(path):
    a = np.asarray(Image.open(path).convert("RGBA"), np.float32) / 255.0
    op, lum = a[..., 3] > 0.9, a[..., 0]
    return (op & (lum > 0.3) & (lum < 0.9)).sum() > 0.05 * (op & (lum < 0.1)).sum()


def stroke_width(b):
    """Mean stroke width of a binary mask ~ 2*area/perimeter."""
    area = b.sum()
    if area == 0:
        return 0.0
    er = ndimage.binary_erosion(b)
    per = (b & ~er).sum()
    return 2.0 * area / max(per, 1)


def normalise(ink, em_cap=None):
    """Scale ink into the WBOX working box, embolden hairlines, return final BOX-scale L image."""
    h, w = ink.shape
    s = min(WBOX / w, WBOX / h)
    if em_cap:
        s = min(s, em_cap)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    im = Image.fromarray((np.clip(ink, 0, 1) * 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255.0
    # pad so dilation has room
    P = 40
    a = np.pad(a, P)
    b = a > 0.5
    sw = stroke_width(b)
    target = MIN_STROKE * SS
    if 0 < sw < target:
        dist = ndimage.distance_transform_edt(~b)
        r = (target - sw) / 2.0
        bbox_area = (nw + 2) * (nh + 2)
        while r > 0.5:
            grown = np.clip(r + 0.5 - dist, 0, 1)
            if (grown > 0.5).sum() / bbox_area <= MAX_COVER or (b.sum() / bbox_area) > MAX_COVER:
                break
            r *= 0.8
        if r > 0.5:
            a = np.maximum(a, np.clip(r + 0.5 - dist, 0, 1))
    a = crop_ink(a, 0.01)
    h, w = a.shape
    s = min(BOX / w, BOX / h, 1.0 / SS * 1.0) if max(w, h) > BOX * SS else 1.0 / SS
    # final size: working box is SS x the final box
    fw, fh = max(1, round(w / SS)), max(1, round(h / SS))
    if max(fw, fh) > BOX:
        k = BOX / max(fw, fh)
        fw, fh = max(1, round(fw * k)), max(1, round(fh * k))
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((fw, fh), Image.LANCZOS)
    return out, sw / SS


# --------------------------------------------------------------------------------------------
# Content
# --------------------------------------------------------------------------------------------
CORE = fetch.CORE
TRAD = fetch.TRAD
POEM = ("字落了几千年才落成一条河造字的那一夜听说有鬼哭过哭的什么两千年没人说破河水不回答河水从此要汇聚成我"
        "千扇窗亮作千盏灯处处是我应人声这一扇关了我那一盏又是我新生一瞬间千万回死生是否让我和你不同河水也有潮落潮涌")
STYLE_NAMES = {"oracle": "oracle bone script 甲骨文", "bronze": "bronze script 金文",
               "bigseal": "large seal script 大篆/籀文", "seal": "small seal script 小篆"}


def n(name):
    try:
        return unicodedata.lookup(name)
    except KeyError:
        print("  [skip] no such Unicode name:", name)
        return None


def cp_items(group, era, font, cps, script):
    out = []
    for c in cps:
        ch = chr(c) if isinstance(c, int) else c
        if ch is None:
            continue
        nm = unicodedata.name(ch[0], "") if len(ch) == 1 else ""
        out.append(dict(text=ch, group=group, era=era, label=f"{script}: {nm.title() if nm else ch}", fonts=[font]))
    return out


def named_items(group, era, font, script, pairs):
    out = []
    for name, meaning in pairs:
        ch = n(name)
        if ch:
            lab = f"{script} {name.split(' ')[-1]}" + (f" — {meaning}" if meaning else "")
            out.append(dict(text=ch, group=group, era=era, label=lab, fonts=[font]))
    return out


def chinese_items():
    items = []
    meta = json.load(open(os.path.join(SRC, "commons_meta.json"), encoding="utf8"))
    groups = [("oracle", "cn-oracle"), ("bronze", "cn-bronze"), ("bigseal", "cn-bigseal"), ("seal", "cn-seal")]
    for style, group in groups:
        for c in CORE:
            m = meta.get(f"{c}|{style}")
            if not m or not m.get("license_ok"):
                continue
            base = os.path.join(SRC, "svg", "commons", style, c)
            path = base + ".svg" if os.path.exists(base + ".svg") else base + ".png"
            if not os.path.exists(path):
                continue
            form = m["title"].split(":", 1)[1].split("-")[0]
            shown = c if form == c else f"{c} ({form})"
            lab = f"{shown} {STYLE_NAMES[style]}"
            if path.endswith(".png") and has_grey_context(path):
                lab += " (written as a component of a larger character; grey context strokes removed)"
            items.append(dict(text=c, group=group, era="ancient", label=lab,
                              raster=path, src=m["title"], commons=m))
    # clerical 隶书: zdic.net vectors of Han inscriptions (CC0), via hanzi-glyphs-svg
    chosen = json.load(open(os.path.join(SRC, "clerical_chosen.json"), encoding="utf8"))
    for c in CORE:
        r = chosen.get(c)
        if not r:
            continue
        form = r["modern_char"]
        shown = c if form == c else f"{c} ({form})"
        items.append(dict(text=c, group="cn-clerical", era="ancient",
                          label=f"{shown} clerical script 隶书 — {r['variant']}",
                          raster=os.path.join(SRC, "svg", "clerical", r["file"]), src=r["source_url"], clerical=r))
    for key, group, era, nm in [("kai", "cn-kai", "classical", "regular script 楷书"),
                                ("xing", "cn-xing", "classical", "running script 行书"),
                                ("cao", "cn-cao", "classical", "cursive script 草书"),
                                ("song", "cn-song", "modern", "Song/Ming print 宋体")]:
        for c in CORE:
            items.append(dict(text=c, group=group, era=era, label=f"{c} {nm}", fonts=[key]))
    for c in dict.fromkeys(POEM):
        items.append(dict(text=c, group="cn-poem", era="modern", label=f"{c} poem 楷书", fonts=["kai"]))
    return items


def world_ancient():
    g, e = "world-ancient", "ancient"
    it = []
    it += named_items(g, e, "cuneiform", "Sumerian/Akkadian cuneiform", [
        ("CUNEIFORM SIGN AN", "sky, god (dingir)"), ("CUNEIFORM SIGN KI", "earth, place"),
        ("CUNEIFORM SIGN A", "water"), ("CUNEIFORM SIGN UD", "sun, day"), ("CUNEIFORM SIGN LUGAL", "king"),
        ("CUNEIFORM SIGN LU2", "man"), ("CUNEIFORM SIGN SAL", "woman"), ("CUNEIFORM SIGN DUB", "clay tablet"),
        ("CUNEIFORM SIGN KA", "mouth, word (inim)"), ("CUNEIFORM SIGN E2", "house"), ("CUNEIFORM SIGN GAL", "great"),
        ("CUNEIFORM SIGN TUR", "small, child (dumu)"), ("CUNEIFORM SIGN KUR", "mountain, land"), ("CUNEIFORM SIGN NE", "fire (izi)"),
        ("CUNEIFORM SIGN GISH", "tree, wood"), ("CUNEIFORM SIGN SHE", "barley"),
        ("CUNEIFORM SIGN IGI", "eye"), ("CUNEIFORM SIGN SHU", "hand"), ("CUNEIFORM SIGN MU", "name, year"),
        ("CUNEIFORM SIGN HU", "bird (mushen)"), ("CUNEIFORM SIGN HA", "fish (ku6)"),
    ])
    it += named_items(g, e, "egyptian", "Egyptian hieroglyph", [
        ("EGYPTIAN HIEROGLYPH S034", "ankh, life"), ("EGYPTIAN HIEROGLYPH D010", "wedjat, eye of Horus"),
        ("EGYPTIAN HIEROGLYPH N035", "water ripple (n)"), ("EGYPTIAN HIEROGLYPH N035A", "water"),
        ("EGYPTIAN HIEROGLYPH N005", "sun (ra)"), ("EGYPTIAN HIEROGLYPH G017", "owl (m)"),
        ("EGYPTIAN HIEROGLYPH M017", "reed (i)"), ("EGYPTIAN HIEROGLYPH G001", "vulture (3)"),
        ("EGYPTIAN HIEROGLYPH D021", "mouth (r)"), ("EGYPTIAN HIEROGLYPH I009", "horned viper (f)"),
        ("EGYPTIAN HIEROGLYPH D046", "hand (d)"), ("EGYPTIAN HIEROGLYPH V031", "basket (k)"),
        ("EGYPTIAN HIEROGLYPH N001", "sky"), ("EGYPTIAN HIEROGLYPH R008", "netjer, god"),
        ("EGYPTIAN HIEROGLYPH F035", "nefer, good"), ("EGYPTIAN HIEROGLYPH D036", "forearm (ayin)"),
        ("EGYPTIAN HIEROGLYPH O001", "house (pr)"), ("EGYPTIAN HIEROGLYPH L001", "scarab (kheper)"),
        ("EGYPTIAN HIEROGLYPH G005", "falcon, Horus"), ("EGYPTIAN HIEROGLYPH I010", "cobra (dj)"),
        ("EGYPTIAN HIEROGLYPH A001", "seated man"),
        ("EGYPTIAN HIEROGLYPH B001", "seated woman"), ("EGYPTIAN HIEROGLYPH L002", "bee"),
        ("EGYPTIAN HIEROGLYPH Y003", "scribe's palette, writing"), ("EGYPTIAN HIEROGLYPH N014", "star"),
        ("EGYPTIAN HIEROGLYPH N011", "crescent moon"), ("EGYPTIAN HIEROGLYPH D004", "eye (ir)"),
        ("EGYPTIAN HIEROGLYPH P001", "boat"),
    ])
    it += [x for x in cp_items(g, e, "anatolian", [0x14400 + k for k in (0, 20, 80, 170, 300, 400)],
                                "Anatolian (Luwian) hieroglyph")]
    it += named_items(g, e, "linearb", "Linear B", [
        ("LINEAR B SYLLABLE B008 A", "syllable a"), ("LINEAR B SYLLABLE B038 E", "syllable e"),
        ("LINEAR B SYLLABLE B028 I", "syllable i"), ("LINEAR B SYLLABLE B061 O", "syllable o"),
        ("LINEAR B SYLLABLE B010 U", "syllable u"), ("LINEAR B SYLLABLE B001 DA", "syllable da"),
        ("LINEAR B IDEOGRAM B100 MAN", "man"),
        ("LINEAR B IDEOGRAM B102 WOMAN", "woman"), ("LINEAR B IDEOGRAM B120 WHEAT", "wheat"),
        ("LINEAR B IDEOGRAM B105 EQUID", "horse"), ("LINEAR B IDEOGRAM B240 WHEELED CHARIOT", "chariot"),

    ])
    it += cp_items(g, e, "phoenician", [0x10900 + k for k in (0, 1, 2, 3, 4, 7, 10, 12, 13, 14, 16, 20)],
                   "Phoenician")
    it += named_items(g, e, "oldpersian", "Old Persian cuneiform", [
        ("OLD PERSIAN SIGN A", "a"), ("OLD PERSIAN SIGN I", "i"), ("OLD PERSIAN SIGN U", "u"),
        ("OLD PERSIAN SIGN KA", "ka"), ("OLD PERSIAN SIGN DA", "da"),
        ("OLD PERSIAN SIGN MA", "ma"), ("OLD PERSIAN SIGN AURAMAZDAA", "Ahuramazda"),
        ("OLD PERSIAN SIGN XSHAAYATHIYA", "king"), ("OLD PERSIAN SIGN BAGA", "god"), ("OLD PERSIAN SIGN BUUMISH", "earth"),
    ])
    it += cp_items(g, e, "ugaritic", [0x10380 + k for k in (0, 1, 2, 9, 12, 16, 20)], "Ugaritic")
    br = [n(x) for x in ("BRAHMI LETTER A", "BRAHMI LETTER I", "BRAHMI LETTER KA", "BRAHMI LETTER GA",
                         "BRAHMI LETTER CA", "BRAHMI LETTER TA", "BRAHMI LETTER MA", "BRAHMI LETTER RA")]
    it += cp_items(g, e, "brahmi", [b for b in br if b], "Brahmi")
    dh = "".join(filter(None, [n("BRAHMI LETTER DHA"), n("BRAHMI SIGN ANUSVARA"), n("BRAHMI LETTER MA")]))
    it.append(dict(text=dh, group=g, era=e, label="Brahmi 𑀥𑀁𑀫 dhaṃma — 'dharma', as in Ashoka's edicts", fonts=["brahmi"]))
    it += cp_items(g, e, "kharoshthi", [0x10A00, 0x10A10, 0x10A13, 0x10A15, 0x10A19, 0x10A28, 0x10A2B],
                   "Kharoshthi")
    it += cp_items(g, e, "runic", [0x16A0, 0x16A2, 0x16A6, 0x16A8, 0x16B1, 0x16B7, 0x16BA,
                                   0x16CF, 0x16D7, 0x16DF], "Runic (Elder Futhark)")
    it += cp_items(g, e, "ogham", [0x1681, 0x1684, 0x1689, 0x168E, 0x1693, 0x169B, 0x169C],
                   "Ogham")
    it += cp_items(g, e, "olditalic", [0x10300, 0x10302, 0x10304, 0x10308, 0x1030B, 0x10310, 0x10314],
                   "Old Italic (Etruscan)")
    it += cp_items(g, e, "gothic", [0x10330, 0x10331, 0x10333, 0x10336, 0x10339, 0x10343, 0x10348],
                   "Gothic (Wulfila)")
    it += cp_items(g, e, "osa", [0x10A60, 0x10A61, 0x10A66, 0x10A6A, 0x10A6E, 0x10A72, 0x10A7A],
                   "Old South Arabian (Musnad)")
    it += cp_items(g, e, "tifinagh", [0x2D63, 0x2D30, 0x2D31, 0x2D33, 0x2D37, 0x2D4E, 0x2D5C], "Tifinagh")
    it += cp_items(g, e, "serif", [0x03D8, 0x03DC, 0x0370, 0x03FA, 0x03E0] + [ord(x) for x in "ΑΔΘΛΣΩ"],
                   "Ancient Greek")
    return it


def world_modern():
    g, e = "world-modern", "modern"

    def seq(font, script, chars, words=()):
        out = [dict(text=c, group=g, era=e, label=f"{script}: {unicodedata.name(c, c).title()}" if len(c) == 1
                    else f"{script}: {c}", fonts=[font]) for c in chars]
        out += [dict(text=w, group=g, era=e, label=f"{script} word {w} — {m}", fonts=[font]) for w, m in words]
        return out
    it = []
    it += seq("serif", "Latin", list("AaGgRß") + ["Æ", "ñ", "ŋ", "Þ"])
    it += seq("serif", "Greek", list("αβγδελσφψω"))
    it += seq("serif", "Cyrillic", list("АБДЖЯЩЫФжѢ"))
    it += seq("hebrew", "Hebrew", list("אבגדהושתלק"))
    it += seq("arabic", "Arabic", list("ابتجحدسعفقكلمنهوي"), [("قلم", "pen"), ("كتاب", "book"), ("سلام", "peace")])
    it += seq("deva", "Devanagari", list("अआकखगमॐ") + ["क्ष", "त्र", "ज्ञ", "श्री"], [("नमस्ते", "namaste, greeting"), ("हिन्दी", "Hindi")])
    it += seq("beng", "Bengali", list("অআকখগঙ"), [("বাংলা", "Bangla")])
    it += seq("taml", "Tamil", list("அஆகஙசழ"), [("தமிழ்", "Tamil")])
    it += seq("thai", "Thai", list("กขคงจฉมอฮ"), [("ไทย", "Thai"), ("สวัสดี", "hello")])
    it += seq("tibt", "Tibetan", list("ཀཁགངཨཧༀ") + ["ཀྵ"], [("བོད", "Tibet")])
    mong = [dict(text=c, group=g, era=e, label=f"Mongolian (vertical): {unicodedata.name(c).title()}", fonts=["mong"], vertical=True)
            for c in "ᠠᠡᠢᠣᠤᠮᠨᠰ"]
    mong += [dict(text=w, group=g, era=e, label=f"Mongolian (vertical) word {w} — {m}", fonts=["mong"], vertical=True)
             for w, m in [("ᠮᠣᠩᠭᠣᠯ", "Mongol"), ("ᠪᠢᠴᠢᠭ", "bichig, writing/script")]]
    it += mong
    it += seq("kr", "Hangul", list("ㄱㄴㅁㅅㅇㅎ가나한국"))
    it += seq("jp", "Hiragana", list("あいうえおかさのんひ"))
    it += seq("jp", "Katakana", list("アイカサタナミヲンヤ"))
    it += seq("ethi", "Ge'ez (Ethiopic)", list("ሀለመሰቀበተነአዐ"))
    it += seq("armn", "Armenian", list("ԱԲԳԴԵԶՖՇ"))
    it += seq("geor", "Georgian", list("აბგდევზქ"))
    it += seq("cher", "Cherokee", list("ᎠᎡᎢᎣᎤᏣᎫᏜ"))
    it += seq("khmr", "Khmer", list("កខគងចញ"), [("ខ្មែរ", "Khmer")])
    it += seq("sinh", "Sinhala", list("අආකගමස"), [("සිංහල", "Sinhala"), ("ශ්‍රී", "Sri")])
    return it


WORDS = [  # (text, font, language, meaning)
    ("字", "sc", "Chinese zì", "character, written word"), ("文字", "sc", "Chinese wénzì / Japanese moji", "writing, script"),
    ("河", "sc", "Chinese hé", "river"), ("水", "sc", "Chinese shuǐ", "water"), ("言", "sc", "Chinese yán", "speech, word"),
    ("言葉", "jp", "Japanese kotoba", "word"), ("みず", "jp", "Japanese mizu", "water"),
    ("글", "kr", "Korean geul", "writing"), ("말", "kr", "Korean mal", "word, speech"), ("물", "kr", "Korean mul", "water"),
    ("강", "kr", "Korean gang", "river"), ("한글", "kr", "Korean Hangeul", "the Korean script"),
    ("word", "serif", "English", "word"), ("writing", "serif", "English", "writing"), ("water", "serif", "English", "water"),
    ("river", "serif", "English", "river"),
    ("Wort", "serif", "German", "word"), ("Schrift", "serif", "German", "script, writing"), ("Wasser", "serif", "German", "water"),
    ("Fluss", "serif", "German", "river"),
    ("mot", "serif", "French", "word"), ("écriture", "serif", "French", "writing"), ("eau", "serif", "French", "water"),
    ("rivière", "serif", "French", "river"),
    ("palabra", "serif", "Spanish", "word"), ("agua", "serif", "Spanish", "water"), ("río", "serif", "Spanish", "river"),
    ("parola", "serif", "Italian", "word"), ("acqua", "serif", "Italian", "water"),
    ("verbum", "serif", "Latin", "word"), ("littera", "serif", "Latin", "letter"), ("aqua", "serif", "Latin", "water"),
    ("flumen", "serif", "Latin", "river"),
    ("слово", "serif", "Russian slovo", "word"), ("письмо", "serif", "Russian pis'mo", "writing, letter"),
    ("вода", "serif", "Russian voda", "water"), ("река", "serif", "Russian reka", "river"),
    ("λόγος", "serif", "Greek logos", "word, reason"), ("γραφή", "serif", "Greek graphē", "writing"),
    ("νερό", "serif", "Greek nero", "water"), ("ποταμός", "serif", "Greek potamos", "river"),
    ("كلمة", "arabic", "Arabic kalima", "word"), ("كتابة", "arabic", "Arabic kitāba", "writing"),
    ("ماء", "arabic", "Arabic māʾ", "water"), ("نهر", "arabic", "Arabic nahr", "river"),
    ("واژه", "arabic", "Persian vāže", "word"), ("آب", "arabic", "Persian āb", "water"),
    ("מילה", "hebrew", "Hebrew mila", "word"), ("כתב", "hebrew", "Hebrew ktav", "script, writing"),
    ("מים", "hebrew", "Hebrew mayim", "water"), ("נהר", "hebrew", "Hebrew nahar", "river"),
    ("शब्द", "deva", "Hindi shabd", "word"), ("लिपि", "deva", "Hindi lipi", "script"), ("पानी", "deva", "Hindi pānī", "water"),
    ("नदी", "deva", "Hindi nadī", "river"), ("अक्षर", "deva", "Sanskrit akṣara", "letter, syllable; imperishable"),
    ("শব্দ", "beng", "Bengali shobdo", "word"), ("জল", "beng", "Bengali jol", "water"),
    ("சொல்", "taml", "Tamil sol", "word"), ("நீர்", "taml", "Tamil nīr", "water"),
    ("คำ", "thai", "Thai kham", "word"), ("น้ำ", "thai", "Thai nam", "water"), ("แม่น้ำ", "thai", "Thai maenam", "river"),
    ("ཡི་གེ", "tibt", "Tibetan yige", "letter, writing"), ("ཆུ", "tibt", "Tibetan chu", "water"),
    ("ᠦᠰᠦᠭ", "mong", "Mongolian üsüg (vertical)", "letter, script"), ("ᠤᠰᠤ", "mong", "Mongolian usu (vertical)", "water"),
    ("ቃል", "ethi", "Amharic qal", "word"), ("ውሃ", "ethi", "Amharic wuha", "water"), ("ወንዝ", "ethi", "Amharic wenz", "river"),
    ("բառ", "armn", "Armenian bar", "word"), ("ջուր", "armn", "Armenian jur", "water"),
    ("სიტყვა", "geor", "Georgian sit'q'va", "word"), ("წყალი", "geor", "Georgian ts'q'ali", "water"),
    ("ពាក្យ", "khmr", "Khmer peaky", "word"), ("ទឹក", "khmr", "Khmer tuek", "water"),
    ("වචනය", "sinh", "Sinhala vachanaya", "word"), ("ජලය", "sinh", "Sinhala jalaya", "water"),
    ("ᎠᎹ", "cher", "Cherokee ama", "water"),
    ("neno", "serif", "Swahili", "word"), ("maji", "serif", "Swahili", "water"),
    ("kelime", "serif", "Turkish", "word"), ("su", "serif", "Turkish", "water"),
    ("chữ", "serif", "Vietnamese", "written character, script"), ("nước", "serif", "Vietnamese", "water"),
    ("sông", "serif", "Vietnamese", "river"),
]


def word_items():
    out = []
    for t, f, lang, m in WORDS:
        out.append(dict(text=t, group="word", era="modern", label=f"{t} — {lang}: '{m}'", fonts=[f],
                        vertical=(f == "mong")))
    return out


SYM_FALLBACK = ["mono", "sans", "math", "sym", "sym2", "sc", "emoji"]


def symbol_items():
    out = []

    def add(texts, era="modern", fonts=None, em=1.7, desc=None):
        for t in texts:
            if desc:
                lab = f"{t} — {desc}"
            elif len(t) == 1:
                lab = f"{t} — {unicodedata.name(t, '').title()}"
            else:
                lab = f"{t}"
            out.append(dict(text=t, group="symbol", era=era, label=lab, fonts=fonts or SYM_FALLBACK, em=em))
    add(list("0123456789"), fonts=["mono"])
    add(["0101", "1010", "0110", "1001"], era="digital", fonts=["mono"], desc="binary")
    add(["</>", "{ }", "=>", "!=", "&&", "//", "#!", "0xFF", "fn()", "if"],
        era="digital", fonts=["mono"], desc="code token")
    add(list("@#&§¶©™%$€?!¿*;"), fonts=["sans", "mono", "sym"])
    add(list("∞π∑√≈≠∫∂∆∀∃∈∅±÷"), fonts=["math", "sans"])
    add(list("→←⇧⌘⌥⏎"), fonts=["math", "sym", "sym2", "sans"])
    add(list("♪♫♬♯"), fonts=["sym2", "sym", "math", "emoji"])
    add(list("。、「」『』《》？！※〇"), fonts=["sc"], em=1.4)
    add(["✍", "✉", "✏", "📖", "📜", "🖋", "⌨", "💬", "⌛", "☀", "☁", "☂", "❄", "★",
         "🌊", "🌙", "🔥", "🐟", "🐦", "🐢", "🐎", "💧", "👁", "✋"], fonts=["emoji", "sym", "sym2"])
    return out


# --------------------------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------------------------
NOTDEF_HASH = {}


def notdef_hash(key):
    if key not in NOTDEF_HASH:
        try:
            a = render_text(key, "\U0010FFFD")  # private-use plane 16: never mapped -> .notdef
            NOTDEF_HASH[key] = hashlib.md5(a.tobytes()).hexdigest() if a is not None else None
        except Exception:
            NOTDEF_HASH[key] = None
    return NOTDEF_HASH[key]


def rasterise(item, log):
    if "raster" in item:
        ink = load_raster(item["raster"])
        if ink is None:
            log.append(f"EMPTY raster {item['label']}")
            return None
        img, sw = normalise(ink)
        return img
    for key in item["fonts"]:
        if not covers(key, item["text"]):
            continue
        direction = "rtl" if key in RTL else None
        if not hb_ok(key, item["text"], direction):
            log.append(f"notdef after shaping {key}: {item['text']}")
            continue
        ink = render_text(key, item["text"], item.get("vertical", False))
        if ink is None:
            log.append(f"EMPTY render {key}: {item['label']}")
            continue
        if hashlib.md5(ink.tobytes()).hexdigest() == notdef_hash(key):
            log.append(f"TOFU render {key}: {item['label']}")
            continue
        em_cap = item.get("em", 1.7) * WBOX / RENDER_PX  # never enlarge beyond em*1.7 (punctuation stays small)
        img, sw = normalise(ink, em_cap=em_cap)
        item["font"] = key
        return img
    log.append(f"DROPPED (no covering font) {item['label']} {[hex(ord(c)) for c in item['text']]}")
    return None


def main():
    if "--no-fetch" not in sys.argv:
        fetch.fetch_fonts()
        fetch.fetch_commons()
        fetch.fetch_clerical()
    items = chinese_items() + world_ancient() + world_modern() + word_items() + symbol_items()
    log = []
    atlas = Image.new("L", (CELL * COLS, CELL * COLS), 0)
    glyphs, idx = [], 0
    for it in items:
        if idx >= COLS * COLS:
            log.append("ATLAS FULL, dropped " + it["label"])
            continue
        img = rasterise(it, log)
        if img is None:
            continue
        x0 = (idx % COLS) * CELL + (CELL - img.width) // 2
        y0 = (idx // COLS) * CELL + (CELL - img.height) // 2
        atlas.paste(img, (x0, y0))
        g = dict(i=idx, text=it["text"], group=it["group"], era=it["era"], label=it["label"])
        if it.get("font"):
            g["src"] = FONTS[it["font"]][2]
        elif it.get("src"):
            g["src"] = it["src"]
        if it.get("vertical"):
            g["vertical"] = True
        glyphs.append(g)
        it["i"] = idx
        idx += 1
    # sanity: every cell non-empty, ≥12 px clear border
    a = np.asarray(atlas)
    for g in glyphs:
        r, c = divmod(g["i"], COLS)
        cell = a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
        ys, xs = np.where(cell > 8)
        assert len(xs) > 20, ("empty cell", g)
        bb = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        if (bb > 128).mean() > 0.6 and bb.size > 2500:
            log.append(f"HEAVY cell {g['i']} {g['label']} ({(bb > 128).mean():.2f} of bbox)")
        assert xs.min() >= 12 and ys.min() >= 12 and xs.max() <= CELL - 13 and ys.max() <= CELL - 13, ("pad", g)
    atlas.save(os.path.join(HERE, "atlas.png"), optimize=True)
    atlas.resize((1024, 1024), Image.LANCZOS).save(os.path.join(HERE, "preview.png"), optimize=True)
    groups = list(dict.fromkeys(g["group"] for g in glyphs))
    meta = {"cell": CELL, "cols": COLS, "count": len(glyphs), "box": BOX, "groups": groups,
            "groupRanges": {gr: [min(g["i"] for g in glyphs if g["group"] == gr),
                                 max(g["i"] for g in glyphs if g["group"] == gr)] for gr in groups},
            "glyphs": glyphs}
    json.dump(meta, open(os.path.join(HERE, "atlas.json"), "w", encoding="utf8"), ensure_ascii=False, indent=0)
    write_credits(items)
    print("\n".join(log))
    from collections import Counter
    print(Counter(g["group"] for g in glyphs), "total", len(glyphs))


def write_credits(items):
    used_fonts = sorted({it["font"] for it in items if it.get("font") and "i" in it})
    L = ["# Glyph atlas credits", "",
         "Every cell of `atlas.png` is a real character, word or symbol. Sources below; `atlas.json` gives, per cell,",
         "the exact font or source file (`src`).", "",
         "## Fonts (all SIL Open Font License 1.1)", "",
         "| Font | Licence | Source |", "|---|---|---|"]
    for k in used_fonts:
        f, w, name, d = FONTS[k]
        url = d if d.startswith("http") else "https://github.com/google/fonts/tree/main/" + d
        L.append(f"| {name} (`{f}`) | SIL OFL 1.1 | {url} |")
    L += ["", "Licence texts are kept next to each font in `src/fonts/*.OFL.txt`.", "",
          "## Wikimedia Commons — Ancient Chinese characters project (oracle / bronze / large seal / small seal)", "",
          "All files are marked **Public domain** on Commons (the drawings reproduce inscriptions thousands of years old;",
          "the project releases its tracings to the public domain). Commons' `Artist` field for every one of these files reads",
          "\"Digital file creation, see the contributor names shown in the 'User' column of the 'File history' section\"; the",
          "uploader recorded by the API is listed as the author. Because upload.wikimedia.org rate-limits bulk downloads of",
          "originals, the build uses Wikimedia's own 960 px PNG rendering of each SVG.", "",
          "| File | Author (uploader) | Licence | URL |", "|---|---|---|---|"]
    for it in items:
        if "commons" in it and "i" in it:
            m = it["commons"]
            L.append(f"| {m['title']} | {m['uploader']} | {m['license']} | {m['page']} |")
    L += ["", "## Clerical script (隶书) — zdic.net vectors via hanzi-glyphs-svg", "",
          "No openly-licensed clerical *font* exists (the 隶书 fonts in circulation are freeware/商免, not OFL). Instead each",
          "clerical cell is an authentic Han-dynasty form (stele, bronze vessel, bamboo slip, seal) vectorised by zdic.net",
          "(漢典書法), whose terms of service (https://www.zdic.net/terms/, §3 公有領域聲明) dedicate the 書法 material to the",
          "public domain under **CC0 1.0**; redistributed by https://github.com/zhouyongh/hanzi-glyphs-svg (glyphs/clerical,",
          "CC0 1.0, near-white corner watermark removed). Only zdic-origin vectors are used (no 小學堂 bitmap traces).", "",
          "| Char | Source inscription | Licence | zdic URL |", "|---|---|---|---|"]
    for it in items:
        if "clerical" in it and "i" in it:
            r = it["clerical"]
            L.append(f"| {it['text']} ({r['modern_char']}) | {r['variant']} | CC0 1.0 | {r['source_url']} |")
    open(os.path.join(HERE, "CREDITS.md"), "w", encoding="utf8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
