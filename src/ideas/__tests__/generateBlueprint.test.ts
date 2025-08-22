import { describe, it, expect } from 'vitest';
import { generateBlueprint } from '../generateBlueprint';

describe('generateBlueprint', () => {
  it('返回包含步骤的蓝图', () => {
    const blueprint = generateBlueprint('任意需求');
    expect(blueprint.steps.length).toBeGreaterThan(0);
    expect(blueprint.steps[0]).toHaveProperty('id');
  });
});
