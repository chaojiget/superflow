import { z } from 'zod';
import { BaseEntity } from './base';
import { FlowNode, FlowEdge } from './node';

export const FlowStatusSchema = z.enum([
  'draft',
  'published',
  'archived',
  'running',
  'paused',
]);

export type FlowStatus = z.infer<typeof FlowStatusSchema>;

export interface Flow extends BaseEntity {
  name: string;
  description?: string;
  status: FlowStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  tags?: string[];
}

export interface FlowBlueprint {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  constraints: string[];
  estimatedNodes: number;
  complexity: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface DAGNode {
  id: string;
  nodeId: string;
  dependencies: string[];
  level: number;
}

export interface ExecutionPlan {
  flowId: string;
  nodes: DAGNode[];
  maxConcurrency: number;
  retryStrategy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
}
