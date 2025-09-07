#!/bin/bash

# 🔄 从 AGENTS.md 同步任务到 GitHub Issues
# 这个脚本会解析 AGENTS.md 中的 TODO 项，并在 GitHub 上创建对应的 Issues

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 检查必要工具
check_dependencies() {
    log_info "检查必要工具..."
    
    if ! command -v gh &> /dev/null; then
        log_error "需要安装 GitHub CLI: https://cli.github.com/"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        log_error "请先认证 GitHub CLI: gh auth login"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 解析 AGENTS.md 中的 TODO 项
parse_agents_md() {
    local agents_file="AGENTS.md"
    local temp_csv="scripts/projects/tasks-from-agents.csv"
    
    log_info "解析 $agents_file 中的任务..."
    
    # 创建 CSV 头部
    echo '"Title","Body","Labels","Milestone"' > "$temp_csv"
    
    # 解析逻辑（这里是一个简化版本，你可以根据需要扩展）
    python3 << 'EOF' >> "$temp_csv"
import re
import sys

def parse_agents_todo():
    with open('AGENTS.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到 TODO 部分
    todo_match = re.search(r'## TODO(.*?)(?=^## |\Z)', content, re.MULTILINE | re.DOTALL)
    if not todo_match:
        return
    
    todo_content = todo_match.group(1)
    
    # 解析 P0 和 P1 任务
    current_priority = None
    current_epic = None
    
    lines = todo_content.split('\n')
    
    for line in lines:
        line = line.strip()
        
        # 检测优先级
        if 'P0（' in line:
            current_priority = 'p0'
            continue
        elif 'P1（' in line:
            current_priority = 'p1'
            continue
        
        # 检测主要任务（Epic 级别）
        if line.startswith('- [ ]') and '与' in line and ('性能' in line or '状态' in line or '校验' in line or '可观察' in line):
            epic_title = line.replace('- [ ]', '').strip()
            current_epic = epic_title
            
            # 输出 Epic 任务
            milestone = "M1-Core-Runtime" if current_priority == 'p0' else "M2-Debug-Obs"
            labels = f"type/epic;priority/{current_priority};project:superflow"
            
            body = f"Epic: {epic_title}\\n\\n从 AGENTS.md 自动生成的任务。"
            
            print(f'"{epic_title}","{body}","{labels}","{milestone}"')
        
        # 检测子任务
        elif line.startswith('  - [ ]'):
            if current_epic:
                task_title = line.replace('  - [ ]', '').strip()
                
                milestone = "M1-Core-Runtime" if current_priority == 'p0' else "M2-Debug-Obs"
                labels = f"type/feature;priority/{current_priority};project:superflow"
                
                body = f"任务: {task_title}\\n\\n父级Epic: {current_epic}\\n\\n从 AGENTS.md 自动生成的任务。"
                
                print(f'"{task_title}","{body}","{labels}","{milestone}"')

parse_agents_todo()
EOF

    local task_count=$(wc -l < "$temp_csv")
    task_count=$((task_count - 1)) # 减去标题行
    
    log_success "解析完成，发现 $task_count 个任务"
    echo "生成的任务文件: $temp_csv"
}

# 创建任务状态跟踪模板
create_task_tracking_template() {
    log_info "创建任务状态跟踪模板..."
    
    cat > "scripts/projects/TASK_TRACKING.md" << 'EOF'
# 🎯 Superflow 任务跟踪看板

> 这个文件提供 AGENTS.md 任务与 GitHub Issues 的映射关系，每次完成任务后更新

## 📊 进度概览

- **P0 任务**: `0/20` 完成
- **P1 任务**: `0/15` 完成  
- **当前里程碑**: M1-Core-Runtime

## 🔄 同步状态

### 最近同步
- **时间**: 未同步
- **GitHub Issues**: 0 个
- **AGENTS.md 任务**: 35 个

### 任务映射

| AGENTS.md 任务 | GitHub Issue | 状态 | 负责人 | 完成时间 |
|---------------|--------------|------|--------|----------|
| 一体化 Console 与全局状态 | #001 | 进行中 | - | - |
| 大图性能与可操作性 | #002 | 待开始 | - | - |

## 📝 使用说明

### 1. 从 AGENTS.md 同步到 GitHub
```bash
./scripts/projects/sync-github-from-agents.sh
```

### 2. 完成任务后更新
每次完成任务后：
1. 在 AGENTS.md 中勾选 `[x]` 
2. 在 GitHub Issues 中关闭对应 Issue
3. 更新这个文件的状态

### 3. 查看项目进度
```bash
./scripts/projects/check-progress.sh
```
EOF

    log_success "创建任务跟踪模板: scripts/projects/TASK_TRACKING.md"
}

# 主执行流程
main() {
    echo "🔄 Superflow 任务同步工具"
    echo "从 AGENTS.md 同步任务到 GitHub Issues"
    echo
    
    check_dependencies
    parse_agents_md
    create_task_tracking_template
    
    echo
    log_success "🎉 同步准备完成！"
    echo
    echo "📋 下一步操作："
    echo "1. 检查生成的任务文件: scripts/projects/tasks-from-agents.csv"
    echo "2. 运行创建脚本: ./scripts/projects/create-issues.sh scripts/projects/tasks-from-agents.csv"
    echo "3. 查看任务跟踪: scripts/projects/TASK_TRACKING.md"
    echo
    echo "💡 建议工作流程："
    echo "1. 在 AGENTS.md 中规划和跟踪任务（主要工具）"
    echo "2. 定期同步到 GitHub Issues（团队协作）"
    echo "3. 完成任务后同时更新两边的状态"
}

main "$@"