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
  let originalWorker: any;
  let workerInstance: any;
  let originalConsole: Record<string, any>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:url');
    revokeObjectURL = vi.fn();
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    global.URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL;

    originalWorker = global.Worker;
    global.Worker = vi
      .fn()
      .mockImplementation(() => {
        workerInstance = {
          onmessage: vi.fn(),
          postMessage: vi.fn(),
          terminate: vi.fn(),
        };
        return workerInstance;
      });

    originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreate;
    global.URL.revokeObjectURL = originalRevoke;
    global.Worker = originalWorker;
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  it('运行成功时触发 run-success 和 run-log', () => {
    const el = new NodePageElement();
    document.body.appendChild(el);
    const success = vi.fn();
    const log = vi.fn();
    el.addEventListener('run-success', success);
    el.addEventListener('run-log', log);

    const runButton = el.shadowRoot?.querySelectorAll('button')[1] as HTMLButtonElement;
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

    const runButton = el.shadowRoot?.querySelectorAll('button')[1] as HTMLButtonElement;
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
  let editor: any;

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
    (global as any).CodeMirror = {
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
});
