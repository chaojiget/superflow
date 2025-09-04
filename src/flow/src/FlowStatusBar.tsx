/**
 * 流程状态栏组件
 * 展示当前流程的节点、边数量等信息
 */
import React from 'react';
import type { FlowStatusBarProps } from './renderFlow.types';

const FlowStatusBar: React.FC<FlowStatusBarProps> = ({
  nodeCount,
  edgeCount,
  selectedCount,
  zoomLevel,
  readonly = false,
  className = '',
}) => (
  <div className={`flow-status-bar ${className}`}>
    <span>节点: {nodeCount}</span>
    <span>连接: {edgeCount}</span>
    <span>选中: {selectedCount}</span>
    <span>缩放: {Math.round(zoomLevel * 100)}%</span>
    {readonly && <span className="readonly-indicator">只读模式</span>}
  </div>
);

export default FlowStatusBar;
