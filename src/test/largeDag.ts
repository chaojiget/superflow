export function createLargeDag(
  size = 100
): {
  nodes: Array<{ id: string; type?: string; data?: Record<string, unknown> }>;
  edges: Array<{ id: string; source: string; target: string; type?: string }>;
} {
  const nodes = Array.from({ length: size }, (_, i) => ({
    id: `n${i}`,
    type: 'default',
    data: { label: `n${i}` },
  }));
  const edges = Array.from({ length: size - 1 }, (_, i) => ({
    id: `e${i}`,
    source: `n${i}`,
    target: `n${i + 1}`,
    type: 'default',
  }));
  return { nodes, edges };
}

export const largeDag = createLargeDag(200);
