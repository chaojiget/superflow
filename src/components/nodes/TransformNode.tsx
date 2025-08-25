import React from 'react';
import type { NodeProps } from 'reactflow';

export interface TransformNodeData {
  label: string;
  operation?: 'uppercase';
}

const TransformNode: React.FC<NodeProps<TransformNodeData>> = ({ data }) => (
  <div className="transform-node">
    <strong>{data.label}</strong>
    {data.operation && <div>操作: {data.operation}</div>}
  </div>
);

export default TransformNode;
