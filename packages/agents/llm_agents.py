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
from packages.providers.openrouter_client import OpenRouterClient, extract_json_block


@register("planner", "llm")
class PlannerLLM(Planner):
    def __init__(self, client: OpenRouterClient) -> None:
        self.client = client

    def plan(self, srs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        csv_excerpt: str = context.get("csv_excerpt", "")
        system = (
            "你是 Planner。请仅输出 JSON，不要额外文本。根据给定 SRS 和 CSV 片段，"
            "生成一个计划对象，包含: plan:{id, steps[], params{}, risks[], acceptance[]}。"
            "注意: steps 为可执行步骤，每步为 {id, op, args}，其中 op 只能是以下之一: \n"
            "- csv.clean\n- stats.aggregate\n- md.render\n"
            "args 根据 op 提供所需参数，例如: csv.clean:{drop_empty}, stats.aggregate:{top_n,score_by,title_field}, md.render:{include_table}。"
        )
        user = (
            f"SRS:\n{json.dumps(srs, ensure_ascii=False)}\n\n"
            f"CSV_Excerpt(最多前几行):\n" + csv_excerpt + "\n\n"
            "请只返回 JSON，例如: {\"plan\":{\"id\":\"...\",\"steps\":[...],\"params\":{...},\"risks\":[...],\"acceptance\":[...]}}"
        )
        content = self.client.chat([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=0.2)
        obj = extract_json_block(content)
        plan = obj.get("plan") or obj
        plan.setdefault("id", f"plan-{uuid.uuid4().hex[:8]}")
        return plan


@register("executor", "llm")
class ExecutorLLM(Executor):
    def __init__(self, client: OpenRouterClient) -> None:
        self.client = client

    def execute(self, srs: Dict[str, Any], plan: Dict[str, Any], context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        csv_excerpt: str = context.get("csv_excerpt", "")
        t0 = time.time()
        system = (
            "你是执行器/报告生成器。根据 SRS 目标和 CSV 片段，生成结构化的 Markdown 周报。"
            "要求包含: # Weekly Report, ## Summary(总数/均值等), ## Top Items(表格)。"
            "内容要可复制，避免多余解释文本。"
        )
        user = (
            f"SRS:\n{json.dumps(srs, ensure_ascii=False)}\n\n"
            f"Plan:\n{json.dumps(plan, ensure_ascii=False)}\n\n"
            f"CSV_Excerpt:\n" + csv_excerpt + "\n\n"
            "请直接输出 Markdown 文本。"
        )
        md = self.client.chat([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=0.6)
        latency_ms = int((time.time() - t0) * 1000)
        return md, {"metrics": {"latency_ms": latency_ms, "retries": 0, "cost": 0.0}}


@register("critic", "llm")
class CriticLLM(Critic):
    def __init__(self, client: OpenRouterClient) -> None:
        self.client = client

    def review(self, srs: Dict[str, Any], report_md: str, context: Dict[str, Any]) -> Dict[str, Any]:
        system = (
            "你是评审器。请仅输出 JSON，不要额外文本。基于 SRS 的验收与约束，"
            "对给定 Markdown 报告评分，范围[0,1]，0=完全不符合,1=完全符合。"
        )
        user = (
            f"SRS:\n{json.dumps(srs, ensure_ascii=False)}\n\n"
            f"REPORT_MARKDOWN:\n" + report_md + "\n\n"
            "请仅返回 JSON，例如: {\"pass\":true,\"score\":0.92,\"reasons\":[\"问题1\",\"问题2\"]}。"
            "通过标准: score>=0.8 视为 pass=true。"
        )
        content = self.client.chat([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=0.0)
        obj = extract_json_block(content)
        obj.setdefault("score", 0.0)
        obj.setdefault("reasons", [])
        if "pass" not in obj:
            obj["pass"] = float(obj["score"]) >= 0.8
        return obj


@register("reviser", "llm")
class ReviserLLM(Reviser):
    def __init__(self, client: OpenRouterClient) -> None:
        self.client = client

    def revise(self, srs: Dict[str, Any], report_md: str, review_result: Dict[str, Any], context: Dict[str, Any]) -> str:
        system = (
            "你是审稿改写器。根据评审意见改进 Markdown 报告，保持结构与可复制性，不要返回解释。"
        )
        user = (
            f"SRS:\n{json.dumps(srs, ensure_ascii=False)}\n\n"
            f"CRITIC:\n{json.dumps(review_result, ensure_ascii=False)}\n\n"
            f"REPORT_MARKDOWN(待改进):\n" + report_md + "\n\n"
            "请直接输出改进后的 Markdown。"
        )
        return self.client.chat([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ], temperature=0.4)

