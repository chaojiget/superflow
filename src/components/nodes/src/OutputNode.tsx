import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

export interface OutputNodeData {
  label: string;
}

const OutputNode: React.FC<NodeProps<OutputNodeData>> = ({ data }) => (
  <div className="output-node" style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>
    <strong>{data.label}</strong>
    {/* 作为汇聚节点暴露左侧输入句柄 */}
    <Handle type="target" position={Position.Left} />
  </div>
);

export default OutputNode;
