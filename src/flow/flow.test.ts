import { describe, it, expect } from 'vitest';
import './index';

describe('<workflow-flow>', () => {
  it('should run subgraph sequentially', () => {
    const el = document.createElement('workflow-flow') as any;
    document.body.appendChild(el);
    el.graph = {
      nodes: {
        a: (x: number) => x + 1,
        b: (x: number) => x * 2,
      },
      edges: [{ from: 'a', to: 'b' }],
    };
    const result = el.run('a', 1);
    expect(result).toBe(4);
  });
});
