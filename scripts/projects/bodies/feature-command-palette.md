背景
- 需要统一的 ⌘K 命令面板与全局搜索，快速定位节点/日志/Artifact/参数。

范围
- 基础占位与最小可用搜索（模糊匹配）；
- 结果分组：Nodes / Logs / Artifacts / Params；
- 跳转：选中节点/打开日志/定位 Artifact。

验收
- [ ] ⌘K 唤起面板，输入关键字返回分组结果；
- [ ] 回车可跳转至 Flow 节点或打开 Run Center 对应日志过滤；
- [ ] 日志搜索按 level/time 范围过滤。

依赖
- Dexie 索引与检索 API；
- Flow/Run Center 暴露跳转接口。

测试
- 组件测试：输入/导航；
- 集成测试：从搜索结果跳转到节点与日志。

参考
- `AGENTS.md` Studio/Console：⌘K

