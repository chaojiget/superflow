目标
- 强类型与校验：表单即时校验、outputs 兼容性判定、与迁移向导联动。

范围
- Ajv + JSON Schema 实时提示；
- outputs 变更触发兼容性判断并写入事件流；
- 从 Inspector 触发 DSL 迁移向导。

验收
- [ ] Inspector 表单字段即时校验并展示友好错误；
- [ ] 修改 outputs 可得到 breaking / non-breaking / unsafe 结果与说明；
- [ ] 可一键打开迁移向导完成字段级映射。

参考
- `AGENTS.md` Inspector / 强类型与校验
- `src/shared/types/`、`src/flow/`、`src/nodes/`

