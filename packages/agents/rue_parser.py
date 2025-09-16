"""
SPEC:
  模块: agents.rue_parser
  目标: 将自然语言需求解析为结构化 TaskSpec（SRS）
  说明: 采用启发式抽取，支持约束/验收/参数/风险等字段
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence


class RueParseError(Exception):
    """RUE 解析失败（信息不足或内部错误）。"""

    def __init__(self, message: str, *, kind: str = "error", missing: Optional[Sequence[str]] = None) -> None:
        super().__init__(message)
        self.kind = kind
        self.missing = list(missing or [])


@dataclass
class AcceptanceCriterion:
    id: str = ""
    then: str = ""
    given: Optional[str] = None
    when: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {"id": self.id or "", "then": self.then}
        if self.given:
            data["given"] = self.given
        if self.when:
            data["when"] = self.when
        return data


@dataclass
class TaskSpec:
    goal: str
    budget_usd: float = 0.0
    inputs: Dict[str, Any] = field(default_factory=dict)
    constraints: List[str] = field(default_factory=list)
    params: Dict[str, Any] = field(default_factory=dict)
    acceptance: List[AcceptanceCriterion] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_constraints(self, values: Iterable[str]) -> None:
        for val in values:
            if isinstance(val, str):
                stripped = val.strip()
                if stripped:
                    self.constraints.append(stripped)

    def merge_params(self, params: Optional[Dict[str, Any]]) -> None:
        if not params:
            return
        for key, value in params.items():
            if value is None:
                continue
            self.params[key] = value

    def add_acceptance(self, *criteria: AcceptanceCriterion) -> None:
        for item in criteria:
            if isinstance(item, AcceptanceCriterion):
                self.acceptance.append(item)

    def finalize(self) -> None:
        # 约束去重
        unique_constraints: List[str] = []
        seen = set()
        for item in self.constraints:
            if not item:
                continue
            if item not in seen:
                unique_constraints.append(item)
                seen.add(item)
        self.constraints = unique_constraints

        # 参数默认值
        top_n = self.params.get("top_n")
        try:
            if top_n is not None:
                self.params["top_n"] = int(top_n)
        except (TypeError, ValueError):
            self.params["top_n"] = 10
        if "top_n" not in self.params:
            self.params["top_n"] = 10
        if "score_by" not in self.params:
            self.params["score_by"] = "views"
        if "title_field" not in self.params:
            self.params["title_field"] = "title"

        # 验收用例整理
        deduped: List[AcceptanceCriterion] = []
        seen_acceptance = set()
        for crit in self.acceptance:
            if not isinstance(crit, AcceptanceCriterion):
                continue
            if not crit.then:
                continue
            key = (crit.then, crit.given or "", crit.when or "")
            if key in seen_acceptance:
                continue
            seen_acceptance.add(key)
            deduped.append(crit)
        if not deduped:
            deduped.append(
                AcceptanceCriterion(
                    id="A1",
                    given="已提供结构化数据",
                    when="运行最小闭环流程",
                    then="交付 Markdown 报告，包含 Summary 与 TopN 段落",
                )
            )
        for idx, crit in enumerate(deduped, start=1):
            if not crit.id:
                crit.id = f"A{idx}"
        self.acceptance = deduped

        # 风险去重
        unique_risks: List[str] = []
        seen_risks = set()
        for risk in self.risks:
            if not isinstance(risk, str):
                continue
            stripped = risk.strip()
            if not stripped or stripped in seen_risks:
                continue
            seen_risks.add(stripped)
            unique_risks.append(stripped)
        self.risks = unique_risks

        # 目标兜底
        self.goal = (self.goal or "生成数据洞察报告").strip()
        if not self.goal:
            self.goal = "生成数据洞察报告"

        # 预算非负
        if not isinstance(self.budget_usd, (int, float)):
            try:
                self.budget_usd = float(self.budget_usd)
            except (TypeError, ValueError):
                self.budget_usd = 0.0
        if self.budget_usd < 0:
            self.budget_usd = 0.0

    def to_dict(self) -> Dict[str, Any]:
        self.finalize()
        data: Dict[str, Any] = {
            "goal": self.goal,
            "budget_usd": round(float(self.budget_usd), 4),
            "inputs": dict(self.inputs),
            "constraints": list(self.constraints),
            "params": dict(self.params),
            "acceptance": [crit.to_dict() for crit in self.acceptance],
        }
        if self.risks:
            data["risks"] = list(self.risks)
        if self.metadata:
            data["metadata"] = dict(self.metadata)
        return data


class RueParser:
    SCORE_KEYWORDS: Dict[str, Sequence[str]] = {
        "views": ("浏览", "播放", "热度", "view", "阅读"),
        "likes": ("点赞", "喜欢", "like"),
        "comments": ("评论", "comment"),
        "clicks": ("点击", "click"),
        "conversion_rate": ("转化", "成交", "conversion"),
    }
    SCORE_LABELS: Dict[str, str] = {
        "views": "浏览量",
        "likes": "点赞数",
        "comments": "评论数",
        "clicks": "点击量",
        "conversion_rate": "转化率",
    }

    def __init__(self, *, default_constraints: Optional[Sequence[str]] = None, cny_to_usd_rate: float = 0.14) -> None:
        self.default_constraints = list(default_constraints or ("成本≤¥1", "完成≤2min"))
        self.cny_to_usd_rate = cny_to_usd_rate

    def parse(
        self,
        query: str,
        *,
        data_path: Optional[str] = None,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> TaskSpec:
        text = (query or "").strip()
        if not text:
            raise RueParseError("缺少任务需求描述。", kind="insufficient", missing=["query"])

        spec = TaskSpec(goal=self._infer_goal(text))
        path = data_path or self._extract_csv_path(text)
        if path:
            spec.inputs["csv_path"] = str(path)
        if not spec.inputs.get("csv_path"):
            raise RueParseError("未提供数据 CSV 路径。", kind="insufficient", missing=["inputs.csv_path"])

        spec.add_constraints(self.default_constraints)
        params = self._infer_params(text)
        spec.merge_params(params)
        spec.add_acceptance(*self._infer_acceptance(text, params))
        spec.risks.extend(self._infer_risks(text, params))
        budget = self._infer_budget(text)
        if budget is not None:
            spec.budget_usd = budget

        warnings = self._collect_warnings(spec)
        if warnings:
            spec.metadata["warnings"] = warnings

        if overrides:
            self._apply_overrides(spec, overrides)

        spec.finalize()
        return spec

    # ------------------------------------------------------------------
    # Heuristics

    def _infer_goal(self, text: str) -> str:
        sentences = re.split(r"[。！？\n]\s*", text)
        for sent in sentences:
            stripped = sent.strip(" ，,;；")
            if not stripped:
                continue
            for keyword in ("生成", "制作", "产出", "撰写", "整理", "分析"):
                idx = stripped.find(keyword)
                if idx != -1:
                    return stripped[idx:].strip()
        return sentences[0].strip() if sentences else text.strip()

    def _extract_csv_path(self, text: str) -> Optional[str]:
        match = re.search(r"([A-Za-z0-9_./\\-]+\.csv)", text)
        if match:
            return match.group(1)
        return None

    def _extract_top_n(self, text: str) -> Optional[int]:
        patterns = (
            r"top\s*(\d{1,3})",
            r"Top\s*(\d{1,3})",
            r"前\s*(\d{1,3})\s*(?:条|个|名|项|篇)",
            r"挑(?:选|出)\s*(\d{1,3})",
            r"(\d{1,3})\s*(?:条|个|篇)\s*(?:热点|高|热门)",
        )
        for pat in patterns:
            match = re.search(pat, text, flags=re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except (TypeError, ValueError):
                    continue
        return None

    def _infer_params(self, text: str) -> Dict[str, Any]:
        params: Dict[str, Any] = {}
        top_n = self._extract_top_n(text)
        if top_n is not None:
            params["top_n"] = top_n

        lowered = text.lower()
        score_by: Optional[str] = None
        for field, keywords in self.SCORE_KEYWORDS.items():
            for kw in keywords:
                if kw.lower() in lowered or kw in text:
                    score_by = field
                    break
            if score_by:
                break
        if score_by:
            params["score_by"] = score_by

        if "标题" in text or "title" in lowered:
            params["title_field"] = "title"
        elif "名称" in text:
            params["title_field"] = "name"

        return params

    def _infer_acceptance(self, text: str, params: Dict[str, Any]) -> List[AcceptanceCriterion]:
        acceptance: List[AcceptanceCriterion] = []
        base_given = "已提供结构化数据"
        base_when = "运行最小闭环流程"
        lowered = text.lower()

        if any(word in lowered for word in ("summary", "摘要", "总结", "overview")) or "摘要" in text:
            acceptance.append(
                AcceptanceCriterion(
                    given=base_given,
                    when=base_when,
                    then="报告需包含 Summary/摘要 段落",
                )
            )

        top_n = params.get("top_n")
        if isinstance(top_n, int) and top_n > 0:
            score_label = self.SCORE_LABELS.get(str(params.get("score_by")), str(params.get("score_by", "score")))
            acceptance.append(
                AcceptanceCriterion(
                    given=base_given,
                    when="执行排序与筛选步骤",
                    then=f"Top 列表输出 {top_n} 条记录，并按 {score_label} 降序排列",
                )
            )

        if any(word in lowered for word in ("markdown", "表格", "table")):
            acceptance.append(
                AcceptanceCriterion(
                    given=base_given,
                    when=base_when,
                    then="交付物为 Markdown，含表格展示关键指标",
                )
            )

        if any(word in lowered for word in ("链接", "来源", "link")):
            acceptance.append(
                AcceptanceCriterion(
                    given=base_given,
                    when=base_when,
                    then="Top 列表需包含来源或链接字段",
                )
            )

        if any(word in lowered for word in ("洞察", "原因", "insight")):
            acceptance.append(
                AcceptanceCriterion(
                    given=base_given,
                    when=base_when,
                    then="Summary 中需写明关键洞察或原因分析",
                )
            )

        return acceptance

    def _infer_risks(self, text: str, params: Dict[str, Any]) -> List[str]:
        risks: List[str] = []
        lowered = text.lower()
        if any(word in lowered for word in ("实时", "最新", "today", "current")):
            risks.append("数据时效性要求高，需确认 CSV 为最新版本")
        if params.get("score_by") not in (None, "views", "likes", "comments", "clicks", "conversion_rate"):
            risks.append("score_by 字段可能缺失或命名不同，需要确认数据列")
        if isinstance(params.get("top_n"), int) and params.get("top_n", 0) > 50:
            risks.append("top_n 数值较大，可能导致执行耗时")
        if not risks:
            risks = [
                "CSV 字段缺失或命名不一致可能导致统计失败",
                "若数据源为空需回退为默认样例",
            ]
        return risks

    def _infer_budget(self, text: str) -> Optional[float]:
        usd_match = re.search(r"(?:预算|成本|花费)[^\d]{0,4}([0-9]+(?:\.[0-9]+)?)\s*(?:usd|美元|美金)", text, flags=re.IGNORECASE)
        if usd_match:
            try:
                return float(usd_match.group(1))
            except (TypeError, ValueError):
                return None
        symbol_match = re.search(r"\$\s*([0-9]+(?:\.[0-9]+)?)", text)
        if symbol_match:
            try:
                return float(symbol_match.group(1))
            except (TypeError, ValueError):
                return None
        cny_match = re.search(r"(?:预算|成本|花费)[^\d]{0,4}([0-9]+(?:\.[0-9]+)?)\s*(?:元|人民币|cny|¥|￥)", text, flags=re.IGNORECASE)
        if cny_match:
            try:
                cny_val = float(cny_match.group(1))
            except (TypeError, ValueError):
                return None
            return round(cny_val * self.cny_to_usd_rate, 4)
        return None

    def _collect_warnings(self, spec: TaskSpec) -> List[str]:
        warnings: List[str] = []
        top_n = spec.params.get("top_n")
        try:
            if isinstance(top_n, int) and top_n > 50:
                warnings.append("top_n 较大，建议确认执行性能。")
        except Exception:
            pass
        return warnings

    def _apply_overrides(self, spec: TaskSpec, overrides: Dict[str, Any]) -> None:
        goal = overrides.get("goal")
        if isinstance(goal, str) and goal.strip():
            spec.goal = goal.strip()

        constraints = overrides.get("constraints")
        if isinstance(constraints, Iterable) and not isinstance(constraints, (str, bytes)):
            spec.add_constraints(str(item) for item in constraints if isinstance(item, (str, int, float)))

        params = overrides.get("params")
        if isinstance(params, dict):
            spec.merge_params(params)

        acceptance = overrides.get("acceptance")
        if isinstance(acceptance, Iterable) and not isinstance(acceptance, (str, bytes)):
            for item in acceptance:
                if isinstance(item, AcceptanceCriterion):
                    spec.add_acceptance(item)
                elif isinstance(item, dict):
                    then_val = str(item.get("then") or "").strip()
                    if not then_val:
                        continue
                    crit = AcceptanceCriterion(
                        id=str(item.get("id") or ""),
                        given=str(item.get("given")) if item.get("given") else None,
                        when=str(item.get("when")) if item.get("when") else None,
                        then=then_val,
                    )
                    spec.add_acceptance(crit)

        inputs = overrides.get("inputs")
        if isinstance(inputs, dict):
            for key, value in inputs.items():
                if value is None:
                    continue
                spec.inputs[key] = value

        budget = overrides.get("budget_usd")
        if budget is None:
            budget = overrides.get("budget")
        budget_val = self._safe_float(budget)
        if budget_val is not None:
            spec.budget_usd = budget_val
        else:
            budget_cny = self._safe_float(overrides.get("budget_cny"))
            if budget_cny is not None:
                spec.budget_usd = round(budget_cny * self.cny_to_usd_rate, 4)

    def _safe_float(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None
            try:
                return float(stripped)
            except ValueError:
                return None
        return None


__all__ = [
    "AcceptanceCriterion",
    "RueParseError",
    "RueParser",
    "TaskSpec",
]

