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
  dragNode: (id: string, position: { x: number; y: number }) => void;
  connect: (source: string, target: string) => string;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
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
    dragNode(id, position) {
      const node = instance.nodes.find((n) => n.id === id);
      if (node) {
        node.position = position;
      }
    },
    connect(source, target) {
      const id = `${source}-${target}-${Date.now()}`;
      instance.edges.push({ id, source, target });
      return id;
    },
    deleteNode(id) {
      instance.nodes = instance.nodes.filter((n) => n.id !== id);
      instance.edges = instance.edges.filter((e) => e.source !== id && e.target !== id);
    },
    deleteEdge(id) {
      instance.edges = instance.edges.filter((e) => e.id !== id);
    },
    style: { width: '100%', height: '100%' },
  };

  return instance;
}
