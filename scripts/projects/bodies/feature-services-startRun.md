背景
- 统一运行入口，写入 runs/logs，驱动 Console/Run Center 展示。

范围
- `startRun(flowId, options)`：返回 runId 与事件流；
- `retryNode(runId, nodeId)`：基于上次输入重试；
- 写入 Dexie 表并触发订阅更新。

验收
- [ ] 运行事件：STARTED/LOG/RESULT/ERROR 契约符合 ADR；
- [ ] Dexie 可按 runId/ts 高效检索；
- [ ] 失败→retryNode 成功闭环有日志链接。

测试
- 契约测试/集成测试：Worker 模拟通道；
- 性能：日志写入限流不阻塞主线程。

参考
- `AGENTS.md` App Services P0
- `docs/adr/0003-重构.md` 第 17 节协议

