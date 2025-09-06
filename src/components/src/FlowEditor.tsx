import { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from 'reactflow';
import { InputNode, TransformNode, OutputNode } from '../nodes';
import EditorPanel from './EditorPanel';
import PreviewRunner from './PreviewRunner';
import { autoLayout } from '@/flow/utils';

const nodeTypes = {
  input: InputNode,
  transform: TransformNode,
  output: OutputNode,
};

const initialNodes: Node[] = [
  {
    id: 'input',
    type: 'input',
    position: { x: 0, y: 0 },
    data: { label: '输入', value: 'hello' },
  },
  {
    id: 'transform',
    type: 'transform',
    position: { x: 200, y: 0 },
    data: { label: '转换', operation: 'uppercase' },
  },
  {
    id: 'output',
    type: 'output',
    position: { x: 400, y: 0 },
    data: { label: '输出' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'input', target: 'transform' },
  { id: 'e2-3', source: 'transform', target: 'output' },
];

export interface FlowEditorRef {
  focusNode: (id: string) => void;
  autoLayout: () => Promise<void>;
}

const FlowEditor = forwardRef<FlowEditorRef>(function FlowEditor(_, ref) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);
  const [inputValue, setInputValue] = useState('hello');
  const [previewResult, setPreviewResult] = useState<unknown>();
  const rf = useRef<ReactFlowInstance | null>(null);

  const handleInputChange = (value: string): void => {
    setInputValue(value);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === 'input' ? { ...n, data: { ...n.data, value } } : n
      )
    );
  };

  useImperativeHandle(ref, () => ({
    focusNode: (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (node && rf.current) {
        rf.current.setCenter(node.position.x + 90, node.position.y + 20, {
          zoom: 1.2,
          duration: 300,
        });
      }
    },
    autoLayout: async () => {
      const { nodes: laid } = await autoLayout(nodes, edges);
      setNodes(laid);
      if (rf.current) rf.current.fitView({ duration: 300 });
    },
  }));

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <div style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={() => (ref as any)?.current?.autoLayout?.()}>自动布局</button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(inst) => (rf.current = inst)}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div style={{ width: 240, padding: 8 }}>
        <EditorPanel value={inputValue} onChange={handleInputChange} />
        <PreviewRunner nodes={nodes} onResult={setPreviewResult} />
        {previewResult !== undefined && (
          <div className="preview-display">结果: {String(previewResult)}</div>
        )}
      </div>
    </div>
  );
});

export default FlowEditor;
