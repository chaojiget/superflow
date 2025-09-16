import pytest

@pytest.fixture
def fastapi_client():
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient  # type: ignore

    import apps.server.main as server_main

    app = server_main.create_app()
    return TestClient(app)


def test_agent_intake_uses_rue_parser(monkeypatch, fastapi_client):
    from packages.agents import rue_parser

    calls = {"count": 0}

    def fake_parse(self, query, *, data_path=None, overrides=None):
        calls["count"] += 1
        spec = rue_parser.TaskSpec(goal="自动化报告", inputs={"csv_path": data_path or "examples/data/weekly.csv"})
        spec.add_constraints(["成本≤¥1"])
        spec.add_acceptance(rue_parser.AcceptanceCriterion(id="A1", then="then"))
        spec.merge_params({"top_n": 3, "score_by": "views"})
        spec.finalize()
        return spec

    monkeypatch.setattr(rue_parser.RueParser, "parse", fake_parse)

    resp = fastapi_client.post(
        "/agent/intake",
        json={"query": "生成一个报告", "data_path": "examples/data/weekly.csv"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["ok"] is True
    assert payload["spec_source"] == "rue"
    assert payload["srs"]["goal"] == "自动化报告"
    assert calls["count"] == 1


def test_agent_intake_need_more_info(monkeypatch, fastapi_client):
    from packages.agents import rue_parser

    def fake_parse(self, query, *, data_path=None, overrides=None):
        raise rue_parser.RueParseError("需要提供 CSV", kind="insufficient", missing=["inputs.csv_path"])

    monkeypatch.setattr(rue_parser.RueParser, "parse", fake_parse)

    resp = fastapi_client.post(
        "/agent/intake",
        json={"query": "生成一个报告", "data_path": ""},
    )
    assert resp.status_code == 400
    payload = resp.json()
    assert payload["ok"] is False
    assert payload["error"] == "need_more_info"
    assert "inputs.csv_path" in payload.get("missing", [])


def test_agent_intake_fallback_on_error(monkeypatch, fastapi_client):
    from packages.agents import rue_parser

    def fake_parse(self, query, *, data_path=None, overrides=None):
        raise RuntimeError("boom")

    monkeypatch.setattr(rue_parser.RueParser, "parse", fake_parse)

    resp = fastapi_client.post(
        "/agent/intake",
        json={"query": "生成一个报告", "data_path": "examples/data/weekly.csv"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["ok"] is True
    assert payload["spec_source"] in {"fallback", "llm"}
    assert payload["srs"]["goal"].startswith("生成一个报告")
    assert payload.get("parser", {}).get("metadata", {}).get("error") == "boom"
