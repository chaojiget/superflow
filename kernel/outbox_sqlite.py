"""
# -*- coding: utf-8 -*-
SPEC:
  模块: kernel.outbox_sqlite
  目标: 使用 SQLite 存储 Episode 与 Events（最小版）
  约束: 单文件 DB; 无并发写; 提供 append/finalize
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from datetime import datetime
from typing import Any, Dict


SCHEMA = """
CREATE TABLE IF NOT EXISTS episodes (
  trace_id TEXT PRIMARY KEY,
  goal TEXT,
  status TEXT,
  latency_ms INTEGER,
  header_json TEXT,
  sense_json TEXT,
  plan_json TEXT,
  artifacts_json TEXT,
  created_ts TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT,
  msg_id TEXT,
  ts TEXT,
  type TEXT,
  payload_json TEXT
);
"""


class OutboxSQLite:
    def __init__(self, db_path: str = "episodes.db") -> None:
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.executescript(SCHEMA)
        self._trace_id = None  # type: ignore
        self._t0 = None  # type: ignore
        self._goal = None
        self._header: Dict[str, Any] = {}

    def new_trace(self, goal: str) -> str:
        self._trace_id = f"t-{uuid.uuid4().hex[:12]}"
        self._t0 = time.time()
        self._goal = goal
        self._header.clear()
        return self._trace_id

    def _redact(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        def _mask(v: Any) -> Any:
            if isinstance(v, str):
                out = v
                if "sk-" in out:
                    out = out.replace("sk-", "sk-***")
                if len(out) > 4096:
                    out = out[:1024] + "\n...[truncated]...\n" + out[-256:]
                return out
            if isinstance(v, dict):
                return {k: _mask(x) for k, x in v.items()}
            if isinstance(v, list):
                return [_mask(x) for x in v]
            return v
        return _mask(payload)

    def append(self, event_type: str, payload: Dict[str, Any]) -> None:
        assert self._trace_id, "call new_trace first"
        ts = datetime.utcnow().isoformat() + "Z"
        msg_id = uuid.uuid4().hex
        pay = self._redact(payload)
        # 提取头（llm 元数据）
        if isinstance(pay, dict) and isinstance(pay.get("llm"), dict):
            m = pay["llm"]
            self._header.setdefault("provider", m.get("provider"))
            self._header.setdefault("model", m.get("model"))
            self._header.setdefault("request_id", m.get("request_id"))
            self._header.setdefault("temperature", m.get("temperature"))
            attempts = int(m.get("attempts", 1))
            self._header["attempts"] = max(int(self._header.get("attempts", 0)), attempts)
        self._conn.execute(
            "INSERT INTO events(trace_id,msg_id,ts,type,payload_json) VALUES (?,?,?,?,?)",
            (self._trace_id, msg_id, ts, event_type, json.dumps(pay, ensure_ascii=False)),
        )
        self._conn.commit()

    def list_traces(self, limit: int = 20):
        cur = self._conn.cursor()
        return cur.execute("SELECT trace_id, goal, status, created_ts FROM episodes ORDER BY created_ts DESC LIMIT ?", (limit,)).fetchall()

    def fetch_events(self, trace_id: str):
        cur = self._conn.cursor()
        return cur.execute("SELECT msg_id, ts, type, payload_json FROM events WHERE trace_id=? ORDER BY id ASC", (trace_id,)).fetchall()

    def finalize(self, status: str, artifacts: Dict[str, Any]) -> str:
        assert self._trace_id and self._t0 is not None
        latency_ms = int((time.time() - self._t0) * 1000)
        # 提取 sense/plan
        cur = self._conn.cursor()
        cur.execute("SELECT payload_json FROM events WHERE trace_id=? AND type=? ORDER BY id DESC LIMIT 1", (self._trace_id, "sense.srs_loaded"))
        row = cur.fetchone()
        sense = json.loads(row[0]).get("srs") if row else None
        cur.execute("SELECT payload_json FROM events WHERE trace_id=? AND type=? ORDER BY id DESC LIMIT 1", (self._trace_id, "plan.generated"))
        row = cur.fetchone()
        plan = json.loads(row[0]).get("plan") if row else None
        self._conn.execute(
            "REPLACE INTO episodes(trace_id,goal,status,latency_ms,header_json,sense_json,plan_json,artifacts_json,created_ts) VALUES (?,?,?,?,?,?,?,?,?)",
            (
                self._trace_id,
                self._goal,
                status,
                latency_ms,
                json.dumps(self._header, ensure_ascii=False),
                json.dumps(sense, ensure_ascii=False),
                json.dumps(plan, ensure_ascii=False),
                json.dumps(artifacts, ensure_ascii=False),
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        self._conn.commit()
        return self.db_path
