#!/usr/bin/env python3
"""Turn 重构设计.md into a standalone page (design.html) for the review site. Handles the Markdown this document uses:
headings, tables, bullet and numbered lists, paragraphs, **bold**, `code`, [links](url)."""
import html, re, pathlib
here = pathlib.Path(__file__).parent
src = (here / "重构设计.md").read_text(encoding="utf-8").splitlines()

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    return s.replace("★", '<span class="star">★</span>')

import hashlib
def cid(text): return "c" + hashlib.md5(text.encode("utf-8")).hexdigest()[:10]
out, i, toc = [], 0, []
while i < len(src):
    ln = src[i]
    if not ln.strip(): i += 1; continue
    m = re.match(r"(#{1,3}) (.*)", ln)
    if m:
        n = len(m.group(1)); hid = f"s{len(toc)}"
        if n == 2: toc.append((hid, m.group(2)))
        out.append(f'<h{n} id="{hid if n == 2 else ""}">{inline(m.group(2))}</h{n}>'.replace(' id=""', "")); i += 1; continue
    frames = []
    while i < len(src):
        frame = re.fullmatch(r"!\[([^\]]+)\]\((design-refs/[\w-]+\.webp)\)", src[i])
        if not frame: break
        caption, url = frame.groups()
        frames.append(f'<figure><a href="{url}"><img loading="lazy" src="{url}" alt="{html.escape(caption, quote=True)}"></a><figcaption>{html.escape(caption)}</figcaption></figure>')
        i += 1
    if frames:
        out.append('<div class="frames">' + ''.join(frames) + '</div>')
        continue
    if ln.startswith("|"):
        rows = []
        while i < len(src) and src[i].startswith("|"): rows.append([c.strip() for c in src[i].strip().strip("|").split("|")]); i += 1
        head, body = rows[0], rows[2:]
        out.append('<div class="tw"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>" +
                   "".join(f'<tr data-c="{cid(r[0] + r[1] if len(r) > 1 else r[0])}" data-t="{html.escape(r[0][:60], quote=True)}">' + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>"); continue
    m = re.match(r"(- |\d+\. )", ln)
    if m:
        tag = "ul" if ln.startswith("- ") else "ol"; items = []
        while i < len(src) and re.match(r"(- |\d+\. )", src[i]): items.append(re.sub(r"^(- |\d+\. )", "", src[i])); i += 1
        out.append(f"<{tag}>" + "".join(f'<li data-c="{cid(x)}" data-t="{html.escape(re.sub(r"[*`]", "", x)[:60], quote=True)}">{inline(x)}</li>' for x in items) + f"</{tag}>"); continue
    out.append(f"<p>{inline(ln)}</p>"); i += 1

nav = "".join(f'<a href="#{h}">{html.escape(t)}</a>' for h, t in toc)
page = f"""<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>《河水不回答》MV 重构设计</title>
<style>
:root{{--bg:#f6f1e7;--fg:#1c1a18;--mute:#6b645a;--line:#d9d0bf;--card:#fbf8f1;--gold:#a8791c;--red:#b23a2a}}
@media (prefers-color-scheme:dark){{:root{{--bg:#141312;--fg:#e9e2d4;--mute:#9a9284;--line:#34302a;--card:#1b1a18;--gold:#d9ab4a;--red:#e0705c}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:17px/1.8 "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif}}
main{{max-width:1060px;margin:0 auto;padding:28px 16px 80px}}
h1{{font-size:30px;line-height:1.3;margin:10px 0 6px}}h2{{font-size:23px;margin:54px 0 10px;padding-top:14px;border-top:1px solid var(--line)}}h3{{font-size:18px;margin:30px 0 6px;color:var(--gold)}}
p,li{{max-width:46em}}a{{color:var(--gold)}}code{{font:14px/1.4 ui-monospace,Menlo,monospace;background:var(--card);border:1px solid var(--line);border-radius:4px;padding:1px 5px}}
nav{{display:flex;flex-wrap:wrap;gap:6px 14px;font:14px/1.6 system-ui,sans-serif;margin:14px 0 4px}}nav a{{text-decoration:none;color:var(--mute)}}nav a:hover{{color:var(--gold)}}
.tw{{overflow-x:auto;margin:14px 0}}table{{border-collapse:collapse;width:100%;min-width:640px;font-size:15.5px;line-height:1.65}}
.frames{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;margin:18px 0}}figure{{margin:0}}figure img{{width:100%;aspect-ratio:16/9;object-fit:contain;background:#151516;display:block}}figcaption{{font-size:14px;color:var(--mute);line-height:1.6;margin-top:4px}}
th,td{{border-bottom:1px solid var(--line);padding:9px 10px;text-align:left;vertical-align:top}}th{{font:600 13px/1.4 system-ui,sans-serif;color:var(--mute);white-space:nowrap}}
td:first-child{{white-space:nowrap;font-weight:600}}@media (max-width:700px){{td:first-child{{white-space:normal}}}}
.star{{color:var(--red)}}li{{margin:6px 0}}
[data-c]{{position:relative}}.cb{{font:12px system-ui,sans-serif;color:var(--mute);background:none;border:1px solid var(--line);border-radius:4px;padding:1px 7px;margin-left:8px;cursor:pointer;white-space:nowrap}}.cb:hover{{color:var(--gold);border-color:var(--gold)}}
.cm{{font:14.5px/1.6 system-ui,sans-serif;background:var(--card);border-left:3px solid var(--red);padding:6px 10px;margin:6px 0;white-space:pre-wrap;max-width:46em}}.cm small{{color:var(--mute);margin-left:8px}}.cm button{{font-size:12px;margin-left:8px;background:none;border:0;color:var(--mute);cursor:pointer}}.cm .rp{{color:var(--gold);display:block;margin-top:4px}}
.cf textarea{{width:100%;max-width:46em;min-height:70px;font:15px/1.6 system-ui,sans-serif;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:4px;padding:6px 8px;display:block;margin:6px 0}}.cf button{{font:13px system-ui,sans-serif;margin-right:8px;padding:3px 12px}}
#gen{{margin:40px 0 0;padding-top:14px;border-top:1px solid var(--line)}}
</style><main>
{out[0]}<nav>{nav}</nav>
{chr(10).join(out[1:])}
<div id="gen" data-c="general" data-t="总体意见"><h2>总体意见</h2><p>不针对某一行的意见写在这里。</p></div>
</main>
<script>
(() => {{
  const API = "../../api/", DOC = "mv-design-codex", VER = "codex-1", KS = ["zcj-review-key", "aiedu-review-key"];
  let key = ""; try {{ for (const k of KS) key = key || localStorage.getItem(k) || ""; }} catch {{}}
  const api = async (p, o = {{}}) => {{ const r = await fetch(API + p, {{ ...o, headers: {{ "Content-Type": "application/json", "X-Review-Key": key }} }}); const d = await r.json().catch(() => ({{}})); if (!r.ok) throw Object.assign(new Error(d.error || r.statusText), {{ status: r.status }}); return d; }};
  const ensure = async () => {{ while (true) {{ if (!key) {{ key = (prompt("批注口令") || "").trim(); if (!key) return false; }} try {{ await api("auth"); try {{ localStorage.setItem(KS[0], key); }} catch {{}} return true; }} catch {{ key = ""; alert("口令不正确"); }} }} }};
  const host = (el) => {{ if (el.tagName !== "TR") return el; let n = el.nextElementSibling; if (!n || !n.classList.contains("crow")) {{ n = document.createElement("tr"); n.className = "crow"; const td = document.createElement("td"); td.colSpan = el.children.length; td.style.borderBottom = "0"; td.style.padding = "0 10px"; n.appendChild(td); el.after(n); }} return n.firstChild; }};
  const show = (c) => {{ const el = document.querySelector(`[data-c="${{c.section}}"]`) || document.getElementById("gen"); const d = document.createElement("div"); d.className = "cm"; d.textContent = c.body;
    const m = document.createElement("small"); m.textContent = (c.created_at || "").slice(5, 16).replace("T", " ") + (c.status === "done" ? " · 已采纳" : c.status === "rejected" ? " · 未采纳" : ""); d.appendChild(m);
    const x = document.createElement("button"); x.textContent = "删除"; x.onclick = async () => {{ if (!confirm("删除这条批注？") || !(await ensure())) return; try {{ await api("comments/" + c.id, {{ method: "DELETE" }}); d.remove(); }} catch (e) {{ alert("删除失败：" + e.message); }} }}; d.appendChild(x);
    if (c.reply) {{ const r = document.createElement("span"); r.className = "rp"; r.textContent = "回复：" + c.reply; d.appendChild(r); }} host(el).appendChild(d); }};
  document.querySelectorAll("[data-c]").forEach((el) => {{ const b = document.createElement("button"); b.className = "cb"; b.textContent = "批注";
    b.onclick = () => {{ const h = host(el); if (h.querySelector(".cf")) return; const f = document.createElement("div"); f.className = "cf"; f.innerHTML = '<textarea placeholder="写下意见"></textarea><button>提交</button><button>取消</button>'; h.appendChild(f); const ta = f.firstChild; ta.focus();
      f.children[2].onclick = () => f.remove(); f.children[1].onclick = async () => {{ const body = ta.value.trim(); if (!body || !(await ensure())) return;
        try {{ show(await api("comments", {{ method: "POST", body: JSON.stringify({{ doc: DOC, version: VER, section: el.dataset.c, section_title: el.dataset.t || "", body }}) }})); f.remove(); }} catch (e) {{ alert("提交失败：" + e.message); }} }}; }};
    (el.tagName === "TR" ? el.lastElementChild : el.tagName === "DIV" ? el.querySelector("h2") : el).appendChild(b); }});
  fetch(API + "comments").then((r) => r.json()).then((d) => (d.comments || []).filter((c) => c.doc === DOC).forEach(show)).catch(() => {{}});
}})();
</script></html>"""
(here / "design.html").write_text(page, encoding="utf-8")
print("design.html", len(page))
