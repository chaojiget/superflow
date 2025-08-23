#!/bin/bash

# 🚀 Superflow 项目协作环境配置脚本
# 用于自动化设置 GitHub Issues, Projects, Milestones

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查必要工具
check_dependencies() {
    log_info "检查必要工具..."
    
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI (gh) 未安装"
        log_info "请安装 GitHub CLI: https://cli.github.com/"
        log_info "或者手动在 GitHub 网页端创建以下资源"
        exit 1
    fi
    
    # 检查 GitHub CLI 认证状态
    if ! gh auth status &> /dev/null; then
        log_warning "GitHub CLI 未认证"
        log_info "请运行: gh auth login"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 创建里程碑
create_milestones() {
    log_info "创建项目里程碑..."
    
    # 里程碑定义
    declare -A milestones=(
        ["M1-Core-Runtime"]="2025-09-05|核心运行时系统：Web Worker + 类型系统 + 存储层"
        ["M2-UI-Framework"]="2025-09-12|基础 UI 框架：组件库 + 状态管理 + 路由"
        ["M3-Flow-Canvas"]="2025-09-19|流程画布与节点系统：React Flow + 节点管理"
        ["M4-AI-Integration"]="2025-09-26|AI 集成：蓝图生成 + 智能修复"
        ["M5-Run-Center"]="2025-10-03|运行中心：调度器 + 监控 + 日志系统"
        ["M6-Integration"]="2025-10-10|集成组件：Web Components + SDK"
        ["M7-Production"]="2025-10-17|生产准备：性能优化 + 部署配置"
    )
    
    for milestone in "${!milestones[@]}"; do
        IFS='|' read -r due_date description <<< "${milestones[$milestone]}"
        
        if gh milestone list | grep -q "$milestone"; then
            log_warning "里程碑 $milestone 已存在，跳过"
        else
            gh milestone create "$milestone" \
                --title "$milestone" \
                --description "$description" \
                --due-date "$due_date"
            log_success "创建里程碑: $milestone"
        fi
    done
}

# 创建项目标签
create_labels() {
    log_info "创建项目标签..."
    
    # 标签定义 (name|color|description)
    declare -a labels=(
        "type/feature|0e8a16|新功能开发"
        "type/bug|d73a4a|问题修复"
        "type/refactor|fbca04|代码重构"
        "type/docs|1d76db|文档更新"
        "type/test|f9d0c4|测试相关"
        "type/perf|5319e7|性能优化"
        "priority/critical|b60205|🔥 关键路径"
        "priority/high|d93f0b|🔴 重要"
        "priority/medium|fbca04|🟡 中等"
        "priority/low|0e8a16|🔵 较低"
        "module/shared|c2e0c6|Shared 模块"
        "module/flow|bfdadc|Flow 模块"
        "module/nodes|fef2c0|Nodes 模块"
        "module/ideas|f9d0c4|Ideas 模块"
        "module/planner|d4edda|Planner 模块"
        "module/run-center|cce5df|Run Center 模块"
        "status/planning|ffffff|规划中"
        "status/ready|0e8a16|准备开始"
        "status/blocked|d73a4a|被阻塞"
        "effort/xs|e1e4e8|1-2小时"
        "effort/s|f6f8fa|半天"
        "effort/m|d1ecf1|1天"
        "effort/l|b3d4fc|2-3天"
        "effort/xl|8db4fd|1周"
        "effort/xxl|6f42c1|需要拆分"
    )
    
    for label_def in "${labels[@]}"; do
        IFS='|' read -r name color description <<< "$label_def"
        
        if gh label list | grep -q "$name"; then
            log_warning "标签 $name 已存在，跳过"
        else
            gh label create "$name" \
                --color "$color" \
                --description "$description"
            log_success "创建标签: $name"
        fi
    done
}

# 创建核心任务 Issues
create_core_issues() {
    log_info "创建核心开发任务..."
    
    # T1.1 类型系统基础
    if ! gh issue list --label "T1.1" | grep -q "T1.1"; then
        gh issue create \
            --title "[T1.1] 类型系统基础设计与实现" \
            --body-file scripts/issues/T1.1-type-system.md \
            --milestone "M1-Core-Runtime" \
            --label "type/feature,priority/critical,module/shared,effort/m" \
            --assignee ""
        log_success "创建任务: T1.1 类型系统基础"
    fi
    
    # T1.2 Web Worker 运行时
    if ! gh issue list --label "T1.2" | grep -q "T1.2"; then
        gh issue create \
            --title "[T1.2] Web Worker 沙箱运行时实现" \
            --body-file scripts/issues/T1.2-worker-runtime.md \
            --milestone "M1-Core-Runtime" \
            --label "type/feature,priority/critical,module/shared,effort/l" \
            --assignee ""
        log_success "创建任务: T1.2 Web Worker 运行时"
    fi
    
    # T1.3 存储层基础
    if ! gh issue list --label "T1.3" | grep -q "T1.3"; then
        gh issue create \
            --title "[T1.3] Dexie 存储层架构与实现" \
            --body-file scripts/issues/T1.3-storage-layer.md \
            --milestone "M1-Core-Runtime" \
            --label "type/feature,priority/high,module/shared,effort/m" \
            --assignee ""
        log_success "创建任务: T1.3 存储层基础"
    fi
}

# 设置分支保护规则
setup_branch_protection() {
    log_info "配置分支保护规则..."
    
    # 获取仓库信息
    REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
    REPO_NAME=$(gh repo view --json name --jq '.name')
    
    # 设置 main 分支保护
    gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"contexts":["quality","test"]}' \
        --field enforce_admins=true \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
        --field restrictions=null \
        --silent || log_warning "分支保护规则设置可能需要管理员权限"
    
    log_success "分支保护规则配置完成"
}

# 创建项目看板
create_project() {
    log_info "创建项目看板..."
    
    # 检查是否已存在项目
    if gh project list | grep -q "Superflow Development"; then
        log_warning "项目看板 'Superflow Development' 已存在"
    else
        gh project create \
            --title "Superflow Development" \
            --body "Superflow 开发任务管理看板"
        log_success "创建项目看板: Superflow Development"
    fi
}

# 生成团队协作指南
generate_team_guide() {
    log_info "生成团队协作指南..."
    
    cat > TEAM_WORKFLOW.md << 'EOF'
# 🤝 Superflow 团队协作指南

## 🚀 快速开始

### 1. 开发流程

```bash
# 1. 领取任务
gh issue list --milestone "M1-Core-Runtime" --assignee "@me"

# 2. 创建功能分支
git checkout -b feature/T1.1-type-system

# 3. 开发与提交
git add .
git commit -m "feat(types): implement ExecRequest interface"

# 4. 推送并创建 PR
git push origin feature/T1.1-type-system
gh pr create --assignee @reviewer --title "[T1.1] 类型系统基础设计"

# 5. 合并后清理
git checkout main && git pull origin main
git branch -d feature/T1.1-type-system
```

### 2. 任务状态流转

```
📋 Open → 🔄 In Progress → 👀 Review → 🧪 Testing → ✅ Done
```

### 3. 代码审查检查清单

- [ ] 功能完整性验证
- [ ] TypeScript 类型检查通过
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 错误处理完整
- [ ] 性能影响评估
- [ ] 文档更新

## 📊 项目面板

访问 [GitHub Projects](https://github.com/chaojiget/superflow/projects) 查看任务进度。

## 🔗 相关链接

- [API 接口约定](docs/API_CONTRACTS.md)
- [架构决策记录](docs/adr/)
- [开发环境设置](docs/DEVELOPMENT_GUIDE.md)

EOF

    log_success "生成团队协作指南: TEAM_WORKFLOW.md"
}

# 主执行流程
main() {
    echo "🚀 开始配置 Superflow 项目协作环境..."
    echo
    
    check_dependencies
    create_milestones
    create_labels
    # create_core_issues  # 需要先创建 issue 模板文件
    setup_branch_protection
    create_project
    generate_team_guide
    
    echo
    log_success "🎉 项目协作环境配置完成！"
    echo
    echo "📋 下一步操作："
    echo "1. 访问 GitHub 仓库查看创建的里程碑和标签"
    echo "2. 手动创建核心开发任务 Issues"
    echo "3. 邀请团队成员并分配权限"
    echo "4. 开始第一个迭代周期"
    echo
}

# 执行主函数
main "$@"