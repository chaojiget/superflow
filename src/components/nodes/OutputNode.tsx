import React from 'react';
import type { NodeProps } from 'reactflow';

export interface OutputNodeData {
  label: string;
}

const OutputNode: React.FC<NodeProps<OutputNodeData>> = ({ data }) => (
  <div className="output-node">
    <strong>{data.label}</strong>
  </div>
);

export default OutputNode;
