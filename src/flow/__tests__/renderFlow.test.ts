import { describe, it, expect } from 'vitest';
import { renderFlow } from '../renderFlow';
import { generateBlueprint } from '../../ideas/generateBlueprint';

describe('renderFlow', () => {
  it('返回包含节点和边的 ReactFlow 对象', () => {
    const blueprint = generateBlueprint('');
    const flow = renderFlow(blueprint);
    expect(flow.type).toBe('ReactFlow');
    expect(flow.nodes).toBeDefined();
    expect(flow.edges).toBeDefined();
  });
});
