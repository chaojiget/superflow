import { generateId } from '@/shared';
import type { FlowNode, FlowEdge, NodeKind, Port } from '@/shared';
import type {
  Blueprint,
  IdeaAnalysis,
  ProcessStep,
  AnalysisConfig,
} from './types';
import { DEFAULT_ANALYSIS_CONFIG } from './types';
import { COMMON_PATTERNS } from './analysis';

export function createBlueprintFromAnalysis(
  analysis: IdeaAnalysis,
  config: AnalysisConfig = {}
): Blueprint {
  const conf = { ...DEFAULT_ANALYSIS_CONFIG, ...config };

  const steps: ProcessStep[] =
    analysis.processType && COMMON_PATTERNS[analysis.processType]
      ? COMMON_PATTERNS[analysis.processType]!
      : generateCustomSteps(analysis);

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const nodeSpacing = 200;

  steps.forEach((step, index) => {
    const node: FlowNode = {
      id: generateId(),
      kind: step.type as NodeKind,
      name: step.name,
      description: step.description,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inputs: generatePortsForNodeType(step.type as NodeKind, 'input'),
      outputs: generatePortsForNodeType(step.type as NodeKind, 'output'),
      capabilities: getCapabilitiesForNodeType(step.type as NodeKind),
      position: { x: index * nodeSpacing, y: 0 },
      tags: step.tags || [],
    };
    nodes.push(node);

    if (index < steps.length - 1) {
      edges.push({
        id: generateId(),
        source: node.id,
        target: '',
        sourceHandle: node.outputs[0]?.id || 'output',
        targetHandle: '',
        type: 'data',
        animated: false,
      });
    }
  });

  edges.forEach((edge, index) => {
    if (index + 1 < nodes.length) {
      edge.target = nodes[index + 1]?.id || '';
      edge.targetHandle = nodes[index + 1]?.inputs[0]?.id || 'input';
    }
  });

  if (conf.includeErrorHandling) {
    addErrorHandlingNodes(nodes, edges);
  }

  if (conf.includeValidation) {
    addValidationNodes(nodes, edges);
  }

  return {
    id: generateId(),
    name: `${analysis.processType || '自定义流程'} - ${Date.now()}`,
    description: `基于想法"${analysis.originalIdea}"生成的蓝图`,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes,
    edges,
    metadata: {
      sourceIdea: analysis.originalIdea,
      analysisResult: analysis,
      generatedBy: 'AI助手',
      confidence: analysis.confidence,
    },
    tags: ['AI生成', analysis.processType || '自定义'].filter(Boolean),
  };
}

function generateCustomSteps(analysis: IdeaAnalysis): ProcessStep[] {
  return analysis.steps;
}

function generatePortsForNodeType(
  nodeType: NodeKind,
  direction: 'input' | 'output'
): Port[] {
  const basePort: Omit<Port, 'id' | 'name'> = {
    type: 'data',
    direction,
    required: true,
  };

  if (direction === 'input') {
    switch (nodeType) {
      case 'input':
        return [];
      case 'output':
        return [{ ...basePort, id: 'input', name: '数据输入' }];
      default:
        return [{ ...basePort, id: 'input', name: '输入' }];
    }
  } else {
    switch (nodeType) {
      case 'output':
        return [];
      case 'condition':
        return [
          { ...basePort, id: 'true', name: '条件为真', direction },
          { ...basePort, id: 'false', name: '条件为假', direction },
        ];
      default:
        return [{ ...basePort, id: 'output', name: '输出' }];
    }
  }
}

function getCapabilitiesForNodeType(
  nodeType: NodeKind
): import('@/shared').NodeCapability[] {
  switch (nodeType) {
    case 'input':
    case 'output':
      return ['idempotent'];
    case 'transform':
      return ['concurrent', 'idempotent', 'cacheable'];
    case 'http-request':
      return ['retryable'];
    case 'condition':
      return ['idempotent', 'cacheable'];
    case 'loop':
      return ['retryable'];
    default:
      return [];
  }
}

function addErrorHandlingNodes(nodes: FlowNode[], edges: FlowEdge[]): void {
  const errorProneTypes: NodeKind[] = ['http-request', 'transform'];
  nodes.forEach((node) => {
    if (errorProneTypes.includes(node.kind)) {
      const errorNode: FlowNode = {
        id: generateId(),
        kind: 'transform',
        name: `${node.name} - 错误处理`,
        description: `处理${node.name}节点的错误情况`,
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        inputs: [
          {
            id: 'error',
            name: '错误信息',
            type: 'data',
            direction: 'input',
            required: true,
          },
        ],
        outputs: [
          {
            id: 'handled',
            name: '处理结果',
            type: 'data',
            direction: 'output',
          },
        ],
        capabilities: ['idempotent'],
        position: { x: node.position.x, y: node.position.y + 150 },
        tags: ['错误处理'],
      };
      nodes.push(errorNode);
      edges.push({
        id: generateId(),
        source: node.id,
        target: errorNode.id,
        sourceHandle: 'error',
        targetHandle: 'error',
        type: 'control',
        animated: true,
      });
    }
  });
}

function addValidationNodes(nodes: FlowNode[], edges: FlowEdge[]): void {
  const inputNodes = nodes.filter((node) => node.kind === 'input');
  inputNodes.forEach((inputNode) => {
    const validationNode: FlowNode = {
      id: generateId(),
      kind: 'condition',
      name: `${inputNode.name} - 验证`,
      description: `验证${inputNode.name}的输入数据`,
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inputs: [
        {
          id: 'input',
          name: '待验证数据',
          type: 'data',
          direction: 'input',
          required: true,
        },
      ],
      outputs: [
        { id: 'valid', name: '验证通过', type: 'data', direction: 'output' },
        { id: 'invalid', name: '验证失败', type: 'data', direction: 'output' },
      ],
      capabilities: ['idempotent', 'cacheable'],
      position: { x: inputNode.position.x + 200, y: inputNode.position.y },
      tags: ['验证'],
    };
    nodes.push(validationNode);
    const outgoingEdges = edges.filter((edge) => edge.source === inputNode.id);
    outgoingEdges.forEach((edge) => {
      edge.source = validationNode.id;
      edge.sourceHandle = 'valid';
    });
    edges.push({
      id: generateId(),
      source: inputNode.id,
      target: validationNode.id,
      sourceHandle: inputNode.outputs[0]?.id || 'output',
      targetHandle: 'input',
      type: 'data',
      animated: false,
    });
  });
}
