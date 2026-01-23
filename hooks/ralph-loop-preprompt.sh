#!/bin/bash
# Ralph Loop context injection hook
# Called at the start of each Claude session to inject loop context
#
# This hook:
# 1. Checks if we're in an active loop (via CODER_LOOP_ID env var)
# 2. Reads the current loop state
# 3. Outputs loop context including task, phase, clarifications, and plan

LOOP_ID="$CODER_LOOP_ID"
if [[ -z "$LOOP_ID" ]]; then
  exit 0
fi

STATE_FILE="$HOME/.coder-config/loops/$LOOP_ID/state.json"
PLAN_FILE="$HOME/.coder-config/loops/$LOOP_ID/plan.md"
CLARIFY_FILE="$HOME/.coder-config/loops/$LOOP_ID/clarifications.md"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Warning: Loop state file not found: $STATE_FILE"
  exit 0
fi

# Read loop state
NAME=$(jq -r '.name' "$STATE_FILE")
PHASE=$(jq -r '.phase' "$STATE_FILE")
STATUS=$(jq -r '.status' "$STATE_FILE")
CURRENT_ITER=$(jq -r '.iterations.current // 0' "$STATE_FILE")
MAX_ITER=$(jq -r '.iterations.max // 50' "$STATE_FILE")
TASK=$(jq -r '.task.original' "$STATE_FILE")
CLARIFIED_TASK=$(jq -r '.task.clarified // empty' "$STATE_FILE")

echo "<ralph-loop-context>"
echo "# Ralph Loop: $NAME"
echo ""
echo "**Phase:** $PHASE"
echo "**Status:** $STATUS"
echo "**Iteration:** $CURRENT_ITER / $MAX_ITER"
echo ""
echo "## Original Task"
echo "$TASK"
echo ""

if [[ -n "$CLARIFIED_TASK" && "$CLARIFIED_TASK" != "null" ]]; then
  echo "## Clarified Task"
  echo "$CLARIFIED_TASK"
  echo ""
fi

if [[ -f "$CLARIFY_FILE" ]]; then
  echo "## Clarifications"
  cat "$CLARIFY_FILE"
  echo ""
fi

if [[ -f "$PLAN_FILE" ]]; then
  echo "## Implementation Plan"
  cat "$PLAN_FILE"
  echo ""
fi

echo "## Loop Instructions"
echo ""
echo "You are operating within a Ralph Loop - an autonomous development workflow."
echo "Your current phase is: **$PHASE**"
echo ""

case "$PHASE" in
  "clarify")
    echo "### Clarify Phase"
    echo "- Ask questions to fully understand the requirements"
    echo "- Gather any missing information needed for implementation"
    echo "- Document Q&A in clarifications.md"
    echo "- When requirements are clear, advance to 'plan' phase"
    ;;
  "plan")
    echo "### Plan Phase"
    echo "- Review the clarified requirements"
    echo "- Create a detailed implementation plan"
    echo "- Break down work into clear steps"
    echo "- Save the plan to plan.md"
    echo "- Wait for approval before advancing to 'execute' phase"
    ;;
  "execute")
    echo "### Execute Phase"
    echo "- Follow the implementation plan step by step"
    echo "- Implement the required changes"
    echo "- Test your work"
    echo "- When complete, set taskComplete=true in state.json"
    ;;
esac

echo ""
echo "## State File Location"
echo "$STATE_FILE"
echo "</ralph-loop-context>"
