import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  NodePageElement,
  setupNodePage,
  generateNodeCode,
  repairNodeCode,
} from '../NodePage';
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
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
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

interface EditorMock {
  value: string;
  setValue(v: string): void;
  getValue(): string;
  on?(): void;
}

describe('setupNodePage', () => {
  let editor: EditorMock;

  beforeEach(() => {
    editor = {
      value: '',
      setValue(v: string) {
        this.value = v;
      },
      getValue() {
        return this.value;
      },
      on() {},
    };
    interface GlobalWithCM {
      CodeMirror: { fromTextArea: () => EditorMock };
    }
    (globalThis as unknown as GlobalWithCM).CodeMirror = {
      fromTextArea: () => editor,
    };
    globalThis.localStorage.clear();
  });

  it('回滚到历史版本', () => {
    globalThis.localStorage.setItem('node:version', '2');
    globalThis.localStorage.setItem('node:code', 'code2');
    globalThis.localStorage.setItem(
      'node:versions',
      JSON.stringify([
        { id: 1, code: 'code1' },
        { id: 2, code: 'code2' },
      ])
    );

    const exportButton = document.createElement('button');
    const importInput = document.createElement('input');
    importInput.type = 'file';
    const codeArea = document.createElement('textarea');
    const runButton = document.createElement('button');
    const logPanel = document.createElement('div');
    const generateButton = document.createElement('button');
    const repairButton = document.createElement('button');
    const versionList = document.createElement('ul');

    setupNodePage({
      exportButton,
      importInput,
      codeArea,
      runButton,
      logPanel,
      generateButton,
      repairButton,
      versionList,
    });

    const rollbackBtn = versionList.querySelector(
      'li:nth-child(1) button:nth-of-type(2)'
    ) as HTMLButtonElement;
    rollbackBtn.click();

    expect(editor.getValue()).toBe('code1');
    expect(globalThis.localStorage.getItem('node:code')).toBe('code1');
    expect(globalThis.localStorage.getItem('node:version')).toBe('1');
  });

  it('查看和删除版本', () => {
    globalThis.localStorage.setItem('node:version', '2');
    globalThis.localStorage.setItem('node:code', 'code2');
    globalThis.localStorage.setItem(
      'node:versions',
      JSON.stringify([
        { id: 1, code: 'code1' },
        { id: 2, code: 'code2' },
      ])
    );

    const exportButton = document.createElement('button');
    const importInput = document.createElement('input');
    importInput.type = 'file';
    const codeArea = document.createElement('textarea');
    const runButton = document.createElement('button');
    const logPanel = document.createElement('div');
    const generateButton = document.createElement('button');
    const repairButton = document.createElement('button');
    const versionList = document.createElement('ul');

    setupNodePage({
      exportButton,
      importInput,
      codeArea,
      runButton,
      logPanel,
      generateButton,
      repairButton,
      versionList,
    });

    const viewBtn = versionList.querySelector(
      'li:nth-child(1) button:nth-of-type(1)'
    ) as HTMLButtonElement;
    viewBtn.click();
    expect(editor.getValue()).toBe('code1');

    const deleteBtn = versionList.querySelector(
      'li:nth-child(2) button:nth-of-type(3)'
    ) as HTMLButtonElement;
    deleteBtn.click();

    expect(versionList.querySelectorAll('li').length).toBe(1);
    expect(
      JSON.parse(globalThis.localStorage.getItem('node:versions') ?? '[]')
    ).toEqual([{ id: 1, code: 'code1' }]);
  });
});

describe.each([
  ['generateNodeCode', generateNodeCode, '生成节点代码'],
  ['repairNodeCode', repairNodeCode, '修复节点代码'],
])('%s', (_name, fn, label) => {
  let editor: EditorMock;
  beforeEach(() => {
    editor = {
      value: '',
      setValue(v: string) {
        this.value = v;
      },
      getValue() {
        return this.value;
      },
    };
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('成功时保存新版本', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 'new' }),
      })
    );

    const version = await fn(editor);
    expect(version).toBe(1);
    expect(globalThis.localStorage.getItem('node:version')).toBe('1');
    expect(globalThis.localStorage.getItem('node:code')).toBe('new');
    expect(globalThis.localStorage.getItem('node:code:v1')).toBe('new');
  });

  it('失败时返回旧版本并记录错误', async () => {
    globalThis.localStorage.setItem('node:version', '2');
    globalThis.localStorage.setItem('node:code', 'old');
    editor.value = 'old';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    );

    const version = await fn(editor);
    expect(version).toBe(2);
    expect(globalThis.localStorage.getItem('node:version')).toBe('2');
    expect(globalThis.localStorage.getItem('node:code')).toBe('old');
    expect(editor.getValue()).toBe('old');
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toBe(`${label}失败`);
  });

  it('解析失败时返回旧版本并记录错误', async () => {
    globalThis.localStorage.setItem('node:version', '2');
    globalThis.localStorage.setItem('node:code', 'old');
    editor.value = 'old';
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('bad json');
        },
      })
    );

    const version = await fn(editor);
    expect(version).toBe(2);
    expect(globalThis.localStorage.getItem('node:version')).toBe('2');
    expect(globalThis.localStorage.getItem('node:code')).toBe('old');
    expect(editor.getValue()).toBe('old');
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toBe(`${label}响应解析失败`);
  });
});
