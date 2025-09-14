# -*- coding: utf-8 -*-
"""
SPEC:
  模块: apps.server.main
  目标: 最小管理台（FastAPI + Jinja2）— 运行/列表/得分 三页
  说明: 仅提供原型代码，运行需安装 fastapi/uvicorn/jinja2。
  启动: uv run uvicorn apps.server.main:app --reload
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict

try:
    from fastapi import FastAPI, Request
    from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
    from fastapi.staticfiles import StaticFiles
    from fastapi.templating import Jinja2Templates
except Exception as e:  # pragma: no cover
    # 占位，避免导入失败影响其它模块
    FastAPI = None  # type: ignore

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def load_config(path: str | None = None) -> Dict[str, Any]:
    p = path or os.path.join(BASE_DIR, "config.json")
    if os.path.exists(p):
        try:
            return json.load(open(p, "r", encoding="utf-8"))
        except Exception:
            pass
    return {}


def create_app() -> Any:
    if FastAPI is None:
        raise RuntimeError("请安装 fastapi/uvicorn/jinja2 后再运行管理台")
    app = FastAPI(title="AgentOS Console")
    tpl_dir = os.path.join(os.path.dirname(__file__), "templates")
    templates = Jinja2Templates(directory=tpl_dir)

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})

    @app.get("/episodes", response_class=HTMLResponse)
    async def episodes(request: Request):
        cfg = load_config(None)
        backend = (cfg.get("outbox", {}) or {}).get("backend", "json")
        items = []
        if backend == "sqlite":
            import sqlite3
            db = (cfg.get("outbox", {}) or {}).get("sqlite_path", "episodes.db")
            if os.path.exists(db):
                conn = sqlite3.connect(db)
                rows = conn.execute("SELECT trace_id, goal, status, created_ts FROM episodes ORDER BY created_ts DESC LIMIT 100").fetchall()
                items = [
                    {"trace_id": tr, "goal": goal, "status": st, "created_ts": ts}
                    for tr, goal, st, ts in rows
                ]
                conn.close()
        else:
            ep_dir = os.path.join(BASE_DIR, "episodes")
            if os.path.isdir(ep_dir):
                files = [f for f in os.listdir(ep_dir) if f.endswith(".json")]
                files.sort(key=lambda f: os.path.getmtime(os.path.join(ep_dir, f)), reverse=True)
                items = [{"trace_id": f[:-5], "status": "-"} for f in files[:100]]
        return templates.TemplateResponse("episodes.html", {"request": request, "items": items})

    @app.get("/scores", response_class=HTMLResponse)
    async def scores(request: Request):
        # 仅展示已有 sqlite 概览
        cfg = load_config(None)
        db = os.path.join(BASE_DIR, "scores.sqlite")
        total = 0
        avg_score = pass_rate = avg_latency = p50 = p95 = None
        rows = []
        if os.path.exists(db):
            import sqlite3
            conn = sqlite3.connect(db)
            row = conn.execute("SELECT COUNT(1), AVG(score), AVG(pass), AVG(latency_ms) FROM scores").fetchone()
            total = row[0] or 0
            avg_score = round(row[1], 4) if row[1] is not None else None
            pass_rate = round(row[2], 4) if row[2] is not None else None
            avg_latency = int(row[3]) if row[3] is not None else None
            rows = conn.execute("SELECT trace_id, score, pass, model, provider, ts FROM scores ORDER BY ts DESC LIMIT 20").fetchall()
            # 取全部延迟到内存计算 p50/p95
            lts = [r[0] for r in conn.execute("SELECT latency_ms FROM scores").fetchall() if r[0] is not None]
            if lts:
                lts.sort()
                import math
                def _pct(arr, p):
                    k = max(0, min(len(arr)-1, int(math.ceil(p/100.0*len(arr))) - 1))
                    return arr[k]
                p50 = _pct(lts, 50)
                p95 = _pct(lts, 95)
            conn.close()
        return templates.TemplateResponse("scores.html", {"request": request, "total": total, "avg_score": avg_score, "pass_rate": pass_rate, "avg_latency": avg_latency, "p50": p50, "p95": p95, "rows": rows})

    return app


app = create_app() if FastAPI is not None else None  # type: ignore

