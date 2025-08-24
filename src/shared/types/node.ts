import { z } from 'zod';
import { VersionedEntity } from './base';

export const NodeKindSchema = z.enum([
  'input',
  'output',
  'transform',
  'http-request',
  'condition',
  'loop',
  'custom',
]);

export type NodeKind = z.infer<typeof NodeKindSchema>;

export const PortTypeSchema = z.enum(['data', 'control']);
export type PortType = z.infer<typeof PortTypeSchema>;

export const PortDirectionSchema = z.enum(['input', 'output']);
export type PortDirection = z.infer<typeof PortDirectionSchema>;

export interface Port {
  id: string;
  name: string;
  type: PortType;
  direction: PortDirection;
  dataType?: string;
  required?: boolean;
  description?: string;
}

export const NodeCapabilitySchema = z.enum([
  'concurrent',
  'idempotent',
  'cacheable',
  'retryable',
]);

export type NodeCapability = z.infer<typeof NodeCapabilitySchema>;

export interface NodeMetadata extends VersionedEntity {
  kind: NodeKind;
  name: string;
  description: string;
  inputs: Port[];
  outputs: Port[];
  capabilities: NodeCapability[];
  tags?: string[];
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface FlowNode extends NodeMetadata {
  position: NodePosition;
  data?: Record<string, unknown>;
  selected?: boolean;
  dragging?: boolean;
}

export const EdgeTypeSchema = z.enum(['data', 'control']);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: EdgeType;
  animated?: boolean;
  selected?: boolean;
}
