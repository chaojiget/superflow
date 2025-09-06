import { describe, it, expect, vi } from 'vitest';
import { RunCenterClient } from '../RunCenterClient';
import { RunCenterService } from '@app/services';
import { mockWebSocket, mockTimer } from '@/test/helpers/test-server';

// 集成测试：验证断线重连与错误处理

describe('RunCenterClient reconnect', () => {
  it('应在连接断开后指数退避重连', async () => {
    const service = new RunCenterService();

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

    const timer = mockTimer();

    const client = new RunCenterClient({ baseUrl: 'http://localhost' });
    const states: string[] = [];
    client.onConnectionStatus((s) => states.push(s));
    await client.startRun('flow1');

    // 初次连接
    timer.tick(10);
    expect(states).toEqual(['connecting', 'open']);

    // 模拟断线
    (client as any).ws.close();
    expect(states).toEqual(['connecting', 'open', 'closed']);

    // 在退避时间内不会重连
    timer.tick(999);
    expect(states).toEqual(['connecting', 'open', 'closed']);

    // 退避时间到达后重连
    timer.tick(1);
    expect(states).toEqual(['connecting', 'open', 'closed', 'connecting']);
    timer.tick(10);
    expect(states).toEqual([
      'connecting',
      'open',
      'closed',
      'connecting',
      'open',
    ]);
  });

  it('应在发生错误后重连', async () => {
    const service = new RunCenterService();

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

    const timer = mockTimer();

    const client = new RunCenterClient({ baseUrl: 'http://localhost' });
    const states: string[] = [];
    client.onConnectionStatus((s) => states.push(s));
    await client.startRun('flow1');
    timer.tick(10);

    // 模拟错误
    (client as any).ws.simulateError();
    expect(states).toEqual(['connecting', 'open', 'error', 'closed']);

    timer.tick(1000);
    expect(states).toEqual([
      'connecting',
      'open',
      'error',
      'closed',
      'connecting',
    ]);
    timer.tick(10);
    expect(states).toEqual([
      'connecting',
      'open',
      'error',
      'closed',
      'connecting',
      'open',
    ]);
  });
});
