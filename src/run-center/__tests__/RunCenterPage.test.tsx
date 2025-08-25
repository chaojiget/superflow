import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunCenterPage, NodeLog } from '../RunCenterPage';

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
});
