#!/usr/bin/env bash
# 将本仓库推送到 https://github.com/lingmaolaxieer/flowers-shop.git
#
# 用法一（推荐：token 只存在于环境变量，不写入任何文件/日志）：
#   GITHUB_TOKEN=ghp_xxxxxxxx ./scripts/push-to-github.sh
#
# 用法二（交互式，输入不回显）：
#   ./scripts/push-to-github.sh
#
# 前提：
#   1. 已在 GitHub 创建仓库 lingmaolaxieer/flowers-shop（可以是空仓库）
#   2. 已生成 Personal Access Token，且具备 repo 权限
#      （GitHub → Settings → Developer settings → Personal access tokens）
#
# 说明：public 仓库允许匿名读取，但推送必须认证，所以 token 不可省略。

set -euo pipefail
cd "$(dirname "$0")/.."

REPO_URL="https://github.com/lingmaolaxieer/flowers-shop.git"
TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  read -rsp "请输入 GitHub Personal Access Token（输入不回显）: " TOKEN
  echo
fi
if [ -z "$TOKEN" ]; then
  echo "错误：token 为空，已取消。" >&2
  exit 1
fi
export GITHUB_TOKEN="$TOKEN"

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# 用临时 credential helper 传 token：不写入 .git/config、不出现在命令行参数里
# http.version=HTTP/1.1 用于绕过部分代理环境的 HTTP2 framing 报错
git -c http.version=HTTP/1.1 \
    -c credential.helper='!f() { echo "username=x-access-token"; echo "password=${GITHUB_TOKEN}"; }; f' \
    push -u origin main

echo ""
echo "推送完成：$REPO_URL"
echo "若远端已有内容导致 non-fast-forward，请先确认后再执行："
echo "  git -c http.version=HTTP/1.1 push --force-with-lease origin main"
