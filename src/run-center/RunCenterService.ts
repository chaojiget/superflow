/**
 * Run Center Service
 * 运行中心服务类，处理流程执行和监控
 */

import { generateId } from '@/shared/utils';
import type { RunRecord, RunLog, RunStatus } from './types';
import { createStorage } from '@/shared/db';
import type { StorageAdapter } from '@/shared/types/storage';

export class RunCenterService {
  private runs = new Map<string, RunRecord>();
  private logs = new Map<string, RunLog[]>();
  private clients = new Map<string, Set<any>>();
  private storagePromise: Promise<StorageAdapter>;

  constructor() {
    this.storagePromise = createStorage('run-center');
  }

  /**
   * 创建运行记录
   */
  async createRun(flowId: string, input?: unknown): Promise<RunRecord> {
    const runRecord: RunRecord = {
      id: generateId(),
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
    this.broadcast(runId, { type: 'status', status });
  }

  /**
   * 添加日志
   */
  async addLog(
    runId: string,
    log: Omit<RunLog, 'id' | 'ts' | 'runId'>
  ): Promise<void> {
    const logs = this.logs.get(runId) || [];
    const newLog: RunLog = {
      id: generateId(),
      ts: Date.now(),
      runId,
      chainId: log.chainId ?? runId,
      level: log.level,
      ...(log.nodeId ? { nodeId: log.nodeId } : {}),
      fields: log.fields || {},
    };

    logs.push(newLog);
    this.logs.set(runId, logs);

    const run = this.runs.get(runId);
    if (run) {
      run.logs = logs;
    }

    const storage = await this.storagePromise;
    await storage.put('logs', newLog);

    this.broadcast(runId, { type: 'log', log: newLog });
  }

  /**
   * 获取日志
   */
  async getLogs(runId: string): Promise<RunLog[]> {
    const storage = await this.storagePromise;
    const all = await storage.getAll<RunLog>('logs');
    return all.filter((l) => l.runId === runId).sort((a, b) => a.ts - b.ts);
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
    const storage = await this.storagePromise;
    await storage.clear('logs');
    await storage.clear('runs');
  }

  /**
   * 导出指定运行的日志为 NDJSON
   */
  async exportLogs(runId: string): Promise<string> {
    const logs = await this.getLogs(runId);
    return logs.map((l) => JSON.stringify(l)).join('\n');
  }
}
