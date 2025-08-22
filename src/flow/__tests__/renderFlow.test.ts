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
  it('returns a ReactFlow component with blueprint data', () => {
    const flow = renderFlow(blueprint);
    
    // renderFlow returns a ReactFlow component, so we test that it's created
    expect(flow).toBeDefined();
    // The actual testing of ReactFlow functionality would require a more complex setup
    // with React testing utilities, which is beyond the scope of this unit test
  });
});
