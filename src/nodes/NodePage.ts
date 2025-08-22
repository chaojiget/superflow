import { exportFlow, importFlow } from '../shared/storage';

export function setupNodePage(
  exportButton: HTMLButtonElement,
  importInput: HTMLInputElement
): void {
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
