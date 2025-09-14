#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SPEC:
  模块: apps/console/min_loop
  目标: 最小离线闭环：SRS -> 规划 -> 执行 -> 评审 -> 一次修补 -> 记录 -> 回放
  输入: --srs <json>, --data <csv>, --out <md>
  输出: 报告 Markdown、episodes/<trace_id>.json、控制台摘要
  约束: 全离线无网络; 成本=0; 示例数据 p95 延迟<2s; 仅一次自动修补
  测试: 使用 examples 手动运行; 回放产物与得分一致
"""

import argparse
import csv
import json
import os
import sys
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Tuple

# 允许脚本直接运行时导入项目模块
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from kernel.bus import OutboxBus  # type: ignore
from kernel.outbox_sqlite import OutboxSQLite  # type: ignore
from kernel.guardian import BudgetGuardian  # type: ignore
from skills.csv_clean import csv_clean  # type: ignore
from skills.stats_aggregate import stats_aggregate  # type: ignore
from skills.md_render import md_render  # type: ignore
from packages.providers.openrouter_client import OpenRouterClient  # type: ignore
from packages.agents.interfaces import Planner, Executor, Critic, Reviser  # type: ignore
from packages.agents.registry import get as get_plugin  # type: ignore
import packages.agents.llm_agents  # noqa: F401  # 引入以触发注册
import packages.agents.rule_agents  # noqa: F401  # 引入以触发注册
from packages.config.loader import load_config  # type: ignore
from packages.agents.skills_registry import verify_skills  # type: ignore


def load_srs(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_csv_rows(path: str) -> List[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def sample_csv_text(csv_path: str, max_rows: int = 80) -> str:
    """读取 CSV，返回前 max_rows 行(含表头)的原始文本，控制 token 规模。"""
    lines: List[str] = []
    with open(csv_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            lines.append(line.rstrip("\n"))
            if i >= max_rows:
                break
    return "\n".join(lines)


def build_plugins(planner: str, executor: str, critic: str, reviser: str, need_client: bool, cfg: Dict[str, Any]) -> Tuple[Planner, Executor, Critic, Reviser, dict]:
    client = None
    if need_client:
        llm_cfg = cfg.get("llm", {})
        client = OpenRouterClient(
            base_url=llm_cfg.get("base_url"),
            model=llm_cfg.get("model"),
        )
    ctx = {"client": client}
    PlannerCls = get_plugin("planner", planner)
    ExecutorCls = get_plugin("executor", executor)
    CriticCls = get_plugin("critic", critic)
    ReviserCls = get_plugin("reviser", reviser)
    # 根据是否需要 client 进行构造
    p = PlannerCls(client) if client and planner == "llm" else PlannerCls()
    e = ExecutorCls(client) if client and executor == "llm" else ExecutorCls()
    c = CriticCls(client) if client and critic == "llm" else CriticCls()
    r = ReviserCls(client) if client and reviser == "llm" else ReviserCls()
    return p, e, c, r, ctx


def execute_local_plan(plan: Dict[str, Any], rows: List[Dict[str, str]]) -> Tuple[str, Dict[str, Any]]:
    """使用内置 skills 执行计划，产生 Markdown 与执行指标(离线、可复现)。"""
    t0 = time.time()
    artifacts: Dict[str, Any] = {}

    # 默认参数兜底
    steps = plan.get("steps", [])
    step_by_id = {s.get("id"): s for s in steps if isinstance(s, dict)}

    # s1: 清洗
    s1 = step_by_id.get("s1") or {"op": "csv.clean", "args": {"drop_empty": True}}
    cleaned = csv_clean(rows, **(s1.get("args", {}) or {}))
    artifacts["cleaned_count"] = len(cleaned)

    # s2: 聚合
    s2 = step_by_id.get("s2") or {"op": "stats.aggregate", "args": {"top_n": 10, "score_by": "views", "title_field": "title"}}
    agg = stats_aggregate(cleaned, **(s2.get("args", {}) or {}))
    artifacts.update({
        "top_n": (s2.get("args", {}) or {}).get("top_n"),
        "score_by": (s2.get("args", {}) or {}).get("score_by"),
        "title_field": (s2.get("args", {}) or {}).get("title_field"),
        "found_top": len(agg.get("top", [])),
    })

    # s3: 渲染
    s3 = step_by_id.get("s3") or {"op": "md.render", "args": {"include_table": True}}
    md_text = md_render(summary=agg.get("summary", {}), top=agg.get("top", []), **(s3.get("args", {}) or {}))

    latency_ms = int((time.time() - t0) * 1000)
    return md_text, {"artifacts": artifacts, "metrics": {"latency_ms": latency_ms, "retries": 0, "cost": 0.0}}


def write_replay_script(trace_id: str, srs: Dict[str, Any], plan: Dict[str, Any], out_path: str) -> str:
    """生成可重复运行的离线脚本 episodes/<trace_id>_replay.py。"""
    script_path = os.path.join("episodes", f"{trace_id}_replay.py")
    plan_src = json.dumps(plan, ensure_ascii=False)
    srs_src = json.dumps({"inputs": srs.get("inputs", {})}, ensure_ascii=False)
    content = f"""# -*- coding: utf-8 -*-
from typing import Dict, Any, List
import csv, json
from skills.csv_clean import csv_clean
from skills.stats_aggregate import stats_aggregate
from skills.md_render import md_render

PLAN: Dict[str, Any] = json.loads(r'''{plan_src}''')
SRS: Dict[str, Any] = json.loads(r'''{srs_src}''')
OUT_PATH = r"{out_path}"

def _read_csv_rows(path: str) -> List[Dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def main():
    rows = _read_csv_rows(SRS["inputs"]["csv_path"])  # type: ignore
    steps = PLAN.get("steps", [])
    by_id = {{s.get("id"): s for s in steps if isinstance(s, dict)}}
    s1 = by_id.get("s1") or {{"op": "csv.clean", "args": {{"drop_empty": True}}}}
    cleaned = csv_clean(rows, **(s1.get("args", {{}}) or {{}}))
    s2 = by_id.get("s2") or {{"op": "stats.aggregate", "args": {{"top_n": 10, "score_by": "views", "title_field": "title"}}}}
    agg = stats_aggregate(cleaned, **(s2.get("args", {{}}) or {{}}))
    s3 = by_id.get("s3") or {{"op": "md.render", "args": {{"include_table": True}}}}
    md_text = md_render(agg.get("summary", {{}}), agg.get("top", []), **(s3.get("args", {{}}) or {{}}))
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(md_text)
    print(json.dumps({{"status":"ok","out":OUT_PATH}}, ensure_ascii=False))

if __name__ == "__main__":
    main()
"""
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(content)
    return script_path


# llm_* 函数已由 LLM 插件实现，保留本地技能执行与脚本生成


def ensure_dirs():
    for d in ("episodes", "reports"):
        os.makedirs(d, exist_ok=True)


def cmd_run(args: argparse.Namespace) -> None:
    ensure_dirs()

    # 加载配置
    cfg = load_config(getattr(args, "config", None))

    srs = load_srs(args.srs)
    if args.data:
        srs.setdefault("inputs", {})["csv_path"] = args.data
    out_path = args.out

    # 选择 outbox 后端
    outbox_backend = cfg.get("outbox", {}).get("backend", "json")
    if outbox_backend == "sqlite":
        bus = OutboxSQLite(cfg.get("outbox", {}).get("sqlite_path", "episodes.db"))
    else:
        bus = OutboxBus(episodes_dir="episodes")
    trace_id = bus.new_trace(goal=srs.get("goal", "weekly-report"))
    guardian = BudgetGuardian(budget_usd=float(srs.get("budget_usd", 0.0) or 0.0), timeout_ms=120000)

    # 记录感知
    bus.append("sense.srs_loaded", {"srs": srs})
    max_rows = int(cfg.get("llm", {}).get("max_rows", 80))
    csv_excerpt = sample_csv_text(srs["inputs"]["csv_path"], max_rows=max_rows)  # type: ignore
    rows = read_csv_rows(srs["inputs"]["csv_path"])  # type: ignore

    # 构建插件
    planner_name = args.planner or cfg.get("defaults", {}).get("planner", "llm")
    executor_name = args.executor or cfg.get("defaults", {}).get("executor", "llm")
    critic_name = args.critic or cfg.get("defaults", {}).get("critic", "llm")
    reviser_name = args.reviser or cfg.get("defaults", {}).get("reviser", "llm")

    need_client = (planner_name == "llm" or executor_name == "llm" or critic_name == "llm" or reviser_name == "llm")
    planner, executor, critic, reviser, _ctx = build_plugins(planner_name, executor_name, critic_name, reviser_name, need_client, cfg)
    ctx = {"csv_excerpt": csv_excerpt, "rows": rows}

    print(f"[PLAN] 使用 {planner.name()} 生成计划…")
    ctx_plan = dict(ctx)
    ctx_plan.update({
        "temperature": cfg.get("llm", {}).get("temperature", {}).get("planner", 0.2),
        "retries": cfg.get("llm", {}).get("retries", 0),
        "prompts_dir": cfg.get("prompts", {}).get("dir", "packages/prompts"),
    })
    plan = planner.plan(srs, ctx_plan)
    payload = {"plan": plan, "impl": planner.name()}
    if hasattr(planner, "last_meta"):
        payload["llm"] = getattr(planner, "last_meta")
    bus.append("plan.generated", payload)

    guardian.check()
    print(f"[EXEC] 使用 {executor.name()} 执行…")
    # 风险：执行本地技能时校验签名
    if executor_name == "skills" and cfg.get("risk", {}).get("check_skills", True):
        verify_skills(strict=True)
    ctx_exec = dict(ctx)
    ctx_exec.update({
        "temperature": cfg.get("llm", {}).get("temperature", {}).get("executor", 0.6),
        "retries": cfg.get("llm", {}).get("retries", 0),
        "prompts_dir": cfg.get("prompts", {}).get("dir", "packages/prompts"),
    })
    md_text, exec_ctx = executor.execute(srs, plan, ctx_exec)
    bus.append("exec.output", {"impl": executor.name(), **exec_ctx})

    guardian.check()
    print(f"[REVIEW] 使用 {critic.name()} 打分…")
    ctx_review = {
        "temperature": cfg.get("llm", {}).get("temperature", {}).get("critic", 0.0),
        "retries": cfg.get("llm", {}).get("retries", 0),
        "prompts_dir": cfg.get("prompts", {}).get("dir", "packages/prompts"),
    }
    rv = critic.review(srs, md_text, ctx_review)
    print(f"[REVIEW] score={rv.get('score')} pass={rv.get('pass')} reasons={rv.get('reasons')}")
    pay = dict(rv)
    if hasattr(critic, "last_meta"):
        pay["llm"] = getattr(critic, "last_meta")
    bus.append("review.scored", pay)

    # 一次修补
    if not bool(rv.get("pass")):
        print(f"[PATCH] 使用 {reviser.name()} 修订报告…")
        ctx_patch = {
            "temperature": cfg.get("llm", {}).get("temperature", {}).get("reviser", 0.4),
            "retries": cfg.get("llm", {}).get("retries", 0),
            "prompts_dir": cfg.get("prompts", {}).get("dir", "packages/prompts"),
        }
        revised = reviser.revise(srs, md_text, rv, ctx_patch)
        patch_payload = {"impl": reviser.name()}
        if hasattr(reviser, "last_meta"):
            patch_payload["llm"] = getattr(reviser, "last_meta")
        bus.append("patch.revised", patch_payload)
        md_text = revised
        rv = critic.review(srs, md_text, ctx_review)
        print(f"[REVIEW] after patch score={rv.get('score')} pass={rv.get('pass')}")
        pay2 = dict(rv)
        if hasattr(critic, "last_meta"):
            pay2["llm"] = getattr(critic, "last_meta")
        bus.append("review.scored", pay2)

    # Write output
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md_text)

    status = "success" if rv["pass"] else "failed"
    bus.finalize(status=status, artifacts={"output_path": out_path, "plan": plan})  # 写入 Episode 文件

    # 如需生成可重复执行的离线脚本
    if getattr(args, "emit_script", False):
        script_path = write_replay_script(trace_id, srs, plan, out_path)
        bus.append("artifact.script", {"path": script_path})

    print(json.dumps({
        "trace_id": trace_id,
        "status": status,
        "score": rv["score"],
        "reasons": rv.get("reasons", []),
        "out": out_path
    }, ensure_ascii=False))


def cmd_replay(args: argparse.Namespace) -> None:
    ensure_dirs()
    # 列出最近的 trace
    if getattr(args, "list", False):
        eps_dir = "episodes"
        if not os.path.isdir(eps_dir):
            print("episodes 目录不存在", file=sys.stderr)
            sys.exit(1)
        files = [f for f in os.listdir(eps_dir) if f.endswith(".json")]
        files.sort(key=lambda f: os.path.getmtime(os.path.join(eps_dir, f)), reverse=True)
        for f in files[:20]:
            ts = os.path.getmtime(os.path.join(eps_dir, f))
            print(f)
        return
    # 解析 trace_id：优先 --trace，其次 --last
    trace_id: str
    if getattr(args, "trace", None):
        # 支持前缀匹配
        prefix = args.trace  # type: ignore
        eps_dir = "episodes"
        cand = []
        if os.path.isdir(eps_dir):
            for f in os.listdir(eps_dir):
                if f.endswith(".json") and f.startswith(prefix):
                    cand.append(f)
        if not cand:
            trace_id = prefix
        elif len(cand) == 1:
            trace_id = cand[0][:-5]
        else:
            print("匹配到多条，请更精确指定前缀：\n" + "\n".join(cand), file=sys.stderr)
            sys.exit(2)
    elif getattr(args, "last", False):
        # 选择 episodes 目录下按 mtime 最新的 json 文件
        eps_dir = "episodes"
        if not os.path.isdir(eps_dir):
            print("episodes 目录不存在", file=sys.stderr)
            sys.exit(1)
        files = [f for f in os.listdir(eps_dir) if f.endswith(".json")]
        if not files:
            print("episodes 目录为空", file=sys.stderr)
            sys.exit(1)
        latest = max(files, key=lambda f: os.path.getmtime(os.path.join(eps_dir, f)))
        trace_id = latest[:-5]  # 去掉 .json 后缀
    else:
        print("请提供 --trace <id> 或使用 --last", file=sys.stderr)
        sys.exit(2)

    trace_file = os.path.join("episodes", f"{trace_id}.json")
    if not os.path.exists(trace_file):
        print(f"trace not found: {trace_file}", file=sys.stderr)
        sys.exit(1)
    with open(trace_file, "r", encoding="utf-8") as f:
        episode = json.load(f)

    if getattr(args, "rerun", False):
        # 读取计划与输入，使用本地 skills 再跑一次，产出到原 output_path
        srs = episode.get("sense", {})
        plan = episode.get("plan", {})
        out_path = (episode.get("artifacts", {}) or {}).get("output_path", "reports/replay.md")
        rows = read_csv_rows(srs["inputs"]["csv_path"])  # type: ignore
        md_text, _ctx = execute_local_plan(plan, rows)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(md_text)
        print(json.dumps({"trace_id": trace_id, "status": "rerun_ok", "out": out_path}, ensure_ascii=False))
    else:
        # 默认使用已保存的评审结论，避免重走网络
        saved_reviews = [ev for ev in episode.get("events", []) if ev.get("type") == "review.scored"]
        last_rv = saved_reviews[-1]["payload"] if saved_reviews else {"pass": False, "score": 0.0, "reasons": ["no_saved_review"]}
        print(json.dumps({"trace_id": trace_id, **last_rv}, ensure_ascii=False))


def cmd_scoreboard(args: argparse.Namespace) -> None:
    cfg = load_config(None)
    eps_dir = args.episodes_dir or cfg.get("scoreboard", {}).get("episodes_dir", "episodes")
    if not os.path.isdir(eps_dir):
        print(f"episodes 目录不存在: {eps_dir}", file=sys.stderr)
        sys.exit(1)
    import csv as _csv
    rows = []
    for fn in os.listdir(eps_dir):
        if not fn.endswith(".json"):
            continue
        p = os.path.join(eps_dir, fn)
        try:
            with open(p, "r", encoding="utf-8") as f:
                ep = json.load(f)
        except Exception:
            continue
        trace_id = ep.get("trace_id")
        goal = ep.get("goal")
        status = ep.get("status")
        latency = ep.get("latency_ms")
        # last review
        last_review = None
        for ev in reversed(ep.get("events", [])):
            if ev.get("type") == "review.scored":
                last_review = ev.get("payload")
                break
        score = (last_review or {}).get("score")
        passed = (last_review or {}).get("pass")
        # llm meta if any
        model = None
        provider = None
        if last_review and isinstance(last_review.get("llm"), dict):
            model = last_review["llm"].get("model")
            provider = last_review["llm"].get("provider")
        rows.append({
            "trace_id": trace_id,
            "goal": goal,
            "status": status,
            "latency_ms": latency,
            "score": score,
            "pass": passed,
            "model": model,
            "provider": provider,
        })
    # 尝试提取时间戳（使用最后一次 review.scored 的 ts；否则文件 mtime）
    def _get_ts(path_json: str, ep: Dict[str, Any]) -> str:
        for ev in reversed(ep.get("events", [])):
            if ev.get("type") == "review.scored" and ev.get("ts"):
                return ev.get("ts")
        # fallback: mtime -> ISO8601Z
        import datetime, os as _os
        t = _os.path.getmtime(path_json)
        return datetime.datetime.utcfromtimestamp(t).isoformat() + "Z"

    if args.fmt == "csv":
        # export csv
        with open(args.out, "w", encoding="utf-8", newline="") as f:
            w = _csv.DictWriter(f, fieldnames=["trace_id","goal","status","latency_ms","score","pass","model","provider","ts"])
            w.writeheader()
            for r in rows:
                # locate episode json for ts
                ep_path = os.path.join(eps_dir, f"{r.get('trace_id')}.json")
                r["ts"] = _get_ts(ep_path, {}) if not os.path.exists(ep_path) else _get_ts(ep_path, json.load(open(ep_path)))
                w.writerow(r)
        print(f"scoreboard exported: {args.out} ({len(rows)} rows)")
    elif args.fmt == "sqlite":
        import sqlite3
        conn = sqlite3.connect(args.out)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS scores (trace_id TEXT PRIMARY KEY, goal TEXT, status TEXT, latency_ms INTEGER, score REAL, pass INTEGER, model TEXT, provider TEXT, ts TEXT)")
        # upsert rows
        for r in rows:
            ep_path = os.path.join(eps_dir, f"{r.get('trace_id')}.json")
            ts_val = _get_ts(ep_path, {}) if not os.path.exists(ep_path) else _get_ts(ep_path, json.load(open(ep_path)))
            cur.execute(
                "INSERT INTO scores(trace_id,goal,status,latency_ms,score,pass,model,provider,ts) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(trace_id) DO UPDATE SET goal=excluded.goal,status=excluded.status,latency_ms=excluded.latency_ms,score=excluded.score,pass=excluded.pass,model=excluded.model,provider=excluded.provider,ts=excluded.ts",
                (
                    r.get("trace_id"), r.get("goal"), r.get("status"), r.get("latency_ms"), r.get("score"), 1 if r.get("pass") else 0, r.get("model"), r.get("provider"), ts_val,
                ),
            )
        conn.commit()
        conn.close()
        print(f"scoreboard exported: {args.out} (sqlite, {len(rows)} rows)")


def cmd_registry(args: argparse.Namespace) -> None:
    # 生成 skills/registry.json 的 sha256
    import hashlib, json as _json
    skills = [
        ("csv_clean", "skills/csv_clean.py"),
        ("stats_aggregate", "skills/stats_aggregate.py"),
        ("md_render", "skills/md_render.py"),
    ]
    out = {"skills": []}
    for name, path in skills:
        try:
            with open(path, "rb") as f:
                h = hashlib.sha256(f.read()).hexdigest()
        except Exception:
            h = ""
        out["skills"].append({"name": name, "path": path, "sha256": h})
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(_json.dumps(out, ensure_ascii=False, indent=2))
    print(f"registry generated: {args.out}")


def cmd_scoreboard_query(args: argparse.Namespace) -> None:
    import sqlite3
    from datetime import datetime, timedelta
    db = args.db
    if not os.path.exists(db):
        print(f"sqlite 不存在: {db}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    # 构建 where 条件
    where = []
    params = []
    # 解析窗口参数
    since = args.since
    until = args.until
    if args.window:
        now = datetime.utcnow()
        w = args.window.strip().lower()
        if w.endswith('d'):
            days = int(w[:-1] or '0')
            since = (now - timedelta(days=days)).isoformat() + 'Z'
            until = now.isoformat() + 'Z'
        elif w.endswith('h'):
            hours = int(w[:-1] or '0')
            since = (now - timedelta(hours=hours)).isoformat() + 'Z'
            until = now.isoformat() + 'Z'
    if args.model:
        where.append("model LIKE ?")
        params.append(f"%{args.model}%")
    if since:
        where.append("ts >= ?")
        params.append(since)
    if until:
        # 简单做前缀比较：直到这天 23:59:59Z
        where.append("ts <= ?")
        params.append(until)
    wsql = (" WHERE " + " AND ".join(where)) if where else ""

    # 汇总统计
    qsum = f"SELECT COUNT(1), AVG(score), AVG(pass), AVG(latency_ms) FROM scores{wsql}"
    row = cur.execute(qsum, params).fetchone()
    total = row[0] or 0
    avg_score = round(row[1], 4) if row[1] is not None else None
    pass_rate = round(row[2], 4) if row[2] is not None else None
    avg_latency = int(row[3]) if row[3] is not None else None
    print(f"总数={total}  平均分={avg_score}  通过率={pass_rate}  平均延迟ms={avg_latency}")

    # 分组统计
    if args.group_by in ("model", "provider"):
        qgrp = f"SELECT {args.group_by}, COUNT(1) c, AVG(score) s, AVG(pass) p FROM scores{wsql} GROUP BY {args.group_by} ORDER BY s DESC"
        rows = cur.execute(qgrp, params).fetchall()
        for m, c, s, p in rows:
            print(f"{args.group_by}={m}  count={c}  avg_score={round(s or 0,4)}  pass_rate={round(p or 0,4)}")

    # TopN
    qtop = f"SELECT trace_id, score, pass, model, provider, ts FROM scores{wsql} ORDER BY score DESC LIMIT ?"
    rows = cur.execute(qtop, params + [int(args.topN)]).fetchall()
    print("TopN:")
    for tr, sc, pa, m, pr, ts in rows:
        print(f"- {tr} score={sc} pass={pa} model={m} provider={pr} ts={ts}")
    conn.close()

    # HTML 报表（可选）
    if args.html_out:
        # 准备分组摘要（模型与提供商）
        import sqlite3 as _sqlite3
        conn = _sqlite3.connect(args.db)
        _rows_model = conn.execute(f"SELECT model, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY model ORDER BY AVG(score) DESC", params).fetchall()
        _rows_provider = conn.execute(f"SELECT provider, COUNT(1), AVG(score), AVG(pass) FROM scores{wsql} GROUP BY provider ORDER BY AVG(score) DESC", params).fetchall()
        conn.close()

        def _tbl(title: str, headers: list[str], data: list[tuple]):
            H = "".join(f"<th>{h}</th>" for h in headers)
            R = []
            for row in data:
                R.append("".join(f"<td>{(round(x,4) if isinstance(x,float) else x)}</td>" for x in row))
            return [f"<h4>{title}</h4>", f"<table><thead><tr>{H}</tr></thead><tbody>"] + [f"<tr>{r}</tr>" for r in R] + ["</tbody></table>"]

        html = [
            "<html><head><meta charset='utf-8'><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head><body>",
            f"<h3>Scoreboard {since or ''} ~ {until or ''}</h3>",
            f"<p>Total={total} AvgScore={avg_score} PassRate={pass_rate} AvgLatency={avg_latency}ms</p>",
        ]
        html += _tbl("按模型汇总", ["model", "count", "avg_score", "pass_rate"], _rows_model)
        html += _tbl("按提供商汇总", ["provider", "count", "avg_score", "pass_rate"], _rows_provider)
        html += ["<h4>TopN</h4>", "<table><thead><tr><th>trace_id</th><th>score</th><th>pass</th><th>model</th><th>provider</th><th>ts</th></tr></thead><tbody>"]
        for tr, sc, pa, m, pr, ts in rows:
            html.append(f"<tr><td>{tr}</td><td>{sc}</td><td>{pa}</td><td>{m}</td><td>{pr}</td><td>{ts}</td></tr>")
        html.append("</tbody></table>")
        html.append("</body></html>")
        with open(args.html_out, "w", encoding="utf-8") as f:
            f.write("\n".join(html))
        print(f"html exported: {args.html_out}")


def cmd_episodes(args: argparse.Namespace) -> None:
    cfg = load_config(getattr(args, "config", None))
    backend = cfg.get("outbox", {}).get("backend", "json")
    if args.action == "list":
        if backend == "sqlite":
            import sqlite3
            db = cfg.get("outbox", {}).get("sqlite_path", "episodes.db")
            if not os.path.exists(db):
                print(f"sqlite 不存在: {db}", file=sys.stderr)
                sys.exit(1)
            conn = sqlite3.connect(db)
            rows = conn.execute("SELECT trace_id, goal, status, created_ts FROM episodes ORDER BY created_ts DESC LIMIT 50").fetchall()
            for tr, goal, st, ts in rows:
                print(f"{tr}  {st}  {ts}  {goal}")
            conn.close()
        else:
            eps_dir = "episodes"
            if not os.path.isdir(eps_dir):
                print("episodes 目录不存在", file=sys.stderr)
                sys.exit(1)
            files = [f for f in os.listdir(eps_dir) if f.endswith(".json")]
            files.sort(key=lambda f: os.path.getmtime(os.path.join(eps_dir, f)), reverse=True)
            for f in files[:50]:
                print(f)
    elif args.action == "events":
        # 解析 trace 前缀
        prefix = args.trace or ""
        if backend == "sqlite":
            import sqlite3, json as _json
            db = cfg.get("outbox", {}).get("sqlite_path", "episodes.db")
            if not os.path.exists(db):
                print(f"sqlite 不存在: {db}", file=sys.stderr)
                sys.exit(1)
            conn = sqlite3.connect(db)
            # 尝试前缀匹配
            cand = conn.execute("SELECT trace_id FROM episodes WHERE trace_id LIKE ? ORDER BY created_ts DESC", (prefix + '%',)).fetchall()
            if not cand:
                print(f"未找到 trace: {prefix}", file=sys.stderr)
                sys.exit(1)
            if len(cand) > 1:
                print("匹配到多条，请更精确指定前缀：")
                for (tr,) in cand[:10]:
                    print(tr)
                sys.exit(2)
            trace_id = cand[0][0]
            rows = conn.execute("SELECT msg_id, ts, type, payload_json FROM events WHERE trace_id=? ORDER BY id ASC", (trace_id,)).fetchall()
            for mid, ts, tp, pj in rows:
                print(f"{ts} {mid} {tp}")
                if args.full:
                    print(pj)
            conn.close()
        else:
            eps_dir = "episodes"
            files = [f for f in os.listdir(eps_dir) if f.endswith(".json") and f.startswith(prefix)]
            if not files:
                print(f"未找到 trace: {prefix}", file=sys.stderr)
                sys.exit(1)
            if len(files) > 1:
                print("匹配到多条，请更精确指定前缀：")
                for f in files[:10]:
                    print(f)
                sys.exit(2)
            import json as _json
            path = os.path.join(eps_dir, files[0])
            with open(path, "r", encoding="utf-8") as f:
                ep = _json.load(f)
            for ev in ep.get("events", []):
                ts = ev.get("ts")
                mid = ev.get("msg_id", "")
                tp = ev.get("type")
                print(f"{ts} {mid} {tp}")
                if args.full:
                    print(_json.dumps(ev.get("payload", {}), ensure_ascii=False))


def cmd_replay_sqlite(args: argparse.Namespace) -> None:
    import sqlite3, json as _json
    db = args.db
    if not os.path.exists(db):
        print(f"sqlite 不存在: {db}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(db)
    cand = conn.execute("SELECT trace_id FROM episodes WHERE trace_id LIKE ? ORDER BY created_ts DESC", (args.trace + '%',)).fetchall()
    if not cand:
        print(f"未找到 trace: {args.trace}", file=sys.stderr)
        sys.exit(1)
    if len(cand) > 1:
        print("匹配到多条，请更精确指定前缀：")
        for (tr,) in cand[:10]:
            print(tr)
        sys.exit(2)
    trace_id = cand[0][0]
    row = conn.execute("SELECT sense_json, plan_json, artifacts_json FROM episodes WHERE trace_id=?", (trace_id,)).fetchone()
    if not row:
        print("未找到 episode 记录", file=sys.stderr)
        sys.exit(1)
    sense = _json.loads(row[0]) if row[0] else {}
    plan = _json.loads(row[1]) if row[1] else {}
    artifacts = _json.loads(row[2]) if row[2] else {}
    if not args.rerun:
        # 输出保存结果（复用 review.scored 最后一次）
        ev = conn.execute("SELECT payload_json FROM events WHERE trace_id=? AND type=? ORDER BY id DESC LIMIT 1", (trace_id, "review.scored")).fetchone()
        if not ev:
            print(f"{trace_id} 无 review.scored 事件", file=sys.stderr)
            sys.exit(1)
        rv = _json.loads(ev[0])
        print(_json.dumps({"trace_id": trace_id, **rv}, ensure_ascii=False))
        return
    # 复跑（本地 skills）
    srs = sense or {}
    if not srs or "inputs" not in srs:
        print("episode 无 SRS/inputs，无法复跑", file=sys.stderr)
        sys.exit(1)
    rows = read_csv_rows(srs["inputs"]["csv_path"])  # type: ignore
    md_text, _ctx = execute_local_plan(plan, rows)
    out_path = args.out or (artifacts.get("output_path") if isinstance(artifacts, dict) else None) or "reports/replay_sqlite.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md_text)
    print(_json.dumps({"trace_id": trace_id, "status": "rerun_ok", "out": out_path}, ensure_ascii=False))
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="AgentOS minimal offline loop")
    sub = parser.add_subparsers(required=True)

    p_run = sub.add_parser("run", help="Run minimal loop")
    p_run.add_argument("--srs", required=True, help="SRS json path")
    p_run.add_argument("--data", required=True, help="CSV data path")
    p_run.add_argument("--out", required=True, help="Output markdown path")
    p_run.add_argument("--emit-script", action="store_true", help="生成可重复运行的离线脚本到 episodes/<trace>_replay.py")
    p_run.add_argument("--planner", choices=["llm", "rules"], default=None, help="规划实现选择(未指定则读 config.json)")
    p_run.add_argument("--executor", choices=["llm", "skills"], default=None, help="执行实现选择(未指定则读 config.json)")
    p_run.add_argument("--critic", choices=["llm", "rules"], default=None, help="评审实现选择(未指定则读 config.json)")
    p_run.add_argument("--reviser", choices=["llm", "rules"], default=None, help="修补实现选择(未指定则读 config.json)")
    p_run.add_argument("--config", help="配置文件路径，默认 ./config.json")
    p_run.set_defaults(func=cmd_run)

    p_replay = sub.add_parser("replay", help="Replay saved result (by --trace or --last)")
    p_replay.add_argument("--trace", required=False, help="trace id，例如 t-xxxx")
    p_replay.add_argument("--last", action="store_true", help="使用最新的 trace 进行回放")
    p_replay.add_argument("--rerun", action="store_true", help="根据保存的 plan 使用本地 skills 重新生成报告")
    p_replay.add_argument("--list", action="store_true", help="列出最近的 trace 文件")
    p_replay.add_argument("--config", help="配置文件路径，默认 ./config.json")
    p_replay.set_defaults(func=cmd_replay)

    # 评分导出
    p_score = sub.add_parser("scoreboard", help="导出得分视图")
    p_score.add_argument("export", nargs='?', default="export")
    p_score.add_argument("--fmt", choices=["csv","sqlite"], default="csv")
    p_score.add_argument("--out", default="scores.csv")
    p_score.add_argument("--episodes-dir", default=None, help="episodes 目录，默认读 config.json")
    p_score.set_defaults(func=cmd_scoreboard)

    # 技能注册表
    p_reg = sub.add_parser("registry", help="技能注册表操作")
    p_reg.add_argument("gen", nargs='?', default="gen")
    p_reg.add_argument("--out", default="skills/registry.json")
    p_reg.set_defaults(func=cmd_registry)

    # Scoreboard 查询
    p_scoreq = sub.add_parser("scoreboard-query", help="从 sqlite 中查询统计")
    p_scoreq.add_argument("--db", default="scores.sqlite", help="scoreboard sqlite 文件")
    p_scoreq.add_argument("--model", default=None, help="按模型名过滤(子串匹配)")
    p_scoreq.add_argument("--since", default=None, help="起始时间(ISO8601, 仅前缀如 2025-09-13)")
    p_scoreq.add_argument("--until", default=None, help="结束时间(ISO8601, 含当日)")
    p_scoreq.add_argument("--topN", type=int, default=10, help="输出前N条最高得分")
    p_scoreq.add_argument("--group-by", choices=["model", "provider", "none"], default="none", help="按维度分组统计")
    p_scoreq.add_argument("--window", default=None, help="窗口期，如 7d/24h，若提供将覆盖 --since/--until")
    p_scoreq.add_argument("--html-out", default=None, help="导出 HTML 报表路径")
    p_scoreq.set_defaults(func=cmd_scoreboard_query)

    # Episodes 查询
    p_eps = sub.add_parser("episodes", help="查看 episodes 列表与事件")
    p_eps.add_argument("action", choices=["list", "events"], help="操作: list 或 events")
    p_eps.add_argument("--trace", required=False, help="trace id 前缀(用于 events)")
    p_eps.add_argument("--config", help="配置文件路径，默认 ./config.json")
    p_eps.add_argument("--full", action="store_true", help="打印完整 payload JSON")
    p_eps.set_defaults(func=cmd_episodes)

    # 直接从 SQLite 回放/复跑
    p_rsql = sub.add_parser("replay-sqlite", help="从 SQLite Outbox 回放/复跑")
    p_rsql.add_argument("--db", default="episodes.db")
    p_rsql.add_argument("--trace", required=True, help="trace id 前缀")
    p_rsql.add_argument("--rerun", action="store_true", help="使用本地 skills 复跑并覆盖原输出")
    p_rsql.add_argument("--out", default=None, help="复跑输出路径(默认使用原 artifacts.output_path)")
    p_rsql.set_defaults(func=cmd_replay_sqlite)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
