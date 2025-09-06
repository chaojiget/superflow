import * as Comlink from 'comlink';
import type { ExecRequest, ExecEvent } from '../protocol/src';

/**
 * 创建运行时客户端，通过 MessageChannel 将端口传递给 worker。
 */
export function createRunnerClient(worker: Worker) {
  const channel = new MessageChannel();
  worker.postMessage({ port: channel.port1 }, [channel.port1]);
  const remote = Comlink.wrap<{ exec(req: ExecRequest): Promise<ExecEvent> }>(
    channel.port2
  );
  return {
    exec: (req: ExecRequest) => remote.exec(req),
  };
}
