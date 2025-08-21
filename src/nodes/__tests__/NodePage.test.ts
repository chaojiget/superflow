import { describe, it, expect } from 'vitest';
import { NodePage } from '../NodePage';

describe('NodePage', () => {
  it('渲染组件并能运行 handler', async () => {
    const page = new NodePage();
    document.body.appendChild(page.container);

    page.editor.value = `async function handler(input){ console.log('hello', input); return input + 1; }`;
    page.input.value = '1';

    page.runButton.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(page.logPanel.textContent).toContain('hello 1');
    expect(page.logPanel.textContent).toContain('output: 2');
  });
});
