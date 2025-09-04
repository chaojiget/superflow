import type { Blueprint, AnalysisConfig } from './types';
import { analyzeIdea } from './analysis';
import { createBlueprintFromAnalysis } from './nodeGeneration';
import { validateBlueprint } from './validation';

export { analyzeIdea, createBlueprintFromAnalysis, validateBlueprint };

export async function generateBlueprint(
  idea: string,
  config: AnalysisConfig = {}
): Promise<Blueprint> {
  if (!idea || idea.trim().length === 0) {
    throw new Error('想法内容不能为空');
  }
  const analysis = analyzeIdea(idea, config);
  const blueprint = createBlueprintFromAnalysis(analysis, config);
  validateBlueprint(blueprint);
  return blueprint;
}
