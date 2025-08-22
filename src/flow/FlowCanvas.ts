import { renderFlow } from './renderFlow';

/**
 * 流程画布的 Web Component。
 * 通过 `blueprint` 属性/属性值传入蓝图对象，渲染后触发 `flow-render` 事件。
 */
export class FlowCanvasElement extends HTMLElement {
  private container: HTMLElement;
  private _blueprint: unknown = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('pre');
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

  private render(): void {
    if (!this._blueprint) {
      this.container.textContent = '';
      return;
    }
    const flow = renderFlow(this._blueprint as any);
    this.container.textContent = JSON.stringify(flow, null, 2);
    this.dispatchEvent(new CustomEvent('flow-render', { detail: flow }));
  }
}

customElements.define('flow-canvas', FlowCanvasElement);

export default FlowCanvasElement;
