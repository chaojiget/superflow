import React from 'react';
export const Checkbox: React.FC<{
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  className?: string;
}> = ({ checked, onCheckedChange, className }) => (
  <input
    className={className}
    type="checkbox"
    checked={!!checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
  />
);
export default Checkbox;
