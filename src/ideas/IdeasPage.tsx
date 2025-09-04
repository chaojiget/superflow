/**
 * Ideas 页面组件
 * 提供想法输入和蓝图生成的用户界面
 */

import React, { useState, useCallback } from 'react';
import { generateBlueprint } from './generateBlueprint';
import type { AnalysisConfig, Blueprint, IdeaHistory } from './types';
import { generateId } from '@/shared/utils';

/**
 * Ideas 页面属性
 */
export interface IdeasPageProps {
  onBlueprintGenerated?: (blueprint: Blueprint) => void;
  onError?: (error: Error) => void;
  className?: string;
  readonly?: boolean;
}

/**
 * Ideas 页面状态
 */
interface IdeasPageState {
  idea: string;
  isGenerating: boolean;
  error: string | null;
  history: IdeaHistory[];
  config: AnalysisConfig;
  currentBlueprint: Blueprint | null;
}

/**
 * Ideas 页面类（用于测试兼容性）
 */
export class IdeasPage {
  private state: IdeasPageState = {
    idea: '',
    isGenerating: false,
    error: null,
    history: [],
    config: {
      language: 'zh',
      complexity: 'medium',
      includeValidation: true,
      includeErrorHandling: true,
    },
    currentBlueprint: null,
  };

  constructor(private props: IdeasPageProps = {}) {}

  /**
   * 处理表单提交
   */
  async handleSubmit(idea: string): Promise<Blueprint | null> {
    if (!idea || idea.trim().length === 0) {
      throw new Error('请输入您的想法');
    }

    if (this.props.readonly) {
      throw new Error('只读模式下无法生成蓝图');
    }

    this.state.isGenerating = true;
    this.state.error = null;

    try {
      const blueprint = await generateBlueprint(idea, this.state.config);

      // 添加到历史记录
      const historyItem: IdeaHistory = {
        id: generateId(),
        idea: idea.trim(),
        blueprint,
        timestamp: Date.now(),
        config: { ...this.state.config },
      };

      this.state.history.unshift(historyItem);
      this.state.currentBlueprint = blueprint;
      this.state.idea = '';

      // 触发回调
      this.props.onBlueprintGenerated?.(blueprint);

      return blueprint;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '生成蓝图时发生未知错误';
      this.state.error = errorMessage;

      const errorObj = new Error(errorMessage);
      this.props.onError?.(errorObj);

      throw errorObj;
    } finally {
      this.state.isGenerating = false;
    }
  }

  /**
   * 渲染页面（返回虚拟元素用于测试）
   */
  render(): { type: string; props: Record<string, unknown> } {
    return {
      type: 'div',
      props: {
        className: `ideas-page ${this.props.className || ''}`,
        children: [
          {
            type: 'header',
            props: {
              children: {
                type: 'h1',
                props: {
                  children: '想法转蓝图',
                },
              },
            },
          },
          {
            type: 'main',
            props: {
              children: [
                {
                  type: 'form',
                  props: {
                    onSubmit: this.handleSubmit.bind(this),
                    children: [
                      {
                        type: 'textarea',
                        props: {
                          value: this.state.idea,
                          placeholder:
                            '请描述您的想法，例如："创建一个用户注册流程"',
                          disabled:
                            this.state.isGenerating || this.props.readonly,
                        },
                      },
                      {
                        type: 'button',
                        props: {
                          type: 'submit',
                          disabled:
                            this.state.isGenerating ||
                            !this.state.idea.trim() ||
                            this.props.readonly,
                          children: this.state.isGenerating
                            ? '生成中...'
                            : '生成蓝图',
                        },
                      },
                    ],
                  },
                },
                this.state.error && {
                  type: 'div',
                  props: {
                    className: 'error-message',
                    children: this.state.error,
                  },
                },
                this.state.currentBlueprint && {
                  type: 'div',
                  props: {
                    className: 'blueprint-preview',
                    children: {
                      type: 'pre',
                      props: {
                        children: JSON.stringify(
                          this.state.currentBlueprint,
                          null,
                          2
                        ),
                      },
                    },
                  },
                },
              ].filter(Boolean),
            },
          },
        ],
      },
    };
  }

  /**
   * 获取当前状态
   */
  getState(): IdeasPageState {
    return { ...this.state };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<AnalysisConfig>): void {
    this.state.config = { ...this.state.config, ...config };
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.state.history = [];
  }

  /**
   * 获取历史记录
   */
  getHistory(): IdeaHistory[] {
    return [...this.state.history];
  }
}

/**
 * Ideas 页面 React 组件
 */
export const IdeasPageComponent: React.FC<IdeasPageProps> = ({
  onBlueprintGenerated,
  onError,
  className = '',
  readonly = false,
}) => {
  const [idea, setIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IdeaHistory[]>([]);
  const [config, setConfig] = useState<AnalysisConfig>({
    language: 'zh',
    complexity: 'medium',
    includeValidation: true,
    includeErrorHandling: true,
  });
  const [currentBlueprint, setCurrentBlueprint] = useState<Blueprint | null>(
    null
  );

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!idea || idea.trim().length === 0) {
        setError('请输入您的想法');
        return;
      }

      if (readonly) {
        setError('只读模式下无法生成蓝图');
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const blueprint = await generateBlueprint(idea, config);

        // 添加到历史记录
        const historyItem: IdeaHistory = {
          id: generateId(),
          idea: idea.trim(),
          blueprint,
          timestamp: Date.now(),
          config: { ...config },
        };

        setHistory((prev) => [historyItem, ...prev]);
        setCurrentBlueprint(blueprint);
        setIdea('');

        // 触发回调
        onBlueprintGenerated?.(blueprint);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '生成蓝图时发生未知错误';
        setError(errorMessage);

        const errorObj = new Error(errorMessage);
        onError?.(errorObj);
      } finally {
        setIsGenerating(false);
      }
    },
    [idea, config, readonly, onBlueprintGenerated, onError]
  );

  /**
   * 处理配置变更
   */
  const handleConfigChange = useCallback(
    (newConfig: Partial<AnalysisConfig>) => {
      setConfig((prev) => ({ ...prev, ...newConfig }));
    },
    []
  );

  /**
   * 从历史记录重新生成
   */
  const handleRegenerate = useCallback((historyItem: IdeaHistory) => {
    setIdea(historyItem.idea);
    setConfig(historyItem.config);
  }, []);

  return (
    <div className={`ideas-page ${className}`}>
      <header className="ideas-header">
        <h1>想法转蓝图</h1>
        <p>描述您的想法，AI将为您生成结构化的流程蓝图</p>
      </header>

      <main className="ideas-main">
        {/* 配置面板 */}
        <section className="config-panel">
          <h3>生成配置</h3>
          <div className="config-grid">
            <label>
              复杂度:
              <select
                value={config.complexity}
                onChange={(e) =>
                  handleConfigChange({ complexity: e.target.value as any })
                }
                disabled={readonly}
              >
                <option value="simple">简单</option>
                <option value="medium">中等</option>
                <option value="complex">复杂</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={config.includeValidation}
                onChange={(e) =>
                  handleConfigChange({ includeValidation: e.target.checked })
                }
                disabled={readonly}
              />
              包含验证节点
            </label>

            <label>
              <input
                type="checkbox"
                checked={config.includeErrorHandling}
                onChange={(e) =>
                  handleConfigChange({ includeErrorHandling: e.target.checked })
                }
                disabled={readonly}
              />
              包含错误处理
            </label>
          </div>
        </section>

        {/* 想法输入 */}
        <section className="idea-input">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="idea-textarea">您的想法:</label>
              <textarea
                id="idea-textarea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="请描述您的想法，例如：&#10;• 创建一个用户注册流程&#10;• 实现文件上传和处理功能&#10;• 构建数据分析报表系统"
                rows={6}
                disabled={isGenerating || readonly}
                className="idea-textarea"
              />
            </div>

            <div className="action-buttons">
              <button
                type="submit"
                disabled={isGenerating || !idea.trim() || readonly}
                className="generate-button"
              >
                {isGenerating ? '🔄 生成中...' : '✨ 生成蓝图'}
              </button>

              {idea && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setIdea('')}
                  className="clear-button"
                  disabled={readonly}
                >
                  🗑️ 清空
                </button>
              )}
            </div>
          </form>

          {error && <div className="error-message">⚠️ {error}</div>}
        </section>

        {/* 蓝图预览 */}
        {currentBlueprint && (
          <section className="blueprint-preview">
            <h3>生成的蓝图</h3>
            <div className="blueprint-summary">
              <div className="summary-stats">
                <span>📊 {currentBlueprint.nodes.length} 个节点</span>
                <span>🔗 {currentBlueprint.edges.length} 个连接</span>
                <span>
                  📅 {new Date(currentBlueprint.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="blueprint-actions">
                <button
                  onClick={() => onBlueprintGenerated?.(currentBlueprint)}
                  className="use-blueprint-button"
                >
                  📋 使用此蓝图
                </button>
              </div>
            </div>

            <div className="node-list">
              <h4>节点列表:</h4>
              <ul>
                {currentBlueprint.nodes.map((node, index) => (
                  <li key={node.id} className="node-item">
                    <span className="node-order">{index + 1}.</span>
                    <span className="node-name">{node.name}</span>
                    <span className="node-type">({node.kind})</span>
                    <span className="node-desc">{node.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 历史记录 */}
        {history.length > 0 && (
          <section className="history-section">
            <h3>历史记录</h3>
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-content">
                    <div className="history-idea">"{item.idea}"</div>
                    <div className="history-meta">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>{item.blueprint.nodes.length} 节点</span>
                    </div>
                  </div>
                  <div className="history-actions">
                    <button
                      onClick={() => handleRegenerate(item)}
                      disabled={readonly}
                      className="regenerate-button"
                    >
                      🔄 重新生成
                    </button>
                    <button
                      onClick={() => onBlueprintGenerated?.(item.blueprint)}
                      className="use-button"
                    >
                      📋 使用
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// 默认导出组件
export default IdeasPageComponent;
