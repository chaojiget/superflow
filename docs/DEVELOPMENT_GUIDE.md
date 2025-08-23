# Superflow 开发指南

> 欢迎加入 Superflow 开发团队！本指南将帮助您快速上手项目开发。

## 📋 目录

- [项目架构](#项目架构)
- [开发环境设置](#开发环境设置)
- [模块分工](#模块分工)
- [开发流程](#开发流程)
- [测试策略](#测试策略)
- [代码规范](#代码规范)
- [协作指南](#协作指南)

---

## 🏗️ 项目架构

### 整体架构

```
Superflow 工作流：想法 → 蓝图 → 规划 → 流程 → 执行 → 监控

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Ideas     │───▶│   Planner   │───▶│    Flow     │
│  想法模块    │    │   规划模块   │    │   流程模块   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Shared    │◀───│    Nodes    │◀───│ Run Center  │
│  共享模块    │    │   节点模块   │    │  运行中心   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 模块职责

| 模块 | 职责 | 主要技术栈 |
|------|------|-----------|
| **Ideas** | 需求分析、蓝图生成 | AI集成、Schema验证 |
| **Planner** | DAG规划、拓扑排序 | 图算法、依赖分析 |
| **Flow** | 可视化编辑、交互 | React Flow、Canvas |
| **Nodes** | 节点定义、调试执行 | Web Worker、代码沙箱 |
| **Run Center** | 执行监控、日志追踪 | 可观测性、指标收集 |
| **Shared** | 通用工具、类型系统 | TypeScript、工具库 |

---

## 🛠️ 开发环境设置

### 前置要求

- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- Git ≥ 2.30.0
- VS Code（推荐）

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/superflow.git
cd superflow

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 运行测试
npm run test

# 5. 类型检查
npm run type-check
```

### 推荐工具

#### VS Code 扩展

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "vitest.explorer"
  ]
}
```

#### Git Hooks

```bash
# 安装 husky（预提交检查）
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
npx husky add .husky/pre-push "npm run test"
```

---

## 👥 模块分工

### Ideas 团队 (@ideas-team)

**负责人**：@product-manager  
**核心成员**：@ai-engineer @requirement-analyst

**主要任务**：
- 实现想法到蓝图的转换逻辑
- 集成 AI 服务进行需求分析
- 优化蓝图生成算法
- 维护想法库和模板

**技能要求**：
- AI/LLM 集成经验
- 自然语言处理
- Schema 设计
- 产品思维

### Planner 团队 (@planner-team)

**负责人**：@algorithm-engineer  
**核心成员**：@graph-specialist @optimization-expert

**主要任务**：
- 实现 DAG 规划算法
- 优化执行策略
- 处理循环依赖检测
- 设计重试和容错机制

**技能要求**：
- 图算法专长
- 分布式系统设计
- 性能优化
- 算法复杂度分析

### Flow 团队 (@flow-team)

**负责人**：@frontend-lead  
**核心成员**：@react-expert @ux-designer

**主要任务**：
- React Flow 集成和定制
- 画布交互体验优化
- 布局算法实现
- 快捷键和手势支持

**技能要求**：
- React/TypeScript 精通
- Canvas/SVG 操作
- 用户体验设计
- 前端性能优化

### Nodes 团队 (@nodes-team)

**负责人**：@runtime-architect  
**核心成员**：@security-engineer @performance-engineer

**主要任务**：
- 节点执行引擎开发
- Web Worker 沙箱实现
- 代码调试工具
- 安全策略制定

**技能要求**：
- Web Worker 专长
- 代码沙箱技术
- 安全防护
- 浏览器底层 API

### Run Center 团队 (@run-center-team)

**负责人**：@monitoring-lead  
**核心成员**：@observability-engineer @database-expert

**主要任务**：
- 执行引擎开发
- 监控指标收集
- 日志系统优化
- 性能分析工具

**技能要求**：
- 可观测性设计
- 时序数据处理
- 性能监控
- 分布式追踪

### Shared 团队 (@shared-team)

**负责人**：@tech-lead  
**核心成员**：@type-system-expert @infrastructure-engineer

**主要任务**：
- 类型系统设计
- 通用工具开发
- 存储层抽象
- 构建系统维护

**技能要求**：
- TypeScript 深度掌握
- 系统架构设计
- 构建工具链
- 基础设施即代码

---

## 🔄 开发流程

### 1. 任务领取

```bash
# 从 main 分支创建功能分支
git checkout main
git pull origin main
git checkout -b codex/your-feature-name

# 示例：
git checkout -b codex/add-node-timeout-handling
```

### 2. 开发阶段

```bash
# 开发过程中持续提交
git add .
git commit -m "feat(nodes): add timeout handling for node execution"

# 遵循 Conventional Commits 规范：
# feat: 新功能
# fix: 错误修复
# docs: 文档更新
# test: 测试相关
# refactor: 重构
# perf: 性能优化
# chore: 构建/工具相关
```

### 3. 测试验证

```bash
# 运行所有测试
npm run test

# 运行特定模块测试
npm run test -- src/nodes

# 运行集成测试
npm run test:integration

# 检查覆盖率
npm run test:coverage
```

### 4. 代码质量检查

```bash
# 类型检查
npm run type-check

# 代码格式
npm run format

# 代码检查
npm run lint

# 构建验证
npm run build
```

### 5. 提交 PR

```bash
# 推送到远程分支
git push origin codex/your-feature-name

# 创建 PR（使用 GitHub CLI）
gh pr create --title "feat(nodes): 添加节点执行超时处理" \
  --body "$(cat <<'EOF'
## 变更摘要
- 为节点执行添加可配置超时机制
- 实现优雅的超时处理和清理
- 添加超时相关的错误类型

## 测试计划
- [x] 单元测试：超时触发逻辑
- [x] 集成测试：端到端超时场景
- [x] 性能测试：超时不影响正常执行

## 兼容性
- 向后兼容，默认无超时限制
- 新增可选配置参数
EOF
)"
```

---

## 🧪 测试策略

### 测试金字塔

```
         E2E Tests (5%)
        /              \
   Integration Tests (15%)
  /                      \
 Unit Tests (80%)
```

### 测试分类

#### 1. 单元测试 (80%)

```bash
# 运行单元测试
npm run test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

**重点覆盖**：
- 纯函数逻辑
- 错误处理分支
- 边界条件
- 算法正确性

#### 2. 集成测试 (15%)

```bash
# 运行集成测试
npm run test:integration
```

**重点覆盖**：
- 模块间交互
- 数据流传递
- API 契约
- 状态管理

#### 3. E2E 测试 (5%)

```bash
# 运行端到端测试
npm run test:e2e
```

**重点覆盖**：
- 完整用户旅程
- 关键业务流程
- 浏览器兼容性
- 性能基准

### 测试最佳实践

#### 命名规范

```typescript
describe('NodeExecutor', () => {
  describe('execute()', () => {
    it('应该成功执行有效节点', async () => {
      // 测试内容
    })

    it('应该在超时时抛出错误', async () => {
      // 测试内容
    })

    it('应该处理节点执行异常', async () => {
      // 测试内容
    })
  })
})
```

#### Mock 策略

```typescript
// 优先使用 vi.mock 进行模块 mock
vi.mock('../../shared/db', () => ({
  createStorage: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  })
}))

// 为外部依赖创建适配器接口
interface DatabaseAdapter {
  get(key: string): Promise<any>
  put(key: string, value: any): Promise<void>
}
```

---

## 📏 代码规范

### TypeScript 规范

#### 1. 类型定义

```typescript
// ✅ 好的实践
interface NodeConfig {
  readonly id: string
  readonly type: NodeType
  timeout?: number
  retries?: number
}

// ❌ 避免的写法
interface NodeConfig {
  id: any // 不要使用 any
  type: string // 使用更具体的类型
}
```

#### 2. 错误处理

```typescript
// ✅ 使用结构化错误
class NodeExecutionError extends Error {
  constructor(
    message: string,
    public readonly nodeId: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'NodeExecutionError'
  }
}

// ✅ 使用 Result 类型
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }
```

#### 3. 异步处理

```typescript
// ✅ 支持取消的异步操作
async function executeWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    return await operation(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}
```

### React 组件规范

#### 1. 组件结构

```typescript
// ✅ 推荐的组件结构
interface NodeEditorProps {
  nodeId: string
  onSave: (node: NodeConfig) => void
  onCancel: () => void
}

export function NodeEditor({ nodeId, onSave, onCancel }: NodeEditorProps) {
  // 1. Hooks
  const [config, setConfig] = useState<NodeConfig>()
  const [loading, setLoading] = useState(false)
  
  // 2. 事件处理
  const handleSave = useCallback(async () => {
    // 实现
  }, [config])
  
  // 3. 副作用
  useEffect(() => {
    // 实现
  }, [nodeId])
  
  // 4. 渲染
  return (
    <div className="node-editor">
      {/* JSX */}
    </div>
  )
}
```

#### 2. 自定义 Hooks

```typescript
// ✅ 自定义 Hook 示例
function useNodeExecution(nodeId: string) {
  const [status, setStatus] = useState<ExecutionStatus>('idle')
  const [result, setResult] = useState<unknown>()
  const [error, setError] = useState<Error>()
  
  const execute = useCallback(async (input: unknown) => {
    try {
      setStatus('running')
      setError(undefined)
      const output = await executeNode(nodeId, input)
      setResult(output)
      setStatus('completed')
    } catch (err) {
      setError(err as Error)
      setStatus('failed')
    }
  }, [nodeId])
  
  return { status, result, error, execute }
}
```

---

## 🤝 协作指南

### 代码审查

#### 审查清单

**功能性**：
- [ ] 功能是否按需求实现？
- [ ] 边界条件是否处理？
- [ ] 错误处理是否完善？

**代码质量**：
- [ ] 代码结构是否清晰？
- [ ] 命名是否有意义？
- [ ] 是否遵循项目规范？

**性能**：
- [ ] 是否有性能问题？
- [ ] 内存泄漏检查
- [ ] 算法复杂度是否合理？

**测试**：
- [ ] 测试覆盖是否充分？
- [ ] 测试用例是否有效？
- [ ] CI 是否通过？

#### 审查工具

```bash
# 使用 GitHub CLI 进行代码审查
gh pr review --approve
gh pr review --request-changes --body "需要修复类型错误"
gh pr review --comment --body "建议优化性能"
```

### 沟通协作

#### 日常沟通

- **每日站会**：分享进度、讨论阻塞
- **周度回顾**：总结成果、改进流程
- **技术分享**：新技术、最佳实践

#### 文档协作

- **ADR（架构决策记录）**：重要技术决策
- **RFC（请求意见稿）**：新特性设计
- **RunBook**：运维和故障处理

#### 冲突解决

1. **代码冲突**：
   ```bash
   # 解决合并冲突
   git fetch origin main
   git rebase origin/main
   # 手动解决冲突后
   git add .
   git rebase --continue
   ```

2. **设计分歧**：通过 RFC 流程达成共识
3. **优先级冲突**：产品负责人最终决定

### 知识管理

#### 文档维护

- **API 文档**：自动生成 + 手动维护
- **架构图**：使用 Mermaid 保持同步
- **troubleshooting**：常见问题解决方案

#### 技能发展

- **技术分享会**：每月技术主题分享
- **代码审查学习**：从审查中学习最佳实践
- **开源贡献**：鼓励参与相关开源项目

---

## 🔗 相关资源

- [CLAUDE.md](../CLAUDE.md) - AI 助手工作指南
- [分支保护规则](../.github/branch-protection.md)
- [自动合并指南](../.github/AUTO_MERGE_GUIDE.md)
- [问题模板](../.github/ISSUE_TEMPLATE/)
- [PR 模板](../.github/pull_request_template.md)

## 📞 联系方式

- **技术负责人**：@tech-lead
- **产品负责人**：@product-manager  
- **DevOps 团队**：@devops-team
- **QA 团队**：@qa-team

---

*最后更新：2024年*