import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FlowEditor } from '@/components';

vi.mock('reactflow', () => {
  const ReactFlow = ({
    children,
    nodes = [],
    nodeTypes = {},
  }: {
    children: React.ReactNode;
    nodes?: Array<{ id: string; type?: string; data?: unknown }>;
    nodeTypes?: Record<string, React.FC<{ id: string; data?: unknown }>>;
  }) => (
    <div data-testid="react-flow">
      {nodes.map((n) => {
        const Comp = nodeTypes[n.type || ''] as
          | React.FC<{ id: string; data?: unknown }>
          | undefined;
        return Comp ? <Comp key={n.id} id={n.id} data={n.data} /> : null;
      })}
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: ReactFlow,
    ReactFlow,
    Controls: () => <div />,
    Background: () => <div />,
    // minimal stubs for node components using handles
    Handle: ({ children }: { children?: React.ReactNode }) => (
      <span data-testid="handle">{children}</span>
    ),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
  };
});

describe('FlowEditor', () => {
  it('更新输入节点并显示预览结果', () => {
    render(<FlowEditor />);

    expect(screen.getByText('hello')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('输入'), {
      target: { value: 'world' },
    });

    expect(screen.getByText('world')).toBeInTheDocument();

    fireEvent.click(screen.getByText('预览'));

    expect(screen.getByText('结果: WORLD')).toBeInTheDocument();
  });
});
