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
import threading

try:
    from fastapi import FastAPI, Request, Form
    from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, PlainTextResponse
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


JOBS: Dict[str, Any] = {}


def _run_job(job_id: str, cmd: list[str]) -> None:
    import subprocess, time as _time
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        ok = res.returncode == 0
        data: Dict[str, Any]
        if ok:
            try:
                # 取最后一行 JSON
                data = json.loads((res.stdout or "").strip().splitlines()[-1])
            except Exception:
                data = {"raw": (res.stdout or "")[-4000:]}
        else:
            data = {"stderr": (res.stderr or "")[-4000:]}
        JOBS[job_id] = {"done": True, "ok": ok, "result": data}
    except Exception as e:  # pragma: no cover
        JOBS[job_id] = {"done": True, "ok": False, "error": str(e)}


def create_app() -> Any:
    if FastAPI is None:
        raise RuntimeError("请安装 fastapi/uvicorn/jinja2 后再运行管理台")
    app = FastAPI(title="AgentOS Console")
    tpl_dir = os.path.join(os.path.dirname(__file__), "templates")
    templates = Jinja2Templates(directory=tpl_dir)

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})

    @app.get("/run", response_class=HTMLResponse)
    async def run_form(request: Request):
        cfg = load_config(None)
        lp = (cfg.get("llm", {}) or {}).get("provider", "openrouter")
        lm = (cfg.get("llm", {}) or {}).get("model", "")
        return templates.TemplateResponse("run.html", {"request": request, "cur_provider": lp, "cur_model": lm})

    @app.post("/api/run")
    async def api_run(
        request: Request,
        srs_path: str = Form(...),
        data_path: str = Form(...),
        out_path: str = Form("reports/weekly_report.md"),
        planner: str = Form("llm"),
        executor: str = Form("llm"),
        critic: str = Form("llm"),
        reviser: str = Form("llm"),
        provider: str | None = Form(None),
        temp_planner: str | None = Form(None),
        temp_executor: str | None = Form(None),
        temp_critic: str | None = Form(None),
        temp_reviser: str | None = Form(None),
        retries: str | None = Form(None),
        max_rows: str | None = Form(None),
    ):
        # 异步后台执行，避免阻塞事件循环
        import sys as _sys, uuid as _uuid
        cmd = [
            _sys.executable,
            os.path.join(BASE_DIR, "apps", "console", "min_loop.py"),
            "run",
            "--srs", srs_path,
            "--data", data_path,
            "--out", out_path,
            "--planner", planner,
            "--executor", executor,
            "--critic", critic,
            "--reviser", reviser,
        ]
        # 可选参数
        if temp_planner: cmd += ["--temp-planner", temp_planner]
        if temp_executor: cmd += ["--temp-executor", temp_executor]
        if temp_critic: cmd += ["--temp-critic", temp_critic]
        if temp_reviser: cmd += ["--temp-reviser", temp_reviser]
        if retries: cmd += ["--retries", retries]
        if max_rows: cmd += ["--max-rows", max_rows]
        if provider: cmd += ["--provider", provider]
        job_id = f"job-{_uuid.uuid4().hex[:8]}"
        JOBS[job_id] = {"done": False}
        th = threading.Thread(target=_run_job, args=(job_id, cmd), daemon=True)
        th.start()
        return JSONResponse({"ok": True, "job_id": job_id})

    @app.get("/api/run/status")
    async def api_run_status(job_id: str):
        st = JOBS.get(job_id, {"done": False})
        return JSONResponse(st)

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
                rows = conn.execute("SELECT trace_id, goal, status, created_ts, header_json FROM episodes ORDER BY created_ts DESC LIMIT 100").fetchall()
                items = []
                for tr, goal, st, ts, hj in rows:
                    provider = model = attempts = cost = None
                    if hj:
                        try:
                            h = json.loads(hj)
                            provider = h.get('provider')
                            model = h.get('model')
                            attempts = h.get('attempts')
                            cost = h.get('cost')
                        except Exception:
                            pass
                    items.append({"trace_id": tr, "goal": goal, "status": st, "created_ts": ts, "provider": provider, "model": model, "attempts": attempts, "cost": cost})
                conn.close()
        else:
            ep_dir = os.path.join(BASE_DIR, "episodes")
            if os.path.isdir(ep_dir):
                files = [f for f in os.listdir(ep_dir) if f.endswith(".json")]
                files.sort(key=lambda f: os.path.getmtime(os.path.join(ep_dir, f)), reverse=True)
                items = []
                for f in files[:100]:
                    p = os.path.join(ep_dir, f)
                    try:
                        ep = json.load(open(p, "r", encoding="utf-8"))
                        status = ep.get("status", "-")
                        header = ep.get("header", {}) or {}
                        provider = header.get("provider")
                        model = header.get("model")
                        attempts = header.get("attempts")
                        cost = header.get("cost")
                        goal = ep.get("goal", "-")
                    except Exception:
                        status = "-"; provider = model = attempts = cost = goal = None
                    created_ts = __import__('datetime').datetime.utcfromtimestamp(os.path.getmtime(p)).isoformat() + 'Z'
                    items.append({"trace_id": f[:-5], "status": status, "created_ts": created_ts, "goal": goal or '-', "provider": provider, "model": model, "attempts": attempts, "cost": cost})
        return templates.TemplateResponse("episodes.html", {"request": request, "items": items})

    @app.get("/episodes/{trace_id}", response_class=HTMLResponse)
    async def episode_detail(request: Request, trace_id: str):
        cfg = load_config(None)
        backend = (cfg.get("outbox", {}) or {}).get("backend", "json")
        events = []
        review = None
        header = {}
        if backend == "sqlite":
            import sqlite3
            db = (cfg.get("outbox", {}) or {}).get("sqlite_path", "episodes.db")
            if os.path.exists(db):
                conn = sqlite3.connect(db)
                # header
                rowh = conn.execute("SELECT header_json FROM episodes WHERE trace_id=?", (trace_id,)).fetchone()
                if rowh and rowh[0]:
                    try:
                        header = json.loads(rowh[0])
                    except Exception:
                        header = {}
                rows = conn.execute("SELECT ts, type, payload_json FROM events WHERE trace_id=? ORDER BY id ASC", (trace_id,)).fetchall()
                for ts, tp, pj in rows:
                    try:
                        payload = json.loads(pj)
                    except Exception:
                        payload = {}
                    events.append({"ts": ts, "type": tp, "payload": payload})
                    if tp == "review.scored":
                        review = payload
                conn.close()
        else:
            path = os.path.join(BASE_DIR, "episodes", f"{trace_id}.json")
            if os.path.exists(path):
                ep = json.load(open(path, "r", encoding="utf-8"))
                header = ep.get("header", {}) or {}
                for ev in ep.get("events", []):
                    events.append({"ts": ev.get("ts"), "type": ev.get("type"), "payload": ev.get("payload", {})})
                    if ev.get("type") == "review.scored":
                        review = ev.get("payload")
        return templates.TemplateResponse("episode_detail.html", {"request": request, "trace_id": trace_id, "events": events, "review": review, "header": header})

    @app.post("/api/replay")
    async def api_replay(request: Request, trace_id: str = Form(...)):
        cfg = load_config(None)
        backend = (cfg.get("outbox", {}) or {}).get("backend", "json")
        import subprocess, sys as _sys
        if backend == "sqlite":
            cmd = [
                _sys.executable,
                os.path.join(BASE_DIR, "apps", "console", "min_loop.py"),
                "replay-sqlite", "--db", (cfg.get("outbox", {}) or {}).get("sqlite_path", "episodes.db"),
                "--trace", trace_id, "--review-only",
            ]
        else:
            cmd = [
                _sys.executable,
                os.path.join(BASE_DIR, "apps", "console", "min_loop.py"),
                "replay", "--trace", trace_id,
            ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            return JSONResponse({"ok": False, "stderr": res.stderr[-4000:]}, status_code=500)
        try:
            data = json.loads(res.stdout.strip().splitlines()[-1])
        except Exception:
            data = {"raw": res.stdout[-4000:]}
        return JSONResponse({"ok": True, "result": data})

    @app.post("/api/rerun")
    async def api_rerun(request: Request, trace_id: str = Form(...), out_path: str | None = Form(None)):
        cfg = load_config(None)
        backend = (cfg.get("outbox", {}) or {}).get("backend", "json")
        import subprocess, sys as _sys
        if backend == "sqlite":
            cmd = [
                _sys.executable,
                os.path.join(BASE_DIR, "apps", "console", "min_loop.py"),
                "replay-sqlite", "--db", (cfg.get("outbox", {}) or {}).get("sqlite_path", "episodes.db"),
                "--trace", trace_id, "--rerun",
            ]
        else:
            cmd = [
                _sys.executable,
                os.path.join(BASE_DIR, "apps", "console", "min_loop.py"),
                "replay", "--trace", trace_id, "--rerun",
            ]
        if out_path:
            cmd += ["--out", out_path]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            return JSONResponse({"ok": False, "stderr": res.stderr[-4000:]}, status_code=500)
        try:
            data = json.loads(res.stdout.strip().splitlines()[-1])
        except Exception:
            data = {"raw": res.stdout[-4000:]}
        return JSONResponse({"ok": True, "result": data})

    @app.get("/scores", response_class=HTMLResponse)
    async def scores(request: Request, model: str | None = None, provider: str | None = None, window: str | None = None):
        # 仅展示已有 sqlite 概览
        cfg = load_config(None)
        db = os.path.join(BASE_DIR, "scores.sqlite")
        total = 0
        avg_score = pass_rate = avg_latency = p50 = p95 = None
        rows = []
        if os.path.exists(db):
            import sqlite3
            conn = sqlite3.connect(db)
            # 解析时间窗口
            since = None
            until = None
            if window:
                from datetime import datetime, timedelta
                w = window.strip().lower()
                now = datetime.utcnow()
                if w.endswith('d') and w[:-1].isdigit():
                    since = (now - timedelta(days=int(w[:-1]))).isoformat() + 'Z'
                    until = now.isoformat() + 'Z'
                elif w.endswith('h') and w[:-1].isdigit():
                    since = (now - timedelta(hours=int(w[:-1]))).isoformat() + 'Z'
                    until = now.isoformat() + 'Z'
            where = []
            params: list[str] = []
            if model:
                where.append("model LIKE ?")
                params.append(f"%{model}%")
            if provider:
                where.append("provider LIKE ?")
                params.append(f"%{provider}%")
            if since:
                where.append("ts >= ?")
                params.append(since)
            if until:
                where.append("ts <= ?")
                params.append(until)
            wsql = (" WHERE "+" AND ".join(where)) if where else ""
            row = conn.execute(f"SELECT COUNT(1), AVG(score), AVG(pass), AVG(latency_ms) FROM scores{wsql}", params).fetchone()
            total = row[0] or 0
            avg_score = round(row[1], 4) if row[1] is not None else None
            pass_rate = round(row[2], 4) if row[2] is not None else None
            avg_latency = int(row[3]) if row[3] is not None else None
            rows = conn.execute(f"SELECT trace_id, score, pass, model, provider, ts FROM scores{wsql} ORDER BY ts DESC LIMIT 20", params).fetchall()
            lts = [r[0] for r in conn.execute(f"SELECT latency_ms FROM scores{wsql}", params).fetchall() if r[0] is not None]
            if lts:
                lts.sort()
                import math
                def _pct(arr, p):
                    k = max(0, min(len(arr)-1, int(math.ceil(p/100.0*len(arr))) - 1))
                    return arr[k]
                p50 = _pct(lts, 50)
                p95 = _pct(lts, 95)
            # 选项与分组摘要
            rows_model = conn.execute(f"SELECT model, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY model ORDER BY AVG(score) DESC", params).fetchall()
            rows_provider = conn.execute(f"SELECT provider, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY provider ORDER BY AVG(score) DESC", params).fetchall()
            opts_model = [r[0] for r in conn.execute("SELECT DISTINCT model FROM scores WHERE model IS NOT NULL ORDER BY model").fetchall()]
            opts_provider = [r[0] for r in conn.execute("SELECT DISTINCT provider FROM scores WHERE provider IS NOT NULL ORDER BY provider").fetchall()]
            conn.close()
        return templates.TemplateResponse("scores.html", {"request": request, "total": total, "avg_score": avg_score, "pass_rate": pass_rate, "avg_latency": avg_latency, "p50": p50, "p95": p95, "rows": rows, "rows_model": rows_model if 'rows_model' in locals() else [], "rows_provider": rows_provider if 'rows_provider' in locals() else [], "opts_model": opts_model if 'opts_model' in locals() else [], "opts_provider": opts_provider if 'opts_provider' in locals() else [], "cur_model": model or "", "cur_provider": provider or ""})

    # embed 版本：仅内容片段（供首页单页管理）
    @app.get("/embed/run", response_class=HTMLResponse)
    async def embed_run(request: Request):
        cfg = load_config(None)
        lp = (cfg.get("llm", {}) or {}).get("provider", "openrouter")
        lm = (cfg.get("llm", {}) or {}).get("model", "")
        return templates.TemplateResponse("run_partial.html", {"request": request, "cur_provider": lp, "cur_model": lm})

    @app.get("/embed/episodes", response_class=HTMLResponse)
    async def embed_episodes(request: Request):
        # 复用 /episodes 数据
        response = await episodes(request)  # type: ignore
        # 模板中 include episodes.html，所以仅需要重渲染容器模板
        cfg = load_config(None)
        backend = (cfg.get("outbox", {}) or {}).get("backend", "json")
        items = []
        if backend == "sqlite":
            import sqlite3
            db = (cfg.get("outbox", {}) or {}).get("sqlite_path", "episodes.db")
            if os.path.exists(db):
                conn = sqlite3.connect(db)
                rows = conn.execute("SELECT trace_id, goal, status, created_ts FROM episodes ORDER BY created_ts DESC LIMIT 100").fetchall()
                items = [{"trace_id": tr, "goal": goal, "status": st, "created_ts": ts} for tr, goal, st, ts in rows]
                conn.close()
        else:
            ep_dir = os.path.join(BASE_DIR, "episodes")
            if os.path.isdir(ep_dir):
                files = [f for f in os.listdir(ep_dir) if f.endswith(".json")]
                files.sort(key=lambda f: os.path.getmtime(os.path.join(ep_dir, f)), reverse=True)
                for f in files[:100]:
                    p = os.path.join(ep_dir, f)
                    try:
                        ep = json.load(open(p, "r", encoding="utf-8"))
                        status = ep.get("status", "-")
                        goal = ep.get("goal", "-")
                    except Exception:
                        status = goal = "-"
                    created_ts = __import__('datetime').datetime.utcfromtimestamp(os.path.getmtime(p)).isoformat() + 'Z'
                    items.append({"trace_id": f[:-5], "status": status, "created_ts": created_ts, "goal": goal})
        return templates.TemplateResponse("episodes_partial.html", {"request": request, "items": items})

    @app.get("/embed/scores", response_class=HTMLResponse)
    async def embed_scores(request: Request, model: str | None = None, provider: str | None = None, window: str | None = None):
        cfg = load_config(None)
        db = os.path.join(BASE_DIR, "scores.sqlite")
        total = 0
        avg_score = pass_rate = avg_latency = p50 = p95 = None
        rows = []
        if os.path.exists(db):
            import sqlite3
            conn = sqlite3.connect(db)
            # 窗口过滤
            since = None
            until = None
            if window:
                from datetime import datetime, timedelta
                w = window.strip().lower()
                now = datetime.utcnow()
                if w.endswith('d') and w[:-1].isdigit():
                    since = (now - timedelta(days=int(w[:-1]))).isoformat() + 'Z'
                    until = now.isoformat() + 'Z'
                elif w.endswith('h') and w[:-1].isdigit():
                    since = (now - timedelta(hours=int(w[:-1]))).isoformat() + 'Z'
                    until = now.isoformat() + 'Z'
            where = []
            params: list[str] = []
            if model:
                where.append("model LIKE ?")
                params.append(f"%{model}%")
            if provider:
                where.append("provider LIKE ?")
                params.append(f"%{provider}%")
            if since:
                where.append("ts >= ?")
                params.append(since)
            if until:
                where.append("ts <= ?")
                params.append(until)
            wsql = (" WHERE "+" AND ".join(where)) if where else ""
            row = conn.execute(f"SELECT COUNT(1), AVG(score), AVG(pass), AVG(latency_ms) FROM scores{wsql}", params).fetchone()
            total = row[0] or 0
            avg_score = round(row[1], 4) if row[1] is not None else None
            pass_rate = round(row[2], 4) if row[2] is not None else None
            avg_latency = int(row[3]) if row[3] is not None else None
            rows = conn.execute(f"SELECT trace_id, score, pass, model, provider, ts FROM scores{wsql} ORDER BY ts DESC LIMIT 20", params).fetchall()
            lts = [r[0] for r in conn.execute(f"SELECT latency_ms FROM scores{wsql}", params).fetchall() if r[0] is not None]
            if lts:
                lts.sort()
                import math
                def _pct(arr, p):
                    k = max(0, min(len(arr)-1, int(math.ceil(p/100.0*len(arr))) - 1))
                    return arr[k]
                p50 = _pct(lts, 50)
                p95 = _pct(lts, 95)
            rows_model = conn.execute(f"SELECT model, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY model ORDER BY AVG(score) DESC", params).fetchall()
            rows_provider = conn.execute(f"SELECT provider, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY provider ORDER BY AVG(score) DESC", params).fetchall()
            opts_model = [r[0] for r in conn.execute("SELECT DISTINCT model FROM scores WHERE model IS NOT NULL ORDER BY model").fetchall()]
            opts_provider = [r[0] for r in conn.execute("SELECT DISTINCT provider FROM scores WHERE provider IS NOT NULL ORDER BY provider").fetchall()]
            conn.close()
        return templates.TemplateResponse("scores_partial.html", {"request": request, "total": total, "avg_score": avg_score, "pass_rate": pass_rate, "avg_latency": avg_latency, "p50": p50, "p95": p95, "rows": rows, "rows_model": rows_model if 'rows_model' in locals() else [], "rows_provider": rows_provider if 'rows_provider' in locals() else [], "opts_model": opts_model if 'opts_model' in locals() else [], "opts_provider": opts_provider if 'opts_provider' in locals() else [], "cur_model": model or "", "cur_provider": provider or ""})

    @app.get("/api/scores/group.csv")
    async def api_scores_group_csv(model: str | None = None, provider: str | None = None, window: str | None = None, group_by: str = "model"):
        db = os.path.join(BASE_DIR, "scores.sqlite")
        if not os.path.exists(db):
            return PlainTextResponse("no scores.sqlite", status_code=404)
        import sqlite3, csv, io
        conn = sqlite3.connect(db)
        where = []
        params: list[str] = []
        if model:
            where.append("model LIKE ?")
            params.append(f"%{model}%")
        if provider:
            where.append("provider LIKE ?")
            params.append(f"%{provider}%")
        if window:
            from datetime import datetime, timedelta
            w = window.strip().lower()
            now = datetime.utcnow()
            if w.endswith('d') and w[:-1].isdigit():
                since = (now - timedelta(days=int(w[:-1]))).isoformat() + 'Z'
                until = now.isoformat() + 'Z'
            elif w.endswith('h') and w[:-1].isdigit():
                since = (now - timedelta(hours=int(w[:-1]))).isoformat() + 'Z'
                until = now.isoformat() + 'Z'
            else:
                since = until = None
            if since:
                where.append("ts >= ?")
                params.append(since)
            if until:
                where.append("ts <= ?")
                params.append(until)
        wsql = (" WHERE "+" AND ".join(where)) if where else ""
        rows = conn.execute(f"SELECT {group_by}, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY {group_by} ORDER BY AVG(score) DESC", params).fetchall()
        conn.close()
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow([group_by, "count", "avg_score", "pass_rate"])
        for r in rows:
            w.writerow([r[0], r[1], round(r[2] or 0,4), round(r[3] or 0,4)])
        return PlainTextResponse(buf.getvalue(), media_type="text/csv; charset=utf-8")

    @app.get("/api/scores/report.html")
    async def api_scores_report_html(request: Request, model: str | None = None, provider: str | None = None, window: str | None = None):
        # 复用 embed_scores 的逻辑（带 request 渲染）
        return await embed_scores(request, model=model, provider=provider, window=window)

    @app.get("/api/scores/detail.csv")
    async def api_scores_detail_csv(model: str | None = None, provider: str | None = None, window: str | None = None):
        db = os.path.join(BASE_DIR, "scores.sqlite")
        if not os.path.exists(db):
            return PlainTextResponse("no scores.sqlite", status_code=404)
        import sqlite3, csv, io
        conn = sqlite3.connect(db)
        where = []
        params: list[str] = []
        if model:
            where.append("model LIKE ?")
            params.append(f"%{model}%")
        if provider:
            where.append("provider LIKE ?")
            params.append(f"%{provider}%")
        if window:
            from datetime import datetime, timedelta
            w = window.strip().lower()
            now = datetime.utcnow()
            if w.endswith('d') and w[:-1].isdigit():
                since = (now - timedelta(days=int(w[:-1]))).isoformat() + 'Z'
                until = now.isoformat() + 'Z'
            elif w.endswith('h') and w[:-1].isdigit():
                since = (now - timedelta(hours=int(w[:-1]))).isoformat() + 'Z'
                until = now.isoformat() + 'Z'
            else:
                since = until = None
            if since:
                where.append("ts >= ?")
                params.append(since)
            if until:
                where.append("ts <= ?")
                params.append(until)
        wsql = (" WHERE "+" AND ".join(where)) if where else ""
        rows = conn.execute(f"SELECT trace_id, goal, status, latency_ms, score, pass, model, provider, ts FROM scores{wsql} ORDER BY ts DESC", params).fetchall()
        conn.close()
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["trace_id","goal","status","latency_ms","score","pass","model","provider","ts"])
        for r in rows:
            w.writerow(r)
        return PlainTextResponse(buf.getvalue(), media_type="text/csv; charset=utf-8")

    return app


app = create_app() if FastAPI is not None else None  # type: ignore
