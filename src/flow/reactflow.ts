export interface Node {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface ReactFlowInstance {
  type: 'ReactFlow';
  nodes: Node[];
  edges: Edge[];
  dragNode: (nodeId: string, newPosition: { x: number; y: number }) => void;
  connect: (sourceId: string, targetId: string) => string;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  style: { width: string; height: string };
}

interface ReactFlowProps {
  nodes: Node[];
  edges: Edge[];
}

export default function ReactFlow({ nodes, edges }: ReactFlowProps): ReactFlowInstance {
  const instance: ReactFlowInstance = {
    type: 'ReactFlow',
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e) => ({ ...e })),
    dragNode(nodeId, newPosition) {
      const node = instance.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.position = newPosition;
      }
    },
    connect(sourceId, targetId) {
      const edgeId = `${sourceId}-${targetId}-${Date.now()}`;
      instance.edges.push({ id: edgeId, source: sourceId, target: targetId });
      return edgeId;
    },
    deleteNode(nodeId) {
      instance.nodes = instance.nodes.filter((n) => n.id !== nodeId);
      instance.edges = instance.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    },
    deleteEdge(edgeId) {
      instance.edges = instance.edges.filter((e) => e.id !== edgeId);
    },
    style: { width: '100%', height: '100%' },
  };

  return instance;
}
