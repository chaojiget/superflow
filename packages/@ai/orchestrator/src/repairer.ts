export interface FailureContext {
  code: string;
  logs: string[];
  input: unknown;
  output?: unknown;
}

export interface ASTPatch {
  code: string;
}

/**
 * 根据失败上下文生成 AST 补丁。
 */
export function repairFailure(ctx: FailureContext): ASTPatch {
  // 真实实现中应使用上下文生成补丁，此处返回占位符。
  return { code: ctx.code };
}
