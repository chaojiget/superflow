/**
 * 蓝图生成模块
 * 从想法/需求转换为结构化蓝图
 */

import { z } from 'zod';
import { generateId } from '@/shared/utils';
import type { FlowNode, FlowEdge, NodeKind, Port } from '@/shared/types';
import type { Blueprint, IdeaAnalysis, ProcessStep } from './types';

/**
 * 想法分析配置
 */
export interface AnalysisConfig {
  language?: 'zh' | 'en';
  complexity?: 'simple' | 'medium' | 'complex';
  domain?: string;
  includeValidation?: boolean;
  includeErrorHandling?: boolean;
}

/**
 * 默认分析配置
 */
const DEFAULT_CONFIG: Required<AnalysisConfig> = {
  language: 'zh',
  complexity: 'medium',
  domain: 'general',
  includeValidation: true,
  includeErrorHandling: true,
};

/**
 * 关键词到节点类型的映射
 */
const KEYWORD_TO_NODE_TYPE: Record<string, NodeKind> = {
  // 输入相关
  输入: 'input',
  接收: 'input',
  获取: 'input',
  读取: 'input',
  上传: 'input',

  // 输出相关
  输出: 'output',
  返回: 'output',
  发送: 'output',
  保存: 'output',
  显示: 'output',

  // 处理相关
  处理: 'transform',
  转换: 'transform',
  计算: 'transform',
  分析: 'transform',
  过滤: 'transform',

  // HTTP 相关
  请求: 'http-request',
  调用: 'http-request',
  API: 'http-request',
  接口: 'http-request',

  // 条件相关
  判断: 'condition',
  检查: 'condition',
  验证: 'condition',
  如果: 'condition',

  // 循环相关
  循环: 'loop',
  遍历: 'loop',
  重复: 'loop',
  批量: 'loop',
};

/**
 * 常见流程模式
 */
const COMMON_PATTERNS = {
  用户注册: [
    {
      type: 'input',
      name: '用户输入注册信息',
      description: '收集用户姓名、邮箱、密码等信息',
    },
    {
      type: 'condition',
      name: '验证输入格式',
      description: '检查邮箱格式、密码强度等',
    },
    {
      type: 'http-request',
      name: '检查邮箱是否已存在',
      description: '调用用户服务检查邮箱唯一性',
    },
    {
      type: 'condition',
      name: '判断邮箱可用性',
      description: '根据检查结果决定是否继续',
    },
    {
      type: 'transform',
      name: '加密密码',
      description: '对用户密码进行哈希加密',
    },
    {
      type: 'http-request',
      name: '创建用户账户',
      description: '调用用户服务创建新账户',
    },
    {
      type: 'http-request',
      name: '发送验证邮件',
      description: '发送邮箱验证链接',
    },
    {
      type: 'output',
      name: '返回注册结果',
      description: '提示用户注册成功，需要验证邮箱',
    },
  ],

  数据处理: [
    { type: 'input', name: '接收数据', description: '获取需要处理的原始数据' },
    {
      type: 'condition',
      name: '验证数据格式',
      description: '检查数据结构和必填字段',
    },
    {
      type: 'transform',
      name: '清洗数据',
      description: '去除无效数据，标准化格式',
    },
    {
      type: 'transform',
      name: '转换数据',
      description: '按照业务规则转换数据结构',
    },
    { type: 'output', name: '输出处理结果', description: '返回处理后的数据' },
  ],

  文件上传: [
    { type: 'input', name: '选择文件', description: '用户选择要上传的文件' },
    {
      type: 'condition',
      name: '验证文件',
      description: '检查文件类型、大小等限制',
    },
    {
      type: 'transform',
      name: '处理文件',
      description: '压缩、格式转换等预处理',
    },
    {
      type: 'http-request',
      name: '上传文件',
      description: '将文件上传到存储服务',
    },
    {
      type: 'output',
      name: '返回文件信息',
      description: '返回文件URL和元数据',
    },
  ],
};

/**
 * 分析想法内容
 */
export function analyzeIdea(
  idea: string,
  config: AnalysisConfig = {}
): IdeaAnalysis {
  const conf = { ...DEFAULT_CONFIG, ...config };

  if (!idea || idea.trim().length === 0) {
    throw new Error('想法内容不能为空');
  }

  const normalizedIdea = idea.toLowerCase().trim();

  // 提取关键词
  const keywords = extractKeywords(normalizedIdea);

  // 识别流程类型
  const processType = identifyProcessType(normalizedIdea);

  // 估算复杂度
  const complexity = estimateComplexity(normalizedIdea, keywords);

  // 提取步骤
  const steps = extractSteps(normalizedIdea, processType);

  // 识别实体
  const entities = extractEntities(normalizedIdea);

  return {
    originalIdea: idea,
    keywords,
    processType: processType ?? 'custom',
    complexity,
    steps,
    entities,
    domain: conf.domain,
    language: conf.language,
    confidence: calculateConfidence(keywords, steps, entities),
  };
}

/**
 * 从分析结果生成蓝图
 */
export function createBlueprintFromAnalysis(
  analysis: IdeaAnalysis,
  config: AnalysisConfig = {}
): Blueprint {
  const conf = { ...DEFAULT_CONFIG, ...config };

  // 使用预定义模式或自定义生成
  const steps =
    analysis.processType && analysis.processType in COMMON_PATTERNS
      ? COMMON_PATTERNS[analysis.processType as keyof typeof COMMON_PATTERNS]
      : generateCustomSteps(analysis);

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const nodeSpacing = 200;

  // 生成节点
  steps.forEach((step: any, index: number) => {
    const node: FlowNode = {
      id: generateId(),
      kind: step.type as NodeKind,
      name: step.name,
      description: step.description,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inputs: generatePortsForNodeType(step.type as NodeKind, 'input'),
      outputs: generatePortsForNodeType(step.type as NodeKind, 'output'),
      capabilities: getCapabilitiesForNodeType(step.type as NodeKind),
      position: {
        x: index * nodeSpacing,
        y: 0,
      },
      tags: step.tags || [],
    };

    nodes.push(node);

    // 创建边（连接到下一个节点）
    if (index < steps.length - 1) {
      const edge: FlowEdge = {
        id: generateId(),
        source: node.id,
        target: '', // 将在下一个节点创建后设置
        sourceHandle: node.outputs[0]?.id || 'output',
        targetHandle: '', // 将在下一个节点创建后设置
        type: 'data',
        animated: false,
      };
      edges.push(edge);
    }
  });

  // 设置边的目标节点
  edges.forEach((edge, index) => {
    if (index + 1 < nodes.length) {
      edge.target = nodes[index + 1]?.id || '';
      edge.targetHandle = nodes[index + 1]?.inputs[0]?.id || 'input';
    }
  });

  // 添加错误处理节点（如果启用）
  if (conf.includeErrorHandling) {
    addErrorHandlingNodes(nodes, edges);
  }

  // 添加验证节点（如果启用）
  if (conf.includeValidation) {
    addValidationNodes(nodes, edges);
  }

  return {
    id: generateId(),
    name: `${analysis.processType || '自定义流程'} - ${Date.now()}`,
    description: `基于想法"${analysis.originalIdea}"生成的蓝图`,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes,
    edges,
    metadata: {
      sourceIdea: analysis.originalIdea,
      analysisResult: analysis,
      generatedBy: 'AI助手',
      confidence: analysis.confidence,
    },
    tags: ['AI生成', analysis.processType || '自定义'].filter(Boolean),
  };
}

/**
 * 主要的蓝图生成函数
 */
export async function generateBlueprint(
  idea: string,
  config: AnalysisConfig = {}
): Promise<Blueprint> {
  if (!idea || idea.trim().length === 0) {
    throw new Error('想法内容不能为空');
  }

  try {
    // 分析想法
    const analysis = analyzeIdea(idea, config);

    // 生成蓝图
    const blueprint = createBlueprintFromAnalysis(analysis, config);

    // 验证蓝图
    validateBlueprint(blueprint);

    return blueprint;
  } catch (error) {
    throw new Error(
      `蓝图生成失败: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 提取关键词
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();

  // 从映射表中提取关键词
  Object.keys(KEYWORD_TO_NODE_TYPE).forEach((keyword) => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // 提取领域相关关键词
  const domainKeywords = [
    '用户',
    '注册',
    '登录',
    '认证',
    '权限',
    '数据',
    '文件',
    '上传',
    '下载',
    '处理',
    '邮件',
    '短信',
    '通知',
    '消息',
    '支付',
    '订单',
    '商品',
    '购物车',
    '报表',
    '统计',
    '分析',
    '导出',
  ];

  domainKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  return Array.from(keywords);
}

/**
 * 识别流程类型
 */
function identifyProcessType(text: string): string | undefined {
  const patterns = Object.keys(COMMON_PATTERNS);

  for (const pattern of patterns) {
    const patternKeywords = pattern.split('');
    if (patternKeywords.some((keyword) => text.includes(keyword))) {
      return pattern;
    }
  }

  return undefined;
}

/**
 * 估算复杂度
 */
function estimateComplexity(
  text: string,
  keywords: string[]
): 'simple' | 'medium' | 'complex' {
  const complexityIndicators = {
    simple: ['简单', '基础', '单一'],
    medium: ['处理', '验证', '转换'],
    complex: ['复杂', '系统', '完整', '集成', '多个', '批量'],
  };

  let complexityScore = 0;

  // 基于关键词数量
  complexityScore += keywords.length;

  // 基于文本长度
  if (text.length > 100) complexityScore += 2;
  if (text.length > 200) complexityScore += 3;

  // 基于复杂度指示词
  Object.entries(complexityIndicators).forEach(([level, indicators]) => {
    indicators.forEach((indicator) => {
      if (text.includes(indicator)) {
        if (level === 'complex') complexityScore += 3;
        else if (level === 'medium') complexityScore += 2;
        else complexityScore += 1;
      }
    });
  });

  if (complexityScore >= 8) return 'complex';
  if (complexityScore >= 4) return 'medium';
  return 'simple';
}

/**
 * 提取处理步骤
 */
function extractSteps(text: string, processType?: string): ProcessStep[] {
  // 如果是已知模式，直接使用
  if (processType && processType in COMMON_PATTERNS) {
    const pattern =
      COMMON_PATTERNS[processType as keyof typeof COMMON_PATTERNS];
    return pattern.map((step, index) => ({
      type: step.type as ProcessStep['type'],
      name: step.name,
      description: step.description,
      order: index,
    }));
  }

  // 自定义步骤提取
  const steps: ProcessStep[] = [];

  // 基于关键词生成基础步骤
  const keywords = extractKeywords(text);
  keywords.forEach((keyword, index) => {
    const nodeType = KEYWORD_TO_NODE_TYPE[keyword];
    if (nodeType) {
      steps.push({
        type: nodeType as ProcessStep['type'],
        name: `${keyword}节点`,
        description: `执行${keyword}相关操作`,
        order: index,
      });
    }
  });

  // 如果没有提取到步骤，提供默认流程
  if (steps.length === 0) {
    return [
      {
        type: 'input',
        name: '输入数据',
        description: '接收输入数据',
        order: 0,
      },
      {
        type: 'transform',
        name: '处理数据',
        description: '处理和转换数据',
        order: 1,
      },
      {
        type: 'output',
        name: '输出结果',
        description: '返回处理结果',
        order: 2,
      },
    ];
  }

  return steps;
}

/**
 * 提取实体
 */
function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // 常见实体模式
  const entityPatterns = [
    /用户|客户|账户|会员/g,
    /文件|图片|视频|文档/g,
    /订单|商品|产品|服务/g,
    /数据|信息|记录|报表/g,
    /邮件|消息|通知|短信/g,
  ];

  entityPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => entities.add(match));
    }
  });

  return Array.from(entities);
}

/**
 * 计算置信度
 */
function calculateConfidence(
  keywords: string[],
  steps: ProcessStep[],
  entities: string[]
): number {
  let confidence = 0.5; // 基础置信度

  // 基于关键词数量
  confidence += Math.min(keywords.length * 0.1, 0.3);

  // 基于步骤数量
  confidence += Math.min(steps.length * 0.05, 0.2);

  // 基于实体数量
  confidence += Math.min(entities.length * 0.05, 0.1);

  return Math.min(confidence, 1.0);
}

/**
 * 为节点类型生成端口
 */
function generatePortsForNodeType(
  nodeType: NodeKind,
  direction: 'input' | 'output'
): Port[] {
  const basePort: Omit<Port, 'id' | 'name'> = {
    type: 'data',
    direction,
    required: true,
  };

  if (direction === 'input') {
    switch (nodeType) {
      case 'input':
        return []; // 输入节点没有输入端口
      case 'output':
        return [{ ...basePort, id: 'input', name: '数据输入' }];
      default:
        return [{ ...basePort, id: 'input', name: '输入' }];
    }
  } else {
    switch (nodeType) {
      case 'output':
        return []; // 输出节点没有输出端口
      case 'condition':
        return [
          { ...basePort, id: 'true', name: '条件为真', direction },
          { ...basePort, id: 'false', name: '条件为假', direction },
        ];
      default:
        return [{ ...basePort, id: 'output', name: '输出' }];
    }
  }
}

/**
 * 获取节点类型的能力
 */
function getCapabilitiesForNodeType(
  nodeType: NodeKind
): import('@/shared/types').NodeCapability[] {
  switch (nodeType) {
    case 'input':
    case 'output':
      return ['idempotent'];
    case 'transform':
      return ['concurrent', 'idempotent', 'cacheable'];
    case 'http-request':
      return ['retryable'];
    case 'condition':
      return ['idempotent', 'cacheable'];
    case 'loop':
      return ['retryable'];
    default:
      return [];
  }
}

/**
 * 生成自定义步骤
 */
function generateCustomSteps(analysis: IdeaAnalysis): ProcessStep[] {
  return analysis.steps;
}

/**
 * 添加错误处理节点
 */
function addErrorHandlingNodes(nodes: FlowNode[], edges: FlowEdge[]): void {
  // 为每个可能出错的节点添加错误处理分支
  const errorProneTypes: NodeKind[] = ['http-request', 'transform'];

  nodes.forEach((node) => {
    if (errorProneTypes.includes(node.kind)) {
      // 添加错误处理节点
      const errorNode: FlowNode = {
        id: generateId(),
        kind: 'transform',
        name: `${node.name} - 错误处理`,
        description: `处理${node.name}节点的错误情况`,
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        inputs: [
          {
            id: 'error',
            name: '错误信息',
            type: 'data',
            direction: 'input',
            required: true,
          },
        ],
        outputs: [
          {
            id: 'handled',
            name: '处理结果',
            type: 'data',
            direction: 'output',
          },
        ],
        capabilities: ['idempotent'],
        position: {
          x: node.position.x,
          y: node.position.y + 150,
        },
        tags: ['错误处理'],
      };

      nodes.push(errorNode);

      // 添加错误处理边
      const errorEdge: FlowEdge = {
        id: generateId(),
        source: node.id,
        target: errorNode.id,
        sourceHandle: 'error',
        targetHandle: 'error',
        type: 'control',
        animated: true,
      };

      edges.push(errorEdge);
    }
  });
}

/**
 * 添加验证节点
 */
function addValidationNodes(nodes: FlowNode[], edges: FlowEdge[]): void {
  // 在输入节点后添加验证节点
  const inputNodes = nodes.filter((node) => node.kind === 'input');

  inputNodes.forEach((inputNode) => {
    const validationNode: FlowNode = {
      id: generateId(),
      kind: 'condition',
      name: `${inputNode.name} - 验证`,
      description: `验证${inputNode.name}的输入数据`,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inputs: [
        {
          id: 'input',
          name: '待验证数据',
          type: 'data',
          direction: 'input',
          required: true,
        },
      ],
      outputs: [
        { id: 'valid', name: '验证通过', type: 'data', direction: 'output' },
        { id: 'invalid', name: '验证失败', type: 'data', direction: 'output' },
      ],
      capabilities: ['idempotent', 'cacheable'],
      position: {
        x: inputNode.position.x + 200,
        y: inputNode.position.y,
      },
      tags: ['验证'],
    };

    nodes.push(validationNode);

    // 更新现有边的连接
    const outgoingEdges = edges.filter((edge) => edge.source === inputNode.id);
    outgoingEdges.forEach((edge) => {
      edge.source = validationNode.id;
      edge.sourceHandle = 'valid';
    });

    // 添加新的验证边
    const validationEdge: FlowEdge = {
      id: generateId(),
      source: inputNode.id,
      target: validationNode.id,
      sourceHandle: inputNode.outputs[0]?.id || 'output',
      targetHandle: 'input',
      type: 'data',
      animated: false,
    };

    edges.push(validationEdge);
  });
}

/**
 * 验证蓝图结构
 */
function validateBlueprint(blueprint: Blueprint): void {
  if (!blueprint.nodes || blueprint.nodes.length === 0) {
    throw new Error('蓝图必须包含至少一个节点');
  }

  // 检查节点ID唯一性
  const nodeIds = new Set(blueprint.nodes.map((node) => node.id));
  if (nodeIds.size !== blueprint.nodes.length) {
    throw new Error('节点ID不唯一');
  }

  // 检查边的有效性
  blueprint.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`边 ${edge.id} 引用了不存在的节点`);
    }
  });
}

// 导出类型验证器
export const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});
