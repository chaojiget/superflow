import WorkflowNodeElement from './workflow-node';

/**
 * `<workflow-flow>` 自定义元素，用于在宿主页面中嵌入完整流程。
 * 继承自 `<workflow-node>`，沿用相同的 postMessage 协议。
 */
class WorkflowFlowElement extends WorkflowNodeElement {
  /**
   * 对外广播流程运行的引用 ID。
   */
  public notifyRun(id: string): void {
    this.notifyRef(id);
  }

  protected override provideDetail(_id: string): unknown {
    return undefined;
  }
}

customElements.define('workflow-flow', WorkflowFlowElement);

export default WorkflowFlowElement;
