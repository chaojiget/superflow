export class WorkflowNode extends HTMLElement {
  static get observedAttributes() {
    return ['node-id', 'readonly', 'theme'];
  }

  private runBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null
  ) {
    if (name === 'readonly' && this.runBtn) {
      this.runBtn.disabled = value !== null;
    }
  }

  private render() {
    this.shadowRoot!.innerHTML = `
      <section>
        <slot name="header"></slot>
        <button id="run">Run</button>
        <pre id="logs"></pre>
      </section>`;
    this.runBtn = this.shadowRoot!.getElementById('run') as HTMLButtonElement;
    this.runBtn.addEventListener('click', () => {
      if (this.hasAttribute('readonly')) return;
      this.dispatchEvent(
        new CustomEvent('run', {
          detail: { nodeId: this.getAttribute('node-id') },
        })
      );
    });
    this.attributeChangedCallback(
      'readonly',
      null,
      this.getAttribute('readonly')
    );
  }

  appendLog(line: string) {
    const pre = this.shadowRoot!.getElementById('logs') as HTMLPreElement;
    pre.textContent += `${line}\n`;
    this.dispatchEvent(new CustomEvent('log', { detail: line }));
  }
}

customElements.define('workflow-node', WorkflowNode);
