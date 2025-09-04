import React from 'react';
import type { NodeProps } from 'reactflow';

export interface InputNodeData {
  label: string;
  value?: string;
}

const InputNode: React.FC<NodeProps<InputNodeData>> = ({ data }) => (
  <div className="input-node">
    <strong>{data.label}</strong>
    {data.value !== undefined && <div>{data.value}</div>}
  </div>
);

export default InputNode;
