背景

- 需要工程约束防止跨层依赖与深路径导入，保障架构边界。

范围

- ESLint `import/no-restricted-paths`；
- 可选引入 Dependency-Cruiser 报表；
- CI 集成质量门禁。

验收

- [ ] 违反边界直接 CI fail；
- [ ] 报表可在 CI artifact 查看。

参考

- `docs/adr/0003-重构.md` 第 16 节
