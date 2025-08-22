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

describe('generateBlueprint', () => {
  beforeEach(() => {
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
  });

  it('返回包含描述和输入输出的蓝图', async () => {
    const blueprint = await generateBlueprint('任意需求');
    expect(blueprint.steps).toHaveLength(2);
    expect(blueprint.steps[0]).toHaveProperty('description');
    expect(Array.isArray(blueprint.steps[0].inputs)).toBe(true);
    expect(Array.isArray(blueprint.steps[0].outputs)).toBe(true);
  });
});
