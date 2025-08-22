import { exportFlow, importFlow } from '../shared/storage';
import { logRun } from '../run-center';

interface CodeMirrorInstance {
  fromTextArea(element: HTMLTextAreaElement, options: Record<string, unknown>): {
    setValue: (value: string) => void;
    getValue: () => string;
    on: (event: string, callback: () => void) => void;
  };
}

declare const CodeMirror: CodeMirrorInstance;

export interface NodePageOptions {
  exportButton: HTMLButtonElement;
  importInput: HTMLInputElement;
  codeArea: HTMLTextAreaElement;
  runButton: HTMLButtonElement;
  logPanel: HTMLElement;
  generateButton: HTMLButtonElement;
  repairButton: HTMLButtonElement;
}

function saveVersion(code: string): number {
  const newVersion = Number(
    globalThis.localStorage.getItem('node:version') ?? '0'
  ) + 1;
  globalThis.localStorage.setItem('node:version', String(newVersion));
  globalThis.localStorage.setItem(`node:code:v${newVersion}`, code);
  return newVersion;
}

export function setupNodePage(options: NodePageOptions): void {
  const {
    exportButton,
    importInput,
    codeArea,
    runButton,
    logPanel,
    generateButton,
    repairButton,
  } = options;

  const editor = CodeMirror.fromTextArea(codeArea, {
    mode: 'javascript',
    lineNumbers: true,
  });

  const stored = globalThis.localStorage.getItem('node:code');
  if (stored) {
    editor.setValue(stored);
  }

  editor.on('change', () => {
    globalThis.localStorage.setItem('node:code', editor.getValue());
  });

  let version = Number(globalThis.localStorage.getItem('node:version') ?? '0');

  runButton.addEventListener('click', () => {
    logPanel.textContent = '';
    version += 1;
    globalThis.localStorage.setItem('node:version', String(version));

    const workerSrc = `
      self.onmessage = async (e) => {
        const { code, input } = e.data;
        ['log','info','warn','error'].forEach(level => {
          const orig = console[level];
          console[level] = (...args) => {
            self.postMessage({ type: 'log', level, data: args });
            orig.apply(console, args);
          };
        });
        try {
          const handler = new Function(code + '\nreturn handler;')();
          const output = await handler(input);
          self.postMessage({ type: 'result', output });
        } catch (err) {
          self.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
        }
      };
    `;

    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });

    worker.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'log') {
        const div = document.createElement('div');
        div.textContent = `[${e.data.level}] ${e.data.data.join(' ')}`;
        logPanel.appendChild(div);
      } else if (type === 'result') {
        const div = document.createElement('div');
        div.textContent = `[result] ${JSON.stringify(e.data.output)}`;
        logPanel.appendChild(div);
        logRun({
          id: Date.now().toString(),
          input: '',
          output: JSON.stringify(e.data.output),
          status: 'success',
          duration: 0,
          createdAt: Date.now(),
          version,
        });
        worker.terminate();
      } else if (type === 'error') {
        const div = document.createElement('div');
        div.textContent = `[error] ${e.data.error}`;
        logPanel.appendChild(div);
        worker.terminate();
      }
    };

    worker.postMessage({ code: editor.getValue(), input: undefined });
  });

  generateButton.addEventListener('click', async () => {
    version = await generateNodeCode(editor);
  });

  repairButton.addEventListener('click', async () => {
    version = await repairNodeCode(editor);
  });

  exportButton.addEventListener('click', () => {
    const data = exportFlow();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (file) {
      const text = await file.text();
      importFlow(text);
    }
    importInput.value = '';
  });
}

export async function generateNodeCode(editor: any): Promise<number> {
  try {
    const res = await fetch('/api/node/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editor.getValue() }),
    });
    const data = await res.json();
    editor.setValue(data.code ?? '');
    return saveVersion(editor.getValue());
  } catch (err) {
    console.error('生成节点代码失败', err);
    return Number(globalThis.localStorage.getItem('node:version') ?? '0');
  }
}

export async function repairNodeCode(editor: any): Promise<number> {
  try {
    const res = await fetch('/api/node/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editor.getValue() }),
    });
    const data = await res.json();
    editor.setValue(data.code ?? '');
    return saveVersion(editor.getValue());
  } catch (err) {
    console.error('修复节点代码失败', err);
    return Number(globalThis.localStorage.getItem('node:version') ?? '0');
  }
}

/**
 * 简单节点管理页面的 Web Component。
 * 暴露 `flow-export` 与 `flow-import` 两个事件。
 */
export class NodePageElement extends HTMLElement {
  private exportButton: HTMLButtonElement;
  private importInput: HTMLInputElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    this.exportButton = document.createElement('button');
    this.exportButton.textContent = '导出流程';

    this.importInput = document.createElement('input');
    this.importInput.type = 'file';

    shadow.append(this.exportButton, this.importInput);
  }

  connectedCallback(): void {
    this.exportButton.addEventListener('click', this.handleExport);
    this.importInput.addEventListener('change', this.handleImport);
  }

  disconnectedCallback(): void {
    this.exportButton.removeEventListener('click', this.handleExport);
    this.importInput.removeEventListener('change', this.handleImport);
  }

  private handleExport = (): void => {
    const data = exportFlow();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    URL.revokeObjectURL(url);
    this.dispatchEvent(new CustomEvent('flow-export', { detail: data }));
  };

  private handleImport = async (): Promise<void> => {
    const file = this.importInput.files?.[0];
    if (file) {
      const text = await file.text();
      const flow = importFlow(text);
      this.dispatchEvent(new CustomEvent('flow-import', { detail: flow }));
    }
    this.importInput.value = '';
  };
}

customElements.define('node-page', NodePageElement);

export default NodePageElement;
