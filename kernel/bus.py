# -*- coding: utf-8 -*-
"""
SPEC:
  模块: kernel.bus
  目标: 追加写的 Outbox（Episode 事件日志）并记录最小指标
  输入: 事件(type, payload), goal
  输出: episodes/<trace_id>.json
  约束: 仅本地文件系统; 尽量原子写; 指标简单
  测试: new_trace->append->finalize; 回放可读取
"""

import json
import os
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List


class OutboxBus:
    def __init__(self, episodes_dir: str = "episodes") -> None:
        self.episodes_dir = episodes_dir
        os.makedirs(self.episodes_dir, exist_ok=True)
        self._trace_id = None  # type: ignore
        self._t0 = None  # type: ignore
        self._events: List[Dict[str, Any]] = []
        self._goal = None

    def new_trace(self, goal: str) -> str:
        self._trace_id = f"t-{uuid.uuid4().hex[:12]}"
        self._t0 = time.time()
        self._goal = goal
        self._events.clear()
        return self._trace_id

    def append(self, event_type: str, payload: Dict[str, Any]) -> None:
        assert self._trace_id, "call new_trace first"
        ev = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "type": event_type,
            "payload": payload,
        }
        self._events.append(ev)

    def finalize(self, status: str, artifacts: Dict[str, Any]) -> str:
        assert self._trace_id and self._t0 is not None
        latency_ms = int((time.time() - self._t0) * 1000)
        episode = {
            "trace_id": self._trace_id,
            "goal": self._goal,
            "status": status,
            "latency_ms": latency_ms,
            "events": self._events,
            "sense": self._extract_last("sense.srs_loaded", "srs"),
            "plan": self._extract_last("plan.generated", "plan"),
            "artifacts": artifacts,
        }
        path = os.path.join(self.episodes_dir, f"{self._trace_id}.json")
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(episode, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)
        return path

    def _extract_last(self, event_type: str, key: str) -> Any:
        for ev in reversed(self._events):
            if ev["type"] == event_type:
                return ev["payload"].get(key)
        return None
