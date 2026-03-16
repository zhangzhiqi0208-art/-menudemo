#!/usr/bin/env bash
# 将 bite-build-blog（Vite + React）前端合并到当前项目，原有 HTML/JS 备份到 legacy-demo/
# 使用：LOVABLE_SOURCE=/path/to/bite-build-blog bash merge-bite-build-blog.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_ROOT="$SCRIPT_DIR"
SOURCE="${LOVABLE_SOURCE:-$1}"

if [[ -z "$SOURCE" ]]; then
  echo "用法: LOVABLE_SOURCE=/path/to/bite-build-blog bash merge-bite-build-blog.sh"
  echo "  或: bash merge-bite-build-blog.sh /path/to/bite-build-blog"
  exit 1
fi

if [[ ! -d "$SOURCE" ]]; then
  echo "错误: 未找到目录: $SOURCE"
  exit 1
fi

echo "源目录 (bite-build-blog): $SOURCE"
echo "目标目录 (menudemo):       $DEMO_ROOT"
echo ""

# ---------- 备份现有 HTML/CSS/JS 到 legacy-demo ----------
LEGACY="$DEMO_ROOT/legacy-demo"
mkdir -p "$LEGACY"
for f in index.html add-dish.html; do
  if [[ -f "$DEMO_ROOT/$f" ]]; then
    cp "$DEMO_ROOT/$f" "$LEGACY/"
    echo "已备份 $f -> legacy-demo/"
  fi
done
if [[ -d "$DEMO_ROOT/css" ]]; then
  cp -r "$DEMO_ROOT/css" "$LEGACY/"
  echo "已备份 css/ -> legacy-demo/"
fi
if [[ -d "$DEMO_ROOT/js" ]]; then
  cp -r "$DEMO_ROOT/js" "$LEGACY/"
  echo "已备份 js/ -> legacy-demo/"
fi
echo ""

# ---------- 复制 bite-build-blog 根目录配置文件 ----------
for f in .gitignore package.json package-lock.json vite.config.ts tailwind.config.ts \
         postcss.config.js components.json eslint.config.js index.html vitest.config.ts \
         tsconfig.json tsconfig.app.json tsconfig.node.json; do
  if [[ -f "$SOURCE/$f" ]]; then
    cp "$SOURCE/$f" "$DEMO_ROOT/"
    echo "已复制 $f"
  fi
done

# ---------- 复制 public 和 src ----------
if [[ -d "$SOURCE/public" ]]; then
  rm -rf "$DEMO_ROOT/public" 2>/dev/null || true
  cp -r "$SOURCE/public" "$DEMO_ROOT/"
  echo "已复制 public/"
fi

if [[ -d "$SOURCE/src" ]]; then
  rm -rf "$DEMO_ROOT/src" 2>/dev/null || true
  cp -r "$SOURCE/src" "$DEMO_ROOT/"
  echo "已复制 src/"
fi

echo ""
echo "合并完成。请执行: npm install && npm run dev"
echo "原有页面与脚本已保留在 legacy-demo/ 目录。"
