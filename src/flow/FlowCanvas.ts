/**
 * Flow Canvas 流程画布类
 * 管理 React Flow 的节点和边操作
 */

import React from 'react';
import {
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from 'reactflow';
import { generateId } from '@/shared/utils';
import { logger } from '@/utils/logger';
import type {
  FlowNode,
  FlowEdge,
  NodePosition,
  NodeRuntimeStatus,
} from '@core';
import type { RunCenter } from '@/run-center';
import type { NodeExecutionEventSource } from '@core';
const STATUS_STYLES: Record<NodeRuntimeStatus, React.CSSProperties> = {
  idle: { border: '1px solid #d1d5db' },
  running: { border: '2px solid #3b82f6' },
  success: { border: '2px solid #22c55e' },
  error: { border: '2px solid #ef4444' },
};
import type { ExecutionDAG } from '@/planner/types';
import {
  processErrorNodes,
  processInputNodes,
  processTransformNodes,
  processConditionalBranches,
  processOutputNodes,
} from './executor';

/**
 * 流程画布配置
 */
export interface FlowCanvasConfig {
  readonly?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  virtualization?: boolean;
}

/**
 * 流程画布事件
 */
export interface FlowCanvasEvents {
  onNodeChange?: (changes: NodeChange[]) => void;
  onEdgeChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onNodeDrag?: (event: React.MouseEvent, node: Node, nodes: Node[]) => void;
  onSelectionChange?: (elements: { nodes: Node[]; edges: Edge[] }) => void;
}

/**
 * 流程画布类
 */
export class FlowCanvas {
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private config: FlowCanvasConfig;

  constructor(config: FlowCanvasConfig = {}) {
    this.config = {
      readonly: false,
      snapToGrid: true,
      gridSize: 20,
      defaultZoom: 1,
      minZoom: 0.1,
      maxZoom: 2,
      virtualization: true,
      ...config,
    };
  }

  getNodes(): Node[] {
    return [...this.nodes];
  }
  getEdges(): Edge[] {
    return [...this.edges];
  }
  getVisibleElements(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): { nodes: Node[]; edges: Edge[] } {
    if (!this.config.virtualization) {
      return { nodes: this.getNodes(), edges: this.getEdges() };
    }
    const inView = (n: Node) => {
      const x = n.position?.x ?? 0;
      const y = n.position?.y ?? 0;
      return (
        x >= rect.x &&
        y >= rect.y &&
        x <= rect.x + rect.width &&
        y <= rect.y + rect.height
      );
    };
    const nodes = this.nodes.filter(inView);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = this.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    return { nodes, edges };
  }
}

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

export interface FlowRunResult {
  id: string;
  flowId: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failed' | 'cancelled';
}

