/**
 * Ralph Loop feature - Autonomous development loop management
 */

const fs = require('fs');
const path = require('path');

/**
 * Get loops directory path
 */
function getLoopsPath(installDir) {
  return path.join(installDir, 'loops');
}

/**
 * Get loops registry file path
 */
function getLoopsRegistryPath(installDir) {
  return path.join(getLoopsPath(installDir), 'loops.json');
}

/**
 * Get loops history file path
 */
function getLoopsHistoryPath(installDir) {
  return path.join(getLoopsPath(installDir), 'history.json');
}

/**
 * Get loop directory for a specific loop
 */
function getLoopDir(installDir, loopId) {
  return path.join(getLoopsPath(installDir), loopId);
}

/**
 * Ensure loops directory structure exists
 */
function ensureLoopsDir(installDir) {
  const loopsDir = getLoopsPath(installDir);
  if (!fs.existsSync(loopsDir)) {
    fs.mkdirSync(loopsDir, { recursive: true });
  }
  return loopsDir;
}

/**
 * Load loops registry
 */
function loadLoops(installDir) {
  const registryPath = getLoopsRegistryPath(installDir);
  if (fs.existsSync(registryPath)) {
    try {
      return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch (e) {
      return { loops: [], activeId: null, config: getDefaultConfig() };
    }
  }
  return { loops: [], activeId: null, config: getDefaultConfig() };
}

/**
 * Save loops registry
 */
function saveLoops(installDir, data) {
  ensureLoopsDir(installDir);
  const registryPath = getLoopsRegistryPath(installDir);
  fs.writeFileSync(registryPath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Load loop state from individual loop directory
 */
function loadLoopState(installDir, loopId) {
  const stateFile = path.join(getLoopDir(installDir, loopId), 'state.json');
  if (fs.existsSync(stateFile)) {
    try {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Save loop state to individual loop directory
 */
function saveLoopState(installDir, loopId, state) {
  const loopDir = getLoopDir(installDir, loopId);
  if (!fs.existsSync(loopDir)) {
    fs.mkdirSync(loopDir, { recursive: true });
  }
  const stateFile = path.join(loopDir, 'state.json');
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
}

/**
 * Load loops history
 */
function loadHistory(installDir) {
  const historyPath = getLoopsHistoryPath(installDir);
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) {
      return { completed: [] };
    }
  }
  return { completed: [] };
}

/**
 * Save loops history
 */
function saveHistory(installDir, data) {
  ensureLoopsDir(installDir);
  const historyPath = getLoopsHistoryPath(installDir);
  fs.writeFileSync(historyPath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Get default loop configuration
 */
function getDefaultConfig() {
  return {
    maxIterations: 50,
    autoApprovePlan: false,
    maxClarifyIterations: 5,
    completionPromise: 'DONE'  // For ralph-loop plugin integration
  };
}

/**
 * Generate unique loop ID
 */
function generateLoopId() {
  return 'loop_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Create a new loop state object
 */
function createLoopState(name, task, options = {}) {
  const config = options.config || getDefaultConfig();
  const maxIterations = options.maxIterations || config.maxIterations;
  const completionPromise = options.completionPromise || config.completionPromise || 'DONE';

  return {
    id: generateLoopId(),
    name: name,
    workstreamId: options.workstreamId || null,
    projectPath: options.projectPath || process.cwd(),
    phase: 'clarify',
    status: 'pending',
    task: {
      original: task,
      clarified: null,
      plan: null
    },
    iterations: {
      current: 0,
      max: maxIterations,
      history: []
    },
    completionPromise: completionPromise,  // For ralph-loop plugin
    taskComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };
}

/**
 * List all loops
 */
function loopList(installDir) {
  const data = loadLoops(installDir);

  // Enrich with state data
  const enrichedLoops = data.loops.map(loop => {
    const state = loadLoopState(installDir, loop.id);
    return state || loop;
  });

  if (enrichedLoops.length === 0) {
    console.log('\nNo loops defined.');
    console.log('Create one with: coder-config loop create "Task description"\n');
    return enrichedLoops;
  }

  console.log('\n🔄 Loops:\n');
  for (const loop of enrichedLoops) {
    const statusIcon = getStatusIcon(loop.status);
    const phaseLabel = loop.phase ? `[${loop.phase}]` : '';
    const iterLabel = loop.iterations ? `${loop.iterations.current}/${loop.iterations.max}` : '';

    console.log(`${statusIcon} ${loop.name} ${phaseLabel} ${iterLabel}`);
    console.log(`    Task: ${(loop.task?.original || '').substring(0, 60)}${(loop.task?.original || '').length > 60 ? '...' : ''}`);
  }
  console.log('');
  return enrichedLoops;
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  const icons = {
    pending: '○',
    running: '●',
    paused: '◐',
    completed: '✓',
    failed: '✗',
    cancelled: '⊘'
  };
  return icons[status] || '○';
}

/**
 * Create a new loop
 */
function loopCreate(installDir, taskOrName, options = {}) {
  if (!taskOrName) {
    console.error('Usage: coder-config loop create "Task description"');
    return null;
  }

  const data = loadLoops(installDir);
  const config = { ...getDefaultConfig(), ...data.config };

  // Use task as name if no separate name provided
  const name = options.name || taskOrName.substring(0, 50);
  const task = taskOrName;

  const state = createLoopState(name, task, { ...options, config });

  // Add to registry
  data.loops.push({
    id: state.id,
    name: state.name,
    createdAt: state.createdAt
  });
  saveLoops(installDir, data);

  // Save state file
  const loopDir = getLoopDir(installDir, state.id);
  fs.mkdirSync(loopDir, { recursive: true });
  fs.mkdirSync(path.join(loopDir, 'iterations'), { recursive: true });
  saveLoopState(installDir, state.id, state);

  console.log(`✓ Created loop: ${state.name}`);
  console.log(`  ID: ${state.id}`);
  console.log(`  Max Iterations: ${state.iterations.max}`);
  console.log(`  Completion Promise: ${state.completionPromise}`);
  console.log(`  Start with: coder-config loop start ${state.id}`);

  return state;
}

/**
 * Get a loop by ID or name
 */
function loopGet(installDir, idOrName) {
  const data = loadLoops(installDir);
  const entry = data.loops.find(
    l => l.id === idOrName || l.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!entry) {
    return null;
  }

  return loadLoopState(installDir, entry.id);
}

/**
 * Update a loop
 */
function loopUpdate(installDir, idOrName, updates) {
  const data = loadLoops(installDir);
  const entry = data.loops.find(
    l => l.id === idOrName || l.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (!entry) {
    console.error(`Loop not found: ${idOrName}`);
    return null;
  }

  const state = loadLoopState(installDir, entry.id);
  if (!state) {
    console.error(`Loop state not found: ${idOrName}`);
    return null;
  }

  // Apply updates
  if (updates.name !== undefined) {
    state.name = updates.name;
    entry.name = updates.name;
  }
  if (updates.status !== undefined) state.status = updates.status;
  if (updates.phase !== undefined) state.phase = updates.phase;
  if (updates.taskComplete !== undefined) state.taskComplete = updates.taskComplete;
  if (updates.completedAt !== undefined) state.completedAt = updates.completedAt;
  if (updates.pauseReason !== undefined) state.pauseReason = updates.pauseReason;

  // Update task fields
  if (updates.task) {
    state.task = { ...state.task, ...updates.task };
  }

  // Update iterations
  if (updates.iterations) {
    state.iterations = { ...state.iterations, ...updates.iterations };
  }

  saveLoopState(installDir, entry.id, state);
  saveLoops(installDir, data);

  return state;
}

/**
 * Delete a loop
 */
function loopDelete(installDir, idOrName) {
  const data = loadLoops(installDir);
  const idx = data.loops.findIndex(
    l => l.id === idOrName || l.name.toLowerCase() === idOrName.toLowerCase()
  );

  if (idx === -1) {
    console.error(`Loop not found: ${idOrName}`);
    return false;
  }

  const removed = data.loops.splice(idx, 1)[0];

  // Remove loop directory
  const loopDir = getLoopDir(installDir, removed.id);
  if (fs.existsSync(loopDir)) {
    fs.rmSync(loopDir, { recursive: true });
  }

  if (data.activeId === removed.id) {
    data.activeId = null;
  }

  saveLoops(installDir, data);
  console.log(`✓ Deleted loop: ${removed.name}`);
  return true;
}

/**
 * Start or resume a loop
 */
function loopStart(installDir, idOrName) {
  const state = loopGet(installDir, idOrName);

  if (!state) {
    console.error(`Loop not found: ${idOrName}`);
    return null;
  }

  if (state.status === 'completed') {
    console.error('Loop is already completed. Create a new loop to restart.');
    return null;
  }

  if (state.status === 'running') {
    console.log('Loop is already running.');
    return state;
  }

  state.status = 'running';
  delete state.pauseReason;
  saveLoopState(installDir, state.id, state);

  // Set as active loop
  const data = loadLoops(installDir);
  data.activeId = state.id;
  saveLoops(installDir, data);

  console.log(`✓ Started loop: ${state.name}`);
  console.log(`  Phase: ${state.phase}`);
  console.log(`  Iteration: ${state.iterations.current}/${state.iterations.max}`);

  // Output run instructions (using official ralph-loop plugin)
  const task = state.task.original.replace(/"/g, '\\"');
  const completionPromise = state.completionPromise || 'DONE';
  console.log('\nTo run this loop with Claude Code (uses official ralph-loop plugin):');
  console.log(`  claude --dangerously-skip-permissions "/ralph-loop ${task} --max-iterations ${state.iterations.max} --completion-promise '${completionPromise}'"`);

  return state;
}

/**
 * Pause a loop
 */
function loopPause(installDir, idOrName) {
  const state = loopGet(installDir, idOrName);

  if (!state) {
    console.error(`Loop not found: ${idOrName}`);
    return null;
  }

  if (state.status !== 'running') {
    console.log(`Loop is not running (status: ${state.status})`);
    return state;
  }

  state.status = 'paused';
  state.pauseReason = 'user_requested';
  saveLoopState(installDir, state.id, state);

  console.log(`✓ Paused loop: ${state.name}`);
  return state;
}

/**
 * Resume a paused loop
 */
function loopResume(installDir, idOrName) {
  return loopStart(installDir, idOrName);
}

/**
 * Cancel a loop
 */
function loopCancel(installDir, idOrName) {
  const state = loopGet(installDir, idOrName);

  if (!state) {
    console.error(`Loop not found: ${idOrName}`);
    return null;
  }

  if (state.status === 'completed' || state.status === 'cancelled') {
    console.log(`Loop is already ${state.status}`);
    return state;
  }

  state.status = 'cancelled';
  state.completedAt = new Date().toISOString();
  saveLoopState(installDir, state.id, state);

  // Clear active if this was it
  const data = loadLoops(installDir);
  if (data.activeId === state.id) {
    data.activeId = null;
    saveLoops(installDir, data);
  }

  console.log(`✓ Cancelled loop: ${state.name}`);
  return state;
}

/**
 * Approve plan for a loop (phase 2)
 */
function loopApprove(installDir, idOrName) {
  const state = loopGet(installDir, idOrName);

  if (!state) {
    console.error(`Loop not found: ${idOrName}`);
    return null;
  }

  if (state.phase !== 'plan') {
    console.error(`Loop is not in plan phase (current: ${state.phase})`);
    return null;
  }

  state.phase = 'execute';
  saveLoopState(installDir, state.id, state);

  console.log(`✓ Approved plan for loop: ${state.name}`);
  console.log('  Phase advanced to: execute');
  return state;
}

/**
 * Get loop status (for CLI display)
 */
function loopStatus(installDir, idOrName) {
  if (idOrName) {
    const state = loopGet(installDir, idOrName);
    if (!state) {
      console.error(`Loop not found: ${idOrName}`);
      return null;
    }
    displayLoopStatus(installDir, state);
    return state;
  }

  // Show active loop status
  const data = loadLoops(installDir);
  if (!data.activeId) {
    console.log('No active loop.');
    console.log('Start a loop with: coder-config loop start <id>');
    return null;
  }

  const state = loadLoopState(installDir, data.activeId);
  if (!state) {
    console.log('Active loop state not found.');
    return null;
  }

  displayLoopStatus(installDir, state);
  return state;
}

/**
 * Display detailed loop status
 */
function displayLoopStatus(installDir, state) {
  console.log(`\n🔄 Loop: ${state.name}`);
  console.log(`   ID: ${state.id}`);
  console.log(`   Status: ${state.status}${state.pauseReason ? ` (${state.pauseReason})` : ''}`);
  console.log(`   Phase: ${state.phase}`);
  console.log(`   Iteration: ${state.iterations.current}/${state.iterations.max}`);
  console.log(`   Completion Promise: ${state.completionPromise || 'DONE'}`);
  console.log(`   Task: ${state.task.original}`);

  if (state.task.clarified) {
    console.log(`   Clarified: ${state.task.clarified}`);
  }

  // Check for plan file
  const planPath = path.join(getLoopDir(installDir, state.id), 'plan.md');
  if (fs.existsSync(planPath)) {
    console.log(`   Plan: ${planPath}`);
  }

  console.log(`   Created: ${state.createdAt}`);
  if (state.completedAt) {
    console.log(`   Completed: ${state.completedAt}`);
  }
  console.log('');
}

/**
 * Show completed loops history
 */
function loopHistory(installDir) {
  const history = loadHistory(installDir);

  if (history.completed.length === 0) {
    console.log('\nNo completed loops in history.\n');
    return history.completed;
  }

  console.log('\n📜 Loop History:\n');
  for (const entry of history.completed.slice(-20).reverse()) {
    const statusIcon = getStatusIcon(entry.status);
    console.log(`${statusIcon} ${entry.name}`);
    console.log(`    Completed: ${entry.completedAt}`);
    console.log(`    Iterations: ${entry.totalIterations}`);
  }
  console.log('');
  return history.completed;
}

/**
 * Archive a completed/cancelled loop to history
 */
function archiveLoop(installDir, loopId) {
  const state = loadLoopState(installDir, loopId);
  if (!state) return;

  const history = loadHistory(installDir);
  history.completed.push({
    id: state.id,
    name: state.name,
    task: state.task.original,
    status: state.status,
    totalIterations: state.iterations.current,
    createdAt: state.createdAt,
    completedAt: state.completedAt || new Date().toISOString()
  });
  saveHistory(installDir, history);

  // Remove from active loops
  const data = loadLoops(installDir);
  const idx = data.loops.findIndex(l => l.id === loopId);
  if (idx !== -1) {
    data.loops.splice(idx, 1);
    if (data.activeId === loopId) {
      data.activeId = null;
    }
    saveLoops(installDir, data);
  }
}

/**
 * Get/set loop configuration
 */
function loopConfig(installDir, updates = null) {
  const data = loadLoops(installDir);
  data.config = data.config || getDefaultConfig();

  if (!updates) {
    console.log('\n⚙️  Loop Configuration:\n');
    console.log(`   Max Iterations: ${data.config.maxIterations}`);
    console.log(`   Auto-approve Plan: ${data.config.autoApprovePlan}`);
    console.log(`   Max Clarify Iterations: ${data.config.maxClarifyIterations}`);
    console.log(`   Completion Promise: ${data.config.completionPromise || 'DONE'}`);
    console.log('');
    return data.config;
  }

  // Apply updates
  if (updates.maxIterations !== undefined) {
    data.config.maxIterations = parseInt(updates.maxIterations, 10);
  }
  if (updates.autoApprovePlan !== undefined) {
    data.config.autoApprovePlan = updates.autoApprovePlan === true || updates.autoApprovePlan === 'true';
  }
  if (updates.maxClarifyIterations !== undefined) {
    data.config.maxClarifyIterations = parseInt(updates.maxClarifyIterations, 10);
  }
  if (updates.completionPromise !== undefined) {
    data.config.completionPromise = updates.completionPromise;
  }

  saveLoops(installDir, data);
  console.log('✓ Configuration updated');
  return data.config;
}

/**
 * Get active loop
 */
function getActiveLoop(installDir) {
  // Check env var first
  const envLoopId = process.env.CODER_LOOP_ID;
  if (envLoopId) {
    const state = loadLoopState(installDir, envLoopId);
    if (state) return state;
  }

  // Fall back to registry activeId
  const data = loadLoops(installDir);
  if (data.activeId) {
    return loadLoopState(installDir, data.activeId);
  }

  return null;
}

/**
 * Record an iteration
 */
function recordIteration(installDir, loopId, iteration) {
  const state = loadLoopState(installDir, loopId);
  if (!state) return null;

  state.iterations.history.push(iteration);
  state.iterations.current = iteration.n;

  // Save iteration file
  const iterDir = path.join(getLoopDir(installDir, loopId), 'iterations');
  if (!fs.existsSync(iterDir)) {
    fs.mkdirSync(iterDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(iterDir, `${iteration.n}.json`),
    JSON.stringify(iteration, null, 2) + '\n'
  );

  saveLoopState(installDir, loopId, state);
  return state;
}

/**
 * Save clarifications to file
 */
function saveClarifications(installDir, loopId, content) {
  const loopDir = getLoopDir(installDir, loopId);
  const clarifyPath = path.join(loopDir, 'clarifications.md');
  fs.writeFileSync(clarifyPath, content);
}

/**
 * Save plan to file
 */
function savePlan(installDir, loopId, content) {
  const loopDir = getLoopDir(installDir, loopId);
  const planPath = path.join(loopDir, 'plan.md');
  fs.writeFileSync(planPath, content);
}

/**
 * Load clarifications from file
 */
function loadClarifications(installDir, loopId) {
  const clarifyPath = path.join(getLoopDir(installDir, loopId), 'clarifications.md');
  if (fs.existsSync(clarifyPath)) {
    return fs.readFileSync(clarifyPath, 'utf8');
  }
  return '';
}

/**
 * Load plan from file
 */
function loadPlan(installDir, loopId) {
  const planPath = path.join(getLoopDir(installDir, loopId), 'plan.md');
  if (fs.existsSync(planPath)) {
    return fs.readFileSync(planPath, 'utf8');
  }
  return '';
}

/**
 * Inject loop context (for hooks)
 */
function loopInject(installDir, silent = false) {
  const active = getActiveLoop(installDir);

  if (!active) {
    if (!silent) console.log('No active loop');
    return null;
  }

  const lines = [];
  lines.push('<ralph-loop-context>');
  lines.push(`Loop: ${active.name}`);
  lines.push(`Phase: ${active.phase}`);
  lines.push(`Iteration: ${active.iterations.current}/${active.iterations.max}`);
  lines.push(`Status: ${active.status}`);

  const clarifications = loadClarifications(installDir, active.id);
  if (clarifications) {
    lines.push('');
    lines.push('## Clarifications');
    lines.push(clarifications);
  }

  const plan = loadPlan(installDir, active.id);
  if (plan) {
    lines.push('');
    lines.push('## Plan');
    lines.push(plan);
  }

  lines.push('');
  lines.push(`Task: ${active.task.original}`);
  lines.push('</ralph-loop-context>');

  const output = lines.join('\n');
  console.log(output);
  return output;
}

/**
 * Mark loop as complete
 */
function loopComplete(installDir, idOrName) {
  const state = loopGet(installDir, idOrName);

  if (!state) {
    console.error(`Loop not found: ${idOrName}`);
    return null;
  }

  state.status = 'completed';
  state.taskComplete = true;
  state.completedAt = new Date().toISOString();
  saveLoopState(installDir, state.id, state);

  // Archive to history
  archiveLoop(installDir, state.id);

  console.log(`✓ Completed loop: ${state.name}`);
  return state;
}

module.exports = {
  // Path helpers
  getLoopsPath,
  getLoopsRegistryPath,
  getLoopsHistoryPath,
  getLoopDir,

  // Data operations
  loadLoops,
  saveLoops,
  loadLoopState,
  saveLoopState,
  loadHistory,
  saveHistory,

  // CRUD operations
  loopList,
  loopCreate,
  loopGet,
  loopUpdate,
  loopDelete,

  // Lifecycle operations
  loopStart,
  loopPause,
  loopResume,
  loopCancel,
  loopApprove,
  loopComplete,

  // Status operations
  loopStatus,
  loopHistory,
  loopConfig,
  getActiveLoop,

  // Iteration tracking
  recordIteration,

  // File operations
  saveClarifications,
  savePlan,
  loadClarifications,
  loadPlan,

  // Hook support
  loopInject,
  archiveLoop,

  // Utilities
  getDefaultConfig,
  generateLoopId,
};
