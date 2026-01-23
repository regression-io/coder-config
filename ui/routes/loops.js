/**
 * Loops Routes (Ralph Loop)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get all loops
 */
function getLoops(manager) {
  if (!manager) return { error: 'Manager not available' };
  const data = manager.loadLoops();

  // Enrich with state data
  const loops = (data.loops || []).map(loop => {
    const state = manager.loadLoopState(loop.id);
    return state || loop;
  });

  return {
    loops,
    activeId: data.activeId,
    config: data.config || {}
  };
}

/**
 * Get active loop
 */
function getActiveLoop(manager) {
  if (!manager) return { error: 'Manager not available' };
  const active = manager.getActiveLoop();
  return { loop: active };
}

/**
 * Get a specific loop by ID
 */
function getLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopGet(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }

  // Also load clarifications and plan
  const clarifications = manager.loadClarifications(loop.id);
  const plan = manager.loadPlan(loop.id);

  return {
    loop,
    clarifications,
    plan
  };
}

/**
 * Create a new loop
 */
function createLoop(manager, body) {
  if (!manager) return { error: 'Manager not available' };
  const { task, name, workstreamId, projectPath } = body;

  if (!task) {
    return { error: 'Task description is required' };
  }

  const loop = manager.loopCreate(task, {
    name,
    workstreamId,
    projectPath
  });

  if (!loop) {
    return { error: 'Failed to create loop' };
  }

  return { success: true, loop };
}

/**
 * Update a loop
 */
function updateLoop(manager, id, updates) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopUpdate(id, updates);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Delete a loop
 */
function deleteLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const success = manager.loopDelete(id);
  if (!success) {
    return { error: 'Loop not found' };
  }
  return { success: true };
}

/**
 * Start a loop
 */
function startLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopStart(id);
  if (!loop) {
    return { error: 'Loop not found or cannot be started' };
  }
  return { success: true, loop };
}

/**
 * Pause a loop
 */
function pauseLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopPause(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Resume a loop
 */
function resumeLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopResume(id);
  if (!loop) {
    return { error: 'Loop not found or cannot be resumed' };
  }
  return { success: true, loop };
}

/**
 * Cancel a loop
 */
function cancelLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopCancel(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Approve plan (phase 2)
 */
function approveLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopApprove(id);
  if (!loop) {
    return { error: 'Loop not found or not in plan phase' };
  }
  return { success: true, loop };
}

/**
 * Mark loop as complete
 */
function completeLoop(manager, id) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopComplete(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Get loop history
 */
function getLoopHistory(manager) {
  if (!manager) return { error: 'Manager not available' };
  const history = manager.loadHistory();
  return { completed: history.completed || [] };
}

/**
 * Get/update loop configuration
 */
function getLoopConfig(manager) {
  if (!manager) return { error: 'Manager not available' };
  const data = manager.loadLoops();
  return { config: data.config || {} };
}

function updateLoopConfig(manager, updates) {
  if (!manager) return { error: 'Manager not available' };
  const config = manager.loopConfig(updates);
  return { success: true, config };
}

/**
 * Save clarifications to a loop
 */
function saveClarifications(manager, id, content) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopGet(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  manager.saveClarifications(id, content);
  return { success: true };
}

/**
 * Save plan to a loop
 */
function savePlan(manager, id, content) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.loopGet(id);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  manager.savePlan(id, content);
  return { success: true };
}

/**
 * Record an iteration
 */
function recordIteration(manager, id, iteration) {
  if (!manager) return { error: 'Manager not available' };
  const loop = manager.recordIteration(id, iteration);
  if (!loop) {
    return { error: 'Loop not found' };
  }
  return { success: true, loop };
}

/**
 * Check if loop hooks are installed
 */
function getLoopHookStatus() {
  const hooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const stopHookPath = path.join(hooksDir, 'ralph-loop-stop.sh');
  const prepromptHookPath = path.join(hooksDir, 'ralph-loop-preprompt.sh');

  const status = {
    hooksDir,
    dirExists: fs.existsSync(hooksDir),
    stopHook: {
      path: stopHookPath,
      exists: fs.existsSync(stopHookPath)
    },
    prepromptHook: {
      path: prepromptHookPath,
      exists: fs.existsSync(prepromptHookPath)
    }
  };

  return status;
}

/**
 * Install loop hooks
 */
function installLoopHooks(manager) {
  const hooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const coderConfigDir = manager ? path.dirname(manager.getLoopsPath()) : path.join(os.homedir(), '.coder-config');

  try {
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Stop hook
    const stopHookContent = `#!/bin/bash
# Ralph Loop continuation hook
# Called after each Claude response

LOOP_ID="\$CODER_LOOP_ID"
if [[ -z "\$LOOP_ID" ]]; then
  exit 0
fi

STATE_FILE="\$HOME/.coder-config/loops/\$LOOP_ID/state.json"
if [[ ! -f "\$STATE_FILE" ]]; then
  exit 0
fi

# Check if loop is still active
STATUS=$(jq -r '.status' "\$STATE_FILE")
if [[ "\$STATUS" != "running" ]]; then
  exit 0
fi

# Check budget limits
CURRENT_ITER=$(jq -r '.iterations.current' "\$STATE_FILE")
MAX_ITER=$(jq -r '.iterations.max' "\$STATE_FILE")
CURRENT_COST=$(jq -r '.budget.currentCost' "\$STATE_FILE")
MAX_COST=$(jq -r '.budget.maxCost' "\$STATE_FILE")

if (( CURRENT_ITER >= MAX_ITER )); then
  echo "Loop paused: max iterations reached (\$MAX_ITER)"
  jq '.status = "paused" | .pauseReason = "max_iterations"' "\$STATE_FILE" > tmp && mv tmp "\$STATE_FILE"
  exit 0
fi

if (( $(echo "\$CURRENT_COST >= \$MAX_COST" | bc -l) )); then
  echo "Loop paused: budget exceeded (\$\$MAX_COST)"
  jq '.status = "paused" | .pauseReason = "budget"' "\$STATE_FILE" > tmp && mv tmp "\$STATE_FILE"
  exit 0
fi

# Update iteration count
jq ".iterations.current = $((CURRENT_ITER + 1))" "\$STATE_FILE" > tmp && mv tmp "\$STATE_FILE"

# Check if task is complete (Claude sets this flag)
PHASE=$(jq -r '.phase' "\$STATE_FILE")
TASK_COMPLETE=$(jq -r '.taskComplete // false' "\$STATE_FILE")

if [[ "\$TASK_COMPLETE" == "true" ]]; then
  jq '.status = "completed" | .completedAt = now' "\$STATE_FILE" > tmp && mv tmp "\$STATE_FILE"
  echo "Loop completed successfully!"
  exit 0
fi

# Continue loop - output continuation prompt
PHASE_PROMPT=""
case "\$PHASE" in
  "clarify")
    PHASE_PROMPT="Continue clarifying requirements. If requirements are clear, advance to planning phase by setting phase='plan'."
    ;;
  "plan")
    PHASE_PROMPT="Continue developing the implementation plan. When plan is complete and approved, advance to execution phase."
    ;;
  "execute")
    PHASE_PROMPT="Continue executing the plan. When task is complete, set taskComplete=true."
    ;;
esac

echo ""
echo "---"
echo "[Ralph Loop iteration $((CURRENT_ITER + 1))/\$MAX_ITER]"
echo "\$PHASE_PROMPT"
echo "---"
`;

    const stopHookPath = path.join(hooksDir, 'ralph-loop-stop.sh');
    fs.writeFileSync(stopHookPath, stopHookContent);
    fs.chmodSync(stopHookPath, '755');

    // Pre-prompt hook
    const prepromptHookContent = `#!/bin/bash
# Ralph Loop context injection

LOOP_ID="\$CODER_LOOP_ID"
if [[ -z "\$LOOP_ID" ]]; then
  exit 0
fi

STATE_FILE="\$HOME/.coder-config/loops/\$LOOP_ID/state.json"
PLAN_FILE="\$HOME/.coder-config/loops/\$LOOP_ID/plan.md"
CLARIFY_FILE="\$HOME/.coder-config/loops/\$LOOP_ID/clarifications.md"

if [[ ! -f "\$STATE_FILE" ]]; then
  exit 0
fi

echo "<ralph-loop-context>"
echo "Loop: $(jq -r '.name' "\$STATE_FILE")"
echo "Phase: $(jq -r '.phase' "\$STATE_FILE")"
echo "Iteration: $(jq -r '.iterations.current' "\$STATE_FILE")/$(jq -r '.iterations.max' "\$STATE_FILE")"

if [[ -f "\$CLARIFY_FILE" ]]; then
  echo ""
  echo "## Clarifications"
  cat "\$CLARIFY_FILE"
fi

if [[ -f "\$PLAN_FILE" ]]; then
  echo ""
  echo "## Plan"
  cat "\$PLAN_FILE"
fi

echo "</ralph-loop-context>"
`;

    const prepromptHookPath = path.join(hooksDir, 'ralph-loop-preprompt.sh');
    fs.writeFileSync(prepromptHookPath, prepromptHookContent);
    fs.chmodSync(prepromptHookPath, '755');

    return {
      success: true,
      message: 'Loop hooks installed successfully',
      stopHook: stopHookPath,
      prepromptHook: prepromptHookPath
    };
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = {
  getLoops,
  getActiveLoop,
  getLoop,
  createLoop,
  updateLoop,
  deleteLoop,
  startLoop,
  pauseLoop,
  resumeLoop,
  cancelLoop,
  approveLoop,
  completeLoop,
  getLoopHistory,
  getLoopConfig,
  updateLoopConfig,
  saveClarifications,
  savePlan,
  recordIteration,
  getLoopHookStatus,
  installLoopHooks,
};
