export interface FailureContext {
  runId: string;
  nodeId: string;
  error: unknown;
}

export interface ASTPatch {
  code: string;
  diff?: string;
}

export function repairFailure(ctx: FailureContext): ASTPatch {
  // Minimal stub implementation for integration branch
  const message =
    ctx.error instanceof Error ? ctx.error.message : String(ctx.error);
  return { code: `// patched for ${ctx.nodeId}\n// error: ${message}\n` };
}
