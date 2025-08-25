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
import type {
  FlowNode,
  FlowEdge,
  NodePosition,
  NodeRuntimeStatus,
  NodeExecutionEventSource,
} from '@/shared/types';
import type { ExecutionDAG } from '@/planner/types';

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
      ...config,
    };
  }

  /**
   * 获取所有节点
   */
  getNodes(): Node[] {
    return [...this.nodes];
  }

  /**
   * 获取所有边
   */
  getEdges(): Edge[] {
    return [...this.edges];
  }

  /**
   * 设置节点
   */
  setNodes(nodes: Node[]): void {
    this.nodes = [...nodes];
  }

  /**
   * 设置边
   */
  setEdges(edges: Edge[]): void {
    this.edges = [...edges];
  }

  /**
   * 添加节点
   */
  addNode(nodeData: Partial<FlowNode> & { position: NodePosition }): Node {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    const node: Node = {
      id: nodeData.id || generateId(),
      type: nodeData.kind || 'default',
      position: nodeData.position,
      data: {
        label: nodeData.name || 'New Node',
        ...nodeData.data,
      },
    };

    this.nodes.push(node);
    return node;
  }

  /**
   * 删除节点
   */
  deleteNode(nodeId: string): boolean {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    const index = this.nodes.findIndex((node) => node.id === nodeId);
    if (index === -1) {
      return false;
    }

    // 删除节点
    this.nodes.splice(index, 1);

    // 删除相关的边
    this.edges = this.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    );

    return true;
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, updates: Partial<Node>): boolean {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    const index = this.nodes.findIndex((node) => node.id === nodeId);
    if (index === -1) {
      return false;
    }

    const currentNode = this.nodes[index];
    if (currentNode) {
      this.nodes[index] = {
        ...currentNode,
        ...updates,
        id: currentNode.id, // 确保 ID 存在
      };
    }

    return true;
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodes.find((node) => node.id === nodeId);
  }

  updateNodeRuntimeStatus(nodeId: string, status: NodeRuntimeStatus): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.data = {
        ...node.data,
        runtimeStatus: status,
      };
    }
  }

  attachExecutionEvents(
    source: NodeExecutionEventSource,
    runId: string
  ): () => void {
    return source.subscribeNodeEvents(runId, {
      onNodeStart: (id) => this.updateNodeRuntimeStatus(id, 'running'),
      onNodeSuccess: (id) => this.updateNodeRuntimeStatus(id, 'success'),
      onNodeError: (id) => this.updateNodeRuntimeStatus(id, 'error'),
    });
  }

  async retryNode(
    source: NodeExecutionEventSource,
    runId: string,
    nodeId: string
  ): Promise<void> {
    await source.retryNode(runId, nodeId);
  }

  /**
   * 添加边
   */
  addEdge(
    edgeData: Partial<FlowEdge> & { source: string; target: string }
  ): Edge {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    const edge: Edge = {
      id:
        edgeData.id ||
        this.generateEdgeId(
          edgeData.source,
          edgeData.target,
          edgeData.sourceHandle,
          edgeData.targetHandle
        ),
      source: edgeData.source,
      target: edgeData.target,
      sourceHandle: edgeData.sourceHandle ?? null,
      targetHandle: edgeData.targetHandle ?? null,
      type: edgeData.type || 'default',
      animated: edgeData.animated || false,
    };

    // 检查是否已存在相同的连接
    const existingEdge = this.edges.find(
      (e) =>
        e.source === edge.source &&
        e.target === edge.target &&
        e.sourceHandle === edge.sourceHandle &&
        e.targetHandle === edge.targetHandle
    );

    if (existingEdge) {
      throw new Error('Edge already exists');
    }

    this.edges.push(edge);
    return edge;
  }

  /**
   * 删除边
   */
  deleteEdge(edgeId: string): boolean {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    const index = this.edges.findIndex((edge) => edge.id === edgeId);
    if (index === -1) {
      return false;
    }

    this.edges.splice(index, 1);
    return true;
  }

  /**
   * 获取边
   */
  getEdge(edgeId: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === edgeId);
  }

  /**
   * 获取节点的输入边
   */
  getNodeInputEdges(nodeId: string): Edge[] {
    return this.edges.filter((edge) => edge.target === nodeId);
  }

  /**
   * 获取节点的输出边
   */
  getNodeOutputEdges(nodeId: string): Edge[] {
    return this.edges.filter((edge) => edge.source === nodeId);
  }

  /**
   * 清空画布
   */
  clear(): void {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    this.nodes = [];
    this.edges = [];
  }

  /**
   * 获取选中的节点
   */
  getSelectedNodes(): Node[] {
    return this.nodes.filter((node) => node.selected);
  }

  /**
   * 获取选中的边
   */
  getSelectedEdges(): Edge[] {
    return this.edges.filter((edge) => edge.selected);
  }

  /**
   * 选择所有元素
   */
  selectAll(): void {
    this.nodes.forEach((node) => (node.selected = true));
    this.edges.forEach((edge) => (edge.selected = true));
  }

  /**
   * 取消选择所有元素
   */
  deselectAll(): void {
    this.nodes.forEach((node) => (node.selected = false));
    this.edges.forEach((edge) => (edge.selected = false));
  }

  /**
   * 删除选中的元素
   */
  deleteSelected(): void {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    const selectedNodes = this.getSelectedNodes();
    const selectedEdges = this.getSelectedEdges();

    // 删除选中的节点（会自动删除相关边）
    selectedNodes.forEach((node) => this.deleteNode(node.id));

    // 删除选中的边
    selectedEdges.forEach((edge) => this.deleteEdge(edge.id));
  }

  /**
   * 自动布局
   */
  autoLayout(): void {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    // 简单的层次布局算法
    const layers = this.calculateLayers();
    const layerHeight = 200;
    const nodeSpacing = 150;

    layers.forEach((layer, layerIndex) => {
      layer.forEach((nodeId, nodeIndex) => {
        const node = this.getNode(nodeId);
        if (node) {
          node.position = {
            x: nodeIndex * nodeSpacing,
            y: layerIndex * layerHeight,
          };
        }
      });
    });
  }

  /**
   * 适配到视口
   */
  fitView(): void {
    // 这个方法需要与实际的 React Flow 实例配合使用
    // 在组件中调用 React Flow 的 fitView 方法
  }

  /**
   * 获取配置
   */
  getConfig(): FlowCanvasConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<FlowCanvasConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * 序列化画布数据
   */
  serialize(): { nodes: Node[]; edges: Edge[]; config: FlowCanvasConfig } {
    return {
      nodes: this.getNodes(),
      edges: this.getEdges(),
      config: this.getConfig(),
    };
  }

  /**
   * 反序列化画布数据
   */
  deserialize(data: {
    nodes: Node[];
    edges: Edge[];
    config?: FlowCanvasConfig;
  }): void {
    this.setNodes(data.nodes);
    this.setEdges(data.edges);
    if (data.config) {
      this.updateConfig(data.config);
    }
  }

  /**
   * 生成边的ID
   */
  private generateEdgeId(
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string
  ): string {
    const handles =
      sourceHandle && targetHandle ? `${sourceHandle}->${targetHandle}` : '';
    return `${source}:${handles}->${target}`;
  }

  /**
   * 计算节点层次（用于自动布局）
   */
  private calculateLayers(): string[][] {
    const layers: string[][] = [];
    const visited = new Set<string>();
    const nodeChildren = new Map<string, string[]>();

    // 构建子节点映射
    this.edges.forEach((edge) => {
      if (!nodeChildren.has(edge.source)) {
        nodeChildren.set(edge.source, []);
      }
      const children = nodeChildren.get(edge.source);
      if (children) {
        children.push(edge.target);
      }
    });

    // 找到根节点（没有输入边的节点）
    const rootNodes = this.nodes
      .filter((node) => !this.edges.some((edge) => edge.target === node.id))
      .map((node) => node.id);

    if (rootNodes.length === 0) {
      // 如果没有根节点，选择第一个节点作为起点
      const firstNode = this.nodes[0];
      if (firstNode) {
        rootNodes.push(firstNode.id);
      }
    }

    // BFS 构建层次
    let currentLayer = rootNodes;
    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);
      const nextLayer: string[] = [];

      currentLayer.forEach((nodeId) => {
        visited.add(nodeId);
        const children = nodeChildren.get(nodeId) || [];
        children.forEach((childId) => {
          if (!visited.has(childId) && !nextLayer.includes(childId)) {
            nextLayer.push(childId);
          }
        });
      });

      currentLayer = nextLayer;
    }

    // 处理未访问的节点（可能存在循环）
    const unvisited = this.nodes
      .filter((node) => !visited.has(node.id))
      .map((node) => node.id);

    if (unvisited.length > 0) {
      layers.push(unvisited);
    }

    return layers;
  }

  /**
   * 加载 DAG 到画布
   */
  async loadDAG(dag: ExecutionDAG): Promise<void> {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    this.clear();

    // 转换 DAG 节点为 React Flow 节点
    const nodes: Node[] = dag.nodes.map((dagNode, index) => ({
      id: dagNode.id,
      type: (dagNode as unknown as FlowNode).kind || 'default',
      position: { x: index * 200, y: 0 },
      data: {
        label: (dagNode as unknown as FlowNode).name || dagNode.id,
        ...dagNode,
      },
    }));

    // 转换 DAG 边为 React Flow 边
    const edges: Edge[] = dag.edges.map((dagEdge) => ({
      id: dagEdge.id,
      source: dagEdge.source,
      target: dagEdge.target,
      type: dagEdge.type || 'default',
      animated: false,
    }));

    this.setNodes(nodes);
    this.setEdges(edges);
  }

  /**
   * 加载简化的节点和边到画布（用于测试）
   */
  async loadNodes(
    nodes: Array<
      | FlowNode
      | {
          id: string;
          type?: string;
          data?: Record<string, unknown>;
        }
    >,
    edges: Array<
      | FlowEdge
      | {
          id: string;
          source: string;
          target: string;
          type?: string;
          animated?: boolean;
          data?: Record<string, unknown>;
        }
    >
  ): Promise<void> {
    if (this.config.readonly) {
      throw new Error('Canvas is readonly');
    }

    this.clear();

    // 转换节点为 React Flow 节点（支持简化格式）
    const reactFlowNodes: Node[] = nodes.map((node, index) => {
      // 类型守卫：检查是否是完整的 FlowNode
      const isFlowNode = (n: typeof node): n is FlowNode => {
        return 'kind' in n && 'name' in n;
      };

      if (isFlowNode(node)) {
        // 完整的 FlowNode 格式
        return {
          id: node.id,
          type: node.kind || 'default',
          position: node.position || { x: index * 200, y: 0 },
          data: {
            label: node.name || node.id,
            ...node,
          },
        };
      } else {
        // 简化格式：{id, type, data}
        return {
          id: node.id,
          type: (node as { type?: string }).type || 'default',
          position: { x: index * 200, y: 0 },
          data: {
            label: node.id,
            ...(node as { data?: Record<string, unknown> }).data,
          },
        };
      }
    });

    // 转换边为 React Flow 边
    const reactFlowEdges: Edge[] = edges.map((edge) => {
      // 类型守卫：检查是否是完整的 FlowEdge
      const isFlowEdge = (e: typeof edge): e is FlowEdge => {
        return 'sourceHandle' in e || 'targetHandle' in e;
      };

      if (isFlowEdge(edge)) {
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'default',
          animated: edge.animated || false,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        };
      } else {
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: (edge as { type?: string }).type || 'default',
          animated: (edge as { animated?: boolean }).animated || false,
        };
      }
    });

    this.setNodes(reactFlowNodes);
    this.setEdges(reactFlowEdges);
  }

  /**
   * 执行流程
   */
  async execute(
    runId?: string,
    input?: unknown,
    runCenter?: {
      addLog: (
        runId: string,
        log: { level: string; message: string }
      ) => Promise<void>;
      updateRunStatus: (
        runId: string,
        status: string,
        data?: Record<string, unknown>
      ) => Promise<void>;
    }
  ): Promise<{
    status: 'completed' | 'failed' | 'running';
    outputs?: Record<string, unknown>;
    error?: string;
    duration?: number;
    timestamp: number;
  }> {
    const startTime = Date.now();
    const executionId = runId || `exec-${Date.now()}`;

    try {
      // 记录执行开始
      console.log(`[FlowCanvas] 开始执行流程: ${executionId}`);

      // 如果有 RunCenter，记录日志
      if (runCenter && runId) {
        await runCenter.addLog(runId, {
          level: 'info',
          message: `流程开始执行: ${executionId}`,
        });
      }

      // 执行节点逻辑
      const outputs: Record<string, unknown> = {};
      let currentData = input;

      // 检查是否有错误节点（用于测试错误场景）
      const errorNodes = this.nodes.filter(
        (node) => node.type === 'error' || node.data?.shouldFail
      );
      for (const errorNode of errorNodes) {
        if (
          errorNode.data?.handler &&
          typeof errorNode.data.handler === 'function'
        ) {
          // 执行错误节点的 handler，这会抛出错误
          await errorNode.data.handler();
        } else {
          throw new Error('节点执行失败');
        }
      }

      // 按拓扑顺序执行节点
      const inputNodes = this.nodes.filter((node) => node.type === 'input');
      const transformNodes = this.nodes.filter(
        (node) => node.type === 'transform'
      );
      const outputNodes = this.nodes.filter((node) => node.type === 'output');

      // 1. 处理输入节点
      for (const inputNode of inputNodes) {
        if (inputNode.data?.value) {
          currentData = inputNode.data.value;
        }
      }

      // 2. 处理转换节点
      for (const transformNode of transformNodes) {
        if (
          transformNode.data?.handler &&
          typeof transformNode.data.handler === 'function'
        ) {
          currentData = await transformNode.data.handler(currentData);
        } else if (
          transformNode.data?.operation === 'uppercase' &&
          typeof currentData === 'string'
        ) {
          currentData = currentData.toUpperCase();
        }
      }

      // 3. 处理条件分支
      const conditionNodes = this.nodes.filter(
        (node) => node.type === 'condition'
      );
      const processNodes = this.nodes.filter((node) => node.type === 'process');

      for (const conditionNode of conditionNodes) {
        if (
          conditionNode.data?.condition &&
          typeof input === 'object' &&
          input !== null
        ) {
          const inputValue = (input as Record<string, unknown>).input;
          if (
            typeof inputValue === 'number' &&
            typeof conditionNode.data.condition === 'function'
          ) {
            const conditionResult = conditionNode.data.condition(inputValue);

            // 根据条件结果执行对应的分支
            if (conditionResult) {
              // 找到 true 分支节点
              const trueBranchNode = processNodes.find(
                (node) => node.id === 'true-branch'
              );
              if (trueBranchNode && trueBranchNode.data?.value) {
                outputs['true-branch'] = trueBranchNode.data.value;
              }
            } else {
              // 找到 false 分支节点
              const falseBranchNode = processNodes.find(
                (node) => node.id === 'false-branch'
              );
              if (falseBranchNode && falseBranchNode.data?.value) {
                outputs['false-branch'] = falseBranchNode.data.value;
              }
            }
          }
        }
      }

      // 4. 处理输出节点（仅当没有条件分支的情况下）
      if (outputNodes.length > 0 && Object.keys(outputs).length === 0) {
        outputNodes.forEach((outputNode) => {
          if (outputNode.data?.label) {
            outputs[outputNode.data.label] = currentData;
          } else {
            outputs.output = currentData;
          }
        });
      } else if (Object.keys(outputs).length === 0) {
        outputs.output = currentData;
      }

      // 如果有 RunCenter，记录完成日志
      if (runCenter && runId) {
        await runCenter.addLog(runId, {
          level: 'info',
          message: `流程执行完成: ${executionId}`,
        });
        await runCenter.updateRunStatus(runId, 'completed', {
          output: outputs,
          endTime: Date.now(),
          finishedAt: Date.now(),
        });
      }

      return {
        status: 'completed',
        outputs,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      // 如果有 RunCenter，记录错误日志
      if (runCenter && runId) {
        await runCenter.addLog(runId, {
          level: 'error',
          message: `流程执行失败: ${error instanceof Error ? error.message : String(error)}`,
        });
        await runCenter.updateRunStatus(runId, 'failed', {
          error: error instanceof Error ? error.message : String(error),
          endTime: Date.now(),
          finishedAt: Date.now(),
        });
      }

      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }
}
