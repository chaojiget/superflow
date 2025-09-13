# -*- coding: utf-8 -*-
"""
SPEC:
  模块: skills.stats_aggregate
  目标: 计算汇总信息与按得分的 Top-N
  输入: rows: list[dict], top_n:int, score_by:str, title_field:str
  输出: { summary: {...}, top: [ {title, score, rank} ] }
  约束: 纯函数; 数值解析具备一定容错
  测试: 当数据足够时应产出 N 条 Top 项
"""

from typing import Dict, List, Any


def _to_number(x: Any) -> float:
    """宽松的数值解析。"""
    try:
        return float(str(x).replace(",", ""))
    except Exception:
        return 0.0


def stats_aggregate(
    rows: List[Dict[str, str]],
    top_n: int = 10,
    score_by: str = "views",
    title_field: str = "title",
) -> Dict[str, Any]:
    n = len(rows)
    total = sum(_to_number(r.get(score_by, 0)) for r in rows)
    avg = (total / n) if n else 0.0
    # rank
    ranked = sorted(
        (
            {
                "title": r.get(title_field, ""),
                "score": _to_number(r.get(score_by, 0)),
            }
            for r in rows
        ),
        key=lambda x: x["score"],
        reverse=True,
    )
    top = [
        {"rank": i + 1, **item}
        for i, item in enumerate(ranked[: max(0, int(top_n))])
        if item["title"]
    ]
    return {
        "summary": {"count": n, "total": round(total, 2), "avg": round(avg, 2)},
        "top": top,
    }
