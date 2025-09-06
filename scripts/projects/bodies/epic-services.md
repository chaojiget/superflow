目标
- 提供 App Services（CQRS 门面）作为唯一入口，统一运行与版本操作。

范围
- 暴露 `startRun` / `retryNode`；
- 写入 Dexie（runs/logs/versions）；
- 版本差异生成与记录。

验收
- [ ] UI 仅通过 Services 与运行/版本交互；
- [ ] 事件流结构稳定并有契约测试；
- [ ] 差异记录可在 Console/版本侧查看。

参考
- `AGENTS.md` App Services（CQRS）
- `docs/adr/0003-重构.md`

