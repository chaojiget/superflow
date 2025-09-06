export interface IdeaInput {
  text: string;
}

export interface Blueprint {
  id: string;
  nodes: unknown[];
  edges: unknown[];
}

export type BlueprintOutput = Blueprint;

export interface AnalysisConfig {
  language?: 'zh' | 'en';
  complexity?: 'low' | 'medium' | 'high';
  includeValidation?: boolean;
  includeErrorHandling?: boolean;
}

