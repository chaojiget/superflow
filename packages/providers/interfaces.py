# -*- coding: utf-8 -*-
"""
SPEC:
  模块: providers.interfaces
  目标: 定义最小 LLM Chat Provider 协议（Protocol），以解耦具体厂商客户端。
  接口:
    - chat_with_meta(messages, temperature, max_tokens, retries) -> (content, meta)
  说明:
    - 任何实现该方法签名的客户端都可被 agents.llm_agents 注入使用（如 OpenRouterClient、OpenAIClient、LLMRouter）。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Protocol, Tuple


class LLMChatProvider(Protocol):
    def chat_with_meta(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
        retries: int = 0,
    ) -> Tuple[str, Dict[str, Any]]:
        """返回 (content, meta)。meta 至少包含 provider/model/attempts，可选 usage/cost/request_id。"""
        ...

