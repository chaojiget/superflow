# Superflow 项目任务管理（GitHub Projects 种子）

本目录提供：

- `issues.csv`：自 AGENTS.md 与 docs/adr/0003-重构.md 拆解的任务清单（含里程碑/模块/优先级）。
- `gh-seed.sh`：使用 GitHub CLI 批量创建 Issue 并打标签/里程碑；可选加入 Project。
- `project-fields.md`：建议的 GitHub Projects v2 字段与视图配置。

## 使用方式

方式 A：网页导入 CSV（推荐，零脚本）

1) 打开 GitHub 仓库 → Issues → 右侧 `Import` → 选择 `issues-web.csv` 导入。
2) 导入后，批量全选 → `Projects` → 选择你的 Project（需提前创建）。

方式 B：命令行批量创建（需要 `gh` 登录）

```bash
cd scripts/projects
chmod +x gh-seed.sh
# 仓库全名：如 openai/superflow 或 <your_org>/<your_repo>
./gh-seed.sh <repo_full_name>  # 示例：./gh-seed.sh yourname/superflow
```

可选：若要自动加入 Project（Projects v2），请：

- 在仓库/组织的 Secrets 新增 `PROJECT_PAT`（scopes: `project`, `repo`）。
- 将工作流 `.github/workflows/add-to-project.yml` 中的 `project-url` 替换为你的 Project URL。

## 标签与里程碑约定

- 优先级：`priority/p0`、`priority/p1`
- 类型：`type/epic`、`type/feature`、`type/task`、`type/chore`、`type/test`、`type/docs`
- 模块：`module/studio`、`module/flow`、`module/inspector`、`module/run-center`、`module/services`、`module/runtime`、`module/data`
- 其他：`status/planning`、`status/ready`、`status/blocked`

里程碑：`M1-Core-Runtime`、`M2-Debug-Obs`、`M3-Migration`、`M4-Agent-Test`

> 注：上述里程碑名已与 AGENTS.md 和 ADR 中的阶段对齐，可在仓库 `Issues → Milestones` 中先行创建再导入。

## 导入后建议视图

参见 `project-fields.md` 配置建议：

- Board（按 Status 列）
- Roadmap（按 Milestone 分组 + 时间线）
- By Module（按 module/* 分组）
- By Priority（P0 优先排序）

## 变更来源

- `AGENTS.md`：P0/P1、模块拆解、性能/可观测性基线、里程碑
- `docs/adr/0003-重构.md`：运行协议、插件/安全、落地阶段与 P0 必办清单

导入后若需要增删任务，请直接在 GitHub 上编辑 Issue；`issues.csv` 作为一次性初始化种子。
