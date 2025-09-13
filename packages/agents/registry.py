"""
# -*- coding: utf-8 -*-
SPEC:
  模块: agents.registry
  目标: 简单插件注册/获取工厂，按角色+名称选择实现
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Type


_REGISTRY: Dict[str, Dict[str, Type[Any]]] = {
    "planner": {},
    "executor": {},
    "critic": {},
    "reviser": {},
}


def register(role: str, name: str):
    role = role.lower()
    def deco(cls: Type[Any]) -> Type[Any]:
        if role not in _REGISTRY:
            raise ValueError(f"未知角色: {role}")
        _REGISTRY[role][name.lower()] = cls
        return cls
    return deco


def get(role: str, name: str) -> Type[Any]:
    role = role.lower()
    name = name.lower()
    if role not in _REGISTRY or name not in _REGISTRY[role]:
        raise KeyError(f"未注册: role={role} name={name}")
    return _REGISTRY[role][name]


def list_plugins(role: str) -> Dict[str, Type[Any]]:
    role = role.lower()
    return dict(_REGISTRY.get(role, {}))

