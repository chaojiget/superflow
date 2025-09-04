import { describe, it, expect } from 'vitest';
import { analyzeIdea } from '../src/analysis';
import { createBlueprintFromAnalysis } from '../src/nodeGeneration';

describe('节点生成模块', () => {
  it('能够根据分析结果生成节点和边', () => {
    const analysis = analyzeIdea('用户注册并发送验证邮件');
    const blueprint = createBlueprintFromAnalysis(analysis);
    expect(blueprint.nodes.length).toBeGreaterThan(0);
    expect(blueprint.edges.length).toBeGreaterThan(0);
  });
});
