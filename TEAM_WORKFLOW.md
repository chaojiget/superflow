# 🤝 Superflow 团队协作工作流

> 本文档定义团队日常开发流程，确保高效协作和代码质量。

## 🚀 快速开始指南

### 1. 环境准备
```bash
# 克隆仓库
git clone git@github.com:chaojiget/superflow.git
cd superflow

# 安装依赖
npm install

# 验证环境
npm run type-check
npm run lint
npm run test

# 启动开发服务器
npm run dev
```

### 2. 任务领取流程
```bash
# 查看可用任务
gh issue list --milestone "M1-Core-Runtime" --label "status/ready"

# 领取任务（自我分配）
gh issue edit 123 --add-assignee "@me"

# 查看任务详情
gh issue view 123
```

### 3. 开发分支管理
```bash
# 创建功能分支
git checkout -b feature/T1.1-type-system

# 定期同步主分支
git fetch origin
git rebase origin/main

# 推送分支
git push origin feature/T1.1-type-system
```

## 📋 日常开发流程

### 阶段 1: 任务规划 (每周一)
1. **Sprint 规划会议** (1小时)
   - 回顾上周进度
   - 讨论本周目标
   - 分配新任务
   - 识别阻塞点

2. **任务准备**
   ```bash
   # 检查任务依赖
   gh issue view 123 | grep "依赖"
   
   # 确认接口约定
   cat docs/API_CONTRACTS.md
   
   # 准备开发环境
   npm run type-check
   ```

### 阶段 2: 功能开发 (周二-周四)
1. **创建开发分支**
   ```bash
   # 分支命名规范：feature/T{x.y}-{description}
   git checkout -b feature/T1.1-type-system
   ```

2. **TDD 开发循环**
   ```bash
   # 1. 编写测试（红）
   echo "describe('ExecRequest', () => { ... })" > src/__tests__/types.test.ts
   npm run test -- --watch
   
   # 2. 实现功能（绿）
   # 编写代码实现...
   
   # 3. 重构优化（重构）
   npm run lint:fix
   npm run format
   ```

3. **提交规范**
   ```bash
   # 提交信息格式：type(scope): description
   git add .
   git commit -m "feat(types): implement ExecRequest interface
   
   - Add ExecRequest interface with required fields
   - Include JSDoc documentation
   - Add JSON serialization tests
   
   Closes #123"
   ```

### 阶段 3: 代码评审 (周五)
1. **创建 Pull Request**
   ```bash
   # 推送分支
   git push origin feature/T1.1-type-system
   
   # 创建 PR
   gh pr create \
     --title "[T1.1] 类型系统基础设计与实现" \
     --body-file .github/pull_request_template.md \
     --assignee @developer \
     --reviewer @architect,@team-lead
   ```

2. **自检清单**
   - [ ] 所有测试通过
   - [ ] 代码覆盖率达标
   - [ ] TypeScript 类型检查通过
   - [ ] ESLint 规则通过
   - [ ] 文档更新完成
   - [ ] 手动测试验证

3. **响应审查意见**
   ```bash
   # 修复反馈问题
   git add .
   git commit -m "fix: address review comments on error handling"
   git push origin feature/T1.1-type-system
   ```

### 阶段 4: 集成验证
1. **合并要求**
   - [ ] 至少 1 个审查者批准
   - [ ] 所有 CI 检查通过
   - [ ] 分支与 main 保持同步
   - [ ] 冲突解决完成

2. **合并后清理**
   ```bash
   # 合并 PR 后
   git checkout main
   git pull origin main
   git branch -d feature/T1.1-type-system
   
   # 更新任务状态
   gh issue close 123 --comment "✅ 实现完成，已合并至 main 分支"
   ```

## 👥 团队协作规范

### 每日站会 (Daily Standup) - 09:00
**时长**: 15 分钟  
**参与者**: 全体开发团队

**模板**:
- **昨天完成**: 完成了什么任务/feature
- **今天计划**: 计划做什么
- **遇到阻塞**: 需要帮助的问题

```
示例：
昨天：完成了 T1.1 类型系统的接口定义，通过了所有单元测试
今天：开始 T1.2 Web Worker 运行时的实现
阻塞：Worker 安全策略配置需要和架构师确认
```

### 代码评审规范

#### 审查者责任
- **响应时间**: 24小时内完成首次审查
- **审查重点**:
  - 功能正确性
  - 代码质量和可维护性
  - 性能影响
  - 安全考虑
  - 测试覆盖度

#### 评审检查清单
```markdown
## 🔍 代码评审检查清单

### 功能性
- [ ] 实现满足需求规范
- [ ] 边界条件处理正确
- [ ] 错误处理完整

### 代码质量
- [ ] 代码结构清晰
- [ ] 命名规范一致
- [ ] 注释充分且准确
- [ ] 无代码重复

### 性能
- [ ] 无明显性能问题
- [ ] 内存使用合理
- [ ] 异步操作正确处理

### 安全性
- [ ] 输入验证充分
- [ ] 无敏感信息泄露
- [ ] 权限控制正确

### 测试
- [ ] 测试覆盖率达标
- [ ] 测试用例有意义
- [ ] 集成测试通过
```

### 沟通渠道

#### 同步沟通
- **每日站会**: 进度同步、阻塞解决
- **设计评审**: 重大技术决策讨论
- **代码评审**: 代码质量保证

#### 异步沟通
- **GitHub Issues**: 任务讨论、需求澄清
- **PR Comments**: 代码评审反馈
- **ADR (Architecture Decision Records)**: 架构决策记录

## 🔄 分支管理策略

### 分支类型
```
main                    # 主分支，受保护
├── feature/T1.1-*     # 功能分支
├── hotfix/urgent-*    # 紧急修复
└── release/v1.0.0     # 发布分支（可选）
```

### 分支命名规范
```bash
# 功能分支
feature/T{x.y}-{description}
feature/T1.1-type-system
feature/T2.3-component-library

# 修复分支
hotfix/{description}
hotfix/worker-timeout-bug
hotfix/security-vulnerability

# 发布分支
release/v{major.minor.patch}
release/v1.0.0
```

### 提交信息规范
```bash
# 格式：type(scope): description
#
# type: feat|fix|docs|style|refactor|test|chore
# scope: 影响的模块或组件
# description: 简洁描述变更内容

# 示例
feat(runtime): implement Web Worker timeout mechanism
fix(storage): handle Dexie transaction errors correctly
docs(api): update ExecRequest interface documentation
test(nodes): add integration tests for node execution
```

## 🧪 测试策略

### 测试分层
```
E2E Tests (5%)          # 用户场景端到端测试
    ↑
Integration Tests (15%) # 模块间集成测试
    ↑
Unit Tests (80%)        # 单元功能测试
```

### 测试编写规范
```typescript
// 测试文件命名：{module}.test.ts
// 描述格式：should {expected behavior} when {condition}

describe('WorkerClient', () => {
  describe('execute', () => {
    it('should return correct result when executing simple code', async () => {
      // Arrange
      const client = new WorkerClient();
      const request: ExecRequest = { ... };
      
      // Act
      const result = await client.execute(request);
      
      // Assert
      expect(result.output).toBe(expectedOutput);
      expect(result.error).toBeUndefined();
    });
    
    it('should timeout when code execution exceeds limit', async () => {
      // 测试超时场景
    });
  });
});
```

### 覆盖率要求
- **单元测试**: ≥ 80% (核心模块 ≥ 90%)
- **集成测试**: 关键路径 100% 覆盖
- **E2E 测试**: 主要用户流程覆盖

## 📊 进度跟踪

### GitHub Projects 看板
```
📋 Backlog      # 需求池
🔄 Ready        # 准备开始
🔨 In Progress  # 开发中
👀 Review       # 代码评审
🧪 Testing      # 测试验证
✅ Done         # 已完成
```

### 里程碑管理
- **M1 (Week 1-2)**: 核心运行时 🔥
- **M2 (Week 3-4)**: UI 框架基础
- **M3 (Week 5-6)**: 流程画布
- **M4 (Week 7-8)**: AI 集成
- **M5 (Week 9-10)**: 运行中心
- **M6 (Week 11-12)**: 集成组件
- **M7 (Week 13-14)**: 生产准备

### 进度报告
```markdown
## 📈 周进度报告

### 本周完成
- ✅ T1.1 类型系统基础 (@developer-a)
- ✅ T1.2 Web Worker 运行时 (@developer-b)
- 🔄 T1.3 存储层实现 (80% 完成)

### 下周计划
- 🎯 完成 M1 里程碑所有任务
- 🎯 开始 M2 UI 框架设计

### 风险与阻塞
- ⚠️ Worker 安全策略需要进一步调研
- ⚠️ Dexie 版本迁移策略待确认

### 关键指标
- 代码提交: 47 commits
- PR 合并: 12 PRs
- 测试覆盖率: 78%
- 构建成功率: 95%
```

## 🚨 应急处理流程

### 紧急 Bug 修复
```bash
# 1. 创建 hotfix 分支
git checkout -b hotfix/critical-worker-crash

# 2. 快速修复
# 编写最小修复代码...

# 3. 紧急测试
npm run test:critical

# 4. 快速评审（至少 1 人）
gh pr create --title "[HOTFIX] Fix critical worker crash" \
  --reviewer @team-lead \
  --label "priority/critical"

# 5. 立即部署
# 合并后自动触发部署
```

### 发布回滚
```bash
# 1. 确认问题
git log --oneline -10

# 2. 创建回滚 PR
git revert {problemmatic-commit}
gh pr create --title "[ROLLBACK] Revert problematic changes"

# 3. 快速合并和部署
```

## 📚 相关资源

### 文档链接
- [API 接口约定](docs/API_CONTRACTS.md)
- [架构决策记录](docs/adr/)
- [开发环境设置](docs/DEVELOPMENT_GUIDE.md)
- [部署指南](docs/DEPLOYMENT.md)

### 工具链接
- [GitHub 项目看板](https://github.com/chaojiget/superflow/projects)
- [CI/CD 状态](https://github.com/chaojiget/superflow/actions)
- [代码覆盖率报告](https://codecov.io/gh/chaojiget/superflow)

### 学习资源
- [TypeScript 严格模式](https://www.typescriptlang.org/tsconfig#strict)
- [Web Workers 最佳实践](https://developers.google.com/web/fundamentals/primers/service-workers)
- [React Flow 文档](https://reactflow.dev/)

---

**维护**: 团队共同维护  
**更新频率**: 每周回顾会后更新  
**反馈渠道**: GitHub Issues 或 团队会议