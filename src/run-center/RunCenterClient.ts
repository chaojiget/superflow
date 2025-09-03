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

  constructor(options: RunCenterClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  /**
   * 启动运行并建立实时连接
   */
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

  /**
   * 建立 WebSocket 连接
   */
  private connectWebSocket(): void {
    if (!this.runId) return;
    const wsUrl = this.baseUrl.replace('http', 'ws') + `/runs/${this.runId}`;
    this.ws = new WebSocket(wsUrl);
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
  }

  /** 获取当前运行状态 */
  getStatus(): string | null {
    return this.status;
  }

  /** 获取日志列表 */
  getLogs(): any[] {
    return [...this.logs];
  }
}
