import { describe, it, expect } from 'vitest';
import { blueprintToDag, optimizeDAG } from '../blueprintToDag';

describe('mergeCompatibleNodes', () => {
  it('应该合并线性链并更新拓扑与执行计划', () => {
    const blueprint = {
      nodes: [
        { id: 'start', type: 'start' },
        { id: 'n1', type: 'process', name: 'A' },
        { id: 'n2', type: 'process', name: 'B' },
        { id: 'end', type: 'end' },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'n1' },
        { id: 'e2', source: 'n1', target: 'n2' },
        { id: 'e3', source: 'n2', target: 'end' },
      ],
    };

    const dag = blueprintToDag(blueprint);
    const optimized = optimizeDAG(dag);

    expect(optimized.nodes).toHaveLength(3);
    const processNodes = optimized.nodes.filter((n) => n.type === 'process');
    expect(processNodes).toHaveLength(1);
    const merged = processNodes[0]!;
    expect(['n1', 'n2']).not.toContain(merged.id);

    expect(optimized.edges).toHaveLength(2);
    const connections = optimized.edges.map((e) => [e.source, e.target]);
    expect(connections).toContainEqual(['start', merged.id]);
    expect(connections).toContainEqual([merged.id, 'end']);

    expect(optimized.topology.order).toEqual(['start', merged.id, 'end']);
    expect(optimized.executionPlan?.batches).toEqual([
      ['start'],
      [merged.id],
      ['end'],
    ]);
  });
});
