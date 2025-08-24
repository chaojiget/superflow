# 🔗 API 接口约定文档

> 本文档定义 Superflow 各模块间的接口协议，确保团队并行开发时的兼容性。

## 📋 接口管理原则

### 版本管理

- 所有接口使用语义化版本控制
- 破坏性变更必须升级主版本号
- 新增字段采用可选属性，保持向后兼容
- 废弃字段标记 `@deprecated` 并提供迁移路径

### 变更流程

1. **提案阶段**: 通过 RFC Issue 讨论接口变更
2. **设计评审**: 架构师和模块负责人评审
3. **实现阶段**: 同步更新接口和实现
4. **测试验证**: 接口契约测试验证
5. **文档更新**: 更新本文档和 API 文档

## 🏗️ 核心运行时接口

### ExecRequest - 执行请求

```typescript
/**
 * 节点执行请求接口
 * @version 1.0.0
 */
export interface ExecRequest {
  /** 节点唯一标识 (ULID) */
  nodeId: string;

  /** 用户代码 (ESM 格式) */
  code: string;

  /** 输入数据 (可序列化) */
  input: unknown;

  /** 超时时间，毫秒 (默认 15000) */
  timeout?: number;

  /** 链路追踪标识 */
  traceId: string;

  /** 执行选项 */
  options?: {
    /** 是否启用缓存 */
    enableCache?: boolean;
    /** 最大内存限制，字节 */
    maxMemory?: number;
    /** 允许的外部模块 */
    allowedModules?: string[];
  };
}
```

### ExecResult - 执行结果

```typescript
/**
 * 节点执行结果接口
 * @version 1.0.0
 */
export interface ExecResult {
  /** 执行输出 (可序列化) */
  output: unknown;

  /** 执行日志列表 */
  logs: LogEntry[];

  /** 执行耗时，毫秒 */
  duration: number;

  /** 错误信息 (如有) */
  error?: SuperflowError;

  /** 执行统计 */
  stats: {
    /** 峰值内存使用，字节 */
    maxMemoryUsed: number;
    /** CPU 时间，毫秒 */
    cpuTime: number;
    /** 是否命中缓存 */
    cacheHit: boolean;
  };
}
```

### NodeContext - 节点上下文

```typescript
/**
 * 节点执行上下文
 * @version 1.0.0
 */
export interface NodeContext {
  /** 取消信号 */
  signal: AbortSignal;

  /** 结构化日志记录器 */
  logger: Logger;

  /** 环境变量 (受限访问) */
  env?: Record<string, string>;

  /** KV 存储接口 */
  kv?: KVStore;

  /** HTTP 客户端 (受限) */
  http?: HttpClient;

  /** 当前节点元数据 */
  meta: {
    nodeId: string;
    flowId: string;
    version: string;
    traceId: string;
  };
}
```

## 🗄️ 存储层接口

### Repository 基类

```typescript
/**
 * 存储仓库基接口
 * @version 1.0.0
 */
export interface Repository<T, K = string> {
  /** 创建记录 */
  create(data: Omit<T, 'id'>): Promise<K>;

  /** 根据ID查找 */
  findById(id: K): Promise<T | null>;

  /** 更新记录 */
  update(id: K, updates: Partial<T>): Promise<void>;

  /** 删除记录 */
  delete(id: K): Promise<void>;

  /** 批量操作 */
  createBatch(data: Omit<T, 'id'>[]): Promise<K[]>;
  deleteBatch(ids: K[]): Promise<void>;
}
```

### RunRepository - 运行记录

```typescript
/**
 * 运行记录存储接口
 * @version 1.0.0
 */
export interface RunRepository extends Repository<RunRecord> {
  /** 根据流程ID查找运行记录 */
  findByFlowId(
    flowId: string,
    options?: PaginationOptions
  ): Promise<RunRecord[]>;

  /** 查找正在运行的记录 */
  findRunning(): Promise<RunRecord[]>;

  /** 根据状态查找 */
  findByStatus(
    status: RunStatus,
    options?: PaginationOptions
  ): Promise<RunRecord[]>;

  /** 根据时间范围查找 */
  findByDateRange(start: Date, end: Date): Promise<RunRecord[]>;

  /** 获取统计信息 */
  getStats(flowId?: string): Promise<RunStats>;

  /** 清理过期记录 */
  cleanup(olderThan: Date): Promise<number>;
}
```

## 🎨 UI 组件接口

### 通用组件 Props

```typescript
/**
 * 基础组件属性
 * @version 1.0.0
 */
export interface BaseComponentProps {
  /** CSS 类名 */
  className?: string;

  /** 行内样式 */
  style?: React.CSSProperties;

  /** 测试标识 */
  'data-testid'?: string;

  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * 表单组件基础属性
 * @version 1.0.0
 */
export interface FormComponentProps<T> extends BaseComponentProps {
  /** 当前值 */
  value?: T;

  /** 值变更回调 */
  onChange?: (value: T) => void;

  /** 是否禁用 */
  disabled?: boolean;

  /** 错误信息 */
  error?: string;

  /** 占位符 */
  placeholder?: string;
}
```

### FlowCanvas - 流程画布

```typescript
/**
 * 流程画布组件属性
 * @version 1.0.0
 */
export interface FlowCanvasProps extends BaseComponentProps {
  /** 节点列表 */
  nodes: Node[];

  /** 连线列表 */
  edges: Edge[];

  /** 节点变更事件 */
  onNodesChange: (changes: NodeChange[]) => void;

  /** 连线变更事件 */
  onEdgesChange: (changes: EdgeChange[]) => void;

  /** 连接事件 */
  onConnect: (connection: Connection) => void;

  /** 节点选择事件 */
  onNodeSelect?: (nodeIds: string[]) => void;

  /** 画布配置 */
  config?: {
    /** 是否只读 */
    readonly?: boolean;
    /** 是否显示网格 */
    showGrid?: boolean;
    /** 缩放范围 */
    zoomRange?: [number, number];
  };
}
```

## 🤖 AI 服务接口

### AIClient - AI 客户端

```typescript
/**
 * AI 服务客户端接口
 * @version 1.0.0
 */
export interface AIClient {
  /** 生成蓝图 */
  generateBlueprint(request: BlueprintRequest): Promise<Blueprint>;

  /** 生成节点代码 */
  generateNodeCode(request: NodeCodeRequest): Promise<string>;

  /** 错误修复建议 */
  suggestFix(error: ExecError, context: string): Promise<FixSuggestion>;

  /** 性能优化建议 */
  suggestOptimization(
    metrics: PerformanceMetrics
  ): Promise<OptimizationSuggestion>;
}

/**
 * 蓝图生成请求
 * @version 1.0.0
 */
export interface BlueprintRequest {
  /** 需求描述 */
  requirement: string;

  /** 领域上下文 */
  domain?: string;

  /** 约束条件 */
  constraints?: {
    maxNodes?: number;
    timeoutLimit?: number;
    allowedLibraries?: string[];
  };

  /** 示例输入输出 */
  examples?: Array<{
    input: unknown;
    expectedOutput: unknown;
  }>;
}
```

## 🏃‍♂️ 运行中心接口

### Scheduler - 调度器

```typescript
/**
 * 流程调度器接口
 * @version 1.0.0
 */
export interface Scheduler {
  /** 执行流程 */
  execute(request: FlowExecutionRequest): Promise<FlowExecutionResult>;

  /** 取消执行 */
  cancel(runId: string): Promise<void>;

  /** 暂停执行 */
  pause(runId: string): Promise<void>;

  /** 恢复执行 */
  resume(runId: string): Promise<void>;

  /** 获取执行状态 */
  getStatus(runId: string): Promise<FlowExecutionStatus>;

  /** 监听执行事件 */
  on(event: 'progress' | 'complete' | 'error', handler: Function): void;
}

/**
 * 流程执行请求
 * @version 1.0.0
 */
export interface FlowExecutionRequest {
  /** 流程定义 */
  flow: FlowDefinition;

  /** 输入数据 */
  input: Record<string, unknown>;

  /** 执行选项 */
  options?: {
    /** 并发度 */
    concurrency?: number;
    /** 重试策略 */
    retryPolicy?: RetryPolicy;
    /** 缓存策略 */
    cachePolicy?: CachePolicy;
  };

  /** 链路追踪ID */
  traceId: string;
}
```

## 📊 事件系统接口

### EventBus - 事件总线

```typescript
/**
 * 事件总线接口
 * @version 1.0.0
 */
export interface EventBus {
  /** 发射事件 */
  emit<T = any>(event: string, data: T): void;

  /** 监听事件 */
  on<T = any>(event: string, handler: (data: T) => void): () => void;

  /** 一次性监听 */
  once<T = any>(event: string, handler: (data: T) => void): () => void;

  /** 移除监听器 */
  off(event: string, handler: Function): void;

  /** 获取监听器数量 */
  listenerCount(event: string): number;

  /** 清空所有监听器 */
  clear(): void;
}

/**
 * 标准事件类型
 * @version 1.0.0
 */
export namespace Events {
  /** 流程执行事件 */
  export interface FlowExecution {
    type: 'flow.started' | 'flow.completed' | 'flow.failed';
    runId: string;
    flowId: string;
    timestamp: number;
    data?: any;
  }

  /** 节点执行事件 */
  export interface NodeExecution {
    type: 'node.started' | 'node.completed' | 'node.failed';
    runId: string;
    nodeId: string;
    timestamp: number;
    data?: any;
  }
}
```

## 🔌 插件系统接口

### Plugin - 插件基类

```typescript
/**
 * 插件基础接口
 * @version 1.0.0
 */
export interface Plugin {
  /** 插件名称 */
  name: string;

  /** 插件版本 */
  version: string;

  /** 插件描述 */
  description?: string;

  /** 安装插件 */
  install(app: SuperflowApp): void | Promise<void>;

  /** 卸载插件 */
  uninstall(): void | Promise<void>;

  /** 插件配置 */
  configure?(config: any): void;

  /** 健康检查 */
  healthCheck?(): Promise<boolean>;
}

/**
 * 节点插件接口
 * @version 1.0.0
 */
export interface NodePlugin extends Plugin {
  /** 节点类型定义 */
  nodeTypes: NodeTypeDefinition[];

  /** 注册节点类型 */
  registerNodeTypes(registry: NodeRegistry): void;
}
```

## 📝 接口变更日志

### v1.0.0 (2025-08-23)

- 初始接口定义
- 确定核心运行时接口
- 定义存储层接口规范
- 建立 UI 组件接口约定

### 计划变更

- **v1.1.0**: 增加批处理执行接口
- **v1.2.0**: 扩展插件系统能力
- **v2.0.0**: 重构事件系统（破坏性变更）

## 🧪 接口测试规范

### 契约测试

```typescript
// 使用 Pact.js 或类似工具进行契约测试
describe('WorkerClient Contract', () => {
  it('should implement ExecRequest interface', () => {
    const client = new WorkerClient();
    const request: ExecRequest = {
      nodeId: 'test-node',
      code: 'export async function handler(input) { return input; }',
      input: 'test',
      traceId: 'trace-123',
    };

    expect(() => client.execute(request)).not.toThrow();
  });
});
```

### Mock 实现

```typescript
// 为并行开发提供 Mock 实现
export const mockAIClient: AIClient = {
  async generateBlueprint(request) {
    return {
      id: 'mock-blueprint',
      nodes: [{ id: 'input', type: 'input' }],
      edges: [],
      metadata: { generated: true },
    };
  },
};
```

## 🚨 注意事项

1. **类型安全**: 所有接口必须有完整的 TypeScript 类型定义
2. **向后兼容**: 非破坏性变更保持向后兼容
3. **文档同步**: 接口变更必须同步更新文档
4. **测试覆盖**: 重要接口必须有契约测试
5. **性能考虑**: 接口设计考虑性能影响
6. **错误处理**: 统一的错误处理机制

---

**维护者**: 开发团队  
**最后更新**: 2025-08-23  
**下次评审**: 2025-09-06
