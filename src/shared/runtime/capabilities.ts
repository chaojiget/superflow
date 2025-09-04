export const CAPABILITIES = ['fetch', 'kv', 'log', 'websocket'] as const;
export type Capability = (typeof CAPABILITIES)[number];
