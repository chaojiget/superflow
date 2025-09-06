背景
- 需要贯穿 runId/chainId/nodeId，后续对齐 OpenTelemetry 语义字段。

范围
- 在事件/日志模型补充并验证链路 ID；
- 各视图以链路 ID 进行联动与过滤；
- 预留 OTel span/trace 映射字段（本地不强绑定）。

验收
- [ ] 新运行的事件/日志均含 runId/chainId/nodeId；
- [ ] 从任一视图带着 ID 可跳转/过滤到其他视图；
- [ ] 文档记录字段契约。

参考
- `AGENTS.md` 可观测性与 Trace
- `docs/adr/0003-重构.md`

