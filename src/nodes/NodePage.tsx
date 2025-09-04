/**
 * Node Page 组件
 * 节点管理和调试页面
 */

declare global {
  // Node.js globals for browser compatibility
  var process:
    | {
        version?: string;
        platform?: string;
        env?: Record<string, string>;
        memoryUsage?: () => object;
      }
    | undefined;
}

import React, { useState, useCallback } from 'react';
import { generateId } from '@/shared/utils';
import { logger } from '@/utils/logger';
import type {
  NodeDefinition,
  NodeExecutionResult,
  NodeDebugInfo,
} from './types';

/**
 * 节点页面属性
 */
export interface NodePageProps {
  onNodeCreated?: (node: NodeDefinition) => void;
  onNodeUpdated?: (nodeId: string, updates: Partial<NodeDefinition>) => void;
  onNodeDeleted?: (nodeId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  readonly?: boolean;
}

/**
 * 节点页面状态
 */
interface NodePageState {
  registeredTypes: Map<string, NodeDefinition>;
  nodeStatuses: Map<string, string>;
  executions: Map<string, NodeExecutionResult>;
  errorHandlers: ((error: Error) => void)[];
}

/**
 * NodePage 类（用于测试兼容性）
 */
export class NodePage {
  private state: NodePageState = {
    registeredTypes: new Map(),
    nodeStatuses: new Map(),
    executions: new Map(),
    errorHandlers: [],
  };

  constructor(private props: NodePageProps = {}) {
    this.initializeBuiltinTypes();
  }

  /**
   * 初始化内置节点类型
   */
  private initializeBuiltinTypes(): void {
    // 测试节点（用于测试）
    this.registerNodeType({
      id: 'test-node',
      name: '测试节点',
      description: '用于测试的节点',
      category: 'test',
      inputs: [
        {
          id: 'input',
          name: '输入',
          type: 'data',
          direction: 'input',
          required: false,
        },
      ],
      outputs: [
        {
          id: 'output',
          name: '输出',
          type: 'data',
          direction: 'output',
          required: true,
        },
      ],
      handler: async (input) => ({ result: 'test', input }),
      icon: '🧪',
      color: '#9C27B0',
    });

    // 计时器测试节点
    this.registerNodeType({
      id: 'timer-test',
      name: '计时器测试节点',
      description: '用于测试执行时间的节点',
      category: 'test',
      inputs: [
        {
          id: 'input',
          name: '输入',
          type: 'data',
          direction: 'input',
          required: false,
        },
      ],
      outputs: [
        {
          id: 'output',
          name: '输出',
          type: 'data',
          direction: 'output',
          required: true,
        },
      ],
      handler: async (input) => {
        // 模拟一些处理时间
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { result: 'timer-test', input, timestamp: Date.now() };
      },
      icon: '⏱️',
      color: '#607D8B',
    });
    // 输入节点
    this.registerNodeType({
      id: 'input',
      name: '输入节点',
      description: '接收外部输入数据',
      category: 'io',
      inputs: [],
      outputs: [
        {
          id: 'output',
          name: '输出',
          type: 'data',
          direction: 'output',
          required: true,
        },
      ],
      handler: async (input) => input,
      icon: '📥',
      color: '#4CAF50',
    });

    // 输出节点
    this.registerNodeType({
      id: 'output',
      name: '输出节点',
      description: '输出处理结果',
      category: 'io',
      inputs: [
        {
          id: 'input',
          name: '输入',
          type: 'data',
          direction: 'input',
          required: true,
        },
      ],
      outputs: [],
      handler: async (input) => {
        logger.info('输出节点接收到数据', {
          event: 'node.output',
          input,
        });
        return input;
      },
      icon: '📤',
      color: '#FF9800',
    });

    // 转换节点
    this.registerNodeType({
      id: 'transform',
      name: '转换节点',
      description: '数据转换和处理',
      category: 'processing',
      inputs: [
        {
          id: 'input',
          name: '输入',
          type: 'data',
          direction: 'input',
          required: true,
        },
      ],
      outputs: [
        {
          id: 'output',
          name: '输出',
          type: 'data',
          direction: 'output',
          required: true,
        },
      ],
      handler: async (input) => {
        // 默认的数据转换逻辑
        if (typeof input === 'object' && input !== null) {
          return { ...input, processed: true, timestamp: Date.now() };
        }
        return { value: input, processed: true, timestamp: Date.now() };
      },
      icon: '🔄',
      color: '#2196F3',
    });
  }

  /**
   * 注册节点类型
   */
  registerNodeType(nodeType: NodeDefinition): void {
    this.state.registeredTypes.set(nodeType.id, nodeType);
  }

  /**
   * 获取已注册的节点类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.state.registeredTypes.keys());
  }

  /**
   * 获取节点类型定义
   */
  getNodeType(typeId: string): NodeDefinition | undefined {
    return this.state.registeredTypes.get(typeId);
  }

  /**
   * 创建节点
   */
  createNode(typeId: string, config?: Partial<NodeDefinition>): NodeDefinition {
    const nodeType = this.state.registeredTypes.get(typeId);
    if (!nodeType) {
      throw new Error(`未知的节点类型: ${typeId}`);
    }

    const node: NodeDefinition = {
      ...nodeType,
      id: generateId(),
      ...config,
    };

    this.props.onNodeCreated?.(node);
    return node;
  }

  /**
   * 更新节点
   */
  updateNode(nodeId: string, updates: Partial<NodeDefinition>): void {
    this.props.onNodeUpdated?.(nodeId, updates);
  }

  /**
   * 删除节点
   */
  deleteNode(nodeId: string): void {
    this.state.nodeStatuses.delete(nodeId);
    this.state.executions.delete(nodeId);
    this.props.onNodeDeleted?.(nodeId);
  }

  /**
   * 执行节点
   */
  async executeNode(nodeId: string, input: unknown): Promise<unknown> {
    try {
      // 查找节点类型
      const nodeType =
        this.findNodeTypeById(nodeId) || this.state.registeredTypes.get(nodeId);
      if (!nodeType) {
        throw new Error(`找不到节点: ${nodeId}`);
      }

      this.setNodeStatus(nodeId, 'running');
      const startTime = Date.now();

      // 执行节点处理函数
      const result = await nodeType.handler(input, {
        signal: new AbortController().signal,
        logger,
        env: (typeof process !== 'undefined' ? process.env : {}) as Record<
          string,
          string
        >,
      });

      const endTime = Date.now();
      const execution: NodeExecutionResult = {
        nodeId,
        input,
        output: result,
        startTime,
        endTime,
        duration: endTime - startTime,
        status: 'success',
        timestamp: Date.now(),
      };

      this.state.executions.set(nodeId, execution);
      this.setNodeStatus(nodeId, 'completed');

      return result;
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));

      const execution: NodeExecutionResult = {
        nodeId,
        input,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        status: 'error',
        error: errorObj.message,
        timestamp: Date.now(),
      };

      this.state.executions.set(nodeId, execution);
      this.setNodeStatus(nodeId, 'failed');
      this.handleError(errorObj);

      throw errorObj;
    }
  }

  /**
   * 调试节点
   */
  async debugNode(nodeId: string, input: unknown): Promise<NodeDebugInfo> {
    const nodeType =
      this.findNodeTypeById(nodeId) || this.state.registeredTypes.get(nodeId);
    if (!nodeType) {
      throw new Error(`找不到节点: ${nodeId}`);
    }

    const debugInfo: NodeDebugInfo = {
      nodeId,
      nodeType: nodeType.id,
      input,
      inputSchema: nodeType.inputSchema,
      outputSchema: nodeType.outputSchema,
      timestamp: Date.now(),
      environment: {
        nodeVersion:
          typeof process !== 'undefined' ? process.version : 'unknown',
        platform: typeof process !== 'undefined' ? process.platform : 'browser',
        memory:
          typeof process !== 'undefined' ? process.memoryUsage?.() || {} : {},
      },
      status: 'pending',
    };

    try {
      const startTime = performance.now();
      const output = await this.executeNode(nodeId, input);
      const endTime = performance.now();

      debugInfo.output = output;
      debugInfo.executionTime = endTime - startTime;
      debugInfo.status = 'success';
    } catch (error) {
      debugInfo.error = error instanceof Error ? error.message : String(error);
      debugInfo.status = 'error';
    }

    return debugInfo;
  }

  /**
   * 设置节点状态
   */
  setNodeStatus(nodeId: string, status: string): void {
    this.state.nodeStatuses.set(nodeId, status);
  }

  /**
   * 获取节点状态
   */
  getNodeStatus(nodeId: string): string | undefined {
    return this.state.nodeStatuses.get(nodeId);
  }

  /**
   * 获取最后一次执行结果
   */
  getLastExecution(nodeId: string): NodeExecutionResult | undefined {
    return this.state.executions.get(nodeId);
  }

  /**
   * 添加错误处理器
   */
  onError(handler: (error: Error) => void): void {
    this.state.errorHandlers.push(handler);
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    this.props.onError?.(error);
    this.state.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (handlerError) {
        logger.error(
          '错误处理器异常',
          {
            event: 'nodePage.handleError',
          },
          handlerError as Error
        );
      }
    });
  }

  /**
   * 根据ID查找节点类型
   */
  private findNodeTypeById(nodeId: string): NodeDefinition | undefined {
    // 这里可以实现更复杂的查找逻辑
    return this.state.registeredTypes.get(nodeId);
  }
}

/**
 * NodePage React 组件
 */
export const NodePageComponent: React.FC<NodePageProps> = ({
  onNodeCreated,
  onNodeUpdated,
  onNodeDeleted,
  onError,
  className = '',
  readonly = false,
}) => {
  const [selectedNodeType, setSelectedNodeType] = useState<string>('');
  const [debugInput, setDebugInput] = useState<string>('{}');
  const [debugResult, setDebugResult] = useState<NodeDebugInfo | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [nodePage] = useState(
    () =>
      new NodePage({
        ...(onNodeCreated && { onNodeCreated }),
        ...(onNodeUpdated && { onNodeUpdated }),
        ...(onNodeDeleted && { onNodeDeleted }),
        ...(onError && { onError }),
      })
  );

  /**
   * 处理节点调试
   */
  const handleDebugNode = useCallback(async () => {
    if (!selectedNodeType) {
      return;
    }

    setIsDebugging(true);
    setDebugResult(null);

    try {
      const input = JSON.parse(debugInput);
      const result = await nodePage.debugNode(selectedNodeType, input);
      setDebugResult(result);
    } catch (error) {
      const errorResult: NodeDebugInfo = {
        nodeId: selectedNodeType,
        nodeType: selectedNodeType,
        input: debugInput,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        environment: {},
      };
      setDebugResult(errorResult);
    } finally {
      setIsDebugging(false);
    }
  }, [selectedNodeType, debugInput, nodePage]);

  /**
   * 创建新节点
   */
  const handleCreateNode = useCallback(() => {
    if (!selectedNodeType || readonly) {
      return;
    }

    try {
      nodePage.createNode(selectedNodeType);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [selectedNodeType, readonly, nodePage, onError]);

  const registeredTypes = nodePage.getRegisteredTypes();

  return (
    <div className={`node-page ${className}`}>
      <header className="node-page-header">
        <h1>节点管理</h1>
        <p>管理和调试流程节点</p>
      </header>

      <main className="node-page-main">
        {/* 节点类型选择 */}
        <section className="node-type-selector">
          <h2>节点类型</h2>
          <div className="type-grid">
            {registeredTypes.map((typeId) => {
              const nodeType = nodePage.getNodeType(typeId);
              return (
                <div
                  key={typeId}
                  className={`type-card ${selectedNodeType === typeId ? 'selected' : ''}`}
                  onClick={() => setSelectedNodeType(typeId)}
                >
                  <div
                    className="type-icon"
                    style={{ backgroundColor: nodeType?.color }}
                  >
                    {nodeType?.icon || '🔧'}
                  </div>
                  <div className="type-info">
                    <h3>{nodeType?.name || typeId}</h3>
                    <p>{nodeType?.description || '无描述'}</p>
                    <span className="type-category">
                      {nodeType?.category || 'general'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 节点详情 */}
        {selectedNodeType && (
          <section className="node-details">
            <h2>节点详情</h2>
            {(() => {
              const nodeType = nodePage.getNodeType(selectedNodeType);
              if (!nodeType) return null;

              return (
                <div className="details-grid">
                  <div className="detail-section">
                    <h3>输入端口</h3>
                    <ul>
                      {nodeType.inputs.map((input) => (
                        <li key={input.id}>
                          <strong>{input.name}</strong> ({input.type})
                          {input.required && (
                            <span className="required">*</span>
                          )}
                          {input.description && <p>{input.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="detail-section">
                    <h3>输出端口</h3>
                    <ul>
                      {nodeType.outputs.map((output) => (
                        <li key={output.id}>
                          <strong>{output.name}</strong> ({output.type})
                          {output.description && <p>{output.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}

            {!readonly && (
              <div className="node-actions">
                <button
                  onClick={handleCreateNode}
                  className="create-node-button"
                >
                  ➕ 创建节点
                </button>
              </div>
            )}
          </section>
        )}

        {/* 节点调试 */}
        {selectedNodeType && (
          <section className="node-debug">
            <h2>节点调试</h2>
            <div className="debug-panel">
              <div className="debug-input">
                <label htmlFor="debug-input">调试输入 (JSON):</label>
                <textarea
                  id="debug-input"
                  value={debugInput}
                  onChange={(e) => setDebugInput(e.target.value)}
                  placeholder='{"example": "data"}'
                  rows={6}
                  disabled={isDebugging}
                />
                <button
                  onClick={handleDebugNode}
                  disabled={isDebugging || !selectedNodeType}
                  className="debug-button"
                >
                  {isDebugging ? '🔄 调试中...' : '🐛 开始调试'}
                </button>
              </div>

              {debugResult && (
                <div className="debug-result">
                  <h3>调试结果</h3>
                  <div className={`result-status ${debugResult.status}`}>
                    状态: {debugResult.status}
                  </div>

                  {debugResult.executionTime && (
                    <div className="execution-time">
                      执行时间: {debugResult.executionTime.toFixed(2)}ms
                    </div>
                  )}

                  {debugResult.error && (
                    <div className="error-message">
                      错误: {debugResult.error}
                    </div>
                  )}

                  {debugResult.output ? (
                    <div className="output-data">
                      <h4>输出数据:</h4>
                      <pre>
                        {String(JSON.stringify(debugResult.output, null, 2))}
                      </pre>
                    </div>
                  ) : null}

                  <div className="debug-metadata">
                    <h4>调试信息:</h4>
                    <pre>
                      {JSON.stringify(
                        {
                          nodeId: debugResult.nodeId,
                          nodeType: debugResult.nodeType,
                          timestamp: debugResult.timestamp,
                          environment: debugResult.environment,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// 默认导出组件
export default NodePageComponent;
