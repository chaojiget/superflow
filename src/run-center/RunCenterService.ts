/**
 * Run Center Service
 * 运行中心服务类，处理流程执行和监控
 */

import { generateId } from '@/shared/utils';
import type { RunRecord, RunLog, RunStatus } from './types';

export class RunCenterService {
  private runs = new Map<string, RunRecord>();
  private logs = new Map<string, RunLog[]>();

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
  async updateRunStatus(runId: string, status: RunStatus, data?: Partial<RunRecord>): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    Object.assign(run, {
      status,
      ...(status === 'completed' || status === 'failed' ? { endTime: Date.now() } : {}),
      ...data,
    });

    this.runs.set(runId, run);
  }

  /**
   * 添加日志
   */
  async addLog(runId: string, log: Omit<RunLog, 'id' | 'timestamp'>): Promise<void> {
    const logs = this.logs.get(runId) || [];
    const newLog: RunLog = {
      id: generateId(),
      timestamp: Date.now(),
      ...log,
    };

    logs.push(newLog);
    this.logs.set(runId, logs);

    // 同时更新运行记录中的日志
    const run = this.runs.get(runId);
    if (run) {
      run.logs = logs;
    }
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
   * 清理数据
   */
  async cleanup(): Promise<void> {
    this.runs.clear();
    this.logs.clear();
  }
}