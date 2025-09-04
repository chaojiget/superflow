import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyText } from './clipboard';

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // @ts-expect-error - restore clipboard
    delete navigator.clipboard;
    // @ts-expect-error - restore execCommand
    delete document.execCommand;
  });

  it('uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const result = await copyText('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result.success).toBe(true);
  });

  it('falls back to hidden input when native API fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('fail'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const execCommand = vi.fn().mockImplementation(() => {
      const temp = document.body.querySelector('input');
      expect(temp).not.toBeNull();
      return true;
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    const result = await copyText('text');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.body.querySelector('input')).toBeNull();
    expect(result.success).toBe(true);
  });

  it('returns error when execCommand fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('fail'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    const result = await copyText('text');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/手动复制/);
  });

  it('returns error when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined as any);

    const result = await copyText('text');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/环境不支持/);
  });

  it('returns error when document is undefined', async () => {
    vi.stubGlobal('document', undefined as any);

    const result = await copyText('text');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/环境不支持/);
  });
});
