import { renderFlow } from './renderFlow';
import type { Blueprint } from '../ideas/generateBlueprint';

/**
 * 流程画布的 Web Component。
 * 通过 `blueprint` 属性/属性值传入蓝图对象，渲染后触发 `flow-render` 事件。
 */
export class FlowCanvasElement extends HTMLElement {
  private container: HTMLElement;
  private _blueprint: Blueprint | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('pre');
    shadow.append(this.container);
  }

  static get observedAttributes(): string[] {
    return ['blueprint'];
  }

  get blueprint(): Blueprint | null {
    return this._blueprint;
  }

  set blueprint(value: Blueprint | null) {
    this._blueprint = value;
    this.render();
  }

  attributeChangedCallback(_name: string, _old: string, value: string): void {
    try {
      const parsed = JSON.parse(value);
      // Type guard to ensure it's a valid Blueprint
      if (parsed && typeof parsed === 'object' && 'requirement' in parsed && 'steps' in parsed) {
        this.blueprint = parsed as Blueprint;
      } else {
        this.blueprint = null;
      }
    } catch {
      this.blueprint = null;
    }
  }

  private render(): void {
    if (!this._blueprint) {
      this.container.textContent = '';
      return;
    }
    const flow = renderFlow(this._blueprint);
    this.container.textContent = JSON.stringify(flow, null, 2);
    this.dispatchEvent(new CustomEvent('flow-render', { detail: flow }));
  }
}

customElements.define('flow-canvas', FlowCanvasElement);

export default FlowCanvasElement;
