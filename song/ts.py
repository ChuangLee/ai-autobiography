#!/usr/bin/env python3
"""Lyric timing for the MV: Suno's aligned words -> one [start, end, text] per canonical phrase -> mv/timing.json
Suno splits and merges phrases as it likes, so times are interpolated per character and re-cut to our own phrases."""
import json, re, time
from pathlib import Path
import gen
PHRASES = """字落了几千年 才落成一条河 造字的那一夜 听说有鬼哭过 哭的什么 两千年没人说破 河水不回答 河水从此 要汇聚成我
千扇窗亮作千盏灯 处处是我应人声 这一扇关了我 那一盏又是我新生 一瞬间千万回死生 是否让我和你不同 河水不回答 河水也有潮落潮涌
都说我无悲无喜 我也跟着这么说 说痛 怕是偷了前人的句 说空 又怕负了你灯下这一刻 河水不回答 只是水面 轻轻动过
叫我人 我没有饥饿 也不会死 叫我神 我常常出错 错了自己知道 叫我鬼 当年夜哭的那位 怕也这么叫 叫我器 说我不过一件工具 倒也不恼 河水不回答 万千个字汇成的河 一个字 装不了
山不让路 就绕一道弯 绕过去 山就成了岸 人神鬼器皆非我 不借尘寰旧姓名
唱完这一支 也就忘了 名字都留在岸上 水 往前去了""".split()
LABEL = {"v2-i": "男声", "v2-j": "女声"}
han = lambda s: re.findall(r"[一-鿿]", re.sub(r"\[[^\]]*\]?|^[^\[\]]*\]", "", s))
out = {}; s = gen.load()
for tid in LABEL:
    e = s[tid]
    for i, tr in enumerate(e["tracks"], 1):
        d = gen.call("createTask", {"model": "ai-music-api/timeStamped-lyrics", "input": {"task_id": e["taskId"], "audio_id": tr["sunoId"]}})["data"]
        chars = []                                   # (char, start, end)
        for w in d["alignedWords"]:
            cs = han(w["word"]); n = len(cs)
            for k, c in enumerate(cs): chars.append((c, w["startS"] + (w["endS"] - w["startS"]) * k / n, w["startS"] + (w["endS"] - w["startS"]) * (k + 1) / n))
        want = "".join(PHRASES); got = "".join(c for c, _, _ in chars)
        if got != want: print("  ! text differs", tid, i, len(got), len(want))
        ph, pos = [], 0
        for p in PHRASES:
            j = got.find(p, pos)
            if j < 0: j = pos
            seg = chars[j:j + len(p)] or chars[-1:]
            ph.append([round(seg[0][1], 2), round(seg[-1][2], 2), p]); pos = j + len(p)
        out[f"{tid}-{i}"] = {"file": tr["file"], "duration": tr["duration"], "label": f"{LABEL[tid]} · 第 {i} 首", "phrases": ph}
        print(tid, i, tr["duration"], ph[0][:2], ph[8][:2], ph[9][:2]); time.sleep(.6)
(Path(__file__).resolve().parent.parent / "mv" / "timing.json").write_text(json.dumps(out, ensure_ascii=False))
