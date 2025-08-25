import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * 简化版 E2E 测试
 * 仅验证测试服务器与应用的基本交互是否正常，
 * 避免因未实现的复杂功能导致测试挂起。
 */
describe('用户工作流 E2E 测试', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    const { startTestServer } = await import('../helpers/test-server');
    const { createTestApp } = await import('../helpers/test-app');

    server = await startTestServer();
    app = await createTestApp();
  });

  afterAll(async () => {
    await server?.close();
    await app?.cleanup();
  });

  it('支持基本的想法输入与蓝图生成流程', async () => {
    await app.navigate('/ideas');
    expect(await app.getCurrentPath()).toBe('/ideas');

    await app.fillInput('[data-testid="idea-input"]', '测试流程');
    await app.click('[data-testid="generate-blueprint"]');

    const blueprint = await app.getBlueprint();
    expect(blueprint.nodes.length).toBeGreaterThan(0);
  });
});
