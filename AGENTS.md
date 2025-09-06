# agents相关文档查看 CLAUDE.md

# 使用中文和我交流

该文件同时作为后续 TODO 清单的存放处。

> 说明：agents 相关文档详见 `CLAUDE.md`。此清单按 P0/P1 优先级、关键决策、风险与度量，以及里程碑组织，作为后续执行蓝图。

## 6 周 v1 闭环场景（唯一路径）

- [ ] 从模板创建一个三节点示例 DAG（输入 → 转换 → 输出），在 Console 中运行；查看实时日志与 Trace；引入一次可控失败（类型不匹配或缺失参数），通过 Inspector 修复并重跑直至成功；保存为“发布版本”并生成差异记录。

### 三项最优先投入（保证闭环顺滑）

1. 一体化 Console 与全局状态（含全局搜索/命令面板）
2. 大图性能与可操作性（虚拟化、自动布局、状态过滤、选区重跑）
3. 可观察性与 Trace（日志联动、OTel 关联 id、可点击进度条）

## 重构范围与约束（前端优先）

- 仅改前端（Studio/Flow/Inspector/Console），暂不引入新后端；数据仍走 IndexedDB（Dexie）。
- 依赖自上而下：UI → App Services → Domain/Ports → Adapters；禁止反向依赖与深路径导入。
- 执行与安全：Web Worker 沙箱，默认断网，能力 deny-by-default；结构化日志 + NDJSON 导出。
- 插件路线：V1 先走 ESM 动态导入 + Worker 沙箱；MF 暂缓。
- 版本策略：保存即新版本；草稿与“发布版本”分离；支持回滚与固定版本运行。
- 可观测性：链路 id（runId/chainId/nodeId）贯穿；对齐 OTel 语义（后续接入）。
- 性能基线：首屏 < 1.5s；90% 交互 < 100ms；画布 < 16ms/帧；日志分片加载与限流。

## 命令行使用规范（防卡住）

- 原则：避免交互/守护/长时间运行命令；输出分片；设置超时；优先轻量工具。
- 搜索/列目录：优先 `rg`/`rg --files`，避免 `grep -R`、`ls -R`。
- 看文件：使用 `sed -n '1,200p' path` 分段查看；单次输出≤250行。
- 测试：用 `npm run test` 或 `vitest run`；避免 `--watch`/`--ui`；必要时只跑子集（如 `vitest --run src/flow`）。
- 构建/预览：CI/代理环境不运行 `vite` 开发/预览服务；仅在本地手动验证。
- 网络：避免 `npm install` 等联网命令（环境默认受限）。
- Git 操作：变更用 `apply_patch` 工具；不直接在代理环境执行 `git commit`/`push`。
- 超时：为潜在慢命令设置 ≤120s 超时；长任务拆分为多步。
- 重试：对偶发失败命令最多重试 2 次（5–10s 退避）；优先缩小作用域而非盲目重试。

推荐 Do：
- `rg -n "pattern" src packages`
- `rg --files | rg -n "\.tsx?$"`
- `sed -n '1,200p' src/studio/StudioPage.tsx`
- `npm run test:module --silent` 或 `vitest --run --reporter=dot`

避免 Don’t：
- `npm run dev`、`vitest --watch`、`vitest --ui`、`vite preview`（会常驻/交互）
- `ls -R`、`grep -R`（慢且噪音大）
- 任何需要网络或外部 GUI 的命令

如确需长任务（例如端到端测试），先在 PR 说明并限定范围与时长；默认不在代理环境执行。

## TODO

### P0（先做，它们最影响可用性）

- [ ] 一体化 Console 与全局状态
  - [x] StudioPage 集成基础 Console（RunCenter + FlowEditor）— 原型在 src/studio/StudioPage.tsx
  - [ ] 统一运行面板/错误修复/测试为 Console
  - [ ] 顶部全局状态条（当前 run、用时、成功率、缓存命中、活跃日志源）
  - [ ] ⌘K 命令面板与全局搜索（节点/日志/Artifact/参数）

- [ ] 大图性能与可操作性
  - [x] 节点/边虚拟化与惰性渲染 — 已在 FlowCanvas 实现并覆盖测试
  - [ ] 子图/分组折叠（按标签或子流程）
  - [ ] 自动布局（elkjs） — 基础能力已实现（utils.autoLayout），接入 FlowEditor 画布/工具栏
  - [ ] 状态过滤（只看 failed/running）
  - [ ] 框选批量操作与“选区重跑”

- [ ] 从模拟页迁移（对齐功能，抽象为可复用组件）
  - [ ] DSL 迁移向导（节点级 + 字段级）— 抽离状态与组件，接入 Inspector 触发
  - [ ] 错误修复 Agent：补丁生成 + Dry‑Run + 合并重跑（日志上下文最小化）
  - [ ] 测试面板：保留最近 N 条只读视图；核心用例迁移至 vitest
  - [ ] DSL 预览只读化（编辑统一走 Inspector/Graph）

- [ ] 迁移向导进阶（双向一致性的护栏）
  - [ ] 自动映射置信度标签（高/中/低）与原因说明
  - [ ] 批量规则：同名字段全局映射、正则/路径表达式批处理
  - [ ] 模拟运行（no-op）预估受影响节点数与失败风险
  - [ ] 撤销/审计：每步入事件流，可逐步回滚

- [ ] 强类型与校验
  - [x] 为 DSL 维护 JSON Schema / TS 类型 — 已落地（Ajv + TS 类型）
  - [ ] Inspector 表单即时校验
  - [ ] outputs 变更触发兼容性判定（breaking / non-breaking / unsafe），在事件流显式提示

- [ ] 版本与分支
  - [ ] 保存即新版本（备注、差异视图：代码/DSL/映射/配置）
  - [ ] 草稿分支与“发布版本”分离
  - [ ] 对比视图一键回滚

- [ ] 可观察性与 Trace
  - [ ] Trace 进度条可点击跳转节点
  - [ ] 日志级别过滤、书签、跳至最新/锁定滚动
  - [ ] 为 run/节点打上 OpenTelemetry 关联 id，日志—事件—节点三向联动 — 基础链路 id 已具备（runId/chainId/nodeId），待接入 OTel 标准

### P1（随后做，提升开发者幸福感）

- [ ] 代码页（Monaco + LSP）
  - [ ] LSP/格式化/诊断；`# outputs:` 片段有 snippet 生成器
  - [ ] 保存前预检（类型与引用完整性）

- [ ] 错误修复 Agent 安全落地
  - [ ] 提示模板：失败节点代码 + 最近 N 行日志 + 输入切片
  - [ ] 分块补丁可选择性应用
  - [ ] Dry-Run 沙箱（隔离依赖/密钥）

- [ ] Inspector 可视化数据血缘
  - [ ] 入参来源标注（常量/上游/表达式），一键复制路径
  - [ ] 显示采样数据与类型

- [ ] 键盘无障碍
  - [ ] 完整快捷键映射（Space 运行/暂停、R 重跑当前、F 聚焦失败、G 跳转 Graph）
  - [ ] 状态色对比度校验

- [ ] Artifact 体验
  - [ ] 时间线/表格视图、常见类型内联预览
  - [ ] 失效策略与批量下载

- [ ] 首次体验与空态引导
  - [ ] 示例 DAG、迁移向导 demo、常见错误修复指引

### 关键产品决策（尽早对齐）

- [ ] DAG 规模目标：是否必须支持千级节点（影响虚拟化与数据加载策略）
- [ ] 并发编辑与锁：多人协作冲突合并与“热区锁”
- [ ] 权限与发布流：API/MCP 发布权限、审阅与回滚策略
- [ ] 日志与 Artifact 保留：配额/清理策略，下载网关
- [ ] 密钥与环境：配置与代码分离，按作用域注入
- [ ] 缓存键策略：命中可视化解释，防污染（命名冲突/输入哈希化）

### 风险与防线

- [ ] 大图渲染/布局抖动 → 虚拟化 + 增量布局 + skeleton
- [ ] 双向编辑竞态（Graph/Inspector/DSL）→ 单一数据源 + 原子事务 + 变更队列
- [ ] Agent“幻觉式修复” → 上下文约束 + Dry-Run + 最小权限沙箱
- [ ] 版本爆炸 → 草稿合并策略 + 过期清理 + 版本备注必填
- [ ] 日志洪泛/浏览器内存 → 流控、分片加载、按级别采样

### 度量（衡量是否“对”）

- [ ] 首个成功运行用时（TTFSR）
- [ ] 迁移通过率
- [ ] 自动映射命中率
- [ ] 失败后一次修复成功率
- [ ] 首屏渲染 < 1.5s
- [ ] 90% 交互 < 100ms

### 里程碑建议

- [ ] M1：编排与运行（Graph/Inspector/Console 基础、WS 事件流、最小 Trace）
- [ ] M2：调试与可观测（日志联动、状态过滤、全局搜索/命令面板）
- [ ] M3：迁移向导 v1（节点级 + 字段级、撤销与事件流）
- [ ] M4：Agent 修复 & 测试（Dry-Run、补丁分块、内置测试套件）

## 按模块拆解 TODO（P0/P1）

— 说明：下列模块化清单与上方 P0/P1 一一映射，便于并行推进与验收。

### Studio / Console（统一面板）

- P0: 统一运行/错误修复/测试为 Console Tab（占位 → 可用）
- P0: 顶部全局状态条（runId、用时、成功率、缓存命中、活跃日志源）
- P0: ⌘K 命令面板与全局搜索（节点/日志/Artifact/参数）
- P0: 选区重跑（画布选中 → Console 执行范围）
- P1: 键盘无障碍（Space 运行/暂停、R 重跑、F 聚焦失败、G 跳转 Graph）

### Flow / 画布（性能与可操作）

- P0: 节点/边虚拟化与惰性渲染（已完成，巩固测试覆盖）
- P0: 自动布局接入（`src/flow/utils.ts:autoLayout` → FlowEditor 工具栏）
- P0: 状态过滤（failed/running）与最小筛选面板
- P0: 子图/分组折叠（按标签或子流程）
- P0: 框选批量操作与“选区重跑”联动 Console

### Inspector / 强类型与校验

- P0: 表单即时校验（Ajv + JSON Schema）
- P0: outputs 变更兼容性判定（breaking/non-breaking/unsafe）并写入事件流
- P0: 触发 DSL 迁移向导（节点级 → 字段级）
- P1: 可视化数据血缘（入参来源标注/采样数据/类型）

### Run Center / 可观测性

- P0: Trace 进度条可点击跳转节点（链路联动 Flow）
- P0: 日志级别过滤、书签、跳至最新/锁定滚动
- P0: 贯穿 runId/chainId/nodeId，预留 OTel 语义映射
- P1: 运行列表/详情、错误热力、耗时曲线（P50/P95），NDJSON 导出入口

### App Services（CQRS 门面）

- P0: `startRun/retryNode` 与事件流对齐 Run Center，写入 Dexie（runs/logs）
- P0: 保存即新版本（代码/DSL/映射/配置差异记录）
- P1: 固定版本运行、草稿/发布分离与一键回滚（对比视图）

### 数据与存储（Dexie）

- P0: 表结构与索引校准（runs/logs/versions/flows/nodes/events）
- P0: 日志分片加载与导出 NDJSON（与 Run Center 对齐）
- P1: 保留/清理策略与配额预警；导入/导出工具

### Runtime / Worker（沙箱执行）

- P0: Web Worker 默认断网、超时终止、结构化事件（ExecRequest/ExecEvent）
- P1: Dry‑Run 沙箱（隔离依赖/密钥）、能力白名单（deny‑by‑default）

### 迁移向导（双向一致性护栏）

- P0: 从模拟页迁移：节点级选择 → 字段级映射 → 应用与事件流
- P1: 批量规则（同名全局映射、正则/路径表达式）、撤销/审计与风险预估

### 代码页（Monaco + LSP）

- P1: LSP/格式化/诊断；`# outputs:` 片段 snippet 生成器
- P1: 保存前预检（类型与引用完整性）

### Artifact 体验 & 无障碍

- P1: Artifact 时间线/表格视图、常见类型内联预览、批量下载与失效策略
- P1: 快捷键与对比度校验（可访问性）

## 起步入口（文件参考）

- 交互样板：docs/工作流编排_studio（模拟页面）.jsx
- 可运行壳：src/studio/StudioPage.tsx
- 自动布局：src/flow/utils.ts（`autoLayout`）
- 画布虚拟化：src/flow/FlowCanvas.ts

## 更新约定与模板（每次任务完成必更）

- 更新时机：每个任务完成后立即更新本文件（AGENTS.md）。
- 更新内容：
  - 变更小结（1–3 行，说明做了什么、为何）
  - 影响模块（Studio/Console、Flow、Inspector、Run Center、App Services、Runtime、Data等）
  - 文件引用（路径与关键行号，如有）
  - TODO 状态同步（勾选/细化）
  - 下一步（1–2 个可执行项）
- 建议格式：在对应模块小节下补充“变更小结”，并同步上方 P0/P1 的勾选状态。

示例模板：

```
### 变更小结（YYYY-MM-DD）
- 模块：Studio / Console
- 摘要：接入 Console Tab 占位，串联 RunCenter 日志流。
- 关联：src/studio/StudioPage.tsx:42、docs/adr/0003-重构.md:294

#### TODO 更新
- [x] 统一运行/错误修复/测试为 Console（占位）
- [ ] 顶部全局状态条（runId/用时/成功率/缓存/日志源）

#### 下一步
- 在 FlowEditor 工具栏接入 `autoLayout` 按钮
```

### 变更小结（2025-09-06）
- 模块：工程流程 / 文档
- 摘要：新增“命令行使用规范（防卡住）”，PR 模板加入 AGENTS.md 更新与命令规范检查项。
- 关联：AGENTS.md:23、AGENTS.md:62、AGENTS.md:96、AGENTS.md:139；.github/pull_request_template.md:29、.github/pull_request_template.md:72
