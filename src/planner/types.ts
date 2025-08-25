/**
 * Planner 模块类型定义
 * 规划和执行相关类型
 */

import type { Port, NodeCapability } from '@/shared/types';

/**
 * 执行 DAG
 */
export interface ExecutionDAG {
  id: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
  topology: TopologyResult;
  dependencies: DependencyAnalysis;
  executionPlan?: ExecutionPlan;
  metrics?: DAGMetrics;
  createdAt: number;
  executionOrder: string[];
}

/**
 * DAG 节点
 */
export interface DAGNode {
  id: string;
  type: string;
  name: string;
  description: string;
  inputs: Port[];
  outputs: Port[];
  dependencies: string[];
  dependents: string[];
  level: number;
  executionGroup: number;
  status: NodeExecutionStatus;
  metadata: {
    originalNode?: any;
    capabilities: NodeCapability[];
    retryable: boolean;
    concurrent: boolean;
    idempotent: boolean;
    cacheable: boolean;
    estimatedDuration?: number;
    priority?: number;
    timeout?: number;
    resources?: ResourceRequirement;
  };
}

/**
 * DAG 边
 */
export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'data' | 'control' | 'error';
  weight: number;
  condition?: EdgeCondition;
  metadata: {
    originalEdge?: any;
    animated: boolean;
    priority?: number;
    dataSchema?: unknown;
  };
}

/**
 * 节点执行状态
 */
export type NodeExecutionStatus =
  | 'pending' // 等待执行
  | 'ready' // 准备执行
  | 'running' // 正在执行
  | 'completed' // 执行完成
  | 'failed' // 执行失败
  | 'skipped' // 跳过执行
  | 'cancelled'; // 取消执行

/**
 * 边条件
 */
export interface EdgeCondition {
  type: 'always' | 'success' | 'failure' | 'custom';
  expression?: string;
  parameters?: Record<string, unknown>;
}

/**
 * 资源需求
 */
export interface ResourceRequirement {
  cpu?: number; // CPU 核心数
  memory?: number; // 内存 MB
  gpu?: number; // GPU 数量
  disk?: number; // 磁盘空间 MB
  network?: boolean; // 是否需要网络访问
  external?: string[]; // 外部依赖服务
}

/**
 * 拓扑结果
 */
export interface TopologyResult {
  order: string[]; // 拓扑排序顺序
  levels: string[][]; // 分层结果
  depth: number; // 最大深度
  width: number; // 最大宽度
}

/**
 * 依赖分析
 */
export interface DependencyAnalysis {
  directDependencies: Map<string, Set<string>>;
  transitiveDependencies: Map<string, Set<string>>;
  criticalPath: string[];
  parallelGroups: ParallelGroup[];
  maxParallelism: number;
  totalDependencies: number;
}

/**
 * 并行组
 */
export interface ParallelGroup {
  id: string;
  level: number;
  nodes: string[];
  maxConcurrency: number;
  dependencies: string[];
  dependents: string[];
  estimatedTime?: number;
  resourceRequirement?: ResourceRequirement;
}

/**
 * 执行计划
 */
export interface ExecutionPlan {
  id: string;
  batches: string[][];
  parallelGroups: ParallelGroup[];
  estimatedTime: number;
  maxConcurrency: number;
  criticalPath: string[];
  optimizationHints: string[];
  resourcePlan?: ResourcePlan;
  retryStrategy?: RetryStrategy;
}

/**
 * 资源计划
 */
export interface ResourcePlan {
  totalResources: ResourceRequirement;
  peakResources: ResourceRequirement;
  resourceTimeline: ResourceAllocation[];
  conflicts: ResourceConflict[];
  recommendations: string[];
}

/**
 * 资源分配
 */
export interface ResourceAllocation {
  timestamp: number;
  nodeId: string;
  resources: ResourceRequirement;
  action: 'allocate' | 'release';
}

/**
 * 资源冲突
 */
export interface ResourceConflict {
  type: 'cpu' | 'memory' | 'gpu' | 'disk' | 'network';
  nodes: string[];
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * 重试策略
 */
export interface RetryStrategy {
  globalMaxRetries: number;
  nodeRetryConfig: Map<string, NodeRetryConfig>;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

/**
 * 节点重试配置
 */
export interface NodeRetryConfig {
  maxRetries: number;
  retryOn: ('error' | 'timeout' | 'resource_error')[];
  skipOn: ('validation_error' | 'auth_error')[];
  customCondition?: (error: Error, attempt: number) => boolean;
}

/**
 * DAG 指标
 */
export interface DAGMetrics {
  nodeCount: number;
  edgeCount: number;
  depth: number;
  width: number;
  complexity: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
  avgDependencies: number;
  parallelismRatio: number;
  estimatedExecutionTime?: number;
  criticalPathLength?: number;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  runId: string;
  flowId: string;
  nodeId: string;
  attempt: number;
  startTime: number;
  timeout: number;
  resources: ResourceRequirement;
  environment: Record<string, string>;
  parentContext?: ExecutionContext;
  traceId: string;
  userId?: string;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime: number;
  endTime: number;
  duration: number;
  input?: unknown;
  output?: unknown;
  error?: ExecutionError;
  metrics: NodeExecutionMetrics;
  logs: ExecutionLog[];
  context: ExecutionContext;
}

/**
 * 执行错误
 */
export interface ExecutionError {
  type:
    | 'runtime'
    | 'timeout'
    | 'resource'
    | 'validation'
    | 'network'
    | 'system';
  code: string;
  message: string;
  stack?: string;
  cause?: unknown;
  retryable: boolean;
  timestamp: number;
}

/**
 * 节点执行指标
 */
export interface NodeExecutionMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkIO: {
    bytesIn: number;
    bytesOut: number;
    requests: number;
  };
  diskIO: {
    readBytes: number;
    writeBytes: number;
    operations: number;
  };
  customMetrics?: Record<string, number>;
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  tags?: string[];
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  maxConcurrentNodes: number;
  resourceLimits: ResourceRequirement;
  priorityWeights: {
    criticalPath: number;
    dependencies: number;
    resources: number;
    userPriority: number;
  };
  queueing: {
    strategy: 'fifo' | 'priority' | 'fair' | 'shortest_first';
    maxQueueSize: number;
    timeoutMs: number;
  };
  monitoring: {
    metricsInterval: number;
    healthCheck: boolean;
    alerting: boolean;
  };
}

/**
 * 调度决策
 */
export interface SchedulingDecision {
  nodeId: string;
  action: 'execute' | 'queue' | 'skip' | 'retry' | 'cancel';
  reason: string;
  priority: number;
  estimatedStartTime: number;
  resourceAllocation: ResourceRequirement;
  dependencies: string[];
}

/**
 * 执行状态快照
 */
export interface ExecutionSnapshot {
  timestamp: number;
  runId: string;
  overallStatus: 'running' | 'completed' | 'failed' | 'cancelled';
  nodeStatuses: Map<string, NodeExecutionStatus>;
  completedNodes: number;
  totalNodes: number;
  elapsedTime: number;
  estimatedRemainingTime: number;
  currentlyRunning: string[];
  nextToExecute: string[];
  errors: ExecutionError[];
  metrics: DAGExecutionMetrics;
}

/**
 * DAG 执行指标
 */
export interface DAGExecutionMetrics {
  totalDuration: number;
  avgNodeDuration: number;
  maxNodeDuration: number;
  parallelismEfficiency: number;
  resourceUtilization: ResourceUtilization;
  throughput: number;
  errorRate: number;
  retryRate: number;
}

/**
 * 资源利用率
 */
export interface ResourceUtilization {
  cpu: {
    avg: number;
    max: number;
    efficiency: number;
  };
  memory: {
    avg: number;
    max: number;
    efficiency: number;
  };
  network: {
    throughput: number;
    utilization: number;
  };
  storage: {
    throughput: number;
    utilization: number;
  };
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  type: 'parallelism' | 'resources' | 'caching' | 'retry' | 'monitoring';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: {
    performance: number; // -1 to 1
    cost: number; // -1 to 1
    complexity: number; // -1 to 1
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
    timeframe: string;
  };
  code?: string;
  references?: string[];
}

/**
 * 执行监控器
 */
export interface ExecutionMonitor {
  subscribe(event: ExecutionEvent, handler: ExecutionEventHandler): void;
  unsubscribe(event: ExecutionEvent, handler: ExecutionEventHandler): void;
  getSnapshot(): ExecutionSnapshot;
  getMetrics(): DAGExecutionMetrics;
  getOptimizationSuggestions(): OptimizationSuggestion[];
}

/**
 * 执行事件
 */
export type ExecutionEvent =
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'node_skipped'
  | 'node_cancelled'
  | 'dag_started'
  | 'dag_completed'
  | 'dag_failed'
  | 'dag_cancelled'
  | 'resource_allocated'
  | 'resource_released'
  | 'error_occurred'
  | 'warning_issued';

/**
 * 执行事件处理器
 */
export type ExecutionEventHandler = (event: {
  type: ExecutionEvent;
  timestamp: number;
  nodeId?: string;
  runId: string;
  data?: unknown;
}) => void;

/**
 * 流程验证器
 */
export interface FlowValidator {
  validateStructure(dag: ExecutionDAG): ValidationResult;
  validateResources(
    dag: ExecutionDAG,
    limits: ResourceRequirement
  ): ValidationResult;
  validatePerformance(dag: ExecutionDAG): ValidationResult;
  validateSecurity(dag: ExecutionDAG): ValidationResult;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: OptimizationSuggestion[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestion?: string;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * DAG 导出格式
 */
export interface DAGExportFormat {
  format: 'json' | 'yaml' | 'dot' | 'mermaid' | 'cytoscape';
  includeMetadata: boolean;
  includeMetrics: boolean;
  includeExecutionPlan: boolean;
  prettify: boolean;
}

/**
 * DAG 导入选项
 */
export interface DAGImportOptions {
  validateStructure: boolean;
  validateReferences: boolean;
  autoFix: boolean;
  mergeStrategy: 'replace' | 'merge' | 'append';
  preserveIds: boolean;
}

// 工具类型
export type NodeFilter = (node: DAGNode) => boolean;
export type EdgeFilter = (edge: DAGEdge) => boolean;
export type NodeTransformer = (node: DAGNode) => DAGNode;
export type EdgeTransformer = (edge: DAGEdge) => DAGEdge;

// 常用的节点状态组合
export type PendingStatus = 'pending' | 'ready';
export type ActiveStatus = 'running';
export type FinalStatus = 'completed' | 'failed' | 'skipped' | 'cancelled';
export type AllNodeStatus = PendingStatus | ActiveStatus | FinalStatus;

/**
 * 规划器配置
 */
export interface PlannerConfig {
  maxConcurrency: number;
  enableOptimization: boolean;
  enableParallelization: boolean;
  enableCaching: boolean;
  timeoutMs: number;
  retryAttempts: number;
}

/**
 * 执行策略
 */
export type ExecutionStrategy =
  | 'sequential' // 顺序执行
  | 'parallel' // 并行执行
  | 'adaptive' // 自适应执行
  | 'priority'; // 优先级执行
