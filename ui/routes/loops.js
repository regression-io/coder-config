/**
 * Loops Routes (Ralph Loop)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { query } = require('@anthropic-ai/claude-agent-sdk');
const { RALPH_LOOP_SKILL_DIR } = require('./utils');

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

  // Setup hooks for this project
  if (loop.projectPath) {
    setupLoopHooks(loop.projectPath);
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

  // Setup hooks for this project
  if (loop.projectPath) {
    setupLoopHooks(loop.projectPath);
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
 * Check if loop hooks are available (scripts exist)
 * Hooks are now installed per-project, not globally
 */
function getLoopHookStatus() {
  const claudeHooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const stopHookPath = path.join(claudeHooksDir, 'ralph-loop-stop.sh');
  const prepromptHookPath = path.join(claudeHooksDir, 'ralph-loop-preprompt.sh');

  // Check if hook script files exist
  const stopHookFileExists = fs.existsSync(stopHookPath);
  const prepromptHookFileExists = fs.existsSync(prepromptHookPath);

  // Hooks are installed per-project now, so "registered" means scripts are available
  const status = {
    stopHook: {
      path: stopHookPath,
      exists: stopHookFileExists,
      registered: stopHookFileExists  // Scripts are ready to be used
    },
    prepromptHook: {
      path: prepromptHookPath,
      exists: prepromptHookFileExists,
      registered: prepromptHookFileExists
    },
    mode: 'per-project',
    note: 'Hooks are installed to project .claude/settings.local.json when loops start'
  };

  return status;
}

/**
 * ralph-loop skill is bundled with coder-config — no external plugin install needed.
 */
function getRalphLoopPluginStatus() {
  return { installed: true, scope: 'bundled', needsInstall: false };
}

async function installRalphLoopPlugin() {
  return { success: true, message: 'ralph-loop skill is bundled with coder-config' };
}

/**
 * Tune a prompt for Ralph Loop using Claude Code
 * Rewrites the task following Ralph Wiggum principles:
 * - Clear completion signals (exact string matching)
 * - Incremental staging with verification steps
 * - Automatic verification (tests, linters, builds)
 *
 * @param {string} task - Original task description
 * @param {string} projectPath - Project directory
 * @param {object} loopContext - Optional context from previous loop run (for resume tuning)
 */
async function tunePrompt(task, projectPath = null, loopContext = null) {
  const { spawn } = require('child_process');

  // Build context section if we have loop history
  let historySection = '';
  if (loopContext) {
    // Compact the transcript - take key sections to stay under ~3000 chars
    let compactedTranscript = '';
    if (loopContext.transcript) {
      const transcript = loopContext.transcript;
      const lines = transcript.split('\n');

      // Get first 500 chars (start context)
      const start = transcript.slice(0, 500);

      // Get last 1500 chars (most recent and likely failure point)
      const end = transcript.slice(-1500);

      // Look for error indicators in the middle
      const errorLines = lines.filter(line =>
        /error|fail|exception|timeout|stuck|cannot|unable/i.test(line)
      ).slice(0, 10).join('\n');

      compactedTranscript = `
### Transcript Summary:
**Start of session:**
${start}
${errorLines ? `
**Key errors/issues found:**
${errorLines}
` : ''}
**Most recent actions:**
${end}
`;
    }

    historySection = `
## Previous Attempt Context:

This task was previously attempted but ${loopContext.status === 'failed' ? 'failed' : 'was paused'}.
${loopContext.pauseReason ? `Reason: ${loopContext.pauseReason}` : ''}

- Iterations completed: ${loopContext.iterations || 0} / ${loopContext.maxIterations || 50}
- Phase reached: ${loopContext.phase || 'unknown'}
${compactedTranscript}

Based on this history, add specific guardrails to prevent the same issues. For example:
- If it failed on tests, add explicit test verification steps
- If it got stuck in a loop, add checkpoints and progress verification
- If it hit max iterations, break the task into smaller phases
`;
  }

  const metaPrompt = `You are a prompt engineer specializing in Ralph Loop autonomous development.

Your task: Rewrite the following task description to be optimal for Ralph Loop execution.

## Ralph Loop Principles (from awesomeclaude.ai/ralph-wiggum):

1. **Clear Completion Signals**: Use exact string matching. The completion promise will be "DONE" - the loop ends when Claude outputs this exact text.

2. **Incremental Staging**: Break complex work into phases with clear checkpoints. After each phase, verify before moving to the next.

3. **Automatic Verification**: Include self-correcting patterns:
   - Run tests after changes
   - Check linter/type errors
   - Verify builds succeed
   - Confirm expected behavior

4. **Start Simple, Add Guardrails on Failure**: Begin with the core task. Only add constraints if things go wrong.
${historySection}
## Output Format:

Respond with ONLY the rewritten task description. No explanation, no preamble, no markdown formatting - just the improved task text that will be passed to /ralph-loop.

The rewritten task should:
- Be specific about what "done" means
- Include verification steps (test, lint, build)
- List clear acceptance criteria
${loopContext ? '- Add specific guardrails based on the previous attempt\'s issues' : ''}
- End with: "When all acceptance criteria are met and verified, output DONE."

## Original Task:

${task}

## Rewritten Task:`;

  try {
    let tunedPrompt = '';
    for await (const msg of query({
      prompt: metaPrompt,
      options: {
        cwd: projectPath || process.cwd(),
        maxTurns: 1,
      }
    })) {
      if (msg.type === 'result' && msg.subtype === 'success') {
        tunedPrompt = msg.result;
      }
    }
    if (tunedPrompt) {
      return { success: true, tunedPrompt: tunedPrompt.trim() };
    }
    return { success: false, error: 'No result from Claude', originalPrompt: task };
  } catch (err) {
    return { success: false, error: err.message, originalPrompt: task };
  }
}


/**
 * Install loop hooks for a specific project directory
 * Creates .claude/settings.local.json with hooks (not committed to git)
 * This avoids the global trust prompt issue
 */
function installLoopHooks(manager, projectPath = null) {
  const claudeHooksDir = path.join(os.homedir(), '.claude', 'hooks');

  // Ensure hooks directory exists
  if (!fs.existsSync(claudeHooksDir)) {
    fs.mkdirSync(claudeHooksDir, { recursive: true });
  }

  // Copy the stop hook script to ~/.claude/hooks/
  const stopHookSource = path.join(__dirname, '..', '..', 'hooks', 'ralph-loop-stop.sh');
  const stopHookDest = path.join(claudeHooksDir, 'ralph-loop-stop.sh');

  // Also copy preprompt hook
  const prepromptHookSource = path.join(__dirname, '..', '..', 'hooks', 'ralph-loop-preprompt.sh');
  const prepromptHookDest = path.join(claudeHooksDir, 'ralph-loop-preprompt.sh');

  try {
    // Copy hook scripts to ~/.claude/hooks/
    if (fs.existsSync(stopHookSource)) {
      fs.copyFileSync(stopHookSource, stopHookDest);
      fs.chmodSync(stopHookDest, '755');
    }
    if (fs.existsSync(prepromptHookSource)) {
      fs.copyFileSync(prepromptHookSource, prepromptHookDest);
      fs.chmodSync(prepromptHookDest, '755');
    }

    // Remove hooks from global settings.json if they exist
    removeGlobalHooks();

    // If project path provided, install hooks to project's .claude/settings.local.json
    if (projectPath) {
      const projectClaudeDir = path.join(projectPath, '.claude');
      const projectSettingsLocalPath = path.join(projectClaudeDir, 'settings.local.json');

      // Ensure project .claude directory exists
      if (!fs.existsSync(projectClaudeDir)) {
        fs.mkdirSync(projectClaudeDir, { recursive: true });
      }

      // Load or create project-local settings
      let projectSettings = {};
      if (fs.existsSync(projectSettingsLocalPath)) {
        try {
          projectSettings = JSON.parse(fs.readFileSync(projectSettingsLocalPath, 'utf8'));
        } catch (e) {
          projectSettings = {};
        }
      }

      // Initialize hooks if needed
      if (!projectSettings.hooks) {
        projectSettings.hooks = {};
      }

      // Add Stop hook
      const stopHookEntry = {
        hooks: [{
          type: 'command',
          command: stopHookDest
        }]
      };

      if (!projectSettings.hooks.Stop) {
        projectSettings.hooks.Stop = [stopHookEntry];
      } else {
        const hookExists = projectSettings.hooks.Stop.some(entry =>
          entry.hooks?.some(h => h.command?.includes('ralph-loop-stop.sh'))
        );
        if (!hookExists) {
          projectSettings.hooks.Stop.push(stopHookEntry);
        }
      }

      // Save project-local settings
      fs.writeFileSync(projectSettingsLocalPath, JSON.stringify(projectSettings, null, 2) + '\n');

      return {
        success: true,
        message: 'Loop hooks installed to project',
        projectPath,
        settingsFile: projectSettingsLocalPath,
        stopHook: stopHookDest,
        note: 'Hooks installed to .claude/settings.local.json (not committed to git)'
      };
    }

    return {
      success: true,
      message: 'Hook scripts copied to ~/.claude/hooks/',
      stopHook: stopHookDest,
      prepromptHook: prepromptHookDest,
      note: 'Hooks will be installed to project directories when loops are started'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Remove ralph-loop hooks from global ~/.claude/settings.json
 */
function removeGlobalHooks() {
  const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  if (!fs.existsSync(claudeSettingsPath)) {
    return;
  }

  try {
    const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));

    if (!settings.hooks) {
      return;
    }

    let modified = false;

    // Remove Stop hooks that reference ralph-loop-stop.sh
    if (settings.hooks.Stop) {
      const original = settings.hooks.Stop.length;
      settings.hooks.Stop = settings.hooks.Stop.filter(entry =>
        !entry.hooks?.some(h => h.command?.includes('ralph-loop-stop.sh'))
      );
      if (settings.hooks.Stop.length === 0) {
        delete settings.hooks.Stop;
      }
      if (settings.hooks.Stop?.length !== original) {
        modified = true;
      }
    }

    // Remove PreToolUse hooks that reference ralph-loop-preprompt.sh
    if (settings.hooks.PreToolUse) {
      const original = settings.hooks.PreToolUse.length;
      settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(entry =>
        !entry.hooks?.some(h => h.command?.includes('ralph-loop-preprompt.sh'))
      );
      if (settings.hooks.PreToolUse.length === 0) {
        delete settings.hooks.PreToolUse;
      }
      if (settings.hooks.PreToolUse?.length !== original) {
        modified = true;
      }
    }

    // Clean up empty hooks object
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (modified) {
      fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2) + '\n');
    }
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Setup hooks for a specific loop run
 * Called when starting/resuming a loop
 */
function setupLoopHooks(projectPath) {
  if (!projectPath) {
    return { success: false, error: 'No project path provided' };
  }

  return installLoopHooks(null, projectPath);
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
  setupLoopHooks,
  removeGlobalHooks,
  getRalphLoopPluginStatus,
  installRalphLoopPlugin,
  tunePrompt,
};
