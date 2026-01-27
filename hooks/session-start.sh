#!/bin/bash
# Session Start Hook - Restore context from previous session
# Install: Add to ~/.claude/settings.json hooks.SessionStart

# Session state directory
STATE_DIR="$HOME/.coder-config/sessions"

# Check for saved context to inject
LAST_CONTEXT="$STATE_DIR/last-flushed-context.md"
LAST_SESSION="$STATE_DIR/last-session.json"

# Only inject if we have flushed context
if [ -f "$LAST_CONTEXT" ]; then
  # Check if context is recent (within 24 hours)
  if [ "$(uname)" = "Darwin" ]; then
    # macOS
    FILE_AGE=$(( $(date +%s) - $(stat -f %m "$LAST_CONTEXT") ))
  else
    # Linux
    FILE_AGE=$(( $(date +%s) - $(stat -c %Y "$LAST_CONTEXT") ))
  fi

  # 24 hours = 86400 seconds
  if [ "$FILE_AGE" -lt 86400 ]; then
    # Output context - Claude will see this in the session
    echo "<session-context source=\"previous-session\">"
    echo "The following context was saved from a previous session:"
    echo ""
    cat "$LAST_CONTEXT"
    echo ""
    echo "</session-context>"
  fi
fi

exit 0
