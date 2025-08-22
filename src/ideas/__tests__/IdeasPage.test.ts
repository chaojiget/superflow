import { describe, it, expect, vi } from 'vitest';
import IdeasPageElement from '../IdeasPage';
import * as blueprint from '../generateBlueprint';

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
    expect(evt.detail.error).toBeNull();
    await nextTick();
    const canvas = el.shadowRoot!.querySelector('flow-canvas') as any;
    expect(canvas.blueprint.requirement).toBe('测试需求');
    document.body.removeChild(el);
  });

  it('generateBlueprint 抛错时提示错误且不渲染流程', async () => {
    vi.spyOn(blueprint, 'generateBlueprint').mockRejectedValue(new Error('err'));
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
    expect(evt.detail.error).toBeTruthy();
    await nextTick();
    const error = el.shadowRoot!.querySelector('.error') as HTMLDivElement;
    expect(error.style.display).toBe('block');
    const canvas = el.shadowRoot!.querySelector('flow-canvas') as HTMLElement;
    expect(canvas.style.display).toBe('none');
    document.body.removeChild(el);
    (blueprint.generateBlueprint as any).mockRestore();
  });

  it('generateBlueprint 返回空步骤时提示错误且不渲染流程', async () => {
    vi.spyOn(blueprint, 'generateBlueprint').mockResolvedValue({
      requirement: '测试需求',
      steps: [],
    });
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
    expect(evt.detail.error).toBeTruthy();
    await nextTick();
    const error = el.shadowRoot!.querySelector('.error') as HTMLDivElement;
    expect(error.style.display).toBe('block');
    const canvas = el.shadowRoot!.querySelector('flow-canvas') as HTMLElement;
    expect(canvas.style.display).toBe('none');
    document.body.removeChild(el);
    (blueprint.generateBlueprint as any).mockRestore();
  });
});
