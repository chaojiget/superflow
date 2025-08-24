import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  cmp: vi.fn(),
} as any;

describe('Run Center Module', () => {
  let runCenter: any;

  beforeEach(async () => {
    // 动态导入以避免模块级别的副作用
    const module = await import('../index');
    runCenter = new module.RunCenter();
  });

  describe('运行记录管理', () => {
    it('应该创建运行记录', async () => {
      const flowId = 'test-flow';
      const runRecord = await runCenter.createRun(flowId);

      expect(runRecord).toBeDefined();
      expect(runRecord.id).toBeDefined();
      expect(runRecord.flowId).toBe(flowId);
      expect(runRecord.status).toBe('running');
      expect(runRecord.startedAt).toBeDefined();
    });

    it('应该更新运行状态', async () => {
      const flowId = 'test-flow';
      const runRecord = await runCenter.createRun(flowId);

      await runCenter.updateRunStatus(runRecord.id, 'completed');

      const updatedRecord = await runCenter.getRun(runRecord.id);
      expect(updatedRecord.status).toBe('completed');
      expect(updatedRecord.finishedAt).toBeDefined();
    });

    it('应该查询运行历史', async () => {
      const flowId = 'test-flow';
      await runCenter.createRun(flowId);
      await runCenter.createRun(flowId);

      const history = await runCenter.getRunHistory(flowId);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('日志管理', () => {
    it('应该记录日志', async () => {
      const runId = 'test-run';
      const logEntry = {
        level: 'info' as const,
        event: 'node_executed',
        data: { nodeId: 'test-node', result: 'success' },
      };

      await runCenter.log(runId, logEntry);

      const logs = await runCenter.getLogs(runId);
      expect(logs.length).toBe(1);
      expect(logs[0].event).toBe('node_executed');
    });

    it('应该支持不同日志级别', async () => {
      const runId = 'test-run';

      await runCenter.log(runId, { level: 'info', event: 'info_event' });
      await runCenter.log(runId, { level: 'warn', event: 'warn_event' });
      await runCenter.log(runId, { level: 'error', event: 'error_event' });

      const logs = await runCenter.getLogs(runId);
      const levels = logs.map((log) => log.level);

      expect(levels).toContain('info');
      expect(levels).toContain('warn');
      expect(levels).toContain('error');
    });

    it('应该按时间排序日志', async () => {
      const runId = 'test-run';

      await runCenter.log(runId, { level: 'info', event: 'first' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await runCenter.log(runId, { level: 'info', event: 'second' });

      const logs = await runCenter.getLogs(runId);
      expect(logs[0].event).toBe('first');
      expect(logs[1].event).toBe('second');
      expect(logs[1].ts).toBeGreaterThan(logs[0].ts);
    });
  });

  describe('监控指标', () => {
    it('应该收集性能指标', async () => {
      const metrics = await runCenter.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalRuns).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
    });

    it('应该跟踪错误率', async () => {
      const flowId = 'error-test-flow';

      // 创建成功运行
      const successRun = await runCenter.createRun(flowId);
      await runCenter.updateRunStatus(successRun.id, 'completed');

      // 创建失败运行
      const failedRun = await runCenter.createRun(flowId);
      await runCenter.updateRunStatus(failedRun.id, 'failed');

      const metrics = await runCenter.getFlowMetrics(flowId);
      expect(metrics.errorRate).toBe(0.5); // 50% 错误率
    });

    it('应该计算平均执行时间', async () => {
      const flowId = 'duration-test-flow';

      const run1 = await runCenter.createRun(flowId);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await runCenter.updateRunStatus(run1.id, 'completed');

      const run2 = await runCenter.createRun(flowId);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await runCenter.updateRunStatus(run2.id, 'completed');

      const metrics = await runCenter.getFlowMetrics(flowId);
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('实时监控', () => {
    it('应该支持实时日志流', (done) => {
      const runId = 'stream-test-run';

      runCenter.streamLogs(runId, (log: any) => {
        expect(log.event).toBe('stream_test');
        done();
      });

      runCenter.log(runId, { level: 'info', event: 'stream_test' });
    });

    it('应该支持运行状态订阅', (done) => {
      const runId = 'status-test-run';

      runCenter.subscribeToRun(runId, (status: string) => {
        if (status === 'completed') {
          done();
        }
      });

      runCenter.updateRunStatus(runId, 'completed');
    });
  });
});
