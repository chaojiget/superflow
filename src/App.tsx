import React from 'react';

const App: React.FC = () => {
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
        </div>
      </main>
    </div>
  );
};

export default App;