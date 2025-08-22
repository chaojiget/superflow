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
 * 根据文本需求生成蓝图。当前实现返回固定示例。
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
    const content = data.choices?.[0]?.message?.content ?? '[]';
    steps = JSON.parse(content);
  } catch {
    steps = [];
  }

  return { requirement, steps };
}

export default generateBlueprint;
