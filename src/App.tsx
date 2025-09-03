import React, { useRef, useState } from 'react';
import FlowEditor from '@/components/FlowEditor';
import { copyText } from '@/utils';

const App: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState('');

  const handleCopy = async () => {
    const text = inputRef.current?.value ?? '';
    const result = await copyText(text, inputRef.current || undefined);
    setCopyStatus(result.success ? '已复制' : result.message || '请手动复制');
  };

  return (
    <div>
      <FlowEditor />
      <div style={{ padding: 16 }}>
        <input ref={inputRef} placeholder="输入要复制的文本" />
        <button onClick={handleCopy} style={{ marginLeft: 8 }}>
          复制
        </button>
        {copyStatus && <p>{copyStatus}</p>}
      </div>
    </div>
  );
};

export default App;
