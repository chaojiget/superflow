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
from kernel.guardian import BudgetGuardian  # type: ignore
from skills.csv_clean import csv_clean  # type: ignore
from skills.stats_aggregate import stats_aggregate  # type: ignore
from skills.md_render import md_render  # type: ignore
from packages.providers.openrouter_client import OpenRouterClient  # type: ignore
from packages.agents.interfaces import Planner, Executor, Critic, Reviser  # type: ignore
from packages.agents.registry import get as get_plugin  # type: ignore
import packages.agents.llm_agents  # noqa: F401  # 引入以触发注册
import packages.agents.rule_agents  # noqa: F401  # 引入以触发注册


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


def build_plugins(planner: str, executor: str, critic: str, reviser: str, need_client: bool) -> Tuple[Planner, Executor, Critic, Reviser, dict]:
    client = OpenRouterClient() if need_client else None
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

    srs = load_srs(args.srs)
    if args.data:
        srs.setdefault("inputs", {})["csv_path"] = args.data
    out_path = args.out

    bus = OutboxBus(episodes_dir="episodes")
    trace_id = bus.new_trace(goal=srs.get("goal", "weekly-report"))
    guardian = BudgetGuardian(budget_usd=float(srs.get("budget_usd", 0.0) or 0.0), timeout_ms=120000)

    # 记录感知
    bus.append("sense.srs_loaded", {"srs": srs})
    csv_excerpt = sample_csv_text(srs["inputs"]["csv_path"])  # type: ignore
    rows = read_csv_rows(srs["inputs"]["csv_path"])  # type: ignore

    # 构建插件
    need_client = (args.planner == "llm" or args.executor == "llm" or args.critic == "llm" or args.reviser == "llm")
    planner, executor, critic, reviser, _ctx = build_plugins(args.planner, args.executor, args.critic, args.reviser, need_client)
    ctx = {"csv_excerpt": csv_excerpt, "rows": rows}

    print(f"[PLAN] 使用 {planner.name()} 生成计划…")
    plan = planner.plan(srs, ctx)
    bus.append("plan.generated", {"plan": plan, "impl": planner.name()})

    guardian.check()
    print(f"[EXEC] 使用 {executor.name()} 执行…")
    md_text, exec_ctx = executor.execute(srs, plan, ctx)
    bus.append("exec.output", {"impl": executor.name(), **exec_ctx})

    guardian.check()
    print(f"[REVIEW] 使用 {critic.name()} 打分…")
    rv = critic.review(srs, md_text, ctx)
    print(f"[REVIEW] score={rv.get('score')} pass={rv.get('pass')} reasons={rv.get('reasons')}")
    bus.append("review.scored", rv)

    # 一次修补
    if not bool(rv.get("pass")):
        print(f"[PATCH] 使用 {reviser.name()} 修订报告…")
        revised = reviser.revise(srs, md_text, rv, ctx)
        bus.append("patch.revised", {"impl": reviser.name()})
        md_text = revised
        rv = critic.review(srs, md_text, ctx)
        print(f"[REVIEW] after patch score={rv.get('score')} pass={rv.get('pass')}")
        bus.append("review.scored", rv)

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


def main():
    parser = argparse.ArgumentParser(description="AgentOS minimal offline loop")
    sub = parser.add_subparsers(required=True)

    p_run = sub.add_parser("run", help="Run minimal loop")
    p_run.add_argument("--srs", required=True, help="SRS json path")
    p_run.add_argument("--data", required=True, help="CSV data path")
    p_run.add_argument("--out", required=True, help="Output markdown path")
    p_run.add_argument("--emit-script", action="store_true", help="生成可重复运行的离线脚本到 episodes/<trace>_replay.py")
    p_run.add_argument("--planner", choices=["llm", "rules"], default="llm", help="规划实现选择")
    p_run.add_argument("--executor", choices=["llm", "skills"], default="llm", help="执行实现选择")
    p_run.add_argument("--critic", choices=["llm", "rules"], default="llm", help="评审实现选择")
    p_run.add_argument("--reviser", choices=["llm", "rules"], default="llm", help="修补实现选择")
    p_run.set_defaults(func=cmd_run)

    p_replay = sub.add_parser("replay", help="Replay saved result (by --trace or --last)")
    p_replay.add_argument("--trace", required=False, help="trace id，例如 t-xxxx")
    p_replay.add_argument("--last", action="store_true", help="使用最新的 trace 进行回放")
    p_replay.add_argument("--rerun", action="store_true", help="根据保存的 plan 使用本地 skills 重新生成报告")
    p_replay.add_argument("--list", action="store_true", help="列出最近的 trace 文件")
    p_replay.set_defaults(func=cmd_replay)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
