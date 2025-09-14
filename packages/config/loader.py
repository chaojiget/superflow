"""
# -*- coding: utf-8 -*-
SPEC:
  模块: config.loader
  目标: 从 config.json 读取默认实现与 LLM 参数，CLI 可覆盖
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional


DEFAULTS: Dict[str, Any] = {
    "defaults": {
        "planner": "llm",
        "executor": "llm",
        "critic": "llm",
        "reviser": "llm",
    },
    "llm": {
        "provider": "openrouter",
        "base_url": "https://openrouter.ai/api/v1",
        "model": "qwen/qwen3-next-80b-a3b-thinking",
        "temperature": {"planner": 0.2, "executor": 0.6, "critic": 0.0, "reviser": 0.4},
        "max_rows": 80,
        "retries": 1,
    },
    "risk": {"check_skills": True, "codegen_mode": "disabled", "capability_token_required": True},
    "scoreboard": {"episodes_dir": "episodes"},
    "prompts": {"dir": "packages/prompts"},
    "outbox": {"backend": "json", "sqlite_path": "episodes.db"}
}


def load_config(path: Optional[str] = None) -> Dict[str, Any]:
    path = path or "config.json"
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            try:
                cfg = json.load(f)
            except Exception:
                cfg = {}
    else:
        cfg = {}

    # 深度合并（浅简实现）
    def merge(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
        out = dict(a)
        for k, v in b.items():
            if isinstance(v, dict) and isinstance(out.get(k), dict):
                out[k] = merge(out[k], v)  # type: ignore
            else:
                out[k] = v
        return out

    return merge(DEFAULTS, cfg)
