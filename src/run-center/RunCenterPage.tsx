// 添加CSS样式注入
const runCenterStyles = `
  @keyframes progressGlow {
    0%, 100% {
      filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.7));
    }
  }
  
  .status-success {
    background: linear-gradient(135deg, #dcfae7 0%, #bbf7d0 100%);
    border: 1px solid #4ade80;
    box-shadow: 0 2px 8px rgba(74, 222, 128, 0.2);
  }
  
  .status-running {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border: 1px solid #60a5fa;
    box-shadow: 0 2px 8px rgba(96, 165, 250, 0.3);
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .status-failed {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border: 1px solid #f87171;
    box-shadow: 0 2px 8px rgba(248, 113, 113, 0.2);
  }
  
  .run-center-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }
`;

if (!document.head.querySelector('#run-center-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'run-center-styles';
  styleSheet.textContent = runCenterStyles;
  document.head.appendChild(styleSheet);
}

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
    <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 rounded-2xl shadow-xl min-h-full">
      {/* 头部进度区域 */}
      <div className="mb-6 animate-fadeInUp" style={{animationDuration: '0.5s'}}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            运行中心
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2 animate-progressGlow"></div>
          </h2>
          <div className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-md rounded-xl border border-white/30 shadow-lg">
            <div className="text-sm font-medium text-gray-700">整体进度</div>
            <div className="w-32 bg-gray-200 rounded-full h-3 shadow-inner overflow-hidden">
              <div 
                data-testid="global-progress"
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out animate-progressGlow"
                style={{
                  width: `${Math.round((logs.filter((l) => l.status === 'success').length / logs.length) * 100)}%`
                }}
                value={logs.filter((l) => l.status === 'success').length}
                max={logs.length}
              ></div>
            </div>
            <div className="text-sm font-semibold text-gray-700">
              {logs.filter((l) => l.status === 'success').length}/{logs.length}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="run-center-card rounded-xl p-4 text-center transform hover:-translate-y-1 transition-all duration-300">
            <div className="text-2xl font-bold text-green-600">{logs.filter(l => l.status === 'success').length}</div>
            <div className="text-sm text-gray-600">成功案例</div>
          </div>
          <div className="run-center-card rounded-xl p-4 text-center transform hover:-translate-y-1 transition-all duration-300">
            <div className="text-2xl font-bold text-blue-600">{logs.filter(l => l.status === 'running').length}</div>
            <div className="text-sm text-gray-600">进行中</div>
          </div>
          <div className="run-center-card rounded-xl p-4 text-center transform hover:-translate-y-1 transition-all duration-300">
            <div className="text-2xl font-bold text-red-600">{logs.filter(l => l.status === 'failed').length}</div>
            <div className="text-sm text-gray-600">失败案例</div>
          </div>
          <div className="run-center-card rounded-xl p-4 text-center transform hover:-translate-y-1 transition-all duration-300">
            <div className="text-2xl font-bold text-gray-700">{logs.length}</div>
            <div className="text-sm text-gray-600">总计</div>
          </div>
        </div>
      </div>
      {/* 搜索和过滤区域 */}
      <div className="flex items-center gap-4 mb-6 animate-fadeInUp" style={{animationDuration: '0.6s', animationDelay: '0.1s'}}>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          </div>
          <Input
            placeholder="搜索日志、节点、运行ID..."
            aria-label="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-md border border-white/30 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
          />
        </div>
        <NativeSelect
          aria-label="filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
          className="w-40 py-3 bg-white/80 backdrop-blur-md border border-white/30 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
        >
          <option value="all">🗂️ 全部状态</option>
          <option value="success">✅ 成功</option>
          <option value="running">⏳ 运行中</option>
          <option value="failed">❌ 失败</option>
        </NativeSelect>
      </div>
      {/* 日志列表区域 */}
      <div className="space-y-3 mb-6 animate-fadeInUp" style={{animationDuration: '0.7s', animationDelay: '0.2s'}}>
        {pageLogs.length === 0 && (
          <div className="text-center py-12 run-center-card rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full opacity-60"></div>
            </div>
            <div className="text-gray-600 text-lg">暂无运行记录</div>
            <div className="text-sm text-gray-500 mt-2">执行一些操作后这里会显示运行日志</div>
          </div>
        )}
        
        {pageLogs.map((log, index) => (
          <div 
            key={log.id}
            className={`run-center-card rounded-2xl p-4 border-l-4 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.01] ${
              log.status === 'success' ? 'status-success border-green-500' :
              log.status === 'running' ? 'status-running border-blue-500' :
              log.status === 'failed' ? 'status-failed border-red-500' : ''
            }`}
            style={{animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`}}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    log.status === 'success' ? 'bg-green-100' :
                    log.status === 'running' ? 'bg-blue-100 animate-spin' :
                    log.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {log.status === 'success' ? '✅' : log.status === 'running' ? '⏳' : log.status === 'failed' ? '❌' : '📝'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">
                      {log.runId ?? ''} {log.traceId ?? ''}
                    </span>
                    <Button
                      className="border-0 bg-transparent p-0 h-auto underline font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                      onClick={() => onFocusNode?.(log.node)}
                      aria-label={`focus-${log.node}`}
                    >
                      🎯 {log.node}
                    </Button>
                  </div>
                </div>
                <div className="text-gray-700 leading-relaxed font-medium">
                  {log.message}
                </div>
                {log.status === 'failed' && log.error && (
                  <pre className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 font-mono whitespace-pre-wrap">
                    {log.error}
                  </pre>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => handleRetry(log.id)} 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                >
                  🔄 重试
                </Button>
                <Button
                  onClick={() => log.runId && onDownload?.(log.runId)}
                  disabled={!log.runId}
                  data-testid="download-log"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⬇️ 下载
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* 分页区域 */}
      <div className="flex items-center justify-between bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/30 shadow-lg animate-fadeInUp" style={{animationDuration: '0.8s', animationDelay: '0.3s'}}>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            ← 上一页
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                    pageNum === page 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                      : 'bg-white/50 hover:bg-white text-gray-700 border border-white/30 shadow-sm hover:shadow-md'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            下一页 →
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">显示结果范围:</div>
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredLogs.length)}
          </div>
          <div className="text-sm text-gray-600">共 {filteredLogs.length} 条记录</div>
        </div>
      </div>
    </div>
  );
};

export default RunCenterPage;
