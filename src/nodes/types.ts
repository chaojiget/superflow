/**
 * Nodes 模块类型定义
 * 节点定义和执行相关类型
 */

import type { Port, NodeCapability } from '@/shared/types';
import React from 'react';
import type { WorkerContext } from '@/shared/runtime/worker';

/**
 * 节点处理函数
 */
export type NodeHandler = (
  input: unknown,
  context: WorkerContext
) => Promise<unknown>;

/**
 * 节点定义
 */
export interface NodeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Port[];
  outputs: Port[];
  handler: NodeHandler;
  icon?: string;
  color?: string;
  version?: string;
  author?: string;
  tags?: string[];
  capabilities?: NodeCapability[];
  inputSchema?: unknown;
  outputSchema?: unknown;
  documentation?: string;
  examples?: NodeExample[];
}

/**
 * 节点示例
 */
export interface NodeExample {
  name: string;
  description: string;
  input: unknown;
  expectedOutput: unknown;
  config?: Record<string, unknown>;
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  nodeId: string;
  input?: unknown;
  output?: unknown;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  error?: string;
  logs?: string[];
  metrics?: NodeExecutionMetrics;
  timestamp: number;
}

/**
 * 节点执行指标
 */
export interface NodeExecutionMetrics {
  memoryUsage: number;
  cpuUsage?: number;
  networkCalls?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

/**
 * 节点调试信息
 */
export interface NodeDebugInfo {
  nodeId: string;
  nodeType: string;
  input: unknown;
  output?: unknown;
  error?: string;
  status: 'success' | 'error' | 'pending';
  executionTime?: number;
  timestamp: number;
  inputSchema?: unknown;
  outputSchema?: unknown;
  environment: Record<string, unknown>;
  traces?: DebugTrace[];
}

/**
 * 调试跟踪
 */
export interface DebugTrace {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  location?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * 节点分类
 */
export interface NodeCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  order: number;
  parent?: string;
}

/**
 * 节点注册表
 */
export interface NodeRegistry {
  register(definition: NodeDefinition): void;
  unregister(id: string): void;
  get(id: string): NodeDefinition | undefined;
  list(): NodeDefinition[];
  listByCategory(category: string): NodeDefinition[];
  search(query: string): NodeDefinition[];
  getCategories(): NodeCategory[];
}

/**
 * 节点工厂
 */
export interface NodeFactory {
  create(typeId: string, config?: Record<string, unknown>): NodeInstance;
  createFromTemplate(template: NodeTemplate): NodeInstance;
  clone(node: NodeInstance): NodeInstance;
}

/**
 * 节点实例
 */
export interface NodeInstance {
  id: string;
  typeId: string;
  name: string;
  config: Record<string, unknown>;
  state: NodeState;
  inputs: NodeInputPort[];
  outputs: NodeOutputPort[];
  execute(input: unknown, context: WorkerContext): Promise<unknown>;
  validate(input: unknown): ValidationResult;
  getSchema(): NodeSchema;
  destroy(): void;
}

/**
 * 节点状态
 */
export interface NodeState {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  lastExecution?: NodeExecutionResult;
  errorCount: number;
  successCount: number;
  avgExecutionTime: number;
  cache?: Map<string, { value: unknown; timestamp: number }>;
}

/**
 * 节点输入端口
 */
export interface NodeInputPort extends Port {
  value?: unknown;
  connected: boolean;
  source?: {
    nodeId: string;
    portId: string;
  };
  validator?: (value: unknown) => boolean;
  transformer?: (value: unknown) => unknown;
}

/**
 * 节点输出端口
 */
export interface NodeOutputPort extends Port {
  value?: unknown;
  connections: Array<{
    nodeId: string;
    portId: string;
  }>;
  cached: boolean;
  cacheKey?: string;
}

/**
 * 节点模板
 */
export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  baseType: string;
  config: Record<string, unknown>;
  customizations: {
    name?: string;
    description?: string;
    inputs?: Partial<Port>[];
    outputs?: Partial<Port>[];
    handler?: string; // 自定义处理代码
  };
  metadata: {
    author: string;
    version: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
  };
}

/**
 * 节点 Schema
 */
export interface NodeSchema {
  input: unknown;
  output: unknown;
  config: unknown;
  examples: NodeExample[];
  documentation: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * 节点测试套件
 */
export interface NodeTestSuite {
  nodeId: string;
  tests: NodeTest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * 节点测试
 */
export interface NodeTest {
  name: string;
  description: string;
  input: unknown;
  expectedOutput?: unknown;
  expectedError?: string;
  timeout?: number;
  assertions?: TestAssertion[];
}

/**
 * 测试断言
 */
export interface TestAssertion {
  type: 'equals' | 'contains' | 'matches' | 'type' | 'range' | 'custom';
  path?: string; // JSONPath 表达式
  expected?: unknown;
  validator?: (actual: unknown) => boolean;
  message?: string;
}

/**
 * 测试结果
 */
export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  actualOutput?: unknown;
  assertions: AssertionResult[];
}

/**
 * 断言结果
 */
export interface AssertionResult {
  assertion: TestAssertion;
  passed: boolean;
  message: string;
  actual?: unknown;
  expected?: unknown;
}

/**
 * 节点性能基准
 */
export interface NodeBenchmark {
  nodeId: string;
  testCases: BenchmarkCase[];
  iterations: number;
  warmupIterations: number;
  timeout: number;
}

/**
 * 基准测试用例
 */
export interface BenchmarkCase {
  name: string;
  input: unknown;
  expectedMinDuration?: number;
  expectedMaxDuration?: number;
  memoryLimit?: number;
}

/**
 * 基准测试结果
 */
export interface BenchmarkResult {
  caseName: string;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDeviation: number;
  memoryUsage: {
    avg: number;
    max: number;
  };
  throughput: number; // operations per second
}

/**
 * 节点监控器
 */
export interface NodeMonitor {
  nodeId: string;
  metrics: NodeMetrics;
  alerts: NodeAlert[];
  thresholds: MonitoringThresholds;
  startMonitoring(): void;
  stopMonitoring(): void;
  getSnapshot(): MonitoringSnapshot;
}

/**
 * 节点指标
 */
export interface NodeMetrics {
  executionCount: number;
  successRate: number;
  avgExecutionTime: number;
  maxExecutionTime: number;
  errorRate: number;
  lastExecutionTime: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  customMetrics: Record<string, number>;
}

/**
 * 节点告警
 */
export interface NodeAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 监控阈值
 */
export interface MonitoringThresholds {
  maxExecutionTime: number;
  maxErrorRate: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  customThresholds: Record<string, number>;
}

/**
 * 监控快照
 */
export interface MonitoringSnapshot {
  timestamp: number;
  nodeId: string;
  status: string;
  metrics: NodeMetrics;
  recentExecutions: NodeExecutionResult[];
  activeAlerts: NodeAlert[];
  healthScore: number; // 0-100
}

/**
 * 节点插件
 */
export interface NodePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  nodeTypes: NodeDefinition[];
  categories?: NodeCategory[];
  dependencies?: string[];
  hooks?: PluginHooks;
  install(): Promise<void>;
  uninstall(): Promise<void>;
  activate(): void;
  deactivate(): void;
}

/**
 * 插件钩子
 */
export interface PluginHooks {
  beforeNodeExecution?: (nodeId: string, input: unknown) => Promise<unknown>;
  afterNodeExecution?: (
    nodeId: string,
    result: NodeExecutionResult
  ) => Promise<void>;
  onNodeError?: (nodeId: string, error: Error) => Promise<void>;
  onNodeRegistered?: (definition: NodeDefinition) => void;
  onNodeUnregistered?: (id: string) => void;
}

/**
 * 节点配置编辑器
 */
export interface NodeConfigEditor {
  nodeTypeId: string;
  schema: unknown; // JSON Schema
  uiSchema?: unknown; // UI 配置
  render(
    config: Record<string, unknown>,
    onChange: (config: Record<string, unknown>) => void
  ): React.ReactElement;
  validate(config: Record<string, unknown>): ValidationResult;
}

/**
 * 节点数据转换器
 */
export interface NodeDataTransformer {
  id: string;
  name: string;
  description: string;
  sourceType: string;
  targetType: string;
  transform(data: unknown): unknown;
  canTransform(from: string, to: string): boolean;
  getTransformCost(data: unknown): number; // 转换成本估算
}

/**
 * 节点缓存策略
 */
export interface NodeCacheStrategy {
  id: string;
  name: string;
  shouldCache(input: unknown, context: WorkerContext): boolean;
  generateKey(input: unknown, nodeId: string): string;
  getTTL(input: unknown): number; // 生存时间（毫秒）
  shouldInvalidate(input: unknown, cachedResult: unknown): boolean;
}

/**
 * 节点执行器
 */
export interface NodeExecutor {
  execute(
    node: NodeInstance,
    input: unknown,
    context: WorkerContext
  ): Promise<NodeExecutionResult>;
  executeParallel(
    nodes: NodeInstance[],
    inputs: unknown[],
    context: WorkerContext
  ): Promise<NodeExecutionResult[]>;
  executeBatch(
    batch: { node: NodeInstance; input: unknown }[],
    context: WorkerContext
  ): Promise<NodeExecutionResult[]>;
  cancel(executionId: string): void;
  getExecutionStatus(executionId: string): string | undefined;
}

// 导出常用的类型联合
export type NodeStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'performance' | 'error' | 'resource' | 'custom';
export type TestAssertionType =
  | 'equals'
  | 'contains'
  | 'matches'
  | 'type'
  | 'range'
  | 'custom';
