import { describe, it, expect } from 'vitest';
import './index';

describe('<workflow-node>', () => {
  it('should run and emit logs', () => {
    const el = document.createElement('workflow-node') as any;
    document.body.appendChild(el);
    const logs: string[] = [];
    el.onLog((m: string) => logs.push(m));
    const result = el.run({ foo: 'bar' });
    expect(result).toEqual({ foo: 'bar' });
    expect(logs.length).toBe(1);
  });
});
