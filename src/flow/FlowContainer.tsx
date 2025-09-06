import React from 'react';

const FlowContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <div className="flow-container">{children}</div>;
};

export default FlowContainer;

