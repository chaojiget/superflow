import React from 'react';

export interface BadgeProps {
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
}

export const Badge: React.FC<React.PropsWithChildren<BadgeProps>> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const variantClasses: Record<string, string> = {
    default: 'border border-gray-200 bg-white text-gray-700',
    secondary: 'border border-gray-200 bg-gray-100 text-gray-700',
    outline: 'border border-gray-300 bg-transparent text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
