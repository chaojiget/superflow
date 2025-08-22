import { describe, expect, it, vi } from 'vitest';

vi.mock('../renderFlow', () => ({
  renderFlow: vi.fn(() => ({ type: 'ReactFlow', nodes: [], edges: [] })),
}));

import { FlowCanvasElement } from '../FlowCanvas';
import { renderFlow } from '../renderFlow';
import type { Blueprint } from '../../ideas/generateBlueprint';

describe('FlowCanvasElement', () => {
  it('renders blueprint and emits event', () => {
    const el = new FlowCanvasElement();
    document.body.appendChild(el);
    const handler = vi.fn();
    el.addEventListener('flow-render', handler);
    const testBlueprint: Blueprint = {
      requirement: 'test requirement',
      steps: [
        {
          id: 'step1',
          label: 'Test Step',
          description: 'A test step',
          inputs: [],
          outputs: [],
          next: []
        }
      ]
    };
    el.blueprint = testBlueprint;
    expect(renderFlow).toHaveBeenCalledWith(testBlueprint);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { type: 'ReactFlow', nodes: [], edges: [] },
      })
    );
    expect(el.shadowRoot?.textContent).toContain('ReactFlow');
  });
});
