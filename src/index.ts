import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';

const App = React.lazy(() => import('./App'));

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      React.Suspense,
      { fallback: React.createElement('div', null, '加载中...') },
      React.createElement(App)
    )
  )
);