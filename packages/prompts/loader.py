"""
# -*- coding: utf-8 -*-
SPEC:
  模块: prompts.loader
  目标: 从 prompts 目录加载 system/user 模板并进行简单变量替换
"""

from __future__ import annotations

import os
from typing import Dict, Tuple


def load_pair(prompts_dir: str, basename: str) -> Tuple[str, str]:
    """加载同名的 system/user 模板，例如 basename='planner' =>
    读取 planner.system.txt 与 planner.user.txt。不存在则返回空串。
    """
    sys_path = os.path.join(prompts_dir, f"{basename}.system.txt")
    usr_path = os.path.join(prompts_dir, f"{basename}.user.txt")
    def _read(p: str) -> str:
        try:
            with open(p, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return ""
    return _read(sys_path), _read(usr_path)


def render(text: str, vars: Dict[str, str]) -> str:
    out = text
    for k, v in vars.items():
        out = out.replace("{{" + k + "}}", v)
    return out

