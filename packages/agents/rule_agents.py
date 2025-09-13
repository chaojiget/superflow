"""
# -*- coding: utf-8 -*-
SPEC:
  模块: agents.rule_agents
  目标: 规则/本地技能版的 Planner/Executor/Critic/Reviser
"""

from __future__ import annotations

from typing import Any, Dict, Tuple, List

from packages.agents.interfaces import Planner, Executor, Critic, Reviser
from packages.agents.registry import register
from skills.csv_clean import csv_clean
from skills.stats_aggregate import stats_aggregate
from skills.md_render import md_render


@register("planner", "rules")
class PlannerRules(Planner):
    def plan(self, srs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        params = srs.get("params", {})
        top_n = int(params.get("top_n", 10))
        score_by = params.get("score_by", "views")
        title_field = params.get("title_field", "title")
        return {
            "id": "plan-rules",
            "steps": [
                {"id": "s1", "op": "csv.clean", "args": {"drop_empty": True}},
                {"id": "s2", "op": "stats.aggregate", "args": {"top_n": top_n, "score_by": score_by, "title_field": title_field}},
                {"id": "s3", "op": "md.render", "args": {"include_table": True}},
            ],
        }


@register("executor", "skills")
class ExecutorSkills(Executor):
    def execute(self, srs: Dict[str, Any], plan: Dict[str, Any], context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        rows: List[Dict[str, str]] = context.get("rows", [])
        steps = plan.get("steps", [])
        step_by_id = {s.get("id"): s for s in steps}
        s1 = step_by_id.get("s1") or {"args": {"drop_empty": True}}
        cleaned = csv_clean(rows, **(s1.get("args", {}) or {}))
        s2 = step_by_id.get("s2") or {"args": {"top_n": 10, "score_by": "views", "title_field": "title"}}
        agg = stats_aggregate(cleaned, **(s2.get("args", {}) or {}))
        s3 = step_by_id.get("s3") or {"args": {"include_table": True}}
        md_text = md_render(agg.get("summary", {}), agg.get("top", []), **(s3.get("args", {}) or {}))
        return md_text, {"artifacts": {"found_top": len(agg.get("top", []))}, "metrics": {"latency_ms": 0, "retries": 0, "cost": 0.0}}


@register("critic", "rules")
class CriticRules(Critic):
    def review(self, srs: Dict[str, Any], report_md: str, context: Dict[str, Any]) -> Dict[str, Any]:
        reasons = []
        ok = True
        if "# Weekly Report" not in report_md:
            ok = False
            reasons.append("missing header")
        if "## Top Items" not in report_md:
            ok = False
            reasons.append("missing top section")
        # 计分
        score = 1.0
        for r in reasons:
            if r.startswith("missing"):
                score -= 0.3
        return {"pass": ok and score >= 0.8, "score": round(score, 2), "reasons": reasons}


@register("reviser", "rules")
class ReviserRules(Reviser):
    def revise(self, srs: Dict[str, Any], report_md: str, review_result: Dict[str, Any], context: Dict[str, Any]) -> str:
        # 简单修补：若缺少必要标题则补上框架
        text = report_md
        if "# Weekly Report" not in text:
            text = "# Weekly Report\n\n" + text
        if "## Summary" not in text:
            text += "\n## Summary\n- Count: 0\n- Total: 0\n- Average: 0\n"
        if "## Top Items" not in text:
            text += "\n## Top Items\n\n| Rank | Title | Score |\n| ---- | ----- | -----:|\n"
        return text

