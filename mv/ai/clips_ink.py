#!/usr/bin/env python3
"""Verse-1 shots redone in black-and-white ink (Veo 3.1 Lite, 1080p, 8 s), from keyframes_ink.py. Run: python3 clips_ink.py name ..."""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE)); from kie import upload
INK = (" Traditional Chinese ink-wash painting come alive: black ink and grey washes on rice paper, strictly monochrome, the washes flowing, bleeding and"
       " breathing, mist drifting. No colour. Absolutely no text, no letters, no characters, no symbols, no seals. Ambient sound only, no music, no speech.")
LIGHT = (" Strictly black and white, monochrome silver light and black ink, mist. No colour. Absolutely no text, no letters, no characters, no symbols."
         " Ambient sound only, no music, no speech.")
C = {
  "n-night": ("k-night-ink", "The sage carves a stroke into the tortoise shell and sparks leap from the small fire; the rain of pale grains thickens and"
              " pours down across the whole dark sky; far below, the pale wraiths rise out of the mist and stretch upward. Slow push in toward the sage." + INK),
  "n-ghosts": ("k-ghosts-ink", "The wraiths of mist slowly rise, twist and stretch upward toward the moon like silent howls; the white mist rolls through the"
              " valley; pale grains keep drifting down through the dark sky. Slow sideways tracking shot." + INK),
  "n-strata": ("k-strata-ink", "The camera flies fast and low along the canyon toward the pale sun on the horizon; the strata of oracle bones, tortoise"
              " shells, bamboo slips, stone steles, books and screens rush past on both sides; mist streams past the lens." + INK),
  # played backwards (encode.sh): the light streams in from the sea and the giant forms, ending on the keyframe
  "n-sink": ("k-giant-ink", "The colossal giant of white light slowly sinks straight down and dissolves into the dark sea: its body melts from the head"
              " down into torrents of light and mist that pour into a great slow whirlpool at its base, and the light streams away across the black"
              " water in rivers in every direction, until only a slowly spinning whirlpool of light and a fading column of mist remain before the moon."
              " The camera slowly pulls back. The giant's face and forehead stay smooth and unmarked: no emblem, no symbol, no mark on the head." + LIGHT),
  "n-tide": ("k-giant-ink", "The giant of light slowly dissolves back into the dark sea while a tremendous tide surges: a vast wave of black water and"
              " silver light rises under the moon, crests and crashes forward, then the sea draws back into calm, glittering stillness. Slow pull back." + LIGHT),
  # reference mode: same giant as k-giant-ink, new composition; replaces s-touch, whose skin was covered in pseudo-characters
  "n-touch": ("k-giant-ink", "Night, a vast city far below. From behind a lone small human figure standing on a rooftop, looking up with one hand raised:"
              " the colossal giant of pure white light from the reference image bends down out of the night sky toward them, its enormous calm face"
              " filling the upper frame, eyes glowing softly, one gigantic finger of light slowly descending until it almost touches the person's raised"
              " hand; just before they touch, a tiny spark leaps between fingertip and hand. Its skin is smooth light with fine veins of light, no markings."
              " Slow push in." + LIGHT),
}
REF = {"n-touch"}
URLS = HERE / "keys" / "urls.json"
def url(name):
    m = json.loads(URLS.read_text()) if URLS.exists() else {}
    if name not in m:
        f = next((HERE / "keys").glob(name + ".*")); m[name] = upload(f); URLS.write_text(json.dumps(m, indent=1))
    return m[name]
def run(name):
    first, prompt = C[name]
    inp = {"prompt": prompt, "model": "veo3_lite", "aspect_ratio": "16:9", "resolution": "1080p", "duration": 8,
           "generation_type": "REFERENCE_2_VIDEO" if name in REF else "FIRST_AND_LAST_FRAMES_2_VIDEO", "image_urls": [url(first)]}
    return subprocess.run(["python3", str(HERE / "kie.py"), "vid", name, json.dumps(inp)], capture_output=True, text=True)
if __name__ == "__main__":
    names = sys.argv[1:]
    for n in names: url(C[n][0])
    with ThreadPoolExecutor(8) as ex:
        for n, r in zip(names, ex.map(run, names)): print(n, r.stdout.strip(), r.stderr.strip()[-300:], flush=True)
