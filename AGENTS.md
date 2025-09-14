# 使用中文和我交互
# agent.md — AgentOS v0.1 一页蓝图与落地清单

> 版本：v0.1（汇总现有资料 → 一页蓝图 + 落地清单）
> 目标：面向真实需求，构建能「感知—思考—行动」并自迭代的 AgentOS（质量 > 成本 > 延迟，可配置）。
> 原则：离线优先、预算有上限、度量驱动；不自训基座模型，适配多家 LLM。

---

## 0. TL;DR（要点速览）
- 认知微内核：Perceiver → Planner → Executor → Critic → Learner，进程内总线 + Outbox 可回放。
- 策略工厂：Registry / Generator / Evaluator / Selector / Rollout；Draft→Shadow→AB→Promote/Deprecate。
- 数据契约：统一消息信封、Traces、Skills/Strategies、Merit Ledger（净效用）。
- 工具与文档：MCP/API 工具统一注册与观测，DocSyncer 持续更新知识并驱动回放。
- 低成本：每任务预算≤¥1（默认），越线触发 HiTL；度量护栏与自动降级/回滚。

---

## 1. 架构总览（Microkernel + Factory）

### 1.1 认知微内核（Cognitive Microkernel）
- 职责：调度、记忆接口、安全与预算、度量/回放。
- 事件通道：内存热总线 + Outbox 持久冷通道（幂等/检查点）。
- 五进程（用户态）：Perceiver / Planner / Executor / Critic / Learner（经黑板解耦）。
- 消息信封（关键字段）：`msg_id, trace_id, type, payload(schema_ver), cost, budget_ctx, authz(caps), idempotency_key, labels`。

### 1.2 策略工厂（Strategy Factory）
- 组件：Registry（权威）/ Generator / Evaluator / Selector / Rollout。
- 流水线：Draft → Shadow（只读影子）→ AB（金丝雀 5%）→ Promote / Deprecate。
- Merit Ledger：质量/满意度/成本/延迟加权为净效用，驱动路由与晋升。

### 1.3 系统形态与任务分类
- 会话层产出需求文档（SRS + 验收）。
- 执行层按 临时/急单 与 重复/技能化 分派；重复任务沉淀为 Skill（可版本化）。

---

## 2. 数据与存储（DB 摘要）
- Outbox：append‑only 事件日志（回放来源）。索引：trace、type+ts。
- Traces（Episodic）：obs/plan/step/action/result/review/error 轨迹。
- Semantic Docs：`source/version/embedding(1536)/ttl`，对接 DocSyncer。
- Skills / Strategies（Procedural）：`spec/elo/reliability/status(draft→promoted)`。
- Strategy Metrics / Merit Ledger：窗口统计 + 净效用账本。

---

## 3. 工具与资料更新
- 工具层：MCP/API tools 统一注册、鉴权、配额与观测；路由多 LLM 提供商。
- DocSyncer：持续拉取 OpenAPI/Markdown/网页 → `semantic_docs`；Schema Diff 生成策略补丁 → 回放 → 小流量试。

---

## 4. 低成本原则与目录骨架（MVP）
- 三大铁律：离线优先；每任务预算≤¥1（越线→HiTL，可降级/缓存）；度量驱动（Autonomy/Spec‑Match/Cost）。
- 目录骨架（建议）：
```
/kernel
  /bus        # 内存总线 + Outbox
  /scheduler  # 优先级/预算/SLA-aware 调度
  /memory     # episodic/semantic/procedural 统一接口
  /guardian   # 能力令牌/Schema 校验/PII 检测
  /telemetry  # Trace/Metric/Replay
/plugins
  /perceiver  /planner  /executor  /critic  /learner
/registry     # StrategySpec / Tool Registry
/tests        # 单元/集成/回放
```
- RUE v0.1：对话+画像→`TaskSpec(SRS)` + `AcceptanceTests` + 风险清单（Spec‑First）。

---

## 5. 测试与发布（度量为先）
- 单元：合约/确定性/安全。
- 集成：每任务族≥50 条黄金样本 + 失败样本；预算/延迟护栏测试；回放可重现性。
- 线上：金丝雀 5%，自动回滚阈值（质量跌幅/超 SLA/合规失败）。
- 工具：Fake Tool Server、真实工具 Recorder（录制-回放）。

---

## 6. 里程碑（v0.1 → 90 天）
1) 强干内核：进程内总线 + Outbox、三类记忆、Tool Registry。
2) 策略工厂 v0：StrategySpec、回放、UCB 路由、金丝雀 5%。
3) DocSyncer v0：接入 1–2 个目标 API，Schema Diff 触发回放。
4) 一个任务族闭环：Web RAG（含引用）或 API→报告；含 HiTL 策略。
5) 测试基线：合约单测、回放集、金丝雀护栏与回滚。

---

## 7. 角色与治理
- 组织（RACI）
  - Human Area Owner（A）：目标/安全/成本与验收负责。
  - System Ops Agent（R）：日常回放、金丝雀、路由调权、文档同步。
  - Consulted（C）：相邻域专家/CI 与 Guardian。
  - Informed（I）：其余成员与干系人。
- 升级规则（必须升级到 A）：预算越线 HiTL；SLA p95 连续两轮超阈；工具 Schema 重大不兼容或合规风险；`delta_score > 0.5` 连续≥3；影响面≥20% 的版本切换。
- 节奏产出：日报/周报与审批箱（预算/发布/合规例外）。

---

## 8. RUE SRS 模板（YAML）
```yaml
goal: "生成10条视频选题并按热度排序"
constraints: ["成本≤¥1", "完成≤2min", "引用近1年数据"]
acceptance:
  - id: A1
    given: "已有历史视频标题与表现数据"
    when:  "运行 ideation.rank"
    then:  "产出10条并包含热度分与来源链接"
risks: ["数据源不全→回退本地语料", "热点歧义→人工确认"]
```

---

## 9. DoD（Definition of Done）
- 有 SRS 与至少 1 个验收用例。
- 观测指标入库（可回放/可比较/可审计）。
- 金丝雀/回滚策略生效。
- 自动生成发布说明（作为内容素材）。

---

## 10. 第一任务规划（T1）— 最小闭环：SRS→Plan→Run→Review→Patch→Log→Replay

- 目标：根据需求（SRS）自动生成解决方案（Plan），执行并产出报告，记录运行日志，按一次修正策略迭代，形成可回放的最小自循环。

- 实现选择：
  - 默认：LLM 全流程（Planner/Executor/Critic/Reviser 统一由 LLM 驱动，经 OpenRouter 路由到 Qwen 模型），回放读取保存结果不再触网。
  - 可选：规则/离线技能版（csv.clean→stats.aggregate→md.render），作为后备路径（后续按需开启）。

- 交付物：
  - CLI：`apps/console/min_loop.py`，命令：
    - `run --srs examples/srs/weekly_report.json --data examples/data/weekly.csv --out reports/weekly_report.md`
    - `replay --trace <trace_id>`（依据保存的 plan 与输入回放）
  - 内核：`/kernel/bus`（Outbox JSON 事件日志），`/kernel/guardian`（预算/超时护栏）。
  - LLM Provider：`packages/providers/openrouter_client.py`（OpenRouter/OpenAI 兼容接口）。
  - 技能（可选后备）：`/skills/{csv_clean,stats_aggregate,md_render}.py`（纯函数、离线）。
  - 样例：`examples/data/weekly.csv` 与 `examples/srs/weekly_report.json`。
  - 产物：`reports/weekly_report.md` 与 `episodes/<trace_id>.json`（含计划、决策、指标、结果）。

- 流程约束：
  - Plan：LLM 基于 SRS 与数据片段生成计划 JSON（steps/params/acceptance/risks）。
  - Run：LLM 直接生成 Markdown 报告；控制输入片段长度（默认仅传 CSV 前 ~80 行）。
  - Review：LLM 输出 `{pass, score[0..1], reasons[]}`；阈值 `score>=0.8` 视为通过。
  - Patch：若未通过，LLM 依据评审意见进行一次改写，再次评审。
  - Log/Replay：完整 Episode JSON 落盘；回放默认读取保存结果，不再触网。

- 验收标准：
  - 质量：产物符合 SRS 验收（包含摘要、表格；TopN 数量匹配；无空值）。
  - 性能：p95 延迟 < 2s（示例数据），成本=0。
  - 可回放：同一 trace 重放得到相同产物与分数。
  - 守护：预算与超时生效，越线有标记与降级路径。

- 风险与边界：
  - 暂不接入真实 LLM/网络；Planner 为规则/模板化；下阶段可无缝替换为 LLM Planner。
  - 单租户配置；合规/密钥后续在 v0.2 完善。

---

## 11. 附：执行条款 v0.1（精简）
- Spec‑First：每模块 README 含功能简介、I/O 契约、示例、边界与失败案例。
- 小步快跑：每次 PR 带 Spec 与最小单测；合并前回放基线。
- 观测先行：OpenTelemetry 结构；成本/延迟/失败码必填；日志红黑名单字段。

---

## 12. 开发环境（uv）
- 依赖管理：使用 `uv` 管理 Python 环境与依赖。
- Python 版本：>= 3.9（推荐 3.11+）。

- 快速开始：
  - 安装依赖（无全局项目文件时直接装所需包）
    - `uv pip install requests python-dotenv`
  - 环境变量（复制 `.env.example` → `.env` 并填入 Key）
    - `OPENROUTER_API_KEY`（必填）
    - `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
    - `OPENROUTER_MODEL=qwen/qwen3-next-80b-a3b-thinking`
    - `OPENROUTER_SEED=42`（可选）
  - 运行最小闭环：
    - `uv run python apps/console/min_loop.py run --srs examples/srs/weekly_report.json --data examples/data/weekly.csv --out reports/weekly_report.md`
  - 查看回放（不触网）：
    - `uv run python apps/console/min_loop.py replay --trace <trace_id>`

- 建议的忽略项（避免泄露与污染）
  - `.env`, `episodes/`, `reports/`, `__pycache__/`, `*.pyc`



### 6.2 Container Runner

* 隔离：gVisor/Kata；高敏用 Firecracker。
* 策略：一次性容器、只读根文件系统、显式挂载。
* 配置：CPU/Mem/IO/时长/带宽限额；网络白名单。
* 典型：Python 脚本、Pandas/爬虫、Playwright 无头浏览器。

---

## 7. 供应商适配与路由

### 7.1 Provider Adapter 接口

```ts
interface LLMProvider {
  complete(input: Prompt, options: LLMOptions): Promise<LLMOutput>;
  chat(input: ChatTurn[], options: LLMOptions): Promise<LLMOutput>;
  score(input: ScoringPrompt): Promise<Score>;
  name(): string;  // e.g. "anthropic:claude-3.7" / "openai:o4-mini"
}
```

### 7.2 路由策略

* 规则：`IF tokens<2k AND need_json THEN provider=A ELSE provider=B`
* 优先级：成本 < 时延 < 历史成功率（可按场景权重）。
* 失败策略：重试（指数退避）→ 提供商切换 → 模板化降级。
* 合规：各提供商的 PII/内容策略由治理层硬性约束。

---

## 8. 成长机制（不训权重的自演化）

* **技能卡化**：将复发子任务固化为技能；WASM 化优先；带单测与风险标签。
* **范例检索**：从历史高分 Episode 动态拼接 3–5 个**结构化示例**进入提示。
* **提示补丁**：为常见错误生成反例/硬约束片段，带“生效条件（trigger）”。
* **金丝雀与回滚**：新技能/提示先 5% 流量；指标不劣于基线再放量；异常自动回滚。

---

## 9. 工程目录与文件（Monorepo 示例）

```
repo-root/
  apps/
    gateway/              # API 入口（Go/TS）
    console/              # CLI/轻管理界面
  services/
    orchestrator/         # 编排器（Python/TS）
    registry/             # 工具/技能注册表
    runner-wasm/          # WASM 执行器（Rust/Go）
    runner-container/     # 容器执行器（Go/Python）
    evaluator/            # 评审&评测服务
    memory/               # 向量+SQL 统一读写服务
    router/               # LLM Provider 路由层
    auditor/              # 审计与治理
  packages/
    sdk-py/               # Python SDK（任务提交、回放）
    sdk-ts/               # TypeScript SDK
    schemas/              # JSON Schema / OpenAPI / Protobuf
    prompts/              # 系统提示/补丁/模板
    providers/            # anthropic, openai 等 Adapter
  skills/
    dedupe_headlines/     # 示例技能（wasm/容器两版）
    summarize_markdown/
  tests/
    unit/
    integration/
    e2e/
    golden/               # 金样本
  infra/
    docker/ helm/ terraform/
  scripts/
    dev.sh build.sh run_e2e.sh seed_data.sh
  Makefile
  CONTRIBUTING.md
  SECURITY.md
  CODEOWNERS
```

---

## 10. 开发流程（适配 Claude Code / Codex 的工程实践）

### 10.1 Spec-first（面向规格开发）

* 每个模块的 `README.md` 需要包含：

  * **功能简介**、**API 契约**（OpenAPI/JSON Schema）、**输入/输出示例**、**边界条件**、**失败案例**。
* 每个文件开头使用**可供 AI 工具读取的 SPEC 块**：

```txt
/* SPEC:
  Module: runner-wasm
  Goal: Execute WASI modules with fs+net least-privilege
  Inputs: wasm_path, input_json, timeout_ms
  Outputs: stdout_json, metrics, logs
  Constraints: no network unless allowlist; mem<256MB; time<30s
  Tests: see tests/unit/runner_wasm_*.py
*/
```

### 10.2 AI Pair 编码节奏

* 以**小步提交**驱动：1 个 SPEC → 生成骨架 → 人工完善 → 单测补齐 → 集成。
* 统一提示模板（`packages/prompts/`）以减少风格漂移。
* 对生成代码**立刻补充单测与契约测试（contract tests）**。

### 10.3 Git 工作流

* Trunk-based + 短分支；PR 必须包含：变更说明、影响面、回滚方案。
* 预提交钩子：`lint`/`type-check`/`unit`/`license-scan`。
* 语义化版本与变更日志（SemVer + Conventional Commits）。

---

## 11. 测试与评测

### 11.1 测试金字塔

* **单元测试**：技能卡函数、适配器、工具参数校验。
* **契约测试**：与 Registry/Runner/Provider 的接口兼容性。
* **集成测试**：Plan→Act→Review 小闭环跑通。
* **E2E**：从 API 一键触发到产物落盘；包含异常路径。
* **Golden Tests**：关键任务的稳定性对比，防止回归。

### 11.2 评测（Scoreboard）

* 指标：成功率、一次通过率、事实错误率、延时、成本、干预率。
* 数据集：回放高频任务（周更），结合少量人工标注。
* 自动化：PR 合并前跑离线评测；灰度阶段跑在线金丝雀评测。

---

## 12. 观测、审计与预算

* **OpenTelemetry**：Trace/Metric/Log 三件套；关键维度：模型、Token、成本、时延、失败码。
* **审计**：每次工具调用记录**谁/何时/为何/用何参数/结果**；支持数据差异视图（diff）。
* **预算守护**：租户、任务、会话三级开销上限；达到阈值自动降级或暂停。

---

## 13. 安全与合规

* **能力令牌**：Tool/Skill 必须声明权限（fs, net, secrets），运行前静态校验。
* **数据分级**：PII/敏感数据脱敏；生产与沙箱隔离；日志红黑名单字段。
* **审批流**：对外发/资金/生产变更强制 L1/L2 审批；带可视化差异。
* **密钥管理**：KMS/Secrets Manager；不落盘到日志；按环境分发。

---

## 14. 成本与性能

* **缓存**：提示+结果缓存（语义相似度约束）；工具请求去重。
* **模型路由**：便宜模型优先，失败再升级；长文本拆分与增量更新。
* **并行与批处理**：数据并行（map）、工具批量请求（batch）。
* **速率与退避**：集中在 Provider Adapter 内统一实现。

---

## 15. 部署与发布

* 环境：dev / staging / prod；基础设施即代码（Helm/Terraform）。
* 镜像：最小化镜像层；SBOM；镜像签名与准入控制。
* 发布：**金丝雀**（5%→25%→100%）；健康检查；一键回滚。
* 兼容：技能卡/提示/路由策略独立版本化与灰度。

---

## 16. 错误与回滚

* 错误分类：用户输入、Tool 参数、Runner 资源、Provider 限速/超时、治理拦截。
* 策略：可重试错误（幂等）→ 指数退避；不可重试错误直接汇报与标注。
* 回滚：配置与技能/提示版本均可原子回退；保留 N 版历史。

---

## 17. 开发里程碑（建议）

* **W1**：Orchestrator MVP + WASM Runner + Registry + Provider Adapter（Claude & OpenAI）+ Memory。
* **W2**：Scoreboard + 容器 Runner + 金丝雀发布 + 提示补丁 + 观测与预算守护。
* **W3+**：更多技能卡、复杂用例、自动化技能升级提案与审批。

---

## 18. 附录

### 18.1 最小 API 示例（OpenAPI 片段）

```yaml
paths:
  /v1/tasks:
    post:
      summary: Submit a goal
      requestBody: { content: { application/json: { schema: { $ref: '#/components/schemas/Goal' }}}}
      responses:
        '202': { description: accepted, content: { application/json: { schema: { $ref: '#/components/schemas/TaskState'}}}}
```

### 18.2 提示模板（系统提示骨架）

```
You are the Planner. Produce a plan as JSON with fields: steps[], tools[], risks[], acceptance[].
Constraints: obey success_criteria, autonomy_level, budget.
Use prior exemplars if available; cite tool choices.
```

### 18.3 代码风格与质量

* Python：`ruff + mypy + pytest`；TS：`eslint + tsc + vitest`；Rust：`clippy + cargo test`。
* 文件必须含 SPEC 块与示例；公共函数必须类型注解与错误语义。

### 18.4 使用 Claude Code / Codex 的建议

* 在 PR 中贴上 SPEC 与 I/O 样例，让助手生成**骨架与测试**；人工补完边界与错误路径。
* 避免“一次生成大量文件”，分层次驱动；生成后立即运行单测与契约测试。
* 将失败案例与“反例”加入提示补丁目录，形成可复用的 guardrails。

---
