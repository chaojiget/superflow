# Planner 模块设计

Planner 模块将蓝图转换为可执行的流程 DAG，并输出节点列表与依赖关系。

## 核心职责
- 解析蓝图中的节点与边信息。
- 生成带有输入输出定义的流程图结构。

## 接口示例
```ts
export interface Planner {
  plan(blueprint: Blueprint): Promise<Flow>;
}
```
