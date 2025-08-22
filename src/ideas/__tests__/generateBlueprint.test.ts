import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateBlueprint } from '../generateBlueprint';

const mockSteps = [
  {
    id: 'start',
    label: '开始',
    description: '开始步骤',
    inputs: [],
    outputs: ['signal'],
    next: ['end'],
  },
  {
    id: 'end',
    label: '结束',
    description: '结束步骤',
    inputs: ['signal'],
    outputs: [],
    next: [],
  },
];

const defaultSteps = [
  {
    id: 'start',
    label: '开始',
    type: 'input',
    description: '流程开始节点',
    inputs: [],
    outputs: ['data'],
    next: ['end'],
  },
  {
    id: 'end',
    label: '结束',
    type: 'output',
    description: '流程结束节点',
    inputs: ['data'],
    outputs: [],
    next: [],
  },
];

const originalEnv = process.env.OPENAI_API_KEY;

describe('generateBlueprint', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = originalEnv;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          choices: [
            {
              message: {
                content: ['```json', JSON.stringify(mockSteps), '```'].join(
                  '\n'
                ),
              },
            },
          ],
        }),
      }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = originalEnv;
  });

  it('返回包含描述和输入输出的蓝图', async () => {
    const blueprint = await generateBlueprint('任意需求');
    expect(blueprint.steps).toHaveLength(2);
    expect(blueprint.steps[0]).toHaveProperty('description');
    expect(Array.isArray(blueprint.steps[0].inputs)).toBe(true);
    expect(Array.isArray(blueprint.steps[0].outputs)).toBe(true);
  });

  it('在未设置 OPENAI_API_KEY 时返回默认蓝图', async () => {
    delete process.env.OPENAI_API_KEY;
    const blueprint = await generateBlueprint('缺少 key');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(blueprint).toEqual({ requirement: '缺少 key', steps: defaultSteps });
  });

  it('当 fetch 抛出错误时返回默认蓝图', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    (global.fetch as any).mockRejectedValueOnce(new Error('network'));
    const blueprint = await generateBlueprint('网络异常');
    expect(global.fetch).toHaveBeenCalled();
    expect(blueprint).toEqual({ requirement: '网络异常', steps: defaultSteps });
  });

  it('当 fetch 返回非 JSON 时返回默认蓝图', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.reject(new Error('invalid json')),
    });
    const blueprint = await generateBlueprint('无效响应');
    expect(global.fetch).toHaveBeenCalled();
    expect(blueprint).toEqual({ requirement: '无效响应', steps: defaultSteps });
  });
});
