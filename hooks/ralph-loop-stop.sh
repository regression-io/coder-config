#!/bin/bash
# Ralph Loop continuation hook (coder-config)
# Called when Claude tries to stop - blocks exit and feeds prompt back
#
# Uses CODER_LOOP_ID env var to identify active loop
# State stored in ~/.coder-config/loops/<id>/state.json

set -euo pipefail

LOOP_ID="${CODER_LOOP_ID:-}"
if [[ -z "$LOOP_ID" ]]; then
  exit 0
fi

STATE_FILE="$HOME/.coder-config/loops/$LOOP_ID/state.json"
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# Check if loop is still active
STATUS=$(jq -r '.status' "$STATE_FILE")
if [[ "$STATUS" != "running" ]]; then
  exit 0
fi

# Get loop config
CURRENT_ITER=$(jq -r '.iterations.current // 0' "$STATE_FILE")
MAX_ITER=$(jq -r '.iterations.max // 50' "$STATE_FILE")
COMPLETION_PROMISE=$(jq -r '.completionPromise // "DONE"' "$STATE_FILE")
TASK=$(jq -r '.task.original // ""' "$STATE_FILE")

# Check iteration limit
if [[ $MAX_ITER -gt 0 ]] && [[ $CURRENT_ITER -ge $MAX_ITER ]]; then
  jq '.status = "paused" | .pauseReason = "max_iterations" | .updatedAt = (now | todate)' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
  exit 0
fi

# Read hook input to check for completion
HOOK_INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path // ""')

if [[ -n "$TRANSCRIPT_PATH" ]] && [[ -f "$TRANSCRIPT_PATH" ]]; then
  # Get last assistant message
  LAST_OUTPUT=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -1 | jq -r '
    .message.content |
    map(select(.type == "text")) |
    map(.text) |
    join("\n")
  ' 2>/dev/null || echo "")

  # Check for completion promise
  if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
    if echo "$LAST_OUTPUT" | grep -qF "$COMPLETION_PROMISE"; then
      jq '.status = "completed" | .taskComplete = true | .completedAt = (now | todate) | .updatedAt = (now | todate)' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
      exit 0
    fi
  fi
fi

# Not complete - continue loop
NEXT_ITER=$((CURRENT_ITER + 1))
jq ".iterations.current = $NEXT_ITER | .updatedAt = (now | todate)" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

# Build system message
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
  SYSTEM_MSG="🔄 Ralph iteration $NEXT_ITER/$MAX_ITER | Output '$COMPLETION_PROMISE' when task is complete"
else
  SYSTEM_MSG="🔄 Ralph iteration $NEXT_ITER/$MAX_ITER | No completion promise set"
fi

# Output JSON to block stop and feed prompt back
jq -n \
  --arg prompt "$TASK" \
  --arg msg "$SYSTEM_MSG" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'

exit 0
