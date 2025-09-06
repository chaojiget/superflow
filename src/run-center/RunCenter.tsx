/**
 * Run Center 运行中心组件
 * 流程执行监控和管理界面
 */

import React, { useCallback, useEffect, useState } from 'react';
import { generateId } from '@/shared/utils';
import { logger } from '@/utils/logger';
import { startRun as startRunService } from '@app/services';
import type { RunRecord, ExecutionSnapshot } from '@core/run';
import type { NodeExecutionEventHandlers } from '@core';
import { PreviewRunner } from './PreviewRunner';

/**
 * 运行中心属性
 */
export interface RunCenterProps {
  onRunStarted?: (runId: string) => void;
  onRunCompleted?: (runId: string, result: any) => void;
  onRunFailed?: (runId: string, error: Error) => void;
  className?: string;
  readonly?: boolean;
}

/**
 * 运行中心状态
 */
interface RunCenterState {
  runs: Map<string, RunRecord>;
  activeRuns: Set<string>;
  selectedRun: string | null;
  filter: 'all' | 'running' | 'completed' | 'failed';
  searchQuery: string;
}

/**
 * RunCenter 类（用于测试兼容性）
 */
export class RunCenter {
  private state: RunCenterState = {
    runs: new Map(),
    activeRuns: new Set(),
    selectedRun: null,
    filter: 'all',
    searchQuery: '',
  };

  private logs = new Map<string, any[]>();
  private subscribers = new Map<string, ((...args: any[]) => void)[]>();
  private logStreamers = new Map<string, ((...args: any[]) => void)[]>();
  private nodeEventSubscribers = new Map<
    string,
    NodeExecutionEventHandlers[]
  >();
  private previewRunner = new PreviewRunner();

  constructor(private props: RunCenterProps = {}) {}

  /**
   * 开始运行
   */
  async startRun(flowId: string, input?: unknown): Promise<string> {
    const runId = await startRunService(flowId, input);
    const run: RunRecord = {
      id: runId,
      chainId: generateId(),
      flowId,
      status: 'running',
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
        executionTime: 0,
        nodeCount: 0,
        successCount: 0,
        failureCount: 0,
      },
    };

    this.state.runs.set(runId, run);
    this.state.activeRuns.add(runId);

    this.props.onRunStarted?.(runId);

    // 模拟异步执行
    this.simulateRun(runId);

    return runId;
  }

  /**
   * 停止运行
   */
  async stopRun(runId: string): Promise<void> {
    const run = this.state.runs.get(runId);
    if (!run) {
      throw new Error(`运行记录不存在: ${runId}`);
    }

    if (run.status === 'running') {
      run.status = 'cancelled';
      run.endTime = Date.now();
      run.metrics.executionTime = run.endTime - run.startTime;
      this.state.activeRuns.delete(runId);
    }
  }

  /**
   * 获取运行记录
   */
  getRun(runId: string): any {
    const run = this.state.runs.get(runId);
    if (!run) return undefined;

    return {
      id: run.id,
      flowId: run.flowId,
      status: run.status,
      startedAt: run.startTime,
      finishedAt: run.endTime,
    };
  }

  /**
   * 获取所有运行记录
   */
  getAllRuns(): RunRecord[] {
    return Array.from(this.state.runs.values());
  }

  /**
   * 获取活跃运行
   */
  getActiveRuns(): RunRecord[] {
    return Array.from(this.state.activeRuns)
      .map((id) => this.state.runs.get(id))
      .filter(Boolean) as RunRecord[];
  }

  /**
   * 获取运行状态快照
   */
  getSnapshot(runId: string): ExecutionSnapshot | undefined {
    const run = this.state.runs.get(runId);
    if (!run) return undefined;

    return {
      runId,
      status: run.status,
      progress: run.progress,
      startTime: run.startTime,
      elapsedTime: run.endTime
        ? run.endTime - run.startTime
        : Date.now() - run.startTime,
      metrics: run.metrics,
      logs: run.logs.slice(-100),
      timestamp: Date.now(),
    };
  }

  cleanup(olderThan: number = 24 * 60 * 60 * 1000): number {
    let cleaned = 0;
    const cutoffTime = Date.now() - olderThan;
    for (const [runId, run] of this.state.runs) {
      if (run.status !== 'running' && run.startTime < cutoffTime) {
        this.state.runs.delete(runId);
        this.state.activeRuns.delete(runId);
        cleaned++;
      }
    }
    return cleaned;
  }

  async createRun(flowId: string, input?: unknown): Promise<any> {
    const runId = generateId();
    const run: RunRecord = {
      id: runId,
      chainId: generateId(),
      flowId,
      status: 'running',
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
        executionTime: 0,
        nodeCount: 0,
        successCount: 0,
        failureCount: 0,
      },
    };
    this.state.runs.set(runId, run);
    this.state.activeRuns.add(runId);
    return {
      id: runId,
      flowId,
      status: 'running',
      startedAt: run.startTime,
    };
  }

  async updateRunStatus(
    runId: string,
    status: 'running' | 'completed' | 'failed' | 'cancelled'
  ): Promise<void> {
    const run = this.state.runs.get(runId);
    if (!run) {
      throw new Error(`运行记录不存在: ${runId}`);
    }
    const oldStatus = run.status;
    run.status = status;
    if (status !== 'running' && oldStatus === 'running') {
      run.endTime = Date.now();
      run.metrics.executionTime = run.endTime - run.startTime;
      this.state.activeRuns.delete(runId);
    }
    const runSubscribers = this.subscribers.get(runId) || [];
    runSubscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        logger.error(
          '订阅回调错误',
          {
            event: 'runCenter.updateRunStatus',
            runId,
            status,
          },
          error as Error
        );
      }
    });
  }

  async getRunHistory(flowId: string): Promise<any[]> {
    return Array.from(this.state.runs.values())
      .filter((run) => run.flowId === flowId)
      .map((run) => ({
        id: run.id,
        flowId: run.flowId,
        status: run.status,
        startedAt: run.startTime,
        finishedAt: run.endTime,
      }))
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  async log(
    runId: string,
    entry: { level: 'info' | 'warn' | 'error'; event: string; data?: any }
  ): Promise<void> {
    const timestamp = Date.now();
    const logEntry = {
      level: entry.level,
      ts: timestamp,
      runId,
      fields: { message: entry.event, ...(entry.data || {}) },
    } as any;
    const run = this.state.runs.get(runId);
    if (run) {
      run.logs.push({
        id: generateId(),
        ts: timestamp,
        level: entry.level,
        runId,
        chainId: run.chainId,
        fields: { message: entry.event, ...(entry.data || {}) },
        ...(entry.data?.nodeId ? { nodeId: entry.data?.nodeId as string } : {}),
      } as any);
    }
    if (!this.logs.has(runId)) {
      this.logs.set(runId, []);
    }
    this.logs.get(runId)!.push(logEntry);
    const streamers = this.logStreamers.get(runId) || [];
    streamers.forEach((callback) => {
      try {
        callback(logEntry);
      } catch (error) {
        logger.error(
          '日志流回调错误',
          {
            event: 'runCenter.logStream',
            runId,
          },
          error as Error
        );
      }
    });
  }

  async getLogs(runId: string): Promise<any[]> {
    return this.logs.get(runId) || [];
  }

  subscribeToRun(
    runId: string,
    callback: (status: string) => void
  ): () => void {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, []);
    }
    this.subscribers.get(runId)!.push(callback);
    return () => {
      const callbacks = this.subscribers.get(runId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  subscribeNodeEvents(
    runId: string,
    handlers: NodeExecutionEventHandlers
  ): () => void {
    if (!this.nodeEventSubscribers.has(runId)) {
      this.nodeEventSubscribers.set(runId, []);
    }
    this.nodeEventSubscribers.get(runId)!.push(handlers);
    return () => {
      const subs = this.nodeEventSubscribers.get(runId);
      if (!subs) return;
      const index = subs.indexOf(handlers);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }

  private emitNodeEvent(
    runId: string,
    type: 'start' | 'success' | 'error',
    nodeId: string
  ): void {
    const subs = this.nodeEventSubscribers.get(runId) || [];
    for (const handler of subs) {
      try {
        switch (type) {
          case 'start':
            handler.onNodeStart?.(nodeId);
            break;
          case 'success':
            handler.onNodeSuccess?.(nodeId);
            break;
          case 'error':
            handler.onNodeError?.(nodeId);
            break;
        }
      } catch (error) {
        logger.error(
          '节点事件回调错误',
          {
            event: 'runCenter.emitNodeEvent',
            runId,
            nodeId,
            type,
          },
          error as Error
        );
      }
    }
  }

  publishNodeStart(runId: string, nodeId: string): void {
    this.emitNodeEvent(runId, 'start', nodeId);
  }
  publishNodeSuccess(runId: string, nodeId: string): void {
    this.emitNodeEvent(runId, 'success', nodeId);
  }
  publishNodeError(runId: string, nodeId: string): void {
    this.emitNodeEvent(runId, 'error', nodeId);
  }

  async retryNode(runId: string, nodeId: string): Promise<void> {
    this.publishNodeStart(runId, nodeId);
    await Promise.resolve();
    this.publishNodeSuccess(runId, nodeId);
  }

  private async simulateRun(runId: string): Promise<void> {
    const run = this.state.runs.get(runId);
    if (!run) return;
    try {
      const nodeCount = Math.floor(Math.random() * 5) + 3;
      run.progress.total = nodeCount;
      run.metrics.nodeCount = nodeCount;
      for (let i = 0; i < nodeCount; i++) {
        if (run.status !== 'running') break;
        const nodeId = `node-${i + 1}`;
        run.progress.running = 1;
        this.publishNodeStart(runId, nodeId);
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 1000 + 500)
        );
        const msg = (await this.previewRunner.run(
          ((index: number, total: number) => `执行节点 ${index}/${total}`) as (
            ...args: unknown[]
          ) => unknown,
          i + 1,
          nodeCount
        )) as string;
        run.logs.push({
          id: generateId(),
          ts: Date.now(),
          level: 'info',
          runId,
          chainId: run.chainId,
          fields: { message: msg ?? `执行节点 ${i + 1}/${nodeCount}` },
          nodeId,
        } as any);
        if (Math.random() < 0.1) {
          run.progress.failed++;
          run.metrics.failureCount = (run.metrics.failureCount || 0) + 1;
          run.logs.push({
            id: generateId(),
            ts: Date.now(),
            level: 'error',
            runId,
            chainId: run.chainId,
            fields: { message: `节点 ${i + 1} 执行失败` },
            nodeId,
          } as any);
          this.publishNodeError(runId, nodeId);
        } else {
          run.progress.completed++;
          run.metrics.successCount = (run.metrics.successCount || 0) + 1;
          this.publishNodeSuccess(runId, nodeId);
        }
        run.progress.running = 0;
        run.progress.percentage = Math.round(
          ((run.progress.completed + run.progress.failed) / run.progress.total) *
            100
        );
      }
      if (run.status === 'running') {
        run.status = run.progress.failed > 0 ? 'failed' : 'completed';
        run.endTime = Date.now();
        run.metrics.executionTime = run.endTime - run.startTime;
        this.state.activeRuns.delete(runId);
        if (run.status === 'completed') {
          this.props.onRunCompleted?.(runId, { success: true });
        } else {
          this.props.onRunFailed?.(runId, new Error('部分节点执行失败'));
        }
      }
    } catch (error) {
      run.status = 'failed';
      run.endTime = Date.now();
      run.metrics.executionTime = run.endTime - run.startTime;
      run.error = error instanceof Error ? error.message : String(error);
      this.state.activeRuns.delete(runId);
      this.props.onRunFailed?.(
        runId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

export default RunCenter;

