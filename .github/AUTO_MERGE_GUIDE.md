# 自动合并CI/CD使用指南

本项目配置了完整的自动合并和测试流程，包含以下功能：

## 🚀 主要功能

### 1. 自动测试和构建 (CI/CD Pipeline)

- **触发条件**: 推送到main分支或创建PR到main分支
- **执行内容**:
  - 多版本Node.js测试 (18.x, 20.x, 22.x)
  - ESLint代码检查
  - Prettier格式检查
  - Vitest单元测试
  - Grunt构建

### 2. 自动合并 (Auto Merge)

- **dependabot自动合并**: dependabot创建的PR会在测试通过后自动合并
- **标签触发合并**: 添加`auto-merge`标签的PR会自动合并
- **标题触发合并**: 包含`[auto-merge]`的PR会自动合并
- **功能分支合并**: 添加`ready-to-merge`标签或`[ready]`标题的分支会自动合并

### 3. 自动分支清理

- **合并后清理**: PR合并后自动删除源分支
- **定时清理**: 每天凌晨2点自动删除已合并和过期分支
- **手动清理**: 支持手动触发分支清理

### 4. 测试流程

- **冲突检测**: 自动检测合并冲突
- **完整测试**: 运行完整测试套件
- **构建验证**: 确保代码可正常构建

## 📝 使用方法

### 自动合并PR

1. **使用标签**:

   ```bash
   gh pr create --title "feat: 新功能" --body "描述" --label "auto-merge"
   ```

2. **使用标题**:

   ```bash
   gh pr create --title "[auto-merge] feat: 新功能" --body "描述"
   ```

3. **功能分支**:
   ```bash
   gh pr create --title "[ready] feat: 完成的功能" --body "描述"
   ```

### 手动触发清理

```bash
gh workflow run cleanup-branches.yml
```

### 测试CI流程

```bash
gh workflow run test-ci.yml
```

## ⚙️ 配置文件说明

- `.github/workflows/npm-grunt.yml`: 主CI/CD流程
- `.github/workflows/auto-merge.yml`: 自动合并逻辑
- `.github/workflows/cleanup-branches.yml`: 分支清理
- `.github/workflows/test-ci.yml`: CI测试验证

## 🔧 本地测试

在提交前可以本地运行相同的检查：

```bash
# 安装依赖
npm ci

# 运行测试
npm run test

# 代码检查
npm run lint

# 格式检查
npm run format -- --check

# 构建项目
npx grunt
```

## 🛡️ 安全特性

- 所有合并都需要通过完整测试
- 自动检测合并冲突
- 保护主分支不被意外删除
- 使用GitHub token进行安全操作

## 📋 检查清单

PR创建前确认：

- [ ] 测试通过
- [ ] 代码格式正确
- [ ] 没有ESLint错误
- [ ] 构建成功
- [ ] 添加适当的标签或标题

## 🚨 故障排除

如果自动合并失败：

1. 检查测试是否通过
2. 确认没有合并冲突
3. 验证权限配置
4. 查看Actions日志
