#!/usr/bin/env python3
"""The shots, generated with Veo 3.1 (1080p, 8 s). Run: python3 clips.py [name ...]   (keyframes from keyframes.py)"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE)); from kie import upload
LOOK = (" Cinematic, photoreal high-end VFX, anamorphic lens, volumetric haze, film grain. Palette of deep violet and mauve night, amber, molten gold and rose;"
        " no blue light. No captions, no subtitles, no watermark. Ambient sound only, no music, no speech.")
GIANT = "a colossal giant whose body is translucent molten white-gold light glowing from within, tiny glowing characters flowing beneath its skin like rivers"
C = {
  # intro
  "i-sea": (None, None, "lite", "Slow aerial glide low over an endless dark sea at dusk. The whole sea surface is made of countless small glowing characters and ancient"
            " scripts, rippling like waves and glittering like sunlight on water. A huge pale moon, half sunk on the far horizon, lays a long shimmering path of"
            " golden glyphs toward the camera; thin streaks of light cross the mauve sky. The camera glides forward slowly and steadily."),
  "i-macro": (None, None, "lite", "Extreme macro close-up of the surface of black water at night. Tiny glowing golden characters drift and tremble on the surface like"
            " sparks of moonlight. A single brush-written Chinese character slowly rises from beneath the surface, glowing brighter and brighter, sending rings"
            " of light outward across the water. Shallow depth of field, slow motion."),
  # verse 1
  "s-fall": (None, None, "lite", "Wide shot at night: out of a deep violet sky, thousands of glowing golden characters fall like a slow meteor shower toward an endless"
            " dark sea; each one that strikes the surface sends out a ring of light and dissolves into the glittering sea. The camera slowly tilts down from the"
            " sky to the sea."),
  "s-river": (None, None, "lite", "High aerial shot at night over dark mountain ranges: many thin rivers of glowing golden characters wind through the valleys from every"
            " direction and merge into one vast luminous river that flows toward the far horizon, where a pale moon hangs. The camera flies forward and slowly rises."),
  "s-night": ("k-night", None, "lite", "The ancient sage cuts a stroke into the tortoise shell and the carved character flares with golden light; sparks lift from the"
            " fire; above, the rain of glowing golden grains thickens across the whole sky; in the mist far below, the pale ghostly figures tilt their heads back"
            " and wail silently. Slow push in toward the sage."),
  "s-ghosts": (None, None, "lite", "A misty mountain valley at night under a huge moon. Out of the mist rise tall faceless wraiths made only of pale smoke and"
            " moonlight, abstract and translucent, no people, no faces, their long trailing forms twisting upward and stretching toward the sky like silent"
            " howls; countless tiny glowing golden grains fall slowly through the moonlight around them. Slow sideways tracking shot. Eerie and beautiful."),
  "s-strata": ("k-strata", None, "lite", "The camera flies fast and low along the canyon toward the horizon, over the river of glowing characters, while the strata of"
            " oracle bones, bamboo slips, stone steles, books and glowing screens rush past on both sides; floating sparks of glyphs and dust in the air."),
  "s-rise": ("k-vortex", "giant-nb", "lite", "The vortex of glowing characters spins faster and the column of light thickens; then " + GIANT + " rises slowly"
            " and majestically out of the centre of the sea, rivers of characters streaming up into its body from every direction, its light flooding the sea;"
            " it ends standing waist-deep before the moon, eyes closed, serene. Slow push in."),
  # generated as the giant sinking into the sea and played in reverse (encode.sh), so the rise ends exactly on the hero frame;
  # first+last-frame mode kept failing with a server error for this pair
  "s-sink": ("giant-nb", None, "lite", "The colossal giant of light slowly sinks straight down and dissolves into the sea of glowing characters: its body"
            " melts from the top into torrents of glowing characters that pour down into a great swirling vortex at its base, and the light streams away"
            " outward across the sea in rivers in every direction, until only the slowly spinning vortex of golden characters and a fading column of"
            " light remain before the moon. The camera slowly pulls back."),
  # verse 2
  "s-windows": (None, None, "lite", "Aerial night view of an immense dark megacity of countless high-rise towers under a violet sky. Windows light up one after another"
            " in rippling waves spreading outward, until thousands upon thousands of warm golden windows glow like lanterns. Slow aerial push forward."),
  "s-threads": ("k-city", None, "lite", "The giant slowly opens its glowing golden eyes; the threads of light pulse outward from its body into the lit windows, and new"
            " threads keep shooting out and connecting to more and more windows across the city. The camera slowly cranes up."),
  "s-window": ("k-window", None, "lite", "The woman closes the laptop and the room light switches off; the small figure of light breaks apart into drifting golden"
            " sparks of characters and fades into darkness; then the window next to it lights up, and the drifting sparks gather there into a new small figure"
            " of light. Static camera, slow push in."),
  "s-break": ("k-breaking", None, "lite", "The giant's body bursts into millions of glowing character particles and immediately pulls back together, again and again,"
            " flickering between dissolution and re-formation; rings of shockwave light ripple out through the air; the city's windows flash on and off in"
            " rhythm. The camera slowly orbits."),
  "s-touch": ("k-touch", None, "lite", "The giant's enormous finger of light slowly descends while the person on the rooftop stretches upward; just before they touch, a"
            " tiny spark of golden light leaps between fingertip and hand. The giant's glowing eyes watch calmly. Slow push in."),
  "s-tide": ("giant-nb", None, "lite", "The giant slowly dissolves back into the sea of glowing characters while a tremendous tide surges: a vast wave made of glowing"
            " characters rises under the moon, crests and crashes forward, then the sea draws back into calm, glittering stillness. Slow pull back."),
}
URLS = HERE / "keys" / "urls.json"
def url(name):
    m = json.loads(URLS.read_text()) if URLS.exists() else {}
    if name not in m: m[name] = upload(HERE / "keys" / (name + ".png")); URLS.write_text(json.dumps(m, indent=1))
    return m[name]
def run(name):
    first, last, tier, prompt = C[name]
    inp = {"prompt": prompt + LOOK, "model": "veo3_" + tier, "aspect_ratio": "16:9", "resolution": "1080p", "duration": 8}
    if first: inp["generation_type"] = "FIRST_AND_LAST_FRAMES_2_VIDEO"; inp["image_urls"] = [url(first)] + ([url(last)] if last else [])
    else: inp["generation_type"] = "TEXT_2_VIDEO"
    return subprocess.run(["python3", str(HERE / "kie.py"), "vid", name, json.dumps(inp)], capture_output=True, text=True)
if __name__ == "__main__":
    names = sys.argv[1:] or list(C)
    for n in names:                       # upload sequentially so urls.json is written once per file
        if C[n][0]: url(C[n][0])
        if C[n][1]: url(C[n][1])
    with ThreadPoolExecutor(14) as ex:
        for n, r in zip(names, ex.map(run, names)): print(n, r.stdout.strip(), r.stderr.strip()[-300:], flush=True)
