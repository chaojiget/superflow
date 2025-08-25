/**
 * Run Center 运行中心组件
 * 流程执行监控和管理界面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { generateId } from '@/shared/utils';
import type { RunRecord, ExecutionSnapshot } from './types';
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
  private previewRunner = new PreviewRunner();

  constructor(private props: RunCenterProps = {}) {}

  /**
   * 开始运行
   */
  async startRun(flowId: string, input?: unknown): Promise<string> {
    const runId = generateId();
    const run: RunRecord = {
      id: runId,
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
      logs: run.logs.slice(-100), // 最近100条日志
      timestamp: Date.now(),
    };
  }

  /**
   * 清理完成的运行记录
   */
  cleanup(olderThan: number = 24 * 60 * 60 * 1000): number {
    // 默认24小时
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

  /**
   * 创建运行记录（测试兼容）
   */
  async createRun(flowId: string, input?: unknown): Promise<any> {
    const runId = generateId();
    const run: RunRecord = {
      id: runId,
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

  /**
   * 更新运行状态
   */
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

    // 通知订阅者
    const runSubscribers = this.subscribers.get(runId) || [];
    runSubscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('订阅回调错误:', error);
      }
    });
  }

  /**
   * 获取运行历史
   */
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

  /**
   * 记录日志
   */
  async log(
    runId: string,
    entry: { level: 'info' | 'warn' | 'error'; event: string; data?: any }
  ): Promise<void> {
    const timestamp = Date.now();
    const logEntry = {
      ...entry,
      ts: timestamp,
      timestamp,
      runId,
    };

    // 存储到运行记录中
    const run = this.state.runs.get(runId);
    if (run) {
      run.logs.push({
        id: generateId(),
        timestamp,
        level: entry.level,
        message: entry.event,
        nodeId: entry.data?.nodeId as string,
      });
    }

    // 存储到日志集合中
    if (!this.logs.has(runId)) {
      this.logs.set(runId, []);
    }
    this.logs.get(runId)!.push(logEntry);

    // 通知日志流订阅者
    const streamers = this.logStreamers.get(runId) || [];
    streamers.forEach((callback) => {
      try {
        callback(logEntry);
      } catch (error) {
        console.error('日志流回调错误:', error);
      }
    });
  }

  /**
   * 获取日志
   */
  async getLogs(runId: string): Promise<any[]> {
    return this.logs.get(runId) || [];
  }

  /**
   * 获取全局指标
   */
  async getMetrics(): Promise<{
    totalRuns: number;
    successRate: number;
    averageDuration: number;
  }> {
    const allRuns = Array.from(this.state.runs.values());
    const completedRuns = allRuns.filter(
      (run) => run.status === 'completed' || run.status === 'failed'
    );
    const successfulRuns = allRuns.filter((run) => run.status === 'completed');

    const totalRuns = allRuns.length;
    const successRate = totalRuns > 0 ? successfulRuns.length / totalRuns : 0;

    const durations = completedRuns
      .filter((run) => run.endTime)
      .map((run) => run.endTime! - run.startTime);
    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      totalRuns,
      successRate,
      averageDuration,
    };
  }

  /**
   * 获取流程指标
   */
  async getFlowMetrics(
    flowId: string
  ): Promise<{ errorRate: number; averageDuration: number }> {
    const flowRuns = Array.from(this.state.runs.values()).filter(
      (run) => run.flowId === flowId
    );
    const completedRuns = flowRuns.filter(
      (run) => run.status === 'completed' || run.status === 'failed'
    );
    const failedRuns = flowRuns.filter((run) => run.status === 'failed');

    const errorRate =
      completedRuns.length > 0 ? failedRuns.length / completedRuns.length : 0;

    const durations = completedRuns
      .filter((run) => run.endTime)
      .map((run) => run.endTime! - run.startTime);
    const averageDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      errorRate,
      averageDuration,
    };
  }

  /**
   * 订阅运行状态
   */
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

  /**
   * 订阅日志流
   */
  streamLogs(runId: string, callback: (log: any) => void): () => void {
    if (!this.logStreamers.has(runId)) {
      this.logStreamers.set(runId, []);
    }
    this.logStreamers.get(runId)!.push(callback);

    return () => {
      const callbacks = this.logStreamers.get(runId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 模拟运行执行
   */
  private async simulateRun(runId: string): Promise<void> {
    const run = this.state.runs.get(runId);
    if (!run) return;

    try {
      // 模拟节点执行
      const nodeCount = Math.floor(Math.random() * 5) + 3; // 3-7个节点
      run.progress.total = nodeCount;
      run.metrics.nodeCount = nodeCount;

      for (let i = 0; i < nodeCount; i++) {
        if (run.status !== 'running') break;

        // 模拟节点执行时间
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 1000 + 500)
        );

        run.progress.running = 1;
        const msg = (await this.previewRunner.run(
          (index: number, total: number) => `执行节点 ${index}/${total}`,
          i + 1,
          nodeCount
        )) as string;
        run.logs.push({
          id: generateId(),
          timestamp: Date.now(),
          level: 'info',
          message: msg,
          nodeId: `node-${i + 1}`,
        });

        // 随机失败概率
        if (Math.random() < 0.1) {
          run.progress.failed++;
          run.metrics.failureCount = (run.metrics.failureCount || 0) + 1;
          run.logs.push({
            id: generateId(),
            timestamp: Date.now(),
            level: 'error',
            message: `节点 ${i + 1} 执行失败`,
            nodeId: `node-${i + 1}`,
          });
        } else {
          run.progress.completed++;
          run.metrics.successCount = (run.metrics.successCount || 0) + 1;
        }

        run.progress.running = 0;
        run.progress.percentage = Math.round(
          ((run.progress.completed + run.progress.failed) /
            run.progress.total) *
            100
        );
      }

      // 完成执行
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

/**
 * RunCenter React 组件
 */
export const RunCenterComponent: React.FC<RunCenterProps> = ({
  onRunStarted,
  onRunCompleted,
  onRunFailed,
  className = '',
  readonly = false,
}) => {
  const [runCenter] = useState(
    () =>
      new RunCenter({
        ...(onRunStarted && { onRunStarted }),
        ...(onRunCompleted && { onRunCompleted }),
        ...(onRunFailed && { onRunFailed }),
      })
  );
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'running' | 'completed' | 'failed'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * 刷新运行列表
   */
  const refreshRuns = useCallback(() => {
    const allRuns = runCenter.getAllRuns();
    setRuns(allRuns);
  }, [runCenter]);

  /**
   * 启动运行
   */
  const handleStartRun = useCallback(async () => {
    if (readonly) return;

    try {
      await runCenter.startRun('demo-flow', { test: 'data' });
      refreshRuns();
    } catch (error) {
      console.error('启动运行失败:', error);
    }
  }, [readonly, runCenter, refreshRuns]);

  /**
   * 停止运行
   */
  const handleStopRun = useCallback(
    async (runId: string) => {
      if (readonly) return;

      try {
        await runCenter.stopRun(runId);
        refreshRuns();
      } catch (error) {
        console.error('停止运行失败:', error);
      }
    },
    [readonly, runCenter, refreshRuns]
  );

  /**
   * 清理旧记录
   */
  const handleCleanup = useCallback(() => {
    if (readonly) return;

    const cleaned = runCenter.cleanup();
    console.log(`清理了 ${cleaned} 条运行记录`);
    refreshRuns();
  }, [readonly, runCenter, refreshRuns]);

  // 定期刷新
  useEffect(() => {
    const interval = setInterval(refreshRuns, 1000);
    return () => clearInterval(interval);
  }, [refreshRuns]);

  // 过滤运行记录
  const filteredRuns = runs
    .filter((run) => {
      if (filter !== 'all' && run.status !== filter) {
        return false;
      }

      if (
        searchQuery &&
        !run.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !run.flowId.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.startTime - a.startTime);

  const selectedRunData = selectedRun ? runCenter.getRun(selectedRun) : null;

  return (
    <div className={`run-center ${className}`}>
      <header className="run-center-header">
        <h1>运行中心</h1>
        <p>监控和管理流程执行</p>
      </header>

      <main className="run-center-main">
        {/* 控制面板 */}
        <section className="control-panel">
          <div className="actions">
            {!readonly && (
              <>
                <button onClick={handleStartRun} className="start-run-button">
                  ▶️ 启动运行
                </button>
                <button onClick={handleCleanup} className="cleanup-button">
                  🧹 清理记录
                </button>
              </>
            )}
          </div>

          <div className="filters">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">全部</option>
              <option value="running">运行中</option>
              <option value="completed">已完成</option>
              <option value="failed">已失败</option>
            </select>

            <input
              type="text"
              placeholder="搜索运行记录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* 运行列表 */}
        <section className="runs-list">
          <h2>运行记录 ({filteredRuns.length})</h2>
          <div className="runs-table">
            <div className="table-header">
              <span>ID</span>
              <span>流程</span>
              <span>状态</span>
              <span>进度</span>
              <span>开始时间</span>
              <span>执行时间</span>
              <span>操作</span>
            </div>

            {filteredRuns.map((run) => (
              <div
                key={run.id}
                className={`table-row ${selectedRun === run.id ? 'selected' : ''}`}
                onClick={() => setSelectedRun(run.id)}
              >
                <span className="run-id">{run.id.slice(0, 8)}...</span>
                <span className="flow-id">{run.flowId}</span>
                <span className={`status ${run.status}`}>
                  {run.status === 'running' && '🔄'}
                  {run.status === 'completed' && '✅'}
                  {run.status === 'failed' && '❌'}
                  {run.status === 'cancelled' && '⏹️'}
                  {run.status}
                </span>
                <span className="progress">
                  {run.progress.percentage}% ({run.progress.completed}/
                  {run.progress.total})
                </span>
                <span className="start-time">
                  {new Date(run.startTime).toLocaleString()}
                </span>
                <span className="execution-time">
                  {run.metrics.executionTime
                    ? `${(run.metrics.executionTime / 1000).toFixed(1)}s`
                    : `${((Date.now() - run.startTime) / 1000).toFixed(1)}s`}
                </span>
                <span className="actions">
                  {run.status === 'running' && !readonly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopRun(run.id);
                      }}
                      className="stop-button"
                    >
                      ⏹️
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 运行详情 */}
        {selectedRunData && (
          <section className="run-details">
            <h2>运行详情</h2>
            <div className="details-grid">
              <div className="basic-info">
                <h3>基本信息</h3>
                <div className="info-item">
                  <label>运行ID:</label>
                  <span>{selectedRunData.id}</span>
                </div>
                <div className="info-item">
                  <label>流程ID:</label>
                  <span>{selectedRunData.flowId}</span>
                </div>
                <div className="info-item">
                  <label>状态:</label>
                  <span className={`status ${selectedRunData.status}`}>
                    {selectedRunData.status}
                  </span>
                </div>
                <div className="info-item">
                  <label>开始时间:</label>
                  <span>
                    {new Date(selectedRunData.startTime).toLocaleString()}
                  </span>
                </div>
                {selectedRunData.endTime && (
                  <div className="info-item">
                    <label>结束时间:</label>
                    <span>
                      {new Date(selectedRunData.endTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="progress-info">
                <h3>执行进度</h3>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${selectedRunData.progress.percentage}%` }}
                  />
                </div>
                <div className="progress-stats">
                  <span>总数: {selectedRunData.progress.total}</span>
                  <span>完成: {selectedRunData.progress.completed}</span>
                  <span>失败: {selectedRunData.progress.failed}</span>
                  <span>运行: {selectedRunData.progress.running}</span>
                </div>
              </div>

              <div className="metrics-info">
                <h3>性能指标</h3>
                <div className="metrics-grid">
                  <div className="metric">
                    <label>执行时间:</label>
                    <span>
                      {(selectedRunData.metrics.executionTime / 1000).toFixed(
                        1
                      )}
                      s
                    </span>
                  </div>
                  <div className="metric">
                    <label>节点数量:</label>
                    <span>{selectedRunData.metrics.nodeCount}</span>
                  </div>
                  <div className="metric">
                    <label>成功率:</label>
                    <span>
                      {selectedRunData.metrics.nodeCount > 0
                        ? `${Math.round((selectedRunData.metrics.successCount / selectedRunData.metrics.nodeCount) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 运行日志 */}
            <div className="run-logs">
              <h3>执行日志</h3>
              <div className="logs-container">
                {selectedRunData.logs.map(
                  (
                    log: {
                      id?: string;
                      timestamp: number;
                      level: string;
                      message: string;
                      nodeId?: string;
                    },
                    index: number
                  ) => (
                    <div key={index} className={`log-entry ${log.level}`}>
                      <span className="timestamp">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="level">{log.level.toUpperCase()}</span>
                      <span className="message">{log.message}</span>
                      {log.nodeId && (
                        <span className="node-id">[{log.nodeId}]</span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// 默认导出组件
export default RunCenterComponent;
