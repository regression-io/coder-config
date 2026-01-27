#!/bin/bash
# Session End Hook - Save session info for potential resume
# Install: Add to ~/.claude/settings.json hooks.SessionEnd

# Read hook input
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
REASON=$(echo "$INPUT" | jq -r '.reason // empty')

# Skip if no session ID
[ -z "$SESSION_ID" ] && exit 0

# Session state directory
STATE_DIR="$HOME/.coder-config/sessions"
mkdir -p "$STATE_DIR"

# Save session metadata
cat > "$STATE_DIR/last-session.json" << EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "$TRANSCRIPT_PATH",
  "cwd": "$CWD",
  "reason": "$REASON",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# If there's a flushed context file, preserve it
FLUSH_FILE="$STATE_DIR/flushed-context.md"
if [ -f "$FLUSH_FILE" ]; then
  cp "$FLUSH_FILE" "$STATE_DIR/last-flushed-context.md"
fi

exit 0
