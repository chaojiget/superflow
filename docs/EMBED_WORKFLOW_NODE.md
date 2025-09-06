# workflow-node 嵌入示例

以下示例展示如何在外部系统中嵌入 `<workflow-node>` 组件，并通过 `postMessage` 与宿主页面通信。

## 使用

```html
<script type="module" src="https://cdn.example.com/workflow-node.js"></script>

<workflow-node id="demo" node-id="abc123"></workflow-node>

<script>
  const node = document.getElementById('demo');
  node.addEventListener('run', (e) => {
    console.log('运行数据', e.detail);
  });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'workflow-node:handshake') {
      if (event.origin !== 'https://trusted.example.com') return;
      event.source?.postMessage({ type: 'workflow-node:ack' }, event.origin);
    }
  });
</script>
```

## 握手流程

1. 组件连接后向父窗口发送 `workflow-node:handshake`。
2. 宿主验证 `event.origin` 并返回 `workflow-node:ack`。
3. 双方后续仅在确认过的 origin 间通信。

## 安全约束

- 必须校验 `event.origin`，拒绝未知来源的消息。
- 建议在握手过程中附带随机 token 防止重放。
- 组件不主动执行任意脚本，所有运行请求需来自已授权宿主。
