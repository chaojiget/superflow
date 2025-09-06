import React, { useState, useMemo, useCallback } from 'react';

export interface NodeLog {
  id: string;
  node: string;
  status: 'success' | 'running' | 'failed';
  message: string;
  error?: string;
  runId?: string;
  traceId?: string;
}

export interface RunCenterPageProps {
  logs: NodeLog[];
  onRetry?: (id: string) => void;
  onDownload?: (runId: string) => void;
}

const PAGE_SIZE = 5;

export const RunCenterPage: React.FC<RunCenterPageProps> = ({
  logs,
  onRetry,
  onDownload,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'success' | 'running' | 'failed'
  >('all');
  const [page, setPage] = useState(1);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => (filter === 'all' ? true : l.status === filter))
      .filter((l) => {
        const s = search.toLowerCase();
        return (
          l.node.toLowerCase().includes(s) ||
          l.message.toLowerCase().includes(s) ||
          l.runId?.toLowerCase().includes(s) ||
          l.traceId?.toLowerCase().includes(s)
        );
      });
  }, [logs, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRetry = useCallback(
    (id: string) => {
      onRetry?.(id);
    },
    [onRetry]
  );

  return (
    <div>
      <div data-testid="flow-canvas" />
      <div>
        <progress
          value={logs.filter((l) => l.status === 'success').length}
          max={logs.length}
          data-testid="global-progress"
        />
      </div>
      <div>
        <input
          placeholder="搜索日志"
          aria-label="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
        >
          <option value="all">全部</option>
          <option value="success">成功</option>
          <option value="running">运行中</option>
          <option value="failed">失败</option>
        </select>
      </div>
      <ul>
        {pageLogs.map((log) => (
          <li
            key={log.id}
            className={log.status === 'failed' ? 'failed' : ''}
            data-testid="log-item"
          >
            <span>
              [{log.runId ?? ''} {log.traceId ?? ''}] {log.node}: {log.message}
            </span>
            {log.status === 'failed' && log.error && (
              <pre data-testid="error-detail">{log.error}</pre>
            )}
            <button onClick={() => handleRetry(log.id)}>重新运行</button>
            <button
              onClick={() => log.runId && onDownload?.(log.runId)}
              disabled={!log.runId}
              data-testid="download-log"
            >
              下载
            </button>
          </li>
        ))}
      </ul>
      <div>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          上一页
        </button>
        <span>
          {page}/{totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          下一页
        </button>
      </div>
    </div>
  );
};

export default RunCenterPage;

