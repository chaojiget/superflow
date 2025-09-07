import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export interface InputNodeData {
  label: string;
  value?: string;
}

const InputNode: React.FC<NodeProps<InputNodeData>> = ({ data }) => (
  <div
    className="input-node"
    style={{
      padding: 8,
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      background: '#fff',
    }}
  >
    <strong>{data.label}</strong>
    {data.value !== undefined && <div>{data.value}</div>}
    {/* 作为源节点暴露右侧输出句柄 */}
    <Handle type="source" position={Position.Right} />
  </div>
);

export default InputNode;
