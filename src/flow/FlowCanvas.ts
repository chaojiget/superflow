import type { Dag } from '../planner/blueprintToDag';
import { renderFlow, type FlowInstance } from './renderFlow';

/**
 * 流程画布的 Web Component。
 * 通过 `blueprint` 属性/属性值传入蓝图对象，渲染后触发 `flow-render` 事件。
 */
export class FlowCanvasElement extends HTMLElement {
  private container: HTMLElement;
  private _blueprint: unknown = null;
  private flow: FlowInstance | null = null;
  private _dag: Dag | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('div');
    this.container.style.width = '100%';
    this.container.style.height = '400px';
    shadow.append(this.container);
  }

  static get observedAttributes(): string[] {
    return ['blueprint'];
  }

  get blueprint(): unknown {
    return this._blueprint;
  }

  set blueprint(value: unknown) {
    this._blueprint = value;
    this.render();
  }

  attributeChangedCallback(_name: string, _old: string, value: string): void {
    try {
      this.blueprint = JSON.parse(value);
    } catch {
      this.blueprint = null;
    }
  }

  get dag(): Dag | null {
    return this._dag;
  }

  dragNode(id: string, position: { x: number; y: number }): void {
    this.flow?.dragNode(id, position);
  }

  connect(source: string, target: string): string | undefined {
    return this.flow?.connect(source, target);
  }

  deleteNode(id: string): void {
    this.flow?.deleteNode(id);
  }

  deleteEdge(id: string): void {
    this.flow?.deleteEdge(id);
  }

  private render(): void {
    this.container.innerHTML = '';
    if (!this._blueprint) {
      this._dag = null;
      return;
    }
    this.flow = renderFlow(this._blueprint as any, this.container, (dag) => {
      this._dag = dag;
      this.dispatchEvent(new CustomEvent('dag-change', { detail: dag }));
    });
    this.dispatchEvent(new CustomEvent('flow-render', { detail: this._dag }));
  }
}

customElements.define('flow-canvas', FlowCanvasElement);

export default FlowCanvasElement;
