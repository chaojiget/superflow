import { describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/storage', () => ({
  exportFlow: vi.fn(() => 'mock-flow'),
  importFlow: vi.fn(() => ({ imported: true })),
}));

// Stub URL methods used in component
const createObjectURL = vi.fn(() => 'blob:url');
const revokeObjectURL = vi.fn();
global.URL.createObjectURL = createObjectURL as any;
global.URL.revokeObjectURL = revokeObjectURL as any;
(HTMLAnchorElement.prototype.click as any) = vi.fn();

import { NodePageElement } from '../NodePage';

vi.stubGlobal('CodeMirror', {
  fromTextArea: () => ({
    setValue: vi.fn(),
    getValue: vi.fn(() => ''),
    on: vi.fn(),
  }),
});

describe('NodePageElement', () => {
  it('dispatches flow-export event', () => {
    const el = new NodePageElement();
    document.body.appendChild(el);
    const handler = vi.fn();
    el.addEventListener('flow-export', handler);
    (el.shadowRoot?.querySelector('button') as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'mock-flow' })
    );
  });

  it('dispatches flow-import event', async () => {
    const el = new NodePageElement();
    document.body.appendChild(el);
    const handler = vi.fn();
    el.addEventListener('flow-import', handler);
    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    const file = { text: () => Promise.resolve('{}') } as unknown as File;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { imported: true } })
    );
  });
});
