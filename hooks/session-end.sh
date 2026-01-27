#!/bin/bash
# Session End Hook - Log session info
# Context is saved by /flush to .claude/session-context.md (project-local)

# Read hook input
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Skip if no session ID
[ -z "$SESSION_ID" ] && exit 0

# Log session end (optional, for debugging)
# echo "Session $SESSION_ID ended" >> /tmp/claude-sessions.log

exit 0
