# Superflow

## 项目简介
Superflow 聚焦于构建可感知、可思考、能行动的 AgentOS 原型，通过模块化的代理、工具、运行器与观测体系，让智能体能够在离线环境中完成“计划—执行—评审—回放”的闭环。仓库中同时沉淀了运行控制台、最小示例与丰富的技能库，便于在真实业务场景中快速验证与扩展。

## 目录结构
```text
superflow/
├─ apps/                # 应用入口，含离线控制台与 FastAPI 管理台
│  ├─ console/          # min_loop CLI，演示规划-执行-复盘的最小循环
│  └─ server/           # FastAPI 原型管理台，可查看任务、作业与回放
├─ examples/            # 示例数据与 SRS 模板，便于快速试跑
├─ kernel/              # 内核模块，如事件总线、预算守护与消息持久化
├─ packages/            # 可复用组件：代理实现、Provider 适配、配置加载等
├─ skills/              # 内置技能函数及注册表（CSV 清洗、统计聚合、Markdown 渲染等）
├─ tests/               # 单元与冒烟测试，覆盖配置加载、封装器、技能注册等能力
├─ config.json          # 默认配置文件，可自定义 Provider、Outbox 等参数
├─ main.py              # 轻量入口示例
└─ AGENTS.md            # 详细设计文档与一页蓝图
```

## 快速开始
### 环境准备
- Python 3.13+
- [uv](https://github.com/astral-sh/uv)（用于管理依赖与命令）

```bash
# 同步基础依赖（首次执行会创建 .venv）
uv sync
```

### 启动示例
- **最小循环 CLI**：基于离线技能链路生成周报，可替换示例 SRS 与 CSV。
  ```bash
  uv run python apps/console/min_loop.py run \
    --srs examples/srs/weekly_report.json \
    --data examples/data/articles.csv \
    --out reports/weekly_report.md
  ```
- **管理台原型**：依赖 FastAPI / Uvicorn / Jinja2，可通过 uv 安装后启动。
  ```bash
  uv add fastapi uvicorn jinja2 --dev  # 若尚未安装
  uv run uvicorn apps.server.main:app --reload
  ```
  启动后访问 `http://127.0.0.1:8000`，即可在浏览器中查看作业执行与回放结果。

## 测试说明
项目采用 Pytest 维护单元与契约测试。推荐在同步依赖后执行：
```bash
uv run pytest
```
如需仅验证核心模块，可加上目录筛选，例如 `uv run pytest tests/unit`。

## 设计文档
更多背景、架构原则与里程碑规划请参阅 [AGENTS.md](./AGENTS.md)。
