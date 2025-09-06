import React from 'react';

export const PanelGroup: React.FC<React.PropsWithChildren<{ direction?: 'horizontal' | 'vertical' }>> = ({ direction = 'horizontal', children }) => (
  <div style={{ display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column', height: '100%' }}>{children}</div>
);

export const Panel: React.FC<React.PropsWithChildren<{ defaultSize?: number; minSize?: number }>> = ({ children }) => (
  <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{children}</div>
);

export const PanelResizeHandle: React.FC = () => (
  <div style={{ width: 4, background: '#e5e7eb', cursor: 'col-resize' }} />
);

