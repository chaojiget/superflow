import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorPanel from '@/components/EditorPanel';

describe('EditorPanel', () => {
  it('触发 onChange', () => {
    const handler = vi.fn();
    render(<EditorPanel value="" onChange={handler} />);
    fireEvent.change(screen.getByLabelText('输入'), {
      target: { value: 'test' },
    });
    expect(handler).toHaveBeenCalledWith('test');
  });
});
