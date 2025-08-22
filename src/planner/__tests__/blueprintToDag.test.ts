import { describe, it, expect } from 'vitest';
import { blueprintToDag } from '../blueprintToDag';
import type { Blueprint } from '../../ideas/generateBlueprint';

const blueprint: Blueprint = {
  requirement: '',
  steps: [
    {
      id: 'start',
      label: '开始',
      description: '',
      inputs: [],
      outputs: [],
      next: ['end'],
    },
    {
      id: 'end',
      label: '结束',
      description: '',
      inputs: [],
      outputs: [],
      next: [],
    },
  ],
};

describe('blueprintToDag', () => {
  it('将蓝图转换为节点和边', () => {
    const { nodes, edges } = blueprintToDag(blueprint);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({ id: 'start-end', source: 'start', target: 'end' });
  });

  it('支持节点类型、自动布局及多入口/出口', () => {
    const blueprint = {
      requirement: '',
      steps: [
        { id: 'in1', label: '输入1', type: 'input', next: ['core'] },
        { id: 'in2', label: '输入2', type: 'input', next: ['core'] },
        { id: 'core', label: '处理', type: 'process', next: ['out1', 'out2'] },
        { id: 'out1', label: '输出1', type: 'output', next: [] },
        { id: 'out2', label: '输出2', type: 'output', next: [] },
      ],
    } as const;
    const { nodes, edges } = blueprintToDag(blueprint);
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(nodeMap.in1.type).toBe('input');
    expect(nodeMap.in2.position).toEqual({ x: 0, y: 100 });
    expect(nodeMap.core.position).toEqual({ x: 200, y: 0 });
    expect(nodeMap.out1.position).toEqual({ x: 400, y: 0 });
    expect(nodeMap.out2.position).toEqual({ x: 400, y: 100 });
    expect(edges).toHaveLength(4);
  });

  it('检测环路并抛出错误', () => {
    const blueprint = {
      requirement: '',
      steps: [
        { id: 'a', label: 'A', type: 'task', next: ['b'] },
        { id: 'b', label: 'B', type: 'task', next: ['a'] },
      ],
    } as const;
    expect(() => blueprintToDag(blueprint)).toThrow();
  });
});
