import {
  repairFailure,
  type FailureContext,
  type ASTPatch,
} from '@ai/orchestrator';

export type PatchApplier = (code: string) => void;

/**
 * 接收失败上下文并应用补丁。
 */
export function handleFailure(
  ctx: FailureContext,
  apply: PatchApplier
): ASTPatch {
  const patch = repairFailure(ctx);
  apply(patch.code);
  return patch;
}
