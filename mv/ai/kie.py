#!/usr/bin/env python3
"""Tiny KIE client for the MV: submit image/video jobs, wait, download. Key from /etc/zichengjing/kie.env.
  python3 kie.py img  <name> <model> '<json input>'      # submit, wait, save to keys/<name>.<ext>
  python3 kie.py vid  <name> '<json input>'              # Veo 3.1, save to clips/<name>.mp4
  python3 kie.py up   <file>                             # upload a local file, print its URL
Every task is logged in jobs.jsonl so nothing is lost if a wait is interrupted."""
import json, sys, time, urllib.request, mimetypes, uuid
from pathlib import Path
HERE = Path(__file__).parent
KEY = [l.split("=", 1)[1].strip() for l in open("/etc/zichengjing/kie.env") if l.startswith("KIE_API_KEY=")][0]
H = {"Authorization": "Bearer " + KEY, "User-Agent": "mv-client"}

def call(url, body=None, headers=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = dict(H, **(headers or {}));
    if body is not None: h["Content-Type"] = "application/json"
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=120) as r: return json.load(r)
        except Exception as e:
            if i == 4: raise
            time.sleep(3 + i * 3)

def upload(path):
    path = Path(path); b = "----" + uuid.uuid4().hex; ct = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    parts = [f'--{b}\r\nContent-Disposition: form-data; name="uploadPath"\r\n\r\nimages/mv\r\n'.encode(),
             f'--{b}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n{path.name}\r\n'.encode(),
             f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\nContent-Type: {ct}\r\n\r\n'.encode() + path.read_bytes() + b"\r\n",
             f"--{b}--\r\n".encode()]
    r = call("https://kieai.redpandaai.co/api/file-stream-upload", raw=b"".join(parts), headers={"Content-Type": "multipart/form-data; boundary=" + b})
    if r.get("code") != 200: raise SystemExit(f"upload failed: {r}")
    return r["data"]["downloadUrl"]

def submit(model, inp, name):
    r = call("https://api.kie.ai/api/v1/jobs/createTask", {"model": model, "input": inp})
    if r.get("code") != 200: raise SystemExit(f"{name}: createTask failed: {r}")
    tid = r["data"]["taskId"]
    with open(HERE / "jobs.jsonl", "a") as f: f.write(json.dumps({"name": name, "model": model, "taskId": tid, "input": inp, "at": time.time()}, ensure_ascii=False) + "\n")
    return tid

def wait(tid, name, limit=1800):
    t0 = time.time()
    while time.time() - t0 < limit:
        r = call(f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={tid}")
        if r.get("code") != 200: raise SystemExit(f"{name}: {r.get('msg')}")
        d = r["data"]
        if d["state"] == "success":
            resp = d.get("response") or json.loads(d.get("resultJson") or "{}")
            urls = resp.get("resultUrls") or resp.get("result_urls") or (resp.get("data") or {}).get("result_urls") or []
            return urls, d.get("creditsConsumed")
        if d["state"] == "fail": raise SystemExit(f"{name}: failed: {d.get('failCode')} {d.get('failMsg')}")
        time.sleep(6)
    raise SystemExit(f"{name}: timed out, taskId {tid}")

def fetch(url, out):
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "mv-client"}), timeout=300) as r: out.write_bytes(r.read())

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "up": print(upload(sys.argv[2])); sys.exit()
    if cmd == "img":
        name, model, inp = sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
        tid = submit(model, inp, name); urls, cr = wait(tid, name, 900)
        for i, u in enumerate(urls):
            ext = Path(u.split("?")[0]).suffix or ".png"; out = HERE / "keys" / (name + (f"-{i}" if i else "") + ext); fetch(u, out); print(out, cr)
    if cmd == "vid":
        name, inp = sys.argv[2], json.loads(sys.argv[3])
        tid = submit("veo-3-1", inp, name); urls, cr = wait(tid, name, 2400)
        out = HERE / "clips" / (name + ".mp4"); fetch(urls[0], out); print(out, cr)
