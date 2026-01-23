#!/bin/bash
# Ralph Loop continuation hook
# Called after each Claude response to manage loop continuation
#
# This hook:
# 1. Checks if we're in an active loop (via CODER_LOOP_ID env var)
# 2. Verifies the loop is still running
# 3. Checks budget limits (iterations and cost)
# 4. Updates iteration count
# 5. Outputs continuation prompt based on current phase

LOOP_ID="$CODER_LOOP_ID"
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

# Check budget limits
CURRENT_ITER=$(jq -r '.iterations.current' "$STATE_FILE")
MAX_ITER=$(jq -r '.iterations.max' "$STATE_FILE")
CURRENT_COST=$(jq -r '.budget.currentCost // 0' "$STATE_FILE")
MAX_COST=$(jq -r '.budget.maxCost // 10' "$STATE_FILE")

# Check iteration limit
if (( CURRENT_ITER >= MAX_ITER )); then
  echo "Loop paused: max iterations reached ($MAX_ITER)"
  jq '.status = "paused" | .pauseReason = "max_iterations" | .updatedAt = (now | todate)' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
  exit 0
fi

# Check cost limit (using bc for floating point comparison)
if command -v bc &> /dev/null; then
  if (( $(echo "$CURRENT_COST >= $MAX_COST" | bc -l) )); then
    echo "Loop paused: budget exceeded (\$$MAX_COST)"
    jq '.status = "paused" | .pauseReason = "budget" | .updatedAt = (now | todate)' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    exit 0
  fi
fi

# Update iteration count
NEW_ITER=$((CURRENT_ITER + 1))
jq ".iterations.current = $NEW_ITER | .updatedAt = (now | todate)" "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

# Check if task is complete (Claude sets this flag)
PHASE=$(jq -r '.phase' "$STATE_FILE")
TASK_COMPLETE=$(jq -r '.taskComplete // false' "$STATE_FILE")

if [[ "$TASK_COMPLETE" == "true" ]]; then
  jq '.status = "completed" | .completedAt = (now | todate) | .updatedAt = (now | todate)' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
  echo ""
  echo "---"
  echo "[Ralph Loop COMPLETED]"
  echo "Task has been marked as complete."
  echo "---"
  exit 0
fi

# Continue loop - output continuation prompt based on phase
PHASE_PROMPT=""
case "$PHASE" in
  "clarify")
    PHASE_PROMPT="Continue clarifying requirements. Ask any remaining questions needed to fully understand the task.

If requirements are now clear:
1. Save clarifications to ~/.coder-config/loops/$LOOP_ID/clarifications.md
2. Update state: jq '.phase = \"plan\"' to advance to planning phase"
    ;;
  "plan")
    PHASE_PROMPT="Continue developing the implementation plan based on clarified requirements.

When the plan is complete:
1. Save the plan to ~/.coder-config/loops/$LOOP_ID/plan.md
2. Wait for user approval before advancing to execute phase
3. If auto-approve is enabled, update state: jq '.phase = \"execute\"'"
    ;;
  "execute")
    PHASE_PROMPT="Continue executing the implementation plan.

When the task is complete:
1. Verify all requirements have been met
2. Run any relevant tests
3. Update state: jq '.taskComplete = true' to mark as complete"
    ;;
esac

echo ""
echo "---"
echo "[Ralph Loop iteration $NEW_ITER/$MAX_ITER - Phase: $PHASE]"
echo ""
echo "$PHASE_PROMPT"
echo "---"
