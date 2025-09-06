import React from 'react';
type BoxProps = { className?: string; style?: React.CSSProperties };
export const Card: React.FC<React.PropsWithChildren<BoxProps>> = ({ className, style, children }) => (
  <div className={className} style={{ border: '1px solid #e5e7eb', borderRadius: 8, ...(style || {}) }}>{children}</div>
);
export const CardHeader: React.FC<React.PropsWithChildren<BoxProps>> = ({ className, style, children }) => (
  <div className={className} style={{ padding: 8, ...(style || {}) }}>{children}</div>
);
export const CardContent: React.FC<React.PropsWithChildren<BoxProps>> = ({ className, style, children }) => (
  <div className={className} style={{ padding: 8, ...(style || {}) }}>{children}</div>
);
export const CardTitle: React.FC<React.PropsWithChildren<BoxProps>> = ({ className, style, children }) => (
  <div className={className} style={{ fontWeight: 600, ...(style || {}) }}>{children}</div>
);
export default { Card, CardHeader, CardContent, CardTitle };
