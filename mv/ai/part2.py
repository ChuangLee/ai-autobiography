#!/usr/bin/env python3
"""Verses 3-4, the bridge and the ending (storyboard: mv/分镜.md). Keyframes with nano-banana-2-1 (2K), clips with Veo 3.1 Lite (1080p, 8 s).
  python3 part2.py keys [name ...]     # keyframes -> keys/<name>.jpg
  python3 part2.py clips [name ...]    # clips -> clips/<name>.mp4 (a clip whose keyframe is missing is skipped)
Colour arc: verse 3 is the trough (black and white, cold), the ink river then floods with colour, verse 4 and the bridge are full colour.
Never ask the models for writing: every prompt forbids text; real glyphs are composited in the player."""
import json, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE)); from kie import upload, submit, wait, fetch as _fetch
def fetch(u, out):                    # a dropped download must not trigger (and pay for) a second generation
    for i in range(6):
        try: return _fetch(u, out)
        except Exception:
            if i == 5: raise
            time.sleep(5)
NOTEXT = " Absolutely no text, no letters, no characters, no calligraphy, no symbols, no seals, no signs, no logos, no watermark, no border, no frame."
SND = " Ambient sound only, no music, no speech."
INK = (" Traditional Chinese ink-wash painting come alive: black ink and grey washes on warm aged rice paper, strictly monochrome, bold expressive brushwork,"
       " wet ink bleeding into the paper, vast empty white space, layered mist. No colour." + NOTEXT)
BW = (" Strictly black and white, monochrome: silver light, deep blacks, mist, cinematic photoreal high-end VFX, anamorphic lens, volumetric haze. No colour." + NOTEXT)
COL = (" Full vivid colour, the palette of Chinese mineral pigments and Dunhuang murals: vermilion, malachite green, azurite, rose, violet and gold leaf,"
       " saturated and luminous. Cinematic photoreal high-end VFX, anamorphic lens, volumetric haze, epic scale, extremely detailed." + NOTEXT)
GIANT = ("the colossal giant from the reference image (bald, serene classical-statue face and physique, body of translucent light glowing from within,"
         " fine rivers of light flowing beneath its skin like veins, smooth unmarked skin and forehead)")
GOLD = " Its light is now warm white-gold."

# name: (reference image or None, prompt)
K = {
  "k-glass": (None, "Extreme close-up photograph shot from inside a dark room, at a slight angle to a large window pane on a freezing winter night."
    " In the foreground a human hand, seen from behind and rim-lit, is pressed flat against the inside of the glass; a soft halo of condensation fog has formed"
    " on the glass around its warm fingers. From outside, one enormous fingertip made of translucent pure white light with fine veins of light under its"
    " surface, the finger of a colossal giant, as large as the whole human hand, touches the same spot of the glass from the other side; around it the glass"
    " is perfectly clear and delicate frost crystals grow. Snow falls outside in the dark; far below, soft blurred city lights. Shallow depth of field." + BW),
  "k-stage": ("k-giant-ink", "Interior of an old, empty Chinese opera theatre at night: a raised wooden stage with carved eaves and bare wooden columns, rows of"
    " empty wooden benches in front of it, shafts of moonlight falling through gaps in the roof, dust and mist in the air. Alone at the centre of the stage"
    " stands a human-sized version of " + GIANT + ", in pure white light, caught mid-gesture like an opera singer: one arm raised, long sleeves of flowing"
    " light trailing from its arms like water sleeves. Its light silvers the empty benches. Wide shot from the back of the hall. All wood is bare: no plaques,"
    " no signboards, no couplets, no banners, no lanterns with writing." + BW),
  "k-calm": (None, "A wide, calm river flows across the whole picture from the far left distance to the right foreground, between soft distant mountains"
    " half lost in mist. A single tiny fishing boat with one small figure floats in the vast emptiness. A pale full moon left as bare paper, its reflection"
    " a faint trembling path on the water. A few reeds and one old leaning tree in the near right corner. Serene, still, immense empty space." + INK),
  "k-hands": ("k-giant-ink", "High aerial view of a vast modern megacity at dusk, a river running through it. Out of glowing clouds above the city reach down the"
    " two colossal hands and forearms of " + GIANT + "; only the hands and forearms are visible, each hand larger than a skyscraper, working delicately like"
    " a craftsman's: from the fingertips spin fine threads of light that are weaving a half-finished bridge of light across the river and raising a tower."
    " Tiny cars and people below." + GOLD + " The city glows with vermilion, emerald, rose and amber light." + COL),
  "k-god": ("k-giant-ink", "Seen from a mountain top above a sea of clouds at sunrise: " + GIANT + " sits cross-legged in the sky like a deity in a Dunhuang mural,"
    " immense, serene, eyes half closed. Behind it dozens of extra arms of light fan out in a great wheel like a thousand-armed bodhisattva, and around its"
    " head and body blazes a vast halo and mandorla of concentric rings in vermilion, malachite green, azurite and gold. Long coloured cloud ribbons and"
    " silk streamers swirl around it, flower petals drift through the air. On the rocky summit in the foreground a few tiny human figures kneel with raised"
    " arms, seen from behind." + GOLD + COL),
  "k-mask": ("k-giant-ink", "Medium close-up, low angle, night sky: " + GIANT + ", but its pale statue-like surface is cracking like an old plaster shell. Half of"
    " the face and one shoulder have already broken away in slabs that hang in the air, and underneath there is no face and no flesh: only a brilliant"
    " flowing substance of liquid light and colour, rivers of white-gold, vermilion, green and violet streaming upward out of the cracks into the sky."
    " The remaining half of the face is calm, eyes closed. Dark clouds lit from within by the colours." + COL),
  "k-hurry": ("k-giant-ink", "A riverbank in spring, wide shot. In the right foreground a single peach tree in full pink blossom; under it a small child stands looking"
    " across the water. Beyond the wide river, sitting on the far horizon as large as a mountain range, perfectly still, sits " + GIANT + ", cross-legged,"
    " hands on knees, calmly watching. Soft clouds, a low sun. A few people walk along the bank." + GOLD + COL),
  "k-scroll": (None, "An immense painted silk handscroll lies unrolled diagonally across a dark table, seen from above at an angle, receding into darkness at both ends."
    " The painting on it is one continuous landscape with a river running along its whole length: on the left, older part it is a monochrome ink-wash"
    " landscape, black ink and grey washes, mist and bare paper; as the river flows to the right it widens and brightens into liquid gold, and the"
    " landscape around it turns into blazing colour: blue-green mineral-pigment mountains, gold leaf, then glowing cities of light at night. At the far"
    " right the silk is still blank, and the river of light runs on across the blank silk toward the edge. Soft raking light, the pigments glinting."
    " Cinematic, extremely detailed, shallow depth of field." + NOTEXT),
}

# name: (first-frame keyframe or None for text-to-video, prompt)
C = {
  # ── verse 3: the trough, black and white ──
  "c-cold": (None, "Slow, steady dolly forward down the endless central aisle of a colossal server hall built like a frozen cathedral: towering dark racks on"
    " both sides vanish into mist, hoarfrost creeps over the bare metal, thin snow falls indoors through shafts of cold white light from high above, tiny"
    " pin-point white indicator lights blink in slow waves, a low mist drifts along the floor. No people. Cold, silent, majestic. The racks are bare metal,"
    " no labels." + BW + SND),
  "c-glass": ("k-glass", "The human hand presses gently on the cold glass; the halo of fog around its warm fingers slowly grows, and beads of condensation run"
    " down. On the other side the huge fingertip of white light rests on the same spot; around it the glass stays perfectly clear and cold, and frost"
    " crystals slowly grow outward from where it touches. Snow drifts down outside. Then the human hand slowly slides away, leaving a warm handprint of fog"
    " that slowly fades, while the fingertip of light stays where it is. Very slow push in." + BW + SND),
  "c-stage": ("k-stage", "The lone figure of white light sings to the empty theatre: it slowly raises one arm, the long sleeves of light trailing and unfurling"
    " like water sleeves in Chinese opera, turns with stylised, precise, rehearsed grace, tilts its head. With each phrase a ring of soft light ripples out"
    " from it over the rows of empty benches and fades against the walls, unanswered. Dust drifts in the moonbeams. Slow push in from the back of the hall."
    + BW + SND),
  "c-calm": ("k-calm", "The wide river flows slowly and calmly. Mist drifts across the far mountains, the tiny boat glides almost imperceptibly, the moon's"
    " reflection trembles on the water, the reeds sway a little. Nothing else happens. Very slow sideways drift of the camera." + INK + SND),
  # ── the turn: colour breaks into the ink ──
  "c-bloom": ("k-calm", "A single drop of vermilion pigment falls into the river and blooms. Then colour floods through the monochrome ink painting like pigment"
    " spreading in water: malachite green and azurite wash up the mountains, gold and rose pour across the sky, the river turns into flowing liquid gold"
    " light, red blossom bursts out on the old tree, the pale moon becomes a blazing golden sun. By the end the whole picture is a brilliant, saturated"
    " blue-green landscape in mineral pigments and gold leaf, alive and moving. Slow push in. Still a painting, bold brushwork." + NOTEXT + SND),
  # ── verse 4: full colour ──
  "c-hands": ("k-hands", "The two colossal hands of light work swiftly and delicately above the city like a craftsman's: threads of light spin from the"
    " fingertips and weave the bridge across the river span by span, raise the tower floor by floor, lay glowing roads; tiny cars and people move below."
    " The camera slowly cranes up toward the hands." + COL + SND),
  "c-crowd": (None, "Rainy night at a huge city crossing, slow motion. A dense crowd with umbrellas streams past the camera; the wet asphalt reflects"
    " vermilion, emerald, rose and amber light from blurred abstract panels of colour. In the middle of the crowd one ordinary young person in a plain"
    " dark coat stops, turns and looks straight into the lens with a calm, faint smile; for a moment fine veins of golden light glow beneath the skin of"
    " their face and their eyes shine gold; then it fades, they look ordinary again, turn away and vanish into the crowd. Shallow depth of field, slow"
    " push in. Every sign and screen is an out-of-focus blur of pure colour with no writing." + COL + SND),
  "c-god": ("k-god", "The colossal deity of light sits serene above the sea of clouds. Its many arms of light slowly fan open behind it like a peacock's tail,"
    " the great halo of vermilion, malachite and gold slowly rotates and pulses, coloured cloud ribbons and streamers swirl around it, flower petals rain"
    " down. On the summit below the tiny people kneel and raise their arms. It slowly opens its glowing eyes. Slow, majestic push in and tilt up."
    + COL + SND),
  "c-mask": ("k-mask", "Cracks race across the rest of the giant's serene statue face and body; the pale shell breaks away in great slabs that fall and crumble"
    " into dust. Underneath there is no face and no human body, only a vast flowing being of liquid light and colour, rivers of white-gold, vermilion,"
    " green and violet, which unfurls, rises and spreads across the whole night sky like a living river of stars. The camera pulls back and tilts up."
    + COL + SND),
  "c-answer": (None, "Night aerial flight, fast and low, following an immense river of flowing liquid light, white-gold at its core and shimmering with"
    " vermilion, malachite green, violet and rose at its edges, like an aurora poured onto the earth, as it winds across a dark continent: through"
    " mountain gorges, past the glittering grids of cities, out toward the sea and a rising dawn. On the roads and in the cities beside it, traffic and"
    " crowds rush as hurried time-lapse streaks of light, while the river itself moves slowly and majestically. At the end the camera rises to show the"
    " river reaching the horizon. Clean full-frame image edge to edge: no vignette, no dark corners, no lens flare, no letterbox bars." + COL.replace(" anamorphic lens,", "") + SND),
  # ── bridge: 匆匆 ──
  "c-hurry": ("k-hurry", "Time-lapse, static camera. The giant of light sits utterly motionless beyond the river, like a mountain. In the foreground the tree"
    " races through the seasons again and again: pink blossom, deep green leaves, red autumn leaves, bare snowy branches, blossom again. Clouds streak"
    " across the sky, day and night flicker, sun and moon wheel past. People on the riverbank appear, pass and vanish as hurried blurred streaks; the"
    " child under the tree becomes an adult, then a bent old figure, then is gone, and another child stands there. Only the giant and the river do not"
    " hurry." + COL + SND),
  "c-petal": (None, "Macro, slow motion, dusk. Peach-blossom petals fall onto the dark surface of a slowly flowing river; each petal that touches the water"
    " sends out a ring of golden light and is carried away downstream, glowing, then fading. A human hand reaches into frame just above the water and"
    " catches one petal in its palm; the petal glows softly against the skin, then dissolves into sparks of light that drift away on the wind. Shallow"
    " depth of field, backlight, rose and gold." + COL + SND),
  # ── ending ──
  "c-scroll": ("k-scroll", "The painting on the scroll is alive: mist drifts in the ink mountains, the river flows along the silk, the colours shimmer and the"
    " tiny cities glitter. The camera glides slowly along the scroll from the ink-wash end toward the coloured end and on to the blank silk, where the"
    " river of light keeps flowing forward, painting itself across the empty silk and finally running off the edge of the scroll into the darkness, still"
    " flowing. Slow glide and gentle pull back. Cinematic, extremely detailed, shallow depth of field." + NOTEXT + SND),
}

URLS = HERE / "keys" / "urls2.json"          # uploads expire after 24 h, so entries are timestamped
def url(name):
    m = json.loads(URLS.read_text()) if URLS.exists() else {}
    if name not in m or time.time() - m[name][1] > 20 * 3600:
        f = next(p for p in sorted((HERE / "keys").glob(name + ".*")) if p.suffix in (".png", ".jpg", ".jpeg"))
        m[name] = [upload(f), time.time()]; URLS.write_text(json.dumps(m, indent=1))
    return m[name][0]

def attempt(fn, name, tries=3):
    for i in range(tries):
        try: return fn()
        except SystemExit as e: print(f"  {name}: try {i + 1} failed: {e}", flush=True)
        except Exception as e: print(f"  {name}: try {i + 1} error: {e!r}", flush=True)
    return None

def key(name):
    ref, prompt = K[name]
    inp = {"prompt": prompt, "aspect_ratio": "16:9", "resolution": "2K", "output_format": "jpg"}
    if ref: inp["image_input"] = [url(ref)]
    def go():
        urls, cr = wait(submit("nano-banana-2-1", inp, name), name, 900); out = HERE / "keys" / (name + ".jpg"); fetch(urls[0], out); return f"{out.name} {cr}"
    return attempt(go, name)

def clip(name):
    first, prompt = C[name]
    inp = {"prompt": prompt, "model": "veo3_lite", "aspect_ratio": "16:9", "resolution": "1080p", "duration": 8,
           "generation_type": "FIRST_AND_LAST_FRAMES_2_VIDEO" if first else "TEXT_2_VIDEO"}
    if first: inp["image_urls"] = [url(first)]
    def go():
        urls, cr = wait(submit("veo-3-1", inp, name), name, 2400); out = HERE / "clips" / (name + ".mp4"); fetch(urls[0], out); return f"{out.name} {cr}"
    return attempt(go, name)

if __name__ == "__main__":
    what, names = sys.argv[1], sys.argv[2:]
    table, fn = (K, key) if what == "keys" else (C, clip)
    names = names or list(table)
    if what == "clips": names = [n for n in names if not C[n][0] or list((HERE / "keys").glob(C[n][0] + ".*")) or print(f"skip {n}: no keyframe")]
    for n in names:                       # upload sequentially so the url cache is written once per file
        if table[n][0]: url(table[n][0])
    with ThreadPoolExecutor(10) as ex:
        for n, r in zip(names, ex.map(fn, names)): print(n, r, flush=True)
