import React from 'react';
import type { Node, Edge } from 'reactflow';
import ELK from 'elkjs/lib/elk.bundled.js';

/**
 * 创建自定义节点类型
 */
export function createCustomNodeType<P = unknown>(
  component: React.ComponentType<P>
): React.ComponentType<P> {
  return React.memo(component) as React.ComponentType<P>;
}

/**
 * 创建自定义边类型
 */
export function createCustomEdgeType<P = unknown>(
  component: React.ComponentType<P>
): React.ComponentType<P> {
  return React.memo(component) as React.ComponentType<P>;
}

/**
 * 基于 elkjs 的自动布局
 */
const elk = new ELK();
export async function autoLayout(
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const graph = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT' },
    children: nodes.map((n) => ({ id: n.id, width: 180, height: 60 })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(graph);
  const positioned = nodes.map((n) => {
    const ln = layout.children?.find((c) => c.id === n.id);
    return ln ? { ...n, position: { x: ln.x ?? 0, y: ln.y ?? 0 } } : n;
  });
  return { nodes: positioned, edges };
}

/**
 * 流程主题配置
 */
export interface FlowTheme {
  nodeBackground: string;
  nodeBorder: string;
  nodeText: string;
  edgeColor: string;
  edgeSelectedColor: string;
  backgroundColor: string;
  gridColor: string;
}

/**
 * 默认主题
 */
export const defaultTheme: FlowTheme = {
  nodeBackground: '#ffffff',
  nodeBorder: '#e2e8f0',
  nodeText: '#2d3748',
  edgeColor: '#cbd5e0',
  edgeSelectedColor: '#3182ce',
  backgroundColor: '#f7fafc',
  gridColor: '#e2e8f0',
};

/**
 * 暗色主题
 */
export const darkTheme: FlowTheme = {
  nodeBackground: '#2d3748',
  nodeBorder: '#4a5568',
  nodeText: '#e2e8f0',
  edgeColor: '#4a5568',
  edgeSelectedColor: '#63b3ed',
  backgroundColor: '#1a202c',
  gridColor: '#2d3748',
};

/**
 * 应用主题样式
 */
export function applyTheme(theme: FlowTheme): React.CSSProperties {
  return {
    '--flow-node-bg': theme.nodeBackground,
    '--flow-node-border': theme.nodeBorder,
    '--flow-node-text': theme.nodeText,
    '--flow-edge-color': theme.edgeColor,
    '--flow-edge-selected': theme.edgeSelectedColor,
    '--flow-bg': theme.backgroundColor,
    '--flow-grid': theme.gridColor,
  } as React.CSSProperties;
}
