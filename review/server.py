#!/usr/bin/env python3
"""Comment API for the script review page. Reads are open; writes need the shared key and same origin."""
from __future__ import annotations

import argparse
import hmac
import json
import logging
import os
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

MAX_JSON_BYTES = 64 * 1024
MAX_BODY_CHARS = 5000
STATUSES = {"open", "done", "rejected"}
LOG = logging.getLogger("ai-edu-review")
SCHEMA = """
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc TEXT NOT NULL,
    version TEXT NOT NULL,
    section TEXT NOT NULL,
    section_title TEXT NOT NULL DEFAULT '',
    line INTEGER,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    reply TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class APIError(Exception):
    def __init__(self, status: int, error: str):
        self.status, self.error = status, error
        super().__init__(error)


def text_field(value: dict, key: str, limit: int, required: bool = True) -> str:
    v = value.get(key, "")
    if not isinstance(v, str) or len(v) > limit or (required and not v.strip()):
        raise APIError(400, f"invalid {key}")
    return v.strip()


class Store:
    def __init__(self, path: str):
        self.path = path
        with closing(self.connect()) as db:
            db.execute(SCHEMA)
            db.commit()

    def connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        return db

    def list(self) -> list[dict]:
        with closing(self.connect()) as db:
            return [dict(r) for r in db.execute("SELECT * FROM comments ORDER BY id")]

    def get(self, db: sqlite3.Connection, cid: int) -> dict:
        row = db.execute("SELECT * FROM comments WHERE id=?", (cid,)).fetchone()
        if row is None:
            raise APIError(404, "not found")
        return dict(row)

    def create(self, value: dict) -> dict:
        line = value.get("line")
        if line is not None and (not isinstance(line, int) or not 0 < line < 10000):
            raise APIError(400, "invalid line")
        fields = (text_field(value, "doc", 40), text_field(value, "version", 40),
                  text_field(value, "section", 40), text_field(value, "section_title", 200, False),
                  line, text_field(value, "body", MAX_BODY_CHARS))
        ts = now()
        with closing(self.connect()) as db:
            cur = db.execute("INSERT INTO comments (doc, version, section, section_title, line, body,"
                             " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", (*fields, ts, ts))
            db.commit()
            return self.get(db, cur.lastrowid)

    def update(self, cid: int, value: dict) -> dict:
        sets = {}
        if "body" in value:
            sets["body"] = text_field(value, "body", MAX_BODY_CHARS)
        if "reply" in value:
            sets["reply"] = text_field(value, "reply", MAX_BODY_CHARS, False)
        if "status" in value:
            if value["status"] not in STATUSES:
                raise APIError(400, "invalid status")
            sets["status"] = value["status"]
        if not sets:
            raise APIError(400, "nothing to update")
        sets["updated_at"] = now()
        with closing(self.connect()) as db:
            self.get(db, cid)
            db.execute(f"UPDATE comments SET {', '.join(f'{k}=?' for k in sets)} WHERE id=?",
                       (*sets.values(), cid))
            db.commit()
            return self.get(db, cid)

    def delete(self, cid: int) -> None:
        with closing(self.connect()) as db:
            self.get(db, cid)
            db.execute("DELETE FROM comments WHERE id=?", (cid,))
            db.commit()


class Handler(BaseHTTPRequestHandler):
    server: "ReviewServer"

    def log_message(self, fmt, *args):
        LOG.info("%s %s", self.address_string(), fmt % args)

    def send_json(self, status: int, payload: object):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def comment_id(self) -> int:
        m = re.fullmatch(r"/comments/(\d+)", urlsplit(self.path).path)
        if not m:
            raise APIError(404, "not found")
        return int(m.group(1))

    def authorize(self) -> dict:
        origin = self.headers.get("Origin")
        if origin and origin != self.server.allowed_origin:
            raise APIError(403, "cross-origin write rejected")
        if not hmac.compare_digest(self.headers.get("X-Review-Key", ""), self.server.key):
            raise APIError(401, "bad key")
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_JSON_BYTES:
            raise APIError(413, "too large")
        if not length:
            return {}
        try:
            value = json.loads(self.rfile.read(length))
        except ValueError:
            raise APIError(400, "invalid json")
        if not isinstance(value, dict):
            raise APIError(400, "invalid json")
        return value

    def check_key(self):
        self.authorize()
        return 200, {"ok": True}

    def handle_api(self, action):
        try:
            status, payload = action()
            self.send_json(status, payload)
        except APIError as e:
            self.send_json(e.status, {"error": e.error})
        except Exception:
            LOG.exception("request failed")
            self.send_json(500, {"error": "server error"})

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/comments":
            self.handle_api(lambda: (200, {"comments": self.server.store.list()}))
        elif path == "/auth":
            self.handle_api(self.check_key)
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if urlsplit(self.path).path != "/comments":
            return self.send_json(404, {"error": "not found"})
        self.handle_api(lambda: (201, self.server.store.create(self.authorize())))

    def do_PATCH(self):
        self.handle_api(lambda: (200, self.server.store.update(self.comment_id(), self.authorize())))

    def do_DELETE(self):
        def action():
            cid = self.comment_id()
            self.authorize()
            self.server.store.delete(cid)
            return 200, {"ok": True}
        self.handle_api(action)


class ReviewServer(ThreadingHTTPServer):
    def __init__(self, address, store: Store, key: str, allowed_origin: str):
        super().__init__(address, Handler)
        self.store, self.key, self.allowed_origin = store, key, allowed_origin


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9031)
    parser.add_argument("--database", required=True)
    parser.add_argument("--allowed-origin", default="https://blind.pub")
    args = parser.parse_args(argv)
    key = os.environ.get("REVIEW_KEY", "")
    if len(key) < 8:
        parser.error("REVIEW_KEY env var (>=8 chars) is required")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    server = ReviewServer((args.host, args.port), Store(args.database), key, args.allowed_origin)
    LOG.info("listening on %s:%d", args.host, args.port)
    server.serve_forever()


if __name__ == "__main__":
    main()
