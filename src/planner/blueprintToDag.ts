import type { Blueprint } from '../ideas/generateBlueprint';

export interface DagNode {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
}

export interface DagEdge {
  id: string;
  source: string;
  target: string;
}

export interface Dag {
  nodes: DagNode[];
  edges: DagEdge[];
}

/**
 * 将蓝图转换为可用于渲染的 DAG 结构。
 */
export function blueprintToDag(blueprint: Blueprint): Dag {
  const nodes: DagNode[] = blueprint.steps.map((step, index) => ({
    id: step.id,
    data: { label: step.label },
    position: { x: 0, y: index * 100 },
  }));

  const edges: DagEdge[] = [];
  for (const step of blueprint.steps) {
    for (const target of step.next) {
      edges.push({ id: `${step.id}-${target}`, source: step.id, target });
    }
  }

  return { nodes, edges };
}

export default blueprintToDag;
