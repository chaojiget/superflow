/**
 * Flow 渲染函数
 * 提供 React Flow 组件的渲染功能
 */

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  type Node,
  type Edge,
  type ReactFlowProps,
  type BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';

/**
 * 流程渲染配置
 */
export interface FlowRenderOptions {
  showControls?: boolean;
  showBackground?: boolean;
  showMiniMap?: boolean;
  backgroundVariant?: BackgroundVariant;
  className?: string;
  style?: React.CSSProperties;
  readonly?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<FlowRenderOptions> = {
  showControls: true,
  showBackground: true,
  showMiniMap: true,
  backgroundVariant: 'dots' as BackgroundVariant,
  className: '',
  style: {},
  readonly: false
};

/**
 * 渲染流程组件
 */
export function renderFlow(
  nodes: Node[],
  edges: Edge[],
  options: FlowRenderOptions = {},
  flowProps: Partial<ReactFlowProps> = {}
): React.ReactElement {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (
    <div 
      className={`flow-container ${config.className}`}
      style={{ width: '100%', height: '100%', ...config.style }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={!config.readonly}
        nodesConnectable={!config.readonly}
        elementsSelectable={!config.readonly}
        {...flowProps}
      >
        {config.showControls && (
          <Controls 
            showZoom={true}
            showFitView={true}
            showInteractive={!config.readonly}
          />
        )}
        {config.showBackground && (
          <Background 
            variant={config.backgroundVariant}
            gap={12}
            size={1}
          />
        )}
        {config.showMiniMap && (
          <MiniMap
            nodeStrokeColor="#fff"
            nodeColor="#1a365d"
            nodeBorderRadius={2}
            position="bottom-right"
            pannable
            zoomable
          />
        )}
      </ReactFlow>
    </div>
  );
}

/**
 * Flow 容器组件
 */
export interface FlowContainerProps extends FlowRenderOptions {
  nodes: Node[];
  edges: Edge[];
  onNodesChange?: ReactFlowProps['onNodesChange'];
  onEdgesChange?: ReactFlowProps['onEdgesChange'];
  onConnect?: ReactFlowProps['onConnect'];
  onNodeClick?: ReactFlowProps['onNodeClick'];
  onNodeDoubleClick?: ReactFlowProps['onNodeDoubleClick'];
  onEdgeClick?: ReactFlowProps['onEdgeClick'];
  onSelectionChange?: ReactFlowProps['onSelectionChange'];
  onNodeDrag?: ReactFlowProps['onNodeDrag'];
  onNodeDragStart?: ReactFlowProps['onNodeDragStart'];
  onNodeDragStop?: ReactFlowProps['onNodeDragStop'];
  children?: React.ReactNode;
}

/**
 * 流程容器组件
 */
export const FlowContainer: React.FC<FlowContainerProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onSelectionChange,
  onNodeDrag,
  onNodeDragStart,
  onNodeDragStop,
  children,
  ...options
}) => {
  return (
    <>
      {renderFlow(nodes, edges, options, {
        ...(onNodesChange && { onNodesChange }),
        ...(onEdgesChange && { onEdgesChange }),
        ...(onConnect && { onConnect }),
        ...(onNodeClick && { onNodeClick }),
        ...(onNodeDoubleClick && { onNodeDoubleClick }),
        ...(onEdgeClick && { onEdgeClick }),
        ...(onSelectionChange && { onSelectionChange }),
        ...(onNodeDrag && { onNodeDrag }),
        ...(onNodeDragStart && { onNodeDragStart }),
        ...(onNodeDragStop && { onNodeDragStop })
      })}
      {children}
    </>
  );
};

/**
 * 创建自定义节点类型
 */
export function createCustomNodeType(
  component: React.ComponentType<any>
): React.ComponentType<any> {
  return React.memo(component);
}

/**
 * 创建自定义边类型
 */
export function createCustomEdgeType(
  component: React.ComponentType<any>
): React.ComponentType<any> {
  return React.memo(component);
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
  gridColor: '#e2e8f0'
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
  gridColor: '#2d3748'
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
    '--flow-grid': theme.gridColor
  } as React.CSSProperties;
}

/**
 * 流程工具栏组件
 */
export interface FlowToolbarProps {
  onAddNode?: (type: string) => void;
  onDeleteSelected?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleFullscreen?: () => void;
  disabled?: boolean;
}

/**
 * 流程工具栏组件
 */
export const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onAddNode,
  onDeleteSelected,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onFitView,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  disabled = false
}) => {
  return (
    <div className="flow-toolbar">
      <div className="flow-toolbar-group">
        {onAddNode && (
          <button
            onClick={() => onAddNode('default')}
            disabled={disabled}
            title="添加节点"
          >
            ➕ 节点
          </button>
        )}
        {onDeleteSelected && (
          <button
            onClick={onDeleteSelected}
            disabled={disabled}
            title="删除选中"
          >
            🗑️ 删除
          </button>
        )}
      </div>

      <div className="flow-toolbar-group">
        {onCopy && (
          <button
            onClick={onCopy}
            disabled={disabled}
            title="复制"
          >
            📋 复制
          </button>
        )}
        {onPaste && (
          <button
            onClick={onPaste}
            disabled={disabled}
            title="粘贴"
          >
            📄 粘贴
          </button>
        )}
      </div>

      <div className="flow-toolbar-group">
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={disabled}
            title="撤销"
          >
            ↶ 撤销
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            disabled={disabled}
            title="重做"
          >
            ↷ 重做
          </button>
        )}
      </div>

      <div className="flow-toolbar-group">
        {onFitView && (
          <button
            onClick={onFitView}
            disabled={disabled}
            title="适配视图"
          >
            🎯 适配
          </button>
        )}
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            disabled={disabled}
            title="放大"
          >
            🔍+ 放大
          </button>
        )}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            disabled={disabled}
            title="缩小"
          >
            🔍- 缩小
          </button>
        )}
      </div>

      {onToggleFullscreen && (
        <div className="flow-toolbar-group">
          <button
            onClick={onToggleFullscreen}
            disabled={disabled}
            title="全屏切换"
          >
            ⛶ 全屏
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * 流程状态栏组件
 */
export interface FlowStatusBarProps {
  nodeCount: number;
  edgeCount: number;
  selectedCount: number;
  zoomLevel: number;
  readonly?: boolean;
  className?: string;
}

/**
 * 流程状态栏组件
 */
export const FlowStatusBar: React.FC<FlowStatusBarProps> = ({
  nodeCount,
  edgeCount,
  selectedCount,
  zoomLevel,
  readonly = false,
  className = ''
}) => {
  return (
    <div className={`flow-status-bar ${className}`}>
      <span>节点: {nodeCount}</span>
      <span>连接: {edgeCount}</span>
      <span>选中: {selectedCount}</span>
      <span>缩放: {Math.round(zoomLevel * 100)}%</span>
      {readonly && <span className="readonly-indicator">只读模式</span>}
    </div>
  );
};

// 导出默认渲染函数
export default renderFlow;