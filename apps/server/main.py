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
from typing import Any, Dict, List
import threading

try:
    from fastapi import FastAPI, Request, Form
    from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, PlainTextResponse, FileResponse
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
    # 挂载本地静态资源（CSS/JS），离线可用
    try:
        static_dir = os.path.join(os.path.dirname(__file__), "static")
        if os.path.isdir(static_dir):
            app.mount("/static", StaticFiles(directory=static_dir), name="static")
    except Exception:
        # 静态目录不存在也不影响运行
        pass
    # Chat DB
    from .chat_db import init_db, append_message, get_history, clear_session, upsert_workflow, list_workflows, get_workflow, schedule_job, list_jobs, due_jobs, mark_job_result, get_job  # type: ignore
    chat_db_path = os.environ.get('CHAT_DB_PATH') or os.path.join(BASE_DIR, "chat.db")
    CHAT_CONN = init_db(chat_db_path)

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
    async def api_chat_send(text: str = Form(...), session: str | None = Form(None)):
        from packages.providers.router import LLMRouter  # type: ignore
        from packages.providers.openrouter_client import extract_json_block  # type: ignore
        cfg = load_config(None)
        router = LLMRouter(cfg)
        sid = session or ("s-" + os.urandom(4).hex())
        # 构造上下文：system + 历史消息
        history = get_history(CHAT_CONN, sid, limit=100)
        msgs = [{"role":"system","content":"你是 AgentOS 助手。请用简洁中文回答。若识别到可执行任务，返回一个JSON对象：{\"action\":{\"type\":\"run\",\"args\":{...}},\"srs\":{...}}，其中 action.args 支持 run 所需参数（srs_path/data_path/out/planner/executor/critic/reviser/provider）。JSON 之外可附加说明。"}]
        for m in history:
            msgs.append({"role": m["role"], "content": m["content"]})
        msgs.append({"role":"user","content": text})
        # 记录用户消息
        append_message(CHAT_CONN, sid, "user", text)
        # LLM 回复
        content, meta = router.chat_with_meta(msgs, temperature=0.3, retries=int(cfg.get("llm",{}).get("retries",0)))
        action = None
        srs_saved = None
        # 尝试提取 JSON 动作
        try:
            obj = extract_json_block(content)
            if isinstance(obj, dict):
                if obj.get("srs"):
                    # 保存 SRS 至 examples/srs/
                    sdir = os.path.join(BASE_DIR, "examples", "srs")
                    os.makedirs(sdir, exist_ok=True)
                    import time as _t
                    srs_path = os.path.join(sdir, f"srs_{sid}_{int(_t.time())}.json")
                    with open(srs_path, "w", encoding="utf-8") as f:
                        json.dump(obj["srs"], f, ensure_ascii=False, indent=2)
                    srs_saved = srs_path
                if obj.get("action"):
                    action = obj["action"]
        except Exception:
            action = None
        append_message(CHAT_CONN, sid, "assistant", content, json.dumps(action, ensure_ascii=False) if action else None)
        return JSONResponse({"ok": True, "reply": content, "session": sid, "llm": meta, "action": action, "srs_path": srs_saved})

    @app.get("/api/chat/history")
    async def api_chat_history(session: str):
        hx = get_history(CHAT_CONN, session, limit=200)
        return JSONResponse({"ok": True, "session": session, "history": hx})

    @app.post("/api/chat/clear")
    async def api_chat_clear(session: str = Form(...)):
        clear_session(CHAT_CONN, session)
        return JSONResponse({"ok": True, "session": session})

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
