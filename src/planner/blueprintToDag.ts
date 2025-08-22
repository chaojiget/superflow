import type { Blueprint } from '../ideas/generateBlueprint';

export interface DagNode {
  id: string;
  type?: string;
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
  const stepMap = new Map(blueprint.steps.map((s) => [s.id, s]));
  const indegree = new Map<string, number>();
  for (const step of blueprint.steps) {
    indegree.set(step.id, 0);
  }
  for (const step of blueprint.steps) {
    for (const target of step.next) {
      if (!stepMap.has(target)) {
        throw new Error(`未知节点: ${target}`);
      }
      indegree.set(target, (indegree.get(target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }

  const layers: string[][] = [];
  const edges: DagEdge[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const layerSize = queue.length;
    const layer: string[] = [];
    for (let i = 0; i < layerSize; i++) {
      const id = queue.shift()!;
      layer.push(id);
      visited.add(id);
      const step = stepMap.get(id)!;
      for (const target of step.next) {
        edges.push({ id: `${id}-${target}`, source: id, target });
        indegree.set(target, (indegree.get(target)! - 1));
        if (indegree.get(target) === 0) {
          queue.push(target);
        }
      }
    }
    layers.push(layer);
  }

  if (visited.size !== blueprint.steps.length) {
    throw new Error('蓝图包含环路');
  }

  const nodes: DagNode[] = [];
  layers.forEach((layer, xIndex) => {
    layer.forEach((id, yIndex) => {
      const step = stepMap.get(id)!;
      nodes.push({
        id: step.id,
        type: step.type,
        data: { label: step.label },
        position: { x: xIndex * 200, y: yIndex * 100 },
      });
    });
  });

  return { nodes, edges };
}

export default blueprintToDag;
