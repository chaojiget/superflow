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
  it('支持节点拖拽、连线和删除', () => {
    const flow = renderFlow(blueprint);

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
  });
});
