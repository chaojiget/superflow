/**
 * Run Center Service
 * 运行中心服务类，处理流程执行和监控
 */

import { generateId } from '@/shared/utils';
import { SuperflowDB } from '@data';
import type { RunRecord, RunLog, RunStatus } from '@core/run';

export class RunCenterService {
  private runs = new Map<string, RunRecord>();
  private logs = new Map<string, RunLog[]>();
  private clients = new Map<string, Set<any>>();
  private db: SuperflowDB;

  constructor() {
    this.db = new SuperflowDB(generateId());
    this.db.open();
  }

  /**
   * 创建运行记录
   */
  async createRun(flowId: string, input?: unknown): Promise<RunRecord> {
    const runRecord: RunRecord = {
      id: generateId(),
      chainId: generateId(),
      flowId,
      status: 'pending',
      startTime: Date.now(),
      input,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        running: 0,
        percentage: 0,
      },
      logs: [],
      metrics: {
        duration: 0,
        throughput: 0,
        errorRate: 0,
        avgNodeTime: 0,
        peakMemory: 0,
        cpuUsage: 0,
      },
    };

    this.runs.set(runRecord.id, runRecord);
    this.logs.set(runRecord.id, []);

    await this.db.runs.put({
      id: runRecord.id,
      flowId,
      startedAt: runRecord.startTime,
      status: 'pending',
      traceId: runRecord.chainId,
    });

    return runRecord;
  }

  /**
   * 获取运行记录
   */
  async getRun(runId: string): Promise<RunRecord> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    return run;
  }

  /**
   * 更新运行状态
   */
  async updateRunStatus(
    runId: string,
    status: RunStatus,
    data?: Partial<RunRecord>
  ): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    Object.assign(run, {
      status,
      ...(status === 'completed' || status === 'failed'
        ? { endTime: Date.now() }
        : {}),
      ...data,
    });

    this.runs.set(runId, run);
    await this.db.runs.update(runId, {
      status,
      ...(run.endTime ? { finishedAt: run.endTime } : {}),
      ...(run.error ? { error: run.error } : {}),
    });
    this.broadcast(runId, { type: 'status', status });
  }

  /**
   * 添加日志
   */
  async addLog(
    runId: string,
    log: Partial<Omit<RunLog, 'id'>> & {
      level: RunLog['level'];
      fields?: Record<string, unknown>;
    }
  ): Promise<void> {
    const logs = this.logs.get(runId) || [];
    const run = this.runs.get(runId);
    const newLog: RunLog = {
      id: generateId(),
      ts: Date.now(),
      level: log.level,
      runId,
      chainId: run?.chainId ?? generateId(),
      fields: log.fields ?? {},
      ...(log.nodeId ? { nodeId: log.nodeId } : {}),
    } as RunLog;

    logs.push(newLog);
    this.logs.set(runId, logs);

    // 同时更新运行记录中的日志
    if (run) run.logs = logs;

    await this.db.logs.put({
      id: newLog.id,
      runId,
      ts: newLog.ts,
      level: newLog.level,
      event: (newLog.fields as any)?.message ?? '',
      data: newLog.fields,
      ...(run?.chainId ? { traceId: run.chainId } : {}),
    });

    this.broadcast(runId, { type: 'log', log: newLog });
  }

  /**
   * 获取日志
   */
  async getLogs(runId: string): Promise<RunLog[]> {
    return this.logs.get(runId) || [];
  }

  /**
   * 获取所有运行记录
   */
  async getAllRuns(): Promise<RunRecord[]> {
    return Array.from(this.runs.values());
  }

  /**
   * 注册 WebSocket 客户端
   */
  registerClient(runId: string, ws: any): void {
    if (!this.clients.has(runId)) {
      this.clients.set(runId, new Set());
    }
    const set = this.clients.get(runId)!;
    set.add(ws);
    ws.onclose = () => set.delete(ws);
  }

  /**
   * 推送事件
   */
  private broadcast(runId: string, message: any): void {
    const set = this.clients.get(runId);
    if (!set) return;
    for (const ws of set) {
      // MockWebSocket 提供 simulateMessage 方法
      if (typeof ws.simulateMessage === 'function') {
        ws.simulateMessage(JSON.stringify(message));
      } else if (typeof ws.send === 'function') {
        try {
          ws.send(JSON.stringify(message));
        } catch {
          /* 忽略发送错误 */
        }
      }
    }
  }

  /**
   * 处理 REST 请求（用于测试集成）
   */
  async handleRequest(method: string, path: string, body?: any): Promise<any> {
    if (method === 'POST' && path === '/runs') {
      const { flowId, input } = body || {};
      return this.createRun(flowId, input);
    }

    const statusMatch = path.match(/^\/runs\/([^/]+)\/status$/);
    if (method === 'GET' && statusMatch) {
      const run = await this.getRun(statusMatch[1] as string);
      return { status: run.status };
    }

    const logsMatch = path.match(/^\/runs\/([^/]+)\/logs$/);
    if (method === 'GET' && logsMatch) {
      return this.getLogs(logsMatch[1] as string);
    }

    throw new Error(`Unsupported route: ${method} ${path}`);
  }

  /**
   * 清理数据
   */
  async cleanup(): Promise<void> {
    this.runs.clear();
    this.logs.clear();
    await this.db.runs.clear();
    await this.db.logs.clear();
  }

  /**
   * 导出日志为 NDJSON
   */
  async exportLogsNDJSON(runId?: string): Promise<string> {
    const logs = runId
      ? await this.db.logs.where('runId').equals(runId).toArray()
      : await this.db.logs.toArray();
    return logs
      .map((l: any) =>
        JSON.stringify(
          typeof l.data === 'object' && l.data !== null
            ? { ...l, fields: l.data }
            : l
        )
      )
      .join('\n');
  }

  /** 兼容旧命名 */
  async exportLogs(runId?: string): Promise<string> {
    return this.exportLogsNDJSON(runId);
  }
}
