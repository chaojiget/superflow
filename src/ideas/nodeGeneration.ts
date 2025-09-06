import type { Blueprint } from './types';

export function createBlueprintFromAnalysis(
  analysis: any,
  _config: Record<string, unknown> = {}
): Blueprint {
  return { id: 'bp', nodes: analysis.nodes ?? [], edges: analysis.edges ?? [] };
}

