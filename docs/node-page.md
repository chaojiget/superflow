# `workflow-node` 组件

`workflow-node` 提供了代码运行及流程导入导出的基础界面。

## 使用示例

```html
<workflow-node id="node"></workflow-node>
<script type="module">
  import { NodePageElement } from 'superflow/nodes';
  const node = document.getElementById('node');
  node.addEventListener('run-success', (e) => {
    console.log('输出', e.detail);
  });
  node.addEventListener('run-error', (e) => {
    console.error('错误', e.detail);
  });
</script>
```

## Web Component

除函数方式外，还可以直接使用自定义元素 `<workflow-node>`：

```html
<workflow-node id="page"></workflow-node>
<script type="module">
  import 'superflow/nodes/NodePage.js';

  const page = document.getElementById('page');
  page.addEventListener('flow-import', (e) => {
    console.log('imported', e.detail);
  });
</script>
```

该组件会触发 `flow-export` 与 `flow-import` 两个事件。

## 属性

- `code`：初始代码内容。

## API 说明

## 事件

- `run-success`：运行成功后触发，`detail` 为输出结果。
- `run-error`：运行失败后触发，`detail` 为错误信息。
- `run-log`：收到日志时触发，`detail` 包含 `level` 与 `data`。
- `flow-export`：导出流程时触发，`detail` 为导出的 JSON 字符串。
- `flow-import`：导入流程后触发，`detail` 为解析后的对象。
