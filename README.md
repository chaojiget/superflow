# Superflow

> 让用户能够从想法快速迭代到可运行的代码流程的开放平台。

## 愿景

Superflow 致力于构建一个集 **想法→蓝图→流程→运行/调试/修复** 于一体的平台。通过 AI 拆解需求、生成节点代码，并支持日志捕捉、版本管理和动态嵌入外部系统，帮助开发者高效搭建可复用的工作流。

## 目录结构

```text
superflow/
├── src/              # TypeScript 源码
│   ├── ideas/        # 想法到蓝图的处理
│   ├── planner/      # 蓝图转流程 DAG
│   ├── flow/         # 流程画布与运行时
│   ├── nodes/        # 节点定义与逻辑
│   ├── run-center/   # 运行中心与观测
│   └── shared/       # 通用工具与类型
├── public/           # 静态资源
└── docs/             # 项目文档
```

## 开发步骤

1. 安装依赖：`npm install`
2. 代码格式化：`npx prettier --write .`
3. 运行测试：`npm test`
4. （可选）构建或运行脚本：`npm run <script>`

## 贡献指南

1. Fork 本仓库并创建特性分支。
2. 进行开发，确保使用 Prettier 格式化代码。
3. 提交前运行 `npm test` 确认通过。
4. 提交 PR 并描述变更背景、实现与测试情况。

## 使用示例

```ts
import { FlowCanvasElement } from './src/flow/FlowCanvas';

const blueprint = {
  requirement: '',
  steps: [],
};

const canvas = new FlowCanvasElement();
canvas.blueprint = blueprint;
canvas.addEventListener('dag-change', (e) => {
  console.log('最新 DAG:', e.detail);
});
document.body.appendChild(canvas);

// 也可以通过方法控制节点与连线
canvas.connect('start', 'end');
```
