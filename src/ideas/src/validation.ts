import type { Blueprint } from './types';
import { BlueprintSchema } from './types';

export function validateBlueprint(blueprint: Blueprint): void {
  BlueprintSchema.parse(blueprint);
  if (!blueprint.nodes || blueprint.nodes.length === 0) {
    throw new Error('蓝图必须包含至少一个节点');
  }
  const nodeIds = new Set(blueprint.nodes.map((node) => node.id));
  if (nodeIds.size !== blueprint.nodes.length) {
    throw new Error('节点ID不唯一');
  }
  blueprint.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`边 ${edge.id} 引用了不存在的节点`);
    }
  });
}
