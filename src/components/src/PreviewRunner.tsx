import React, { useState } from 'react';
import type { Node } from 'reactflow';
import { safeCopy } from '@/utils';

interface RunnerProps {
  nodes: Node[];
  onResult?: (result: unknown) => void;
}

const PreviewRunner: React.FC<RunnerProps> = ({ nodes, onResult }) => {
  const [result, setResult] = useState<unknown>();

  const run = (): void => {
    const copy = safeCopy(nodes);
    let current = copy.find((n) => n.type === 'input')?.data?.value;
    copy
      .filter((n) => n.type === 'transform')
      .forEach((n) => {
        const data = n.data as { operation?: string } | undefined;
        if (data?.operation === 'uppercase') {
          current = String(current).toUpperCase();
        }
      });
    setResult(current);
    onResult?.(current);
  };

  return (
    <div className="preview-runner">
      <button onClick={run}>预览</button>
      {result !== undefined && (
        <div role="result" className="preview-result">
          {String(result)}
        </div>
      )}
    </div>
  );
};

export default PreviewRunner;
