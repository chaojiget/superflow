import { executeNode } from './executeNode';
import { applyPatch } from './applyPatch';

/**
 * NodePage component with code editor, input sample, run button and log panel.
 */
export class NodePage {
  container: HTMLDivElement;
  editor: HTMLTextAreaElement;
  input: HTMLTextAreaElement;
  runButton: HTMLButtonElement;
  logPanel: HTMLPreElement;

  constructor() {
    this.container = document.createElement('div');

    this.editor = document.createElement('textarea');
    this.editor.placeholder = '在此编写 handler 函数';
    this.container.appendChild(this.editor);

    this.input = document.createElement('textarea');
    this.input.placeholder = '输入 JSON 示例';
    this.container.appendChild(this.input);

    this.runButton = document.createElement('button');
    this.runButton.textContent = '运行';
    this.runButton.addEventListener('click', () => {
      void this.run();
    });
    this.container.appendChild(this.runButton);

    this.logPanel = document.createElement('pre');
    this.container.appendChild(this.logPanel);
  }

  async run(): Promise<void> {
    this.logPanel.textContent = '';
    try {
      const inputValue = this.input.value ? JSON.parse(this.input.value) : null;
      const { output, logs } = await executeNode(this.editor.value, inputValue);
      const allLogs = [...logs, `output: ${JSON.stringify(output)}`];
      this.logPanel.textContent = allLogs.join('\n');
    } catch (err) {
      this.logPanel.textContent = String(err);
    }
  }

  async applyPatch(diff: string): Promise<void> {
    this.editor.value = await applyPatch(this.editor.value, diff);
  }
}
