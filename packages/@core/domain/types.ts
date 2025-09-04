import { z } from 'zod';

// 仅用于类型推断，契约以 JSON Schema 为准
export const ExecRequestSchema = z.object({
  kind: z.literal('EXEC'),
  runId: z.string().min(26).max(26),
  nodeId: z.string(),
  flowId: z.string(),
  code: z.string(),
  language: z.enum(['js', 'ts']),
  input: z.unknown(),
  controls: z
    .object({
      timeoutMs: z.number().int().positive().optional(),
      retries: z.number().int().nonnegative().optional(),
    })
    .optional(),
  env: z.record(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
});

export type ExecRequest = z.infer<typeof ExecRequestSchema>;
