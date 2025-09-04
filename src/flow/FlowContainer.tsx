/**
 * 流程容器组件
 * 封装 React Flow 实例并提供常用事件回调
 */
import React from 'react';
import type { FlowContainerProps } from './renderFlow.types';
import RenderFlow from './RenderFlow';

const FlowContainer: React.FC<FlowContainerProps> = ({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
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
}) => (
  <>
    <RenderFlow
      nodes={nodes}
      edges={edges}
      {...(nodeTypes ? { nodeTypes } : {})}
      {...(edgeTypes ? { edgeTypes } : {})}
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

export default FlowContainer;
