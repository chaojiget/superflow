import { describe, it, expect, vi } from 'vitest';
import { RunCenterService } from '../RunCenterService';
<<<<<<< HEAD
import { RunCenterClient } from '../RunCenterClient';
=======
import { RunCenterPage } from '../RunCenterPage';
>>>>>>> pr-49
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

<<<<<<< HEAD
    const page = new RunCenterClient({ baseUrl: 'http://localhost' });
=======
    const page = new RunCenterPage({ baseUrl: 'http://localhost' });
>>>>>>> pr-49
    const runId = await page.startRun('flow1');

    await service.updateRunStatus(runId, 'running');
    await service.addLog(runId, { level: 'info', message: 'started' });

    expect(page.getStatus()).toBe('running');
    expect(page.getLogs().length).toBe(1);
    expect(page.getLogs()[0].message).toBe('started');
  });
});
<<<<<<< HEAD

=======
>>>>>>> pr-49
