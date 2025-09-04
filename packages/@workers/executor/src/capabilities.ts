export type Capability = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * 允许远程调用的函数白名单。
 * 默认情况下为空，任何未列出的 capability 都会被拒绝。
 */
export const capabilities: Record<string, Capability> = {};
