import React from 'react';

export interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ value, onChange }) => (
  <div className="editor-panel">
    <label htmlFor="editor-input">输入</label>
    <input
      id="editor-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default EditorPanel;
