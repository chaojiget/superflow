import React from 'react';

type BoxProps = { className?: string; style?: React.CSSProperties };

export const Card: React.FC<React.PropsWithChildren<BoxProps>> = ({
  className = '',
  style,
  children,
}) => (
  <div
    className={`rounded-md border border-gray-200 bg-white ${className}`}
    style={style}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.PropsWithChildren<BoxProps>> = ({
  className = '',
  style,
  children,
}) => (
  <div className={`p-2 ${className}`} style={style}>
    {children}
  </div>
);

export const CardContent: React.FC<React.PropsWithChildren<BoxProps>> = ({
  className = '',
  style,
  children,
}) => (
  <div className={`p-2 ${className}`} style={style}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.PropsWithChildren<BoxProps>> = ({
  className = '',
  style,
  children,
}) => (
  <div className={`font-semibold ${className}`} style={style}>
    {children}
  </div>
);

export default { Card, CardHeader, CardContent, CardTitle };
