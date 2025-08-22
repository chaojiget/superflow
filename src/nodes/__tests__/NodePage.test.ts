import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { setupNodePage } from '../NodePage';
import { exportFlow, importFlow } from '../../shared/storage';

vi.mock('../../shared/storage', () => ({
  exportFlow: vi.fn(),
  importFlow: vi.fn(),
}));

describe('setupNodePage', () => {
  let exportButton: HTMLButtonElement;
  let importInput: HTMLInputElement;

  beforeEach(() => {
    exportButton = document.createElement('button');
    importInput = document.createElement('input');
    importInput.type = 'file';
    vi.clearAllMocks();
  });

  it('点击导出按钮时应调用 exportFlow 并触发下载', () => {
    const url = 'blob:mock-url';
    const createObjectURL = vi.fn(() => url);
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    (URL as any).createObjectURL = createObjectURL;
    (URL as any).revokeObjectURL = revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    (exportFlow as Mock).mockReturnValue('{}');

    setupNodePage(exportButton, importInput);
    exportButton.click();

    expect(exportFlow).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
    expect(clickSpy).toHaveBeenCalled();

    (URL as any).createObjectURL = originalCreate;
    (URL as any).revokeObjectURL = originalRevoke;
    clickSpy.mockRestore();
  });

  it('选择文件后应读取内容并调用 importFlow', async () => {
    const fileContent = '{"b":2}';
    const file = {
      text: () => Promise.resolve(fileContent),
    } as unknown as File;
    const fileList = {
      0: file,
      length: 1,
      item: () => file,
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;
    Object.defineProperty(importInput, 'files', { value: fileList });

    setupNodePage(exportButton, importInput);
    importInput.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));

    expect(importFlow).toHaveBeenCalledWith(fileContent);
  });

  it('导入完成后应清空输入框', async () => {
    const file = {
      text: () => Promise.resolve('{}'),
    } as unknown as File;
    const fileList = {
      0: file,
      length: 1,
      item: () => file,
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;
    Object.defineProperty(importInput, 'files', { value: fileList });

    setupNodePage(exportButton, importInput);
    importInput.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));

    expect(importInput.value).toBe('');
  });

  it('未选择文件时不调用 importFlow', async () => {
    setupNodePage(exportButton, importInput);
    importInput.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));

    expect(importFlow).not.toHaveBeenCalled();
  });
});
