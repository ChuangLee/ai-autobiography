// The film owns the only soundtrack. A scene owns its GPU device until its frame
// has dissolved. Normally just the visible scene is resident; its successor can
// prepare in the second slot shortly before the boundary.
import { loadSong, clamp } from "../lib.js";

const params = new URLSearchParams(location.search), still = params.has("t");
const riverPortrait = params.get("portrait") === "sitter";
const chapters = [
  [0, "prelude"], [18.9, "river"], ...(riverPortrait ? [[44.58, "sitter", "../portrait/sitter.html"]] : []), [55.92, "windows"], [88.4, "verse3"],
  [111.83, "dive"], [154.6, "verse4"], [192.7, "bridge"], [223, "finale"],
];
const $ = id => document.getElementById(id);
const stage = $("stage"), cover = $("cover"), start = $("start"), toggle = $("toggle"), track = $("track"), status = $("status");
const audio = new Audio();
audio.preload = "auto";
let duration = 263.63, current = null, spare = null, outgoing = null, retirement = 0;
let wanted = false, busy = true, dragging = false, position = 0, revision = 0, idleTimer;
let riverJoin = null;
const riverJoinSeconds = .52;
const chapterAt = t => chapters.findLastIndex(([begin]) => t >= begin);
const format = t => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
const displayTime = t => {
  track.value = t;
  $("clock").textContent = format(t) + " / " + format(Math.round(duration));
};
const captions = (slot, t) => {
  const [line, note] = slot.api.captionsAt(t), n = note ? "（" + note + "）" : "";
  if ($("lyrics").textContent !== line) $("lyrics").textContent = line;
  if ($("note").textContent !== n) $("note").textContent = n;
};
function report(message) {
  wanted = false; busy = false; audio.pause(); status.textContent = message;
  start.textContent = "重新播放"; cover.hidden = false; controls();
}
function controls() {
  const disabled = !window.filmSong || (busy && !current);
  toggle.disabled = disabled; start.disabled = disabled;
  toggle.textContent = wanted ? "暂停" : position >= duration - .02 ? "再看一次" : "播放";
  track.disabled = !window.filmSong;
  if (!wanted) document.body.classList.remove("quiet");
}
function wake() {
  document.body.classList.remove("quiet");
  clearTimeout(idleTimer);
  if (wanted) idleTimer = setTimeout(() => document.body.classList.add("quiet"), 2300);
}

function release(slot) {
  if (!slot || slot.dead) return;
  slot.dead = true;
  clearTimeout(slot.timeout);
  slot.resolve(null);
  slot.api?.dispose();
  slot.frame.remove();
}
function retire() {
  if (riverJoin) { riverJoin.frame.style.opacity = 1; riverJoin = null; }
  clearTimeout(retirement);
  release(outgoing); outgoing = null;
}
function allocate(index) {
  if (current?.index === index && !current.error) return current;
  if (spare?.index === index) return spare;
  retire(); release(spare);
  const frame = document.createElement("iframe");
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.title = chapters[index][1];
  const url = new URL(chapters[index][2] ?? "../" + chapters[index][1] + "/", location.href);
  // River grid is a scale factor. The dive's grid is an absolute cell count.
  const localGrid = chapters[index][1] + "Grid";
  for (const [key, value] of params) {
    if (key === localGrid) url.searchParams.set("grid", value);
    else if (!["t", "from", "film", "join", "t0", "grid", "riverGrid", "diveGrid"].includes(key)) url.searchParams.set(key, value);
  }
  url.searchParams.set("film", "1");
  const slot = { index, frame, dead: false, time: NaN, task: Promise.resolve(), job: 0 };
  slot.ready = new Promise(resolve => { slot.resolve = resolve; });
  slot.timeout = setTimeout(() => sceneError(slot, "场景载入超时"), 120000);
  spare = slot;
  frame.addEventListener("load", () => {
    if (!slot.dead && !frame.contentDocument?.querySelector("canvas")) sceneError(slot, "场景页面不可用");
  });
  frame.src = url.href;
  stage.appendChild(frame);
  return slot;
}
function sourceSlot(source) {
  return [spare, current].find(slot => slot && !slot.dead && slot.frame.contentWindow === source);
}
function sceneError(slot, message) {
  if (!slot || slot.dead) return;
  slot.error = new Error(chapters[slot.index][1] + " · " + message);
  clearTimeout(slot.timeout);
  slot.resolve(null);
  if (slot === current) report(slot.error.message);
}
window.sceneFailed = (source, message) => sceneError(sourceSlot(source), message);
window.sceneReady = (source, api) => {
  const slot = sourceSlot(source);
  if (!slot || slot.error) { api.dispose(); return; }
  clearTimeout(slot.timeout);
  slot.api = api;
  slot.resolve(api);
};

// Serialize writes to each scene's simulation buffers. Scrubbing can supersede
// a previous target while the GPU is working through a batch of fixed steps.
function prepare(slot, t) {
  if (slot.time === t && !slot.working && !slot.error) return Promise.resolve(true);
  slot.working = true; slot.time = NaN;
  const job = ++slot.job, cancelled = () => slot.dead || job !== slot.job;
  const work = slot.task.catch(() => {}).then(async () => {
    const api = await slot.ready;
    if (slot.error) throw slot.error;
    if (!api || cancelled()) return false;
    const done = await api.prepare(t, cancelled);
    if (slot.error) throw slot.error;
    if (done && !cancelled()) { slot.time = t; return true; }
    return false;
  });
  slot.task = work.finally(() => { if (slot.job === job) slot.working = false; });
  return slot.task;
}
// The witness in the two river views occupies the same mark. Let the current
// carry across on the song clock, so pausing or a dropped frame cannot leave a
// second silhouette behind the listener after the new camera starts to climb.
function mixRiver(t) {
  const u = clamp((t - chapters[riverJoin.index][0]) / riverJoinSeconds, 0, 1);
  if (u === 1) { retire(); return; }
  riverJoin.frame.style.opacity = u * u * (3 - 2 * u);
}
function show(slot, dissolve, t, continuous = false) {
  if (slot === current) {
    if (riverJoin) mixRiver(t);
    return;
  }
  retire();
  const previous = current;
  if (slot === spare) spare = null;
  current = slot;
  slot.frame.style.zIndex = 1;
  slot.frame.style.opacity = 1;
  const [begin, name] = chapters[slot.index];
  const enteringRiver = riverPortrait && name === "sitter";
  const enteringRoom = riverPortrait && previous && chapters[previous.index][1] === "sitter"
    && name === "windows";
  if (enteringRiver && previous && dissolve && chapters[previous.index][1] === "river"
      && (continuous || previous.time >= begin - .45) && t < begin + riverJoinSeconds) {
    outgoing = previous;
    outgoing.frame.style.zIndex = 0;
    riverJoin = slot;
    mixRiver(t);
  } else if (previous && dissolve && !enteringRiver && !enteringRoom) {
    outgoing = previous;
    previous.frame.style.zIndex = 0;
    slot.frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 850, easing: "ease-in-out" });
    retirement = setTimeout(retire, 860);
  } else release(previous);
  document.body.dataset.scene = chapters[slot.index][1];
}
async function resume() {
  if (!wanted || busy || dragging) return;
  try { await audio.play(); }
  catch (error) { if (error.name !== "AbortError" && wanted) report("点击继续播放 · " + error.message); }
}
async function seek(time, dissolve = true, continuous = false) {
  const target = clamp(Number.isFinite(time) ? time : 0, 0, duration), request = ++revision;
  audio.pause();
  busy = true; position = target; displayTime(target); controls();
  if (!still) status.textContent = "正在准备画面…";
  const index = chapterAt(target);
  if (current?.index === index && spare) { release(spare); spare = null; }
  const slot = allocate(index);
  try {
    if (!await prepare(slot, target) || request !== revision) return;
    audio.currentTime = target;
    show(slot, dissolve && !still, target, continuous); captions(slot, target);
    window.__err = ""; status.textContent = ""; busy = false; controls();
    if (wanted) await resume();
  } catch (error) {
    if (request !== revision) return;
    if (slot === spare) { release(spare); spare = null; }
    report(error.message);
    throw error;
  }
}
function go(t, continuous = false) { seek(t, true, continuous).catch(() => {}); }
function togglePlay() {
  if (wanted) {
    wanted = false; audio.pause();
  } else {
    wanted = true; cover.hidden = true;
    if (position >= duration - .02 || audio.ended) go(0);
    else if (!current || status.textContent && !busy) go(position);
    else resume();
  }
  controls(); wake();
}
function updateFrame() {
  if (!wanted || busy || dragging || audio.paused) return;
  const t = clamp(audio.currentTime, 0, duration), index = chapterAt(t);
  if (index !== current.index) {
    if (chapters[current.index][1] === "sitter" && chapters[index][1] === "windows") {
      // The camera has travelled through the cheek into this very room. Its
      // glyphs, shaders and device are already resident in the current scene.
      if (!current.api.frame(t)) { go(t, true); return; }
      retire();
      current.index = index;
      current.frame.title = "windows";
      document.body.dataset.scene = "windows";
    } else {
      if (spare?.index !== index || !Number.isFinite(spare.time) || spare.error || !spare.api.frame(t)) {
        go(t, true); return;
      }
      spare.time = t; show(spare, true, t, true);
    }
  } else {
    if (current.time !== t && !current.api.frame(t)) { go(t); return; }
    if (riverJoin) mixRiver(t);
  }
  current.time = position = t;
  captions(current, t); displayTime(t);
  const next = chapters[index + 1];
  if (next && chapters[index][1] !== "sitter" && next[0] - t < 7 && !spare && !outgoing) {
    const nextSlot = allocate(index + 1);
    prepare(nextSlot, next[0]).catch(error => sceneError(nextSlot, error.message));
  }
}
function tick() {
  try { updateFrame(); }
  catch (error) { sceneError(current, error.message); }
  requestAnimationFrame(tick);
}
audio.addEventListener("ended", () => {
  wanted = false; go(duration);
  cover.hidden = true; controls();
});
audio.addEventListener("error", () => report("音频加载失败，请检查网络后重新播放"));
start.onclick = toggle.onclick = togglePlay;
stage.onclick = togglePlay;
track.addEventListener("input", () => { dragging = true; audio.pause(); displayTime(+track.value); wake(); });
track.addEventListener("change", () => { dragging = false; go(+track.value); });
track.addEventListener("pointercancel", () => { if (dragging) { dragging = false; go(+track.value); } });
addEventListener("keydown", e => {
  if (!window.filmSong || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.code === "Space" && e.target.tagName !== "BUTTON") { if (!toggle.disabled) togglePlay(); e.preventDefault(); }
  if ((e.code === "ArrowLeft" || e.code === "ArrowRight") && e.target !== track) {
    go(position + (e.code === "ArrowRight" ? 3 : -3)); e.preventDefault(); wake();
  }
});
addEventListener("pointermove", wake);
addEventListener("pagehide", () => {
  revision++; wanted = false; audio.pause();
  release(spare); release(current); retire(); spare = current = null;
});
addEventListener("pageshow", e => {
  if (e.persisted && window.filmSong) { cover.hidden = still; go(position); }
});
try {
  window.filmSong = await loadSong();
  duration = filmSong.duration; track.max = duration;
  if (!still) audio.src = "../../../" + filmSong.file;
  if (still) { cover.hidden = true; $("controls").hidden = true; $("controls").style.display = "none"; }
  window.__at = async t => { await seek(t, false); return window.__err || "ok"; };
  await seek(Number(params.get(still ? "t" : "from")), false);
  if (still) document.title = "ready"; else requestAnimationFrame(tick);
} catch (error) {
  window.__err = error.message;
  report(error.message);
}
