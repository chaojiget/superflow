import { exportFlow, importFlow } from '../shared/storage';
import { logRun } from '../run-center';

declare const CodeMirror: any;

export interface NodePageOptions {
  exportButton: HTMLButtonElement;
  importInput: HTMLInputElement;
  codeArea: HTMLTextAreaElement;
  runButton: HTMLButtonElement;
  logPanel: HTMLElement;
}

export function setupNodePage(options: NodePageOptions): void {
  const { exportButton, importInput, codeArea, runButton, logPanel } = options;

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

/**
 * 节点管理页面的 Web Component。
 * 以 `<workflow-node>` 注册，开放 `code` 属性以及运行结果相关事件。
 */
export class NodePageElement extends HTMLElement {
  private exportButton: HTMLButtonElement;
  private importInput: HTMLInputElement;
  private codeArea: HTMLTextAreaElement;
  private runButton: HTMLButtonElement;
  private logPanel: HTMLElement;
  private _code = '';
  private version = Number(globalThis.localStorage.getItem('node:version') ?? '0');

  static get observedAttributes(): string[] {
    return ['code'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    this.exportButton = document.createElement('button');
    this.exportButton.textContent = '导出流程';

    this.importInput = document.createElement('input');
    this.importInput.type = 'file';

    this.codeArea = document.createElement('textarea');

    this.runButton = document.createElement('button');
    this.runButton.textContent = '运行';

    this.logPanel = document.createElement('div');

    shadow.append(
      this.exportButton,
      this.importInput,
      this.codeArea,
      this.runButton,
      this.logPanel,
    );
  }

  get code(): string {
    return this._code;
  }

  set code(value: string) {
    this._code = value;
    this.codeArea.value = value;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'code') {
      this.code = value ?? '';
    }
  }

  connectedCallback(): void {
    const stored = globalThis.localStorage.getItem('node:code');
    if (stored && !this._code) {
      this.code = stored;
    }
    this.exportButton.addEventListener('click', this.handleExport);
    this.importInput.addEventListener('change', this.handleImport);
    this.runButton.addEventListener('click', this.handleRun);
    this.codeArea.addEventListener('input', this.handleCodeChange);
  }

  disconnectedCallback(): void {
    this.exportButton.removeEventListener('click', this.handleExport);
    this.importInput.removeEventListener('change', this.handleImport);
    this.runButton.removeEventListener('click', this.handleRun);
    this.codeArea.removeEventListener('input', this.handleCodeChange);
  }

  private handleCodeChange = (): void => {
    this._code = this.codeArea.value;
    globalThis.localStorage.setItem('node:code', this._code);
    this.dispatchEvent(new CustomEvent('code-change', { detail: this._code }));
  };

  private handleRun = (): void => {
    this.logPanel.textContent = '';
    this.version += 1;
    globalThis.localStorage.setItem('node:version', String(this.version));

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
        const { level, data } = e.data;
        const div = document.createElement('div');
        div.textContent = `[${level}] ${data.join(' ')}`;
        this.logPanel.appendChild(div);
        this.dispatchEvent(new CustomEvent('run-log', { detail: { level, data } }));
      } else if (type === 'result') {
        const div = document.createElement('div');
        div.textContent = `[result] ${JSON.stringify(e.data.output)}`;
        this.logPanel.appendChild(div);
        this.dispatchEvent(new CustomEvent('run-success', { detail: e.data.output }));
        logRun({
          id: Date.now().toString(),
          input: '',
          output: JSON.stringify(e.data.output),
          status: 'success',
          duration: 0,
          createdAt: Date.now(),
          version: this.version,
        });
        worker.terminate();
      } else if (type === 'error') {
        const div = document.createElement('div');
        div.textContent = `[error] ${e.data.error}`;
        this.logPanel.appendChild(div);
        this.dispatchEvent(new CustomEvent('run-error', { detail: e.data.error }));
        worker.terminate();
      }
    };

    worker.postMessage({ code: this._code, input: undefined });
  };

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

customElements.define('workflow-node', NodePageElement);

export default NodePageElement;
