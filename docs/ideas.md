# Ideas 模块设计

Ideas 模块负责将用户的自然语言需求解析为结构化的需求蓝图，为后续的流程规划提供输入。

## 核心流程
1. 接收文本形式的业务想法。
2. 调用 LLM 生成包含节点概览与关系的蓝图 JSON。

## 接口示例
```ts
export interface IdeaService {
  parse(input: string): Promise<Blueprint>;
}
```
