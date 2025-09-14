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
CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  definition_json TEXT,
  created_ts TEXT,
  enabled INTEGER
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER,
  status TEXT,
  run_at TEXT,
  args_json TEXT,
  result_json TEXT,
  created_ts TEXT
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


# Workflows & Jobs
def upsert_workflow(conn: sqlite3.Connection, name: str, definition_json: str, enabled: int = 1) -> int:
    now = datetime.utcnow().isoformat() + "Z"
    cur = conn.execute(
        "INSERT INTO workflows(name, definition_json, created_ts, enabled) VALUES (?,?,?,?)",
        (name, definition_json, now, int(enabled)),
    )
    conn.commit()
    return int(cur.lastrowid)


def list_workflows(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    rows = conn.execute("SELECT id, name, created_ts, enabled FROM workflows ORDER BY id DESC").fetchall()
    return [{"id": r[0], "name": r[1], "created_ts": r[2], "enabled": r[3]} for r in rows]


def get_workflow(conn: sqlite3.Connection, wf_id: int) -> Optional[Dict[str, Any]]:
    row = conn.execute("SELECT id, name, definition_json, created_ts, enabled FROM workflows WHERE id=?", (int(wf_id),)).fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "definition_json": row[2], "created_ts": row[3], "enabled": row[4]}


def schedule_job(conn: sqlite3.Connection, workflow_id: int, run_at_iso: str, args_json: str) -> int:
    now = datetime.utcnow().isoformat() + "Z"
    cur = conn.execute(
        "INSERT INTO jobs(workflow_id, status, run_at, args_json, created_ts) VALUES (?,?,?,?,?)",
        (int(workflow_id), "pending", run_at_iso, args_json, now),
    )
    conn.commit()
    return int(cur.lastrowid)


def list_jobs(conn: sqlite3.Connection, workflow_id: Optional[int] = None) -> List[Dict[str, Any]]:
    if workflow_id is None:
        rows = conn.execute("SELECT id, workflow_id, status, run_at, created_ts FROM jobs ORDER BY id DESC").fetchall()
    else:
        rows = conn.execute("SELECT id, workflow_id, status, run_at, created_ts FROM jobs WHERE workflow_id=? ORDER BY id DESC", (int(workflow_id),)).fetchall()
    return [{"id": r[0], "workflow_id": r[1], "status": r[2], "run_at": r[3], "created_ts": r[4]} for r in rows]


def due_jobs(conn: sqlite3.Connection, now_iso: str) -> List[Dict[str, Any]]:
    rows = conn.execute("SELECT id, workflow_id, args_json FROM jobs WHERE status='pending' AND run_at<=? ORDER BY id ASC", (now_iso,)).fetchall()
    return [{"id": r[0], "workflow_id": r[1], "args_json": r[2]} for r in rows]


def mark_job_result(conn: sqlite3.Connection, job_id: int, status: str, result_json: str) -> None:
    conn.execute("UPDATE jobs SET status=?, result_json=? WHERE id=?", (status, result_json, int(job_id)))
    conn.commit()
