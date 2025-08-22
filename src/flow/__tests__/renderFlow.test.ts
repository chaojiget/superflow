import { describe, it, expect } from 'vitest';
import { renderFlow } from '../renderFlow';
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

describe('renderFlow', () => {
  it('返回包含节点和边的 ReactFlow 对象', () => {
    const flow = renderFlow(blueprint);
    expect(flow.type).toBe('ReactFlow');
    expect(flow.nodes).toBeDefined();
    expect(flow.edges).toBeDefined();
  });
});
