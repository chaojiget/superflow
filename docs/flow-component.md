# `workflow-flow` 组件

`workflow-flow` 用于渲染流程蓝图，可配置主题和只读模式。

## 使用示例

```html
<workflow-flow id="flow" theme="dark"></workflow-flow>
<script type="module">
  import { FlowCanvasElement } from 'superflow/flow';
  const flow = document.getElementById('flow');
  flow.blueprint = {};
  flow.addEventListener('flow-render', (e) => {
    console.log('渲染结果', e.detail);
  });
</script>
```

## 属性

- `blueprint`：流程蓝图对象或 JSON 字符串。
- `theme`：主题，可选 `light` 或 `dark` 等。
- `readonly`：设置为只读模式。

## 事件

- `flow-render`：渲染完成后触发，`detail` 为渲染结果。
