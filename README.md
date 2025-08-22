# Superflow

Superflow 是一个面向代码工作流的原型平台，目标是帮助用户从想法出发，依托 AI 自动拆解、生成并运行可调试的代码节点。

## 项目目的

- 将自然语言需求转换为结构化蓝图，再自动生成可执行的流程 DAG。
- 提供节点级别的代码编辑、运行、日志捕捉与版本管理能力。
- 通过 Web Components 等方式，将流程或节点嵌入到其他系统中使用。

## 主要功能

- 想法 → 蓝图 → 流程的自动化转化。
- AI 生成节点代码并提供修复建议。
- 支持节点调试、运行日志与版本回滚。
- 子图串行测试与运行中心观测。

## 技术栈

- Node.js & TypeScript
- Vitest（单元测试）
- ESLint & Prettier（代码规范）
- Grunt（构建/脚本）

## 快速开始

```bash
npm install
```

## 测试

```bash
npm test
```

## 路线图与贡献

项目初期规划与更多细节见 [docs/pr01.md](docs/pr01.md)。
欢迎通过 Issue 或 Pull Request 参与贡献。
