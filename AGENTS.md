# agent.md — Agent OS 架构蓝图与最佳开发规范

> 版本：v1.0（可作为仓库根目录的开发规范）
> 目标：构建“以 Agent 为核心、可成长、自演化”的系统，模块可独立开发与部署，也可集成运行。
> 约束：不自训基座模型，主要依赖第三方 LLM（Claude / OpenAI / 其他），数据先收集后利用。

---

## 0. TL;DR（你需要知道的要点）
- **架构**：多智能体编排（Plan→Act→Review→Log→Patch）+ 记忆层 + 工具/技能层 + 治理/评测层。
- **执行环境**：**WASM 优先**（毫秒级、强隔离）承载“函数型技能”；**受限容器兜底**（gVisor/Firecracker）承载“脚本/数据/浏览器自动化”。
- **数据契约**：统一的 Goal DSL、Task State、Skill Card、Tool Registry、Episode Log、Scoreboard。
- **供应商无关**：LLM Provider 通过 Adapter 接口与 Router 路由，支持灰度与成本/时延/质量权衡。
- **成长机制**：技能卡化 + 评测驱动 + 金丝雀发布 + 提示补丁（Prompt Patch）+ 范例检索（Exemplar）。
- **工程化**：模块可独立部署（HTTP/gRPC/OpenAPI）；统一 CI/CD、观测、权限与审计；严控成本与风险。

---

## 1. 范围与非目标
**范围**：智能体编排、任务状态机、技能/工具体系、第三方 LLM 调用、评测与治理、数据与日志、部署与运维。
**非目标**：训练/微调大模型权重；构建重前端可视化（此处仅提供 API 与 CLI）。

---

## 2. 总体架构

```

┌───────────────┐
│   Client/UI   │  Chat/API/Webhook/CLI
└───────┬───────┘
│
┌───────▼─────────────────────────────────────────────┐
│             API Gateway / AuthN-Z / RateLimit       │
└───────┬─────────────────────────────────────────────┘
│
┌───────▼─────────┐     ┌───────────────┐     ┌───────────────┐
│ Orchestrator    │◄──► │ Memory Layer  │ ◄──►│ Scoreboard     │
│ (Plan/Act/...)  │     │ (Vector+SQL)  │     │ (Eval+Metrics) │
└───┬──────────┬──┘     └──────┬────────┘     └──────┬────────┘
│          │               │                       │
┌───▼───┐   ┌──▼───┐       ┌───▼───┐               ┌───▼───┐
│Runner │   │Runner│       │Registry│               │Auditor│
│ WASM  │   │ Ctnr │       │ Tools/ │               │ & Gov │
└───┬───┘   └──┬───┘       │ Skills │               └───┬───┘
│          │           └───┬────┘                   │
│          │               │                        │
┌───▼──────────▼───────────────▼────────────────────────▼───┐
│           LLM Providers (Claude / OpenAI / …) & Tools      │
└────────────────────────────────────────────────────────────┘

````

**关键原则**
- 显式状态机：每个任务都有可回放轨迹与结构化状态。
- 模块可插拔：所有内部通信以 HTTP/gRPC + JSON Schema/OpenAPI 定义。
- 最小权限：Runner 与工具均以能力令牌（Capability Token）授予权限。

---

## 3. 模块划分与接口（可独立/可集成）

### 3.1 API Gateway
- 职责：统一入口、认证鉴权（OIDC/JWT）、限流、审计埋点。
- 接口：`POST /v1/tasks`, `GET /v1/tasks/{id}`, `POST /v1/feedback`
- 产物：请求上下文（租户/预算/自治级别）注入到 Orchestrator。

### 3.2 Orchestrator（编排器）
- 职责：Goal 解析 → 规划（Plan）→ 执行（Act）→ 评审（Review）→ 记录（Log）→ 自修补（Patch）。
- 接口：
  - `POST /v1/plan`（输入 Goal DSL，输出计划树）
  - `POST /v1/execute`（输入步骤与工具声明，输出产物与中间态）
  - `POST /v1/review`（输出打分与改进建议）
- 备注：支持同步/异步执行，内部事件通过消息总线（NATS/Redis Streams）。

### 3.3 Memory Layer（记忆层）
- 组件：
  - **向量库**（pgvector/Qdrant）：范例检索、文档片段。
  - **SQL（Postgres）**：任务状态、事件日志、指标、配置。
- 接口：`/v1/memory/upsert`, `/v1/memory/search`, `/v1/episodes/*`

### 3.4 Registry（工具/技能注册表）
- 职责：注册/查询 Tool 与 SkillCard；版本与风控信息。
- 接口：`GET /v1/skills`, `POST /v1/skills`, `GET /v1/tools`
- 产物：**Skill 包（OCI Artifact 或压缩包）**：`skill.yaml + 二进制(wasm或入口) + tests/ + README`

### 3.5 Runners（执行器）
- **WASM Runner**：承载轻量函数技能（wasmtime/wasmer + WASI）。
- **Container Runner**：承载脚本/数据/浏览器（Docker/Containerd + gVisor/Kata/Firecracker）。
- 接口：`POST /v1/run/wasm`, `POST /v1/run/container`
- 安全：CPU/Mem/IO/Net/时长配额；网络白名单；文件系统挂载白名单。

### 3.6 LLM Providers & Router（供应商适配与路由）
- 职责：统一 Completion/JSON 模式/工具调用；重试/幂等/可观测；多供应商路由。
- 接口：`POST /v1/llm/complete`, `POST /v1/llm/chat`, `POST /v1/llm/score`
- 路由策略：按**成本、时延、历史成功率、输入长度**选择提供商与模型。

### 3.7 Scoreboard（评测与指标）
- 职责：离线/在线评测、打分、A/B/多臂 bandit、金丝雀发布。
- 接口：`POST /v1/eval/run`, `GET /v1/scores`, `POST /v1/ab/assign`

### 3.8 Auditor & Governance（审计与治理）
- 职责：记录每次决策、工具调用、权限申请；审批流（人类在环）。
- 策略：自治级别 L0–L3、预算上限、敏感操作白/黑名单。

---

## 4. 数据契约（Schemas）

### 4.1 Goal DSL（YAML）
```yaml
goal_id: "OKR-Q4-01"
objective: "每周生成竞品情报简报（≤10条）"
constraints:
  - "budget_usd <= 1"
  - "no_external_email"
deliverables:
  - "weekly_brief.md"
success_criteria:
  - "factual_error_rate < 0.05"
  - "dup_rate < 0.10"
context_refs: ["kb://competitors/*"]
autonomy_level: "L1"
````

### 4.2 Task State（JSON）

```json
{
  "task_id": "weekly-brief-2025w36",
  "status": "running",
  "plan": [{"id":"p1","step":"search"}, {"id":"p2","step":"dedupe"}],
  "artifacts": [],
  "decisions": [],
  "budget": {"usd_max": 1.0, "usd_spent": 0.21},
  "metrics": {"latency_ms": 0, "retries": 0},
  "audit": [],
  "autonomy_level": "L1"
}
```

### 4.3 Skill Card（YAML）

```yaml
name: "dedupe_headlines"
version: "1.1.0"
engine: "wasm"       # wasm | container
entry: "dedupe_headlines.wasm"
signature:
  input: {"type":"array","items":{"type":"string"}}
  output: {"type":"array","items":{"type":"string"}}
permissions: ["fs:/tmp:rw"]
resources: []
tests:
  - case: ["A","A","B"] -> ["A","B"]
owner: "content-agent"
risk_level: "low"
```

### 4.4 Tool Registry（JSON 片段）

```json
{
  "name": "http_fetch",
  "description": "HTTP GET with domain whitelist",
  "input_schema": {"type":"object","properties":{"url":{"type":"string"}}},
  "capabilities": ["net:read"],
  "domain_whitelist": ["example.com","news.ycombinator.com"],
  "risk_level": "medium",
  "requires_approval": false
}
```

### 4.5 Episode Log（事件轨迹）

* `episode_id, goal, inputs, prompts, provider, tool_calls, outputs, scores, human_feedback, cost, latency, errors[]`

---

## 5. 执行流程（状态机）

1. **Sense**：载入 Goal + 上下文 + 相似范例（向量检索）。
2. **Plan**：规划器生成计划树（含所需工具/技能/验收标准）。
3. **Act**：按计划调用 Runner 与工具（结构化参数 + 约束）。
4. **Review**：评审 Agent（LLM+规则）出分；若不达标→**一次自动修正**。
5. **Deliver**：产物落盘对象存储；按自治级别决定是否请求人审。
6. **Log**：完整 Episode 入库；关键片段写入向量库。
7. **Patch**：错误聚类≥3 次 → 生成**提示补丁**或**技能升级提案**（金丝雀后放量）。

---

## 6. 轻量执行环境规范

### 6.1 WASM Runner

* 运行时：wasmtime/wasmer（WASI）。
* 要求：**纯函数倾向**、无网络（或受控 Host Function）。
* 打包：`skill.yaml + *.wasm + tests/`。
* 观测：记录启动时延、执行时长、内存峰值。

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
