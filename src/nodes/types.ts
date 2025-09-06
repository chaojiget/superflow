export interface Port {
  id: string;
  name: string;
  type: 'data' | 'control' | 'error';
  direction: 'input' | 'output';
  required: boolean;
}

export interface NodeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Port[];
  outputs: Port[];
  handler: (input: unknown) => Promise<unknown> | unknown;
  icon?: string;
  color?: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  output?: unknown;
  error?: string;
  timestamp: number;
}

export interface NodeDebugInfo {
  nodeId: string;
  nodeType: string;
  input: unknown;
  output?: unknown;
  error?: string;
  status: 'success' | 'error' | 'pending';
  executionTime?: number;
  timestamp: number;
  inputSchema?: unknown;
  outputSchema?: unknown;
  environment: Record<string, unknown>;
}

