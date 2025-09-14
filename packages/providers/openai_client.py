"""
# -*- coding: utf-8 -*-
SPEC:
  模块: providers.openai_client
  目标: 基于 OpenAI Chat Completions 的最小客户端（与 OpenRouter 接口相似）
  环境: OPENAI_API_KEY, OPENAI_BASE_URL(可选, 默认 https://api.openai.com/v1), OPENAI_MODEL
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Tuple


class OpenAIClient:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None) -> None:
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.base_url = base_url or os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        if not self.api_key:
            raise RuntimeError("缺少 OPENAI_API_KEY")

    def chat_with_meta(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        retries: int = 0,
    ) -> Tuple[str, Dict[str, Any]]:
        import requests
        url = f"{self.base_url.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload: Dict[str, Any] = {"model": self.model, "messages": messages, "temperature": float(temperature)}
        if max_tokens is not None:
            payload["max_tokens"] = int(max_tokens)
        attempts = 0
        while True:
            attempts += 1
            resp = requests.post(url, headers=headers, json=payload, timeout=120)
            status = resp.status_code
            try:
                data = resp.json()
            except Exception:
                data = {}
            if status < 400:
                content = (data.get("choices", [{}])[0].get("message", {}) or {}).get("content", "")
                meta = {
                    "provider": "openai",
                    "model": self.model,
                    "usage": data.get("usage"),
                    "status_code": status,
                    "attempts": attempts,
                    "request_id": resp.headers.get("x-request-id"),
                    "temperature": temperature,
                }
                return content, meta
            if attempts > max(0, retries) or status < 500 and status != 429:
                raise RuntimeError(f"OpenAI 调用失败: {status} {resp.text[:200]}")

