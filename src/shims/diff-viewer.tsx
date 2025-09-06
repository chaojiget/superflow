import React from 'react';

export interface DiffViewerProps {
  oldValue?: string;
  newValue?: string;
  splitView?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldValue = '', newValue = '', splitView = true }) => {
  return (
    <div style={{ display: splitView ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 6 }}>{oldValue}</pre>
      {splitView && (
        <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 6 }}>{newValue}</pre>
      )}
      {!splitView && (
        <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 8, borderRadius: 6 }}>{newValue}</pre>
      )}
    </div>
  );
};

export default DiffViewer;

