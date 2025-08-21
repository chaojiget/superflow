export type LogHandler = (msg: string) => void;

export class NodePage {
  private logHandlers: LogHandler[] = [];
  private logEl: HTMLElement;

  constructor(private host: HTMLElement) {
    this.logEl = document.createElement('pre');
    this.logEl.id = 'log';
    this.host.appendChild(this.logEl);
  }

  /** 运行节点，默认直接返回输入 */
  run<T = unknown>(input: T): T {
    this.emit(`run: ${JSON.stringify(input)}`);
    return input;
  }

  /** 注册日志回调 */
  onLog(handler: LogHandler) {
    this.logHandlers.push(handler);
  }

  private emit(message: string) {
    this.logHandlers.forEach((h) => h(message));
    this.logEl.textContent += message + '\n';
  }
}
