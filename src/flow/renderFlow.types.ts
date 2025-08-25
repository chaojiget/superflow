/**
 * Flow 渲染相关类型定义
 * 仅包含组件暴露的外部类型，避免在组件文件中导出非组件实体
 */

import type { ReactNode, CSSProperties } from 'react';
import type { Node, Edge, ReactFlowProps, BackgroundVariant } from 'reactflow';

/**
 * 流程渲染配置
 */
export interface FlowRenderOptions {
  /** 是否显示控制面板 */
  showControls?: boolean;
  /** 是否显示背景 */
  showBackground?: boolean;
  /** 是否显示迷你地图 */
  showMiniMap?: boolean;
  /** 背景样式 */
  backgroundVariant?: BackgroundVariant;
  /** 容器附加 class */
  className?: string;
  /** 容器内联样式 */
  style?: CSSProperties;
  /** 是否只读模式 */
  readonly?: boolean;
}

/**
 * RenderFlow 组件属性
 */
export interface RenderFlowProps extends FlowRenderOptions {
  /** 流程节点 */
  nodes: Node[];
  /** 流程边 */
  edges: Edge[];
  /** 透传给 ReactFlow 的属性 */
  flowProps?: Partial<ReactFlowProps>;
}

/**
 * FlowContainer 组件属性
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
  children?: ReactNode;
}

/**
 * FlowToolbar 组件属性
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
 * FlowStatusBar 组件属性
 */
export interface FlowStatusBarProps {
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 选中元素数量 */
  selectedCount: number;
  /** 当前缩放比例 */
  zoomLevel: number;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 附加 class */
  className?: string;
}
