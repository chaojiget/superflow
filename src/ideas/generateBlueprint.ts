export interface BlueprintStep {
  id: string;
  label: string;
  type?: string;
  next: string[];
}

export interface Blueprint {
  requirement: string;
  steps: BlueprintStep[];
}

/**
 * 根据文本需求生成蓝图。当前实现返回固定示例。
 */
export function generateBlueprint(requirement: string): Blueprint {
  return {
    requirement,
    steps: [
      { id: 'start', label: '开始', type: 'input', next: ['end'] },
      { id: 'end', label: '结束', type: 'output', next: [] },
    ],
  };
}

export default generateBlueprint;
