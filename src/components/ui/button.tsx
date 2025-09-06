import React from 'react';
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => (
  <button {...rest}>{children}</button>
);
export default Button;

