import React from 'react';

const FlowStatusBar: React.FC<{ status?: string }> = ({ status = 'idle' }) => {
  return <div className="flow-status">Status: {status}</div>;
};

export default FlowStatusBar;

