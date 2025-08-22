import { renderFlow } from './renderFlow';

/**
 * 流程画布的 Web Component。
 * 通过 `blueprint` 属性/属性值传入蓝图对象，渲染后触发 `flow-render` 事件。
 */
export class FlowCanvasElement extends HTMLElement {
  private container: HTMLElement;
  private _blueprint: unknown = null;
  private _theme = 'light';
  private _readonly = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('pre');
    shadow.append(this.container);
    this.updateTheme();
  }

  static get observedAttributes(): string[] {
    return ['blueprint', 'theme', 'readonly'];
  }

  get blueprint(): unknown {
    return this._blueprint;
  }

  set blueprint(value: unknown) {
    this._blueprint = value;
    this.render();
  }

  get theme(): string {
    return this._theme;
  }

  set theme(value: string) {
    this._theme = value;
    this.updateTheme();
  }

  get readonly(): boolean {
    return this._readonly;
  }

  set readonly(value: boolean) {
    this._readonly = value;
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'blueprint') {
      try {
        this.blueprint = value ? JSON.parse(value) : null;
      } catch {
        this.blueprint = null;
      }
    } else if (name === 'theme') {
      this.theme = value ?? 'light';
    } else if (name === 'readonly') {
      this.readonly = value !== null && value !== 'false';
    }
  }

  private updateTheme(): void {
    this.container.setAttribute('data-theme', this._theme);
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

customElements.define('workflow-flow', FlowCanvasElement);

export default FlowCanvasElement;
