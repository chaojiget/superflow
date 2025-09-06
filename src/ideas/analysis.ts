import type { NodeKind } from '@core';
import type { IdeaAnalysis, ProcessStep, AnalysisConfig } from './types';
import { DEFAULT_ANALYSIS_CONFIG } from './types';

export const KEYWORD_TO_NODE_TYPE: Record<string, NodeKind> = {
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

export const COMMON_PATTERNS: Record<string, ProcessStep[]> = {
  用户注册: [
    {
      type: 'input',
      name: '用户输入注册信息',
      description: '收集用户姓名、邮箱、密码等信息',
      order: 0,
    },
    {
      type: 'condition',
      name: '验证输入格式',
      description: '检查邮箱格式、密码强度等',
      order: 1,
    },
    {
      type: 'http-request',
      name: '检查邮箱是否已存在',
      description: '调用用户服务检查邮箱唯一性',
      order: 2,
    },
    {
      type: 'condition',
      name: '判断邮箱可用性',
      description: '根据检查结果决定是否继续',
      order: 3,
    },
    {
      type: 'transform',
      name: '加密密码',
      description: '对用户密码进行哈希加密',
      order: 4,
    },
    {
      type: 'http-request',
      name: '创建用户账户',
      description: '调用用户服务创建新账户',
      order: 5,
    },
    {
      type: 'http-request',
      name: '发送验证邮件',
      description: '发送邮箱验证链接',
      order: 6,
    },
    {
      type: 'output',
      name: '返回注册结果',
      description: '提示用户注册成功，需要验证邮箱',
      order: 7,
    },
  ],
  数据处理: [
    {
      type: 'input',
      name: '接收数据',
      description: '获取需要处理的原始数据',
      order: 0,
    },
    {
      type: 'condition',
      name: '验证数据格式',
      description: '检查数据结构和必填字段',
      order: 1,
    },
    {
      type: 'transform',
      name: '清洗数据',
      description: '去除无效数据，标准化格式',
      order: 2,
    },
    {
      type: 'transform',
      name: '转换数据',
      description: '按照业务规则转换数据结构',
      order: 3,
    },
    {
      type: 'output',
      name: '输出处理结果',
      description: '返回处理后的数据',
      order: 4,
    },
  ],
  文件上传: [
    {
      type: 'input',
      name: '选择文件',
      description: '用户选择要上传的文件',
      order: 0,
    },
    {
      type: 'condition',
      name: '验证文件',
      description: '检查文件类型、大小等限制',
      order: 1,
    },
    {
      type: 'transform',
      name: '处理文件',
      description: '压缩、格式转换等预处理',
      order: 2,
    },
    {
      type: 'http-request',
      name: '上传文件',
      description: '将文件上传到存储服务',
      order: 3,
    },
    {
      type: 'output',
      name: '返回文件信息',
      description: '返回文件URL和元数据',
      order: 4,
    },
  ],
};

export function analyzeIdea(
  idea: string,
  config: AnalysisConfig = {}
): IdeaAnalysis {
  const conf = { ...DEFAULT_ANALYSIS_CONFIG, ...config };

  if (!idea || idea.trim().length === 0) {
    throw new Error('想法内容不能为空');
  }

  const normalizedIdea = idea.toLowerCase().trim();
  const keywords = extractKeywords(normalizedIdea);
  const processType = identifyProcessType(normalizedIdea);
  const complexity = estimateComplexity(normalizedIdea, keywords);
  const steps = extractSteps(normalizedIdea, processType);
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

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  Object.keys(KEYWORD_TO_NODE_TYPE).forEach((keyword) => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });
  const domainKeywords = [
    '用户',
    '注册',
    '登录',
    '认证',
    '权限',
    '据',
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

function estimateComplexity(
  text: string,
  keywords: string[]
): 'simple' | 'medium' | 'complex' {
  const complexityIndicators = {
    simple: ['简单', '基础', '单一'],
    medium: ['处理', '验证', '转换'],
    complex: ['复杂', '系统', '完整', '集成', '多个', '批量'],
  } as const;
  let complexityScore = 0;
  complexityScore += keywords.length;
  if (text.length > 100) complexityScore += 2;
  if (text.length > 200) complexityScore += 3;
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

function extractSteps(text: string, processType?: string): ProcessStep[] {
  if (processType && COMMON_PATTERNS[processType]) {
    return COMMON_PATTERNS[processType]!.map((step) => ({ ...step }));
  }
  const steps: ProcessStep[] = [];
  const keywords = extractKeywords(text);
  keywords.forEach((keyword, index) => {
    const nodeType = KEYWORD_TO_NODE_TYPE[keyword];
    if (nodeType) {
      steps.push({
        type: nodeType,
        name: `${keyword}节点`,
        description: `执行${keyword}相关操作`,
        order: index,
      });
    }
  });
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

function extractEntities(text: string): string[] {
  const entities = new Set<string>();
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

function calculateConfidence(
  keywords: string[],
  steps: ProcessStep[],
  entities: string[]
): number {
  let confidence = 0.5;
  if (keywords.length > 0) confidence += 0.1;
  if (steps.length > 2) confidence += 0.1;
  if (entities.length > 0) confidence += 0.1;
  return Math.min(confidence, 1.0);
}
