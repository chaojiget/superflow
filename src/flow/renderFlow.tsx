import { createRoot, Root } from 'react-dom/client';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  MarkerType,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Dag, DagNode, DagEdge } from '../planner/blueprintToDag';
import { blueprintToDag } from '../planner/blueprintToDag';

export interface FlowInstance {
  nodes: DagNode[];
  edges: DagEdge[];
  dragNode: (id: string, position: { x: number; y: number }) => void;
  connect: (source: string, target: string) => string;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
}

// React组件来渲染流程图
function FlowComponent({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onConnect: (connection: Connection) => void;
}) {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const handleNodesChange = (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, nodes);
    setNodes(updatedNodes);
    onNodesChange(updatedNodes);
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, edges);
    setEdges(updatedEdges);
    onEdgesChange(updatedEdges);
  };

  const handleConnect = (connection: Connection) => {
    const updatedEdges = addEdge(connection, edges);
    setEdges(updatedEdges);
    onEdgesChange(updatedEdges);
    onConnect(connection);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap
          style={{
            height: 120,
            width: 200,
          }}
          zoomable
          pannable
          nodeColor="#333"
          nodeStrokeWidth={3}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export function renderFlow(
  blueprint: Parameters<typeof blueprintToDag>[0],
  container: HTMLElement,
  onChange?: (dag: Dag) => void
): FlowInstance {
  let { nodes, edges } = blueprintToDag(blueprint);
  const root: Root = createRoot(container);

  // 转换为ReactFlow格式的节点和边
  const convertToReactFlowFormat = () => {
    const reactFlowNodes: Node[] = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        label: node.data?.label || node.id,
      },
      style: {
        background: '#fff',
        border: '2px solid #333',
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        color: '#333',
        minWidth: 100,
        textAlign: 'center',
      },
    }));

    const reactFlowEdges: Edge[] = edges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      style: { stroke: '#333', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#333',
      },
    }));

    return { nodes: reactFlowNodes, edges: reactFlowEdges };
  };

  let { nodes: reactFlowNodes, edges: reactFlowEdges } =
    convertToReactFlowFormat();

  const emit = () => {
    onChange?.({ nodes, edges });
  };

  const render = () => {
    root.render(
      <FlowComponent
        initialNodes={reactFlowNodes}
        initialEdges={reactFlowEdges}
        onNodesChange={(updatedNodes) => {
          nodes = updatedNodes.map((node) => ({
            id: node.id,
            position: node.position,
            data: node.data,
          }));
          emit();
        }}
        onEdgesChange={(updatedEdges) => {
          edges = updatedEdges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          }));
          emit();
        }}
        onConnect={(connection) => {
          if (connection.source && connection.target) {
            const id = `${connection.source}-${connection.target}-${Date.now()}`;
            const newEdge = {
              id,
              source: connection.source,
              target: connection.target,
            };
            edges = [...edges, newEdge];
            const converted = convertToReactFlowFormat();
            reactFlowEdges = converted.edges;
            emit();
          }
        }}
      />
    );
  };

  const instance: FlowInstance = {
    get nodes() {
      return nodes;
    },
    get edges() {
      return edges;
    },
    dragNode(id, position) {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.position = position;
        const converted = convertToReactFlowFormat();
        reactFlowNodes = converted.nodes;
        render();
        emit();
      }
    },
    connect(source, target) {
      const id = `${source}-${target}-${Date.now()}`;
      const edge = { id, source, target };
      edges = [...edges, edge];
      const converted = convertToReactFlowFormat();
      reactFlowEdges = converted.edges;
      render();
      emit();
      return id;
    },
    deleteNode(id) {
      nodes = nodes.filter((n) => n.id !== id);
      edges = edges.filter((e) => e.source !== id && e.target !== id);
      const converted = convertToReactFlowFormat();
      reactFlowNodes = converted.nodes;
      reactFlowEdges = converted.edges;
      render();
      emit();
    },
    deleteEdge(id) {
      edges = edges.filter((e) => e.id !== id);
      const converted = convertToReactFlowFormat();
      reactFlowEdges = converted.edges;
      render();
      emit();
    },
  };

  render();
  emit();

  return instance;
}

export default renderFlow;
