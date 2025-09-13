# AgentOS 梳理稿 v0.1（基于现有资料）

> 目的：把现有材料收束成“一页蓝图 + 落地清单”，用于 v0.1 原型与 90 天攻坚。本文仅做汇总与编排，不引入新决策。

---

## 0. 一页蓝图（What & Why）

- **终极目标**：面向真实需求，构建能「感知—思考—行动」并**自迭代**的 AgentOS。
- **默认优先级**：质量 > 成本 > 延迟（可配置）。
- **近期闭环（MVP Loop）**：跑通策略工厂（离线回放→金丝雀→晋升/回滚），以可度量的方式稳定交付一个任务族的结果。

---

## 1. 架构总览（How）

### 1.1 认知微内核（Cognitive Microkernel）

- 职责：调度、记忆接口、安全与预算、度量/回放。
- 事件总线：内存热通道 + Outbox 持久冷通道（幂等/检查点）。
- 五进程（用户态）：Perceiver → Planner → Executor → Critic → Learner（经黑板解耦）。

### 1.2 策略工厂（Strategy Factory）

- Registry（权威）/ Generator / Evaluator / Selector / Rollout。
- 流水线：Draft → Shadow（影子只读）→ AB（金丝雀 5%）→ Promote / Deprecate。
- Merit Ledger：净效用账本（质量/满意度/成本/延迟加权）。

### 1.3 系统形态与任务分类

- 会话层产出**需求文档（SRS + 验收）**。
- 执行层按**临时/急单**与**重复/技能化**分派；重复任务沉淀为 **Skill**（可版本化）。

---

## 2. 模块与目录（工程视角）

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

**消息信封（关键字段）**：`msg_id, trace_id, type, payload(schema_ver), cost, budget_ctx, authz(caps), idempotency_key, labels`。

---

## 3. 数据与存储（DB DDL 摘要）

- **Outbox**：append-only 事件日志（回放来源）。索引：trace、type+ts。
- **Traces**（Episodic）：obs/plan/step/action/result/review/error 序列化轨迹。
- **Semantic Docs**（Semantic）：`source/version/embedding(1536)/ttl`，承载 DocSyncer。
- **Skills / Strategies**（Procedural）：`spec/elo/reliability/status(draft→promoted)`。
- **Strategy Metrics / Merit Ledger**：质量/满意度/成本/延迟的窗口统计与净效用账本。

---

## 4. 评测与晋升（度量体系）

- **目标函数**：`Utility = α·Quality + δ·Satisfaction − β·Cost − γ·Latency`。
- **任务族质量**：`qa.rag / tool.exec / gen.struct` 指标集；满意度：显/隐式（返工率）。
- **护栏**：预算上限 + p95 延迟 SLA；越线降级/中止并返回最佳已得结果。
- **晋升流程**：离线回放胜出 → 影子跟跑 → 5% 金丝雀 72h 稳定 → 晋升；触发条件回滚。

---

## 5. 工具接入与资料更新

- **工具层**：MCP / API tools 统一注册、鉴权、速率与观测。
- **DocSyncer**：持续拉取 OpenAPI/Markdown/网页→`semantic_docs`；Schema Diff 生成策略补丁→回放→小流量试。

---

## 6. 低成本原则与 Monorepo 骨架

- **三大铁律**：离线优先；每任务预算≤¥1（超限→人工审批，可选择降级/缓存）；度量驱动（Autonomy/Spec‑Match/Cost）。
- **目录骨架**（MVP）：`/core /rue /skills /replay-lab /guardrail /storage /ui /ops /examples`。
- **RUE v0.1**：对话+画像→`TaskSpec(SRS)` + `AcceptanceTests` + 风险清单（Spec‑First）。

---

## 7. 测试计划（v0.1）

- 单元：合约/确定性/安全。
- 集成：每任务族≥50 条黄金样本 + 失败样本；预算/延迟护栏测试；回放可重现性。
- 线上：金丝雀 5%，自动回滚阈值（质量跌幅/超 SLA/合规失败）。
- 工具：Fake Tool Server、真实工具 Recorder（录制-回放）。

---

## 8. 近期里程碑（v0.1 → 90 天）

1. **强干内核**：进程内总线 + Outbox、三类记忆、Tool Registry。
2. **策略工厂 v0**：StrategySpec、回放、UCB 路由、金丝雀 5%。
3. **DocSyncer v0**：接入 1–2 个目标 API，Schema Diff 触发回放。
4. **一个任务族闭环**：Web RAG（含引用）或 API→报告；含 HiTL 策略。
5. **测试基线**：合约单测、回放集、金丝雀护栏与回滚。

**并行样板链路**（低成本场景）：

- 内容生产链：选题→脚本→封面→发布草稿。
- 数据→报告链：CSV 清洗→可视化→Markdown 周报。

---

## 9. 执行清单（T0–T14 天）

- Monorepo 初始化：`/kernel` 与 `/plugins` 目录骨架；消息信封/Trace/Outbox 实现。
- RUE v0.1：SRS + 验收生成器（模板 + Gherkin 样例）。
- Replay‑Lab v0：数据集结构、`replay run` CLI、指标导出（SQLite 视图）。
- Guardrail v0：能力令牌（caps）、预算护栏、敏感操作二次确认。
- Skill I/O 协议：STDIN→STDOUT JSON；`report.generate / csv.clean / md.render` 三个基础技能。

---

## 10. 角色分工（示例）

- **内核负责人**：总线/调度/记忆/安全/度量。
- **策略负责人**：策略注册表/回放评测/金丝雀发布。
- **工具负责人**：MCP 接入/Tool Registry/DocSyncer。
- **测试负责人**：单测/集成/回放/护栏。

### 10.1 所有者类型与边界（Human vs. System Agent）

- **推荐组织（混合责任制）**：
  - **Human Area Owner（A）**：每个领域的“责任人”，对目标/安全/成本与最终验收**负责（Accountable）**。
  - **System Ops Agent（R）**：对应领域的“运维/执行代理”，按运行手册执行日常\*\*负责（Responsible）\*\*工作，如回放、金丝雀、路由调权、文档同步等。
  - **Consulted（C）**：相邻域专家/CI 与守护模块（Guardian）。
  - **Informed（I）**：其余成员与相关干系人。

> **v0.1 默认**：四个模块的 **A=专门开发负责人（人）**；对应的 **R=系统代理**（KernelOps/StrategyOps/ToolOps/TestOps）。也就是说：人定目标与审批，代理跑日常与出报表。

### 10.2 可由系统代理承担的职责（Now / Next）

- **内核（KernelOps）**
  - *Now*：Outbox 压测与回放、SLA 监控、预算越线触发 HiTL、异常汇总日报。
  - *Next*：故障自愈（自动降级/冷启动预案）、滚动升级的灰度编排。
- **策略（StrategyOps）**
  - *Now*：离线回放、UCB1 统计、5% 金丝雀发布/回滚、Merit Ledger 报表。
  - *Next*：自动生成策略补丁、失败样本聚类与逆向提示/流程修复建议。
- **工具（ToolOps）**
  - *Now*：DocSyncer 周期拉取、Schema Diff 检测→触发小流量回放与兼容性告警。
  - *Next*：速率/配额自适应、API 退化路径建议（本地缓存/批量化）。
- **测试（TestOps）**
  - *Now*：黄金集回放、失败用例最小复现、覆盖率与变更影响面报告。
  - *Next*：合成数据生成、对抗用例（越权/注入）自动扩充。

### 10.3 人机边界与升级规则

- 以下情况**必须**升级到 Human Owner（A）：
  1. 预算越线进入 **人工审批（HiTL）**；
  2. SLA p95 连续两轮超阈；
  3. 工具 Schema 重大不兼容或涉及 PII/合规风险；
  4. 策略 `delta_score > 0.5` 连续≥3 次；
  5. 影响面≥20% 的配置/版本切换。
- 其余日常事项由 System Ops Agent（R）闭环，并在日报/周报中同步（I）。

### 10.4 产出与节奏

- **日报**：运行概览、异常清单、成本与延迟曲线、Top 失败样本链接。
- **周报**：策略 Elo/Utility 趋势、工具稳定性、覆盖率、下周灰度/回放计划。
- **审批箱**：集中处理预算越线、发布晋升、合规例外的决策。

## 11. 附：RUE SRS 模板（YAML）

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

## 12. DoD（Definition of Done）快照

- 有 SRS 与至少 1 个验收用例；
- 观测指标入库（可回放/可比较/可审计）；
- 金丝雀/回滚策略生效；
- 自动生成发布说明（作为内容素材）。

> 注：本文仅为“资料汇总版”，后续按此提炼成 `agent.md` v0.1 与 `Engineering_Guide` 的执行条款。

---

## 附录 A：执行条款 v0.1（Engineering Guide 精简版）

> 面向 v0.1 原型，所有条款默认“能跑通 > 优雅”，后续再重构。

### A1. Monorepo 初始化（建议）

```
agentos/
  core/            # 内核：bus | scheduler | memory | guardian | telemetry
  plugins/         # 感知/规划/执行/批判/学习（可替换实现）
  registry/        # 策略与技能注册表（StrategySpec/SkillSpec）
  skills/          # 独立进程技能（stdin→stdout JSON）
  replay_lab/      # 回放与评测基建
  storage/         # SQLite + 向量库适配层
  ops/             # 配置、启动脚本、金丝雀路由
  tests/           # 单元/集成/回放样例
  configs/         # 默认配置（预算、SLA、路由权重等）
  pyproject.toml   # Python 3.12；ruff+pytest+mypy（可选）
  Makefile         # make setup|test|replay|serve|canary
```

**快速脚手架（示例）**

```bash
# 依赖：Python 3.12，uv 或 poetry 二选一
uv init agentos && cd agentos
uv add pydantic pyyaml fastapi uvicorn numpy pandas
uv add --dev pytest ruff mypy coverage
```

### A2. 配置与消息信封

- 全局配置：`configs/default.yaml`

```yaml
runtime:
  log_level: INFO
  timezone: Asia/Shanghai
budgets:
  default_cny: 1.0     # 每任务硬上限（人民币）
  default_tokens: 64k
  overrun:              # 预算越线处理策略
    action: hitl        # hitl|auto_downgrade|abort
    approval_channel: inbox  # 审批通知渠道（示例）
    block_paid_calls: true   # 审批前阻断付费调用
sla:
  p95_latency_ms: 8000
  max_retries: 1
routing:
  canary_ratio: 0.05
  bandit: ucb1
security:
  require_confirm_caps: ["tool.payment", "fs.write", "email.send"]
```

- **消息信封（JSON Schema 摘要）**

```json
{
  "$id": "agentos.schema/envelope",
  "type": "object",
  "required": ["msg_id","trace_id","type","payload","ts"],
  "properties": {
    "msg_id": {"type":"string"},
    "trace_id": {"type":"string"},
    "type": {"enum":["obs","plan","step","action","result","review","error"]},
    "payload": {"type":"object"},
    "budget_ctx": {"type":"object"},
    "authz": {"type":"array","items":{"type":"string"}},
    "idempotency_key": {"type":"string"},
    "labels": {"type":"object"},
    "ts": {"type":"string","format":"date-time"}
  }
}
```

### A3. Outbox 与 Traces（SQLite 最小实现）

```sql
-- storage/schema.sql（节选）
CREATE TABLE IF NOT EXISTS outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  envelope_json TEXT NOT NULL,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_outbox_trace_ts ON outbox(trace_id, ts);

CREATE TABLE IF NOT EXISTS traces (
  trace_id TEXT PRIMARY KEY,
  status TEXT,
  started_at DATETIME,
  finished_at DATETIME,
  cost_cny REAL DEFAULT 0,
  tokens_prompt INTEGER DEFAULT 0,
  tokens_gen INTEGER DEFAULT 0
);
```

### A4. 策略/技能规范（Spec-First）

- **StrategySpec（YAML）**

```yaml
id: rag.web.v1
purpose: "基于网页资料生成含引用的问答"
inputs: [query]
outputs: [answer, citations]
constraints: ["cost<=1cny", "p95<=8s"]
metrics: {quality: 0.6, satisfaction: 0.2, cost: 0.1, latency: 0.1}
rollout: {stage: draft}
```

- **Skill I/O（stdin→stdout JSON）**

```json
// 输入
{"op":"csv.clean","args":{"path":"/data/in.csv"}}
// 输出
{"ok":true,"result":{"rows":1234,"path":"/data/clean.csv"}}
```

### A5. Canary 路由与 Bandit（UCB1）

- **路由配置**

```yaml
routes:
  rag.web:
    candidates: ["rag.web.v1", "rag.web.v1b"]
    canary_ratio: 0.05
    bandit: ucb1
```

- **UCB1 打分（伪代码）**

```
score = mean_utility + c * sqrt(2 * ln(total_calls) / calls_i)
utility = 0.6*quality + 0.2*satisfaction - 0.1*cost - 0.1*latency
```

### A6. Replay-Lab（离线优先）

- **数据集格式**：`replay_lab/datasets/rag_web.jsonl`

```json
{"id":"Q1","query":"Flash Attention 的核心优势是什么？","gold":"…"}
```

- **命令设计**

```bash
make replay DS=replay_lab/datasets/rag_web.jsonl STRAT=rag.web.v1
# 输出：metrics/*.json、runs/*/trace.sqlite、对比表
```

### A7. Guardrail（预算与合规）

- 预算护栏：超出 `budgets.default_cny` → 触发**人工审批（HiTL）**，暂停继续调用付费模型/工具；保留当前最优结果草稿供审批后继续/降级执行。延迟越线仍按 SLA 中止并入库。
- 能力令牌：`authz` 校验敏感工具，命中 `security.require_confirm_caps` 强制二次确认。

---

## 附录 B：RUE v0.1（Spec-First 工具包）

### B1. SRS 模板（YAML）

```yaml
goal: "生成10条视频选题并按热度排序"
context: {domain: "短视频运营", horizon: "近30天"}
constraints: ["成本≤¥1", "完成≤2min", "引用近1年数据"]
acceptance:
  - id: A1
    given: "已有历史视频标题与表现数据"
    when:  "运行 ideation.rank"
    then:  "产出10条并包含热度分与来源链接"
risks:
  - "数据源不全→回退本地语料"
  - "热点歧义→人工确认"
```

### B2. 验收用例（Gherkin）

```
Feature: 视频选题生成
  Scenario: 返回10条且含来源
    Given 已加载近30天视频数据
    When 运行 ideation.rank with budget 1 CNY
    Then 返回 10 条结果 And 每条包含 heat_score 和 source_url
```

---

## 附录 C：首个任务族建议与 DoD

### C1. 默认选择：数据→报告链（低成本高价值）

- **链路**：CSV 清洗 → 统计与图表 → 生成 Markdown 周报（附图）。
- **必备技能**：`csv.clean`、`viz.plot`、`report.generate`。

### C2. DoD（Definition of Done）

- 有 SRS 与 ≥1 个验收用例；
- 回放集（≥50 条样本，含失败样本）可复现；
- 观测指标入库：质量/满意度/成本/延迟；
- 5% 金丝雀启用且具回滚阈值；
- 自动产出发布说明（changelog.md）。

---

## 附录 D：本周（T0–T7）行动清单

1. 初始化 Monorepo 与基础依赖，落地 `storage/schema.sql` 与 `configs/default.yaml`；
2. 打通 Outbox→Replay 流：将一次完整执行写入 SQLite 并可回放；
3. 实现 3 个基础技能：`csv.clean` / `viz.plot` / `report.generate`（命令行模式）；
4. 建立 `rag.web.v1` 的 StrategySpec 与 10 条样例回放数据；
5. 接入 Canary 路由（5%）+ UCB1 统计与页面化指标导出；并接入预算越线人工审批流（暂停付费调用+审批继续）。
6. 完成 20 条验收用例（Gherkin）与最小集成测试（CI）。

> 说明：上面所有样例均可直接复制为项目初始化素材，后续我可以把这些片段整理成实际文件结构（含 Makefile 和模板）放到一个压缩包，作为 v0.1 脚手架。

---

## 附录 E：任务评价采集（TEC：Task Evaluation Capture）

> 目标：系统性收集“用户期望 vs. 实际结果”的差异，量化**满意度**与**偏差（Delta）**，回灌到 Merit Ledger 与策略工厂。

### E1. 评价采集三阶段

1. **期望收集（Before）**：在 RUE 生成 SRS 后，追加“期望卡”（用户用自然语言写 1–3 条 *What does success look like?* 与 *Must‑have*）。
2. **结果回执（After）**：任务完成时生成“任务回执”（成本、延迟、通过/未通过的验收、产出清单）。
3. **差异确认（Review）**：用户一键选择 **接受/修改/阻塞**，并填写“哪里不符合期望”（结构化+自由文本）。

### E2. 数据模型（SQLite 最小表）

```sql
-- 期望版本（支持任务执行中的澄清/修订）
CREATE TABLE IF NOT EXISTS task_expectation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  source TEXT CHECK(source IN ('user','auto')) DEFAULT 'user',
  summary TEXT,                    -- 用户摘要（1-3条）
  must_haves JSON,                 -- ["含来源链接","图表不少于2张",...]
  acceptance JSON,                 -- RUE 生成/更新的验收用例（快照）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 结果回执（与 traces 关联）
CREATE TABLE IF NOT EXISTS task_outcome_receipt (
  trace_id TEXT PRIMARY KEY,
  outputs_manifest JSON,           -- 产物清单（文件/链接/字段）
  acceptance_pass JSON,            -- 通过的验收用例ID
  acceptance_fail JSON,            -- 未通过的验收用例ID
  cost_cny REAL, latency_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户评价（一次任务可多次评价，以最后一次为准参与路由）
CREATE TABLE IF NOT EXISTS task_evaluation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  eval_version INTEGER DEFAULT 1,
  satisfaction INTEGER CHECK(satisfaction BETWEEN 1 AND 5),
  decision TEXT CHECK(decision IN ('accept','request_changes','block')),
  reasons JSON,                    -- 结构化原因：missing, wrong_format, not_actionable, too_slow, off_topic
  comment TEXT,                    -- 自由文本
  delta_score REAL,                -- 自动计算：期望-结果差异分（0~1，越大差异越大）
  delta_json JSON,                 -- 机器生成的差异明细（见E4）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_eval_trace ON task_evaluation(trace_id);
```

### E3. 交互与消息

- **消息类型**：`feedback.request`（推送回执+问卷）、`feedback.submit`（用户提交）。
- **触发策略**（配置示例）：

```yaml
feedback:
  required_on:
    - first_use_of_strategy
    - cost_over: 0.2   # 单次成本>¥0.2
    - request_changes  # 曾被打回
  form:
    dims: ["fit_to_need","faithfulness_to_spec","usefulness","clarity","appearance","turnaround"]
    decision: ["accept","request_changes","block"]
```

### E4. 自动差异计算（Delta）

- **输入**：最近版本 `task_expectation`（summary/must\_haves/acceptance） 与 `task_outcome_receipt`（outputs\_manifest/通过情况）。
- **方法**（v0.1 简化）：
  - *Must‑have 覆盖率*：`coverage = passed_must_haves / total_must_haves`。
  - *验收通过率*：`acc_rate = |pass| / (|pass|+|fail|)`。
  - *语义差异*：对（期望摘要 ↔ 主要产出）做关键词抽取→Jaccard 相似度 `jac`。
  - **Delta 分**：`delta = 1 - (0.5*coverage + 0.3*acc_rate + 0.2*jac)`（0\~1）。
  - 生成 `delta_json`：列出未覆盖的 must‑haves、未通过验收、语义缺口关键词。

### E5. 指标回灌（Merit Ledger / 路由）

- 将 `satisfaction` 归一化为 `[0,1]` 参与 Utility：`U = α·Quality + δ·Satisfaction − β·Cost − γ·Latency`。
- 将 `delta_score` 以惩罚项形式叠加到策略 Elo/可靠性，并反馈给 UCB1：
  - `utility' = utility - λ·delta_score`（默认 λ=0.3）。
  - 当 `delta_score > 0.5` 连续 3 次 → 降级或冻结候选策略。

### E6. API 草案

- `GET /receipt/{trace_id}` → 返回回执与当前 delta 概览。
- `POST /feedback/{trace_id}` → 提交评价（负载 Schema 如下）：

```json
{
  "satisfaction": 4,
  "decision": "request_changes",
  "reasons": ["missing","wrong_format"],
  "comment": "期望有2张对比图和来源链接，目前只有1张图且无引用。"
}
```

### E7. 前端最小表单（建议）

- 顶部显示**任务回执**卡片（成本/延迟/通过验收/产物链接）。
- 中部显示**差异摘要**（未覆盖 must‑haves、未通过验收、语义缺口 Top‑5 词）。
- 底部是**一键操作**：接受 / 请求修改 / 阻塞 + 1–5 星 + 结构化原因多选 + 备注。

### E8. 测试与验收

- 构造 10 组“高期望/低结果”“低期望/高结果”样例，校验 `delta_score` 单调性。
- 回放中注入 `feedback.submit`，确认路由权重在 3 次负反馈后下降。
- 端到端：用户打回后生成新的 `trace_id`（修订任务）且保留跨 trace 关联。

> 集成说明：该模块只新增 3 张表、2 个消息类型与 1 组配置，不影响现有执行链。v0.1 的语义差异度先用关键词+Jaccard，后续可切换到嵌入/对齐评估。

---

## 附录 F：Solo 模式与外部编码助手集成（Claude Code / Codex）

> 一人团队的“混合开发”方案：你 = 唯一的 **A（Accountable）**；外部编码助手（Claude Code / Codex）按领域扮演 **R（Responsible）**；AgentOS 作为流程与度量“地基”，逐步把外援替换成内生 Dev‑Agents。

### F1. 运行模型（RACI）

- **你（人类）**：唯一 Owner（A），拍板预算/发布/合规；处理 HiTL 审批与关键风险。
- **外部编码助手（R）**：
  - *KernelOps Agent*（Claude/Codex 之一）：内核/总线/记忆/度量代码与重构。
  - *StrategyOps Agent*：策略工厂、UCB1 路由、金丝雀与回滚实现。
  - *ToolOps Agent*：MCP/Tool Registry、DocSyncer、Schema Diff 处理。
  - *TestOps Agent*：回放集、验收用例、CI、对抗样例。
- **AgentOS（C/I）**：提供 SRS/验收、Outbox/Replay、Metrics/TEC、预算护栏。

### F2. 一次标准交付流程（Solo 循环）

1. **编写工单（Work Order）**：用 RUE 产出的 SRS + 验收，生成 `dev_ticket.yaml`（见 F4）。
2. **指派领域助手**：把【领域角色说明 + 工单 + 代码上下文】投喂到 Claude/Codex。
3. **产出 PR**：外部助手提交变更（代码/测试/文档/迁移脚本）。
4. **自动回放与度量**：`make replay` 跑数据集；采集质量/成本/延迟与 TEC 反馈草案。
5. **金丝雀发布**：`make canary` 上 5%；监控 Utility/错误/成本，异常自动回滚。
6. **收集用户评价**：触发 TEC 表单；将 `satisfaction` 与 `delta_score` 写回 Merit Ledger。
7. **合并与归档**：满足 DoD → 合并；生成 changelog 与发布说明。

### F3. 领域助手 Charter（可直接贴给 Claude/Codex）

```
# Charter: KernelOps Agent
使命：在不突破 budgets/sla 的前提下，按 SRS/验收交付 AgentOS 内核功能，代码需通过回放与单测。
输入：本次 dev_ticket.yaml、相关源码片段、storage/schema.sql、configs/default.yaml
必须遵守：
- 不引入未在 pyproject.toml 声明的依赖；
- 对 Outbox/Traces 的 schema 变更需附迁移脚本；
- 写至少 5 条失败样例并加入 replay_lab；
- 预算越线改为 HiTL 挂起，不得私自降级；
输出：
- 代码改动、测试、迁移脚本、简短设计记录（WHY/边界/权衡）。
```

（StrategyOps/ToolOps/TestOps 可用同模版换“使命/输入/输出”要点）

### F4. 工单模板 `ops/dev_ticket.yaml`

```yaml
id: DEV-2025-09-xxx
area: kernel|strategy|tool|test
summary: "实现 Outbox 幂等与回放 CLI"
context:
  repo: agentos
  branch: feature/outbox-replay
spec:
  goal: "回放任意 trace_id，导出 metrics.json 与对比报告"
  acceptance:
    - id: A1
      given: "已有 outbox.sqlite 与 10 条样例"
      when:  "运行 make replay DS=..."
      then:  "生成 metrics/*.json 且通过基线对比（质量不降于 -1%）"
constraints: ["成本≤¥1", "p95≤8s"]
artifacts: ["storage/schema.sql","Makefile","replay_lab/*"]
risks: ["数据量大导致回放慢→分片回放"]
```

### F5. 仓库集成与命令

- 目录：`ops/prompts/`（Charter 模板）、`ops/tickets/`（工单）、`ops/scripts/`（检查/发布脚本）。
- 命令：

```bash
make ticket NEW=DEV-2025-09-001      # 生成工单样板
make assign AREA=kernel TICKET=...    # 生成给 Claude/Codex 的上下文包（压缩源码片段+SRS+验收）
make review PR=123                    # 本地跑单测+回放+lint
make canary                           # 5% 发布并跟踪指标
```

### F6. 治理与安全

- **预算越线=HiTL**：触发审批流，暂停付费调用；审批后继续/降级。
- **变更门槛**：DB Schema/安全策略/成本权重变更必须附 ADR（Architectural Decision Record）。
- **可追溯**：每次外部助手提交必须绑定 `dev_ticket.yaml` 与 `trace_id`。

---

## 附录 G：迁移路线（从外部助手 → AgentOS 自举开发）

> 目标：当 AgentOS 具备稳定“读→改→测→发”的能力，就让它接管部分乃至全部开发链路。

### G1. 分阶段路线

- **阶段 0：外援主导**（当前）
  - 你做 A；Claude/Codex 做 R；AgentOS 只提供规约与度量。
- **阶段 1：影子执行（Shadow）**
  - 在每次外援提交后，AgentOS 的 *Dev-Agent* 跟跑：自动补齐测试、生成回放数据、产出设计记录草稿。
- **阶段 2：共驾（Co‑pilot）**
  - 引入三个内生技能：`dev.codegen`（代码生成/重构）、`dev.testgen`（用例与对抗样例）、`dev.release`（金丝雀与回滚）。对低风险改动先由 Dev‑Agent 直接提交 PR（标注 `auto`）。
- **阶段 3：接管（Takeover）**
  - Dev‑Agent 对“低风险+高重复”的需求端到端闭环；外援仅做稽核与难点攻关；最终逐步停用外援。

### G2. 接管判据（Definition of Replace）

- 最近 200 次改动中：
  - Dev‑Agent 产生的 PR 的 **回滚率 ≤ 外援 80%**；
  - **delta\_score ≤ 0.2** 的比例 ≥ 85%；
  - 成本与延迟分别低于外援中位数的 20%。
- 通过后，把该任务族的 `routes.*.candidates` 中外援路径标记为 `deprecated`。

### G3. 风险与缓解

- **模型漂移**：固定测试与回放基线；每周回归。
- **语境缺失**：强制 `dev_ticket.yaml` 与代码片段打包，减少“遗忘”。
- **安全/合规**：敏感能力走 HiTL；对外网写操作必须双人复核（你 + Dev‑Agent）。

---

> 这两章落地后，你即可“一人带四 Agent”快速推进；等 AgentOS 的 Dev‑Agent 成熟，就能把外部助手逐步替换掉，实现“自己开发自己”。
