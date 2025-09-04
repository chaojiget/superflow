import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FlowCanvas } from '../FlowCanvas';
import RenderFlow from '../RenderFlow';

// Mock React Flow
vi.mock('reactflow', () => ({
  ReactFlow: ({
    children,
    nodes = [],
    nodeTypes = {},
  }: {
    children: React.ReactNode;
    nodes?: Array<{ id: string; type?: string; data?: { label?: string } }>;
    nodeTypes?: Record<string, React.FC<{ id: string; data?: unknown }>>;
  }) => (
    <div data-testid="react-flow">
      {nodes.map((n) => {
        const Fallback: React.FC<{ id: string; data?: { label?: string } }> = (
          props
        ) => <div>{props.data?.label}</div>;
        const Comp = nodeTypes[n.type || 'default'] ?? Fallback;
        return <Comp key={n.id} id={n.id} data={n.data} />;
      })}
      {children}
    </div>
  ),
  Controls: () => <div data-testid="flow-controls" />,
  Background: () => <div data-testid="flow-background" />,
  MiniMap: () => <div data-testid="flow-minimap" />,
}));

describe('Flow Module', () => {
  describe('FlowCanvas', () => {
    it('应该渲染流程画布', () => {
      const canvas = new FlowCanvas();
      expect(canvas).toBeInstanceOf(FlowCanvas);
    });

    it('应该处理节点操作', () => {
      const canvas = new FlowCanvas();
      expect(typeof canvas.addNode).toBe('function');
      expect(typeof canvas.deleteNode).toBe('function');
      expect(typeof canvas.updateNode).toBe('function');
    });

    it('应该处理边操作', () => {
      const canvas = new FlowCanvas();
      expect(typeof canvas.addEdge).toBe('function');
      expect(typeof canvas.deleteEdge).toBe('function');
    });

    it('应该更新节点运行状态', () => {
      const canvas = new FlowCanvas();
      const node = canvas.addNode({ position: { x: 0, y: 0 }, name: 'n1' });
      canvas.updateNodeRuntimeStatus(node.id, 'running');
      const first = canvas.getNodes()[0];
      if (!first) throw new Error('no node');
      let current = first;
      expect(current.data.runtimeStatus).toBe('running');
      canvas.updateNodeRuntimeStatus(node.id, 'error', 'boom');
      const again = canvas.getNodes()[0];
      if (!again) throw new Error('no node');
      current = again;
      expect(current.data.runtimeStatus).toBe('error');
      expect(current.data.lastError).toBe('boom');
    });
  });

  describe('renderFlow', () => {
    it('应该渲染流程组件', () => {
      const nodes = [
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
      ];
      const edges = [{ id: 'e1-2', source: '1', target: '2' }];

      render(<RenderFlow nodes={nodes} edges={edges} />);

      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('flow-controls')).toBeInTheDocument();
      expect(screen.getByTestId('flow-background')).toBeInTheDocument();
    });

    it('应该处理空节点数组', () => {
      render(<RenderFlow nodes={[]} edges={[]} />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('应该渲染错误信息并可关闭', async () => {
      const nodes = [
        {
          id: '1',
          type: 'default',
          position: { x: 0, y: 0 },
          data: {
            label: 'Node 1',
            runtimeStatus: 'error',
            lastError: 'failed',
          },
        },
      ];

      render(<RenderFlow nodes={nodes} edges={[]} />);
      const toggle = screen.getByTestId('error-toggle');
      await act(async () => {
        await userEvent.click(toggle);
      });
      expect(screen.getByTestId('error-detail')).toHaveTextContent('failed');
      const closeBtn = screen.getByText('×');
      await act(async () => {
        await userEvent.click(closeBtn);
      });
      expect(screen.queryByTestId('error-detail')).toBeNull();
    });
  });
});
