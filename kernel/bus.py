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
from typing import Any, Dict, List, Optional


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

    def append(
        self,
        event_type: str,
        payload: Dict[str, Any],
        *,
        budget_ctx: Dict[str, Any] | None = None,
        authz: Dict[str, Any] | None = None,
        labels: Dict[str, Any] | None = None,
        cost: float | None = None,
    ) -> None:
        assert self._trace_id, "call new_trace first"
        ev = {
            "msg_id": uuid.uuid4().hex,
            "trace_id": self._trace_id,
            "schema_ver": "v0",
            "ts": datetime.utcnow().isoformat() + "Z",
            "type": event_type,
            "payload": self._redact(payload),
        }
        if budget_ctx is not None:
            ev["budget_ctx"] = budget_ctx
        if authz is not None:
            ev["authz"] = authz
        if labels is not None:
            ev["labels"] = labels
        if cost is not None:
            ev["cost"] = cost
        self._validate_envelope(ev)
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
        # 统计 attempts（粗略：查找最大 attempts）、usage 累计与 cost 求和
        attempts = 0
        usage_sum: Dict[str, float] = {}
        total_cost: float = 0.0
        for ev in self._events:
            pay = ev.get("payload")
            if isinstance(pay, dict) and isinstance(pay.get("llm"), dict):
                attempts = max(attempts, int(pay["llm"].get("attempts", 1)))
                u = pay["llm"].get("usage")
                if isinstance(u, dict):
                    for k, v in u.items():
                        try:
                            usage_sum[k] = usage_sum.get(k, 0.0) + float(v)
                        except Exception:
                            pass
            # envelope 级 cost（如果调用 append 传入）
            c = ev.get("cost")
            try:
                if c is not None:
                    total_cost += float(c)
            except Exception:
                pass
        header["attempts"] = attempts
        if usage_sum:
            header["usage"] = {k: round(v, 4) for k, v in usage_sum.items()}
        header["cost"] = round(total_cost, 6)

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

    def _validate_envelope(self, ev: Dict[str, Any]) -> None:
        # 轻量校验：必填字段存在且类型正确；可选字段类型校验
        required = {
            "msg_id": str,
            "trace_id": str,
            "type": str,
            "payload": dict,
            "ts": str,
        }
        for k, t in required.items():
            if k not in ev:
                raise ValueError(f"Envelope 缺少字段: {k}")
            if not isinstance(ev[k], t):
                raise TypeError(f"Envelope 字段类型错误: {k}")
        optional = {
            # budget_ctx 交由 JSON Schema 校验，以便在启用时抛出 jsonschema.ValidationError
            # "budget_ctx": dict,
            "authz": dict,
            "labels": dict,
            "cost": (int, float),
        }
        for k, t in optional.items():
            if k in ev and not isinstance(ev[k], t):
                raise TypeError(f"Envelope 可选字段类型错误: {k}")
        # authz.caps 若存在应为字符串数组
        if isinstance(ev.get("authz"), dict):
            caps = ev["authz"].get("caps")
            if caps is not None:
                if not isinstance(caps, list) or not all(isinstance(x, str) for x in caps):
                    raise TypeError("Envelope 字段 authz.caps 应为字符串数组")
        # 尝试执行 JSON Schema 严格校验（若依赖可用）
        self._validate_with_jsonschema(ev)

    _SCHEMA_CACHE: Optional[Dict[str, Any]] = None

    def _load_envelope_schema(self) -> Optional[Dict[str, Any]]:
        if OutboxBus._SCHEMA_CACHE is not None:
            return OutboxBus._SCHEMA_CACHE
        try:
            base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
            schema_path = os.path.join(base, "packages", "schemas", "message_envelope.schema.json")
            if not os.path.exists(schema_path):
                # 兼容运行路径差异：从项目根相对查找
                alt = os.path.join(base, "message_envelope.schema.json")
                schema_path = alt if os.path.exists(alt) else schema_path
            with open(schema_path, "r", encoding="utf-8") as f:
                OutboxBus._SCHEMA_CACHE = json.load(f)
            return OutboxBus._SCHEMA_CACHE
        except Exception:
            OutboxBus._SCHEMA_CACHE = None
            return None

    def _validate_with_jsonschema(self, ev: Dict[str, Any]) -> None:
        # 仅当 jsonschema 可用且 schema 能加载时才校验
        try:
            import jsonschema  # type: ignore
        except Exception:
            return
        schema = self._load_envelope_schema()
        if not schema:
            return
        # 若校验失败，抛出 jsonschema.ValidationError，交由上层感知
        jsonschema.validate(ev, schema)  # type: ignore
