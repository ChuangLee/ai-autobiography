#!/usr/bin/env node
// Render frames of the MV with one headless Chrome, driven over the DevTools protocol (Node 22+, no packages).
//   node frames.mjs --take v2-a-1 --shots 5,60,150 [--out shots]          check frames (JPEG)
//   node frames.mjs --take v2-i-1 --video out.mp4 [--fps 30] [--audio audio/v2-i-1.mp3]   (needs clips/ next to index.html)
// The second form pipes PNG frames into ffmpeg; run it on your own machine, not on the server.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const take = arg("take", "v2-i-1"), fps = +arg("fps", 30);
const chromeBin = arg("chrome", process.env.CHROME || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "google-chrome"));

const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript; charset=utf-8", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".png": "image/png", ".woff2": "font/woff2" };
// serves mv/ (and ../audio for the songs), with byte ranges so the browser can seek inside the clips
const audioDir = arg("audio-dir", path.join(here, "..", "review", "web", "audio"));
const server = createServer(async (req, res) => {
  try { const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const f = rel.startsWith("audio/") ? path.join(audioDir, rel.slice(6)) : path.join(here, rel);
    const body = await readFile(f), type = types[path.extname(f)] || "application/octet-stream", m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (m) { const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], body.length - 1) : body.length - 1;
      res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${a}-${b}/${body.length}`, "Content-Length": b - a + 1 }); res.end(body.subarray(a, b + 1)); }
    else { res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": body.length }); res.end(body); } }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port, profile = await mkdtemp(path.join(tmpdir(), "mv-"));
const chrome = spawn(chromeBin, ["--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars", "--remote-debugging-port=0", "--user-data-dir=" + profile, "--window-size=1920,1080", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsBase = await new Promise((res, rej) => { let b = ""; chrome.stderr.on("data", (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) res(m[1]); }); chrome.on("exit", () => rej(new Error("chrome exited"))); });
const dbg = new URL(wsBase).port;
const tab = await (await fetch(`http://127.0.0.1:${dbg}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/index.html?take=${take}&t=0`)}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const waiters = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; waiters.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const m = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 400)); return m.result.result.value; };
let ok = false; for (let i = 0; i < 600 && !(ok = (await ev("document.title")) === "ready") && !(await ev("document.title")).startsWith("error"); i++) await new Promise((r) => setTimeout(r, 100));
if (!ok) { const why = await ev("document.title + ' | ' + location.href"); chrome.kill(); server.close(); console.error("page did not become ready:", why); process.exit(1); }
const DUR = await ev("window.DUR");
const frame = async (t, type) => Buffer.from((await ev(`(async () => { await renderAt(${t}); return document.getElementById("c").toDataURL("image/${type}", .9); })()`)).split(",")[1], "base64");

try {
  if (arg("shots")) {
    const out = path.resolve(arg("out", "shots")); await mkdir(out, { recursive: true });
    for (const t of arg("shots").split(",").map(Number)) await writeFile(path.join(out, `f_${t.toFixed(2).padStart(7, "0")}.jpg`), await frame(t, "jpeg"));
    console.log("frames written to", out);
  } else if (arg("video")) {
    const audio = arg("audio"), n = Math.ceil(DUR * fps);
    const ff = spawn("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", ...(audio ? ["-i", audio] : []), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", arg("crf", "17"), ...(audio ? ["-c:a", "aac", "-b:a", "256k", "-shortest"] : []), arg("video")], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = 0; i < n; i++) { if (!ff.stdin.write(await frame(i / fps, "png"))) await new Promise((r) => ff.stdin.once("drain", r)); if (i % 150 === 0) console.log(`${i}/${n}`); }
    ff.stdin.end(); await new Promise((r) => ff.on("exit", r));
  }
} finally { ws.close(); chrome.kill(); server.close(); await rm(profile, { recursive: true, force: true }).catch(() => {}); }
