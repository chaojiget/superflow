import { blueprintToDag } from '../planner/blueprintToDag';

interface ReactFlowObject {
  type: 'ReactFlow';
  nodes: unknown[];
  edges: unknown[];
}

// 简化的 React Flow 组件占位实现
function ReactFlow({ nodes, edges }: { nodes: unknown[]; edges: unknown[] }): ReactFlowObject {
  return { type: 'ReactFlow', nodes, edges };
}

/**
 * 使用 React Flow（占位实现）渲染蓝图。
 */
export function renderFlow(blueprint: Parameters<typeof blueprintToDag>[0]): ReactFlowObject {
  const { nodes, edges } = blueprintToDag(blueprint);
  return ReactFlow({ nodes, edges });
}

export default renderFlow;
