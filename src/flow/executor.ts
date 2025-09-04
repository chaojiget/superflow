import type { Node } from 'reactflow';

/**
 * 处理错误节点，如果节点标记为错误或显式要求失败则抛出异常
 */
export async function processErrorNodes(nodes: Node[]): Promise<void> {
  const errorNodes = nodes.filter(
    (node) => node.type === 'error' || (node.data as any)?.shouldFail
  );
  for (const errorNode of errorNodes) {
    const handler = (errorNode.data as any)?.handler;
    if (typeof handler === 'function') {
      await handler();
    } else {
      throw new Error('节点执行失败');
    }
  }
}

/**
 * 处理输入节点，返回更新后的数据
 */
export function processInputNodes(nodes: Node[], input: unknown): unknown {
  let current = input;
  nodes
    .filter((n) => n.type === 'input')
    .forEach((n) => {
      const value = (n.data as any)?.value;
      if (value !== undefined) {
        current = value;
      }
    });
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
  const transforms = nodes.filter((n) => n.type === 'transform');
  for (const node of transforms) {
    const handler = (node.data as any)?.handler;
    if (typeof handler === 'function') {
      current = await handler(current);
    } else if (
      (node.data as any)?.operation === 'uppercase' &&
      typeof current === 'string'
    ) {
      current = (current as string).toUpperCase();
    }
  }
  return current;
}

/**
 * 处理条件分支节点，可能向 outputs 写入 true/false 分支结果
 */
export function processConditionalBranches(
  conditionNodes: Node[],
  processNodes: Node[],
  input: unknown,
  outputs: Record<string, unknown>
): void {
  for (const conditionNode of conditionNodes) {
    const cond = (conditionNode.data as any)?.condition;
    if (
      typeof cond === 'function' &&
      typeof input === 'object' &&
      input !== null
    ) {
      const inputVal = (input as Record<string, unknown>).input;
      if (typeof inputVal === 'number') {
        const res = cond(inputVal);
        const branchId = res ? 'true-branch' : 'false-branch';
        const branchNode = processNodes.find((n) => n.id === branchId);
        const value = (branchNode?.data as any)?.value;
        if (value !== undefined) {
          outputs[branchId] = value;
        }
      }
    }
  }
}

/**
 * 处理输出节点，当 outputs 为空时写入最终数据
 */
export function processOutputNodes(
  outputNodes: Node[],
  currentData: unknown,
  outputs: Record<string, unknown>
): void {
  if (outputNodes.length > 0 && Object.keys(outputs).length === 0) {
    outputNodes.forEach((node) => {
      const label = (node.data as any)?.label;
      if (label) {
        outputs[label] = currentData;
      } else {
        outputs.output = currentData;
      }
    });
  } else if (Object.keys(outputs).length === 0) {
    outputs.output = currentData;
  }
}
