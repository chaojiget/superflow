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
});
