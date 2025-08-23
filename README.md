# Superflow

> 集成想法、蓝图、流程、运行调试的开放平台

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建项目
npm run build
```

## 项目结构

```
src/
├── ideas/          # 想法转蓝图模块
├── planner/        # 蓝图转DAG规划模块  
├── flow/           # React Flow 流程画布
├── nodes/          # 节点定义与调试
├── run-center/     # 运行中心与可观测性
├── shared/         # 共享类型与工具
└── utils/          # 通用工具函数
```

## 开发命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建项目
- `npm run test` - 运行测试
- `npm run test:watch` - 监视模式运行测试
- `npm run test:coverage` - 测试覆盖率报告
- `npm run lint` - 代码检查
- `npm run lint:fix` - 自动修复代码问题
- `npm run type-check` - TypeScript 类型检查
- `npm run format` - 代码格式化

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **流程图**: React Flow
- **状态管理**: 待定
- **数据存储**: Dexie (IndexedDB)
- **测试**: Vitest + Testing Library
- **代码质量**: ESLint + Prettier

## 架构设计

详见 [CLAUDE.md](./CLAUDE.md) 中的完整架构文档。