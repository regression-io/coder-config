#!/bin/bash
# Gemini CLI Workstream Injection Hook
# Install: Add to ~/.gemini/settings.json hooks configuration
#
# This hook injects workstream context at session start, restricting
# the agent to work within specified directories.

# Exit silently if claude-config isn't available
if ! command -v claude-config &> /dev/null; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Read input from stdin (Gemini passes JSON)
input=$(cat)

# Check for active workstream via env var
if [ -z "$CLAUDE_WORKSTREAM" ]; then
  # No workstream active, allow without context
  echo '{"decision": "allow"}'
  exit 0
fi

# Get workstream injection content
context=$(claude-config workstream inject --silent 2>/dev/null)

if [ -n "$context" ]; then
  # Escape the context for JSON
  escaped_context=$(echo "$context" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

  # Return with additional context to inject
  cat <<EOF
{
  "decision": "allow",
  "hookSpecificOutput": {
    "additionalContext": $escaped_context
  }
}
EOF
else
  echo '{"decision": "allow"}'
fi

exit 0
