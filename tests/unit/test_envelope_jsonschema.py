# -*- coding: utf-8 -*-

import pytest


def test_envelope_jsonschema_validation_optional_fields():
    # 若未安装 jsonschema，本测试自动跳过
    jsonschema = pytest.importorskip("jsonschema")
    from kernel.bus import OutboxBus

    bus = OutboxBus(episodes_dir="episodes")
    bus.new_trace("goal")

    # 正常：可选字段类型正确
    bus.append("ok.event", {}, budget_ctx={"usd": 1}, authz={"caps": ["fs:read"]}, labels={"k": "v"}, cost=0.0)

    # 错误：budget_ctx 为非对象，应当触发 jsonschema.ValidationError
    with pytest.raises(jsonschema.exceptions.ValidationError):  # type: ignore
        bus.append("bad.event", {}, budget_ctx=123)  # type: ignore

