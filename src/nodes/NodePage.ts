import { exportFlow, importFlow } from '../shared/storage';

/**
 * 简单节点管理页面的 Web Component。
 * 暴露 `flow-export` 与 `flow-import` 两个事件。
 */
export class NodePageElement extends HTMLElement {
  private exportButton: HTMLButtonElement;
  private importInput: HTMLInputElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    this.exportButton = document.createElement('button');
    this.exportButton.textContent = '导出流程';

    this.importInput = document.createElement('input');
    this.importInput.type = 'file';

    shadow.append(this.exportButton, this.importInput);
  }

  connectedCallback(): void {
    this.exportButton.addEventListener('click', this.handleExport);
    this.importInput.addEventListener('change', this.handleImport);
  }

  disconnectedCallback(): void {
    this.exportButton.removeEventListener('click', this.handleExport);
    this.importInput.removeEventListener('change', this.handleImport);
  }

  private handleExport = (): void => {
    const data = exportFlow();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    URL.revokeObjectURL(url);
    this.dispatchEvent(new CustomEvent('flow-export', { detail: data }));
  };

  private handleImport = async (): Promise<void> => {
    const file = this.importInput.files?.[0];
    if (file) {
      const text = await file.text();
      const flow = importFlow(text);
      this.dispatchEvent(new CustomEvent('flow-import', { detail: flow }));
    }
    this.importInput.value = '';
  };
}

customElements.define('node-page', NodePageElement);

export default NodePageElement;
