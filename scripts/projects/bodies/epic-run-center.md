目标
- 建立最小可用 Run Center：Trace/日志/链路 ID 贯穿与基础可视化。

范围
- Trace 进度条与节点跳转；
- 日志级别过滤、书签、跳至最新/锁定滚动；
- runId/chainId/nodeId 全链路贯穿，预留 OTel 语义映射。

验收
- [ ] 从 Console/Flow 打开 Run Center 可查看本次链路 Trace 与日志；
- [ ] 点击 Trace 节点定位到 Flow 对应节点；
- [ ] 日志过滤/滚动锁定可用；
- [ ] 导出 NDJSON。

参考
- `AGENTS.md` Run Center / 可观测性
- `src/run-center/`

