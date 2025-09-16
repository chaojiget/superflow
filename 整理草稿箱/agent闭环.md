# Agent 闭环重构稿 v0.1

> 目标：把“最小闭环”升级为**可落地、可重放、可扩展**的一条流水线，并与现有项目代码（前端 Console + 后端 Kernel/Packages）对齐。
> 原则：前台只暴露一个 Agent，后台按阶段可替换；度量驱动；默认离线零成本，越权触发 HiTL。

---

## 0. 重构目标与范围
- **统一定义**：明确最小闭环 = `感知 → 规划 → 执行 → 评审 → 修补 → 记账 → 回放`，并映射到仓库中的具体模块。
- **端到端一条链路**：从 Web Console（前端）到 Kernel + Agents（后端）全链路打通，同步梳理 API、事件与数据产物。
- **策略扩展位**：为后续多策略/多 Agent 分派留出扩展接口（Strategy Factory、Merit Ledger 等）。
- **交付物更新**：更新文档、CLI 流程、前后端改造原则，支撑下一步的产品化迭代。

---

## 1. 最小闭环（Minimal Closed Loop）新定义

### 1.1 流程视图
1. **Perceive｜感知**：加载 SRS、数据片段与上下文 → 写入 `sense.srs_loaded`（`kernel.bus.OutboxBus.append`）。
2. **Plan｜规划**：`packages.agents.*.Planner` 产出 JSON Plan，Guardian 校验后落到 `plan.generated`。
3. **Execute｜执行**：`Executor` 选择 LLM 或本地 `skills/*` 执行 → 产物与指标通过 `exec.output` 入 Outbox。
4. **Review｜评审**：`Critic` 对产物打分；若 `<0.8`，进入下一步修补。
5. **Patch｜一次修补**：`Reviser` 根据评审意见修订，再审；超过一次交回人工。
6. **Log｜记账**：`OutboxBus.finalize` 汇总 cost/latency，生成 `episodes/<trace_id>.json`；`reports/*.md` 输出产物。
7. **Replay｜回放**：`min_loop.py replay` 离线复现，不触发网络；可生成 `episodes/<id>_replay.py`。

### 1.2 阶段职责对照表

| 阶段 | 代码位置 | 关键文件/类 | 产物 |
| --- | --- | --- | --- |
| 感知 | `apps/console/min_loop.py` → `load_srs`/`sample_csv_text` | `OutboxBus.append("sense.srs_loaded")` | SRS + 输入摘要 |
| 规划 | `packages/agents/llm_agents.py` / `rule_agents.py` | `Planner.plan()` | `plan.generated` 事件、Plan JSON |
| Guardian | `kernel/guardian.py` | `BudgetGuardian.check()` | 预算/超时守护记录 |
| 执行 | `Executor.execute()` + `skills/*.py` | `csv_clean`/`stats_aggregate`/`md_render` | Markdown 草稿、执行指标 |
| 评审 | `Critic.review()` | LLM Router → `review.scored` | Score、pass、reasons |
| 修补 | `Reviser.revise()` | `patch.revised` | Revised Markdown |
| 记账 | `kernel/bus.py::finalize` | Episodes JSON、Outbox header | `episodes/t-*.json`、report 路径 |
| 回放 | `min_loop.py replay` | CLI PoV / Replay 脚本 | 复现输出或 saved review |

### 1.3 验收指标
- 质量：`review.scored.score ≥ 0.8` 默认通过。
- 性能：示例数据 p95 延迟 < 2s；成本默认 0。
- 可回放：同一 `trace_id` 在 `replay --rerun` 下产物一致。
- 守护：预算越线时 `BudgetGuardian` 抛出异常并写入事件，触发 HiTL（前端审批流）。

---

## 2. 端到端链路：前台唯一 Agent，后台分层解耦

### 2.1 会话入口（前端 Console）
- **目录**：`apps/server`（FastAPI + Jinja2 + 原生 JS）。
- **页面结构**：
  - `templates/chat.html`：聊天式入口，侧栏展示任务进度、预算、产物下载；支持录音上传（待接入）。
  - `templates/episodes*.html`、`templates/scores*.html`：回放与指标面板。
  - `templates/workflows.html`：任务编排与定时执行列表。
- **静态资源**：`apps/server/static/style.css` 基础样式；JS 内嵌在模板中，后续重构为模块化资源。
- **前端事件流**：
  1. WebSocket（`/agent/events` 预留）接收后台事件：`progress/request/approval/receipt/error`。
  2. `fetch('/api/run', POST)` 触发 CLI 作业，后台写入 `chat.db.jobs`。
  3. 轮询 `GET /api/run/status?job_id=<id>` 读取 CLI 返回的 JSON（trace_id/score/产物路径），结果亦写入 `chat.db.jobs`。

### 2.2 中台（FastAPI 服务）
- **入口**：`apps/server/main.py::create_app`，提供管理台 API。
- **Chat DB**：`apps/server/chat_db.py` 使用 SQLite 存储对话、工作流、计划任务；内嵌调度线程 `_jobs_loop` 周期执行 CLI 命令。
- **Job Runner**：支持三类步骤
  1. `run`：调用 `apps/console/min_loop.py run ...`
  2. `replay`：调用 `min_loop.py replay ...`
  3. `shell`：可扩展自定义命令（需 Guardian 审计）。
- **审批/越权**：预算越线或待补信息时，将 Guardian 返回的 `approval` 事件写入 `chat.db`，由前端弹窗处理。

### 2.3 内核与 Agents
- **内核** (`/kernel`)：Outbox（`bus.py`）、预算守护（`guardian.py`）、SQLite Outbox（`outbox_sqlite.py`）。
- **Agent 插件体系** (`/packages/agents`)：
  - `registry.py` 注册插件 → `Planner/Executor/Critic/Reviser` 接口。
  - `llm_agents.py`、`rule_agents.py`、`mcp_agents.py` 具体实现；可按 `cfg.defaults` 切换。
  - `skills_registry.py` 校验本地技能签名（避免未注册技能执行）。
- **LLM Provider 路由** (`packages/providers/router.py`)：按配置选择 openrouter/openai，本地模式可关闭。
- **技能层** (`/skills`)：`csv_clean`、`stats_aggregate`、`md_render` 纯函数，可在离线回放中复用。

### 2.4 数据与度量
- **Episodes**：`episodes/t-*.json`，内含事件数组、header（provider/model/cost）、最终产物路径。
- **Reports**：`reports/*.md` 最终交付物。
- **Scoreboard**：`min_loop.py scoreboard` 生成 CSV，供 `templates/scores*.html` 展示。
- **Audit**：`audit/config_changes.log` 等文件记录配置变更，后续接入审计系统。

---

## 3. 前端重构规划
- **统一事件源**：WebSocket + SSE 替换轮询，确保 `progress/approval/receipt` 实时反馈；后端提供 `/agent/events`。
- **界面分区**：
  - 左侧聊天流展示即时响应、链接引用、预算提示；
  - 右侧任务栈列出「进行中 / 待处理 / 已完成」，可点击查看 episodes。
- **HiTL 交互**：当 Guardian 返回 `approval` 事件（预算越线/风险提示），前端弹出审批卡（继续/降级/终止），结果写回 `/agent/approve`。
- **回放体验**：在任务详情页开放「离线重放」「生成脚本」按钮，调用 `replay --rerun`。
- **技术选型**：短期沿用 Jinja2 + 原生 JS；中期引入 `apps/ui`（React/Vite），通过 REST/WebSocket 与 FastAPI 对接。

---

## 4. 后端重构规划
- **API 层**：
  - `POST /agent/intake` → 解析自然语言需求、调用 LLM 生成 `TaskSpec`（TODO：接入 RUE 模块）。
  - `POST /agent/run` → 封装 CLI 调用，返回 `trace_id`；加入幂等键。
  - `POST /agent/approve` → 前端审批指令回写 Guardian。
  - `GET /agent/episodes/<id>` → 返回 Episode JSON 供前端渲染。
- **任务编排**：将 `chat_db.schedule_job` 抽离成 `packages/orchestrator`，支持并行运行与 SLA 调度。
- **Guardian 扩展**：
  - 成本预算：支持 `budget_cny`、`budget_tokens` 多币种换算。
  - 权限：接入 Tool/技能的 `caps` 声明，运行前静态校验。
- **策略工厂接入**：引入 `packages/strategy_factory`，记录策略版本与 `Merit Ledger`，支撑多策略路由。

---

## 5. 最小版本落地路径

| 阶段 | 交付 | 涉及目录 | 备注 |
| --- | --- | --- | --- |
| T0 | CLI 闭环 | `apps/console/min_loop.py`、`kernel/*`、`skills/*` | 已具备，可复用。
| T1 | Web Console 触发 CLI | `apps/server/main.py`、`templates/run.html` | 将 CLI 输出串联至前端。
| T2 | 审批 + 回放面板 | `templates/chat.html`、`episodes*.html` | 统一事件模型。
| T3 | 多策略实验位 | `packages/agents/registry.py`、`packages/providers/router.py` | 支持 Draft→Shadow。
| T4 | Merit Ledger / Scoreboard | `packages/metrics/*`（待建） | 度量驱动升级。

---

## 6. 验收清单
- ✅ CLI `run/replay` 正常工作，Episodes/Reports 产出齐全。
- ✅ 前端能展示实时进度、预算提示、审批对话框。
- ✅ Episodes 页面可一键回放，同步展示 Score、cost、latency。
- ✅ 越线任务会暂停，需审批后继续；审批记录写入日志。
- ✅ Scoreboard 可按任务族统计成功率、成本、延迟趋势。

---

## 7. 后续工作建议
1. 将 RUE（SRS/验收生成）接入 `POST /agent/intake`，形成 Spec-first 流程。
2. 完善 `packages/providers/openrouter_client.py`，支持多模型路由与重试退避。
3. 为 `skills/*` 补充单元测试与示例数据，保持离线回放稳定。
4. 引入 `DocSyncer`（packages 待建）定期更新工具/文档，失败触发回放验证。
5. 准备 L1→L2 升级：上线策略工厂小流量实验、偏好记忆与满意度收集。

---

> 附：运行命令
>
> ```bash
> # CLI 最小闭环
> uv run python apps/console/min_loop.py run \
>   --srs examples/srs/weekly_report.json \
>   --data examples/data/weekly.csv \
>   --out reports/weekly_report.md
>
> # 回放最近一次
> uv run python apps/console/min_loop.py replay --last
> ```
