import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputNode, TransformNode, OutputNode } from '@/components/nodes';
import type { TransformNodeData } from '@/components/nodes';
import type { NodeProps } from 'reactflow';

describe('自定义节点', () => {
  const createProps = <T,>(data: T): NodeProps<T> => ({
    id: '1',
    type: 'custom',
    data,
    selected: false,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    dragging: false,
  });

  it('渲染 InputNode', () => {
    const props = createProps<{ label: string; value: string }>({
      label: '输入',
      value: 'a',
    });
    render(<InputNode {...props} />);
    expect(screen.getByText('输入')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('渲染 TransformNode', () => {
    const props = createProps<TransformNodeData>({
      label: '转换',
      operation: 'uppercase',
    });
    render(<TransformNode {...props} />);
    expect(screen.getByText('转换')).toBeInTheDocument();
    expect(screen.getByText('操作: uppercase')).toBeInTheDocument();
  });

  it('渲染 OutputNode', () => {
    const props = createProps({ label: '输出' });
    render(<OutputNode {...props} />);
    expect(screen.getByText('输出')).toBeInTheDocument();
  });
});
