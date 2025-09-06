import type { RuntimePort } from '../ports/runtime';

export const workerRuntime: RuntimePort = {
  async execute() {
    // 这里暂时使用空实现，后续可接入真实 Web Worker
  },
};
