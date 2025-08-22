import { describe, it, expect, vi } from 'vitest';
import { renderFlow } from '../renderFlow';
import type { Blueprint } from '../../ideas/generateBlueprint';
import type { Dag, DagNode } from '../../planner/blueprintToDag';

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
  it('支持节点拖拽、连线和删除', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const changes: Dag[] = [];
    const flow = renderFlow(blueprint, container, (dag) => changes.push(dag));

    const nodeId = flow.nodes[0].id;
    flow.dragNode(nodeId, { x: 50, y: 60 });
    expect(flow.nodes[0].position).toEqual({ x: 50, y: 60 });

    const edgeCount = flow.edges.length;
    const newEdgeId = flow.connect(nodeId, 'temp');
    expect(flow.edges.length).toBe(edgeCount + 1);

    flow.deleteEdge(newEdgeId);
    expect(flow.edges.find((e) => e.id === newEdgeId)).toBeUndefined();

    flow.deleteNode(nodeId);
    expect(flow.nodes.find((n) => n.id === nodeId)).toBeUndefined();

    expect(changes.length).toBeGreaterThan(1);
  });

    it('支持右键添加节点并同步至外部 Dag', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const changes: Dag[] = [];
      const flow = renderFlow(blueprint, container, (dag) => changes.push(dag));

    await vi.waitFor(() => {
      expect(container.querySelector('.react-flow__pane')).not.toBeNull();
    });

    const pane = container.querySelector('.react-flow__pane') as HTMLDivElement;
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('task');

    pane.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })
    );

    await vi.waitFor(() => {
      expect(flow.nodes.some((n: DagNode) => n.type === 'task')).toBe(true);
    });
    expect(
      changes.at(-1)?.nodes.some((n: DagNode) => n.type === 'task')
    ).toBe(true);

    promptSpy.mockRestore();
  });
});
