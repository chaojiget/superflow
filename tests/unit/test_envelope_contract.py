# -*- coding: utf-8 -*-

from kernel.bus import OutboxBus


def test_envelope_required_fields():
    bus = OutboxBus(episodes_dir="episodes")
    tid = bus.new_trace("goal")
    bus.append("test.event", {"k": "v"})
    ev = bus._events[0]
    assert isinstance(ev.get("msg_id"), str) and ev.get("msg_id")
    assert ev.get("trace_id") == tid
    assert ev.get("type") == "test.event"
    assert isinstance(ev.get("payload"), dict)
    assert isinstance(ev.get("ts"), str)


def test_envelope_optional_fields_and_errors():
    bus = OutboxBus(episodes_dir="episodes")
    bus.new_trace("goal")
    # 正常可选字段
    bus.append("ev.ok", {}, budget_ctx={"usd": 1}, authz={"caps": ["fs:read"]}, labels={"k": "v"}, cost=0.0)
    # 错误类型：authz.caps 非数组
    try:
        bus.append("ev.bad_caps", {}, authz={"caps": 123})
        assert False, "应当因 caps 类型错误抛出"
    except TypeError:
        pass
    # 错误类型：cost 非数值
    try:
        bus.append("ev.bad_cost", {}, cost="abc")  # type: ignore
        assert False, "应当因 cost 类型错误抛出"
    except TypeError:
        pass
