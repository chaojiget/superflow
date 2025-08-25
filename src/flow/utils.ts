import React from 'react';

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
