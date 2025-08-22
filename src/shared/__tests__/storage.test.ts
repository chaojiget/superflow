import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { saveFlow, loadFlow, exportFlow, importFlow } from '../storage';

describe('storage', () => {
  let store: Record<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    store = {};
    mockStorage = {
      getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;

    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and loads flow', () => {
    const data = { hello: 'world' };
    saveFlow(data);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'superflow:flow',
      JSON.stringify(data)
    );
    expect(loadFlow()).toEqual(data);
  });

  it('exports flow', () => {
    saveFlow({ a: 1 });
    const exported = exportFlow();
    expect(exported).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it('imports flow', () => {
    const json = JSON.stringify({ b: 2 });
    importFlow(json);
    expect(loadFlow()).toEqual({ b: 2 });
  });
});
