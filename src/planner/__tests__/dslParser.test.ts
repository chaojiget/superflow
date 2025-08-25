import { describe, it, expect } from 'vitest';
import { parseBlueprintDSL, blueprintToDag } from '../';

describe('parseBlueprintDSL', () => {
  it('JSON 格式错误时返回明确错误', () => {
    const result = parseBlueprintDSL('{ invalid');
    expect(result.error).toMatch('JSON 格式错误');
  });

  it('语法错误时返回明确错误', () => {
    const dsl = JSON.stringify({
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: [{ source: 'A', target: 'B!' }],
    });
    const result = parseBlueprintDSL(dsl);
    expect(result.error).toMatch('语法错误');
  });

  it('检测并回退环结构', () => {
    const dsl = JSON.stringify({
      nodes: [{ id: 'A' }, { id: 'B' }],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'B', target: 'A' },
      ],
    });
    const result = parseBlueprintDSL(dsl);
    expect(result.warnings.some((w) => w.includes('环'))).toBe(true);
    expect(result.blueprint?.edges.length).toBe(1);
    const dag = blueprintToDag(result.blueprint!);
    expect(dag.edges).toHaveLength(1);
  });

  it('分支结构生成警告但仍能转换', () => {
    const dsl = JSON.stringify({
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { id: 'e1', source: 'A', target: 'B' },
        { id: 'e2', source: 'A', target: 'C' },
      ],
    });
    const result = parseBlueprintDSL(dsl);
    expect(result.warnings.some((w) => w.includes('分支'))).toBe(true);
    const dag = blueprintToDag(result.blueprint!);
    expect(dag.edges).toHaveLength(2);
  });
});
