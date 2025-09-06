目标
- Dexie 数据层可用且高效：结构/索引/日志分片/导出导入。

范围
- runs/logs/versions/flows/nodes/events 表与索引；
- 日志分片加载与 NDJSON 导出；
- 清理与配额预警（基础）。

验收
- [ ] 表结构迁移（DB_VERSION+1）并提供向后兼容；
- [ ] 日志分页/分片加载顺畅，导出 NDJSON 可被 Run Center 下载；
- [ ] 简单配额达阈值告警。

参考
- `AGENTS.md` 数据与存储（Dexie）
- `src/shared/db/`

