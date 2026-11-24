#!/usr/bin/env node
// Still frames of a lab scene with headless Chrome (software WebGPU; slow but exact).
//   node shot.mjs <scene> <t1,t2,...> [--out dir] [--res 0.5] [--q "n=20000&x=1"] [--limit minutes]
import { spawn } from "node:child_process"; import { createServer } from "node:http"; import { readFile, mkdir, writeFile, mkdtemp, rm } from "node:fs/promises"; import { tmpdir } from "node:os"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), mv = path.join(here, ".."), audio = path.join(mv, "..", "review", "web", "audio");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const scene = process.argv[2], times = process.argv[3].split(",").map(Number), out = arg("out", path.join(here, "shots")), res = +arg("res", .5), extra = arg("q", "");
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".png": "image/png", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".wgsl": "text/plain", ".bin": "application/octet-stream" };
const server = createServer(async (req, res2) => { try { let rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, ""); if (rel.endsWith("/")) rel += "index.html";
  const f = rel.startsWith("audio/") ? path.join(audio, rel.slice(6)) : rel.startsWith("mv/") ? path.join(mv, rel.slice(3)) : null; const body = await readFile(f);
  res2.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream", "Content-Length": body.length, "Cache-Control": "no-store" }); res2.end(body); } catch { res2.writeHead(404); res2.end(); } });
server.keepAliveTimeout = 600000; server.headersTimeout = 610000;
await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port, profile = await mkdtemp(path.join(tmpdir(), "lab-"));
const W = Math.round(1920 * res), H = Math.round(1080 * res);
const chrome = spawn(process.env.CHROME || "google-chrome", ["--headless=new", "--no-sandbox", "--enable-unsafe-webgpu", "--enable-features=Vulkan,WebGPU", "--use-vulkan=swiftshader", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage", "--ignore-gpu-blocklist", "--hide-scrollbars", "--remote-debugging-port=0", "--user-data-dir=" + profile, `--window-size=${W},${H}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"], detached: true });
// Never leave Chrome behind: kill its whole process group on exit, on signals, after --limit minutes (default 40),
// and, through a small watchdog, even if this process is killed outright.
const cleanup = () => { try { process.kill(-chrome.pid, "SIGKILL"); } catch {} };
spawn("sh", ["-c", `while kill -0 ${process.pid} 2>/dev/null; do sleep 5; done; kill -9 -${chrome.pid} 2>/dev/null; rm -rf '${profile}'`], { detached: true, stdio: "ignore" }).unref();
for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => { cleanup(); process.exit(1); });
setTimeout(() => { console.log("[limit] giving up"); cleanup(); process.exit(2); }, +arg("limit", 40) * 60000).unref();
const wsBase = await new Promise((ok, no) => { let b = ""; chrome.stderr.on("data", (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (m) ok(m[1]); }); chrome.on("exit", () => no(new Error("chrome exited"))); });
const dbg = new URL(wsBase).port, url = `http://127.0.0.1:${port}/mv/lab/${scene}/?res=${res}&t=${times[0]}${extra ? "&" + extra : ""}`;
const tab = await (await fetch(`http://127.0.0.1:${dbg}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0, pageError = ""; const waiters = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled") console.log("[page]", m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 2000));
  if (m.method === "Runtime.exceptionThrown") { pageError = (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "page exception").slice(0, 2000); console.error("[exception]", pageError); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; waiters.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => { const m = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600)); return m.result.result.value; };
await send("Runtime.enable"); await send("Page.enable"); await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false }); await send("Page.navigate", { url });
await mkdir(out, { recursive: true }); const t00 = Date.now();
try {
  let ready = false;
  for (let k = 0; k < 600; k++) {
    const state = await ev("({ready: document.title === 'ready', error: window.__err || ''})");
    if (state.error || pageError) throw Error(state.error || pageError);
    if (state.ready) { ready = true; break; }
    await new Promise(r => setTimeout(r, 500));
  }
  if (!ready) throw Error("Scene never reached its ready frame");
  for (const t of times) {
    const r = await ev(`window.__at(${t})`);
    if (r !== "ok" || pageError) throw Error(pageError || r);
    const shot = await send("Page.captureScreenshot", { format: "png" }); const f = path.join(out, `${scene.replace(/\//g, "_")}-${String(t).replace(".", "_")}.png`); await writeFile(f, Buffer.from(shot.result.data, "base64")); console.log(f, ((Date.now() - t00) / 1000).toFixed(1) + "s"); }
} finally { cleanup(); server.close(); await rm(profile, { recursive: true, force: true }).catch(() => {}); }
