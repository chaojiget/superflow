# Workflow 组件

提供两个自定义元素用于调试节点与展示流程。

## `<workflow-node>`

- 封装 `NodePage`，用于单节点调试。
- 暴露方法：
  - `run(input)`：运行节点，默认返回输入。
  - `onLog(handler)`：监听日志输出。

```html
<workflow-node id="n1"></workflow-node>
<script type="module">
  import '../src/nodes/index.ts';
  const el = document.getElementById('n1');
  el.onLog((m) => console.log(m));
  el.run({ msg: 'hi' });
</script>
```

## `<workflow-flow>`

- 加载有向无环图（DAG）并只读展示。
- 可通过 `run(start, input)` 触发子图运行。

```html
<workflow-flow id="flow"></workflow-flow>
<script type="module">
  import '../src/flow/index.ts';
  const flow = document.getElementById('flow');
  flow.graph = {
    nodes: { a: (x) => x + 1, b: (x) => x * 2 },
    edges: [{ from: 'a', to: 'b' }],
  };
  console.log(flow.run('a', 1)); // 4
</script>
```
