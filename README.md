# Superflow

Superflow 致力于构建一个由 AI 驱动的可编辑工作流平台，帮助用户从业务想法快速落地可运行的流程。

## P0 功能清单
- Ideas → 蓝图 → Flow 的基础闭环
- NodePage：代码编辑、运行、日志与 AI 生成/修复
- Web Components：输出 `<workflow-node>` 与 `<workflow-flow>` MVP
- 本地持久化：使用 localStorage，支持导入/导出

## 启动方式
1. 安装依赖：`npm install`
2. 运行测试：`npm test`
   
目前尚未提供独立运行脚本，可通过测试命令验证基础功能。

## 开发约定
项目遵循 [CLAUDE.md](./CLAUDE.md) 中的编码规范：使用 TypeScript、以 Prettier(2 空格缩进、分号、单引号) 格式化，采用 ES Module `import`/`export` 语法，并在提交前运行 `npm test`。
