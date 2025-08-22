# CI/CD 流程文档

## 🔄 概览

本项目实现了完整的 CI/CD 流程，支持多提交者协作，包含自动化测试、代码质量检查、安全扫描和多环境部署。

## 🏗️ 工作流程图

```
Pull Request → CI 检查 → 代码审查 → 自动合并 → 部署
     ↓            ↓         ↓         ↓        ↓
   标签分类    测试+构建   人工审核   合并到main   发布
   自动分配     代码质量                      通知团队
   大小标记     安全扫描
```

## 📋 工作流详细说明

### 1. 主 CI 流程 (`.github/workflows/ci.yml`)

**触发条件:**
- Push到 `main`、`develop` 分支
- 针对这些分支的Pull Request

**执行内容:**
- ✅ **多版本测试**: Node.js 18, 20
- ✅ **类型检查**: TypeScript编译检查
- ✅ **代码规范**: ESLint检查
- ✅ **测试覆盖率**: Vitest + 覆盖率报告
- ✅ **项目构建**: Vite构建验证
- ✅ **并发执行**: 取消重复运行以节省资源

### 2. 自动合并流程 (`.github/workflows/auto-merge.yml`)

**触发条件:**
- PR标签变更、同步、审查等
- Check Suite完成

**自动合并条件:**
- ✅ 所有必需CI检查通过
- ✅ 获得足够的审批 (Dependabot: 0个, 其他: 1个)
- ✅ 满足以下任一条件:
  - 包含 `auto-merge`、`ready-to-merge`、`dependencies` 标签
  - Dependabot创建的PR
  - 标题包含 `[auto-merge]`

**合并方式:** Squash merge + 自动删除分支

### 3. 安全检查流程 (`.github/workflows/security.yml`)

**触发条件:**
- 每日凌晨2点定时运行
- Push到main分支
- Pull Request

**安全检查项:**
- 🔒 **依赖漏洞扫描**: npm audit + Snyk
- 🔍 **代码安全分析**: GitHub CodeQL
- 🔐 **密钥泄露检测**: GitLeaks

### 4. 代码质量检查 (`.github/workflows/quality.yml`)

**检查项目:**
- 📊 **测试覆盖率**: Codecov集成
- 🏆 **代码质量**: SonarCloud分析
- 📈 **气候评分**: Code Climate
- 📦 **包大小检查**: Size Limit
- ⚡ **性能检查**: Lighthouse CI (仅PR)

### 5. 部署流程 (`.github/workflows/deploy.yml`)

**环境配置:**
- 🧪 **Staging**: 自动部署(main分支push)
- 🚀 **Production**: 标签部署或手动触发

**部署步骤:**
1. 构建应用
2. 上传构建产物
3. 部署到对应环境
4. 创建GitHub Release (生产环境)
5. 发送部署通知

### 6. PR自动标记 (`.github/workflows/pr-labeler.yml`)

**自动功能:**
- 🏷️ **文件变更标记**: 根据修改文件自动打标签
- 📏 **PR大小标记**: XS/S/M/L/XL
- 👥 **自动分配审查者**: 根据文件类型分配

## 🎯 自动合并策略

### 适用场景:
1. **依赖更新**: Dependabot PR自动合并
2. **小型修复**: 标记为 `auto-merge` 的PR
3. **已审查PR**: 包含 `ready-to-merge` 标签

### 安全保障:
- 🛡️ 所有CI检查必须通过
- 👀 非Dependabot PR需要人工审查
- 🔄 自动删除已合并分支
- 📝 标准化提交信息

## 🏷️ 标签系统

### 文件类型标签:
- `frontend`: 前端组件、样式
- `backend`: API、服务逻辑
- `tests`: 测试文件
- `documentation`: 文档更新
- `ci/cd`: CI/CD配置
- `dependencies`: 依赖更新

### 大小标签:
- `size/XS`: ≤10行变更
- `size/S`: ≤30行变更
- `size/M`: ≤100行变更
- `size/L`: ≤500行变更
- `size/XL`: >500行变更

### 特殊标签:
- `auto-merge`: 自动合并候选
- `ready-to-merge`: 已审查，准备合并
- `dependencies`: 依赖更新

## 🔧 配置文件说明

| 文件 | 用途 |
|------|------|
| `.github/dependabot.yml` | 依赖自动更新配置 |
| `.github/labeler.yml` | 自动标签规则 |
| `.github/auto-assign.yml` | 自动分配审查者 |
| `vitest.config.ts` | 测试和覆盖率配置 |
| `lighthouserc.json` | 性能检查配置 |
| `sonar-project.properties` | 代码质量分析 |

## 🚀 部署环境

### Staging环境
- **URL**: https://staging.superflow.dev
- **触发**: main分支push
- **用途**: 功能验证、集成测试

### Production环境
- **URL**: https://superflow.dev
- **触发**: 版本标签 (v*.*.*)
- **用途**: 正式生产环境

## 📊 质量门禁

### 测试覆盖率要求:
- 分支覆盖率: ≥70%
- 函数覆盖率: ≥70%
- 行覆盖率: ≥70%
- 语句覆盖率: ≥70%

### 性能要求:
- Performance Score: ≥80%
- Accessibility Score: ≥90%
- Best Practices: ≥85%
- SEO Score: ≥80%

### 包大小限制:
- 总体大小: ≤100KB

## 🛠️ 开发者指南

### 创建PR:
1. 从 `main` 分支创建功能分支
2. 进行开发并提交代码
3. 创建PR，系统会自动:
   - 添加相关标签
   - 分配审查者
   - 运行CI检查

### 自动合并PR:
- 添加 `auto-merge` 标签
- 或在标题中包含 `[auto-merge]`
- 确保所有检查通过

### 发布版本:
1. 更新 `package.json` 中的版本号
2. 创建并推送版本标签: `git tag v1.0.0 && git push origin v1.0.0`
3. 系统会自动部署到生产环境

## 🔍 监控和通知

### 可用集成:
- **Codecov**: 测试覆盖率追踪
- **SonarCloud**: 代码质量分析
- **Snyk**: 安全漏洞监控
- **Lighthouse**: 性能监控

### 通知渠道:
- GitHub通知
- 部署状态通知
- 可扩展: Slack、Discord、Email

## 🆘 故障排除

### 常见问题:

1. **CI检查失败**:
   - 查看具体失败的步骤
   - 本地运行相同命令进行调试

2. **自动合并不工作**:
   - 确认PR有正确的标签
   - 检查所有CI检查是否通过
   - 验证审查要求是否满足

3. **部署失败**:
   - 检查构建产物是否正确生成
   - 验证部署环境配置
   - 查看部署日志获取详细信息

### 调试建议:
- 使用GitHub Actions的日志查看详细输出
- 本地运行 `npm run test`、`npm run lint`、`npm run build` 进行预检查
- 确保所有必需的secrets已配置

## 🔄 持续改进

这个CI/CD流程是动态的，会根据项目需求持续优化:
- 监控构建时间并优化
- 根据团队反馈调整自动化规则
- 增加新的质量检查工具
- 优化部署流程