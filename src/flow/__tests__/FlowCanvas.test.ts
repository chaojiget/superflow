import { describe, expect, it, vi } from 'vitest';

vi.mock('../renderFlow', () => ({
  renderFlow: vi.fn(() => ({ type: 'ReactFlow', nodes: [], edges: [] })),
}));

import { FlowCanvasElement } from '../FlowCanvas';
import { renderFlow } from '../renderFlow';

describe('FlowCanvasElement', () => {
  it('renders blueprint and emits event', () => {
    const el = new FlowCanvasElement();
    document.body.appendChild(el);
    const handler = vi.fn();
    el.addEventListener('flow-render', handler);
    el.blueprint = { a: 1 };
    expect(renderFlow).toHaveBeenCalledWith({ a: 1 });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { type: 'ReactFlow', nodes: [], edges: [] },
      })
    );
    expect(el.shadowRoot?.textContent).toContain('ReactFlow');
  });
});
