import React from 'react';
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({
  children,
  ...rest
}) => <label {...rest}>{children}</label>;
export default Label;
