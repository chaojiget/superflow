export interface WorkflowMessage<T = unknown> {
  type: string;
  nodeId: string | null;
  detail: T;
}

export class WorkflowNode extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return ['node-id'];
  }

  #nodeId: string | null = null;

  get nodeId(): string | null {
    return this.#nodeId;
  }

  set nodeId(value: string | null) {
    this.#nodeId = value;
    if (value) {
      this.setAttribute('node-id', value);
    } else {
      this.removeAttribute('node-id');
    }
  }

  connectedCallback(): void {
    this.#nodeId = this.getAttribute('node-id');
    window.parent?.postMessage(
      { type: 'workflow-node:handshake', nodeId: this.#nodeId },
      '*'
    );
  }

  attributeChangedCallback(
    _name: string,
    _old: string | null,
    value: string | null
  ): void {
    this.#nodeId = value;
  }

  private emit<T>(type: 'run' | 'log' | 'result', detail: T): void {
    const event = new CustomEvent<T>(type, { detail });
    this.dispatchEvent(event);
    const message: WorkflowMessage<T> = {
      type: `workflow-node:${type}`,
      nodeId: this.#nodeId,
      detail,
    };
    window.parent?.postMessage(message, '*');
  }

  emitRun(detail: unknown): void {
    this.emit('run', detail);
  }

  emitLog(detail: unknown): void {
    this.emit('log', detail);
  }

  emitResult(detail: unknown): void {
    this.emit('result', detail);
  }
}

customElements.define('workflow-node', WorkflowNode);

export type RunEvent = CustomEvent<unknown>;
export type LogEvent = CustomEvent<unknown>;
export type ResultEvent = CustomEvent<unknown>;
