背景
- 需要统一并索引 runs/logs/versions/flows/nodes/events，保证查询与联动性能。

范围
- 定义接口与索引键；
- 增量迁移（DB_VERSION++）；
- 读写适配（向后兼容旧导入）。

验收
- [ ] DB 版本迁移脚本可成功迁移现有数据；
- [ ] 根据 runId/ts/status 有效索引；
- [ ] 提供导入/导出 JSON 的 schema 版本标记。

测试
- 单测/集成：迁移/索引读取；
- 文档：schema 与迁移说明。

参考
- `AGENTS.md` 数据与存储 P0

