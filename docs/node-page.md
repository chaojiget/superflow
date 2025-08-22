# NodePage 模块

## 使用指南

`setupNodePage` 用于在节点页面中启用流程导入与导出功能：

```ts
import { setupNodePage } from 'superflow/nodes/NodePage';

const exportButton = document.getElementById('export-btn') as HTMLButtonElement;
const importInput = document.getElementById('import-input') as HTMLInputElement;

setupNodePage(exportButton, importInput);
```

- 点击导出按钮会下载当前流程的 `flow.json` 文件。
- 在文件选择框中选择 `flow.json` 会导入流程数据。
- 导入后输入框会自动清空，方便再次选择同一文件。

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

## API 说明

### `setupNodePage(exportButton: HTMLButtonElement, importInput: HTMLInputElement): void`

为导出按钮和文件输入框注册事件监听，实现流程数据的导出与导入。

| 参数 | 说明 |
| --- | --- |
| `exportButton` | 触发导出的按钮元素。 |
| `importInput` | 选择导入文件的 `<input type="file">` 元素。 |

该函数无返回值。
