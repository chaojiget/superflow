import '../../packages/@embeds/wc/src/workflow-node';
import '../../packages/@embeds/wc/src/workflow-flow';

function handshake() {
  window.parent.postMessage({ type: 'embeds-demo:ready' }, '*');
}

window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (msg?.type === 'embeds-demo:init') {
    // 初始化回调占位
  }
});

handshake();

const node = document.querySelector('workflow-node');

if (node) {
  node.addEventListener('run', (ev) => {
    window.parent.postMessage(
      { type: 'run', detail: (ev as CustomEvent).detail },
      '*'
    );
  });
  node.addEventListener('log', (ev) => {
    window.parent.postMessage(
      { type: 'log', detail: (ev as CustomEvent).detail },
      '*'
    );
  });
}
