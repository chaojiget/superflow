export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ExecRequest {
  /** 用于匹配返回事件的 id */
  id: string;
  /** 指向 capabilities.ts 中的白名单键 */
  capability: string;
  /** 传入远程函数的参数 */
  args?: unknown[];
}

export type ExecEvent =
  | { type: 'log'; level: LogLevel; message: string }
  | { type: 'result'; value: unknown }
  | { type: 'error'; error: unknown };
