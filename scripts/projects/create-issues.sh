#!/bin/bash

# 🚀 Superflow 批量创建 GitHub Issues 脚本
# 基于 CSV 文件创建 Issues 并自动分配到项目

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
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) 未安装"
        log_info "请安装 GitHub CLI: https://cli.github.com/"
        exit 1
    fi
    
    # 检查 GitHub CLI 认证状态
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI 未认证"
        log_info "请运行: gh auth login"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 检查 CSV 文件是否存在
check_csv_file() {
    local csv_file="$1"
    if [[ ! -f "$csv_file" ]]; then
        log_error "CSV 文件不存在: $csv_file"
        exit 1
    fi
    log_success "找到 CSV 文件: $csv_file"
}

# 创建 Issue 详细内容文件（如果不存在）
create_issue_body_if_missing() {
    local body_file="$1"
    local title="$2"
    
    # 如果 body 文件不存在，创建一个基础模板
    if [[ ! -f "$body_file" ]]; then
        log_warning "Body 文件不存在: $body_file，创建基础模板"
        
        # 确保目录存在
        mkdir -p "$(dirname "$body_file")"
        
        cat > "$body_file" << EOF
## 目标
${title}

## 范围（Scope）
- 包含：
- 不含：

## 验收标准（Acceptance Criteria）
- [ ] 
- [ ] 
- [ ] 

## 依赖
- 

## 测试与度量
- 单元测试：
- 集成测试：
- 性能指标：

## 参考
- AGENTS.md 相关章节
- 相关文件路径
EOF
        log_success "创建了基础模板: $body_file"
    fi
}

# 从 CSV 创建 Issues
create_issues_from_csv() {
    local csv_file="$1"
    local dry_run="${2:-false}"
    
    log_info "开始处理 CSV 文件: $csv_file"
    
    # 跳过标题行，逐行处理
    local line_count=0
    local created_count=0
    local skipped_count=0
    
    while IFS= read -r line; do
        line_count=$((line_count + 1))
        
        # 跳过标题行
        if [[ $line_count -eq 1 ]]; then
            continue
        fi
        
        # 跳过空行
        if [[ -z "$line" ]]; then
            continue
        fi
        
        # 解析 CSV 行 (Title,Body,Labels,Milestone)
        # 使用 Python 来正确解析 CSV（处理引号内的逗号）
        local parsed=$(python3 -c "
import csv
import sys
line = '''$line'''
reader = csv.reader([line])
row = next(reader)
print('|||'.join(row))
")
        
        IFS='|||' read -r title body_ref labels milestone <<< "$parsed"
        
        # 清理字段（移除引号）
        title=$(echo "$title" | sed 's/^"//; s/"$//')
        body_ref=$(echo "$body_ref" | sed 's/^"//; s/"$//')
        labels=$(echo "$labels" | sed 's/^"//; s/"$//')
        milestone=$(echo "$milestone" | sed 's/^"//; s/"$//')
        
        log_info "处理任务: $title"
        
        # 检查是否已存在相同标题的 Issue
        if gh issue list --search "\"$title\"" --json title | grep -q "$title"; then
            log_warning "Issue 已存在，跳过: $title"
            skipped_count=$((skipped_count + 1))
            continue
        fi
        
        # 处理 body 文件引用
        local body_content=""
        if [[ "$body_ref" =~ ^"详见 repo: " ]]; then
            # 提取文件路径
            local body_file=$(echo "$body_ref" | sed 's/详见 repo: //')
            if [[ -f "$body_file" ]]; then
                body_content=$(cat "$body_file")
            else
                create_issue_body_if_missing "$body_file" "$title"
                body_content=$(cat "$body_file")
            fi
        else
            body_content="$body_ref"
        fi
        
        # 如果是 dry-run 模式，只显示将要创建的内容
        if [[ "$dry_run" == "true" ]]; then
            echo "----------------------------------------"
            echo "Title: $title"
            echo "Labels: $labels"
            echo "Milestone: $milestone"
            echo "Body: $(echo "$body_content" | head -3)..."
            echo "----------------------------------------"
            continue
        fi
        
        # 创建 Issue
        local create_cmd="gh issue create --title \"$title\""
        
        # 添加标签
        if [[ -n "$labels" ]]; then
            # 将分号分隔的标签转换为逗号分隔
            local formatted_labels=$(echo "$labels" | tr ';' ',')
            create_cmd="$create_cmd --label \"$formatted_labels\""
        fi
        
        # 添加里程碑
        if [[ -n "$milestone" ]]; then
            create_cmd="$create_cmd --milestone \"$milestone\""
        fi
        
        # 添加内容
        create_cmd="$create_cmd --body \"$body_content\""
        
        # 执行创建命令
        if eval "$create_cmd"; then
            log_success "创建成功: $title"
            created_count=$((created_count + 1))
            
            # 添加短暂延迟，避免 API 限制
            sleep 1
        else
            log_error "创建失败: $title"
        fi
    done < "$csv_file"
    
    echo
    log_success "批量创建完成！"
    echo "  📊 总计处理: $((line_count - 1)) 个任务"
    echo "  ✅ 成功创建: $created_count 个"
    echo "  ⏭️  跳过重复: $skipped_count 个"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [OPTIONS] <csv_file>"
    echo
    echo "选项:"
    echo "  -d, --dry-run    仅显示将要创建的 Issues，不实际创建"
    echo "  -h, --help       显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 scripts/projects/issues-complete.csv"
    echo "  $0 --dry-run scripts/projects/issues-complete.csv"
}

# 主执行流程
main() {
    local dry_run=false
    local csv_file=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                if [[ -z "$csv_file" ]]; then
                    csv_file="$1"
                else
                    log_error "未知参数: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # 检查 CSV 文件参数
    if [[ -z "$csv_file" ]]; then
        log_error "请指定 CSV 文件路径"
        show_help
        exit 1
    fi
    
    echo "🚀 Superflow Issues 批量创建工具"
    echo
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "🔍 Dry-run 模式 - 仅预览，不会实际创建"
        echo
    fi
    
    check_dependencies
    check_csv_file "$csv_file"
    
    echo
    create_issues_from_csv "$csv_file" "$dry_run"
    
    if [[ "$dry_run" == "false" ]]; then
        echo
        log_success "🎉 批量创建完成！"
        echo
        echo "📋 下一步操作："
        echo "1. 访问 GitHub 仓库查看创建的 Issues"
        echo "2. 检查 Issues 是否正确分配到里程碑"
        echo "3. 根据需要调整标签和优先级"
        echo "4. 开始分配给团队成员"
    fi
}

# 执行主函数
main "$@"