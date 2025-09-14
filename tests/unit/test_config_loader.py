# -*- coding: utf-8 -*-

from packages.config.loader import load_config


def test_load_config_defaults(tmp_path):
    cfg = load_config(str(tmp_path / "nonexist.json"))
    assert cfg["defaults"]["planner"] in ("llm", "rules")
    assert cfg["llm"]["model"]
    assert cfg["prompts"]["dir"]


def test_load_config_merge(tmp_path):
    p = tmp_path / "config.json"
    p.write_text('{"defaults":{"planner":"rules"},"llm":{"retries":2}}', encoding="utf-8")
    cfg = load_config(str(p))
    assert cfg["defaults"]["planner"] == "rules"
    assert cfg["llm"]["retries"] == 2
    # keep other defaults
    assert cfg["llm"]["model"]

