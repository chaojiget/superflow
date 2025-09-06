import React from 'react';
export const Badge: React.FC<React.PropsWithChildren<{ variant?: string; className?: string }>> = ({ children, className }) => (
  <span className={className} style={{ padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: 999 }}>{children}</span>
);
export default Badge;

