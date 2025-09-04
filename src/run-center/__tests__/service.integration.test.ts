import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { RunCenterService } from '../RunCenterService';
import { RunCenterClient } from '../RunCenterClient';
import { mockWebSocket } from '@/test/helpers/test-server';

// 集成测试：验证前端与服务端实时通信

describe('RunCenter Service integration', () => {
  it('应通过 WebSocket 推送状态和日志', async () => {
    const service = new RunCenterService();

    // mock fetch，将请求转发到服务
    globalThis.fetch = vi.fn(async (url: any, options: any = {}) => {
      const u = new URL(url);
      const result = await service.handleRequest(
        (options.method || 'GET').toUpperCase(),
        u.pathname,
        options.body ? JSON.parse(options.body) : undefined
      );
      return {
        ok: true,
        json: async () => result,
      } as Response;
    });

    // mock WebSocket，并在建立连接时注册客户端
    mockWebSocket();
    const OriginalWS = globalThis.WebSocket as any;
    globalThis.WebSocket = function (url: string) {
      const ws = new OriginalWS(url);
      const match = url.match(/\/runs\/(.+)$/);
      if (match && match[1]) {
        service.registerClient(match[1], ws);
      }
      return ws;
    } as any;
    (globalThis.WebSocket as any).prototype = OriginalWS.prototype;

    const page = new RunCenterClient({ baseUrl: 'http://localhost' });
    const runId = await page.startRun('flow1');

    await service.updateRunStatus(runId, 'running');
    await service.addLog(runId, {
      level: 'info',
      fields: { message: 'started' },
    });

    expect(page.getStatus()).toBe('running');
    expect(page.getLogs().length).toBe(1);
    expect(page.getLogs()[0].fields.message).toBe('started');

    const exported = await service.exportLogs(runId);
    const lines = exported.trim().split('\n');
    expect(lines.length).toBe(1);
    const obj = JSON.parse(lines[0]);
    expect(obj.fields.message).toBe('started');
  });
});
