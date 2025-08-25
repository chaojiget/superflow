import React, { useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
} from 'reactflow';
import { InputNode, TransformNode, OutputNode } from './nodes';
import EditorPanel from './EditorPanel';
import PreviewRunner from './PreviewRunner';

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

const FlowEditor: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);
  const [inputValue, setInputValue] = useState('hello');
  const [previewResult, setPreviewResult] = useState<unknown>();

  const handleInputChange = (value: string): void => {
    setInputValue(value);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === 'input' ? { ...n, data: { ...n.data, value } } : n
      )
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}>
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
};

export default FlowEditor;
