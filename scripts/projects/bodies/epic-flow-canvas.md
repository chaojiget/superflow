目标
- 提升大图性能与可操作性：虚拟化稳固、自动布局、状态过滤、选区联动。

范围
- 将 `utils.autoLayout` 接入 FlowEditor 工具栏；
- 状态过滤（failed/running）；
- 分组折叠与框选批量操作；
- 与 Console 的“选区重跑”联动。

验收
- [ ] 自动布局可在 300+ 节点图上稳定运行，布局抖动最小化；
- [ ] 过滤/折叠操作 <100ms 响应；
- [ ] 框选与联动 Console 正常。

参考
- `AGENTS.md`（Flow / 画布）
- `src/flow/utils.ts`、`src/flow/FlowCanvas.ts`

