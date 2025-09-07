import React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className = '', variant = 'default', size = 'md', children, ...rest },
    ref
  ) => {
    const variantClasses: Record<string, string> = {
      default: 'border border-gray-300 bg-white hover:bg-gray-50',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
      ghost: 'border-0 bg-transparent hover:bg-gray-100',
      link: 'border-0 bg-transparent underline text-blue-600 px-0 py-0',
      secondary: 'border border-gray-300 bg-gray-100 hover:bg-gray-200',
    };
    const sizeClasses: Record<string, string> = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    };
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
