# -*- coding: utf-8 -*-

import json
import os

from apps.console.min_loop import cmd_scoreboard, argparse  # type: ignore


def _make_episode(tmp_ep_dir: str, trace_id: str, score: float, passed: bool) -> None:
    ep = {
        "trace_id": trace_id,
        "goal": "demo",
        "status": "success" if passed else "failed",
        "latency_ms": 123,
        "events": [
            {"type": "review.scored", "ts": "2025-09-13T00:00:00Z", "payload": {"score": score, "pass": passed}}
        ],
    }
    with open(os.path.join(tmp_ep_dir, f"{trace_id}.json"), "w", encoding="utf-8") as f:
        json.dump(ep, f)


def test_scoreboard_export_csv(tmp_path):
    eps = tmp_path / "episodes"
    eps.mkdir()
    _make_episode(str(eps), "t-1", 0.9, True)
    _make_episode(str(eps), "t-2", 0.7, False)
    out_csv = tmp_path / "scores.csv"
    ns = argparse.Namespace(fmt="csv", out=str(out_csv), episodes_dir=str(eps))
    cmd_scoreboard(ns)
    assert out_csv.exists()


def test_scoreboard_export_sqlite(tmp_path):
    eps = tmp_path / "episodes"
    eps.mkdir()
    _make_episode(str(eps), "t-3", 0.95, True)
    out_db = tmp_path / "scores.sqlite"
    ns = argparse.Namespace(fmt="sqlite", out=str(out_db), episodes_dir=str(eps))
    cmd_scoreboard(ns)
    assert out_db.exists()

