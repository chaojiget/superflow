# -*- coding: utf-8 -*-

from packages.agents.skills_registry import load_registry, verify_skills, sha256_file


def test_registry_load_and_verify(tmp_path):
    # create fake skill file
    f = tmp_path / "s.py"
    f.write_text("print('ok')\n", encoding="utf-8")
    h = sha256_file(str(f))
    reg = {"skills": [{"name": "s", "path": str(f), "sha256": h}]}
    p = tmp_path / "registry.json"
    import json
    p.write_text(json.dumps(reg), encoding="utf-8")
    assert load_registry(str(p))["skills"][0]["sha256"] == h
    assert verify_skills(strict=False, path=str(p)) is True

