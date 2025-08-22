export interface BlueprintStep {
  id: string;
  label: string;
  type?: string;
  description: string;
  inputs: string[];
  outputs: string[];
  next: string[];
}

export interface Blueprint {
  requirement: string;
  steps: BlueprintStep[];
}

/**
 * 调用大模型接口，根据文本需求生成包含多个步骤的蓝图。
 */
export async function generateBlueprint(requirement: string): Promise<Blueprint> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  // 如果没有API key，返回默认蓝图
  if (!apiKey) {
    return {
      requirement,
      steps: [
        { 
          id: 'start', 
          label: '开始', 
          type: 'input', 
          description: '流程开始节点',
          inputs: [],
          outputs: ['data'],
          next: ['end'] 
        },
        { 
          id: 'end', 
          label: '结束', 
          type: 'output', 
          description: '流程结束节点',
          inputs: ['data'],
          outputs: [],
          next: [] 
        },
      ],
    };
  }

  const prompt =
    `请根据以下需求生成一个包含多个步骤的 JSON 数组。` +
    `每个步骤需包含 id、label、description、inputs、outputs、next 字段。\n需求: ${requirement}`;

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
        }),
      },
    );

    const data = await response.json();
    let steps: BlueprintStep[] = [];
    try {
      let content = data.choices?.[0]?.message?.content ?? '[]';
      // 大模型可能会将 JSON 包裹在代码块中，需去掉包裹再解析
      content = content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/m, '');
      }
      steps = JSON.parse(content);
    } catch {
      steps = [];
    }

    return { requirement, steps };
  } catch {
    // API调用失败时返回默认蓝图
    return {
      requirement,
      steps: [
        { 
          id: 'start', 
          label: '开始', 
          type: 'input', 
          description: '流程开始节点',
          inputs: [],
          outputs: ['data'],
          next: ['end'] 
        },
        { 
          id: 'end', 
          label: '结束', 
          type: 'output', 
          description: '流程结束节点',
          inputs: ['data'],
          outputs: [],
          next: [] 
        },
      ],
    };
  }
}

export default generateBlueprint;
