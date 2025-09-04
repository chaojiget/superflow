/**
 * Flow 模块类型定义
 * 流程相关的专用类型
 */

import type { Node, Edge, Viewport, XYPosition } from 'reactflow';
import React from 'react';
import type { FlowNode, NodeKind, EdgeType } from '@core';

/**
 * 流程画布状态
 */
export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodes: string[];
  selectedEdges: string[];
  clipboard: {
    nodes: Node[];
    edges: Edge[];
  };
  history: {
    past: FlowSnapshot[];
    present: FlowSnapshot;
    future: FlowSnapshot[];
  };
}

/**
 * 流程快照（用于撤销/重做）
 */
export interface FlowSnapshot {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  timestamp: number;
}

/**
 * 流程操作类型
 */
export type FlowAction =
  | { type: 'SET_NODES'; payload: Node[] }
  | { type: 'SET_EDGES'; payload: Edge[] }
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<Node> } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_EDGE'; payload: Edge }
  | { type: 'DELETE_EDGE'; payload: string }
  | { type: 'SET_VIEWPORT'; payload: Viewport }
  | { type: 'SELECT_NODES'; payload: string[] }
  | { type: 'SELECT_EDGES'; payload: string[] }
  | { type: 'COPY_SELECTION' }
  | { type: 'PASTE_CLIPBOARD'; payload: XYPosition }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' };

/**
 * 节点模板
 */
export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  kind: NodeKind;
  icon?: string;
  category: string;
  tags: string[];
  defaultProps: Partial<FlowNode>;
  schema?: unknown;
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
  templates: NodeTemplate[];
}

/**
 * 流程模板
 */
export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  preview?: string;
  nodes: Node[];
  edges: Edge[];
  metadata: {
    author: string;
    version: string;
    createdAt: number;
    updatedAt: number;
  };
}

/**
 * 布局配置
 */
export interface LayoutConfig {
  type: 'hierarchical' | 'force' | 'grid' | 'circular' | 'manual';
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  spacing: {
    x: number;
    y: number;
  };
  alignment?: 'start' | 'center' | 'end';
  animate?: boolean;
  duration?: number;
}

/**
 * 网格配置
 */
export interface GridConfig {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  snap: boolean;
}

/**
 * 流程验证结果
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
  type: 'node' | 'edge' | 'flow';
  id: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
  details?: unknown;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  type: 'node' | 'edge' | 'flow';
  id: string;
  message: string;
  code: string;
  details?: unknown;
}

/**
 * 流程运行配置
 */
export interface FlowRunConfig {
  id: string;
  concurrent: boolean;
  maxRetries: number;
  timeout: number;
  onProgress?: (progress: FlowProgress) => void;
  onComplete?: (result: FlowRunResult) => void;
  onError?: (error: Error) => void;
}

/**
 * 流程运行进度
 */
export interface FlowProgress {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  currentNode?: string;
  elapsedTime: number;
  estimatedTime?: number;
}

/**
 * 流程运行结果
 */
export interface FlowRunResult {
  id: string;
  flowId: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failed' | 'cancelled';
  nodes: NodeRunResult[];
  errors: FlowRunError[];
  metrics: FlowMetrics;
}

/**
 * 节点运行结果
 */
export interface NodeRunResult {
  nodeId: string;
  status: 'success' | 'failed' | 'skipped' | 'cancelled';
  startTime: number;
  endTime: number;
  input?: unknown;
  output?: unknown;
  error?: string;
  metrics: NodeMetrics;
}

/**
 * 流程运行错误
 */
export interface FlowRunError {
  nodeId: string;
  type: string;
  message: string;
  stack?: string;
  timestamp: number;
}

/**
 * 流程指标
 */
export interface FlowMetrics {
  executionTime: number;
  nodeCount: number;
  successCount: number;
  failureCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * 节点指标
 */
export interface NodeMetrics {
  executionTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  inputSize?: number;
  outputSize?: number;
}

/**
 * 流程导出配置
 */
export interface FlowExportConfig {
  format: 'json' | 'yaml' | 'xml' | 'png' | 'svg' | 'pdf';
  includeData: boolean;
  includeHistory: boolean;
  compression?: boolean;
  quality?: number; // 用于图片格式
  size?: { width: number; height: number }; // 用于图片格式
}

/**
 * 流程导入配置
 */
export interface FlowImportConfig {
  format: 'json' | 'yaml' | 'xml';
  merge: boolean;
  preserveIds: boolean;
  replaceExisting: boolean;
  validation: boolean;
}

/**
 * 节点端口连接信息
 */
export interface PortConnection {
  nodeId: string;
  portId: string;
  portType: 'input' | 'output';
  dataType: string;
  connected: boolean;
  edges: string[];
}

/**
 * 流程依赖图
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, DependencyEdge>;
  layers: string[][];
  cycles: string[][];
}

/**
 * 依赖节点
 */
export interface DependencyNode {
  id: string;
  dependencies: string[];
  dependents: string[];
  level: number;
  critical: boolean;
}

/**
 * 依赖边
 */
export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
}

/**
 * 流程统计信息
 */
export interface FlowStatistics {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
  complexity: number;
  depth: number;
  width: number;
  cycles: number;
  connectedComponents: number;
}

/**
 * 实时协作状态
 */
export interface CollaborationState {
  users: CollaborationUser[];
  cursors: Record<string, CollaborationCursor>;
  selections: Record<string, CollaborationSelection>;
  locks: Record<string, CollaborationLock>;
}

/**
 * 协作用户
 */
export interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  online: boolean;
  lastSeen: number;
}

/**
 * 协作光标
 */
export interface CollaborationCursor {
  userId: string;
  position: XYPosition;
  visible: boolean;
  timestamp: number;
}

/**
 * 协作选择
 */
export interface CollaborationSelection {
  userId: string;
  nodes: string[];
  edges: string[];
  timestamp: number;
}

/**
 * 协作锁定
 */
export interface CollaborationLock {
  userId: string;
  elementId: string;
  type: 'node' | 'edge';
  timestamp: number;
  duration: number;
}

/**
 * 流程动画配置
 */
export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay: number;
  iterations: number | 'infinite';
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  virtualizedRendering: boolean;
  maxVisibleNodes: number;
  renderOptimization: boolean;
  debounceMs: number;
  throttleMs: number;
}

/**
 * Flow Canvas 组件属性
 */
export interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  readonly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onNodesChange?: (changes: import('reactflow').NodeChange[]) => void;
  onEdgesChange?: (changes: import('reactflow').EdgeChange[]) => void;
  onConnect?: (connection: import('reactflow').Connection) => void;
}

/**
 * Flow 渲染器
 */
export interface FlowRenderer {
  render(nodes: Node[], edges: Edge[]): React.ReactElement;
}

// 导出所有类型
export type {
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  Viewport,
  XYPosition,
};
