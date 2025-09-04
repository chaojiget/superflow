export class WorkflowFlow extends HTMLElement {
  static get observedAttributes() {
    return ['flow-id', 'readonly', 'theme'];
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
        <slot></slot>
        <button id="run">Run Flow</button>
        <pre id="logs"></pre>
      </section>`;
    this.runBtn = this.shadowRoot!.getElementById('run') as HTMLButtonElement;
    this.runBtn.addEventListener('click', () => {
      if (this.hasAttribute('readonly')) return;
      this.dispatchEvent(
        new CustomEvent('run', {
          detail: { flowId: this.getAttribute('flow-id') },
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

customElements.define('workflow-flow', WorkflowFlow);
