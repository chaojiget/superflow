import { describe, it, expect } from 'vitest';
import { blueprintToDag } from '../blueprintToDag';

describe('Planner Module', () => {
  describe('blueprintToDag', () => {
    it('应该将蓝图转换为可执行DAG', () => {
      const blueprint = {
        nodes: [
          { id: 'node1', type: 'start', x: 0, y: 0 },
          { id: 'node2', type: 'process', x: 100, y: 0 },
          { id: 'node3', type: 'end', x: 200, y: 0 },
        ],
        edges: [
          { id: 'edge1', source: 'node1', target: 'node2' },
          { id: 'edge2', source: 'node2', target: 'node3' },
        ],
      };

      const dag = blueprintToDag(blueprint);

      expect(dag).toBeDefined();
      expect(dag.nodes).toHaveLength(3);
      expect(dag.edges).toHaveLength(2);
    });

    it('应该检测循环依赖', () => {
      const blueprintWithCycle = {
        nodes: [
          { id: 'node1', type: 'start', x: 0, y: 0 },
          { id: 'node2', type: 'process', x: 100, y: 0 },
        ],
        edges: [
          { id: 'edge1', source: 'node1', target: 'node2' },
          { id: 'edge2', source: 'node2', target: 'node1' },
        ],
      };

      expect(() => blueprintToDag(blueprintWithCycle)).toThrow(
        '检测到循环依赖'
      );
    });

    it('应该生成拓扑排序', () => {
      const blueprint = {
        nodes: [
          { id: 'A', type: 'start', x: 0, y: 0 },
          { id: 'B', type: 'process', x: 100, y: 0 },
          { id: 'C', type: 'process', x: 100, y: 100 },
          { id: 'D', type: 'end', x: 200, y: 50 },
        ],
        edges: [
          { id: 'edge1', source: 'A', target: 'B' },
          { id: 'edge2', source: 'A', target: 'C' },
          { id: 'edge3', source: 'B', target: 'D' },
          { id: 'edge4', source: 'C', target: 'D' },
        ],
      };

      const dag = blueprintToDag(blueprint);
      expect(dag.executionOrder).toEqual(['A', 'B', 'C', 'D']);
    });
  });
});
