/**
 * Planner 模块类型定义
 * 规划和执行相关类型
 */

import type { Port, NodeCapability } from '@core';

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

export type NodeExecutionStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface EdgeCondition {
  type: 'always' | 'success' | 'failure' | 'custom';
  expression?: string;
  parameters?: Record<string, unknown>;
}

export interface ResourceRequirement {
  cpu?: number;
  memory?: number;
  gpu?: number;
  disk?: number;
  network?: boolean;
  external?: string[];
}

export interface TopologyResult {
  order: string[];
  levels: string[][];
  depth: number;
  width: number;
}

export interface DependencyAnalysis {
  directDependencies: Map<string, Set<string>>;
  transitiveDependencies: Map<string, Set<string>>;
  criticalPath: string[];
  parallelGroups: ParallelGroup[];
  maxParallelism: number;
  totalDependencies: number;
}

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

export interface ResourcePlan {
  totalResources: ResourceRequirement;
  peakResources: ResourceRequirement;
  resourceTimeline: ResourceAllocation[];
  conflicts: ResourceConflict[];
  recommendations: string[];
}

export interface ResourceAllocation {
  timestamp: number;
  nodeId: string;
  resources: ResourceRequirement;
  action: 'allocate' | 'release';
}

export interface ResourceConflict {
  type: 'cpu' | 'memory' | 'gpu' | 'disk' | 'network';
  nodes: string[];
  timestamp: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface RetryStrategy {
  globalMaxRetries: number;
  nodeRetryConfig: Map<string, NodeRetryConfig>;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

export interface NodeRetryConfig {
  maxRetries: number;
  delayMs: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  jitter: boolean;
}

export interface DAGMetrics {
  totalNodes: number;
  totalEdges: number;
  criticalPathLength: number;
  parallelism: number;
  estimatedTime: number;
}

