/**
 * RunCenterClient 前端页面逻辑，用于与运行中心服务通信
 * 来自 PR #49 的实现，独立为 Client，避免与 React 组件命名冲突
 */
export interface RunCenterClientOptions {
  /** 后端服务基础地址，例如 http://localhost */
  baseUrl: string;
}

export class RunCenterClient {
  private baseUrl: string;
  private runId: string | null = null;
  private status: string | null = null;
  private logs: any[] = [];
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private statusCallbacks = new Set<(state: string) => void>();

  constructor(options: RunCenterClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  async startRun(flowId: string, input?: unknown): Promise<string> {
    const res = await fetch(`${this.baseUrl}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, input }),
    });
    const data = await res.json();
    this.runId = data.id;
    this.status = data.status;
    this.connectWebSocket();
    return this.runId!;
  }

  private connectWebSocket(): void {
    if (!this.runId) return;
    const wsUrl = this.baseUrl.replace('http', 'ws') + `/runs/${this.runId}`;
    const connect = () => {
      this.notifyStatus('connecting');
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyStatus('open');
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'status') {
            this.status = msg.status;
          } else if (msg.type === 'log') {
            this.logs.push(msg.log);
          }
        } catch {
          // ignore parse errors
        }
      };
      this.ws.onerror = () => {
        this.notifyStatus('error');
        this.ws?.close();
      };
      this.ws.onclose = () => {
        this.notifyStatus('closed');
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectAttempts++;
        setTimeout(connect, delay);
      };
    };
    connect();
  }

  getStatus(): string | null {
    return this.status;
  }

  getLogs(): any[] {
    return [...this.logs];
  }

  onConnectionStatus(callback: (state: string) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private notifyStatus(state: string): void {
    for (const cb of this.statusCallbacks) cb(state);
  }
}
