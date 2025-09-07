#!/bin/bash

# 🚀 快速同步 TODO.md 到 GitHub Issues
# 一键将核心任务创建为 GitHub Issues

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "🚀 快速同步 TODO.md 核心任务到 GitHub"
echo

# 检查 GitHub CLI
if ! command -v gh &> /dev/null; then
    log_warning "需要安装 GitHub CLI: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    log_warning "请先认证: gh auth login"
    exit 1
fi

# 创建核心 P0 Issues
create_core_issues() {
    log_info "创建 P0 核心任务 Issues..."
    
    # 只创建最重要的 Epic 级任务
    declare -a core_tasks=(
        "Epic: Console 统一面板|一体化运行/错误修复/测试面板，全局状态条，命令面板|type/epic,priority/high,module/studio|M1-Core-Runtime"
        "Epic: Flow 画布性能优化|大图虚拟化、自动布局、状态过滤、框选重跑|type/epic,priority/high,module/flow|M1-Core-Runtime"  
        "Epic: Inspector 强类型校验|表单即时校验、兼容性判定、迁移向导触发|type/epic,priority/high,module/inspector|M1-Core-Runtime"
        "Epic: Run Center 可观测性|Trace联动、日志过滤、链路ID贯穿|type/epic,priority/high,module/run-center|M1-Core-Runtime"
        "Epic: App Services CQRS|startRun事件流、版本管理、状态同步|type/epic,priority/high,module/services|M1-Core-Runtime"
        "Epic: 数据存储层|Dexie表结构、日志分片、NDJSON导出|type/epic,priority/high,module/data|M1-Core-Runtime"
        "Epic: Worker 运行时|沙箱执行、断网控制、超时终止|type/epic,priority/high,module/runtime|M1-Core-Runtime"
        "Feature: V1 闭环验收|三节点示例DAG完整运行流程验证|type/feature,priority/critical,module/studio|M1-Core-Runtime"
    )
    
    local created=0
    
    for task_def in "${core_tasks[@]}"; do
        IFS='|' read -r title body labels milestone <<< "$task_def"
        
        # 检查是否已存在
        if gh issue list --search "\"$title\"" --json title | grep -q "$title"; then
            log_warning "跳过已存在: $title"
            continue
        fi
        
        # 创建 Issue
        if gh issue create \
            --title "$title" \
            --body "$body" \
            --label "$labels" \
            --milestone "$milestone"; then
            log_success "创建: $title"
            created=$((created + 1))
            sleep 0.5  # 避免API限制
        fi
    done
    
    echo
    log_success "创建了 $created 个核心任务 Issues"
}

# 显示项目看板链接
show_project_info() {
    echo
    log_info "📋 查看任务进度:"
    echo "   GitHub Issues: https://github.com/$(gh repo view --json owner,name --jq '.owner.login + "/" + .name')/issues"
    echo "   本地 TODO: TODO.md"
    echo
    log_info "💡 推荐工作流:"
    echo "1. 在 TODO.md 中跟踪详细进度"
    echo "2. 使用 GitHub Issues 进行团队协作"
    echo "3. 完成任务后两边都更新状态"
}

# 主流程
main() {
    create_core_issues
    show_project_info
    
    echo
    log_success "🎉 快速同步完成！开始第一个任务吧！"
}

main "$@"