/**
 * 流程工具栏组件
 * 提供常用的流程编辑操作按钮
 */
import React from 'react';
import type { FlowToolbarProps } from './renderFlow.types';

const FlowToolbar: React.FC<FlowToolbarProps> = ({
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
}) => (
  <div className="flow-toolbar">
    <div className="flow-toolbar-group">
      {onAddNode && (
        <button
          onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
            onAddNode('default', e)
          }
          disabled={disabled}
          title="添加节点"
        >
          ➕ 节点
        </button>
      )}
      {onDeleteSelected && (
        <button onClick={onDeleteSelected} disabled={disabled} title="删除选中">
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

export default FlowToolbar;
