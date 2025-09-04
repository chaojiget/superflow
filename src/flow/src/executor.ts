import type { Node } from 'reactflow';

/**
 * 处理可能抛出错误的节点
 */
export async function processErrorNodes(nodes: Node[]): Promise<void> {
  const errorNodes = nodes.filter(
    (node) => node.type === 'error' || (node.data as any)?.shouldFail
  );
  for (const errorNode of errorNodes) {
    const handler = (errorNode.data as any)?.handler;
    if (handler && typeof handler === 'function') {
      await handler();
    } else {
      throw new Error('节点执行失败');
    }
  }
}

/**
 * 处理输入节点
 */
export function processInputNodes(nodes: Node[], input?: unknown): unknown {
  let current = input;
  const inputNodes = nodes.filter((node) => node.type === 'input');
  for (const inputNode of inputNodes) {
    const value = (inputNode.data as any)?.value;
    if (value !== undefined) {
      current = value;
    }
  }
  return current;
}

/**
 * 处理转换节点
 */
export async function processTransformNodes(
  nodes: Node[],
  data: unknown
): Promise<unknown> {
  let current = data;
  const transformNodes = nodes.filter((node) => node.type === 'transform');
  for (const transformNode of transformNodes) {
    const nodeData = transformNode.data as any;
    if (nodeData?.handler && typeof nodeData.handler === 'function') {
      current = await nodeData.handler(current);
    } else if (
      nodeData?.operation === 'uppercase' &&
      typeof current === 'string'
    ) {
      current = current.toUpperCase();
    }
  }
  return current;
}

/**
 * 处理条件节点
 */
export function processConditionalBranches(
  nodes: Node[],
  input: unknown,
  outputs: Record<string, unknown>
): void {
  const conditionNodes = nodes.filter((node) => node.type === 'condition');
  const processNodes = nodes.filter((node) => node.type === 'process');
  for (const conditionNode of conditionNodes) {
    const nodeData = conditionNode.data as any;
    if (nodeData?.condition && typeof input === 'object' && input !== null) {
      const inputValue = (input as Record<string, unknown>).input;
      if (
        typeof inputValue === 'number' &&
        typeof nodeData.condition === 'function'
      ) {
        const result = nodeData.condition(inputValue);
        if (result) {
          const trueNode = processNodes.find((n) => n.id === 'true-branch');
          const value = (trueNode?.data as any)?.value;
          if (value !== undefined) {
            outputs['true-branch'] = value;
          }
        } else {
          const falseNode = processNodes.find((n) => n.id === 'false-branch');
          const value = (falseNode?.data as any)?.value;
          if (value !== undefined) {
            outputs['false-branch'] = value;
          }
        }
      }
    }
  }
}

/**
 * 处理输出节点
 */
export function processOutputNodes(
  nodes: Node[],
  data: unknown,
  outputs: Record<string, unknown>
): void {
  const outputNodes = nodes.filter((node) => node.type === 'output');
  if (outputNodes.length > 0 && Object.keys(outputs).length === 0) {
    outputNodes.forEach((node) => {
      const label = (node.data as any)?.label;
      if (label) {
        outputs[label] = data;
      } else {
        outputs.output = data;
      }
    });
  } else if (Object.keys(outputs).length === 0) {
    outputs.output = data;
  }
}
