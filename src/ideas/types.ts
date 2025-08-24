/**
 * Ideas 模块类型定义
 * 想法分析和蓝图生成相关类型
 */

import type { FlowNode, FlowEdge, NodeKind } from '@/shared/types';
import type { AnalysisConfig } from './generateBlueprint';

/**
 * 蓝图定义
 */
export interface Blueprint {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: {
    sourceIdea?: string;
    analysisResult?: IdeaAnalysis;
    generatedBy?: string;
    confidence?: number;
    [key: string]: unknown;
  };
  tags?: string[];
}

/**
 * 想法分析结果
 */
export interface IdeaAnalysis {
  originalIdea: string;
  keywords: string[];
  processType?: string;
  complexity: 'simple' | 'medium' | 'complex';
  steps: ProcessStep[];
  entities: string[];
  domain: string;
  language: string;
  confidence: number;
}

/**
 * 处理步骤
 */
export interface ProcessStep {
  type: NodeKind;
  name: string;
  description: string;
  order: number;
  tags?: string[];
  dependencies?: string[];
  optional?: boolean;
}

/**
 * 想法历史记录
 */
export interface IdeaHistory {
  id: string;
  idea: string;
  blueprint: Blueprint;
  timestamp: number;
  config: AnalysisConfig;
  feedback?: {
    rating: number;
    comments?: string;
    useful: boolean;
  };
}

/**
 * 想法模板
 */
export interface IdeaTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  placeholder: string;
  examples: string[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedNodes: number;
}

/**
 * 想法分类
 */
export interface IdeaCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  templates: IdeaTemplate[];
  examples: string[];
}

/**
 * 智能建议
 */
export interface SmartSuggestion {
  id: string;
  text: string;
  type: 'completion' | 'improvement' | 'alternative';
  confidence: number;
  reasoning: string;
  keywords: string[];
}

/**
 * 想法验证结果
 */
export interface IdeaValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: SmartSuggestion[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  estimatedNodes: number;
  estimatedTime: number; // 预估生成时间（毫秒）
}

/**
 * 验证问题
 */
export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
  position?: {
    start: number;
    end: number;
  };
}

/**
 * 蓝图生成选项
 */
export interface BlueprintGenerationOptions {
  analysis: AnalysisConfig;
  layout: LayoutOptions;
  naming: NamingOptions;
  optimization: OptimizationOptions;
}

/**
 * 布局选项
 */
export interface LayoutOptions {
  type: 'linear' | 'hierarchical' | 'grid' | 'circular';
  spacing: {
    x: number;
    y: number;
  };
  alignment: 'left' | 'center' | 'right';
  direction: 'horizontal' | 'vertical';
}

/**
 * 命名选项
 */
export interface NamingOptions {
  style: 'descriptive' | 'concise' | 'technical';
  language: 'zh' | 'en';
  includeNumbers: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * 优化选项
 */
export interface OptimizationOptions {
  mergeSimpleNodes: boolean;
  addParallelPaths: boolean;
  optimizeForPerformance: boolean;
  minimizeNodes: boolean;
  addMonitoring: boolean;
}

/**
 * 蓝图统计信息
 */
export interface BlueprintStatistics {
  nodeCount: number;
  edgeCount: number;
  depth: number;
  width: number;
  complexity: number;
  nodeTypes: Record<NodeKind, number>;
  estimatedExecutionTime: number;
  parallelPaths: number;
  criticalPath: string[];
}

/**
 * 想法导入配置
 */
export interface IdeaImportConfig {
  source: 'text' | 'file' | 'url' | 'clipboard';
  format: 'plain' | 'markdown' | 'json' | 'yaml';
  preprocessing: {
    cleanText: boolean;
    extractKeywords: boolean;
    splitSentences: boolean;
    removeStopWords: boolean;
  };
  batchProcessing: boolean;
  maxIdeas: number;
}

/**
 * 想法导出配置
 */
export interface IdeaExportConfig {
  format: 'json' | 'yaml' | 'markdown' | 'csv' | 'pdf';
  includeAnalysis: boolean;
  includeBlueprints: boolean;
  includeHistory: boolean;
  includeMetadata: boolean;
  compression: boolean;
}

/**
 * 协作想法
 */
export interface CollaborativeIdea {
  id: string;
  originalIdea: string;
  contributors: ContributorInfo[];
  versions: IdeaVersion[];
  currentVersion: string;
  mergedBlueprint?: Blueprint;
  comments: IdeaComment[];
  status: 'draft' | 'review' | 'approved' | 'implemented';
  createdAt: number;
  updatedAt: number;
}

/**
 * 贡献者信息
 */
export interface ContributorInfo {
  userId: string;
  name: string;
  role: 'creator' | 'contributor' | 'reviewer';
  contributions: string[];
  addedAt: number;
}

/**
 * 想法版本
 */
export interface IdeaVersion {
  id: string;
  version: string;
  idea: string;
  analysis?: IdeaAnalysis;
  blueprint?: Blueprint;
  authorId: string;
  changes: string[];
  createdAt: number;
  parentVersion?: string;
}

/**
 * 想法评论
 */
export interface IdeaComment {
  id: string;
  authorId: string;
  content: string;
  type: 'general' | 'suggestion' | 'issue' | 'approval';
  replyTo?: string;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 想法评分
 */
export interface IdeaRating {
  userId: string;
  ideaId: string;
  blueprintId?: string;
  scores: {
    clarity: number; // 1-5
    feasibility: number; // 1-5
    completeness: number; // 1-5
    innovation: number; // 1-5
    overall: number; // 1-5
  };
  comments?: string;
  createdAt: number;
}

/**
 * 想法推荐
 */
export interface IdeaRecommendation {
  id: string;
  targetUserId: string;
  recommendedIdea: IdeaTemplate | CollaborativeIdea;
  reason: string;
  confidence: number;
  category: string;
  source: 'similar_users' | 'trending' | 'content_based' | 'collaborative';
  metadata: Record<string, unknown>;
  createdAt: number;
  viewed: boolean;
  interacted: boolean;
}

/**
 * 想法搜索过滤器
 */
export interface IdeaSearchFilter {
  text?: string;
  category?: string[];
  tags?: string[];
  complexity?: ('simple' | 'medium' | 'complex')[];
  dateRange?: {
    start: number;
    end: number;
  };
  author?: string[];
  rating?: {
    min: number;
    max: number;
  };
  nodeCount?: {
    min: number;
    max: number;
  };
  hasBlueprint?: boolean;
  status?: ('draft' | 'review' | 'approved' | 'implemented')[];
}

/**
 * 想法搜索结果
 */
export interface IdeaSearchResult {
  items: (IdeaHistory | CollaborativeIdea)[];
  total: number;
  facets: {
    categories: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    authors: { name: string; count: number }[];
    complexity: { level: string; count: number }[];
  };
  suggestions: string[];
  searchTime: number;
}

/**
 * 想法分析配置
 */
export interface AdvancedAnalysisConfig extends AnalysisConfig {
  // NLP 设置
  nlp: {
    enabled: boolean;
    sentiment: boolean;
    entities: boolean;
    keywords: boolean;
    similarity: boolean;
  };
  
  // 领域特定设置
  domain: {
    type: string;
    customRules?: DomainRule[];
    vocabulary?: string[];
  };
  
  // 生成设置
  generation: {
    creativity: number; // 0-1
    optimization: 'speed' | 'quality' | 'balanced';
    iterations: number;
    alternatives: number;
  };
  
  // 验证设置
  validation: {
    strict: boolean;
    customRules?: ValidationRule[];
    autoFix: boolean;
  };
}

/**
 * 领域规则
 */
export interface DomainRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  action: 'suggest' | 'require' | 'forbid';
  replacement?: string;
  message: string;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  id: string;
  name: string;
  type: 'syntax' | 'semantic' | 'business';
  validator: (idea: string, analysis: IdeaAnalysis) => ValidationIssue[];
  autoFix?: (idea: string) => string;
}

/**
 * 想法性能指标
 */
export interface IdeaMetrics {
  analysisTime: number;
  generationTime: number;
  validationTime: number;
  totalTime: number;
  memoryUsage: number;
  cacheHits: number;
  cacheMisses: number;
  confidence: number;
  qualityScore: number;
}

// 导出常用的枚举类型
export type IdeaStatus = 'draft' | 'review' | 'approved' | 'implemented';
export type ContributorRole = 'creator' | 'contributor' | 'reviewer';
export type CommentType = 'general' | 'suggestion' | 'issue' | 'approval';
export type RecommendationSource = 'similar_users' | 'trending' | 'content_based' | 'collaborative';
export type ComplexityLevel = 'simple' | 'medium' | 'complex';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';