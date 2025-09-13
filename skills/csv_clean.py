# -*- coding: utf-8 -*-
"""
SPEC:
  模块: skills.csv_clean
  目标: 清洗 CSV 行（去空标题/视图值，去除首尾空白）
  输入: rows: list[dict], drop_empty: bool
  输出: cleaned rows: list[dict]
  约束: 纯函数; 无 IO
  测试: 当 drop_empty=True 时应移除空标题/空视图的行
"""

from typing import Dict, List


def _norm(v: str) -> str:
    return (v or "").strip()


def csv_clean(rows: List[Dict[str, str]], drop_empty: bool = True) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for r in rows:
        r2 = {k: _norm(v) for k, v in r.items()}
        # 若开启丢弃空值，则过滤掉标题或浏览量为空的记录
        if drop_empty and (not r2.get("title") or not r2.get("views")):
            continue
        out.append(r2)
    return out
