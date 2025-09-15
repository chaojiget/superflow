# -*- coding: utf-8 -*-

import pytest


def test_envelope_edgecases_labels_authz_cost_types():
    from kernel.bus import OutboxBus

    bus = OutboxBus(episodes_dir="episodes")
    bus.new_trace("goal")

    # labels 非对象
    with pytest.raises(TypeError):
        bus.append("evt", {}, labels=123)  # type: ignore

    # authz.caps 混合类型
    with pytest.raises(TypeError):
        bus.append("evt", {}, authz={"caps": ["fs:read", 1]})  # type: ignore

    # cost 非数值
    with pytest.raises(TypeError):
        bus.append("evt", {}, cost="0.1")  # type: ignore

