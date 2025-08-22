const FLOW_KEY = 'superflow:flow';

export function saveFlow(
  flow: unknown,
  storage: Storage = globalThis.localStorage
): void {
  storage.setItem(FLOW_KEY, JSON.stringify(flow));
}

export function loadFlow<T = unknown>(
  storage: Storage = globalThis.localStorage
): T | null {
  const raw = storage.getItem(FLOW_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function exportFlow(storage: Storage = globalThis.localStorage): string {
  const flow = loadFlow(storage);
  return JSON.stringify(flow ?? {}, null, 2);
}

export function importFlow(
  json: string,
  storage: Storage = globalThis.localStorage
): unknown {
  try {
    const flow = JSON.parse(json);
    saveFlow(flow, storage);
    return flow;
  } catch {
    return null;
  }
}

export default { saveFlow, loadFlow, exportFlow, importFlow };
