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
  const { task, name, workstreamId, projectPath, maxIterations, completionPromise } = body;

  if (!task) {
    return { error: 'Task description is required' };
  }

  const loop = manager.loopCreate(task, {
    name,
    workstreamId,
    projectPath,
    maxIterations: maxIterations || undefined,
    completionPromise: completionPromise || undefined
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
 * Check if loop hooks are installed (official ralph-loop plugin)
 */
function getLoopHookStatus() {
  // Check for official ralph-loop plugin
  const pluginsDir = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');
  const officialPluginPath = path.join(pluginsDir, 'claude-plugins-official', 'plugins', 'ralph-loop');
  const stopHookPath = path.join(officialPluginPath, 'hooks', 'stop-hook.sh');

  // Also check custom hooks dir for backwards compatibility
  const customHooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const customStopHookPath = path.join(customHooksDir, 'ralph-loop-stop.sh');
  const customPrepromptHookPath = path.join(customHooksDir, 'ralph-loop-preprompt.sh');

  const officialPluginExists = fs.existsSync(officialPluginPath);
  const officialHookExists = fs.existsSync(stopHookPath);

  const status = {
    // Official plugin is preferred
    usingOfficialPlugin: officialPluginExists,
    officialPlugin: {
      path: officialPluginPath,
      exists: officialPluginExists
    },
    stopHook: {
      path: officialHookExists ? stopHookPath : customStopHookPath,
      exists: officialHookExists || fs.existsSync(customStopHookPath)
    },
    prepromptHook: {
      // Official plugin doesn't need preprompt hook
      path: customPrepromptHookPath,
      exists: officialPluginExists || fs.existsSync(customPrepromptHookPath)
    }
  };

  return status;
}

/**
 * Install loop hooks (or verify official plugin is installed)
 */
function installLoopHooks(manager) {
  const pluginsDir = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');
  const officialPluginPath = path.join(pluginsDir, 'claude-plugins-official', 'plugins', 'ralph-loop');

  // Check if official plugin is already installed
  if (fs.existsSync(officialPluginPath)) {
    return {
      success: true,
      message: 'Official ralph-loop plugin is already installed',
      usingOfficialPlugin: true,
      pluginPath: officialPluginPath,
      note: 'Loops use the /ralph-loop command from the official claude-plugins-official marketplace'
    };
  }

  // Suggest installing the official plugin
  return {
    success: false,
    error: 'Official ralph-loop plugin not found',
    suggestion: 'Install the claude-plugins-official marketplace to get the ralph-loop plugin:\n' +
      '  1. Add marketplace: coder-config marketplace add https://github.com/anthropics/claude-plugins-official\n' +
      '  2. Or manually clone: git clone https://github.com/anthropics/claude-plugins-official ~/.claude/plugins/marketplaces/claude-plugins-official',
    note: 'The official plugin provides /ralph-loop command with stop-hook for autonomous loops'
  };
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
