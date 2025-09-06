/**
 * 渲染流程组件
 * 负责在容器中渲染 React Flow 并根据配置展示控制组件
 */
import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  type BackgroundVariant,
  type NodeProps,
} from 'reactflow';
import type { RenderFlowProps, FlowRenderOptions } from './renderFlow.types';
import 'reactflow/dist/style.css';

const DEFAULT_OPTIONS: Required<FlowRenderOptions> = {
  showControls: true,
  showBackground: true,
  showMiniMap: true,
  backgroundVariant: 'dots' as BackgroundVariant,
  className: '',
  style: {},
  readonly: false,
};

const RenderFlow: React.FC<RenderFlowProps> = ({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  flowProps = {},
  ...options
}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const StatusNode: React.FC<NodeProps> = ({ data }) => {
    const [showError, setShowError] = React.useState(false);
    return (
      <div className={`status-node status-${data.runtimeStatus || 'idle'}`}>
        <div>{data.label}</div>
        {data.runtimeStatus === 'error' && data.lastError && (
          <div>
            <button
              type="button"
              data-testid="error-toggle"
              onClick={() => setShowError((v) => !v)}
            >
              !
            </button>
            {showError && (
              <div data-testid="error-detail">
                <span>{data.lastError}</span>
                <button type="button" onClick={() => setShowError(false)}>
                  ×
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
        nodeTypes={nodeTypes ?? { default: StatusNode }}
        edgeTypes={edgeTypes}
        {...flowProps}
      >
        {config.showControls && (
          <Controls showZoom showFitView showInteractive={!config.readonly} />
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

export default RenderFlow;
