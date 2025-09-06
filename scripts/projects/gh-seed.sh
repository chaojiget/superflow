#!/usr/bin/env bash
set -euo pipefail

# 用法：./gh-seed.sh <owner/repo>
# 依赖：gh（已登录）、csvtool 或 awk

REPO=${1:-}
CSV="$(dirname "$0")/issues.csv"

if [[ -z "$REPO" ]]; then
  echo "用法：$0 <owner/repo>  例如：$0 yourname/superflow" >&2
  exit 1
fi

if [[ ! -f "$CSV" ]]; then
  echo "未找到 $CSV" >&2
  exit 1
fi

echo "开始导入 Issues 至 $REPO ..."

# 读取 CSV，跳过首行表头
tail -n +2 "$CSV" | while IFS=',' read -r title milestone labels body_file; do
  title=$(echo "$title" | sed 's/^\"//; s/\"$//')
  milestone=$(echo "$milestone" | sed 's/^\"//; s/\"$//')
  labels=$(echo "$labels" | sed 's/^\"//; s/\"$//')
  body_file=$(echo "$body_file" | sed 's/^\"//; s/\"$//')

  if [[ ! -f "$body_file" ]]; then
    echo "Body 文件不存在：$body_file，跳过 $title" >&2
    continue
  fi

  body=$(cat "$body_file")

  echo "创建 Issue: $title"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    ${milestone:+--milestone "$milestone"}
done

echo "完成。"

