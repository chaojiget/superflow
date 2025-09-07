背景

- 目前运行/错误修复/测试分散，需统一到 Console Tab，减少上下文切换。

范围

- Console 信息架构：Tab/Section/空态；
- 运行面板与错误修复视图整合；
- 测试视图只读（最近 N 条）。

验收

- [ ] 在 `StudioPage` 中存在 Console Tab，默认展示最近一次 run，含进度与日志。
- [ ] 错误修复：失败节点可在 Console 内触发修复流程，并将补丁/重跑写入事件流。
- [ ] 测试面板：显示最近 N 次测试摘要与跳转详情；核心用例迁移到 vitest。
- [ ] UI 与 App Services 仅通过公共门面交互（不直连 Dexie/Worker）。

依赖

- `@app/services` 事件流；
- `run-center` 日志聚合；
- `src/studio/StudioPage.tsx` 作为交互样板。

测试

- 组件测试：Tab 切换、错误卡片、测试列表。
- 集成测试：失败 → 修复补丁 → 重跑成功。

参考

- `AGENTS.md` P0 Studio/Console
- `src/studio/StudioPage.tsx`
