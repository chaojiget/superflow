import { describe, it, expect } from 'vitest';
import IdeasPageElement from '../IdeasPage';

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('IdeasPageElement', () => {
  it('生成蓝图后派发事件并渲染流程', async () => {
    const el = new IdeasPageElement();
    document.body.appendChild(el);
    const textarea = el.shadowRoot!.querySelector('textarea')!;
    const button = el.shadowRoot!.querySelector('button')!;

    textarea.value = '测试需求';
    const eventPromise = new Promise<CustomEvent>((resolve) =>
      el.addEventListener(
        'blueprint-generated',
        (e) => resolve(e as CustomEvent),
        {
          once: true,
        }
      )
    );
    button.click();
    const evt = await eventPromise;
    expect(evt.detail.blueprint.requirement).toBe('测试需求');
    await nextTick();
    const canvas = el.shadowRoot!.querySelector('flow-canvas') as any;
    expect(canvas.blueprint.requirement).toBe('测试需求');
    document.body.removeChild(el);
  });
});
