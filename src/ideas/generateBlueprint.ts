export interface BlueprintStep {
  id: string;
  label: string;
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
  const prompt =
    `请根据以下需求生成一个包含多个步骤的 JSON 数组。` +
    `每个步骤需包含 id、label、description、inputs、outputs、next 字段。\n需求: ${requirement}`;

  const response = await (globalThis as any).fetch(
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
}

export default generateBlueprint;
