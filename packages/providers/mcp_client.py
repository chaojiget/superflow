# -*- coding: utf-8 -*-
"""
SPEC:
  模块: providers.mcp_client
  目标: 以最小封装方式接入 Model Context Protocol (MCP) 客户端，用于列举/调用工具。
  接口:
    - MCPClient(cfg).list_tools(server_id) -> list[dict]
    - MCPClient(cfg).call_tool(server_id, tool, args) -> dict
  兼容: 若未安装 mcp 依赖，提供清晰错误并安全降级（不崩溃）。
  传输: 支持 stdio(本地进程) 与 streamable-http(HTTP)
  配置: config.json -> { "mcp": { "servers": [ {"id":"demo","transport":"stdio","command":"uv","args":["run","mcp-simple-tool"]} ] } }
  参考: modelcontextprotocol/python-sdk — ClientSession, stdio_client, streamablehttp_client
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


class MCPNotAvailable(RuntimeError):
    pass


@dataclass
class MCPServerConfig:
    id: str
    transport: str  # "stdio" | "streamable-http"
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    url: Optional[str] = None  # for streamable-http


def _require_mcp() -> Tuple[Any, Any, Any]:
    """延迟导入 mcp.* 依赖，缺失时抛出友好错误。"""
    try:
        # types/ClientSession 供静态类型提示使用
        from mcp.client.session import ClientSession  # type: ignore
        from mcp.client.stdio import StdioServerParameters, stdio_client  # type: ignore
        from mcp.client.streamable_http import streamablehttp_client  # type: ignore
        return ClientSession, (StdioServerParameters, stdio_client), streamablehttp_client
    except Exception as e:  # pragma: no cover - 环境缺依赖时
        raise MCPNotAvailable(
            "未安装 'mcp' Python SDK，请先安装：uv pip install model-context-protocol 或 mcp"
        ) from e


class MCPClient:
    def __init__(self, cfg: Dict[str, Any]):
        self.cfg = cfg or {}
        # 预解析 server 列表
        self.servers: Dict[str, MCPServerConfig] = {}
        for s in (self.cfg.get("mcp", {}) or {}).get("servers", []) or []:
            if not isinstance(s, dict) or not s.get("id"):
                continue
            sc = MCPServerConfig(
                id=str(s["id"]),
                transport=str(s.get("transport", "streamable-http")),
                command=s.get("command"),
                args=s.get("args"),
                env=s.get("env"),
                url=s.get("url"),
            )
            self.servers[sc.id] = sc

    def _get_server(self, server_id: str) -> MCPServerConfig:
        if server_id not in self.servers:
            raise ValueError(f"未知的 MCP server_id: {server_id}")
        return self.servers[server_id]

    async def _with_session(self, sc: MCPServerConfig):  # type: ignore
        ClientSession, (StdioServerParameters, stdio_client), streamablehttp_client = _require_mcp()
        if sc.transport in ("stdio", "stdio-stdio"):
            if not sc.command:
                raise ValueError("MCP stdio 模式需要 command")
            server_params = StdioServerParameters(
                command=sc.command,
                args=list(sc.args or []),
                env={**(sc.env or {})},
            )
            return stdio_client(server_params), ClientSession
        elif sc.transport in ("streamable-http", "sse", "http"):
            if not sc.url:
                raise ValueError("MCP streamable-http 模式需要 url")
            return streamablehttp_client(sc.url), ClientSession
        else:
            raise ValueError(f"不支持的 MCP 传输: {sc.transport}")

    async def _alist_tools(self, server_id: str) -> List[Dict[str, Any]]:
        sc = self._get_server(server_id)
        client_ctx, ClientSession = await self._with_session(sc)  # type: ignore
        async with client_ctx as (read, write, *rest):
            async with ClientSession(read, write) as session:  # type: ignore
                await session.initialize()
                tools = await session.list_tools()
                out: List[Dict[str, Any]] = []
                for t in tools.tools:
                    # 兼容 SDK 的 pydantic 模型
                    name = getattr(t, "name", None) or getattr(t, "id", None)
                    desc = getattr(t, "description", None)
                    out.append({"name": name, "description": desc})
                return out

    async def _acall_tool(self, server_id: str, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        sc = self._get_server(server_id)
        client_ctx, ClientSession = await self._with_session(sc)  # type: ignore
        async with client_ctx as (read, write, *rest):
            async with ClientSession(read, write) as session:  # type: ignore
                await session.initialize()
                res = await session.call_tool(tool, arguments=args)
                # 尽可能提取文本/结构化结果
                text = None
                structured = None
                try:
                    # SDK 返回对象的一致字段：content(list[Content]) / structuredContent
                    content_list = getattr(res, "content", None) or []
                    if content_list:
                        # 仅取第一块文本
                        first = content_list[0]
                        text = getattr(first, "text", None) or getattr(first, "value", None)
                except Exception:
                    pass
                try:
                    structured = getattr(res, "structuredContent", None)
                except Exception:
                    structured = None
                return {"text": text, "structured": structured}

    async def _alist_resources(self, server_id: str) -> List[Dict[str, Any]]:
        sc = self._get_server(server_id)
        client_ctx, ClientSession = await self._with_session(sc)  # type: ignore
        async with client_ctx as (read, write, *rest):
            async with ClientSession(read, write) as session:  # type: ignore
                await session.initialize()
                resources = await session.list_resources()
                out: List[Dict[str, Any]] = []
                for r in resources.resources:
                    uri = getattr(r, "uri", None)
                    title = getattr(r, "title", None) or getattr(r, "name", None)
                    out.append({"uri": str(uri), "title": title})
                return out

    async def _aread_resource(self, server_id: str, uri: str) -> Dict[str, Any]:
        sc = self._get_server(server_id)
        client_ctx, ClientSession = await self._with_session(sc)  # type: ignore
        from mcp.types import AnyUrl  # type: ignore
        async with client_ctx as (read, write, *rest):
            async with ClientSession(read, write) as session:  # type: ignore
                await session.initialize()
                res = await session.read_resource(AnyUrl(uri))
                # 仅取第一块内容展示
                content = None
                try:
                    blk = res.contents[0]
                    content = getattr(blk, "text", None) or getattr(blk, "value", None)
                except Exception:
                    pass
                return {"uri": uri, "content": content}

    async def _alist_prompts(self, server_id: str) -> List[Dict[str, Any]]:
        sc = self._get_server(server_id)
        client_ctx, ClientSession = await self._with_session(sc)  # type: ignore
        async with client_ctx as (read, write, *rest):
            async with ClientSession(read, write) as session:  # type: ignore
                await session.initialize()
                prompts = await session.list_prompts()
                out: List[Dict[str, Any]] = []
                for p in prompts.prompts:
                    out.append({"name": getattr(p, "name", None), "description": getattr(p, "description", None)})
                return out

    async def _aget_prompt(self, server_id: str, name: str, arguments: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        sc = self._get_server(server_id)
        client_ctx, ClientSession = await self._with_session(sc)  # type: ignore
        async with client_ctx as (read, write, *rest):
            async with ClientSession(read, write) as session:  # type: ignore
                await session.initialize()
                res = await session.get_prompt(name, arguments=arguments or {})
                # 返回拼接后的消息文本（简单拼接）
                texts: List[str] = []
                try:
                    for m in res.messages:
                        blk = getattr(m, "content", None)
                        t = getattr(blk, "text", None) or getattr(blk, "value", None)
                        if t:
                            texts.append(str(t))
                except Exception:
                    pass
                return {"name": name, "text": "\n".join(texts)}

    def _run_sync(self, coro: "asyncio.Future[Any]") -> Any:  # type: ignore[name-defined]
        """在无事件循环时运行协程，存在事件循环则提示改用异步接口。"""
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(coro)
        raise RuntimeError("检测到正在运行的事件循环，请改用 list_tools_async/call_tool_async 等异步接口")

    # 对外同步包装
    def list_tools(self, server_id: str) -> List[Dict[str, Any]]:
        return self._run_sync(self._alist_tools(server_id))

    async def list_tools_async(self, server_id: str) -> List[Dict[str, Any]]:
        return await self._alist_tools(server_id)

    def call_tool(self, server_id: str, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        return self._run_sync(self._acall_tool(server_id, tool, args))

    # 在异步上下文中使用的接口（避免 asyncio.run 冲突）
    async def call_tool_async(self, server_id: str, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        return await self._acall_tool(server_id, tool, args)

    def list_resources(self, server_id: str) -> List[Dict[str, Any]]:
        return self._run_sync(self._alist_resources(server_id))

    def read_resource(self, server_id: str, uri: str) -> Dict[str, Any]:
        return self._run_sync(self._aread_resource(server_id, uri))

    def list_prompts(self, server_id: str) -> List[Dict[str, Any]]:
        return self._run_sync(self._alist_prompts(server_id))

    def get_prompt(self, server_id: str, name: str, arguments: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self._run_sync(self._aget_prompt(server_id, name, arguments))

    # 异步包装：供在已有事件循环（如 FastAPI）中调用
    async def get_prompt_async(self, server_id: str, name: str, arguments: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return await self._aget_prompt(server_id, name, arguments)
