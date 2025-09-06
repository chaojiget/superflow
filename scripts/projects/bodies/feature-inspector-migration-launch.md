背景
- 从 Inspector 直接触发迁移向导，连贯完成字段级映射与应用。

范围
- 在相关 outputs 或字段映射处提供入口；
- 调出迁移向导并带入当前上下文（节点/字段/schema 差异）。

验收
- [ ] Inspector 内有明显入口打开向导；
- [ ] 向导完成后将变更写入事件流并可撤销。

参考
- `AGENTS.md` Inspector：触发 DSL 迁移向导
- `docs/工作流编排_studio（模拟页面）.jsx`

