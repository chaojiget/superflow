/**
 * 蓝图转 DAG 模块
 * 将蓝图转换为可执行的有向无环图
 */

import { generateId } from '@/shared/utils';
import type { Blueprint } from '@/ideas/types';
import type { 
  ExecutionDAG, 
  DAGNode, 
  DAGEdge, 
  TopologyResult, 
  DependencyAnalysis,
  ExecutionPlan,
  ParallelGroup
} from './types';

/**
 * 蓝图转换配置
 */
export interface BlueprintToDagConfig {
  optimizeParallelism?: boolean;
  validateCycles?: boolean;
  generateExecutionPlan?: boolean;
  maxParallelNodes?: number;
  includeMetrics?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<BlueprintToDagConfig> = {
  optimizeParallelism: true,
  validateCycles: true,
  generateExecutionPlan: true,
  maxParallelNodes: 10,
  includeMetrics: true
};

/**
 * 将蓝图转换为 DAG
 */
export function blueprintToDag(
  blueprint: Blueprint | { nodes: any[]; edges: any[] },
  config: BlueprintToDagConfig = {}
): ExecutionDAG {
  const conf = { ...DEFAULT_CONFIG, ...config };
  
  // 验证输入
  if (!blueprint.nodes || !Array.isArray(blueprint.nodes)) {
    throw new Error('蓝图必须包含节点数组');
  }
  
  if (!blueprint.edges || !Array.isArray(blueprint.edges)) {
    throw new Error('蓝图必须包含边数组');
  }

  if (blueprint.nodes.length === 0) {
    throw new Error('蓝图不能为空');
  }

  // 转换节点
  const dagNodes = convertNodes(blueprint.nodes);
  
  // 转换边
  const dagEdges = convertEdges(blueprint.edges, dagNodes);
  
  // 验证节点引用
  validateNodeReferences(dagNodes, dagEdges);
  
  // 检测循环依赖
  if (conf.validateCycles) {
    const cycles = detectCycles(dagNodes, dagEdges);
    if (cycles.length > 0) {
      throw new Error(`检测到循环依赖: ${cycles.map(cycle => cycle.join(' -> ')).join(', ')}`);
    }
  }
  
  // 构建拓扑排序
  const topology = buildTopology(dagNodes, dagEdges);
  
  // 分析依赖关系
  const dependencies = analyzeDependencies(dagNodes, dagEdges);
  
  // 生成执行计划
  let executionPlan: ExecutionPlan | undefined;
  if (conf.generateExecutionPlan) {
    executionPlan = generateExecutionPlan(dagNodes, dagEdges, topology, conf);
  }
  
  // 计算性能指标
  const metrics = conf.includeMetrics ? calculateMetrics(dagNodes, dagEdges, topology) : undefined;
  
  return {
    id: generateId(),
    nodes: dagNodes,
    edges: dagEdges,
    topology,
    dependencies,
    executionPlan,
    metrics,
    createdAt: Date.now(),
    executionOrder: topology.order
  };
}

/**
 * 转换节点
 */
function convertNodes(blueprintNodes: any[]): DAGNode[] {
  return blueprintNodes.map(node => {
    const dagNode: DAGNode = {
      id: node.id || generateId(),
      type: node.kind || node.type || 'default',
      name: node.name || `Node ${node.id}`,
      description: node.description || '',
      inputs: node.inputs || [],
      outputs: node.outputs || [],
      dependencies: [],
      dependents: [],
      level: 0,
      executionGroup: 0,
      status: 'pending',
      metadata: {
        originalNode: node,
        capabilities: node.capabilities || [],
        retryable: node.capabilities?.includes('retryable') || false,
        concurrent: node.capabilities?.includes('concurrent') || false,
        idempotent: node.capabilities?.includes('idempotent') || false,
        cacheable: node.capabilities?.includes('cacheable') || false
      }
    };
    
    return dagNode;
  });
}

/**
 * 转换边
 */
function convertEdges(blueprintEdges: any[], dagNodes: DAGNode[]): DAGEdge[] {
  const nodeMap = new Map(dagNodes.map(node => [node.id, node]));
  
  return blueprintEdges.map(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    
    if (!sourceNode) {
      throw new Error(`边 ${edge.id} 引用了不存在的源节点: ${edge.source}`);
    }
    
    if (!targetNode) {
      throw new Error(`边 ${edge.id} 引用了不存在的目标节点: ${edge.target}`);
    }
    
    const dagEdge: DAGEdge = {
      id: edge.id || generateId(),
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type || 'data',
      weight: edge.weight || 1,
      condition: edge.condition,
      metadata: {
        originalEdge: edge,
        animated: edge.animated || false
      }
    };
    
    // 更新节点的依赖关系
    sourceNode.dependents.push(edge.target);
    targetNode.dependencies.push(edge.source);
    
    return dagEdge;
  });
}

/**
 * 验证节点引用
 */
function validateNodeReferences(nodes: DAGNode[], edges: DAGEdge[]): void {
  const nodeIds = new Set(nodes.map(node => node.id));
  
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      throw new Error(`边 ${edge.id} 引用了不存在的源节点: ${edge.source}`);
    }
    
    if (!nodeIds.has(edge.target)) {
      throw new Error(`边 ${edge.id} 引用了不存在的目标节点: ${edge.target}`);
    }
  }
}

/**
 * 检测循环依赖
 */
function detectCycles(nodes: DAGNode[], edges: DAGEdge[]): string[][] {
  const graph = buildAdjacencyList(nodes, edges);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  
  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // 找到循环
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart >= 0) {
        cycles.push([...path.slice(cycleStart), nodeId]);
      }
      return;
    }
    
    if (visited.has(nodeId)) {
      return;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = graph.get(nodeId) || [];
    for (const neighborId of neighbors) {
      dfs(neighborId, path);
    }
    
    recursionStack.delete(nodeId);
    path.pop();
  }
  
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }
  
  return cycles;
}

/**
 * 构建邻接表
 */
function buildAdjacencyList(nodes: DAGNode[], edges: DAGEdge[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  // 初始化所有节点
  for (const node of nodes) {
    graph.set(node.id, []);
  }
  
  // 添加边
  for (const edge of edges) {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
  }
  
  return graph;
}

/**
 * 构建拓扑排序
 */
function buildTopology(nodes: DAGNode[], edges: DAGEdge[]): TopologyResult {
  const graph = buildAdjacencyList(nodes, edges);
  const inDegree = new Map<string, number>();
  const order: string[] = [];
  const levels: string[][] = [];
  
  // 计算入度
  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  
  for (const edge of edges) {
    const currentInDegree = inDegree.get(edge.target) || 0;
    inDegree.set(edge.target, currentInDegree + 1);
  }
  
  // Kahn 算法进行拓扑排序
  let queue = nodes.filter(node => (inDegree.get(node.id) || 0) === 0).map(node => node.id);
  let level = 0;
  
  while (queue.length > 0) {
    const currentLevel = [...queue];
    levels.push(currentLevel);
    
    // 更新节点层级
    for (const nodeId of currentLevel) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.level = level;
      }
    }
    
    const nextQueue: string[] = [];
    
    for (const nodeId of queue) {
      order.push(nodeId);
      
      const neighbors = graph.get(nodeId) || [];
      for (const neighborId of neighbors) {
        const currentInDegree = inDegree.get(neighborId) || 0;
        const newInDegree = currentInDegree - 1;
        inDegree.set(neighborId, newInDegree);
        
        if (newInDegree === 0) {
          nextQueue.push(neighborId);
        }
      }
    }
    
    queue = nextQueue;
    level++;
  }
  
  // 检查是否所有节点都被访问（确保无环）
  if (order.length !== nodes.length) {
    const unvisited = nodes.filter(node => !order.includes(node.id)).map(node => node.id);
    throw new Error(`拓扑排序失败，可能存在循环依赖。未访问的节点: ${unvisited.join(', ')}`);
  }
  
  return {
    order,
    levels,
    depth: levels.length,
    width: Math.max(...levels.map(level => level.length))
  };
}

/**
 * 分析依赖关系
 */
function analyzeDependencies(nodes: DAGNode[], edges: DAGEdge[]): DependencyAnalysis {
  const dependencyMap = new Map<string, Set<string>>();
  const dependentMap = new Map<string, Set<string>>();
  
  // 初始化
  for (const node of nodes) {
    dependencyMap.set(node.id, new Set());
    dependentMap.set(node.id, new Set());
  }
  
  // 构建直接依赖关系
  for (const edge of edges) {
    dependencyMap.get(edge.target)?.add(edge.source);
    dependentMap.get(edge.source)?.add(edge.target);
  }
  
  // 计算传递依赖关系
  function getTransitiveDependencies(nodeId: string, visited = new Set<string>()): Set<string> {
    if (visited.has(nodeId)) {
      return new Set();
    }
    
    visited.add(nodeId);
    const dependencies = new Set<string>();
    const directDependencies = dependencyMap.get(nodeId) || new Set();
    
    for (const depId of directDependencies) {
      dependencies.add(depId);
      const transitiveDeps = getTransitiveDependencies(depId, visited);
      for (const transDepId of transitiveDeps) {
        dependencies.add(transDepId);
      }
    }
    
    visited.delete(nodeId);
    return dependencies;
  }
  
  const criticalPath = findCriticalPath(nodes, edges);
  const parallelGroups = identifyParallelGroups(nodes, edges);
  
  return {
    directDependencies: dependencyMap,
    transitiveDependencies: new Map(
      nodes.map(node => [node.id, getTransitiveDependencies(node.id)])
    ),
    criticalPath,
    parallelGroups,
    maxParallelism: Math.max(...parallelGroups.map(group => group.nodes.length)),
    totalDependencies: Array.from(dependencyMap.values()).reduce(
      (sum, deps) => sum + deps.size, 0
    )
  };
}

/**
 * 查找关键路径
 */
function findCriticalPath(nodes: DAGNode[], edges: DAGEdge[]): string[] {
  // 使用最长路径算法找到关键路径
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();
  
  // 初始化距离
  for (const node of nodes) {
    distances.set(node.id, 0);
    predecessors.set(node.id, null);
  }
  
  // 按拓扑顺序处理节点
  const topology = buildTopology(nodes, edges);
  for (const nodeId of topology.order) {
    const currentDistance = distances.get(nodeId) || 0;
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    for (const edge of outgoingEdges) {
      const targetDistance = distances.get(edge.target) || 0;
      const newDistance = currentDistance + (edge.weight || 1);
      
      if (newDistance > targetDistance) {
        distances.set(edge.target, newDistance);
        predecessors.set(edge.target, nodeId);
      }
    }
  }
  
  // 找到最长路径的终点
  let maxDistance = 0;
  let endNode = '';
  for (const [nodeId, distance] of distances) {
    if (distance > maxDistance) {
      maxDistance = distance;
      endNode = nodeId;
    }
  }
  
  // 重构路径
  const path: string[] = [];
  let current: string | null = endNode;
  
  while (current) {
    path.unshift(current);
    current = predecessors.get(current) || null;
  }
  
  return path;
}

/**
 * 识别并行组
 */
function identifyParallelGroups(nodes: DAGNode[], edges: DAGEdge[]): ParallelGroup[] {
  const topology = buildTopology(nodes, edges);
  const groups: ParallelGroup[] = [];
  
  for (let i = 0; i < topology.levels.length; i++) {
    const levelNodes = topology.levels[i];
    
    if (levelNodes.length > 1) {
      groups.push({
        id: generateId(),
        level: i,
        nodes: levelNodes,
        maxConcurrency: Math.min(levelNodes.length, 10), // 默认最大并发数
        dependencies: i > 0 ? topology.levels[i - 1] : [],
        dependents: i < topology.levels.length - 1 ? topology.levels[i + 1] : []
      });
    }
  }
  
  return groups;
}

/**
 * 生成执行计划
 */
function generateExecutionPlan(
  nodes: DAGNode[], 
  edges: DAGEdge[], 
  topology: TopologyResult, 
  config: Required<BlueprintToDagConfig>
): ExecutionPlan {
  const groups = identifyParallelGroups(nodes, edges);
  const batches: string[][] = [];
  
  // 将拓扑层级转换为执行批次
  for (const level of topology.levels) {
    if (level.length <= config.maxParallelNodes) {
      batches.push(level);
    } else {
      // 如果并行度超过限制，分批执行
      for (let i = 0; i < level.length; i += config.maxParallelNodes) {
        batches.push(level.slice(i, i + config.maxParallelNodes));
      }
    }
  }
  
  const estimatedTime = calculateEstimatedExecutionTime(nodes, edges, batches);
  
  return {
    id: generateId(),
    batches,
    parallelGroups: groups,
    estimatedTime,
    maxConcurrency: Math.min(
      Math.max(...topology.levels.map(level => level.length)),
      config.maxParallelNodes
    ),
    criticalPath: findCriticalPath(nodes, edges),
    optimizationHints: generateOptimizationHints(nodes, edges, topology)
  };
}

/**
 * 计算估计执行时间
 */
function calculateEstimatedExecutionTime(
  nodes: DAGNode[], 
  edges: DAGEdge[], 
  batches: string[][]
): number {
  // 简单的估算：每个节点基础时间 + 网络延迟
  const baseTimePerNode = 1000; // 1秒
  const networkDelay = 100; // 100毫秒
  
  let totalTime = 0;
  
  for (const batch of batches) {
    // 并行执行的批次时间取最长的节点时间
    const batchTime = Math.max(...batch.map(() => baseTimePerNode));
    totalTime += batchTime + networkDelay;
  }
  
  return totalTime;
}

/**
 * 生成优化建议
 */
function generateOptimizationHints(
  nodes: DAGNode[], 
  edges: DAGEdge[], 
  topology: TopologyResult
): string[] {
  const hints: string[] = [];
  
  // 检查长链条
  if (topology.depth > 10) {
    hints.push('流程链条较长，考虑拆分或并行化部分节点');
  }
  
  // 检查瓶颈
  if (topology.width < nodes.length * 0.3) {
    hints.push('并行度较低，考虑重新设计流程以提高并发性');
  }
  
  // 检查孤立节点
  const connectedNodes = new Set();
  for (const edge of edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }
  
  const isolatedNodes = nodes.filter(node => !connectedNodes.has(node.id));
  if (isolatedNodes.length > 0) {
    hints.push(`发现 ${isolatedNodes.length} 个孤立节点，检查是否需要连接`);
  }
  
  // 检查可缓存节点
  const cacheableNodes = nodes.filter(node => 
    node.metadata.cacheable && 
    node.dependencies.length > 0
  );
  
  if (cacheableNodes.length > 0) {
    hints.push(`${cacheableNodes.length} 个节点支持缓存，可以提高重复执行性能`);
  }
  
  return hints;
}

/**
 * 计算 DAG 指标
 */
function calculateMetrics(nodes: DAGNode[], edges: DAGEdge[], topology: TopologyResult) {
  const nodeTypeCount = new Map<string, number>();
  const edgeTypeCount = new Map<string, number>();
  
  // 统计节点类型
  for (const node of nodes) {
    const count = nodeTypeCount.get(node.type) || 0;
    nodeTypeCount.set(node.type, count + 1);
  }
  
  // 统计边类型
  for (const edge of edges) {
    const count = edgeTypeCount.get(edge.type) || 0;
    edgeTypeCount.set(edge.type, count + 1);
  }
  
  // 计算复杂度（基于节点数和边数）
  const complexity = Math.log2(nodes.length + 1) + Math.log2(edges.length + 1);
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    depth: topology.depth,
    width: topology.width,
    complexity: Math.round(complexity * 100) / 100,
    nodeTypes: Object.fromEntries(nodeTypeCount),
    edgeTypes: Object.fromEntries(edgeTypeCount),
    avgDependencies: edges.length / nodes.length,
    parallelismRatio: topology.width / nodes.length
  };
}

/**
 * 验证 DAG 结构
 */
export function validateDAG(dag: ExecutionDAG): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查节点唯一性
  const nodeIds = new Set<string>();
  for (const node of dag.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`重复的节点ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }
  
  // 检查边的节点引用
  for (const edge of dag.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`边 ${edge.id} 引用了不存在的源节点: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`边 ${edge.id} 引用了不存在的目标节点: ${edge.target}`);
    }
  }
  
  // 检查拓扑排序的完整性
  if (dag.topology.order.length !== dag.nodes.length) {
    errors.push('拓扑排序不完整');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 优化 DAG
 */
export function optimizeDAG(dag: ExecutionDAG): ExecutionDAG {
  // 创建优化后的副本
  const optimizedDAG = { ...dag };
  
  // 合并可以合并的节点
  optimizedDAG.nodes = mergeCompatibleNodes(dag.nodes, dag.edges);
  
  // 重新构建拓扑
  optimizedDAG.topology = buildTopology(optimizedDAG.nodes, dag.edges);
  
  // 重新生成执行计划
  if (dag.executionPlan) {
    optimizedDAG.executionPlan = generateExecutionPlan(
      optimizedDAG.nodes, 
      dag.edges, 
      optimizedDAG.topology,
      DEFAULT_CONFIG
    );
  }
  
  return optimizedDAG;
}

/**
 * 合并兼容的节点
 */
function mergeCompatibleNodes(nodes: DAGNode[], edges: DAGEdge[]): DAGNode[] {
  // 简单实现：找到可以合并的线性链条
  const result = [...nodes];
  
  // TODO: 实现节点合并逻辑
  // 这里需要更复杂的分析来确定哪些节点可以安全合并
  
  return result;
}