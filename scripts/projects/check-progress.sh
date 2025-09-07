#!/bin/bash

# 📊 检查项目进度脚本
# 分析 AGENTS.md 中的任务完成情况

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📊 Superflow 项目进度报告"
echo "=================================="

# 分析 AGENTS.md 中的任务状态
if [[ -f "AGENTS.md" ]]; then
    echo
    echo "${BLUE}📋 AGENTS.md 任务统计${NC}"
    echo "----------------------------------"
    
    # 统计 P0 任务
    p0_total=$(grep -E "^- \[[ x]\]" AGENTS.md | wc -l | tr -d ' ')
    p0_done=$(grep -E "^- \[x\]" AGENTS.md | wc -l | tr -d ' ')
    p0_pending=$((p0_total - p0_done))
    
    # 统计子任务
    subtask_total=$(grep -E "^  - \[[ x]\]" AGENTS.md | wc -l | tr -d ' ')
    subtask_done=$(grep -E "^  - \[x\]" AGENTS.md | wc -l | tr -d ' ')
    subtask_pending=$((subtask_total - subtask_done))
    
    echo "📈 主要任务 (Epic 级):"
    echo "   总计: $p0_total"
    echo "   ✅ 完成: $p0_done"
    echo "   ⏳ 待完成: $p0_pending"
    
    echo
    echo "🔧 子任务 (Feature 级):"
    echo "   总计: $subtask_total"
    echo "   ✅ 完成: $subtask_done"
    echo "   ⏳ 待完成: $subtask_pending"
    
    # 计算完成率
    if [[ $subtask_total -gt 0 ]]; then
        completion_rate=$((subtask_done * 100 / subtask_total))
        echo
        echo "${GREEN}🎯 总体完成率: $completion_rate%${NC}"
    fi
    
    echo
    echo "${BLUE}🚀 最近完成的任务${NC}"
    echo "----------------------------------"
    
    # 显示已完成的任务
    grep -E "^  - \[x\]" AGENTS.md | head -5 | sed 's/^  - \[x\] /✅ /' || echo "暂无已完成任务"
    
    echo
    echo "${YELLOW}⏳ 下一步待完成任务${NC}"
    echo "----------------------------------"
    
    # 显示待完成的任务
    grep -E "^  - \[ \]" AGENTS.md | head -5 | sed 's/^  - \[ \] /📋 /' || echo "所有任务已完成！"
    
else
    echo "❌ 找不到 AGENTS.md 文件"
fi

# 检查 GitHub Issues 状态（如果有 gh CLI）
if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
    echo
    echo "${BLUE}🐙 GitHub Issues 统计${NC}"
    echo "----------------------------------"
    
    # 统计不同状态的 Issues
    total_issues=$(gh issue list --json number | jq length)
    open_issues=$(gh issue list --state open --json number | jq length)
    closed_issues=$(gh issue list --state closed --json number | jq length)
    
    echo "📊 Issues 概览:"
    echo "   总计: $total_issues"
    echo "   🟢 开放: $open_issues"
    echo "   ✅ 已关闭: $closed_issues"
    
    # 按里程碑统计
    echo
    echo "📅 按里程碑统计:"
    gh issue list --json milestone,state | jq -r '
        group_by(.milestone.title) | 
        map({
            milestone: (.[0].milestone.title // "无里程碑"),
            total: length,
            open: map(select(.state == "OPEN")) | length,
            closed: map(select(.state == "CLOSED")) | length
        }) | 
        .[] | 
        "   \(.milestone): \(.open)/\(.total) 开放"
    '
else
    echo
    echo "${YELLOW}💡 提示: 安装并认证 GitHub CLI 可查看 Issues 统计${NC}"
fi

echo
echo "=================================="
echo "📝 建议下一步行动:"
echo "1. 选择一个待完成任务开始工作"
echo "2. 完成后在 AGENTS.md 中勾选 [x]"
echo "3. 如有对应 GitHub Issue，记得关闭"
echo "4. 运行此脚本查看进度更新"
echo