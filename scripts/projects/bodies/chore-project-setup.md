背景

- 初始化标签、里程碑、Project 视图；确保后续 Issues 自动入板。

范围

- 创建 Milestones：M1-Core-Runtime / M2-Debug-Obs / M3-Migration / M4-Agent-Test；
- 创建标签：priority/_、type/_、module/_、status/_；
- 配置 `add-to-project.yml` 的 Project URL 与 PAT；
- 创建 Project 视图与字段（参见 `project-fields.md`）。

验收

- [ ] 新 Issue 打上 `project:superflow` 自动进入 Project；
- [ ] 预置视图可按 Status/Milestone/Module 浏览。

参考

- `scripts/projects/project-fields.md`
