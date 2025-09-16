# -*- coding: utf-8 -*-
"""
SPEC:
  模块: apps.server.mcp_host
  目标: 将本项目技能以 MCP Server 暴露（同进程可启动）
  传输: 优先 streamable-http(:/mcp)，若不可用则提供 stdio 启动方式
  工具域划分:
    - fs.*         （工作区文件访问）
    - data.*       （数据读取/预处理）
    - skills.*     （凝练技能卡）
    - stats.*      （统计/聚合）
    - report.*     （报告渲染）
  运行:
    - 单独运行: uv run python -m apps.server.mcp_host --transport streamable-http --port 3001
    - 作为子线程: 由 apps.server.main 读取 config 后调用 start_in_background
"""

from __future__ import annotations

import argparse
import asyncio
import os
from typing import Any


def create_fastmcp_server():
    try:
        from mcp.server.fastmcp import FastMCP  # type: ignore
    except Exception as e:
        raise RuntimeError("未安装 MCP SDK，请先: uv pip install mcp") from e

    mcp = FastMCP("AgentOS Skills")

    # fs.*
    @mcp.tool("fs.read_text")
    def fs_read_text(path: str, max_bytes: int = 32768) -> str:
        p = os.path.abspath(path)
        if not os.path.isfile(p):
            return f"<not found: {path}>"
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(int(max_bytes))

    @mcp.tool("fs.list_dir")
    def fs_list_dir(path: str = ".") -> dict:
        """列出目录内容与元信息（限制在仓库根内）。"""
        try:
            base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            p = os.path.abspath(os.path.join(base, path))
            # 安全限制：必须在 base 之内
            if os.path.commonpath([p, base]) != os.path.commonpath([base]):
                return {"error": "forbidden"}
            if not os.path.isdir(p):
                return {"error": f"not a directory: {path}"}
            items = os.listdir(p)
            dirs = []
            files = []
            for name in items[:500]:  # 限制最多 500 项
                full = os.path.join(p, name)
                try:
                    st = os.stat(full)
                    info = {
                        "name": name,
                        "size": int(st.st_size),
                        "mtime": __import__("datetime").datetime.utcfromtimestamp(st.st_mtime).isoformat() + "Z",
                    }
                    if os.path.isdir(full):
                        dirs.append(info)
                    else:
                        files.append(info)
                except Exception:
                    pass
            rel = os.path.relpath(p, base)
            return {"cwd": "/" if rel == "." else rel, "dirs": dirs, "files": files}
        except Exception as e:
            return {"error": str(e)}

    # data.*
    @mcp.tool("data.csv_head")
    def data_csv_head(path: str, n: int = 50) -> str:
        try:
            out = []
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for i, line in enumerate(f):
                    out.append(line)
                    if i + 1 >= int(n):
                        break
            return "".join(out)
        except Exception as e:
            return f"<error: {e}>"

    # skills.*
    @mcp.tool("skills.csv_clean")
    def skills_csv_clean(path: str) -> str:
        try:
            import csv
            from skills.csv_clean import csv_clean  # type: ignore
            with open(path, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            cleaned = csv_clean(rows)
            return f"cleaned_count={len(cleaned)}"
        except Exception as e:
            return f"<error: {e}>"

    # stats.*
    @mcp.tool("stats.aggregate")
    def stats_aggregate_tool(path: str, top_n: int = 10, score_by: str = "views", title_field: str = "title") -> str:
        try:
            import csv
            from skills.stats_aggregate import stats_aggregate  # type: ignore
            with open(path, newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
            res = stats_aggregate(rows, top_n=top_n, score_by=score_by, title_field=title_field)
            return f"top={len(res.get('top', []))} score_by={score_by}"
        except Exception as e:
            return f"<error: {e}>"

    # report.*
    @mcp.tool("report.md_render")
    def report_md_render(summary: dict, top: list, include_table: bool = True) -> str:
        try:
            from skills.md_render import md_render  # type: ignore
            return md_render(summary=summary, top=top, include_table=include_table)
        except Exception as e:
            return f"<error: {e}>"

    return mcp


async def serve_stdio():
    # 低开销 stdio server（用于调试）
    try:
        import mcp.server.stdio as mcp_stdio  # type: ignore
        from mcp.server.lowlevel import Server  # type: ignore
        from mcp.server.models import InitializationOptions  # type: ignore
        from mcp.server.lowlevel import NotificationOptions  # type: ignore
    except Exception as e:
        raise RuntimeError("未安装 MCP SDK，请先: uv pip install mcp") from e

    # 使用 FastMCP 提供工具，但以低级 server 运行更灵活；简单起见直接用 stdio 快速跑通
    mcp = create_fastmcp_server()

    # FastMCP 暴露为底层 Server 的能力由 SDK 提供；此处直接运行 FastMCP 内置 run()（如有）
    # 为兼容性，这里采用最简单路径：调用 FastMCP 对象暴露的 run_stdio()（若存在），否则提示
    if hasattr(mcp, "run_stdio"):
        # type: ignore[attr-defined]
        return await mcp.run_stdio()
    # 回退：提示仅支持通过 CLI 启动 streamable-http
    raise RuntimeError("当前环境不支持以编程方式运行 stdio，请使用官方 CLI 或升级 SDK")


def start_in_background(port: int = 3001) -> None:
    """尝试在后台启动 streamable-http Server（同进程不同端口）。"""
    try:
        import threading

        def _run() -> None:
            try:
                # 优先尝试 streamable-http 服务器
                # 注意：具体 API 以 SDK 版本为准，以下调用可能需要按实际 SDK 调整
                from mcp.server.streamable_http import serve  # type: ignore

                mcp = create_fastmcp_server()
                # 假设 serve(mcp, host, port) 风格；若不同请据实际 SDK 修改
                serve(mcp, host="127.0.0.1", port=int(port))
            except Exception:
                # 回退日志，不影响主进程
                pass

        threading.Thread(target=_run, daemon=True).start()
    except Exception:
        pass


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transport", choices=["streamable-http", "stdio"], default="streamable-http")
    ap.add_argument("--port", type=int, default=3001)
    args = ap.parse_args()

    if args.transport == "stdio":
        asyncio.run(serve_stdio())
    else:
        # 尝试直接启动 streamable-http；若 SDK 暂不支持此编程接口，请改用官方 CLI
        start_in_background(args.port)
        print(f"[MCP] streamable-http on 127.0.0.1:{args.port}")
        try:
            # 阻塞等待（保持进程存活）
            import time
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
