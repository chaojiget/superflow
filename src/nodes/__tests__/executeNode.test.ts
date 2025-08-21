import { describe, it, expect } from 'vitest';
import { executeNode } from '../executeNode';

describe('executeNode', () => {
  it('运行 handler 并返回输出和日志', async () => {
    const code = `async function handler(input){ console.log('log', input); return input + 1; }`;
    const result = await executeNode(code, 1);
    expect(result.output).toBe(2);
    expect(result.logs).toEqual(['log 1']);
  });
});
