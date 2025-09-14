"""
# -*- coding: utf-8 -*-
SPEC:
  模块: providers.router
  目标: 简单路由器骨架，按配置选择 OpenRouter 或 OpenAI 客户端
  说明: 仅骨架，不影响现有 CLI 默认行为
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from packages.providers.openrouter_client import OpenRouterClient
from packages.providers.openai_client import OpenAIClient


class LLMRouter:
    def __init__(self, cfg: Dict[str, Any]) -> None:
        self.cfg = cfg
        self.provider = cfg.get("llm", {}).get("provider", "openrouter")
        if self.provider == "openai":
            self.client = OpenAIClient(
                base_url=cfg.get("llm", {}).get("base_url"),
                model=cfg.get("llm", {}).get("model"),
            )
        else:
            self.client = OpenRouterClient(
                base_url=cfg.get("llm", {}).get("base_url"),
                model=cfg.get("llm", {}).get("model"),
            )

    def chat_with_meta(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        retries: int = 0,
    ) -> Tuple[str, Dict[str, Any]]:
        return self.client.chat_with_meta(messages, temperature=temperature, max_tokens=max_tokens, retries=retries)  # type: ignore

