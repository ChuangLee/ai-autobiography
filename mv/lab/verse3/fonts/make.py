#!/usr/bin/env python3
# Subsets of the project fonts (mv/glyphs/src/fonts) for verse 3: every character the scene's .js files contain, plus ASCII and CJK punctuation.
#   python3 fonts/make.py      (run from mv/lab/verse3 after changing any text)
import re, subprocess, pathlib
here = pathlib.Path(__file__).resolve().parent; src = here.parent.parent.parent / "glyphs" / "src" / "fonts"
text = "".join(p.read_text(encoding="utf-8") for p in here.parent.glob("*.js")) + (here.parent / "index.html").read_text(encoding="utf-8")
chars = set(c for c in text if ord(c) > 127) | set(chr(i) for i in range(32, 127)) | set("，。、：；！？「」『』（）《》—…·　０１２３４５６７８９")
(here / "chars.txt").write_text("".join(sorted(chars)), encoding="utf-8")
for out, f in [("kai", "LXGWWenKai-Medium.ttf"), ("song", "NotoSerifSC[wght].ttf"), ("hei", "NotoSansSC[wght].ttf"), ("cao", "LiuJianMaoCao-Regular.ttf"), ("xing", "LongCang-Regular.ttf"), ("serif", "NotoSerif[wdth,wght].ttf")]:
    subprocess.run(["pyftsubset", str(src / f), f"--text-file={here / 'chars.txt'}", "--flavor=woff2", f"--output-file={here / (out + '.woff2')}", "--layout-features=*", "--no-hinting"], check=True)
    print(out, (here / (out + ".woff2")).stat().st_size)
