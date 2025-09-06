import React from 'react';
export const ScrollArea: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={className} style={{ overflow: 'auto' }}>
    {children}
  </div>
);
export default ScrollArea;

