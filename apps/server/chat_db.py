# -*- coding: utf-8 -*-
"""
SPEC:
  模块: apps.server.chat_db
  目标: 聊天会话存储（SQLite）— sessions/messages 两表
  接口: init_db(path)->conn, append_message, get_history, clear_session
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  created_ts TEXT,
  meta_json TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  ts TEXT,
  role TEXT,
  content TEXT,
  action_json TEXT
);
"""


def init_db(path: str = "chat.db") -> sqlite3.Connection:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    return conn


def append_message(conn: sqlite3.Connection, session_id: str, role: str, content: str, action_json: Optional[str] = None) -> None:
    now = datetime.utcnow().isoformat() + "Z"
    conn.execute(
        "INSERT OR IGNORE INTO sessions(session_id, created_ts, meta_json) VALUES (?,?,?)",
        (session_id, now, None),
    )
    conn.execute(
        "INSERT INTO messages(session_id, ts, role, content, action_json) VALUES (?,?,?,?,?)",
        (session_id, now, role, content, action_json),
    )
    conn.commit()


def get_history(conn: sqlite3.Connection, session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT ts, role, content, action_json FROM messages WHERE session_id=? ORDER BY id ASC LIMIT ?",
        (session_id, int(limit)),
    ).fetchall()
    out: List[Dict[str, Any]] = []
    for ts, role, content, action_json in rows:
        out.append({"ts": ts, "role": role, "content": content, "action": action_json})
    return out


def clear_session(conn: sqlite3.Connection, session_id: str) -> None:
    conn.execute("DELETE FROM messages WHERE session_id=?", (session_id,))
    conn.execute("DELETE FROM sessions WHERE session_id=?", (session_id,))
    conn.commit()

