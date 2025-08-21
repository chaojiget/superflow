import { Flow, DAG } from './flow';

/** `<workflow-flow>` 元素，用于加载 DAG 并运行子图 */
export class WorkflowFlowElement extends HTMLElement {
  private runner?: Flow;
  private _graph?: DAG;

  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    root.appendChild(container);
    this.runner = new Flow(container);
    if (this._graph) this.runner.load(this._graph);
  }

  set graph(graph: DAG) {
    this._graph = graph;
    if (this.runner) this.runner.load(graph);
  }

  get graph() {
    return this._graph;
  }

  /** 触发子图运行 */
  run(start: string, input: any) {
    return this.runner?.runSubgraph(start, input);
  }
}

customElements.define('workflow-flow', WorkflowFlowElement);

export { DAG };
