import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';

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
  onFocusNode?: (nodeId: string) => void;
}

const PAGE_SIZE = 5;

export const RunCenterPage: React.FC<RunCenterPageProps> = ({
  logs,
  onRetry,
  onDownload,
  onFocusNode,
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
      <div className="flex items-center gap-2 py-2">
        <Input
          placeholder="搜索日志"
          aria-label="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-48"
        />
        <NativeSelect
          aria-label="filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
          className="w-32"
        >
          <option value="all">全部</option>
          <option value="success">成功</option>
          <option value="running">运行中</option>
          <option value="failed">失败</option>
        </NativeSelect>
      </div>
      <ul>
        {pageLogs.map((log) => (
          <li
            key={log.id}
            className={log.status === 'failed' ? 'failed' : ''}
            data-testid="log-item"
          >
            <span>
              [{log.runId ?? ''} {log.traceId ?? ''}]
              <Button
                className="border-0 bg-transparent p-0 h-auto underline text-blue-600"
                onClick={() => onFocusNode?.(log.node)}
                aria-label={`focus-${log.node}`}
              >
                {log.node}
              </Button>
              : {log.message}
            </span>
            {log.status === 'failed' && log.error && (
              <pre data-testid="error-detail">{log.error}</pre>
            )}
            <Button onClick={() => handleRetry(log.id)} className="ml-2">
              重新运行
            </Button>
            <Button
              onClick={() => log.runId && onDownload?.(log.runId)}
              disabled={!log.runId}
              data-testid="download-log"
              className="ml-2"
            >
              下载
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 py-2">
        <Button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          上一页
        </Button>
        <span>
          {page}/{totalPages}
        </span>
        <Button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          下一页
        </Button>
      </div>
    </div>
  );
};

export default RunCenterPage;
