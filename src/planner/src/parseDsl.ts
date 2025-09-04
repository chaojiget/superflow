export interface ParseResult {
  blueprint: { nodes: any[]; edges: any[] } | null;
  warnings: string[];
  error?: string;
}

const idPattern = /^[A-Za-z0-9_-]+$/;

export function parseBlueprintDSL(dsl: string): ParseResult {
  let raw: any;
  try {
    raw = JSON.parse(dsl);
  } catch (e) {
    return {
      blueprint: null,
      warnings: [],
      error: `JSON 格式错误: ${(e as Error).message}`,
    };
  }

  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    return {
      blueprint: null,
      warnings: [],
      error: 'DSL 必须包含 nodes 和 edges 数组',
    };
  }

  const warnings: string[] = [];
  const nodeIds = new Set<string>();
  const nodes = raw.nodes.map((n: any) => {
    const id = String(n.id);
    if (!idPattern.test(id)) {
      return null;
    }
    nodeIds.add(id);
    return { id };
  }) as ({ id: string } | null)[];
  if (nodes.some((n) => n === null)) {
    return { blueprint: null, warnings: [], error: '节点 ID 语法错误' };
  }

  const edges: { id: string; source: string; target: string }[] = [];
  const adjacency = new Map<string, string[]>();
  for (const e of raw.edges) {
    if (
      typeof e.source !== 'string' ||
      typeof e.target !== 'string' ||
      !idPattern.test(e.source) ||
      !idPattern.test(e.target)
    ) {
      return {
        blueprint: null,
        warnings: [],
        error: `边 ${e.id ?? ''} 语法错误`,
      };
    }
    const id = e.id ? String(e.id) : `${e.source}-${e.target}`;
    edges.push({ id, source: e.source, target: e.target });
    const list = adjacency.get(e.source) ?? [];
    list.push(e.target);
    adjacency.set(e.source, list);
  }

  // 分支检测
  for (const [source, targets] of adjacency) {
    if (targets.length > 1) {
      warnings.push(`节点 ${source} 存在分支`);
    }
  }

  // 环检测与回退
  const cycleEdges = new Set<string>();
  const path = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string) {
    path.add(node);
    visited.add(node);
    const targets = adjacency.get(node) || [];
    for (const target of targets) {
      if (path.has(target)) {
        const edge = edges.find(
          (ed) => ed.source === node && ed.target === target
        );
        if (edge) {
          cycleEdges.add(edge.id);
          warnings.push(`检测到环: ${node} -> ${target}`);
        }
        continue;
      }
      if (!visited.has(target)) {
        dfs(target);
      }
    }
    path.delete(node);
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }

  let filteredEdges = edges;
  if (cycleEdges.size > 0) {
    warnings.push('已移除导致环的边');
    filteredEdges = edges.filter((e) => !cycleEdges.has(e.id));
  }

  const blueprint: { nodes: any[]; edges: any[] } = {
    nodes,
    edges: filteredEdges,
  };

  return { blueprint, warnings };
}
