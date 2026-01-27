#!/bin/bash
# Session Start Hook - Restore context and inject workstream
# Context is stored in .claude/session-context.md (project-local)

# Inject workstream context (auto-detects from current directory)
# Use script's directory to find coder-config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODER_CONFIG="$SCRIPT_DIR/../cli.js"

if [ -f "$CODER_CONFIG" ]; then
  WORKSTREAM_CONTEXT=$(node "$CODER_CONFIG" workstream inject --silent 2>/dev/null)
  if [ -n "$WORKSTREAM_CONTEXT" ]; then
    echo "<workstream-context>"
    echo "$WORKSTREAM_CONTEXT"
    echo "</workstream-context>"
  fi
elif command -v coder-config &> /dev/null; then
  WORKSTREAM_CONTEXT=$(coder-config workstream inject --silent 2>/dev/null)
  if [ -n "$WORKSTREAM_CONTEXT" ]; then
    echo "<workstream-context>"
    echo "$WORKSTREAM_CONTEXT"
    echo "</workstream-context>"
  fi
fi

# Restore session context from previous session
PROJECT_CONTEXT=".claude/session-context.md"

if [ -f "$PROJECT_CONTEXT" ]; then
  echo "<session-context source=\"project\">"
  cat "$PROJECT_CONTEXT"
  echo "</session-context>"
fi

exit 0
