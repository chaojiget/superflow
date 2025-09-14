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

