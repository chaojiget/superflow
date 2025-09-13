# -*- coding: utf-8 -*-
"""
SPEC:
  模块: kernel.guardian
  目标: 离线运行的最小预算/超时守护
  输入: budget_usd, timeout_ms
  输出: 违反约束时抛异常; 正常不做任何事
  约束: 简单计数; v0 成本固定为 0
  测试: 超时应抛出异常
"""

import time


class BudgetGuardian:
    def __init__(self, budget_usd: float = 0.0, timeout_ms: int = 120000) -> None:
        self.budget_usd = max(0.0, float(budget_usd))
        self.timeout_ms = int(timeout_ms)
        self._t0 = time.time()

    def check(self) -> None:
        # cost is 0 in v0; only enforce timeout
        elapsed_ms = (time.time() - self._t0) * 1000
        if elapsed_ms > self.timeout_ms:
            raise TimeoutError(f"timeout exceeded: {elapsed_ms:.0f}ms > {self.timeout_ms}ms")
