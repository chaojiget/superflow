import type { Edge, Node } from 'reactflow';

export type Status =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cached';

export interface NodeMeta {
  status: Status;
  inputs: string[];
  outputs: string[];
  retry: number;
  timeoutSec: number;
  cacheKey: string;
  cpu: number;
  memoryGB: number;
  env: string[];
}

export const initialMeta: Record<string, NodeMeta> = {
  ingest: {
    status: 'cached',
    inputs: ['source_uri: str'],
    outputs: ['raw_path: str'],
    retry: 1,
    timeoutSec: 120,
    cacheKey: 'ingest:${source_uri}',
    cpu: 1,
    memoryGB: 2,
    env: ['python=3.11', 'pandas'],
  },
  clean: {
    status: 'success',
    inputs: ['raw_path: str'],
    outputs: ['clean_path: str'],
    retry: 1,
    timeoutSec: 180,
    cacheKey: 'clean:${raw_path}',
    cpu: 1,
    memoryGB: 4,
    env: ['python=3.11', 'pyarrow'],
  },
  feature: {
    status: 'running',
    inputs: ['clean_path: str'],
    outputs: ['features_path: str'],
    retry: 0,
    timeoutSec: 300,
    cacheKey: 'feat:${clean_path}',
    cpu: 2,
    memoryGB: 8,
    env: ['python=3.11', 'scikit-learn'],
  },
  train: {
    status: 'queued',
    inputs: ['features_path: str'],
    outputs: ['model_uri: str'],
    retry: 2,
    timeoutSec: 600,
    cacheKey: 'train:${features_path}',
    cpu: 4,
    memoryGB: 16,
    env: ['python=3.11', 'pytorch'],
  },
  eval: {
    status: 'skipped',
    inputs: ['model_uri: str'],
    outputs: ['metrics: json'],
    retry: 0,
    timeoutSec: 120,
    cacheKey: 'eval:${model_uri}',
    cpu: 1,
    memoryGB: 2,
    env: ['python=3.11'],
  },
};

export const initialNodes: Node[] = [
  {
    id: 'ingest',
    position: { x: 80, y: 120 },
    data: {
      label: 'ingest',
      status: initialMeta['ingest']!.status,
      meta: initialMeta['ingest']!,
    },
  },
  {
    id: 'clean',
    position: { x: 260, y: 120 },
    data: {
      label: 'clean',
      status: initialMeta['clean']!.status,
      meta: initialMeta['clean']!,
    },
  },
  {
    id: 'feature',
    position: { x: 440, y: 120 },
    data: {
      label: 'feature',
      status: initialMeta['feature']!.status,
      meta: initialMeta['feature']!,
    },
  },
  {
    id: 'train',
    position: { x: 620, y: 120 },
    data: {
      label: 'train',
      status: initialMeta['train']!.status,
      meta: initialMeta['train']!,
    },
  },
  {
    id: 'eval',
    position: { x: 800, y: 120 },
    data: {
      label: 'eval',
      status: initialMeta['eval']!.status,
      meta: initialMeta['eval']!,
    },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e1', source: 'ingest', target: 'clean' },
  { id: 'e2', source: 'clean', target: 'feature' },
  { id: 'e3', source: 'feature', target: 'train' },
  { id: 'e4', source: 'train', target: 'eval' },
];
