import React from 'react';

export const ScrollArea: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ className = '', children }) => (
  <div className={`overflow-auto ${className}`}>{children}</div>
);

export default ScrollArea;
