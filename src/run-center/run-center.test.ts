// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logRun, getRunRecords, clearRunRecords, RunRecordList, type RunRecord } from './index';

declare const global: { localStorage: Storage };

describe('run-center', () => {
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
      }
    } as Storage;

    vi.stubGlobal('localStorage', mockStorage);
    clearRunRecords();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs, retrieves and persists records', () => {
    const record: RunRecord = {
      id: '1',
      input: 'input data',
      output: 'output data',
      status: 'success',
      duration: 100,
      createdAt: Date.now(),
      version: 1,
    };

    logRun(record);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'superflow:runs',
      JSON.stringify([record])
    );

    const records = getRunRecords();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(record);
  });

  it('renders, filters and clears records list', () => {
    const now = Date.now();
    logRun({
      id: '1',
      input: 'a',
      output: 'b',
      status: 'success',
      duration: 10,
      createdAt: now,
    });
    logRun({
      id: '2',
      input: 'c',
      output: 'd',
      status: 'error',
      duration: 20,
      createdAt: now,
    });

    const root = document.createElement('div');
    RunRecordList(root);

    const list = root.querySelector('ul')!;
    expect(list.children.length).toBe(2);

    const select = root.querySelector('select')!;
    select.value = 'success';
    select.dispatchEvent(new Event('change'));
    expect(list.children.length).toBe(1);

    const button = root.querySelector('button')!;
    button.click();
    expect(list.children.length).toBe(0);
    expect(mockStorage.removeItem).toHaveBeenCalledWith('superflow:runs');
  });
});
