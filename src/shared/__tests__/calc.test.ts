import { describe, it, expect } from 'vitest';
import { add, divide, factorial } from '../calc';

describe('calc', () => {
  it('adds numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('divides numbers', () => {
    expect(divide(6, 3)).toBe(2);
  });

  it('throws on divide by zero', () => {
    expect(() => divide(1, 0)).toThrow(/division by zero/i);
  });

  it('calculates factorial', () => {
    expect(factorial(5)).toBe(120);
  });

  it('throws for negative factorial', () => {
    expect(() => factorial(-1)).toThrow(/negative/);
  });
});
