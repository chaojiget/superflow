# -*- coding: utf-8 -*-
"""
SPEC:
  模块: apps.server.main
  目标: 最小管理台（FastAPI + Jinja2）— 运行/列表/得分 三页
  说明: 仅提供原型代码，运行需安装 fastapi/uvicorn/jinja2。
  启动: uv run uvicorn apps.server.main:app --reload
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict, List
import threading
import uuid

try:
    from fastapi import FastAPI, Request, Form, WebSocket
    from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, PlainTextResponse, FileResponse
    from fastapi.staticfiles import StaticFiles
    from fastapi.templating import Jinja2Templates
    from fastapi.websockets import WebSocketDisconnect
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
    import subprocess
    job_state = JOBS.setdefault(job_id, {"done": False, "stream": []})
    stream: List[Dict[str, Any]] = job_state.setdefault("stream", [])  # type: ignore
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        final_json: Dict[str, Any] | None = None
        try:
            while True:
                line = proc.stdout.readline() if proc.stdout else ""
                if not line:
                    break
                clean = line.rstrip("\n")
                entry: Dict[str, Any] = {"ts": datetime.utcnow().isoformat() + "Z", "line": clean}
                parsed: Any = None
                try:
                    parsed = json.loads(clean)
                except Exception:
                    parsed = None
                if isinstance(parsed, dict):
                    entry["json"] = parsed
                    if parsed.get("kind") == "progress":
                        entry["kind"] = "progress"
                    else:
                        final_json = parsed
                stream.append(entry)
        finally:
            if proc.stdout:
                proc.stdout.close()
        stderr_text = ""
        if proc.stderr:
            stderr_text = proc.stderr.read()
            proc.stderr.close()
        return_code = proc.wait()
        ok = return_code == 0
        result: Dict[str, Any]
        if final_json is not None:
            result = final_json
        else:
            # 若无结构化 JSON，返回原始 stdout/stderr 片段
            last_lines = [item.get("line") for item in stream[-5:]] if stream else []
            result = {"raw": "\n".join(last_lines[-5:])}
        if stderr_text:
            result.setdefault("stderr", stderr_text.strip())
        job_state.update({"done": True, "ok": ok, "result": result})
        trace_id = None
        if isinstance(result, dict):
            trace_id = result.get("trace_id") or result.get("trace")
        if trace_id:
            job_state["trace_id"] = trace_id
            ep_path = os.path.join(BASE_DIR, "episodes", f"{trace_id}.json")
            if os.path.exists(ep_path):
                try:
                    with open(ep_path, "r", encoding="utf-8") as f:
                        ep = json.load(f)
                    if isinstance(ep, dict):
                        job_state["events"] = ep.get("events", [])
                        job_state["episode"] = {
                            "status": ep.get("status"),
                            "goal": ep.get("goal"),
                            "latency_ms": ep.get("latency_ms"),
                            "artifacts": ep.get("artifacts", {}),
                            "header": ep.get("header", {}),
                        }
                        job_state["episode_path"] = ep_path
                except Exception:
                    pass
        else:
            job_state["stderr"] = stderr_text
    except Exception as e:  # pragma: no cover
        stream.append({"ts": datetime.utcnow().isoformat() + "Z", "line": f"[error] {e}"})
        job_state.update({"done": True, "ok": False, "error": str(e)})


def create_app() -> Any:
    if FastAPI is None:
        raise RuntimeError("请安装 fastapi/uvicorn/jinja2 后再运行管理台")
    app = FastAPI(title="AgentOS Console")
    tpl_dir = os.path.join(os.path.dirname(__file__), "templates")
    templates = Jinja2Templates(directory=tpl_dir)
    # 挂载本地静态资源（CSS/JS），离线可用
    try:
        static_dir = os.path.join(os.path.dirname(__file__), "static")
        if os.path.isdir(static_dir):
            app.mount("/static", StaticFiles(directory=static_dir), name="static")
    except Exception:
        # 静态目录不存在也不影响运行
        pass

    # Helper: 生成/持久化 SRS、构建命令、加载 Episode
    SRS_DIR = os.path.join(BASE_DIR, "workspace", "srs")

    def _default_srs(query: str, data_path: str) -> Dict[str, Any]:
        goal = query.strip() or "生成每周数据简报"
        return {
            "goal": goal,
            "budget_usd": 0,
            "inputs": {"csv_path": data_path},
            "constraints": ["成本≤¥1", "完成≤2min"],
            "params": {"top_n": 10, "score_by": "views", "title_field": "title"},
            "acceptance": [
                {"id": "A1", "then": "包含 Summary 与 Top Items 段落"},
                {"id": "A2", "then": "TopN 数量与 params.top_n 一致"},
                {"id": "A3", "then": "无空标题"},
            ],
        }

    def _save_srs(srs: Dict[str, Any]) -> str:
        os.makedirs(SRS_DIR, exist_ok=True)
        fname = f"auto_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.json"
        abs_path = os.path.join(SRS_DIR, fname)
        with open(abs_path, "w", encoding="utf-8") as f:
            json.dump(srs, f, ensure_ascii=False, indent=2)
        return os.path.relpath(abs_path, BASE_DIR)

    def _build_min_loop_cmd(opts: Dict[str, Any]) -> List[str]:
        import sys as _sys
        cmd: List[str] = [
            _sys.executable,
            os.path.join(BASE_DIR, "apps", "console", "min_loop.py"),
            "run",
            "--srs", opts["srs_path"],
            "--data", opts["data_path"],
            "--out", opts["out_path"],
            "--planner", opts.get("planner", "llm"),
            "--executor", opts.get("executor", "llm"),
            "--critic", opts.get("critic", "llm"),
            "--reviser", opts.get("reviser", "llm"),
        ]
        if opts.get("provider"):
            cmd += ["--provider", str(opts["provider"])]
        if opts.get("temp_planner"):
            cmd += ["--temp-planner", str(opts["temp_planner"])]
        if opts.get("temp_executor"):
            cmd += ["--temp-executor", str(opts["temp_executor"])]
        if opts.get("temp_critic"):
            cmd += ["--temp-critic", str(opts["temp_critic"])]
        if opts.get("temp_reviser"):
            cmd += ["--temp-reviser", str(opts["temp_reviser"])]
        if opts.get("retries") is not None:
            cmd += ["--retries", str(opts["retries"])]
        if opts.get("max_rows") is not None:
            cmd += ["--max-rows", str(opts["max_rows"])]
        return cmd

    def _enqueue_job(opts: Dict[str, Any]) -> str:
        import uuid as _uuid
        cmd = _build_min_loop_cmd(opts)
        job_id = f"job-{_uuid.uuid4().hex[:8]}"
        meta: Dict[str, Any] = {}
        for k, v in opts.items():
            if isinstance(v, (str, int, float, bool)):
                meta[k] = v
        JOBS[job_id] = {"done": False, "meta": meta, "stream": []}
        th = threading.Thread(target=_run_job, args=(job_id, cmd), daemon=True)
        th.start()
        return job_id

    def _load_episode(trace_id: str) -> Dict[str, Any] | None:
        ep_path = os.path.join(BASE_DIR, "episodes", f"{trace_id}.json")
        if not os.path.exists(ep_path):
            return None
        try:
            with open(ep_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    # Chat DB
    from .chat_db import (
        init_db,
        append_message,
        get_history,
        clear_session,
        upsert_workflow,
        list_workflows,
        get_workflow,
        schedule_job,
        list_jobs,
        due_jobs,
        mark_job_result,
        get_job,
        log_approval,
    )  # type: ignore
    chat_db_path = os.environ.get('CHAT_DB_PATH') or os.path.join(BASE_DIR, "chat.db")
    CHAT_CONN = init_db(chat_db_path)

    HEARTBEAT_INTERVAL = 20.0
    chat_event_subscribers: Dict[str, List[asyncio.Queue[Any]]] = {}
    chat_event_lock = asyncio.Lock()

    async def _chat_subscribe(session_id: str) -> asyncio.Queue[Any]:
        queue: asyncio.Queue[Any] = asyncio.Queue(maxsize=200)
        async with chat_event_lock:
            chat_event_subscribers.setdefault(session_id, []).append(queue)
        return queue

    async def _chat_unsubscribe(session_id: str, queue: asyncio.Queue[Any]) -> None:
        async with chat_event_lock:
            subs = chat_event_subscribers.get(session_id)
            if subs and queue in subs:
                subs.remove(queue)
                if not subs:
                    chat_event_subscribers.pop(session_id, None)

    async def _publish_chat_event(session_id: str, event: Dict[str, Any]) -> None:
        payload = dict(event)
        payload.setdefault('session', session_id)
        payload.setdefault('ts', datetime.utcnow().isoformat() + 'Z')
        async with chat_event_lock:
            subs = list(chat_event_subscribers.get(session_id, []))
        for q in subs:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                except Exception:
                    pass
                try:
                    q.put_nowait(payload)
                except Exception:
                    pass

    # 简易后台 Job 调度（每5秒扫描待执行）
    def _jobs_loop() -> None:
        import time as _t
        from datetime import datetime
        while True:
            try:
                now_iso = datetime.utcnow().isoformat() + 'Z'
                for j in due_jobs(CHAT_CONN, now_iso):
                    try:
                        # 读取工作流定义，支持单 action 或 steps 序列
                        wf = get_workflow(CHAT_CONN, j.get('workflow_id')) if isinstance(j, dict) else None
                        wf_obj = {}
                        try:
                            wf_obj = json.loads((wf or {}).get('definition_json') or '{}')
                        except Exception:
                            wf_obj = {}
                        steps: List[Dict[str, Any]] = []
                        if isinstance(wf_obj, dict) and isinstance(wf_obj.get('steps'), list):
                            # steps: [{type:'run', args:{...}}, ...]
                            steps = [x for x in wf_obj.get('steps') if isinstance(x, dict)]
                        elif isinstance(wf_obj, dict) and isinstance(wf_obj.get('action'), dict):
                            steps = [wf_obj.get('action')]  # type: ignore
                        else:
                            # 兜底：使用 args_json 作为单步运行
                            a0 = json.loads(j.get('args_json') or '{}') if isinstance(j, dict) else {}
                            steps = [{"type": "run", "args": a0}]

                        # 顺序执行步骤
                        import sys as _sys, subprocess
                        step_results: List[Dict[str, Any]] = []
                        last_ok = True
                        for idx, stp in enumerate(steps):
                            stype = (stp.get('type') or 'run') if isinstance(stp, dict) else 'run'
                            args = (stp.get('args') or {}) if isinstance(stp, dict) else {}
                            # 简单变量替换：{prev.trace_id}
                            def _subst(val: Any) -> Any:
                                if isinstance(val, str) and '{prev.trace_id}' in val and step_results:
                                    ptid = step_results[-1].get('result', {}).get('trace_id')
                                    return val.replace('{prev.trace_id}', str(ptid))
                                return val
                            if isinstance(args, dict):
                                args = {k: _subst(v) for k, v in args.items()}

                            if stype == 'run':
                                cmd: List[str] = [_sys.executable, os.path.join(BASE_DIR, 'apps', 'console', 'min_loop.py'), 'run',
                                                  '--srs', args.get('srs_path', 'examples/srs/weekly_report.json'),
                                                  '--data', args.get('data_path', 'examples/data/weekly.csv'),
                                                  '--out', args.get('out', f'reports/weekly_report_{j.get("id")}_{idx}.md')]
                                for k in ('planner','executor','critic','reviser'):
                                    if args.get(k): cmd += [f'--{k}', str(args[k])]
                                if args.get('provider'): cmd += ['--provider', str(args['provider'])]
                            elif stype == 'replay':
                                # 支持回放(非网络)，参数: trace/out/rerun(bool)
                                cmd = [_sys.executable, os.path.join(BASE_DIR, 'apps', 'console', 'min_loop.py'), 'replay']
                                if args.get('trace'): cmd += ['--trace', str(args['trace'])]
                                if args.get('last'): cmd += ['--last']
                                if args.get('rerun'): cmd += ['--rerun']
                                if args.get('out'): cmd += ['--out', str(args['out'])]
                            else:
                                step_results.append({'type': stype, 'ok': False, 'error': f'unknown step type: {stype}'})
                                last_ok = False
                                break
                            import time as _t
                            t0s = _t.time()
                            res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
                            dur_ms = int((_t.time() - t0s) * 1000)
                            ok = res.returncode == 0
                            try:
                                parsed = json.loads((res.stdout or '').strip().splitlines()[-1])
                            except Exception:
                                parsed = {'raw': (res.stdout or '')[-2000:]}
                            step_results.append({'type': stype, 'ok': ok, 'args': args, 'result': parsed, 'stderr': (res.stderr or '')[-1000:], 'duration_ms': dur_ms})
                            if not ok:
                                last_ok = False
                                break
                        summary = {'ok': last_ok, 'steps': step_results}
                        mark_job_result(CHAT_CONN, int(j.get('id')), 'done' if last_ok else 'failed', json.dumps(summary, ensure_ascii=False))
                    except Exception as e:
                        mark_job_result(CHAT_CONN, int(j.get('id')), 'failed', json.dumps({'error': str(e)}, ensure_ascii=False))
            except Exception:
                pass
            _t.sleep(5)
    threading.Thread(target=_jobs_loop, daemon=True).start()

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return templates.TemplateResponse("index.html", {"request": request})
    @app.get("/chat", response_class=HTMLResponse)
    async def chat(request: Request):
        return templates.TemplateResponse("chat.html", {"request": request})

    @app.get('/config', response_class=HTMLResponse)
    async def config_page(request: Request):
        try: _require_admin(request)
        except Exception: return PlainTextResponse('unauthorized', status_code=401)
        cfg = load_config(None)
        # 用 SimpleNamespace 风格供模板访问（cfg.llm.provider）
        class Obj(dict):
            __getattr__ = dict.get
        cfg_obj = Obj({k: Obj(v) if isinstance(v, dict) else v for k,v in cfg.items()})
        return templates.TemplateResponse('config.html', {'request': request, 'cfg': cfg_obj})

    @app.get('/api/config')
    async def api_config(request: Request):
        cfgs = load_config(None)
        if (cfgs.get('security', {}) or {}).get('protect_get'):
            try: _require_admin(request)
            except Exception: return JSONResponse({'ok': False, 'error':'unauthorized'}, status_code=401)
        return JSONResponse(cfgs)

    @app.get('/api/config/changes')
    async def api_config_changes(request: Request, limit: int = 20):
        cfgs = load_config(None)
        if (cfgs.get('security', {}) or {}).get('protect_get'):
            try: _require_admin(request)
            except Exception: return JSONResponse({'ok': False, 'error':'unauthorized'}, status_code=401)
        log_path = os.path.join(BASE_DIR, 'audit', 'config_changes.log')
        items: List[Dict[str, Any]] = []
        if os.path.exists(log_path):
            try:
                with open(log_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()[-int(limit):]
                for ln in lines:
                    try:
                        items.append(json.loads(ln))
                    except Exception:
                        pass
            except Exception:
                pass
        return JSONResponse({'ok': True, 'items': items})

    @app.post('/api/config')
    async def api_config_save(request: Request):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error':'unauthorized'}, status_code=401)
        form = await request.form()
        old_cfg = load_config(None)
        cfg = json.loads(json.dumps(old_cfg))  # 深拷贝
        # 赋值工具
        def set_in(obj, path, val):
            keys = path.split('.')
            cur = obj
            for k in keys[:-1]:
                cur = cur.setdefault(k, {})
            cur[keys[-1]] = val
        # 基础校验&赋值
        for k,v in form.items():
            if k == 'llm.retries' or k == 'llm.max_rows':
                try: v = int(v)
                except Exception: v = 0
            set_in(cfg, k, v)
        # 备份
        cfg_path = os.path.join(BASE_DIR, 'config.json')
        if os.path.exists(cfg_path):
            import shutil, time as _t
            shutil.copyfile(cfg_path, cfg_path + f'.bak')
        with open(cfg_path, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        # 计算 diff & 写变更日志
        def _flatten(d: Dict[str, Any], prefix: str = '') -> Dict[str, Any]:
            out: Dict[str, Any] = {}
            for k, v in (d or {}).items():
                kk = f"{prefix}.{k}" if prefix else k
                if isinstance(v, dict):
                    out.update(_flatten(v, kk))
                else:
                    out[kk] = v
            return out
        flat_old = _flatten(old_cfg if isinstance(old_cfg, dict) else {})
        flat_new = _flatten(cfg if isinstance(cfg, dict) else {})
        changes = []
        for k in sorted(set(list(flat_old.keys()) + list(flat_new.keys()))):
            ov = flat_old.get(k)
            nv = flat_new.get(k)
            if ov != nv:
                changes.append({'key': k, 'old': ov, 'new': nv})
        try:
            from datetime import datetime as _dt
            audit_dir = os.path.join(BASE_DIR, 'audit'); os.makedirs(audit_dir, exist_ok=True)
            log_path = os.path.join(audit_dir, 'config_changes.log')
            rec = {'ts': _dt.utcnow().isoformat()+'Z', 'changes': changes}
            with open(log_path, 'a', encoding='utf-8') as lf:
                lf.write(json.dumps(rec, ensure_ascii=False) + '\n')
        except Exception:
            pass
        return JSONResponse({'ok': True, 'changes': changes})

    @app.post('/api/config/diff')
    async def api_config_diff(request: Request):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error':'unauthorized'}, status_code=401)
        form = await request.form()
        old_cfg = load_config(None)
        cfg = json.loads(json.dumps(old_cfg))
        def set_in(obj, path, val):
            keys = path.split('.')
            cur = obj
            for k in keys[:-1]:
                cur = cur.setdefault(k, {})
            cur[keys[-1]] = val
        for k,v in form.items():
            if k == 'llm.retries' or k == 'llm.max_rows':
                try: v = int(v)
                except Exception: v = 0
            set_in(cfg, k, v)
        def _flatten(d: Dict[str, Any], prefix: str = '') -> Dict[str, Any]:
            out: Dict[str, Any] = {}
            for k, v in (d or {}).items():
                kk = f"{prefix}.{k}" if prefix else k
                if isinstance(v, dict):
                    out.update(_flatten(v, kk))
                else:
                    out[kk] = v
            return out
        flat_old = _flatten(old_cfg if isinstance(old_cfg, dict) else {})
        flat_new = _flatten(cfg if isinstance(cfg, dict) else {})
        changes = []
        for k in sorted(set(list(flat_old.keys()) + list(flat_new.keys()))):
            ov = flat_old.get(k); nv = flat_new.get(k)
            if ov != nv: changes.append({'key': k, 'old': ov, 'new': nv})
        return JSONResponse({'ok': True, 'changes': changes})

    # ------------------------------------------------------------------
    # Agent Intake/Run 接口

    @app.post('/agent/intake')
    async def agent_intake(request: Request):
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({'ok': False, 'error': 'invalid_json'}, status_code=400)

        query = str(body.get('query') or '').strip()
        data_path = body.get('data_path') or body.get('csv_path')
        if isinstance(body.get('inputs'), dict):
            data_path = body['inputs'].get('csv_path', data_path)
        if not data_path:
            data_path = 'examples/data/weekly.csv'

        base_spec = _default_srs(query, data_path)
        llm_meta: Dict[str, Any] | None = None
        llm_warning: str | None = None
        llm_spec: Dict[str, Any] | None = None

        if query:
            try:
                cfg = load_config(None)
                from packages.providers.router import LLMRouter  # type: ignore
                from packages.providers.openrouter_client import extract_json_block  # type: ignore

                router = LLMRouter(cfg)
                context_parts: List[str] = []
                if data_path:
                    context_parts.append(f"数据 CSV: {data_path}")
                if body.get('budget_usd') is not None:
                    context_parts.append(f"预算 USD: {body.get('budget_usd')}")
                if body.get('constraints'):
                    context_parts.append(f"约束: {json.dumps(body.get('constraints'), ensure_ascii=False)}")
                if body.get('acceptance'):
                    context_parts.append(f"验收: {json.dumps(body.get('acceptance'), ensure_ascii=False)}")
                context_text = "\n".join(context_parts)

                system_prompt = (
                    "你是任务需求解析助手，负责将用户自然语言需求转换为 TaskSpec(JSON)。"
                    "仅输出 JSON，字段含义: goal, inputs(csv_path 等), constraints[], params, acceptance[]。"
                )
                user_prompt = (
                    f"用户需求:\n{query}\n\n"
                    "请输出 JSON，对象结构为 {\"task_spec\": {...}}，不要包含额外解释。"
                )
                if context_text:
                    user_prompt += f"\n\n附加上下文:\n{context_text}"

                temperature = float(body.get('temperature') or cfg.get('llm', {}).get('intake_temperature', 0.2) or 0.2)
                retries = int(body.get('retries') or cfg.get('llm', {}).get('retries', 0))
                content, meta = router.chat_with_meta(
                    [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    retries=retries,
                )
                llm_meta = meta
                parsed: Dict[str, Any] | None = None
                try:
                    parsed = json.loads(content)
                except Exception:
                    try:
                        parsed = extract_json_block(content)
                    except Exception:
                        parsed = None
                if isinstance(parsed, dict):
                    candidate = (
                        parsed.get('task_spec')
                        or parsed.get('TaskSpec')
                        or parsed.get('srs')
                        or parsed.get('spec')
                        or parsed
                    )
                    if isinstance(candidate, dict):
                        llm_spec = candidate
            except Exception as e:
                llm_warning = str(e)

        def _deep_merge(dst: Dict[str, Any], src: Dict[str, Any]) -> Dict[str, Any]:
            for k, v in (src or {}).items():
                if isinstance(v, dict) and isinstance(dst.get(k), dict):
                    _deep_merge(dst[k], v)
                else:
                    dst[k] = v
            return dst

        srs = json.loads(json.dumps(base_spec, ensure_ascii=False))  # 深拷贝
        if isinstance(llm_spec, dict):
            _deep_merge(srs, llm_spec)

        if isinstance(body.get('constraints'), list):
            vals = [str(x) for x in body['constraints'] if isinstance(x, str)]
            if vals:
                srs['constraints'] = vals
        if isinstance(body.get('params'), dict):
            srs.setdefault('params', {}).update(body['params'])
        if isinstance(body.get('acceptance'), list):
            srs['acceptance'] = body['acceptance']
        budget = body.get('budget_cny') or body.get('budget_usd')
        if budget is not None:
            try:
                srs['budget_usd'] = float(budget)
            except Exception:
                pass

        srs.setdefault('inputs', {})
        if isinstance(srs['inputs'], dict):
            srs['inputs'].setdefault('csv_path', data_path)
        else:
            srs['inputs'] = {'csv_path': data_path}

        if not srs.get('goal'):
            srs['goal'] = query or base_spec.get('goal')

        srs_path = _save_srs(srs)
        out_path = body.get('out_path') or f"reports/{os.path.splitext(os.path.basename(srs_path))[0]}.md"
        run_args: Dict[str, Any] = {
            'srs_path': srs_path,
            'data_path': srs['inputs']['csv_path'],
            'out_path': out_path,
            'planner': body.get('planner', 'llm'),
            'executor': body.get('executor', 'llm'),
            'critic': body.get('critic', 'llm'),
            'reviser': body.get('reviser', 'llm'),
        }
        for opt_key in ['provider', 'temp_planner', 'temp_executor', 'temp_critic', 'temp_reviser', 'retries', 'max_rows']:
            if body.get(opt_key) is not None:
                run_args[opt_key] = body.get(opt_key)

        resp: Dict[str, Any] = {
            'ok': True,
            'srs_path': srs_path,
            'srs': srs,
            'task_spec': srs,
            'run': run_args,
        }
        if llm_meta:
            resp['llm'] = llm_meta
        if llm_warning:
            resp['warning'] = llm_warning
        return JSONResponse(resp)

    @app.post('/agent/run')
    async def agent_run(request: Request):
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({'ok': False, 'error': 'invalid_json'}, status_code=400)
        srs_path = body.get('srs_path')
        data_path = body.get('data_path')
        if not srs_path or not data_path:
            return JSONResponse({'ok': False, 'error': 'missing_srs_or_data'}, status_code=400)
        out_path = body.get('out_path') or f"reports/run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.md"
        opts: Dict[str, Any] = {
            'srs_path': str(srs_path),
            'data_path': str(data_path),
            'out_path': str(out_path),
            'planner': body.get('planner', 'llm'),
            'executor': body.get('executor', 'llm'),
            'critic': body.get('critic', 'llm'),
            'reviser': body.get('reviser', 'llm'),
        }
        for opt_key in ['provider', 'temp_planner', 'temp_executor', 'temp_critic', 'temp_reviser', 'retries', 'max_rows']:
            if body.get(opt_key) is not None:
                opts[opt_key] = body.get(opt_key)
        job_id = _enqueue_job(opts)

        trace_id: str | None = None
        try:
            loop = asyncio.get_running_loop()
            deadline = loop.time() + float(body.get('trace_wait_sec') or 1.5)
            while loop.time() < deadline:
                job = JOBS.get(job_id)
                if job:
                    trace_id = job.get('trace_id') or (job.get('result') or {}).get('trace_id')
                    if trace_id or job.get('done'):
                        break
                await asyncio.sleep(0.1)
        except RuntimeError:
            # 非事件循环环境（测试客户端同步调用）
            pass

        job = JOBS.get(job_id)
        if not trace_id and isinstance(job, dict):
            trace_id = (job.get('result') or {}).get('trace_id')

        resp: Dict[str, Any] = {'ok': True, 'job_id': job_id, 'out_path': out_path}
        if trace_id:
            resp['trace_id'] = trace_id
        return JSONResponse(resp)

    @app.post('/agent/approve')
    async def agent_approve(request: Request):
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({'ok': False, 'error': 'invalid_json'}, status_code=400)

        trace_id = str(body.get('trace_id') or '').strip()
        decision = str(body.get('decision') or '').strip()
        if not trace_id or not decision:
            return JSONResponse({'ok': False, 'error': 'missing_trace_or_decision'}, status_code=400)

        action = body.get('action')
        session_id = body.get('session_id')
        note = body.get('note') or body.get('comment')
        payload = body.get('payload') if isinstance(body.get('payload'), dict) else {}
        meta_payload: Dict[str, Any] = {'decision': decision}
        if action:
            meta_payload['action'] = action
        if note:
            meta_payload['note'] = note
        if session_id:
            meta_payload['session_id'] = session_id
        if payload:
            meta_payload['payload'] = payload
        if body.get('by'):
            meta_payload['by'] = body.get('by')

        approval_id = log_approval(
            CHAT_CONN,
            trace_id,
            decision,
            action=str(action) if action is not None else None,
            session_id=str(session_id) if session_id else None,
            payload=meta_payload,
        )

        cfg = load_config(None)
        backend = (cfg.get('outbox', {}) or {}).get('backend', 'json')
        event = {
            'msg_id': uuid.uuid4().hex,
            'trace_id': trace_id,
            'schema_ver': 'v0',
            'ts': datetime.utcnow().isoformat() + 'Z',
            'type': 'guardian.approval',
            'payload': meta_payload,
        }
        if backend == 'sqlite':
            import sqlite3

            db_path = (cfg.get('outbox', {}) or {}).get('sqlite_path', 'episodes.db')
            if not os.path.exists(db_path):
                return JSONResponse({'ok': False, 'error': 'episodes_not_found'}, status_code=404)
            conn = sqlite3.connect(db_path)
            try:
                conn.execute(
                    "INSERT INTO events(trace_id, msg_id, ts, type, payload_json) VALUES (?,?,?,?,?)",
                    (
                        trace_id,
                        event['msg_id'],
                        event['ts'],
                        event['type'],
                        json.dumps(event['payload'], ensure_ascii=False),
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        else:
            ep_path = os.path.join(BASE_DIR, 'episodes', f'{trace_id}.json')
            if not os.path.exists(ep_path):
                return JSONResponse({'ok': False, 'error': 'episode_not_found'}, status_code=404)
            try:
                with open(ep_path, 'r', encoding='utf-8') as f:
                    episode = json.load(f)
            except Exception:
                return JSONResponse({'ok': False, 'error': 'episode_read_failed'}, status_code=500)
            events = episode.get('events')
            if not isinstance(events, list):
                events = []
            events.append(event)
            episode['events'] = events
            tmp_path = ep_path + '.tmp'
            with open(tmp_path, 'w', encoding='utf-8') as f:
                json.dump(episode, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, ep_path)

        return JSONResponse({'ok': True, 'approval_id': approval_id, 'trace_id': trace_id})

    @app.get('/agent/episodes/{trace_id}')
    async def agent_episode(trace_id: str):
        cfg = load_config(None)
        backend = (cfg.get('outbox', {}) or {}).get('backend', 'json')
        if backend == 'sqlite':
            import sqlite3

            db_path = (cfg.get('outbox', {}) or {}).get('sqlite_path', 'episodes.db')
            if not os.path.exists(db_path):
                return JSONResponse({'ok': False, 'error': 'episodes_not_found'}, status_code=404)
            conn = sqlite3.connect(db_path)
            try:
                row = conn.execute(
                    "SELECT trace_id, goal, status, latency_ms, header_json, sense_json, plan_json, artifacts_json, created_ts FROM episodes WHERE trace_id=?",
                    (trace_id,),
                ).fetchone()
                if not row:
                    return JSONResponse({'ok': False, 'error': 'episode_not_found'}, status_code=404)
                events_rows = conn.execute(
                    "SELECT msg_id, ts, type, payload_json FROM events WHERE trace_id=? ORDER BY id ASC",
                    (trace_id,),
                ).fetchall()
            finally:
                conn.close()
            events: List[Dict[str, Any]] = []
            for msg_id, ts, tp, payload_json in events_rows:
                try:
                    payload_obj = json.loads(payload_json) if payload_json else {}
                except Exception:
                    payload_obj = {'raw': payload_json}
                events.append({'msg_id': msg_id, 'ts': ts, 'type': tp, 'payload': payload_obj})
            episode = {
                'trace_id': row[0],
                'goal': row[1],
                'status': row[2],
                'latency_ms': row[3],
                'header': json.loads(row[4]) if row[4] else {},
                'sense': json.loads(row[5]) if row[5] else None,
                'plan': json.loads(row[6]) if row[6] else None,
                'artifacts': json.loads(row[7]) if row[7] else {},
                'created_ts': row[8],
                'events': events,
            }
        else:
            ep_path = os.path.join(BASE_DIR, 'episodes', f'{trace_id}.json')
            if not os.path.exists(ep_path):
                return JSONResponse({'ok': False, 'error': 'episode_not_found'}, status_code=404)
            try:
                with open(ep_path, 'r', encoding='utf-8') as f:
                    episode = json.load(f)
            except Exception:
                return JSONResponse({'ok': False, 'error': 'episode_read_failed'}, status_code=500)
        return JSONResponse({'ok': True, 'episode': episode})

    @app.post('/api/config/rollback')
    async def api_config_rollback(request: Request):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error':'unauthorized'}, status_code=401)
        cfg_path = os.path.join(BASE_DIR, 'config.json')
        bak = cfg_path + '.bak'
        if not os.path.exists(bak):
            return JSONResponse({'ok': False, 'error': 'no backup'}, status_code=404)
        import shutil
        shutil.copyfile(bak, cfg_path)
        # 记录审计
        try:
            from datetime import datetime as _dt
            audit_dir = os.path.join(BASE_DIR, 'audit'); os.makedirs(audit_dir, exist_ok=True)
            log_path = os.path.join(audit_dir, 'config_changes.log')
            rec = {'ts': _dt.utcnow().isoformat()+'Z', 'rollback': True}
            with open(log_path, 'a', encoding='utf-8') as lf:
                lf.write(json.dumps(rec, ensure_ascii=False) + '\n')
        except Exception:
            pass
        return JSONResponse({'ok': True})

    @app.post("/api/chat/send")
    async def api_chat_send(request: Request, text: str = Form(...), session: str | None = Form(None)):
        # 使用 MCP-first 会话代理：先从 MCP 获取提示/工具上下文，再调用 LLM；LLM 输出 mcp_call 时再执行 MCP
        from packages.agents.mcp_agents import MCPConversationAgent  # type: ignore
        cfg = load_config(None)
        sid = session or ("s-" + os.urandom(4).hex())
        # 历史消息（role/content）
        history_rows = get_history(CHAT_CONN, sid, limit=100)
        history = [{"role": r.get("role"), "content": r.get("content")} for r in history_rows]
        # 记录用户消息
        append_message(CHAT_CONN, sid, "user", text)
        await _publish_chat_event(sid, {'type': 'chat.message', 'role': 'user', 'content': text})
        await _publish_chat_event(sid, {'type': 'chat.status', 'state': 'thinking', 'message': '思考中…'})

        agent = MCPConversationAgent(cfg)
        try:
            result = await agent.respond_async(sid, history, text)
        except Exception as e:
            await _publish_chat_event(sid, {'type': 'chat.status', 'state': 'error', 'message': str(e)})
            await _publish_chat_event(sid, {'type': 'chat.error', 'message': str(e)})
            return JSONResponse({'ok': False, 'error': str(e), 'session': sid}, status_code=500)
        content = result.get("reply") or ""
        meta = result.get("llm") or {}
        action = result.get("action")
        mcp_exec = result.get("mcp")
        srs_saved = result.get("srs_path")

        # 规则化意图兜底：简单中文/英文命令映射到 MCP 工具（例如“看一下有哪些文件”→ fs.list_dir）
        if not action:
            try:
                import re
                want_ls = False
                if re.search(r"\bls\b", text, flags=re.IGNORECASE) or re.search(r"(看一下|看看|查看|列出).*(文件|目录|文件夹|清单|列表)", text):
                    want_ls = True
                if want_ls:
                    path = None
                    m = re.search(r"(?:在|于|到|进入|切换到|打开)\s*([\w\./-]+)", text)
                    if not m:
                        m = re.search(r"\bls\b\s+([\w\./-]+)", text, flags=re.IGNORECASE)
                    if m:
                        path = m.group(1)
                    else:
                        m = re.search(r"([\w\./-]+/[\w\./-]+)", text)
                        if m:
                            path = m.group(1)
                    action = {"type": "mcp_call", "server": "api", "tool": "fs.list_dir", "args": {"path": path or "."}}
            except Exception:
                pass

        # 如果有 MCP 执行，补写 Outbox 事件（与原实现一致）
        if isinstance(mcp_exec, dict) and (mcp_exec.get("server") and mcp_exec.get("tool")):
            try:
                from kernel.bus import OutboxBus  # type: ignore
                bus = OutboxBus(episodes_dir=os.path.join(BASE_DIR, 'episodes'))
                trace = bus.new_trace(goal=f"chat.mcp_call {mcp_exec['server']}.{mcp_exec['tool']}")
                bus.append('mcp.call.request', {'server': mcp_exec['server'], 'tool': mcp_exec['tool'], 'args': mcp_exec.get('args'), 'labels': {'source': 'chat', 'session': sid}})
                bus.append('mcp.call.result', {'server': mcp_exec['server'], 'tool': mcp_exec['tool'], 'result': mcp_exec.get('result')})
                bus.finalize('ok', {'result': mcp_exec.get('result')})
            except Exception:
                pass
        # MCP-first 代理已内置调用逻辑；保留显式 mcp_call 支持（兼容旧前端直接发 JSON 指令）。
        # 若代理声明 managed=True，则不在这里自动执行建议动作，避免与代理策略冲突。
        if (not (isinstance(result, dict) and result.get('managed'))) and isinstance(action, dict) and action.get("type") == "mcp_call" and (not mcp_exec or mcp_exec.get("error")):
            try:
                from packages.providers.mcp_client import MCPClient  # type: ignore
                from kernel.bus import OutboxBus  # type: ignore
                server_id = str(action.get("server") or "api")
                tool = str(action.get("tool") or "")
                args = action.get("args") or {}
                if not tool:
                    raise ValueError("缺少 tool 名称")
                # 工具别名映射（兼容 ls/list_files/cat）
                alias = { 'ls': 'fs.list_dir', 'list_files': 'fs.list_dir', 'cat': 'fs.read_text' }
                tool_canonical = alias.get(tool, tool)
                bus = OutboxBus(episodes_dir=os.path.join(BASE_DIR, 'episodes'))
                trace = bus.new_trace(goal=f"chat.mcp_call {server_id}.{tool_canonical}")
                bus.append('mcp.call.request', {'server': server_id, 'tool': tool_canonical, 'args': args, 'labels': {'source': 'chat', 'session': sid}})
                mcp = MCPClient(cfg)
                try:
                    res = await mcp.call_tool_async(server_id, tool_canonical, args if isinstance(args, dict) else {})
                except Exception as e_remote:
                    # 远程不可用时回退到本地内置实现（除非强制 require_remote）
                    cfg2 = load_config(None)
                    if (cfg2.get('mcp', {}) or {}).get('require_remote'):
                        raise
                    res = _local_mcp_call(tool_canonical, args if isinstance(args, dict) else {})
                res_text = res.get("text") or (json.dumps(res.get("structured"), ensure_ascii=False) if res.get("structured") is not None else "<no result>")
                mcp_exec = {"server": server_id, "tool": tool_canonical, "args": args, "result": res, 'trace_id': trace}
                bus.append('mcp.call.result', {'server': server_id, 'tool': tool_canonical, 'result': res})
                bus.finalize('ok', {'result': res})
                content = (content or "").rstrip() + f"\n\n[MCP] {server_id}.{tool_canonical} 执行结果:\n" + str(res_text)
            except Exception as e:
                mcp_exec = {"error": str(e)}

        append_message(CHAT_CONN, sid, "assistant", content, json.dumps(action, ensure_ascii=False) if action else None)
        await _publish_chat_event(sid, {
            'type': 'chat.message',
            'role': 'assistant',
            'content': content,
            'action': action,
            'mcp': mcp_exec,
            'srs_path': srs_saved,
        })
        await _publish_chat_event(sid, {'type': 'chat.action', 'action': action, 'srs_path': srs_saved})
        await _publish_chat_event(sid, {'type': 'chat.status', 'state': 'idle'})
        # 追加聊天审计日志（JSONL）
        try:
            from datetime import datetime as _dt
            audit_dir = os.path.join(BASE_DIR, 'audit'); os.makedirs(audit_dir, exist_ok=True)
            log_path = os.path.join(audit_dir, 'chat.log')
            def _trim(s: str, n: int = 10000) -> str:
                try:
                    return s if len(s) <= n else (s[:n] + '...')
                except Exception:
                    return s
            rec = {
                'ts': _dt.utcnow().isoformat()+'Z',
                'session': sid,
                'ip': getattr(request.client, 'host', None),
                'ua': request.headers.get('user-agent'),
                'text': _trim(str(text)),
                'reply': _trim(str(content)),
                'action': action,
                'llm': meta,
                'mcp': mcp_exec,
            }
            with open(log_path, 'a', encoding='utf-8') as lf:
                lf.write(json.dumps(rec, ensure_ascii=False) + '\n')
        except Exception:
            pass
        return JSONResponse({"ok": True, "reply": content, "session": sid, "llm": meta, "action": action, "mcp": mcp_exec, "srs_path": srs_saved})

    @app.get("/api/chat/history")
    async def api_chat_history(session: str):
        hx = get_history(CHAT_CONN, session, limit=200)
        return JSONResponse({"ok": True, "session": session, "history": hx})

    @app.post("/api/chat/clear")
    async def api_chat_clear(session: str = Form(...)):
        clear_session(CHAT_CONN, session)
        return JSONResponse({"ok": True, "session": session})

    # MCP 工具列表
    @app.get('/api/mcp/tools')
    async def api_mcp_tools(server: str | None = None):
        try:
            from packages.providers.mcp_client import MCPClient  # type: ignore
            cfg = load_config(None)
            mcp = MCPClient(cfg)
            sid = server or 'api'
            tools = await mcp.list_tools_async(sid)
            # 排序并限制字段
            tools = sorted([{ 'name': t.get('name'), 'description': t.get('description') } for t in tools if isinstance(t, dict) ], key=lambda x: x.get('name') or '')
            return JSONResponse({'ok': True, 'server': sid, 'tools': tools})
        except Exception as e:
            cfg2 = load_config(None)
            if (cfg2.get('mcp', {}) or {}).get('require_remote'):
                return JSONResponse({'ok': False, 'error': f'MCP remote not available: {e}'}, status_code=502)
            # 回退到内置工具清单（无 MCP Server 时仍可用）
            local_tools = [
                {'name': 'fs.read_text', 'description': '读取文本文件(最多32KB)'},
                {'name': 'fs.list_dir', 'description': '列出目录内容和元信息(限制在仓库根内)'},
                {'name': 'data.csv_head', 'description': '读取 CSV 前 N 行'},
                {'name': 'skills.csv_clean', 'description': '清洗 CSV 行(去空值等)'},
                {'name': 'stats.aggregate', 'description': '按字段聚合并选 TopN'},
                {'name': 'report.md_render', 'description': '将统计结果渲染为 Markdown'},
            ]
            return JSONResponse({'ok': True, 'server': server or 'local', 'tools': local_tools, 'fallback': True, 'error': str(e)})

    # MCP 工具调用（写入 Outbox）
    @app.post('/api/mcp/call')
    async def api_mcp_call(server: str = Form('api'), tool: str = Form(...), args_json: str = Form('{}')):
        try:
            args = json.loads(args_json or '{}')
        except Exception:
            args = {}
        from kernel.bus import OutboxBus  # type: ignore
        trace = None
        bus = OutboxBus(episodes_dir=os.path.join(BASE_DIR, 'episodes'))
        try:
            trace = bus.new_trace(goal=f"chat.mcp_call {server}.{tool}")
            bus.append('mcp.call.request', {'server': server, 'tool': tool, 'args': args})
        except Exception:
            trace = None
        try:
            from packages.providers.mcp_client import MCPClient  # type: ignore
            cfg = load_config(None)
            mcp = MCPClient(cfg)
            # 工具别名映射（兼容简写）
            alias = { 'ls': 'fs.list_dir', 'cat': 'fs.read_text' }
            tool_canonical = alias.get(tool, tool)
            try:
                res = await mcp.call_tool_async(server, tool_canonical, args if isinstance(args, dict) else {})
            except Exception as e_remote:
                # 回退到本地实现（允许关闭回退）
                cfg2 = load_config(None)
                if (cfg2.get('mcp', {}) or {}).get('require_remote'):
                    raise
                res = _local_mcp_call(tool_canonical, args if isinstance(args, dict) else {})
            if trace:
                try:
                    bus.append('mcp.call.result', {'server': server, 'tool': tool_canonical, 'result': res})
                    bus.finalize('ok', {'result': res})
                except Exception:
                    pass
            return JSONResponse({'ok': True, 'server': server, 'tool': tool_canonical, 'result': res, 'trace_id': trace})
        except Exception as e:
            if trace:
                try:
                    bus.append('mcp.call.error', {'error': str(e)})
                    bus.finalize('error', {'error': str(e)})
                except Exception:
                    pass
            return JSONResponse({'ok': False, 'error': str(e), 'trace_id': trace}, status_code=500)

    # 本地 MCP 工具实现（作为无远程 MCP Server 的回退）
    def _local_mcp_call(tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if tool == 'fs.read_text':
                p = os.path.join(BASE_DIR, str(args.get('path') or ''))
                if not os.path.isfile(p):
                    raise FileNotFoundError(p)
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(32768)
                return {'text': content}
            if tool == 'fs.list_dir':
                base = BASE_DIR
                req = str(args.get('path') or '.')
                p = os.path.abspath(os.path.join(base, req))
                # 限制在 BASE_DIR 内
                if os.path.commonpath([p, base]) != os.path.commonpath([base]):
                    return {'structured': {'error': 'forbidden'}}
                if not os.path.isdir(p):
                    return {'structured': {'error': f'not a directory: {req}'}}
                dirs, files = [], []
                for name in (os.listdir(p)[:500] if os.path.isdir(p) else []):
                    full = os.path.join(p, name)
                    try:
                        st = os.stat(full)
                        info = {
                            'name': name,
                            'size': int(st.st_size),
                            'mtime': __import__('datetime').datetime.utcfromtimestamp(st.st_mtime).isoformat()+'Z'
                        }
                        if os.path.isdir(full):
                            dirs.append(info)
                        else:
                            files.append(info)
                    except Exception:
                        pass
                rel = os.path.relpath(p, base)
                return {'structured': {'cwd': '/' if rel == '.' else rel, 'dirs': dirs, 'files': files}}
            if tool == 'data.csv_head':
                import itertools
                n = int(args.get('n') or 50)
                p = os.path.join(BASE_DIR, str(args.get('path') or ''))
                if not os.path.isfile(p):
                    raise FileNotFoundError(p)
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    head = ''.join(list(itertools.islice(f, n)))
                return {'text': head}
            if tool == 'skills.csv_clean':
                from skills.csv_clean import csv_clean  # type: ignore
                import csv as _csv
                p = os.path.join(BASE_DIR, str(args.get('path') or ''))
                rows = []
                with open(p, newline='', encoding='utf-8') as f:
                    reader = _csv.DictReader(f)
                    rows = list(reader)
                cleaned = csv_clean(rows, **(args.get('options') or {}))
                return {'structured': {'cleaned_count': len(cleaned)}}
            if tool == 'stats.aggregate':
                from skills.stats_aggregate import stats_aggregate  # type: ignore
                rows = (args.get('rows') or [])
                if not rows:
                    # 尝试从 path 读取
                    import csv as _csv
                    p = os.path.join(BASE_DIR, str(args.get('path') or ''))
                    with open(p, newline='', encoding='utf-8') as f:
                        reader = _csv.DictReader(f)
                        rows = list(reader)
                result = stats_aggregate(rows, **({k:v for k,v in args.items() if k!='rows' and k!='path'}))
                return {'structured': result}
            if tool == 'report.md_render':
                from skills.md_render import md_render  # type: ignore
                summary = args.get('summary') or {}
                top = args.get('top') or []
                md = md_render(summary=summary, top=top, **({k:v for k,v in args.items() if k not in ('summary','top')}))
                return {'text': md}
            # 未知工具
            return {'text': f'<unknown tool: {tool}>'}
        except Exception as e:
            return {'text': f'Error: {e}'}

    # 轻量鉴权（Admin Token + 可选 IP 白名单 + 可选 Basic Auth）
    def _require_admin(req: Request) -> None:
        cfgs = load_config(None)
        allow = (cfgs.get('security', {}) or {}).get('ip_allowlist')
        if allow and getattr(req.client, 'host', None) not in allow:
            raise Exception('forbidden')
        # 1) X-Admin-Token
        token = os.environ.get('ADMIN_TOKEN') or (cfgs.get('security', {}) or {}).get('admin_token')
        if token and req.headers.get('x-admin-token') == str(token):
            return
        # 2) Basic Auth（可选）
        basic = (cfgs.get('security', {}) or {}).get('basic_auth') or {}
        user = basic.get('username'); pwd = basic.get('password')
        auth = req.headers.get('authorization') or req.headers.get('Authorization')
        if user and pwd and auth and auth.lower().startswith('basic '):
            try:
                import base64
                raw = base64.b64decode(auth.split(' ',1)[1]).decode('utf-8')
                u, p = raw.split(':', 1)
                if u == str(user) and p == str(pwd):
                    return
            except Exception:
                pass
        # 3) 若配置了凭据则必须提供，否则拒绝；未配置则默认放行
        if token or (user and pwd):
            raise Exception('unauthorized')
        return

    # Workflows
    @app.get('/workflows', response_class=HTMLResponse)
    async def workflows_page(request: Request):
        try: _require_admin(request)
        except Exception: return PlainTextResponse('unauthorized', status_code=401)
        wfs = list_workflows(CHAT_CONN)
        return templates.TemplateResponse('workflows.html', {'request': request, 'wfs': wfs})

    @app.get('/workflows/{wf_id}', response_class=HTMLResponse)
    async def workflow_detail_page(request: Request, wf_id: int):
        try: _require_admin(request)
        except Exception: return PlainTextResponse('unauthorized', status_code=401)
        wf = get_workflow(CHAT_CONN, wf_id)
        jobs = list_jobs(CHAT_CONN, wf_id)
        return templates.TemplateResponse('workflow_detail.html', {'request': request, 'wf': wf, 'jobs': jobs})

    @app.post('/api/workflows')
    async def api_workflows(request: Request, name: str = Form(...), definition_json: str = Form(...)):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error': 'unauthorized'}, status_code=401)
        _id = upsert_workflow(CHAT_CONN, name, definition_json)
        return JSONResponse({'ok': True, 'id': _id})

    @app.post('/api/jobs/schedule')
    async def api_jobs_schedule(request: Request, workflow_id: int = Form(...), after_seconds: int = Form(0)):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error': 'unauthorized'}, status_code=401)
        from datetime import datetime, timedelta
        run_at = (datetime.utcnow() + timedelta(seconds=int(after_seconds))).isoformat() + 'Z'
        wf = get_workflow(CHAT_CONN, workflow_id)
        args_json = '{}'
        try:
            if wf and wf.get('definition_json'):
                obj = json.loads(wf['definition_json']) if isinstance(wf['definition_json'], str) else wf['definition_json']
                if isinstance(obj, dict) and obj.get('action') and obj['action'].get('type') == 'run':
                    args_json = json.dumps(obj['action'].get('args', {}), ensure_ascii=False)
        except Exception:
            pass
        jid = schedule_job(CHAT_CONN, int(workflow_id), run_at, args_json)
        return JSONResponse({'ok': True, 'job_id': jid, 'run_at': run_at})

    @app.get('/jobs/{job_id}', response_class=HTMLResponse)
    async def job_detail_page(request: Request, job_id: int):
        try: _require_admin(request)
        except Exception: return PlainTextResponse('unauthorized', status_code=401)
        job = get_job(CHAT_CONN, job_id)
        wf = get_workflow(CHAT_CONN, (job or {}).get('workflow_id') or 0)
        # 解析结果
        steps = []
        try:
            rj = (job or {}).get('result_json')
            obj = json.loads(rj) if rj else {}
            steps = obj.get('steps', []) if isinstance(obj, dict) else []
        except Exception:
            steps = []
        return templates.TemplateResponse('job_detail.html', {'request': request, 'job': job, 'wf': wf, 'steps': steps})

    @app.post('/api/jobs/retry')
    async def api_jobs_retry(request: Request, job_id: int = Form(...)):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error': 'unauthorized'}, status_code=401)
        jb = get_job(CHAT_CONN, int(job_id))
        if not jb: return JSONResponse({'ok': False, 'error': 'job not found'}, status_code=404)
        from datetime import datetime
        run_at = datetime.utcnow().isoformat() + 'Z'
        jid = schedule_job(CHAT_CONN, int(jb['workflow_id']), run_at, jb.get('args_json') or '{}')
        return JSONResponse({'ok': True, 'job_id': jid, 'run_at': run_at})

    @app.post('/api/jobs/retry-step')
    async def api_jobs_retry_step(request: Request, job_id: int = Form(...), step_index: int = Form(...)):
        try: _require_admin(request)
        except Exception: return JSONResponse({'ok': False, 'error': 'unauthorized'}, status_code=401)
        jb = get_job(CHAT_CONN, int(job_id))
        if not jb: return JSONResponse({'ok': False, 'error': 'job not found'}, status_code=404)
        try:
            obj = json.loads(jb.get('result_json') or '{}')
            stps = obj.get('steps', [])
            st = stps[int(step_index)] if (isinstance(stps, list) and 0 <= int(step_index) < len(stps)) else None
            if not st: return JSONResponse({'ok': False, 'error': 'step not found'}, status_code=404)
            args_override = {'steps': [{ 'type': st.get('type', 'run'), 'args': st.get('args', {}) }]}
            from datetime import datetime
            run_at = datetime.utcnow().isoformat() + 'Z'
            jid = schedule_job(CHAT_CONN, int(jb['workflow_id']), run_at, json.dumps(args_override, ensure_ascii=False))
            return JSONResponse({'ok': True, 'job_id': jid, 'run_at': run_at})
        except Exception as e:
            return JSONResponse({'ok': False, 'error': str(e)}, status_code=400)

    @app.get('/api/jobs/get')
    async def api_jobs_get(job_id: int):
        jb = get_job(CHAT_CONN, int(job_id))
        if not jb: return JSONResponse({'ok': False, 'error': 'not found'}, status_code=404)
        steps = []
        try:
            rj = jb.get('result_json')
            obj = json.loads(rj) if rj else {}
            steps = obj.get('steps', []) if isinstance(obj, dict) else []
        except Exception:
            steps = []
        return JSONResponse({'ok': True, 'job': jb, 'steps': steps})

    @app.get('/download')
    async def download_file(path: str):
        # 基础安全：限制在 BASE_DIR 内
        p = os.path.abspath(os.path.join(BASE_DIR, path))
        if not os.path.commonpath([p, BASE_DIR]) == os.path.commonpath([BASE_DIR]):
            return PlainTextResponse('forbidden', status_code=403)
        if not os.path.exists(p) or not os.path.isfile(p):
            return PlainTextResponse('not found', status_code=404)
        return FileResponse(p, filename=os.path.basename(p))

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
        opts: Dict[str, Any] = {
            'srs_path': srs_path,
            'data_path': data_path,
            'out_path': out_path,
            'planner': planner,
            'executor': executor,
            'critic': critic,
            'reviser': reviser,
        }
        if provider: opts['provider'] = provider
        if temp_planner: opts['temp_planner'] = temp_planner
        if temp_executor: opts['temp_executor'] = temp_executor
        if temp_critic: opts['temp_critic'] = temp_critic
        if temp_reviser: opts['temp_reviser'] = temp_reviser
        if retries: opts['retries'] = retries
        if max_rows: opts['max_rows'] = max_rows
        job_id = _enqueue_job(opts)
        return JSONResponse({"ok": True, "job_id": job_id})

    @app.get("/api/run/status")
    async def api_run_status(job_id: str):
        st = JOBS.get(job_id, {"done": False})
        return JSONResponse(st)

    @app.websocket('/agent/events')
    async def agent_events(websocket: WebSocket):
        await websocket.accept()
        job_id = websocket.query_params.get('job_id')
        session_id = (
            websocket.query_params.get('session')
            or websocket.query_params.get('session_id')
            or websocket.query_params.get('chat_session')
        )
        if session_id:
            queue = await _chat_subscribe(session_id)
            try:
                history = get_history(CHAT_CONN, session_id, limit=200)
                await websocket.send_json({'type': 'chat.init', 'session': session_id, 'history': history})
                await websocket.send_json({'type': 'chat.status', 'state': 'idle'})
                while True:
                    try:
                        event = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_INTERVAL)
                    except asyncio.TimeoutError:
                        await websocket.send_json({'type': 'ping', 'ts': datetime.utcnow().isoformat() + 'Z'})
                        continue
                    await websocket.send_json(event)
            except WebSocketDisconnect:
                pass
            except Exception as e:
                try:
                    await websocket.send_json({'type': 'chat.error', 'message': str(e)})
                except Exception:
                    pass
            finally:
                await _chat_unsubscribe(session_id, queue)
                try:
                    await websocket.close()
                except Exception:
                    pass
            return
        if not job_id:
            await websocket.send_json({'type': 'error', 'message': 'missing_job_id'})
            await websocket.close()
            return
        try:
            notified = False
            cursor = 0
            loop = asyncio.get_running_loop()
            last_ping = loop.time()
            while True:
                job = JOBS.get(job_id)
                if not job:
                    await websocket.send_json({'type': 'error', 'message': 'job_not_found'})
                    return
                stream = job.get('stream') or []
                while cursor < len(stream):
                    entry = stream[cursor]
                    cursor += 1
                    if entry.get('kind') == 'progress' and isinstance(entry.get('json'), dict):
                        await websocket.send_json({'type': 'progress', 'data': entry.get('json')})
                    else:
                        await websocket.send_json({'type': 'log', 'line': entry.get('line'), 'ts': entry.get('ts')})
                    notified = True
                    last_ping = loop.time()
                if job.get('done'):
                    break
                if not notified:
                    await websocket.send_json({'type': 'status', 'state': 'pending'})
                    notified = True
                    last_ping = loop.time()
                now = loop.time()
                if now - last_ping >= HEARTBEAT_INTERVAL:
                    await websocket.send_json({'type': 'ping', 'ts': datetime.utcnow().isoformat() + 'Z'})
                    last_ping = now
                await asyncio.sleep(0.3)
            job = JOBS.get(job_id)
            if not job:
                await websocket.send_json({'type': 'error', 'message': 'job_not_found'})
                return
            if not job.get('ok'):
                err_msg = job.get('error') or ((job.get('result') or {}).get('stderr')) or 'job_failed'
                await websocket.send_json({'type': 'error', 'message': err_msg, 'result': job.get('result')})
                return
            result = job.get('result') or {}
            trace_id = job.get('trace_id') or result.get('trace_id')
            events = job.get('events') or []
            episode_summary = job.get('episode') or {}
            if trace_id and not events:
                ep = _load_episode(str(trace_id))
                if isinstance(ep, dict):
                    events = ep.get('events', [])
                    episode_summary = {
                        'status': ep.get('status'),
                        'goal': ep.get('goal'),
                        'latency_ms': ep.get('latency_ms'),
                        'artifacts': ep.get('artifacts', {}),
                        'header': ep.get('header', {}),
                    }
                    job['events'] = events
                    job['episode'] = episode_summary
            await websocket.send_json({'type': 'status', 'state': 'completed', 'trace_id': trace_id})
            last_ping = loop.time()
            for ev in events:
                await websocket.send_json({'type': 'event', 'event': ev})
                last_ping = loop.time()
                await asyncio.sleep(0.05)
            await websocket.send_json({'type': 'final', 'result': result, 'trace_id': trace_id, 'episode': episode_summary})
        except WebSocketDisconnect:
            return
        except Exception as e:
            try:
                await websocket.send_json({'type': 'error', 'message': str(e)})
            except Exception:
                pass
        finally:
            try:
                await websocket.close()
            except Exception:
                pass

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

    # -----------------------------
    # Workspace API (/api/ws/*)
    # -----------------------------
    def _ws_cfg():
        cfg = load_config(None)
        ws = cfg.get('workspace', {}) if isinstance(cfg.get('workspace', {}), dict) else {}
        root = ws.get('root') or BASE_DIR
        allow = ws.get('allow_suffixes') or ['.md', '.txt', '.json', '.yaml', '.yml', '.py', '.csv']
        max_r_kb = int(ws.get('max_read_size_kb', 512))
        max_w_kb = int(ws.get('max_write_size_kb', 512))
        return root, [s.lower() for s in allow], max_r_kb, max_w_kb

    def _safe_path(root: str, rel: str) -> str:
        rel = rel or '.'
        p = os.path.abspath(os.path.join(root, rel))
        if not os.path.commonpath([p, root]) == os.path.commonpath([root]):
            raise ValueError('path outside root')
        return p

    @app.get('/api/ws/ls')
    async def api_ws_ls(path: str = '.'):
        root, allow, _mr, _mw = _ws_cfg()
        try:
            p = _safe_path(root, path)
            if not os.path.isdir(p):
                return JSONResponse({'ok': False, 'error': 'not a directory'}, status_code=400)
            items = os.listdir(p)
            dirs = []
            files = []
            for name in sorted(items):
                full = os.path.join(p, name)
                if os.path.isdir(full):
                    dirs.append(name)
                else:
                    ext = os.path.splitext(name)[1].lower()
                    if ext in allow:
                        try:
                            st = os.stat(full)
                            files.append({'name': name, 'size': st.st_size, 'mtime': __import__('datetime').datetime.utcfromtimestamp(st.st_mtime).isoformat()+'Z'})
                        except Exception:
                            files.append({'name': name})
            rel = os.path.relpath(p, root)
            if rel == '.': rel = ''
            return JSONResponse({'ok': True, 'cwd': rel, 'dirs': dirs, 'files': files, 'root': root})
        except Exception as e:
            return JSONResponse({'ok': False, 'error': str(e)}, status_code=400)

    @app.get('/api/ws/read')
    async def api_ws_read(path: str):
        root, allow, max_r_kb, _mw = _ws_cfg()
        try:
            p = _safe_path(root, path)
            if not os.path.isfile(p):
                return JSONResponse({'ok': False, 'error': 'not a file'}, status_code=400)
            ext = os.path.splitext(p)[1].lower()
            if ext not in allow:
                return JSONResponse({'ok': False, 'error': 'suffix not allowed'}, status_code=400)
            st = os.stat(p)
            if st.st_size > max_r_kb * 1024:
                return JSONResponse({'ok': False, 'error': f'file too large (> {max_r_kb} KB)'}, status_code=400)
            with open(p, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            return JSONResponse({'ok': True, 'path': path, 'content': content})
        except Exception as e:
            return JSONResponse({'ok': False, 'error': str(e)}, status_code=400)

    @app.post('/api/ws/write')
    async def api_ws_write(request: Request):
        try: _require_admin(request)
        except Exception:
            return JSONResponse({'ok': False, 'error': 'unauthorized'}, status_code=401)
        root, allow, _mr, max_w_kb = _ws_cfg()
        form = await request.form()
        path = str(form.get('path') or '')
        content = str(form.get('content') or '')
        try:
            p = _safe_path(root, path)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            ext = os.path.splitext(p)[1].lower()
            if ext not in allow:
                return JSONResponse({'ok': False, 'error': 'suffix not allowed'}, status_code=400)
            if len(content.encode('utf-8')) > max_w_kb * 1024:
                return JSONResponse({'ok': False, 'error': f'content too large (> {max_w_kb} KB)'}, status_code=400)
            with open(p, 'w', encoding='utf-8') as f:
                f.write(content)
            # 审计
            try:
                from datetime import datetime as _dt
                audit_dir = os.path.join(BASE_DIR, 'audit'); os.makedirs(audit_dir, exist_ok=True)
                log_path = os.path.join(audit_dir, 'ws_writes.log')
                rec = {
                    'ts': _dt.utcnow().isoformat()+'Z',
                    'path': os.path.relpath(p, root),
                    'bytes': len(content.encode('utf-8')),
                    'ip': getattr(request.client, 'host', None),
                    'user': (request.headers.get('Authorization') or request.headers.get('authorization') or request.headers.get('x-admin-token') or '')[:128]
                }
                with open(log_path, 'a', encoding='utf-8') as af:
                    af.write(json.dumps(rec, ensure_ascii=False) + '\n')
            except Exception:
                pass
            return JSONResponse({'ok': True, 'path': path})
        except Exception as e:
            return JSONResponse({'ok': False, 'error': str(e)}, status_code=400)

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
        content = '\ufeff' + buf.getvalue()
        return PlainTextResponse(content, media_type="text/csv; charset=utf-8")

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
        content = '\ufeff' + buf.getvalue()
        return PlainTextResponse(content, media_type="text/csv; charset=utf-8")

    return app


app = create_app() if FastAPI is not None else None  # type: ignore
