# CLAUDE.md

> 本文件用于指导 **Claude Code（claude.ai/code）** 在本仓库中的工作方式，确保生成与修改代码可预测、可回滚、可验证。

---

## 0. 使用须知（Claude 必读）

* **最小改动，明确范围**：除非特别说明，只修改在「任务说明」中列出的文件与位置。
* **可审阅输出**：所有提交必须提供 `变更摘要`、`风险点`、`手动验证清单` 与 **统一 diff**（unified diff）。
* **保持外部契约不破坏**：公共 API、存储结构、事件协议、URL、组件 props 在未显式批准前必须向后兼容。
* **先测后码**：能先写测试就先写（或同步补充），确保红→绿→重构。
* **严格类型**：TypeScript 开启 `strict`，宁愿多写类型也不使用 `any`（除非有 `// TODO(any):` 注释与后续计划）。
* **拒绝虚构**：不编造依赖、文件、脚本、环境变量名。需新增请在「变更计划」中显式声明。

---

## 1. 项目概览

**Superflow** 是一个集成 **想法 → 蓝图 → 流程 → 运行/调试/修复** 的开放平台，通过 AI 拆解需求与生成节点代码，支持日志捕捉、版本管理与动态集成外部系统。

### 目录结构与职责

* **`ideas/`**：从「需求/想法」转为结构化蓝图（schema、约束、验证）。
* **`planner/`**：将蓝图规划为可执行 DAG（拓扑、依赖、重试策略）。
* **`flow/`**：基于 **React Flow** 的流程画布与运行时（可视化、交互、布局、快捷键）。
* **`nodes/`**：节点定义（元数据/IO/校验）、节点逻辑、**独立调试页面**。
* **`run-center/`**：运行中心与可观测性（日志、trace、metrics、运行记录）。
* **`shared/`**：通用工具、类型定义、跨端常量、存储访问封装。

> **约束**：跨模块调用通过 `shared/` 的公共类型与方法；禁止从 feature 模块彼此直接 import 内部实现。

---

## 2. 开发命令（约定）

```bash
# 开发环境
npm run dev                 # 启动开发服务器

# 构建与测试
npm run build               # TypeScript 编译 + Vite 构建
npm run test                # Vitest 单测
npm run test:watch          # 监视模式
npm run test:coverage       # 覆盖率报告
npm run test:ui             # 可视化测试界面

# 代码质量
npm run lint                # ESLint 检查
npm run lint:fix            # ESLint 自动修复
npm run type-check          # tsc --noEmit（类型检查）
npm run format              # Prettier 格式化
npm run format:check        # 格式检查
```

**CI 基线（必须全部通过）**：

1. Node.js 多版本矩阵（18.x / 20.x / 22.x）； 2) TypeScript 类型检查； 3) ESLint； 4) Prettier； 5) Vitest； 6) Build 校验。

---

## 3. 分支策略与自动合并

* **`main`**：受保护分支，CI 通过且评审同意后合并。
* **`codex/*`**：功能分支，合并后自动清理。
* **自动合并**：打上 `auto-merge` 标签或 PR 标题包含 `[auto-merge]`，且 **全部检查通过** 后执行。
* **提交信息**：采用 Conventional Commits（`feat|fix|docs|refactor|test|chore`），PR 标题与首条 commit 对齐。

---

## 4. 代码风格与质量

* **模块边界**：公共类型放 `shared/`，避免循环依赖；UI 与业务逻辑解耦；优先组合而非继承。
* **导出约定**：优先 **命名导出**；默认导出仅用于 React 组件或页面级对象。
* **错误处理**：

  * 使用 `Result<T, E>` 或 `try/catch` + 结构化错误类型（含 `code`、`message`、`cause`）。
  * 记录 `traceId`（从运行上下文或日志上下文获取）。
* **异步约定**：所有 I/O 使用 `AbortSignal`；支持超时与取消。
* **日志**：统一 `logger.info|warn|error({ event, data, traceId })`；禁止输出敏感信息。
* **UI**：React 组件保持纯函数；副作用集中到 hooks（`useEffect`、自定义 hooks）。
* **测试**：

  * 单元测试覆盖核心分支；组件使用测试库（`@testing-library/react`）以行为为准。
  * Worker 与主线程交互使用 mock 通道进行契约测试。

---

## 5. Web Worker 执行模型

项目使用 **Web Worker** 作为沙箱执行用户代码：

* 主线程负责 UI 与协调；Worker 负责用户代码执行，支持 **硬超时** 与 **取消**。
* 线程间通信使用 **Comlink**（或同等封装）。
* 用户代码需导出如下签名：

```ts
export async function handler(input: unknown, ctx: {
  signal: AbortSignal;             // 取消/超时控制
  logger: { info: Fn; warn: Fn; error: Fn }; // 结构化日志
  env?: Record<string, string>;    // 受控环境变量（无机密）
  kv?: { get: Fn; put: Fn; del: Fn }; // 受限 KV 接口（由 Dexie 适配）
}): Promise<unknown>
```

* **序列化约束**：`input` 与返回值必须可结构化克隆；不得传递函数/DOM/循环引用。
* **资源限制**：执行时间上限（默认 10s，可配置），消息体 ≤ 1MB。
* **错误协议**：抛出错误须含 `name`、`message`、可选 `stack`；主线程展示用户友好信息并保留技术细节于日志。

---

## 6. 数据存储（IndexedDB / Dexie）

* 使用 Dexie 管理本地数据，支持离线与导出；全局主键使用 **ULID**。
* **建议表结构**（示例）：

```ts
// shared/db/schema.ts
export const DB_VERSION = 3; // 修改结构时 +1，并提供迁移

export interface RunRecord { id: string; flowId: string; startedAt: number; finishedAt?: number; status: 'success'|'failed'|'running'; traceId: string; }
export interface LogRecord { id: string; runId: string; ts: number; level: 'info'|'warn'|'error'; event: string; data?: unknown; }
export interface VersionRecord { id: string; nodeId: string; createdAt: number; author: string; message: string; diff: string; }

// Dexie 定义（略）；为每张表建立索引：by flowId/runId/ts/status 等。
```

* **迁移规则**：版本号 +1，提供向前/向后兼容迁移；禁止破坏性变更不迁移。
* **导出/导入**：导出 JSON（含 schema version）；导入时进行版本兼容检查与转换。

---

## 7. React Flow 与流程运行时约定

* 节点 `id` 使用 ULID；边的 `id` = `${source}:${sourceHandle}->${target}:${targetHandle}`。
* 节点元数据：`kind`（类别）、`version`（语义化版本 `x.y.z`）、`io`（输入/输出端口 schema）、`capabilities`（可并发、幂等等）。
* 运行策略：

  * **调度**：拓扑排序 + 准入条件（数据就绪、重试预算、并发限制）。
  * **重试**：指数退避 + 抖动（默认 3 次，基于错误类型可配置）。
  * **缓存**：对纯函数节点可启用基于 `input` 的结果缓存（哈希键）。
* 可视化：布局保持稳定；变更产生最小位移；支持对齐、吸附、框选与键盘操作。

---

## 8. CI/CD 与质量门禁

* 所有 PR 必须：

  1. 通过矩阵 CI； 2) 构建通过； 3) 单测覆盖率 ≥ 70%（核心模块 ≥ 80%）； 4) Lint 与格式全绿。
* 变更若涉及 **公共契约**（API、存储、协议、事件），需提供「迁移说明」与「回滚策略」。
* 自动发布（如有）：仅在 `main` 打 tag 时触发；产物附带 SBOM（可选）。

---

## 9. 安全与合规

* 绝不将密钥写入仓库或日志；`.env` 不入库，示例放 `.env.example`。
* 依赖安全：开启 Dependabot/Renovate；CI 运行 SAST 与 secrets 扫描（如 gitleaks）。
* 第三方授权与许可：新增依赖须在 PR 描述中标注许可证与用途。

---

## 10. Claude 工作流与输出格式

> 以下规则用于规范 Claude 在对话中的「输入→输出」形态，便于直接复制到 PR。

### 10.1 任务受理

在开始任何修改前，Claude 应输出：

1. **任务理解**（一句话）；
2. **影响面**（模块/文件清单）；
3. **变更计划**（分步列点，含新增/删除文件）；
4. **验证计划**（自动化与手动步骤）。

### 10.2 补丁输出（统一格式）

* **Diff**：使用 *unified diff*，仅包含修改文件；新增文件给出完整内容；**不要省略片段**。
* **变更摘要**：面向人类的 3–7 条要点；
* **风险与回滚**：列潜在影响、监控指标、回滚步骤（git 命令或配置开关）。
* **手动验证清单**（示例）：

  * [ ] `npm run build` 通过
  * [ ] `npm run test` 全绿
  * [ ] 本地跑通：创建一个 2 节点流程，执行成功并产生日志

### 10.3 评审辅助

* 自动生成 **PR 描述** 模板（见下），并在需要时生成 **变更可视化**（树形结构）。

---

## 11. 常见任务 Playbooks（给 Claude 的操作剧本）

### A. 新增一个节点类型 `nodes/http-request`

1. 在 `nodes/http-request/` 下创建：`index.ts`（元信息与 handler）、`schema.ts`（Zod/类型）、`README.md`（用法）。
2. 在 `flow/` 中注册节点渲染器与端口；提供最小可用 UI（URL、方法、headers、body）。
3. 在 `nodes/__tests__/http-request.test.ts` 编写契约测试（含超时/取消/非 2xx）。
4. 更新 `shared/types.ts` 以暴露公共类型；在运行中心展示请求摘要与响应码。
5. 输出 diff 与验证清单。

### B. 修改 Worker 超时与取消逻辑

1. 在 `shared/runtime/timeout.ts` 实现可配置超时 + `AbortController`。
2. 主线程任务分发处传入 `signal`；在 handler 内传播。
3. 覆盖以下测试：超时触发、取消触发、正常完成不受影响。

### C. Dexie 表结构演进（+1 版本）

1. 定义 `DB_VERSION++` 与迁移函数（老数据到新字段）；
2. 写「向后兼容」读逻辑（兼容老版本导入文件）；
3. 新/旧版本导出与导入测试；
4. PR 描述中附兼容性说明与回滚策略（降级迁移或禁用新特性）。

### D. 引入第三方 SDK（仅浏览器）

1. 评估许可与包体体积，若 > 50KB gzip 需说明；
2. 采用 ESM 与按需加载（dynamic import）；
3. 为 SDK 交互封装 `shared/adapters/<sdk>.ts`，屏蔽直接调用；
4. 加入最小集成测试与错误模拟。

---

## 12. PR 描述模板（Claude 生成）

```md
### 变更摘要
-

### 细节
-

### 兼容性 / 风险
- 影响面：
- 风险点：
- 监控指标：
- 回滚步骤：

### 验证清单
- [ ] `npm run lint` / `format:check`
- [ ] `npm run type-check`
- [ ] `npm run test`（覆盖率达标）
- [ ] `npm run build`
- [ ] 手动场景：
```

---

## 13. 提示工程（可复用指令）

**最小修改补丁**

```
你扮演本仓的代码生成/重构助手。请按以下步骤：
1) 总结任务目标、影响面、变更计划与验证计划；
2) 生成统一 diff（新增文件给出完整内容）；
3) 输出变更摘要、风险与回滚、手动验证清单；
4) 若需新增依赖/脚本，请在顶部「变更计划」中显式声明。
严格遵守 TypeScript strict、模块边界与 Web Worker 契约。
```

**先测后码（TDD）**

```
为以下需求先编写 Vitest：
- 列出需要覆盖的断言；
- 给出可运行的测试文件；
- 标注需 mock 的接口；
随后再给出最小实现与必要重构。
```

---

## 14. 术语与常量

* **ULID**：全局唯一标识；
* **traceId**：贯穿运行与日志的链路标识；
* **Result\<T, E>**：约定的结果封装，或抛错；
* **DAG**：有向无环图，表示流程依赖关系。

---

## 15. 维护者须知

* 本文件是「单一事实来源（SSoT）」；如有冲突，以此为准。
* 修改本文件需在 PR 中标注 `area:guides` 与 `requires-doc-review` 标签，并抄送代码所有者。
