# -*- coding: utf-8 -*-

import time
import pytest


def _wait_until(fn, timeout=25.0, interval=0.5):
    t0 = time.time()
    while time.time() - t0 < timeout:
        ok, data = fn()
        if ok:
            return data
        time.sleep(interval)
    raise TimeoutError("timeout waiting condition")


def test_smoke_run_replay_and_scores():
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient  # type: ignore
    import os as _os
    # 提前设置鉴权与 DB 路径，避免默认 chat.db 只读
    _os.environ['ADMIN_TOKEN'] = 'test'
    _os.environ['CHAT_DB_PATH'] = 'chat_test.db'
    from apps.server.main import create_app

    app = create_app()
    client = TestClient(app)

    # config is accessible
    r = client.get("/api/config")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)

    # run with offline implementations to避免外网
    data = {
        "srs_path": "examples/srs/weekly_report.json",
        "data_path": "examples/data/weekly.csv",
        "out_path": "reports/smoke.md",
        "planner": "rules",
        "executor": "skills",
        "critic": "rules",
        "reviser": "rules",
    }
    r = client.post("/api/run", data=data)
    assert r.status_code == 200
    job = r.json(); assert job.get("ok")
    job_id = job["job_id"]

    def _poll():
        rr = client.get("/api/run/status", params={"job_id": job_id})
        js = rr.json()
        return (js.get("done") is True), js

    st = _wait_until(_poll, timeout=20)
    assert st.get("ok") in (None, True)
    res = st.get("result") or {}
    assert "trace_id" in (res or {})

    # replay
    r = client.post("/api/replay", data={"trace_id": res["trace_id"]})
    assert r.status_code == 200
    assert r.json().get("ok")

    # rerun (skills)
    r = client.post("/api/rerun", data={"trace_id": res["trace_id"], "out_path": "reports/smoke_rerun.md"})
    assert r.status_code == 200
    assert r.json().get("ok")

    # scores html (即使没有 sqlite 也应200并返回片段)
    r = client.get("/api/scores/report.html")
    assert r.status_code == 200

    # workflows create + schedule (使用 ADMIN_TOKEN)
    import json as _json
    wf_def = {
        "steps": [
            {"type": "run", "args": {"srs_path": "examples/srs/weekly_report.json", "data_path": "examples/data/weekly.csv", "out": "reports/wf1.md", "planner": "rules", "executor": "skills", "critic": "rules", "reviser": "rules"}},
            {"type": "replay", "args": {"trace": "{prev.trace_id}", "rerun": True, "out": "reports/wf1_rerun.md"}}
        ]
    }
    headers = {'X-Admin-Token': 'test'}
    r = client.post("/api/workflows", data={"name": "wf-smoke", "definition_json": _json.dumps(wf_def, ensure_ascii=False)}, headers=headers)
    assert r.status_code == 200 and r.json().get("ok")
    wf_id = r.json()["id"]
    r = client.post("/api/jobs/schedule", data={"workflow_id": wf_id, "after_seconds": 0}, headers=headers)
    assert r.status_code == 200 and r.json().get("ok")
    job_id = r.json()["job_id"]

    def _poll_job():
        rr = client.get("/api/jobs/get", params={"job_id": job_id})
        js = rr.json()
        return (js.get("ok") and (js.get("job", {}).get("status") in ("done","failed"))), js

    jst = _wait_until(_poll_job, timeout=25)
    assert jst.get("job", {}).get("status") == 'done'
    assert len(jst.get("steps", [])) >= 1
