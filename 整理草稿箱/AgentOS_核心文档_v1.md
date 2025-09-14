# AgentOS 核心文档 v1（蓝图精简稿）

> 目的：对外对内统一的“最小可信闭环”与演进路线（与仓库实现对齐）。

## 1. 最小闭环
- 角色：Perceiver / Planner / Executor / Critic / Reviser（插件化）
- 流程：SRS → Plan → Run → Review → Patch → Log → Replay
- 存储：Episodes(JSON/SQLite 可选)、Scoreboard(SQLite)
- 观测：LLM 元数据（provider/model/usage/request_id/attempts/temperature），延迟/得分/通过率

## 2. 配置与提示
- 配置：`config.json`（角色默认、LLM 参数、prompts.dir、outbox.backend）
- 模板：`packages/prompts/`（system/user 分离，可版本化）

## 3. 安全与治理
- Envelope：`message_envelope.schema.json`；写入前做轻量校验与脱敏
- 执行：本地技能签名校验（`skills/registry.json`）
- 预算与SLA：超时守护（v1）；token→成本与预算（v1.1 规划）

## 4. 评分与晋升
- Scoreboard：CSV/SQLite 导出与查询；group-by model/provider；窗口期统计；HTML 报表
- 路线：Elo/Utility 账本与金丝雀（v1.2 规划）

## 5. Runner 与 Provider
- 当前：本地技能（Python 纯函数）、LLM via OpenRouter；OpenAI 适配与 Router 骨架
- 规划：WASM/Container Runner（v1.3）；多提供商路由+退避+降级（v1.2）

## 6. 服务化
- CLI → Server：FastAPI + Jinja2 的管理台原型（运行/列表/得分）
- API：/run /episodes /scores（后续扩展 /replay /registry /router）

---

## 附：目录锚点
- apps/console/min_loop.py（CLI 主入口）
- apps/server/（管理台原型）
- kernel/*（Outbox/Guardian）
- packages/*（agents/providers/prompts/config/schemas）
- skills/*（本地技能）
- tests/*（单测）
