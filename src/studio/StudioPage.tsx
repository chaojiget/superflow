import React, { useRef, useState } from 'react';
import FlowEditor from '@/components/src/FlowEditor';
import { RunCenter } from '@/run-center/RunCenter';
import { RunCenterPage, type NodeLog } from '@/run-center/RunCenterPage';

/**
 * StudioPage
 * 轻量版编排 Studio，将 Graph 与 Console 集成到同一页面，
 * 依赖现有 FlowEditor 与 RunCenter 能力，避免 docs/ 中模拟页面的外部依赖。
 */
const StudioPage: React.FC = () => {
  const runCenterRef = useRef<RunCenter>();
  const [logs, setLogs] = useState<NodeLog[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<string>('idle');

  if (!runCenterRef.current) {
    runCenterRef.current = new RunCenter();
  }

  const handleRun = async () => {
    // 使用内置模拟执行，自动产生日志与节点事件
    const runId = await runCenterRef.current!.startRun('studio-demo', {
      input: 'hello',
    });
    setCurrentRunId(runId);
    setConnStatus('running');

    // 订阅日志流
    const unsubscribeLogs = runCenterRef.current!.streamLogs(
      runId,
      (log: any) => {
        const entry = {
          id: String(log.ts) + (log.nodeId ?? ''),
          node: (log.nodeId as string) || 'N',
          status: (log.level === 'error' ? 'failed' : 'success') as NodeLog['status'],
          message: (log.fields?.message as string) || '',
          ...(log.level === 'error'
            ? { error: (log.fields?.message as string) || 'error' }
            : {}),
          runId,
        } as NodeLog;
        setLogs((prev) => [...prev, entry]);
      }
    );

    // 订阅状态变化
    const unsubscribeStatus = runCenterRef
      .current!
      .subscribeToRun(runId, (status) => {
        setConnStatus(status);
      });

    // 清理逻辑
    return () => {
      unsubscribeLogs?.();
      unsubscribeStatus?.();
    };
  };

  const handleClear = () => {
    setLogs([]);
    setCurrentRunId(null);
    setConnStatus('idle');
  };

  const handleRetry = (id: string) => {
    if (!currentRunId) return;
    // 将 NodeLog.id 视为 nodeId 的占位，实际取 logs 中的 node 字段
    const item = logs.find((l) => l.id === id) || logs[logs.length - 1];
    if (!item) return;
    runCenterRef.current!.retryNode(currentRunId, item.node);
  };

  const handleDownload = (runId: string) => {
    const rows = logs.filter((l) => l.runId === runId);
    const ndjson = rows
      .map((l) =>
        JSON.stringify({
          ts: l.id,
          level: l.status === 'failed' ? 'error' : 'info',
          runId: l.runId,
          nodeId: l.node,
          fields: { message: l.message },
        })
      )
      .join('\n');
    const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${runId}.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid #e5e7eb' }}>
        <div style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
          <strong>Studio · Graph</strong>
        </div>
        <div style={{ height: 'calc(100% - 41px)' }}>
          <FlowEditor />
        </div>
      </div>
      <div style={{ width: 420, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: 8,
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <div>
            <strong>Console</strong>
            <span style={{ marginLeft: 8, color: '#6b7280' }}>
              状态: {connStatus}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleRun}>运行</button>
            <button onClick={handleClear}>清空</button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <RunCenterPage logs={logs} onRetry={handleRetry} onDownload={handleDownload} />
        </div>
      </div>
    </div>
  );
};

export default StudioPage;
