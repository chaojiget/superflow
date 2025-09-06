import { describe, it, expect } from 'vitest';
import { safeCopy } from '../src/safeCopy';

describe('safeCopy', () => {
  it('深拷贝对象', () => {
    const original = { nested: { value: 1 } };
    const copy = safeCopy(original);
    (copy.nested as { value: number }).value = 2;
    expect(original.nested.value).toBe(1);
  });
});
