"""
# -*- coding: utf-8 -*-
SPEC:
  模块: agents.skills_registry
  目标: 最小技能注册表校验，核对文件哈希
"""

from __future__ import annotations

import hashlib
import json
import os
from typing import Dict, Any


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_registry(path: str = "skills/registry.json") -> Dict[str, Any]:
    if not os.path.exists(path):
        return {"skills": []}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def verify_skills(strict: bool = True, path: str = "skills/registry.json") -> bool:
    reg = load_registry(path)
    ok = True
    for item in reg.get("skills", []):
        fpath = item.get("path")
        expected = item.get("sha256")
        if not fpath or not expected:
            ok = False
            continue
        if not os.path.exists(fpath):
            ok = False
            continue
        actual = sha256_file(fpath)
        if actual != expected:
            ok = False
    if strict and not ok:
        raise RuntimeError("技能签名校验失败，请检查 skills/registry.json 与实际文件是否一致")
    return ok

