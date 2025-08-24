太好了，既然你已选 **A：Web Worker 快速实现**，下面我给出一套\*\*“分层清晰、调用有序、引用简洁（少跨层 import）”**的落地方案。先给**结论\*\*，再给**完整目录地图、依赖规则与最小可运行骨架代码**，最后附上执行清单与一个聚焦问题帮你收尾决策。

---

## 结论（方向一页纸）

- **分层原则**：**领域内核稳定**（Domain）→ **应用门面**（App Services/CQRS）→ **端口/适配器**（Ports/Adapters）→ **执行器**（Web Worker Runner）→ **UI/Embeds**。
- **导入规则**（自上而下单向）：UI ⇢ App Services ⇢ Domain ⇢ Ports（接口） ⇢ Adapters（实现）。**严禁**反向依赖。
- **最小技术选型**（V1 快速跑通）：
  - Monorepo：**pnpm + Turborepo**（快、配置少）。
  - 沙箱：**Web Worker + Comlink**（一 run 一 worker，主线程硬超时可 `terminate()`）。
  - 数据：**Dexie(IndexeDB)**（日志/版本/运行记录），**ULID** 作全局 ID。
  - 校验：**Ajv(JSON Schema)**，示例即测试。
  - 状态：**Zustand**（全局轻量状态）+ **XState/FSM**（节点/运行生命周期）。
  - 画布：**React Flow**。
  - Embeds：**Web Components** + `postMessage` 握手（origin 白名单）。

- **“少引用、好协作”设计**：每个包只暴露一个 **Public API（`index.ts`）**；跨包只允许从 Public API 引用，杜绝深路径。用 ESLint/Dependency-Cruiser **硬性约束**。

---

## Monorepo 文件目录地图（V1 版本）

```text
repo-root/
├─ apps/
│  ├─ studio/                          # 主应用（React）
│  │  ├─ src/
│  │  │  ├─ pages/ideas/               # Ideas/蓝图页
│  │  │  ├─ pages/planner/             # Planner 流程页
│  │  │  ├─ pages/flow-studio/         # Flow 画布
│  │  │  ├─ pages/node-studio/         # Node 独立调试页
│  │  │  ├─ pages/run-center/          # 运行中心
│  │  │  ├─ components/                # 仅 UI 组件（不含业务）
│  │  │  ├─ app-services/              # 仅调用 @app/services（禁止直连 adapters）
│  │  │  └─ main.tsx
│  │  └─ index.html
│  └─ embeds-demo/                     # 外部系统演示嵌入
│     └─ src/index.ts
│
├─ packages/
│  ├─ @core/domain/                    # 领域模型 + 规则（纯 TS，无框架依赖）
│  │  ├─ src/
│  │  │  ├─ entities/                  # Node/Flow/Run/Version/Log 等
│  │  │  ├─ value-objects/             # ULID、ExecMode、LogLevel 等
│  │  │  ├─ services/                  # 拓扑排序、校验规则、状态机定义
│  │  │  ├─ schemas/                   # JSON Schema（输入/输出/IR）
│  │  │  └─ index.ts                   # Public API（仅导出类型/纯函数）
│  │  └─ package.json
│  │
│  ├─ @core/protocol/                  # 进程间协议（Runner <-> Main）
│  │  └─ src/index.ts                  # ExecRequest/ExecEvent/错误类型
│  │
│  ├─ @core/runtime/                   # 运行时客户端（主线程侧）
│  │  ├─ src/
│  │  │  ├─ runnerClient.ts            # Comlink 封装 + 超时 + 事件流
│  │  │  ├─ capabilities.ts            # 能力白名单描述
│  │  │  └─ index.ts
│  │
│  ├─ @core/observability/             # 可观测（日志/追踪/导出）
│  │  ├─ src/{logger.ts, trace.ts, ndjson.ts, index.ts}
│  │
│  ├─ @data/store/                     # Dexie 表与查询（只实现 Ports）
│  │  ├─ src/
│  │  │  ├─ db.ts                      # Dexie 实例与表 schema
│  │  │  ├─ repositories/              # Flow/Node/Run/Log/Version Repository
│  │  │  └─ index.ts
│  │
│  ├─ @ai/orchestrator/                # AI 蓝图/拆解/修复管线（接口留空实现简单）
│  │  ├─ src/{planner.ts, repairer.ts, index.ts}
│  │
│  ├─ @ui/components/                  # 纯 UI 组件库（无业务，供 apps 使用）
│  │  └─ src/index.ts
│  │
│  ├─ @embeds/wc/                      # Web Components（<workflow-node>/<workflow-flow>）
│  │  ├─ src/{workflow-node.ts, workflow-flow.ts, index.ts}
│  │
│  ├─ @workers/executor/               # 执行器 Worker（真正跑用户 handler）
│  │  ├─ src/worker.ts                 # Comlink.expose({ exec })
│  │  └─ src/sandbox/moduleLoader.ts   # Blob+import 动态装载 code
│  │
│  └─ @app/services/                   # 应用门面（CQRS + 用例服务）
│     ├─ src/
│     │  ├─ commands/                  # createNode/applyPatch/startRun/rollbackVersion...
│     │  ├─ queries/                   # getFlow/getRuns/getHeatmap/getVersions...
│     │  ├─ ports/                     # StoragePort/AIPlannerPort/RuntimePort/LogPort
│     │  ├─ adapters/                  # 组装依赖（注入 @data/@core/runtime 等实现）
│     │  └─ index.ts
│
├─ configs/
│  ├─ eslint/.eslintrc.cjs
│  ├─ depcruiser/.dependency-cruiser.js # 依赖边界守护
│  └─ tsconfig.base.json
│
├─ docs/
│  ├─ adr/0001-architecture.md         # ADR 模板与决策记录
│  └─ ir-spec.md
│
├─ turbo.json
├─ package.json
└─ pnpm-workspace.yaml
```

> **约束**：`apps/*` 只依赖 `@app/services` 与纯 UI 包；**禁止**直连 `@workers/*`、`@data/*`。
> `@app/services` 只依赖 `@core/*`（类型/协议）与 Ports 的实现（在 adapters 中组装）。

---

## 依赖规则（硬约束示例）

**ESLint（import/no-restricted-paths）**：

```js
// configs/eslint/.eslintrc.cjs
module.exports = {
  plugins: ['import'],
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: './apps',
            from: './packages/@workers',
            message: 'apps 禁止直接依赖 workers',
          },
          {
            target: './apps',
            from: './packages/@data',
            message: 'apps 禁止直接依赖 data/store',
          },
          {
            target: './packages/@core',
            from: './apps',
            message: 'core 不能依赖 apps（反向）',
          },
        ],
      },
    ],
  },
};
```

**Dependency-Cruiser（更直观）**：

```js
// configs/depcruiser/.dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'app-to-worker',
      severity: 'error',
      from: { path: '^apps/' },
      to: { path: '^packages/@workers/' },
    },
    {
      name: 'app-to-data',
      severity: 'error',
      from: { path: '^apps/' },
      to: { path: '^packages/@data/' },
    },
    {
      name: 'reverse-core',
      severity: 'error',
      from: { path: '^packages/@core/' },
      to: { path: '^apps/' },
    },
  ],
};
```

---

## TS 路径与构建（简洁引用）

**`configs/tsconfig.base.json`**（统一别名+项目引用）：

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "paths": {
      "@core/domain": ["packages/@core/domain/src"],
      "@core/protocol": ["packages/@core/protocol/src"],
      "@core/runtime": ["packages/@core/runtime/src"],
      "@core/observability": ["packages/@core/observability/src"],
      "@data/store": ["packages/@data/store/src"],
      "@ai/orchestrator": ["packages/@ai/orchestrator/src"],
      "@app/services": ["packages/@app/services/src"],
      "@embeds/wc": ["packages/@embeds/wc/src"],
      "@workers/executor": ["packages/@workers/executor/src"]
    },
    "types": ["vite/client"]
  },
  "include": ["packages", "apps"]
}
```

**`turbo.json`**（最小任务链）：

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false }
  }
}
```

---

## 关键接口与最小实现骨架

### 1) 协议（Protocol）

**`packages/@core/protocol/src/index.ts`**

```ts
export type ULID = string;
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ExecRequest {
  kind: 'EXEC';
  runId: ULID;
  nodeId: string;
  flowId: string;
  code: string; // 必须导出: export async function handler(input, ctx) {}
  language: 'js' | 'ts'; // V1: 仅 js; ts 可前置转译
  input: unknown;
  controls?: { timeoutMs?: number; retries?: number };
  env?: Record<string, string>;
  capabilities?: string[]; // 白名单能力（V1 可忽略）
}

export type ExecEvent =
  | { kind: 'STARTED'; runId: ULID; ts: number }
  | { kind: 'LOG'; runId: ULID; level: LogLevel; ts: number; fields: unknown }
  | {
      kind: 'RESULT';
      runId: ULID;
      ts: number;
      durationMs: number;
      output: unknown;
    }
  | {
      kind: 'ERROR';
      runId: ULID;
      ts: number;
      error: { name: string; message: string; stack?: string };
    };
```

### 2) 执行器 Worker（Comlink 暴露）

**`packages/@workers/executor/src/sandbox/moduleLoader.ts`**

```ts
export async function loadModuleFromCode(code: string): Promise<any> {
  // 以 ESM 动态装载代码，要求用户代码中导出 handler
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

**`packages/@workers/executor/src/worker.ts`**

```ts
import * as Comlink from 'comlink';
import { ExecRequest, ExecEvent } from '@core/protocol';
import { loadModuleFromCode } from './sandbox/moduleLoader';

export type EventCallback = (event: ExecEvent) => void;

async function exec(req: ExecRequest, cb: Comlink.Remote<EventCallback>) {
  const ts = Date.now();
  await cb({ kind: 'STARTED', runId: req.runId, ts });

  try {
    const mod = await loadModuleFromCode(req.code);
    const handler = mod?.handler;
    if (typeof handler !== 'function') {
      throw new Error('handler is not exported as a function');
    }

    const started = performance.now();
    const ctx = {
      log: (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', fields: unknown) =>
        cb({ kind: 'LOG', runId: req.runId, ts: Date.now(), level, fields }),
      env: req.env ?? {},
      // 软超时信号，V1 仅透传（用户可选择使用）
      abortSignal: null as AbortSignal | null,
    };

    const output = await handler(req.input, ctx);
    const durationMs = Math.round(performance.now() - started);

    await cb({
      kind: 'RESULT',
      runId: req.runId,
      ts: Date.now(),
      durationMs,
      output,
    });
  } catch (e: any) {
    await cb({
      kind: 'ERROR',
      runId: req.runId,
      ts: Date.now(),
      error: {
        name: e?.name ?? 'Error',
        message: e?.message ?? String(e),
        stack: e?.stack,
      },
    });
  }
}

Comlink.expose({ exec });
```

> **说明**：V1 简化——**不在 worker 内部强制软超时**；由主线程**硬超时**直接 `worker.terminate()`，并上报超时 ERROR 事件。

### 3) 主线程 Runner 客户端（硬超时、事件转日志）

**`packages/@core/runtime/src/runnerClient.ts`**

```ts
import * as Comlink from 'comlink';
import type { ExecRequest, ExecEvent } from '@core/protocol';

export interface RunnerClient {
  run(req: ExecRequest, onEvent: (ev: ExecEvent) => void): Promise<void>;
}

export function createRunnerClient(): RunnerClient {
  return {
    async run(req, onEvent) {
      const worker = new Worker(
        new URL('@workers/executor/src/worker.ts', import.meta.url),
        { type: 'module' }
      );
      const api = Comlink.wrap<{
        exec: (r: ExecRequest, cb: (e: ExecEvent) => void) => Promise<void>;
      }>(worker);

      let timeoutHandle: any;
      const hardTimeout = req.controls?.timeoutMs ?? 15000; // 默认 15s

      const cb = Comlink.proxy((e: ExecEvent) => onEvent(e));
      try {
        // 启动硬超时：到时 terminate worker 并上报 ERROR
        timeoutHandle = setTimeout(() => {
          worker.terminate();
          onEvent({
            kind: 'ERROR',
            runId: req.runId,
            ts: Date.now(),
            error: {
              name: 'TimeoutError',
              message: `Exceeded ${hardTimeout}ms`,
            },
          });
        }, hardTimeout);

        await api.exec(req, cb);
      } finally {
        clearTimeout(timeoutHandle);
        // worker 生命周期交给超时逻辑/调用端，自行决定是否 terminate
      }
    },
  };
}
```

### 4) Dexie 表（最小版）

**`packages/@data/store/src/db.ts`**

```ts
import Dexie, { Table } from 'dexie';

export interface RunRow {
  runId: string;
  nodeId: string;
  flowId: string;
  chainId?: string;
  status: 'pending' | 'ok' | 'error' | 'timeout' | 'canceled';
  startAt: number;
  endAt?: number;
  durationMs?: number;
}

export interface LogRow {
  id?: number;
  runId: string;
  ts: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  fields: any;
}

export class WorkflowDB extends Dexie {
  runs!: Table<RunRow, string>;
  logs!: Table<LogRow, number>;
  constructor() {
    super('workflow-db');
    this.version(1).stores({
      runs: 'runId, nodeId, flowId, chainId, status, startAt',
      logs: '++id, runId, ts, level',
    });
  }
}

export const db = new WorkflowDB();
```

---

## 应用门面（App Services）与 Ports

**`packages/@app/services/src/ports/storage.ts`**

```ts
import type { RunRow, LogRow } from '@data/store/db';
export interface StoragePort {
  saveRun(row: RunRow): Promise<void>;
  patchRun(runId: string, patch: Partial<RunRow>): Promise<void>;
  appendLog(row: LogRow): Promise<void>;
  queryRuns(params: {
    flowId?: string;
    since?: number;
    status?: string;
  }): Promise<RunRow[]>;
}
```

**`packages/@app/services/src/commands/startRun.ts`**

```ts
import { createRunnerClient } from '@core/runtime/runnerClient';
import type { ExecRequest } from '@core/protocol';
import type { StoragePort } from '../ports/storage';

export async function startRun(deps: { store: StoragePort }, req: ExecRequest) {
  const runner = createRunnerClient();
  await deps.store.saveRun({
    runId: req.runId,
    nodeId: req.nodeId,
    flowId: req.flowId,
    status: 'pending',
    startAt: Date.now(),
  });

  await runner.run(req, async (ev) => {
    if (ev.kind === 'LOG')
      await deps.store.appendLog({
        runId: ev.runId,
        ts: ev.ts,
        level: ev.level,
        fields: ev.fields,
      });
    if (ev.kind === 'RESULT') {
      await deps.store.patchRun(ev.runId, {
        status: 'ok',
        endAt: ev.ts,
        durationMs: ev.durationMs,
      });
    }
    if (ev.kind === 'ERROR') {
      await deps.store.patchRun(ev.runId, { status: 'error', endAt: ev.ts });
      await deps.store.appendLog({
        runId: ev.runId,
        ts: ev.ts,
        level: 'ERROR',
        fields: ev.error,
      });
    }
  });
}
```

> **好处**：UI 只调 `startRun()`；对 Worker/Dexie 的细节一无所知，**调用层次天然清晰**。

---

## Web Components（嵌入最小骨架）

**`packages/@embeds/wc/src/workflow-node.ts`**

```ts
export class WorkflowNode extends HTMLElement {
  static get observedAttributes() {
    return ['node-id', 'readonly', 'theme'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <section>
        <slot name="header"></slot>
        <button id="run">Run</button>
        <pre id="logs"></pre>
      </section>`;
    this.shadowRoot!.getElementById('run')!.addEventListener('click', () =>
      this.dispatchEvent(
        new CustomEvent('run', {
          detail: { nodeId: this.getAttribute('node-id') },
        })
      )
    );
  }

  appendLog(line: string) {
    const pre = this.shadowRoot!.getElementById('logs') as HTMLPreElement;
    pre.textContent += line + '\n';
    this.dispatchEvent(new CustomEvent('log', { detail: line }));
  }
}
customElements.define('workflow-node', WorkflowNode);
```

> 外部系统只需要监听 `run`/`log` 事件并通过 `postMessage` 与宿主交互即可。V1 可不做签名，P1 再补 origin 白名单与 token 握手。

---

## “Claude Code / Codex 友好”的工程习惯

- **Public API 模式**：每个包只暴露 `index.ts`，AI 补全时上下文更小、干扰更少。
- **小文件、小函数**：单文件 < 300 行，单函数 < 50 行；复杂逻辑拆 `services/` 纯函数。
- **强类型提示**：所有跨边界函数带显式接口；协议/实体统一放 `@core/*`。
- **Prompt 注释块**：在关键入口（如 `startRun.ts`）用三到五行注释说明输入/输出/副作用，便于“按文件解释”类指令。
- **统一错误模型**：`{ name, message, stack }`，避免在包间传异常对象。

---

## 快速启动脚本（建议）

**根 `package.json`**（片段）：

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "eslint .",
    "dep:check": "depcruise --config configs/depcruiser/.dependency-cruiser.js apps packages"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "eslint": "^9",
    "dependency-cruiser": "^16"
  }
}
```

---

## 验收用例（P0）

1. 在 Ideas → Planner 生成一个 2\~3 节点 DAG。
2. 双击节点进入 Node Studio，粘贴以下 **最小 handler** 并运行：

   ```js
   export async function handler(input, ctx) {
     await new Promise((r) => setTimeout(r, 100));
     await ctx.log('INFO', { got: input });
     return { ok: true, echo: input };
   }
   ```

3. `Run Center` 能看到 runId、状态、耗时、日志，导出 NDJSON 成功。
4. Embeds Demo 页面能载入 `<workflow-node>`，点击运行可收到日志事件。

---

## 执行清单（Checklist）

- [ ] 建立目录、填充 `tsconfig.base.json`、`turbo.json`、ESLint、DepCruiser。
- [ ] 落地 `@core/protocol`、`@workers/executor`、`@core/runtime` 三件套（P0 必须）。
- [ ] 建 `@data/store` Dexie 表，打通 `startRun()` 写日志/更新状态。
- [ ] Flow Studio 只从 `@app/services` 调用（禁止直连 store/worker）。
- [ ] `<workflow-node>` MVP + embeds-demo。
- [ ] ADR：记录“选 A：Web Worker + 硬超时”的决策与演进路径。

---

## 收口与下一步

> **我的建议**：先把 **`@core/protocol` + `@workers/executor` + `@core/runtime` + `@app/services/commands/startRun`** 四个文件打通（上面代码可直接拷），然后再接 Dexie 与 UI。
