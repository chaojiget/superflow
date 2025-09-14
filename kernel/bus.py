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

    def _redact(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # 简单脱敏：
        # - 屏蔽看起来像密钥的片段（sk- 前缀）
        # - 限制超长字符串
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
        ev = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "type": event_type,
            "payload": self._redact(payload),
        }
        self._events.append(ev)

    def finalize(self, status: str, artifacts: Dict[str, Any]) -> str:
        assert self._trace_id and self._t0 is not None
        latency_ms = int((time.time() - self._t0) * 1000)
        # 汇总头信息（从 LLM 元数据推断 provider/model/attempts）
        header: Dict[str, Any] = {}
        for ev in reversed(self._events):
            if isinstance(ev.get("payload"), dict):
                llm_meta = ev["payload"].get("llm") if isinstance(ev["payload"], dict) else None
                if isinstance(llm_meta, dict):
                    header.setdefault("provider", llm_meta.get("provider"))
                    header.setdefault("model", llm_meta.get("model"))
                    header.setdefault("request_id", llm_meta.get("request_id"))
                    header.setdefault("temperature", llm_meta.get("temperature"))
        # 统计 attempts（粗略：查找最大 attempts）
        attempts = 0
        for ev in self._events:
            pay = ev.get("payload")
            if isinstance(pay, dict) and isinstance(pay.get("llm"), dict):
                attempts = max(attempts, int(pay["llm"].get("attempts", 1)))
        header["attempts"] = attempts

        episode = {
            "trace_id": self._trace_id,
            "goal": self._goal,
            "status": status,
            "latency_ms": latency_ms,
            "header": header,
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
