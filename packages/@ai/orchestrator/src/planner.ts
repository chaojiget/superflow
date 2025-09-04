import { parseBlueprintDSL } from '../../../../src/planner';

/**
 * 基于 DSL 文本生成蓝图描述。
 */
export function generateBlueprint(dsl: string) {
  return parseBlueprintDSL(dsl);
}
