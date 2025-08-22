import { describe, it, expect } from 'vitest';
import { blueprintToDag } from '../blueprintToDag';
import { generateBlueprint } from '../../ideas/generateBlueprint';

describe('blueprintToDag', () => {
  it('将蓝图转换为节点和边', () => {
    const blueprint = generateBlueprint('');
    const { nodes, edges } = blueprintToDag(blueprint);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({ id: 'start-end', source: 'start', target: 'end' });
  });
});
