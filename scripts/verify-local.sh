#!/bin/bash

# 本地验证脚本 - 替代GitHub Actions CI
echo "🔍 开始本地验证..."

# 检查Node.js版本
echo "📦 Node.js版本:"
node --version

# 安装依赖
echo "📥 安装依赖..."
npm install

# 运行测试
echo "🧪 运行测试..."
npm test || exit 1

# 代码检查
echo "🔍 ESLint检查..."
npm run lint || exit 1

# 格式检查
echo "✨ Prettier格式检查..."
npm run format:check || exit 1

echo "✅ 所有验证通过！代码可以安全合并。"