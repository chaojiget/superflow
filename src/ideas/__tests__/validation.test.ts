import { describe, it, expect } from 'vitest';
import { analyzeIdea } from '../analysis';
import { createBlueprintFromAnalysis } from '../nodeGeneration';
import { validateBlueprint } from '../validation';

describe('校验模块', () => {
  it('合法蓝图应通过校验', () => {
    const analysis = analyzeIdea('用户注册并发送验证邮件');
    const blueprint = createBlueprintFromAnalysis(analysis);
    expect(() => validateBlueprint(blueprint)).not.toThrow();
  });

  it('空节点蓝图应抛出错误', () => {
    const invalid: any = {
      id: '1',
      name: '空蓝图',
      description: '',
      version: '1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [],
      edges: [],
    };
    expect(() => validateBlueprint(invalid)).toThrow();
  });
});
