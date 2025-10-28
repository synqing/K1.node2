#!/usr/bin/env bash
set -euo pipefail

# Installs a pre-commit hook that validates docs frontmatter before commits.

HOOK_DIR=".git/hooks"
HOOK_FILE="${HOOK_DIR}/pre-commit"

if [ ! -d ".git" ]; then
  echo "This script must be run from the repo root (with a .git directory)." >&2
  exit 1
fi

mkdir -p "$HOOK_DIR"
cat > "$HOOK_FILE" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "Running docs frontmatter validation..."
node tools/src/docs-frontmatter-check.js || {
  echo "\nFrontmatter validation failed. Fix errors before committing." >&2
  exit 1
}
EOF

chmod +x "$HOOK_FILE"
echo "Installed pre-commit hook at $HOOK_FILE"

