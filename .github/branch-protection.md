# 分支保护规则配置指南

本文档说明如何为 Superflow 项目配置 GitHub 分支保护规则。

## 主分支保护 (main)

### 必需设置

1. **要求 PR 审查**
   - 至少需要 2 个审查者批准
   - 代码所有者必须审查
   - 在新提交时取消过时的审查

2. **要求状态检查通过**
   - Code Quality ✅
   - Test (Node 18.x) ✅
   - Test (Node 20.x) ✅
   - Test (Node 22.x) ✅
   - Module Tests ✅
   - Integration Tests ✅

3. **要求分支保持最新**
   - 在合并前要求分支与主分支同步

4. **限制推送**
   - 禁止直接推送到 main 分支
   - 包括管理员在内的所有人都必须通过 PR

5. **限制强制推送**
   - 禁止 `git push --force`

6. **要求线性历史**
   - 强制使用 squash merge 或 rebase merge

### GitHub CLI 配置命令

```bash
# 创建分支保护规则
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Code Quality","Test (Node 18.x)","Test (Node 20.x)","Test (Node 22.x)","Module Tests","Integration Tests"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":true,"required_approving_review_count":2}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_linear_history=true
```

## 功能分支模式

### codex/* 分支

用于功能开发的临时分支：

- 基于 main 分支创建
- 命名格式：`codex/feature-description`
- 合并后自动删除
- 无特殊保护规则

### release/* 分支

用于发布准备的分支：

- 命名格式：`release/v1.2.3`
- 要求 1 个审查者批准
- 要求所有 CI 检查通过
- 禁止强制推送

## 模块负责人权限

### Ideas 模块 (@ideas-team)
- 对 `src/ideas/` 路径有审查权限
- 可以批准该模块的更改
- 需要参与架构决策

### Planner 模块 (@planner-team)
- 对 `src/planner/` 路径有审查权限
- 算法相关更改需要 @algorithm-engineer 参与

### Flow 模块 (@flow-team)
- 对 `src/flow/` 路径有审查权限
- UI/UX 更改需要 @ux-designer 参与

### Nodes 模块 (@nodes-team)
- 对 `src/nodes/` 路径有审查权限
- 节点执行逻辑需要 @backend-engineer 审查

### Run Center 模块 (@run-center-team)
- 对 `src/run-center/` 路径有审查权限
- 监控相关更改需要 @monitoring-team 参与

### Shared 模块 (@shared-team)
- 对 `src/shared/` 路径有审查权限
- 核心更改需要 @tech-lead 参与

## 自动合并规则

### 触发条件

1. PR 标题包含 `[auto-merge]`
2. 或者 PR 打上 `auto-merge` 标签

### 前置条件

1. 所有必需的状态检查通过
2. 获得足够的审查批准
3. 没有合并冲突
4. 分支是最新的

### 实施步骤

```yaml
# .github/workflows/auto-merge.yml 已配置
# 无需额外操作，满足条件时自动触发
```

## 紧急修复流程

### 热修复分支 (hotfix/*)

用于生产环境紧急修复：

1. 从 main 分支创建 `hotfix/issue-description`
2. 应用最小化修复
3. 快速审查（1 个审查者）
4. 合并后立即发布

### 配置命令

```bash
# 为热修复分支创建宽松规则
gh api repos/:owner/:repo/branches/hotfix%2F*/protection \
  --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field required_status_checks='{"strict":false,"contexts":["Code Quality","Test (Node 20.x)"]}' \
  --field enforce_admins=false
```

## 权限分配建议

### 团队创建

```bash
# 创建各模块团队
gh api orgs/:org/teams --field name="ideas-team" --field description="Ideas模块开发团队"
gh api orgs/:org/teams --field name="planner-team" --field description="Planner模块开发团队"
gh api orgs/:org/teams --field name="flow-team" --field description="Flow模块开发团队"
gh api orgs/:org/teams --field name="nodes-team" --field description="Nodes模块开发团队"
gh api orgs/:org/teams --field name="run-center-team" --field description="RunCenter模块开发团队"
gh api orgs/:org/teams --field name="shared-team" --field description="Shared模块开发团队"
gh api orgs/:org/teams --field name="qa-team" --field description="质量保证团队"
```

### 成员分配示例

```bash
# 将成员添加到相应团队
gh api orgs/:org/teams/ideas-team/memberships/:username --method PUT
gh api orgs/:org/teams/planner-team/memberships/:username --method PUT
# ... 其他团队
```

## 监控和度量

### 关键指标

1. **合并频率**：每天平均合并的 PR 数量
2. **审查时间**：从创建 PR 到合并的平均时间
3. **CI 成功率**：状态检查的通过率
4. **回滚频率**：需要热修复的频率

### 定期审查

- 每月审查分支保护规则的有效性
- 根据团队反馈调整审查要求
- 监控自动合并的使用情况和成功率

## 故障排除

### 常见问题

1. **CI 检查卡住**：检查 GitHub Actions 配额和状态
2. **审查者不可用**：临时调整 CODEOWNERS 或添加后备审查者
3. **合并冲突**：指导开发者解决冲突的流程

### 紧急联系

- 技术负责人：@tech-lead
- DevOps 团队：@devops-team
- 安全团队：@security-team