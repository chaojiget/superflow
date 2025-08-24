/**
 * Run Center 模块类型定义
 * 运行监控和管理相关类型
 */

/**
 * 运行记录
 */
export interface RunRecord {
  id: string;
  flowId: string;
  status: RunStatus;
  startTime: number;
  endTime?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  progress: RunProgress;
  logs: RunLog[];
  metrics: RunMetrics;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 运行状态
 */
export type RunStatus = 
  | 'pending'    // 等待开始
  | 'running'    // 运行中
  | 'completed'  // 成功完成
  | 'failed'     // 执行失败
  | 'cancelled'  // 用户取消
  | 'timeout';   // 执行超时

/**
 * 运行进度
 */
export interface RunProgress {
  total: number;      // 总节点数
  completed: number;  // 已完成节点数
  failed: number;     // 失败节点数
  running: number;    // 正在运行的节点数
  percentage: number; // 完成百分比
}

/**
 * 运行日志
 */
export interface RunLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  nodeId?: string;
  data?: unknown;
  traceId?: string;
}

/**
 * 运行指标
 */
export interface RunMetrics {
  executionTime: number;  // 执行时间（毫秒）
  nodeCount: number;      // 节点总数
  successCount: number;   // 成功节点数
  failureCount: number;   // 失败节点数
  avgNodeTime?: number;   // 平均节点执行时间
  maxNodeTime?: number;   // 最大节点执行时间
  minNodeTime?: number;   // 最小节点执行时间
  memoryUsage?: number;   // 内存使用量
  cpuUsage?: number;      // CPU 使用率
}

/**
 * 执行快照
 */
export interface ExecutionSnapshot {
  runId: string;
  status: RunStatus;
  progress: RunProgress;
  startTime: number;
  elapsedTime: number;
  metrics: RunMetrics;
  logs: RunLog[];
  timestamp: number;
  currentNodes?: string[]; // 当前运行的节点
  nextNodes?: string[];    // 下一步要执行的节点
}

/**
 * 运行配置
 */
export interface RunConfiguration {
  maxConcurrency: number;        // 最大并发数
  timeout: number;               // 超时时间（毫秒）
  retryAttempts: number;         // 重试次数
  enableLogging: boolean;        // 启用日志
  enableMetrics: boolean;        // 启用指标收集
  enableCache: boolean;          // 启用缓存
  environment: Record<string, string>; // 环境变量
  resources?: ResourceLimits;    // 资源限制
}

/**
 * 资源限制
 */
export interface ResourceLimits {
  maxMemoryMB: number;    // 最大内存（MB）
  maxCpuPercent: number;  // 最大CPU使用率
  maxDiskMB: number;      // 最大磁盘使用（MB）
  maxNetworkMBps: number; // 最大网络带宽（MB/s）
}

/**
 * 执行器接口
 */
export interface FlowExecutor {
  execute(flowId: string, input?: unknown, config?: RunConfiguration): Promise<string>;
  stop(runId: string): Promise<void>;
  pause(runId: string): Promise<void>;
  resume(runId: string): Promise<void>;
  getStatus(runId: string): Promise<ExecutionSnapshot | null>;
  getMetrics(runId: string): Promise<RunMetrics | null>;
  getLogs(runId: string, limit?: number): Promise<RunLog[]>;
}

/**
 * 监控器接口
 */
export interface RunMonitor {
  subscribe(runId: string, callback: (snapshot: ExecutionSnapshot) => void): void;
  unsubscribe(runId: string, callback: (snapshot: ExecutionSnapshot) => void): void;
  getSnapshot(runId: string): ExecutionSnapshot | null;
  getAllActiveRuns(): string[];
  getRunHistory(limit?: number): RunRecord[];
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  action: AlertAction;
  enabled: boolean;
  cooldownMs: number; // 冷却时间
}

/**
 * 告警条件
 */
export interface AlertCondition {
  type: 'threshold' | 'pattern' | 'anomaly';
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number | string;
  duration?: number; // 持续时间
}

/**
 * 告警动作
 */
export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'custom';
  config: Record<string, unknown>;
  template?: string;
}

/**
 * 告警记录
 */
export interface AlertRecord {
  id: string;
  ruleId: string;
  runId: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  acknowledged: boolean;
  resolvedAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 性能基准
 */
export interface PerformanceBenchmark {
  flowId: string;
  nodeId?: string;
  metric: string;
  baseline: number;
  threshold: number;
  trend: 'improving' | 'degrading' | 'stable';
  lastUpdated: number;
  samples: BenchmarkSample[];
}

/**
 * 基准样本
 */
export interface BenchmarkSample {
  timestamp: number;
  value: number;
  runId: string;
  conditions?: Record<string, unknown>;
}

/**
 * 运行统计
 */
export interface RunStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgExecutionTime: number;
  avgSuccessRate: number;
  topFailureReasons: FailureReason[];
  performanceTrends: PerformanceTrend[];
  resourceUtilization: ResourceUtilization;
}

/**
 * 失败原因
 */
export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
  lastOccurrence: number;
}

/**
 * 性能趋势
 */
export interface PerformanceTrend {
  metric: string;
  trend: 'up' | 'down' | 'stable';
  change: number; // 变化百分比
  period: string; // 时间周期
}

/**
 * 资源利用率
 */
export interface ResourceUtilization {
  cpu: {
    avg: number;
    max: number;
    utilization: number;
  };
  memory: {
    avg: number;
    max: number;
    utilization: number;
  };
  network: {
    throughput: number;
    utilization: number;
  };
  storage: {
    read: number;
    write: number;
    utilization: number;
  };
}

/**
 * 调试信息
 */
export interface DebugInfo {
  runId: string;
  nodeId: string;
  input: unknown;
  output?: unknown;
  error?: string;
  duration: number;
  timestamp: number;
  stackTrace?: string[];
  variables?: Record<string, unknown>;
  environment?: Record<string, unknown>;
}

/**
 * 回放配置
 */
export interface ReplayConfig {
  runId: string;
  speed: number;        // 回放速度倍数
  startFrom?: number;   // 开始时间戳
  endAt?: number;       // 结束时间戳
  includeData: boolean; // 包含数据
  includeLogs: boolean; // 包含日志
}

/**
 * 回放事件
 */
export interface ReplayEvent {
  timestamp: number;
  type: 'node_start' | 'node_complete' | 'node_error' | 'log' | 'metric';
  nodeId?: string;
  data?: unknown;
  originalTimestamp: number;
}

/**
 * 导出配置
 */
export interface ExportConfig {
  runIds: string[];
  format: 'json' | 'csv' | 'xlsx' | 'xml';
  includeData: boolean;
  includeLogs: boolean;
  includeMetrics: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
  filters?: ExportFilter[];
}

/**
 * 导出过滤器
 */
export interface ExportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  value: string | number | boolean;
}

/**
 * 运行队列
 */
export interface RunQueue {
  id: string;
  name: string;
  priority: number;
  maxConcurrency: number;
  items: QueueItem[];
  status: 'active' | 'paused' | 'stopped';
  created: number;
  updated: number;
}

/**
 * 队列项目
 */
export interface QueueItem {
  id: string;
  flowId: string;
  input?: unknown;
  priority: number;
  scheduledAt: number;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  runId?: string;
  error?: string;
  dependencies?: string[]; // 依赖的其他队列项目
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  strategy: 'fifo' | 'priority' | 'fair' | 'deadline';
  maxGlobalConcurrency: number;
  queueCapacity: number;
  retryStrategy: RetryStrategy;
  deadlineHandling: 'skip' | 'priority' | 'extend';
}

/**
 * 重试策略
 */
export interface RetryStrategy {
  maxAttempts: number;
  backoffType: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  retryableErrors: string[]; // 可重试的错误类型
}

/**
 * 事件类型
 */
export type RunEvent = 
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'run_cancelled'
  | 'run_paused'
  | 'run_resumed'
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'node_skipped'
  | 'progress_updated'
  | 'metric_collected'
  | 'alert_triggered'
  | 'resource_threshold_exceeded';

/**
 * 事件监听器
 */
export type RunEventListener = (event: {
  type: RunEvent;
  runId: string;
  timestamp: number;
  data?: unknown;
}) => void;

/**
 * 运行上下文
 */
export interface RunContext {
  runId: string;
  flowId: string;
  startTime: number;
  config: RunConfiguration;
  environment: Record<string, string>;
  user?: {
    id: string;
    name: string;
    role: string;
  };
  tracing: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
  };
}

// 常用类型别名
export type RunFilter = (run: RunRecord) => boolean;
export type LogFilter = (log: RunLog) => boolean;
export type MetricCollector = (runId: string, metrics: Partial<RunMetrics>) => void;
export type ProgressCallback = (progress: RunProgress) => void;