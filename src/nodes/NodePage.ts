import { exportFlow, importFlow } from '../shared/storage';
import { logRun } from '../run-center';

declare const CodeMirror: any;

/**
 * 简单节点管理页面的 Web Component。
 * 暴露 `flow-export` 与 `flow-import` 两个事件。
 */
export class NodePageElement extends HTMLElement {
  private exportButton: HTMLButtonElement;
  private importInput: HTMLInputElement;
  private codeArea: HTMLTextAreaElement;
  private runButton: HTMLButtonElement;
  private logPanel: HTMLDivElement;
  private editor: any;
  private version = 0;

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
      this.logPanel
    );
  }

  connectedCallback(): void {
    this.exportButton.addEventListener('click', this.handleExport);
    this.importInput.addEventListener('change', this.handleImport);
    this.runButton.addEventListener('click', this.handleRun);

    this.editor = CodeMirror.fromTextArea(this.codeArea, {
      mode: 'javascript',
      lineNumbers: true,
    });

    const stored = globalThis.localStorage.getItem('node:code');
    if (stored) {
      this.editor.setValue(stored);
    }

    this.editor.on('change', () => {
      globalThis.localStorage.setItem('node:code', this.editor.getValue());
    });

    this.version = Number(
      globalThis.localStorage.getItem('node:version') ?? '0'
    );
  }

  disconnectedCallback(): void {
    this.exportButton.removeEventListener('click', this.handleExport);
    this.importInput.removeEventListener('change', this.handleImport);
    this.runButton.removeEventListener('click', this.handleRun);
  }

  private handleRun = (): void => {
    this.logPanel.textContent = '';
    this.version += 1;
    globalThis.localStorage.setItem('node:version', String(this.version));

    const start = Date.now();

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
        this.logPanel.appendChild(div);
      } else if (type === 'result') {
        const div = document.createElement('div');
        div.textContent = `[result] ${JSON.stringify(e.data.output)}`;
        this.logPanel.appendChild(div);
        const duration = Date.now() - start;
        logRun({
          id: Date.now().toString(),
          input: '',
          output: JSON.stringify(e.data.output),
          status: 'success',
          duration,
          createdAt: Date.now(),
          version: this.version,
        });
        worker.terminate();
      } else if (type === 'error') {
        const div = document.createElement('div');
        div.textContent = `[error] ${e.data.error}`;
        this.logPanel.appendChild(div);
        const duration = Date.now() - start;
        logRun({
          id: Date.now().toString(),
          input: '',
          output: String(e.data.error),
          status: 'error',
          duration,
          createdAt: Date.now(),
          version: this.version,
        });
        worker.terminate();
      }
    };

    worker.postMessage({ code: this.editor.getValue(), input: undefined });
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
  };
}

customElements.define('node-page', NodePageElement);

export default NodePageElement;

