# -*- coding: utf-8 -*-
"""
SPEC:
  模块: agents.mcp_agents
  目标: 提供基于 MCP 的执行器，实现通过 MCP 工具完成报告生成等动作。
  说明: 计划格式支持：
    - plan["mcp"] = { server: str, tool: str, args: dict }
    - 或 steps[*] 中存在 { op: "mcp.tool", server, tool, args }
  输出: 返回 (markdown_text, ctx)；若工具返回 structuredContent 则尽量提取 markdown 字段或序列化为文本。
  依赖: packages.providers.mcp_client.MCPClient
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, Tuple, List, Optional
import os

from packages.agents.interfaces import Executor
from packages.agents.registry import register
from packages.providers.openrouter_client import extract_json_block  # type: ignore


class MCPConversationAgent:
    """
    SPEC:
      类: agents.mcp_agents.MCPConversationAgent
      目标: 面向聊天的 MCP-first Agent。
        - 在调用 LLM 之前，优先从 MCP 获取可用工具与提示（prompts）以构建上下文；
        - 调用 LLM（通过 Router），若产出 action={type:'mcp_call',...} 则执行 MCP 工具并将结果附加；
        - 否则直接返回文本。
      输入: cfg(dict), session_id, history(list[{role,content}]), user_text(str)
      输出: dict{ reply, action?, mcp?, llm }
      依赖: packages.providers.router.LLMRouter, packages.providers.mcp_client.MCPClient
    """

    def __init__(self, cfg: Dict[str, Any]) -> None:
        from packages.providers.router import LLMRouter  # 延迟导入以减小依赖面
        from packages.providers.mcp_client import MCPClient

        self.cfg = cfg
        self.router = LLMRouter(cfg)
        self.mcp = MCPClient(cfg)
        ms = (cfg.get("mcp", {}) or {}).get("servers", []) or []
        self.default_server: str = (ms[0].get("id") if (isinstance(ms, list) and ms and isinstance(ms[0], dict)) else None) or "api"
        # 是否必须使用远程 MCP（不允许本地回退）
        self.require_remote: bool = bool((cfg.get("mcp", {}) or {}).get("require_remote"))
        # 是否自动连续执行多步（默认开启；可在 config.json 的 agent.auto_proceed 关闭）
        self.auto_proceed: bool = bool((cfg.get("agent", {}) or {}).get("auto_proceed", True))
        self._cache_ttl: float = float((cfg.get("mcp", {}) or {}).get("cache_ttl_sec", 180.0))
        self._tools_cache: Dict[str, Tuple[float, str]] = {}
        self._prompt_cache: Dict[Tuple[str, str], Tuple[float, str]] = {}

    @staticmethod
    def _safe_args_preview(args: Any) -> str:
        """生成脱敏后的参数摘要，避免在进度日志中泄露敏感信息。"""
        sensitive_keys = {"token", "key", "secret", "pwd", "password", "authorization", "api_key"}
        if not isinstance(args, dict):
            return "<non-dict>"
        preview: Dict[str, Any] = {}
        extra = 0
        for idx, (k, v) in enumerate(args.items()):
            if idx >= 8:
                extra = len(args) - idx
                break
            key_lower = str(k).lower()
            if any(s in key_lower for s in sensitive_keys):
                preview[str(k)] = "<redacted>"
                continue
            if isinstance(v, (int, float)) or v is None:
                preview[str(k)] = v
                continue
            vs = str(v)
            if len(vs) > 80:
                vs = vs[:77] + "..."
            preview[str(k)] = vs
        if extra > 0:
            preview["…"] = f"+{extra} keys"
        try:
            return json.dumps(preview, ensure_ascii=False)
        except Exception:
            return str(preview)

    def _cache_get(self, store: Dict[Any, Tuple[float, str]], key: Any) -> Optional[str]:
        item = store.get(key)
        if not item:
            return None
        ts, value = item
        if (time.time() - ts) > max(0.0, self._cache_ttl):
            store.pop(key, None)
            return None
        return value

    def _cache_put(self, store: Dict[Any, Tuple[float, str]], key: Any, value: str) -> None:
        store[key] = (time.time(), value)

    def _local_mcp_call(self, tool: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """在远程 MCP 不可用时的最小本地回退实现（仅覆盖常用工具）。"""
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        try:
            if tool == 'fs.read_text':
                p = os.path.join(base, str(args.get('path') or ''))
                if not os.path.isfile(p):
                    return {'text': f'<not found: {args.get("path")!r}>'}
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    return {'text': f.read(32768)}
            if tool == 'fs.list_dir':
                req = str(args.get('path') or '.')
                p = os.path.abspath(os.path.join(base, req))
                # 限制在 base 内
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
                            'mtime': __import__('datetime').datetime.utcfromtimestamp(st.st_mtime).isoformat()+'Z',
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
                p = os.path.join(base, str(args.get('path') or ''))
                if not os.path.isfile(p):
                    return {'text': f'<not found: {args.get("path")!r}>'}
                with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                    head = ''.join(list(itertools.islice(f, n)))
                return {'text': head}
        except Exception as e:
            return {'text': f'<local fallback error: {e}>'}
        return {'text': f'<unknown tool: {tool}>'}

    async def _list_tools_desc(self) -> str:
        cache_key = self.default_server
        cached = self._cache_get(self._tools_cache, cache_key)
        if cached:
            return cached
        desc = "可用 MCP 工具（本地回退）: fs.list_dir, fs.read_text, data.csv_head, skills.csv_clean, stats.aggregate, report.md_render"
        try:
            tools = await self.mcp.list_tools_async(self.default_server)
            names = [t.get("name") for t in tools if isinstance(t, dict) and t.get("name")]
            if names:
                desc = f"可用 MCP 工具（server={self.default_server}）: " + ", ".join(names[:30])
        except Exception:
            pass
        self._cache_put(self._tools_cache, cache_key, desc)
        return desc

    async def _build_system(self) -> str:
        # 优先使用 MCP 的 prompts: chat.system（若不存在则动态拼接 tools 描述）
        tools_desc = await self._list_tools_desc()
        sys_content = None
        cache_key = (self.default_server, "chat.system")
        cached_prompt = self._cache_get(self._prompt_cache, cache_key)
        if cached_prompt:
            sys_content = cached_prompt + "\n\n" + tools_desc
        else:
            try:
                # 尝试读取 MCP 提示模板（异步版本，避免事件循环冲突）
                prom = await self.mcp.get_prompt_async(self.default_server, "chat.system", arguments={})  # type: ignore
                text = prom.get("text") or ""
                if text:
                    self._cache_put(self._prompt_cache, cache_key, text)
                    sys_content = text + "\n\n" + tools_desc
            except Exception:
                sys_content = None
        if not sys_content:
            # 使用单引号包裹，避免 JSON 字段中的双引号转义问题
            sys_content = (
                '你是 AgentOS 助手。请用简洁中文回答。若识别到可执行任务，返回一个JSON对象：{"action":{...},"srs":{...}}。'
                '支持两类 action: 1) {type:\'run\', args:{srs_path,data_path,out,planner,executor,critic,reviser,provider}}；'
                "2) {type:'mcp_call', server:'" + self.default_server + "', tool:'<tool_name>', args:{...}}。"
                '生成答案时：不要直接粘贴大段原始数据；优先给结论/要点/下一步建议，必要时附少量样例(<=10行)。\n'
                "JSON 之外可附加说明。\n" + tools_desc
            )
        return sys_content

    async def respond_async(
        self,
        session_id: str,
        history: List[Dict[str, str]],
        user_text: str,
    ) -> Dict[str, Any]:
        # 1) 构造 messages（含 MCP 工具清单）
        sys_content = await self._build_system()
        msgs: List[Dict[str, str]] = [{"role": "system", "content": sys_content}]
        for m in history:
            role = m.get("role") or "user"
            content = m.get("content") or ""
            msgs.append({"role": role, "content": content})
        msgs.append({"role": "user", "content": user_text})

        # 2) 最多两轮 ReAct：LLM→(mcp_call?)→执行→注入结果再问→最终回复
        final_reply: str = ""
        progress: List[str] = []
        progress.append("初始化: 加载 MCP 提示与工具清单")
        meta_all: Dict[str, Any] = {}
        srs_saved: Optional[str] = None
        mcp_exec: Optional[Dict[str, Any]] = None
        action: Optional[Dict[str, Any]] = None

        configured_loops = int((self.cfg.get("agent", {}) or {}).get("react_loops", 2)) or 2
        # 每次交互仅执行一轮工具-分析闭环，除非允许自动推进
        max_loops = configured_loops if self.auto_proceed else 2
        temperature = float((self.cfg.get("llm", {}) or {}).get("temperature", {}).get("planner", 0.3))
        retries = int((self.cfg.get("llm", {}) or {}).get("retries", 0))

        next_action: Optional[Dict[str, Any]] = None
        for loop_idx in range(max_loops):
            try:
                content, meta = self.router.chat_with_meta(msgs, temperature=temperature, retries=retries)
                meta_all = meta
            except Exception as e:
                sample = '{"action":{"type":"mcp_call","server":"' + self.default_server + '","tool":"data.csv_head","args":{"path":"examples/data/weekly.csv","n":50}}}'
                return {"reply": f"LLM 调用失败: {e}. 你可以直接发送 JSON 指令（例如：{sample}），或点击右上‘工具’面板直接执行。", "llm": {"error": str(e)}}

            # 解析 JSON 动作（优先从 LLM 回复，失败时尝试从用户文本）
            action = None
            obj: Optional[Dict[str, Any]] = None
            try:
                obj = extract_json_block(content)
            except Exception:
                try:
                    obj = extract_json_block(user_text)
                except Exception:
                    obj = None
            if isinstance(obj, dict):
                progress.append(f"[{loop_idx+1}] 解析到结构化对象")
                if obj.get("srs"):
                    # 保存 SRS
                    import os, time as _t
                    base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
                    sdir = os.path.join(base, "examples", "srs")
                    os.makedirs(sdir, exist_ok=True)
                    srs_path = os.path.join(sdir, f"srs_{session_id}_{int(_t.time())}.json")
                    with open(srs_path, "w", encoding="utf-8") as f:
                        json.dump(obj["srs"], f, ensure_ascii=False, indent=2)
                    srs_saved = srs_path
                if obj.get("action"):
                    action = obj["action"]
                    if isinstance(action, dict) and action.get("type") == "mcp_call":
                        progress.append(
                            f"[{loop_idx+1}] 计划调用: "
                            f"{str(action.get('server') or self.default_server)}.{action.get('tool')} "
                            f"args={self._safe_args_preview(action.get('args') or {})}"
                        )

            # 如无 mcp_call，则把 content 作为最终回复返回
            if not (isinstance(action, dict) and action.get("type") == "mcp_call"):
                progress.append(f"[{loop_idx+1}] 无需调用工具，直接回答")
                final_reply = content
                break

            # 执行 mcp_call，并把结果注入到对话，再进入下一轮
            server_id = str(action.get("server") or self.default_server)
            tool = str(action.get("tool") or "")
            args = action.get("args") or {}
            if not tool:
                final_reply = content
                break
            try:
                alias = { 'ls': 'fs.list_dir', 'list_files': 'fs.list_dir', 'cat': 'fs.read_text' }
                tool_canonical = alias.get(tool, tool)
                try:
                    res = await self.mcp.call_tool_async(server_id, tool_canonical, args if isinstance(args, dict) else {})
                except Exception:
                    if self.require_remote:
                        raise
                    # 本地回退
                    res = self._local_mcp_call(tool_canonical, args if isinstance(args, dict) else {})
                mcp_exec = {"server": server_id, "tool": tool_canonical, "args": args, "result": res}
                res_text = res.get("text") or (json.dumps(res.get("structured"), ensure_ascii=False) if res.get("structured") is not None else "<no result>")
                # 减少噪音：限制注入长度
                if isinstance(res_text, str) and len(res_text) > 1200:
                    res_text = res_text[:1200] + "\n...[truncated]..."
                snippet = (res_text[:160] + ("…" if isinstance(res_text, str) and len(res_text) > 160 else "")) if isinstance(res_text, str) else str(res_text)
                progress.append(f"[{loop_idx+1}] 工具完成: {server_id}.{tool_canonical} → {snippet}")
                # 将工具执行结果作为“观察”注入上下文，并提示 LLM 给出下一步/最终答案
                msgs.append({"role": "assistant", "content": content})
                msgs.append({"role": "user", "content": f"[工具执行结果] {server_id}.{tool_canonical}:\n{res_text}\n\n请基于该结果继续：若需要更多信息请给出新的 mcp_call；若可以回答，请直接给出最终答案。"})
                # 若不自动推进，则在得到分析后停止，并以建议形式返回下一步 action（不直接执行）
                if not self.auto_proceed:
                    # 触发一次分析（第二次 LLM），但不自动执行新的 mcp_call
                    content2, meta2 = self.router.chat_with_meta(msgs, temperature=temperature, retries=retries)
                    meta_all = meta2
                    progress.append(f"[{loop_idx+1}] 基于观察的分析已生成")
                    # 若分析里仍给出新的 mcp_call，作为 next_action 提议返回
                    try:
                        obj2 = extract_json_block(content2)
                        if isinstance(obj2, dict) and isinstance(obj2.get("action"), dict) and obj2["action"].get("type") == "mcp_call":
                            next_action = obj2["action"]
                            progress.append(
                                f"[{loop_idx+1}] 建议下一步: "
                                f"{str(next_action.get('server') or self.default_server)}.{next_action.get('tool')} "
                                f"args={self._safe_args_preview(next_action.get('args') or {})}"
                            )
                    except Exception:
                        pass
                    final_reply = content2
                    # 结束本轮
                    break
                # 自动推进：进入下一轮（可能再次发出 mcp_call）
                continue
            except Exception as e:
                # 仅记录错误并交由上层（/api/chat/send）处理回退，避免同时出现“失败+成功结果”的混合提示
                mcp_exec = {"error": str(e)}
                progress.append(f"[{loop_idx+1}] 工具调用失败: {e}")
                final_reply = content
                break

        if not final_reply:
            final_reply = content if 'content' in locals() else ""
        # 若不自动推进，避免把建议动作放到 action（否则服务端会直接执行）；改放 next_action
        if not self.auto_proceed:
            action = None
        # 将进度前置到回复顶部
        if progress:
            final_reply = "进度\n- " + "\n- ".join(progress) + "\n\n" + final_reply
        return {"reply": final_reply, "action": action, "next_action": next_action, "srs_path": srs_saved, "mcp": mcp_exec, "llm": meta_all, "managed": True}

    def respond(self, session_id: str, history: List[Dict[str, str]], user_text: str) -> Dict[str, Any]:
        import asyncio
        return asyncio.run(self.respond_async(session_id, history, user_text))


def _pick_mcp_spec(plan: Dict[str, Any]) -> Dict[str, Any] | None:
    if isinstance(plan.get("mcp"), dict):
        return plan["mcp"]
    steps = plan.get("steps") if isinstance(plan, dict) else None
    if isinstance(steps, list):
        for st in steps:
            if isinstance(st, dict) and (st.get("op") == "mcp.tool" or st.get("type") == "mcp.tool"):
                return {
                    "server": st.get("server"),
                    "tool": st.get("tool"),
                    "args": st.get("args", {}),
                }
    return None


@register("executor", "mcp_tool")
class ExecutorMCPTool(Executor):
    _shared_client: Optional["MCPClient"] = None

    def __init__(self, mcp_client: Optional["MCPClient"] = None, cfg: Optional[Dict[str, Any]] = None) -> None:
        self._client = mcp_client
        self._cfg_override = cfg

    def _resolve_client(self, context: Dict[str, Any]) -> "MCPClient":
        client = context.get("mcp_client") if isinstance(context, dict) else None
        if client is not None:
            self._client = client  # 优先使用外部注入的实例
        if self._client is not None:
            return self._client
        if self._cfg_override is None and ExecutorMCPTool._shared_client is not None:
            self._client = ExecutorMCPTool._shared_client
            return self._client
        from packages.providers.mcp_client import MCPClient  # type: ignore
        from packages.config.loader import load_config  # type: ignore

        cfg = self._cfg_override or load_config(None)
        self._client = MCPClient(cfg)
        if self._cfg_override is None:
            ExecutorMCPTool._shared_client = self._client
        return self._client

    def execute(self, srs: Dict[str, Any], plan: Dict[str, Any], context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        mcp = self._resolve_client(context)
        spec = _pick_mcp_spec(plan)
        if not spec:
            raise ValueError("计划中未找到 MCP 调用规范(mcp|steps.op=mcp.tool)")

        server = str(spec.get("server") or "api")
        tool = str(spec.get("tool") or "")
        args = spec.get("args") or {}
        if not tool:
            raise ValueError("MCP 工具名缺失")

        t0 = time.time()
        res = mcp.call_tool(server, tool, args if isinstance(args, dict) else {})
        latency_ms = int((time.time() - t0) * 1000)
        # 提取结果文本
        text = res.get("text")
        if not text and isinstance(res.get("structured"), dict):
            # 常见约定：structured.markdown / structured.text
            st = res["structured"]
            text = st.get("markdown") or st.get("text") or json.dumps(st, ensure_ascii=False)
        if not text:
            text = "<no content>"

        ctx = {"metrics": {"latency_ms": latency_ms, "retries": 0, "cost": 0.0}, "mcp": {"server": server, "tool": tool, "args": args}}
        return str(text), ctx
