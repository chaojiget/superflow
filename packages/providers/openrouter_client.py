# -*- coding: utf-8 -*-
"""
SPEC:
  模块: providers.openrouter_client
  目标: 通过 OpenRouter(OpenAI 兼容) 提供简单的 LLM Chat 客户端
  输入: model, messages[{role, content}], 可选 temperature/seed
  输出: 文本或 JSON(由上层解析)
  约束: 读取 .env(若可用) 与环境变量; 不做网络重试(由上层决定)
  变量: OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL, OPENROUTER_SEED
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional


def _load_dotenv_if_available() -> None:
    try:
        # 延迟导入, 若未安装则忽略
        from dotenv import load_dotenv  # type: ignore

        # 从项目根目录尝试加载 .env
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        env_path = os.path.join(root, ".env")
        if os.path.exists(env_path):
            load_dotenv(env_path)  # 不抛错
    except Exception:
        pass


class OpenRouterClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        seed: Optional[int] = None,
    ) -> None:
        _load_dotenv_if_available()
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.base_url = base_url or os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        self.model = model or os.environ.get("OPENROUTER_MODEL", "qwen/qwen3-next-80b-a3b-thinking")
        seed_env = seed if seed is not None else os.environ.get("OPENROUTER_SEED")
        self.seed: Optional[int] = int(seed_env) if (isinstance(seed_env, str) and seed_env.isdigit()) else (seed if isinstance(seed, int) else None)

        if not self.api_key:
            raise RuntimeError("缺少 OPENROUTER_API_KEY，请在环境变量或 .env 中配置")

    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.2, max_tokens: Optional[int] = None) -> str:
        """调用 OpenRouter 的 chat/completions 接口，返回第一条回复文本。
        messages: [ {"role":"system|user|assistant", "content":"..."}, ... ]
        """
        import requests  # 依赖 requests

        url = f"{self.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": float(temperature),
        }
        if max_tokens is not None:
            payload["max_tokens"] = int(max_tokens)
        if self.seed is not None:
            payload["seed"] = self.seed

        resp = requests.post(url, headers=headers, json=payload, timeout=120)
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenRouter 调用失败: {resp.status_code} {resp.text[:200]}")
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            raise RuntimeError(f"解析 OpenRouter 响应失败: {e}; 原始: {json.dumps(data)[:200]}")

    def chat_with_meta(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        retries: int = 0,
    ) -> (str, Dict[str, Any]):
        """同 chat，但返回 (content, meta)。包含 provider/model/usage/status/attempts/request_id。
        增强：对 429/5xx 实施指数退避重试，并尊重 Retry-After 头。
        """
        import requests
        import time
        import random

        url = f"{self.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": float(temperature),
        }
        if max_tokens is not None:
            payload["max_tokens"] = int(max_tokens)
        if self.seed is not None:
            payload["seed"] = self.seed

        attempts = 0
        last_err: Optional[str] = None
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
                    "provider": "openrouter",
                    "model": self.model,
                    "usage": data.get("usage"),
                    "status_code": status,
                    "attempts": attempts,
                    "request_id": resp.headers.get("x-request-id"),
                    "temperature": temperature,
                }
                return content, meta
            # 非可重试错误（4xx 除 429）
            if status < 500 and status != 429:
                raise RuntimeError(f"OpenRouter 调用失败: {status} {resp.text[:200]}")
            # 可重试错误（429/5xx）：若超过重试次数则抛出
            if attempts > max(0, retries):
                raise RuntimeError(f"OpenRouter 调用失败: {status} {resp.text[:200]}")
            # 指数退避，尊重 Retry-After
            retry_after = resp.headers.get("Retry-After")
            delay = None
            try:
                if retry_after:
                    delay = float(retry_after)
            except Exception:
                delay = None
            if delay is None:
                delay = min(8.0, (2 ** (attempts - 1))) + random.uniform(0, 0.5)
            time.sleep(delay)


def extract_json_block(text: str) -> Dict[str, Any]:
    """从文本中尽量提取 JSON 对象。
    策略: 定位第一个 '{' 起点，做括号计数直到配对 '}'，再 json.loads。
    若失败则抛错。
    """
    start = text.find("{")
    if start == -1:
        raise ValueError("未找到 JSON 起始 '{'")
    depth = 0
    for i, ch in enumerate(text[start:], start=start):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                block = text[start : i + 1]
                return json.loads(block)
    raise ValueError("未找到完整的 JSON 对象配对")
