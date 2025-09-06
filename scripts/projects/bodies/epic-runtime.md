目标
- Web Worker 沙箱执行可用：默认断网、硬超时、结构化事件流。

范围
- `ExecRequest/ExecEvent` 协议落地；
- 断网/白名单能力模型（deny-by-default）；
- 硬超时与取消；
- 错误协议 name/message/stack。

验收
- [ ] Worker 运行 handler，产出 STARTED/LOG/RESULT/ERROR；
- [ ] 超时可终止并上报；
- [ ] 能力白名单默认关闭网络与敏感接口。

参考
- `AGENTS.md` Runtime / Worker（沙箱）
- `docs/adr/0003-重构.md` 协议节

