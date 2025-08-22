import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NodePageElement } from '../NodePage';
import { importFlow } from '../../shared/storage';

vi.mock('../../shared/storage', () => ({
  exportFlow: vi.fn(() => 'mock-flow'),
  importFlow: vi.fn(() => ({ imported: true })),
}));

describe('NodePageElement', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURL = vi.fn(() => 'blob:url');
    revokeObjectURL = vi.fn();
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    global.URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreate;
    global.URL.revokeObjectURL = originalRevoke;
    clickSpy.mockRestore();
  });

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

  it('dispatches flow-import event and clears input', async () => {
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
    expect(input.value).toBe('');
  });

  it('不选择文件时不调用 importFlow', async () => {
    const el = new NodePageElement();
    document.body.appendChild(el);
    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    expect(importFlow).not.toHaveBeenCalled();
  });
});
