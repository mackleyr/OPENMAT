#!/usr/bin/env bash
set -euo pipefail

CTX_DIR=".chatgpt-context"
mkdir -p "$CTX_DIR"

# Files/folders to include in the snapshot
INCLUDE=(api routes client/src package.json package-lock.json README.md)

rsync -a --delete \
  --exclude ".env" --exclude "**/.env" --exclude ".env.*" \
  "${INCLUDE[@]}" "$CTX_DIR/" 2>/dev/null || true

{
  echo "# What changed"
  echo
  echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "Commit: $(git rev-parse --short HEAD)"
  echo
  echo "## Last commit message"
  echo
  git log -1 --pretty=format:"%s%n%n%b" || true
  echo
  echo "## Diff (name+status vs previous commit)"
  echo
  echo 
  echo
  echo "## Uncommitted changes (if any)"
  echo
  echo 
} > "$CTX_DIR/WHAT_CHANGED.md"

# Safety: remove any .env files
find "$CTX_DIR" -type f -name ".env*" -delete 2>/dev/null || true

# Commit snapshot if changed
if [ -n "$(git status --porcelain "$CTX_DIR")" ]; then
  git config user.name "anddeals bot"
  git config user.email "bot@users.noreply.github.com"
  git add "$CTX_DIR"
  git commit -m "chore(context): refresh .chatgpt-context"
else
  echo "No changes detected in $CTX_DIR"
fi
