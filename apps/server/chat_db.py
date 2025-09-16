# -*- coding: utf-8 -*-
"""
SPEC:
  模块: apps.server.chat_db
  目标: 聊天会话存储（SQLite）— sessions/messages 两表
  接口: init_db(path)->conn, append_message, get_history, clear_session
"""

from __future__ import annotations

import json
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
CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT,
  session_id TEXT,
  action TEXT,
  decision TEXT,
  payload_json TEXT,
  created_ts TEXT,
  resolved_ts TEXT
);
CREATE TABLE IF NOT EXISTS task_stack (
  session_id TEXT PRIMARY KEY,
  stack_json TEXT,
  updated_ts TEXT
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
    # 允许跨线程使用（FastAPI 测试与后台线程都可能访问）
    conn = sqlite3.connect(path, check_same_thread=False)
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

def get_job(conn: sqlite3.Connection, job_id: int) -> Optional[Dict[str, Any]]:
    row = conn.execute(
        "SELECT id, workflow_id, status, run_at, args_json, result_json, created_ts FROM jobs WHERE id=?",
        (int(job_id),),
    ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "workflow_id": row[1],
        "status": row[2],
        "run_at": row[3],
        "args_json": row[4],
        "result_json": row[5],
        "created_ts": row[6],
    }


# Approvals -----------------------------------------------------------------
def log_approval(
    conn: sqlite3.Connection,
    trace_id: str,
    decision: str,
    *,
    action: Optional[str] = None,
    session_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    resolved: bool = True,
) -> int:
    """记录一次审批动作，返回审批记录 ID。"""

    now = datetime.utcnow().isoformat() + "Z"
    payload_json = json.dumps(payload, ensure_ascii=False) if payload is not None else None
    resolved_ts = now if resolved else None
    cur = conn.execute(
        "INSERT INTO approvals(trace_id, session_id, action, decision, payload_json, created_ts, resolved_ts) VALUES (?,?,?,?,?,?,?)",
        (trace_id, session_id, action, decision, payload_json, now, resolved_ts),
    )
    conn.commit()
    return int(cur.lastrowid)


def update_approval(
    conn: sqlite3.Connection,
    approval_id: int,
    decision: str,
    payload: Optional[Dict[str, Any]] = None,
    *,
    resolved: bool = True,
) -> None:
    """更新指定审批记录的决策与附加信息。"""

    now = datetime.utcnow().isoformat() + "Z"
    payload_json = json.dumps(payload, ensure_ascii=False) if payload is not None else None
    resolved_ts = now if resolved else None
    conn.execute(
        "UPDATE approvals SET decision=?, payload_json=?, resolved_ts=? WHERE id=?",
        (decision, payload_json, resolved_ts, int(approval_id)),
    )
    conn.commit()


def list_approvals(
    conn: sqlite3.Connection,
    *,
    limit: int = 50,
    status: Optional[str] = None,
) -> List[Dict[str, Any]]:
    sql = "SELECT id, trace_id, session_id, action, decision, payload_json, created_ts, resolved_ts FROM approvals"
    params: Tuple[Any, ...]
    if status is None:
        sql += " ORDER BY id DESC LIMIT ?"
        params = (int(limit),)
    else:
        sql += " WHERE decision=? ORDER BY id DESC LIMIT ?"
        params = (status, int(limit))
    rows = conn.execute(sql, params).fetchall()
    out: List[Dict[str, Any]] = []
    for row in rows:
        payload_obj = None
        if row[5]:
            try:
                payload_obj = json.loads(row[5])
            except Exception:
                payload_obj = row[5]
        out.append(
            {
                "id": row[0],
                "trace_id": row[1],
                "session_id": row[2],
                "action": row[3],
                "decision": row[4],
                "payload": payload_obj,
                "created_ts": row[6],
                "resolved_ts": row[7],
            }
        )
    return out


# Task stack -----------------------------------------------------------------
def save_task_stack(conn: sqlite3.Connection, session_id: str, stack: Dict[str, Any]) -> None:
    """保存任务栈（JSON 对象），若已存在则覆盖。"""

    now = datetime.utcnow().isoformat() + "Z"
    stack_json = json.dumps(stack, ensure_ascii=False)
    conn.execute(
        "INSERT INTO task_stack(session_id, stack_json, updated_ts) VALUES (?,?,?) ON CONFLICT(session_id) DO UPDATE SET stack_json=excluded.stack_json, updated_ts=excluded.updated_ts",
        (session_id, stack_json, now),
    )
    conn.commit()


def load_task_stack(conn: sqlite3.Connection, session_id: str) -> Optional[Dict[str, Any]]:
    row = conn.execute("SELECT stack_json FROM task_stack WHERE session_id=?", (session_id,)).fetchone()
    if not row or not row[0]:
        return None
    try:
        return json.loads(row[0])
    except Exception:
        return None


def list_task_stacks(conn: sqlite3.Connection, limit: int = 20) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT session_id, stack_json, updated_ts FROM task_stack ORDER BY updated_ts DESC LIMIT ?",
        (int(limit),),
    ).fetchall()
    out: List[Dict[str, Any]] = []
    for session_id, stack_json, updated_ts in rows:
        try:
            stack_obj = json.loads(stack_json) if stack_json else None
        except Exception:
            stack_obj = None
        out.append({"session_id": session_id, "stack": stack_obj, "updated_ts": updated_ts})
    return out
