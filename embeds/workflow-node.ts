interface WorkflowMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * `<workflow-node>` 自定义元素，用于在宿主页面中嵌入单个节点。
 * 通过 postMessage 与宿主通信，默认只传递引用 ID。
 */
class WorkflowNodeElement extends HTMLElement {
  private readonly allowedOrigins: Set<string>;

  private readonly token: string;

  private readonly verifiedOrigins = new Set<string>();

  constructor() {
    super();
    const originsAttr = this.getAttribute('allowed-origins') ?? '';
    this.allowedOrigins = new Set(
      originsAttr
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    );
    this.token = this.getAttribute('token') ?? '';
    this.handleMessage = this.handleMessage.bind(this);
  }

  connectedCallback(): void {
    window.addEventListener('message', this.handleMessage);
  }

  disconnectedCallback(): void {
    window.removeEventListener('message', this.handleMessage);
  }

  private handleMessage(event: MessageEvent<WorkflowMessage>): void {
    if (!this.allowedOrigins.has(event.origin)) return;
    const { data } = event;
    if (typeof data !== 'object' || data === null) return;

    switch (data.type) {
      case 'handshake':
        if (data.token === this.token) {
          this.verifiedOrigins.add(event.origin);
          window.postMessage({ type: 'handshake:ack' }, event.origin);
        }
        break;
      case 'request-detail':
        if (
          this.verifiedOrigins.has(event.origin) &&
          typeof data.id === 'string'
        ) {
          const detail = this.provideDetail(data.id);
          window.postMessage(
            { type: 'detail', id: data.id, detail },
            event.origin
          );
        }
        break;
      default:
        break;
    }
  }

  /**
   * 对外发送引用 ID，默认不包含正文数据。
   */
  public notifyRef(id: string): void {
    this.verifiedOrigins.forEach((origin) => {
      window.postMessage({ type: 'ref', id }, origin);
    });
  }

  /**
   * 宿主二次授权后返回详细数据，默认实现返回 undefined。
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected provideDetail(_id: string): unknown {
    return undefined;
  }
}

customElements.define('workflow-node', WorkflowNodeElement);

export default WorkflowNodeElement;
