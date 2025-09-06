import * as Comlink from 'comlink';
import { capabilities } from './capabilities';
import type { ExecRequest, ExecEvent } from '../../../@core/protocol/src';

async function exec(request: ExecRequest): Promise<ExecEvent> {
  const fn = capabilities[request.capability];
  if (!fn) {
    return { type: 'error', error: new Error('capability not allowed') };
  }
  try {
    const value = await fn(...(request.args ?? []));
    return { type: 'result', value };
  } catch (error) {
    return { type: 'error', error };
  }
}

Comlink.expose({ exec });
