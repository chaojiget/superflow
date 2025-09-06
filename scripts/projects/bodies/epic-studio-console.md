目标
- 一体化 Console：统一运行/错误修复/测试，贯穿全局状态与搜索。

范围（Scope）
- 包含：Console Tab 信息架构、与 Flow/Run Center 的联动、全局状态条、命令面板占位与基本搜索。
- 不含：复杂权限、服务端项目列表、多人并发编辑。

验收标准（Acceptance Criteria）
- [ ] 可在 `src/studio/StudioPage.tsx` 中切换到 Console Tab 统一查看“运行/修复/测试”。
- [ ] 顶部状态条显示 runId/用时/成功率/缓存命中/活跃日志源，并实时刷新。
- [ ] ⌘K 命令面板可搜索 节点/日志/Artifact/参数，最少提供模糊匹配与跳转。
- [ ] 从 Flow 选中节点/子图后，可在 Console 设定执行范围（选区重跑）。
- [ ] 结构化日志与事件与 Run Center 同步展示。

依赖
- `@app/services` 暴露 startRun/retryNode 与事件流；
- Dexie 表结构（runs/logs/versions/...）；
- Flow 侧提供当前选区与状态。

测试与度量
- 组件测试：切换 Tab 与状态条渲染；
- 集成测试：选区重跑 → 日志/Trace 联动；
- 性能：状态条更新不超过 16ms/帧；
- 指标：TTFSR、失败后一次修复成功率。

参考
- `AGENTS.md`（Studio / Console）
- `src/studio/StudioPage.tsx`

