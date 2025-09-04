import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { RunCenterPage, NodeLog } from '../RunCenterPage';
import { RunCenterService } from '../RunCenterService';
import { mockWebSocket } from '@/test/helpers/test-server';

const logs: NodeLog[] = [
  { id: '1', node: 'A', status: 'success', message: 'ok' },
  { id: '2', node: 'B', status: 'failed', message: 'oops', error: 'detail' },
  { id: '3', node: 'C', status: 'running', message: 'processing' },
  { id: '4', node: 'D', status: 'success', message: 'done' },
  { id: '5', node: 'E', status: 'success', message: 'done' },
  { id: '6', node: 'F', status: 'success', message: 'done' },
];

describe('RunCenterPage', () => {
  it('支持搜索和过滤日志', () => {
    render(<RunCenterPage logs={logs} />);

    const progress = screen.getByTestId('global-progress');
    expect(progress).toHaveAttribute('value', '4');
    expect(progress).toHaveAttribute('max', '6');

    const search = screen.getByPlaceholderText('搜索日志');
    fireEvent.change(search, { target: { value: 'B' } });
    expect(screen.getAllByTestId('log-item')).toHaveLength(1);
    expect(screen.getByText(/B/)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    const filter = screen.getByLabelText('filter');
    fireEvent.change(filter, { target: { value: 'failed' } });
    expect(screen.getAllByTestId('log-item')).toHaveLength(1);
    expect(screen.getByTestId('error-detail')).toHaveTextContent('detail');
  });

  it('支持分页和重新运行', () => {
    const retry = vi.fn();
    render(<RunCenterPage logs={logs} onRetry={retry} />);

    expect(screen.getAllByTestId('log-item')).toHaveLength(5);
    fireEvent.click(screen.getByText('下一页'));
    expect(screen.getAllByTestId('log-item')).toHaveLength(1);

    fireEvent.click(screen.getByText('重新运行'));
    expect(retry).toHaveBeenCalledWith('6');
  });

  it('在日志流入和状态变化时更新UI', async () => {
    const service = new RunCenterService();
    const run = await service.createRun('flow1');
    const OriginalWS = globalThis.WebSocket;
    mockWebSocket();

    const TestApp: React.FC = () => {
      const [logsState, setLogs] = React.useState<NodeLog[]>([]);
      const [status, setStatus] = React.useState('pending');

      React.useEffect(() => {
        const ws = new WebSocket('ws://localhost');
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === 'status') {
            setStatus(msg.status);
          } else if (msg.type === 'log') {
            const l = msg.log;
            setLogs((prev) => [
              ...prev,
              {
                id: l.id,
                node: l.nodeId || 'N',
                status: l.level === 'error' ? 'failed' : 'success',
                message: l.fields.message as string,
                ...(l.level === 'error'
                  ? { error: l.fields.message as string }
                  : {}),
              },
            ]);
          }
        };
        service.registerClient(run.id, ws as any);
      }, []);

      return (
        <div>
          <div data-testid="status">{status}</div>
          <RunCenterPage logs={logsState} />
        </div>
      );
    };

    try {
      render(<TestApp />);

      await act(async () => {
        await service.updateRunStatus(run.id, 'running');
        await service.addLog(run.id, {
          level: 'info',
          nodeId: 'A',
          chainId: run.id,
          fields: { message: 'started' },
        });
        await service.addLog(run.id, {
          level: 'error',
          nodeId: 'B',
          chainId: run.id,
          fields: { message: 'boom' },
        });
        await service.updateRunStatus(run.id, 'failed');
      });

      await waitFor(() => {
        expect(screen.getAllByTestId('log-item')).toHaveLength(2);
        expect(screen.getByTestId('status').textContent).toBe('failed');
        const progress = screen.getByTestId('global-progress');
        expect(progress).toHaveAttribute('value', '1');
        expect(progress).toHaveAttribute('max', '2');
      });
    } finally {
      globalThis.WebSocket = OriginalWS;
    }
  });
});
