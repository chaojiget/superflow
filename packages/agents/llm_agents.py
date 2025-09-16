"""
# -*- coding: utf-8 -*-
SPEC:
  模块: agents.llm_agents
  目标: LLM 驱动的 Planner/Executor/Critic/Reviser 实现
  依赖: packages.providers.openrouter_client.OpenRouterClient
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any, Dict, Tuple

from packages.agents.interfaces import Planner, Executor, Critic, Reviser
from packages.agents.registry import register
from packages.providers.interfaces import LLMChatProvider
from packages.providers.openrouter_client import extract_json_block
from packages.prompts.loader import load_pair, render


@register("planner", "llm")
class PlannerLLM(Planner):
    def __init__(self, client: LLMChatProvider) -> None:
        self.client = client
        self.last_meta: Dict[str, Any] = {}

    def plan(self, srs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        csv_excerpt: str = context.get("csv_excerpt", "")
        prompts_dir: str = context.get("prompts_dir", "packages/prompts")
        sys_t, usr_t = load_pair(prompts_dir, "planner")
        system = sys_t or (
            "你是 Planner。请仅输出 JSON，不要额外文本。根据给定 SRS 和 CSV 片段，生成一个计划对象。"
        )
        user = render(
            usr_t or "SRS:\n{{SRS}}\n\nCSV_Excerpt:\n{{CSV_EXCERPT}}",
            {"SRS": json.dumps(srs, ensure_ascii=False), "CSV_EXCERPT": csv_excerpt},
        )
        temp = float(context.get("temperature", 0.2))
        retries = int(context.get("retries", 0))
        content, meta = self.client.chat_with_meta([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=temp, retries=retries)
        self.last_meta = meta
        obj = extract_json_block(content)
        plan = obj.get("plan") or obj
        plan.setdefault("id", f"plan-{uuid.uuid4().hex[:8]}")
        return plan


@register("executor", "llm")
class ExecutorLLM(Executor):
    def __init__(self, client: LLMChatProvider) -> None:
        self.client = client
        self.last_meta: Dict[str, Any] = {}

    def execute(self, srs: Dict[str, Any], plan: Dict[str, Any], context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        csv_excerpt: str = context.get("csv_excerpt", "")
        prompts_dir: str = context.get("prompts_dir", "packages/prompts")
        sys_t, usr_t = load_pair(prompts_dir, "executor")
        system = sys_t or "你是执行器/报告生成器。"
        user = render(
            usr_t or "SRS:\n{{SRS}}\n\nPlan:\n{{PLAN}}\n\nCSV:\n{{CSV_EXCERPT}}",
            {"SRS": json.dumps(srs, ensure_ascii=False), "PLAN": json.dumps(plan, ensure_ascii=False), "CSV_EXCERPT": csv_excerpt},
        )
        t0 = time.time()
        temp = float(context.get("temperature", 0.6))
        retries = int(context.get("retries", 0))
        md, meta = self.client.chat_with_meta([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=temp, retries=retries)
        self.last_meta = meta
        latency_ms = int((time.time() - t0) * 1000)
        return md, {"metrics": {"latency_ms": latency_ms, "retries": meta.get("attempts", 1) - 1, "cost": 0.0}, "llm": meta}


@register("critic", "llm")
class CriticLLM(Critic):
    def __init__(self, client: LLMChatProvider) -> None:
        self.client = client
        self.last_meta: Dict[str, Any] = {}

    def review(self, srs: Dict[str, Any], report_md: str, context: Dict[str, Any]) -> Dict[str, Any]:
        prompts_dir: str = context.get("prompts_dir", "packages/prompts")
        sys_t, usr_t = load_pair(prompts_dir, "critic")
        system = sys_t or "你是评审器。"
        user = render(
            usr_t or "SRS:\n{{SRS}}\n\nREPORT:\n{{REPORT_MD}}",
            {"SRS": json.dumps(srs, ensure_ascii=False), "REPORT_MD": report_md},
        )
        temp = float(context.get("temperature", 0.0))
        retries = int(context.get("retries", 0))
        content, meta = self.client.chat_with_meta([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=temp, retries=retries)
        self.last_meta = meta
        obj = extract_json_block(content)
        obj.setdefault("score", 0.0)
        obj.setdefault("reasons", [])
        if "pass" not in obj:
            obj["pass"] = float(obj["score"]) >= 0.8
        return obj


@register("reviser", "llm")
class ReviserLLM(Reviser):
    def __init__(self, client: LLMChatProvider) -> None:
        self.client = client
        self.last_meta: Dict[str, Any] = {}

    def revise(self, srs: Dict[str, Any], report_md: str, review_result: Dict[str, Any], context: Dict[str, Any]) -> str:
        prompts_dir: str = context.get("prompts_dir", "packages/prompts")
        sys_t, usr_t = load_pair(prompts_dir, "reviser")
        system = sys_t or "你是审稿改写器。"
        user = render(
            usr_t or "SRS:\n{{SRS}}\n\nCRITIC:\n{{CRITIC}}\n\nREPORT:\n{{REPORT_MD}}",
            {"SRS": json.dumps(srs, ensure_ascii=False), "CRITIC": json.dumps(review_result, ensure_ascii=False), "REPORT_MD": report_md},
        )
        temp = float(context.get("temperature", 0.4))
        retries = int(context.get("retries", 0))
        revised, meta = self.client.chat_with_meta([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=temp, retries=retries)
        self.last_meta = meta
        return revised
