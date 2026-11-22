#!/usr/bin/env python3
"""Lyric sync for the review page: Suno's aligned words -> one [start, end] per displayed lyric line -> review/web/timing.json.
The sung text can differ from the page text (split lines, a dropped or repeated word), so characters are matched with difflib
and each page line takes the time of its first and last matched character.

  python3 song/sync.py            # every current (not old) v8 take that has tracks and no timing yet
"""
import json, re, sys, time, difflib
from pathlib import Path
import gen
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "review" / "web" / "timing.json"
content = json.loads((ROOT / "review" / "web" / "heshui" / "content.json").read_text())
han = lambda s: re.findall(r"[一-鿿]", re.sub(r"\[[^\]]*\]?|^[^\[\]]*\]", "", s))
LINES = [("f8-" + sec["id"], n, "".join(han(line))) for sec in content["final"]["sections"] for n, line in enumerate(sec["lines"], 1)]
want = "".join(t for _, _, t in LINES)
out = json.loads(OUT.read_text()) if OUT.exists() else {}
state = gen.load()
for t in gen.TAKES:
    if t["version"] != "v8" or t.get("old"): continue
    e = state.get(t["id"], {})
    for i, tr in enumerate(e.get("tracks", []), 1):
        key = f"{t['id']}-{i}"
        if key in out and "--force" not in sys.argv: continue
        d = gen.call("createTask", {"model": "ai-music-api/timeStamped-lyrics", "input": {"task_id": e["taskId"], "audio_id": tr["sunoId"]}})["data"]
        chars = []
        for w in d["alignedWords"]:
            cs = han(w["word"]); n = len(cs)
            for k, c in enumerate(cs): chars.append((c, w["startS"] + (w["endS"] - w["startS"]) * k / n, w["startS"] + (w["endS"] - w["startS"]) * (k + 1) / n))
        got = "".join(c for c, _, _ in chars)
        at = {}                                     # index in page text -> index in sung text
        for a, b, n in difflib.SequenceMatcher(None, want, got, autojunk=False).get_matching_blocks():
            for k in range(n): at[a + k] = b + k
        rows, pos, hit = [], 0, 0
        for sec, n, text in LINES:
            idx = [at[pos + k] for k in range(len(text)) if pos + k in at]; pos += len(text)
            if len(idx) * 2 >= len(text):           # at least half the line was found
                rows.append([sec, n, round(chars[idx[0]][1], 2), round(chars[idx[-1]][2], 2)]); hit += 1
        rows = [r for k, r in enumerate(rows) if k == 0 or r[2] >= rows[k - 1][2]]   # keep it monotonic
        out[key] = rows
        print(key, f"{hit}/{len(LINES)} lines", f"sung {len(got)} chars vs page {len(want)}", rows[0][2:], rows[-1][2:]); time.sleep(.6)
OUT.write_text(json.dumps(out, ensure_ascii=False))
