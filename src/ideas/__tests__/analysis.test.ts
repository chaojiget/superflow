import { describe, it, expect } from 'vitest';
import { analyzeIdea } from '../analysis';

describe('analysis 模块', () => {
  it('能够识别关键词和步骤', () => {
    const idea = '用户注册并发送验证邮件';
    const result = analyzeIdea(idea);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});
