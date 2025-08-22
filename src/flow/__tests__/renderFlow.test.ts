import { describe, it, expect } from 'vitest';
import { renderFlow } from '../renderFlow';
import { generateBlueprint } from '../../ideas/generateBlueprint';

describe('renderFlow', () => {
  it('支持节点拖拽、连线和删除', () => {
    const blueprint = generateBlueprint('');
    const flow = renderFlow(blueprint);

    const nodeId = flow.nodes[0].id;
    flow.dragNode(nodeId, { x: 50, y: 60 });
    expect(flow.nodes[0].position).toEqual({ x: 50, y: 60 });

    const edgeCount = flow.edges.length;
    const newEdgeId = flow.connect(nodeId, 'temp');
    expect(flow.edges.length).toBe(edgeCount + 1);

    flow.deleteEdge(newEdgeId);
    expect(flow.edges.find((e: any) => e.id === newEdgeId)).toBeUndefined();

    flow.deleteNode(nodeId);
    expect(flow.nodes.find((n: any) => n.id === nodeId)).toBeUndefined();
  });
});
