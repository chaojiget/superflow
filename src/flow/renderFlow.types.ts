/**
 * Flow 渲染相关类型定义
 * 仅包含组件暴露的外部类型，避免在组件文件中导出非组件实体
 */

import type {
  ReactNode,
  CSSProperties,
  MouseEvent,
  MouseEventHandler,
} from 'react';
import type {
  Node,
  Edge,
  ReactFlowProps,
  BackgroundVariant,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeMouseHandler,
  EdgeMouseHandler,
  OnSelectionChangeFunc,
  NodeDragHandler,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';

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
  /** 自定义节点类型 */
  nodeTypes?: NodeTypes;
  /** 自定义边类型 */
  edgeTypes?: EdgeTypes;
  /** 透传给 ReactFlow 的属性 */
  flowProps?: Partial<ReactFlowProps>;
}

/**
 * FlowContainer 组件属性
 */
export interface FlowContainerProps extends FlowRenderOptions {
  nodes: Node[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  onNodeClick?: NodeMouseHandler;
  onNodeDoubleClick?: NodeMouseHandler;
  onEdgeClick?: EdgeMouseHandler;
  onSelectionChange?: OnSelectionChangeFunc;
  onNodeDrag?: NodeDragHandler;
  onNodeDragStart?: NodeDragHandler;
  onNodeDragStop?: NodeDragHandler;
  children?: ReactNode;
}

/**
 * FlowToolbar 组件属性
 */
export interface FlowToolbarProps {
  onAddNode?: (type: string, event: MouseEvent<HTMLButtonElement>) => void;
  onDeleteSelected?: MouseEventHandler<HTMLButtonElement>;
  onCopy?: MouseEventHandler<HTMLButtonElement>;
  onPaste?: MouseEventHandler<HTMLButtonElement>;
  onUndo?: MouseEventHandler<HTMLButtonElement>;
  onRedo?: MouseEventHandler<HTMLButtonElement>;
  onFitView?: MouseEventHandler<HTMLButtonElement>;
  onZoomIn?: MouseEventHandler<HTMLButtonElement>;
  onZoomOut?: MouseEventHandler<HTMLButtonElement>;
  onToggleFullscreen?: MouseEventHandler<HTMLButtonElement>;
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
