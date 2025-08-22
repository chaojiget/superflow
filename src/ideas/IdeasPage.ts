import FlowCanvasElement from '../flow/FlowCanvas';
import { generateBlueprint, type Blueprint } from './generateBlueprint';
import { blueprintToDag } from '../planner/blueprintToDag';

/**
 * 入口页面 Web Component。
 * 提供需求输入框，生成蓝图后渲染流程并派发事件。
 */
export class IdeasPageElement extends HTMLElement {
  private textarea: HTMLTextAreaElement;
  private button: HTMLButtonElement;
  private canvas: FlowCanvasElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    this.textarea = document.createElement('textarea');
    this.button = document.createElement('button');
    this.button.textContent = '生成流程';
    this.canvas = document.createElement('flow-canvas') as FlowCanvasElement;
    this.canvas.style.display = 'none';

    shadow.append(this.textarea, this.button, this.canvas);
  }

  connectedCallback(): void {
    this.button.addEventListener('click', this.handleGenerate);
  }

  disconnectedCallback(): void {
    this.button.removeEventListener('click', this.handleGenerate);
  }

  private handleGenerate = async (): Promise<void> => {
    const requirement = this.textarea.value.trim();
    if (!requirement) return;
    const blueprint: Blueprint = await generateBlueprint(requirement);
    const dag = blueprintToDag(blueprint);
    this.canvas.blueprint = blueprint;
    this.canvas.style.display = 'block';
    this.dispatchEvent(
      new CustomEvent('blueprint-generated', {
        detail: { blueprint, dag },
      })
    );
  };
}

customElements.define('ideas-page', IdeasPageElement);

export default IdeasPageElement;
