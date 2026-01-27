#!/bin/bash
# Session Start Hook - Restore context from previous session
# Context is stored in .claude/session-context.md (project-local)

PROJECT_CONTEXT=".claude/session-context.md"

if [ -f "$PROJECT_CONTEXT" ]; then
  echo "<session-context source=\"project\">"
  cat "$PROJECT_CONTEXT"
  echo "</session-context>"
fi

exit 0
