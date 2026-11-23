#!/usr/bin/env python3
"""Everything the player needs to know about the song, in one file: mv/song.json.
  python3 song.py        # reads data/aligned-<take>.json (Suno's word timings) and the mp3, writes song.json and glyphs/lyric.woff2
Phrases come from the aligned words (section tags dropped). Accents are found in the audio itself: spectral-flux onsets and low-end hits,
so the picture can move on what is actually played, not on a guessed tempo. Needs ffmpeg, numpy, scipy, fonttools."""
import json, re, subprocess, tempfile
from pathlib import Path
import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf
HERE = Path(__file__).parent
TAKE = "v8-g-r3-1"
AUDIO = HERE.parent / "review" / "web" / "audio" / f"{TAKE}.mp3"

# ── phrases ──
words = json.loads((HERE / "data" / f"aligned-{TAKE}.json").read_text())["data"]["alignedWords"]
phrases = []
for w in words:
    text = re.sub(r"\[[^\]]*\]?|^[^\[\]]*\]", "", w["word"])            # drop [section | direction] tags, also ones split across words
    han = "".join(re.findall(r"[一-鿿]", text))
    if han: phrases.append([round(w["startS"], 2), round(w["endS"], 2), han])

# ── accents ──
with tempfile.TemporaryDirectory() as td:
    wav = Path(td) / "a.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(AUDIO), "-ac", "1", "-ar", "22050", str(wav)], check=True)
    sr, x = wf.read(wav)
x = x.astype(np.float32) / 32768; hop = 512; fps = sr / hop
f, t, Z = sg.stft(x, sr, nperseg=2048, noverlap=2048 - hop); M = np.abs(Z); L = np.log1p(100 * M)
def smooth(a, s): k = max(1, int(s * fps)); return np.convolve(a, np.ones(k) / k, "same")
def peaks(env, gap, pct):
    env = env - smooth(env, .5); env[env < 0] = 0
    pk, _ = sg.find_peaks(env, distance=int(gap * fps), height=np.percentile(env, pct)); return [(p / fps, float(env[p] / env.max())) for p in pk]
on = peaks(np.r_[0, np.maximum(0, np.diff(L, axis=1)).sum(0)], .12, 90)            # anything struck or plucked
low = peaks(np.r_[0, np.maximum(0, np.diff(L[:12], axis=1)).sum(0)], .2, 97)       # drums and bass, below 130 Hz
acc = sorted([(a, s) for a, s in on if s >= .35] + [(a, s) for a, s in low if s >= .5])
merged = []
for a, s in acc:
    if merged and a - merged[-1][0] < .15: merged[-1] = (merged[-1][0], max(merged[-1][1], s))
    else: merged.append((a, s))
rms = smooth(np.sqrt((M ** 2).mean(0)), 1.5); rms /= rms.max()
dur = len(x) / sr
out = {"take": TAKE, "file": f"audio/{TAKE}.mp3", "duration": round(dur, 2), "phrases": phrases,
       "accents": [[round(a, 2), round(s, 2)] for a, s in merged],
       "energy": [round(float(rms[int(i * .5 * fps)]), 3) for i in range(int(dur * 2))]}          # loudness, two values per second
(HERE / "song.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(len(phrases), "phrases,", len(merged), "accents,", round(dur, 1), "s")

# ── the lyric font: only the characters the player draws ──
chars = set("".join(p[2] for p in phrases)) | set("河水不回答传闻听说")
src = HERE / "glyphs" / "src" / "fonts" / "LXGWWenKai-Medium.ttf"
if src.exists():
    subprocess.run(["pyftsubset", str(src), "--text=" + "".join(sorted(chars)), "--flavor=woff2", "--output-file=" + str(HERE / "glyphs" / "lyric.woff2")], check=True)
    print("lyric.woff2:", len(chars), "characters")
