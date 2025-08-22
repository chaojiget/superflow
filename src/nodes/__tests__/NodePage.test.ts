import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NodePageElement, setupNodePage } from '../NodePage';
import { importFlow } from '../../shared/storage';

vi.mock('../../shared/storage', () => ({
  exportFlow: vi.fn(() => 'mock-flow'),
  importFlow: vi.fn(() => ({ imported: true })),
}));

vi.mock('../../run-center', () => ({
  logRun: vi.fn(),
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
    document.body.innerHTML = '';
    globalThis.localStorage.clear();
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

describe('NodePageElement run events', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;
  let originalWorker: typeof Worker | undefined;
  let workerInstance!: {
    onmessage: (ev: { data: unknown }) => void;
    postMessage: (data: unknown) => void;
    terminate: () => void;
  };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:url');
    revokeObjectURL = vi.fn();
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    global.URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL;

    originalWorker = global.Worker;
    global.Worker = vi.fn().mockImplementation(() => {
      workerInstance = {
        onmessage: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn(),
      };
      return workerInstance as unknown as Worker;
    }) as unknown as typeof Worker;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreate;
    global.URL.revokeObjectURL = originalRevoke;
    global.Worker = originalWorker as typeof Worker;
    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    document.body.innerHTML = '';
    globalThis.localStorage.clear();
  });

  it('运行成功时触发 run-success 和 run-log', () => {
    const el = new NodePageElement();
    document.body.appendChild(el);
    const success = vi.fn();
    const log = vi.fn();
    el.addEventListener('run-success', success);
    el.addEventListener('run-log', log);

    const runButton = el.shadowRoot?.querySelectorAll(
      'button'
    )[1] as HTMLButtonElement;
    runButton.click();

    workerInstance.onmessage({
      data: { type: 'log', level: 'log', data: ['hello'] },
    });
    workerInstance.onmessage({ data: { type: 'result', output: 123 } });

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { level: 'log', data: ['hello'] } })
    );
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 123 })
    );

    const logPanel = el.shadowRoot?.querySelector('div') as HTMLDivElement;
    expect(logPanel.textContent).toContain('[log] hello');
    expect(logPanel.textContent).toContain('[result] 123');
  });

  it('运行出错时触发 run-error 和 run-log', () => {
    const el = new NodePageElement();
    document.body.appendChild(el);
    const error = vi.fn();
    const log = vi.fn();
    el.addEventListener('run-error', error);
    el.addEventListener('run-log', log);

    const runButton = el.shadowRoot?.querySelectorAll(
      'button'
    )[1] as HTMLButtonElement;
    runButton.click();

    workerInstance.onmessage({
      data: { type: 'log', level: 'log', data: ['hi'] },
    });
    workerInstance.onmessage({ data: { type: 'error', error: 'boom' } });

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { level: 'log', data: ['hi'] } })
    );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'boom' })
    );

    const logPanel = el.shadowRoot?.querySelector('div') as HTMLDivElement;
    expect(logPanel.textContent).toContain('[log] hi');
    expect(logPanel.textContent).toContain('[error] boom');
  });
});

describe('setupNodePage', () => {
  let editor: {
    value: string;
    setValue(v: string): void;
    getValue(): string;
    on(): void;
  };

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
    (globalThis as unknown as Record<string, unknown>).CodeMirror = {
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
