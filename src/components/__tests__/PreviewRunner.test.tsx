import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreviewRunner from '@/components/PreviewRunner';
import type { Node } from 'reactflow';

describe('PreviewRunner', () => {
  it('执行预览并返回结果', () => {
    const nodes: Node[] = [
      {
        id: 'a',
        type: 'input',
        position: { x: 0, y: 0 },
        data: { value: 'abc' },
      },
      {
        id: 'b',
        type: 'transform',
        position: { x: 0, y: 0 },
        data: { operation: 'uppercase' },
      },
      { id: 'c', type: 'output', position: { x: 0, y: 0 }, data: {} },
    ];

    const handler = vi.fn();
    render(<PreviewRunner nodes={nodes} onResult={handler} />);
    fireEvent.click(screen.getByText('预览'));
    expect(handler).toHaveBeenCalledWith('ABC');
    expect(screen.getByRole('result').textContent).toBe('ABC');
  });
});
