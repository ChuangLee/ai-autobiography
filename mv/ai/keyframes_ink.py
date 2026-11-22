#!/usr/bin/env python3
"""Ink-wash keyframes for verse 1 (black and white, traditional). Run: python3 keyframes_ink.py [name ...]"""
import json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
HERE = Path(__file__).parent
INK = (" Traditional Chinese ink-wash painting (shuimo) brought to life as a cinematic film still: black ink and grey washes on warm aged rice paper,"
       " strictly monochrome, no colour at all, bold expressive brushwork, wet ink bleeding into the paper fibres, dry-brush texture, vast empty white space,"
       " layered mist, masterful Song-dynasty landscape composition, epic scale, extremely detailed."
       " Absolutely no text, no calligraphy, no inscriptions, no characters, no seals, no signature, no border, no frame.")
K = {
  "k-night-ink": "Night of the invention of writing. On a high rocky ledge above an abyss of mist, an ancient sage with long wild hair and a rough fur cloak"
    " kneels beside a small fire and carves into a large tortoise shell with a bronze knife; sparks rise. The sky above is a dark ink wash in which countless"
    " pale grains of millet pour down like a slow rain of light. Far below, half lost in the mist, faint pale wraith-like shapes rise. A pale full moon"
    " left as bare paper inside dark ink clouds." + INK,
  "k-ghosts-ink": "A deep mountain valley at night under a huge pale moon left as bare paper. Out of the white mist rise tall faceless wraiths painted only"
    " with thin grey ink washes and blank paper, abstract and translucent, no people, no faces, twisting upward toward the sky like silent howls."
    " Countless tiny pale grains drift down through the dark ink sky. Jagged ink cliffs on both sides." + INK,
  "k-strata-ink": "Low flight through a colossal canyon. Its towering cliff walls are strata of the history of writing, painted in ink: at the bottom heaps"
    " of oracle bones and tortoise shells, above them bundles of bamboo slips bound with cord, then rows of tall stone steles, then walls of stacked"
    " thread-bound books and rolled scrolls, and along the top rim rows of blank glowing screens. A river of pale light runs along the canyon floor toward"
    " a pale moon on the horizon. Mist between the layers." + INK,
  "k-giant-ink": "The same colossal giant as in the reference image (bald, serene classical-statue face and body), but now seen in black and white: its body"
    " is translucent pure white light glowing from within, fine rivers of light flowing beneath its skin like veins. It stands waist-deep in a vast dark sea"
    " of black ink and churning mist before a huge pale moon, eyes closed, serene, its light silvering the ink waves and mist around it. Wide shot, epic scale."
    " Strictly black and white, monochrome, no colour, no gold. Black ink washes, rice-paper texture, mist. Absolutely no text, no letters, no characters,"
    " no symbols on the sea or on the body, no seals, no border.",
}
REFS = {"k-giant-ink": [(HERE / "keys" / "giant-nb.url").read_text().strip()]}
def run(name):
    inp = {"prompt": K[name], "aspect_ratio": "16:9", "resolution": "2K"}
    if name in REFS: inp["image_input"] = REFS[name]
    return subprocess.run(["python3", str(HERE / "kie.py"), "img", name, "nano-banana-2", json.dumps(inp)], capture_output=True, text=True)
if __name__ == "__main__":
    names = sys.argv[1:] or list(K)
    with ThreadPoolExecutor(8) as ex:
        for n, r in zip(names, ex.map(run, names)): print(n, r.stdout.strip(), r.stderr.strip()[-300:], flush=True)
