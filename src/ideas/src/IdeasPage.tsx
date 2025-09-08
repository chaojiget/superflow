/**
 * Ideas 页面组件
 * 提供想法输入和蓝图生成的用户界面
 */

import React, { useState, useCallback } from 'react';
import { generateBlueprint } from './generateBlueprint';
import type { AnalysisConfig, Blueprint, IdeaHistory } from './types';
import { generateId } from '@/shared';

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
    <div className={`ideas-page ${className} min-h-full w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-6`}>
      <header className="ideas-header mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">想法转蓝图</h1>
        <p className="text-sm lg:text-base text-gray-600">描述您的想法，AI将为您生成结构化的流程蓝图</p>
      </header>

      <main className="ideas-main space-y-6">
        {/* 配置面板 - 响应式卡片 */}
        <section className="config-panel bg-white/80 backdrop-blur-sm rounded-xl p-4 lg:p-6 shadow-sm border border-white/20">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">生成配置</h3>
          <div className="config-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
              复杂度:
              <select
                value={config.complexity}
                onChange={(e) =>
                  handleConfigChange({ complexity: e.target.value as any })
                }
                disabled={readonly}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50"
              >
                <option value="simple">🟢 简单</option>
                <option value="medium">🟡 中等</option>
                <option value="complex">🔴 复杂</option>
              </select>
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={config.includeValidation}
                onChange={(e) =>
                  handleConfigChange({ includeValidation: e.target.checked })
                }
                disabled={readonly}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              🎯 包含验证节点
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={config.includeErrorHandling}
                onChange={(e) =>
                  handleConfigChange({ includeErrorHandling: e.target.checked })
                }
                disabled={readonly}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              🛡️ 包含错误处理
            </label>
          </div>
        </section>

        {/* 想法输入 - 响应式卡片 */}
        <section className="idea-input bg-white/80 backdrop-blur-sm rounded-xl p-4 lg:p-6 shadow-sm border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label htmlFor="idea-textarea" className="block text-sm lg:text-base font-medium text-gray-900 mb-2">
                💡 您的想法:
              </label>
              <textarea
                id="idea-textarea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="请描述您的想法，例如：
• 创建一个用户注册流程
• 实现文件上传和处理功能
• 构建数据分析报表系统"
                rows={6}
                disabled={isGenerating || readonly}
                className="idea-textarea w-full px-3 py-2 lg:px-4 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical transition-all duration-200 bg-white/50 text-sm lg:text-base"
              />
            </div>

            <div className="action-buttons flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isGenerating || !idea.trim() || readonly}
                className="generate-button px-4 py-2 lg:px-6 lg:py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm lg:text-base shadow-sm"
              >
                {isGenerating ? '🔄 生成中...' : '✨ 生成蓝图'}
              </button>

              {idea && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setIdea('')}
                  disabled={readonly}
                  className="clear-button px-4 py-2 lg:px-6 lg:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm lg:text-base"
                >
                  🗑️ 清空
                </button>
              )}
            </div>
          </form>

          {error && <div className="error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 text-sm lg:text-base">⚠️ {error}</div>}
        </section>

        {/* 蓝图预览 - 响应式卡片 */}
        {currentBlueprint && (
          <section className="blueprint-preview bg-white/80 backdrop-blur-sm rounded-xl p-4 lg:p-6 shadow-sm border border-white/20">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">🎨 生成的蓝图</h3>
            <div className="blueprint-summary bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
              <div className="summary-stats flex flex-wrap gap-4 text-sm lg:text-base">
                <span className="flex items-center gap-2">📊 {currentBlueprint.nodes.length} 个节点</span>
                <span className="flex items-center gap-2">🔗 {currentBlueprint.edges.length} 个连接</span>
                <span className="flex items-center gap-2">📅 {new Date(currentBlueprint.createdAt).toLocaleString()}</span>
              </div>
              <div className="blueprint-actions mt-4">
                <button
                  onClick={() => onBlueprintGenerated?.(currentBlueprint)}
                  className="use-blueprint-button px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 font-medium text-sm lg:text-base"
                >
                  📋 使用此蓝图
                </button>
              </div>
            </div>

            <div className="node-list">
              <h4 className="font-semibold text-gray-900 mb-3 text-base lg:text-lg">📝 节点列表:</h4>
              <ul className="space-y-2">
                {currentBlueprint.nodes.map((node, index) => (
                  <li key={node.id} className="node-item bg-gray-50 rounded-lg p-3 flex flex-wrap items-center gap-3">
                    <span className="node-order text-sm font-semibold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
                    <span className="node-name font-medium text-gray-900">{node.name}</span>
                    <span className="node-type px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">{node.kind}</span>
                    <span className="node-desc text-gray-600 text-sm flex-1 min-w-[200px]">{node.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 历史记录 - 响应式卡片 */}
        {history.length > 0 && (
          <section className="history-section bg-white/80 backdrop-blur-sm rounded-xl p-4 lg:p-6 shadow-sm border border-white/20">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">📚 历史记录</h3>
            <div className="history-list space-y-3">
              {history.map((item) => (
                <div key={item.id} className="history-item bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="history-content flex-1">
                    <div className="history-idea text-gray-900 font-medium mb-1">"{item.idea}"</div>
                    <div className="history-meta text-xs lg:text-sm text-gray-600 flex flex-wrap gap-3">
                      <span>⏰ {new Date(item.timestamp).toLocaleString()}</span>
                      <span>📊 {item.blueprint.nodes.length} 节点</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{item.config.complexity}</span>
                    </div>
                  </div>
                  <div className="history-actions flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRegenerate(item)}
                      disabled={readonly}
                      className="regenerate-button px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs lg:text-sm font-medium"
                    >
                      🔄 重新生成
                    </button>
                    <button
                      onClick={() => onBlueprintGenerated?.(item.blueprint)}
                      className="use-button px-3 py-1.5 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 text-xs lg:text-sm font-medium"
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
