背景
- outputs schema 变更可能破坏下游，需显式评估并记录。

范围
- 对比旧/新 outputs，判定 breaking / non-breaking / unsafe；
- 在事件流显示影响范围与原因；
- 提供跳转至迁移向导以修复映射。

验收
- [ ] 变更 outputs 时自动弹出兼容性结果；
- [ ] 事件流包含变更类型、受影响节点数与建议；
- [ ] 可一键生成迁移任务。

参考
- `AGENTS.md` Inspector：outputs 兼容性

