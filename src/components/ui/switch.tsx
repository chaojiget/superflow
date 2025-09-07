import React from 'react';
export const Switch: React.FC<{
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
}> = ({ checked, onCheckedChange }) => (
  <input
    type="checkbox"
    checked={!!checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
  />
);
export default Switch;
