import { describe, it, expect } from 'vitest';
import { FlowCanvas } from '../FlowCanvas';
import { largeDag } from '@/test/largeDag';

describe('FlowCanvas virtualization', () => {
  it('仅渲染视口内节点和边', async () => {
    const canvas = new FlowCanvas();
    await canvas.loadNodes(largeDag.nodes, largeDag.edges);
    const { nodes, edges } = canvas.getVisibleElements({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });
    expect(nodes.length).toBeLessThan(largeDag.nodes.length);
    expect(edges.length).toBeLessThan(largeDag.edges.length);
  });

  it('关闭虚拟化后返回全部元素', async () => {
    const canvas = new FlowCanvas({ virtualization: false });
    await canvas.loadNodes(largeDag.nodes, largeDag.edges);
    const { nodes } = canvas.getVisibleElements({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    });
    expect(nodes.length).toBe(largeDag.nodes.length);
  });
});
