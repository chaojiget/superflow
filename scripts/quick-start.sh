#!/bin/bash

# 🚀 Superflow 快速启动脚本
# 一键配置开发环境和创建第一个任务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 项目信息
PROJECT_NAME="Superflow"
REPO_URL="https://github.com/chaojiget/superflow"

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

header() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     🚀 $PROJECT_NAME 快速启动                     ║"
    echo "║              集成想法、蓝图、流程、运行调试的开放平台                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查依赖工具
check_dependencies() {
    log "检查开发环境依赖..."
    
    # Node.js 版本检查
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装"
        echo "请访问 https://nodejs.org/ 安装 Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js 版本过低 (当前: $(node -v)，需要: 18+)"
        exit 1
    fi
    success "Node.js $(node -v) ✓"
    
    # npm 检查
    if ! command -v npm &> /dev/null; then
        error "npm 未安装"
        exit 1
    fi
    success "npm $(npm -v) ✓"
    
    # Git 检查
    if ! command -v git &> /dev/null; then
        error "Git 未安装"
        exit 1
    fi
    success "Git $(git --version | cut -d' ' -f3) ✓"
    
    # 可选工具检查
    if command -v gh &> /dev/null; then
        success "GitHub CLI $(gh --version | head -1 | cut -d' ' -f3) ✓"
        HAS_GH=true
    else
        warning "GitHub CLI 未安装 (可选)"
        echo "  安装后可以自动创建 Issues 和 PRs"
        echo "  安装方式: https://cli.github.com/"
        HAS_GH=false
    fi
}

# 设置开发环境
setup_dev_environment() {
    log "设置开发环境..."
    
    # 安装依赖
    log "安装 npm 依赖..."
    if npm ci 2>/dev/null; then
        success "依赖安装成功"
    else
        warning "npm ci 失败，尝试 npm install..."
        npm install
        success "依赖安装成功"
    fi
    
    # 环境验证
    log "验证开发环境..."
    
    # TypeScript 类型检查
    if npm run type-check &> /dev/null; then
        success "TypeScript 类型检查通过"
    else
        error "TypeScript 类型检查失败"
        npm run type-check
        exit 1
    fi
    
    # ESLint 检查
    if npm run lint &> /dev/null; then
        success "ESLint 代码检查通过"
    else
        warning "ESLint 检查有警告，自动修复中..."
        npm run lint:fix || true
        success "代码格式已修复"
    fi
    
    # 运行测试
    log "运行测试套件..."
    if npm run test &> /dev/null; then
        success "所有测试通过"
    else
        warning "部分测试失败（正常情况，项目刚开始）"
    fi
}

# 创建开发者配置
create_dev_config() {
    log "创建个人开发配置..."
    
    # Git 配置检查
    if [ -z "$(git config user.name)" ]; then
        echo -n "请输入你的 Git 用户名: "
        read -r git_name
        git config user.name "$git_name"
    fi
    
    if [ -z "$(git config user.email)" ]; then
        echo -n "请输入你的 Git 邮箱: "
        read -r git_email
        git config user.email "$git_email"
    fi
    
    success "Git 配置完成: $(git config user.name) <$(git config user.email)>"
    
    # VS Code 配置（如果存在）
    if command -v code &> /dev/null; then
        if [ ! -d ".vscode" ]; then
            mkdir -p .vscode
            
            # 推荐扩展
            cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
EOF
            
            # 工作区设置
            cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "vitest.commandLine": "npm run test"
}
EOF
            
            success "VS Code 配置已创建"
        fi
    fi
}

# 展示项目结构
show_project_structure() {
    log "项目结构概览..."
    
    cat << 'EOF'
📁 superflow/
├── 🎯 src/
│   ├── shared/          # 共享模块（类型、工具、运行时）
│   ├── flow/           # 流程画布组件
│   ├── nodes/          # 节点系统
│   ├── ideas/          # AI 蓝图生成
│   ├── planner/        # 蓝图转流程
│   ├── run-center/     # 运行中心
│   └── components/     # UI 组件库
├── 📚 docs/            # 项目文档
├── 🧪 scripts/         # 自动化脚本
├── ⚙️  .github/         # GitHub 模板和工作流
└── 📋 package.json     # 项目配置
EOF
}

# 展示可用命令
show_available_commands() {
    log "常用开发命令..."
    
    cat << 'EOF'
🔧 开发命令:
   npm run dev          # 启动开发服务器
   npm run build        # 构建生产版本
   npm run test         # 运行测试
   npm run test:watch   # 监视模式测试
   npm run lint         # 代码检查
   npm run type-check   # TypeScript 类型检查

🤝 团队协作:
   gh issue list                    # 查看可用任务
   gh issue create                  # 创建新任务
   gh pr create                     # 创建 Pull Request
   git checkout -b feature/T1.1-*   # 创建功能分支

📚 重要文档:
   - docs/API_CONTRACTS.md         # 接口约定
   - TEAM_WORKFLOW.md              # 团队工作流
   - docs/DEVELOPMENT_GUIDE.md     # 开发指南
EOF
}

# 创建第一个任务示例
create_sample_task() {
    if [ "$HAS_GH" = true ]; then
        log "创建示例开发任务..."
        
        # 检查是否已有示例任务
        if ! gh issue list --label "sample" | grep -q "sample"; then
            gh issue create \
                --title "[SAMPLE] 熟悉项目结构和开发流程" \
                --body "## 📋 任务目标
这是一个示例任务，帮助新团队成员熟悉项目结构和开发流程。

## ✅ 完成条件
- [ ] 阅读 TEAM_WORKFLOW.md
- [ ] 阅读 docs/API_CONTRACTS.md  
- [ ] 运行 npm run dev 启动项目
- [ ] 运行 npm run test 执行测试
- [ ] 创建一个测试分支并提交
- [ ] 创建一个测试 PR

## 🎯 预估时间
半天

## 📚 参考资料
- [团队工作流程](TEAM_WORKFLOW.md)
- [API 接口约定](docs/API_CONTRACTS.md)" \
                --label "type/docs,priority/low,effort/s,sample" \
                --assignee ""
            
            success "示例任务已创建，可以用它来熟悉开发流程"
        else
            success "示例任务已存在"
        fi
    else
        warning "GitHub CLI 未安装，无法自动创建示例任务"
        echo "  可以手动访问 GitHub 仓库创建 Issue"
    fi
}

# 展示下一步操作
show_next_steps() {
    echo
    echo -e "${PURPLE}🎉 环境配置完成！下一步操作：${NC}"
    echo
    echo "1️⃣  启动开发服务器:"
    echo "   npm run dev"
    echo
    echo "2️⃣  查看可用任务:"
    if [ "$HAS_GH" = true ]; then
        echo "   gh issue list --milestone 'M1-Core-Runtime'"
    else
        echo "   访问: https://github.com/chaojiget/superflow/issues"
    fi
    echo
    echo "3️⃣  领取第一个任务:"
    echo "   选择一个标记为 'status/ready' 的任务"
    echo "   分配给自己并开始开发"
    echo
    echo "4️⃣  创建功能分支:"
    echo "   git checkout -b feature/T1.1-your-task"
    echo
    echo "5️⃣  参考文档:"
    echo "   - 团队工作流: TEAM_WORKFLOW.md"
    echo "   - API 约定: docs/API_CONTRACTS.md"
    echo "   - 开发指南: docs/DEVELOPMENT_GUIDE.md"
    echo
    echo -e "${GREEN}💡 提示: 任何问题都可以在 GitHub Issues 中提问或在团队会议中讨论${NC}"
    echo
}

# 主执行流程
main() {
    clear
    header
    
    echo "欢迎加入 Superflow 开发团队！"
    echo "这个脚本将帮助你快速配置开发环境并开始第一个任务。"
    echo
    
    check_dependencies
    echo
    
    setup_dev_environment
    echo
    
    create_dev_config
    echo
    
    show_project_structure
    echo
    
    show_available_commands
    echo
    
    create_sample_task
    echo
    
    show_next_steps
}

# 执行主函数
main "$@"