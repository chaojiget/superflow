export interface RuntimePort {
  execute(flowId: string, input?: unknown): Promise<void>;
}
