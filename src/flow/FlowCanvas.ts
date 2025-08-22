import type { Dag } from '../planner/blueprintToDag';
import { renderFlow, type FlowInstance } from './renderFlow';
import type { Blueprint } from '../ideas/generateBlueprint';

/**
 * 流程画布的 Web Component。
 * 通过 `blueprint` 属性/属性值传入蓝图对象，渲染后触发 `flow-render` 事件。
 */
export class FlowCanvasElement extends HTMLElement {
  private container: HTMLElement;
  private _blueprint: Blueprint | null = null;
  private _theme = 'light';
  private _readonly = false;
  private flow: FlowInstance | null = null;
  private _dag: Dag | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.container = document.createElement('div');
    this.container.style.width = '100%';
    this.container.style.height = '400px';
    shadow.append(this.container);
    this.updateTheme();
  }

  static get observedAttributes(): string[] {
    return ['blueprint', 'theme', 'readonly'];
  }

  get blueprint(): Blueprint | null {
    return this._blueprint;
  }

  set blueprint(value: Blueprint | null) {
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

  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null
  ): void {
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

customElements.define('workflow-flow', FlowCanvasElement);

export default FlowCanvasElement;
