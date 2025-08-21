import { NodePage, LogHandler } from './node-page';

/** `<workflow-node>` 自定义元素 */
export class WorkflowNodeElement extends HTMLElement {
  private page?: NodePage;

  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    root.appendChild(container);
    this.page = new NodePage(container);
  }

  /** 运行节点 */
  run<T = unknown>(input: T): T | undefined {
    return this.page?.run(input);
  }

  /** 注册日志回调 */
  onLog(handler: LogHandler) {
    this.page?.onLog(handler);
  }
}

customElements.define('workflow-node', WorkflowNodeElement);

export { NodePage };
