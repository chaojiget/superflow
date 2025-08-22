# 贡献指南

感谢你愿意为本项目贡献代码！请遵循以下约定以保持代码质量与仓库整洁。

## 提交流程

1. 从 `main` 分支创建功能分支，例如：`git checkout -b feature/your-feature`。
2. 开发过程中请保持提交粒度清晰，完成一个独立功能或修复后再提交。
3. 提交前运行 `npm run lint` 与 `npm test` 确保没有格式与测试问题。
4. 推送分支并提交 Pull Request 以便代码审查。

## 分支策略

- `main` 为稳定分支，所有功能与修复都通过合并请求进入此分支。
- 功能分支建议以 `feature/`、`fix/` 等前缀命名。

## 代码格式

- 使用 [Prettier](https://prettier.io/) 与 [ESLint](https://eslint.org/) 保持统一风格。
- 提交前请运行 `npm run format` 与 `npm run lint`。

## Commit 信息规范

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，提交信息将通过 commitlint 在 commit-msg 钩子中自动校验。

常用类型：

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档变更
- `chore`: 构建流程或辅助工具变更

示例：

```bash
feat: 增加用户登录功能
```

Commit 信息由类型、可选范围和简短描述组成，冒号后需紧跟一个空格。

感谢你的贡献！
