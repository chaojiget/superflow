import ReactFlow from 'reactflow';
import { blueprintToDag } from '../planner/blueprintToDag';

/**
 * 使用 React Flow 渲染蓝图并提供基本交互能力。
 */
export function renderFlow(blueprint: Parameters<typeof blueprintToDag>[0]) {
  const { nodes, edges } = blueprintToDag(blueprint);
  return ReactFlow({ nodes, edges });
}

export default renderFlow;
