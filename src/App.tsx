import React, { useRef, useState } from 'react';
import { copyText } from '@/utils';

const App: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState('');

  const handleCopy = async () => {
    const text = inputRef.current?.value ?? '';
    const result = await copyText(text, inputRef.current);
    setCopyStatus(result.success ? '已复制' : result.message || '请手动复制');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Superflow</h1>
        <p>想法到流程的开放平台</p>
      </header>
      <main className="app-main">
        <div className="welcome-message">
          <h2>欢迎使用 Superflow</h2>
          <p>项目骨架已创建完成，准备开始开发！</p>
          <input ref={inputRef} placeholder="输入要复制的文本" />
          <button onClick={handleCopy}>复制</button>
          {copyStatus && <p>{copyStatus}</p>}
        </div>
      </main>
    </div>
  );
};

export default App;
