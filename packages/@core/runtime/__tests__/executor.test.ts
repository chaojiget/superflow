import { describe, it, expect } from 'vitest';
import inputSchema from '@core/domain/schemas/exec-request.schema.json';
import outputSchema from '@core/domain/schemas/exec-result.schema.json';
import { createExecutor } from '@core/runtime';

describe('createExecutor', () => {
  const run = createExecutor({ input: inputSchema, output: outputSchema });

  it('通过合法数据', async () => {
    const result = await run(async (req) => ({ output: req.input }), {
      kind: 'EXEC',
      runId: '0123456789abcdefghijklmnop',
      nodeId: 'node-1',
      flowId: 'flow-1',
      code: 'return input',
      language: 'js',
      input: 1,
    });
    expect(result).toEqual({ output: 1 });
  });

  it('拒绝非法输入', async () => {
    await expect(
      run(async () => ({ output: 1 }), { invalid: true } as any)
    ).rejects.toThrow();
  });
});
