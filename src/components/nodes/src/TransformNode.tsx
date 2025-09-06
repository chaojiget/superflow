import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export interface TransformNodeData {
  label: string;
  operation?: 'uppercase';
}

const TransformNode: React.FC<NodeProps<TransformNodeData>> = ({ data }) => (
  <div className="transform-node" style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>
    <strong>{data.label}</strong>
    {data.operation && <div>操作: {data.operation}</div>}
    {/* 左侧作为输入、右侧作为输出 */}
    <Handle type="target" position={Position.Left} />
    <Handle type="source" position={Position.Right} />
  </div>
);

export default TransformNode;
