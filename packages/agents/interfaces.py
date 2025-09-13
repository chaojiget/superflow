"""
# -*- coding: utf-8 -*-
SPEC:
  模块: agents.interfaces
  目标: 定义 Planner/Executor/Critic/Reviser 抽象接口
  约束: 简单同步接口; 输入输出均为 dict/str
"""

from __future__ import annotations

from typing import Any, Dict, Tuple


class Planner:
    def name(self) -> str:
        return self.__class__.__name__

    def plan(self, srs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class Executor:
    def name(self) -> str:
        return self.__class__.__name__

    def execute(self, srs: Dict[str, Any], plan: Dict[str, Any], context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """返回 (报告 Markdown, 执行上下文/指标)"""
        raise NotImplementedError


class Critic:
    def name(self) -> str:
        return self.__class__.__name__

    def review(self, srs: Dict[str, Any], report_md: str, context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class Reviser:
    def name(self) -> str:
        return self.__class__.__name__

    def revise(self, srs: Dict[str, Any], report_md: str, review_result: Dict[str, Any], context: Dict[str, Any]) -> str:
        raise NotImplementedError

