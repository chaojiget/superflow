/**
 * Flow 渲染组件
 * 提供 React Flow 组件的渲染功能
 */

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  type BackgroundVariant,
} from 'reactflow';
import type {
  FlowRenderOptions,
  RenderFlowProps,
  FlowContainerProps,
  FlowToolbarProps,
  FlowStatusBarProps,
} from './renderFlow.types';
import 'reactflow/dist/style.css';
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
  readonly: false,
};

/**
 * 渲染流程组件
 */
export const RenderFlow: React.FC<RenderFlowProps> = ({
  nodes,
  edges,
  flowProps = {},
  ...options
}) => {
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
          <Background variant={config.backgroundVariant} gap={12} size={1} />
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
};

/**
 * Flow 容器组件
 */
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
      <RenderFlow
        nodes={nodes}
        edges={edges}
        {...options}
        flowProps={{
          ...(onNodesChange && { onNodesChange }),
          ...(onEdgesChange && { onEdgesChange }),
          ...(onConnect && { onConnect }),
          ...(onNodeClick && { onNodeClick }),
          ...(onNodeDoubleClick && { onNodeDoubleClick }),
          ...(onEdgeClick && { onEdgeClick }),
          ...(onSelectionChange && { onSelectionChange }),
          ...(onNodeDrag && { onNodeDrag }),
          ...(onNodeDragStart && { onNodeDragStart }),
          ...(onNodeDragStop && { onNodeDragStop }),
        }}
      />
      {children}
    </>
  );
};

/**
 * 流程工具栏组件
 */
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
  disabled = false,
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
          <button onClick={onCopy} disabled={disabled} title="复制">
            📋 复制
          </button>
        )}
        {onPaste && (
          <button onClick={onPaste} disabled={disabled} title="粘贴">
            📄 粘贴
          </button>
        )}
      </div>

      <div className="flow-toolbar-group">
        {onUndo && (
          <button onClick={onUndo} disabled={disabled} title="撤销">
            ↶ 撤销
          </button>
        )}
        {onRedo && (
          <button onClick={onRedo} disabled={disabled} title="重做">
            ↷ 重做
          </button>
        )}
      </div>

      <div className="flow-toolbar-group">
        {onFitView && (
          <button onClick={onFitView} disabled={disabled} title="适配视图">
            🎯 适配
          </button>
        )}
        {onZoomIn && (
          <button onClick={onZoomIn} disabled={disabled} title="放大">
            🔍+ 放大
          </button>
        )}
        {onZoomOut && (
          <button onClick={onZoomOut} disabled={disabled} title="缩小">
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
/**
 * 流程状态栏组件
 */
export const FlowStatusBar: React.FC<FlowStatusBarProps> = ({
  nodeCount,
  edgeCount,
  selectedCount,
  zoomLevel,
  readonly = false,
  className = '',
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

// 导出默认渲染组件
export default RenderFlow;
