import React from 'react';

export interface EditorProps {
  value?: string;
  defaultLanguage?: string;
  height?: string | number;
  onChange?: (value?: string) => void;
  options?: Record<string, unknown>;
}

const Editor: React.FC<EditorProps> = ({ value = '', onChange, height = 200 }) => {
  return (
    <textarea
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};

export { Editor };
export default Editor;

