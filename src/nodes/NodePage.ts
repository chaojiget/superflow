import { exportFlow, importFlow } from '../shared/storage';
import { logRun } from '../run-center';

interface CodeMirrorInstance {
  fromTextArea(
    element: HTMLTextAreaElement,
    options: Record<string, unknown>
  ): {
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
  versionList: HTMLUListElement;
}

interface CodeVersion {
  id: number;
  code: string;
}

function saveVersion(code: string): number {
  const newVersion =
    Number(globalThis.localStorage.getItem('node:version') ?? '0') + 1;
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
    versionList,
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
  const versions: CodeVersion[] = (() => {
    try {
      const raw = globalThis.localStorage.getItem('node:versions');
      return raw ? (JSON.parse(raw) as CodeVersion[]) : [];
    } catch {
      return [];
    }
  })();

  function saveVersions(): void {
    try {
      globalThis.localStorage.setItem(
        'node:versions',
        JSON.stringify(versions)
      );
    } catch {
      // ignore
    }
  }

  function renderVersions(): void {
    versionList.innerHTML = '';
    versions.forEach((v) => {
      const li = document.createElement('li');
      li.textContent = `v${v.id}`;
      const viewBtn = document.createElement('button');
      viewBtn.textContent = '查看';
      viewBtn.addEventListener('click', () => {
        editor.setValue(v.code);
      });
      const rollbackBtn = document.createElement('button');
      rollbackBtn.textContent = '回滚';
      rollbackBtn.addEventListener('click', () => {
        editor.setValue(v.code);
        version = v.id;
        globalThis.localStorage.setItem('node:code', v.code);
        globalThis.localStorage.setItem('node:version', String(version));
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => {
        const idx = versions.findIndex((x) => x.id === v.id);
        if (idx >= 0) {
          versions.splice(idx, 1);
          saveVersions();
          renderVersions();
        }
      });
      li.append(viewBtn, rollbackBtn, deleteBtn);
      versionList.append(li);
    });
  }

  renderVersions();

  runButton.addEventListener('click', () => {
    logPanel.textContent = '';
    version += 1;
    globalThis.localStorage.setItem('node:version', String(version));
    versions.push({ id: version, code: editor.getValue() });
    saveVersions();
    renderVersions();

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
  const currentVersion = Number(
    globalThis.localStorage.getItem('node:version') ?? '0'
  );
  try {
    const res = await fetch('/api/node/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editor.getValue() }),
    });
    if (!res.ok) {
      console.error('生成节点代码失败', res.statusText);
      return currentVersion;
    }
    let data: any;
    try {
      data = await res.json();
    } catch (err) {
      console.error('生成节点代码响应解析失败', err);
      return currentVersion;
    }
    editor.setValue(data.code ?? '');
    return saveVersion(editor.getValue());
  } catch (err) {
    console.error('生成节点代码失败', err);
    return currentVersion;
  }
}

export async function repairNodeCode(editor: any): Promise<number> {
  const currentVersion = Number(
    globalThis.localStorage.getItem('node:version') ?? '0'
  );
  try {
    const res = await fetch('/api/node/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: editor.getValue() }),
    });
    if (!res.ok) {
      console.error('修复节点代码失败', res.statusText);
      return currentVersion;
    }
    let data: any;
    try {
      data = await res.json();
    } catch (err) {
      console.error('修复节点代码响应解析失败', err);
      return currentVersion;
    }
    editor.setValue(data.code ?? '');
    return saveVersion(editor.getValue());
  } catch (err) {
    console.error('修复节点代码失败', err);
    return currentVersion;
  }
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
  private version = Number(
    globalThis.localStorage.getItem('node:version') ?? '0'
  );

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
      this.logPanel
    );
  }

  get code(): string {
    return this._code;
  }

  set code(value: string) {
    this._code = value;
    this.codeArea.value = value;
  }

  attributeChangedCallback(
    name: string,
    _old: string | null,
    value: string | null
  ): void {
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
        this.dispatchEvent(
          new CustomEvent('run-log', { detail: { level, data } })
        );
      } else if (type === 'result') {
        const div = document.createElement('div');
        div.textContent = `[result] ${JSON.stringify(e.data.output)}`;
        this.logPanel.appendChild(div);
        this.dispatchEvent(
          new CustomEvent('run-success', { detail: e.data.output })
        );
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
        this.dispatchEvent(
          new CustomEvent('run-error', { detail: e.data.error })
        );
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
