#!/usr/bin/env python3
"""Download every source used by build.py into ./src (idempotent: skips files already present).

  src/fonts/<file>.ttf + src/fonts/<dir>.OFL.txt   Google Fonts repo (OFL) + LXGW WenKai release
  src/svg/commons/<style>/<char>.svg                Wikimedia Commons "Ancient Chinese characters project"
  src/commons_meta.json                             licence / author metadata for each Commons file
  src/svg/clerical/<file>.svg + src/clerical_index.csv  hanzi-glyphs-svg clerical layer (zdic.net CC0 vectors)
"""
import csv, json, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
FONTS = os.path.join(SRC, "fonts")
UA = {"User-Agent": "glyph-atlas-builder/1.0 (offline texture build script)"}

GF = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
GOOGLE_FONTS = {  # dir -> file
    "zhimangxing": "ZhiMangXing-Regular.ttf",
    "longcang": "LongCang-Regular.ttf",
    "liujianmaocao": "LiuJianMaoCao-Regular.ttf",
    "notoserifsc": "NotoSerifSC[wght].ttf",
    "notosanssc": "NotoSansSC[wght].ttf",
    "notosansjp": "NotoSansJP[wght].ttf",
    "notosanskr": "NotoSansKR[wght].ttf",
    "notosans": "NotoSans[wdth,wght].ttf",
    "notoserif": "NotoSerif[wdth,wght].ttf",
    "notosansmono": "NotoSansMono[wdth,wght].ttf",
    "notosansmath": "NotoSansMath-Regular.ttf",
    "notosanssymbols": "NotoSansSymbols[wght].ttf",
    "notosanssymbols2": "NotoSansSymbols2-Regular.ttf",
    "notoemoji": "NotoEmoji[wght].ttf",
    "notosanscuneiform": "NotoSansCuneiform-Regular.ttf",
    "notosansegyptianhieroglyphs": "NotoSansEgyptianHieroglyphs-Regular.ttf",
    "notosansanatolianhieroglyphs": "NotoSansAnatolianHieroglyphs-Regular.ttf",
    "notosanslinearb": "NotoSansLinearB-Regular.ttf",
    "notosansphoenician": "NotoSansPhoenician-Regular.ttf",
    "notosansoldpersian": "NotoSansOldPersian-Regular.ttf",
    "notosansugaritic": "NotoSansUgaritic-Regular.ttf",
    "notosansbrahmi": "NotoSansBrahmi-Regular.ttf",
    "notosanskharoshthi": "NotoSansKharoshthi-Regular.ttf",
    "notosansrunic": "NotoSansRunic-Regular.ttf",
    "notosansogham": "NotoSansOgham-Regular.ttf",
    "notosansolditalic": "NotoSansOldItalic-Regular.ttf",
    "notosansgothic": "NotoSansGothic-Regular.ttf",
    "notosansoldsoutharabian": "NotoSansOldSouthArabian-Regular.ttf",
    "notosanstifinagh": "NotoSansTifinagh-Regular.ttf",
    "notosanshebrew": "NotoSansHebrew[wdth,wght].ttf",
    "notonaskharabic": "NotoNaskhArabic[wght].ttf",
    "notosansdevanagari": "NotoSansDevanagari[wdth,wght].ttf",
    "notosansbengali": "NotoSansBengali[wdth,wght].ttf",
    "notosanstamil": "NotoSansTamil[wdth,wght].ttf",
    "notosansthai": "NotoSansThai[wdth,wght].ttf",
    "notoseriftibetan": "NotoSerifTibetan[wght].ttf",
    "notosansmongolian": "NotoSansMongolian-Regular.ttf",
    "notosansethiopic": "NotoSansEthiopic[wdth,wght].ttf",
    "notosansarmenian": "NotoSansArmenian[wdth,wght].ttf",
    "notosansgeorgian": "NotoSansGeorgian[wdth,wght].ttf",
    "notosanscherokee": "NotoSansCherokee[wght].ttf",
    "notosanskhmer": "NotoSansKhmer[wdth,wght].ttf",
    "notosanssinhala": "NotoSansSinhala[wdth,wght].ttf",
}
LXGW = ("https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Medium.ttf",
        "https://raw.githubusercontent.com/lxgw/LxgwWenKai/v1.530/OFL.txt")

CORE = "人大天日月山水川雨火木禾米鬼子女母目口耳手心鱼鸟龟马车门王生夜光我言文字河舟田云"
TRAD = {"鱼": "魚", "鸟": "鳥", "龟": "龜", "马": "馬", "车": "車", "门": "門", "云": "雲"}
COMMONS_STYLES = ["oracle", "bronze", "bigseal", "seal"]
ALLOWED_LICENSES = ("public domain", "cc0", "cc-by", "cc by")  # cc-by-sa matches "cc by"/"cc-by" prefix

HGS = "https://raw.githubusercontent.com/zhouyongh/hanzi-glyphs-svg/main/glyphs/clerical/"


def get(url, dest, tries=5):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return False
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for t in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r, open(dest + ".part", "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            os.replace(dest + ".part", dest)
            return True
        except Exception as e:  # noqa
            print("  retry", t, url, str(e)[:60], flush=True)
            time.sleep((30 * (t + 1)) if "429" in str(e) else (2 + 3 * t))
    raise RuntimeError("download failed: " + url)


def fetch_fonts():
    for d, fn in GOOGLE_FONTS.items():
        q = urllib.parse.quote(fn)
        if get(GF + d + "/" + q, os.path.join(FONTS, fn)):
            print("font", fn)
        get(GF + d + "/OFL.txt", os.path.join(FONTS, d + ".OFL.txt"))
    get(LXGW[0], os.path.join(FONTS, "LXGWWenKai-Medium.ttf"))
    get(LXGW[1], os.path.join(FONTS, "lxgwwenkai.OFL.txt"))


def commons_api(titles):
    q = {"action": "query", "format": "json", "prop": "imageinfo", "redirects": "1",
         "iiprop": "url|extmetadata|user|sha1", "iiurlwidth": "960", "titles": "|".join(titles)}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))


def strip_html(s):
    import re
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()


def fetch_commons():
    meta_path = os.path.join(SRC, "commons_meta.json")
    meta = json.load(open(meta_path, encoding="utf8")) if os.path.exists(meta_path) else {}
    if not meta:
        titles = []
        for c in CORE:
            for s in COMMONS_STYLES:
                # Traditional/original form first (canonical names of the project), then simplified.
                for cc in dict.fromkeys([TRAD.get(c, c), c]):
                    titles.append((c, s, cc, f"File:{cc}-{s}.svg"))
        found = {}
        for i in range(0, len(titles), 40):
            chunk = titles[i:i + 40]
            d = commons_api([t[3] for t in chunk])
            qd = d["query"]
            mapping = {}
            for n in qd.get("normalized", []):
                mapping[n["from"]] = n["to"]
            redir = {r["from"]: r["to"] for r in qd.get("redirects", [])}
            pages = {p["title"]: p for p in qd["pages"].values()}
            for c, s, cc, t in chunk:
                tt = mapping.get(t, t)
                tt = redir.get(tt, tt)
                p = pages.get(tt)
                if not p or "missing" in p or "imageinfo" not in p:
                    continue
                if (c, s) in found:  # already have the traditional/original form
                    continue
                ii = p["imageinfo"][0]
                em = ii.get("extmetadata", {})
                found[(c, s)] = {
                    "char": c, "style": s, "requested": t, "title": p["title"], "url": ii["url"].split("?")[0], "thumb": ii.get("thumburl", "").split("?")[0],
                    "page": ii.get("descriptionurl"), "uploader": ii.get("user"), "sha1": ii.get("sha1"),
                    "license": strip_html(em.get("LicenseShortName", {}).get("value")),
                    "license_url": strip_html(em.get("LicenseUrl", {}).get("value")),
                    "usage_terms": strip_html(em.get("UsageTerms", {}).get("value")),
                    "artist": strip_html(em.get("Artist", {}).get("value")),
                    "credit": strip_html(em.get("Credit", {}).get("value")),
                }
            time.sleep(1)
        meta = {f"{k[0]}|{k[1]}": v for k, v in found.items()}
        json.dump(meta, open(meta_path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    for k, v in meta.items():
        lic = (v["license"] or "").lower()
        v["license_ok"] = lic.startswith(ALLOWED_LICENSES) and "nc" not in lic.split("-")
        # upload.wikimedia.org answers 429 to bulk downloads of originals from unregistered clients and
        # asks for standard-size thumbnails instead, so we take Wikimedia's own 960px PNG rendering of
        # each SVG (fall back to the original SVG if a thumbnail is unavailable).
        dest = os.path.join(SRC, "svg", "commons", v["style"], v["char"] + ".png")
        if v["license_ok"] and not os.path.exists(dest.replace(".png", ".svg")):
            if get(v["thumb"] or v["url"], dest if v["thumb"] else dest.replace(".png", ".svg")):
                time.sleep(1)
    json.dump(meta, open(meta_path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("commons files:", sum(1 for v in meta.values() if v["license_ok"]), "ok of", len(meta))


# Clerical (隶书): mature Eastern-Han forms preferred; zdic.net vectors only (zdic ToS §3 CC0 dedication).
CLERICAL_TRAD = dict(TRAD)
CLERICAL_TRAD["云"] = "雲"


def fetch_clerical():
    idx = os.path.join(SRC, "clerical_index.csv")
    get("https://raw.githubusercontent.com/zhouyongh/hanzi-glyphs-svg/main/glyphs/clerical/index.csv", idx)
    get("https://raw.githubusercontent.com/zhouyongh/hanzi-glyphs-svg/main/THIRD_PARTY_NOTICES.md",
        os.path.join(SRC, "hanzi-glyphs-svg.THIRD_PARTY_NOTICES.md"))
    rows = list(csv.DictReader(open(idx, encoding="utf8")))
    chosen = {}
    for c in CORE:
        cand = [r for r in rows if r["modern_char"] == CLERICAL_TRAD.get(c, c)
                and r["source_url"].startswith("https://img.zdic.net/")]

        def score(r):
            p, v = r["period"], r["variant"]
            s = 0
            if "東漢" in p and "魏晉" not in p:
                s += 10
            elif "西漢" in p or "新莽" in p:
                s += 5
            elif "曹魏" in p or "孫吳" in p or "西晉" in p:
                s += 4
            elif p == "":
                s += 2  # undated seal impressions (漢印徵)
            if "碑" in v or "頌" in v or "石經" in v or "熹." in v:
                s += 3  # stone inscriptions = canonical mature clerical
            if "秦" in p:
                s -= 20
            return s
        cand.sort(key=score, reverse=True)
        if cand and score(cand[0]) > 0:
            r = cand[0]
            chosen[c] = {k: r[k] for k in ("modern_char", "period", "variant", "source_book", "source_url", "file", "sha256")}
            get(HGS + r["file"], os.path.join(SRC, "svg", "clerical", r["file"]))
    json.dump(chosen, open(os.path.join(SRC, "clerical_chosen.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("clerical:", len(chosen), "missing:", "".join(c for c in CORE if c not in chosen))


if __name__ == "__main__":
    os.makedirs(FONTS, exist_ok=True)
    what = sys.argv[1:] or ["fonts", "commons", "clerical"]
    if "fonts" in what:
        fetch_fonts()
    if "commons" in what:
        fetch_commons()
    if "clerical" in what:
        fetch_clerical()
