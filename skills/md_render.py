# -*- coding: utf-8 -*-
"""
SPEC:
  模块: skills.md_render
  目标: 根据汇总与 Top 列表渲染 Markdown 报告
  输入: summary: dict, top: list[dict], include_table: bool
  输出: markdown 字符串
  约束: 纯函数; 格式化可确定
  测试: 应包含必要标题与包含 N 行的表格
"""

from typing import Dict, List


def md_render(summary: Dict, top: List[Dict], include_table: bool = True) -> str:
    lines = []
    lines.append("# Weekly Report")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- Count: {summary.get('count', 0)}")
    lines.append(f"- Total: {summary.get('total', 0)}")
    lines.append(f"- Average: {summary.get('avg', 0)}")
    lines.append("")
    lines.append("## Top Items")
    if include_table:
        lines.append("")
        lines.append("| Rank | Title | Score |")
        lines.append("| ---- | ----- | -----:|")
        for item in top:
            title = item.get("title", "").replace("|", "\|")
            score = item.get("score", 0)
            lines.append(f"| {item.get('rank', '')} | {title} | {score} |")
    return "\n".join(lines) + "\n"
